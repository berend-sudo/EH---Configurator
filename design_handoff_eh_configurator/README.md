# Handoff — EH Configurator Layout

> Design reference for the **Easy Housing Configurator** web tool.
> Layout & visual treatment only — the underlying configurator
> (slider → floor plan → live budget → PDF) already works.

---

## What this is

This bundle contains a **high-fidelity HTML design reference** for the
EH Configurator. The HTML files are **prototypes** — not production
code. The task is to **recreate these layouts in the existing
Claude Code → GitHub → Vercel pipeline**, using the project's
established stack (React/Next + Tailwind/CSS, whatever's in the repo)
and the design tokens shipped in `tokens/`.

If you're a Claude Code agent, also read `CLAUDE.md` — it has the
brand rules and "don'ts" in a tighter format.

## Fidelity

**Hi-fi** — final colors, typography, spacing, components, and copy
are all locked. Recreate pixel-for-pixel. The only intentional
placeholders are the photographs (rendered as warm gradient blocks
in the prototype) — these get swapped for real Easy Housing on-the-
ground photography later.

## Bundle contents

```
design_handoff_eh_configurator/
├── README.md                 ← this file
├── CLAUDE.md                 ← agent-facing rules + checklist
├── tokens/
│   ├── colors_and_type.css   ← 84 CSS custom properties — drop into globals
│   ├── fonts/                ← Poppins (Light 300 / Regular 400 /
│   │                            Medium 500 / SemiBold 600 / Bold 700)
│   └── assets/               ← logo PNGs (full color / white / mark)
└── design-refs/
    ├── EH Configurator Layouts.html   ← open this in a browser to see all screens
    ├── artboards.jsx                  ← all screen components
    ├── floor-plan.jsx                 ← reusable SVG floor-plan recreation
    ├── design-canvas.jsx              ← presentation harness (not for ship)
    └── design-system/                 ← copy of /tokens so the prototype runs standalone
```

To preview the prototype: open `design-refs/EH Configurator Layouts.html`
in a browser (no build step). You'll see all four sections on a
pan/zoom canvas.

---

## Screens to build

There are **four screens** (plus the generated PDF). Build them in
this order.

### 01 · Landing — *centered card on photo*

> Reference: artboard `landing-b` (component `LandingB` in
> `artboards.jsx`).

**Purpose.** First impression. Capture three inputs (budget /
bedrooms / roof type) and route the user into the configurator.

**Layout.**
- Full-bleed background: warm sunlit photograph of an Easy Housing
  build (placeholder: deep-green to forest-green gradient with a
  diagonal dark overlay `linear-gradient(135deg, rgba(0,59,43,0.6)
  0%, rgba(0,59,43,0.25) 60%, rgba(0,59,43,0.5) 100%)`).
- Top nav over photo (transparent, white text). Logo (`logo-full-white.png`,
  height 28 px), `|` divider, "Configurator" label, "Step Start"
  right-aligned with "Save & exit" stub.
- Centered white card: **760 px wide**, padding `48px 56px`, border
  radius `32 px`, shadow `0 32px 80px rgba(0,59,43,0.35)`.

**Card content (top → bottom).**
1. Small chip pill — text "QUICK CONFIGURATOR" — `--eh-green-100`
   bg, `--eh-green-800` text, 5/12 padding, radius 999, font 12 px
   SemiBold uppercase tracking 0.06em.
2. H1 — *"Let's design your home."* — Poppins SemiBold 44 px,
   line-height 1.08, letter-spacing -0.025em, color `--eh-text`.
3. Body — *"Three quick choices — we'll generate a floor plan and
   a transparent budget you can share with our architects."*
   Poppins Light 16 px, line-height 1.55, color `--eh-text-muted`,
   max-width 520 px, centered.
4. **Budget slider** (left column, 1.2fr) + **Bedrooms counter**
   (right column, 1fr), gap 36 px.
5. **Roof type picker** — 3 equal cards in a grid.
6. Primary CTA — *"Open the configurator →"* — full pill, 16 px
   text, padding `16px 36px`, `--eh-green` bg, `--eh-green-900`
   text. Hover: bg → `--eh-green-500`.
7. Caption *"You can change anything in the next step."* —
   centered, 12 px, `--eh-text-soft`.

**Control specs.**

*Budget slider* — UGX values. Range `18,000,000 – 75,000,000`,
default `32,500,000`. Rail height 6 px, bg `--eh-stroke`. Fill
`--eh-green-900`. Knob 22 × 22 circle `--eh-green` with a 6 px
glow `rgba(77,204,122,0.20)` and shadow `0 2px 6px rgba(0,59,43,0.18)`.
Above-rail row: label *"BUDGET"* (11 px SemiBold uppercase
tracking 0.08em, `--eh-text-muted`) left; value *"UGX 32,500,000"*
(20 px SemiBold tabular-nums, `--eh-text`) right. Below rail:
min/max as 12 px `--eh-text-soft`.

*Bedrooms counter* — minus button (42 × 42, 1.5 px stroke
`--eh-stroke-strong`, white bg, `–` glyph 20 px). Number (34 px
SemiBold, min-width 60, centered). Plus button (42 × 42, no
border, `--eh-green` bg, `--eh-green-900` `+` glyph 20 px
SemiBold). Default value 2. Min 1, max 4.

*Roof type picker* — 3-column grid, gap 10 px. Each option is a
rounded card (radius 14, padding `14px 10px`, 1.5 px stroke
`--eh-stroke`, centered SVG glyph + label). Active option flips
to `--eh-green-900` bg, white text, glyph stroke `--eh-green`.
Glyphs (24 × 24 SVG):
- **Monopitch** — `M 6 28 L 6 14 L 50 6 L 50 28 Z` (sloped roof)
- **Gable** — `M 6 28 L 6 16 L 28 6 L 50 16 L 50 28 Z`
- **Flat** — `M 6 28 L 6 12 L 50 12 L 50 28 Z`
Default selection: monopitch.

---

### 02 · Configurator — *left rail of controls + plan center stage*

> Reference: artboard `config-a` (component `ConfiguratorA`).

**Purpose.** The user adjusts the design (currently just **width**;
length is fixed per model) and watches the floor plan + price
update in real time.

**Layout.**
- Top nav (white, same logo + "Configurator" label, step text
  `"Configure · Monopitch Studio"`).
- Body: two columns, **380 px left rail** + **1fr right canvas**.
  Left rail bg `--eh-bg`, right pane bg `--eh-bg-alt`, divider
  `1px solid --eh-stroke`.

**Left rail (380 px, padding `32px 32px 28px`, gap 28 px between
sections).**

1. **Title block.** Eyebrow *"YOUR DESIGN"* (11/SemiBold/0.12em
   uppercase, `--eh-green-700`). H2 *"Monopitch · Studio"* (26 px
   SemiBold, -0.02em). Sub *"2 bedrooms · Monopitch roof"* (13 px,
   `--eh-text-muted`).
2. **Dimensions section.** Section eyebrow *"DIMENSIONS"*. One
   `SliderRow`:
   - **Width** — 5.0 – 7.5 m, default 7.42 m, step 0.01 m.
   Format: `{value.toFixed(2)} m`.
   *No length slider.*
3. **Footprint summary card.** `--eh-bg-alt` bg, 1 px `--eh-stroke`,
   radius 16, padding `20px 22px`. Three `SummaryItem` rows
   (label left in `--eh-text-muted` 13 px, value right in 15 px
   SemiBold tabular-nums, bottom border 1 px `--eh-stroke`):
   - *Footprint* — `36.88 m²`
   - *Living area* — `16.39 m²`, sub *"incl. kitchen"* (11 px,
     `--eh-text-soft`)
   - *Terrace* — `5.10 m²`
   Bottom row (above border-less): **Indicative budget** (13 px
   SemiBold) on the left, `UGX 32,500,000` (18 px SemiBold,
   `--eh-green-900`, tabular-nums) on the right.
   **The single source of truth for price — do not show it again
   elsewhere on this screen.**
4. **CTAs** (pushed to bottom of the rail with `margin-top: auto`).
   - Primary: *"Continue to summary →"* — pill, `--eh-green` bg.
   - Ghost: *"Reset to default"* — transparent, 1.5 px
     `--eh-green-900` stroke.

**Right pane (padding `28px 36px 36px`).**

Toolbar row (margin-bottom 18):
- Left: chip pill *"PLAN VIEW · 1:50"* (`--eh-green-100` /
  `--eh-green-800`) + dim helper *"Use the slider to change width"*
  (13 px, `--eh-text-muted`).
- Right: segmented control with two buttons — **Plan** /
  **Example images**. Active button: `--eh-green-900` bg, white
  text. Inactive: transparent, `--eh-text` text. Container: 4 px
  padding, 1 px `--eh-stroke-strong`, white bg, fully rounded.

Plan canvas (fills remaining height): white card, 1 px
`--eh-stroke`, radius 24, padding `40px 48px`. Inside: the
`FloorPlan` SVG centered.

When *Example images* is active, swap the floor plan for a
2-column / 2-row collage (padding reduces to 24): big tall image
on the left (gridRow 1 / span 2, "Studio exterior · Mukono pilot"),
two stacked images on the right (Living area, Bedroom). Each
photo block is `--eh-sand`-toned, radius 18, with a small white
caption bottom-left.

---

### 03 · Client info & generate PDF

> Reference: artboard `final` (component `FinalScreen`).

**Purpose.** Capture the four contact fields, then generate the
3-page PDF.

**Layout.** Top nav (step *"3 of 3 · Your details"*). Body grid
**1.05fr left | 1fr right**, both full-height, divider `1px
--eh-stroke`. Left bg `--eh-bg-alt`, right bg `--eh-bg`.

**Left (design summary).** Padding `56px 64px`.
- Eyebrow *"YOUR DESIGN"* `--eh-green-700`.
- H1 *"Monopitch · Studio"* (42/600/-0.02em).
- Sub *"Saved 18 May 2026 · ref EH-2026-0418"* (15 px Light,
  `--eh-text-muted`).
- Mini plan card — white, radius 24, 1 px `--eh-stroke`, padding
  24. Contains the FloorPlan SVG with `showDims={false}`.
- Stat strip — 4 equal cards (1 px `--eh-stroke`, radius 14,
  padding `14px 16px`), eyebrow + 20 px SemiBold value:
  Width `7.42 m` · Length `4.97 m` · Footprint `36.88 m²` ·
  Bedrooms `2`.

**Right (contact form).** Padding `56px 64px`. Justify-between
top-to-bottom.
- H2 *"Your details."* (32/600/-0.02em).
- Body — *"We'll generate a PDF overview and send it to you.
  Bring it along when you meet our architects."* — 15 px Light
  `--eh-text-muted`, line-height 1.55.
- Form grid `1fr 1fr` (gap 20):
  - Full name (col-span 2) — text
  - Email — text
  - Phone — text
  - Intended timeline (col-span 2) — select with options:
    `Within 3 months` · `3 – 6 months` · `6 – 12 months` · `Over a year`
- Consent checkbox row — *"I agree to be contacted by an Easy
  Housing architect about this design. We never sell your details."*
  13 px `--eh-text-muted`, accent color `--eh-green-500`,
  default-checked.
- Footer row (border-top 1 px `--eh-stroke`, padding-top 24):
  Ghost button *"← Edit design"* left, primary CTA *"Generate PDF"*
  with lucide `file-down` icon right.

**Field spec.** 1.5 px `--eh-stroke-strong`, radius 12,
padding `14px 16px`, font 15 Light `--eh-text`. Focus state:
border `--eh-green-500`, box-shadow `0 0 0 4px rgba(77,204,122,.18)`.
Label above input: 11 px SemiBold uppercase 0.08em tracking,
`--eh-text-muted`.

---

### 04 · The generated PDF (3 pages, A4 portrait)

> References: `pdf-cover`, `pdf-plan`, `pdf-spec` (`PDFCover` /
> `PDFPlan` / `PDFSpec` components).

A4 portrait, 595 × 842 px at 72 dpi.

**Page 1 — Cover.**
- Top band: `--eh-green-900` bg, padding `32px 36px`. Logo
  (white) left, *"DESIGN BRIEF · 2026"* eyebrow
  (`--eh-green-200`) right.
- Hero photo (flex-1, full-bleed) — same placeholder treatment as
  the landing background.
- Title block: white bg, padding `36px 36px 24px`. Eyebrow
  *"CONFIGURATOR OUTPUT"*. H1 *"Monopitch · Studio"* (34/600).
  Sub *"2-bedroom · 36.88 m² · Indicative budget UGX 32,500,000"*
  (13 px `--eh-text-muted`). Hairline divider 1 px `--eh-stroke`.
  Two-column block — left: *"PREPARED FOR"* eyebrow + name +
  email; right: *"REFERENCE"* eyebrow + EH-2026-0418 + generated
  date.
- Footer band: `--eh-bg-alt`, padding `14px 36px`. *"A home for
  everyone, Easy Housing"* left, *"1 / 3"* right. Both 9 px
  `--eh-text-muted`.

**Page 2 — Plan.** White, padding `32px 36px`.
- Header row: logo (color) left, *"FLOOR PLAN"* eyebrow right.
- Title block: H2 *"Plan view."* (22/600). Sub *"1 : 50 · all
  dimensions in mm"* (11 px `--eh-text-muted`).
- Plan area: `--eh-bg-alt` bg, 1 px `--eh-stroke`, radius 14,
  padding 24. Contains the FloorPlan SVG with full dimensions.
- Legend: 4 columns, 18 × 18 colored swatch (radius 4, 1 px
  `--eh-stroke`) + label (10 px `--eh-text-muted`) + value
  (12 px SemiBold). Rooms: Living `16.39 m²` (sand), Bath
  `3.36 m²` (sky), Bed `8.54 m²` (sand), Terrace `5.10 m²`
  (timber).
- Footer: 1 px border-top, *"EH-2026-0418 · Monopitch Studio"* /
  *"2 / 3"*.

**Page 3 — Spec & budget.** White, padding `32px 36px`.
- Header row: logo + *"SPEC & BUDGET"*.
- Title: H2 *"Spec sheet."* + sub *"Indicative budget — final
  pricing depends on site & local sourcing."*.
- Table — 3 columns `110px 1fr 90px` (Category · Item · UGX).
  Header row: 9 px SemiBold uppercase 0.12em tracking, 1.5 px
  `--eh-green-900` bottom border. Data rows: 11 px, 1 px
  `--eh-stroke` between, padding `10px 0`. Right-align the
  number column, tabular-nums.

  | Category        | Item                                          | UGX           |
  |-----------------|-----------------------------------------------|--------------:|
  | Foundation      | Concrete pad, 36.88 m²                        | 4,500,000     |
  | Structure       | CLT timber frame, prefab panels               | 10,500,000    |
  | Cladding        | FSC pine, vertical board-on-board             | 3,400,000     |
  | Roof            | Monopitch, insulated, corrugated steel        | 5,200,000     |
  | Interior        | Plywood lining, partition walls               | 3,800,000     |
  | Windows & doors | Triple-glazed, 4 windows, 2 doors             | 3,000,000     |
  | Kitchen & bath  | Compact units, fittings                       | 3,400,000     |
  | Electrical      | Solar-ready, 8 outlets, LED                   | 1,900,000     |
  | Logistics       | Transport & local install crew                | 2,800,000     |
  | **Indicative total**                                            | **UGX 38,500,000** |

- Climate-impact callout — `--eh-green-900` bg, white text,
  radius 14, padding `18px 22px`. Eyebrow *"CLIMATE IMPACT"*
  + body *"Reduces 26 tonnes of CO₂ — equivalent to 130,000 km of
  plane travel."*. On the right, big number *"−26 t CO₂"* in
  `--eh-green` (42/600).
- Footer: *"A home for everyone, Easy Housing"* / *"3 / 3"*.

---

## Interactions & behaviour

- **Slider drag** — width updates the floor plan SVG in real time
  (debounce optional, but transitions on plan should be ≤ 120 ms
  to feel responsive). Updates also bump:
  - Footprint value (`width × length` − terrace/bathroom losses).
  - Living-area value (`(width − 2.85) × (length − 1.45) × 0.62`).
  - Terrace value (`terraceW × 1.45` m).
  - Indicative budget (UGX). Use existing pricing logic on the
    backend; the layout only displays.
- **Roof type / bedrooms / budget** on landing — chip-style
  selection. Active state flips color (see specs). No
  modal/confirm — just inline state.
- **View toggle** on the configurator — `Plan` ⇄ `Example images`.
  Fade transition 220 ms ease.
- **Hover** on primary button — bg `--eh-green` → `--eh-green-500`,
  no scale change, transition 220 ms `var(--eh-ease)`.
- **Press** on any button — scale `0.98`, no color change, 120 ms.
- **Focus ring** — 2 px `--eh-green` outline at 4 px offset, or
  use the existing `--eh-shadow-glow` (6 px green soft glow).
- **Page entrance** — 8–12 px upward translate + opacity fade,
  400 ms `var(--eh-ease)`. No bounce, no overshoot.

## State management

Minimal — most of the state already lives in your existing
working configurator. New state surfaces:

- `view: "plan" | "images"` — local to the configurator screen.
- `roofType: "monopitch" | "gable" | "flat"` — landing only,
  pass to the configurator route.
- `bedrooms: 1 | 2 | 3 | 4` — landing only.
- `clientInfo: { name, email, phone, timeline, consent }` —
  final screen only, posted to PDF endpoint.

## Design tokens

All tokens live in `tokens/colors_and_type.css` (84 CSS custom
properties). The headline values:

**Brand color**
- `--eh-green: #4DCC7A` — primary, CTAs, accents
- `--eh-green-deep / --eh-green-900: #003B2B` — body text, deep
  surfaces, "easy" wordmark
- `--eh-green-50` → `--eh-green-950` — full scale

**Neutrals**
- `--eh-bg: #FFFFFF`
- `--eh-bg-alt: #FAF9F6` (warm off-white — the canvas color)
- `--eh-bg-deep: #003B2B`
- `--eh-stroke: #E7EAE5`
- `--eh-stroke-strong: #C8D0C9`
- `--eh-text: #003B2B` (deep green, **not** pure black)
- `--eh-text-muted: #4A5C56`
- `--eh-text-soft: #7A8985`

**Support (sparing, behind photography only)**
- `--eh-sand: #F1E9D9`, `--eh-clay: #C58A5B`,
  `--eh-timber: #8C5E36`, `--eh-sky: #BBD8E2`

**Typography** — Poppins (self-hosted from `tokens/fonts/`).
- Weights in use: 300 Light, 400 Regular, 500 Medium, 600 SemiBold
- Display 88 / H1 64 / H2 48 / H3 32 / H4 24 / H5 20
- Body-lg 18 / Body 16 / Body-sm 14 / Caption 12
- Tracking: `-0.02em` for display & headings, `0` for body,
  `0.04em` (or `0.08`-`0.12em`) for uppercase eyebrows.

**Spacing scale (px)** — 4, 8, 12, 16, 24, 32, 48, 64, 96, 128
(`--eh-space-1` → `--eh-space-10`).

**Radii** — 4 / 8 / 12 / 20 / 32 / 999 (`--eh-radius-xs` →
`--eh-radius-pill`). **Use generous radii** — 14–32 px on cards,
pill on buttons.

**Shadows** — `xs` / `sm` / `md` / `lg` / `glow` (the glow is the
focus ring). Don't combine heavy shadow + heavy border.

**Motion**
- `--eh-ease: cubic-bezier(0.2, 0.7, 0.2, 1)`
- `--eh-duration-fast: 120ms` (hover/press)
- `--eh-duration-base: 220ms` (toggles, fades)
- `--eh-duration-slow: 400ms` (page entrances)
- **No bounce, no spring overshoot.**

## Brand do / don'ts

✔ **Do** — generous whitespace, photo-led imagery, sentence-case
  copy with a final period, the *"A home for everyone."* / triad
  rhythm (*"Sustainable. Social. Scalable."*), Poppins SemiBold
  for headings + Light for body, deep green as the ink color.

✘ **Don't** — gradients, emoji, italic display type, the "rounded
  box with green left border" trope, translucent green overlays
  on photography, the bright green as a background for the logo,
  SVG approximations of brand imagery.

## Assets

- `tokens/assets/logo-full-color.png` — primary logo on white
- `tokens/assets/logo-full-white.png` — for use on deep green
- `tokens/assets/logo-mark.png` / `logo-mark-dark.png` — house-smile mark only
- **Photography** — currently rendered as warm gradient
  placeholders in the prototype. Production should drop real
  on-the-ground photos from Easy Housing's archive
  (`/uploads/photos/` or similar) into the same slots. **No
  stock photography.**
- **Icons** — Lucide (MIT) is the recommended stand-in. 2 px
  stroke, default color `--eh-text`, accent `--eh-green-400` for
  active states. Sizes 16 / 20 / 24 / 32.

## Files

Open these to inspect the design:

- `design-refs/EH Configurator Layouts.html` — preview-able in
  any browser.
- `design-refs/artboards.jsx` — every screen component (LandingB,
  ConfiguratorA, FinalScreen, PDFCover, PDFPlan, PDFSpec) plus
  shared primitives (`EHNavBar`, `BudgetSlider`, `RoomsCounter`,
  `RoofPicker`, `SliderRow`, `BudgetChip`, `SummaryItem`).
- `design-refs/floor-plan.jsx` — the reusable SVG floor-plan
  recreation. Takes `widthM`, `lengthM`, `showDims`,
  `showLabels`, `showFurniture` props. **Drop this into your
  React codebase as-is** if you don't already have a floor-plan
  renderer — it's the cleanest part of the bundle.

The other screens (Landing A, Landing C, Configurator B) are
also in `artboards.jsx` as `LandingA`, `LandingC`, `ConfiguratorB`
— they were exploration variants and **should not be shipped**.
They're kept for context only.

---

*A home for everyone, Easy Housing.*
