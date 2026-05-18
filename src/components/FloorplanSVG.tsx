"use client";

import type {
  FloorplanJSON,
  FloorplanEntity,
  PolylineEntity,
  BlockEntity,
} from "@/types/floorplan";

interface Props {
  plan: FloorplanJSON;
  delta: number;
  width?: number;
  height?: number;
}

interface LayerStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

const LAYER_STYLES: Record<string, LayerStyle> = {
  Rooms:     { fill: "#f5f0e8", stroke: "#d4c9b8", strokeWidth: 0.5, opacity: 1 },
  Walls:     { fill: "#3a3530", stroke: "#3a3530", strokeWidth: 0.5, opacity: 1 },
  Doors:     { fill: "none",    stroke: "#6b6560", strokeWidth: 1.2, opacity: 1 },
  Windows:   { fill: "#c8e0f0", stroke: "#6aafd4", strokeWidth: 1,   opacity: 1 },
  Furniture: { fill: "none",    stroke: "#9a9088", strokeWidth: 0.8, opacity: 0.75 },
};

function tx(x: number, moveX: boolean, delta: number, scale: number) {
  return (moveX ? x + delta : x) * scale;
}

function ty(y: number, scale: number, drawH: number) {
  return drawH - y * scale;
}

function renderPolyline(
  entity: PolylineEntity,
  delta: number,
  scale: number,
  drawH: number,
  style: LayerStyle,
  key: string,
) {
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
      opacity={style.opacity}
    />
  ) : (
    <polyline
      key={key}
      points={pts}
      fill="none"
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
      opacity={style.opacity}
    />
  );
}

function renderBlock(
  entity: BlockEntity,
  delta: number,
  scale: number,
  drawH: number,
  style: LayerStyle,
  key: string,
) {
  const bx = tx(entity.x, entity.moveX, delta, scale);
  const by = ty(entity.y, scale, drawH);
  const pts = entity.refRect
    .map((v) => `${bx + v.x * scale},${by - v.y * scale}`)
    .join(" ");
  return (
    <polygon
      key={key}
      points={pts}
      fill={style.fill}
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
      opacity={style.opacity}
    />
  );
}

function renderEntity(
  entity: FloorplanEntity,
  delta: number,
  scale: number,
  drawH: number,
  layerName: string,
  key: string,
) {
  const style = LAYER_STYLES[layerName] ?? LAYER_STYLES.Furniture;
  if (entity.type === "polyline") return renderPolyline(entity, delta, scale, drawH, style, key);
  if (entity.type === "block") return renderBlock(entity, delta, scale, drawH, style, key);
  return null;
}

export default function FloorplanSVG({ plan, delta, width = 800, height = 700 }: Props) {
  const padding = 40;
  const drawW = width - padding * 2;
  const drawH = height - padding * 2;

  const totalWidth = plan.baseWidth + delta;
  const scaleX = drawW / totalWidth;
  const scaleY = drawH / plan.baseDepth;
  const scale = Math.min(scaleX, scaleY);

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
