"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, PackageSearch, Search, Truck } from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  fetchItems,
  fetchSupplierItemLinks,
  fetchSuppliersPage,
  type ItemSummaryRecord,
  type SupplierItemLinkRecord,
  type SupplierRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  isPickableCatalogRow,
  selectVisibleItems,
  supplierLinkToPickItem,
  togglePickedItem,
  visibleSelectionState,
} from "../_lib/store-product-pick";

type Source = "products" | "supplier";

/** Catalogue products the merchant can mirror in a connected store room. */
export function StoreRoomProductPicker({
  open,
  onOpenChange,
  title,
  description,
  takenItemIds,
  initialQuery,
  busy,
  /** One product — used when linking an existing store-room row. */
  onPick,
  /** Many products — used when adding to the store room. */
  onAdd,
  onCreateCustom,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  takenItemIds: ReadonlySet<string>;
  initialQuery?: string;
  busy: boolean;
  onPick?: (item: ItemSummaryRecord) => void;
  onAdd?: (items: ItemSummaryRecord[]) => void;
  onCreateCustom?: () => void;
}) {
  const multi = Boolean(onAdd) && !onPick;
  const [source, setSource] = useState<Source>("products");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSummaryRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<Map<string, ItemSummaryRecord>>(
    () => new Map(),
  );
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [links, setLinks] = useState<SupplierItemLinkRecord[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const requestIdRef = useRef(0);

  const searchProducts = useCallback((term: string) => {
    const requestId = ++requestIdRef.current;
    setSearching(true);
    setFailed(false);
    fetchItems(term.trim() || undefined, {
      catalogScope: "SKUS_ONLY",
      sort: [{ property: "name", direction: "asc" }],
    })
      .then((items) => {
        if (requestIdRef.current !== requestId) return;
        setResults(items.filter(isPickableCatalogRow));
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
    setQuery(initialQuery ?? "");
    setResults([]);
    setFailed(false);
    setPicked(new Map());
    setSource("products");
    setSupplierId("");
    setLinks([]);
    setSearching(true);
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open || source !== "products") return;
    const term = query;
    const timer = setTimeout(() => searchProducts(term), 250);
    return () => clearTimeout(timer);
  }, [open, query, searchProducts, source]);

  useEffect(() => {
    if (!open || source !== "supplier") return;
    setSuppliersLoading(true);
    fetchSuppliersPage({ page: 0, size: 100, status: "active" })
      .then((page) => setSuppliers(page.content))
      .catch(() => setSuppliers([]))
      .finally(() => setSuppliersLoading(false));
  }, [open, source]);

  useEffect(() => {
    if (!open || source !== "supplier" || !supplierId) {
      setLinks([]);
      return;
    }
    let cancelled = false;
    setLinksLoading(true);
    fetchSupplierItemLinks(supplierId)
      .then((rows) => {
        if (!cancelled) setLinks(rows.filter((row) => row.active));
      })
      .catch(() => {
        if (!cancelled) setLinks([]);
      })
      .finally(() => {
        if (!cancelled) setLinksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, source, supplierId]);

  const visible = useMemo(() => {
    if (source === "supplier") {
      const needle = query.trim().toLowerCase();
      const mapped = links.map(supplierLinkToPickItem);
      if (!needle) return mapped;
      return mapped.filter((item) => {
        const hay = `${item.name} ${item.sku} ${item.barcode ?? ""}`.toLowerCase();
        return hay.includes(needle);
      });
    }
    return results;
  }, [links, query, results, source]);

  const listState = visibleSelectionState(visible, picked, takenItemIds);
  const allVisibleChecked =
    listState.available > 0 && listState.selected === listState.available;

  const toggle = (item: ItemSummaryRecord) => {
    if (!multi) {
      if (!takenItemIds.has(item.id)) onPick?.(item);
      return;
    }
    setPicked((prev) => togglePickedItem(prev, item, takenItemIds));
  };

  const addSelected = () => {
    if (!onAdd || picked.size === 0) return;
    onAdd([...picked.values()]);
  };

  const listing =
    source === "supplier"
      ? !supplierId
        ? "idle-supplier"
        : linksLoading
          ? "loading"
          : failed
            ? "failed"
            : visible.length === 0
              ? "empty"
              : "list"
      : searching && results.length === 0
        ? "loading"
        : failed
          ? "failed"
          : visible.length === 0
            ? "empty"
            : "list";

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
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {onCreateCustom ? (
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
          ) : (
            <span />
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {multi ? (
              <Button
                type="button"
                disabled={busy || picked.size === 0}
                onClick={addSelected}
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : null}
                Add {picked.size === 0 ? "selected" : `${picked.size} selected`}
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {multi ? (
          <div className="flex gap-px border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
            {(
              [
                { id: "products" as const, label: "Products", icon: PackageSearch },
                { id: "supplier" as const, label: "Supplier", icon: Truck },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSource(tab.id)}
                className={cn(
                  "inline-flex h-9 flex-1 items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors",
                  source === tab.id
                    ? "bg-[var(--pos-primary,#0f766e)] text-white"
                    : "bg-white text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon className="size-3.5" aria-hidden />
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        {source === "supplier" ? (
          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Supplier
            </span>
            <select
              className={dashboardInputClass()}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              disabled={suppliersLoading || busy}
            >
              <option value="">
                {suppliersLoading ? "Loading suppliers…" : "Choose a supplier"}
              </option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            className={cn(dashboardInputClass(), "pl-9")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              source === "supplier"
                ? "Filter this supplier’s products…"
                : "Search your products by name, barcode, or SKU…"
            }
            aria-label="Search products"
            autoFocus={source === "products"}
          />
        </label>

        {listing === "idle-supplier" ? (
          <p className={cn(dashboardHintClass(), "py-6 text-center")}>
            Pick a supplier to see their linked products.
          </p>
        ) : listing === "loading" ? (
          <p className={cn(dashboardHintClass(), "flex items-center justify-center gap-2 py-6")}>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Looking through products…
          </p>
        ) : listing === "failed" ? (
          <p className={cn(dashboardHintClass(), "py-6 text-center")}>
            Could not load products. Try again.
          </p>
        ) : listing === "empty" ? (
          <p className={cn(dashboardHintClass(), "py-6 text-center")}>
            {query.trim()
              ? `Nothing matched “${query.trim()}”.`
              : source === "supplier"
                ? "This supplier has no linked products yet."
                : "No products to add."}
          </p>
        ) : (
          <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
            {multi ? (
              <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-2">
                <label className="inline-flex items-center gap-2 text-[12px] font-medium text-foreground">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-[var(--pos-primary,#0f766e)]"
                    checked={allVisibleChecked}
                    disabled={busy || listState.available === 0}
                    onChange={() =>
                      setPicked((prev) =>
                        selectVisibleItems(
                          prev,
                          visible,
                          takenItemIds,
                          !allVisibleChecked,
                        ),
                      )
                    }
                  />
                  {allVisibleChecked ? "Clear this list" : "Select this list"}
                </label>
                <span className={dashboardHintClass()}>
                  {picked.size} selected
                  {listState.available < visible.length
                    ? ` · ${visible.length - listState.available} already in`
                    : ""}
                </span>
              </div>
            ) : null}
            <ul className="max-h-[22rem] divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] overflow-y-auto">
              {visible.map((item) => {
                const taken = takenItemIds.has(item.id);
                const checked = picked.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={taken || busy}
                      onClick={() => toggle(item)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        taken
                          ? "cursor-not-allowed opacity-55"
                          : checked
                            ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                            : "hover:bg-muted/40",
                      )}
                    >
                      {multi ? (
                        <input
                          type="checkbox"
                          className="size-3.5 shrink-0 accent-[var(--pos-primary,#0f766e)]"
                          checked={checked}
                          disabled={taken || busy}
                          readOnly
                          tabIndex={-1}
                          aria-hidden
                        />
                      ) : null}
                      <span className="min-w-0 flex-1">
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
          </div>
        )}
      </div>
    </FormDrawer>
  );
}
