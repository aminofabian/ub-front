"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, PackageSearch, Search } from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { fetchItems, type ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Catalogue products the merchant can mirror in a connected store room. */
export function StoreRoomProductPicker({
  open,
  onOpenChange,
  title,
  description,
  /** Products already mirrored elsewhere in the store room. */
  takenItemIds,
  busy,
  onPick,
  onCreateCustom,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  takenItemIds: ReadonlySet<string>;
  busy: boolean;
  onPick: (item: ItemSummaryRecord) => void;
  onCreateCustom?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSummaryRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const requestIdRef = useRef(0);

  const search = useCallback((term: string) => {
    const requestId = ++requestIdRef.current;
    setSearching(true);
    setFailed(false);
    fetchItems(term.trim() || undefined)
      .then((items) => {
        // A slower earlier request must not overwrite a newer search.
        if (requestIdRef.current !== requestId) return;
        setResults(items);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setFailed(true);
        setResults([]);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setSearching(false);
      });
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setFailed(false);
    // Show the loader straight away — the debounce below still has to wait.
    setSearching(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = query;
    const timer = setTimeout(() => search(term), 250);
    return () => clearTimeout(timer);
  }, [open, query, search]);

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      contextLabel="Store room"
      title={title}
      description={description}
      icon={<PackageSearch className="size-4" aria-hidden />}
      width="default"
      appearance="sharp"
      footer={
        onCreateCustom ? (
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled={busy}
              onClick={onCreateCustom}
            >
              Add something I don&apos;t sell
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex w-full justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-3">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            className={cn(dashboardInputClass(), "pl-9")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your products by name, barcode, or SKU…"
            aria-label="Search products"
            autoFocus
          />
        </label>

        {searching && results.length === 0 ? (
          <p className={cn(dashboardHintClass(), "flex items-center gap-2 py-6 justify-center")}>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Looking through your products…
          </p>
        ) : failed ? (
          <p className={cn(dashboardHintClass(), "py-6 text-center")}>
            Could not load products. Try again.
          </p>
        ) : results.length === 0 ? (
          <p className={cn(dashboardHintClass(), "py-6 text-center")}>
            Nothing matched “{query.trim()}”.
          </p>
        ) : (
          <ul className="max-h-[22rem] divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] overflow-y-auto border">
            {results.map((item) => {
              const taken = takenItemIds.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={taken || busy}
                    onClick={() => onPick(item)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors",
                      taken
                        ? "cursor-not-allowed opacity-55"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                        {item.barcode || item.sku || "No barcode"}
                        {item.unitType ? ` · ${item.unitType}` : ""}
                      </span>
                    </span>
                    {taken ? (
                      <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <Check className="size-3.5" aria-hidden />
                        In store room
                      </span>
                    ) : busy ? (
                      <Loader2
                        className="size-4 shrink-0 animate-spin text-muted-foreground"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </FormDrawer>
  );
}
