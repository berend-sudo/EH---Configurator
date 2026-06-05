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

export const typologyPhoto = (typology: TypologyId, i = 0): string => {
  const set = BRAND_IMAGES.typology[typology];
  return webSrc(set[i % set.length]);
};
export const heroPhoto = (i = 0): string =>
  webSrc(BRAND_IMAGES.hero[i % BRAND_IMAGES.hero.length]);
export const furniturePhoto = (i = 0): string =>
  webSrc(BRAND_IMAGES.furniture[i % BRAND_IMAGES.furniture.length]);
