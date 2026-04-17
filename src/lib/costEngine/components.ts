import type { ComponentCost, ComponentId } from "@/types/costEngine";

/**
 * Component cost table — extracted from
 *   "Copy Berend of Easy Housing - Calculation Template 2026.xlsx"
 *   sheet "Project Costs", rows 68–159.
 *
 * Each entry: USD unit cost (col C), UGX unit cost (col I) and an optional
 * fixed surcharge added per build (Excel quirk: row 123 roof sheets has
 * `D = A × C + 150` for ridges/screws/gutters that don't scale per sqm).
 *
 * UGX values are persisted alongside USD so callers can spot-check the
 * 3700 multiplier; see `tests/costEngine/components.test.ts`.
 */
export const COMPONENT_COSTS: readonly ComponentCost[] = [
  // === Frames (rows 68–94) ===
  { id: "floor-frame-2442x1221", name: "Floor frame 2442 x 1221", usdUnit: 57.06174793, ugxUnit: 211128.4674 },
  { id: "floor-frame-2442x2442", name: "Floor frame 2442 x 2442", usdUnit: 93.87853889, ugxUnit: 347350.5939 },
  { id: "floor-frame-2442x3053", name: "Floor frame 2442 x 3053", usdUnit: 118.4126158, ugxUnit: 438126.6783 },
  { id: "floor-frame-2442x3663", name: "Floor frame 2442 x 3663", usdUnit: 118.4126158, ugxUnit: 438126.6783 },
  { id: "decking-frame-2442x1221", name: "Decking frame 2442 x 1221", usdUnit: 52.82110808, ugxUnit: 195438.0999 },
  { id: "decking-frame-2442x2442", name: "Decking frame 2442 x 2442", usdUnit: 87.28659097, ugxUnit: 322960.3866 },
  { id: "decking-frame-2442x3053", name: "Decking frame 2442 x 3053", usdUnit: 104.4135554, ugxUnit: 386330.155 },
  { id: "wall-frame-2442x2654", name: "Wall frame 2442 x 2654", usdUnit: 61.86247447, ugxUnit: 228891.1555 },
  { id: "wall-frame-3053x2654", name: "Wall frame 3053 x 2654", usdUnit: 75.25654709, ugxUnit: 278449.2242 },
  { id: "wall-frame-2442x2999", name: "Wall frame 2442 x 2999", usdUnit: 66.17791326, ugxUnit: 244858.279 },
  { id: "wall-frame-3053x2999", name: "Wall frame 3053 x 2999", usdUnit: 80.53819307, ugxUnit: 297991.3143 },
  { id: "partition-wall-frame-per-m1", name: "Partition wall frame per m1", usdUnit: 48.24853346, ugxUnit: 178519.5738 },
  { id: "facade-cladding-per-m2", name: "Facade per m2 - vertical cladding", usdUnit: 10.58321561, ugxUnit: 39157.89774 },
  { id: "facade-frame-2442x2654", name: "Facade frame 2442 x 2654 (vertical cladding)", usdUnit: 69.89179, ugxUnit: 258599.623 },
  { id: "roof-frame-mono-pitch", name: "Roof frame 1221 x 5685 (mono pitch)", usdUnit: 81.83841508, ugxUnit: 302802.1358 },
  { id: "roof-frame-mono-pitch-edge", name: "Roof frame 1598 x 5685 (mono pitch edge)", usdUnit: 133.5948698, ugxUnit: 494301.0182 },
  { id: "roof-frame-compact-gable", name: "Roof frame 1221 x 3574 (compact gable)", usdUnit: 64.20204674, ugxUnit: 237547.5729 },
  { id: "roof-frame-compact-gable-edge", name: "Roof frame 1689 x 3574 (compact gable edge)", usdUnit: 101.3190619, ugxUnit: 374880.529 },
  { id: "roof-frame-standard-gable", name: "Roof frame 1221 x 4194 (standard gable)", usdUnit: 67.44515885, ugxUnit: 249547.0878 },
  { id: "roof-frame-standard-gable-edge", name: "Roof frame 1689 x 4194 (standard gable edge)", usdUnit: 108.471966, ugxUnit: 401346.2743 },
  { id: "roof-frame-large-gable", name: "Roof frame 1221 x 5435 (large gable)", usdUnit: 83.18532308, ugxUnit: 307785.6954 },
  { id: "roof-frame-large-gable-edge", name: "Roof frame 1689 x 5435 (large gable edge)", usdUnit: 133.5948698, ugxUnit: 494301.0182 },
  { id: "roof-frame-clerestory-upper", name: "Roof frame 1221 x 5780 (clerestory upper)", usdUnit: 88.57295508, ugxUnit: 327719.9338 },
  { id: "roof-frame-clerestory-upper-edge", name: "Roof frame 1689 x 5780 (clerestory upper edge)", usdUnit: 143.9261771, ugxUnit: 532526.8555 },
  { id: "roof-frame-clerestory-lower", name: "Roof frame 1221 x 4194 (clerestory lower)", usdUnit: 67.27623085, ugxUnit: 248922.0542 },
  { id: "roof-frame-clerestory-lower-edge", name: "Roof frame 1689 x 4194 (clerestory lower edge)", usdUnit: 110.3194684, ugxUnit: 408182.0332 },
  { id: "clerestory-frame-2442x420", name: "Clerestory frame 2442 x 420", usdUnit: 40.33466245, ugxUnit: 149238.2511 },

  // === Aluminium itemised + bulk (rows 99–115) ===
  { id: "entrance-door-950x2388", name: "Entrance door 950 x 2388", usdUnit: 362.976, ugxUnit: 1343011.2 },
  { id: "terrace-swing-doors-1700x2388", name: "Terrace swing doors 1700 x 2388", usdUnit: 649.536, ugxUnit: 2403283.2 },
  { id: "sliding-doors-1700x2388", name: "Sliding doors 1700 x 2388", usdUnit: 649.536, ugxUnit: 2403283.2 },
  { id: "sliding-doors-2300x2388", name: "Sliding doors 2300 x 2388", usdUnit: 878.784, ugxUnit: 3251500.8 },
  { id: "sliding-doors-2900x2388", name: "Sliding doors 2900 x 2388", usdUnit: 1108.032, ugxUnit: 4099718.4 },
  { id: "sliding-doors-3510x2388", name: "Sliding doors 3510 x 2388", usdUnit: 1341.1008, ugxUnit: 4962072.96 },
  { id: "bathroom-window-500x1316", name: "Bathroom window 500 x 1316", usdUnit: 105.28, ugxUnit: 389536 },
  { id: "bathroom-window-900x1316", name: "Bathroom window 900 x 1316", usdUnit: 189.504, ugxUnit: 701164.8 },
  { id: "sliding-window-1100x1316", name: "Sliding window 1100 x 1316", usdUnit: 231.616, ugxUnit: 856979.2 },
  { id: "sliding-window-1400x1316", name: "Sliding window 1400 x 1316", usdUnit: 294.784, ugxUnit: 1090700.8 },
  { id: "high-window-1100x1766", name: "High window (fixed) 1100 x 1766", usdUnit: 310.816, ugxUnit: 1150019.2 },
  { id: "high-window-1700x1766", name: "High window (fixed) 1700 x 1766", usdUnit: 480.352, ugxUnit: 1777302.4 },
  { id: "full-height-window-500x2366", name: "Full height window (fixed) 500 x 2366", usdUnit: 189.28, ugxUnit: 700336 },
  { id: "full-height-window-1100x2366", name: "Full height window (fixed) 1100 x 2366", usdUnit: 416.416, ugxUnit: 1540739.2 },
  { id: "panorama-window-1700x846", name: "Panorama window (fixed) 1700 x 846", usdUnit: 230.112, ugxUnit: 851414.4 },
  { id: "panorama-window-2300x846", name: "Panorama window (fixed) 2300 x 846", usdUnit: 311.328, ugxUnit: 1151913.6 },
  { id: "aluminium-bulk-per-sqm", name: "Bulk aluminium (per sqm — generic estimate)", usdUnit: 160, ugxUnit: 592000 },

  // === Building materials and works (rows 121–129) ===
  { id: "foundation-point", name: "Foundation point", usdUnit: 43.30013188, ugxUnit: 160210.488 },
  { id: "interior-door", name: "Interior door", usdUnit: 200.0, ugxUnit: 740000 },
  // Roof sheets carry a flat $150 accessories surcharge (Excel D123 = A123×C123+150).
  { id: "roof-sheets-per-sqm", name: "Roof sheets per sqm", usdUnit: 12.23277027, ugxUnit: 45261.25, fixedExtraUsd: 150 },
  { id: "paintworks-per-sqm", name: "Paintworks per sqm (interior + exterior)", usdUnit: 4.324324324, ugxUnit: 16000 },
  { id: "pergola-per-sqm", name: "Pergola per sqm (open, no sheets)", usdUnit: 27.2, ugxUnit: 100640 },
  { id: "cement-boards-per-bathroom", name: "Cement boards per bathroom", usdUnit: 356.8511223, ugxUnit: 1320349.153 },
  { id: "extra-timber", name: "Extra timber (veranda column, entrance step, defects ~0.5 cbm)", usdUnit: 126.0, ugxUnit: 466200 },
  { id: "smoke-detector", name: "Smoke detector", usdUnit: 35.0, ugxUnit: 129500 },
  { id: "fire-extinguisher", name: "Fire extinguisher", usdUnit: 15.0, ugxUnit: 55500 },

  // === Project overhead (rows 134–150) ===
  { id: "easy-building-licence-fee", name: "Easy Building licence fee (technical design, etc.)", usdUnit: 1528.4478, ugxUnit: 5655256.86 },
  { id: "design-fee-siteplan", name: "Design fee (site plan)", usdUnit: 50.0, ugxUnit: 185000 },
  { id: "transport-materials-to-workshop", name: "Transport materials to workshop", usdUnit: 183.413736, ugxUnit: 678630.8232 },
  { id: "transport-frames-to-site", name: "Transport frames to site (≤100 km)", usdUnit: 305.68956, ugxUnit: 1131051.372 },
  { id: "transport-foundation-to-site", name: "Transport foundation blocks + team to site (≤100 km)", usdUnit: 150, ugxUnit: 555000 },
  { id: "travel-costs-site-team", name: "Travel costs site team", usdUnit: 122.275824, ugxUnit: 452420.5488 },
  { id: "accommodation-site-team", name: "Accommodation site team", usdUnit: 122.275824, ugxUnit: 452420.5488 },
  { id: "workshop-costs", name: "Workshop costs (rent, maintenance, cleaning)", usdUnit: 458.53434, ugxUnit: 1696577.058 },
  { id: "unforeseen-costs", name: "Unforeseen costs / risks (labour, transport, theft)", usdUnit: 366.827472, ugxUnit: 1357261.646 },
  { id: "vehicle-tool-maintenance", name: "Maintenance & depreciation: vehicles, tools, safety", usdUnit: 183.413736, ugxUnit: 678630.8232 },
  { id: "project-management", name: "Project management", usdUnit: 366.827472, ugxUnit: 1357261.646 },
  { id: "aftercare-warranty", name: "Aftercare and warranty", usdUnit: 244.551648, ugxUnit: 904841.0976 },
  { id: "account-management", name: "Account management cost", usdUnit: 305.68956, ugxUnit: 1131051.372 },
  { id: "customer-acquisition", name: "Customer acquisition cost", usdUnit: 305.68956, ugxUnit: 1131051.372 },
  { id: "placement-labour", name: "Placement labour cost", usdUnit: 458.53434, ugxUnit: 1696577.058 },
  { id: "cleaning-on-completion", name: "Cleaning upon completion", usdUnit: 30.0, ugxUnit: 111000 },

  // === Finishings package (rows 155–159) ===
  { id: "electricity", name: "Electricity", usdUnit: 1509.55227, ugxUnit: 5585343.4 },
  { id: "plumbing", name: "Plumbing", usdUnit: 683.3642703, ugxUnit: 2528447.8 },
  { id: "tiling-bathroom", name: "Tiling for up to 4 sqm bathrooms", usdUnit: 480, ugxUnit: 1776000 },
  { id: "sanitary-wares", name: "Sanitary wares for bathrooms", usdUnit: 1100, ugxUnit: 4070000 },
  { id: "kitchen-block", name: "Standard kitchen block (no appliances)", usdUnit: 900.0, ugxUnit: 3330000 },
];

const COST_BY_ID = new Map<ComponentId, ComponentCost>(
  COMPONENT_COSTS.map((c) => [c.id, c]),
);

export function getComponentCost(id: ComponentId): ComponentCost {
  const c = COST_BY_ID.get(id);
  if (!c) throw new Error(`Unknown component id: ${id}`);
  return c;
}
