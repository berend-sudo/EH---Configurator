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
}

export type FloorPlanElement =
  | WallElement
  | RoomFillElement
  | DoorElement
  | WindowElement
  | FurnitureElement
  | RoomLabelElement
  | DimensionElement;

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
}

export interface RoomLabelElement extends BaseElement {
  type: "room-label";
  xMm: number;
  yMm: number;
  label: string;
  /** Optional area annotation (m²). */
  areaM2?: number;
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
