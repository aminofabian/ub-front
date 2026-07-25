"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Search, Truck } from "lucide-react";

import {
  DashboardAccessDenied,
  DASHBOARD_SECTION_SURFACE,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { fetchSuppliersPage, type SupplierRecord } from "@/lib/api";
import { posBrandThemeStyle } from "@/lib/brand-theme";
import { APP_ROUTES } from "@/lib/config";
import { supplierReceivePath, supplierSlug } from "@/lib/supplier-slug";
import { cn } from "@/lib/utils";

const fieldClass = cn(
  "w-full border border-border/60 bg-background px-3 py-2.5 text-sm shadow-sm",
  "placeholder:text-muted-foreground/50",
  "focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_22%,transparent)]",
);

export function SupplierReceiveDirectory() {
  const { loading, canPathBWrite, canViewSuppliers, business } = useDashboard();
  const brandTheme = useMemo(
    () => posBrandThemeStyle(business?.branding ?? null),
    [business?.branding],
  );
  const canAccess = canPathBWrite && canViewSuppliers;

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SupplierRecord[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!canAccess) return;
    let cancelled = false;
    const t = window.setTimeout(
      () => {
        setBusy(true);
        void fetchSuppliersPage({
          ...(query.trim() ? { search: query.trim() } : {}),
          status: "active",
          page: 0,
          size: 80,
        })
          .then((page) => {
            if (!cancelled) setRows(page.content);
          })
          .catch(() => {
            if (!cancelled) setRows([]);
          })
          .finally(() => {
            if (!cancelled) setBusy(false);
          });
      },
      query.trim() ? 220 : 0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [canAccess, query]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className={cn(DASHBOARD_SECTION_SURFACE, "m-3")}>
        <DashboardAccessDenied
          title="Receive stock locked"
          description="You need receive-stock access to open a supplier till."
          backHref={APP_ROUTES.cashier}
          backLabel="Back to cashier"
        />
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-1 flex-col gap-3 overflow-hidden px-3 py-3 sm:px-4"
      style={brandTheme}
    >
      <section className="shrink-0 border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] pb-2 dark:border-border/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="pos-market-section-label text-[1.1rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
              Receive supply
            </h1>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Open a supplier till — tap products, post stock.
            </p>
          </div>
          <Link
            href={APP_ROUTES.cashier}
            className="inline-flex h-7 items-center gap-1 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Cashier
          </Link>
        </div>
      </section>

      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          className={cn(fieldClass, "pl-9")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a supplier…"
          autoFocus
        />
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] dark:border-border/40">
        {busy ? (
          <li className="flex items-center justify-center gap-2 px-3 py-10 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading suppliers…
          </li>
        ) : rows.length === 0 ? (
          <li className="px-3 py-10 text-center text-xs text-muted-foreground">
            {query.trim() ? "No match" : "No active suppliers"}
          </li>
        ) : (
          rows.map((s) => (
            <li key={s.id} className="border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] last:border-b-0">
              <Link
                href={supplierReceivePath(s)}
                className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)] text-[var(--pos-primary)]">
                  <Truck className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {s.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    /supplier/{supplierSlug(s)}
                    {s.code ? ` · ${s.code}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
