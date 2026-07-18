"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import { Layers, PackagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

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
  fetchItems,
  createPosQuickItem,
  type ItemSummaryRecord,
  type ItemTypeRecord,
} from "@/lib/api";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
import { cn } from "@/lib/utils";

type CreateMode = "single" | "group";

type VariantRow = {
  key: string;
  label: string;
  barcode: string;
  buyingPrice: string;
  unitPrice: string;
  stock: string;
};

type CashierCreateProductModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  currency: string;
  branchId: string;
  itemTypes: ItemTypeRecord[];
  preferredItemTypeId?: string | null;
  onCreated: (item: ItemSummaryRecord, unitPrice: string) => void;
};

function relatedLinkHint(related: ItemSummaryRecord): string {
  if (related.variantOfItemId?.trim()) {
    return `Sibling of “${cashierItemPrimaryLabel(related)}” — same parent product.`;
  }
  return `Child of “${cashierItemPrimaryLabel(related)}”.`;
}

function newVariantRow(seed?: Partial<VariantRow>): VariantRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: "",
    barcode: "",
    buyingPrice: "",
    unitPrice: "",
    stock: "1",
    ...seed,
  };
}

function parsePosMoney(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNonNegMoney(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parsePosQty(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function CashierCreateProductModal({
  open,
  onOpenChange,
  brandTheme,
  currency,
  branchId,
  itemTypes,
  preferredItemTypeId,
  onCreated,
}: CashierCreateProductModalProps) {
  const modeId = useId();
  const [mode, setMode] = useState<CreateMode>("single");

  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [initialStockQty, setInitialStockQty] = useState("1");
  const [itemTypeId, setItemTypeId] = useState("");
  const [linkAsVariant, setLinkAsVariant] = useState(false);
  const [relatedQuery, setRelatedQuery] = useState("");
  const [relatedHits, setRelatedHits] = useState<ItemSummaryRecord[]>([]);
  const [relatedBusy, setRelatedBusy] = useState(false);
  const [relatedItem, setRelatedItem] = useState<ItemSummaryRecord | null>(
    null,
  );
  const [variantName, setVariantName] = useState("");
  const [groupVariants, setGroupVariants] = useState<VariantRow[]>(() => [
    newVariantRow(),
    newVariantRow(),
  ]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode("single");
    setName("");
    setBarcode("");
    setBuyingPrice("");
    setUnitPrice("");
    setInitialStockQty("1");
    setLinkAsVariant(false);
    setRelatedQuery("");
    setRelatedHits([]);
    setRelatedItem(null);
    setVariantName("");
    setGroupVariants([newVariantRow(), newVariantRow()]);
    const preferred = preferredItemTypeId?.trim();
    const fallback =
      preferred && itemTypes.some((t) => t.id === preferred)
        ? preferred
        : itemTypes.find((t) => t.isDefault)?.id || itemTypes[0]?.id || "";
    setItemTypeId(fallback);
  }, [open, preferredItemTypeId, itemTypes]);

  useEffect(() => {
    if (!open || mode !== "single" || !linkAsVariant || relatedItem) {
      setRelatedHits([]);
      setRelatedBusy(false);
      return;
    }
    const q = relatedQuery.trim();
    if (q.length < 2) {
      setRelatedHits([]);
      setRelatedBusy(false);
      return;
    }
    let cancelled = false;
    setRelatedBusy(true);
    const t = window.setTimeout(() => {
      void fetchItems(q, { size: 8, catalogScope: "ALL", softAuth: true })
        .then((rows) => {
          if (!cancelled) setRelatedHits(rows);
        })
        .catch(() => {
          if (!cancelled) setRelatedHits([]);
        })
        .finally(() => {
          if (!cancelled) setRelatedBusy(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, mode, linkAsVariant, relatedQuery, relatedItem]);

  const priceNum = Number(unitPrice);
  const buyingNum = buyingPrice.trim() === "" ? null : Number(buyingPrice);
  const stockNum = Number(initialStockQty);
  const buyingOk =
    buyingNum == null || (Number.isFinite(buyingNum) && buyingNum >= 0);
  const stockOk = Number.isFinite(stockNum) && stockNum > 0;
  const variantLinkOk = !linkAsVariant || relatedItem != null;

  const readyGroupVariants = groupVariants
    .map((row) => {
      const label = row.label.trim();
      const sell = parsePosMoney(row.unitPrice);
      const buy = parseNonNegMoney(row.buyingPrice);
      const stock = parsePosQty(row.stock);
      if (!label || sell == null || stock == null) return null;
      if (row.buyingPrice.trim() && buy == null) return null;
      return {
        key: row.key,
        label,
        barcode: row.barcode.trim(),
        unitPrice: sell,
        buyingPrice: buy,
        stock,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  const canSubmitSingle =
    mode === "single" &&
    name.trim().length > 0 &&
    itemTypeId.trim().length > 0 &&
    branchId.trim().length > 0 &&
    Number.isFinite(priceNum) &&
    priceNum > 0 &&
    buyingOk &&
    stockOk &&
    variantLinkOk;

  const canSubmitGroup =
    mode === "group" &&
    name.trim().length > 0 &&
    itemTypeId.trim().length > 0 &&
    branchId.trim().length > 0 &&
    readyGroupVariants.length >= 1 &&
    readyGroupVariants.length ===
      groupVariants.filter((r) => r.label.trim() || r.unitPrice.trim()).length;

  const canSubmit = canSubmitSingle || canSubmitGroup;

  const patchVariant = (key: string, patch: Partial<VariantRow>) => {
    setGroupVariants((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      if (mode === "group") {
        const created = await createPosQuickItem({
          name: name.trim(),
          itemTypeId: itemTypeId.trim(),
          branchId: branchId.trim() || undefined,
          unitType: "each",
          createAsGroup: true,
          variants: readyGroupVariants.map((v) => ({
            variantName: v.label,
            barcode: v.barcode || undefined,
            unitPrice: v.unitPrice,
            buyingPrice: v.buyingPrice ?? undefined,
            initialStockQty: v.stock,
          })),
        });
        const first = readyGroupVariants[0];
        const priceStr = first.unitPrice.toFixed(2);
        onCreated(
          {
            id: created.id,
            name: created.name,
            sku: created.sku ?? "",
            barcode: first.barcode || undefined,
            stockQty: first.stock,
            variantName: first.label,
            variantOfItemId: undefined,
          },
          priceStr,
        );
        toast.success(
          readyGroupVariants.length === 1
            ? "Group created with 1 option"
            : `Group created with ${readyGroupVariants.length} options`,
        );
        onOpenChange(false);
        return;
      }

      const created = await createPosQuickItem({
        name: name.trim(),
        itemTypeId: itemTypeId.trim(),
        barcode: barcode.trim() || undefined,
        branchId: branchId.trim() || undefined,
        unitPrice: priceNum,
        buyingPrice: buyingNum ?? undefined,
        initialStockQty: stockNum,
        unitType: "each",
        relatedItemId: linkAsVariant ? relatedItem?.id : undefined,
        variantName:
          linkAsVariant && variantName.trim()
            ? variantName.trim()
            : undefined,
      });
      const priceStr = priceNum.toFixed(2);
      onCreated(
        {
          id: created.id,
          name: created.name,
          sku: created.sku ?? "",
          barcode: barcode.trim() || undefined,
          stockQty: stockNum,
          variantName: linkAsVariant
            ? variantName.trim() || name.trim()
            : undefined,
          variantOfItemId: linkAsVariant
            ? relatedItem?.variantOfItemId?.trim() || relatedItem?.id
            : undefined,
        },
        priceStr,
      );
      toast.success(linkAsVariant ? "Variant created" : "Product created");
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create product";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const fieldClass = cn(
    "h-10 w-full rounded-xl border border-border/55 bg-background px-3 text-sm shadow-sm",
    "focus:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_40%,var(--border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)]",
  );
  const currencySuffix = currency ? ` (${currency})` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        className={cn(
          "max-h-[min(94dvh,44rem)] gap-0 overflow-hidden p-0",
          mode === "group" ? "max-w-lg" : "max-w-md",
        )}
        style={brandTheme}
      >
        <div className="border-b border-border/40 px-4 py-4">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <PackagePlus className="size-4 text-[var(--pos-primary)]" />
              Add product
            </DialogTitle>
            <DialogDescription className="text-xs">
              {mode === "group"
                ? "Name the group, then add each sellable option with its own price and stock."
                : "Create a sellable item and add it to the cart. Optionally link it as a variant."}
            </DialogDescription>
          </DialogHeader>

          <div
            className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-border/50 bg-muted/25 p-1"
            role="tablist"
            aria-label="Product shape"
          >
            <button
              type="button"
              role="tab"
              id={`${modeId}-single`}
              aria-selected={mode === "single"}
              disabled={busy}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors",
                mode === "single"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setMode("single");
              }}
            >
              <PackagePlus className="size-3.5" />
              Single item
            </button>
            <button
              type="button"
              role="tab"
              id={`${modeId}-group`}
              aria-selected={mode === "group"}
              disabled={busy}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors",
                mode === "group"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setMode("group");
                setLinkAsVariant(false);
                setRelatedItem(null);
              }}
            >
              <Layers className="size-3.5" />
              Group + options
            </button>
          </div>
        </div>

        <div className="max-h-[min(62dvh,30rem)] space-y-3 overflow-y-auto px-4 py-4">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {mode === "group" ? "Group name" : "Name"}
            </span>
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                mode === "group"
                  ? "e.g. Fresh milk, Phone cases"
                  : "Product name"
              }
              autoFocus
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Department
            </span>
            <select
              className={fieldClass}
              value={itemTypeId}
              onChange={(e) => setItemTypeId(e.target.value)}
              disabled={
                itemTypes.length === 0 ||
                (mode === "single" && linkAsVariant && relatedItem != null)
              }
            >
              {itemTypes.length === 0 ? (
                <option value="">No departments</option>
              ) : (
                itemTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))
              )}
            </select>
            {mode === "single" && linkAsVariant && relatedItem != null ? (
              <span className="text-[11px] text-muted-foreground">
                Department is inherited from the parent product.
              </span>
            ) : mode === "group" ? (
              <span className="text-[11px] text-muted-foreground">
                Options inherit this department.
              </span>
            ) : null}
          </label>

          {mode === "single" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Barcode (optional)
                </span>
                <input
                  className={fieldClass}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or type barcode"
                />
              </label>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--pos-primary)]"
                  checked={linkAsVariant}
                  disabled={busy}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setLinkAsVariant(on);
                    if (!on) {
                      setRelatedItem(null);
                      setRelatedQuery("");
                      setRelatedHits([]);
                      setVariantName("");
                    }
                  }}
                />
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-sm font-medium text-foreground">
                    Add as a variant
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    Link under an existing product or sibling option.
                  </span>
                </span>
              </label>

              {linkAsVariant ? (
                <div className="space-y-2 rounded-xl border border-border/50 bg-card/60 p-3">
                  {relatedItem ? (
                    <div className="flex items-start gap-2 rounded-lg border border-border/45 bg-background px-2.5 py-2">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-sm font-medium">
                          {cashierItemPrimaryLabel(relatedItem)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {relatedLinkHint(relatedItem)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Clear related product"
                        onClick={() => {
                          setRelatedItem(null);
                          setRelatedQuery("");
                        }}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Find parent or sibling
                      </span>
                      <input
                        className={fieldClass}
                        value={relatedQuery}
                        onChange={(e) => setRelatedQuery(e.target.value)}
                        placeholder="Search name, SKU, or barcode"
                      />
                      {relatedBusy ? (
                        <p className="text-[11px] text-muted-foreground">
                          Searching…
                        </p>
                      ) : null}
                      {relatedHits.length > 0 ? (
                        <ul className="max-h-36 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/40">
                          {relatedHits.map((hit) => (
                            <li key={hit.id}>
                              <button
                                type="button"
                                className="flex w-full flex-col items-start gap-0.5 px-2.5 py-2 text-left hover:bg-muted/50"
                                onClick={() => {
                                  setRelatedItem(hit);
                                  setRelatedQuery("");
                                  setRelatedHits([]);
                                  if (!variantName.trim() && hit.size?.trim()) {
                                    setVariantName(hit.size.trim());
                                  }
                                }}
                              >
                                <span className="text-sm font-medium">
                                  {cashierItemPrimaryLabel(hit)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {hit.variantOfItemId?.trim()
                                    ? "Variant — add as sibling"
                                    : hit.groupLabelOnly
                                      ? "Parent group"
                                      : "Parent / product"}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : relatedQuery.trim().length >= 2 && !relatedBusy ? (
                        <p className="text-[11px] text-muted-foreground">
                          No matches.
                        </p>
                      ) : null}
                    </label>
                  )}

                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Variant label
                    </span>
                    <input
                      className={fieldClass}
                      value={variantName}
                      onChange={(e) => setVariantName(e.target.value)}
                      placeholder="e.g. 500ml, Tray, Large"
                    />
                  </label>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Buying price{currencySuffix}
                  </span>
                  <input
                    className={cn(fieldClass, "text-right tabular-nums")}
                    inputMode="decimal"
                    value={buyingPrice}
                    onChange={(e) => setBuyingPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Sell price{currencySuffix}
                  </span>
                  <input
                    className={cn(
                      fieldClass,
                      "text-right font-semibold tabular-nums",
                    )}
                    inputMode="decimal"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Opening stock
                </span>
                <input
                  className={cn(fieldClass, "text-right tabular-nums")}
                  inputMode="decimal"
                  value={initialStockQty}
                  onChange={(e) => setInitialStockQty(e.target.value)}
                  placeholder="1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit && !busy) {
                      e.preventDefault();
                      void onSubmit();
                    }
                  }}
                />
                <span className="text-[11px] text-muted-foreground">
                  Received at this till branch so the item can be sold right
                  away.
                </span>
              </label>
            </>
          ) : (
            <section className="space-y-2">
              <div className="flex items-end justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Options
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {readyGroupVariants.length} ready
                </span>
              </div>

              <ul className="space-y-2">
                {groupVariants.map((row, index) => {
                  const sellOk = parsePosMoney(row.unitPrice) != null;
                  const labelOk = row.label.trim().length > 0;
                  const active = labelOk || row.unitPrice.trim().length > 0;
                  return (
                    <li
                      key={row.key}
                      className={cn(
                        "rounded-2xl border px-3 py-2.5 transition-colors",
                        sellOk && labelOk
                          ? "border-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_5%,transparent)]"
                          : "border-border/60 bg-card",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Option {index + 1}
                        </span>
                        {groupVariants.length > 1 ? (
                          <button
                            type="button"
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            aria-label={`Remove option ${index + 1}`}
                            disabled={busy}
                            onClick={() =>
                              setGroupVariants((prev) =>
                                prev.filter((r) => r.key !== row.key),
                              )
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <label className="block space-y-0.5">
                            <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                              Label
                            </span>
                            <input
                              className={fieldClass}
                              value={row.label}
                              disabled={busy}
                              onChange={(e) =>
                                patchVariant(row.key, {
                                  label: e.target.value,
                                })
                              }
                              placeholder="e.g. 500ml, Red, Large"
                            />
                          </label>
                          <label className="block space-y-0.5">
                            <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                              Stock
                            </span>
                            <input
                              className={cn(
                                fieldClass,
                                "w-[4.5rem] text-center font-mono tabular-nums",
                              )}
                              inputMode="decimal"
                              value={row.stock}
                              disabled={busy}
                              onChange={(e) =>
                                patchVariant(row.key, {
                                  stock: e.target.value,
                                })
                              }
                              placeholder="1"
                            />
                          </label>
                        </div>
                        <label className="block space-y-0.5">
                          <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                            Barcode (optional)
                          </span>
                          <input
                            className={fieldClass}
                            value={row.barcode}
                            disabled={busy}
                            onChange={(e) =>
                              patchVariant(row.key, {
                                barcode: e.target.value,
                              })
                            }
                            placeholder="Scan or type"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block space-y-0.5">
                            <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                              Buy{currencySuffix}
                            </span>
                            <input
                              className={cn(
                                fieldClass,
                                "text-right font-mono tabular-nums",
                              )}
                              inputMode="decimal"
                              value={row.buyingPrice}
                              disabled={busy}
                              onChange={(e) =>
                                patchVariant(row.key, {
                                  buyingPrice: e.target.value,
                                })
                              }
                              placeholder="0.00"
                            />
                          </label>
                          <label className="block space-y-0.5">
                            <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                              Sell{currencySuffix}
                            </span>
                            <input
                              className={cn(
                                fieldClass,
                                "text-right font-mono font-semibold tabular-nums",
                                active &&
                                  !sellOk &&
                                  "border-destructive/40",
                              )}
                              inputMode="decimal"
                              value={row.unitPrice}
                              disabled={busy}
                              onChange={(e) =>
                                patchVariant(row.key, {
                                  unitPrice: e.target.value,
                                })
                              }
                              placeholder="0.00"
                            />
                          </label>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full rounded-xl gap-1.5"
                disabled={busy || groupVariants.length >= 24}
                onClick={() =>
                  setGroupVariants((prev) => [...prev, newVariantRow()])
                }
              >
                <Plus className="size-3.5" />
                Add another option
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Fill label + sell price on each option you want. Empty rows are
                ignored if you leave them blank — or remove them.
              </p>
            </section>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-border/40 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || busy}
            className="bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] hover:opacity-90"
            onClick={() => void onSubmit()}
          >
            {busy
              ? "Creating…"
              : mode === "group"
                ? `Create group${readyGroupVariants.length ? ` · ${readyGroupVariants.length}` : ""}`
                : "Create & add to cart"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
