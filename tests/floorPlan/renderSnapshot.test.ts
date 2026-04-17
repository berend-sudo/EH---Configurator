import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FloorPlanSVG } from "@/components/FloorPlanSVG";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";

/**
 * Render the FloorPlanSVG to a static string and write it to disk
 * for visual inspection during development. Also asserts the
 * output contains key structural markers.
 */
describe("FloorPlanSVG renders to valid SVG markup", () => {
  const markup = renderToStaticMarkup(
    React.createElement(FloorPlanSVG, {
      model: MONO_PITCH_2BR_FLOOR_PLAN,
      showGrid: false,
    }),
  );

  it("starts with an <svg> element", () => {
    expect(markup).toMatch(/^<svg /);
  });

  it("contains the expected room labels", () => {
    for (const room of [
      "Bathroom",
      "Bedroom 1",
      "Bedroom 2",
      "Living Room",
      "Veranda",
    ]) {
      expect(markup).toContain(room);
    }
  });

  it("contains the overall dimension labels", () => {
    expect(markup).toContain("8,635");
    expect(markup).toContain("4,972");
  });

  it("emits a path for every room-fill", () => {
    const fillCount = MONO_PITCH_2BR_FLOOR_PLAN.elements.filter(
      (e) => e.type === "room-fill",
    ).length;
    const pathMatches = markup.match(/<path /g) ?? [];
    expect(pathMatches.length).toBeGreaterThanOrEqual(fillCount);
  });

  // Write to /tmp so we can eyeball it with any SVG viewer.
  it("writes a preview to /tmp/plan-2br-mono.svg", () => {
    writeFileSync(
      "/tmp/plan-2br-mono.svg",
      `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`,
    );
    expect(markup.length).toBeGreaterThan(1000);
  });
});
