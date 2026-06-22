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
  // Full per-typology photo pools (random samplers draw from these). The
  // monopitch/gable shots are named by the model they depict
  // (<subtype>-<bedrooms>-<n>); the curated TYPOLOGY_PHOTO_SETS below pick the
  // closest match per selection. Drop a new shot in public/brand/, add it
  // here (and to a set below) — this is the only edit point.
  typology: {
    monopitch: [
      "monopitch-studio-1.jpg",
      "monopitch-studio-2.jpg",
      "monopitch-studio-3.jpg",
      "monopitch-1br-1.jpg",
      "monopitch-1br-2.jpg",
      "monopitch-1br-3.jpg",
      "monopitch-2br-1.jpg",
      "monopitch-2br-2.jpg",
      "monopitch-2br-3.jpg",
      "monopitch-3br-1.jpg",
      "monopitch-3br-2.jpg",
      "monopitch-3br-3.jpg",
    ],
    gable: [
      "gable-compact-1.jpg",
      "gable-compact-2.jpg",
      "gable-compact-3.jpg",
      "gable-standard-1br-1.jpg",
      "gable-standard-1br-2.jpg",
      "gable-standard-1br-3.jpg",
      "gable-standard-3br-1.jpg",
      "gable-standard-3br-2.jpg",
      "gable-standard-3br-3.jpg",
      "gable-large-3br-1.jpg",
      "gable-large-3br-2.jpg",
      "gable-large-3br-3.jpg",
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

// ── Curated typology photo sets (P1/P2) ────────────────────────────────────
// Three full-home photos shown 1:1 with the selected model rather than
// rotating from the broader pool, so a selection always shows photos of THAT
// model — no detail crops. Sets are tagged with the model they depict
// (subtype + bedroom count); `pickPhotoSet` resolves a selection to the
// closest set with a pickPlan-style fallback:
//   exact subtype + nearest bedrooms → any set in the typology.
// A `subtype`/`bedrooms` left undefined means "represents any" (e.g.
// A-frame and Clerestory, whose new photos aren't model-split yet).
export interface TypologyPhotoSet {
  /** Subtype id this set depicts; omit when it stands in for any subtype. */
  subtype?: string;
  /** Bedroom count this set depicts; omit when it stands in for any count. */
  bedrooms?: number;
  photos: readonly [string, string, string];
}

export const TYPOLOGY_PHOTO_SETS: Record<TypologyId, readonly TypologyPhotoSet[]> = {
  monopitch: [
    { bedrooms: 0, photos: ["monopitch-studio-1.jpg", "monopitch-studio-2.jpg", "monopitch-studio-3.jpg"] },
    { bedrooms: 1, photos: ["monopitch-1br-1.jpg", "monopitch-1br-2.jpg", "monopitch-1br-3.jpg"] },
    { bedrooms: 2, photos: ["monopitch-2br-1.jpg", "monopitch-2br-2.jpg", "monopitch-2br-3.jpg"] },
    { bedrooms: 3, photos: ["monopitch-3br-1.jpg", "monopitch-3br-2.jpg", "monopitch-3br-3.jpg"] },
  ],
  gable: [
    { subtype: "compact", photos: ["gable-compact-1.jpg", "gable-compact-2.jpg", "gable-compact-3.jpg"] },
    { subtype: "standard", bedrooms: 1, photos: ["gable-standard-1br-1.jpg", "gable-standard-1br-2.jpg", "gable-standard-1br-3.jpg"] },
    { subtype: "standard", bedrooms: 3, photos: ["gable-standard-3br-1.jpg", "gable-standard-3br-2.jpg", "gable-standard-3br-3.jpg"] },
    { subtype: "large", bedrooms: 3, photos: ["gable-large-3br-1.jpg", "gable-large-3br-2.jpg", "gable-large-3br-3.jpg"] },
  ],
  // A-frame / Clerestory: no model-split photos yet — one set stands in for
  // every subtype/bedroom count until per-model shots arrive.
  aframe: [
    { photos: ["aframe1.jpg", "aframe2.jpg", "aframe3.jpg"] },
  ],
  clerestory: [
    { photos: ["clerestory1.jpg", "clerestory2.jpg", "clerestory3.jpg"] },
  ],
};

/**
 * Resolve a selection to its closest curated photo set. Mirrors pickPlan's
 * tiering: a set whose subtype matches (or is unscoped) wins over a mismatch,
 * then the nearest bedroom count breaks the tie.
 */
export function pickPhotoSet(
  typology: TypologyId,
  subtype?: string | null,
  bedrooms?: number | null,
): readonly [string, string, string] {
  const sets = TYPOLOGY_PHOTO_SETS[typology];
  let best = sets[0];
  let bestScore = Infinity;
  for (const set of sets) {
    // Subtype tier: exact match or unscoped set beats a different subtype.
    const subTier = set.subtype == null || set.subtype === subtype ? 0 : 1;
    // Bedroom distance within the tier (unknown on either side = neutral).
    const brDist =
      set.bedrooms == null || bedrooms == null ? 0.5 : Math.abs(set.bedrooms - bedrooms);
    const score = subTier * 1000 + brDist;
    if (score < bestScore) {
      bestScore = score;
      best = set;
    }
  }
  return best.photos;
}

/**
 * Three curated photos as web srcs for a given selection, matched to the
 * model's subtype and bedroom count where model-specific shots exist.
 */
export function typologyPhotosFor(
  typology: TypologyId,
  subtype?: string | null,
  bedrooms?: number | null,
): string[] {
  return pickPhotoSet(typology, subtype, bedrooms).map(webSrc);
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
