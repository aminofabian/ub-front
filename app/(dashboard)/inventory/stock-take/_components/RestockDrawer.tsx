"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, PackagePlus } from "lucide-react";

import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { dashboardInputClass } from "@/components/dashboard-page-ui";
import {
  fetchSupplierItemLinks,
  postDailyAuditRestock,
  type StockTakeRestockItemRecord,
  type StockTakeRestockSupplierOptionRecord,
  type SupplierItemLinkRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function formatPrice(v: number | string | null | undefined): string {
  if (v == null || v === "") return "Price missing — admin will enter";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMoneyShort(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQty(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

function linkCost(link: SupplierItemLinkRecord): number | string | null {
  return (
    link.defaultCostPrice ??
    link.lastCostPrice ??
    link.catalogBuyingPrice ??
    null
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  lineId: string;
  itemId: string;
  itemName: string;
  branchId?: string | null;
  options: StockTakeRestockSupplierOptionRecord[];
  pendingSuggestion: StockTakeRestockItemRecord | null;
  onSaved: (item: StockTakeRestockItemRecord) => void;
};

export function RestockDrawer({
  open,
  onOpenChange,
  sessionId,
  lineId,
  itemId,
  itemName,
  branchId = null,
  options,
  pendingSuggestion,
  onSaved,
}: Props) {
  const [supplierId, setSupplierId] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedItems, setLinkedItems] = useState<SupplierItemLinkRecord[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(false);
  const [linkedError, setLinkedError] = useState<string | null>(null);

  const selected = useMemo(
    () => options.find((o) => o.supplierId === supplierId) ?? null,
    [options, supplierId],
  );

  const activeLinked = useMemo(
    () => linkedItems.filter((l) => l.active),
    [linkedItems],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (pendingSuggestion) {
      setSupplierId(pendingSuggestion.supplierId);
      setQty(String(pendingSuggestion.suggestedQty));
      setNote(pendingSuggestion.notes ?? "");
      return;
    }
    const primary = options.find((o) => o.primary) ?? options[0] ?? null;
    setSupplierId(primary?.supplierId ?? "");
    setQty("");
    setNote("");
  }, [open, options, pendingSuggestion]);

  useEffect(() => {
    if (!open || !supplierId.trim()) {
      setLinkedItems([]);
      setLinkedError(null);
      setLinkedLoading(false);
      return;
    }
    let cancelled = false;
    setLinkedLoading(true);
    setLinkedError(null);
    void fetchSupplierItemLinks(supplierId, {
      branchId: branchId?.trim() || undefined,
    })
      .then((list) => {
        if (cancelled) return;
        setLinkedItems(list);
      })
      .catch((e) => {
        if (cancelled) return;
        setLinkedItems([]);
        setLinkedError(
          e instanceof Error ? e.message : "Could not load linked products.",
        );
      })
      .finally(() => {
        if (!cancelled) setLinkedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, supplierId, branchId]);

  const submit = async () => {
    const parsedQty = Number(qty);
    if (!supplierId) {
      setError("Choose a supplier.");
      return;
    }
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError("Enter a valid quantity.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await postDailyAuditRestock(sessionId, {
        lineId,
        supplierId,
        suggestedQty: parsedQty,
        note: note.trim() || null,
      });
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save restock suggestion");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={pendingSuggestion ? "Update restock suggestion" : "Add to restock list"}
      description={`Recommend restocking for ${itemName}. Price is set from the supplier link.`}
      contextLabel="Daily audit"
      icon={<PackagePlus className="h-5 w-5" />}
      width="wide"
      banner={error ? <FormDrawerMessageBanner text={error} /> : null}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || options.length === 0}>
            {saving ? "Saving…" : pendingSuggestion ? "Update" : "Add to list"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Supplier</legend>
          {options.map((opt) => {
            const lastPurchase = formatDate(opt.lastPurchaseAt);
            const packLabel =
              opt.packSize && opt.packUnit
                ? ` · ${opt.packSize} ${opt.packUnit}`
                : opt.packUnit
                  ? ` · ${opt.packUnit}`
                  : "";
            return (
              <label
                key={opt.supplierId}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition-colors",
                  supplierId === opt.supplierId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name="restock-supplier"
                  className="mt-1"
                  checked={supplierId === opt.supplierId}
                  onChange={() => setSupplierId(opt.supplierId)}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">
                    {opt.supplierName}
                    {opt.primary ? " · Primary" : ""}
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    KES {formatPrice(opt.buyingPrice ?? opt.defaultCostPrice ?? opt.lastCostPrice)}
                    {packLabel}
                    {lastPurchase ? ` · Last purchase: ${lastPurchase}` : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {selected ? (
          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium">
                Products linked to {selected.supplierName}
              </h3>
              {!linkedLoading && !linkedError ? (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {activeLinked.length}
                </span>
              ) : null}
            </div>
            {linkedLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-4 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Loading linked products…
              </div>
            ) : linkedError ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
                {linkedError}
              </p>
            ) : activeLinked.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">
                No catalog products are linked to this supplier yet.
              </p>
            ) : (
              <div className="max-h-[min(16rem,40vh)] overflow-auto rounded-lg border border-border/70">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                    <tr>
                      <th className="px-2.5 py-1.5 font-semibold">Product</th>
                      <th className="px-2.5 py-1.5 text-right font-semibold">
                        Stock
                      </th>
                      <th className="px-2.5 py-1.5 text-right font-semibold">
                        Cost
                      </th>
                      <th className="px-2.5 py-1.5 text-right font-semibold">
                        Pack
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLinked.map((link) => {
                      const isCurrent = link.itemId === itemId;
                      const pack =
                        link.packSize != null && link.packUnit
                          ? `${formatQty(link.packSize)} / ${link.packUnit}`
                          : link.packUnit || "—";
                      return (
                        <tr
                          key={link.id}
                          className={cn(
                            "border-t border-border/50",
                            isCurrent
                              ? "bg-primary/10"
                              : "hover:bg-muted/40",
                          )}
                        >
                          <td className="max-w-0 px-2.5 py-1.5">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span
                                className={cn(
                                  "truncate font-medium",
                                  isCurrent && "text-primary",
                                )}
                                title={link.itemName || link.itemId}
                              >
                                {link.itemName || link.itemId}
                              </span>
                              {isCurrent ? (
                                <span className="shrink-0 rounded bg-primary/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-primary">
                                  This item
                                </span>
                              ) : null}
                              {link.primary ? (
                                <span
                                  className="shrink-0 text-[9px] font-bold uppercase text-muted-foreground"
                                  title="Primary supplier for this product"
                                >
                                  1°
                                </span>
                              ) : null}
                            </div>
                            {link.sku ? (
                              <p className="truncate font-mono text-[10px] text-muted-foreground">
                                {link.sku}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono tabular-nums">
                            {formatQty(link.currentStock)}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono tabular-nums">
                            {formatMoneyShort(linkCost(link))}
                          </td>
                          <td className="px-2.5 py-1.5 text-right text-muted-foreground">
                            {pack}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Buying price for {itemName}: KES{" "}
              {formatPrice(
                selected.buyingPrice ??
                  selected.defaultCostPrice ??
                  selected.lastCostPrice,
              )}
            </p>
          </section>
        ) : null}

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Suggested quantity</span>
          <input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            className={dashboardInputClass()}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Note (optional)</span>
          <textarea
            className={cn(dashboardInputClass(), "min-h-[72px] resize-y")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Shelf gap, promo demand, etc."
          />
        </label>
      </div>
    </FormDrawer>
  );
}
