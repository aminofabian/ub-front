"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { logoutRemote } from "@/lib/api";
import { posBrandThemeStyle } from "@/lib/brand-theme";
import { APP_ROUTES } from "@/lib/config";
import { useOnlineStatus } from "@/hooks/use-online-status";

type CashierShellProps = {
  children: React.ReactNode;
};

export type PosCatalogItemTypeContextValue = {
  /** When set, POS catalog fetches (search / aisle / type browse) are limited to this item type. */
  posItemTypeId: string | null;
  setPosItemTypeId: (id: string | null) => void;
};

const PosCatalogItemTypeContext =
  createContext<PosCatalogItemTypeContextValue | null>(null);

export function usePosCatalogItemType(): PosCatalogItemTypeContextValue | null {
  return useContext(PosCatalogItemTypeContext);
}

type PosCatalogItemTypeProviderProps = {
  children: ReactNode;
};

function PosCatalogItemTypeProvider({
  children,
}: PosCatalogItemTypeProviderProps) {
  const [posItemTypeId, setPosItemTypeId] = useState<string | null>(null);
  const value = useMemo(
    () => ({ posItemTypeId, setPosItemTypeId }),
    [posItemTypeId],
  );
  return (
    <PosCatalogItemTypeContext.Provider value={value}>
      {children}
    </PosCatalogItemTypeContext.Provider>
  );
}

export function CashierShell({ children }: CashierShellProps) {
  const router = useRouter();
  const online = useOnlineStatus();
  const {
    business,
    loading,
    branches,
    branchId,
    setBranchId,
    branchesLoading,
    canQuickSale,
    itemTypes,
    itemTypesLoading,
  } = useDashboard();

  const currentBranch = branches.find((b) => b.id === branchId);
  const showBranchPicker = canQuickSale;

  const brandTheme = useMemo(
    () => posBrandThemeStyle(business?.branding ?? null),
    [business?.branding],
  );

  return (
    <PosCatalogItemTypeProvider>
      <div className="flex min-h-full flex-col" style={brandTheme}>
        <header className="sticky top-0 z-10 border-b border-[color-mix(in_srgb,var(--pos-primary)_22%,transparent)] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold">
                  {loading ? "Loading…" : business?.name?.trim() || "Cashier"}
                </span>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                    online
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {online ? "Online" : "Offline"}
                </span>
              </div>
              {currentBranch && branchId ? (
                <span className="mt-0.5 text-[11px] font-medium text-muted-foreground truncate">
                  {currentBranch.name}
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {showBranchPicker ? (
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className="hidden sm:inline">Branch</span>
                  <select
                    className="h-8 max-w-[10rem] rounded-md border bg-background px-2 text-xs font-medium text-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    disabled={branchesLoading || branches.length === 0}
                    aria-label="Select branch"
                  >
                    {branches.length === 0 ? (
                      <option value="">
                        {branchesLoading ? "Loading…" : "No branches"}
                      </option>
                    ) : (
                      <>
                        {!branchId ? <option value="">Select…</option> : null}
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </label>
              ) : null}
              {showBranchPicker ? (
                <PosCatalogItemTypeSelect
                  itemTypes={itemTypes}
                  itemTypesLoading={itemTypesLoading}
                />
              ) : null}
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                <Link href={APP_ROUTES.salesQuick}>Admin quick sale</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 text-xs"
              >
                <Link href={APP_ROUTES.business}>Full app</Link>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 text-xs"
                onClick={() =>
                  logoutRemote()
                    .catch(() => undefined)
                    .finally(() => {
                      router.replace(APP_ROUTES.login);
                    })
                }
              >
                Log out
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-4 sm:px-4 md:max-w-3xl">
          {children}
        </main>
      </div>
    </PosCatalogItemTypeProvider>
  );
}

function PosCatalogItemTypeSelect({
  itemTypes,
  itemTypesLoading,
}: {
  itemTypes: { id: string; label: string }[];
  itemTypesLoading: boolean;
}) {
  const ctx = usePosCatalogItemType();
  if (!ctx) return null;
  const { posItemTypeId, setPosItemTypeId } = ctx;
  return (
    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span className="hidden sm:inline">Type</span>
      <select
        className="h-8 max-w-[10rem] rounded-md border bg-background px-2 text-xs font-medium text-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
        value={posItemTypeId ?? ""}
        onChange={(e) => {
          const v = e.target.value.trim();
          setPosItemTypeId(v ? v : null);
        }}
        disabled={itemTypesLoading || itemTypes.length === 0}
        aria-label="Filter catalog by item type"
      >
        {itemTypes.length === 0 ? (
          <option value="">{itemTypesLoading ? "Loading…" : "No types"}</option>
        ) : (
          <>
            <option value="">All types</option>
            {itemTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </>
        )}
      </select>
    </label>
  );
}
