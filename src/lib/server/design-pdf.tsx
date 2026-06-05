import path from "path";
import {
  Document,
  Page,
  View,
  Text,
  Svg,
  G,
  Polygon,
  Polyline,
  Line,
  Path,
  Rect,
  Circle,
  Image,
  Font,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type {
  FloorplanJSON,
  FloorplanEntity,
  BlockEntity,
  BlockGeom,
  PolylineEntity,
  Vertex,
} from "@/types/floorplan";
import type { RoomColorKey } from "@/lib/rooms";
import { BASE_COUNTRY, fmtMoney, type Country } from "@/lib/countries";
import { TYPOLOGIES, type TypologyId } from "@/lib/typologies";
import {
  randomFurniturePhotoFiles,
  randomTypologyPhotoFile,
} from "@/lib/server/brand-images";

// ── Brand tokens (mirrors eh-tokens.css) ───────────────────────────────────
const C = {
  green: "#4DCC7A",
  green200: "#A6E8BE",
  green700: "#157A3C",
  green900: "#003B2B",
  stroke: "#E7EAE5",
  bgAlt: "#FAF9F6",
  text: "#003B2B",
  muted: "#4A5C56",
  living: "#F5ECD7",
  bath: "#E8F4F8",
  terrace: "#D4C4A0",
  timber: "#8C5E36", // --eh-timber, for plant stems in furniture blocks
};

const ROOM_COLORS: Record<RoomColorKey, string> = {
  living: C.living,
  bath: C.bath,
  terrace: C.terrace,
};

// Net Carbon Removal Benefits per Easy Home, taken as a flat figure rather
// than scaled per-m² — the underlying CSC methodology certifies a per-home
// number, not a continuous m² rate, and the brand has historically led
// with a single tonnes claim. ~10 t / home for the average ~75 m² build;
// see footnote on the climate box.
// Source: Easy Housing — Carbon Removal Context Document 2024 (v1.2),
// §1, §2.4 ("Construction Stored Carbon (CSC) of an average Easy Home is
// around 10 tonnes of CO₂ net carbon removal benefits"). Author: Wolf
// Bierens. carbon@easyhousing.org.
const CO2_REMOVAL_PER_HOME_TONNES = 10;

export interface DesignPdfData {
  plan: FloorplanJSON;
  delta: number;
  label: string;
  bedrooms: number;
  /** Drives the cover's exterior photo (left half) — picks the canonical
   *  shot from BRAND_IMAGES.typology[t]. */
  typology: TypologyId;
  reference: string;
  generatedDate: string;
  client: { name: string; email: string };
  dimensions: { widthM: number; lengthM: number; footprintM2: number };
  /**
   * Single source-of-truth indicative budget in UGX — the same figure the
   * user saw in the configurator (calculateBudget(...).coreTotal). Printed
   * once on the cover and once on the spec page; no derived totals.
   */
  indicativeBudgetUgx: number;
  rooms: { name: string; areaM2: number; colorKey: RoomColorKey }[];
  /**
   * Country picked at the gate. Drives the primary money column on the spec
   * sheet + the headline budget on the cover. The UGX equivalent is still
   * shown in small print on the cover so architects can cross-check against
   * the source-of-truth figure.
   */
  country: Country;
}

// ── Fonts (best-effort; falls back to Helvetica if registration fails) ──────
let FONT = "Helvetica";
let FONT_BOLD = "Helvetica-Bold";
try {
  const fontDir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "Poppins",
    fonts: [
      { src: path.join(fontDir, "Poppins-Light.ttf"), fontWeight: 300 },
      { src: path.join(fontDir, "Poppins-Regular.ttf"), fontWeight: 400 },
      { src: path.join(fontDir, "Poppins-Medium.ttf"), fontWeight: 500 },
      { src: path.join(fontDir, "Poppins-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(fontDir, "Poppins-Bold.ttf"), fontWeight: 700 },
    ],
  });
  FONT = "Poppins";
  FONT_BOLD = "Poppins";
} catch {
  // keep Helvetica fallback
}

const logoWhite = path.join(process.cwd(), "public", "brand", "logo-full-white.png");
const logoColor = path.join(process.cwd(), "public", "brand", "logo-full-color.png");

const styles = StyleSheet.create({
  page: { fontFamily: FONT, color: C.text, fontSize: 11, fontWeight: 300 },
  eyebrow: { fontSize: 8, letterSpacing: 1.2, color: C.muted, fontWeight: 600 },
  h1: { fontSize: 30, fontWeight: 600, fontFamily: FONT_BOLD },
  h2: { fontSize: 20, fontWeight: 600, fontFamily: FONT_BOLD },
});

// Footer pinned to the page bottom (the prompt's "footer at the page margin,
// not wherever content ends" rule). Each Page reserves matching paddingBottom.
const FOOTER_HEIGHT = 36;

function PageFooter({ left, right }: { left: string; right: string }) {
  return (
    <View
      fixed
      style={{
        position: "absolute",
        left: 36,
        right: 36,
        bottom: 14,
        borderTopWidth: 1,
        borderTopColor: C.stroke,
        paddingTop: 8,
        flexDirection: "row",
        justifyContent: "space-between",
      }}
    >
      <Text style={{ fontSize: 8, color: C.muted }}>{left}</Text>
      <Text style={{ fontSize: 8, color: C.muted }}>{right}</Text>
    </View>
  );
}

// ── Floor-plan SVG ──────────────────────────────────────────────────────────
// A print-side port of the on-screen FloorplanSVG, adapted to @react-pdf
// primitives. Renders rooms, walls, windows, doors, furniture (blocks +
// polylines, incl. the plant sub-layer styling) and exterior dimension
// lines. The two implementations share no code — react-pdf needs its own
// SVG element set — but the geometry/transform logic is intentionally a
// 1:1 mirror so a change in one is easy to reflect in the other.

const WALL_THICKNESS = 94; // mm
const DIM_OUTER = 20; // pt — overall (level-1) dimension offset from building
const DIM_INNER = 10; // pt — window-chain (level-2) dimension offset
const DIM_FONT = 6;
const PAD_L = 34;
const PAD_T = 34;
const PAD_R = 20;
const PAD_B = 20;

interface Pt {
  x: number;
  y: number;
}

// Transform context: world-mm → SVG points.
interface Xform {
  scale: number;
  drawH: number;
}
const SX = (T: Xform, x: number, padL = PAD_L) => x * T.scale + padL;
const SY = (T: Xform, y: number) => PAD_T + T.drawH - y * T.scale;

type WindowPositions = Map<number, Pt[]>;

function buildWindowPositions(plan: FloorplanJSON, delta: number): WindowPositions {
  const map: WindowPositions = new Map();
  const windowLayer = plan.layers.find((l) => l.name === "Windows");
  if (!windowLayer) return map;
  let widx = 0;
  for (const entity of windowLayer.entities) {
    if (entity.type !== "polyline") continue;
    const dx = entity.vertices.some((v) => v.moveX) ? delta : 0;
    map.set(widx, entity.vertices.map((v) => ({ x: v.x + dx, y: v.y })));
    widx++;
  }
  return map;
}

function vertWorld(v: Vertex, delta: number, wp: WindowPositions): Pt {
  if (v.attach) {
    const pts = wp.get(v.attach.windowIdx);
    if (pts) {
      const p = pts[v.attach.vertexIdx];
      if (p) return p;
    }
  }
  return { x: v.x + (v.moveX ? delta : 0), y: v.y };
}

function applyDelta(verts: Vertex[], delta: number, wp: WindowPositions): Pt[] {
  return verts.map((v) => vertWorld(v, delta, wp));
}

function bboxOf(pts: Pt[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

// ── Furniture geometry styling (mirrors FloorplanSVG, bound to --eh tokens) ──
interface GeomStyle { fill: string; stroke: string; strokeWidth: number; z: number }
const DEFAULT_GEOM_STYLE: GeomStyle = { fill: "none", stroke: C.green900, strokeWidth: 0.4, z: 1 };
const PLANT_POT_LAYER = "EH-PLANT-POT";
const POT_BODY_STYLE: GeomStyle = { fill: C.green900, stroke: C.green900, strokeWidth: 0.4, z: 0 };
const POT_LINE_STYLE: GeomStyle = { fill: "none", stroke: C.green200, strokeWidth: 0.5, z: 4 };
const GEOM_STYLE_BY_LAYER: Record<string, GeomStyle> = {
  "EH-PLANT-FILL": { fill: C.green200, stroke: "none", strokeWidth: 0, z: 1 },
  "EH-PLANT-STEMS": { fill: "none", stroke: C.timber, strokeWidth: 0.4, z: 2 },
  "EH-PLANT-LEAVES": { fill: "none", stroke: C.green, strokeWidth: 0.4, z: 3 },
};
function geomStyle(layer?: string): GeomStyle {
  return (layer && GEOM_STYLE_BY_LAYER[layer]) || DEFAULT_GEOM_STYLE;
}
function polylineArea(g: BlockGeom): number {
  if (g.type !== "polyline") return 0;
  const vs = g.vertices;
  let a = 0;
  for (let i = 0; i < vs.length; i++) {
    const j = (i + 1) % vs.length;
    a += vs[i].x * vs[j].y - vs[j].x * vs[i].y;
  }
  return Math.abs(a) / 2;
}

function splinePathPdf(pts: Pt[], T: Xform, padL: number): string {
  if (pts.length < 2) return "";
  const px = (p: Pt) => SX(T, p.x, padL);
  const py = (p: Pt) => SY(T, p.y);
  if (pts.length === 2) return `M ${px(pts[0])} ${py(pts[0])} L ${px(pts[1])} ${py(pts[1])}`;
  let d = `M ${px(pts[0])} ${py(pts[0])}`;
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = pts[Math.max(k - 1, 0)];
    const p1 = pts[k];
    const p2 = pts[k + 1];
    const p3 = pts[Math.min(k + 2, pts.length - 1)];
    const c1x = px(p1) + (px(p2) - px(p0)) / 6;
    const c1y = py(p1) + (py(p2) - py(p0)) / 6;
    const c2x = px(p2) - (px(p3) - px(p1)) / 6;
    const c2y = py(p2) - (py(p3) - py(p1)) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${px(p2)} ${py(p2)}`;
  }
  return d;
}

function renderGeomPdf(
  g: BlockGeom, T: Xform, padL: number,
  stroke: string, strokeWidth: number, key: string, fill = "none",
): React.ReactNode {
  if (g.type === "polyline") {
    const pts = g.vertices.map((v) => `${SX(T, v.x, padL)},${SY(T, v.y)}`).join(" ");
    return g.closed
      ? <Polygon key={key} points={pts} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
      : <Polyline key={key} points={pts} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />;
  }
  if (g.type === "spline") {
    return <Path key={key} d={splinePathPdf(g.points, T, padL)} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />;
  }
  if (g.type === "circle") {
    return <Circle key={key} cx={SX(T, g.cx, padL)} cy={SY(T, g.cy)} r={g.r * T.scale} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />;
  }
  return null;
}

function renderFurnitureBlockPdf(entity: BlockEntity, delta: number, T: Xform, key: string): React.ReactNode {
  // Block geom is in world coords without delta; shift padL by delta to apply moveX.
  const padL = entity.moveX ? PAD_L + delta * T.scale : PAD_L;
  let potBodyGi = -1, potBodyArea = -1;
  entity.geom.forEach((g, gi) => {
    if (g.layer === PLANT_POT_LAYER && g.type === "polyline" && g.closed) {
      const a = polylineArea(g);
      if (a > potBodyArea) { potBodyArea = a; potBodyGi = gi; }
    }
  });
  const styleFor = (g: BlockGeom, gi: number): GeomStyle =>
    g.layer === PLANT_POT_LAYER ? (gi === potBodyGi ? POT_BODY_STYLE : POT_LINE_STYLE) : geomStyle(g.layer);
  const parts = entity.geom
    .map((g, gi) => ({ g, gi, style: styleFor(g, gi) }))
    .sort((a, b) => a.style.z - b.style.z);
  const maskParts = parts.filter(
    ({ g, style }) => style === DEFAULT_GEOM_STYLE && g.type === "polyline" && g.closed && g.vertices.length >= 3,
  );
  return (
    <G key={key}>
      {maskParts.map(({ g, gi }) => renderGeomPdf(g, T, padL, "none", 0, `${key}-bg-${gi}`, "white"))}
      {parts.map(({ g, gi, style }) => renderGeomPdf(g, T, padL, style.stroke, style.strokeWidth, `${key}-${gi}`, style.fill))}
    </G>
  );
}

function renderFurniturePolylinePdf(entity: PolylineEntity, delta: number, T: Xform, wp: WindowPositions, key: string): React.ReactNode {
  const world = applyDelta(entity.vertices, delta, wp);
  const pts = world.map((v) => `${SX(T, v.x)},${SY(T, v.y)}`).join(" ");
  return entity.closed
    ? <Polygon key={key} points={pts} fill="white" stroke={C.green900} strokeWidth={0.4} />
    : <Polyline key={key} points={pts} fill="none" stroke={C.green900} strokeWidth={0.4} />;
}

function renderWindowPdf(entity: PolylineEntity, widx: number, T: Xform, wp: WindowPositions, key: string): React.ReactNode {
  const world = wp.get(widx) ?? entity.vertices.map((v) => ({ x: v.x, y: v.y }));
  const pts = world.map((v) => `${SX(T, v.x)},${SY(T, v.y)}`).join(" ");
  const bb = bboxOf(world);
  const isHoriz = bb.w >= bb.h;
  const off = 20 * T.scale; // ±20mm from centre in the short axis
  let l1: [number, number, number, number];
  let l2: [number, number, number, number];
  if (isHoriz) {
    const cy = SY(T, (bb.minY + bb.maxY) / 2);
    const x1 = SX(T, bb.minX), x2 = SX(T, bb.maxX);
    l1 = [x1, cy - off, x2, cy - off];
    l2 = [x1, cy + off, x2, cy + off];
  } else {
    const cx = SX(T, (bb.minX + bb.maxX) / 2);
    const y1 = SY(T, bb.maxY), y2 = SY(T, bb.minY);
    l1 = [cx - off, y1, cx - off, y2];
    l2 = [cx + off, y1, cx + off, y2];
  }
  return (
    <G key={key}>
      <Polygon points={pts} fill="white" stroke={C.green900} strokeWidth={0.6} />
      <Line x1={l1[0]} y1={l1[1]} x2={l1[2]} y2={l1[3]} stroke={C.green900} strokeWidth={0.5} />
      <Line x1={l2[0]} y1={l2[1]} x2={l2[2]} y2={l2[3]} stroke={C.green900} strokeWidth={0.5} />
    </G>
  );
}

function detectDoorWallEdge(world: Pt[], bb: ReturnType<typeof bboxOf>): "top" | "bottom" | "left" | "right" | null {
  if (world.length < 2) return null;
  const v0 = world[0];
  const vN = world[world.length - 1];
  const tol = 5; // mm
  if (Math.abs(v0.y - bb.maxY) < tol && Math.abs(vN.y - bb.maxY) < tol) return "top";
  if (Math.abs(v0.y - bb.minY) < tol && Math.abs(vN.y - bb.minY) < tol) return "bottom";
  if (Math.abs(v0.x - bb.minX) < tol && Math.abs(vN.x - bb.minX) < tol) return "left";
  if (Math.abs(v0.x - bb.maxX) < tol && Math.abs(vN.x - bb.maxX) < tol) return "right";
  return null;
}

function renderDoorPdf(
  entity: PolylineEntity, delta: number, T: Xform, wp: WindowPositions,
  planW: number, planD: number, key: string,
): React.ReactNode {
  const world = applyDelta(entity.vertices, delta, wp);
  const pts = world.map((v) => `${SX(T, v.x)},${SY(T, v.y)}`).join(" ");
  const bb = bboxOf(world);
  const W = WALL_THICKNESS;
  let side = detectDoorWallEdge(world, bb);
  if (!side) {
    const cx = (bb.minX + bb.maxX) / 2;
    const cy = (bb.minY + bb.maxY) / 2;
    const dTop = planD - cy, dBottom = cy, dLeft = cx, dRight = planW - cx;
    const minD = Math.min(dTop, dBottom, dLeft, dRight);
    side = minD === dTop ? "top" : minD === dBottom ? "bottom" : minD === dLeft ? "left" : "right";
  }
  let rx = 0, ry = 0, rw = 0, rh = 0;
  if (side === "top") {
    rx = SX(T, bb.minX); ry = SY(T, bb.maxY + W / 2); rw = bb.w * T.scale; rh = W * T.scale;
  } else if (side === "bottom") {
    rx = SX(T, bb.minX); ry = SY(T, bb.minY + W / 2); rw = bb.w * T.scale; rh = W * T.scale;
  } else if (side === "left") {
    rx = SX(T, bb.minX - W / 2); ry = SY(T, bb.maxY); rw = W * T.scale; rh = bb.h * T.scale;
  } else {
    rx = SX(T, bb.maxX - W / 2); ry = SY(T, bb.maxY); rw = W * T.scale; rh = bb.h * T.scale;
  }
  return (
    <G key={key}>
      <Rect x={rx} y={ry} width={rw} height={rh} fill="white" stroke="none" />
      {entity.closed
        ? <Polygon points={pts} fill="none" stroke={C.green900} strokeWidth={0.6} />
        : <Polyline points={pts} fill="none" stroke={C.green900} strokeWidth={0.6} />}
    </G>
  );
}

// ── Dimension lines ─────────────────────────────────────────────────────────
function HorizDim({ x1, x2, y, label, tickLen = 3 }: { x1: number; x2: number; y: number; label: string; tickLen?: number }) {
  const mx = (x1 + x2) / 2;
  return (
    <G>
      <Line x1={x1} y1={y} x2={x2} y2={y} stroke={C.muted} strokeWidth={0.4} />
      <Line x1={x1} y1={y - tickLen} x2={x1} y2={y + tickLen} stroke={C.muted} strokeWidth={0.4} />
      <Line x1={x2} y1={y - tickLen} x2={x2} y2={y + tickLen} stroke={C.muted} strokeWidth={0.4} />
      {label ? (
        <Text x={mx} y={y - 2} fill={C.muted} stroke="none" textAnchor="middle" style={{ fontSize: DIM_FONT, fontFamily: FONT }}>
          {label}
        </Text>
      ) : null}
    </G>
  );
}

function VertDim({ x, y1, y2, label, tickLen = 3, side = "left" }: { x: number; y1: number; y2: number; label: string; tickLen?: number; side?: "left" | "right" }) {
  const my = (y1 + y2) / 2;
  const tx = side === "left" ? x - 3 : x + 3;
  return (
    <G>
      <Line x1={x} y1={y1} x2={x} y2={y2} stroke={C.muted} strokeWidth={0.4} />
      <Line x1={x - tickLen} y1={y1} x2={x + tickLen} y2={y1} stroke={C.muted} strokeWidth={0.4} />
      <Line x1={x - tickLen} y1={y2} x2={x + tickLen} y2={y2} stroke={C.muted} strokeWidth={0.4} />
      {label ? (
        <Text
          x={tx}
          y={my}
          fill={C.muted}
          stroke="none"
          textAnchor="middle"
          // react-pdf doesn't parse an SVG transform *string* (pickStyleProps
          // hoists it to style.transform unparsed), so pass the already-parsed
          // operation array directly: rotate -90° about the label anchor.
          transform={[{ operation: "rotate", value: [-90, tx, my] }] as unknown as string}
          style={{ fontSize: DIM_FONT, fontFamily: FONT }}
        >
          {label}
        </Text>
      ) : null}
    </G>
  );
}

function windowsOnWall(
  plan: FloorplanJSON, delta: number,
  wall: "top" | "bottom" | "left" | "right", wp: WindowPositions,
): Array<{ min: number; max: number }> {
  const windowLayer = plan.layers.find((l) => l.name === "Windows");
  if (!windowLayer) return [];
  const threshold = 200; // mm
  const intervals: Array<{ min: number; max: number }> = [];
  let widx = 0;
  for (const entity of windowLayer.entities) {
    if (entity.type !== "polyline") continue;
    const world = wp.get(widx++) ?? entity.vertices.map((v) => ({ x: v.x, y: v.y }));
    const bb = bboxOf(world);
    const cx = (bb.minX + bb.maxX) / 2;
    const cy = (bb.minY + bb.maxY) / 2;
    const depth = plan.baseDepth;
    const width = plan.baseWidth + delta;
    if (wall === "top" && cy > depth - threshold) intervals.push({ min: bb.minX, max: bb.maxX });
    if (wall === "bottom" && cy < threshold) intervals.push({ min: bb.minX, max: bb.maxX });
    if (wall === "left" && cx < threshold) intervals.push({ min: bb.minY, max: bb.maxY });
    if (wall === "right" && cx > width - threshold) intervals.push({ min: bb.minY, max: bb.maxY });
  }
  return intervals.sort((a, b) => a.min - b.min);
}

function buildChain(wallStart: number, wallEnd: number, intervals: Array<{ min: number; max: number }>) {
  const segs: Array<{ from: number; to: number }> = [];
  let cur = wallStart;
  for (const iv of intervals) {
    if (iv.min > cur) segs.push({ from: cur, to: iv.min });
    segs.push({ from: iv.min, to: iv.max });
    cur = iv.max;
  }
  if (cur < wallEnd) segs.push({ from: cur, to: wallEnd });
  return segs;
}

// Metres, 2 dp — matches the page subtitle's "all dimensions in metres".
// Sub-segments shorter than 300 mm get a tick but no label (avoids clutter).
const segLabel = (mm: number) => (mm >= 300 ? (mm / 1000).toFixed(2) : "");

function DimensionLines({ plan, delta, T, wp }: { plan: FloorplanJSON; delta: number; T: Xform; wp: WindowPositions }) {
  const bLeft = PAD_L;
  const bRight = PAD_L + (plan.baseWidth + delta) * T.scale;
  const bTop = PAD_T;
  const bBottom = PAD_T + plan.baseDepth * T.scale;

  const totalW = Math.round(plan.baseWidth + delta);
  const totalD = Math.round(plan.baseDepth);

  const out: React.ReactNode[] = [];

  // Level 1 — overall (top + left).
  out.push(<HorizDim key="dim-w" x1={bLeft} x2={bRight} y={bTop - DIM_OUTER} label={(totalW / 1000).toFixed(2)} />);
  out.push(<VertDim key="dim-d" x={bLeft - DIM_OUTER} y1={bTop} y2={bBottom} label={(totalD / 1000).toFixed(2)} />);

  // Level 2 — window chains on all four sides. A chain with a single
  // segment means that wall has no windows, so it just restates the overall
  // dimension — skip it to avoid printing the same number twice.
  const topChain = buildChain(0, plan.baseWidth + delta, windowsOnWall(plan, delta, "top", wp));
  if (topChain.length > 1) topChain.forEach((seg, i) => {
    const len = Math.round(seg.to - seg.from);
    if (len < 50) return;
    out.push(<HorizDim key={`top-${i}`} x1={SX(T, seg.from)} x2={SX(T, seg.to)} y={bTop - DIM_INNER} label={segLabel(len)} />);
  });
  const botChain = buildChain(0, plan.baseWidth + delta, windowsOnWall(plan, delta, "bottom", wp));
  if (botChain.length > 1) botChain.forEach((seg, i) => {
    const len = Math.round(seg.to - seg.from);
    if (len < 50) return;
    out.push(<HorizDim key={`bot-${i}`} x1={SX(T, seg.from)} x2={SX(T, seg.to)} y={bBottom + DIM_INNER} label={segLabel(len)} />);
  });
  const leftChain = buildChain(0, plan.baseDepth, windowsOnWall(plan, delta, "left", wp));
  if (leftChain.length > 1) leftChain.forEach((seg, i) => {
    const len = Math.round(seg.to - seg.from);
    if (len < 50) return;
    out.push(<VertDim key={`left-${i}`} x={bLeft - DIM_INNER} y1={SY(T, seg.to)} y2={SY(T, seg.from)} label={segLabel(len)} />);
  });
  const rightChain = buildChain(0, plan.baseDepth, windowsOnWall(plan, delta, "right", wp));
  if (rightChain.length > 1) rightChain.forEach((seg, i) => {
    const len = Math.round(seg.to - seg.from);
    if (len < 50) return;
    out.push(<VertDim key={`right-${i}`} x={bRight + DIM_INNER} y1={SY(T, seg.to)} y2={SY(T, seg.from)} label={segLabel(len)} side="right" />);
  });

  return <>{out}</>;
}

function PlanSvg({ plan, delta, maxW = 480, maxH = 300 }: { plan: FloorplanJSON; delta: number; maxW?: number; maxH?: number }) {
  const worldW = plan.baseWidth + delta;
  const worldH = plan.baseDepth;
  const scale = Math.min((maxW - PAD_L - PAD_R) / worldW, (maxH - PAD_T - PAD_B) / worldH);
  const drawW = worldW * scale;
  const drawH = worldH * scale;
  const svgW = PAD_L + drawW + PAD_R;
  const svgH = PAD_T + drawH + PAD_B;
  const T: Xform = { scale, drawH };
  const wp = buildWindowPositions(plan, delta);

  const rooms: React.ReactNode[] = [];
  const walls: React.ReactNode[] = [];
  const windows: React.ReactNode[] = [];
  const doors: React.ReactNode[] = [];
  const furniture: React.ReactNode[] = [];

  for (const layer of plan.layers) {
    if (layer.name.startsWith("Rooms")) {
      // Mezzanine is an upper-floor overlay; skip on the print plan.
      if (layer.name.includes("Mezzanine")) continue;
      const fill = layer.name.includes("Bath")
        ? C.bath
        : layer.name.includes("Terrace")
        ? C.terrace
        : C.living;
      for (let i = 0; i < layer.entities.length; i++) {
        const e = layer.entities[i];
        if (e.type !== "polyline" || !e.closed) continue;
        const pts = applyDelta(e.vertices, delta, wp).map((v) => `${SX(T, v.x)},${SY(T, v.y)}`).join(" ");
        rooms.push(<Polygon key={`room-${layer.name}-${i}`} points={pts} fill={fill} stroke={C.stroke} strokeWidth={0.4} />);
      }
    } else if (layer.name === "Walls") {
      for (let i = 0; i < layer.entities.length; i++) {
        const e = layer.entities[i];
        if (e.type !== "polyline") continue;
        const pts = applyDelta(e.vertices, delta, wp).map((v) => `${SX(T, v.x)},${SY(T, v.y)}`).join(" ");
        walls.push(
          e.closed
            ? <Polygon key={`wall-${i}`} points={pts} fill={C.green900} stroke={C.green900} strokeWidth={0.6} />
            : <Polyline key={`wall-${i}`} points={pts} fill="none" stroke={C.green900} strokeWidth={0.8} />,
        );
      }
    } else if (layer.name === "Windows") {
      let widx = 0;
      for (let i = 0; i < layer.entities.length; i++) {
        const e = layer.entities[i];
        if (e.type !== "polyline") continue;
        windows.push(renderWindowPdf(e, widx, T, wp, `win-${widx}`));
        widx++;
      }
    } else if (layer.name === "Doors") {
      for (let i = 0; i < layer.entities.length; i++) {
        const e = layer.entities[i];
        if (e.type !== "polyline") continue;
        doors.push(renderDoorPdf(e, delta, T, wp, worldW, worldH, `door-${i}`));
      }
    } else if (layer.name === "Furniture" || layer.name === "Furniture Stretch") {
      // "Furniture Stretch" only appears once the plan is widened past min.
      if (layer.name === "Furniture Stretch" && delta <= plan.minDelta) continue;
      for (let i = 0; i < layer.entities.length; i++) {
        const e = layer.entities[i];
        const key = `furn-${layer.name}-${i}`;
        if (e.type === "block") furniture.push(renderFurnitureBlockPdf(e, delta, T, key));
        else if (e.type === "polyline") furniture.push(renderFurniturePolylinePdf(e, delta, T, wp, key));
      }
    }
  }

  return (
    <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
      {rooms}
      {walls}
      {windows}
      {doors}
      {furniture}
      <DimensionLines plan={plan} delta={delta} T={T} wp={wp} />
    </Svg>
  );
}

function bedroomDescriptor(bedrooms: number): string {
  if (bedrooms === 0) return "Studio";
  if (bedrooms === 1) return "1-bedroom";
  return `${bedrooms}-bedroom`;
}

function CoverPage(d: DesignPdfData) {
  return (
    <Page size="A4" style={{ ...styles.page, paddingBottom: FOOTER_HEIGHT }} wrap={false}>
      <View style={{ backgroundColor: C.green900, paddingVertical: 24, paddingHorizontal: 36, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Image src={logoWhite} style={{ height: 18, objectFit: "contain" }} />
        <Text style={{ fontSize: 8, letterSpacing: 1.4, color: C.green200, fontWeight: 600 }}>
          DESIGN BRIEF · {new Date().getFullYear()}
        </Text>
      </View>

      {/* Single full-bleed exterior shot of the configured typology — no
          interior/furniture cell. */}
      <View style={{ flexGrow: 1, position: "relative" }}>
        <Image
          src={randomTypologyPhotoFile(d.typology, d.reference)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <View style={{ position: "absolute", left: 14, bottom: 12 }}>
          <Text style={{ fontSize: 8, letterSpacing: 1.2, color: "#fff", fontWeight: 600 }}>
            {TYPOLOGIES[d.typology].label.toUpperCase()} · EASY HOUSING PROJECT
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: "#fff", paddingHorizontal: 36, paddingTop: 30, paddingBottom: 22 }} wrap={false}>
        <Text style={{ fontSize: 9, letterSpacing: 1.4, color: C.green700, fontWeight: 600 }}>
          CONFIGURATOR OUTPUT
        </Text>
        <Text style={{ ...styles.h1, marginTop: 6 }}>{d.label}</Text>
        <Text style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
          {bedroomDescriptor(d.bedrooms)} · Footprint {d.dimensions.footprintM2.toFixed(2)} m² · Indicative budget {fmtMoney(d.indicativeBudgetUgx, d.country)}
        </Text>
        {d.country.code !== BASE_COUNTRY.code && (
          // UGX equivalent in small print — architects price in UGX, the
          // client saw the local figure on screen. Both belong on the
          // build file.
          <Text style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>
            ≈ {fmtMoney(d.indicativeBudgetUgx, BASE_COUNTRY)} at 1 {d.country.currency.code} ≈ {d.country.ugxPerUnit} UGX
          </Text>
        )}

        <View style={{ height: 1, backgroundColor: C.stroke, marginVertical: 18 }} />

        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1 }} wrap={false}>
            <Text style={styles.eyebrow}>PREPARED FOR</Text>
            <Text style={{ fontSize: 13, fontWeight: 600, marginTop: 4, fontFamily: FONT_BOLD }}>{d.client.name}</Text>
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{d.client.email}</Text>
          </View>
          <View style={{ flex: 1 }} wrap={false}>
            <Text style={styles.eyebrow}>REFERENCE</Text>
            <Text style={{ fontSize: 13, fontWeight: 600, marginTop: 4, fontFamily: FONT_BOLD }}>{d.reference}</Text>
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Generated {d.generatedDate}</Text>
          </View>
        </View>
      </View>

      <PageFooter left="A home for everyone, Easy Housing" right="1 / 3" />
    </Page>
  );
}

function PlanPage(d: DesignPdfData) {
  return (
    <Page size="A4" style={{ ...styles.page, paddingTop: 28, paddingHorizontal: 36, paddingBottom: FOOTER_HEIGHT }} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} wrap={false}>
        <Image src={logoColor} style={{ height: 16, objectFit: "contain" }} />
        <Text style={styles.eyebrow}>FLOOR PLAN</Text>
      </View>

      <View style={{ marginTop: 16 }} wrap={false}>
        <Text style={styles.h2}>Plan view.</Text>
        <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
          {d.dimensions.widthM.toFixed(2)} m × {d.dimensions.lengthM.toFixed(2)} m · all dimensions in metres
        </Text>
      </View>

      <View style={{ flexGrow: 1, backgroundColor: C.bgAlt, borderWidth: 1, borderColor: C.stroke, borderRadius: 14, padding: 18, marginTop: 16, justifyContent: "center", alignItems: "center" }}>
        <PlanSvg plan={d.plan} delta={d.delta} maxW={480} maxH={420} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 16 }}>
        {d.rooms.map((r, i) => (
          <View key={i} wrap={false} style={{ width: "25%", flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: ROOM_COLORS[r.colorKey], borderWidth: 1, borderColor: C.stroke, marginRight: 8 }} />
            <View>
              <Text style={{ fontSize: 9, color: C.muted }}>{r.name}</Text>
              <Text style={{ fontSize: 11, fontWeight: 600, fontFamily: FONT_BOLD }}>{r.areaM2.toFixed(2)} m²</Text>
            </View>
          </View>
        ))}
      </View>

      <PageFooter left={`${d.reference} · ${d.label}`} right="2 / 3" />
    </Page>
  );
}

function SpecPage(d: DesignPdfData) {
  // Flat per-home Net Carbon Removal Benefit — see the constant up top
  // for the source. Coarser than a per-m² rate, but it matches how the
  // CSC methodology actually certifies the benefit (per home, not per
  // unit area) and how the brand has historically led with the number.
  const co2Tonnes = CO2_REMOVAL_PER_HOME_TONNES;
  // Equivalent km of plane travel — same rule of thumb the brand has used
  // since the 2022 guidelines (~5 t CO₂ / 25,000 km long-haul).
  const flightKm = co2Tonnes * 5000;
  // Three distinct interior/furniture shots, seeded by the reference so the
  // ribbon varies across designs but is stable on regeneration.
  const ribbon = randomFurniturePhotoFiles(3, d.reference);
  return (
    <Page size="A4" style={{ ...styles.page, paddingTop: 28, paddingHorizontal: 36, paddingBottom: FOOTER_HEIGHT }} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} wrap={false}>
        <Image src={logoColor} style={{ height: 16, objectFit: "contain" }} />
        <Text style={styles.eyebrow}>SPEC & BUDGET</Text>
      </View>

      <View style={{ marginTop: 16 }} wrap={false}>
        <Text style={styles.h2}>Spec sheet.</Text>
      </View>

      {/* Headline indicative-budget figure — same number as the cover. No
          line-item table: the per-category cost breakdown the configurator
          used to expose was illustrative and contradicted the cover's
          total; a single figure is the brief. */}
      <View
        wrap={false}
        style={{
          marginTop: 18,
          padding: "14px 18px",
          backgroundColor: C.bgAlt,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: C.stroke,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={styles.eyebrow}>INDICATIVE BUDGET</Text>
        <Text style={{ fontSize: 22, fontWeight: 600, color: C.green900, fontFamily: FONT_BOLD }}>
          {fmtMoney(d.indicativeBudgetUgx, d.country)}
        </Text>
      </View>

      {/* Furniture ribbon — three thumbs of how the home wears in. Sits
          between the budget figure and the climate band so the eye lifts
          off the price before the CO₂ message. */}
      <View style={{ flexDirection: "row", marginTop: 18, gap: 8 }} wrap={false}>
        {ribbon.map((src, i) => (
          <View
            key={i}
            wrap={false}
            style={{ flex: 1, height: 150, borderRadius: 12, overflow: "hidden" }}
          >
            <Image
              src={src}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </View>
        ))}
      </View>

      <View
        wrap={false}
        style={{
          backgroundColor: C.green900,
          borderRadius: 12,
          padding: "14px 18px",
          marginTop: 18,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 8, letterSpacing: 1.4, color: C.green200, fontWeight: 600 }}>
            CLIMATE IMPACT
          </Text>
          <Text style={{ fontSize: 11, color: "#fff", marginTop: 4, fontWeight: 300 }}>
            Stores around <Text style={{ fontWeight: 600 }}>{co2Tonnes} tonnes of CO₂</Text> — biobased timber, certified net carbon removal.<Text style={{ color: C.green200 }}>¹</Text>
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: C.green,
              fontFamily: FONT_BOLD,
              letterSpacing: -0.5,
            }}
          >
            −{co2Tonnes}
          </Text>
          <Text style={{ fontSize: 9, color: C.green200, marginTop: -3 }}>t CO₂</Text>
        </View>
      </View>
      <Text style={{ fontSize: 8, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
        ¹ Net Carbon Removal Benefits per average Easy Home (~10 t CO₂), certified
        under the ONCRA CSC methodology. Source: Easy Housing — Carbon Removal
        Context Document 2024 (v1.2).
      </Text>

      <PageFooter
        left={`A home for everyone, Easy Housing · ${d.reference}`}
        right="3 / 3"
      />
    </Page>
  );
}

function DesignDocument(d: DesignPdfData) {
  return (
    <Document title={`Easy Housing — ${d.label}`} author="Easy Housing">
      {CoverPage(d)}
      {PlanPage(d)}
      {SpecPage(d)}
    </Document>
  );
}

export async function renderDesignPdf(data: DesignPdfData): Promise<Buffer> {
  return renderToBuffer(DesignDocument(data));
}
