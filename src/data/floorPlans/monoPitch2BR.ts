import type { FloorPlanModel } from "@/types/floorPlan";

/**
 * 2BR Mono Pitch — traced from `mono pitch 2BR.png` (Archicad export).
 *
 * Envelope 8,635 × 4,972 mm (double-walled, structural 8,547 × 4,884).
 * Layout columns (west → east): wet-core (bathroom / bedroom 1),
 * bedrooms (kitchen strip / bedroom 2), living (living room / veranda).
 *
 * Coordinates are in mm, origin at the top-left of the outer envelope.
 * Zones are ordered so the living room stretches first, bedrooms second,
 * wet-core last when the length slider changes.
 */

const OUTER_WIDTH = 8635;
const OUTER_DEPTH = 4972;
const WALL_THK = 88;
const PARTITION_THK = 60;

const INNER_X0 = WALL_THK;
const INNER_Y0 = WALL_THK;
const INNER_X1 = OUTER_WIDTH - WALL_THK; // 8547
const INNER_Y1 = OUTER_DEPTH - WALL_THK; // 4884

// Partition lines (approximate from the PNG)
const P_WETCORE_EAST = 2100; // east wall of bathroom + bedroom 1
const P_BATHROOM_SOUTH = 1688; // south wall of bathroom / north wall of BR1
const P_BEDROOMS_EAST = 4700; // east wall of bedroom 2 (west wall of living)
const P_KITCHEN_SOUTH = 1688; // south wall of kitchen strip (matches bathroom south)

// Veranda — recessed outdoor space under roof overhang, south-east corner
const VERANDA_X0 = 5200;
const VERANDA_X1 = INNER_X1; // aligns to outer east wall
const VERANDA_Y0 = OUTER_DEPTH;
const VERANDA_Y1 = OUTER_DEPTH + 1200;

// Entrance door position on south wall (just west of veranda)
const ENTRANCE_X = 5400;
const ENTRANCE_W = 900;

export const MONO_PITCH_2BR_FLOOR_PLAN: FloorPlanModel = {
  id: "mono-pitch-2br-standard",
  name: "2BR Mono Pitch (standard)",
  typology: "mono-pitch-4884",
  bedrooms: 2,
  bathrooms: 1,
  depthMm: 4884,
  baseLengthMm: 8547,
  minLengthMm: 8 * 610, // 4880 mm — typology min
  maxLengthMm: 20 * 610, // 12200 mm — typology max
  jumpSizeMm: 610,
  viewBox: { width: OUTER_WIDTH, height: VERANDA_Y1 + 400 },

  // Zone limits are sized so Σ(min) ≤ outerWidth(minLength) and
  // Σ(max) ≥ outerWidth(maxLength) — i.e. the plan covers the whole
  // typology range (8–20 jumps of 610 mm).
  zones: [
    {
      id: "zone-wet-core",
      order: 3, // stretches last
      xStartMm: 0,
      xEndMm: P_WETCORE_EAST + PARTITION_THK / 2,
      minWidthMm: 2000,
      maxWidthMm: 2600,
      movingElementIds: [
        "partition-bathroom-east",
        "partition-wetcore-east",
        "door-bedroom1",
      ],
      stretchingElementIds: [
        "fill-bathroom",
        "fill-bedroom1",
        "partition-bathroom-south",
        "window-bathroom",
        "window-bedroom1",
        "f-bed1",
        "f-wardrobe1",
        "f-bathtub",
      ],
    },
    {
      id: "zone-bedrooms",
      order: 2,
      xStartMm: P_WETCORE_EAST + PARTITION_THK / 2,
      xEndMm: P_BEDROOMS_EAST + PARTITION_THK / 2,
      minWidthMm: 2400,
      maxWidthMm: 3000,
      movingElementIds: [
        "partition-bedrooms-east",
        "door-bedroom2",
      ],
      stretchingElementIds: [
        "fill-kitchen",
        "fill-bedroom2",
        "partition-kitchen-south",
        "window-kitchen",
        "window-bedroom2",
        "f-kitchen-counter",
        "f-wardrobe2",
      ],
    },
    {
      id: "zone-living",
      order: 1, // fills first — living room absorbs most of the delta
      xStartMm: P_BEDROOMS_EAST + PARTITION_THK / 2,
      xEndMm: OUTER_WIDTH,
      minWidthMm: 2400,
      maxWidthMm: 5500,
      movingElementIds: [
        "f-dining-table",
        "f-dining-chair-1",
        "f-dining-chair-2",
        "f-dining-chair-3",
        "f-dining-chair-4",
        "f-veranda-chair-1",
        "f-veranda-chair-2",
        "f-veranda-chair-3",
        "label-veranda-entrance-arrow",
      ],
      stretchingElementIds: [
        "fill-living",
        "fill-veranda",
        "window-living-north",
        "f-sofa",
      ],
    },
  ],

  elements: [
    // === Room fills (painted first so walls/furniture draw on top) ===
    {
      id: "fill-bathroom",
      type: "room-fill",
      zoneId: "zone-wet-core",
      fill: "#ffffff",
      points: [
        [INNER_X0, INNER_Y0],
        [P_WETCORE_EAST, INNER_Y0],
        [P_WETCORE_EAST, P_BATHROOM_SOUTH],
        [INNER_X0, P_BATHROOM_SOUTH],
      ],
    },
    {
      id: "fill-bedroom1",
      type: "room-fill",
      zoneId: "zone-wet-core",
      fill: "#efe2c6",
      points: [
        [INNER_X0, P_BATHROOM_SOUTH],
        [P_WETCORE_EAST, P_BATHROOM_SOUTH],
        [P_WETCORE_EAST, INNER_Y1],
        [INNER_X0, INNER_Y1],
      ],
    },
    {
      id: "fill-kitchen",
      type: "room-fill",
      zoneId: "zone-bedrooms",
      fill: "#efe2c6",
      points: [
        [P_WETCORE_EAST, INNER_Y0],
        [P_BEDROOMS_EAST, INNER_Y0],
        [P_BEDROOMS_EAST, P_KITCHEN_SOUTH],
        [P_WETCORE_EAST, P_KITCHEN_SOUTH],
      ],
    },
    {
      id: "fill-bedroom2",
      type: "room-fill",
      zoneId: "zone-bedrooms",
      fill: "#efe2c6",
      points: [
        [P_WETCORE_EAST, P_KITCHEN_SOUTH],
        [P_BEDROOMS_EAST, P_KITCHEN_SOUTH],
        [P_BEDROOMS_EAST, INNER_Y1],
        [P_WETCORE_EAST, INNER_Y1],
      ],
    },
    {
      id: "fill-living",
      type: "room-fill",
      zoneId: "zone-living",
      fill: "#efe2c6",
      points: [
        [P_BEDROOMS_EAST, INNER_Y0],
        [INNER_X1, INNER_Y0],
        [INNER_X1, INNER_Y1],
        [P_BEDROOMS_EAST, INNER_Y1],
      ],
    },
    {
      id: "fill-veranda",
      type: "room-fill",
      zoneId: "zone-living",
      fill: "#b9b0a2",
      points: [
        [VERANDA_X0, VERANDA_Y0],
        [VERANDA_X1, VERANDA_Y0],
        [VERANDA_X1, VERANDA_Y1],
        [VERANDA_X0, VERANDA_Y1],
      ],
    },

    // === External walls (thick single polygon) ===
    {
      id: "wall-external",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [
        [0, 0],
        [OUTER_WIDTH, 0],
        [OUTER_WIDTH, OUTER_DEPTH],
        [ENTRANCE_X + ENTRANCE_W, OUTER_DEPTH],
        // gap for entrance door — south wall continues after the opening
        [ENTRANCE_X, OUTER_DEPTH],
        [0, OUTER_DEPTH],
        [0, 0],
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
        [P_WETCORE_EAST, P_BATHROOM_SOUTH],
      ],
    },
    {
      id: "partition-bathroom-east",
      type: "partition",
      zoneId: "zone-wet-core",
      thicknessMm: PARTITION_THK,
      // bathroom → kitchen east divider (stops at bathroom south)
      points: [
        [P_WETCORE_EAST, INNER_Y0],
        [P_WETCORE_EAST, P_BATHROOM_SOUTH],
      ],
    },
    {
      id: "partition-wetcore-east",
      type: "partition",
      zoneId: "zone-wet-core",
      thicknessMm: PARTITION_THK,
      // bedroom 1 east wall (partition to bedroom 2)
      points: [
        [P_WETCORE_EAST, P_BATHROOM_SOUTH],
        [P_WETCORE_EAST, INNER_Y1],
      ],
    },
    {
      id: "partition-kitchen-south",
      type: "partition",
      zoneId: "zone-bedrooms",
      thicknessMm: PARTITION_THK,
      points: [
        [P_WETCORE_EAST, P_KITCHEN_SOUTH],
        [P_BEDROOMS_EAST, P_KITCHEN_SOUTH],
      ],
    },
    {
      id: "partition-bedrooms-east",
      type: "partition",
      zoneId: "zone-bedrooms",
      thicknessMm: PARTITION_THK,
      // full-height partition between bedroom 2/kitchen and living room
      points: [
        [P_BEDROOMS_EAST, INNER_Y0],
        [P_BEDROOMS_EAST, INNER_Y1],
      ],
    },

    // === Doors (quarter-circle swing arcs) ===
    // Bathroom → bedroom 1 (south wall of bathroom, hinge east, swings SW)
    {
      id: "door-bathroom",
      type: "door",
      zoneId: "zone-wet-core",
      hingeXMm: P_WETCORE_EAST - 150,
      hingeYMm: P_BATHROOM_SOUTH,
      widthMm: 800,
      swing: "SW",
    },
    // Bedroom 1 → bedroom 2 (east partition of BR1, hinge south, swings NE)
    {
      id: "door-bedroom1",
      type: "door",
      zoneId: "zone-wet-core",
      hingeXMm: P_WETCORE_EAST,
      hingeYMm: 3300,
      widthMm: 800,
      swing: "NE",
    },
    // Bedroom 2 → living (east partition of BR2, hinge south, swings NW)
    {
      id: "door-bedroom2",
      type: "door",
      zoneId: "zone-bedrooms",
      hingeXMm: P_BEDROOMS_EAST,
      hingeYMm: 2400,
      widthMm: 800,
      swing: "NW",
    },
    // Entrance door (south wall into living, hinge east, swings NW — into room)
    {
      id: "door-entrance",
      type: "door",
      zoneId: "zone-living",
      hingeXMm: ENTRANCE_X + ENTRANCE_W,
      hingeYMm: INNER_Y1,
      widthMm: ENTRANCE_W,
      swing: "NW",
    },

    // === Windows on external walls ===
    {
      id: "window-bathroom",
      type: "window",
      zoneId: "zone-wet-core",
      points: [
        [500, 0],
        [1100, 0],
      ],
    },
    {
      id: "window-bedroom1",
      type: "window",
      zoneId: "zone-wet-core",
      points: [
        [400, OUTER_DEPTH],
        [1700, OUTER_DEPTH],
      ],
    },
    {
      id: "window-kitchen",
      type: "window",
      zoneId: "zone-bedrooms",
      points: [
        [P_WETCORE_EAST + 600, 0],
        [P_BEDROOMS_EAST - 400, 0],
      ],
    },
    {
      id: "window-bedroom2",
      type: "window",
      zoneId: "zone-bedrooms",
      points: [
        [P_WETCORE_EAST + 400, OUTER_DEPTH],
        [P_BEDROOMS_EAST - 300, OUTER_DEPTH],
      ],
    },
    {
      id: "window-living-north",
      type: "window",
      zoneId: "zone-living",
      points: [
        [P_BEDROOMS_EAST + 700, 0],
        [INNER_X1 - 400, 0],
      ],
    },
    {
      id: "window-living-east",
      type: "window",
      zoneId: "zone-living",
      points: [
        [OUTER_WIDTH, 900],
        [OUTER_WIDTH, 3300],
      ],
    },

    // === Furniture — bathroom ===
    {
      id: "f-bathtub",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "bathtub",
      xMm: 220,
      yMm: 240,
      widthMm: 1600,
      heightMm: 750,
    },
    {
      id: "f-bath-sink",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "sink-bathroom",
      xMm: 220,
      yMm: 1050,
      widthMm: 450,
      heightMm: 400,
    },
    {
      id: "f-toilet",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "toilet",
      xMm: 1350,
      yMm: 1050,
      widthMm: 500,
      heightMm: 550,
    },

    // === Furniture — bedroom 1 ===
    {
      id: "f-bed1",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "bed-double",
      xMm: 260,
      yMm: 2000,
      widthMm: 1400,
      heightMm: 2000,
    },
    {
      id: "f-wardrobe1",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "wardrobe",
      xMm: 260,
      yMm: 4200,
      widthMm: 1700,
      heightMm: 550,
    },

    // === Furniture — kitchen ===
    {
      id: "f-kitchen-counter",
      type: "furniture",
      zoneId: "zone-bedrooms",
      subtype: "kitchen-counter",
      xMm: P_WETCORE_EAST + 120,
      yMm: INNER_Y0 + 100,
      widthMm: P_BEDROOMS_EAST - P_WETCORE_EAST - 240,
      heightMm: 650,
    },
    {
      id: "f-fridge",
      type: "furniture",
      zoneId: "zone-bedrooms",
      subtype: "fridge",
      xMm: P_WETCORE_EAST + 150,
      yMm: INNER_Y0 + 130,
      widthMm: 600,
      heightMm: 600,
    },
    {
      id: "f-kitchen-sink",
      type: "furniture",
      zoneId: "zone-bedrooms",
      subtype: "sink-kitchen",
      xMm: P_WETCORE_EAST + 900,
      yMm: INNER_Y0 + 200,
      widthMm: 700,
      heightMm: 450,
    },
    {
      id: "f-stove",
      type: "furniture",
      zoneId: "zone-bedrooms",
      subtype: "stove",
      xMm: P_WETCORE_EAST + 1750,
      yMm: INNER_Y0 + 200,
      widthMm: 600,
      heightMm: 550,
    },

    // === Furniture — bedroom 2 ===
    {
      id: "f-bed2",
      type: "furniture",
      zoneId: "zone-bedrooms",
      subtype: "bed-double",
      xMm: P_WETCORE_EAST + 950,
      yMm: 2000,
      widthMm: 1400,
      heightMm: 2000,
    },
    {
      id: "f-wardrobe2",
      type: "furniture",
      zoneId: "zone-bedrooms",
      subtype: "wardrobe",
      xMm: P_WETCORE_EAST + 220,
      yMm: 4200,
      widthMm: 2200,
      heightMm: 550,
    },

    // === Furniture — living room ===
    {
      id: "f-sofa",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "sofa",
      xMm: P_BEDROOMS_EAST + 1100,
      yMm: 2050,
      widthMm: 2000,
      heightMm: 900,
    },
    {
      id: "f-armchair",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "armchair",
      xMm: P_BEDROOMS_EAST + 300,
      yMm: 2200,
      widthMm: 900,
      heightMm: 900,
    },
    {
      id: "f-dining-table",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-table",
      xMm: INNER_X1 - 1700,
      yMm: INNER_Y0 + 300,
      widthMm: 1400,
      heightMm: 1200,
    },
    {
      id: "f-dining-chair-1",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-chair",
      xMm: INNER_X1 - 1850,
      yMm: INNER_Y0 + 400,
      widthMm: 420,
      heightMm: 420,
    },
    {
      id: "f-dining-chair-2",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-chair",
      xMm: INNER_X1 - 1850,
      yMm: INNER_Y0 + 1050,
      widthMm: 420,
      heightMm: 420,
    },
    {
      id: "f-dining-chair-3",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-chair",
      xMm: INNER_X1 - 600,
      yMm: INNER_Y0 + 400,
      widthMm: 420,
      heightMm: 420,
    },
    {
      id: "f-dining-chair-4",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-chair",
      xMm: INNER_X1 - 600,
      yMm: INNER_Y0 + 1050,
      widthMm: 420,
      heightMm: 420,
    },

    // === Veranda — three round lounge chairs ===
    {
      id: "f-veranda-chair-1",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "armchair",
      xMm: VERANDA_X0 + 180,
      yMm: VERANDA_Y0 + 180,
      widthMm: 800,
      heightMm: 800,
    },
    {
      id: "f-veranda-chair-2",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "armchair",
      xMm: VERANDA_X0 + 1080,
      yMm: VERANDA_Y0 + 180,
      widthMm: 800,
      heightMm: 800,
    },
    {
      id: "f-veranda-chair-3",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "armchair",
      xMm: VERANDA_X0 + 1980,
      yMm: VERANDA_Y0 + 180,
      widthMm: 800,
      heightMm: 800,
    },

    // === Room labels ===
    {
      id: "label-bathroom",
      type: "room-label",
      zoneId: "zone-wet-core",
      xMm: (INNER_X0 + P_WETCORE_EAST) / 2,
      yMm: (INNER_Y0 + P_BATHROOM_SOUTH) / 2 + 350,
      label: "Bathroom",
      areaM2: 3,
    },
    {
      id: "label-bedroom1",
      type: "room-label",
      zoneId: "zone-wet-core",
      xMm: (INNER_X0 + P_WETCORE_EAST) / 2,
      yMm: (P_BATHROOM_SOUTH + INNER_Y1) / 2 - 300,
      label: "Bedroom 1",
      areaM2: 9,
    },
    {
      id: "label-bedroom2",
      type: "room-label",
      zoneId: "zone-bedrooms",
      xMm: (P_WETCORE_EAST + P_BEDROOMS_EAST) / 2,
      yMm: (P_KITCHEN_SOUTH + INNER_Y1) / 2 - 300,
      label: "Bedroom 2",
      areaM2: 7,
    },
    {
      id: "label-living",
      type: "room-label",
      zoneId: "zone-living",
      xMm: (P_BEDROOMS_EAST + INNER_X1) / 2 - 600,
      yMm: 1350,
      label: "Living Room",
      areaM2: 17,
    },
    {
      id: "label-veranda",
      type: "room-label",
      zoneId: "zone-living",
      xMm: (VERANDA_X0 + VERANDA_X1) / 2,
      yMm: (VERANDA_Y0 + VERANDA_Y1) / 2,
      label: "Veranda",
      areaM2: 4,
    },
    {
      id: "label-veranda-entrance-arrow",
      type: "room-label",
      zoneId: "zone-living",
      xMm: ENTRANCE_X + ENTRANCE_W / 2,
      yMm: INNER_Y1 + 400,
      label: "↑ Entrance",
    },

    // === Overall dimensions ===
    {
      id: "dim-overall-width",
      type: "dimension",
      from: [0, 0],
      to: [OUTER_WIDTH, 0],
      label: "8,635",
      offsetMm: -450,
    },
    {
      id: "dim-overall-depth",
      type: "dimension",
      from: [0, 0],
      to: [0, OUTER_DEPTH],
      label: "4,972",
      offsetMm: 450,
    },
  ],
};
