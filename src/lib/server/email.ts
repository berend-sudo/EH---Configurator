import path from "path";
import { readFile } from "fs/promises";
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

// Brand tokens — deep forest green is the body ink and band colour, never
// pure black. Mirrors --eh-green-900 / --eh-text-muted.
const GREEN = "#003B2B";
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

// One body text size throughout — no jarring jumps between paragraphs, the
// design name, the reference or the sign-off. Emphasis comes from weight and
// the brand green, never from a size change.
const TEXT = 16;
const LINE = 1.6;

const LOGO_CID = "eh-logo";

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

// Exported for preview/test harnesses — the live send path calls it internally.
export function bodyHtml(i: SendDesignEmailInput, hasLogo: boolean): string {
  const first = firstNameOf(i.name);
  // Every node carries its own font-family / size / line-height / colour
  // inline — the <link> in <head> loads Poppins for clients that honour
  // web fonts; the inline stack carries everyone else cleanly down to a
  // system sans. One size (16px) everywhere; weight + colour do the
  // emphasis.
  const base = `font-family:${FONT_STACK};color:${INK};font-size:${TEXT}px;line-height:${LINE};`;
  const para = `${base}font-weight:400;margin:0 0 18px;`;
  const name = `font-weight:600;color:${GREEN};white-space:nowrap;`;
  const ref = `${base}font-weight:400;color:${INK_MUTED};margin:0;`;

  // Header lockup: the white logo when we could attach it, otherwise the
  // wordmark in text so the green band never ships empty.
  const header = hasLogo
    ? `<img src="cid:${LOGO_CID}" alt="Easy Housing" height="26" style="height:26px;display:block;border:0;outline:none;text-decoration:none;" />`
    : `<span style="font-family:${FONT_STACK};font-size:20px;color:#ffffff;"><span style="font-weight:600;">easy</span><span style="font-weight:300;">housing</span></span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(i.subject)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#FAF9F6;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF9F6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E7EAE5;">
          <!-- Green header band with the logo -->
          <tr>
            <td style="background:${GREEN};padding:26px 36px;">
              ${header}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 30px;">
              <p style="${para}">Hi ${escapeHtml(first)},</p>
              <p style="${para}">
                Congratulations — your home has a shape. We loved helping you design your
                <span style="${name}">${escapeHtml(i.label)}</span>, and it's attached here as a PDF.
                Bring it along when you meet our architects — it's the perfect place to start the conversation.
              </p>
              <p style="${para}">
                We're genuinely excited to help bring it to life. One of our architects will be in touch
                within a couple of working days to walk you through the next steps.
              </p>
              <p style="${ref}">Reference: ${escapeHtml(i.reference)}</p>
            </td>
          </tr>
          <!-- Green sign-off footer band -->
          <tr>
            <td style="background:${GREEN};padding:24px 36px;">
              <p style="font-family:${FONT_STACK};font-size:${TEXT}px;line-height:${LINE};color:#ffffff;margin:0;font-weight:400;">
                A home for everyone,<br/>
                <span style="font-weight:600;">Easy Housing</span>
              </p>
            </td>
          </tr>
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

// Read the white logo for the header band as an inline (cid) attachment.
// Best-effort: if it can't be read the email still sends with a text
// wordmark in the header instead.
async function loadLogo(): Promise<Buffer | null> {
  try {
    return await readFile(path.join(process.cwd(), "public", "brand", "logo-full-white.png"));
  } catch {
    return null;
  }
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

  const logo = await loadLogo();
  const attachments: { filename: string; content: Buffer; inlineContentId?: string }[] = [
    { filename: input.pdfFilename, content: input.pdf },
  ];
  if (logo) {
    attachments.push({ filename: "easyhousing.png", content: logo, inlineContentId: LOGO_CID });
  }

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    replyTo: from,
    subject: input.subject,
    text: bodyText(input),
    html: bodyHtml(input, logo != null),
    attachments,
  });

  if (error) {
    throw new Error(error.message || "Email provider rejected the message.");
  }
}
