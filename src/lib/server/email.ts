import { Resend } from "resend";

export interface SendDesignEmailInput {
  to: string;
  name: string;
  subject: string;
  label: string;
  reference: string;
  pdf: Buffer;
  pdfFilename: string;
}

// Team-owned reply-to address (never no-reply@) so architects can reply directly.
const DEFAULT_FROM = "Easy Housing <hello@easyhousing.org>";

function bodyText(i: SendDesignEmailInput): string {
  const first = i.name.trim().split(/\s+/)[0] || "there";
  return [
    `Hi ${first},`,
    "",
    `Thanks for designing your home with us. Your ${i.label} overview is attached as a PDF — bring it along when you meet our architects.`,
    "",
    "One of our architects will be in touch within a couple of working days to talk through the next steps.",
    "",
    `Reference: ${i.reference}`,
    "",
    "A home for everyone,",
    "Easy Housing",
  ].join("\n");
}

function bodyHtml(i: SendDesignEmailInput): string {
  const first = i.name.trim().split(/\s+/)[0] || "there";
  return `
  <div style="font-family:Helvetica,Arial,sans-serif;color:#003B2B;font-size:15px;line-height:1.6">
    <p>Hi ${escapeHtml(first)},</p>
    <p>Thanks for designing your home with us. Your <strong>${escapeHtml(i.label)}</strong> overview is
       attached as a PDF — bring it along when you meet our architects.</p>
    <p>One of our architects will be in touch within a couple of working days to talk through the next steps.</p>
    <p style="color:#4A5C56;font-size:13px">Reference: ${escapeHtml(i.reference)}</p>
    <p style="margin-top:24px">A home for everyone,<br/>Easy Housing</p>
  </div>`;
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
