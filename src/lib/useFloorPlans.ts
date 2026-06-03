"use client";

import { useEffect, useState } from "react";
import type { FloorPlanEntry } from "@/lib/floor-plans";

/** Fetches the directory-scanned floor-plan registry from /api/floor-plans. */
export function useFloorPlans(): FloorPlanEntry[] | null {
  const [plans, setPlans] = useState<FloorPlanEntry[] | null>(null);
  useEffect(() => {
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
  }, []);
  return plans;
}
