import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FloorplanSVG from "@/components/FloorplanSVG";
import { loadAllPlans } from "@/lib/__tests__/fixtures";

const plans = loadAllPlans();

/**
 * Strip everything cosmetic so the snapshot asserts geometry/topology only.
 * Colors, fonts, classnames, patterns, and inline styles can all be tuned
 * without invalidating the snapshot. A 1-unit shift in a vertex coordinate
 * still fails the test loudly — and that's the thing the ten wall/window
 * fix-PRs kept regressing.
 */
function stripCosmetic(svg: string): string {
  return svg
    .replace(/<defs>[\s\S]*?<\/defs>/g, "")
    .replace(/\s(fill|stroke|stroke-width|stroke-dasharray|stroke-linecap|stroke-linejoin|opacity|fill-opacity|stroke-opacity|font-family|font-size|font-weight|text-anchor|dominant-baseline|letter-spacing|class|style|filter|mask|clip-path)="[^"]*"/g, "")
    .replace(/>[\s\n]+</g, "><")
    .trim();
}

interface RenderCase {
  plan: ReturnType<typeof loadAllPlans>[number];
  label: "min" | "mid" | "max";
  delta: number;
}

const cases: RenderCase[] = plans.flatMap((p) => {
  const mid = (p.parsed.minDelta + p.parsed.maxDelta) / 2;
  return [
    { plan: p, label: "min", delta: p.parsed.minDelta },
    { plan: p, label: "mid", delta: mid },
    { plan: p, label: "max", delta: p.parsed.maxDelta },
  ] as RenderCase[];
});

describe("FloorplanSVG geometry snapshots", () => {
  it.each(cases)(
    "$plan.id @ $label delta",
    ({ plan, delta }) => {
      const svg = renderToStaticMarkup(
        <FloorplanSVG plan={plan.parsed} delta={delta} />,
      );
      const stripped = stripCosmetic(svg);
      expect(stripped).toMatchSnapshot();
    },
  );
});
