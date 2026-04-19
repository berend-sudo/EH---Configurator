import type { FloorPlanModel } from "@/types/floorPlan";

/**
 * Studio Mono Pitch — open-plan single room with bathroom and veranda.
 *
 * Structural envelope 4,880 × 4,884 mm (8 × C-frame minimum depth).
 * Outer envelope 5,056 × 4,972 mm (double-wall = 88 mm each side).
 * Layout: wet-core zone (bathroom) fixed on the west side; living zone
 * (compact kitchen strip + sleeping/living + veranda) stretches east.
 *
 * The south wall runs from x=0 to x=P_VERANDA_WEST only. East of
 * P_VERANDA_WEST is the open veranda — no south wall segment is drawn there.
 * The south-wall endpoint at P_VERANDA_WEST falls inside zone-living and is
 * remapped by stretchExternalWall so the veranda opening stays a fixed
 * absolute width at all plan lengths.
 *
 * Kitchen furniture is placed at the left edge of zone-living and uses
 * fallback "shift" mode (zone-living.xShiftMm = 0 while only the living zone
 * stretches), so it stays compact and does not grow with the plan.
 */

const OUTER_WIDTH = 5056; // 8×610 structural + 2×88 walls
const OUTER_DEPTH = 4972; // 4884 structural + 88 wall each side
const WALL_THK = 88;
const PARTITION_THK = 60;

const INNER_X0 = WALL_THK; // 88
const INNER_Y0 = WALL_THK; // 88
const INNER_X1 = OUTER_WIDTH - WALL_THK; // 4968
const INNER_Y1 = OUTER_DEPTH - WALL_THK; // 4884

const P_BATHROOM_EAST = 1700; // east wall of bathroom
const P_BATHROOM_SOUTH = 1900; // south wall of bathroom

const P_VERANDA_NORTH = 3200; // y-coord: north wall of veranda
const P_VERANDA_WEST = 3400; // x-coord: south wall ends here; veranda opens east

// Entrance door sits in the veranda-north partition, hinge on the east side
const ENTRANCE_X = 3600;
const ENTRANCE_W = 900;

export const MONO_PITCH_STUDIO_FLOOR_PLAN: FloorPlanModel = {
  id: "mono-pitch-studio-standard",
  name: "Studio Mono Pitch (standard)",
  typology: "mono-pitch-4884",
  bedrooms: 0,
  bathrooms: 1,
  depthMm: 4884,
  baseLengthMm: 4880, // 8×610
  minLengthMm: 8 * 610, // 4880 mm — typology min
  maxLengthMm: 20 * 610, // 12200 mm — typology max
  jumpSizeMm: 610,
  viewBox: { width: OUTER_WIDTH, height: OUTER_DEPTH + 400 },
  costDefaults: {
    partitionsM: 3.5,
    interiorDoors: 1,
    aluminiumSqm: 6.0,
  },

  zones: [
    {
      id: "zone-wet-core",
      order: 2, // stretches last — bathroom stays fixed
      xStartMm: 0,
      xEndMm: P_BATHROOM_EAST + PARTITION_THK / 2, // 1730
      minWidthMm: 1200,
      maxWidthMm: 2400,
      movingElementIds: ["partition-bathroom-east", "door-bathroom"],
      stretchingElementIds: [
        "fill-bathroom",
        "fill-studio-west",
        "partition-bathroom-south",
        "window-bathroom-north",
        "window-studio-south",
      ],
    },
    {
      id: "zone-living",
      order: 1, // fills first — studio space absorbs most of the delta
      xStartMm: P_BATHROOM_EAST + PARTITION_THK / 2, // 1730
      xEndMm: OUTER_WIDTH, // 5056
      minWidthMm: 2400,
      maxWidthMm: 10000,
      movingElementIds: [
        "label-veranda-entrance-arrow",
      ],
      stretchingElementIds: [
        "fill-studio-north",
        "fill-corridor-south",
        "fill-veranda",
        "partition-veranda-north",
        "partition-veranda-north-east",
        "partition-veranda-west",
        "window-studio-north",
        "window-studio-east",
        "f-veranda-chair-1",
        "f-veranda-chair-2",
        "f-tv",
      ],
    },
  ],

  elements: [
    // === Room fills (painted first so walls/furniture draw on top) ===
    {
      id: "fill-bathroom",
      type: "room-fill",
      zoneId: "zone-wet-core",
      fill: "#f0efec",
      points: [
        [INNER_X0, INNER_Y0],
        [P_BATHROOM_EAST, INNER_Y0],
        [P_BATHROOM_EAST, P_BATHROOM_SOUTH],
        [INNER_X0, P_BATHROOM_SOUTH],
      ],
    },
    {
      // Studio floor west of bathroom partition (sleeping area)
      id: "fill-studio-west",
      type: "room-fill",
      zoneId: "zone-wet-core",
      fill: "#efe2c6",
      points: [
        [INNER_X0, INNER_Y0],
        [P_BATHROOM_EAST, INNER_Y0],
        [P_BATHROOM_EAST, INNER_Y1],
        [INNER_X0, INNER_Y1],
      ],
    },
    {
      // Kitchen strip + main living/sleeping area east of bathroom, north of veranda
      id: "fill-studio-north",
      type: "room-fill",
      zoneId: "zone-living",
      fill: "#efe2c6",
      points: [
        [P_BATHROOM_EAST, INNER_Y0],
        [INNER_X1, INNER_Y0],
        [INNER_X1, P_VERANDA_NORTH],
        [P_BATHROOM_EAST, P_VERANDA_NORTH],
      ],
    },
    {
      // Studio floor south of kitchen, west of veranda
      id: "fill-corridor-south",
      type: "room-fill",
      zoneId: "zone-living",
      fill: "#efe2c6",
      points: [
        [P_BATHROOM_EAST, P_VERANDA_NORTH],
        [P_VERANDA_WEST, P_VERANDA_NORTH],
        [P_VERANDA_WEST, INNER_Y1],
        [P_BATHROOM_EAST, INNER_Y1],
      ],
    },
    {
      id: "fill-veranda",
      type: "room-fill",
      zoneId: "zone-living",
      fill: "#d8d6d2",
      points: [
        [P_VERANDA_WEST, P_VERANDA_NORTH],
        [INNER_X1, P_VERANDA_NORTH],
        [INNER_X1, INNER_Y1],
        [P_VERANDA_WEST, INNER_Y1],
      ],
    },

    // === External walls — four separate segments so the veranda south side is open ===
    {
      id: "wall-north",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [
        [0, 0],
        [OUTER_WIDTH, 0],
      ],
    },
    {
      id: "wall-east-north",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [
        [OUTER_WIDTH, 0],
        [OUTER_WIDTH, P_VERANDA_NORTH],
      ],
    },
    {
      id: "wall-west",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [
        [0, 0],
        [0, OUTER_DEPTH],
      ],
    },
    {
      // South wall covers bedroom/living side only.
      // East of P_VERANDA_WEST is the open veranda — no segment drawn there.
      id: "wall-south",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [
        [0, OUTER_DEPTH],
        [P_VERANDA_WEST, OUTER_DEPTH],
      ],
    },

    // === Internal partitions ===
    {
      id: "partition-bathroom-south",
      type: "partition",
      zoneId: "zone-wet-core",
      thicknessMm: PARTITION_THK,
      points: [
        [INNER_X0, P_BATHROOM_SOUTH],
        [P_BATHROOM_EAST, P_BATHROOM_SOUTH],
      ],
    },
    {
      id: "partition-bathroom-east",
      type: "partition",
      zoneId: "zone-wet-core",
      thicknessMm: PARTITION_THK,
      points: [
        [P_BATHROOM_EAST, INNER_Y0],
        [P_BATHROOM_EAST, P_BATHROOM_SOUTH],
      ],
    },
    {
      id: "partition-veranda-north",
      type: "partition",
      zoneId: "zone-living",
      thicknessMm: PARTITION_THK,
      points: [
        [P_VERANDA_WEST, P_VERANDA_NORTH],
        [ENTRANCE_X, P_VERANDA_NORTH],
      ],
    },
    {
      id: "partition-veranda-north-east",
      type: "partition",
      zoneId: "zone-living",
      thicknessMm: PARTITION_THK,
      points: [
        [ENTRANCE_X + ENTRANCE_W, P_VERANDA_NORTH],
        [INNER_X1, P_VERANDA_NORTH],
      ],
    },
    {
      id: "partition-veranda-west",
      type: "partition",
      zoneId: "zone-living",
      thicknessMm: PARTITION_THK,
      points: [
        [P_VERANDA_WEST, P_VERANDA_NORTH],
        [P_VERANDA_WEST, INNER_Y1],
      ],
    },

    // === Doors ===
    {
      id: "door-bathroom",
      type: "door",
      zoneId: "zone-wet-core",
      hingeXMm: P_BATHROOM_EAST - 100,
      hingeYMm: P_BATHROOM_SOUTH,
      widthMm: 800,
      swing: "SW",
      wallAxis: "horizontal",
    },
    {
      id: "door-entrance",
      type: "door",
      zoneId: "zone-living",
      hingeXMm: ENTRANCE_X + ENTRANCE_W,
      hingeYMm: P_VERANDA_NORTH,
      widthMm: ENTRANCE_W,
      swing: "NW",
      wallAxis: "horizontal",
    },

    // === Windows ===
    {
      id: "window-bathroom-north",
      type: "window",
      zoneId: "zone-wet-core",
      points: [
        [500, 0],
        [1100, 0],
      ],
    },
    {
      id: "window-studio-north",
      type: "window",
      zoneId: "zone-living",
      points: [
        [P_BATHROOM_EAST + 600, 0],
        [P_BATHROOM_EAST + 1900, 0],
      ],
    },
    {
      id: "window-studio-east",
      type: "window",
      zoneId: "zone-living",
      points: [
        [OUTER_WIDTH, 1100],
        [OUTER_WIDTH, 2500],
      ],
    },
    {
      id: "window-studio-south",
      type: "window",
      zoneId: "zone-wet-core",
      points: [
        [600, OUTER_DEPTH],
        [1300, OUTER_DEPTH],
      ],
    },

    // === Furniture — bathroom ===
    {
      id: "f-toilet",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "toilet",
      xMm: 220,
      yMm: 200,
      widthMm: 450,
      heightMm: 600,
    },
    {
      id: "f-bath-sink",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "sink-bathroom",
      xMm: 800,
      yMm: 200,
      widthMm: 500,
      heightMm: 450,
    },
    {
      id: "f-shower",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "shower",
      xMm: 200,
      yMm: 900,
      widthMm: 900,
      heightMm: 900,
    },

    // === Furniture — sleeping area (west of bathroom partition) ===
    {
      id: "f-bed",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "bed-double",
      xMm: 150,
      yMm: 2400,
      widthMm: 1400,
      heightMm: 2000,
    },
    {
      id: "f-nightstand-left",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "nightstand",
      xMm: 150,
      yMm: 2400,
      widthMm: 400,
      heightMm: 400,
    },
    {
      id: "f-nightstand-right",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "nightstand",
      xMm: 1150,
      yMm: 2400,
      widthMm: 400,
      heightMm: 400,
    },

    // === Furniture — kitchen (compact, anchored at left edge of zone-living) ===
    {
      id: "f-fridge",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "fridge",
      xMm: P_BATHROOM_EAST + 60,
      yMm: INNER_Y0,
      widthMm: 600,
      heightMm: 600,
    },
    {
      id: "f-stove",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "stove",
      xMm: P_BATHROOM_EAST + 700,
      yMm: INNER_Y0,
      widthMm: 600,
      heightMm: 550,
    },
    {
      id: "f-kitchen-counter",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "kitchen-counter",
      xMm: P_BATHROOM_EAST + 700,
      yMm: INNER_Y0,
      widthMm: 1200,
      heightMm: 600,
    },
    {
      id: "f-kitchen-sink",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "sink-kitchen",
      xMm: P_BATHROOM_EAST + 900,
      yMm: INNER_Y0,
      widthMm: 600,
      heightMm: 450,
    },

    // === Furniture — TV (wall-mounted on studio side of veranda-north partition) ===
    {
      id: "f-tv",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "tv",
      xMm: P_VERANDA_WEST + 300,
      yMm: P_VERANDA_NORTH - 80,
      widthMm: 900,
      heightMm: 80,
    },

    // === Furniture — living/veranda ===
    {
      id: "f-sofa",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "sofa",
      xMm: P_BATHROOM_EAST + 100,
      yMm: 2200,
      widthMm: 1600,
      heightMm: 800,
    },
    {
      id: "f-veranda-chair-1",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "armchair",
      xMm: P_VERANDA_WEST + 200,
      yMm: P_VERANDA_NORTH + 500,
      widthMm: 700,
      heightMm: 700,
    },
    {
      id: "f-veranda-chair-2",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "armchair",
      xMm: P_VERANDA_WEST + 1100,
      yMm: P_VERANDA_NORTH + 500,
      widthMm: 700,
      heightMm: 700,
    },

    // === Room labels ===
    {
      id: "label-bathroom",
      type: "room-label",
      zoneId: "zone-wet-core",
      xMm: (INNER_X0 + P_BATHROOM_EAST) / 2,
      yMm: P_BATHROOM_SOUTH - 350,
      label: "Bathroom",
      areaM2: 4,
    },
    {
      id: "label-studio",
      type: "room-label",
      zoneId: "zone-living",
      xMm: (P_BATHROOM_EAST + INNER_X1) / 2 - 200,
      yMm: 1700,
      label: "Studio",
      areaM2: 18,
    },
    {
      id: "label-veranda",
      type: "room-label",
      zoneId: "zone-living",
      xMm: (P_VERANDA_WEST + INNER_X1) / 2,
      yMm: (P_VERANDA_NORTH + INNER_Y1) / 2,
      label: "Veranda",
      areaM2: 5,
    },
    {
      id: "label-veranda-entrance-arrow",
      type: "room-label",
      zoneId: "zone-living",
      xMm: ENTRANCE_X + ENTRANCE_W / 2,
      yMm: P_VERANDA_NORTH + 350,
      label: "↑ Entrance",
    },

    // === Overall dimensions ===
    {
      id: "dim-overall-width",
      type: "dimension",
      from: [0, 0],
      to: [OUTER_WIDTH, 0],
      label: OUTER_WIDTH.toLocaleString("en-US"),
      offsetMm: -450,
    },
    {
      id: "dim-overall-depth",
      type: "dimension",
      from: [0, 0],
      to: [0, OUTER_DEPTH],
      label: OUTER_DEPTH.toLocaleString("en-US"),
      offsetMm: 450,
    },
  ],
};
