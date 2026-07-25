"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchPathAPurchaseOrder,
  fetchPathAPurchaseOrders,
  fetchSupplierItemLinks,
  fetchSuppliers,
  postPathAGoodsReceipt,
  postPathAGrnSupplierInvoice,
  type PathAPurchaseOrderDetailRecord,
  type PathAPurchaseOrderListRowRecord,
  type SupplierRecord,
} from "@/lib/api";
import { cn, formatMoney } from "@/lib/utils";

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

type ReceiveQty = Record<string, number>;

export function OrderReceivePanel() {
  const { branchId } = useDashboard();
  const [orders, setOrders] = useState<PathAPurchaseOrderListRowRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PathAPurchaseOrderDetailRecord | null>(
    null,
  );
  const [itemNames, setItemNames] = useState<Record<string, string>>({});
  const [qtyByLine, setQtyByLine] = useState<ReceiveQty>({});
  const [selectedLines, setSelectedLines] = useState<Record<string, boolean>>(
    {},
  );
  const [confirming, setConfirming] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const refreshOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [sent, draft, supplierRows] = await Promise.all([
        fetchPathAPurchaseOrders({ status: "sent" }),
        fetchPathAPurchaseOrders({ status: "draft" }),
        fetchSuppliers(),
      ]);
      const merged = [...sent, ...draft].filter((o) => {
        const ordered = toNum(o.totalOrdered);
        const received = toNum(o.totalReceived);
        return ordered > received;
      });
      merged.sort((a, b) => b.poNumber.localeCompare(a.poNumber));
      setOrders(merged);
      setSuppliers(supplierRows);
      if (selectedId && !merged.some((o) => o.id === selectedId)) {
        setSelectedId(merged[0]?.id ?? null);
      } else if (!selectedId && merged[0]) {
        setSelectedId(merged[0].id);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load orders",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void refreshOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void fetchPathAPurchaseOrder(selectedId)
      .then(async (po) => {
        if (cancelled) return;
        setDetail(po);
        const openLines = po.lines.filter(
          (l) => toNum(l.qtyOrdered) > toNum(l.qtyReceived),
        );
        const nextQty: ReceiveQty = {};
        const nextSel: Record<string, boolean> = {};
        for (const line of openLines) {
          const remaining = toNum(line.qtyOrdered) - toNum(line.qtyReceived);
          nextQty[line.id] = remaining;
          nextSel[line.id] = true;
        }
        setQtyByLine(nextQty);
        setSelectedLines(nextSel);

        try {
          const links = await fetchSupplierItemLinks(po.supplierId, {
            branchId: po.branchId || branchId || undefined,
          });
          if (cancelled) return;
          const map: Record<string, string> = {};
          for (const link of links) map[link.itemId] = link.itemName;
          setItemNames(map);
        } catch {
          if (!cancelled) setItemNames({});
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load order",
          );
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, branchId]);

  const supplierName = useMemo(() => {
    if (!detail) return "—";
    return (
      suppliers.find((s) => s.id === detail.supplierId)?.name ?? "Supplier"
    );
  }, [detail, suppliers]);

  const openLines = useMemo(
    () =>
      (detail?.lines ?? []).filter(
        (l) => toNum(l.qtyOrdered) > toNum(l.qtyReceived),
      ),
    [detail],
  );

  const confirmSelected = async () => {
    if (!detail) return;
    const lines = openLines
      .filter((l) => selectedLines[l.id])
      .map((l) => ({
        purchaseOrderLineId: l.id,
        qtyReceived: Math.max(0, qtyByLine[l.id] ?? 0),
        itemId: l.itemId,
        unitCost: toNum(l.unitEstimatedCost),
      }))
      .filter((l) => l.qtyReceived > 0);

    if (lines.length === 0) {
      toast.error("Select at least one line with quantity");
      return;
    }

    const receiveBranch = detail.branchId || branchId;
    if (!receiveBranch.trim()) {
      toast.error("Branch is required to confirm");
      return;
    }

    setConfirming(true);
    try {
      const grn = await postPathAGoodsReceipt(
        {
          purchaseOrderId: detail.id,
          branchId: receiveBranch.trim(),
          receivedAt: new Date().toISOString(),
          notes: `Confirmed from Order · ${detail.poNumber}`,
          lines: lines.map((l) => ({
            purchaseOrderLineId: l.purchaseOrderLineId,
            qtyReceived: l.qtyReceived,
          })),
        },
        crypto.randomUUID(),
      );

      const invoiceLines = lines.map((l) => ({
        itemId: l.itemId,
        qty: l.qtyReceived,
        unitCost: l.unitCost,
        lineTotal: Number((l.qtyReceived * l.unitCost).toFixed(2)),
      }));

      await postPathAGrnSupplierInvoice(
        grn.goodsReceiptId,
        {
          invoiceNumber: `${detail.poNumber}-R${Date.now().toString().slice(-4)}`,
          invoiceDate: todayIsoDate(),
          lines: invoiceLines,
        },
        crypto.randomUUID(),
      );

      toast.success("Order confirmed and posted as supply");
      await refreshOrders();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not confirm order",
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div
      className="flex h-[min(78dvh,56rem)] min-h-[28rem] flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)] lg:flex-row"
      style={{ ["--pos-primary" as string]: "#0f766e" }}
    >
      <aside className="flex max-h-[35%] w-full shrink-0 flex-col overflow-hidden border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] lg:max-h-none lg:w-[16rem] lg:border-b-0 lg:border-r">
        <div className="flex h-8 items-center justify-between bg-[var(--pos-primary,#0f766e)] px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
          <span>Open orders</span>
          <span className="font-mono tabular-nums opacity-80">{orders.length}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1">
          {loading ? (
            <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
              <Loader2 className="mr-1 inline size-3 animate-spin" />
              Loading…
            </p>
          ) : orders.length === 0 ? (
            <div className="px-2 py-8 text-center text-[11px] text-muted-foreground">
              <p>No open orders.</p>
              <Link
                href={APP_ROUTES.order}
                className="mt-2 inline-block text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
              >
                Place an order
              </Link>
            </div>
          ) : (
            orders.map((o) => {
              const name =
                suppliers.find((s) => s.id === o.supplierId)?.name ?? "Supplier";
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedId(o.id)}
                  className={cn(
                    "mb-0.5 flex w-full flex-col items-start gap-0.5 border px-2 py-2 text-left",
                    selectedId === o.id
                      ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)]"
                      : "border-transparent hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]",
                  )}
                >
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {o.poNumber} · {o.status}
                  </span>
                  <span className="text-[12px] font-semibold">{name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {o.lineCount} lines · ordered {toNum(o.totalOrdered)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-3 py-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Confirm → supply
            </p>
            <h2 className="truncate text-[15px] font-semibold">
              {detail ? `${detail.poNumber} · ${supplierName}` : "Select an order"}
            </h2>
          </div>
          <Link
            href={APP_ROUTES.order}
            className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--pos-primary,#0f766e)] hover:underline"
          >
            New order
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {detailLoading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-[12px] text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading lines…
            </p>
          ) : !detail ? (
            <p className="py-16 text-center text-[12px] text-muted-foreground">
              Pick an open order to confirm lines.
            </p>
          ) : openLines.length === 0 ? (
            <p className="py-16 text-center text-[12px] text-muted-foreground">
              All lines on this order are already received.
            </p>
          ) : (
            <ul className="divide-y divide-dashed divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]">
              {openLines.map((line) => {
                const remaining =
                  toNum(line.qtyOrdered) - toNum(line.qtyReceived);
                const checked = Boolean(selectedLines[line.id]);
                const qty = qtyByLine[line.id] ?? remaining;
                return (
                  <li key={line.id} className="flex items-start gap-3 px-3 py-3">
                    <button
                      type="button"
                      aria-pressed={checked}
                      onClick={() =>
                        setSelectedLines((prev) => ({
                          ...prev,
                          [line.id]: !prev[line.id],
                        }))
                      }
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center border",
                        checked
                          ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                          : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_20%,transparent)]",
                      )}
                    >
                      {checked ? <Check className="size-3" /> : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-snug">
                        {itemNames[line.itemId] ?? line.itemId.slice(0, 8)}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        Ordered {toNum(line.qtyOrdered)} · received{" "}
                        {toNum(line.qtyReceived)} · est.{" "}
                        {formatMoney(toNum(line.unitEstimatedCost), "KES")}
                      </p>
                    </div>
                    <div className="inline-flex shrink-0 items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]">
                      <button
                        type="button"
                        className="flex size-8 items-center justify-center"
                        disabled={!checked}
                        onClick={() =>
                          setQtyByLine((prev) => ({
                            ...prev,
                            [line.id]: Math.max(0, qty - 1),
                          }))
                        }
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        className="w-12 border-0 bg-transparent text-center font-mono text-[13px] outline-none disabled:opacity-40"
                        disabled={!checked}
                        value={qty}
                        onChange={(e) => {
                          const n = Number.parseFloat(e.target.value);
                          setQtyByLine((prev) => ({
                            ...prev,
                            [line.id]: Number.isFinite(n) ? Math.max(0, n) : 0,
                          }));
                        }}
                      />
                      <button
                        type="button"
                        className="flex size-8 items-center justify-center"
                        disabled={!checked}
                        onClick={() =>
                          setQtyByLine((prev) => ({
                            ...prev,
                            [line.id]: qty + 1,
                          }))
                        }
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 space-y-2 border-t-2 border-[var(--pos-ink,#1c1915)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] px-3 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-3 text-[11px] font-semibold"
              onClick={() => {
                const next: Record<string, boolean> = {};
                for (const l of openLines) next[l.id] = true;
                setSelectedLines(next);
              }}
            >
              Select all
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-3 text-[11px] font-semibold"
              onClick={() => setSelectedLines({})}
            >
              Clear
            </button>
          </div>
          <button
            type="button"
            disabled={confirming || openLines.length === 0}
            onClick={() => void confirmSelected()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[var(--pos-primary,#0f766e)] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {confirming ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Posting supply…
              </>
            ) : (
              <>
                <Check className="size-4" />
                Confirm selected → supply
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-muted-foreground">
            Posts a goods receipt and supplier bill — same record as Receive
            supplies.
          </p>
        </div>
      </div>
    </div>
  );
}
