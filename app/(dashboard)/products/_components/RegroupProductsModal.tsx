"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  GitBranchPlus,
  Loader2,
  Package,
  Search,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";
import {
  fetchItemsPage,
  itemListThumbnailUrl,
  type ItemSummaryRecord,
  type ItemTypeRecord,
} from "@/lib/api";
import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";

export type RegroupLineDraft = {
  itemId: string;
  name: string;
  sku: string;
  thumbnailUrl: string | null;
  variantName: string;
  /**
   * How this row sells once grouped (PACKAGE_FLOW_GAPS G1):
   * "option" — flavor/size with its own stock (default);
   * "pack"   — a pack of the base product, counted from the family's base pool.
   */
  sellShape: "option" | "pack";
  /** Base units per sale when {@link sellShape} is "pack" ("24" for a crate). */
  unitsPerPack: string;
  /** Was already a pack/shared-unit variant before this regroup. */
  wasPack: boolean;
  /** Move the row's own on-hand into the base pool after grouping. */
  foldStock: boolean;
  /** Known on-hand (branch) qty, or null when the list didn't include stock. */
  stockQty: number | null;
};

export type RegroupItemLine = {
  itemId: string;
  variantName: string;
  sellsAsPack?: boolean;
  unitsPerPack?: number;
  packUnitName?: string;
  /** Caller-side flag: fold the row's own stock into the base pool after grouping. */
  foldStock?: boolean;
};

export type RegroupCreateParams = {
  mode: "create";
  name: string;
  itemTypeId: string;
  categoryId?: string;
  aisleId?: string;
  items: RegroupItemLine[];
};

export type RegroupAttachParams = {
  mode: "attach";
  parentId: string;
  items: RegroupItemLine[];
};

export type RegroupParams = RegroupCreateParams | RegroupAttachParams;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Products selected from the catalog list (standalones). */
  rows: ItemSummaryRecord[];
  itemTypes: ItemTypeRecord[];
  /** Default department when creating a new family. */
  defaultItemTypeId?: string | null;
  /**
   * When set, the modal attaches into this family (e.g. opened from a parent
   * detail panel) instead of creating a new one.
   */
  lockedParent?: { id: string; name: string } | null;
  busy?: boolean;
  apply: (params: RegroupParams) => Promise<boolean>;
};

/** Suggest a shared family name from size-like product titles (Dry Hook #12 → Dry Hook). */
export function suggestFamilyName(names: string[]): string {
  const cleaned = names
    .map((n) =>
      n
        .trim()
        .replace(
          /\s*[#]?\s*\d+(?:[./]\d+)?(?:\s*(?:mm|cm|ml|l|g|kg|oz|pack|pk))?$/i,
          "",
        )
        .replace(/\s+(xs|s|m|l|xl|xxl|2xl|3xl)$/i, "")
        .trim(),
    )
    .filter(Boolean);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0];
  let prefix = cleaned[0];
  for (let i = 1; i < cleaned.length; i++) {
    const next = cleaned[i];
    let j = 0;
    const max = Math.min(prefix.length, next.length);
    while (j < max && prefix[j].toLowerCase() === next[j].toLowerCase()) {
      j++;
    }
    prefix = prefix
      .slice(0, j)
      .replace(/[\s\-_/|:]+$/g, "")
      .trim();
    if (!prefix) break;
  }
  return prefix || cleaned[0];
}

/** Suggest an option label from size field or trailing tokens in the name. */
export function suggestVariantLabel(row: ItemSummaryRecord): string {
  const size = row.size?.trim();
  if (size) return size;
  const existing = row.variantName?.trim();
  if (existing) return existing;
  const name = row.name?.trim() || "";
  const hash = name.match(/#\s*[\w./-]+$/i);
  if (hash) return hash[0].replace(/\s+/g, "");
  const trail = name.match(
    /\b(?:XS|S|M|L|XL|XXL|2XL|3XL|\d+(?:[./]\d+)?(?:\s*(?:mm|cm|ml|l|g|kg|oz))?)$/i,
  );
  if (trail) return trail[0].trim();
  return name || row.sku || "Option";
}

function toDraft(row: ItemSummaryRecord): RegroupLineDraft {
  const wasPack = row.packageVariant === true;
  const units = Number(row.packageUnitsPerSale ?? 0);
  const stockRaw = row.stockQty;
  const stockQty =
    stockRaw === null || stockRaw === undefined ? null : Number(stockRaw);
  return {
    itemId: row.id,
    name: itemCatalogDisplayTitle(row) || row.name || row.sku,
    sku: row.sku,
    thumbnailUrl: itemListThumbnailUrl(row),
    variantName: suggestVariantLabel(row),
    sellShape: wasPack ? "pack" : "option",
    unitsPerPack: wasPack && units > 0 ? String(units) : "",
    wasPack,
    foldStock: false,
    stockQty: Number.isFinite(stockQty as number) ? stockQty : null,
  };
}

export function RegroupProductsModal({
  open,
  onOpenChange,
  rows,
  itemTypes,
  defaultItemTypeId,
  lockedParent = null,
  busy = false,
  apply,
}: Props) {
  const [mode, setMode] = useState<"create" | "attach">(
    lockedParent ? "attach" : "create",
  );
  const [familyName, setFamilyName] = useState("");
  const [itemTypeId, setItemTypeId] = useState("");
  const [lines, setLines] = useState<RegroupLineDraft[]>([]);
  const [parentQuery, setParentQuery] = useState("");
  const [parentHits, setParentHits] = useState<ItemSummaryRecord[]>([]);
  const [parentSearching, setParentSearching] = useState(false);
  const [selectedParent, setSelectedParent] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [addQuery, setAddQuery] = useState("");
  const [addHits, setAddHits] = useState<ItemSummaryRecord[]>([]);
  const [addSearching, setAddSearching] = useState(false);

  const activeTypes = useMemo(
    () => itemTypes.filter((t) => t.active !== false),
    [itemTypes],
  );

  useEffect(() => {
    if (!open) return;
    const drafts = rows.map(toDraft);
    setLines(drafts);
    setFamilyName(suggestFamilyName(drafts.map((d) => d.name)));
    const fromRow = rows.find((r) => r.itemTypeId?.trim())?.itemTypeId?.trim();
    const fallback =
      defaultItemTypeId?.trim() ||
      activeTypes.find((t) => t.isDefault)?.id ||
      activeTypes[0]?.id ||
      "";
    setItemTypeId(fromRow || fallback);
    const mostlyVariants =
      rows.length > 0 &&
      rows.filter((r) => Boolean(r.variantOfItemId?.trim())).length >=
        Math.ceil(rows.length / 2);
    if (lockedParent) {
      setMode("attach");
      setSelectedParent(lockedParent);
    } else if (mostlyVariants) {
      // Moving existing sizes: default to picking another family.
      setMode("attach");
      setSelectedParent(null);
    } else {
      setMode("create");
      setSelectedParent(null);
    }
    setParentQuery("");
    setParentHits([]);
    setAddQuery("");
    setAddHits([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rows, lockedParent?.id]);

  useEffect(() => {
    if (!open || mode !== "attach" || lockedParent) return undefined;
    const q = parentQuery.trim();
    if (!q) {
      setParentHits([]);
      setParentSearching(false);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setParentSearching(true);
      void fetchItemsPage(q, {
        catalogScope: "PARENTS_ONLY",
        page: 0,
        size: 12,
      })
        .then((page) => {
          if (cancelled) return;
          const selectedIds = new Set(lines.map((l) => l.itemId));
          setParentHits(
            page.content.filter(
              (row) => !row.variantOfItemId?.trim() && !selectedIds.has(row.id),
            ),
          );
        })
        .catch(() => {
          if (!cancelled) setParentHits([]);
        })
        .finally(() => {
          if (!cancelled) setParentSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, mode, parentQuery, lockedParent, lines]);

  useEffect(() => {
    if (!open || !lockedParent) return undefined;
    const q = addQuery.trim();
    if (!q) {
      setAddHits([]);
      setAddSearching(false);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setAddSearching(true);
      void fetchItemsPage(q, {
        catalogRowTypes: ["STANDALONE"],
        page: 0,
        size: 16,
      })
        .then((page) => {
          if (cancelled) return;
          const already = new Set(lines.map((l) => l.itemId));
          setAddHits(
            page.content.filter(
              (row) =>
                !already.has(row.id) &&
                !row.variantOfItemId?.trim() &&
                row.id !== lockedParent.id &&
                row.groupLabelOnly !== true,
            ),
          );
        })
        .catch(() => {
          if (!cancelled) setAddHits([]);
        })
        .finally(() => {
          if (!cancelled) setAddSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, lockedParent, addQuery, lines]);

  const updateLabel = (itemId: string, variantName: string) => {
    setLines((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, variantName } : l)),
    );
  };

  const toggleShape = (itemId: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.itemId !== itemId) return l;
        if (l.sellShape === "pack") {
          // Flipping back off only matters for rows that weren't packs yet;
          // already-pack rows keep their shape (un-packing lives in Edit).
          return l.wasPack ? l : { ...l, sellShape: "option", foldStock: false };
        }
        return {
          ...l,
          sellShape: "pack",
          // A freshly converted pack row would strand its own stock, so
          // default to folding it into the base pool.
          foldStock: !l.wasPack && (l.stockQty === null || l.stockQty > 0),
        };
      }),
    );
  };

  const updateUnits = (itemId: string, unitsPerPack: string) => {
    setLines((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, unitsPerPack } : l)),
    );
  };

  const updateFold = (itemId: string, foldStock: boolean) => {
    setLines((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, foldStock } : l)),
    );
  };

  const removeLine = (itemId: string) => {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  };

  const addLine = (row: ItemSummaryRecord) => {
    setLines((prev) => {
      if (prev.some((l) => l.itemId === row.id)) return prev;
      return [...prev, toDraft(row)];
    });
    setAddQuery("");
    setAddHits([]);
  };

  const movingExistingVariants = useMemo(
    () => rows.some((r) => Boolean(r.variantOfItemId?.trim())),
    [rows],
  );

  const labelsOk = lines.every((l) => l.variantName.trim().length > 0);
  const packsOk = lines.every((l) => {
    if (l.sellShape !== "pack") return true;
    const n = Number(l.unitsPerPack);
    return Number.isFinite(n) && n > 0;
  });
  const canSubmit =
    !busy &&
    lines.length >= 1 &&
    labelsOk &&
    packsOk &&
    (mode === "create"
      ? familyName.trim().length > 0 && itemTypeId.trim().length > 0
      : Boolean(selectedParent?.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const items = lines.map((l): RegroupItemLine => {
      const base: RegroupItemLine = {
        itemId: l.itemId,
        variantName: l.variantName.trim(),
      };
      if (l.sellShape !== "pack") return base;
      const units = Number(l.unitsPerPack);
      return {
        ...base,
        sellsAsPack: true,
        unitsPerPack: units,
        packUnitName: l.variantName.trim(),
        foldStock: l.foldStock && !l.wasPack,
      };
    });
    const ok =
      mode === "create"
        ? await apply({
            mode: "create",
            name: familyName.trim(),
            itemTypeId: itemTypeId.trim(),
            categoryId: rows
              .find((r) => r.categoryId?.trim())
              ?.categoryId?.trim(),
            aisleId: rows.find((r) => r.aisleId?.trim())?.aisleId?.trim(),
            items,
          })
        : await apply({
            mode: "attach",
            parentId: selectedParent!.id,
            items,
          });
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (busy ? null : onOpenChange(o))}>
      <DialogContent className="max-h-[min(92vh,40rem)] max-w-lg gap-0 overflow-hidden p-0 sm:max-w-xl">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-col"
        >
          <DialogHeader className="border-b border-border/50 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <GitBranchPlus className="size-5 text-primary" aria-hidden />
              {movingExistingVariants ? "Change family" : "Group as family"}
            </DialogTitle>
            <DialogDescription>
              {movingExistingVariants
                ? "Move the selected sizes under a different product family — or create a new one. Each keeps its SKU, stock, and sales history."
                : "Nest the selected sizes under one product. Each keeps its SKU, stock, and sales history — only the family link changes."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2.5 text-xs leading-relaxed text-foreground/90">
              <ShieldCheck
                className="mt-0.5 size-3.5 shrink-0 text-emerald-700 dark:text-emerald-400"
                aria-hidden
              />
              <p>
                Safe for cleanup: barcodes, on-hand stock, and past sales stay
                on the same products. Cashiers keep selling the same SKUs under
                the new family name.
              </p>
            </div>

            {!lockedParent ? (
              <div className="grid grid-cols-2 gap-1 rounded-md border border-border/60 bg-muted/20 p-1">
                {(
                  [
                    ["create", "New family"],
                    ["attach", "Existing family"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setMode(id);
                      if (id === "create") setSelectedParent(null);
                    }}
                    className={cn(
                      "rounded-sm px-3 py-2 text-xs font-semibold transition-colors",
                      mode === id
                        ? "bg-background text-foreground shadow-none"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {mode === "create" ? (
              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
                    Family name
                  </span>
                  <input
                    type="text"
                    disabled={busy}
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="e.g. Dry Hook"
                    className={cn(
                      dashboardInputClass(busy),
                      "h-10 shadow-none",
                    )}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
                    Department
                  </span>
                  <select
                    disabled={busy || activeTypes.length === 0}
                    value={itemTypeId}
                    onChange={(e) => setItemTypeId(e.target.value)}
                    className={cn(
                      dashboardSelectClass(busy),
                      "h-10 shadow-none",
                    )}
                  >
                    {activeTypes.length === 0 ? (
                      <option value="">No departments</option>
                    ) : (
                      activeTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedParent ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/[0.06] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
                        Family
                      </p>
                      <p className="truncate text-sm font-semibold text-foreground">
                        {selectedParent.name}
                      </p>
                    </div>
                    {!lockedParent ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 shrink-0 text-xs"
                        disabled={busy}
                        onClick={() => setSelectedParent(null)}
                      >
                        Change
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
                      Find existing family
                    </span>
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <input
                        type="search"
                        disabled={busy}
                        value={parentQuery}
                        onChange={(e) => setParentQuery(e.target.value)}
                        placeholder="Search by name…"
                        className={cn(
                          dashboardInputClass(busy),
                          "h-10 pl-9 shadow-none",
                        )}
                      />
                    </div>
                  </label>
                )}
                {!selectedParent && parentSearching ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Searching…
                  </p>
                ) : null}
                {!selectedParent && parentHits.length > 0 ? (
                  <ul className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border/60 p-1">
                    {parentHits.map((hit) => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setSelectedParent({
                              id: hit.id,
                              name: itemCatalogDisplayTitle(hit) || hit.name,
                            })
                          }
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-muted/50"
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {itemCatalogDisplayTitle(hit) || hit.name}
                          </span>
                          <Check
                            className="size-3.5 text-primary opacity-0"
                            aria-hidden
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}

            {lockedParent ? (
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
                  Add more products
                </span>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    type="search"
                    disabled={busy}
                    value={addQuery}
                    onChange={(e) => setAddQuery(e.target.value)}
                    placeholder="Search standalone products…"
                    className={cn(
                      dashboardInputClass(busy),
                      "h-10 pl-9 shadow-none",
                    )}
                  />
                </div>
                {addSearching ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Searching…
                  </p>
                ) : null}
                {addHits.length > 0 ? (
                  <ul className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-border/60 p-1">
                    {addHits.map((hit) => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => addLine(hit)}
                          className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-muted/50"
                        >
                          <span className="min-w-0 truncate font-medium">
                            {itemCatalogDisplayTitle(hit) || hit.name}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                            {hit.sku}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </label>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
                  Options ({lines.length})
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Labels like #12 · tap{" "}
                  <Package
                    className="inline size-3 align-[-1px]"
                    aria-hidden
                  />{" "}
                  for packs (Tray ×30)
                </p>
              </div>
              {lines.length === 0 ? (
                <p className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                  {lockedParent
                    ? "Search above to add standalone products to this family."
                    : "Select at least one standalone product in the list."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {lines.map((line) => (
                    <li
                      key={line.itemId}
                      className="space-y-2 rounded-md border border-border/60 bg-background px-2.5 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative size-8 shrink-0 overflow-hidden rounded-sm border border-border bg-muted">
                          {line.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={line.thumbnailUrl}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {line.name}
                          </p>
                          <p className="truncate font-mono text-[10px] text-muted-foreground">
                            {line.sku}
                          </p>
                        </div>
                        <input
                          type="text"
                          disabled={busy}
                          value={line.variantName}
                          onChange={(e) =>
                            updateLabel(line.itemId, e.target.value)
                          }
                          aria-label={`Option label for ${line.name}`}
                          className={cn(
                            dashboardInputClass(busy),
                            "h-8 w-[5.5rem] shrink-0 px-2 text-center text-xs font-semibold shadow-none",
                          )}
                        />
                        <button
                          type="button"
                          disabled={busy || (line.wasPack && line.sellShape === "pack")}
                          onClick={() => toggleShape(line.itemId)}
                          title={
                            line.sellShape === "pack"
                              ? line.wasPack
                                ? "Already sells as a pack of the base product"
                                : "Sells as a pack of the base product — click to make it a flavor/size with its own stock"
                              : "Mark as a pack of the base product (e.g. crate ×24)"
                          }
                          aria-label={`Toggle pack shape for ${line.name}`}
                          aria-pressed={line.sellShape === "pack"}
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                            line.sellShape === "pack"
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-border/60 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Package className="size-4" aria-hidden />
                        </button>
                        {lines.length > 1 || lockedParent ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 shrink-0 px-0 text-muted-foreground"
                            disabled={busy}
                            onClick={() => removeLine(line.itemId)}
                            aria-label={`Remove ${line.name}`}
                          >
                            ×
                          </Button>
                        ) : null}
                      </div>
                      {line.sellShape === "pack" ? (
                        <div className="space-y-1.5 rounded-sm bg-muted/30 px-2 py-1.5">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-foreground/90">
                            <span className="font-medium">Pack of</span>
                            <input
                              type="number"
                              min={1}
                              step="any"
                              inputMode="decimal"
                              disabled={busy}
                              value={line.unitsPerPack}
                              onChange={(e) =>
                                updateUnits(line.itemId, e.target.value)
                              }
                              placeholder="24"
                              aria-label={`Units per pack for ${line.name}`}
                              className={cn(
                                dashboardInputClass(busy),
                                "h-7 w-16 px-2 text-center text-xs font-semibold shadow-none",
                              )}
                            />
                            <span className="text-muted-foreground">
                              base units — stock counts from the family&apos;s
                              shared pool.
                            </span>
                          </div>
                          {!line.wasPack &&
                          (line.stockQty === null || line.stockQty > 0) ? (
                            <label className="flex cursor-pointer items-start gap-1.5 text-[11px] text-foreground/90">
                              <input
                                type="checkbox"
                                disabled={busy}
                                checked={line.foldStock}
                                onChange={(e) =>
                                  updateFold(line.itemId, e.target.checked)
                                }
                                className="mt-0.5 size-3.5 accent-primary"
                              />
                              <span>
                                Move its own on-hand
                                {line.stockQty !== null
                                  ? ` (${line.stockQty})`
                                  : ""}{" "}
                                into the base pool so nothing is stranded
                              </span>
                            </label>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-border/50 bg-muted/20 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} className="gap-2">
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <GitBranchPlus className="size-4" aria-hidden />
              )}
              {mode === "create"
                ? "Create family"
                : movingExistingVariants
                  ? "Move to family"
                  : "Attach to family"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
