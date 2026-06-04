// Country & currency registry — single source of truth for the gate, every
// price formatter, the sheet/form/PDF/email payloads, and the persisted
// `eh_*` keys. Pricing math stays in UGX everywhere; this module is the only
// place a UGX amount is converted into another currency or formatted for
// display.
//
// Adding a country = one entry here + one `flagSVG` case in the gate.

export interface Currency {
  /** ISO 4217 code shown next to prices, e.g. "UGX", "KES". */
  code: string;
  /** Long form for the gate's currency line, e.g. "Ugandan shilling". */
  name: string;
  /** Short symbol — reserved for compact chips. Not used by the default formatter. */
  symbol: string;
  /**
   * Round the displayed local amount to the nearest multiple of this number.
   * KES at ~28.5 UGX/unit would otherwise show false-precision tails like
   * "KES 912,281"; we round to a sensible step.
   */
  displayRound: number;
}

export interface Country {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  currency: Currency;
  /**
   * How many UGX one unit of this country's currency is worth.
   * `localAmount = ugxAmount / ugxPerUnit`. Uganda is the base = 1.
   *
   * TODO(ops): confirm canonical conversion rates — these are illustrative
   * constants set in code, not pulled from an FX API.
   */
  ugxPerUnit: number;
}

/**
 * Ordered country list — drives the gate's panel order. Only entries listed
 * here are selectable. Add Mozambique / Ghana / Tanzania by appending here
 * and extending `flagSVG` in the gate.
 */
export const COUNTRIES: readonly Country[] = [
  {
    code: "UG",
    name: "Uganda",
    currency: { code: "UGX", name: "Ugandan shilling", symbol: "USh", displayRound: 100_000 },
    ugxPerUnit: 1,
  },
  {
    code: "KE",
    name: "Kenya",
    currency: { code: "KES", name: "Kenyan shilling", symbol: "KSh", displayRound: 1_000 },
    ugxPerUnit: 28.5,
  },
];

/** Uganda — the base currency the configurator prices in. */
export const BASE_COUNTRY: Country = COUNTRIES[0];

export const STORAGE_KEYS = {
  country: "eh_country",
  currency: "eh_currency",
  fx: "eh_fx_ugx_per_unit",
} as const;

export function getCountryByCode(code: string | null | undefined): Country | null {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code) ?? null;
}

/**
 * Read the active country from localStorage. Returns `null` on the server,
 * during SSR, or when no choice is stored — callers decide whether to fall
 * back to the base currency or redirect to the gate.
 */
export function readActiveCountry(): Country | null {
  if (typeof window === "undefined") return null;
  try {
    return getCountryByCode(window.localStorage.getItem(STORAGE_KEYS.country));
  } catch {
    return null;
  }
}

/**
 * Display-formatting helper. Returns the active country for the current
 * browser, falling back to the base (Uganda) so prerender and pre-gate code
 * paths still produce a sensible string.
 */
export function getActiveCountry(): Country {
  return readActiveCountry() ?? BASE_COUNTRY;
}

export function setActiveCountry(country: Country): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.country, country.code);
    window.localStorage.setItem(STORAGE_KEYS.currency, country.currency.code);
    window.localStorage.setItem(STORAGE_KEYS.fx, String(country.ugxPerUnit));
  } catch {
    // localStorage can throw (private mode, quota); the gate still navigates.
  }
}

/** Convert a UGX amount to the local currency, rounded for display. */
export function ugxToLocal(ugx: number, country: Country = getActiveCountry()): number {
  const raw = ugx / country.ugxPerUnit;
  const step = country.currency.displayRound || 1;
  return Math.round(raw / step) * step;
}

/**
 * Format a UGX amount as a localised "CODE 1,234,567" string. All callers
 * pass amounts in UGX — the base currency the configurator prices in — and
 * the active country is resolved from localStorage. Pass `country` to
 * override (server code, the gate's FX example).
 */
export function fmtMoney(ugx: number, country: Country = getActiveCountry()): string {
  return country.currency.code + " " + ugxToLocal(ugx, country).toLocaleString("en-US");
}
