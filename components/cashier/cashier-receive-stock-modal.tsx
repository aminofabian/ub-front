"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Loader2,
  PackagePlus,
  Search,
  Truck,
  X,
} from "lucide-react";
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
  addPathBLine,
  createPathBSession,
  fetchSupplierItemLinks,
  fetchSuppliersPage,
  postPathBSession,
  postSellingPrice,
  type SupplierItemLinkRecord,
  type SupplierRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type LineDraft = {
  itemId: string;
  name: string;
  sku: string;
  stock: number | null;
  qtyStr: string;
  costStr: string;
  sellStr: string;
  seedCost: string;
  seedSell: string;
};

type CashierReceiveStockModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  branchId: string;
  currency: string;
  canSetSellPrice?: boolean;
  initialSupplier?: SupplierRecord | null;
  onPosted?: () => void;
};

const fieldClass = cn(
  "w-full rounded-lg border border-border/60 bg-background px-2.5 py-2 text-sm shadow-sm",
  "placeholder:text-muted-foreground/50",
  "focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_22%,transparent)]",
);

function moneySeed(raw: number | string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return "";
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : "";
}

function parsePos(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNonNeg(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function formatStock(n: number | null): string {
  if (n == null) return "—";
  return Number.isInteger(n)
    ? n.toLocaleString("en-KE")
    : n.toLocaleString("en-KE", { maximumFractionDigits: 2 });
}

function linkToDraft(link: SupplierItemLinkRecord): LineDraft {
  const stock =
    link.currentStock != null && String(link.currentStock).trim() !== ""
      ? Number(link.currentStock)
      : null;
  const cost = moneySeed(
    link.lastCostPrice ?? link.defaultCostPrice ?? link.catalogBuyingPrice,
  );
  const sell = moneySeed(link.catalogShelfPrice);
  return {
    itemId: link.itemId,
    name: link.itemName || link.sku || "Product",
    sku: link.sku || "",
    stock: Number.isFinite(stock as number) ? (stock as number) : null,
    qtyStr: "",
    costStr: cost,
    sellStr: sell,
    seedCost: cost,
    seedSell: sell,
  };
}

export function CashierReceiveStockModal({
  open,
  onOpenChange,
  brandTheme,
  branchId,
  currency,
  canSetSellPrice = false,
  initialSupplier = null,
  onPosted,
}: CashierReceiveStockModalProps) {
  const code = currency.trim().toUpperCase() || "KES";

  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierHits, setSupplierHits] = useState<SupplierRecord[]>([]);
  const [supplierBusy, setSupplierBusy] = useState(false);
  const [supplier, setSupplier] = useState<SupplierRecord | null>(null);

  const [lines, setLines] = useState<LineDraft[]>([]);
  const [linesBusy, setLinesBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSupplier(initialSupplier ?? null);
    setSupplierQuery("");
    setSupplierHits([]);
    setFilter("");
    setLines([]);
  }, [open, initialSupplier]);

  useEffect(() => {
    if (!open || supplier) {
      if (supplier) {
        setSupplierHits([]);
        setSupplierBusy(false);
      }
      return;
    }
    const q = supplierQuery.trim();
    let cancelled = false;
    const t = window.setTimeout(
      () => {
        setSupplierBusy(true);
        void fetchSuppliersPage({
          ...(q ? { search: q } : {}),
          page: 0,
          size: 24,
          status: "active",
        })
          .then((page) => {
            if (!cancelled) setSupplierHits(page.content);
          })
          .catch(() => {
            if (!cancelled) setSupplierHits([]);
          })
          .finally(() => {
            if (!cancelled) setSupplierBusy(false);
          });
      },
      q ? 220 : 0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, supplier, supplierQuery]);

  useEffect(() => {
    if (!open || !supplier) {
      setLines([]);
      return;
    }
    let cancelled = false;
    setLinesBusy(true);
    void fetchSupplierItemLinks(supplier.id, { branchId })
      .then((list) => {
        if (cancelled) return;
        setLines(list.filter((l) => l.active).map(linkToDraft));
      })
      .catch(() => {
        if (!cancelled) {
          setLines([]);
          toast.error("Could not load supplier products");
        }
      })
      .finally(() => {
        if (!cancelled) setLinesBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, supplier, branchId]);

  const visibleLines = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.sku.toLowerCase().includes(q),
    );
  }, [lines, filter]);

  const readyLines = useMemo(
    () =>
      lines.filter((l) => {
        const qty = parsePos(l.qtyStr);
        const cost = parseNonNeg(l.costStr);
        return qty != null && cost != null;
      }),
    [lines],
  );

  const payable = useMemo(
    () =>
      readyLines.reduce((sum, l) => {
        const qty = parsePos(l.qtyStr) ?? 0;
        const cost = parseNonNeg(l.costStr) ?? 0;
        return sum + qty * cost;
      }, 0),
    [readyLines],
  );

  const patchLine = (itemId: string, patch: Partial<LineDraft>) => {
    setLines((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)),
    );
  };

  const onSave = async () => {
    if (!supplier) {
      toast.error("Pick a supplier");
      return;
    }
    const bid = branchId.trim();
    if (!bid) {
      toast.error("Select a branch first");
      return;
    }
    if (readyLines.length === 0) {
      toast.error("Enter qty and buy price on at least one product");
      return;
    }

    setSaving(true);
    try {
      const session = await createPathBSession({
        supplierId: supplier.id,
        branchId: bid,
        receivedAt: new Date().toISOString(),
        notes: "Quick receive from cashier",
      });

      const synced: { line: LineDraft; serverLineId: string }[] = [];
      for (const line of readyLines) {
        const qty = parsePos(line.qtyStr)!;
        const cost = parseNonNeg(line.costStr)!;
        const amountMoney = Math.round(qty * cost * 100) / 100;
        const created = await addPathBLine(session.id, {
          description: `${line.name}${line.sku ? ` (${line.sku})` : ""}`,
          amountMoney,
          suggestedItemId: line.itemId,
        });
        synced.push({ line, serverLineId: created.id });
      }

      await postPathBSession(session.id, {
        lines: synced.map(({ line, serverLineId }) => ({
          lineId: serverLineId,
          itemId: line.itemId,
          usableQty: parsePos(line.qtyStr)!,
          wastageQty: 0,
        })),
      });

      if (canSetSellPrice) {
        const now = new Date().toISOString();
        for (const line of readyLines) {
          const sell = parseNonNeg(line.sellStr);
          if (sell == null) continue;
          const seed = parseNonNeg(line.seedSell);
          if (seed != null && Math.abs(sell - seed) < 0.005) continue;
          try {
            await postSellingPrice({
              itemId: line.itemId,
              branchId: bid,
              price: sell,
              effectiveFrom: now,
              notes: "Set from cashier receive",
            });
          } catch {
            /* stock already posted; price is best-effort */
          }
        }
      }

      toast.success(
        readyLines.length === 1
          ? `Stock updated · ${payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })} ${code}`
          : `${readyLines.length} products updated · ${payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })} ${code}`,
      );
      onPosted?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update stock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        className="flex max-h-[min(94dvh,44rem)] max-w-lg flex-col gap-0 overflow-hidden p-0"
        style={brandTheme}
      >
        <div className="relative overflow-hidden border-b border-border/40 px-4 pb-3 pt-4">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--pos-primary) 16%, transparent), transparent 55%)",
            }}
            aria-hidden
          />
          <DialogHeader className="relative space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="flex size-8 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--pos-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)] text-[var(--pos-primary)]">
                <PackagePlus className="size-4" />
              </span>
              Receive stock
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pick a supplier, enter what arrived — qty, buy price, sell price.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {/* Supplier */}
          <section className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              From
            </p>
            {supplier ? (
              <div className="flex items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_6%,transparent)] px-3 py-2.5">
                <Truck className="size-4 shrink-0 text-[var(--pos-primary)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{supplier.name}</p>
                  {supplier.code ? (
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {supplier.code}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 rounded-lg px-2 text-xs"
                  disabled={saving}
                  onClick={() => {
                    setSupplier(null);
                    setLines([]);
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className={cn(fieldClass, "rounded-xl pl-9")}
                    value={supplierQuery}
                    onChange={(e) => setSupplierQuery(e.target.value)}
                    placeholder="Search supplier…"
                    autoFocus
                    disabled={saving}
                  />
                  {supplierBusy ? (
                    <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
                <ul className="max-h-44 overflow-auto rounded-2xl border border-border/60 bg-popover py-1 shadow-sm">
                  {supplierHits.length === 0 && !supplierBusy ? (
                    <li className="px-3 py-3 text-xs text-muted-foreground">
                      {supplierQuery.trim()
                        ? "No match"
                        : "No active suppliers"}
                    </li>
                  ) : (
                    supplierHits.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                          onClick={() => setSupplier(s)}
                        >
                          <Truck className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {s.name}
                            </span>
                            {s.code ? (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {s.code}
                              </span>
                            ) : null}
                          </span>
                          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </section>

          {/* Lines */}
          {supplier ? (
            <section className="space-y-2">
              <div className="flex items-end justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  What arrived
                </p>
                {lines.length > 4 ? (
                  <div className="relative max-w-[10rem] flex-1">
                    <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className={cn(fieldClass, "h-8 rounded-lg py-1 pl-7 text-xs")}
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Filter…"
                      disabled={saving || linesBusy}
                    />
                  </div>
                ) : null}
              </div>

              {linesBusy ? (
                <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border px-3 py-6 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading products…
                </div>
              ) : lines.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  No products linked to this supplier yet.
                  <br />
                  Use Suppliers → Link products first.
                </div>
              ) : (
                <ul className="space-y-2">
                  {visibleLines.map((line) => {
                    const qty = parsePos(line.qtyStr);
                    const after =
                      line.stock != null && qty != null
                        ? line.stock + qty
                        : null;
                    const active = qty != null;
                    return (
                      <li
                        key={line.itemId}
                        className={cn(
                          "rounded-2xl border px-3 py-2.5 transition-colors",
                          active
                            ? "border-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_5%,transparent)]"
                            : "border-border/60 bg-card",
                        )}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold leading-tight">
                              {line.name}
                            </p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              Stock {formatStock(line.stock)}
                              {after != null ? (
                                <>
                                  {" "}
                                  <ArrowRight className="inline size-2.5 opacity-60" />{" "}
                                  <span className="font-semibold text-[var(--pos-primary)]">
                                    {formatStock(after)}
                                  </span>
                                </>
                              ) : null}
                            </p>
                          </div>
                          {active ? (
                            <button
                              type="button"
                              className="rounded-md p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                              aria-label="Clear qty"
                              onClick={() =>
                                patchLine(line.itemId, { qtyStr: "" })
                              }
                            >
                              <X className="size-3.5" />
                            </button>
                          ) : null}
                        </div>
                        <div
                          className={cn(
                            "grid gap-1.5",
                            canSetSellPrice
                              ? "grid-cols-3"
                              : "grid-cols-2",
                          )}
                        >
                          <label className="space-y-0.5">
                            <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                              Qty in
                            </span>
                            <input
                              className={cn(
                                fieldClass,
                                "text-center font-mono font-semibold tabular-nums",
                                active && "border-[color-mix(in_srgb,var(--pos-primary)_40%,transparent)]",
                              )}
                              inputMode="decimal"
                              placeholder="0"
                              value={line.qtyStr}
                              disabled={saving}
                              onChange={(e) =>
                                patchLine(line.itemId, {
                                  qtyStr: e.target.value,
                                })
                              }
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </label>
                          <label className="space-y-0.5">
                            <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                              Buy {code}
                            </span>
                            <input
                              className={cn(
                                fieldClass,
                                "text-right font-mono tabular-nums",
                              )}
                              inputMode="decimal"
                              placeholder="0.00"
                              value={line.costStr}
                              disabled={saving}
                              onChange={(e) =>
                                patchLine(line.itemId, {
                                  costStr: e.target.value,
                                })
                              }
                              onFocus={(e) => e.currentTarget.select()}
                            />
                          </label>
                          {canSetSellPrice ? (
                            <label className="space-y-0.5">
                              <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                                Sell {code}
                              </span>
                              <input
                                className={cn(
                                  fieldClass,
                                  "text-right font-mono tabular-nums",
                                )}
                                inputMode="decimal"
                                placeholder="0.00"
                                value={line.sellStr}
                                disabled={saving}
                                onChange={(e) =>
                                  patchLine(line.itemId, {
                                    sellStr: e.target.value,
                                  })
                                }
                                onFocus={(e) => e.currentTarget.select()}
                              />
                            </label>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-border/40 bg-muted/20 px-4 py-3 sm:justify-between">
          <div className="mr-auto min-w-0 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Payable
            </p>
            <p className="font-mono text-base font-bold tabular-nums">
              {payable.toLocaleString("en-KE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-xs font-semibold text-muted-foreground">
                {code}
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              {readyLines.length} line{readyLines.length === 1 ? "" : "s"} ready
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl gap-1.5"
            disabled={saving || !supplier || readyLines.length === 0}
            onClick={() => void onSave()}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <PackagePlus className="size-3.5" />
            )}
            Update stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
