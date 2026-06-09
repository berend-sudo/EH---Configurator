// Single source of truth for every brand photo path. Every web call site
// and the server PDF go through here — search for "/brand/" anywhere else
// and the rule has been broken. Regenerate the arrays below when new
// project photos arrive; this is the only edit point.
//
// Index 0 in each typology array is the canonical card frame (the shot
// the configurator hero shows first on switch).
//
// Server-side helpers (filesystem paths for @react-pdf/renderer) live in
// src/lib/server/brand-images.ts so this file can be imported into
// client bundles without webpack tripping on node:path.
import type { TypologyId } from "./typologies";

const BRAND_BASE = "/brand/";

export const BRAND_IMAGES = {
  typology: {
    monopitch: [
      "monopitch1.jpg",
      "monopitch2.jpg",
      "monopitch3.jpg",
      "monopitch4.jpg",
      "monopitch5.jpg",
      "monopitch6.jpg",
    ],
    gable: [
      "gable1.jpg",
      "gable2.jpg",
      "gable3.jpg",
      "gable4.jpg",
      "gable5.jpg",
      "gable6.jpg",
      "gable7.jpg",
    ],
    aframe: [
      "aframe1.jpg",
      "aframe2.jpg",
      "aframe3.jpg",
      "aframe4.jpg",
      "aframe5.jpg",
    ],
    // clerestory7 dropped — byte-identical to clerestory6 (upload dup).
    clerestory: [
      "clerestory1.jpg",
      "clerestory2.jpg",
      "clerestory3.jpg",
      "clerestory4.jpg",
      "clerestory5.jpg",
      "clerestory6.jpg",
    ],
  },
  hero: ["key-hero-1.jpg", "key-hero-2.jpg", "heroimage1.jpg", "heroimage2.jpg"],
  furniture: [
    "furniture1.jpg",
    "furniture2.jpg",
    "furniture3.jpg",
    "furniture4.jpg",
    "furniture5.jpg",
    "furniture6.jpg",
    "furniture7.jpg",
  ],
} as const;

const webSrc = (file: string) => BRAND_BASE + file;

// ── Curated typology photo set (P1/P2) ─────────────────────────────────────
// Exactly three full-home photos per typology, shown 1:1 with the selected
// model rather than rotating from the broader pool. The configurator's
// PhotoCollage reads from here so a selected model always shows photos of
// THAT model — no random fallback, no detail crops.
//
// TODO(curation): the three filenames below are placeholders pulled from
// the existing pool. The marketing team needs to confirm which three
// uncropped, full-home shots best represent each model (and ideally a
// per-subtype override for Gable / A-frame / Clerestory) before launch.
// Subtype-level curation lives in `bySubtype` once provided; until then
// every subtype of a typology shares the typology's three shots.
export const TYPOLOGY_PHOTOS: Record<
  TypologyId,
  { photos: readonly [string, string, string]; bySubtype?: Record<string, readonly [string, string, string]> }
> = {
  monopitch: {
    photos: ["monopitch1.jpg", "monopitch2.jpg", "monopitch3.jpg"],
  },
  gable: {
    photos: ["gable1.jpg", "gable2.jpg", "gable3.jpg"],
  },
  aframe: {
    photos: ["aframe1.jpg", "aframe2.jpg", "aframe3.jpg"],
  },
  clerestory: {
    photos: ["clerestory1.jpg", "clerestory2.jpg", "clerestory3.jpg"],
  },
};

/**
 * Three curated photos as web srcs for a given selection. Subtype override
 * wins when present; otherwise the typology's three shots are returned.
 */
export function typologyPhotosFor(typology: TypologyId, subtype?: string | null): string[] {
  const entry = TYPOLOGY_PHOTOS[typology];
  const set = (subtype && entry.bySubtype?.[subtype]) || entry.photos;
  return set.map(webSrc);
}

export const typologyPhoto = (typology: TypologyId, i = 0): string => {
  const set = BRAND_IMAGES.typology[typology];
  return webSrc(set[i % set.length]);
};
export const heroPhoto = (i = 0): string =>
  webSrc(BRAND_IMAGES.hero[i % BRAND_IMAGES.hero.length]);
export const furniturePhoto = (i = 0): string =>
  webSrc(BRAND_IMAGES.furniture[i % BRAND_IMAGES.furniture.length]);

// ── Randomisation ───────────────────────────────────────────────────────────
// Every image surface (cover, hero, configurator collage, spec ribbon) picks
// from its category/typology pool at random rather than always showing index
// 0. Two modes:
//   • unseeded  → Math.random(), for client surfaces that re-pick per mount.
//   • seeded    → a deterministic PRNG keyed off a string (e.g. the design
//                 reference), so the server PDF varies across designs but is
//                 stable when the same design is regenerated.
// The samplers return raw filenames; client (webSrc) and server (filesystem)
// helpers map them to their respective path form.

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

// mulberry32 — tiny, fast, good-enough PRNG. Returns floats in [0, 1).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randFor(seed?: string): () => number {
  return seed == null ? Math.random : mulberry32(hashStr(seed));
}

// n distinct items (no repeat until the pool is exhausted, then it wraps).
function sampleN<T>(arr: readonly T[], n: number, rand: () => number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  while (out.length < n) out.push(arr[out.length % arr.length]); // n > pool: wrap
  return out;
}

/** Raw filenames — distinct random typology shots. Shared by client + server. */
export function sampleTypologyFiles(typology: TypologyId, n: number, seed?: string): string[] {
  return sampleN(BRAND_IMAGES.typology[typology], n, randFor(seed));
}
/** Raw filenames — distinct random furniture/interior shots. */
export function sampleFurnitureFiles(n: number, seed?: string): string[] {
  return sampleN(BRAND_IMAGES.furniture, n, randFor(seed));
}
/** Raw filenames — distinct random hero shots. */
export function sampleHeroFiles(n: number, seed?: string): string[] {
  return sampleN(BRAND_IMAGES.hero, n, randFor(seed));
}

/** n random typology photos as web srcs (distinct). */
export const randomTypologyPhotos = (typology: TypologyId, n: number, seed?: string): string[] =>
  sampleTypologyFiles(typology, n, seed).map(webSrc);
/** One random hero photo as a web src. */
export const randomHeroPhoto = (seed?: string): string => webSrc(sampleHeroFiles(1, seed)[0]);
/** n random furniture photos as web srcs (distinct). */
export const randomFurniturePhotos = (n: number, seed?: string): string[] =>
  sampleFurnitureFiles(n, seed).map(webSrc);
