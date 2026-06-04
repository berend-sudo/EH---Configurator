"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readActiveCountry, type Country } from "./countries";

/**
 * Resolve the active country for the current browser. Returns `null` during
 * SSR and on the very first client paint — components rendering prices
 * should wait for a non-null value so the SSR markup (which has no
 * localStorage) doesn't mismatch the hydrated currency.
 */
export function useActiveCountry(): Country | null {
  const [country, setCountry] = useState<Country | null>(null);
  useEffect(() => {
    setCountry(readActiveCountry());
  }, []);
  return country;
}

/**
 * Guard a configurator route: if no country has been picked, push the user
 * to the gate; otherwise return the active country. Returns `null` until
 * the check resolves so callers can render a blank placeholder during the
 * brief redirect window.
 */
export function useCountryGuard(): Country | null {
  const router = useRouter();
  const [country, setCountry] = useState<Country | null>(null);
  useEffect(() => {
    const c = readActiveCountry();
    if (!c) {
      router.replace("/country");
      return;
    }
    setCountry(c);
  }, [router]);
  return country;
}
