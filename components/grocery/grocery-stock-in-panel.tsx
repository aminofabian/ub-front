"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, Truck } from "lucide-react";

import { fetchSuppliersPage, type SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

type GroceryStockInPanelProps = {
  onOpenTill: (supplier: { id: string; name: string }) => void;
};

/** Supplier picker for grocery Stock in mode — opens Path B receive till. */
export function GroceryStockInPanel({ onOpenTill }: GroceryStockInPanelProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchSuppliersPage({
        page: 0,
        size: 50,
        search: query.trim() || undefined,
      });
      setSuppliers(page.content ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load suppliers");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, query.trim() ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [load, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2.5 py-2 dark:border-border/40">
        <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
          Stock in
        </h2>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Pick a supplier, then receive on the till.
        </p>
        <label className="relative mt-2 block">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search suppliers…"
            className="h-8 w-full rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-background pl-7 pr-2 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/35 dark:border-border/50"
            aria-label="Search suppliers"
          />
        </label>
      </div>

      <div className="grocery-scroll-thick min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading…
          </div>
        ) : error ? (
          <div className="px-3 py-6 text-center text-[12px] text-destructive">
            {error}
            <button
              type="button"
              className="mt-2 block w-full text-[11px] font-semibold underline"
              onClick={() => void load()}
            >
              Retry
            </button>
          </div>
        ) : suppliers.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px] text-muted-foreground">
            No suppliers found.
          </p>
        ) : (
          <ul className="list-none p-0">
            {suppliers.map((s) => {
              const name = s.name?.trim() || "Supplier";
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTill({ id: s.id, name })}
                    className={cn(
                      "flex w-full items-center gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-2.5 py-2.5 text-left transition-colors",
                      "hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,transparent)] dark:border-border/40",
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]">
                      <Truck className="size-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-foreground">
                        {name}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        Open receive till
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
