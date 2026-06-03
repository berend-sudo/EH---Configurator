import crypto from "crypto";

// Append one lead row per submission to the "EH Configurator leads" sheet via
// the Google Sheets API v4, authenticated with a service account shared into
// the sheet. Implemented with a hand-rolled RS256 JWT + fetch to avoid pulling
// in the very large `googleapis` package. Best-effort: the caller logs failures
// and never blocks the email on a sheet write.

// Locked header row order — keep in sync with appendLead's row builder.
export const LEADS_HEADER = [
  "Timestamp",
  "Reference",
  "Name",
  "Email",
  "Phone",
  "Timeline",
  "Typology",
  "Subtype",
  "Bedrooms",
  "Width (m)",
  "Length (m)",
  "Footprint (m²)",
  "Indicative budget (UGX)",
  "DXF filename",
  "PDF filename",
  "Source (configurator URL)",
] as const;

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEET_TAB = "Sheet1";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON missing.");
  const sa = JSON.parse(raw) as ServiceAccount;
  if (!sa.client_email || !sa.private_key) {
    throw new Error("Service account JSON is missing client_email / private_key.");
  }
  // Env vars often carry the key with escaped newlines.
  sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  return sa;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = b64url(signer.sign(sa.private_key));
  const assertion = `${unsigned}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`Token request failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("No access_token in token response.");
  return json.access_token;
}

async function ensureHeader(sheetId: string, token: string): Promise<void> {
  const range = `${SHEET_TAB}!A1:A1`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Header read failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { values?: string[][] };
  const a1 = json.values?.[0]?.[0];
  if (a1 === LEADS_HEADER[0]) return; // header already present

  const updateRange = `${SHEET_TAB}!A1`;
  const upd = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [LEADS_HEADER as unknown as string[]] }),
    },
  );
  if (!upd.ok) throw new Error(`Header write failed (${upd.status}): ${await upd.text()}`);
}

export type LeadRow = (string | number)[];

export async function appendLead(row: LeadRow): Promise<void> {
  const sheetId = process.env.EH_LEADS_SHEET_ID;
  if (!sheetId) throw new Error("EH_LEADS_SHEET_ID missing.");
  const sa = loadServiceAccount();
  const token = await getAccessToken(sa);

  await ensureHeader(sheetId, token);

  const appendRange = `${SHEET_TAB}!A1`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    },
  );
  if (!res.ok) throw new Error(`Append failed (${res.status}): ${await res.text()}`);
}
