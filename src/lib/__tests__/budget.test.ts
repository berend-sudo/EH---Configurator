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

  // KNOWN BUG (surfaced by this test layer, deferred to Phase C):
  // countRooms uses `layer.name.includes("Bedroom")` and `.includes("Kitchen")`,
  // but the shipped DXFs label these layers `Rooms$Bed Room` and `Rooms$Living
  // Room` (with spaces, per the README convention). So `rooms.bedrooms` and
  // `rooms.kitchens` are silently 0 for every plan today. calculateBudget
  // doesn't read `bedrooms` so pricing is unaffected, but the count is wrong
  // anywhere it gets surfaced. The snapshot below pins the current (buggy)
  // values so the eventual fix shows up as a deliberate snapshot diff.
  it.todo("countRooms should match DXF layer names (Bed Room / Living Room)");
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
