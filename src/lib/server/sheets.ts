import { getAccessToken } from "@/lib/server/google-auth";

// Append one lead row per submission to the "EH Configurator leads" sheet via
// the Google Sheets API v4, authenticated by the shared service-account JWT.
// Best-effort: the caller logs failures and never blocks the email on a sheet
// write.

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
  "PDF link (Drive)",
  "Source (configurator URL)",
] as const;

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const SHEET_TAB = "Sheet1";

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
