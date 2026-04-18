import type {
  DimensionElement,
  DoorElement,
  FloorPlanElement,
  FloorPlanModel,
  FurnitureElement,
  FurnitureSubtype,
  RoomFillElement,
  RoomLabelElement,
  WallElement,
  WindowElement,
} from "@/types/floorPlan";
import { stretchFloorPlan } from "@/lib/floorPlan/stretch";

interface Props {
  model: FloorPlanModel;
  /** Target structural length (mm). When set, the plan is stretched to match. */
  lengthMm?: number;
  /** Show half-frame grid (610 mm). */
  showGrid?: boolean;
  /** Outer class for layout. */
  className?: string;
}

const COLOURS = {
  wall: "#1f2624",
  partition: "#3a4340",
  door: "#6b6256",
  window: "#5b8fb9",
  furnitureStroke: "#6b6256",
  furnitureFill: "#ffffff",
  label: "#1f2624",
  labelArea: "#6b6256",
  dimension: "#8a8279",
  grid: "#d7cdbd",
};

export function FloorPlanSVG({
  model,
  lengthMm,
  showGrid = false,
  className,
}: Props) {
  const stretched =
    lengthMm !== undefined && lengthMm !== model.baseLengthMm
      ? stretchFloorPlan(model, lengthMm)
      : null;

  const elements = stretched?.elements ?? model.elements;
  const vbWidth = stretched?.outerWidthMm ?? model.viewBox.width;
  const vbHeight = model.viewBox.height;

  // Keep the veranda's overhang + dimension labels visible in the viewBox.
  const pad = 800;

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${vbWidth + 2 * pad} ${vbHeight + 2 * pad}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`${model.name} floor plan`}
    >
      {showGrid && <GridLayer width={vbWidth} height={vbHeight} />}

      {/* Paint room fills first so walls and furniture stack on top. */}
      {elements
        .filter((e): e is RoomFillElement => e.type === "room-fill")
        .map((e) => (
          <RoomFill key={e.id} el={e} />
        ))}

      {elements
        .filter((e): e is WallElement => e.type === "wall" || e.type === "partition")
        .map((e) => (
          <Wall key={e.id} el={e} />
        ))}

      {elements
        .filter((e): e is WindowElement => e.type === "window")
        .map((e) => (
          <Window key={e.id} el={e} />
        ))}

      {elements
        .filter((e): e is DoorElement => e.type === "door")
        .map((e) => (
          <Door key={e.id} el={e} />
        ))}

      {elements
        .filter((e): e is FurnitureElement => e.type === "furniture")
        .map((e) => (
          <Furniture key={e.id} el={e} />
        ))}

      {elements
        .filter((e): e is RoomLabelElement => e.type === "room-label")
        .map((e) => (
          <RoomLabel key={e.id} el={e} />
        ))}

      {elements
        .filter((e): e is DimensionElement => e.type === "dimension")
        .map((e) => (
          <Dimension key={e.id} el={e} />
        ))}
    </svg>
  );
}

/* ---------- element renderers ---------- */

function GridLayer({ width, height }: { width: number; height: number }) {
  const step = 610;
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= width; x += step) {
    lines.push(
      <line
        key={`gv${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={COLOURS.grid}
        strokeWidth={8}
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
        stroke={COLOURS.grid}
        strokeWidth={8}
      />,
    );
  }
  return <g>{lines}</g>;
}

function RoomFill({ el }: { el: RoomFillElement }) {
  const d = polygonPath(el.points);
  return <path d={d} fill={el.fill ?? "#efe5d0"} />;
}

function Wall({ el }: { el: WallElement }) {
  const thickness = el.thicknessMm ?? (el.type === "wall" ? 88 : 60);
  const d = polylinePath(el.points);
  return (
    <path
      d={d}
      fill="none"
      stroke={el.type === "wall" ? COLOURS.wall : COLOURS.partition}
      strokeWidth={thickness}
      strokeLinecap="square"
      strokeLinejoin="miter"
    />
  );
}

function Window({ el }: { el: WindowElement }) {
  const [[x1, y1], [x2, y2]] = el.points;
  // Two-line symbol: the wall opening + a glass line offset perpendicular
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const off = 40;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={COLOURS.window}
        strokeWidth={50}
        strokeLinecap="butt"
      />
      <line
        x1={x1 + nx * off}
        y1={y1 + ny * off}
        x2={x2 + nx * off}
        y2={y2 + ny * off}
        stroke={COLOURS.window}
        strokeWidth={14}
      />
    </g>
  );
}

function Door({ el }: { el: DoorElement }) {
  const { hingeXMm: hx, hingeYMm: hy, widthMm: w, swing } = el;
  // Compute leaf endpoint and arc sweep from swing quadrant.
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
    <g>
      {/* leaf */}
      <line
        x1={hx}
        y1={hy}
        x2={leafX}
        y2={leafY}
        stroke={COLOURS.door}
        strokeWidth={30}
        strokeLinecap="round"
      />
      {/* swing arc */}
      <path
        d={`M ${leafX} ${leafY} A ${w} ${w} 0 ${dir.large} ${dir.sweep} ${arcEndX} ${arcEndY}`}
        stroke={COLOURS.door}
        strokeWidth={12}
        strokeDasharray="40 40"
        fill="none"
      />
    </g>
  );
}

function Furniture({ el }: { el: FurnitureElement }) {
  const { xMm: x, yMm: y, widthMm: w, heightMm: h, rotationDeg = 0, subtype } = el;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g transform={`rotate(${rotationDeg} ${cx} ${cy})`}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={COLOURS.furnitureFill}
        stroke={COLOURS.furnitureStroke}
        strokeWidth={20}
        rx={30}
      />
      <FurnitureMarkings el={el} />
      {/* subtype hint in small grey text — helps verify the trace */}
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fontSize={90}
        fill={COLOURS.furnitureStroke}
        opacity={0.5}
      >
        {glyphFor(subtype)}
      </text>
    </g>
  );
}

/** Per-subtype inner marks (pillows on beds, hobs on stove, basin on sink). */
function FurnitureMarkings({ el }: { el: FurnitureElement }) {
  const { xMm: x, yMm: y, widthMm: w, heightMm: h, subtype } = el;
  const stroke = COLOURS.furnitureStroke;
  switch (subtype) {
    case "bed-double":
    case "bed-single": {
      // pillow strip along the shorter edge
      return (
        <rect
          x={x + 40}
          y={y + 40}
          width={w - 80}
          height={Math.min(350, h * 0.18)}
          fill="none"
          stroke={stroke}
          strokeWidth={14}
          rx={20}
        />
      );
    }
    case "sofa": {
      return (
        <>
          <rect
            x={x + 60}
            y={y + 60}
            width={w - 120}
            height={h * 0.35}
            fill="none"
            stroke={stroke}
            strokeWidth={14}
            rx={20}
          />
          <line
            x1={x + w / 3}
            y1={y + 60}
            x2={x + w / 3}
            y2={y + h - 60}
            stroke={stroke}
            strokeWidth={10}
          />
          <line
            x1={x + (2 * w) / 3}
            y1={y + 60}
            x2={x + (2 * w) / 3}
            y2={y + h - 60}
            stroke={stroke}
            strokeWidth={10}
          />
        </>
      );
    }
    case "stove": {
      // four burner circles
      const rx = w / 4;
      const ry = h / 3;
      const r = Math.min(rx, ry) * 0.6;
      return (
        <>
          {[0, 1].map((i) =>
            [0, 1].map((j) => (
              <circle
                key={`${i}-${j}`}
                cx={x + rx + i * 2 * rx}
                cy={y + ry + j * ry}
                r={r}
                fill="none"
                stroke={stroke}
                strokeWidth={14}
              />
            )),
          )}
        </>
      );
    }
    case "sink-kitchen":
    case "sink-bathroom": {
      return (
        <rect
          x={x + 40}
          y={y + 40}
          width={w - 80}
          height={h - 80}
          fill="none"
          stroke={stroke}
          strokeWidth={14}
          rx={40}
        />
      );
    }
    case "toilet": {
      return (
        <ellipse
          cx={x + w / 2}
          cy={y + h * 0.6}
          rx={w * 0.35}
          ry={h * 0.3}
          fill="none"
          stroke={stroke}
          strokeWidth={14}
        />
      );
    }
    case "bathtub": {
      return (
        <rect
          x={x + 80}
          y={y + 80}
          width={w - 160}
          height={h - 160}
          fill="none"
          stroke={stroke}
          strokeWidth={14}
          rx={80}
        />
      );
    }
    case "dining-table":
    case "wardrobe":
    case "dining-chair":
    case "armchair":
    case "kitchen-counter":
    case "fridge":
    case "shower":
    case "generic":
      return null;
  }
}

function glyphFor(subtype: FurnitureSubtype): string {
  switch (subtype) {
    case "fridge": return "F";
    case "wardrobe": return "W";
    case "kitchen-counter": return "";
    case "dining-table": return "";
    case "dining-chair": return "";
    case "armchair": return "";
    case "sofa": return "";
    case "bed-double": return "";
    case "bed-single": return "";
    case "sink-kitchen": return "";
    case "sink-bathroom": return "";
    case "stove": return "";
    case "toilet": return "";
    case "bathtub": return "";
    case "shower": return "";
    default: return "";
  }
}

function RoomLabel({ el }: { el: RoomLabelElement }) {
  return (
    <g>
      <text
        x={el.xMm}
        y={el.yMm}
        textAnchor="middle"
        fontSize={180}
        fontWeight={600}
        fill={COLOURS.label}
      >
        {el.label}
      </text>
      {el.areaM2 !== undefined && (
        <text
          x={el.xMm}
          y={el.yMm + 220}
          textAnchor="middle"
          fontSize={140}
          fill={COLOURS.labelArea}
        >
          {el.areaM2} m²
        </text>
      )}
    </g>
  );
}

function Dimension({ el }: { el: DimensionElement }) {
  const [[x1, y1], [x2, y2]] = [el.from, el.to];
  const offset = el.offsetMm ?? -300;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ox = nx * offset;
  const oy = ny * offset;
  const ax1 = x1 + ox;
  const ay1 = y1 + oy;
  const ax2 = x2 + ox;
  const ay2 = y2 + oy;
  const midX = (ax1 + ax2) / 2;
  const midY = (ay1 + ay2) / 2;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <g stroke={COLOURS.dimension} fill="none" strokeWidth={14}>
      <line x1={x1} y1={y1} x2={ax1} y2={ay1} strokeDasharray="30 30" />
      <line x1={x2} y1={y2} x2={ax2} y2={ay2} strokeDasharray="30 30" />
      <line x1={ax1} y1={ay1} x2={ax2} y2={ay2} />
      <polygon
        points={`${ax1},${ay1} ${ax1 + 100},${ay1 - 40} ${ax1 + 100},${ay1 + 40}`}
        fill={COLOURS.dimension}
        stroke="none"
        transform={`rotate(${angle} ${ax1} ${ay1})`}
      />
      <polygon
        points={`${ax2},${ay2} ${ax2 - 100},${ay2 - 40} ${ax2 - 100},${ay2 + 40}`}
        fill={COLOURS.dimension}
        stroke="none"
        transform={`rotate(${angle} ${ax2} ${ay2})`}
      />
      <text
        x={midX}
        y={midY - 60}
        textAnchor="middle"
        fontSize={170}
        fill={COLOURS.dimension}
        stroke="none"
        transform={`rotate(${angle} ${midX} ${midY})`}
      >
        {el.label}
      </text>
    </g>
  );
}

/* ---------- helpers ---------- */

function polylinePath(points: ReadonlyArray<readonly [number, number]>): string {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
}

function polygonPath(points: ReadonlyArray<readonly [number, number]>): string {
  return polylinePath(points) + " Z";
}

export function __test_polylinePath(
  points: ReadonlyArray<readonly [number, number]>,
): string {
  return polylinePath(points);
}

export function __test_polygonPath(
  points: ReadonlyArray<readonly [number, number]>,
): string {
  return polygonPath(points);
}

// Re-export subtype for the inline text hint (keeps single import surface).
export type { FloorPlanElement };
