export interface Vertex {
  x: number;
  y: number;
  moveX: boolean;
}

export interface PolylineEntity {
  type: "polyline";
  closed: boolean;
  vertices: Vertex[];
}

// Geometry primitives inside a block definition (local coords, no moveX)
export interface GeomLine {
  type: "line";
  x1: number; y1: number;
  x2: number; y2: number;
}

export interface GeomArc {
  type: "arc";
  cx: number; cy: number; r: number;
  startAngle: number; // degrees
  endAngle: number;   // degrees
}

export interface GeomCircle {
  type: "circle";
  cx: number; cy: number; r: number;
}

export interface GeomPolyline {
  type: "polyline";
  closed: boolean;
  vertices: { x: number; y: number }[];
}

export interface GeomSpline {
  type: "spline";
  points: { x: number; y: number }[]; // fit/control points, rendered as smooth path
}

export type BlockGeom = GeomLine | GeomArc | GeomCircle | GeomPolyline | GeomSpline;

export interface BlockEntity {
  type: "block";
  name: string;
  x: number;
  y: number;
  rotation: number; // degrees, CCW in DXF space
  moveX: boolean;
  geom: BlockGeom[];
}

export type FloorplanEntity = PolylineEntity | BlockEntity;

export interface FloorplanLayer {
  name: string;
  entities: FloorplanEntity[];
}

export interface FloorplanJSON {
  id: string;
  name: string;
  baseWidth: number;
  baseDepth: number;
  minDelta: number;
  maxDelta: number;
  layers: FloorplanLayer[];
}
