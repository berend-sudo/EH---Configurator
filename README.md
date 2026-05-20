# EH Configurator

A two-screen Next.js app for the **Easy Housing Configurator**. The user
picks budget, bedrooms, and roof type on a landing screen, then refines
the design (width, plan view) on a configurator screen. Floor plans are
real DXF files; areas and budgets are computed from the geometry, not
made up.

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

| Path                | What it is                                                    |
| ------------------- | ------------------------------------------------------------- |
| `/`                 | Landing — budget slider, bedrooms counter, roof picker.       |
| `/configurator`     | Width slider, plan canvas, in-rail bedrooms/roof switcher.    |
| `/api/parse-dxf`    | Reads a DXF from `public/floorplans/` and returns geometry.   |
| `/api/budget-table` | Returns `{ bedrooms: corePriceUGX }` for the shipped plans.   |

`/summary` (Step 3 — client info + PDF) is **not yet built**. The
"Continue to summary →" button on the configurator is a disabled
placeholder until it ships.

The configurator reads `?bedrooms=`, `?roof=`, `?budget=` from the URL —
those are the source of truth, so deep links are stable and shareable.

## Where things live.

```
src/
  app/
    page.tsx                  Landing route (server) → <LandingScreen/>
    configurator/page.tsx     Configurator route (client)
    api/parse-dxf/route.ts    DXF → FloorplanJSON
    api/budget-table/route.ts Precomputed budget per bedroom count
  components/
    EHNavBar.tsx              Shared top nav (light + dark variants)
    FloorplanSVG.tsx          Renders the plan, dimensions, labels
    landing/                  Landing-only widgets (BudgetSlider,
                              BedroomsCounter, RoofPicker, …)
    configurator/             Configurator-only widgets (SliderRow,
                              PlanSwitcher, SummaryCard, ViewToggle, …)
  lib/
    dxf-parser.ts             DXF → typed JSON (walls, rooms, …)
    floor-plans.ts            Registry of DXF files keyed by bedrooms
    budget.ts                 Cost rates + countRooms + calculateBudget
    budget-table.ts           Server-only: precomputes the price table
    useBudgetTable.ts         Client hook that fetches the API
public/
  floorplans/                 DXF files served at runtime
  brand/                      Logos
  fonts/                      Poppins
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
three inputs.

- **Top nav** — transparent over the photo, white text. Logo
  (`logo-full-white.png`, 28 px), `|` divider, "Configurator" label,
  three 28 × 4 progress bars + "Step **1** of 3" on the right.
- **Card content** — pill chip *"Quick configurator"*, H1 *"Let's
  design your home."*, body paragraph, then:
  - **Budget slider** — range **42M–115M UGX**, default **75M**, step
    500k. (Spec called for 18M–75M; the slider was widened to match
    the real DXF-derived prices, see Budget pipeline below.)
  - **Bedrooms counter** — Studio (0) through whatever the current
    roof + budget allow. The bounds vary per roof: Monopitch allows
    0–3 (Studio plus 1BR / 2BR / 3BR), Clerestory will go up to 4BR
    once its DXFs land, Gable's range TBD. Lower bound is 0 for
    Monopitch and ≥ 1 for the others. Auto-clamps when the budget
    drops below the current selection.
  - **Roof type picker** — three cards: Monopitch, Gable, Clerestory.
    Gable and Clerestory are visible but greyed-out until their DXFs
    ship — see "Adding a new roof type" below.
- **Primary CTA** — *"Open the configurator →"* navigates to
  `/configurator?budget=…&bedrooms=…&roof=…`.

### 02 · Configurator.

> Reference artboard: `config-a` (`ConfiguratorA`).

380 px left rail of controls + 1fr right canvas.

- **Title block** — eyebrow *"YOUR DESIGN"*, H2 *"Monopitch ·
  N-bed"*, subtitle *"N bedrooms · Monopitch roof"*. Updates live as
  the user switches plans.
- **Plan switcher** — two `seg` pill rows: Bedrooms (Studio / 1BR /
  2BR / 3BR) and Roof (Monopitch / Gable / Clerestory). Pills grey
  out for over-budget bedrooms and unavailable roofs. Clicking
  updates the URL params and reloads the DXF.
- **Width slider** — `SliderRow`, range = `plan.baseWidth + minDelta`
  to `plan.baseWidth + maxDelta`, **610 mm step** (one stud module).
  Each DXF declares its own min/max delta; the slider clamps
  accordingly.
- **Summary card** — Footprint, Living area, Terrace, and the
  Indicative budget. The single source of truth for price on this
  screen — do not float a budget chip over the plan.
- **CTAs** — primary *"Continue to summary →"* (disabled, /summary
  not built); ghost *"Reset to default"* resets the slider to
  `plan.minDelta`.
- **Toolbar** — *"Plan view · 1:50"* pill + helper text, and a
  segmented Plan / Example images toggle.
- **Canvas** — `FloorplanSVG` renders walls, rooms, doors, windows,
  furniture, dimension lines, and room labels at 1:50.

### 03 · Client info + PDF — *not yet built*.

> Reference artboard: `final` (`FinalScreen`).

The artboard specs a `1.05fr | 1fr` split: design summary on the
left (mini plan, stat strip), contact form on the right (full name,
email, phone, timeline, consent), with a *"Generate PDF"* CTA. The
PDF itself is three A4 pages: Cover, Plan, Spec & budget. None of
this is in the code yet — when it lands it should reuse `FloorplanSVG`
for the plan thumbnail and `/api/budget-table` for the spec totals.

---

## Budget pipeline.

Two budget surfaces have to agree:

1. **Landing** uses a precomputed table to grey out bedroom and roof
   options the user can't afford.
2. **Configurator** computes the budget live from the loaded DXF as
   the width slider moves.

Both go through the same code path in `src/lib/budget.ts`:
`countRooms` → `calculateBudget`. The Landing's table is just those
values evaluated at each plan's minimum width — computed server-side
in `src/lib/budget-table.ts`, exposed at `/api/budget-table`, and
prerendered as static by Next so the response is essentially free.

The Landing's affordability helpers (`isAffordable`, `maxBedroomsFor`,
`minCostFor`) take the table as their first argument:

```ts
export const maxBedroomsFor = (
  table: BudgetTable | null,
  budget: number,
  roof: RoofType,
) => {
  const floor = minBedroomsFor(roof);
  if (!table) return 4; // pre-fetch: don't gate
  for (let b = 4; b >= floor; b--) {
    const p = priceFor(table, roof, b);
    if (p != null && p <= budget) return b;
  }
  return floor;
};
```

With `table = null` (the brief window before `useBudgetTable()`
resolves) the helpers are permissive and don't gate, so nothing
flickers when the page hydrates.

**Do not hard-code prices in the UI.** If you change a DXF or the
rates in `budget.ts`, the table refreshes on the next build — there's
no constant to hand-edit.

## Adding a new floor plan.

1. Drop the DXF into `public/floorplans/`.
2. Add an entry to `FLOOR_PLANS` in `src/lib/floor-plans.ts` with a
   stable id, the filename, and the bedroom count.
3. Rebuild. `/api/budget-table` and `PlanSwitcher` both pick it up
   automatically.

The DXF must follow the layer convention the parser expects: room
polygons on layers named `Rooms$<Name>` (`Rooms$Bed Room`,
`Rooms$Bath Room`, `Rooms$Living Room`, `Rooms$Terrace`), plus
`Walls`, `Doors`, `Windows`, `Furniture`. Vertices with the `moveX`
flag stretch with the slider; wall/room vertices coincident with a
window corner can be `attach`ed to that window so they track the
capped edge. See `src/lib/dxf-parser.ts` for the full convention.

## Adding a new roof type.

The roof picker on Landing and the in-rail switcher on Configurator
already expose Monopitch, Gable, and Clerestory, but only Monopitch
DXFs ship today. When the others arrive:

1. Drop the new DXFs in `public/floorplans/` and register them in
   `FLOOR_PLANS`. Note the bedroom range varies per roof — Monopitch
   ships 0–3, Clerestory is expected up to 4. Encode the new upper
   bound in a `maxBedroomsForRoof(roof)` helper (mirror of the
   existing `minBedroomsFor`) and use it in the Landing counter and
   the configurator's `PlanSwitcher`.
2. Extend `computeBudgetTable` in `src/lib/budget-table.ts` to return
   a per-roof table (the type signature is the only thing that needs
   to change — the loop already exists).
3. Remove the `available: false` flags from the roof entries in
   `src/components/configurator/PlanSwitcher.tsx`.

---

## Interactions & behaviour.

- **Slider drag** updates the floor plan SVG in real time, plus the
  Footprint, Living, Terrace, and Indicative budget rows in the
  summary card.
- **Budget / bedrooms / roof on landing** are coupled: changing the
  budget or roof can change the maximum bedroom count, and the
  counter auto-clamps via the useEffect in `LandingScreen.tsx`.
- **View toggle** on the configurator — `Plan` ⇄ `Example images`,
  220 ms fade.
- **Hover** on primary button — bg `--eh-green` → `--eh-green-500`,
  no scale, 220 ms `var(--eh-ease)`.
- **Press** on any button — `scale(0.98)`, no color change, 120 ms.
- **Focus ring** — 2 px `--eh-green` outline at 4 px offset, or the
  existing `--eh-shadow-glow` (soft green 6 px).
- **No bounce, no spring overshoot.**

## State.

- `view: "plan" | "images"` — local to the configurator screen.
- `roof`, `bedrooms`, `budget` — landing local state; pushed to the
  configurator route as URL params.
- The configurator reads URL params back out — those are the source
  of truth, so refreshes and deep links restore the same view.
- `clientInfo: { name, email, phone, timeline, consent }` — final
  screen, not yet built.

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
- **Pricing is data-driven.** Use the DXF-derived table from
  `/api/budget-table` (Landing) or compute live in the configurator;
  never paste cost constants into the UI.
- **Width is the only adjustable dimension.** Length is fixed per
  model. Do not add a length slider.

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

- `/summary` route and the PDF templates don't exist yet — the
  "Continue to summary →" CTA is intentionally disabled.
- Roof type doesn't yet drive the visual model. The selection rides
  on the URL but every shipped DXF is Monopitch, so the canvas is the
  same regardless. See "Adding a new roof type" above.
- The bedrooms upper bound is currently **3** (Monopitch only). The
  hard-coded `4` in `BedroomsCounter`'s *"max N for this budget"*
  hint and in `maxBedroomsFor` should become a per-roof value once
  Clerestory's 4BR DXF arrives. See "Adding a new roof type".

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
