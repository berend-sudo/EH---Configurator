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

// ── Coordinate conversion (DXF world → SVG pixels) ───────────────────────────

function sx(worldX: number, moveX: boolean, delta: number, scale: number, padX: number) {
  return (moveX ? worldX + delta : worldX) * scale + padX;
}
function sy(worldY: number, scale: number, drawH: number, padY: number) {
  return padY + drawH - worldY * scale; // flip Y: DXF is Y-up, SVG is Y-down
}

// ── DXF arc → SVG path ────────────────────────────────────────────────────────
// Block geometry is already in world space (rotation applied by parser).
// DXF arcs are CCW. After Y-flip, CCW becomes CW, so sweep-flag = 0.

function arcPath(
  cx: number, cy: number, r: number,
  startDeg: number, endDeg: number,
  moveX: boolean, delta: number,
  scale: number, drawH: number, padX: number, padY: number,
): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  let sa = toRad(startDeg);
  let ea = toRad(endDeg);
  if (ea <= sa) ea += 2 * Math.PI; // DXF arcs go CCW from start to end

  const x1 = sx(cx + r * Math.cos(sa), moveX, delta, scale, padX);
  const y1 = sy(cy + r * Math.sin(sa), scale, drawH, padY);
  const x2 = sx(cx + r * Math.cos(ea), moveX, delta, scale, padX);
  const y2 = sy(cy + r * Math.sin(ea), scale, drawH, padY);

  const large = ea - sa > Math.PI ? 1 : 0;
  // sweep=0 because Y-flip reverses arc direction from CCW to CW in SVG
  return `M ${x1} ${y1} A ${r * scale} ${r * scale} 0 ${large} 0 ${x2} ${y2}`;
}

// ── Spline → smooth SVG path (Catmull-Rom through points) ────────────────────

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

// ── Render one piece of already-world-space block geometry ───────────────────

function renderGeom(
  g: BlockGeom,
  moveX: boolean, delta: number,
  scale: number, drawH: number, padX: number, padY: number,
  stroke: string, strokeWidth: number, key: string,
) {
  const sw = strokeWidth;
  switch (g.type) {
    case "line":
      return (
        <line
          key={key}
          x1={sx(g.x1, moveX, delta, scale, padX)} y1={sy(g.y1, scale, drawH, padY)}
          x2={sx(g.x2, moveX, delta, scale, padX)} y2={sy(g.y2, scale, drawH, padY)}
          stroke={stroke} strokeWidth={sw} fill="none"
        />
      );
    case "circle":
      return (
        <circle
          key={key}
          cx={sx(g.cx, moveX, delta, scale, padX)} cy={sy(g.cy, scale, drawH, padY)}
          r={g.r * scale}
          stroke={stroke} strokeWidth={sw} fill="none"
        />
      );
    case "arc":
      return (
        <path
          key={key}
          d={arcPath(g.cx, g.cy, g.r, g.startAngle, g.endAngle, moveX, delta, scale, drawH, padX, padY)}
          stroke={stroke} strokeWidth={sw} fill="none"
        />
      );
    case "polyline": {
      const pts = g.vertices.map(
        (v) => `${sx(v.x, moveX, delta, scale, padX)},${sy(v.y, scale, drawH, padY)}`
      ).join(" ");
      return g.closed
        ? <polygon  key={key} points={pts} stroke={stroke} strokeWidth={sw} fill="none" />
        : <polyline key={key} points={pts} stroke={stroke} strokeWidth={sw} fill="none" />;
    }
    case "spline":
      return (
        <path
          key={key}
          d={splinePath(g.points, moveX, delta, scale, drawH, padX, padY)}
          stroke={stroke} strokeWidth={sw} fill="none"
        />
      );
    default:
      return null;
  }
}

// ── Render one floor plan entity ──────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

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
