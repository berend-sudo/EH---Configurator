import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FloorPlanSVG } from "@/components/FloorPlanSVG";
import { MONO_PITCH_1BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch1BR";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";
import { MONO_PITCH_3BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch3BR";
import { layoutZones } from "@/lib/floorPlan/zoneLayout";

const plans = [
  ["1BR", MONO_PITCH_1BR_FLOOR_PLAN],
  ["2BR", MONO_PITCH_2BR_FLOOR_PLAN],
  ["3BR", MONO_PITCH_3BR_FLOOR_PLAN],
] as const;

describe("external wall renders without broken geometry at all lengths", () => {
  for (const [label, plan] of plans) {
    const dryRun = layoutZones(plan, { targetLengthMm: 0 });
    const maxL = dryRun.maxLengthMm;
    const midL = (plan.viewBox.width + maxL) / 2;

    it(`${label} renders at mid length without NaN or Infinity`, () => {
      const markup = renderToStaticMarkup(
        React.createElement(FloorPlanSVG, { model: plan, lengthMm: midL }),
      );
      expect(markup).toMatch(/^<svg /);
      expect(markup).not.toMatch(/NaN/);
      expect(markup).not.toMatch(/Infinity/);
    });

    it(`${label} renders at max length without NaN or Infinity`, () => {
      const markup = renderToStaticMarkup(
        React.createElement(FloorPlanSVG, { model: plan, lengthMm: maxL }),
      );
      expect(markup).toMatch(/^<svg /);
      expect(markup).not.toMatch(/NaN/);
      expect(markup).not.toMatch(/Infinity/);
    });
  }
});
