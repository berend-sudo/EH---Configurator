import { getAccessToken } from "@/lib/server/google-auth";

// Append one lead row per submission to the "EH Configurator leads" sheet via
// the Google Sheets API v4, authenticated by the shared service-account JWT.
// Best-effort: the caller logs failures and never blocks the email on a sheet
// write.

// Locked header row order — keep in sync with the row builder in
// src/app/api/configurator/submit/route.ts. UGX is the canonical figure
// architects price in; the local pair is what the client saw on screen.
export const LEADS_HEADER = [
  "Easy Housing reference",
  "Timestamp",
  "Email Address",
  "Full name",
  "Phone number",
  "Project location",
  "What best describes your building plans?",
  "Do you have land and funds available?",
  "How did you hear about us?",
  "Do you want to receive our quarterly newsletter?",
  "Timeline",
  "Typology",
  "Subtype",
  "Bedrooms",
  "Width (m)",
  "Length (m)",
  "Footprint (m²)",
  "Indicative budget (UGX)",
  "Currency",
  "Indicative budget (local)",
  "DXF filename",
  "PDF filename",
  "PDF link (Drive)",
  "Source (configurator URL)",
] as const;

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const SHEET_TAB = "Sheet1";

// A1 column letter for the right edge of the locked header row.
function colLetter(n: number): string {
  // 1 → A, 26 → Z, 27 → AA …
  let s = "";
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

async function ensureHeader(sheetId: string, token: string): Promise<void> {
  const lastCol = colLetter(LEADS_HEADER.length);
  // Read the full header row, not just A1 — when the locked header gains a
  // column we want the existing sheet to self-heal instead of writing rows
  // into stale slots.
  const range = `${SHEET_TAB}!A1:${lastCol}1`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Header read failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { values?: string[][] };
  const current = json.values?.[0] ?? [];
  const matches =
    current.length === LEADS_HEADER.length &&
    LEADS_HEADER.every((h, i) => current[i] === h);
  if (matches) return;

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
  const token = await getAccessToken([SCOPE]);

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
