// Server-side photo path helpers for @react-pdf/renderer. The PDF reads
// each file off disk at generation time, so it needs an absolute path
// (web src strings won't resolve). The manifest itself lives in
// src/lib/brand-images.ts — this file only adds the filesystem variants.
import path from "path";
import { BRAND_IMAGES } from "@/lib/brand-images";
import type { TypologyId } from "@/lib/typologies";

const brandFile = (file: string) =>
  path.join(process.cwd(), "public", "brand", file);

export const typologyPhotoFile = (typology: TypologyId, i = 0): string => {
  const set = BRAND_IMAGES.typology[typology];
  return brandFile(set[i % set.length]);
};
export const heroPhotoFile = (i = 0): string =>
  brandFile(BRAND_IMAGES.hero[i % BRAND_IMAGES.hero.length]);
export const furniturePhotoFile = (i = 0): string =>
  brandFile(BRAND_IMAGES.furniture[i % BRAND_IMAGES.furniture.length]);
