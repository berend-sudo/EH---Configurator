import type { TypologyId } from "./costEngine";

/**
 * Parametric floor plan data model.
 *
 * All coordinates are in millimetres, origin at the top-left of the
 * building envelope (so y grows downward in SVG space). Length runs
 * along the X axis; depth is fixed per typology and runs along Y.
 *
 * Phase 2a renders plans at their `baseLengthMm`. Zone-driven
 * stretching is defined here but consumed in Phase 2b.
 */
export interface FloorPlanModel {
  id: string;
  name: string;
  typology: TypologyId;
  bedrooms: number;
  bathrooms: number;
  /** Fixed depth along Y (mm). */
  depthMm: number;
  /** Default "base" length along X (mm). */
  baseLengthMm: number;
  /** Min / max length along X (mm), from the typology's jump range. */
  minLengthMm: number;
  maxLengthMm: number;
  /** Length-step granularity (0.61 m = 610 mm). */
  jumpSizeMm: number;
  /** SVG viewBox in mm at base length. */
  viewBox: { width: number; height: number };
  /** Every drawable element — walls, rooms, doors, windows, furniture, labels, dims. */
  elements: readonly FloorPlanElement[];
  /** Ordered stretchable zones along the length axis. Used in Phase 2b. */
  zones: readonly Zone[];
  /**
   * Default cost-engine inputs for this standard model. Mirrors Excel
   * "Project Input" cells D27 (partitions), E28 (interior doors), E29
   * (aluminium). The floor-plan page passes these into `deriveAmounts`.
   */
  costDefaults: {
    partitionsM: number;
    interiorDoors: number;
    aluminiumSqm: number;
  };
}

export type FloorPlanElement =
  | WallElement
  | RoomFillElement
  | DoorElement
  | WindowElement
  | FurnitureElement
  | RoomLabelElement
  | DimensionElement
  | TerraceElement;

export interface TerraceElement extends BaseElement {
  type: "terrace";
  /** Closed polygon (mm). */
  points: ReadonlyArray<readonly [number, number]>;
  kind: "veranda" | "pergola";
  railing: "open" | "semi-closed" | "none";
  covered: boolean;
  /** Built from veranda frames — A=1221, B=2442, C=3053 mm. */
  frameA?: number;
  frameB?: number;
  frameC?: number;
  /** Linear metres of railing (derived from polygon perimeter excluding the wall edge by default). */
  railingM?: number;
  label?: string;
}

interface BaseElement {
  id: string;
  /** Which zone this element belongs to, for Phase 2b zone stretching. */
  zoneId?: string;
}

export interface WallElement extends BaseElement {
  type: "wall" | "partition";
  /** Polyline points (mm). */
  points: ReadonlyArray<readonly [number, number]>;
  /** Defaults: wall=88 mm (double-wall); partition=60 mm. */
  thicknessMm?: number;
}

export interface RoomFillElement extends BaseElement {
  type: "room-fill";
  /** Closed polygon in mm. */
  points: ReadonlyArray<readonly [number, number]>;
  fill?: string;
}

export interface DoorElement extends BaseElement {
  type: "door";
  /** Hinge pivot (mm). */
  hingeXMm: number;
  hingeYMm: number;
  /** Leaf length (mm). */
  widthMm: number;
  /** Which quadrant the door swings into from the hinge. */
  swing: "NE" | "NW" | "SE" | "SW";
  /**
   * Axis of the wall this door sits in.
   * "horizontal" — wall runs left-right (e.g. bathroom south wall):
   *   leaf moves along X, arc sweeps along Y.
   * "vertical" — wall runs top-bottom (e.g. bedroom east partition):
   *   leaf moves along Y, arc sweeps along X.
   */
  wallAxis: "horizontal" | "vertical";
}

export interface WindowElement extends BaseElement {
  type: "window";
  /** Two endpoints of the window opening along a wall (mm). */
  points: readonly [readonly [number, number], readonly [number, number]];
}

export type FurnitureSubtype =
  | "bed-double"
  | "bed-single"
  | "sofa"
  | "armchair"
  | "dining-table"
  | "dining-chair"
  | "kitchen-counter"
  | "sink-kitchen"
  | "stove"
  | "fridge"
  | "toilet"
  | "sink-bathroom"
  | "bathtub"
  | "shower"
  | "wardrobe"
  | "nightstand"
  | "tv"
  | "generic";

export interface FurnitureElement extends BaseElement {
  type: "furniture";
  subtype: FurnitureSubtype;
  /** Top-left corner (mm). */
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  /** Degrees, clockwise. Default 0. */
  rotationDeg?: number;
  /**
   * How this furniture item moves when its zone stretches.
   * - "wall-anchored" (default): stays fixed distance from `anchorWallId`.
   * - "centered": re-centers inside its zone.
   * - "proportional": moves with the zone's stretch ratio.
   */
  stretchBehavior?: "wall-anchored" | "centered" | "proportional";
  /** ID of the wall this item anchors to when `stretchBehavior === "wall-anchored"`. */
  anchorWallId?: string;
  /**
   * True if this is a free-form custom rectangle rather than a standard
   * library item — allows editing width/height in the properties panel.
   */
  isCustom?: boolean;
}

export interface RoomLabelElement extends BaseElement {
  type: "room-label";
  xMm: number;
  yMm: number;
  label: string;
  /** Optional area annotation (m²). Recalculated dynamically from fillId when present. */
  areaM2?: number;
  /** Id of the room-fill element whose polygon area drives the live m² annotation. */
  fillId?: string;
}

export interface DimensionElement extends BaseElement {
  type: "dimension";
  /** Dimension line endpoints (mm). */
  from: readonly [number, number];
  to: readonly [number, number];
  /** Printed label — usually the measurement in mm. */
  label: string;
  /**
   * Offset perpendicular to the line (mm). Positive pushes the
   * dimension away from the building; negative pulls it inward.
   */
  offsetMm?: number;
}

export interface Zone {
  id: string;
  /** Stretch priority — zone with order=1 fills to its max first. */
  order: number;
  /** Left boundary at base length (mm). */
  xStartMm: number;
  /** Right boundary at base length (mm). */
  xEndMm: number;
  /** Allowable width range (mm). */
  minWidthMm: number;
  maxWidthMm: number;
  /** Elements that translate with the zone's right edge (Phase 2b). */
  movingElementIds: readonly string[];
  /** Elements that stretch proportionally with the zone (Phase 2b). */
  stretchingElementIds: readonly string[];
}
