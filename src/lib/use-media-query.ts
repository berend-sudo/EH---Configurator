"use client";

import { useEffect, useState } from "react";

// SSR-safe matchMedia hook. Returns false on the server / first render so the
// desktop layout SSRs by default; the phone layout takes over once mounted on
// a small viewport. Callers that branch on this must tolerate a brief flash
// of the desktop layout at hydration on narrow screens.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    if (mql.addEventListener) {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }
    // Safari < 14 fallback.
    mql.addListener(update);
    return () => mql.removeListener(update);
  }, [query]);

  return matches;
}

export const MOBILE_QUERY = "(max-width: 1023px)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}
