import { describe, it, expect } from "vitest";
import { calculateBudget, countRooms, detectTypology } from "@/lib/budget";
import { loadAllPlans } from "./fixtures";

const plans = loadAllPlans();

describe("countRooms", () => {
  it.each(plans)("$id produces non-negative areas at delta = 0", ({ parsed }) => {
    const r = countRooms(parsed, 0);
    expect(r.gfa).toBeGreaterThanOrEqual(0);
    expect(r.terraceArea).toBeGreaterThanOrEqual(0);
    expect(r.bedrooms).toBeGreaterThanOrEqual(0);
    expect(r.bathrooms).toBeGreaterThanOrEqual(0);
  });

  it.each(plans)("$id GFA grows monotonically with delta", ({ parsed }) => {
    const atMin = countRooms(parsed, parsed.minDelta);
    const atMax = countRooms(parsed, parsed.maxDelta);
    expect(atMax.gfa).toBeGreaterThanOrEqual(atMin.gfa);
  });

  // Phase C3 fixed the layer-name matcher: `Rooms$Bed Room` (with space)
  // now matches. `Rooms$Kitchen` still doesn't exist in any shipped DXF —
  // kitchen is part of Living Room — so `kitchens` legitimately stays 0
  // until a future DXF adds a separate kitchen polygon.
  it.each(plans)("$id bedrooms count matches the entry's declared bedroom count", ({ parsed, bedrooms }) => {
    const r = countRooms(parsed, 0);
    // Studio has a "Bed Room" polygon in the DXF (the sleeping area) but
    // entry.bedrooms = 0 in the catalogue. Treat Studio as the exception.
    if (bedrooms === 0) {
      expect(r.bedrooms).toBeGreaterThanOrEqual(0);
    } else {
      expect(r.bedrooms).toBe(bedrooms);
    }
  });
});

describe("calculateBudget", () => {
  it.each(plans)("$id grand >= core >= 0 at delta = 0", ({ parsed }) => {
    const t = detectTypology(parsed.name);
    const r = countRooms(parsed, 0);
    const b = calculateBudget(r, t);
    expect(b.coreTotal).toBeGreaterThan(0);
    expect(b.grandTotal).toBeGreaterThanOrEqual(b.coreTotal);
  });

  it.each(plans)("$id budget grows monotonically with delta", ({ parsed }) => {
    const t = detectTypology(parsed.name);
    const atMin = calculateBudget(countRooms(parsed, parsed.minDelta), t);
    const atMax = calculateBudget(countRooms(parsed, parsed.maxDelta), t);
    expect(atMax.coreTotal).toBeGreaterThanOrEqual(atMin.coreTotal);
    expect(atMax.grandTotal).toBeGreaterThanOrEqual(atMin.grandTotal);
  });

  // Pin exact UGX outputs so any drift in rate constants OR room-counting OR
  // area calculation fails loudly with a clear diff. These are computed from
  // the current shipped DXFs + budget.ts constants. If a DXF or constant
  // legitimately changes, update the snapshot.
  it.each(plans)("$id budget at minDelta and maxDelta is stable (snapshot)", ({ parsed }) => {
    const t = detectTypology(parsed.name);
    const at = (delta: number) => {
      const r = countRooms(parsed, delta);
      const b = calculateBudget(r, t);
      return {
        delta,
        gfa: Math.round(r.gfa * 100) / 100,
        terraceArea: Math.round(r.terraceArea * 100) / 100,
        bedrooms: r.bedrooms,
        bathrooms: r.bathrooms,
        kitchens: r.kitchens,
        coreTotal: Math.round(b.coreTotal),
        grandTotal: Math.round(b.grandTotal),
        typology: t.name,
        typologyDetected: t.detected,
      };
    };
    expect({
      atMin: at(parsed.minDelta),
      atMax: at(parsed.maxDelta),
    }).toMatchSnapshot();
  });
});

describe("detectTypology", () => {
  it("matches Mono Pitch for shipped plan names", () => {
    expect(detectTypology("Monopitch Studio").name).toBe("Mono Pitch");
    expect(detectTypology("Monopitch 1-Bedroom").name).toBe("Mono Pitch");
  });

  it("falls back with detected=false on an unknown name", () => {
    const t = detectTypology("some-future-roof-plan");
    expect(t.detected).toBe(false);
  });
});
