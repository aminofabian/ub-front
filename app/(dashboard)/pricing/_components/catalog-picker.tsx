"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { dashboardInputClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  fetchItemsPage,
  fetchSuppliersPage,
  type ItemSummaryRecord,
  type SupplierRecord,
} from "@/lib/api";
import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";
import { cn } from "@/lib/utils";

type PickerOption = { id: string; title: string; meta?: string };

type CatalogPickerKind = "item" | "supplier";

type CatalogPickerProps = {
  /** Field label rendered above the control. */
  label: string;
  kind: CatalogPickerKind;
  /** Selected entity id; empty string when nothing is chosen. */
  value: string;
  /** Display title for the selected entity (falls back to the raw id). */
  selectedLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (id: string, label?: string) => void;
};

/** Item list → picker options, dropping non-sellable group-only parents. */
function toItemOptions(items: ItemSummaryRecord[]): PickerOption[] {
  return items
    .filter((row) => !row.groupLabelOnly)
    .map((row) => ({
      id: row.id,
      title: itemCatalogDisplayTitle(row),
      meta: [row.sku, row.unitType].filter(Boolean).join(" · ") || undefined,
    }));
}

function toSupplierOptions(suppliers: SupplierRecord[]): PickerOption[] {
  return suppliers.map((row) => ({
    id: row.id,
    title: row.name,
    meta: row.code || row.supplierType || undefined,
  }));
}

/**
 * Searchable catalogue picker for the pricing drawers. Replaces the old
 * paste-a-UUID inputs: type a name or SKU, tap a result, and the entity id is
 * resolved for the caller. Touch-first — 44px control and rows on phones.
 */
export function CatalogPicker({
  label,
  kind,
  value,
  selectedLabel,
  placeholder,
  disabled = false,
  onChange,
}: CatalogPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = value.trim().length > 0;
  const selectedTitle = (selectedLabel?.trim() || value.trim()) || "";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (selected || !open) return;
    const q = query.trim();
    if (q.length === 0) {
      setResults([]);
      setSearched(false);
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    const t = window.setTimeout(() => {
      const run =
        kind === "item"
          ? fetchItemsPage(q, {
              page: 0,
              size: 8,
              sort: [{ property: "name", direction: "asc" }],
              signal: controller.signal,
            }).then((page) => toItemOptions(page.content))
          : fetchSuppliersPage({ search: q, page: 0, size: 8 }).then((page) =>
              toSupplierOptions(page.content),
            );
      run
        .then((opts) => {
          if (controller.signal.aborted) return;
          setResults(opts);
          setSearched(true);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setResults([]);
          setSearched(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 280);
    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [query, open, selected, kind]);

  const reset = () => {
    onChange("", undefined);
    setQuery("");
    setResults([]);
    setSearched(false);
    setOpen(true);
  };

  const pick = (option: PickerOption) => {
    onChange(option.id, option.title);
    setOpen(false);
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div ref={rootRef} className="relative">
        {selected ? (
          <div className="flex min-h-11 items-center justify-between gap-2 rounded-none border bg-white px-2.5 py-1.5 sm:min-h-8 sm:py-0">
            <span className="min-w-0 truncate font-medium text-foreground">
              {selectedTitle}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="h-9 shrink-0 px-2 text-[11px] sm:h-6"
              onClick={reset}
            >
              <X className="mr-1 size-3.5" aria-hidden />
              Change
            </Button>
          </div>
        ) : (
          <>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(dashboardInputClass(disabled), "pl-9")}
              placeholder={placeholder ?? "Search…"}
              disabled={disabled}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              autoComplete="off"
              role="combobox"
              aria-expanded={open && query.trim().length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
            />
          </>
        )}

        {!selected && open && query.trim().length > 0 ? (
          <div className="mt-1 max-h-56 overflow-auto rounded-none border bg-popover">
            {busy ? (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-3 text-xs text-muted-foreground">
                {searched ? "No matches" : "Keep typing…"}
              </div>
            ) : (
              <ul id={listId} role="listbox" className="divide-y">
                {results.map((option) => (
                  <li key={option.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      className="flex min-h-11 w-full flex-col items-start justify-center gap-0.5 px-3 py-2 text-left hover:bg-accent sm:min-h-0"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(option)}
                    >
                      <span className="w-full truncate font-medium leading-tight">
                        {option.title}
                      </span>
                      {option.meta ? (
                        <span className="w-full truncate font-mono text-[11px] text-muted-foreground">
                          {option.meta}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
