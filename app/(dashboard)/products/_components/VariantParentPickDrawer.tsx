"use client";

import { useCallback, useEffect, useState } from "react";
import { Layers, Loader2, Search } from "lucide-react";

import { FormDrawer } from "@/components/form-drawer";
import { dashboardInputClass } from "@/components/dashboard-page-ui";
import { fetchItemsPage, type ItemSummaryRecord } from "@/lib/api";
import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onParentSelected: (item: ItemSummaryRecord) => void | Promise<void>;
  busy?: boolean;
};

export function VariantParentPickDrawer({
  open,
  onClose,
  onParentSelected,
  busy = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ItemSummaryRecord[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) {
      const id = window.setTimeout(() => {
        setQuery("");
        setHits([]);
        setSearching(false);
      }, 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const q = query.trim();
    if (!q) {
      const id = window.setTimeout(() => {
        setHits([]);
        setSearching(false);
      }, 0);
      return () => window.clearTimeout(id);
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void fetchItemsPage(q, { catalogScope: "PARENTS_ONLY", page: 0, size: 20 })
        .then((page) => {
          if (cancelled) return;
          setHits(
            page.content.filter((row) => !row.variantOfItemId?.trim()),
          );
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const onPick = useCallback(
    (hit: ItemSummaryRecord) => {
      if (busy) return;
      void onParentSelected(hit);
    },
    [busy, onParentSelected],
  );

  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o && !busy) onClose();
      }}
      title="Add variant"
      description="Search for the parent product or group label, then add option SKUs under it."
      contextLabel="Catalog"
      icon={<Layers className="size-5 text-primary" aria-hidden />}
      width="default"
    >
      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">
            Parent product
          </span>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              autoFocus
              disabled={busy}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or SKU…"
              className={cn(dashboardInputClass(busy), "h-10 py-2 pl-9 pr-3")}
            />
          </div>
        </label>

        {searching ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Searching…
          </p>
        ) : null}

        {!searching && query.trim() && hits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No parent products found.</p>
        ) : null}

        {hits.length > 0 ? (
          <ul
            className="max-h-[min(24rem,50vh)] overflow-y-auto rounded-xl border border-border/80 bg-card shadow-sm"
            role="listbox"
            aria-label="Parent products"
          >
            {hits.map((hit) => (
              <li key={hit.id} role="option">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onPick(hit)}
                  className="flex w-full flex-col items-start gap-1 border-b border-border/60 px-3.5 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/60 disabled:opacity-50"
                >
                  <span className="flex w-full min-w-0 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {itemCatalogDisplayTitle(hit)}
                    </span>
                    {hit.groupLabelOnly ? (
                      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Group
                      </span>
                    ) : null}
                  </span>
                  {hit.sku?.trim() ? (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {hit.sku.trim()}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {!query.trim() ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Type to find a standalone product or variant group. Variants cannot
            be parents.
          </p>
        ) : null}
      </div>
    </FormDrawer>
  );
}
