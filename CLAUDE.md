# CLAUDE.md — EH Configurator

This file is the orientation doc for Claude Code sessions on this repo.
Read it once at the start of a session and you should be able to make a
correct, on-brand change without re-deriving the architecture. The
human-facing README at `README.md` is the longer narrative; this file
is the short, opinionated version with the rules that matter.

---

## What this project is

The **Easy Housing Configurator** — a small Next.js 14 (App Router) app
that lets a prospective client design an Easy Housing prefab home in
three steps and walk away with a PDF brief and a lead row in the team's
sheet.

1. **Country gate** (`/country`) — pick UG or KE; that choice fixes the
   currency used everywhere downstream.
2. **Landing** (`/`) — pick a budget, a bedroom count, and a roof
   **typology** (Monopitch / Gable / A-frame / Clerestory, some with
   subtypes).
3. **Configurator** (`/configurator`) — slide the **width**, see the
   real floor plan and an indicative budget update live.
4. **Summary** (`/summary`) — fill in contact info, generate the PDF;
   the server emails it, archives it to Drive, and logs the lead to a
   Sheet and the existing price-list Form.

The non-obvious thing: this is **not** a fake configurator. Floor plans
are real DXF files parsed at request time, areas come from the
geometry, and the indicative budget is computed from the parsed plan
plus per-m² rates from the team's pricing sheet. The catalog grows by
dropping a correctly-named DXF into `public/floorplans/` — no code
change.

---

## Stack

- **Next.js 14.2** App Router, React 18, TypeScript.
- **Tailwind 3** is installed but most styling is inline `style={…}` /
  CSS variables (`var(--eh-*)`) and module CSS. Match what you see in
  the file you're editing — do not introduce a new styling system.
- **Fonts** — self-hosted Poppins (300/400/500/600/700) loaded via
  `next/font/local` in `src/app/layout.tsx`. The browser gets the
  `.woff2` files (~3× smaller than TTF); the server PDF keeps the `.ttf`
  files (react-pdf's fontkit prefers TTF) — both live in `public/fonts/`.
- **PDF** — `@react-pdf/renderer` (server-side), template in
  `src/lib/server/design-pdf.tsx`.
- **Email** — Resend, via `src/lib/server/email.ts`.
- **Google** — Sheets v4 + Drive v3 via a single service-account JWT
  (`src/lib/server/google-auth.ts`), plus a reverse-engineered Forms
  POST to the existing "request price list" form.
- **No test framework wired up.** `npm run build` is the smoke test
  (it runs `next build`, which type-checks). There is no `npm test`.

```
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (type-checks)
npm start       # serve the production build
```

Node 18+.

---

## Routes

| Path                          | What it is                                                       |
| ----------------------------- | ---------------------------------------------------------------- |
| `/country`                    | Country/currency gate. Sets `eh_country` in localStorage.        |
| `/`                           | Landing — budget slider, bedrooms counter, typology picker.      |
| `/configurator`               | Width slider, plan canvas, in-rail bedrooms/typology switcher.   |
| `/summary`                    | Client info, design summary, "Generate PDF".                     |
| `/api/parse-dxf`              | One DXF → typed `FloorplanJSON`. Validates filename safety. In-process cache keyed by filename + mtime. |
| `/api/floor-plans`            | Server scan of `public/floorplans/` → `FloorPlanEntry[]`.        |
| `/api/configurator/reference` | Mints the server-authoritative `EH-YYYY-XXXXXX` reference.       |
| `/api/configurator/submit`    | Renders PDF, emails, archives to Drive, logs to Sheet + Form.    |
| `/api/configurator/validate-email` | Advisory MX/A check on the contact email's domain.          |

**URL is the source of truth on `/configurator`.** It reads
`?typology=`, `?subtype=`, `?bedrooms=`, `?budget=`, `?v=` and re-syncs
local edits back to the URL. Deep links and refreshes restore the
exact view. `subtype` is omitted for Monopitch. `v` selects a DXF
version and defaults to the newest on disk.

---

## The single source of truth: `src/lib/typologies.ts`

If you only read one file, read this one. It defines:

- **The four typologies** (`TypologyId = "monopitch" | "gable" |
  "aframe" | "clerestory"`).
- **Every dimension** (depth, roof pitch, ceiling heights, eaves,
  clerestory raise) for every typology / subtype — **transcribed
  verbatim from `docs/Easy Housing - Typology Dimensions.xlsx` (Sheet1,
  rows 5–14)**. If the spreadsheet changes, edit this file and nowhere
  else. Nothing is interpolated.
- The `Selection = { typology, subtype }` shape and the helpers
  `subtypeOf`, `dimensionsOf`, `depthMmOf`, `depthLabel`,
  `minBedroomsFor`, `selectionLabel`, `defaultSelectionFor`.
- The URL (de)serialisers `selectionToParams` / `selectionFromParams`.
- The **DXF naming scheme** via `dxfFilename()` / `parseDxfFilename()`.
- The **placeholder** affordability pricing helpers `priceFor`,
  `minCostFor`, `maxBedroomsFor`, `*Availability`,
  `resolveAffordableSelection`.

### DXF filename scheme

```
EH_<TYP>[-<SUB>]_<BR>BR_v<n>.dxf
```

`<TYP>` is the typology's 3-letter code (`MNP`, `GBL`, `AFR`, `CLR`);
`<SUB>` is the subtype's 3-letter code (omitted for Monopitch); `<BR>`
the bedroom count; `<n>` the version. **`dxfFilename` and
`parseDxfFilename` are the only place a DXF filename is ever
constructed or parsed.** Never hardcode a filename elsewhere — route
through these two functions so adding/renaming files stays a one-line
change.

### Pricing — read this carefully

There are **two** budget surfaces with different roles:

1. **Landing affordability** uses the **placeholder** `basePrice +
   BEDROOM_COST` model in `typologies.ts`. These figures are flagged
   `PLACEHOLDER` and exist only so the affordability UI can grey out
   unreachable tiles. **Do not treat them as authoritative.**
2. **Configurator indicative budget** is computed live from the loaded
   DXF in `src/lib/budget.ts`: `countRooms()` → `calculateBudget()`,
   using per-m² rates from the "Price Calc" sheet (rows 87–92). This is
   the number shown in the configurator's summary card and on the PDF.

`MEZZANINE_COST` and `BEDROOM_COST` are explicit TODO placeholders. **Do
not invent values for them** and **do not paste any cost constant into
the UI** — always read the helpers in `typologies.ts` (Landing) or
compute live via `budget.ts` (configurator/PDF).

---

## Floor-plan pipeline

```
DXF on disk ──▶ scanFloorPlans() ──▶ FloorPlanEntry[] ──▶ pickPlan() ──▶ /api/parse-dxf ──▶ FloorplanJSON ──▶ FloorplanSVG
```

- **`src/lib/floor-plan-scan.ts`** (server-only) reads
  `public/floorplans/`, runs each filename through
  `parseDxfFilename()`, and yields `FloorPlanEntry`s. Off-scheme files
  are silently skipped, so the directory is safe to drop random files
  into.
- **`/api/floor-plans`** exposes that scan to the client. The landing,
  configurator and summary routes each pre-scan server-side in their
  `page.tsx` and pass the registry into their client component as
  `initialPlans`, so the picker has full availability on first paint with
  no fetch flash. `useFloorPlans(initialPlans)` skips the `/api/floor-plans`
  fetch when seeded and only falls back to fetching when called bare.
- **`pickPlan(plans, selection, bedrooms)`** in `src/lib/floor-plans.ts`
  is the tiered "closest available plan" fallback:
  - Tier 0: exact typology + subtype.
  - Tier 1: same typology, different subtype.
  - Tier 2: any other typology (last resort).
  - Within a tier, the nearest bedroom count wins; ties break to the
    newest version.
- **Availability helpers** (`availableTypologies`, `availableSubtypes`,
  `availableBedrooms`, `resolveAvailable*`) derive what's actually
  drawn. The picker uses these to hide options that have no DXF, while
  the `TYPOLOGIES` data stays intact. Re-enabling Gable Small or
  Clerestory Standard is literally "drop a correctly-named DXF in
  `public/floorplans/`".
- **`/api/parse-dxf?file=…`** loads one file through
  `src/lib/dxf-parser.ts` → typed `FloorplanJSON` (walls, rooms, doors,
  windows, furniture, mezzanine). The route validates the filename
  against `parseDxfFilename()` so it can't be coerced into reading
  arbitrary paths.

### DXF layer convention the parser expects

- Room polygons live on layers named `Rooms$<Name>` —
  `Rooms$Bed Room`, `Rooms$Bath Room`, `Rooms$Living Room`,
  `Rooms$Kitchen`, `Rooms$Terrace`, `Rooms$Mezzanine`.
- Geometry layers: `Walls`, `Doors`, `Windows`, `Furniture`,
  `Furniture Stretch`.
- Vertices flagged `moveX` stretch with the width slider; vertices
  coincident with a window corner can be `attach`ed to the window so
  they track the capped edge.
- Loose `LINE`/`SPLINE` segments on the stitchable layers
  (`Walls`/`Doors`/`Windows`/`Rooms*`) are stitched into closed
  polylines (`src/lib/dxf/stitch-segments.ts`).

### Mezzanine

A plan has a mezzanine iff its DXF carries a `Rooms$Mezzanine` layer.
The parser folds that into `plan.mezzanine` (footprints + area). The
mezzanine area is **not** added to ground-floor GFA — it's the
upper-floor extent. `FloorplanSVG.MezzanineOverlay` draws the "line of
floor above" (hatch + dashed footprint + label). The canvas toolbar
shows the **Plan only / With mezzanine** segmented control only when
a mezzanine exists. Today only `EH_AFR-LRG_1BR_v4.dxf` ships with one.

---

## Country & currency

A **hard gate** at `/country`. The user picks a country; that writes
`eh_country` (and currency + FX rate) to localStorage. Every screen
downstream uses `useCountryGuard()` to refuse to render until the choice
is present, so prices never flash in the wrong currency.

- `src/lib/countries.ts` is the registry. Adding a country = one entry
  in `COUNTRIES` plus a flag image; everything else flows from there.
- **All pricing math stays in UGX everywhere.** `fmtMoney(ugxAmount)`
  is the only place a UGX figure is converted into a localised
  `CODE 1,234,567` string. Conversion uses a fixed `ugxPerUnit` per
  country, rounded to the currency's `displayRound` step to avoid
  false-precision tails.
- `BASE_COUNTRY` is Uganda (`ugxPerUnit = 1`).
- Country selection is **one-way** in the UX (the gate says "you can't
  change this later"). If you find yourself building a "change country
  later" affordance, check with the user first.

---

## Submit flow (`/api/configurator/submit`)

On Generate PDF the page POSTs the entire design. The server:

1. **Re-derives** the plan and budget from the DXF — so the PDF and
   email always reflect server-side truth, not whatever the client
   sent.
2. **Renders the 3-page PDF** (Cover · Plan · Budget & impact) with
   `@react-pdf/renderer` (`src/lib/server/design-pdf.tsx`).
3. **Emails it** via Resend (`src/lib/server/email.ts`). This is the
   **gating** step — the UI only shows success when the email returns
   OK. On failure the UI surfaces a clear error and does **not** claim
   success.
4. **Archives to Drive** (`src/lib/server/drive.ts`) — best-effort,
   multipart upload, scope `drive.file`.
5. **Logs to the leads Sheet** (`src/lib/server/sheets.ts`,
   Sheets v4). `LEADS_HEADER` is the locked column order — the row builder
   in the submit route must stay in sync, and new columns are **appended**
   (the sheet self-heals its header on the next write; inserting mid-row
   would misalign historical rows).
6. **Submits to the existing price-list Google Form**
   (`src/lib/server/forms.ts`, urlencoded POST to `formResponse`) so
   configurator leads land in the same workflow the team already
   watches. Reverse-engineered endpoint — fragile by nature; see
   `docs/integrations-setup.md` Phase 6 for risks.

Steps 4–6 run **after** the gating email and never block each other.
Each failure logs `[configurator/submit]`; the response carries
per-sink booleans `{ emailed, archived, logged, formSubmitted }`.

### Reference ID

`EH-YYYY-XXXXXX` is **server-authoritative**.
`/api/configurator/reference` mints it on page load; the submit
endpoint re-validates it and re-mints if tampered with
(`validateReference` + `makeReference` in
`src/lib/server/reference.ts`). The same id appears on the page, the
PDF cover, the email subject footer, the Sheet row, the Drive filename
description, and the Form row.

### Output filenames

PDF and DXF output names route through `dxfFilename` /
`pdfFilename` in `src/lib/typologies.ts`. **Do not build these
strings yourself anywhere else.**

### Server env vars

| Var | Used for |
| --- | --- |
| `RESEND_API_KEY` | Resend transactional email. Without it, submit returns a clear error. |
| `EH_FROM_EMAIL` | Optional from/reply-to. Defaults to `Easy Housing <hello@easyhousing.org>`. |
| `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` | Service-account JSON for Sheets + Drive. Least-privilege scopes; SA shared into the sheet and Shared Drive. |
| `EH_LEADS_SHEET_ID` | The leads spreadsheet id. |
| `EH_PDF_DRIVE_FOLDER_ID` | Folder in a Shared Drive where every PDF is archived. Unset → skip. |
| `EH_LEADS_FORM_ID` | The price-list form id. Unset → skip form submission. |
| `EH_LEADS_FORM_FIELD_IDS_JSON` | JSON map of logical names → `entry.XXX` ids (extracted via Forms' *Get pre-filled link*). |

A missing sink no-ops; the others keep running. The email is the only
hard requirement.

---

## File layout

```
src/
  app/
    layout.tsx                Root layout, Poppins, metadata.
    page.tsx                  Landing route (server) — pre-scans plans.
    country/page.tsx          Country gate.
    configurator/
      page.tsx                Configurator route (server) — pre-scans plans.
      ConfiguratorClient.tsx  Configurator UI (client).
    summary/
      page.tsx                Step 3 route (server) — pre-scans plans.
      SummaryClient.tsx       Contact form + Generate PDF (client).
    api/
      parse-dxf/route.ts          One DXF → FloorplanJSON (in-process cache).
      floor-plans/route.ts        Directory scan → FloorPlanEntry[].
      configurator/
        reference/route.ts        Mints EH-YYYY-XXXXXX.
        submit/route.ts           PDF + email + Drive + Sheet + Form.
        validate-email/route.ts   Advisory MX/A check on contact email.
    eh-tokens.css / globals.css   Design tokens + global resets.
  components/
    EHNavBar.tsx              Shared top nav (light + dark variants).
    FloorplanSVG.tsx          Renders the plan + dims + labels + mezzanine.
    landing/                  BudgetSlider, BedroomsCounter,
                              TypologyPicker, LandingScreen.
    configurator/             SliderRow, PlanSwitcher, SummaryCard,
                              ViewToggle, PhotoCollage.
  lib/
    typologies.ts             SINGLE SOURCE OF TRUTH — typologies, dims,
                              DXF scheme, placeholder pricing.
    floor-plans.ts            FloorPlanEntry, pickPlan, availability.
    floor-plan-scan.ts        Server-only scan of public/floorplans/.
    dxf-parser.ts             DXF → typed JSON.
    dxf/stitch-segments.ts    LINE/SPLINE → closed polylines.
    budget.ts                 Geometry-based indicative budget.
    countries.ts              Country/currency registry + fmtMoney.
    use-active-country.ts     useCountryGuard / useActiveCountry.
    useFloorPlans.ts          Client hook for /api/floor-plans.
    configurator-submit.ts    Shared submit payload + EMAIL_RE.
    contact-checks.ts         Disposable / typo domain lists.
    design-id.ts              Reference helpers shared client+server.
    rooms.ts                  Room-counting helpers used by UI.
    brand-images.ts           Brand photo metadata + the curated
                              TYPOLOGY_PHOTOS map (typology / subtype →
                              exactly 3 full-home photos) that drives
                              the configurator collage and the PDF.
    server/
      design-pdf.tsx          react-pdf 3-page template.
      email.ts                Resend wrapper.
      drive.ts                Drive v3 multipart upload.
      sheets.ts               Sheets v4 append.
      forms.ts                Google Forms urlencoded POST.
      google-auth.ts          Shared JWT/token exchange.
      reference.ts            EH-YYYY-XXXXXX mint + validate.
      brand-images.ts         Server-side brand asset paths.
  types/
    floorplan.ts              FloorplanJSON, layers, vertices.
public/
  floorplans/                 DXF catalog (drop new files here).
  brand/                      Logos, flags.
  fonts/                      Poppins.
  legal/                      Placeholder terms & privacy PDFs.
docs/
  Easy Housing - Typology Dimensions.xlsx   Dimensional truth.
  dxf-gap-report.md                         Present/missing matrix.
  integrations-setup.md                     Resend/Drive/Sheets/Forms setup.
design_handoff_eh_configurator/
  CLAUDE.md                   Visual/brand rules — read before touching UI.
  tokens/                     Tokens, fonts, logos.
  design-refs/                HTML artboards + prototype JSX.
scripts/
  gen-legal-pdfs.mjs          Generates the placeholder legal PDFs.
  compress-brand-images.py    Resamples public/brand/*.jpg to a web
                              ceiling (2000 px, q82). Run after dropping
                              new brand photos.
archive/                      Old experiments — do not import from here.
```

---

## Adding a new floor plan (the happy path)

1. Name the DXF to the scheme — the easiest way is to copy what
   `dxfFilename(selection, bedrooms, version)` would produce.
2. Drop it into `public/floorplans/`.
3. That's it. The next request re-scans the directory; the landing
   picker, `/api/floor-plans`, and `PlanSwitcher` all pick it up.
   Previously-hidden subtypes (e.g. Gable Small) reappear automatically.

The DXF must follow the layer convention in `src/lib/dxf-parser.ts`
(rooms on `Rooms$<Name>` layers, geometry on `Walls`/`Doors`/`Windows`/
`Furniture`, mezzanine on `Rooms$Mezzanine`, stretch vertices flagged).

---

## Hard rules (do not violate without asking)

- **Currency math is in UGX everywhere.** Display goes through
  `fmtMoney()` in `src/lib/countries.ts`. Never hardcode `UGX `,
  `KES `, `€`, `$`, etc.
- **Text color is `var(--eh-text)` (`#003B2B`), never `#000`.**
- **One CTA per screen** in `var(--eh-green)`. Secondary actions use
  the ghost variant.
- **The price lives in one place per screen.** On the configurator
  it's the "Indicative budget" row in the left summary card — do
  **not** float a budget chip over the plan.
- **Pricing is data-driven.** Use the helpers in `typologies.ts`
  (Landing) or compute live via `budget.ts` (configurator/PDF).
  **Never paste a cost constant into a component.**
- **Width is the only adjustable dimension.** Length (= building
  depth) is fixed per model. Do not add a length slider.
- **Width slider step is 610 mm** (one stud module). Each DXF gets its
  own `minDelta` (collision-clearance floor); `maxDelta` is always
  `minDelta + 4 × 610 mm` so every plan has the same 4-jump range.
- **DXF filenames go through `dxfFilename` / `parseDxfFilename` only.**
- **Do not rename the URL params** (`typology`, `subtype`, `bedrooms`,
  `budget`, `v`).
- **Dimensional values come from the spreadsheet, not your head.** If
  the sheet changes, edit `typologies.ts`; everything else recomputes.
- **No emoji, no gradients, no italic display type, no drop shadows on
  text, no stock photography.** Brand rules live in
  `design_handoff_eh_configurator/CLAUDE.md` — read it before touching
  visuals.

## Soft rules (idioms worth keeping)

- Sentence case with a final period for headings (*"Your details.",
  "Let's design your home."*).
- First-person plural ("We", not "Easy Housing").
- Lowercase wordmark: *easy*housing (SemiBold + Light, no space).
- Sign-off: *"A home for everyone, Easy Housing"* — comma, not em-dash.
- Lucide icons (2 px stroke); never emoji as icon substitutes.

---

## Design tokens (cheat sheet)

Tokens live in
`design_handoff_eh_configurator/tokens/colors_and_type.css` and are
mirrored to `src/app/eh-tokens.css`.

- **Brand** — `--eh-green: #4DCC7A`; `--eh-green-deep` /
  `--eh-green-900: #003B2B`; scale `--eh-green-50…950`.
- **Neutrals** — `--eh-bg: #FFFFFF`; `--eh-bg-alt: #FAF9F6` (canvas);
  `--eh-bg-deep: #003B2B`; `--eh-stroke: #E7EAE5`;
  `--eh-stroke-strong: #C8D0C9`; `--eh-text: #003B2B`;
  `--eh-text-muted: #4A5C56`; `--eh-text-soft: #7A8985`.
- **Support** (sparing, behind photography) — `--eh-sand: #F1E9D9`,
  `--eh-clay: #C58A5B`, `--eh-timber: #8C5E36`, `--eh-sky: #BBD8E2`.
- **Type** — Poppins. Weights 300/400/500/600/700. Display 88/64/48/
  32/24/20. Body 18/16/14/12. Tracking `-0.02em` on headings, `0` on
  body, `0.04–0.12em` on uppercase eyebrows.
- **Spacing** — `--eh-space-1…10` = 4, 8, 12, 16, 24, 32, 48, 64, 96,
  128.
- **Radii** — 4/8/12/20/32/999. Use generous radii on cards (14–32 px);
  pill on buttons.
- **Motion** — `--eh-ease: cubic-bezier(0.2, 0.7, 0.2, 1)`; durations
  fast 120 ms, base 220 ms, slow 400 ms.

---

## State model

- `selection`, `bedrooms`, `budget` — landing local state, pushed to
  `/configurator` as URL params.
- The configurator reads those params back out — **URL is the source
  of truth** there. Width edits, plan switches, and budget drags sync
  back to the URL so refreshes and deep links restore the same view.
- `view: "plan" | "images"`, `showMezzanine` — local to the
  configurator.
- `clientInfo: { name, email, phone, timeline, country, projectType,
  hearAbout, landFunds, newsletter, mapsUrl?, consent }` — local to
  `/summary`; posted to `/api/configurator/submit` on Generate PDF.
  `mapsUrl` is an **optional** pasted Google Maps share link, validated
  loosely via `normalizeMapsUrl` (any `google.*` / `goo.gl` /
  `maps.app.goo.gl` / `g.co` http(s) URL, short share links included) and
  linked through to the PDF cover, the email, the leads Sheet and the
  Form. It never gates submission.
- Country selection — persisted in `localStorage`
  (`eh_country`/`eh_currency`/`eh_fx_ugx_per_unit`). `useCountryGuard()`
  redirects to `/country` if missing.

---

## Known gaps (the current state of the world)

- The **PDF floor-plan thumbnail** draws rooms + walls only — no
  windows, doors, or furniture. The on-screen `FloorplanSVG` remains
  the full-detail renderer.
- **Legal PDFs** under `public/legal/` are placeholders (generated by
  `scripts/gen-legal-pdfs.mjs`). Replace before launch.
- Roof typology drives dimensions, pricing rate, and the picker, but
  **not yet a typology-specific 3D / visual model** — the canvas
  renders the served DXF's plan view regardless of typology.
- Most `{typology, subtype, bedrooms}` combinations don't have a DXF
  yet; `pickPlan` serves the closest available plan with a notice. See
  `docs/dxf-gap-report.md` for the present/missing matrix.
- `basePrice` (per typology/subtype), `BEDROOM_COST`, and
  `MEZZANINE_COST` are explicit placeholders pending confirmed numbers.
- Submit retry: a failed Resend send returns an error to the client; no
  automatic retry yet. Drive/Sheet/Form writes are fire-and-forget.
- FX rates in `countries.ts` (`ugxPerUnit`) are illustrative constants,
  not fetched from an FX API.

---

## What to do when asked to…

- **Add a typology or subtype** → edit `TYPOLOGIES` in
  `src/lib/typologies.ts`; transcribe dimensions from the xlsx;
  pick a unique 3-letter code; add an `iconPath`. Drop matching DXFs in
  `public/floorplans/`. Nothing else should be needed.
- **Re-enable a hidden subtype** → drop a correctly-named DXF in
  `public/floorplans/`. Do not touch the picker code.
- **Tweak dimensions** → edit `src/lib/typologies.ts` only. Never
  copy a number into a component.
- **Tweak pricing rates** → `src/lib/budget.ts` (live budget) and / or
  the placeholder constants in `src/lib/typologies.ts` (landing
  affordability). Flag any change to placeholders in the PR.
- **Add a country** → append to `COUNTRIES` in
  `src/lib/countries.ts`; add a flag image under `public/brand/`;
  extend the gate's `FLAG_SOURCES` map.
- **Change visuals** → read
  `design_handoff_eh_configurator/CLAUDE.md` first; obey the brand
  rules; if the spec in `README.md` conflicts with the artboard in
  `design-refs/`, **the artboard wins**.
- **Change the DXF naming scheme** → almost certainly don't. If you
  must, edit `dxfFilename` + `parseDxfFilename` together, rename every
  file in `public/floorplans/`, and update
  `docs/dxf-gap-report.md`.

---

*A home for everyone, Easy Housing.*
