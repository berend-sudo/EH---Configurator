# EH Configurator

A two-screen Next.js app for the **Easy Housing Configurator**. The user
picks a budget, bedroom count, and roof **typology** on a landing screen,
then refines the design (width, plan view) on a configurator screen.
Floor plans are real DXF files; areas and the indicative budget are
computed from the geometry, not made up.

The design tokens, fonts, logos, and high-fidelity HTML artboards live
in `design_handoff_eh_configurator/`. The agent-facing rules and
checklist are in `design_handoff_eh_configurator/CLAUDE.md` — read that
before changing visuals.

---

## Run it.

```
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (also runs type-checking)
npm start       # serve the production build
```

Node 18+ is required (Next 14, App Router).

## Routes.

| Path                          | What it is                                                       |
| ----------------------------- | ---------------------------------------------------------------- |
| `/`                           | Landing — budget slider, bedrooms counter, typology picker.      |
| `/configurator`               | Width slider, plan canvas, in-rail bedrooms/typology switcher.   |
| `/summary`                    | Step 3 — client info, design summary, "Generate PDF".            |
| `/api/parse-dxf`              | Reads one DXF from `public/floorplans/` and returns geometry.    |
| `/api/floor-plans`            | Directory scan of `public/floorplans/` → the plan registry.      |
| `/api/configurator/reference` | Mints a server-authoritative `EH-YYYY-XXXXXX` reference.         |
| `/api/configurator/submit`    | Renders the PDF, emails it, archives to Drive, logs the lead.    |

The "Continue to summary →" button on the configurator carries the
selection (`?typology=&subtype=&bedrooms=&budget=&v=&delta=`) through to
`/summary`.

The configurator reads `?typology=`, `?subtype=`, `?bedrooms=`,
`?budget=`, and `?v=` from the URL — those are the source of truth, so
deep links are stable and shareable. (`subtype` is omitted for Monopitch,
which has none; `v` selects a specific DXF version and defaults to the
newest on disk.)

## The typology data model.

`src/lib/typologies.ts` is the **single source of truth**. It defines:

- **Four typologies** (`TypologyId`): `monopitch`, `gable`, `aframe`,
  `clerestory`. Monopitch has no subtype; the other three carry subtypes
  (`Gable`: Small / Compact / Standard / Large; `A-frame`: Small / Normal
  / Large; `Clerestory`: Standard / Large).
- **Dimensions** for every typology / subtype — building depth, roof
  pitch, ceiling low/high/avg, eaves front-back / sides, and the
  clerestory ceiling-high/low pair. Every number is transcribed
  **verbatim** from `docs/Easy Housing - Typology Dimensions.xlsx`
  (Sheet1, rows 5–14). Nothing is interpolated. If the sheet changes,
  edit it here and nowhere else.
- A `Selection = { typology, subtype }` plus helpers: `subtypeOf`,
  `dimensionsOf`, `depthMmOf`/`depthLabel`, `minBedroomsFor`,
  `selectionLabel`, `defaultSelectionFor`, and the URL
  (de)serialisers `selectionToParams` / `selectionFromParams`.
- The DXF name builder/parser and the (placeholder) pricing helpers,
  both described below.

### DXF naming scheme.

`dxfFilename()` / `parseDxfFilename()` are the **only** place a DXF
filename is constructed or read. The scheme is:

```
EH_<TYP>[-<SUB>]_<BR>BR_v<n>.dxf
```

`<TYP>` is the 3-letter typology code (`MNP`, `GBL`, `AFR`, `CLR`),
`<SUB>` the 3-letter subtype code (omitted for Monopitch), `<BR>` the
bedroom count, `<n>` the version. `parseDxfFilename()` validates every
code against `TYPOLOGIES` and returns `null` for anything off-scheme, so
a directory scan can safely skip stray files. **Never hard-code a DXF
filename anywhere else** — always route through these two functions.

## The floor-plan registry.

There is no hand-maintained list of plans. `src/lib/floor-plan-scan.ts`
reads `public/floorplans/` at request time, runs each filename through
`parseDxfFilename()`, and yields a list of `FloorPlanEntry`. It's exposed
to the client at `/api/floor-plans` (and pre-scanned server-side in
`app/page.tsx`, so the landing picker has the availability set on first
paint with no fetch flash). Uploading a correctly-named DXF is all it
takes to make a plan appear — no code change.

`src/lib/floor-plans.ts` operates on that scanned set:

- **`pickPlan(plans, selection, bedrooms)`** — tiered "closest available
  plan" fallback. Tier 0 = exact typology+subtype; tier 1 = same typology,
  other subtype; tier 2 = any other typology (last resort). Within a tier
  the nearest bedroom count wins, ties break to the newest version. The
  configurator shows a *"Closest available plan"* notice whenever the
  served plan isn't the exact requested variant.
- **`available*` / `resolveAvailable*`** — derive which typologies,
  subtypes, and bedroom counts actually have a DXF on disk, and clamp a
  selection / bedroom count to the nearest available one. This is how the
  picker hides options without deleting their `TYPOLOGIES` data: the spec
  stays, the UI only surfaces what's drawn. Re-enabling Gable Small or
  Clerestory Standard is literally "drop a correctly-named DXF in
  `public/floorplans/`".

See `docs/dxf-gap-report.md` for the current present/missing matrix
(regenerated from `TYPOLOGIES` against the on-disk inventory).

## Where things live.

```
src/
  app/
    page.tsx                  Landing route (server) → pre-scans plans → <LandingScreen/>
    configurator/page.tsx     Configurator route (client)
    api/parse-dxf/route.ts    One DXF → FloorplanJSON (safe filename validation)
    api/floor-plans/route.ts  Directory scan → FloorPlanEntry[]
  components/
    EHNavBar.tsx              Shared top nav (light + dark variants)
    FloorplanSVG.tsx          Renders the plan, dimensions, labels, mezzanine overlay
    landing/                  Landing widgets (BudgetSlider, BedroomsCounter,
                              TypologyPicker, LandingScreen)
    configurator/             Configurator widgets (SliderRow, PlanSwitcher,
                              SummaryCard, ViewToggle, PhotoCollage)
  lib/
    typologies.ts             SINGLE SOURCE OF TRUTH — typologies, dims, DXF scheme, pricing
    floor-plans.ts            FloorPlanEntry, pickPlan, availability helpers
    floor-plan-scan.ts        Server-only scan of public/floorplans/
    dxf-parser.ts             DXF → typed JSON (walls, rooms, mezzanine, …)
    budget.ts                 Geometry-based indicative budget (countRooms + calculateBudget)
    useFloorPlans.ts          Client hook that fetches /api/floor-plans
public/
  floorplans/                 DXF files served at runtime
  brand/                      Logos
  fonts/                      Poppins
docs/
  Easy Housing - Typology Dimensions.xlsx   Dimensional source of truth
  dxf-gap-report.md                         Present/missing DXF coverage matrix
design_handoff_eh_configurator/
  CLAUDE.md                   Agent rules — read before changing visuals
  tokens/                     Design tokens, fonts, logo assets
  design-refs/                HTML artboards and prototype JSX
```

---

## Screens.

### 01 · Landing.

> Reference artboard: `landing-b` (`LandingB` in `artboards.jsx`).

Full-bleed photo background (current placeholder: deep-green gradient
with a diagonal dark overlay). Centered 760 px white card holds the
inputs.

- **Top nav** — transparent over the photo, white text. Logo, divider,
  "Configurator" label, three progress bars + "Step **1** of 3".
- **Budget slider** — UGX, drives which bedroom counts and typologies
  are affordable.
- **Bedrooms counter** — bounded by both the budget *and* what's on
  disk for the current selection. Lower bound is `minBedroomsFor()`
  (0 for Monopitch and A-frame Small; ≥ 1 otherwise). Auto-clamps when
  the budget or selection changes.
- **Typology picker** — four tiles (Monopitch / Gable / A-frame /
  Clerestory) plus a docked subtype strip for the active typology. Tiles
  and chips grey out when over budget, and are hidden entirely when no
  DXF exists for them (the picker takes the scanned `plans` list).
- **Primary CTA** — *"Open the configurator →"* navigates to
  `/configurator?typology=…&subtype=…&bedrooms=…&budget=…`.

### 02 · Configurator.

> Reference artboard: `config-a` (`ConfiguratorA`).

380 px left rail of controls + 1fr right canvas.

- **Title block** — eyebrow *"YOUR DESIGN"*, model heading, subtitle,
  and the *"Closest available plan"* notice when the served plan is a
  fallback (see `pickPlan`).
- **Plan switcher** (`PlanSwitcher`) — a Bedrooms seg row plus the
  compact `TypologyPicker`. Both gate on the scanned plans: only bedroom
  counts and subtypes with a DXF are offered.
- **Width slider** — `SliderRow`, range = `plan.baseWidth + minDelta`
  to `plan.baseWidth + maxDelta`, **610 mm step** (one stud module).
  Each DXF gets its own `minDelta` (collision-clearance floor from PT
  zones + furniture); `maxDelta` is always `minDelta + 4 × 610 mm`, so
  every plan has the same 4-jump range above its floor.
- **Summary card** — Footprint, Living area, Terrace, an optional
  Mezzanine row (only when the plan has one), the Indicative budget, and
  the served DXF filename. The single source of truth for price on this
  screen.
- **Toolbar** — *"Plan view · 1:50"* pill, a **Plan only / With
  mezzanine** segmented control (only shown when the plan has a
  `Rooms$Mezzanine` layer), and a Plan / Example images toggle.
- **Canvas** — `FloorplanSVG` renders walls, rooms, doors, windows,
  furniture, dimension lines, room labels, and the mezzanine overlay at
  1:50.

### 03 · Client info + PDF.

> Reference artboard: `final` (`FinalScreen`).

A `1.05fr | 1fr` split (stacks below 1024 px). **Left** — design
summary: typology heading, *"Saved {date} · ref {ref}"*, a DXF chip
showing the output filename, the `FloorplanSVG` thumbnail
(`showDims={false}`), and a Width / Length / Footprint / Bedrooms
stat strip. **Right** — a deep-green summary card (the *only* place
the budget appears, plus Width / Length chips) and the contact form:
full name, email, phone, *"Intended timeline to delivery"*, plus the
placeholder mirror fields (country / project type / hear-about), and
a consent paragraph linking the terms & privacy PDFs. The **Generate
PDF** button stays `disabled` until every required field is valid
and consent is ticked (`canGenerate` in `src/app/summary/page.tsx`).

On submit the page POSTs the full design to
`/api/configurator/submit`, which:

1. **Renders the 3-page PDF** (Cover · Plan · Spec & budget) with
   `@react-pdf/renderer` — `src/lib/server/design-pdf.tsx`. The plan
   and budget are recomputed server-side from the DXF, so prices stay
   data-driven.
2. **Emails it to the client** via Resend
   (`src/lib/server/email.ts`), from a team-owned reply-to address.
   This is the **gating** signal — the UI only shows success when the
   send returns OK; on failure it surfaces *"We couldn't email your
   design …"* and does not claim success.
3. **Archives the PDF to a Shared Drive folder**
   (`src/lib/server/drive.ts`, Drive API v3 multipart upload, scope
   `drive.file`). Best-effort; the returned viewer link is threaded
   into the sheet row and form row.
4. **Logs the lead** to the *"EH Configurator leads"* Google Sheet
   (`src/lib/server/sheets.ts`, Sheets API v4).
5. **Submits a row to the existing "request price list" form**
   (`src/lib/server/forms.ts`, urlencoded POST to `formResponse`) so
   configurator leads land in the same workflow the team already
   watches. Reverse-engineered endpoint — see *Risks* in
   `docs/integrations-setup.md` Phase 6.

Steps 3–5 run after the gating email and never block each other —
each failure logs `[configurator/submit]` and the response carries
the per-sink booleans `{ emailed, archived, logged, formSubmitted }`.

The `EH-YYYY-XXXXXX` reference is **server-authoritative** —
`/api/configurator/reference` mints it on page load, the submit
endpoint re-validates and re-mints if the client tampered with the
value (`validateReference` + `makeReference` in
`src/lib/server/reference.ts`). The same id shows on the page, the
PDF cover, the email subject footer, the sheet row, the Drive
filename description, and the form row. Output filenames flow
through `dxfFilename` (in `src/lib/typologies.ts`) and the matching
`pdfFilename` helper — the single source of truth for the
`EH_<TYP>[-<SUB>]_<BR>BR_v<n>` scheme. Google JWT/token exchange
lives in `src/lib/server/google-auth.ts` and is shared by `sheets`
+ `drive`; scope is requested per-call.

#### Server secrets (set in the host env / Vercel).

| Var | Used for |
| --- | --- |
| `RESEND_API_KEY` | Resend transactional email. Without it, submit returns a clear error. |
| `EH_FROM_EMAIL` | Optional. From/reply-to address. Defaults to `Easy Housing <hello@easyhousing.org>`. |
| `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` | Service-account JSON for both Sheets and Drive (least-privilege scopes; SA shared into the sheet + Shared Drive). |
| `EH_LEADS_SHEET_ID` | The leads spreadsheet id. |
| `EH_PDF_DRIVE_FOLDER_ID` | Folder inside a Shared Drive where every emailed PDF is archived. Leave unset to skip archiving. |
| `EH_LEADS_FORM_ID` | The existing "request price list" form id. Leave unset to skip form submission. |
| `EH_LEADS_FORM_FIELD_IDS_JSON` | JSON map of logical field names → `entry.XXX` ids (extracted via Forms' *Get pre-filled link*). |

**Provider / retry notes.** Email uses Resend (single API key, native
attachments). There is no automatic retry yet — a failed send returns
an error to the client so they can retry the submit; add a queue/retry
in front of `sendDesignEmail` if delivery volume warrants it. Drive,
sheet and form writes are fire-and-forget with error logging; if any
is unset, the corresponding sink no-ops and the others run. Setup
walkthrough lives in `docs/integrations-setup.md`. The placeholder
legal PDFs under `public/legal/` are generated by
`scripts/gen-legal-pdfs.mjs` and should be replaced with the real
documents before launch.

---

## Budget pipeline.

Two budget surfaces, two roles:

1. **Landing affordability** uses the **placeholder** `basePrice +
   BEDROOM_COST` model in `typologies.ts` (`priceFor`, `minCostFor`,
   `maxBedroomsFor`, `*Availability`, `resolveAffordableSelection`) to
   grey out and clamp options the budget can't reach. These base prices
   are **provisional** — the spreadsheet carries no prices — so they are
   flagged `PLACEHOLDER` in the data and must be replaced with confirmed
   figures before launch.
2. **Configurator indicative budget** is computed live from the loaded
   DXF geometry in `src/lib/budget.ts`: `countRooms` → `calculateBudget`,
   using per-m² rates from the "Price Calc" sheet. This is the number
   shown in the summary card and it updates as the width slider moves.

`MEZZANINE_COST` and `BEDROOM_COST` are explicit TODO placeholders — do
not invent values for them. **Do not paste cost constants into the UI;**
read the helpers in `typologies.ts` (Landing) or compute live via
`budget.ts` (configurator).

## Adding a new floor plan.

1. Name the DXF to the scheme — easiest is to copy what
   `dxfFilename(selection, bedrooms, version)` would produce.
2. Drop it into `public/floorplans/`.
3. That's it. The next request re-scans the directory; `/api/floor-plans`,
   the landing picker, and `PlanSwitcher` all pick it up automatically.
   If it re-enables a previously-hidden subtype (e.g. Gable Small), that
   tile/chip reappears on its own.

The DXF must follow the layer convention the parser expects: room
polygons on layers named `Rooms$<Name>` (`Rooms$Bed Room`,
`Rooms$Bath Room`, `Rooms$Living Room`, `Rooms$Terrace`, and
`Rooms$Mezzanine` for a mezzanine), plus `Walls`, `Doors`, `Windows`,
`Furniture`. Vertices with the `moveX` flag stretch with the slider;
wall/room vertices coincident with a window corner can be `attach`ed to
that window so they track the capped edge. See `src/lib/dxf-parser.ts`
for the full convention.

## Mezzanine.

A plan has a mezzanine when its DXF carries a `Rooms$Mezzanine` layer;
the parser folds it into `plan.mezzanine` (footprints + area). The
mezzanine area is **not** added to ground-floor GFA — it's the
upper-floor extent. `FloorplanSVG`'s `MezzanineOverlay` draws the "line
of floor above" (hatch + dashed footprint + label chip), and the canvas
toolbar shows a Plan-only / With-mezzanine toggle. Today only
`EH_AFR-LRG_1BR_v1.dxf` ships with a mezzanine.

---

## State.

- `view: "plan" | "images"`, `showMezzanine` — local to the configurator.
- `budget`, `bedrooms`, `selection` — landing local state; pushed to the
  configurator route as URL params.
- The configurator reads URL params back out — those are the source of
  truth, so refreshes and deep links restore the same view.
- `clientInfo: { name, email, phone, timeline, country, projectType,
  hearAbout, consent }` — local to the `/summary` screen; posted to
  `/api/configurator/submit` on Generate PDF.

---

## Design tokens.

All tokens live in
`design_handoff_eh_configurator/tokens/colors_and_type.css` and are
mirrored into `src/app/eh-tokens.css`. Headline values:

**Brand color**
- `--eh-green: #4DCC7A` — primary, CTAs, accents.
- `--eh-green-deep / --eh-green-900: #003B2B` — body text, deep
  surfaces, the "easy" wordmark.
- `--eh-green-50` … `--eh-green-950` — full scale.

**Neutrals**
- `--eh-bg: #FFFFFF`
- `--eh-bg-alt: #FAF9F6` — warm off-white, the canvas color.
- `--eh-bg-deep: #003B2B`
- `--eh-stroke: #E7EAE5`, `--eh-stroke-strong: #C8D0C9`
- `--eh-text: #003B2B` (deep green, **not** pure black)
- `--eh-text-muted: #4A5C56`, `--eh-text-soft: #7A8985`

**Support** (sparing, behind photography only)
- `--eh-sand: #F1E9D9`, `--eh-clay: #C58A5B`,
  `--eh-timber: #8C5E36`, `--eh-sky: #BBD8E2`.

**Typography** — Poppins, self-hosted from `public/fonts/`.
Weights in use: 300 / 400 / 500 / 600 / 700. Display sizes 88 / 64 /
48 / 32 / 24 / 20. Body 18 / 16 / 14 / 12. Tracking `-0.02em` on
headings, `0` on body, `0.04–0.12em` on uppercase eyebrows.

**Spacing scale** — 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 (`--eh-space-1`
through `--eh-space-10`).

**Radii** — 4 / 8 / 12 / 20 / 32 / 999. Use generous radii: 14–32 px
on cards, pill on buttons.

**Motion**
- `--eh-ease: cubic-bezier(0.2, 0.7, 0.2, 1)`
- `--eh-duration-fast: 120 ms` — hover, press.
- `--eh-duration-base: 220 ms` — toggles, fades.
- `--eh-duration-slow: 400 ms` — page entrances.

## Brand do / don't.

**Do** — generous whitespace, photo-led imagery, sentence-case copy
with a final period, the *"A home for everyone."* triad rhythm
(*"Sustainable. Social. Scalable."*), Poppins SemiBold for headings
+ Light for body, deep green as the ink color.

**Don't** — gradients, emoji, italic display type, the "rounded box
with green left border" trope, translucent green overlays on
photography, the bright green as a background for the logo, SVG
approximations of brand imagery, stock photography.

## Hard rules.

- **Currency: UGX**, comma separators — never €, never $. Helper:
  `'UGX ' + n.toLocaleString('en-US')`.
- **Text color is `--eh-text` (#003B2B), never `#000`.**
- **One CTA per screen** in `--eh-green`. Secondary actions use the
  ghost variant.
- **The price lives in one place per screen.** On the configurator
  it's the "Indicative budget" row in the left summary card — do
  *not* float a budget chip over the plan.
- **Pricing is data-driven.** Use the helpers in `typologies.ts`
  (Landing) or compute live via `budget.ts` (configurator); never paste
  cost constants into the UI. Base prices are placeholders pending
  confirmed figures.
- **Width is the only adjustable dimension.** Length (building depth) is
  fixed per model. Do not add a length slider.
- **Don't rename the DXF scheme or the URL params** (`typology`,
  `subtype`, `bedrooms`, `budget`, `v`).

## Icons & photography.

- **Icons** — Lucide (`lucide-react`). 2 px stroke, default color
  `var(--eh-text)`, accent `var(--eh-green-400)` for active states.
  Sizes 16 / 20 / 24 / 32. No emoji as icon substitutes.
- **Photography** — currently rendered as warm gradient placeholders.
  Production drops real on-the-ground Easy Housing photos into the
  same slots. **No stock photography.** If photos aren't available,
  keep the brand-appropriate placeholder treatment.

---

## Known gaps.

- The PDF floor-plan thumbnail draws rooms + walls only (no windows /
  doors / furniture) — enough for an indicative brief. The on-screen
  `FloorplanSVG` remains the full-detail renderer.
- Legal PDFs under `public/legal/` are placeholders.
- Roof typology drives dimensions, pricing rate, and the picker, but
  not yet a typology-specific 3D/visual model — the canvas renders the
  served DXF's plan view regardless of typology.
- Most `{typology, subtype, bedrooms}` combinations don't have a DXF yet;
  `pickPlan` serves the closest available plan with a notice until they
  land. See `docs/dxf-gap-report.md`.
- `basePrice` / `BEDROOM_COST` / `MEZZANINE_COST` are placeholders
  pending confirmed numbers.

## Tone of voice.

- Sentence case with a final period for headings (*"Your details.",
  "Let's design your home."*).
- Plain, warm, optimistic, first-person plural ("We", not "Easy
  Housing").
- Lowercase wordmark: *easy*housing (SemiBold + Light, no space).
- Sign-offs: *"A home for everyone, Easy Housing"* — comma, not
  em-dash.
- Avoid: "revolutionary", "disruptive", marketing superlatives, walls
  of jargon (CLT, FSC, prefab are fine *next to* an everyday-language
  gloss).

---

*A home for everyone, Easy Housing.*
