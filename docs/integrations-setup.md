# EH Configurator — live integrations setup

A runbook for wiring up the **Generate PDF** flow in production:
the design email (Resend) and the lead log (Google Sheets).
Written for Wolf, but reusable for anyone rotating a key or
standing up a staging environment.

You'll need access to:

- **Resend** (or rights to create an account on the easyhousing.org
  domain)
- The **easyhousing.org DNS** (registrar / Cloudflare / wherever
  records live)
- A **Google Cloud** console seat under the easyhousing.org Workspace
- **Vercel** for the EH Configurator project

Total hands-on time: **~40 minutes**, plus DNS propagation
(usually minutes, occasionally up to a few hours).

---

## What you'll end up with

Four environment variables on Vercel:

| Var | Where it comes from |
| --- | --- |
| `RESEND_API_KEY`                     | Resend → API Keys |
| `EH_FROM_EMAIL`                      | An address on a Resend-verified domain |
| `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` | Google Cloud → service account JSON |
| `EH_LEADS_SHEET_ID`                  | The "EH Configurator leads" sheet URL |

And, in Google Workspace:

- A shared sheet **"EH Configurator leads"** that auto-fills as
  clients submit.

Replies to architect emails keep landing in the Easy Housing Gmail
inbox — we are **only** authorising Resend to *send* on our behalf,
not changing where mail is received.

---

## Phase 1 — Resend account & domain (~15 min hands-on)

- [ ] **1.1** Sign up at <https://resend.com> using your easyhousing.org
      Google account.
- [ ] **1.2** *Domains → Add Domain* → enter **`easyhousing.org`**.
      (If you'd rather isolate sending from the root domain's
      reputation, use **`send.easyhousing.org`** instead — both work,
      just remember which you chose for `EH_FROM_EMAIL` later.)
- [ ] **1.3** Resend shows you a list of DNS records — keep that tab
      open, you'll need it in Phase 2.
- [ ] **1.4** *API Keys → Create API Key*
      - Name: `eh-configurator-prod`
      - Permission: **Sending access** is enough (don't grant full
        access).
      - **Copy the key now** (it's only shown once).
      - This is `RESEND_API_KEY`.

---

## Phase 2 — DNS records (~10 min + propagation)

Open the easyhousing.org DNS console in another tab.

- [ ] **2.1** Add each TXT / MX record exactly as Resend lists it.
      Typically three to four records:
      - **DKIM** TXT (e.g. `resend._domainkey…`)
      - **SPF** TXT on the sending subdomain
      - **MX** record on the sending subdomain (for bounces)
      - **DMARC** TXT at `_dmarc.easyhousing.org` (recommended)
- [ ] **2.2** Save records. DNS usually propagates in a few minutes.
- [ ] **2.3** Back in Resend, hit **Verify** until the domain shows
      **Verified**.

> **Workspace check.** None of the above touches the root MX record
> that points to Google — Gmail keeps working exactly as before.
> Don't edit the root MX. If your registrar warns you about SPF
> conflicts, you're editing the wrong record; the Resend SPF lives on
> the **subdomain**.

---

## Phase 3 — Google Cloud + Sheets (~15 min)

### 3a. Cloud project + service account

- [ ] **3.1** <https://console.cloud.google.com> → top bar → *New
      Project* → name it **`eh-configurator`**.
- [ ] **3.2** *APIs & Services → Library* → search **Google Sheets
      API** → **Enable**.
- [ ] **3.3** *APIs & Services → Credentials → Create credentials →
      Service account*.
      - Name: `eh-leads-writer`
      - Skip the optional "Grant access" steps — it gets access via
        sheet sharing, not IAM.
- [ ] **3.4** Open the new service account → **Keys → Add key →
      Create new key → JSON**. A `.json` file downloads.
      **This is your only copy — store it in 1Password (or wherever
      EH keeps shared secrets) before doing anything else.**
- [ ] **3.5** Copy the service-account email. It looks like
      `eh-leads-writer@eh-configurator.iam.gserviceaccount.com`.

### 3b. The leads spreadsheet

- [ ] **3.6** In Google Sheets, create a new sheet named exactly
      **"EH Configurator leads"**. Leave the first tab named
      **`Sheet1`** (the code looks for that name — if you rename
      the tab, edit `SHEET_TAB` in `src/lib/server/sheets.ts` to
      match).
- [ ] **3.7** Click **Share** (top right):
      - Paste the service-account email from step 3.5
      - Role: **Editor**
      - **Uncheck** "Notify people"
      - Share
- [ ] **3.8** Copy the sheet id from the URL — the middle segment:
      `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`.
      This is `EH_LEADS_SHEET_ID`.
- [ ] **3.9** *(Optional but nice.)* Share the sheet read-only with
      the architects + ops team so they can watch new leads land.

> **Header row is automatic.** The first time the endpoint writes,
> it locks in the 16-column header (Timestamp · Reference · Name …).
> You don't need to set it up by hand.

---

## Phase 4 — Put the four secrets into Vercel (~5 min)

Vercel → *Project: eh-configurator* → *Settings → Environment
Variables*. Add each one, scoped to **Production** (and
**Preview** if you want preview deploys to send too):

- [ ] **4.1** `RESEND_API_KEY` — paste the key from step 1.4.
- [ ] **4.2** `EH_FROM_EMAIL` — e.g. `Easy Housing <hello@easyhousing.org>`.
      The domain part **must** match what you verified in Phase 1.
      (If you skip this var, the code defaults to that exact
      address — set it explicitly so it's obvious in the UI.)
- [ ] **4.3** `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` — the **whole
      JSON file, on one line**. The cleanest way:
      ```bash
      jq -c . eh-leads-writer-key.json   # prints minified JSON
      ```
      Copy the output and paste it as the value.
- [ ] **4.4** `EH_LEADS_SHEET_ID` — the id from step 3.8.
- [ ] **4.5** **Redeploy** the latest production deployment so the
      new env vars are picked up (Vercel doesn't hot-reload them).

> **Local dev.** For testing on your laptop, drop the same four vars
> into `.env.local` (already git-ignored). The JSON must be on a
> single line there too — wrap it in single quotes.

---

## Phase 5 — Test the live flow (~2 min)

- [ ] **5.1** Open `https://<your-prod-domain>/`, click through:
      landing → configurator → **Continue to summary →**.
- [ ] **5.2** Fill the form with your own email and tick consent.
- [ ] **5.3** Click **Generate PDF**.
- [ ] **5.4** Within ~10 seconds you should see:
      - The page line *"Sent — check … for your design PDF."*
      - The PDF in your inbox, attached as
        `EH_MONO_<N>BR_v<v>.pdf`
      - A new row at the top of the leads sheet, with the same
        reference id as the PDF cover.

If any one of those three is missing, jump to the section below.

---

## If something breaks

| Symptom | Most likely cause | Fix |
| --- | --- | --- |
| UI shows *"We couldn't email your design…"* | `RESEND_API_KEY` missing, wrong, or domain not yet verified | Recheck the key in Vercel; confirm the domain is **Verified** in Resend |
| Email lands in spam | DMARC not yet set, or sending from an unverified subdomain | Add the DMARC TXT from Phase 2; verify the right domain |
| Email sends but no row in sheet | Service account not shared into the sheet, or wrong `EH_LEADS_SHEET_ID` | Re-share sheet with the service-account email (Editor), reconfirm the id |
| Email sends, sheet append fails in logs with `403` | Sheets API not enabled on the project | *APIs & Services → Library → Google Sheets API → Enable* |
| Sheet writes but to the wrong tab | First tab isn't named `Sheet1` | Rename the tab back, or update `SHEET_TAB` in `src/lib/server/sheets.ts` |
| Submit button stays disabled | Browser autofill missed a field, or timeline left as the placeholder | All four fields + the consent box must be filled |

For deeper investigation: Vercel → *Deployments → (latest) → Runtime
Logs*. The submit route logs the precise failure for any of the three
steps (PDF render, email send, sheet append) — search for
`[configurator/submit]`.

---

## Security hygiene

- The service-account JSON and the Resend key are credentials —
  keep them in 1Password / the EH secret manager, never in Slack or
  email, and never commit them. (`.env*` is already in `.gitignore`.)
- Rotate keys yearly, or immediately if exposed: regenerate the
  Resend API key, and create a new JSON key in Google Cloud +
  delete the old one.
- Both keys are scoped narrowly: Resend can only send; the service
  account can only touch sheets it's been explicitly shared into.

---

A home for everyone,
Easy Housing
