import type { Selection } from "@/lib/typologies";

// Shared contract for POST /api/configurator/submit — imported by both the
// client form and the server route so validation can't drift between them.

export const TIMELINE_OPTIONS = [
  "4 – 6 months",
  "6 – 12 months",
  "1 – 2 years",
  "Over 2 years",
] as const;

export type Timeline = (typeof TIMELINE_OPTIONS)[number];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Single source of truth for the opener line on every "design ready"
// surface (email body, PDF cover, confirmation screen). Edit here once.
export const DESIGN_OPENER = "Congratulations — you've designed your dream home!";

// Furniture/fixtures-not-to-scale caveat shown next to every floor plan
// the client sees (configurator canvas, summary mini plan, PDF plan
// page). One string so the wording can't drift between surfaces.
// TODO(X4): remove once furniture is redrawn to true scale.
export const FURNITURE_CAVEAT =
  "Furniture and fixtures might not be to scale and serve for general visual representation only.";

// ── Placeholder mirror fields ──────────────────────────────────────────────
// These three fields stand in for the existing "request price list" Google
// Form's questions until Wolf supplies the real list (see Phase 6 of
// docs/integrations-setup.md). Swap the labels/options here and on
// src/app/summary/page.tsx; the form-side mapping is purely env-driven via
// EH_LEADS_FORM_FIELD_IDS_JSON, so no other code needs to change.
export const PROJECT_TYPE_OPTIONS = [
  "My own home",
  "A second home (on the countryside)",
  "To rent out",
  "For tourism purposes (e.g. Airbnb)",
  "Other",
] as const;

export const HEAR_ABOUT_OPTIONS = [
  "Facebook",
  "Instagram",
  "Google Search",
  "YouTube",
  "TikTok",
  "LinkedIn",
  "TV, radio or newspaper",
  "Capital FM",
  "Family or friends",
  "Event or conference",
  "Other",
] as const;

// The "Other" answer carries a free-text value, so the submitted string
// won't always be one of the options above — validation only checks it's
// non-empty (see isClientInfoValid).
export const HEAR_ABOUT_OTHER = "Other";

export const LAND_FUNDS_OPTIONS = [
  "Not yet, I am just looking around.",
  "I have a plot of land that I want to build on. But I'm still looking for funds.",
  "I have a plot of land and funding available to start construction.",
  "I have funds to build but no location yet",
] as const;

export interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  timeline: string;
  agreed: boolean;
  country: string;
  projectType: string;
  hearAbout: string;
  landFunds: string;
  newsletter: boolean;
}

export interface DesignPayloadSelection {
  /** `{ typology, subtype }` — same shape as `Selection` in `src/lib/typologies.ts`. */
  selection: Selection;
  /** On-disk DXF filename in `public/floorplans/`. The server re-parses it for safety. */
  file: string;
  /** Width slider delta in mm (signed); clamped to the plan's min/max on the server. */
  delta: number;
  /** DXF version token (e.g. v6 → 6). The server re-derives from the filename if it doesn't match. */
  version: number;
  /** Display label like "Monopitch · Studio" or "Gable Standard · 3-bed". */
  label: string;
}

export interface DesignDimensions {
  widthM: number;
  lengthM: number;
  footprintM2: number;
}

export interface SubmitPayload {
  selection: DesignPayloadSelection;
  bedrooms: number;
  budget: number;
  dimensions: DesignDimensions;
  client: ClientInfo;
  /**
   * Reference id minted by the server (via `GET /api/configurator/reference`)
   * and displayed on the page. The submit endpoint validates the format with
   * `validateReference` and mints a fresh one if missing or malformed — the
   * server stays authoritative.
   */
  reference: string | null;
  source: string;
  /**
   * ISO 3166-1 alpha-2 of the country chosen at the gate, e.g. "UG" / "KE".
   * Drives the display currency for the sheet's local-amount column, the
   * PDF, and the email subject. Pricing math on the server stays in UGX —
   * this code only changes how the displayed strings are converted.
   *
   * Optional only because the field is best-effort over the wire; if absent
   * or unknown the server falls back to the base country (Uganda / UGX).
   */
  country?: string;
}

// Mirrors the page's `canGenerate` predicate. Re-run server-side so a crafted
// request can't bypass the disabled button. Defensive against missing
// properties — at runtime the payload is unknown JSON, not a `ClientInfo`.
export function isClientInfoValid(c: ClientInfo): boolean {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return (
    s(c?.name).trim().length > 1 &&
    EMAIL_RE.test(s(c?.email).trim()) &&
    s(c?.phone).trim().length >= 6 &&
    (TIMELINE_OPTIONS as readonly string[]).includes(s(c?.timeline)) &&
    s(c?.country).trim().length > 1 &&
    (PROJECT_TYPE_OPTIONS as readonly string[]).includes(s(c?.projectType)) &&
    // hearAbout can be a free-text "Other" answer, so we only require it to
    // be non-empty rather than one of the enumerated options.
    s(c?.hearAbout).trim().length > 0 &&
    (LAND_FUNDS_OPTIONS as readonly string[]).includes(s(c?.landFunds)) &&
    typeof c?.newsletter === "boolean" &&
    c?.agreed === true
  );
}
