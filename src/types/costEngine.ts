export type TypologyId =
  | "mono-pitch-4884"
  | "compact-gable-6106"
  | "standard-gable-7326"
  | "large-gable-9768"
  | "standard-clerestory-7326"
  | "large-clerestory-8547"
  | "a-frame-compact-3663"
  | "a-frame-standard-4884"
  | "a-frame-large-6106";

export type ComponentId =
  // Frames
  | "floor-frame-2442x1221"
  | "floor-frame-2442x2442"
  | "floor-frame-2442x3053"
  | "floor-frame-2442x3663"
  | "decking-frame-2442x1221"
  | "decking-frame-2442x2442"
  | "decking-frame-2442x3053"
  | "wall-frame-2442x2654"
  | "wall-frame-3053x2654"
  | "wall-frame-2442x2999"
  | "wall-frame-3053x2999"
  | "partition-wall-frame-per-m1"
  | "facade-cladding-per-m2"
  | "facade-frame-2442x2654"
  | "roof-frame-mono-pitch"
  | "roof-frame-mono-pitch-edge"
  | "roof-frame-compact-gable"
  | "roof-frame-compact-gable-edge"
  | "roof-frame-standard-gable"
  | "roof-frame-standard-gable-edge"
  | "roof-frame-large-gable"
  | "roof-frame-large-gable-edge"
  | "roof-frame-clerestory-upper"
  | "roof-frame-clerestory-upper-edge"
  | "roof-frame-clerestory-lower"
  | "roof-frame-clerestory-lower-edge"
  | "clerestory-frame-2442x420"
  // Aluminium (bulk + per-window itemised)
  | "aluminium-bulk-per-sqm"
  | "entrance-door-950x2388"
  | "terrace-swing-doors-1700x2388"
  | "sliding-doors-1700x2388"
  | "sliding-doors-2300x2388"
  | "sliding-doors-2900x2388"
  | "sliding-doors-3510x2388"
  | "bathroom-window-500x1316"
  | "bathroom-window-900x1316"
  | "sliding-window-1100x1316"
  | "sliding-window-1400x1316"
  | "high-window-1100x1766"
  | "high-window-1700x1766"
  | "full-height-window-500x2366"
  | "full-height-window-1100x2366"
  | "panorama-window-1700x846"
  | "panorama-window-2300x846"
  // Building materials and works
  | "foundation-point"
  | "interior-door"
  | "roof-sheets-per-sqm"
  | "paintworks-per-sqm"
  | "pergola-per-sqm"
  | "cement-boards-per-bathroom"
  | "extra-timber"
  | "smoke-detector"
  | "fire-extinguisher"
  // Project overhead
  | "easy-building-licence-fee"
  | "design-fee-siteplan"
  | "transport-materials-to-workshop"
  | "transport-frames-to-site"
  | "transport-foundation-to-site"
  | "travel-costs-site-team"
  | "accommodation-site-team"
  | "workshop-costs"
  | "unforeseen-costs"
  | "vehicle-tool-maintenance"
  | "project-management"
  | "aftercare-warranty"
  | "account-management"
  | "customer-acquisition"
  | "placement-labour"
  | "cleaning-on-completion"
  // Finishings
  | "electricity"
  | "plumbing"
  | "tiling-bathroom"
  | "sanitary-wares"
  | "kitchen-block";

export interface ComponentCost {
  id: ComponentId;
  name: string;
  usdUnit: number;
  ugxUnit: number;
  /**
   * Flat USD surcharge added whenever this component is part of the build,
   * independent of the quantity. Mirrors Excel quirks like row 123
   * (roof sheets: $A$ × $C$ + 150 — fixed accessories like ridges/screws/gutters).
   */
  fixedExtraUsd?: number;
}

export type ComponentAmounts = Partial<Record<ComponentId, number>>;

export interface CostInput {
  /** Optional metadata — affects nothing in Phase 1, captured for downstream phases. */
  typology?: TypologyId;
  /** Per-component amount overrides. In Phase 1 callers supply the full set explicitly. */
  componentAmounts: ComponentAmounts;
  /** Gross floor area in sqm — only used for `pricePerSqmUgxIncVat` derivation. */
  gfaSqm: number;
}

export interface ComponentLineItem {
  id: ComponentId;
  name: string;
  amount: number;
  unitCostUsd: number;
  fixedExtraUsd: number;
  totalUsd: number;
}

export interface CostBreakdown {
  gfaSqm: number;
  costUsdExVat: number;
  marginUsd: number;
  salesPriceUsdExVat: number;
  vatUsd: number;
  priceUsdIncVat: number;
  /**
   * UGX equivalent of `costUsdExVat` rounded to the nearest whole UGX.
   * Mirrors Excel B48, which the sheet labels "Price in UGX ex VAT"
   * but literally computes as `cost × USD_TO_UGX`. Not a sales price.
   */
  costUgxRounded: number;
  marginUgx: number;
  vatUgx: number;
  priceUgxIncVat: number;
  /** Rounded UP to the nearest 100,000 UGX for client-facing display. */
  priceUgxIncVatRounded: number;
  pricePerSqmUgxIncVat: number;
  componentBreakdown: ComponentLineItem[];
}
