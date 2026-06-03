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
- **Editor** access to the existing "request price list" Google Form
- **Vercel** for the EH Configurator project
- A **Workspace admin** on standby — only needed if Shared Drives or
  service-account access are restricted (Phase 3c, R4)

Total hands-on time: **~60 minutes**, plus DNS propagation
(usually minutes, occasionally up to a few hours).

---

## What you'll end up with

Seven environment variables on Vercel:

| Var | Where it comes from |
| --- | --- |
| `RESEND_API_KEY`                     | Resend → API Keys |
| `EH_FROM_EMAIL`                      | An address on a Resend-verified domain |
| `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` | Google Cloud → service account JSON |
| `EH_LEADS_SHEET_ID`                  | The "EH Configurator leads" sheet URL |
| `EH_PDF_DRIVE_FOLDER_ID`             | Folder inside a Shared Drive (Phase 3c) |
| `EH_LEADS_FORM_ID`                   | The existing form's id (Phase 6) |
| `EH_LEADS_FORM_FIELD_IDS_JSON`       | `entry.XXX` map from the form's pre-filled link (Phase 6) |

And, in Google Workspace:

- A shared sheet **"EH Configurator leads"** that auto-fills as
  clients submit (our authoritative log).
- A **Shared Drive** folder *Configurator PDFs* with every emailed
  design PDF (the backlog).
- The existing **"request price list"** Google Form receives a row
  per configurator submission too, so leads sit in the workflow the
  team already watches.

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
> it locks in the 17-column header (Timestamp · Reference · Name …
> PDF link (Drive) · Source). You don't need to set it up by hand.
> If you ever change the columns, clear row 1 once and the next
> submission will re-write the header.

### 3c. Shared Drive for the PDF backlog (~10 min)

The submit endpoint archives every emailed PDF to a Drive folder so
the team has a durable, reference-keyed backlog. Service accounts
**cannot** keep files in personal My Drive (no storage quota), so a
Shared Drive is the only safe home.

- [ ] **3.10** *Google Drive → Shared drives → + New* → name it
      **`Easy Housing — Configurator`** (or fold it into an existing
      Shared Drive if the team already uses one).
- [ ] **3.11** Inside the Shared Drive, create a folder called
      **`Configurator PDFs`**.
- [ ] **3.12** Open the Shared Drive's *Manage members* dialog →
      add the service-account email from step 3.5 → role
      **Content Manager** → *Send* (no notification needed).
- [ ] **3.13** Open the **`Configurator PDFs`** folder. Copy the
      folder id from the URL — the trailing segment of
      `https://drive.google.com/drive/folders/`**`THIS_PART`**.
      This is `EH_PDF_DRIVE_FOLDER_ID`.
- [ ] **3.14** *(Recommended.)* Share the folder read-only with the
      architects + ops team so they can browse the backlog without
      Shared Drive membership.

> **Admin policy check.** Some Workspace orgs disallow service
> accounts on Shared Drives, and others block service-account key
> creation outright (Phase 3a). If step 3.12 refuses to add the SA
> email, ask a Workspace admin to check *Admin console → Apps →
> Google Workspace → Drive and Docs → Sharing settings*; the
> fallback (domain-wide delegation impersonating a real user) is
> larger work — flag it before going further.
>
> If `EH_PDF_DRIVE_FOLDER_ID` is left unset, the submit endpoint
> still emails the PDF and writes the sheet row — it just returns
> `archived: false` and skips the backlog. So this phase can be
> skipped during the very first deploy.

---

## Phase 4 — Put the secrets into Vercel (~5 min)

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
- [ ] **4.5** `EH_PDF_DRIVE_FOLDER_ID` — the folder id from step 3.13.
      Skip if you skipped Phase 3c; archive will just be a no-op
      until you set it.
- [ ] **4.6** `EH_LEADS_FORM_ID` — set this once Phase 6 is done.
      Skip for now if you're deploying before wiring the form.
- [ ] **4.7** `EH_LEADS_FORM_FIELD_IDS_JSON` — set this once
      Phase 6 is done. Skip for now if undecided.
- [ ] **4.8** **Redeploy** the latest production deployment so the
      new env vars are picked up (Vercel doesn't hot-reload them).

> **Local dev.** For testing on your laptop, drop the same vars
> into `.env.local` (already git-ignored). Both JSON values must be
> on a single line there — wrap them in single quotes.
>
> **Best-effort gating.** Every Drive / form / sheet integration is
> opt-in: any var you leave unset just turns its sink off without
> affecting the email or any other sink. So you can ship phases
> incrementally.

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
      - A new row at the top of the **leads sheet**, with the same
        reference id as the PDF cover.
- [ ] **5.5** *(If Phase 3c is configured.)* Open the
      **`Configurator PDFs`** Shared Drive folder — the same PDF
      file appears, filename identical to the email attachment, and
      the row in the leads sheet has a clickable link in the new
      *"PDF link (Drive)"* column.
- [ ] **5.6** *(If Phase 6 is configured.)* Open the form's
      linked response sheet — a new row appears with the matching
      reference id.

> The reference id (`EH-YYYY-XXXXXX`) is the system-of-record key.
> If you see different ids on the email and the row, something is
> mis-wired — file a bug, don't paper over it.

If anything is missing, jump to the troubleshooting section below.

---

## Phase 6 — Wire the existing Google Form (~15 min)

We want configurator leads to appear in the **same** form-linked
sheet the team already watches for "request price list"
submissions, carrying the extra info the configurator knows
(reference, floor plan, budget, file ids, Drive link).

> **Risk to know up front.** Google's `formResponse` endpoint is
> not officially supported. A Forms internals change or a CAPTCHA
> toggle can silently break this. The endpoint always returns 200,
> so the only reliable confirmation is *"a new row appears in the
> response sheet"*. Our own sheet (Phase 3 / 4) stays authoritative
> regardless.

### 6a. Add the configurator's extra questions to the form

Open the existing form in *Edit* mode and add **Short answer**
questions for each field the form doesn't already collect. The
configurator passes these values; questions the form doesn't have
are silently dropped, so missing any of these just means the
column is blank in the response sheet — not a hard failure.

- [ ] **6.1** *Reference* (Short answer) — receives `EH-YYYY-XXXXXX`
- [ ] **6.2** *Floor plan* (Short answer) — e.g. *"Monopitch · Studio"*
- [ ] **6.3** *Bedrooms* (Short answer)
- [ ] **6.4** *Width (m)* (Short answer)
- [ ] **6.5** *Length (m)* (Short answer)
- [ ] **6.6** *Footprint (m²)* (Short answer)
- [ ] **6.7** *Indicative budget (UGX)* (Short answer)
- [ ] **6.8** *DXF filename* (Short answer)
- [ ] **6.9** *PDF filename* (Short answer)
- [ ] **6.10** *PDF link (Drive)* (Short answer)
- [ ] **6.11** *Source URL* (Short answer)
- [ ] **6.12** Mark every configurator-only question **not required**
      — so the form still works for humans filling in only the
      price-list questions on the web.

> If you'd prefer not to clutter the existing form, create a
> separate form ("Configurator leads") with the same client
> questions plus the extras; use its id in Phase 4 instead. The
> rest of the setup is identical.

### 6b. Extract the `entry.XXX` ids

- [ ] **6.13** Open the form's editor → *Send → Link → Get
      pre-filled link*.
- [ ] **6.14** Fill **every** question with an obvious placeholder
      (e.g. `NAME`, `EMAIL`, `REF`) so each field is identifiable
      in the URL. Click *Get link → Copy link*.
- [ ] **6.15** Paste the URL into a scratch buffer and pull out the
      `entry.XXXXXXXX=VALUE` pairs. Build a JSON map keyed by the
      **logical** field names the code expects:

      ```json
      {
        "name":               "entry.111111111",
        "email":              "entry.222222222",
        "phone":              "entry.333333333",
        "timeline":           "entry.444444444",
        "country":            "entry.aaa",
        "projectType":        "entry.bbb",
        "hearAbout":          "entry.ccc",
        "reference":          "entry.555555555",
        "floorPlan":          "entry.666666666",
        "bedrooms":           "entry.777777777",
        "widthM":             "entry.888888888",
        "lengthM":            "entry.999999999",
        "footprintM2":        "entry.101010101",
        "indicativeBudgetUgx":"entry.111111112",
        "dxfFilename":        "entry.121212121",
        "pdfFilename":        "entry.131313131",
        "pdfDriveLink":       "entry.141414141",
        "source":             "entry.151515151"
      }
      ```

      `country` / `projectType` / `hearAbout` are **placeholder
      mirror fields** — they assume the existing form already asks
      "Country / location", "What's this design for?", and "How
      did you hear about us?". If the real form's questions are
      different, edit `PROJECT_TYPE_OPTIONS` /
      `HEAR_ABOUT_OPTIONS` in `src/lib/configurator-submit.ts`
      and the matching `<select>` blocks in
      `src/app/summary/page.tsx`, then map the new logical names
      here. Logical names you don't have a mapping for are
      silently skipped — so it's fine to leave out *e.g.*
      `pdfDriveLink` if you skipped Phase 3c.

- [ ] **6.16** Minify the JSON to a single line and paste it into
      `EH_LEADS_FORM_FIELD_IDS_JSON` on Vercel (step 4.7).
- [ ] **6.17** The form id is the long token in the form's URL:
      `…/forms/d/e/`**`FORM_ID`**`/viewform` — paste into
      `EH_LEADS_FORM_ID` (step 4.6).

### 6c. Form settings the code depends on

- [ ] **6.18** *Settings → Responses* — confirm **"Collect email
      addresses"** is set the way you want it (Off, or *Verified*
      only if you're sure the server submission's IP / UA passes).
- [ ] **6.19** *Settings → Responses → Restrict to <org> and its
      trusted organizations* must be **Off** — the configurator
      isn't signed in.
- [ ] **6.20** *Settings → Responses → Limit to 1 response* must be
      **Off** (it requires sign-in).
- [ ] **6.21** Form *Verification* (CAPTCHA-style) must be **Off**.
- [ ] **6.22** **Redeploy** so steps 4.6 / 4.7 land, then re-run
      Phase 5. Test 5.6 should now pass.

---

## If something breaks

| Symptom | Most likely cause | Fix |
| --- | --- | --- |
| UI shows *"We couldn't email your design…"* | `RESEND_API_KEY` missing, wrong, or domain not yet verified | Recheck the key in Vercel; confirm the domain is **Verified** in Resend |
| Email lands in spam | DMARC not yet set, or sending from an unverified subdomain | Add the DMARC TXT from Phase 2; verify the right domain |
| Email sends but no row in sheet | Service account not shared into the sheet, or wrong `EH_LEADS_SHEET_ID` | Re-share sheet with the service-account email (Editor), reconfirm the id |
| Email sends, sheet append fails in logs with `403` | Sheets API not enabled on the project | *APIs & Services → Library → Google Sheets API → Enable* |
| Sheet writes but to the wrong tab | First tab isn't named `Sheet1` | Rename the tab back, or update `SHEET_TAB` in `src/lib/server/sheets.ts` |
| Submit button stays disabled | Browser autofill missed a field, the timeline is on the placeholder, or the reference hasn't loaded yet (page shows *"ref pending…"*) | All four fields + consent box must be filled and the reference line must show an `EH-…` id |
| Submit returns `archived: false` in the response, no PDF in Drive | `EH_PDF_DRIVE_FOLDER_ID` missing, SA not added as Content Manager of the Shared Drive, or admin policy blocks SAs on Shared Drives | Re-check step 3.12; if the policy blocks SAs, ask Workspace admin (see R4 in the plan) |
| Drive upload logs `403 storageQuotaExceeded` | The folder is in someone's personal *My Drive*, not a Shared Drive | Move the folder into a Shared Drive and re-copy its id |
| Submit returns `formSubmitted: false`, no form row | `EH_LEADS_FORM_ID` / `EH_LEADS_FORM_FIELD_IDS_JSON` missing or wrong | Re-run Phase 6 and confirm the JSON is on one line |
| Form submission succeeds (`formSubmitted: true`) but no row in the form's response sheet | Form has *Limit to 1*, *Verified email*, or CAPTCHA enabled, or *Restrict to organisation* is on | Disable those in *Settings → Responses* (steps 6.18–6.21) |
| Form rows arrive but configurator-only columns are blank | A logical-name → entry-id mapping is missing or the question doesn't exist on the form | Add the question (6.1–6.11) and re-extract the entry ids (6.13–6.16) |

For deeper investigation: Vercel → *Deployments → (latest) → Runtime
Logs*. The submit route logs the precise failure for **each** of
the four sinks (PDF render, email send, Drive upload, sheet append,
form submission) — search for `[configurator/submit]`.

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
