// ============================================================================
// price-book.generated.ts — GENERATED FILE. DO NOT EDIT BY HAND.
// ----------------------------------------------------------------------------
// Source workbook: Easy_Housing_Calculation_Template_June_2026.xlsx
// Generated:       2026-06-23  (formula hash c9f56c6c3b19d88e)
// Regenerate:      npm run sync-pricing -- <path-to-workbook.xlsx>
//
// All rates are NATIVE per country (UGX and KES columns of Price Calc) — Kenya
// figures are NOT derived from UGX. The engine logic lives in engine.ts.
// ============================================================================

import type { PriceBook } from "./price-book-types";

export const PRICE_BOOK: PriceBook = {
  "sourceWorkbook": "Easy_Housing_Calculation_Template_June_2026.xlsx",
  "generatedAt": "2026-06-23",
  "formulaHash": "c9f56c6c3b19d88e",
  "columnWidthsMm": {
    "a": 1221,
    "b": 2442,
    "c": 3053
  },
  "typologies": [
    {
      "workbookLabel": "Mono Pitch (4884)",
      "depthMm": 4972,
      "flankMm": 88,
      "sqmUgx": 1145000,
      "sqmKes": 43500
    },
    {
      "workbookLabel": "Small Gable (4884)",
      "depthMm": 4972,
      "flankMm": 88,
      "sqmUgx": 1255000,
      "sqmKes": 45000
    },
    {
      "workbookLabel": "Compact Gable (6106)",
      "depthMm": 6194,
      "flankMm": 88,
      "sqmUgx": 1145000,
      "sqmKes": 43500
    },
    {
      "workbookLabel": "Standard Gable (7326)",
      "depthMm": 7414,
      "flankMm": 88,
      "sqmUgx": 1145000,
      "sqmKes": 43500
    },
    {
      "workbookLabel": "Large Gable (9768)",
      "depthMm": 9856,
      "flankMm": 88,
      "sqmUgx": 1145000,
      "sqmKes": 43500
    },
    {
      "workbookLabel": "Standard Clerestory (7326)",
      "depthMm": 7414,
      "flankMm": 88,
      "sqmUgx": 1255000,
      "sqmKes": 45000
    },
    {
      "workbookLabel": "Large Clerestory (8547)",
      "depthMm": 8635,
      "flankMm": 88,
      "sqmUgx": 1255000,
      "sqmKes": 45000
    },
    {
      "workbookLabel": "A Frame Compact (3663)",
      "depthMm": 3663,
      "flankMm": 44,
      "sqmUgx": 1145000,
      "sqmKes": 43500
    },
    {
      "workbookLabel": "A Frame Standard (4884)",
      "depthMm": 4884,
      "flankMm": 44,
      "sqmUgx": 1145000,
      "sqmKes": 43500
    },
    {
      "workbookLabel": "A Frame Large (6106)",
      "depthMm": 6106,
      "flankMm": 44,
      "sqmUgx": 1145000,
      "sqmKes": 43500
    }
  ],
  "addons": {
    "interiorDoor": {
      "ugx": 850000,
      "kes": 30000
    },
    "partition": {
      "ugx": 500000,
      "kes": 20000
    },
    "extDoorWindow": {
      "ugx": 600000,
      "kes": 23000
    },
    "extraStair": {
      "ugx": 600000,
      "kes": 32000
    }
  },
  "services": {
    "electricity": {
      "ugxFixed": 2000000,
      "ugxPerSqm": 80000,
      "kesFixed": 80000,
      "kesPerSqm": 3200
    },
    "plumbing": {
      "ugxFixed": 1500000,
      "ugxPerArea": 500000,
      "kesFixed": 60000,
      "kesPerArea": 20000
    },
    "architecture": {
      "ugxPerSqm": 15000,
      "kesPerSqm": 600
    },
    "engineering": {
      "ugxFixed": 200000,
      "ugxPerSqm": 15000,
      "kesFixed": 8000,
      "kesPerSqm": 600
    },
    "distance": {
      "ugxPerSqmKm": 400,
      "kesPerSqmKm": 15
    }
  },
  "options": {
    "burglarBars": {
      "ugx": 250000,
      "kes": 7500
    },
    "terrace": {
      "ugx": 300000,
      "kes": 12000
    },
    "pergola": {
      "ugx": 100000,
      "kes": 4000
    },
    "railingOpen": {
      "ugx": 90000,
      "kes": 3500
    },
    "railingSemi": {
      "ugx": 180000,
      "kes": 7000
    },
    "wheelchairRamp": {
      "ugx": 1500000,
      "kes": 6500
    }
  },
  "quotationItems": [
    {
      "key": "tiles",
      "label": "Tiles",
      "description": "For standard price floor and wall tiles"
    },
    {
      "key": "sanitary",
      "label": "Sanitary wares",
      "description": "Standard list"
    },
    {
      "key": "biodigester",
      "label": "Biodigester",
      "description": "For an average household 2-6 people"
    }
  ],
  "fx": {
    "ugxPerUsd": 3700,
    "kesPerUsd": 130
  }
} as const;
