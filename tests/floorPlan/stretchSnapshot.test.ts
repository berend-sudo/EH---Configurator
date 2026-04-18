import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FloorPlanSVG } from "@/components/FloorPlanSVG";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";

describe("FloorPlanSVG — stretch snapshots", () => {
  const cases = [
    { label: "min", outerLengthMm: 6800 },
    { label: "base", outerLengthMm: MONO_PITCH_2BR_FLOOR_PLAN.viewBox.width },
    { label: "grown-800", outerLengthMm: MONO_PITCH_2BR_FLOOR_PLAN.viewBox.width + 800 },
    { label: "max", outerLengthMm: 11400 },
  ];

  for (const c of cases) {
    it(`renders at ${c.label} (${c.outerLengthMm} mm)`, () => {
      const markup = renderToStaticMarkup(
        React.createElement(FloorPlanSVG, {
          model: MONO_PITCH_2BR_FLOOR_PLAN,
          lengthMm: c.outerLengthMm,
          showGrid: false,
        }),
      );
      writeFileSync(
        `/tmp/plan-2br-mono-${c.label}.svg`,
        `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`,
      );
      expect(markup).toMatch(/^<svg /);
    });
  }
});
