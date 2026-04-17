# Easy Housing Configurator

Web-based parametric configurator for Easy Housing's prefab timber homes
in Uganda. Clients pick a typology, bedrooms/bathrooms, and adjust the
building length on a slider — seeing the floor plan and price update
live.

## Status

**Phase 1 — done.** Project scaffold + pure-TypeScript cost engine with
unit tests. The engine reproduces cell B51 of the calculation template
("Project Costs" sheet) for the default Mono Pitch 2BR input
(2A + 4B + 0C frames, 27 m partitions, 6 interior doors, 10.5 sqm
aluminium, 2 BR / 2 bath) — ≈ 100,215,294 UGX inclusive VAT.

Phases 2–5 (SVG floor-plan renderer with zone stretching, admin tracing
tool, full 8-step client flow, PWA + Vercel deploy) are not yet built.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript (strict) with `@/*` → `./src/*` path alias
- Tailwind CSS v4
- Vitest for unit tests

## Layout

```
src/
  app/                  Next.js App Router
    page.tsx            Phase 1 sanity-check UI for the cost engine
    layout.tsx
    globals.css
  lib/costEngine/
    index.ts            Public API: calculatePrice(input)
    components.ts       COMPONENT_COSTS — every line item from the Excel
    constants.ts        MARGIN, VAT, USD_TO_UGX, frame dimensions
    pricing.ts          marginUsd, vatUsd, usdToUgx, roundUpUgx
  data/
    standardModels.ts   Default Mono Pitch 2BR preset (Excel template default)
  types/
    costEngine.ts       Public types
tests/costEngine/       Vitest suites
```

## Scripts

```sh
npm install
npm run dev          # http://localhost:3000 — Phase 1 sanity-check page
npm run build        # production build
npm run test         # vitest
npm run typecheck    # tsc --noEmit
```

## Calculation reference

The engine mirrors the "Project Costs" sheet of
`Copy Berend of Easy Housing - Calculation Template 2026.xlsx`:

| Step | Excel cell | Implementation |
|---|---|---|
| Sum component costs (USD) | `B41 = D63 = SUM(D64:D1089)` | `Σ amount × usdUnit + fixedExtra` |
| Add 10% margin | `B42 = B41 × B39` | `marginUsd` |
| Sales price USD ex VAT | `B44 = B41 + B42` | `cost + margin` |
| Add 18% VAT | `B45 = B44 × 1.18` | `× 1.18` |
| Convert to UGX | `B48 = round(B41 × B38, 0)` | `Math.round(cost × 3700)` |
| Margin in UGX | `B49 = B48 × B39` | `× 0.10` |
| VAT in UGX | `B50 = (B48 + B49) × B40` | `× 0.18` |
| Total inc VAT in UGX | `B51 = B48 + B49 + B50` | `priceUgxIncVat` |
| Round UP for display | (manual rule from spec) | `ceil(× / 100,000) × 100,000` |
