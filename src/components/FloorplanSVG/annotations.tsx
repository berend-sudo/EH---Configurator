// Two annotation layers on top of the floor plan: room labels (name + m²
// centred on each room polygon) and dimension lines (overall building W/D
// plus per-window chains on each wall). Extracted from FloorplanSVG.tsx in
// Phase C2.

import type { FloorplanJSON } from "@/types/floorplan";
import {
  sxT,
  syT,
  polygonAreaM2,
  centroidSVG,
  roomDisplayName,
  windowsOnWall,
  buildChain,
  type WindowPositions,
} from "@/lib/floorplan/geometry";

// ── Room labels ──────────────────────────────────────────────────────────────
export function RoomLabels({
  plan, delta, scale, drawH, padX, padY, wp,
}: {
  plan: FloorplanJSON; delta: number; scale: number;
  drawH: number; padX: number; padY: number; wp: WindowPositions;
}) {
  const labels: React.ReactNode[] = [];

  for (const layer of plan.layers) {
    if (!layer.name.startsWith("Rooms")) continue;
    const displayName = roomDisplayName(layer.name);

    for (let i = 0; i < layer.entities.length; i++) {
      const entity = layer.entities[i];
      if (entity.type !== "polyline") continue;
      const area = polygonAreaM2(entity.vertices, delta, wp).toFixed(2);
      const { x: cx, y: cy } = centroidSVG(entity.vertices, delta, scale, drawH, padX, padY, wp);
      const fontSize = 10;
      const lineH = fontSize + 3;
      const line1 = displayName;
      const line2 = `${area} m²`;
      const approxW = Math.max(line1.length, line2.length) * 5.5 + 8;
      const bgH = lineH * 2 + 6;

      labels.push(
        <g key={`label-${layer.name}-${i}`}>
          <rect
            x={cx - approxW / 2} y={cy - bgH / 2}
            width={approxW} height={bgH}
            fill="white" fillOpacity={0.85} rx={2}
          />
          <text
            x={cx} y={cy - lineH / 2 + fontSize * 0.35}
            textAnchor="middle" fontSize={fontSize}
            fontFamily="sans-serif" fill="#003B2B" fontWeight="600"
          >
            {line1}
          </text>
          <text
            x={cx} y={cy + lineH / 2 + fontSize * 0.35}
            textAnchor="middle" fontSize={fontSize}
            fontFamily="sans-serif" fill="#003B2B"
          >
            {line2}
          </text>
        </g>
      );
    }
  }

  return <>{labels}</>;
}

// ── Dimension lines ──────────────────────────────────────────────────────────
const DIM_COLOR = "#003B2B";
const DIM_FONT  = 9;

function HorizDim({
  x1, x2, y, label, tickLen = 6,
}: { x1: number; x2: number; y: number; label: string; tickLen?: number }) {
  const mx = (x1 + x2) / 2;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={DIM_COLOR} strokeWidth={0.7} />
      <line x1={x1} y1={y - tickLen} x2={x1} y2={y + tickLen} stroke={DIM_COLOR} strokeWidth={0.7} />
      <line x1={x2} y1={y - tickLen} x2={x2} y2={y + tickLen} stroke={DIM_COLOR} strokeWidth={0.7} />
      <text x={mx} y={y - 3} textAnchor="middle" fontSize={DIM_FONT}
        fontFamily="sans-serif" fill={DIM_COLOR}>{label}</text>
    </g>
  );
}

function VertDim({
  x, y1, y2, label, tickLen = 6, side = "left",
}: { x: number; y1: number; y2: number; label: string; tickLen?: number; side?: "left" | "right" }) {
  const my = (y1 + y2) / 2;
  const tx = side === "left" ? x - 8 : x + 8;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={DIM_COLOR} strokeWidth={0.7} />
      <line x1={x - tickLen} y1={y1} x2={x + tickLen} y2={y1} stroke={DIM_COLOR} strokeWidth={0.7} />
      <line x1={x - tickLen} y1={y2} x2={x + tickLen} y2={y2} stroke={DIM_COLOR} strokeWidth={0.7} />
      <text x={tx} y={my} textAnchor="middle" fontSize={DIM_FONT}
        fontFamily="sans-serif" fill={DIM_COLOR}
        transform={`rotate(-90,${tx},${my})`}>{label}</text>
    </g>
  );
}

export function DimensionLines({
  plan, delta, scale, drawH, padX, padY, wp,
}: {
  plan: FloorplanJSON; delta: number; scale: number;
  drawH: number; padX: number; padY: number; wp: WindowPositions;
}) {
  const bLeft   = padX;
  const bRight  = padX + (plan.baseWidth + delta) * scale;
  const bTop    = padY;
  const bBottom = padY + plan.baseDepth * scale;

  const outerOff = 60;
  const innerOff = 30;

  const totalW = Math.round(plan.baseWidth + delta);
  const totalD = Math.round(plan.baseDepth);

  // ── Level 1: overall (top + left only) ──────────────────────────────────
  const outerLines: React.ReactNode[] = [
    <HorizDim key="dim-w" x1={bLeft} x2={bRight} y={bTop - outerOff} label={`${totalW}`} />,
    <VertDim  key="dim-d" x={bLeft - outerOff} y1={bTop} y2={bBottom} label={`${totalD}`} />,
  ];

  // ── Level 2: window chains (all 4 sides) ─────────────────────────────────
  const innerLines: React.ReactNode[] = [];

  const topWins = windowsOnWall(plan, delta, "top", wp);
  const topChain = buildChain(0, plan.baseWidth + delta, topWins);
  for (let i = 0; i < topChain.length; i++) {
    const seg = topChain[i];
    const len = Math.round(seg.to - seg.from);
    if (len < 50) continue;
    const sx1 = sxT(seg.from, scale, padX);
    const sx2 = sxT(seg.to,   scale, padX);
    innerLines.push(
      <HorizDim key={`top-${i}`} x1={sx1} x2={sx2} y={bTop - innerOff}
        label={len >= 300 ? `${len}` : ""} />
    );
  }

  const botWins = windowsOnWall(plan, delta, "bottom", wp);
  const botChain = buildChain(0, plan.baseWidth + delta, botWins);
  for (let i = 0; i < botChain.length; i++) {
    const seg = botChain[i];
    const len = Math.round(seg.to - seg.from);
    if (len < 50) continue;
    const sx1 = sxT(seg.from, scale, padX);
    const sx2 = sxT(seg.to,   scale, padX);
    innerLines.push(
      <HorizDim key={`bot-${i}`} x1={sx1} x2={sx2} y={bBottom + innerOff}
        label={len >= 300 ? `${len}` : ""} tickLen={6} />
    );
  }

  const leftWins = windowsOnWall(plan, delta, "left", wp);
  const leftChain = buildChain(0, plan.baseDepth, leftWins);
  for (let i = 0; i < leftChain.length; i++) {
    const seg = leftChain[i];
    const len = Math.round(seg.to - seg.from);
    if (len < 50) continue;
    const sy1 = syT(seg.to,   scale, drawH, padY);
    const sy2 = syT(seg.from, scale, drawH, padY);
    innerLines.push(
      <VertDim key={`left-${i}`} x={bLeft - innerOff} y1={sy1} y2={sy2}
        label={len >= 300 ? `${len}` : ""} />
    );
  }

  const rightWins = windowsOnWall(plan, delta, "right", wp);
  const rightChain = buildChain(0, plan.baseDepth, rightWins);
  for (let i = 0; i < rightChain.length; i++) {
    const seg = rightChain[i];
    const len = Math.round(seg.to - seg.from);
    if (len < 50) continue;
    const sy1 = syT(seg.to,   scale, drawH, padY);
    const sy2 = syT(seg.from, scale, drawH, padY);
    innerLines.push(
      <VertDim key={`right-${i}`} x={bRight + innerOff} y1={sy1} y2={sy2}
        label={len >= 300 ? `${len}` : ""} side="right" />
    );
  }

  return <>{outerLines}{innerLines}</>;
}
