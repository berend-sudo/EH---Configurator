import type { FloorPlanModel } from "@/types/floorPlan";

/**
 * Studio Mono Pitch — rebuilt from mono_pitch_studio_parametric.json
 * (ArchiCAD 29 extraction via Tapir MCP, April 2026).
 *
 * Coordinate origin: outer bottom-left (front-face × left-face intersection).
 * X = right (width), Y = back (into building, away from street).
 * Front of building (street/veranda side) is at SVG y = 0 (top).
 *
 * Layout: square 4884 × 4884 mm outer envelope.
 * Veranda at front-right corner (x 3077.5–4884, y 0–1199).
 * Bathroom at back-left corner.
 * Single open-plan studio fills the remaining L-shaped interior.
 *
 * Parametric steps unknown pending calculation template — plan is
 * currently fixed at its single ArchiCAD-extracted size. Update
 * minLengthMm / maxLengthMm and zone capacities once step data is known.
 */

// ─── Envelope ────────────────────────────────────────────────────────────────
const OUTER_W = 4884;
const OUTER_D = 4884;
const WALL_THK = 83; // all outer facade walls (ArchiCAD measured)

const IX0 = 83;    // left inner face
const IY0 = 83;    // front inner face
const IX1 = 4801;  // right inner face
const IY1 = 4801;  // back inner face

// ─── Veranda (front-right corner) ────────────────────────────────────────────
// SW-005a/b: veranda left wall — outer x=3077.5, inner x=3160.5
const VER_L_OUT = 3077.5;
const VER_L_IN  = 3160.5;
const VER_L_CX  = (VER_L_OUT + VER_L_IN) / 2; // 3119 — wall centre-line

// SW-005c: veranda back wall — outer y=1199, inner y=1282
const VER_B_OUT = 1199;
const VER_B_IN  = 1282;
const VER_B_CY  = (VER_B_OUT + VER_B_IN) / 2; // 1240.5 — wall centre-line

// SW-005a ends at y=1199; SW-005b continues to y=1886 (lower height, same x)
const VER_L_EXT_Y = 1886; // SW-005b south end

// ─── Bathroom partitions ──────────────────────────────────────────────────────
// SW-006h: bottom partition — thickness 96 mm, studio face y=3251.1, bath face y=3347.1
const BATH_SOUTH_IN  = 3251.1; // studio face (visible boundary)
const BATH_SOUTH_CY  = 3299.1; // centre-line
const BATH_SOUTH_END = 2442;   // east end of partition (ref x from ArchiCAD)

// SW-006v: right partition — thickness 46 mm (rendered at 60 for legibility)
// studio face x=2396.1, bath face x=2442
const BATH_EAST_IN   = 2396.1; // studio face (visible boundary)
const BATH_EAST_CX   = 2419.05; // centre-line
const BATH_PART_THK  = 60;

// Bathroom interior wet-cell wall (W01-a): y=3346.1, x=83–1544.5
const WET_WALL_Y  = 3346.1;
const WET_WALL_X1 = 1544.5;

// ─── Doors ───────────────────────────────────────────────────────────────────
// Dh1 — studio entry, veranda back wall, hinge at x=3171.5, swings into veranda
const ENTRY_HX = 3171.5;
const ENTRY_W  = 950;

// Dh2 — bathroom door, bottom partition, hinge at x=1544.5, swings into bathroom
const BATH_HX  = 1544.5;
const BATH_DW  = 800;

export const MONO_PITCH_STUDIO_FLOOR_PLAN: FloorPlanModel = {
  id: "mono-pitch-studio-standard",
  name: "Studio Mono Pitch",
  typology: "mono-pitch-4884",
  bedrooms: 0,
  bathrooms: 1,
  depthMm: OUTER_D,
  baseLengthMm: OUTER_W,
  // The floor-plan page adds WALL_THK_BOTH (176 mm) to convert structural→outer.
  // Studio has 83 mm walls so the structural equivalent is OUTER_W - 176 = 4708.
  // Both bounds equal 4708 so zoneCapacity (4884) dominates and the slider
  // renders as a single fixed point. Update when parametric steps are known.
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
    // ── Room fills (painted first; walls / furniture stack on top) ────────────

    // Studio interior — irregular polygon: full-width front band (y 83→3251)
    // plus right strip beside bathroom (y 3251→4801), minus veranda notch top-right.
    //
    //  (IX0, IY0) ──────────── (VER_L_IN, IY0)
    //      │                        │
    //      │   studio front band    │  ← veranda left wall inner face
    //      │                        │
    //  (IX0, BATH_SOUTH_IN) ── (BATH_EAST_IN, BATH_SOUTH_IN)
    //                               │
    //    bathroom                   │  studio strip B
    //                               │
    //                          (BATH_EAST_IN, IY1)
    //
    // Full clockwise polygon:
    {
      id: "fill-studio",
      type: "room-fill",
      fill: "#efe2c6",
      points: [
        [IX0,           IY0],
        [VER_L_IN,      IY0],           // stop at veranda left wall (inner face)
        [VER_L_IN,      VER_B_IN],      // down veranda left wall to veranda back wall (inner)
        [IX1,           VER_B_IN],      // across veranda back wall to right inner face
        [IX1,           IY1],           // down right wall
        [BATH_EAST_IN,  IY1],           // across back wall to bathroom right partition
        [BATH_EAST_IN,  BATH_SOUTH_IN], // up bathroom right partition to bottom partition
        [IX0,           BATH_SOUTH_IN], // across bathroom bottom partition to left wall
      ],
    },

    // Bathroom — back-left corner
    {
      id: "fill-bathroom",
      type: "room-fill",
      fill: "#f0efec",
      points: [
        [IX0,          BATH_SOUTH_IN],
        [BATH_EAST_IN, BATH_SOUTH_IN],
        [BATH_EAST_IN, IY1],
        [IX0,          IY1],
      ],
    },

    // Veranda — front-right corner, open at front (y=0)
    {
      id: "fill-veranda",
      type: "room-fill",
      fill: "#d8d6d2",
      points: [
        [VER_L_OUT, 0],
        [OUTER_W,   0],
        [OUTER_W,   VER_B_OUT],
        [VER_L_OUT, VER_B_OUT],
      ],
    },

    // ── External walls ────────────────────────────────────────────────────────
    // All drawn as centre-lines with strokeWidth = WALL_THK.

    // Front facade (SW-002): y=0 outer, left of veranda opening only
    {
      id: "wall-front",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [[0, WALL_THK / 2], [VER_L_OUT, WALL_THK / 2]],
    },

    // Left facade (SW-003): full depth
    {
      id: "wall-left",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [[WALL_THK / 2, 0], [WALL_THK / 2, OUTER_D]],
    },

    // Back facade (SW-004): full width
    {
      id: "wall-back",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [[0, OUTER_D - WALL_THK / 2], [OUTER_W, OUTER_D - WALL_THK / 2]],
    },

    // Right facade — studio section (SW-005d): from back wall to veranda back wall
    {
      id: "wall-right",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [[OUTER_W - WALL_THK / 2, OUTER_D], [OUTER_W - WALL_THK / 2, VER_B_OUT]],
    },

    // Veranda left wall (SW-005a + SW-005b): front to y=1886 (merged)
    {
      id: "wall-veranda-left",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [[VER_L_CX, 0], [VER_L_CX, VER_L_EXT_Y]],
    },

    // Veranda back wall (SW-005c): separates veranda from studio
    {
      id: "wall-veranda-back",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [[VER_L_OUT, VER_B_CY], [OUTER_W, VER_B_CY]],
    },

    // ── Internal partitions ───────────────────────────────────────────────────

    // Bathroom bottom partition (SW-006h): runs from left inner face to partition east end
    {
      id: "partition-bath-bottom",
      type: "partition",
      thicknessMm: 96,
      points: [[IX0, BATH_SOUTH_CY], [BATH_SOUTH_END, BATH_SOUTH_CY]],
    },

    // Bathroom right partition (SW-006v): from bottom partition to back wall inner face
    {
      id: "partition-bath-right",
      type: "partition",
      thicknessMm: BATH_PART_THK,
      points: [[BATH_EAST_CX, BATH_SOUTH_CY], [BATH_EAST_CX, IY1]],
    },

    // Bathroom interior wet-cell wall (W01-a): separates shower zone from dry zone
    {
      id: "partition-bath-wet-cell",
      type: "partition",
      thicknessMm: 60,
      points: [[IX0, WET_WALL_Y], [WET_WALL_X1, WET_WALL_Y]],
    },

    // ── Doors ─────────────────────────────────────────────────────────────────

    // Dh1 — entry door: hinge at veranda left (x=3171.5), leaf goes right (+x),
    // arc sweeps into veranda (y decreasing = SVG upward) → swing NE
    {
      id: "door-entry",
      type: "door",
      hingeXMm: ENTRY_HX,
      hingeYMm: VER_B_CY,
      widthMm: ENTRY_W,
      swing: "NE",
      wallAxis: "horizontal",
    },

    // Dh2 — bathroom door: hinge at x=1544.5 (left end of opening), leaf goes right,
    // arc sweeps into bathroom (y increasing = SVG downward) → swing SE
    {
      id: "door-bathroom",
      type: "door",
      hingeXMm: BATH_HX,
      hingeYMm: BATH_SOUTH_CY,
      widthMm: BATH_DW,
      swing: "SE",
      wallAxis: "horizontal",
    },

    // ── Windows ───────────────────────────────────────────────────────────────
    // Points placed on the outer face of each wall.

    // Ws2 — front facade window (x=667.9–1773.9)
    {
      id: "window-front",
      type: "window",
      points: [[667.9, 0], [1773.9, 0]],
    },

    // Wt1 — back facade window left (x=1101.6–1682.6), studio zone
    {
      id: "window-back-left",
      type: "window",
      points: [[1101.6, OUTER_D], [1682.6, OUTER_D]],
    },

    // W1 — back facade window in bathroom (x=1567–2067)
    {
      id: "window-bathroom-back",
      type: "window",
      points: [[1567, OUTER_D], [2067, OUTER_D]],
    },

    // Ws2 — back facade window right (x=3085.4–4191.4), studio zone
    {
      id: "window-back-right",
      type: "window",
      points: [[3085.4, OUTER_D], [4191.4, OUTER_D]],
    },

    // Ws3 — right facade window (y=1390–2296), studio zone
    {
      id: "window-right",
      type: "window",
      points: [[OUTER_W, 1390], [OUTER_W, 2296]],
    },

    // ── Furniture — bathroom ──────────────────────────────────────────────────
    // Wet zone (x=83–1544.5, y=3346–4801): shower + toilet
    {
      id: "f-shower",
      type: "furniture",
      subtype: "shower",
      xMm: 120,
      yMm: 3390,
      widthMm: 900,
      heightMm: 900,
    },
    {
      id: "f-toilet",
      type: "furniture",
      subtype: "toilet",
      xMm: 120,
      yMm: 4150,
      widthMm: 450,
      heightMm: 650,
    },
    // Dry zone (x=1544.5–2396, y=3251–3346): basin near door
    {
      id: "f-basin",
      type: "furniture",
      subtype: "sink-bathroom",
      xMm: 1700,
      yMm: 3290,
      widthMm: 550,
      heightMm: 420,
    },

    // ── Furniture — studio ────────────────────────────────────────────────────
    // Bed against left wall, front section (clear of front window at x=667–1773)
    {
      id: "f-bed",
      type: "furniture",
      subtype: "bed-double",
      xMm: 120,
      yMm: 300,
      widthMm: 1400,
      heightMm: 2000,
    },
    // Kitchen along front wall, east of bathroom / west of veranda divide
    {
      id: "f-kitchen-counter",
      type: "furniture",
      subtype: "kitchen-counter",
      xMm: 1900,
      yMm: 110,
      widthMm: 1000,
      heightMm: 600,
    },
    {
      id: "f-stove",
      type: "furniture",
      subtype: "stove",
      xMm: 2920,
      yMm: 110,
      widthMm: 600,
      heightMm: 580,
    },
    {
      id: "f-fridge",
      type: "furniture",
      subtype: "fridge",
      xMm: 1310,
      yMm: 110,
      widthMm: 580,
      heightMm: 600,
    },
    // Sofa in main living/sleeping zone
    {
      id: "f-sofa",
      type: "furniture",
      subtype: "sofa",
      xMm: 700,
      yMm: 2500,
      widthMm: 1700,
      heightMm: 800,
    },

    // ── Room labels ───────────────────────────────────────────────────────────
    {
      id: "label-studio",
      type: "room-label",
      xMm: (IX0 + VER_L_IN) / 2 + 300,
      yMm: 1700,
      label: "Studio",
      areaM2: 18.7,
    },
    {
      id: "label-bathroom",
      type: "room-label",
      xMm: (IX0 + BATH_EAST_IN) / 2,
      yMm: (BATH_SOUTH_IN + IY1) / 2,
      label: "Bathroom",
      areaM2: 3.6,
    },
    {
      id: "label-veranda",
      type: "room-label",
      xMm: (VER_L_OUT + OUTER_W) / 2,
      yMm: VER_B_OUT / 2,
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
