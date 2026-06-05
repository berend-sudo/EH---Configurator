import { Resend } from "resend";

export interface SendDesignEmailInput {
  to: string;
  name: string;
  subject: string;
  /** Design label, e.g. "Monopitch · 2-bed" — already includes the
   *  bedroom suffix the configurator's summary card shows. */
  label: string;
  /** Numeric bedroom count derived server-side from the drawing; kept
   *  alongside `label` so a plain-text fallback can rebuild the phrasing
   *  without parsing the label string. */
  bedrooms: number;
  reference: string;
  pdf: Buffer;
  pdfFilename: string;
}

// Team-owned reply-to address (never no-reply@) so architects can reply directly.
const DEFAULT_FROM = "Easy Housing <hello@easyhousing.org>";

// Deep-green brand body ink — never pure black. Mirrors --eh-green-900.
const INK = "#003B2B";
const INK_MUTED = "#4A5C56";
// Full font stack repeated inline on every text node — most mail clients
// (Gmail, Outlook desktop) strip <style>/<head>, so a single body-level
// rule won't propagate. Apple Mail / iOS Mail honour the <link> below and
// pick Poppins; the rest fall back to the system sans-serif. Flag for the
// brief: Poppins can't be guaranteed in every client, but the stack must
// never degrade to a serif default.
const FONT_STACK =
  "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

function firstNameOf(full: string): string {
  return full.trim().split(/\s+/)[0] || "there";
}

function bodyText(i: SendDesignEmailInput): string {
  const first = firstNameOf(i.name);
  return [
    `Hi ${first},`,
    "",
    `Congratulations — your home has a shape. We loved helping you design your ${i.label}, and it's attached here as a PDF. Bring it along when you meet our architects — it's the perfect place to start the conversation.`,
    "",
    "We're genuinely excited to help bring it to life. One of our architects will be in touch within a couple of working days to walk you through the next steps.",
    "",
    `Reference: ${i.reference}`,
    "",
    "A home for everyone,",
    "Easy Housing",
  ].join("\n");
}

function bodyHtml(i: SendDesignEmailInput): string {
  const first = firstNameOf(i.name);
  // Every node carries its own font-family / size / line-height / colour
  // inline — the <link> in <head> loads Poppins for clients that honour
  // web fonts; the inline stack carries everyone else cleanly down to a
  // system sans.
  const base = `font-family:${FONT_STACK};color:${INK};`;
  const body = `${base}font-size:16px;line-height:1.6;font-weight:400;margin:0 0 16px;`;
  const designName = `${base}font-size:19px;line-height:1.4;font-weight:600;margin:0 0 4px;`;
  const small = `${base}font-size:14px;line-height:1.5;font-weight:400;margin:0;color:${INK_MUTED};`;
  const signoff = `${base}font-size:14px;line-height:1.5;font-weight:400;margin:24px 0 0;`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(i.subject)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#FAF9F6;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF9F6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;border-radius:14px;padding:32px;">
          <tr><td>
            <p style="${body}">Hi ${escapeHtml(first)},</p>
            <p style="${body}">
              Congratulations — your home has a shape. We loved helping you design your
              <span style="${designName}display:inline-block;">${escapeHtml(i.label)}</span>,
              and it's attached here as a PDF. Bring it along when you meet our architects —
              it's the perfect place to start the conversation.
            </p>
            <p style="${body}">
              We're genuinely excited to help bring it to life. One of our architects will be in touch within
              a couple of working days to walk you through the next steps.
            </p>
            <p style="${small}">Reference: ${escapeHtml(i.reference)}</p>
            <p style="${signoff}">
              A home for everyone,<br/>
              <span style="font-weight:600;">Easy Housing</span>
            </p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

// Sends the design PDF. Throws on any failure so the route can surface a clear
// error and avoid claiming success — emailing the client is the gating signal.
export async function sendDesignEmail(input: SendDesignEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Email is not configured — set RESEND_API_KEY.");
  }
  const from = process.env.EH_FROM_EMAIL || DEFAULT_FROM;
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    replyTo: from,
    subject: input.subject,
    text: bodyText(input),
    html: bodyHtml(input),
    attachments: [{ filename: input.pdfFilename, content: input.pdf }],
  });

  if (error) {
    throw new Error(error.message || "Email provider rejected the message.");
  }
}
