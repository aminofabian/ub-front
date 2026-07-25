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
  "w-full border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)]",
  "px-2 py-1.5 text-sm shadow-none",
  "placeholder:text-muted-foreground/45",
  "focus-visible:border-[var(--pos-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)]",
  "dark:border-border/50 dark:bg-background",
);

const CHIP_IDLE = cn(
  "inline-flex h-7 shrink-0 items-center gap-1.5 border px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] text-muted-foreground",
  "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)] hover:text-foreground",
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
      className="mx-auto flex h-full min-h-0 w-full max-w-xl flex-1 flex-col gap-2 overflow-hidden px-3 py-3 sm:px-4"
      style={brandTheme}
    >
      <section className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] pb-2 pl-2 dark:border-border/40">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary)]"
        />
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Directory
            </p>
            <h1 className="pos-market-section-label mt-0.5 text-[1.15rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
              Receive supply
            </h1>
          </div>
          <Link href={APP_ROUTES.cashier} className={CHIP_IDLE}>
            <ArrowLeft className="size-3" aria-hidden />
            Cashier
          </Link>
        </div>
      </section>

      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          className={cn(fieldClass, "h-9 pl-8 text-[13px]")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a supplier…"
          autoFocus
        />
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_90%,#faf7f1)] dark:border-border/40 dark:bg-card">
        {busy ? (
          <li className="flex items-center justify-center gap-2 px-3 py-10 text-[11px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading suppliers…
          </li>
        ) : rows.length === 0 ? (
          <li className="px-3 py-10 text-center text-[11px] text-muted-foreground">
            {query.trim() ? "No match" : "No active suppliers"}
          </li>
        ) : (
          rows.map((s, i) => (
            <li
              key={s.id}
              className="border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] last:border-b-0"
            >
              <Link
                href={supplierReceivePath(s)}
                className="flex items-center gap-2.5 px-2.5 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary)_7%,transparent)]"
              >
                <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex size-8 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)] text-[var(--pos-primary)]">
                  <Truck className="size-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold leading-tight">
                    {s.name}
                  </span>
                  <span className="block truncate font-mono text-[10px] text-muted-foreground">
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
