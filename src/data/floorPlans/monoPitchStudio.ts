import type { FloorPlanModel } from "@/types/floorPlan";

/**
 * Studio Mono Pitch — rebuilt from mono_pitch_studio_parametric.json
 * (ArchiCAD 29 extraction via Tapir MCP, April 2026).
 *
 * Coordinate mapping
 * ──────────────────
 * ArchiCAD JSON: origin = outer bottom-left (front-face × left-face).
 *   x = right, y = back (y=0 at street/front, y=4884 at back wall).
 *
 * SVG convention used by every other plan in this codebase:
 *   y=0 at TOP of SVG = back of building (north/inland side)
 *   y=OUTER_D at BOTTOM = front of building (street/south side)
 *
 * Transform: SVG_y = OUTER_D − AC_y
 *
 * Result:
 *   – Veranda appears at BOTTOM-RIGHT (front-right, street side) ✓
 *   – Bathroom appears at TOP-LEFT (back-left) ✓
 *   – Front facade is the bottom edge of the SVG ✓
 */

const OUTER_W = 4884; // outer width  (AC x-axis)
const OUTER_D = 4884; // outer depth  (AC y-axis → SVG height)
const WALL = 83;      // outer wall thickness (all facades)

// ─── Inner faces (SVG coords) ────────────────────────────────────────────────
const IX0 = WALL;            // inner left x   = 83
const IX1 = OUTER_W - WALL;  // inner right x  = 4801
const IY0 = WALL;            // inner TOP y    = 83  (back/north inner face)
const IY1 = OUTER_D - WALL;  // inner BOTTOM y = 4801 (front/south inner face)

// ─── Veranda (front-right; AC x=3077.5–4884, AC y=0–1199) ───────────────────
// After flip: SVG x=3077.5–4884, SVG y=3685–4884 → bottom-right corner
const VL_OUT = 3077.5;                        // veranda left wall outer x
const VL_IN  = 3160.5;                        // veranda left wall inner x
const VL_CX  = (VL_OUT + VL_IN) / 2;         // 3119 – wall centre-line x
const VL_EXT = OUTER_D - 1886;               // 2998 – SVG y where SW-005b ends

const VB_SVG_OUT = OUTER_D - 1199;           // 3685 – veranda back wall outer face (SVG y)
const VB_SVG_IN  = OUTER_D - 1282;           // 3602 – veranda back wall inner face (SVG y)
const VB_SVG_CY  = OUTER_D - 1240.5;        // 3643.5 – veranda back wall centre-line (SVG y)

// ─── Bathroom (back-left; AC x=83–2442, AC y=3251–4801) ─────────────────────
// After flip: SVG x=83–2396, SVG y=83–1633 → top-left corner
const BH_SVG_STUDIO = OUTER_D - 3251.1;      // 1632.9 – studio face of bottom partition
const BH_SVG_CY     = OUTER_D - 3299.1;      // 1584.9 – bottom partition centre-line
const BH_END_X      = 2442;                    // east end of bottom partition x
const BV_STUDIO_X   = 2396.1;                // studio face of right partition x
const BV_CX         = 2419.05;               // right partition centre-line x

// Wet-cell wall (W01-a): AC y=3346.1 → SVG y=1537.9; x=83–1544.5
const WW_SVG_Y = OUTER_D - 3346.1;           // 1537.9
const WW_X1    = 1544.5;                      // east end of wet-cell wall

// ─── Doors ───────────────────────────────────────────────────────────────────
// Dh1: entry, in veranda back wall; hinge at x=3171.5 (left end of opening)
const ENTRY_HX = 3171.5;
const ENTRY_W  = 950;

// Dh2: bathroom, in bottom partition; hinge at x=1544.5 (left end of opening)
const BATH_HX = 1544.5;
const BATH_DW = 800;

export const MONO_PITCH_STUDIO_FLOOR_PLAN: FloorPlanModel = {
  id: "mono-pitch-studio-standard",
  name: "Studio Mono Pitch",
  typology: "mono-pitch-4884",
  bedrooms: 0,
  bathrooms: 1,
  depthMm: OUTER_D,
  baseLengthMm: OUTER_W,
  // The floor-plan page adds 176 mm (2×88) to convert structural→outer.
  // Studio has 83 mm walls; set both bounds to OUTER_W−176 so zoneCapacity
  // (4884) dominates and the slider renders as a single fixed point.
  // Update when parametric step data is available.
  minLengthMm: OUTER_W - 176,
  maxLengthMm: OUTER_W - 176,
  jumpSizeMm: 610,
  viewBox: { width: OUTER_W, height: OUTER_D + 400 },
  costDefaults: {
    partitionsM: 3.5,
    interiorDoors: 1,
    aluminiumSqm: 6.0,
  },

  zones: [
    {
      id: "zone-studio",
      order: 1,
      xStartMm: 0,
      xEndMm: OUTER_W,
      minWidthMm: OUTER_W,
      maxWidthMm: OUTER_W,
      movingElementIds: [],
      stretchingElementIds: [],
    },
  ],

  elements: [
    // ── Room fills (painted first; walls / furniture on top) ──────────────────

    // Studio interior — 8-point polygon tracing the L-shape.
    // Starts at front-left (SVG bottom-left), goes clockwise.
    // Excludes bathroom (top-left cutout) and veranda (bottom-right notch).
    {
      id: "fill-studio",
      type: "room-fill",
      fill: "#efe2c6",
      points: [
        [IX0,          IY1],             // front-left inner  (SVG bottom-left)
        [VL_IN,        IY1],             // front, right to veranda left wall inner face
        [VL_IN,        VB_SVG_IN],       // up veranda left wall to veranda back wall inner
        [IX1,          VB_SVG_IN],       // right along veranda back wall to right inner face
        [IX1,          IY0],             // up to back-right inner corner (SVG top-right)
        [BV_STUDIO_X,  IY0],             // left along back wall to bathroom right partition
        [BV_STUDIO_X,  BH_SVG_STUDIO],  // down to bathroom bottom partition level
        [IX0,          BH_SVG_STUDIO],  // left to left inner face
      ],
    },

    // Bathroom — top-left corner (back-left of building)
    {
      id: "fill-bathroom",
      type: "room-fill",
      fill: "#f0efec",
      points: [
        [IX0,         IY0],
        [BV_STUDIO_X, IY0],
        [BV_STUDIO_X, BH_SVG_STUDIO],
        [IX0,         BH_SVG_STUDIO],
      ],
    },

    // Veranda — bottom-right corner (front-right of building, open at street)
    {
      id: "fill-veranda",
      type: "room-fill",
      fill: "#d8d6d2",
      points: [
        [VL_OUT,  VB_SVG_OUT],
        [OUTER_W, VB_SVG_OUT],
        [OUTER_W, OUTER_D],
        [VL_OUT,  OUTER_D],
      ],
    },

    // ── External walls (centre-lines, strokeWidth = WALL) ─────────────────────

    // Front facade (SW-002): AC y=0 → SVG y=4842.5; x=0–3077.5 (left of veranda)
    {
      id: "wall-front",
      type: "wall",
      thicknessMm: WALL,
      points: [[0, OUTER_D - WALL / 2], [VL_OUT, OUTER_D - WALL / 2]],
    },

    // Left facade (SW-003): full height, centre x=41.5
    {
      id: "wall-left",
      type: "wall",
      thicknessMm: WALL,
      points: [[WALL / 2, 0], [WALL / 2, OUTER_D]],
    },

    // Back facade (SW-004): AC y=4884 → SVG y=41.5; full width
    {
      id: "wall-back",
      type: "wall",
      thicknessMm: WALL,
      points: [[0, WALL / 2], [OUTER_W, WALL / 2]],
    },

    // Right facade — studio section (SW-005d): from back (SVG y=0) down to veranda back wall
    {
      id: "wall-right",
      type: "wall",
      thicknessMm: WALL,
      points: [[OUTER_W - WALL / 2, 0], [OUTER_W - WALL / 2, VB_SVG_OUT]],
    },

    // Veranda left wall (SW-005a + SW-005b merged):
    // from front (SVG y=4884) up to SW-005b end (SVG y=2998)
    {
      id: "wall-veranda-left",
      type: "wall",
      thicknessMm: WALL,
      points: [[VL_CX, OUTER_D], [VL_CX, VL_EXT]],
    },

    // Veranda back wall (SW-005c): horizontal at SVG y=3643.5
    {
      id: "wall-veranda-back",
      type: "wall",
      thicknessMm: WALL,
      points: [[VL_OUT, VB_SVG_CY], [OUTER_W, VB_SVG_CY]],
    },

    // ── Internal partitions ───────────────────────────────────────────────────

    // Bathroom bottom partition (SW-006h): horizontal at SVG y=1584.9; x=83–2442
    {
      id: "partition-bath-bottom",
      type: "partition",
      thicknessMm: 96,
      points: [[IX0, BH_SVG_CY], [BH_END_X, BH_SVG_CY]],
    },

    // Bathroom right partition (SW-006v): vertical at x=2419.05; from bottom partition up to back wall
    {
      id: "partition-bath-right",
      type: "partition",
      thicknessMm: 60,
      points: [[BV_CX, BH_SVG_CY], [BV_CX, IY0]],
    },

    // Wet-cell partition (W01-a): horizontal at SVG y=1537.9; x=83–1544.5
    {
      id: "partition-wet-cell",
      type: "partition",
      thicknessMm: 60,
      points: [[IX0, WW_SVG_Y], [WW_X1, WW_SVG_Y]],
    },

    // ── Doors ─────────────────────────────────────────────────────────────────

    // Dh1 — entry door: hinge at x=3171.5 (left end), leaf goes right (+x),
    // arc sweeps into veranda = toward front = SVG y increasing → swing SE
    {
      id: "door-entry",
      type: "door",
      hingeXMm: ENTRY_HX,
      hingeYMm: VB_SVG_CY,
      widthMm: ENTRY_W,
      swing: "SE",
      wallAxis: "horizontal",
    },

    // Dh2 — bathroom door: hinge at x=1544.5 (left end), leaf goes right (+x),
    // arc sweeps into bathroom = toward back = SVG y decreasing → swing NE
    {
      id: "door-bathroom",
      type: "door",
      hingeXMm: BATH_HX,
      hingeYMm: BH_SVG_CY,
      widthMm: BATH_DW,
      swing: "NE",
      wallAxis: "horizontal",
    },

    // ── Windows ───────────────────────────────────────────────────────────────
    // Points on the outer wall face.

    // Ws2 — front facade (AC y=0 → SVG y=4884): x=667.9–1773.9
    {
      id: "window-front",
      type: "window",
      points: [[667.9, OUTER_D], [1773.9, OUTER_D]],
    },

    // Wt1 — back facade left (AC y=4884 → SVG y=0): x=1101.6–1682.6
    {
      id: "window-back-left",
      type: "window",
      points: [[1101.6, 0], [1682.6, 0]],
    },

    // W1 — back facade, bathroom (SVG y=0): x=1567–2067
    {
      id: "window-bathroom-back",
      type: "window",
      points: [[1567, 0], [2067, 0]],
    },

    // Ws2 — back facade right (SVG y=0): x=3085.4–4191.4
    {
      id: "window-back-right",
      type: "window",
      points: [[3085.4, 0], [4191.4, 0]],
    },

    // Ws3 — right facade (AC x=4884, AC y=1390–2296 → SVG y=2588–3494)
    {
      id: "window-right",
      type: "window",
      points: [[OUTER_W, OUTER_D - 2296], [OUTER_W, OUTER_D - 1390]],
    },

    // ── Furniture — bathroom ──────────────────────────────────────────────────
    // Bathroom SVG region: x=83–2396, y=83–1633
    // Wet zone (y=83–1538, x=83–1544): shower + toilet
    // Right zone (y=83–1633, x=1544–2396): basin near door

    {
      id: "f-shower",
      type: "furniture",
      subtype: "shower",
      xMm: 110,
      yMm: 100,
      widthMm: 900,
      heightMm: 900,
    },
    {
      id: "f-toilet",
      type: "furniture",
      subtype: "toilet",
      xMm: 1100,
      yMm: 110,
      widthMm: 450,
      heightMm: 650,
    },
    {
      id: "f-basin",
      type: "furniture",
      subtype: "sink-bathroom",
      xMm: 1750,
      yMm: 350,
      widthMm: 500,
      heightMm: 420,
    },

    // ── Furniture — studio ────────────────────────────────────────────────────
    // Bed in front-left section; spans both main band and front strip (left of veranda).
    // At SVG y=2700–4700: x=120–1520 is left of veranda left wall (x=3161) in both bands.
    {
      id: "f-bed",
      type: "furniture",
      subtype: "bed-double",
      xMm: 120,
      yMm: 2700,
      widthMm: 1400,
      heightMm: 2000,
    },

    // Sofa in main living band (SVG y≈1900–2700, centre of studio)
    {
      id: "f-sofa",
      type: "furniture",
      subtype: "sofa",
      xMm: 650,
      yMm: 1900,
      widthMm: 1600,
      heightMm: 800,
    },

    // Kitchen along front wall (SVG y≈4050–4700), right of bed
    {
      id: "f-fridge",
      type: "furniture",
      subtype: "fridge",
      xMm: 1600,
      yMm: 4100,
      widthMm: 580,
      heightMm: 600,
    },
    {
      id: "f-kitchen-counter",
      type: "furniture",
      subtype: "kitchen-counter",
      xMm: 2200,
      yMm: 4100,
      widthMm: 1100,
      heightMm: 600,
    },
    {
      id: "f-stove",
      type: "furniture",
      subtype: "stove",
      xMm: 2200,
      yMm: 4100,
      widthMm: 600,
      heightMm: 600,
    },

    // ── Room labels ───────────────────────────────────────────────────────────
    {
      id: "label-studio",
      type: "room-label",
      xMm: 2200,
      yMm: 3000,
      label: "Studio",
      areaM2: 18.7,
    },
    {
      id: "label-bathroom",
      type: "room-label",
      xMm: (IX0 + BV_STUDIO_X) / 2,
      yMm: (IY0 + BH_SVG_STUDIO) / 2,
      label: "Bathroom",
      areaM2: 3.6,
    },
    {
      id: "label-veranda",
      type: "room-label",
      xMm: (VL_OUT + OUTER_W) / 2,
      yMm: (VB_SVG_OUT + OUTER_D) / 2,
      label: "Veranda",
      areaM2: 2.1,
    },

    // ── Dimension lines ───────────────────────────────────────────────────────
    {
      id: "dim-width",
      type: "dimension",
      from: [0, 0],
      to: [OUTER_W, 0],
      label: `${OUTER_W}`,
      offsetMm: -450,
    },
    {
      id: "dim-depth",
      type: "dimension",
      from: [0, 0],
      to: [0, OUTER_D],
      label: `${OUTER_D}`,
      offsetMm: 450,
    },
  ],
};
