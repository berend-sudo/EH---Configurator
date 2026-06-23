# How the configurator reads the Calculation Template

**For:** Wolf · **Re:** Easy Housing Configurator ↔ *Easy Housing Calculation Template*

This is a short guide to how the online configurator turns one of your
floor plans into the **indicative budget** it shows the client — and
exactly which cells of your calculation sheet it relies on. The short
version: the configurator is a faithful re-implementation of your **Price
Calc** sheet. It does **not** invent prices. Every rate comes from your
workbook; the configurator only fills in the **Project Input** quantities
by reading them off the DXF drawing.

---

## 1. The price is your "Full Easy Home Price"

The number on screen is the same chain your sheet computes:

```
basic structure (GFA × per-m² rate)
  + interior doors + partitions + exterior doors & windows
  + terrace
  + electrical + plumbing + architecture + engineering
  ( + distance charge, only beyond 100 km )
= Full Easy Home Price (per home)
```

All the **rates** (per-m², per-door, per-metre, the service coefficients,
the terrace rate, etc.) are read straight from your workbook. **Pricing is
per-country native** — Uganda uses the UGX column, Kenya uses the KES
column. Kenya is never "UGX ÷ exchange rate". (The only time we touch the
FX rate is the documented fallback for a KES cell you've left blank.)

---

## 2. Where the Project Input numbers come from

Your **Project Input** sheet expects a salesperson to type in quantities.
The configurator fills those in automatically — mostly by **measuring the
floor plan**. Here's the mapping, field by field:

| Project Input field | How the configurator fills it | Source |
| --- | --- | --- |
| **Easy Housing Typology** | The model the client picked | Client's choice |
| **Number of units** | Always 1 (configurator quotes one home) | Fixed |
| **Columns A / B / C** | *Not used* — see note below | — |
| **GFA** (the master area) | Sum of the room polygons on the drawing, updated live as the client moves the width slider | **Measured from drawing** |
| **Interior doors** | Counted directly — one per door symbol on the drawing's `Doors` layer | **Measured from drawing** |
| **External doors & windows (area)** | Each glazed opening on the drawing's `Windows` layer, sized from the drawing (see §3) | **Measured from drawing** |
| **Bedrooms** | Counted from the `Bed Room` rooms on the drawing | **Measured from drawing** |
| **Bathrooms** | Counted from the `Bath Room` rooms | **Measured from drawing** |
| **Kitchen areas** | Assumed **1 per home** (see §4) | Assumption |
| **Partitions (length)** | Quick estimate `0.3 × GFA` — your sheet's own rule (see §5) | **Estimate** |
| **Terrace** | The terrace area measured from the drawing (see §3) | **Measured from drawing** |
| Pergola, railings, burglar bars, wheelchair ramp, extra staircase | Left at 0 | Omitted |
| Tiles, sanitary wares, biodigester | Shown to the client as descriptions, **not added** to the price | Lump-sum, not summed |
| Distance | 0 (transport isn't asked in the flow yet) | Omitted |

**Why "Columns A/B/C" aren't used:** your sheet builds the building's width
(and therefore GFA) from how many A/B/C columns wide it is. The
configurator doesn't need that step — it reads the **actual area off the
drawing**, and the width slider stretches that area directly. The result is
the same GFA your column maths would produce, just measured rather than
composed.

---

## 3. How doors, windows and the terrace are read off the drawing

This is the one place where the configurator interprets your drawing
convention, so it's worth spelling out:

- **The `Doors` layer** holds the **interior** doors only (the ~700 mm
  swing-door symbols). The configurator counts them → *Interior doors*.
- **The `Windows` layer** holds **all the glazed openings** — and that
  includes the **exterior doors** (the sliding/glass doors out to a
  terrace). The configurator tells doors and windows apart by position:
  - An opening that sits against a **terrace** → it's an **exterior door**,
    sized **width × 2.4 m** (door height).
  - Any other glazed opening → it's a **window**, sized **width × 1.4 m**
    (window height).
  - The *width* is the length of the opening as drawn. These add up to your
    *External doors & windows (area)* figure.
- **The terrace** is the `Terrace` room polygon. Its area is now priced
  using your **Terrace** option rate and shown as its own line.

So if you draw an opening onto a terrace, the configurator prices it as a
2.4 m door; draw it anywhere else and it's a 1.4 m window. Keeping that
convention consistent in the DXF is what keeps the door/window pricing
correct.

---

## 4. The kitchen assumption

None of the floor plans draw the kitchen as its own room — it's always
open-plan inside the living room. Your sheet's *Kitchen areas* input,
though, is meant to add a plumbing point for the kitchen sink. So the
configurator **assumes one kitchen per home** for the plumbing calculation.
If a future drawing ever labels a kitchen as its own room, the configurator
will use that instead.

---

## 5. The one thing that's still an estimate: partitions

Partition-wall **length** can't be read reliably off the drawing — the
walls are drawn as solid filled shapes, not single lines, so there's no
clean length to measure. The configurator therefore keeps your sheet's own
quick-estimate rule, **0.3 × GFA**, for partition meterage. Everything else
in the add-ons is measured.

---

## 6. Updating prices — what's safe, and what needs a heads-up

You stay in control of the numbers. To change prices:

1. Edit the **rate cells** in the Calculation Template (per-m² rates,
   door/window/partition prices, service coefficients, the terrace rate,
   FX, etc.).
2. Hand the new workbook to the dev side; they run one sync command that
   re-reads your numbers into the configurator.

What's safe to change freely: **any rate or coefficient value.** Those flow
straight through.

What needs a conversation first: **changing the Price Calc *formulas*** (the
structure of the calculation, not the numbers). The sync has a built-in
tripwire that **refuses to update** if the Price Calc formulas have changed,
until a developer reviews whether the configurator's logic needs to match.
This is deliberate — it protects against the on-screen price silently
drifting from your sheet. So: reprice as often as you like; tell us if you
restructure a calculation.

---

## 7. What "indicative" means

The on-screen number is an **indicative budget**, not a binding quote. Two
reasons it can differ slightly from a hand-built quote:

- **Partitions** are the `0.3 × GFA` estimate, not a measured length (§5).
- The **lump-sum items** (tiles, sanitary, biodigester) and the **optional
  extras** (pergola, railings, etc.) aren't priced into the headline number.

Everything else — area, doors, windows, terrace, room counts, all rates —
is either measured from the drawing or taken directly from your sheet.

---

*A home for everyone, Easy Housing.*
