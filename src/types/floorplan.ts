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

// All block geometry is flattened to world-space polylines after applying
// scale + rotation + translation. Arcs and circles are tessellated into
// polylines; this makes scale (including negative/mirror) and rotation
// safe to apply per-vertex without fragile angle math.
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
