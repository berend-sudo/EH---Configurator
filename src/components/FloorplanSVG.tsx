"use client";

import type { FloorplanJSON, FloorplanEntity, BlockGeom } from "@/types/floorplan";

interface Props {
  plan: FloorplanJSON;
  delta: number;
  width?: number;
  height?: number;
}

const LAYER_STYLES = {
  Rooms:     { fill: "#f5f0e8", stroke: "#c8bfb0", strokeWidth: 0.8 },
  Walls:     { fill: "#3a3530", stroke: "#3a3530", strokeWidth: 0.5 },
  Doors:     { fill: "none",    stroke: "#6b6560", strokeWidth: 1.2 },
  Windows:   { fill: "#c8e0f0", stroke: "#6aafd4", strokeWidth: 1.0 },
  Furniture: { fill: "none",    stroke: "#7a6e65", strokeWidth: 0.8 },
} as const;

// World-space → SVG conversion (DXF Y-up → SVG Y-down)
function sx(worldX: number, moveX: boolean, delta: number, scale: number, padX: number) {
  return (moveX ? worldX + delta : worldX) * scale + padX;
}
function sy(worldY: number, scale: number, drawH: number, padY: number) {
  return padY + drawH - worldY * scale;
}

// Catmull-Rom smooth path through points
function splinePath(
  pts: { x: number; y: number }[],
  moveX: boolean, delta: number,
  scale: number, drawH: number, padX: number, padY: number,
): string {
  if (pts.length < 2) return "";
  const px = (p: { x: number }) => sx(p.x, moveX, delta, scale, padX);
  const py = (p: { y: number }) => sy(p.y, scale, drawH, padY);
  if (pts.length === 2) return `M ${px(pts[0])} ${py(pts[0])} L ${px(pts[1])} ${py(pts[1])}`;

  let d = `M ${px(pts[0])} ${py(pts[0])}`;
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = pts[Math.max(k - 1, 0)];
    const p1 = pts[k];
    const p2 = pts[k + 1];
    const p3 = pts[Math.min(k + 2, pts.length - 1)];
    const cp1x = px(p1) + (px(p2) - px(p0)) / 6;
    const cp1y = py(p1) + (py(p2) - py(p0)) / 6;
    const cp2x = px(p2) - (px(p3) - px(p1)) / 6;
    const cp2y = py(p2) - (py(p3) - py(p1)) / 6;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${px(p2)} ${py(p2)}`;
  }
  return d;
}

function renderGeom(
  g: BlockGeom,
  moveX: boolean, delta: number,
  scale: number, drawH: number, padX: number, padY: number,
  stroke: string, strokeWidth: number, key: string,
) {
  if (g.type === "polyline") {
    const pts = g.vertices.map(
      (v) => `${sx(v.x, moveX, delta, scale, padX)},${sy(v.y, scale, drawH, padY)}`
    ).join(" ");
    return g.closed
      ? <polygon  key={key} points={pts} stroke={stroke} strokeWidth={strokeWidth} fill="none" />
      : <polyline key={key} points={pts} stroke={stroke} strokeWidth={strokeWidth} fill="none" />;
  }
  if (g.type === "spline") {
    return (
      <path
        key={key}
        d={splinePath(g.points, moveX, delta, scale, drawH, padX, padY)}
        stroke={stroke} strokeWidth={strokeWidth} fill="none"
      />
    );
  }
  return null;
}

function renderEntity(
  entity: FloorplanEntity,
  delta: number, scale: number,
  drawH: number, padX: number, padY: number,
  layerName: string, key: string,
) {
  const style = LAYER_STYLES[layerName as keyof typeof LAYER_STYLES] ?? LAYER_STYLES.Furniture;

  if (entity.type === "polyline") {
    const pts = entity.vertices.map((v) =>
      `${sx(v.x, v.moveX, delta, scale, padX)},${sy(v.y, scale, drawH, padY)}`
    ).join(" ");
    return entity.closed
      ? <polygon  key={key} points={pts} fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} />
      : <polyline key={key} points={pts} fill="none"       stroke={style.stroke} strokeWidth={style.strokeWidth} />;
  }

  if (entity.type === "block") {
    return (
      <g key={key}>
        {entity.geom.map((g, gi) =>
          renderGeom(g, entity.moveX, delta, scale, drawH, padX, padY,
            style.stroke, style.strokeWidth, `${key}-${gi}`)
        )}
      </g>
    );
  }

  return null;
}

export default function FloorplanSVG({ plan, delta, width = 800, height = 700 }: Props) {
  const padX = 40, padY = 40;
  const drawW = width  - padX * 2;
  const drawH = height - padY * 2;

  const totalWidth = plan.baseWidth + delta;
  const scale = Math.min(drawW / totalWidth, drawH / plan.baseDepth);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="border border-stone-200 rounded-lg bg-white w-full"
      style={{ maxWidth: width }}
    >
      {plan.layers.map((layer) =>
        layer.entities.map((entity, idx) =>
          renderEntity(entity, delta, scale, drawH, padX, padY, layer.name, `${layer.name}-${idx}`)
        )
      )}
    </svg>
  );
}
