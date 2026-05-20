export interface Vertex {
  x: number;
  y: number;
  moveX: boolean;
  // Wall/room vertices coincident with a window corner are attached to that
  // specific window vertex. At render time, they snap to the window vertex's
  // computed world position so they always track the (capped) window edge.
  attach?: { windowIdx: number; vertexIdx: number };
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

// True circle preserved as native SVG <circle>. Renders cleanly at any
// zoom; tessellating to a 32-gon polyline introduces visible flat sides
// on burner / dial circles.
export interface GeomCircle {
  type: "circle";
  cx: number;
  cy: number;
  r: number;
}

export type BlockGeom = GeomPolyline | GeomSpline | GeomCircle;

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
  /** Non-fatal issues observed during parsing — surfaced for debugging.
   *  Entries describe data the parser preserved but couldn't fully resolve
   *  (e.g. segments that almost closed but stayed open, missing PT zones). */
  warnings?: string[];
}
