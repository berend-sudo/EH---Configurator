"use client";

import { useEffect, useState } from "react";
import type { FloorPlanEntry } from "@/lib/floor-plans";

/**
 * The directory-scanned floor-plan registry.
 *
 * Pass `initial` when the page already has the scan from a server component
 * (the landing, configurator and summary routes all pre-scan in their server
 * `page.tsx`). When seeded, no client fetch runs — the registry is available
 * on first paint and the `/api/floor-plans` round trip is skipped entirely.
 * With no `initial`, it falls back to fetching `/api/floor-plans` on mount.
 */
export function useFloorPlans(initial?: FloorPlanEntry[] | null): FloorPlanEntry[] | null {
  const [plans, setPlans] = useState<FloorPlanEntry[] | null>(initial ?? null);
  const seeded = initial != null && initial.length > 0;
  useEffect(() => {
    if (seeded) return; // already have the registry from the server — no fetch
    let cancelled = false;
    fetch("/api/floor-plans")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || data.error || !Array.isArray(data)) return;
        setPlans(data as FloorPlanEntry[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [seeded]);
  return plans;
}
