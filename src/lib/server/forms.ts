// Submit a row to the existing "request price list" Google Form so
// configurator leads land in the same workflow the team already watches.
//
// Mechanism: a urlencoded POST to /forms/d/e/{FORM_ID}/formResponse with
// `entry.<id>=value` pairs. This endpoint is reverse-engineered — Google does
// not document or guarantee it. Risks:
//   - The form must be "Anyone can respond, no sign-in required" with CAPTCHA
//     and "Limit to one response" disabled, or the POST is silently rejected.
//   - On rejection the endpoint still returns 200 with an error page; we sniff
//     "There was a problem" / "didn't get sent" in the body to surface a
//     warning, but the only reliable signal is checking the form's response
//     sheet during smoke testing.
//   - A Forms internals change can break this without warning. Treat the
//     output as best-effort, never the system of record.

const FORM_RESPONSE_URL = (id: string) =>
  `https://docs.google.com/forms/d/e/${id}/formResponse`;

/**
 * Sentinel value a Google Forms multiple-choice question expects when the
 * respondent picks the free-text "Other" option. The radio entry carries
 * this constant and the typed text rides on a companion field whose name is
 * `entry.<id>.other_option_response`. Sending the raw text to the radio
 * entry instead makes a *required* multiple-choice question reject the whole
 * submission, so callers route "Other" answers through this + the companion
 * logical key (see `hearAboutOther` in the submit route).
 */
export const GOOGLE_FORM_OTHER = "__other_option__";

/**
 * Map from logical field name → form `entry.XXX` id, loaded once per process
 * from `EH_LEADS_FORM_FIELD_IDS_JSON`. Wolf extracts these by using the form's
 * *Send → Link → Get pre-filled link* feature — the resulting URL embeds the
 * entry ids next to each field name.
 */
function loadFieldIdMap(): Record<string, string> {
  const raw = process.env.EH_LEADS_FORM_FIELD_IDS_JSON;
  if (!raw) throw new Error("EH_LEADS_FORM_FIELD_IDS_JSON missing.");
  const map = JSON.parse(raw) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    if (typeof v !== "string") continue;
    // Accept both bare ids ("123456789") and prefixed ("entry.123456789").
    out[k] = v.startsWith("entry.") ? v : `entry.${v}`;
  }
  return out;
}

export async function submitToLeadsForm(values: Record<string, string>): Promise<void> {
  const formId = process.env.EH_LEADS_FORM_ID;
  if (!formId) throw new Error("EH_LEADS_FORM_ID missing.");

  const idMap = loadFieldIdMap();
  const body = new URLSearchParams();
  for (const [logical, value] of Object.entries(values)) {
    const entry = idMap[logical];
    if (!entry) continue; // logical fields without an id mapping are skipped
    if (value == null || value === "") continue;
    body.append(entry, value);
  }
  // Forms uses this submission flag in some configurations; harmless if ignored.
  body.append("fvv", "1");
  body.append("submit", "Submit");

  const res = await fetch(FORM_RESPONSE_URL(formId), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "EH-Configurator/1.0 (+https://easyhousing.org)",
      Accept: "text/html,application/xhtml+xml",
    },
    body,
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Form POST failed (${res.status}): ${await res.text()}`);
  }
  // Sniff the response page for the well-known rejection strings — Forms
  // returns 200 even when the submission was rejected.
  const text = await res.text().catch(() => "");
  if (/There was a problem|didn't get sent|We're sorry/i.test(text)) {
    throw new Error("Form rejected the submission (returned an error page).");
  }
}
