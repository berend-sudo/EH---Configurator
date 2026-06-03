import type { LandingRoof } from "@/lib/budget";

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

// ── Placeholder mirror fields ──────────────────────────────────────────────
// These three fields stand in for the existing "request price list" Google
// Form's questions until Wolf supplies the real list (see Phase 6 of
// docs/integrations-setup.md). Swap the labels/options here and on
// src/app/summary/page.tsx; the form-side mapping is purely env-driven via
// EH_LEADS_FORM_FIELD_IDS_JSON, so no other code needs to change.
export const PROJECT_TYPE_OPTIONS = [
  "My own home",
  "To rent out",
  "NGO / community",
  "Other",
] as const;

export const HEAR_ABOUT_OPTIONS = [
  "Google search",
  "Social media",
  "Word of mouth",
  "Press / news",
  "Event or meetup",
  "Other",
] as const;

export interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  timeline: string;
  agreed: boolean;
  // TODO(Wolf): swap these for the real form fields once we have the question
  // list. `country` is required; the rest are optional and feed straight into
  // the form payload via the logical-name → entry.* map.
  country: string;
  projectType?: string;
  hearAbout?: string;
}

export interface DesignPayloadSelection {
  roof: LandingRoof;
  subtype: string | null;
  file: string;
  delta: number;
  version: number;
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
}

// Mirrors the page's `canGenerate` predicate. Re-run server-side so a crafted
// request can't bypass the disabled button. Only the original four core
// fields + consent + country are required; the other placeholder mirror
// fields are optional. Defensive against missing properties — at runtime the
// payload is unknown JSON, not a `ClientInfo`.
export function isClientInfoValid(c: ClientInfo): boolean {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return (
    s(c?.name).trim().length > 1 &&
    EMAIL_RE.test(s(c?.email).trim()) &&
    s(c?.phone).trim().length >= 6 &&
    (TIMELINE_OPTIONS as readonly string[]).includes(s(c?.timeline)) &&
    s(c?.country).trim().length > 1 &&
    c?.agreed === true
  );
}
