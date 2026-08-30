"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ClipboardList,
  Copy,
  FileDown,
  Loader2,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
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
  deletePathAPurchaseOrderLine,
  patchPathAPurchaseOrderLine,
  postPathAPurchaseOrderCancel,
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
type OrderQty = Record<string, number>;
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

function lineDraftsFromPo(po: PathAPurchaseOrderDetailRecord) {
  const nextQty: ReceiveQty = {};
  const nextOrderQty: OrderQty = {};
  const nextPrice: ReceivePrice = {};
  const nextSel: Record<string, boolean> = {};
  for (const line of po.lines) {
    nextOrderQty[line.id] = toNum(line.qtyOrdered);
    nextPrice[line.id] = toNum(line.unitEstimatedCost);
    const remaining = toNum(line.qtyOrdered) - toNum(line.qtyReceived);
    if (remaining > 0) {
      nextQty[line.id] = remaining;
      nextSel[line.id] = true;
    }
  }
  return { nextQty, nextOrderQty, nextPrice, nextSel };
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
  const [orderQtyByLine, setOrderQtyByLine] = useState<OrderQty>({});
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
  const [savingOrder, setSavingOrder] = useState(false);
  const [deletingLineId, setDeletingLineId] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);
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
        const drafts = lineDraftsFromPo(po);
        setQtyByLine(drafts.nextQty);
        setOrderQtyByLine(drafts.nextOrderQty);
        setPriceByLine(drafts.nextPrice);
        setSelectedLines(drafts.nextSel);
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

  const displayLines = useMemo(
    () =>
      [...(detail?.lines ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
      ),
    [detail],
  );

  const orderDirty = useMemo(() => {
    if (!detail) return false;
    return detail.lines.some((line) => {
      const orderQty = orderQtyByLine[line.id] ?? toNum(line.qtyOrdered);
      const price = priceByLine[line.id] ?? toNum(line.unitEstimatedCost);
      return (
        orderQty !== toNum(line.qtyOrdered) ||
        price !== toNum(line.unitEstimatedCost)
      );
    });
  }, [detail, orderQtyByLine, priceByLine]);

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
      const qty = orderQtyByLine[line.id] ?? toNum(line.qtyOrdered);
      return {
        name: meta?.name ?? line.itemId.slice(0, 8),
        sku: meta?.sku,
        barcode: meta?.barcode,
        qty,
        unitPrice: unit || null,
        currency: ORDER_CURRENCY,
      };
    });
  }, [detail, itemMeta, priceByLine, orderQtyByLine]);

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

  const persistLine = async (
    lineId: string,
    opts?: { qtyOrdered?: number; unitEstimatedCost?: number },
  ) => {
    if (!detail) return false;
    const line = detail.lines.find((l) => l.id === lineId);
    if (!line) return false;

    const qtyOrdered = opts?.qtyOrdered ?? orderQtyByLine[lineId] ?? toNum(line.qtyOrdered);
    const unitEstimatedCost =
      opts?.unitEstimatedCost ?? priceByLine[lineId] ?? toNum(line.unitEstimatedCost);
    const received = toNum(line.qtyReceived);

    if (qtyOrdered <= 0 || unitEstimatedCost <= 0) {
      toast.error("Quantity and price must be greater than zero");
      return false;
    }
    if (qtyOrdered < received) {
      toast.error("Order quantity cannot be less than already received");
      return false;
    }
    if (
      qtyOrdered === toNum(line.qtyOrdered) &&
      unitEstimatedCost === toNum(line.unitEstimatedCost)
    ) {
      return true;
    }

    setSavingLineId(lineId);
    try {
      const updated = await patchPathAPurchaseOrderLine(detail.id, lineId, {
        qtyOrdered,
        unitEstimatedCost,
      });
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              lines: prev.lines.map((l) =>
                l.id === lineId
                  ? {
                      ...l,
                      qtyOrdered: updated.qtyOrdered,
                      unitEstimatedCost: updated.unitEstimatedCost,
                    }
                  : l,
              ),
            }
          : prev,
      );
      setOrderQtyByLine((prev) => ({
        ...prev,
        [lineId]: toNum(updated.qtyOrdered),
      }));
      setPriceByLine((prev) => ({
        ...prev,
        [lineId]: toNum(updated.unitEstimatedCost),
      }));
      const remaining =
        toNum(updated.qtyOrdered) - toNum(line.qtyReceived);
      if (remaining > 0) {
        setQtyByLine((prev) => ({
          ...prev,
          [lineId]: Math.min(prev[lineId] ?? remaining, remaining),
        }));
      }
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save line",
      );
      return false;
    } finally {
      setSavingLineId(null);
    }
  };

  const saveOrder = async () => {
    if (!detail) return;
    if (!orderDirty) {
      toast.message("Nothing to save");
      return;
    }
    setSavingOrder(true);
    try {
      for (const line of detail.lines) {
        const orderQty = orderQtyByLine[line.id] ?? toNum(line.qtyOrdered);
        const price = priceByLine[line.id] ?? toNum(line.unitEstimatedCost);
        if (
          orderQty === toNum(line.qtyOrdered) &&
          price === toNum(line.unitEstimatedCost)
        ) {
          continue;
        }
        const ok = await persistLine(line.id, {
          qtyOrdered: orderQty,
          unitEstimatedCost: price,
        });
        if (!ok) return;
      }
      toast.success("Order saved");
      await refreshOrders();
      const po = await fetchPathAPurchaseOrder(detail.id);
      setDetail(po);
      const drafts = lineDraftsFromPo(po);
      setQtyByLine(drafts.nextQty);
      setOrderQtyByLine(drafts.nextOrderQty);
      setPriceByLine(drafts.nextPrice);
      setSelectedLines(drafts.nextSel);
    } finally {
      setSavingOrder(false);
    }
  };

  const removeLine = async (lineId: string) => {
    if (!detail) return;
    const line = detail.lines.find((l) => l.id === lineId);
    if (!line) return;
    if (toNum(line.qtyReceived) > 0) {
      toast.error("Cannot remove a line that has already been received");
      return;
    }
    const meta = itemMeta[line.itemId];
    const name = meta?.name ?? "this item";
    if (
      !window.confirm(
        `Remove ${name} from ${detail.poNumber}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingLineId(lineId);
    try {
      await deletePathAPurchaseOrderLine(detail.id, lineId);
      toast.success("Line removed");
      const po = await fetchPathAPurchaseOrder(detail.id);
      setDetail(po);
      const drafts = lineDraftsFromPo(po);
      setQtyByLine(drafts.nextQty);
      setOrderQtyByLine(drafts.nextOrderQty);
      setPriceByLine(drafts.nextPrice);
      setSelectedLines(drafts.nextSel);
      await refreshOrders();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove line",
      );
    } finally {
      setDeletingLineId(null);
    }
  };

  const removeOrder = async () => {
    if (!detail) return;
    if (
      !window.confirm(
        `Delete order ${detail.poNumber}? This cancels the purchase order.`,
      )
    ) {
      return;
    }
    setDeletingOrder(true);
    try {
      await postPathAPurchaseOrderCancel(detail.id);
      toast.success("Order deleted");
      setDetail(null);
      setSelectedId(null);
      await refreshOrders();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete order",
      );
    } finally {
      setDeletingOrder(false);
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
      const drafts = lineDraftsFromPo(po);
      setQtyByLine((prev) => ({ ...drafts.nextQty, ...prev }));
      setOrderQtyByLine((prev) => ({ ...prev, ...drafts.nextOrderQty }));
      setPriceByLine((prev) => ({ ...prev, ...drafts.nextPrice }));
      setSelectedLines((prev) => ({ ...prev, ...drafts.nextSel }));
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
      if (orderDirty) {
        for (const line of openLines.filter((l) => selectedLines[l.id])) {
          const ok = await persistLine(line.id, {
            qtyOrdered: orderQtyByLine[line.id] ?? toNum(line.qtyOrdered),
            unitEstimatedCost:
              priceByLine[line.id] ?? toNum(line.unitEstimatedCost),
          });
          if (!ok) {
            toast.error("Save order changes before confirming");
            return;
          }
        }
      }

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
        "relative flex min-h-[28rem] flex-col overflow-hidden font-sans text-[var(--order-ink,#15231f)] lg:flex-row",
        embedded
          ? "h-[min(82dvh,52rem)] rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]"
          : "h-[calc(100dvh-16rem)] min-h-[32rem] rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] shadow-[0_1px_0_color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent),0_16px_48px_-28px_color-mix(in_srgb,var(--order-ink,#15231f)_22%,transparent)] sm:h-[min(72dvh,54rem)]",
      )}
      style={{
        ["--pos-primary" as string]: "#0f766e",
        ["--order-ink" as string]: "#15231f",
        ["--order-shelf" as string]: "#f3f6f5",
        ["--order-slip" as string]: "#ffffff",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_-10%,color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent),transparent_55%),linear-gradient(180deg,var(--order-shelf,#f3f6f5),color-mix(in_srgb,var(--order-shelf,#f3f6f5)_70%,#fff))]"
      />

      <aside className="relative z-[1] flex max-h-[38%] w-full shrink-0 flex-col overflow-hidden border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_72%,transparent)] backdrop-blur-[2px] lg:max-h-none lg:w-[19rem] lg:border-b-0 lg:border-r xl:w-[21rem]">
        <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] px-3 py-2.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
              Open orders
            </p>
            <p className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              Awaiting delivery
            </p>
          </div>
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--order-ink,#15231f)] px-2 font-mono text-[11px] font-bold tabular-nums text-white">
            {orders.length}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
          {loading ? (
            <p className="flex items-center justify-center gap-2 px-2 py-10 text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_50%,transparent)]">
              <Loader2 className="size-4 animate-spin" />
              Loading orders…
            </p>
          ) : orders.length === 0 ? (
            <div className="mx-1 rounded-lg border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white/50 px-4 py-10 text-center">
              <Package className="mx-auto size-8 text-[color-mix(in_srgb,var(--order-ink,#15231f)_20%,transparent)]" />
              <p className="mt-3 text-[13px] font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
                No open orders yet
              </p>
              <Link
                href={APP_ROUTES.order}
                className="mt-3 inline-flex h-9 items-center rounded-md bg-[var(--pos-primary,#0f766e)] px-4 text-[12px] font-semibold text-white transition hover:bg-[#0d6b63]"
              >
                Place an order
              </Link>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {orders.map((o) => {
                const name =
                  suppliers.find((s) => s.id === o.supplierId)?.name ??
                  "Supplier";
                const active = selectedId === o.id;
                const isSent = o.status === "sent";
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(o.id)}
                      className={cn(
                        "group relative flex w-full flex-col gap-1.5 overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-200",
                        active
                          ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] bg-white shadow-[0_8px_24px_-16px_color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)]"
                          : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white/60 hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] hover:bg-white",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-y-2 left-0 w-1 rounded-r-full transition-colors",
                          active
                            ? "bg-[var(--pos-primary,#0f766e)]"
                            : "bg-transparent group-hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
                        )}
                      />
                      <div className="flex items-start justify-between gap-2 pl-1.5">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                          {o.poNumber}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]",
                            isSent
                              ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] text-[var(--pos-primary,#0f766e)]"
                              : "bg-amber-100 text-amber-900",
                          )}
                        >
                          {o.status}
                        </span>
                      </div>
                      <span className="pl-1.5 text-[13px] font-semibold leading-snug text-[var(--order-ink,#15231f)]">
                        {name}
                      </span>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-1.5 font-mono text-[10px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                        <span>
                          {o.lineCount} lines · {toNum(o.totalOrdered)} ordered
                        </span>
                      </div>
                      <span className="pl-1.5 font-mono text-[9px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]">
                        {formatOrderCreatedAt(o.createdAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_78%,transparent)] px-4 py-3 backdrop-blur-[2px] sm:items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
              Confirm → supply
            </p>
            <h2 className="mt-0.5 truncate font-heading text-[17px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
              {detail ? `${detail.poNumber} · ${supplierName}` : "Select an order"}
            </h2>
            {detail ? (
              <p className="mt-1 font-mono text-[10px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                Created {formatOrderCreatedAt(selectedOrderCreatedAt)}
              </p>
            ) : (
              <p className="mt-1 text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                Pick an order from the list to review lines.
              </p>
            )}
          </div>
          {!embedded ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {detail ? (
                <>
                  <button
                    type="button"
                    disabled={
                      savingOrder ||
                      deletingOrder ||
                      confirming ||
                      !orderDirty
                    }
                    onClick={() => void saveOrder()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 text-[11px] font-semibold text-[var(--order-ink,#15231f)] transition hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,transparent)] disabled:opacity-50"
                  >
                    {savingOrder ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save order
                  </button>
                  <button
                    type="button"
                    disabled={deletingOrder || savingOrder || confirming}
                    onClick={() => void removeOrder()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingOrder ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    Delete order
                  </button>
                </>
              ) : null}
              <Link
                href={APP_ROUTES.order}
                className="inline-flex h-9 shrink-0 items-center rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] transition hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,transparent)]"
              >
                New order
              </Link>
            </div>
          ) : detail ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={
                  savingOrder || deletingOrder || confirming || !orderDirty
                }
                onClick={() => void saveOrder()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 text-[11px] font-semibold text-[var(--order-ink,#15231f)] transition hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,transparent)] disabled:opacity-50"
              >
                {savingOrder ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Save
              </button>
              <button
                type="button"
                disabled={deletingOrder || savingOrder || confirming}
                onClick={() => void removeOrder()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                {deletingOrder ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Delete
              </button>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
          {detailLoading ? (
            <p className="flex items-center justify-center gap-2 py-20 text-[13px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_50%,transparent)]">
              <Loader2 className="size-4 animate-spin" />
              Loading lines…
            </p>
          ) : !detail ? (
            <div className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-3 px-6 text-center">
              <ClipboardList
                className="size-9 text-[color-mix(in_srgb,var(--order-ink,#15231f)_22%,transparent)]"
                strokeWidth={1.25}
              />
              <p className="max-w-xs text-[13px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
                Select an open order to adjust prices, quantities, and confirm delivery.
              </p>
            </div>
          ) : displayLines.length === 0 ? (
            <div className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-2 px-6 text-center">
              <Package className="size-8 text-[color-mix(in_srgb,var(--order-ink,#15231f)_22%,transparent)]" />
              <p className="text-[13px] font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
                No items on this order
              </p>
              <p className="text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                Add items from the supplier catalog below, then save the order.
              </p>
            </div>
          ) : (
            <>
              <div className="sticky top-0 z-[2] hidden grid-cols-[minmax(0,1fr)_5.5rem_6rem_6.5rem_5.5rem_2rem] gap-3 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_88%,transparent)] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)] backdrop-blur-sm lg:grid">
                <span>Item</span>
                <span className="text-center">Unit price</span>
                <span className="text-center">Order qty</span>
                <span className="text-center">Receive qty</span>
                <span className="text-right">Line total</span>
                <span className="sr-only">Remove</span>
              </div>
              <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]">
              {displayLines.map((line) => {
                const remaining =
                  toNum(line.qtyOrdered) - toNum(line.qtyReceived);
                const canReceive = remaining > 0;
                const checked = canReceive && Boolean(selectedLines[line.id]);
                const receiveQty = qtyByLine[line.id] ?? remaining;
                const orderQty = orderQtyByLine[line.id] ?? toNum(line.qtyOrdered);
                const unit = priceByLine[line.id] ?? toNum(line.unitEstimatedCost);
                const amount = (canReceive ? receiveQty : orderQty) * unit;
                const meta = itemMeta[line.itemId];
                const name = meta?.name ?? line.itemId.slice(0, 8);
                const thumb = posTileThumbUrl(name, meta?.thumbnailUrl);
                const lineBusy =
                  savingLineId === line.id || deletingLineId === line.id;
                const canDelete = toNum(line.qtyReceived) === 0;
                return (
                  <li
                    key={line.id}
                    className={cn(
                      "grid gap-3 px-3 py-3 transition-colors sm:px-4 lg:grid-cols-[minmax(0,1fr)_5.5rem_6rem_6.5rem_5.5rem_2rem] lg:items-center lg:gap-3 lg:py-2.5",
                      checked
                        ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,transparent)]"
                        : "bg-transparent",
                      !canReceive ? "opacity-80" : "",
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3 lg:col-span-1">
                      <button
                        type="button"
                        aria-pressed={checked}
                        disabled={!canReceive}
                        onClick={() =>
                          setSelectedLines((prev) => ({
                            ...prev,
                            [line.id]: !prev[line.id],
                          }))
                        }
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                          !canReceive
                            ? "cursor-not-allowed border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)] opacity-40"
                            : checked
                              ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                              : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)] bg-white",
                        )}
                      >
                        {checked ? <Check className="size-3" /> : null}
                      </button>
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-contain p-0.5"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Package className="size-4 opacity-35" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold leading-snug text-[var(--order-ink,#15231f)]">
                          {name}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                          Received {toNum(line.qtyReceived)}
                          {!canReceive ? " · fully received" : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pl-8 lg:contents">
                      <label className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)] lg:justify-center">
                        <span className="lg:hidden">Unit</span>
                        <input
                          className="h-8 w-[4.5rem] rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 text-center text-[12px] font-semibold tabular-nums text-[var(--order-ink,#15231f)] outline-none focus:border-[var(--pos-primary,#0f766e)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_18%,transparent)] disabled:opacity-40"
                          disabled={lineBusy}
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
                              void persistLine(line.id, { unitEstimatedCost: n });
                            }
                          }}
                        />
                      </label>

                      <label className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)] lg:justify-center">
                        <span className="lg:hidden">Order</span>
                        <input
                          className="h-8 w-[4.5rem] rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 text-center text-[12px] font-semibold tabular-nums text-[var(--order-ink,#15231f)] outline-none focus:border-[var(--pos-primary,#0f766e)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_18%,transparent)] disabled:opacity-40"
                          disabled={lineBusy}
                          value={orderQty}
                          onChange={(e) => {
                            const n = Number.parseFloat(e.target.value);
                            setOrderQtyByLine((prev) => ({
                              ...prev,
                              [line.id]: Number.isFinite(n)
                                ? Math.max(0, n)
                                : 0,
                            }));
                          }}
                          onBlur={(e) => {
                            const n = Number.parseFloat(e.target.value);
                            if (Number.isFinite(n) && n > 0) {
                              void persistLine(line.id, { qtyOrdered: n });
                            }
                          }}
                        />
                      </label>

                      {canReceive ? (
                        <div className="inline-flex items-center overflow-hidden rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white lg:justify-self-center">
                          <button
                            type="button"
                            className="flex size-8 items-center justify-center text-[var(--order-ink,#15231f)] transition hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)]"
                            disabled={!checked || lineBusy}
                            onClick={() =>
                              setQtyByLine((prev) => ({
                                ...prev,
                                [line.id]: Math.max(0, receiveQty - 1),
                              }))
                            }
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <input
                            className="w-11 border-x border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-transparent text-center font-mono text-[13px] tabular-nums outline-none disabled:opacity-40"
                            disabled={!checked || lineBusy}
                            value={receiveQty}
                            onChange={(e) => {
                              const n = Number.parseFloat(e.target.value);
                              setQtyByLine((prev) => ({
                                ...prev,
                                [line.id]: Number.isFinite(n)
                                  ? Math.max(0, n)
                                  : 0,
                              }));
                            }}
                          />
                          <button
                            type="button"
                            className="flex size-8 items-center justify-center text-[var(--order-ink,#15231f)] transition hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)]"
                            disabled={!checked || lineBusy}
                            onClick={() =>
                              setQtyByLine((prev) => ({
                                ...prev,
                                [line.id]: receiveQty + 1,
                              }))
                            }
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="hidden text-center font-mono text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)] lg:block">
                          —
                        </span>
                      )}

                      <p className="pl-8 text-right font-mono text-[13px] font-bold tabular-nums text-[var(--order-ink,#15231f)] lg:pl-0">
                        {formatMoney(amount, ORDER_CURRENCY)}
                      </p>

                      <div className="flex justify-end pl-8 lg:pl-0">
                        <button
                          type="button"
                          disabled={!canDelete || lineBusy}
                          onClick={() => void removeLine(line.id)}
                          className="inline-flex size-8 items-center justify-center rounded-md border border-transparent text-red-600 transition hover:border-red-100 hover:bg-red-50 disabled:opacity-30"
                          title={
                            canDelete
                              ? "Remove line"
                              : "Cannot remove received lines"
                          }
                        >
                          {deletingLineId === line.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
              </ul>
            </>
          )}
          {detail && !detailLoading ? (
            <div className="mx-3 mb-3 mt-1 rounded-lg border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white/55 p-3 sm:mx-4">
              <button
                type="button"
                onClick={() => setAddItemOpen((v) => !v)}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white text-[12px] font-semibold text-[var(--order-ink,#15231f)] transition hover:border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] hover:text-[var(--pos-primary,#0f766e)] sm:w-auto sm:px-4"
              >
                <Plus className="size-3.5" />
                {addItemOpen ? "Hide catalog" : "Add item from catalog"}
              </button>
              {addItemOpen ? (
                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]" />
                    <input
                      className="h-10 w-full rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[var(--pos-primary,#0f766e)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_15%,transparent)]"
                      placeholder="Search supplier catalog…"
                      value={addItemQuery}
                      onChange={(e) => setAddItemQuery(e.target.value)}
                    />
                  </div>
                  {addableLinks.length === 0 ? (
                    <p className="text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                      {supplierLinks.length === 0
                        ? "No supplier catalog loaded."
                        : "No matching items, or all catalog items are already on this order."}
                    </p>
                  ) : (
                    <ul className="max-h-52 divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] overflow-y-auto rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white [scrollbar-width:thin]">
                      {addableLinks.map((link) => (
                        <li key={link.id}>
                          <button
                            type="button"
                            disabled={addingItemId === link.itemId}
                            onClick={() => void addItemToOrder(link)}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,transparent)] disabled:opacity-50"
                          >
                            <span className="min-w-0 truncate text-[13px] font-medium text-[var(--order-ink,#15231f)]">
                              {link.itemName}
                            </span>
                            <span className="shrink-0 font-mono text-[11px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                              {addingItemId === link.itemId ? (
                                <Loader2 className="size-3.5 animate-spin" />
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

        <div className="relative z-[1] shrink-0 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_82%,transparent)] backdrop-blur-[2px]">
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_17.5rem] lg:items-start">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-9 items-center rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 text-[11px] font-semibold transition hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,transparent)]"
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
                  className="inline-flex h-9 items-center rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 text-[11px] font-semibold transition hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,transparent)]"
                  onClick={() => setSelectedLines({})}
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={shareBusy || shareLines.length === 0}
                  onClick={() => void downloadOrderPdf()}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 text-[11px] font-semibold transition hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,transparent)] disabled:opacity-40"
                >
                  {sharing === "pdf" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FileDown className="size-3.5" />
                  )}
                  PDF
                </button>
                <button
                  type="button"
                  disabled={shareBusy || shareLines.length === 0}
                  onClick={() => void copyOrderList()}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 text-[11px] font-semibold transition hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,transparent)] disabled:opacity-40"
                >
                  {sharing === "copy" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  Copy
                </button>
                <button
                  type="button"
                  disabled={shareBusy || shareLines.length === 0}
                  onClick={() => void sendOrderWhatsApp()}
                  className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#128c4a] px-3 text-[12px] font-semibold text-white transition hover:bg-[#0f7a3f] disabled:opacity-50 sm:col-span-1"
                >
                  {sharing === "whatsapp" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Opening…
                    </>
                  ) : (
                    <>
                      <MessageCircle className="size-3.5" />
                      WhatsApp
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] leading-relaxed text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                Share the order list or PDF with your supplier. Confirm posts a
                goods receipt and supplier bill.
              </p>
            </div>

            <div className="rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[var(--order-ink,#15231f)] p-3.5 text-white shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_10%,transparent)]">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[color-mix(in_srgb,#fff_55%,transparent)]">
                    Selected total
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-[color-mix(in_srgb,#fff_62%,transparent)]">
                    {selectedUnits} unit{selectedUnits === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="font-mono text-[22px] font-bold tabular-nums leading-none">
                  {formatMoney(selectedTotal, ORDER_CURRENCY)}
                </p>
              </div>
              <button
                type="button"
                disabled={confirming || openLines.length === 0}
                onClick={() => void confirmSelected()}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--pos-primary,#0f766e)] text-[13px] font-semibold text-white transition hover:bg-[#0d6b63] disabled:opacity-50"
              >
                {confirming ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Posting supply…
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Confirm → supply
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
