"use client";

// Root component for the floor plan SVG. Composes:
//   - RoomPatterns      ./RoomPatterns           — <defs> with fill patterns
//   - renderEntity      ./layers                 — per-layer entity renderers
//   - RoomLabels        ./annotations            — room name + m² labels
//   - DimensionLines    ./annotations            — overall + per-window dims
// All geometry math lives in @/lib/floorplan/geometry. This file is purely
// orchestration: figure out the viewBox, build the window-position cache
// once, then dispatch every entity through renderEntity.

import type { FloorplanJSON } from "@/types/floorplan";
import { buildWindowPositions } from "@/lib/floorplan/geometry";
import RoomPatterns from "./RoomPatterns";
import { renderEntity } from "./layers";
import { RoomLabels, DimensionLines } from "./annotations";

interface Props {
  plan: FloorplanJSON;
  delta: number;
  /** Pixels per millimetre — controls absolute viewBox size. */
  pxPerMm?: number;
}

export default function FloorplanSVG({ plan, delta, pxPerMm = 0.1 }: Props) {
  // Fixed mm→viewBox-px scale. ViewBox grows with delta so the building, dim
  // lines and labels all sit at consistent visual proportions. The SVG element
  // itself fills the container width via CSS, so the *displayed* px-per-mm
  // varies, but the layout stays correct.
  const scale = pxPerMm;
  const padX = 100;
  const padY = 100;
  const totalWidth = plan.baseWidth + delta;

  const drawW = totalWidth * scale;
  const drawH = plan.baseDepth * scale;
  const svgW  = drawW + 2 * padX;
  const svgH  = drawH + 2 * padY;

  const wp = buildWindowPositions(plan, delta);

  // Continuous perimeter wall background.
  //
  // The shipped DXFs only carry wall polylines for corners + interior
  // partitions; large stretches of the outer perimeter are absent (verified:
  // ~5m gaps on 2BR and 3BR top walls). Without this background you see
  // white holes between windows. Render order:
  //   1. RoomPatterns defs
  //   2. THIS perimeter wall rect (filled wall colour)
  //   3. Plan layers — rooms paint over the interior with patterns; the
  //      127 mm inset between room polygon and outer edge stays wall
  //      colour, which is exactly the wall ring. Terrace polygons
  //      legitimately extend to the outer edge on their open sides, so
  //      they cover the wall colour there — correct architectural result.
  //   4. Windows, doors, etc. on top.
  const wallFill = "#003B2B";

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full"
      style={{ display: "block", maxHeight: "100%" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <RoomPatterns scale={scale} drawH={drawH} padY={padY} />

      <rect
        x={padX}
        y={padY}
        width={drawW}
        height={drawH}
        fill={wallFill}
      />

      {plan.layers.map((layer) => {
        // The Windows layer contains only polylines (by construction in dxf-parser),
        // so the layer-entity index equals the windowIdx used in buildWindowPositions.
        let widx = 0;
        return layer.entities.map((entity, idx) => {
          const wIdx = layer.name === "Windows" && entity.type === "polyline" ? widx++ : -1;
          return renderEntity(entity, layer.name, wIdx, delta, scale, drawH, padX, padY,
            totalWidth, plan.baseDepth, `${layer.name}-${idx}`, wp);
        });
      })}

      <RoomLabels plan={plan} delta={delta} scale={scale} drawH={drawH} padX={padX} padY={padY} wp={wp} />
      <DimensionLines plan={plan} delta={delta} scale={scale} drawH={drawH} padX={padX} padY={padY} wp={wp} />
    </svg>
  );
}
