import type { FloorPlanModel } from "@/types/floorPlan";

/**
 * 1BR Mono Pitch — traced from `data/floorplans/reference-images/mono pitch 1BR.png` (Archicad export).
 *
 * Structural envelope 6,106 × 4,884 mm (2 × C frames, depth fixed).
 * Outer envelope 6,194 × 4,972 (single double-wall = 88 mm thick).
 * Layout columns (west → east): wet-core (bathroom over bedroom-west),
 * bedroom-east strip, living/veranda. The bedroom spans the wet-core
 * AND bedroom zones — both fills share the same beige floor so the
 * joint at x = bathroom-east is invisible.
 *
 * The south (external) wall has an entrance gap notch at ENTRANCE_X →
 * ENTRANCE_X + ENTRANCE_W, matching the veranda opening. When zone-living
 * stretches, both notch points shift with it via zone-aware remapping.
 *
 * Coordinates are in mm, origin at the top-left of the outer envelope.
 * Zones are ordered so the living room stretches first (order = 1),
 * the bedroom strip second, the wet-core last (fixed bathroom width).
 *
 * Each door carries a wallAxis field ("horizontal" or "vertical") that
 * classifies the wall it sits in and drives the leaf direction in the SVG renderer.
 */

const OUTER_WIDTH = 6194; // 6106 structural + 88 wall
const OUTER_DEPTH = 4972; // 4884 structural + 88 wall
const WALL_THK = 88;
const PARTITION_THK = 60;

const INNER_X0 = WALL_THK;
const INNER_Y0 = WALL_THK;
const INNER_X1 = OUTER_WIDTH - WALL_THK; // 6106
const INNER_Y1 = OUTER_DEPTH - WALL_THK; // 4884

// Partition lines (approximate from the PNG)
const P_BATHROOM_EAST = 1700; // east wall of bathroom
const P_BATHROOM_SOUTH = 1900; // south wall of bathroom
const P_BEDROOM_EAST = 2442; // main partition: bedroom ↔ living
const P_VERANDA_NORTH = 3200; // wall between living and veranda
const P_VERANDA_WEST = 3053; // wall between entrance corridor and veranda

// Entrance door — sits in the wall between living room and veranda
const ENTRANCE_X = 3400;
const ENTRANCE_W = 900;

export const MONO_PITCH_1BR_FLOOR_PLAN: FloorPlanModel = {
  id: "mono-pitch-1br-standard",
  name: "1BR Mono Pitch (standard)",
  typology: "mono-pitch-4884",
  bedrooms: 1,
  bathrooms: 1,
  depthMm: 4884,
  baseLengthMm: 6106, // 0A + 0B + 2C = 2 × 3053
  minLengthMm: 8 * 610, // 4880 mm — typology min
  maxLengthMm: 20 * 610, // 12200 mm — typology max
  jumpSizeMm: 610,
  viewBox: { width: OUTER_WIDTH, height: OUTER_DEPTH + 400 },
  costDefaults: {
    partitionsM: 6.0, // 1BR CC Mono standard from Excel col G
    interiorDoors: 2,
    aluminiumSqm: 7.9,
  },

  zones: [
    {
      id: "zone-wet-core",
      order: 3, // stretches last — bathroom stays fixed
      xStartMm: 0,
      xEndMm: P_BATHROOM_EAST + PARTITION_THK / 2,
      minWidthMm: 1500,
      maxWidthMm: 1900,
      movingElementIds: [
        "partition-bathroom-east",
        "door-bathroom",
      ],
      stretchingElementIds: [
        "fill-bathroom",
        "fill-bedroom-west",
        "partition-bathroom-south",
        "window-bathroom-north",
        "f-bathtub",
      ],
    },
    {
      id: "zone-bedroom",
      order: 2,
      xStartMm: P_BATHROOM_EAST + PARTITION_THK / 2,
      xEndMm: P_BEDROOM_EAST + PARTITION_THK / 2,
      minWidthMm: 600,
      maxWidthMm: 1800,
      movingElementIds: [
        "partition-bedroom-east",
        "door-bedroom",
      ],
      stretchingElementIds: [
        "fill-bedroom-east",
        "fill-hallway",
        "window-bedroom-south",
      ],
    },
    {
      id: "zone-living",
      order: 1, // fills first — living room absorbs most of the delta
      xStartMm: P_BEDROOM_EAST + PARTITION_THK / 2,
      xEndMm: OUTER_WIDTH,
      minWidthMm: 2400,
      maxWidthMm: 9100,
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
        "partition-veranda-north",
        "partition-veranda-west",
        "window-kitchen-center",
        "window-kitchen-east",
        "window-living-east",
        "f-kitchen-counter",
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
        [P_BATHROOM_EAST, INNER_Y0],
        [P_BATHROOM_EAST, P_BATHROOM_SOUTH],
        [INNER_X0, P_BATHROOM_SOUTH],
      ],
    },
    {
      // Bedroom occupies west of the bedroom partition. The west part
      // sits under the bathroom in the wet-core zone — same beige fill
      // as the east part so the joint at x = P_BATHROOM_EAST blends in.
      id: "fill-bedroom-west",
      type: "room-fill",
      zoneId: "zone-wet-core",
      fill: "#efe2c6",
      points: [
        [INNER_X0, P_BATHROOM_SOUTH],
        [P_BATHROOM_EAST, P_BATHROOM_SOUTH],
        [P_BATHROOM_EAST, INNER_Y1],
        [INNER_X0, INNER_Y1],
      ],
    },
    {
      // East slice of the bedroom (from bathroom-east → bedroom-east)
      id: "fill-bedroom-east",
      type: "room-fill",
      zoneId: "zone-bedroom",
      fill: "#efe2c6",
      points: [
        [P_BATHROOM_EAST, P_BATHROOM_SOUTH],
        [P_BEDROOM_EAST, P_BATHROOM_SOUTH],
        [P_BEDROOM_EAST, INNER_Y1],
        [P_BATHROOM_EAST, INNER_Y1],
      ],
    },
    {
      // Hallway / entrance corridor between bathroom and bedroom-east,
      // open to the kitchen/living above (top portion of bedroom zone).
      id: "fill-hallway",
      type: "room-fill",
      zoneId: "zone-bedroom",
      fill: "#efe2c6",
      points: [
        [P_BATHROOM_EAST, INNER_Y0],
        [P_BEDROOM_EAST, INNER_Y0],
        [P_BEDROOM_EAST, P_BATHROOM_SOUTH],
        [P_BATHROOM_EAST, P_BATHROOM_SOUTH],
      ],
    },
    {
      id: "fill-living",
      type: "room-fill",
      zoneId: "zone-living",
      fill: "#efe2c6",
      points: [
        [P_BEDROOM_EAST, INNER_Y0],
        [INNER_X1, INNER_Y0],
        [INNER_X1, P_VERANDA_NORTH],
        [P_BEDROOM_EAST, P_VERANDA_NORTH],
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
    {
      id: "fill-corridor-south",
      type: "room-fill",
      zoneId: "zone-bedroom",
      fill: "#efe2c6",
      points: [
        [P_BEDROOM_EAST, P_VERANDA_NORTH],
        [P_VERANDA_WEST, P_VERANDA_NORTH],
        [P_VERANDA_WEST, INNER_Y1],
        [P_BEDROOM_EAST, INNER_Y1],
      ],
    },

    // === External walls (south wall has veranda opening from P_VERANDA_WEST to INNER_X1) ===
    {
      id: "wall-external",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [
        [0, 0],
        [OUTER_WIDTH, 0],
        [OUTER_WIDTH, OUTER_DEPTH],
        [INNER_X1, OUTER_DEPTH],
        // veranda opening in south wall
        [P_VERANDA_WEST, OUTER_DEPTH],
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
      id: "partition-bedroom-east",
      type: "partition",
      zoneId: "zone-bedroom",
      thicknessMm: PARTITION_THK,
      // Full-height bedroom east wall (bedroom ↔ living/entrance corridor)
      points: [
        [P_BEDROOM_EAST, P_BATHROOM_SOUTH],
        [P_BEDROOM_EAST, INNER_Y1],
      ],
    },
    {
      id: "partition-corridor-south",
      type: "partition",
      zoneId: "zone-bedroom",
      thicknessMm: PARTITION_THK,
      // South wall of the entrance corridor between bedroom and veranda
      points: [
        [P_BEDROOM_EAST, P_VERANDA_NORTH],
        [P_VERANDA_WEST, P_VERANDA_NORTH],
      ],
    },
    {
      id: "partition-veranda-north",
      type: "partition",
      zoneId: "zone-living",
      thicknessMm: PARTITION_THK,
      // Wall between living room and veranda. Stops west of the entrance
      // door, then resumes east of it.
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

    // === Doors (quarter-circle swing arcs) ===
    // Bathroom door — south wall of bathroom, hinge east, swings SW into BR
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
    // Bedroom door — bedroom-east partition, hinge top, swings SW into BR
    {
      id: "door-bedroom",
      type: "door",
      zoneId: "zone-bedroom",
      hingeXMm: P_BEDROOM_EAST,
      hingeYMm: P_BATHROOM_SOUTH + 200,
      widthMm: 900,
      swing: "SW",
      wallAxis: "vertical",
    },
    // Entrance door — in the living↔veranda wall, hinge east, swings NW (into living)
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

    // === Windows on external walls (triangular markers point outward) ===
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
      id: "window-kitchen-center",
      type: "window",
      zoneId: "zone-living",
      points: [
        [P_BEDROOM_EAST + 600, 0],
        [P_BEDROOM_EAST + 1700, 0],
      ],
    },
    {
      id: "window-kitchen-east",
      type: "window",
      zoneId: "zone-living",
      points: [
        [INNER_X1 - 1500, 0],
        [INNER_X1 - 400, 0],
      ],
    },
    {
      id: "window-living-east",
      type: "window",
      zoneId: "zone-living",
      points: [
        [OUTER_WIDTH, 1100],
        [OUTER_WIDTH, 2200],
      ],
    },
    {
      id: "window-bedroom-south",
      type: "window",
      zoneId: "zone-bedroom",
      points: [
        [400, OUTER_DEPTH],
        [1700, OUTER_DEPTH],
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
      widthMm: 1300,
      heightMm: 700,
    },
    {
      id: "f-toilet",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "toilet",
      xMm: 220,
      yMm: 1100,
      widthMm: 450,
      heightMm: 600,
    },
    {
      id: "f-bath-sink",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "sink-bathroom",
      xMm: 800,
      yMm: 1200,
      widthMm: 500,
      heightMm: 450,
    },

    // === Furniture — bedroom ===
    {
      id: "f-bed",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "bed-double",
      xMm: 200,
      yMm: 2400,
      widthMm: 1400,
      heightMm: 2000,
    },
    {
      id: "f-wardrobe",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "wardrobe",
      xMm: 200,
      yMm: 2050,
      widthMm: 600,
      heightMm: 300,
    },

    // === Furniture — kitchen strip (in living zone) ===
    {
      id: "f-fridge",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "fridge",
      xMm: P_BEDROOM_EAST + 150,
      yMm: INNER_Y0,
      widthMm: 600,
      heightMm: 600,
    },
    {
      id: "f-kitchen-counter",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "kitchen-counter",
      xMm: P_BEDROOM_EAST + 800,
      yMm: INNER_Y0,
      widthMm: 1700,
      heightMm: 600,
    },
    {
      id: "f-kitchen-sink",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "sink-kitchen",
      xMm: P_BEDROOM_EAST + 900,
      yMm: INNER_Y0,
      widthMm: 700,
      heightMm: 450,
    },
    {
      id: "f-stove",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "stove",
      xMm: P_BEDROOM_EAST + 1750,
      yMm: INNER_Y0,
      widthMm: 600,
      heightMm: 550,
    },

    // === Furniture — living room ===
    {
      id: "f-sofa",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "sofa",
      xMm: P_BEDROOM_EAST + 600,
      yMm: 2050,
      widthMm: 1800,
      heightMm: 800,
    },
    {
      id: "f-coffee-table",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "generic",
      xMm: P_BEDROOM_EAST + 950,
      yMm: 1300,
      widthMm: 1000,
      heightMm: 500,
    },
    {
      id: "f-dining-table",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-table",
      xMm: INNER_X1 - 1500,
      yMm: INNER_Y0 + 800,
      widthMm: 1200,
      heightMm: 800,
    },
    {
      id: "f-dining-chair-1",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-chair",
      xMm: INNER_X1 - 1600,
      yMm: INNER_Y0 + 850,
      widthMm: 400,
      heightMm: 400,
    },
    {
      id: "f-dining-chair-2",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-chair",
      xMm: INNER_X1 - 1600,
      yMm: INNER_Y0 + 1300,
      widthMm: 400,
      heightMm: 400,
    },
    {
      id: "f-dining-chair-3",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-chair",
      xMm: INNER_X1 - 500,
      yMm: INNER_Y0 + 850,
      widthMm: 400,
      heightMm: 400,
    },
    {
      id: "f-dining-chair-4",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "dining-chair",
      xMm: INNER_X1 - 500,
      yMm: INNER_Y0 + 1300,
      widthMm: 400,
      heightMm: 400,
    },

    // === Furniture — veranda lounge (3 round-ish chairs) ===
    {
      id: "f-veranda-chair-1",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "armchair",
      xMm: P_VERANDA_WEST + 200,
      yMm: P_VERANDA_NORTH + 600,
      widthMm: 700,
      heightMm: 700,
    },
    {
      id: "f-veranda-chair-2",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "armchair",
      xMm: P_VERANDA_WEST + 1100,
      yMm: P_VERANDA_NORTH + 600,
      widthMm: 700,
      heightMm: 700,
    },
    {
      id: "f-veranda-chair-3",
      type: "furniture",
      zoneId: "zone-living",
      subtype: "armchair",
      xMm: P_VERANDA_WEST + 2000,
      yMm: P_VERANDA_NORTH + 600,
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
      id: "label-bedroom",
      type: "room-label",
      zoneId: "zone-wet-core",
      xMm: (INNER_X0 + P_BEDROOM_EAST) / 2,
      yMm: (P_BATHROOM_SOUTH + INNER_Y1) / 2 - 200,
      label: "Bedroom",
      areaM2: 9,
    },
    {
      id: "label-living",
      type: "room-label",
      zoneId: "zone-living",
      xMm: (P_BEDROOM_EAST + INNER_X1) / 2 - 400,
      yMm: 1500,
      label: "Living Room",
      areaM2: 15,
    },
    {
      id: "label-veranda",
      type: "room-label",
      zoneId: "zone-living",
      xMm: (P_VERANDA_WEST + INNER_X1) / 2 + 400,
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
