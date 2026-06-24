"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import type { TenantContext } from "@/lib/public-storefront";

const TenantContextCtx = createContext<TenantContext | null>(null);

export function TenantProvider({
  value,
  children,
}: {
  value: TenantContext;
  children: ReactNode;
}) {
  const memoized = useMemo(() => value, [value]);
  return (
    <TenantContextCtx.Provider value={memoized}>
      {children}
    </TenantContextCtx.Provider>
  );
}

/**
 * Reads the tenant context populated server-side by the root layout. Throws
 * if used outside a {@link TenantProvider} so missing wiring fails loudly
 * instead of silently rendering with platform defaults.
 */
export function useTenant(): TenantContext {
  const ctx = useContext(TenantContextCtx);
  if (!ctx) {
    throw new Error("useTenant must be used inside a TenantProvider");
  }
  return ctx;
}

/**
 * Optional variant for components that may render outside a tenant scope
 * (e.g. error pages or platform-host marketing pages).
 */
export function useOptionalTenant(): TenantContext | null {
  return useContext(TenantContextCtx);
}

/**
 * Convenience: read a single feature flag, defaulting to {@code false} when
 * the flag is absent. Merges tenant host-resolve flags with the authenticated
 * business record so dashboard toggles take effect without waiting on host cache.
 */
export function useFeatureFlag(key: string): boolean {
  const ctx = useOptionalTenant();
  const dashboard = useOptionalDashboard();
  const fromTenant = ctx?.featureFlags?.[key] === true;
  const fromBusiness = dashboard?.business?.featureFlags?.[key] === true;
  return fromTenant || fromBusiness;
}

/** Merged tenant + business flags for nav gates and bulk checks. */
export function useFeatureFlags(): Record<string, boolean> {
  const ctx = useOptionalTenant();
  const dashboard = useOptionalDashboard();
  return useMemo(
    () => ({
      ...(ctx?.featureFlags ?? {}),
      ...(dashboard?.business?.featureFlags ?? {}),
    }),
    [ctx?.featureFlags, dashboard?.business?.featureFlags],
  );
}
