import type { FurnitureSubtype } from "@/types/floorPlan";

export interface FurnitureTemplate {
  id: string;
  subtype: FurnitureSubtype;
  label: string;
  widthMm: number;
  heightMm: number;
}

/**
 * Standard furniture dimensions (mm) for the drag-and-drop library.
 * Dimensions per the admin spec.
 */
export const FURNITURE_LIBRARY: readonly FurnitureTemplate[] = [
  { id: "bed-single", subtype: "bed-single", label: "Single bed", widthMm: 900, heightMm: 2000 },
  { id: "bed-double", subtype: "bed-double", label: "Double bed", widthMm: 1400, heightMm: 2000 },
  { id: "wardrobe", subtype: "wardrobe", label: "Wardrobe", widthMm: 600, heightMm: 1800 },
  { id: "dining-4", subtype: "dining-table", label: "Dining table (4)", widthMm: 800, heightMm: 1200 },
  { id: "dining-6", subtype: "dining-table", label: "Dining table (6)", widthMm: 800, heightMm: 1800 },
  { id: "dining-chair", subtype: "dining-chair", label: "Dining chair", widthMm: 450, heightMm: 450 },
  { id: "sofa-2", subtype: "sofa", label: "Sofa (2 seat)", widthMm: 800, heightMm: 1600 },
  { id: "sofa-3", subtype: "sofa", label: "Sofa (3 seat)", widthMm: 800, heightMm: 2200 },
  { id: "armchair", subtype: "armchair", label: "Armchair", widthMm: 900, heightMm: 900 },
  { id: "kitchen-counter", subtype: "kitchen-counter", label: "Kitchen counter (per m)", widthMm: 600, heightMm: 1000 },
  { id: "sink", subtype: "sink-kitchen", label: "Sink", widthMm: 500, heightMm: 400 },
  { id: "sink-bathroom", subtype: "sink-bathroom", label: "Bathroom sink", widthMm: 500, heightMm: 400 },
  { id: "stove", subtype: "stove", label: "Stove", widthMm: 600, heightMm: 600 },
  { id: "fridge", subtype: "fridge", label: "Fridge", widthMm: 600, heightMm: 600 },
  { id: "toilet", subtype: "toilet", label: "Toilet", widthMm: 400, heightMm: 700 },
  { id: "bathtub", subtype: "bathtub", label: "Bathtub", widthMm: 700, heightMm: 1700 },
  { id: "shower", subtype: "shower", label: "Shower", widthMm: 900, heightMm: 900 },
];

export function findTemplateById(id: string): FurnitureTemplate | undefined {
  return FURNITURE_LIBRARY.find((t) => t.id === id);
}

/** Door widths per the aluminium component list in the Excel. */
export const DOOR_WIDTHS: readonly { mm: number; label: string }[] = [
  { mm: 750, label: "750 mm (interior)" },
  { mm: 800, label: "800 mm (interior)" },
  { mm: 900, label: "900 mm (interior)" },
  { mm: 950, label: "950 mm (entrance)" },
  { mm: 1700, label: "1700 mm (sliding/terrace)" },
  { mm: 2300, label: "2300 mm (sliding)" },
  { mm: 2900, label: "2900 mm (sliding)" },
  { mm: 3510, label: "3510 mm (sliding)" },
];

export const WINDOW_WIDTHS: readonly { mm: number; label: string }[] = [
  { mm: 500, label: "500 mm (bathroom)" },
  { mm: 900, label: "900 mm (bathroom)" },
  { mm: 1100, label: "1100 mm (sliding/high)" },
  { mm: 1400, label: "1400 mm (sliding)" },
  { mm: 1700, label: "1700 mm (high/panorama)" },
  { mm: 2300, label: "2300 mm (panorama)" },
];
