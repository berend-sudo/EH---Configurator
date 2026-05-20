# CLAUDE.md — EH Configurator (Easy Housing)

You are implementing the **EH Configurator** in the project's existing
codebase (Claude Code → GitHub → Vercel pipeline).

## Read first

1. `README.md` (this folder) — the full spec.
2. `tokens/colors_and_type.css` — drop-in design tokens.
3. `design-refs/EH Configurator Layouts.html` — open in a browser
   to see all screens visually.

## Stack assumptions

- React/Next + Tailwind or CSS Modules (whatever's already in the
  repo — match it; do NOT introduce a new styling system).
- Drop `tokens/colors_and_type.css` into the global stylesheet
  (e.g. `app/globals.css`). Drop `tokens/fonts/` into `public/fonts/`
  and `tokens/assets/` into `public/brand/`.

## Build order

1. **Tokens & fonts.** Wire `colors_and_type.css` and Poppins.
   Verify `--eh-green: #4DCC7A` and `--eh-green-900: #003B2B`
   resolve. Verify Poppins SemiBold renders.
2. **Shared primitives.** `EHNavBar`, `Button` (primary / ghost),
   `SliderRow`, `Chip`, `Field` (text + select). See
   `design-refs/artboards.jsx` for exact styles.
3. **Floor plan.** Lift `design-refs/floor-plan.jsx` into the
   codebase as a React component. It already takes `widthM`,
   `lengthM`, `showDims`, `showLabels`, `showFurniture` props.
4. **Landing screen** (`LandingB`) — 1 route.
5. **Configurator screen** (`ConfiguratorA`) — 1 route. Wire the
   width slider to your existing configurator logic; the layout
   only displays.
6. **Final / contact screen** (`FinalScreen`) — 1 route, posts
   to existing PDF endpoint.
7. **PDF templates** (`PDFCover` / `PDFPlan` / `PDFSpec`) — 1 file
   for whatever PDF generator the repo uses (react-pdf,
   puppeteer, etc.). A4 portrait 595 × 842.

## Hard rules

- **Currency: UGX** with comma separators — never €, never $.
  Format helper: `'UGX ' + n.toLocaleString('en-US')`.
- **Text color is `--eh-text` (#003B2B), never `#000`.**
- **One CTA per screen** in `--eh-green`. Don't paint multiple
  primary buttons. Secondary actions use the ghost variant.
- **Generous radii**: 14 / 18 / 20 / 24 / 32 px on cards; **pill
  (999)** on buttons.
- **No emoji. No gradients. No italic display type. No drop
  shadows on text.**
- The price lives in **one place per screen**. On the configurator
  it's the "Indicative budget" row in the left summary card —
  do *not* float a budget chip over the plan.
- **Pricing is backend-owned.** Do not hard-code costs in the UI.
  Find the existing pricing function in this repo and wire the
  Landing's bedroom-cap logic through it. The cost model in
  `design-refs/artboards.jsx` (search `ROOF_BASE`) is a prototype
  placeholder only — it demos the *shape* of the interaction, not
  the actual numbers.
- The width slider on the configurator is **the only slider**.
  Length is fixed per model (Monopitch Studio = 4.97 m). Do not
  add a length slider.

## Photography

The prototype uses warm-gradient placeholders for photographs.
Replace with real Easy Housing on-the-ground photos when you have
them. **No stock photography ever.** If photos aren't available,
keep the brand-appropriate placeholder treatment (`.photo` class
in the prototype CSS).

## Icons

Use **Lucide** (MIT, already on npm as `lucide-react`). 2 px stroke,
default color `var(--eh-text)`, accent `var(--eh-green-400)` for
active states. Sizes 16 / 20 / 24 / 32. No emoji as icon
substitutes.

## Tone of voice

- Sentence case with a final period for headings (*"Your details.",
  "Let's design your home."*).
- Plain, warm, optimistic, first-person plural ("We", not
  "Easy Housing").
- Lowercase wordmark: *easy*housing (SemiBold + Light, no space).
- Sign-offs: *"A home for everyone, Easy Housing"* — comma, not
  em-dash.
- Avoid: "revolutionary", "disruptive", marketing superlatives,
  walls of jargon (CLT, FSC, prefab are fine *next to* an
  everyday-language gloss).

## When in doubt

Open the corresponding artboard in
`design-refs/EH Configurator Layouts.html` and match it pixel-for-
pixel. If the spec in `README.md` conflicts with the artboard, the
**artboard wins** — assume the spec lagged behind a tweak.

The exploration variants (`LandingA`, `LandingC`, `ConfiguratorB`)
in `artboards.jsx` are **for context only** — do not ship them.
Ship: `LandingB`, `ConfiguratorA`, `FinalScreen`, `PDFCover`,
`PDFPlan`, `PDFSpec`.

---

*A home for everyone, Easy Housing.*
