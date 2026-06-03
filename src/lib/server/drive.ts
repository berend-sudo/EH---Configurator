import crypto from "crypto";
import { getAccessToken } from "@/lib/server/google-auth";

// Archive each emailed PDF to a Google Drive folder so the team has a durable
// backlog matchable by reference id. Uses Drive API v3 multipart upload — one
// request, metadata + bytes together. Scope is `drive.file` (least privilege:
// the service account can only manage files it creates). The folder must live
// in a Shared Drive and the SA must be a Content Manager / Contributor of it
// — service accounts cannot own files in personal My Drive, so a Shared Drive
// is the only durable option.
//
// Reverse-engineered against
// https://developers.google.com/workspace/drive/api/guides/manage-uploads

const SCOPE = "https://www.googleapis.com/auth/drive.file";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink";

export interface UploadPdfInput {
  filename: string;
  pdf: Buffer;
  reference: string;
  label: string;
}

export interface UploadPdfResult {
  fileId: string;
  webViewLink: string;
}

export async function uploadPdfToBacklog(input: UploadPdfInput): Promise<UploadPdfResult> {
  const folderId = process.env.EH_PDF_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("EH_PDF_DRIVE_FOLDER_ID missing.");

  const token = await getAccessToken([SCOPE]);
  const boundary = `eh-${crypto.randomBytes(12).toString("hex")}`;

  const metadata = {
    name: input.filename,
    parents: [folderId],
    description: `ref ${input.reference} · ${input.label} · generated ${new Date().toISOString()}`,
    mimeType: "application/pdf",
  };

  // Build multipart/related body as a single Buffer so the binary PDF bytes
  // travel untouched (no string coercion).
  const head = Buffer.from(
    `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      "Content-Type: application/pdf\r\n\r\n",
    "utf8",
  );
  const tail = Buffer.from(`\r\n--${boundary}--`, "utf8");
  const body = Buffer.concat([head, input.pdf, tail]);

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Drive upload failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { id?: string; webViewLink?: string };
  if (!json.id || !json.webViewLink) {
    throw new Error(`Drive upload returned no id/link: ${JSON.stringify(json)}`);
  }
  return { fileId: json.id, webViewLink: json.webViewLink };
}
