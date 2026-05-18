"use client";

import type {
  FloorplanJSON,
  FloorplanEntity,
  PolylineEntity,
  BlockEntity,
  BlockGeom,
} from "@/types/floorplan";

interface Props {
  plan: FloorplanJSON;
  delta: number;
  width?: number;
  height?: number;
}

const LAYER_STYLES = {
  Rooms:     { fill: "#f5f0e8", stroke: "#d4c9b8", strokeWidth: 0.5 },
  Walls:     { fill: "#3a3530", stroke: "#3a3530", strokeWidth: 0.5 },
  Doors:     { fill: "none",    stroke: "#6b6560", strokeWidth: 1.2 },
  Windows:   { fill: "#c8e0f0", stroke: "#6aafd4", strokeWidth: 1   },
  Furniture: { fill: "none",    stroke: "#7a6e65", strokeWidth: 0.8 },
} as const;

// ── Coordinate helpers ──
function tx(x: number, moveX: boolean, delta: number, scale: number) {
  return (moveX ? x + delta : x) * scale;
}
function ty(y: number, scale: number, drawH: number) {
  return drawH - y * scale;
}

// ── DXF arc → SVG path (arc is in local block coords) ──
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  let sa = toRad(startDeg);
  let ea = toRad(endDeg);
  if (ea <= sa) ea += 2 * Math.PI; // DXF arcs are CCW
  const x1 = cx + r * Math.cos(sa);
  const y1 = cy + r * Math.sin(sa);
  const x2 = cx + r * Math.cos(ea);
  const y2 = cy + r * Math.sin(ea);
  const large = ea - sa > Math.PI ? 1 : 0;
  return `M ${x1} ${-y1} A ${r} ${r} 0 ${large} 0 ${x2} ${-y2}`;
}

// ── Spline → SVG smooth path through points (Catmull-Rom approximation) ──
function splinePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2)
    return `M ${pts[0].x} ${-pts[0].y} L ${pts[1].x} ${-pts[1].y}`;

  let d = `M ${pts[0].x} ${-pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${-cp1y} ${cp2x} ${-cp2y} ${p2.x} ${-p2.y}`;
  }
  return d;
}

// ── Render one piece of block geometry (local coords, Y-flipped via transform) ──
function renderBlockGeom(g: BlockGeom, stroke: string, strokeWidth: number, key: string) {
  switch (g.type) {
    case "line":
      return (
        <line
          key={key}
          x1={g.x1} y1={-g.y1}
          x2={g.x2} y2={-g.y2}
          stroke={stroke} strokeWidth={strokeWidth} fill="none"
        />
      );
    case "circle":
      return (
        <circle
          key={key}
          cx={g.cx} cy={-g.cy} r={g.r}
          stroke={stroke} strokeWidth={strokeWidth} fill="none"
        />
      );
    case "arc":
      return (
        <path
          key={key}
          d={arcPath(g.cx, g.cy, g.r, g.startAngle, g.endAngle)}
          stroke={stroke} strokeWidth={strokeWidth} fill="none"
        />
      );
    case "polyline": {
      const pts = g.vertices.map((v) => `${v.x},${-v.y}`).join(" ");
      return g.closed
        ? <polygon key={key} points={pts} stroke={stroke} strokeWidth={strokeWidth} fill="none" />
        : <polyline key={key} points={pts} stroke={stroke} strokeWidth={strokeWidth} fill="none" />;
    }
    case "spline":
      return (
        <path
          key={key}
          d={splinePath(g.points)}
          stroke={stroke} strokeWidth={strokeWidth} fill="none"
        />
      );
    default:
      return null;
  }
}

// ── Render a floor plan entity ──
function renderEntity(
  entity: FloorplanEntity,
  delta: number,
  scale: number,
  drawH: number,
  layerName: string,
  key: string,
) {
  const style = LAYER_STYLES[layerName as keyof typeof LAYER_STYLES] ?? LAYER_STYLES.Furniture;

  if (entity.type === "polyline") {
    const pts = entity.vertices
      .map((v) => `${tx(v.x, v.moveX, delta, scale)},${ty(v.y, scale, drawH)}`)
      .join(" ");
    return entity.closed ? (
      <polygon
        key={key}
        points={pts}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
    ) : (
      <polyline
        key={key}
        points={pts}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
    );
  }

  if (entity.type === "block") {
    const bx = tx(entity.x, entity.moveX, delta, scale);
    const by = ty(entity.y, scale, drawH);
    // DXF rotation is CCW in Y-up space. After Y-flip (handled in renderBlockGeom via -y),
    // we negate the angle so the rotation direction is correct in SVG Y-down space.
    const svgRot = -entity.rotation;
    return (
      <g
        key={key}
        transform={`translate(${bx}, ${by}) scale(${scale}) rotate(${svgRot})`}
      >
        {entity.geom.map((g, gi) =>
          renderBlockGeom(g, style.stroke, style.strokeWidth / scale, `${key}-g${gi}`)
        )}
      </g>
    );
  }

  return null;
}

export default function FloorplanSVG({ plan, delta, width = 800, height = 700 }: Props) {
  const padding = 40;
  const drawW = width - padding * 2;
  const drawH = height - padding * 2;

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
      <g transform={`translate(${padding}, ${padding})`}>
        {plan.layers.map((layer) =>
          layer.entities.map((entity, idx) =>
            renderEntity(entity, delta, scale, drawH, layer.name, `${layer.name}-${idx}`)
          )
        )}
      </g>
    </svg>
  );
}
