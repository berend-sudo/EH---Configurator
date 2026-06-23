// Server-side photo path helpers for @react-pdf/renderer. The PDF reads
// each file off disk at generation time, so it needs an absolute path
// (web src strings won't resolve). The manifest itself lives in
// src/lib/brand-images.ts — this file only adds the filesystem variants.
import path from "path";
import {
  BRAND_IMAGES,
  pickPhotoSet,
  sampleFurnitureFiles,
  sampleHeroFiles,
  sampleTypologyFiles,
} from "@/lib/brand-images";
import type { TypologyId } from "@/lib/typologies";

const brandFile = (file: string) =>
  path.join(process.cwd(), "public", "brand", file);

/**
 * Curated typology photos as absolute filesystem paths for @react-pdf
 * (P1/P2), matched to the model's subtype and bedroom count where
 * model-specific shots exist.
 */
export function typologyPhotoFilesFor(
  typology: TypologyId,
  subtype?: string | null,
  bedrooms?: number | null,
): string[] {
  return pickPhotoSet(typology, subtype, bedrooms).map(brandFile);
}

export const typologyPhotoFile = (typology: TypologyId, i = 0): string => {
  const set = BRAND_IMAGES.typology[typology];
  return brandFile(set[i % set.length]);
};
export const heroPhotoFile = (i = 0): string =>
  brandFile(BRAND_IMAGES.hero[i % BRAND_IMAGES.hero.length]);
export const furniturePhotoFile = (i = 0): string =>
  brandFile(BRAND_IMAGES.furniture[i % BRAND_IMAGES.furniture.length]);

// ── Seeded random variants (filesystem paths for @react-pdf) ────────────────
// Seed by the design reference so the PDF varies across designs but is stable
// when the same design is regenerated/re-sent.
export const randomTypologyPhotoFile = (typology: TypologyId, seed?: string): string =>
  brandFile(sampleTypologyFiles(typology, 1, seed)[0]);
export const randomFurniturePhotoFiles = (n: number, seed?: string): string[] =>
  sampleFurnitureFiles(n, seed).map(brandFile);
export const randomHeroPhotoFile = (seed?: string): string =>
  brandFile(sampleHeroFiles(1, seed)[0]);
