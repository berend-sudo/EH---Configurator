import type { FloorPlanModel } from "@/types/floorPlan";

/**
 * 3BR Mono Pitch — traced from `mono pitch 3BR.png` (Archicad export).
 *
 * Envelope 9,246 × 4,972 mm (outer, single-wall slack). Structural
 * footprint is 9,159 × 4,884 mm which matches the base frame combo
 * 0A + 0B + 3C (3 × 3,053 mm).
 *
 * Layout columns (west → east):
 *   – Wet core: bathroom (top-left) + bedroom 1 (bottom-left).
 *   – Centre:   kitchen strip (top) + living room + recessed veranda.
 *   – Right:    bedroom 2 (top-right) + bedroom 3 (bottom-right).
 *
 * The veranda is a south-facing recess carved out of the envelope —
 * its floor is outside GFA but inside the outer perimeter. The external
 * wall polygon traces the recess via interior notch points at VERANDA_X0
 * and VERANDA_X1 (both inside zone-centre). When zone-centre stretches,
 * these points shift with it via zone-aware remapping so the outer shell
 * stays connected to the veranda partitions at all plan lengths.
 *
 * Coordinates are in mm, origin at the top-left of the outer envelope.
 *
 * Zone stretch priority (order): centre (1) fills first, then right
 * bedrooms (2), wet core (3) last.
 *
 * Each door carries a wallAxis field ("horizontal" or "vertical") that
 * classifies the wall it sits in and drives the leaf direction in the SVG renderer.
 */

const OUTER_WIDTH = 9246;
const OUTER_DEPTH = 4972;
const WALL_THK = 88;
const PARTITION_THK = 60;

const INNER_X0 = WALL_THK; // 88
const INNER_Y0 = WALL_THK; // 88
const INNER_X1 = OUTER_WIDTH - WALL_THK; // 9158
const INNER_Y1 = OUTER_DEPTH - WALL_THK; // 4884

// Vertical partition lines
const P_BATHROOM_EAST = 1700; // east wall of the bathroom box
const P_WETCORE_EAST = 2400; // east wall of BR1 / west wall of living
const P_LIVING_EAST = 6100; // east wall of living / west wall of right bedrooms

// Horizontal partition lines
const P_BATHROOM_SOUTH = 1800; // south wall of bathroom
const P_BR2_SOUTH = 2400; // BR2 / BR3 divider on the right column

// Veranda recess — a C-frame-wide cut into the south wall
const VERANDA_X0 = 3053; // 1C frame west edge of the recess
const VERANDA_X1 = P_LIVING_EAST; // aligns to living-room east partition
const VERANDA_Y0 = 3600; // north edge (interior wall facing south into veranda)
const VERANDA_Y1 = INNER_Y1; // veranda floor reaches the outer south wall line

// Entrance on the north wall of the veranda, swinging into the living room
const ENTRANCE_X = 5200;
const ENTRANCE_W = 900;

export const MONO_PITCH_3BR_FLOOR_PLAN: FloorPlanModel = {
  id: "mono-pitch-3br-standard",
  name: "3BR Mono Pitch (standard)",
  typology: "mono-pitch-4884",
  bedrooms: 3,
  bathrooms: 1,
  depthMm: 4884,
  baseLengthMm: 9159, // 3C frames
  minLengthMm: 8 * 610, // 4880 mm — typology min
  maxLengthMm: 20 * 610, // 12200 mm — typology max
  jumpSizeMm: 610,
  viewBox: { width: OUTER_WIDTH, height: OUTER_DEPTH + 400 },
  costDefaults: {
    partitionsM: 14.0, // 3BR Mono standard from Excel col G
    interiorDoors: 4,
    aluminiumSqm: 9.4,
  },

  zones: [
    {
      id: "zone-wet-core",
      order: 3, // stretches last
      xStartMm: 0,
      xEndMm: P_WETCORE_EAST + PARTITION_THK / 2,
      minWidthMm: 2200,
      maxWidthMm: 2800,
      movingElementIds: [
        "partition-wetcore-east",
        "partition-bathroom-east",
        "door-bedroom1",
      ],
      stretchingElementIds: [
        "fill-bathroom",
        "fill-corridor-north",
        "fill-bedroom1",
        "partition-bathroom-south",
        "window-bathroom",
        "window-bedroom1-west",
        "window-bedroom1-south",
        "f-bed1",
        "f-wardrobe1",
        "f-bathtub",
      ],
    },
    {
      id: "zone-centre",
      order: 1, // fills first — living room absorbs most of the delta
      xStartMm: P_WETCORE_EAST + PARTITION_THK / 2,
      xEndMm: P_LIVING_EAST + PARTITION_THK / 2,
      minWidthMm: 2700,
      maxWidthMm: 5600,
      movingElementIds: [
        "partition-living-east",
        "f-dining-table",
        "f-dining-chair-1",
        "f-dining-chair-2",
        "f-dining-chair-3",
        "f-dining-chair-4",
        "door-bedroom2",
        "door-bedroom3",
      ],
      stretchingElementIds: [
        "fill-living",
        "fill-veranda",
        "partition-veranda-west",
        "partition-veranda-east",
        "window-kitchen",
        "window-living-north",
        "f-kitchen-counter",
        "f-tv",
      ],
    },
    {
      id: "zone-right-bedrooms",
      order: 2,
      xStartMm: P_LIVING_EAST + PARTITION_THK / 2,
      xEndMm: OUTER_WIDTH,
      minWidthMm: 2700,
      maxWidthMm: 4000,
      movingElementIds: [],
      stretchingElementIds: [
        "fill-bedroom2",
        "fill-bedroom3",
        "partition-br23-south",
        "window-bedroom2-east",
        "window-bedroom3-east",
        "window-bedroom2-north",
        "window-bedroom3-south",
        "f-bed2",
        "f-bed3",
        "f-wardrobe2",
        "f-wardrobe3",
      ],
    },
  ],

  elements: [
    // ==================================================================
    // Room fills (painted first so walls / furniture stack on top)
    // ==================================================================
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
    // Corridor-like sliver east of the bathroom, above BR1's east wall.
    // Part of the wet core zone so it stretches with the left column.
    {
      id: "fill-corridor-north",
      type: "room-fill",
      zoneId: "zone-wet-core",
      fill: "#efe2c6",
      points: [
        [P_BATHROOM_EAST, INNER_Y0],
        [P_WETCORE_EAST, INNER_Y0],
        [P_WETCORE_EAST, P_BATHROOM_SOUTH],
        [P_BATHROOM_EAST, P_BATHROOM_SOUTH],
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
    // Living room = L-shape wrapping around the veranda recess on its west side.
    {
      id: "fill-living",
      type: "room-fill",
      zoneId: "zone-centre",
      fill: "#efe2c6",
      points: [
        [P_WETCORE_EAST, INNER_Y0],
        [P_LIVING_EAST, INNER_Y0],
        [P_LIVING_EAST, VERANDA_Y0],
        [VERANDA_X0, VERANDA_Y0],
        [VERANDA_X0, INNER_Y1],
        [P_WETCORE_EAST, INNER_Y1],
      ],
    },
    {
      id: "fill-veranda",
      type: "room-fill",
      zoneId: "zone-centre",
      fill: "#d8d6d2",
      points: [
        [VERANDA_X0, VERANDA_Y0],
        [VERANDA_X1, VERANDA_Y0],
        [VERANDA_X1, VERANDA_Y1],
        [VERANDA_X0, VERANDA_Y1],
      ],
    },
    {
      id: "fill-bedroom2",
      type: "room-fill",
      zoneId: "zone-right-bedrooms",
      fill: "#efe2c6",
      points: [
        [P_LIVING_EAST, INNER_Y0],
        [INNER_X1, INNER_Y0],
        [INNER_X1, P_BR2_SOUTH],
        [P_LIVING_EAST, P_BR2_SOUTH],
      ],
    },
    {
      id: "fill-bedroom3",
      type: "room-fill",
      zoneId: "zone-right-bedrooms",
      fill: "#efe2c6",
      points: [
        [P_LIVING_EAST, P_BR2_SOUTH],
        [INNER_X1, P_BR2_SOUTH],
        [INNER_X1, INNER_Y1],
        [P_LIVING_EAST, INNER_Y1],
      ],
    },

    // ==================================================================
    // External wall — wraps around the veranda recess with a gap at the
    // entrance on the veranda's north wall.
    // ==================================================================
    {
      id: "wall-external",
      type: "wall",
      thicknessMm: WALL_THK,
      points: [
        [0, 0],
        [OUTER_WIDTH, 0],
        [OUTER_WIDTH, OUTER_DEPTH],
        [VERANDA_X1, OUTER_DEPTH],
        [VERANDA_X1, VERANDA_Y0],
        [ENTRANCE_X + ENTRANCE_W, VERANDA_Y0],
        // entrance-door opening
        [ENTRANCE_X, VERANDA_Y0],
        [VERANDA_X0, VERANDA_Y0],
        [VERANDA_X0, OUTER_DEPTH],
        [0, OUTER_DEPTH],
        [0, 0],
      ],
    },

    // ==================================================================
    // Internal partitions
    // ==================================================================
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
      id: "partition-wetcore-east",
      type: "partition",
      zoneId: "zone-wet-core",
      thicknessMm: PARTITION_THK,
      // BR1 east wall — full height (door opening rendered on top).
      points: [
        [P_WETCORE_EAST, INNER_Y0],
        [P_WETCORE_EAST, INNER_Y1],
      ],
    },
    {
      id: "partition-living-east",
      type: "partition",
      zoneId: "zone-centre",
      thicknessMm: PARTITION_THK,
      // Living-room east wall — separates the open area from BR2/BR3.
      points: [
        [P_LIVING_EAST, INNER_Y0],
        [P_LIVING_EAST, INNER_Y1],
      ],
    },
    {
      id: "partition-veranda-west",
      type: "partition",
      zoneId: "zone-centre",
      thicknessMm: PARTITION_THK,
      points: [
        [VERANDA_X0, VERANDA_Y0],
        [VERANDA_X0, INNER_Y1],
      ],
    },
    {
      id: "partition-veranda-east",
      type: "partition",
      zoneId: "zone-centre",
      thicknessMm: PARTITION_THK,
      points: [
        [VERANDA_X1, VERANDA_Y0],
        [VERANDA_X1, INNER_Y1],
      ],
    },
    {
      id: "partition-br23-south",
      type: "partition",
      zoneId: "zone-right-bedrooms",
      thicknessMm: PARTITION_THK,
      // BR2 / BR3 divider.
      points: [
        [P_LIVING_EAST, P_BR2_SOUTH],
        [INNER_X1, P_BR2_SOUTH],
      ],
    },

    // ==================================================================
    // Doors
    // ==================================================================
    // Bathroom → corridor (hinge on the east end of the bathroom south wall).
    {
      id: "door-bathroom",
      type: "door",
      zoneId: "zone-wet-core",
      hingeXMm: P_BATHROOM_EAST - 150,
      hingeYMm: P_BATHROOM_SOUTH,
      widthMm: 800,
      swing: "SW",
      wallAxis: "horizontal",
    },
    // BR1 → corridor (east wall of BR1, hinge near the top of the wall).
    {
      id: "door-bedroom1",
      type: "door",
      zoneId: "zone-wet-core",
      hingeXMm: P_WETCORE_EAST,
      hingeYMm: 2100,
      widthMm: 900,
      swing: "NW",
      wallAxis: "vertical",
    },
    // BR2 → living (west wall of BR2, hinge near the south-west corner).
    {
      id: "door-bedroom2",
      type: "door",
      zoneId: "zone-centre",
      hingeXMm: P_LIVING_EAST,
      hingeYMm: 2100,
      widthMm: 900,
      swing: "NE",
      wallAxis: "vertical",
    },
    // BR3 → living (west wall of BR3, hinge near the north-west corner).
    {
      id: "door-bedroom3",
      type: "door",
      zoneId: "zone-centre",
      hingeXMm: P_LIVING_EAST,
      hingeYMm: P_BR2_SOUTH + 200,
      widthMm: 900,
      swing: "SE",
      wallAxis: "vertical",
    },
    // Entrance door on the north wall of the veranda, swings into living.
    {
      id: "door-entrance",
      type: "door",
      zoneId: "zone-centre",
      hingeXMm: ENTRANCE_X + ENTRANCE_W,
      hingeYMm: VERANDA_Y0,
      widthMm: ENTRANCE_W,
      swing: "NW",
      wallAxis: "horizontal",
    },

    // ==================================================================
    // Windows on external walls
    // ==================================================================
    {
      id: "window-bathroom",
      type: "window",
      zoneId: "zone-wet-core",
      points: [
        [400, 0],
        [1200, 0],
      ],
    },
    {
      id: "window-bedroom1-west",
      type: "window",
      zoneId: "zone-wet-core",
      points: [
        [0, 2800],
        [0, 3800],
      ],
    },
    {
      id: "window-bedroom1-south",
      type: "window",
      zoneId: "zone-wet-core",
      points: [
        [400, OUTER_DEPTH],
        [1800, OUTER_DEPTH],
      ],
    },
    {
      id: "window-kitchen",
      type: "window",
      zoneId: "zone-centre",
      points: [
        [P_WETCORE_EAST + 300, 0],
        [P_WETCORE_EAST + 1500, 0],
      ],
    },
    {
      id: "window-living-north",
      type: "window",
      zoneId: "zone-centre",
      points: [
        [P_WETCORE_EAST + 1800, 0],
        [P_LIVING_EAST - 300, 0],
      ],
    },
    {
      id: "window-bedroom2-east",
      type: "window",
      zoneId: "zone-right-bedrooms",
      points: [
        [OUTER_WIDTH, 700],
        [OUTER_WIDTH, 1800],
      ],
    },
    {
      id: "window-bedroom2-north",
      type: "window",
      zoneId: "zone-right-bedrooms",
      points: [
        [P_LIVING_EAST + 400, 0],
        [P_LIVING_EAST + 1400, 0],
      ],
    },
    {
      id: "window-bedroom3-east",
      type: "window",
      zoneId: "zone-right-bedrooms",
      points: [
        [OUTER_WIDTH, 3100],
        [OUTER_WIDTH, 4200],
      ],
    },
    {
      id: "window-bedroom3-south",
      type: "window",
      zoneId: "zone-right-bedrooms",
      points: [
        [P_LIVING_EAST + 900, OUTER_DEPTH],
        [INNER_X1 - 400, OUTER_DEPTH],
      ],
    },

    // ==================================================================
    // Furniture — bathroom
    // ==================================================================
    {
      id: "f-bathtub",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "bathtub",
      xMm: 220,
      yMm: 220,
      widthMm: 1300,
      heightMm: 700,
    },
    {
      id: "f-bath-sink",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "sink-bathroom",
      xMm: 220,
      yMm: 1000,
      widthMm: 480,
      heightMm: 420,
    },
    {
      id: "f-toilet",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "toilet",
      xMm: 900,
      yMm: 1000,
      widthMm: 480,
      heightMm: 600,
    },

    // ==================================================================
    // Furniture — bedroom 1
    // ==================================================================
    {
      id: "f-bed1",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "bed-double",
      xMm: 220,
      yMm: 2600,
      widthMm: 1400,
      heightMm: 2000,
    },
    {
      id: "f-nightstand1-left",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "nightstand",
      xMm: 220,
      yMm: 2600,
      widthMm: 400,
      heightMm: 400,
    },
    {
      id: "f-nightstand1-right",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "nightstand",
      xMm: 1220,
      yMm: 2600,
      widthMm: 400,
      heightMm: 400,
    },
    {
      id: "f-wardrobe1",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "wardrobe",
      xMm: 220,
      yMm: 1950,
      widthMm: 1600,
      heightMm: 550,
    },

    // ==================================================================
    // Furniture — kitchen (part of the open living area → zone-centre)
    // Kitchen strip sits against the north wall from the BR1 east partition
    // out into the centre zone — spans the zone and stretches with it.
    // ==================================================================
    {
      id: "f-kitchen-counter",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "kitchen-counter",
      xMm: P_WETCORE_EAST + 120,
      yMm: INNER_Y0 + 80,
      widthMm: 2100,
      heightMm: 650,
    },
    {
      id: "f-fridge",
      type: "furniture",
      zoneId: "zone-wet-core",
      subtype: "fridge",
      xMm: P_BATHROOM_EAST + 60,
      yMm: INNER_Y0 + 120,
      widthMm: 600,
      heightMm: 580,
    },
    {
      id: "f-kitchen-sink",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "sink-kitchen",
      xMm: P_WETCORE_EAST + 350,
      yMm: INNER_Y0 + 180,
      widthMm: 700,
      heightMm: 450,
    },
    {
      id: "f-stove",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "stove",
      xMm: P_WETCORE_EAST + 1300,
      yMm: INNER_Y0 + 180,
      widthMm: 600,
      heightMm: 550,
    },

    // ==================================================================
    // Furniture — TV (interior face of living-east partition, living room side)
    // ==================================================================
    {
      id: "f-tv",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "tv",
      xMm: P_LIVING_EAST - 80,
      yMm: 2000,
      widthMm: 80,
      heightMm: 900,
    },

    // ==================================================================
    // Furniture — living room
    // ==================================================================
    {
      id: "f-dining-table",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "dining-table",
      xMm: P_LIVING_EAST - 1700,
      yMm: INNER_Y0 + 400,
      widthMm: 1400,
      heightMm: 1200,
    },
    {
      id: "f-dining-chair-1",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "dining-chair",
      xMm: P_LIVING_EAST - 1850,
      yMm: INNER_Y0 + 500,
      widthMm: 420,
      heightMm: 420,
    },
    {
      id: "f-dining-chair-2",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "dining-chair",
      xMm: P_LIVING_EAST - 1850,
      yMm: INNER_Y0 + 1150,
      widthMm: 420,
      heightMm: 420,
    },
    {
      id: "f-dining-chair-3",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "dining-chair",
      xMm: P_LIVING_EAST - 600,
      yMm: INNER_Y0 + 500,
      widthMm: 420,
      heightMm: 420,
    },
    {
      id: "f-dining-chair-4",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "dining-chair",
      xMm: P_LIVING_EAST - 600,
      yMm: INNER_Y0 + 1150,
      widthMm: 420,
      heightMm: 420,
    },
    {
      id: "f-sofa",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "sofa",
      xMm: P_WETCORE_EAST + 1000,
      yMm: 2200,
      widthMm: 1600,
      heightMm: 800,
    },
    {
      id: "f-coffee-table",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "generic",
      xMm: P_WETCORE_EAST + 1100,
      yMm: 1550,
      widthMm: 800,
      heightMm: 500,
    },

    // ==================================================================
    // Furniture — veranda lounge seating
    // ==================================================================
    {
      id: "f-veranda-chair-left",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "armchair",
      xMm: VERANDA_X0 + 200,
      yMm: VERANDA_Y0 + 300,
      widthMm: 700,
      heightMm: 700,
    },
    {
      id: "f-veranda-table",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "generic",
      xMm: VERANDA_X0 + 1000,
      yMm: VERANDA_Y0 + 400,
      widthMm: 500,
      heightMm: 500,
    },
    {
      id: "f-veranda-chair-right",
      type: "furniture",
      zoneId: "zone-centre",
      subtype: "armchair",
      xMm: VERANDA_X0 + 1600,
      yMm: VERANDA_Y0 + 300,
      widthMm: 700,
      heightMm: 700,
    },

    // ==================================================================
    // Furniture — bedroom 2 (top-right)
    // ==================================================================
    {
      id: "f-bed2",
      type: "furniture",
      zoneId: "zone-right-bedrooms",
      subtype: "bed-single",
      xMm: INNER_X1 - 1000,
      yMm: 250,
      widthMm: 900,
      heightMm: 2000,
    },
    {
      id: "f-nightstand2-left",
      type: "furniture",
      zoneId: "zone-right-bedrooms",
      subtype: "nightstand",
      xMm: INNER_X1 - 1000,
      yMm: 250,
      widthMm: 400,
      heightMm: 400,
    },
    {
      id: "f-nightstand2-right",
      type: "furniture",
      zoneId: "zone-right-bedrooms",
      subtype: "nightstand",
      xMm: INNER_X1 - 500,
      yMm: 250,
      widthMm: 400,
      heightMm: 400,
    },
    {
      id: "f-wardrobe2",
      type: "furniture",
      zoneId: "zone-right-bedrooms",
      subtype: "wardrobe",
      xMm: P_LIVING_EAST + 150,
      yMm: 250,
      widthMm: 550,
      heightMm: 1500,
    },

    // ==================================================================
    // Furniture — bedroom 3 (bottom-right)
    // ==================================================================
    {
      id: "f-bed3",
      type: "furniture",
      zoneId: "zone-right-bedrooms",
      subtype: "bed-single",
      xMm: INNER_X1 - 1000,
      yMm: P_BR2_SOUTH + 300,
      widthMm: 900,
      heightMm: 2000,
    },
    {
      id: "f-nightstand3-left",
      type: "furniture",
      zoneId: "zone-right-bedrooms",
      subtype: "nightstand",
      xMm: INNER_X1 - 1000,
      yMm: P_BR2_SOUTH + 300,
      widthMm: 400,
      heightMm: 400,
    },
    {
      id: "f-nightstand3-right",
      type: "furniture",
      zoneId: "zone-right-bedrooms",
      subtype: "nightstand",
      xMm: INNER_X1 - 500,
      yMm: P_BR2_SOUTH + 300,
      widthMm: 400,
      heightMm: 400,
    },
    {
      id: "f-wardrobe3",
      type: "furniture",
      zoneId: "zone-right-bedrooms",
      subtype: "wardrobe",
      xMm: P_LIVING_EAST + 150,
      yMm: INNER_Y1 - 600,
      widthMm: 1500,
      heightMm: 450,
    },

    // ==================================================================
    // Room labels + areas (static — labels re-centre with their zone)
    // ==================================================================
    {
      id: "label-bathroom",
      type: "room-label",
      zoneId: "zone-wet-core",
      xMm: (INNER_X0 + P_BATHROOM_EAST) / 2,
      yMm: P_BATHROOM_SOUTH - 400,
      label: "Bathroom",
      areaM2: 3,
    },
    {
      id: "label-bedroom1",
      type: "room-label",
      zoneId: "zone-wet-core",
      xMm: (INNER_X0 + P_WETCORE_EAST) / 2 + 200,
      yMm: 3450,
      label: "Bedroom 1",
      areaM2: 8,
    },
    {
      id: "label-living",
      type: "room-label",
      zoneId: "zone-centre",
      xMm: (P_WETCORE_EAST + P_LIVING_EAST) / 2,
      yMm: 1150,
      label: "Living Room",
      areaM2: 13,
    },
    {
      id: "label-veranda",
      type: "room-label",
      zoneId: "zone-centre",
      xMm: (VERANDA_X0 + VERANDA_X1) / 2,
      yMm: VERANDA_Y1 - 400,
      label: "Veranda",
      areaM2: 4,
    },
    {
      id: "label-veranda-entrance-arrow",
      type: "room-label",
      zoneId: "zone-centre",
      xMm: ENTRANCE_X + ENTRANCE_W / 2 + 300,
      yMm: VERANDA_Y0 + 350,
      label: "▲ Entrance",
    },
    {
      id: "label-bedroom2",
      type: "room-label",
      zoneId: "zone-right-bedrooms",
      xMm: (P_LIVING_EAST + INNER_X1) / 2,
      yMm: 1150,
      label: "Bedroom 2",
      areaM2: 7,
    },
    {
      id: "label-bedroom3",
      type: "room-label",
      zoneId: "zone-right-bedrooms",
      xMm: (P_LIVING_EAST + INNER_X1) / 2,
      yMm: 3100,
      label: "Bedroom 3",
      areaM2: 7,
    },

    // ==================================================================
    // Overall dimensions (outside the building, north + west sides)
    // ==================================================================
    {
      id: "dim-overall-width",
      type: "dimension",
      from: [0, 0],
      to: [OUTER_WIDTH, 0],
      label: "9,246",
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
