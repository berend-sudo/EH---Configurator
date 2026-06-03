// Room layer → display name + colour classification. Single source of truth
// shared by the on-screen plan (FloorplanSVG), the PDF legend (design-pdf via
// the submit route), and anywhere else that groups rooms. Pure and
// dependency-free so it's safe in both client and server bundles.

export type RoomColorKey = "living" | "bath" | "terrace";

export function roomDisplayName(layerName: string): string {
  if (layerName === "Rooms") return "Room";
  return layerName.replace(/^Rooms\s*[$\-]\s*/, "");
}

export function roomColorKey(layerName: string): RoomColorKey {
  if (layerName.includes("Bath")) return "bath";
  if (layerName.includes("Terrace")) return "terrace";
  return "living";
}
