# Easy Housing Configurator

Web-based parametric configurator for Easy Housing's prefab timber homes
in Uganda. Clients pick a typology, bedrooms/bathrooms, and adjust the
building length on a slider — seeing the floor plan and price update
live.

## Status

- **Phase 1 ✅** — Project scaffold + pure-TypeScript cost engine with
  unit tests. Reproduces cell B51 of the calculation template
  ("Project Costs" sheet) for the default Mono Pitch 2BR input
  (2A + 4B + 0C frames, 27 m partitions, 6 interior doors, 10.5 sqm
  aluminium, 2 BR / 2 bath) — ≈ 100,215,294 UGX inclusive VAT.
- **Phase 2a/2b ✅** — Parametric SVG floor-plan renderer with zone
  stretching. Length slider drives frame decomposition → amount
  derivation → live price.
- **Phase 3 ✅** — Admin tracing tool. Upload a floor-plan PNG, run
  Claude Sonnet 4 vision detection, calibrate, edit walls/rooms/
  furniture/zones, export JSON to `data/floorplans/`.
- **Phase 4 ⏳** — Full client wizard (typology → bedrooms → length →
  options → quote). Not started; Mono Pitch 4884 is the only
  supported typology today.
- **Phase 5 ⏳** — PWA + Vercel deploy. Not started.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript (strict) with `@/*` → `./src/*` path alias
- Tailwind CSS v4
- Vitest for unit tests
- `@anthropic-ai/sdk` for Phase 3 vision detection

## Layout

```
src/
  app/
    page.tsx                 Phase 1 cost-engine sanity page
    floor-plan/page.tsx      Phase 2b parametric preview
    admin/page.tsx           Phase 3 tracer (gated by ADMIN_SECRET)
    api/floorplans/          Save + detect endpoints
    layout.tsx, globals.css
  lib/
    costEngine/              calculatePrice, COMPONENT_COSTS, constants
    floorPlan/               deriveAmounts (dispatcher),
                             deriveMonoPitchAmounts (canonical),
                             stretch, zoneLayout, priceForLength,
                             costForLength, transformElement
    admin/                   AI detection, editor state, derived layers
    frameCombo.ts            A/B/C decomposition in jump units
  components/                FloorPlanSVG, LengthSlider, admin/*
  data/
    standardModels.ts        Mono Pitch 1BR / 2BR default / 2BR standard
    floorPlans/monoPitch2BR  Hardcoded SVG model (Phase 2b baseline)
  types/                     Public cost-engine + floor-plan types
  middleware.ts              ADMIN_SECRET gate for /admin + /api/floorplans
tests/
  costEngine/                calibration, pricing primitives, component table
  floorPlan/                 stretch, zone layout, render snapshot, price-for-length
  lib/                       frameCombo, deriveAmounts, transformElement, zoneLayout
```

## Scripts

```sh
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run test         # vitest
npm run typecheck    # tsc --noEmit
```

## Environment

- `ANTHROPIC_API_KEY` — required for Phase 3 admin vision detection.
- `ADMIN_SECRET` — when set, `/admin` and `/api/floorplans` are gated.
  Unlock by visiting `/admin?secret=<value>` once (sets the
  `eh_admin` cookie) or by sending the `x-admin-secret` header.
  Leave unset in dev to skip the gate.

## Calculation reference

The engine mirrors the "Project Costs" sheet of
`Copy Berend of Easy Housing - Calculation Template 2026.xlsx`:

| Step | Excel cell | Implementation |
|---|---|---|
| Sum component costs (USD) | `B41 = D63 = SUM(D64:D1089)` | `Σ amount × usdUnit + fixedExtra` |
| Add 10% margin | `B42 = B41 × B39` | `marginUsd` |
| Sales price USD ex VAT | `B44 = B41 + B42` | `cost + margin` |
| Add 18% VAT | `B45 = B44 × 1.18` | `× 1.18` |
| Convert to UGX | `B48 = round(B41 × B38, 0)` | `costUgxRounded` |
| Margin in UGX | `B49 = B48 × B39` | `× 0.10` |
| VAT in UGX | `B50 = (B48 + B49) × B40` | `× 0.18` |
| Total inc VAT in UGX | `B51 = B48 + B49 + B50` | `priceUgxIncVat` |
| Round UP for display | (manual rule from spec) | `ceil(× / 100,000) × 100,000` |

## Amount derivation

`deriveAmounts(input)` is the typology dispatcher. Today it delegates
to `deriveMonoPitchAmounts` for `mono-pitch-4884`; other typologies
plug into the same `switch` as their derive functions land. The
Mono-Pitch logic uses precise surface constants extracted from the
Excel "Structures Database".
