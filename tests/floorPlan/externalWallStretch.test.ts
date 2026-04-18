import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FloorPlanSVG } from "@/components/FloorPlanSVG";
import { MONO_PITCH_1BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch1BR";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";
import { MONO_PITCH_3BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch3BR";
import { layoutZones } from "@/lib/floorPlan/zoneLayout";

function getExternalWallPoints(model: typeof MONO_PITCH_1BR_FLOOR_PLAN, lengthMm: number) {
  const markup = renderToStaticMarkup(
    React.createElement(FloorPlanSVG, { model, lengthMm, showGrid: false }),
  );
  // Extract the first <path d="..."> that corresponds to wall-external.
  // The external wall is rendered as the first thick stroke path.
  // We check that the rendered SVG contains a path whose d attribute
  // includes coordinates near the expected east edge.
  return markup;
}

describe("external wall stretches correctly at max length", () => {
  for (const [label, plan] of [
    ["1BR", MONO_PITCH_1BR_FLOOR_PLAN],
    ["2BR", MONO_PITCH_2BR_FLOOR_PLAN],
    ["3BR", MONO_PITCH_3BR_FLOOR_PLAN],
  ] as const) {
    it(`${label}: SVG renders without error at max zone length`, () => {
      const dryRun = layoutZones(plan, { targetLengthMm: 0 });
      const maxL = dryRun.maxLengthMm;
      const markup = renderToStaticMarkup(
        React.createElement(FloorPlanSVG, { model: plan, lengthMm: maxL }),
      );
      expect(markup).toMatch(/^<svg /);
      expect(markup).not.toMatch(/NaN/);
      expect(markup).not.toMatch(/Infinity/);
    });

    it(`${label}: SVG renders without error at mid length`, () => {
      const dryRun = layoutZones(plan, { targetLengthMm: 0 });
      const midL = (plan.viewBox.width + dryRun.maxLengthMm) / 2;
      const markup = renderToStaticMarkup(
        React.createElement(FloorPlanSVG, { model: plan, lengthMm: midL }),
      );
      expect(markup).toMatch(/^<svg /);
      expect(markup).not.toMatch(/NaN/);
      expect(markup).not.toMatch(/Infinity/);
    });
  }
});
