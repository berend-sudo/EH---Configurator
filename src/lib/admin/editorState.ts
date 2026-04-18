import type { FloorPlanElement, FloorPlanModel, Zone } from "@/types/floorPlan";
import type { TypologyId } from "@/types/costEngine";

export type EditorTool =
  | "select"
  | "wall"
  | "partition"
  | "door"
  | "window"
  | "label"
  | "zone-line";

export interface BackgroundImage {
  /** Object URL (client-side only). */
  url: string;
  /** Data URL used on save to persist a thumbnail. */
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}

export interface Calibration {
  /** pixels per millimetre — scales the image into mm space. */
  pxPerMm: number;
}

export type CalibrationDraft = {
  points: ReadonlyArray<readonly [number, number]>;
  distanceMm: number | null;
};

export interface CostInputs {
  partitionsM: number;
  interiorDoors: number;
  aluminiumSqm: number;
  extraExtWallSteps: number;
}

export interface FrameCounts {
  A: number;
  B: number;
  C: number;
}

export interface EditorState {
  model: FloorPlanModel;
  tool: EditorTool;
  background: BackgroundImage | null;
  calibration: Calibration | null;
  calibrationDraft: CalibrationDraft;
  /** During wall/partition drawing. */
  wallDraft: readonly [number, number] | null;
  selectedId: string | null;
  previewLengthMm: number;
  costInputs: CostInputs;
  frameCounts: FrameCounts;
  showGrid: boolean;
  showBackground: boolean;
  backgroundOpacity: number;
  /** UI step — 1 upload, 2 calibrate, 3+ edit. */
  step: 1 | 2 | 3;
  aiDetecting: boolean;
  aiError: string | null;
}

export function emptyModel(): FloorPlanModel {
  return {
    id: "new-plan",
    name: "Untitled plan",
    typology: "mono-pitch-4884",
    bedrooms: 1,
    bathrooms: 1,
    depthMm: 4884,
    baseLengthMm: 7326,
    minLengthMm: 4880,
    maxLengthMm: 12200,
    jumpSizeMm: 610,
    viewBox: { width: 7326, height: 4884 },
    zones: [],
    elements: [],
  };
}

export function initialState(): EditorState {
  const model = emptyModel();
  return {
    model,
    tool: "select",
    background: null,
    calibration: null,
    calibrationDraft: { points: [], distanceMm: null },
    wallDraft: null,
    selectedId: null,
    previewLengthMm: model.viewBox.width,
    costInputs: {
      partitionsM: 12.5,
      interiorDoors: 3,
      aluminiumSqm: 10.2,
      extraExtWallSteps: 0,
    },
    frameCounts: { A: 0, B: 1, C: 2 },
    showGrid: true,
    showBackground: true,
    backgroundOpacity: 0.45,
    step: 1,
    aiDetecting: false,
    aiError: null,
  };
}

export function nextId(prefix: string, elements: readonly FloorPlanElement[]): string {
  let n = 1;
  const existing = new Set(elements.map((e) => e.id));
  while (existing.has(`${prefix}-${n}`)) n += 1;
  return `${prefix}-${n}`;
}

export function nextZoneId(zones: readonly Zone[]): string {
  let n = 1;
  const existing = new Set(zones.map((z) => z.id));
  while (existing.has(`zone-${n}`)) n += 1;
  return `zone-${n}`;
}

export const TYPOLOGIES: ReadonlyArray<{ id: TypologyId; label: string; depthMm: number }> = [
  { id: "mono-pitch-4884", label: "Mono Pitch (4884)", depthMm: 4884 },
  { id: "compact-gable-6106", label: "Compact Gable (6106)", depthMm: 6106 },
  { id: "standard-gable-7326", label: "Standard Gable (7326)", depthMm: 7326 },
  { id: "large-gable-9768", label: "Large Gable (9768)", depthMm: 9768 },
  { id: "standard-clerestory-7326", label: "Standard Clerestory (7326)", depthMm: 7326 },
  { id: "large-clerestory-8547", label: "Large Clerestory (8547)", depthMm: 8547 },
  { id: "a-frame-compact-3663", label: "A-Frame Compact (3663)", depthMm: 3663 },
  { id: "a-frame-standard-4884", label: "A-Frame Standard (4884)", depthMm: 4884 },
  { id: "a-frame-large-6106", label: "A-Frame Large (6106)", depthMm: 6106 },
];
