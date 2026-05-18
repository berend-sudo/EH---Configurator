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

export interface GeomPolyline {
  type: "polyline";
  closed: boolean;
  vertices: { x: number; y: number }[];
}

export interface GeomSpline {
  type: "spline";
  points: { x: number; y: number }[];
}

export type BlockGeom = GeomPolyline | GeomSpline;

export interface BlockEntity {
  type: "block";
  name: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  moveX: boolean;
  tl: { x: number; y: number } | null; // top-left world coord at delta=0
  tr: { x: number; y: number } | null; // top-right world coord at delta=0
  depthVec: { x: number; y: number };  // world vector from TL-edge to bottom edge
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
