import type { TypologyId } from "@/lib/typologies";

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

export interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  timeline: string;
  agreed: boolean;
}

export interface DesignPayloadSelection {
  typology: TypologyId;
  subtype: string | null;
  /** On-disk DXF filename (scheme-conformant). */
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
  reference: string;
  source: string;
}

// Mirrors the page's `canGenerate` predicate. Re-run server-side so a crafted
// request can't bypass the disabled button.
export function isClientInfoValid(c: ClientInfo): boolean {
  return (
    c.name.trim().length > 1 &&
    EMAIL_RE.test(c.email.trim()) &&
    c.phone.trim().length >= 6 &&
    (TIMELINE_OPTIONS as readonly string[]).includes(c.timeline) &&
    c.agreed === true
  );
}
