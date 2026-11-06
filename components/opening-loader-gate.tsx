"use client";

import type { ReactNode } from "react";

import { useFeatureFlags } from "@/components/providers/tenant-provider";
import { isOpeningLoaderEnabled } from "@/lib/opening-loader-settings";

/**
 * Renders the opening screen unless the tenant switched it off in Business
 * settings. The switch travels with the shop's public settings, which are cached
 * for about a minute, so a change reaches shoppers and staff within a minute or
 * two of saving.
 */
export function OpeningLoaderGate({ children }: { children: ReactNode }) {
  const flags = useFeatureFlags();
  return isOpeningLoaderEnabled(flags) ? <>{children}</> : null;
}
