"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  FileDown,
  Loader2,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import {
  buildMarketplaceOrderPdf,
  buildMarketplaceOrderText,
  buildWhatsAppOrderUrl,
  downloadBlob,
  shareOrDownloadOrderPdf,
  type MarketplaceOrderLine,
} from "@/app/marketplace/_lib/marketplace-order-pdf";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchItemById,
  fetchPathAPurchaseOrder,
  fetchPathAPurchaseOrders,
  fetchSupplierContacts,
  fetchSupplierItemLinks,
  fetchSuppliers,
  patchPathAPurchaseOrderLine,
  postPathAGoodsReceipt,
  postPathAGrnSupplierInvoice,
  postPathAPurchaseOrderLine,
  type PathAPurchaseOrderDetailRecord,
  type PathAPurchaseOrderListRowRecord,
  type SupplierContactRecord,
  type SupplierItemLinkRecord,
  type SupplierRecord,
} from "@/lib/api";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { cn, formatMoney } from "@/lib/utils";

const ORDER_CURRENCY = "KES";

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
type ReceivePrice = Record<string, number>;
type ItemMeta = {
  name: string;
  thumbnailUrl: string | null;
  sku?: string | null;
  barcode?: string | null;
};

function slugForFilename(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function formatOrderCreatedAt(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function orderCreatedDate(iso: string | null | undefined): Date | undefined {
  if (!iso?.trim()) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function linkUnitCost(link: SupplierItemLinkRecord): number {
  return (
    toNum(link.lastCostPrice) ||
    toNum(link.defaultCostPrice) ||
    toNum(link.catalogBuyingPrice) ||
    0
  );
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

export function OrderReceivePanel({
  embedded = false,
  onConfirmed,
}: {
  /** Fill parent height without the page chrome (cashier full-screen drawer). */
  embedded?: boolean;
  /** Called after a successful confirm instead of navigating away. */
  onConfirmed?: () => void;
} = {}) {
  const router = useRouter();
  const { branchId, business } = useDashboard();
  const [orders, setOrders] = useState<PathAPurchaseOrderListRowRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PathAPurchaseOrderDetailRecord | null>(
    null,
  );
  const [itemMeta, setItemMeta] = useState<Record<string, ItemMeta>>({});
  const [contacts, setContacts] = useState<SupplierContactRecord[]>([]);
  const [qtyByLine, setQtyByLine] = useState<ReceiveQty>({});
  const [priceByLine, setPriceByLine] = useState<ReceivePrice>({});
  const [selectedLines, setSelectedLines] = useState<Record<string, boolean>>(
    {},
  );
  const [supplierLinks, setSupplierLinks] = useState<SupplierItemLinkRecord[]>(
    [],
  );
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemQuery, setAddItemQuery] = useState("");
  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  const [savingLineId, setSavingLineId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sharing, setSharing] = useState<"whatsapp" | "pdf" | "copy" | null>(
    null,
  );

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
      merged.sort((a, b) => {
        const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
        if (aTime !== bTime) return bTime - aTime;
        return b.poNumber.localeCompare(a.poNumber);
      });
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
        const nextPrice: ReceivePrice = {};
        const nextSel: Record<string, boolean> = {};
        for (const line of openLines) {
          const remaining = toNum(line.qtyOrdered) - toNum(line.qtyReceived);
          nextQty[line.id] = remaining;
          nextPrice[line.id] = toNum(line.unitEstimatedCost);
          nextSel[line.id] = true;
        }
        setQtyByLine(nextQty);
        setPriceByLine(nextPrice);
        setSelectedLines(nextSel);
        setAddItemOpen(false);
        setAddItemQuery("");

        try {
          const links = await fetchSupplierItemLinks(po.supplierId, {
            branchId: po.branchId || branchId || undefined,
          });
          if (cancelled) return;
          setSupplierLinks(links.filter((l) => l.active));
          const map: Record<string, ItemMeta> = {};
          for (const link of links) {
            map[link.itemId] = {
              name: link.itemName,
              thumbnailUrl: link.thumbnailUrl?.trim() || null,
              sku: link.sku,
              barcode: link.barcode,
            };
          }
          const missing = po.lines
            .map((line) => line.itemId)
            .filter((id) => !map[id]);
          if (missing.length > 0) {
            const extras = await Promise.all(
              missing.map((id) =>
                fetchItemById(id, {
                  branchId: po.branchId || branchId || undefined,
                }).catch(() => null),
              ),
            );
            if (cancelled) return;
            for (const item of extras) {
              if (!item) continue;
              map[item.id] = {
                name: item.name,
                thumbnailUrl: item.thumbnailUrl?.trim() || null,
                sku: item.sku,
                barcode: item.barcode ?? null,
              };
            }
          }
          setItemMeta(map);
        } catch {
          if (!cancelled) {
            setItemMeta({});
            setSupplierLinks([]);
          }
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

  useEffect(() => {
    if (!detail?.supplierId) {
      setContacts([]);
      return;
    }
    let cancelled = false;
    void fetchSupplierContacts(detail.supplierId)
      .then((rows) => {
        if (!cancelled) setContacts(rows);
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [detail?.supplierId]);

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

  const selectedTotal = useMemo(() => {
    let sum = 0;
    for (const line of openLines) {
      if (!selectedLines[line.id]) continue;
      const qty = Math.max(0, qtyByLine[line.id] ?? 0);
      const unit = priceByLine[line.id] ?? toNum(line.unitEstimatedCost);
      sum += qty * unit;
    }
    return sum;
  }, [openLines, selectedLines, qtyByLine, priceByLine]);

  const selectedUnits = useMemo(() => {
    let sum = 0;
    for (const line of openLines) {
      if (!selectedLines[line.id]) continue;
      sum += Math.max(0, qtyByLine[line.id] ?? 0);
    }
    return sum;
  }, [openLines, selectedLines, qtyByLine]);

  const shopName = business?.name?.trim() || "Shop";

  const supplierPhone = useMemo(() => {
    return (
      contacts.find((c) => c.primaryContact)?.phone?.trim() ||
      contacts.find((c) => c.phone?.trim())?.phone?.trim() ||
      suppliers.find((s) => s.id === detail?.supplierId)?.payoutPhone?.trim() ||
      null
    );
  }, [contacts, suppliers, detail?.supplierId]);

  const shareLines = useMemo((): MarketplaceOrderLine[] => {
    if (!detail) return [];
    return detail.lines.map((line) => {
      const meta = itemMeta[line.itemId];
      const unit = priceByLine[line.id] ?? toNum(line.unitEstimatedCost);
      return {
        name: meta?.name ?? line.itemId.slice(0, 8),
        sku: meta?.sku,
        barcode: meta?.barcode,
        qty: toNum(line.qtyOrdered),
        unitPrice: unit || null,
        currency: ORDER_CURRENCY,
      };
    });
  }, [detail, itemMeta, priceByLine]);

  const selectedOrderCreatedAt = useMemo(() => {
    if (detail?.createdAt) return detail.createdAt;
    const row = orders.find((o) => o.id === selectedId);
    return row?.createdAt ?? null;
  }, [detail, orders, selectedId]);

  const addableLinks = useMemo(() => {
    const onOrder = new Set((detail?.lines ?? []).map((l) => l.itemId));
    const q = addItemQuery.trim().toLowerCase();
    return supplierLinks
      .filter((link) => !onOrder.has(link.itemId))
      .filter((link) => {
        if (!q) return true;
        const hay = [
          link.itemName,
          link.sku,
          link.barcode ?? "",
          link.supplierSku ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [supplierLinks, detail, addItemQuery]);

  const orderFilename = useMemo(() => {
    if (!detail) return "order.pdf";
    const supplier = slugForFilename(supplierName) || "supplier";
    return `order-${detail.poNumber}-${supplier}.pdf`;
  }, [detail, supplierName]);

  const shareBusy = sharing !== null;

  const orderPdfInput = () => {
    if (!detail) return null;
    const receivedUnits = detail.lines.reduce(
      (sum, line) => sum + toNum(line.qtyReceived),
      0,
    );
    const receiveNote =
      receivedUnits > 0 ? `Already received: ${receivedUnits} units.` : null;
    const note = [detail.notes?.trim(), receiveNote].filter(Boolean).join("\n");
    return {
      supplierName,
      supplierPhone,
      location: shopName,
      listedBy: `Purchase order ${detail.poNumber}`,
      lines: shareLines,
      note: note || undefined,
      orderDate: orderCreatedDate(selectedOrderCreatedAt),
    };
  };

  const persistLinePrice = async (lineId: string, unitCost: number) => {
    if (!detail || unitCost <= 0) return;
    setSavingLineId(lineId);
    try {
      await patchPathAPurchaseOrderLine(detail.id, lineId, {
        unitEstimatedCost: unitCost,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save price",
      );
    } finally {
      setSavingLineId(null);
    }
  };

  const addItemToOrder = async (link: SupplierItemLinkRecord) => {
    if (!detail) return;
    setAddingItemId(link.itemId);
    try {
      const unitCost = linkUnitCost(link) || 1;
      await postPathAPurchaseOrderLine(detail.id, {
        itemId: link.itemId,
        qtyOrdered: 1,
        unitEstimatedCost: unitCost,
      });
      toast.success(`Added ${link.itemName}`);
      setAddItemQuery("");
      const po = await fetchPathAPurchaseOrder(detail.id);
      setDetail(po);
      const open = po.lines.filter(
        (l) => toNum(l.qtyOrdered) > toNum(l.qtyReceived),
      );
      const nextQty = { ...qtyByLine };
      const nextPrice = { ...priceByLine };
      const nextSel = { ...selectedLines };
      for (const line of open) {
        if (!(line.id in nextQty)) {
          nextQty[line.id] =
            toNum(line.qtyOrdered) - toNum(line.qtyReceived);
          nextPrice[line.id] = toNum(line.unitEstimatedCost);
          nextSel[line.id] = true;
        }
      }
      setQtyByLine(nextQty);
      setPriceByLine(nextPrice);
      setSelectedLines(nextSel);
      setItemMeta((prev) => ({
        ...prev,
        [link.itemId]: {
          name: link.itemName,
          thumbnailUrl: link.thumbnailUrl?.trim() || null,
          sku: link.sku,
          barcode: link.barcode,
        },
      }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add item",
      );
    } finally {
      setAddingItemId(null);
    }
  };

  const sendOrderWhatsApp = async () => {
    if (!detail || shareLines.length === 0) {
      toast.error("Pick an order first");
      return;
    }
    setSharing("whatsapp");
    try {
      const wa = buildWhatsAppOrderUrl({
        phone: supplierPhone,
        supplierName,
        lines: shareLines,
        filename: orderFilename,
        orderRef: detail.poNumber,
        fromName: shopName,
      });
      if (wa) {
        window.open(wa, "_blank", "noopener,noreferrer");
        toast.success("WhatsApp opened with this order.");
        return;
      }
      const pdf = orderPdfInput();
      if (!pdf) return;
      const blob = buildMarketplaceOrderPdf(pdf);
      const mode = await shareOrDownloadOrderPdf(blob, orderFilename, null);
      toast.message(
        mode === "shared"
          ? "Order shared — pick WhatsApp to send it."
          : "No WhatsApp number on this supplier — PDF downloaded. Attach it in WhatsApp.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not share order",
      );
    } finally {
      setSharing(null);
    }
  };

  const downloadOrderPdf = async () => {
    if (!detail || shareLines.length === 0) {
      toast.error("Pick an order first");
      return;
    }
    setSharing("pdf");
    try {
      const pdf = orderPdfInput();
      if (!pdf) return;
      downloadBlob(buildMarketplaceOrderPdf(pdf), orderFilename);
      toast.success("Order PDF downloaded.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not build order PDF",
      );
    } finally {
      setSharing(null);
    }
  };

  const copyOrderList = async () => {
    if (!detail || shareLines.length === 0) {
      toast.error("Pick an order first");
      return;
    }
    setSharing("copy");
    try {
      await copyText(
        buildMarketplaceOrderText(shareLines, {
          supplierName,
          filename: orderFilename,
          orderRef: detail.poNumber,
          fromName: shopName,
        }),
        "Order list",
      );
    } finally {
      setSharing(null);
    }
  };

  const confirmSelected = async () => {
    if (!detail) return;
    const lines = openLines
      .filter((l) => selectedLines[l.id])
      .map((l) => ({
        purchaseOrderLineId: l.id,
        qtyReceived: Math.max(0, qtyByLine[l.id] ?? 0),
        itemId: l.itemId,
        unitCost: priceByLine[l.id] ?? toNum(l.unitEstimatedCost),
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

      toast.success(
        embedded ? "Order confirmed" : "Order confirmed — opening supplies",
      );
      await refreshOrders();
      if (embedded) {
        onConfirmed?.();
      } else {
        router.push(`${APP_ROUTES.purchasingAddSupplies}?filter=all`);
      }
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
      className={cn(
        "flex min-h-[28rem] flex-col overflow-hidden bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)] lg:flex-row",
        embedded
          ? "h-[min(82dvh,52rem)] border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]"
          : "h-[min(78dvh,56rem)] border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
      )}
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
                  <span className="font-mono text-[9px] text-muted-foreground/80">
                    {formatOrderCreatedAt(o.createdAt)}
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
            {detail ? (
              <p className="font-mono text-[10px] text-muted-foreground">
                Created {formatOrderCreatedAt(selectedOrderCreatedAt)}
              </p>
            ) : null}
          </div>
          <Link
            href={APP_ROUTES.order}
            className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--pos-primary,#0f766e)] hover:underline"
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
                const unit = priceByLine[line.id] ?? toNum(line.unitEstimatedCost);
                const amount = qty * unit;
                const meta = itemMeta[line.itemId];
                const name = meta?.name ?? line.itemId.slice(0, 8);
                const thumb = posTileThumbUrl(name, meta?.thumbnailUrl);
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
                    <div className="relative size-12 shrink-0 overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)]">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-contain p-0.5"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <Package className="size-4 opacity-40" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-snug">
                        {name}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        Ordered {toNum(line.qtyOrdered)} · received{" "}
                        {toNum(line.qtyReceived)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                          <span>Unit</span>
                          <input
                            className="w-16 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-background px-1 py-0.5 text-center text-[11px] font-semibold text-foreground outline-none focus:border-[var(--pos-primary,#0f766e)] disabled:opacity-40"
                            disabled={!checked || savingLineId === line.id}
                            value={unit}
                            onChange={(e) => {
                              const n = Number.parseFloat(e.target.value);
                              setPriceByLine((prev) => ({
                                ...prev,
                                [line.id]: Number.isFinite(n)
                                  ? Math.max(0, n)
                                  : 0,
                              }));
                            }}
                            onBlur={(e) => {
                              const n = Number.parseFloat(e.target.value);
                              if (Number.isFinite(n) && n > 0) {
                                void persistLinePrice(line.id, n);
                              }
                            }}
                          />
                          <span>/ ea</span>
                        </label>
                        <p className="font-mono text-[12px] font-semibold tabular-nums">
                          {formatMoney(amount, ORDER_CURRENCY)}
                        </p>
                      </div>
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
          {detail && !detailLoading ? (
            <div className="border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-3 py-3">
              <button
                type="button"
                onClick={() => setAddItemOpen((v) => !v)}
                className="inline-flex h-9 items-center gap-1.5 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-3 text-[11px] font-semibold"
              >
                <Plus className="size-3.5" />
                {addItemOpen ? "Hide add item" : "Add item"}
              </button>
              {addItemOpen ? (
                <div className="mt-2 space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className="h-9 w-full border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-background pl-8 pr-2 text-[12px] outline-none focus:border-[var(--pos-primary,#0f766e)]"
                      placeholder="Search supplier catalog…"
                      value={addItemQuery}
                      onChange={(e) => setAddItemQuery(e.target.value)}
                    />
                  </div>
                  {addableLinks.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      {supplierLinks.length === 0
                        ? "No supplier catalog loaded."
                        : "No matching items, or all catalog items are already on this order."}
                    </p>
                  ) : (
                    <ul className="max-h-48 divide-y divide-dashed divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] overflow-y-auto border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
                      {addableLinks.map((link) => (
                        <li key={link.id}>
                          <button
                            type="button"
                            disabled={addingItemId === link.itemId}
                            onClick={() => void addItemToOrder(link)}
                            className="flex w-full items-center justify-between gap-2 px-2 py-2 text-left text-[12px] hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] disabled:opacity-50"
                          >
                            <span className="min-w-0 truncate font-medium">
                              {link.itemName}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                              {addingItemId === link.itemId ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                formatMoney(linkUnitCost(link), ORDER_CURRENCY)
                              )}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 space-y-2 border-t-2 border-[var(--pos-ink,#1c1915)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] px-3 py-3">
          <div className="flex items-end justify-between gap-2 px-0.5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Selected total
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {selectedUnits} unit{selectedUnits === 1 ? "" : "s"}
              </p>
            </div>
            <p className="font-mono text-[18px] font-bold tabular-nums">
              {formatMoney(selectedTotal, ORDER_CURRENCY)}
            </p>
          </div>
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
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={shareBusy || shareLines.length === 0}
              onClick={() => void downloadOrderPdf()}
              className="inline-flex h-10 items-center justify-center gap-1.5 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-background px-3 text-[11px] font-semibold transition hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] disabled:opacity-40"
            >
              {sharing === "pdf" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileDown className="size-3.5" />
              )}
              Download PDF
            </button>
            <button
              type="button"
              disabled={shareBusy || shareLines.length === 0}
              onClick={() => void copyOrderList()}
              className="inline-flex h-10 items-center justify-center gap-1.5 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-background px-3 text-[11px] font-semibold transition hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] disabled:opacity-40"
            >
              {sharing === "copy" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Copy className="size-3.5" />
              )}
              Copy list
            </button>
          </div>
          <button
            type="button"
            disabled={shareBusy || shareLines.length === 0}
            onClick={() => void sendOrderWhatsApp()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#128c4a] px-4 text-sm font-semibold text-white transition hover:bg-[#0f7a3f] disabled:opacity-50"
          >
            {sharing === "whatsapp" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Opening WhatsApp…
              </>
            ) : (
              <>
                <MessageCircle className="size-4" />
                Send order on WhatsApp
              </>
            )}
          </button>
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
            WhatsApp opens with the order list; download the PDF to attach.
            Confirm posts a goods receipt and supplier bill.
          </p>
        </div>
      </div>
    </div>
  );
}
