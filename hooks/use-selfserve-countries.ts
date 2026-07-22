"use client";

import { useEffect, useState } from "react";

import { fetchSelfServeCountries } from "@/lib/api";
import {
  FALLBACK_SELFSERVE_COUNTRIES,
  type SelfServeCountry,
} from "@/lib/selfserve-countries";

export function useSelfServeCountries() {
  const [countries, setCountries] = useState<readonly SelfServeCountry[]>(
    FALLBACK_SELFSERVE_COUNTRIES,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchSelfServeCountries();
        if (!cancelled && list.length > 0) {
          setCountries(list);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { countries, loading };
}
