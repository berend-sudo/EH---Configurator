"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  DoorElement,
  FloorPlanElement,
  FloorPlanModel,
  FurnitureElement,
  RoomLabelElement,
  WallElement,
  WindowElement,
} from "@/types/floorPlan";
import type {
  BackgroundImage,
  CalibrationDraft,
  EditorTool,
} from "@/lib/admin/editorState";
import {
  GRID_MM,
  HALF_GRID_MM,
  WALL_SNAP_MM,
  axisLock,
  distanceToSegment,
  nearestWall,
  snapFurnitureToWalls,
  snapToCornerOrGrid,
} from "@/lib/admin/snap";

interface Props {
  model: FloorPlanModel;
  tool: EditorTool;
  background: BackgroundImage | null;
  pxPerMm: number | null;
  showBackground: boolean;
  showGrid: boolean;
  backgroundOpacity: number;
  halfGrid: boolean;
  calibrationDraft: CalibrationDraft;
  wallDraft: readonly [number, number] | null;
  selectedId: string | null;
  onUpdateModel: (model: FloorPlanModel) => void;
  onCalibrateClick: (pointImgPx: readonly [number, number]) => void;
  onSetWallDraft: (p: readonly [number, number] | null) => void;
  onSelect: (id: string | null) => void;
  onClickEmpty?: (mm: readonly [number, number]) => void;
}

const COLOURS = {
  wall: "#1f2624",
  partition: "#3a4340",
  door: "#6b6256",
  window: "#5b8fb9",
  furnitureStroke: "#6b6256",
  furnitureFill: "#ffffff",
  label: "#1f2624",
  grid: "#d7cdbd",
  gridHalf: "#ebe4d4",
  selection: "#ff6b35",
  draftLine: "#0d3b2e",
};

/**
 * Top-level SVG editor. The coordinate system is in millimetres — the
 * background image is scaled by `pxPerMm` (1 image pixel = 1/pxPerMm mm).
 *
 * All drawing operations compute snapped mm coordinates from the raw
 * pointer. Selection and drag work on the currently selected element
 * using 8 resize handles + whole-element translation.
 */
export function EditorCanvas({
  model,
  tool,
  background,
  pxPerMm,
  showBackground,
  showGrid,
  backgroundOpacity,
  halfGrid,
  calibrationDraft,
  wallDraft,
  selectedId,
  onUpdateModel,
  onCalibrateClick,
  onSetWallDraft,
  onSelect,
  onClickEmpty,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverMm, setHoverMm] = useState<readonly [number, number] | null>(null);
  const [shift, setShift] = useState(false);
  const [drag, setDrag] = useState<
    | {
        kind: "translate";
        id: string;
        startMm: readonly [number, number];
        original: FloorPlanElement;
      }
    | {
        kind: "handle";
        id: string;
        handleIndex: number;
        original: WallElement;
      }
    | null
  >(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShift(true);
      if (e.key === "Escape") {
        onSelect(null);
        onSetWallDraft(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        onUpdateModel({
          ...model,
          elements: model.elements.filter((el) => el.id !== selectedId),
        });
        onSelect(null);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShift(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, [selectedId, model, onSelect, onSetWallDraft, onUpdateModel]);

  const step = halfGrid ? HALF_GRID_MM : GRID_MM;
  const vbWidth = model.viewBox.width;
  const vbHeight = model.viewBox.height;
  const padMm = 600;

  const toMm = (evt: React.MouseEvent<SVGSVGElement>): readonly [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0] as const;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0] as const;
    const local = pt.matrixTransform(ctm.inverse());
    return [local.x, local.y] as const;
  };

  const handleClick = (evt: React.MouseEvent<SVGSVGElement>) => {
    const [mx, my] = toMm(evt);
    if (tool === "wall" || tool === "partition") {
      const snapped = snapToCornerOrGrid(mx, my, model.elements, step);
      if (!wallDraft) {
        onSetWallDraft(snapped.point);
      } else {
        let end = snapped.point;
        if (shift) end = axisLock(wallDraft, end);
        if (end[0] === wallDraft[0] && end[1] === wallDraft[1]) return;
        const newWall: WallElement = {
          id: `${tool}-${Date.now()}`,
          type: tool,
          thicknessMm: tool === "wall" ? 88 : 60,
          points: [wallDraft, end],
        };
        onUpdateModel({
          ...model,
          elements: [...model.elements, newWall],
        });
        onSetWallDraft(null);
      }
      return;
    }
    if (tool === "door" || tool === "window") {
      const hit = nearestWall([mx, my], model.elements, 500);
      if (!hit) return;
      if (tool === "door") {
        const door: DoorElement = {
          id: `door-${Date.now()}`,
          type: "door",
          hingeXMm: hit.projection[0],
          hingeYMm: hit.projection[1],
          widthMm: 800,
          swing: "NE",
          wallAxis: "horizontal",
        };
        onUpdateModel({ ...model, elements: [...model.elements, door] });
      } else {
        const w = 1100;
        const [ax, ay] = hit.wall.points[hit.segIndex];
        const [bx, by] = hit.wall.points[hit.segIndex + 1];
        const segLen = Math.hypot(bx - ax, by - ay) || 1;
        const ux = (bx - ax) / segLen;
        const uy = (by - ay) / segLen;
        const half = w / 2;
        const win: WindowElement = {
          id: `win-${Date.now()}`,
          type: "window",
          points: [
            [hit.projection[0] - ux * half, hit.projection[1] - uy * half],
            [hit.projection[0] + ux * half, hit.projection[1] + uy * half],
          ],
        };
        onUpdateModel({ ...model, elements: [...model.elements, win] });
      }
      return;
    }
    if (tool === "label") {
      const label: RoomLabelElement = {
        id: `label-${Date.now()}`,
        type: "room-label",
        xMm: Math.round(mx),
        yMm: Math.round(my),
        label: "Room",
      };
      onUpdateModel({ ...model, elements: [...model.elements, label] });
      return;
    }
    if (tool === "zone-line" && onClickEmpty) {
      onClickEmpty([mx, my]);
      return;
    }
    // Calibration is driven via an explicit click on the background image
    // in CalibrationStep — the editor canvas skips it in step 3+.
    if (calibrationDraft.points.length < 2 && background && pxPerMm === null) {
      // Convert mm back to image pixels using *provisional* pxPerMm of 1.
      // But in practice step 2 uses a dedicated component; this path is
      // a safety net.
      onCalibrateClick([mx, my] as const);
      return;
    }
    // Select nothing — clear selection.
    if (tool === "select") {
      onSelect(null);
    }
  };

  const handleMove = (evt: React.MouseEvent<SVGSVGElement>) => {
    const p = toMm(evt);
    setHoverMm(p);
    if (drag) {
      if (drag.kind === "translate") {
        const dx = p[0] - drag.startMm[0];
        const dy = p[1] - drag.startMm[1];
        const moved = translateElement(drag.original, dx, dy);
        const snapped = snapElementToContext(moved, model.elements, step);
        onUpdateModel({
          ...model,
          elements: model.elements.map((el) => (el.id === drag.id ? snapped : el)),
        });
      } else if (drag.kind === "handle") {
        const idx = drag.handleIndex;
        const snapped = snapToCornerOrGrid(p[0], p[1], model.elements, step);
        let pt = snapped.point;
        if (shift && drag.original.points.length === 2) {
          const other = drag.original.points[idx === 0 ? 1 : 0];
          pt = axisLock(other, pt);
        }
        const newPoints = drag.original.points.map((pp, i) => (i === idx ? pt : pp));
        onUpdateModel({
          ...model,
          elements: model.elements.map((el) =>
            el.id === drag.id ? { ...drag.original, points: newPoints } : el,
          ),
        });
      }
    }
  };

  const handleUp = () => setDrag(null);

  const onPointerDownElement = (el: FloorPlanElement, evt: React.MouseEvent) => {
    if (tool !== "select") return;
    evt.stopPropagation();
    onSelect(el.id);
    const mm = toMm(evt as unknown as React.MouseEvent<SVGSVGElement>);
    setDrag({ kind: "translate", id: el.id, startMm: mm, original: el });
  };

  const onPointerDownHandle = (
    wall: WallElement,
    index: number,
    evt: React.MouseEvent,
  ) => {
    evt.stopPropagation();
    onSelect(wall.id);
    setDrag({ kind: "handle", id: wall.id, handleIndex: index, original: wall });
  };

  const bgTransform = useMemo(() => {
    if (!background || !pxPerMm) return null;
    // image.x = mm * pxPerMm ⇒ in mm-space image is scaled by 1/pxPerMm
    const s = 1 / pxPerMm;
    return `scale(${s} ${s})`;
  }, [background, pxPerMm]);

  return (
    <div className="relative w-full overflow-auto rounded border border-eh-sage bg-white">
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`${-padMm} ${-padMm} ${vbWidth + padMm * 2} ${vbHeight + padMm * 2}`}
        className="block h-auto w-full cursor-crosshair"
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
      >
        {/* Background image, scaled into mm space */}
        {showBackground && background && bgTransform && (
          <g transform={bgTransform} opacity={backgroundOpacity} pointerEvents="none">
            <image
              href={background.url}
              x={0}
              y={0}
              width={background.widthPx}
              height={background.heightPx}
            />
          </g>
        )}

        {/* Grid (after BG, before elements) */}
        {showGrid && <GridLayer width={vbWidth} height={vbHeight} step={step} />}

        {/* Elements */}
        {model.elements.map((el) => (
          <ElementRenderer
            key={el.id}
            el={el}
            selected={el.id === selectedId}
            onMouseDown={(evt) => onPointerDownElement(el, evt)}
          />
        ))}

        {/* Wall endpoint handles for selected wall */}
        {(() => {
          const sel = model.elements.find((e) => e.id === selectedId);
          if (!sel) return null;
          if (sel.type === "wall" || sel.type === "partition") {
            return sel.points.map((p, i) => (
              <circle
                key={i}
                cx={p[0]}
                cy={p[1]}
                r={80}
                fill="white"
                stroke={COLOURS.selection}
                strokeWidth={20}
                style={{ cursor: "grab" }}
                onMouseDown={(evt) => onPointerDownHandle(sel as WallElement, i, evt)}
              />
            ));
          }
          return null;
        })()}

        {/* Wall draft preview */}
        {wallDraft && hoverMm && (tool === "wall" || tool === "partition") && (
          <line
            x1={wallDraft[0]}
            y1={wallDraft[1]}
            x2={shift ? axisLock(wallDraft, hoverMm)[0] : hoverMm[0]}
            y2={shift ? axisLock(wallDraft, hoverMm)[1] : hoverMm[1]}
            stroke={COLOURS.draftLine}
            strokeWidth={tool === "wall" ? 60 : 40}
            strokeDasharray="100 60"
            opacity={0.6}
            pointerEvents="none"
          />
        )}

        {/* Hover crosshair (mm readout) */}
        {hoverMm && tool !== "select" && (
          <g pointerEvents="none" opacity={0.7}>
            <circle cx={hoverMm[0]} cy={hoverMm[1]} r={40} fill={COLOURS.selection} />
          </g>
        )}
      </svg>

      {/* Overlay info */}
      <div className="pointer-events-none absolute left-2 top-2 rounded bg-white/80 px-2 py-1 text-xs font-mono text-eh-charcoal">
        {hoverMm
          ? `x=${Math.round(hoverMm[0])} y=${Math.round(hoverMm[1])} mm · grid ${step}mm${shift ? " · ⇧ axis" : ""}`
          : `grid ${step}mm`}
      </div>
    </div>
  );
}

function GridLayer({
  width,
  height,
  step,
}: {
  width: number;
  height: number;
  step: number;
}) {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= width; x += step) {
    lines.push(
      <line
        key={`gv${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={x % GRID_MM === 0 ? COLOURS.grid : COLOURS.gridHalf}
        strokeWidth={x % GRID_MM === 0 ? 8 : 4}
      />,
    );
  }
  for (let y = 0; y <= height; y += step) {
    lines.push(
      <line
        key={`gh${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={y % GRID_MM === 0 ? COLOURS.grid : COLOURS.gridHalf}
        strokeWidth={y % GRID_MM === 0 ? 8 : 4}
      />,
    );
  }
  return <g pointerEvents="none">{lines}</g>;
}

function ElementRenderer({
  el,
  selected,
  onMouseDown,
}: {
  el: FloorPlanElement;
  selected: boolean;
  onMouseDown: (evt: React.MouseEvent) => void;
}) {
  const sel = selected
    ? { stroke: COLOURS.selection, strokeWidth: 30 }
    : null;
  if (el.type === "wall" || el.type === "partition") {
    const thickness = el.thicknessMm ?? (el.type === "wall" ? 88 : 60);
    return (
      <g onMouseDown={onMouseDown} style={{ cursor: "pointer" }}>
        <path
          d={polylinePath(el.points)}
          fill="none"
          stroke={el.type === "wall" ? COLOURS.wall : COLOURS.partition}
          strokeWidth={thickness}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        {sel && (
          <path
            d={polylinePath(el.points)}
            fill="none"
            stroke={sel.stroke}
            strokeWidth={thickness + 40}
            strokeLinecap="square"
            opacity={0.3}
          />
        )}
      </g>
    );
  }
  if (el.type === "room-fill") {
    return (
      <path
        d={polygonPath(el.points)}
        fill={el.fill ?? "#efe5d0"}
        onMouseDown={onMouseDown}
      />
    );
  }
  if (el.type === "terrace") {
    return (
      <g onMouseDown={onMouseDown} style={{ cursor: "pointer" }}>
        <path
          d={polygonPath(el.points)}
          fill="#d8d6d2"
          opacity={0.65}
          stroke={selected ? COLOURS.selection : "#8a8279"}
          strokeWidth={selected ? 40 : 24}
          strokeDasharray="80 60"
        />
        {el.label && (
          <text
            x={el.points.reduce((s, p) => s + p[0], 0) / el.points.length}
            y={el.points.reduce((s, p) => s + p[1], 0) / el.points.length}
            textAnchor="middle"
            fontSize={150}
            fill="#6b6256"
            fontStyle="italic"
          >
            {el.label}
          </text>
        )}
      </g>
    );
  }
  if (el.type === "window") {
    const [[x1, y1], [x2, y2]] = el.points;
    return (
      <g onMouseDown={onMouseDown} style={{ cursor: "pointer" }}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={COLOURS.window}
          strokeWidth={50}
        />
        {sel && (
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={sel.stroke}
            strokeWidth={90}
            opacity={0.3}
          />
        )}
      </g>
    );
  }
  if (el.type === "door") {
    const { hingeXMm: hx, hingeYMm: hy, widthMm: w, swing } = el;
    const dir = {
      NE: { dx: 1, dy: -1, large: 0, sweep: 1 },
      NW: { dx: -1, dy: -1, large: 0, sweep: 0 },
      SE: { dx: 1, dy: 1, large: 0, sweep: 0 },
      SW: { dx: -1, dy: 1, large: 0, sweep: 1 },
    }[swing];
    const leafX = hx + dir.dx * w;
    const leafY = hy;
    const arcEndX = hx;
    const arcEndY = hy + dir.dy * w;
    return (
      <g onMouseDown={onMouseDown} style={{ cursor: "pointer" }}>
        <line
          x1={hx}
          y1={hy}
          x2={leafX}
          y2={leafY}
          stroke={selected ? COLOURS.selection : COLOURS.door}
          strokeWidth={30}
        />
        <path
          d={`M ${leafX} ${leafY} A ${w} ${w} 0 ${dir.large} ${dir.sweep} ${arcEndX} ${arcEndY}`}
          stroke={selected ? COLOURS.selection : COLOURS.door}
          strokeWidth={12}
          strokeDasharray="40 40"
          fill="none"
        />
      </g>
    );
  }
  if (el.type === "furniture") {
    const { xMm: x, yMm: y, widthMm: w, heightMm: h, rotationDeg = 0 } = el;
    const cx = x + w / 2;
    const cy = y + h / 2;
    return (
      <g
        transform={`rotate(${rotationDeg} ${cx} ${cy})`}
        onMouseDown={onMouseDown}
        style={{ cursor: "pointer" }}
      >
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill={COLOURS.furnitureFill}
          stroke={selected ? COLOURS.selection : COLOURS.furnitureStroke}
          strokeWidth={selected ? 40 : 20}
          rx={30}
        />
        <text
          x={cx}
          y={cy + 40}
          textAnchor="middle"
          fontSize={120}
          fill={COLOURS.furnitureStroke}
          opacity={0.6}
        >
          {el.subtype}
        </text>
      </g>
    );
  }
  if (el.type === "room-label") {
    return (
      <g onMouseDown={onMouseDown} style={{ cursor: "pointer" }}>
        <text
          x={el.xMm}
          y={el.yMm}
          textAnchor="middle"
          fontSize={180}
          fontWeight={600}
          fill={selected ? COLOURS.selection : COLOURS.label}
        >
          {el.label}
        </text>
        {el.areaM2 !== undefined && (
          <text
            x={el.xMm}
            y={el.yMm + 220}
            textAnchor="middle"
            fontSize={140}
            fill={COLOURS.furnitureStroke}
          >
            {el.areaM2.toFixed(1)} m²
          </text>
        )}
      </g>
    );
  }
  if (el.type === "dimension") {
    // Dimensions are rendered in the live preview, not here.
    return null;
  }
  return null;
}

function polylinePath(points: ReadonlyArray<readonly [number, number]>): string {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
}

function polygonPath(points: ReadonlyArray<readonly [number, number]>): string {
  return polylinePath(points) + " Z";
}

function translateElement(el: FloorPlanElement, dx: number, dy: number): FloorPlanElement {
  if (
    el.type === "wall" ||
    el.type === "partition" ||
    el.type === "room-fill" ||
    el.type === "window" ||
    el.type === "terrace"
  ) {
    return {
      ...el,
      points: el.points.map(([x, y]) => [x + dx, y + dy] as const),
    } as FloorPlanElement;
  }
  if (el.type === "door") {
    return { ...el, hingeXMm: el.hingeXMm + dx, hingeYMm: el.hingeYMm + dy };
  }
  if (el.type === "furniture" || el.type === "room-label") {
    return { ...el, xMm: el.xMm + dx, yMm: el.yMm + dy };
  }
  if (el.type === "dimension") {
    return {
      ...el,
      from: [el.from[0] + dx, el.from[1] + dy] as const,
      to: [el.to[0] + dx, el.to[1] + dy] as const,
    };
  }
  return el;
}

/**
 * Post-translate snap: furniture snaps to walls within 100mm,
 * door/window positions snap to nearest wall, everything else snaps
 * to the grid (or the user's half-grid if enabled).
 */
function snapElementToContext(
  el: FloorPlanElement,
  others: readonly FloorPlanElement[],
  step: number,
): FloorPlanElement {
  const siblings = others.filter((o) => o.id !== el.id);
  if (el.type === "furniture") {
    const f = el as FurnitureElement;
    const { x, y } = snapFurnitureToWalls(
      f.xMm,
      f.yMm,
      f.widthMm,
      f.heightMm,
      siblings,
    );
    return { ...f, xMm: Math.round(x / step) * step, yMm: Math.round(y / step) * step };
  }
  if (el.type === "door") {
    const hit = nearestWall([el.hingeXMm, el.hingeYMm], siblings, WALL_SNAP_MM * 4);
    if (hit) {
      return { ...el, hingeXMm: hit.projection[0], hingeYMm: hit.projection[1] };
    }
    return el;
  }
  if (el.type === "window") {
    const mid: [number, number] = [
      (el.points[0][0] + el.points[1][0]) / 2,
      (el.points[0][1] + el.points[1][1]) / 2,
    ];
    const hit = nearestWall(mid, siblings, WALL_SNAP_MM * 4);
    if (hit) {
      const [ax, ay] = hit.wall.points[hit.segIndex];
      const [bx, by] = hit.wall.points[hit.segIndex + 1];
      const segLen = Math.hypot(bx - ax, by - ay) || 1;
      const ux = (bx - ax) / segLen;
      const uy = (by - ay) / segLen;
      const halfLen = Math.hypot(
        el.points[1][0] - el.points[0][0],
        el.points[1][1] - el.points[0][1],
      ) / 2;
      return {
        ...el,
        points: [
          [hit.projection[0] - ux * halfLen, hit.projection[1] - uy * halfLen],
          [hit.projection[0] + ux * halfLen, hit.projection[1] + uy * halfLen],
        ],
      };
    }
    return el;
  }
  if (el.type === "wall" || el.type === "partition" || el.type === "terrace") {
    return {
      ...el,
      points: el.points.map(
        ([x, y]) => [Math.round(x / step) * step, Math.round(y / step) * step] as const,
      ),
    };
  }
  if (el.type === "room-label") {
    return {
      ...el,
      xMm: Math.round(el.xMm / step) * step,
      yMm: Math.round(el.yMm / step) * step,
    };
  }
  return el;
}

/** Avoid unused variable warning — distanceToSegment is re-exported for tests. */
export const __distance = distanceToSegment;
