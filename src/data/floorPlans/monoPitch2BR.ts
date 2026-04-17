import type { FloorPlanModel } from "@/types/floorPlan";

/**
 * 2BR Mono Pitch — standard Easy Housing model (0A + 1B + 2C columns).
 *
 * Hand-traced from `2br mono plan.png` (the Archicad-exported reference).
 * Dimensions in millimetres. Outer envelope 8,635 × 4,972 (double-walled,
 * structural depth 4,884 mm = Mono Pitch depth, structural length
 * 8,547 mm = 1×2442 + 2×3053).
 *
 * This is a Phase 2a placeholder: enough structure, rooms, doors, windows,
 * furniture and dimensions to validate the renderer and data model.
 * The admin tool in Phase 3 will produce the production-grade JSON.
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
const P_BATHROOM_RIGHT = 2100;     // bathroom east wall
const P_BATHROOM_SOUTH = 1688;     // bathroom south wall
const P_BEDROOM1_RIGHT = 2100;     // bedroom 1 = bathroom column
const P_BEDROOM2_RIGHT = 4700;     // bedroom 2 east wall
const P_BEDROOM2_NORTH = 1688;     // bedroom 2 north wall (kitchen divider)
const P_LIVING_WEST = P_BEDROOM2_RIGHT;

// Veranda (external, sits outside south wall under the roof overhang)
const VERANDA_X0 = 5200;
const VERANDA_X1 = 8100;
const VERANDA_Y0 = OUTER_DEPTH;
const VERANDA_Y1 = OUTER_DEPTH + 1400;

export const MONO_PITCH_2BR_FLOOR_PLAN: FloorPlanModel = {
  id: "mono-pitch-2br-standard",
  name: "2BR Mono Pitch (standard)",
  typology: "mono-pitch-4884",
  bedrooms: 2,
  bathrooms: 1,
  depthMm: 4884,
  baseLengthMm: 8547,
  minLengthMm: 8 * 610,   // 4880 mm — typology min
  maxLengthMm: 20 * 610,  // 12200 mm — typology max
  jumpSizeMm: 610,
  viewBox: { width: OUTER_WIDTH, height: VERANDA_Y1 + 400 },

  zones: [
    {
      id: "zone-wet-core",
      order: 3, // stretches last
      xStartMm: 0,
      xEndMm: P_BATHROOM_RIGHT + WALL_THK,
      minWidthMm: 1800,
      maxWidthMm: 2800,
      movingElementIds: [],
      stretchingElementIds: [],
    },
    {
      id: "zone-bedrooms",
      order: 2,
      xStartMm: P_BATHROOM_RIGHT + WALL_THK,
      xEndMm: P_BEDROOM2_RIGHT + WALL_THK,
      minWidthMm: 2200,
      maxWidthMm: 3400,
      movingElementIds: [],
      stretchingElementIds: [],
    },
    {
      id: "zone-living",
      order: 1, // fills first — living room grows most
      xStartMm: P_BEDROOM2_RIGHT + WALL_THK,
      xEndMm: OUTER_WIDTH,
      minWidthMm: 2800,
      maxWidthMm: 5200,
      movingElementIds: [],
      stretchingElementIds: [],
    },
  ],

  elements: [
    // === Room fills (painted first so walls draw on top) ===
    {
      id: "fill-bathroom",
      type: "room-fill",
      zoneId: "zone-wet-core",
      fill: "#f3ece0",
      points: [
        [INNER_X0, INNER_Y0],
        [P_BATHROOM_RIGHT, INNER_Y0],
        [P_BATHROOM_RIGHT, P_BATHROOM_SOUTH],
        [INNER_X0, P_BATHROOM_SOUTH],
      ],
    },
    {
      id: "fill-bedroom1",
      type: "room-fill",
      zoneId: "zone-wet-core",
      fill: "#efe5d0",
      points: [
        [INNER_X0, P_BATHROOM_SOUTH],
        [P_BEDROOM1_RIGHT, P_BATHROOM_SOUTH],
        [P_BEDROOM1_RIGHT, INNER_Y1],
        [INNER_X0, INNER_Y1],
      ],
    },
    {
      id: "fill-kitchen",
      type: "room-fill",
      zoneId: "zone-bedrooms",
      fill: "#f3ece0",
      points: [
        [P_BATHROOM_RIGHT, INNER_Y0],
        [P_BEDROOM2_RIGHT, INNER_Y0],
        [P_BEDROOM2_RIGHT, P_BEDROOM2_NORTH],
        [P_BATHROOM_RIGHT, P_BEDROOM2_NORTH],
      ],
    },
    {
      id: "fill-bedroom2",
      type: "room-fill",
      zoneId: "zone-bedrooms",
      fill: "#efe5d0",
      points: [
        [P_BATHROOM_RIGHT, P_BEDROOM2_NORTH],
        [P_BEDROOM2_RIGHT, P_BEDROOM2_NORTH],
        [P_BEDROOM2_RIGHT, INNER_Y1],
        [P_BATHROOM_RIGHT, INNER_Y1],
      ],
    },
    {
      id: "fill-living",
      type: "room-fill",
      zoneId: "zone-living",
      fill: "#efe5d0",
      points: [
        [P_LIVING_WEST, INNER_Y0],
        [INNER_X1, INNER_Y0],
        [INNER_X1, INNER_Y1],
        [P_LIVING_WEST, INNER_Y1],
      ],
    },
    {
      id: "fill-veranda",
      type: "room-fill",
      zoneId: "zone-living",
      fill: "#e3d7c1",
      points: [
        [VERANDA_X0, VERANDA_Y0],
        [VERANDA_X1, VERANDA_Y0],
        [VERANDA_X1, VERANDA_Y1],
        [VERANDA_X0, VERANDA_Y1],
      ],
    },

    // === External walls (one polygon, thick stroke) ===
    {
      id: "wall-external",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [
        [0, 0],
        [OUTER_WIDTH, 0],
        [OUTER_WIDTH, OUTER_DEPTH],
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
        [P_BATHROOM_RIGHT, P_BATHROOM_SOUTH],
      ],
    },
    {
      id: "partition-bathroom-east",
      type: "partition",
      zoneId: "zone-wet-core",
      thicknessMm: PARTITION_THK,
      points: [
        [P_BATHROOM_RIGHT, INNER_Y0],
        [P_BATHROOM_RIGHT, INNER_Y1],
      ],
    },
    {
      id: "partition-kitchen-south",
      type: "partition",
      zoneId: "zone-bedrooms",
      thicknessMm: PARTITION_THK,
      points: [
        [P_BATHROOM_RIGHT, P_BEDROOM2_NORTH],
        [P_BEDROOM2_RIGHT, P_BEDROOM2_NORTH],
      ],
    },
    {
      id: "partition-bedroom2-east",
      type: "partition",
      zoneId: "zone-bedrooms",
      thicknessMm: PARTITION_THK,
      points: [
        [P_BEDROOM2_RIGHT, INNER_Y0],
        [P_BEDROOM2_RIGHT, INNER_Y1],
      ],
    },

    // === Doors ===
    // Bathroom door — opens north into bathroom from bedroom 1 corridor
    {
      id: "door-bathroom",
      type: "door",
      zoneId: "zone-wet-core",
      hingeXMm: 1000,
      hingeYMm: P_BATHROOM_SOUTH,
      widthMm: 750,
      swing: "NE",
    },
    // Bedroom 1 door — from bedroom 1 into bedroom 2 corridor area
    {
      id: "door-bedroom1",
      type: "door",
      zoneId: "zone-wet-core",
      hingeXMm: P_BEDROOM1_RIGHT,
      hingeYMm: 3200,
      widthMm: 800,
      swing: "NE",
    },
    // Bedroom 2 door — from bedroom 2 into living area
    {
      id: "door-bedroom2",
      type: "door",
      zoneId: "zone-bedrooms",
      hingeXMm: P_BEDROOM2_RIGHT,
      hingeYMm: 2200,
      widthMm: 800,
      swing: "NW",
    },
    // Entrance door — south wall into living/veranda
    {
      id: "door-entrance",
      type: "door",
      zoneId: "zone-living",
      hingeXMm: 5400,
      hingeYMm: INNER_Y1,
      widthMm: 900,
      swing: "NE",
    },

    // === Windows on external walls ===
    // Bathroom small window (north)
    {
      id: "window-bathroom",
      type: "window",
      zoneId: "zone-wet-core",
      points: [
        [600, 0],
        [1300, 0],
      ],
    },
    // Bedroom 1 window (south)
    {
      id: "window-bedroom1",
      type: "window",
      zoneId: "zone-wet-core",
      points: [
        [400, OUTER_DEPTH],
        [1700, OUTER_DEPTH],
      ],
    },
    // Kitchen window (north, above sink)
    {
      id: "window-kitchen",
      type: "window",
      zoneId: "zone-bedrooms",
      points: [
        [2700, 0],
        [4300, 0],
      ],
    },
    // Bedroom 2 window (south)
    {
      id: "window-bedroom2",
      type: "window",
      zoneId: "zone-bedrooms",
      points: [
        [2700, OUTER_DEPTH],
        [4200, OUTER_DEPTH],
      ],
    },
    // Living room panorama window (east)
    {
      id: "window-living-east",
      type: "window",
      zoneId: "zone-living",
      points: [
        [OUTER_WIDTH, 700],
        [OUTER_WIDTH, 3200],
      ],
    },
    // Living room north window
    {
      id: "window-living-north",
      type: "window",
      zoneId: "zone-living",
      points: [
        [5400, 0],
        [7800, 0],
      ],
    },

    // === Furniture ===
    // Bathroom — toilet, sink, bathtub
    {
      id: "f-bathtub",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "bathtub",
      xMm: 200,
      yMm: 200,
      widthMm: 1700,
      heightMm: 700,
    },
    {
      id: "f-bath-sink",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "sink-bathroom",
      xMm: 200,
      yMm: 1000,
      widthMm: 600,
      heightMm: 450,
    },
    {
      id: "f-toilet",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "toilet",
      xMm: 900,
      yMm: 1050,
      widthMm: 450,
      heightMm: 550,
    },
    // Bedroom 1 — double bed + wardrobe
    {
      id: "f-bed1",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "bed-double",
      xMm: 250,
      yMm: 1900,
      widthMm: 1400,
      heightMm: 2000,
    },
    {
      id: "f-wardrobe1",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "wardrobe",
      xMm: 250,
      yMm: 4200,
      widthMm: 1800,
      heightMm: 600,
    },
    // Kitchen — counter top + sink + stove + fridge
    {
      id: "f-kitchen-counter",
      type: "furniture",
      zoneId: "zone-bedrooms",
      subtype: "kitchen-counter",
      xMm: P_BATHROOM_RIGHT + 100,
      yMm: INNER_Y0 + 100,
      widthMm: 2400,
      heightMm: 600,
    },
    {
      id: "f-kitchen-sink",
      type: "furniture",
      zoneId: "zone-bedrooms",
      subtype: "sink-kitchen",
      xMm: P_BATHROOM_RIGHT + 500,
      yMm: INNER_Y0 + 200,
      widthMm: 700,
      heightMm: 400,
    },
    {
      id: "f-stove",
      type: "furniture",
      zoneId: "zone-bedrooms",
      subtype: "stove",
      xMm: P_BATHROOM_RIGHT + 1500,
      yMm: INNER_Y0 + 150,
      widthMm: 600,
      heightMm: 500,
    },
    {
      id: "f-fridge",
      type: "furniture",
      zoneId: "zone-bedrooms",
      subtype: "fridge",
      xMm: P_BATHROOM_RIGHT + 150,
      yMm: INNER_Y0 + 100,
      widthMm: 600,
      heightMm: 600,
    },
    // Bedroom 2 — bed + wardrobe
    {
      id: "f-bed2",
      type: "furniture",
      zoneId: "zone-bedrooms",
      subtype: "bed-double",
      xMm: P_BATHROOM_RIGHT + 250,
      yMm: P_BEDROOM2_NORTH + 300,
      widthMm: 1400,
      heightMm: 2000,
    },
    {
      id: "f-wardrobe2",
      type: "furniture",
      zoneId: "zone-bedrooms",
      subtype: "wardrobe",
      xMm: P_BATHROOM_RIGHT + 250,
      yMm: INNER_Y1 - 700,
      widthMm: 2000,
      heightMm: 600,
    },
    // Living room — sofa, armchair, dining table + chairs
    {
      id: "f-sofa",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "sofa",
      xMm: P_LIVING_WEST + 300,
      yMm: 2200,
      widthMm: 2200,
      heightMm: 900,
    },
    {
      id: "f-armchair",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "armchair",
      xMm: P_LIVING_WEST + 2700,
      yMm: 2400,
      widthMm: 900,
      heightMm: 900,
    },
    {
      id: "f-dining-table",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-table",
      xMm: P_LIVING_WEST + 1400,
      yMm: 400,
      widthMm: 1400,
      heightMm: 1200,
    },
    {
      id: "f-dining-chair-1",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-chair",
      xMm: P_LIVING_WEST + 1200,
      yMm: 600,
      widthMm: 450,
      heightMm: 450,
    },
    {
      id: "f-dining-chair-2",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-chair",
      xMm: P_LIVING_WEST + 1200,
      yMm: 1200,
      widthMm: 450,
      heightMm: 450,
    },
    {
      id: "f-dining-chair-3",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-chair",
      xMm: P_LIVING_WEST + 2800,
      yMm: 600,
      widthMm: 450,
      heightMm: 450,
    },
    {
      id: "f-dining-chair-4",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-chair",
      xMm: P_LIVING_WEST + 2800,
      yMm: 1200,
      widthMm: 450,
      heightMm: 450,
    },

    // === Room labels (placed at visual centre of each room) ===
    {
      id: "label-bathroom",
      type: "room-label",
      zoneId: "zone-wet-core",
      xMm: (INNER_X0 + P_BATHROOM_RIGHT) / 2,
      yMm: (INNER_Y0 + P_BATHROOM_SOUTH) / 2,
      label: "Bathroom",
      areaM2: 3,
    },
    {
      id: "label-bedroom1",
      type: "room-label",
      zoneId: "zone-wet-core",
      xMm: (INNER_X0 + P_BEDROOM1_RIGHT) / 2,
      yMm: (P_BATHROOM_SOUTH + INNER_Y1) / 2,
      label: "Bedroom 1",
      areaM2: 9,
    },
    {
      id: "label-bedroom2",
      type: "room-label",
      zoneId: "zone-bedrooms",
      xMm: (P_BATHROOM_RIGHT + P_BEDROOM2_RIGHT) / 2,
      yMm: (P_BEDROOM2_NORTH + INNER_Y1) / 2,
      label: "Bedroom 2",
      areaM2: 7,
    },
    {
      id: "label-living",
      type: "room-label",
      zoneId: "zone-living",
      xMm: (P_LIVING_WEST + INNER_X1) / 2,
      yMm: 1300,
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

    // === Dimensions ===
    {
      id: "dim-overall-width",
      type: "dimension",
      from: [0, 0],
      to: [OUTER_WIDTH, 0],
      label: "8,635",
      offsetMm: -450,
    },
    {
      // Sign is positive because our clockwise-normal convention puts
      // positive offsets to the "left" of a downward-pointing line.
      id: "dim-overall-depth",
      type: "dimension",
      from: [0, 0],
      to: [0, OUTER_DEPTH],
      label: "4,972",
      offsetMm: 450,
    },
  ],
};
