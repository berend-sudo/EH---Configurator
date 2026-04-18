import type {
  FloorPlanElement,
  FloorPlanModel,
  FurnitureSubtype,
  WallElement,
} from "@/types/floorPlan";
import { emptyModel } from "./editorState";
import { FURNITURE_LIBRARY } from "./furnitureLibrary";

/**
 * Pick the library template that best matches the AI-detected type and
 * approximate dimensions. Used to replace noisy AI dimensions with
 * canonical ones. For custom/unknown types we keep the AI dimensions
 * and mark `isCustom` so the user can edit in the properties panel.
 */
function pickTemplate(
  subtype: FurnitureSubtype,
  approxW: number,
  approxH: number,
): { widthMm: number; heightMm: number; isCustom: boolean } {
  const candidates = FURNITURE_LIBRARY.filter((t) => t.subtype === subtype);
  if (candidates.length === 0) return { widthMm: approxW, heightMm: approxH, isCustom: true };
  // Pick the template whose AABB area is closest to AI's estimate.
  const target = approxW * approxH;
  const best = candidates.reduce((prev, t) => {
    const diff = Math.abs(t.widthMm * t.heightMm - target);
    const prevDiff = Math.abs(prev.widthMm * prev.heightMm - target);
    return diff < prevDiff ? t : prev;
  });
  return { widthMm: best.widthMm, heightMm: best.heightMm, isCustom: false };
}

/**
 * Raw shape returned by the Claude vision endpoint. Percentages are
 * 0–100 of the image's building footprint. The API route validates
 * and the admin UI converts these to mm via the calibration scale.
 */
export interface AIDetectedPlan {
  overallWidthMm: number;
  overallDepthMm: number;
  walls: ReadonlyArray<{
    x1Pct: number;
    y1Pct: number;
    x2Pct: number;
    y2Pct: number;
    thickness: "exterior" | "partition";
  }>;
  rooms: ReadonlyArray<{
    xPct: number;
    yPct: number;
    widthPct: number;
    heightPct: number;
    label: string;
    areaSqm?: number;
  }>;
  furniture: ReadonlyArray<{
    type: string;
    xPct: number;
    yPct: number;
    widthMm: number;
    heightMm: number;
    rotationDeg?: number;
  }>;
  doors: ReadonlyArray<{
    xPct: number;
    yPct: number;
    widthMm: number;
    swing: "NE" | "NW" | "SE" | "SW";
  }>;
  windows: ReadonlyArray<{
    x1Pct: number;
    y1Pct: number;
    x2Pct: number;
    y2Pct: number;
    widthMm?: number;
  }>;
}

const FURNITURE_MAP: Record<string, FurnitureSubtype> = {
  bed: "bed-double",
  "bed-single": "bed-single",
  "single-bed": "bed-single",
  "bed-double": "bed-double",
  "double-bed": "bed-double",
  sofa: "sofa",
  couch: "sofa",
  armchair: "armchair",
  chair: "dining-chair",
  "dining-chair": "dining-chair",
  "dining-table": "dining-table",
  table: "dining-table",
  wardrobe: "wardrobe",
  closet: "wardrobe",
  toilet: "toilet",
  sink: "sink-bathroom",
  "sink-bathroom": "sink-bathroom",
  "sink-kitchen": "sink-kitchen",
  "kitchen-sink": "sink-kitchen",
  bathtub: "bathtub",
  bath: "bathtub",
  shower: "shower",
  fridge: "fridge",
  refrigerator: "fridge",
  stove: "stove",
  oven: "stove",
  "kitchen-counter": "kitchen-counter",
  counter: "kitchen-counter",
};

function mapFurnitureType(raw: string): FurnitureSubtype {
  const key = raw.toLowerCase().trim();
  return FURNITURE_MAP[key] ?? "generic";
}

/**
 * Convert AI-detected plan to a FloorPlanModel. Percentages map to
 * millimetres using `overallWidthMm`/`overallDepthMm`. If those come
 * back as zeros (no dimension annotations) we fall back to 8000×5000
 * and the user corrects during calibration.
 */
export function aiPlanToModel(detected: AIDetectedPlan): FloorPlanModel {
  const base = emptyModel();
  const widthMm = detected.overallWidthMm > 0 ? detected.overallWidthMm : 8000;
  const depthMm = detected.overallDepthMm > 0 ? detected.overallDepthMm : 5000;
  const px = (pctX: number) => (pctX / 100) * widthMm;
  const py = (pctY: number) => (pctY / 100) * depthMm;

  const elements: FloorPlanElement[] = [];
  let idCounter = 1;
  const uid = (prefix: string) => `${prefix}-${idCounter++}`;

  // External envelope wall — always one rectangle.
  const envelope: WallElement = {
    id: "wall-external",
    type: "wall",
    thicknessMm: 88,
    points: [
      [0, 0],
      [widthMm, 0],
      [widthMm, depthMm],
      [0, depthMm],
      [0, 0],
    ],
  };
  elements.push(envelope);

  for (const w of detected.walls) {
    const thicknessMm = w.thickness === "exterior" ? 88 : 60;
    // Skip walls that match the external envelope (AI often duplicates them).
    const x1 = px(w.x1Pct);
    const y1 = py(w.y1Pct);
    const x2 = px(w.x2Pct);
    const y2 = py(w.y2Pct);
    const isEnvelope =
      (Math.abs(x1 - x2) < 100 && (x1 < 200 || x1 > widthMm - 200)) ||
      (Math.abs(y1 - y2) < 100 && (y1 < 200 || y1 > depthMm - 200));
    if (isEnvelope && w.thickness === "exterior") continue;
    elements.push({
      id: uid(w.thickness === "exterior" ? "wall" : "partition"),
      type: w.thickness === "exterior" ? "wall" : "partition",
      thicknessMm,
      points: [
        [x1, y1],
        [x2, y2],
      ],
    });
  }

  for (const r of detected.rooms) {
    const cx = px(r.xPct + r.widthPct / 2);
    const cy = py(r.yPct + r.heightPct / 2);
    elements.push({
      id: uid("label"),
      type: "room-label",
      xMm: cx,
      yMm: cy,
      label: r.label,
      areaM2: r.areaSqm,
    });
  }

  for (const f of detected.furniture) {
    const subtype = mapFurnitureType(f.type);
    const tmpl = pickTemplate(subtype, f.widthMm, f.heightMm);
    elements.push({
      id: uid("f"),
      type: "furniture",
      subtype,
      xMm: px(f.xPct) - tmpl.widthMm / 2,
      yMm: py(f.yPct) - tmpl.heightMm / 2,
      widthMm: tmpl.widthMm,
      heightMm: tmpl.heightMm,
      rotationDeg: f.rotationDeg ?? 0,
      stretchBehavior: "wall-anchored",
      isCustom: tmpl.isCustom,
    });
  }

  for (const d of detected.doors) {
    elements.push({
      id: uid("door"),
      type: "door",
      hingeXMm: px(d.xPct),
      hingeYMm: py(d.yPct),
      widthMm: d.widthMm,
      swing: d.swing,
      wallAxis: "horizontal",
    });
  }

  for (const win of detected.windows) {
    elements.push({
      id: uid("window"),
      type: "window",
      points: [
        [px(win.x1Pct), py(win.y1Pct)],
        [px(win.x2Pct), py(win.y2Pct)],
      ],
    });
  }

  return {
    ...base,
    elements,
    viewBox: { width: widthMm, height: depthMm },
    baseLengthMm: widthMm,
    depthMm,
  };
}
