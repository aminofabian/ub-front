"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { ThemedLogoUrls } from "@/lib/branding-themed-logo";

const StorefrontBrandMarksContext = createContext<ThemedLogoUrls | null>(null);

/** Light + dark marks for surfaces that are always dark (the merchant hero). */
export function StorefrontBrandMarksProvider({
  logoUrl,
  logoDarkUrl,
  children,
}: ThemedLogoUrls & { children: ReactNode }) {
  const value = useMemo(
    () => ({ logoUrl: logoUrl ?? null, logoDarkUrl: logoDarkUrl ?? null }),
    [logoUrl, logoDarkUrl],
  );
  return (
    <StorefrontBrandMarksContext.Provider value={value}>
      {children}
    </StorefrontBrandMarksContext.Provider>
  );
}

export function useStorefrontBrandMarks(
  fallback?: ThemedLogoUrls,
): ThemedLogoUrls {
  const ctx = useContext(StorefrontBrandMarksContext);
  return {
    logoUrl: fallback?.logoUrl ?? ctx?.logoUrl ?? null,
    logoDarkUrl: fallback?.logoDarkUrl ?? ctx?.logoDarkUrl ?? null,
  };
}
