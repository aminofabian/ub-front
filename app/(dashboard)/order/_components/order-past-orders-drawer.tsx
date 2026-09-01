"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchPathAPurchaseOrder,
  fetchPathAPurchaseOrders,
  type PathAPurchaseOrderListRowRecord,
  type SupplierRecord,
} from "@/lib/api";
import {
  applyPoDetailToCart,
  poPhaseLabel,
  poReceivePhase,
  sortPastOrders,
} from "@/app/(dashboard)/order/_lib/order-lifetime-stats";
import { toOrderStatNum } from "@/app/(dashboard)/order/_hooks/use-order-pipeline-stats";
import { cn, formatMoney } from "@/lib/utils";

const CURRENCY = "KES";

function formatWhen(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const phaseStyles: Record<string, string> = {
  draft: "bg-amber-100 text-amber-900",
  in_flight: "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] text-[var(--pos-primary,#0f766e)]",
  partial: "bg-sky-100 text-sky-900",
  received: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-zinc-200 text-zinc-700",
};

export function OrderPastOrdersDrawer({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  suppliers,
  onReorder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string | null;
  supplierName: string | null;
  suppliers: SupplierRecord[];
  onReorder: (poId: string) => Promise<void>;
}) {
  const [scope, setScope] = useState<"supplier" | "all">("supplier");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PathAPurchaseOrderListRowRecord[]>([]);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [previewTotals, setPreviewTotals] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    if (!open) return;
    setScope(supplierId ? "supplier" : "all");
  }, [open, supplierId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const supplierFilter =
      scope === "supplier" && supplierId ? supplierId : undefined;
    void Promise.all([
      fetchPathAPurchaseOrders({
        supplierId: supplierFilter,
        status: "sent",
      }),
      fetchPathAPurchaseOrders({
        supplierId: supplierFilter,
        status: "draft",
      }),
    ])
      .then(([sent, draft]) => {
        if (cancelled) return;
        setRows(sortPastOrders([...sent, ...draft]));
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, scope, supplierId]);

  useEffect(() => {
    if (!open || rows.length === 0) {
      setPreviewTotals({});
      return;
    }
    let cancelled = false;
    const top = rows.slice(0, 8);
    void Promise.all(
      top.map(async (row) => {
        try {
          const detail = await fetchPathAPurchaseOrder(row.id);
          let total = 0;
          for (const line of detail.lines) {
            total +=
              toOrderStatNum(line.qtyOrdered) *
              toOrderStatNum(line.unitEstimatedCost);
          }
          return [row.id, total] as const;
        } catch {
          return [row.id, 0] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setPreviewTotals(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [open, rows]);

  const supplierNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const supplier of suppliers) {
      map.set(supplier.id, supplier.name);
    }
    return map;
  }, [suppliers]);

  const handleReorder = async (row: PathAPurchaseOrderListRowRecord) => {
    setReorderingId(row.id);
    try {
      await onReorder(row.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load that order",
      );
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="right"
        className="flex max-h-[100dvh] w-full max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-4 py-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
                Order again
              </p>
              <DialogTitle className="mt-1 flex items-center gap-2 font-heading text-[18px] font-semibold tracking-[-0.02em]">
                <History className="size-4 text-[var(--pos-primary,#0f766e)]" />
                Past orders
              </DialogTitle>
              <DialogDescription className="mt-1 text-[12px]">
                Pull a previous purchase order back into your basket — prices and
                quantities refill automatically.
              </DialogDescription>
            </div>
          </div>
          <div className="mt-3 inline-flex rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_50%,transparent)] p-0.5">
            <button
              type="button"
              disabled={!supplierId}
              onClick={() => setScope("supplier")}
              className={cn(
                "rounded-md px-3 py-1.5 text-[11px] font-semibold transition",
                scope === "supplier"
                  ? "bg-white text-[var(--order-ink,#15231f)] shadow-sm"
                  : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]",
                !supplierId && "opacity-40",
              )}
            >
              {supplierName ?? "This supplier"}
            </button>
            <button
              type="button"
              onClick={() => setScope("all")}
              className={cn(
                "rounded-md px-3 py-1.5 text-[11px] font-semibold transition",
                scope === "all"
                  ? "bg-white text-[var(--order-ink,#15231f)] shadow-sm"
                  : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]",
              )}
            >
              All suppliers
            </button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-[13px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              <Loader2 className="size-4 animate-spin" />
              Loading order history…
            </p>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] px-4 py-12 text-center">
              <p className="text-[13px] font-medium text-[var(--order-ink,#15231f)]">
                No past orders yet
              </p>
              <p className="mt-1 text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                Place and save your first order — it&apos;ll show up here for
                one-tap reordering.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => {
                const phase = poReceivePhase(row);
                const vendor =
                  supplierNameById.get(row.supplierId) ?? "Supplier";
                const previewTotal = previewTotals[row.id];
                return (
                  <li
                    key={row.id}
                    className="rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-[var(--order-ink,#15231f)]">
                            {row.poNumber}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]",
                              phaseStyles[phase],
                            )}
                          >
                            {poPhaseLabel(phase)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[13px] font-medium text-[var(--order-ink,#15231f)]">
                          {vendor}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                          {formatWhen(row.createdAt)} · {row.lineCount} lines ·{" "}
                          {toOrderStatNum(row.totalOrdered)} units
                          {previewTotal != null && previewTotal > 0
                            ? ` · ${formatMoney(previewTotal, CURRENCY)}`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={reorderingId === row.id}
                        onClick={() => void handleReorder(row)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--pos-primary,#0f766e)] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#0d6b63] disabled:opacity-50"
                      >
                        {reorderingId === row.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="size-3.5" />
                        )}
                        Order again
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-4 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[12px] font-semibold text-[var(--order-ink,#15231f)]"
          >
            <X className="size-3.5" />
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
