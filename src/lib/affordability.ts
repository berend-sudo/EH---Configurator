// ----------------------------------------------------------------------------
// affordability.ts — REAL-engine affordability, replacing the old placeholder
// (basePrice + BEDROOM_COST) model that used to live in typologies.ts.
//
// The numbers come from a `PriceIndex`: every available DXF priced through the
// real engine at its MIN width and MAX width, in both currencies. The index is
// built server-side (src/lib/server/price-index.ts) and handed to the client
// as a prop. This module is pure + client-safe — it only reads the index.
//
//   • A plan's CHEAPEST buildable price = its price at min width (`.min`).
//   • The budget slider's bounds = cheapest plan @ min width  ‥  priciest @ max.
//   • A {typology, subtype, bedrooms} is "affordable" when some matching plan's
//     min-width price is within budget.
//
// Prices are NATIVE per currency (UGX / KES) — never FX-converted here.
// ----------------------------------------------------------------------------
import { TYPOLOGIES, TYPOLOGY_ORDER, type Selection, type TypologyId } from "@/lib/typologies";

export type Currency = "UGX" | "KES";

export interface PlanPrice {
  file: string;
  typology: TypologyId;
  subtype: string | null;
  bedrooms: number;
  version: number;
  /** Native indicative budget at min width (`.min`) and max width (`.max`). */
  UGX: { min: number; max: number };
  KES: { min: number; max: number };
}

export interface Bounds {
  min: number;
  max: number;
}

export interface PriceIndex {
  plans: PlanPrice[];
  /** Global cheapest-at-min-width ‥ priciest-at-max-width, per currency. */
  bounds: { UGX: Bounds; KES: Bounds };
}

/** A plan's cheapest buildable price (at min width) in the active currency. */
const cheapest = (p: PlanPrice, c: Currency) => p[c].min;

function matching(index: PriceIndex, typology: TypologyId, subtype?: string | null): PlanPrice[] {
  return index.plans.filter(
    (p) => p.typology === typology && (subtype === undefined || p.subtype === (subtype ?? null)),
  );
}

/** Slider endpoints: the whole catalog's cheapest ‥ most expensive. */
export function budgetBounds(index: PriceIndex | null | undefined, currency: Currency): Bounds {
  if (!index || index.plans.length === 0) return { min: 0, max: 0 };
  return index.bounds[currency];
}

/** Per-typology: is any plan buildable within budget? (true when no index — legacy.) */
export function typologyAffordability(
  index: PriceIndex | null | undefined,
  currency: Currency,
  budget: number,
): Record<TypologyId, boolean> {
  const out = {} as Record<TypologyId, boolean>;
  for (const id of TYPOLOGY_ORDER) {
    out[id] = index ? matching(index, id).some((p) => cheapest(p, currency) <= budget) : true;
  }
  return out;
}

/** Per-subtype affordability map for a typology (empty for subtype-less ones). */
export function subtypeAffordability(
  index: PriceIndex | null | undefined,
  currency: Currency,
  budget: number,
  typology: TypologyId,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const typ = TYPOLOGIES[typology];
  if (!typ.subtypes) return out;
  for (const sub of Object.keys(typ.subtypes)) {
    out[sub] = index ? matching(index, typology, sub).some((p) => cheapest(p, currency) <= budget) : true;
  }
  return out;
}

/** Cheapest affordable subtype id for a typology, or null. */
export function cheapestAffordableSubtype(
  index: PriceIndex | null | undefined,
  currency: Currency,
  budget: number,
  typology: TypologyId,
): string | null {
  const typ = TYPOLOGIES[typology];
  if (!typ.subtypes || !index) return null;
  const ranked = Object.keys(typ.subtypes)
    .map((sub) => {
      const ps = matching(index, typology, sub);
      const price = ps.length ? Math.min(...ps.map((p) => cheapest(p, currency))) : Infinity;
      return [sub, price] as const;
    })
    .filter(([, price]) => price <= budget)
    .sort((a, b) => a[1] - b[1]);
  return ranked.length ? ranked[0][0] : null;
}

/** Cheapest (min-width) price of the plan that best represents this selection +
 *  bedroom count. Infinity when the typology has no plan; 0 when there's no
 *  index (legacy → never gates). */
export function priceForSelection(
  index: PriceIndex | null | undefined,
  currency: Currency,
  sel: Selection,
  bedrooms: number,
): number {
  if (!index) return 0;
  const inTyp = matching(index, sel.typology);
  if (inTyp.length === 0) return Infinity;
  const best = [...inTyp].sort((a, b) => {
    const sa = a.subtype === sel.subtype ? 0 : 1;
    const sb = b.subtype === sel.subtype ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return Math.abs(a.bedrooms - bedrooms) - Math.abs(b.bedrooms - bedrooms);
  })[0];
  return cheapest(best, currency);
}

/** Largest affordable bedroom count among this selection's plans; if none are
 *  affordable, the smallest available count (so the counter keeps a value). */
export function maxAffordableBedrooms(
  index: PriceIndex | null | undefined,
  currency: Currency,
  budget: number,
  sel: Selection,
  fallback: number,
): number {
  if (!index) return 4; // legacy: allow everything
  const ps = matching(index, sel.typology, sel.subtype);
  if (ps.length === 0) return fallback;
  const affordable = ps.filter((p) => cheapest(p, currency) <= budget).map((p) => p.bedrooms);
  if (affordable.length) return Math.max(...affordable);
  return Math.min(...ps.map((p) => p.bedrooms));
}

/**
 * Resolve a selection to one that fits the budget:
 *  - keep it if affordable;
 *  - else the cheapest affordable subtype in the same typology;
 *  - else the cheapest affordable typology overall;
 *  - else unchanged (everything over budget — keep a stable choice while the
 *    UI greys out).
 */
export function resolveAffordableSelection(
  index: PriceIndex | null | undefined,
  currency: Currency,
  budget: number,
  sel: Selection,
): Selection {
  if (!index) return sel;
  if (matching(index, sel.typology, sel.subtype).some((p) => cheapest(p, currency) <= budget)) return sel;

  const sameTyp = cheapestAffordableSubtype(index, currency, budget, sel.typology);
  if (sameTyp) return { typology: sel.typology, subtype: sameTyp };

  const typRanked = [...TYPOLOGY_ORDER]
    .map((id) => {
      const ps = matching(index, id);
      const price = ps.length ? Math.min(...ps.map((p) => cheapest(p, currency))) : Infinity;
      return [id, price] as const;
    })
    .filter(([, price]) => price <= budget)
    .sort((a, b) => a[1] - b[1]);
  if (typRanked.length) {
    const id = typRanked[0][0];
    if (!TYPOLOGIES[id].subtypes) return { typology: id, subtype: null };
    const sub = cheapestAffordableSubtype(index, currency, budget, id);
    if (sub) return { typology: id, subtype: sub };
  }
  return sel;
}
