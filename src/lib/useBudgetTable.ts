"use client";

import { useEffect, useState } from "react";
import type { BudgetTable } from "@/components/landing/pricing-helpers";

export function useBudgetTable(): BudgetTable | null {
  const [table, setTable] = useState<BudgetTable | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/budget-table")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || data.error) return;
        // JSON object keys come back as strings; coerce to numbers.
        const t: BudgetTable = {};
        for (const k of Object.keys(data)) t[Number(k)] = Number(data[k]);
        setTable(t);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return table;
}
