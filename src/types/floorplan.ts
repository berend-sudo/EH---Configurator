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

export interface BlockEntity {
  type: "block";
  name: string;
  x: number;
  y: number;
  moveX: boolean;
  refRect: { x: number; y: number }[];
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
