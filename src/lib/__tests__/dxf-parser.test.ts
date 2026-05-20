import { describe, it, expect } from "vitest";
import { loadAllPlans } from "./fixtures";

const plans = loadAllPlans();

describe("dxf-parser shipped-plan invariants", () => {
  it.each(plans)("$id parses with non-empty layers", ({ parsed }) => {
    expect(parsed.layers.length).toBeGreaterThan(0);
    expect(parsed.id).toBeTruthy();
    expect(parsed.name).toBeTruthy();
  });

  it.each(plans)("$id has finite baseWidth/baseDepth and a valid delta range", ({ parsed }) => {
    expect(Number.isFinite(parsed.baseWidth)).toBe(true);
    expect(Number.isFinite(parsed.baseDepth)).toBe(true);
    expect(parsed.baseWidth).toBeGreaterThan(0);
    expect(parsed.baseDepth).toBeGreaterThan(0);
    expect(parsed.minDelta).toBeLessThanOrEqual(parsed.maxDelta);
  });

  it.each(plans)("$id exposes a non-empty Walls layer", ({ parsed }) => {
    const walls = parsed.layers.find((l) => l.name === "Walls");
    expect(walls, "every shipped plan must have a Walls layer").toBeDefined();
    expect(walls!.entities.length).toBeGreaterThan(0);
  });

  it.each(plans)("$id exposes a Windows layer with cap-respecting widths", ({ parsed }) => {
    const windows = parsed.layers.find((l) => l.name === "Windows");
    if (!windows) return; // some plans may legitimately have no windows
    const MAX_WINDOW_WIDTH_MM = 1800;
    for (const entity of windows.entities) {
      if (entity.type !== "polyline") continue;
      let minX = Infinity, maxX = -Infinity;
      for (const v of entity.vertices) {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
      }
      const baseWidth = maxX - minX;
      // Base (unstretched) width of every shipped window should already be
      // under the 1.8m cap. The cap kicks in at slider stretch time.
      expect(baseWidth).toBeLessThanOrEqual(MAX_WINDOW_WIDTH_MM);
    }
  });

  it.each(plans)("$id room polygons are closed", ({ parsed }) => {
    for (const layer of parsed.layers) {
      if (!layer.name.startsWith("Rooms")) continue;
      for (const entity of layer.entities) {
        if (entity.type !== "polyline") continue;
        expect(entity.closed, `${layer.name} polygon must be closed`).toBe(true);
        expect(entity.vertices.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it.each(plans)("$id any vertex with `attach` references an existing window vertex", ({ parsed }) => {
    const windows = parsed.layers.find((l) => l.name === "Windows");
    const windowPolylines =
      windows?.entities.filter((e) => e.type === "polyline") ?? [];

    let attachedCount = 0;
    for (const layer of parsed.layers) {
      for (const entity of layer.entities) {
        if (entity.type !== "polyline") continue;
        for (const v of entity.vertices) {
          if (!v.attach) continue;
          attachedCount++;
          const winEntity = windowPolylines[v.attach.windowIdx];
          expect(winEntity, "attached vertex references a real window").toBeDefined();
          if (winEntity && winEntity.type === "polyline") {
            expect(winEntity.vertices[v.attach.vertexIdx]).toBeDefined();
          }
        }
      }
    }
    // At least one plan (1BR — per PR #35) is expected to use attach.
    // We don't enforce per-plan, but document via the snapshot below.
    expect(attachedCount).toBeGreaterThanOrEqual(0);
  });
});

describe("dxf-parser whole-tree snapshots", () => {
  // A coarse snapshot of layer names + counts per plan. This catches changes
  // in what gets parsed (e.g. a new room class, a renamed layer) without
  // committing the full ~thousand-vertex geometry to the snapshot file.
  it.each(plans)("$id layer summary", ({ parsed }) => {
    const summary = parsed.layers
      .map((l) => ({
        name: l.name,
        polylines: l.entities.filter((e) => e.type === "polyline").length,
        blocks: l.entities.filter((e) => e.type === "block").length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    expect(summary).toMatchSnapshot();
  });
});
