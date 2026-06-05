// Room layer → display name + colour classification. Single source of truth
// shared by the on-screen plan (FloorplanSVG), the PDF legend (design-pdf via
// the submit route), and anywhere else that groups rooms. Pure and
// dependency-free so it's safe in both client and server bundles.

export type RoomColorKey = "living" | "bath" | "terrace";

// Canonical, sentence-case room labels. The DXF authoring tool writes
// space-separated codes like "Bed Room" / "Bath Room" / "Living Room";
// normalise them here so every surface (on-screen plan, PDF legend, email)
// inherits the brand-voice form ("Bedroom", "Bathroom", "Living room").
const LABEL_MAP: Record<string, string> = {
  "Bed Room": "Bedroom",
  "Bedroom": "Bedroom",
  "Bath Room": "Bathroom",
  "Bathroom": "Bathroom",
  "Living Room": "Living room",
  "Living": "Living room",
  "Terrace": "Terrace",
  "Kitchen": "Kitchen",
  "Mezzanine": "Mezzanine",
};

export function roomDisplayName(layerName: string): string {
  if (layerName === "Rooms") return "Room";
  const raw = layerName.replace(/^Rooms\s*[$\-]\s*/, "").trim();
  return LABEL_MAP[raw] ?? raw;
}

export function roomColorKey(layerName: string): RoomColorKey {
  if (layerName.includes("Bath")) return "bath";
  if (layerName.includes("Terrace")) return "terrace";
  return "living";
}
