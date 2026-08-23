"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  Link2,
  Loader2,
  MessageCircle,
  Package,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import {
  buildMarketplaceOrderText,
  buildWhatsAppOrderUrl,
} from "@/app/marketplace/_lib/marketplace-order-pdf";
import { getSessionTenantId } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierContacts,
  fetchSupplierItemLinks,
  fetchSuppliers,
  postPathAPurchaseOrder,
  postPathAPurchaseOrderLine,
  postPathAPurchaseOrderSend,
  postPathAPurchaseOrderSendToSupplier,
  type SupplierContactRecord,
  type SupplierItemLinkRecord,
  type SupplierRecord,
} from "@/lib/api";
import {
  clearOrderCartForSupplier,
  readOrderCartDraft,
  writeOrderCartDraft,
  type OrderCartQty,
} from "@/lib/order-cart-storage";
import {
  encodeTenantCartTicket,
  matchOrderTicketToLinks,
  parseOrderTicket,
  parseOrderTicketFromInput,
  tenantOrderTicketPath,
} from "@/lib/order-ticket";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { cn, formatMoney } from "@/lib/utils";

import { type OrderParentOption } from "./order-parent-floater";

const ORDER_CURRENCY = "KES";

type CartQty = OrderCartQty;

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function unitCost(link: SupplierItemLinkRecord): number {
  const candidates = [
    link.lastCostPrice,
    link.defaultCostPrice,
    link.catalogBuyingPrice,
  ];
  for (const c of candidates) {
    const n = toNum(c);
    if (n > 0) return n;
  }
  return 0;
}

function lineTotal(link: SupplierItemLinkRecord, qty: number): number {
  return unitCost(link) * qty;
}

function normalizeParentLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

function linkParentId(link: SupplierItemLinkRecord): string {
  const variantOf = link.variantOfItemId?.trim();
  if (variantOf) return variantOf;

  const parentName = link.parentItemName?.trim();
  if (parentName) return `name:${normalizeParentLabel(parentName)}`;

  const name = link.itemName?.trim() || "";
  const sep = name.indexOf(" · ");
  if (sep > 0) return `name:${normalizeParentLabel(name.slice(0, sep))}`;
  if (name) return `name:${normalizeParentLabel(name)}`;
  return link.itemId;
}

function linkParentLabel(link: SupplierItemLinkRecord): string {
  const parent = link.parentItemName?.trim();
  if (parent) return parent;
  const name = link.itemName?.trim() || link.sku?.trim() || "Product";
  const sep = name.indexOf(" · ");
  return sep > 0 ? name.slice(0, sep) : name;
}

export function TenantOrderWorkspace({
  initialTicket = null,
  initialSupplierId = null,
  initialMarketplaceSupplierId = null,
  initialRoundTo10 = false,
  embedded = false,
  onOpenConfirm,
}: {
  /** Shared order ticket from `/order?ticket=` or marketplace `?o=`. */
  initialTicket?: string | null;
  initialSupplierId?: string | null;
  initialMarketplaceSupplierId?: string | null;
  initialRoundTo10?: boolean;
  /** Fill parent (e.g. till / grocery drawer) instead of page viewport height. */
  embedded?: boolean;
  /** When set, Confirm opens this callback instead of navigating to receive. */
  onOpenConfirm?: () => void;
} = {}) {
  const { branchId } = useDashboard();
  const businessId = getSessionTenantId()?.trim() ?? "";
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(
    initialSupplierId?.trim() || null,
  );
  const [links, setLinks] = useState<SupplierItemLinkRecord[]>([]);
  const [contacts, setContacts] = useState<SupplierContactRecord[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [filter, setFilter] = useState("");
  const [cart, setCart] = useState<CartQty>({});
  const [placing, setPlacing] = useState(false);
  const [whatsapping, setWhatsapping] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [parentFilterId, setParentFilterId] = useState<string | null>(null);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  /** Round the order total to the nearest 10 (default on; toggle in the footer). */
  const [roundTo10, setRoundTo10] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const cartsBySupplierRef = useRef<Record<string, CartQty>>({});
  const supplierIdRef = useRef<string | null>(null);
  const ticketAppliedRef = useRef(false);
  const pendingTicketRef = useRef(parseOrderTicket(initialTicket));
  supplierIdRef.current = supplierId;

  const persistDraft = (
    selectedSupplierId: string | null,
    nextCart: CartQty,
  ) => {
    if (!businessId) return;
    const maps = { ...cartsBySupplierRef.current };
    if (selectedSupplierId) {
      const clean = { ...nextCart };
      if (Object.keys(clean).length === 0) delete maps[selectedSupplierId];
      else maps[selectedSupplierId] = clean;
    }
    cartsBySupplierRef.current = maps;
    writeOrderCartDraft({
      businessId,
      branchId,
      selectedSupplierId,
      cartsBySupplier: maps,
    });
  };

  useEffect(() => {
    if (!businessId) {
      setHydrated(true);
      return;
    }
    const draft = readOrderCartDraft(businessId, branchId);
    if (draft) {
      cartsBySupplierRef.current = draft.cartsBySupplier;
      const preferred =
        initialSupplierId?.trim() ||
        draft.selectedSupplierId ||
        null;
      if (preferred) {
        setSupplierId(preferred);
        // Shared tickets replace the draft cart for that supplier.
        if (pendingTicketRef.current.length > 0) {
          setCart({});
        } else {
          setCart(draft.cartsBySupplier[preferred] ?? {});
        }
      }
    } else {
      cartsBySupplierRef.current = {};
      if (!initialSupplierId?.trim()) setCart({});
    }
    setHydrated(true);
  }, [businessId, branchId, initialSupplierId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSuppliers(true);
    void fetchSuppliers()
      .then((rows) => {
        if (cancelled) return;
        const active = rows.filter(
          (s) => s.status?.toLowerCase() === "active" && !s.deletedAt,
        );
        setSuppliers(active);
        setSupplierId((current) => {
          if (current && active.some((s) => s.id === current)) return current;
          const fromMarketplace = initialMarketplaceSupplierId?.trim();
          if (fromMarketplace) {
            const linked = active.find(
              (s) => s.marketplaceSupplierId === fromMarketplace,
            );
            if (linked) return linked.id;
          }
          const fromSid = initialSupplierId?.trim();
          if (fromSid && active.some((s) => s.id === fromSid)) return fromSid;
          return active[0]?.id ?? null;
        });
        if (initialRoundTo10) setRoundTo10(true);
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to load suppliers",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingSuppliers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialMarketplaceSupplierId, initialRoundTo10, initialSupplierId]);

  useEffect(() => {
    if (!supplierId) {
      setContacts([]);
      return;
    }
    let cancelled = false;
    void fetchSupplierContacts(supplierId)
      .then((rows) => {
        if (!cancelled) setContacts(rows);
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  useEffect(() => {
    if (!supplierId) {
      setLinks([]);
      return;
    }
    let cancelled = false;
    setLoadingLinks(true);
    setCart(cartsBySupplierRef.current[supplierId] ?? {});
    void fetchSupplierItemLinks(supplierId, {
      branchId: branchId || undefined,
    })
      .then((rows) => {
        if (!cancelled) setLinks(rows.filter((r) => r.active));
      })
      .catch((error) => {
        if (!cancelled) {
          setLinks([]);
          toast.error(
            error instanceof Error ? error.message : "Failed to load products",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLinks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId, branchId]);

  // Apply a shared order ticket once the supplier catalogue is ready.
  useEffect(() => {
    if (ticketAppliedRef.current) return;
    if (loadingLinks || links.length === 0) return;
    const pending = pendingTicketRef.current;
    if (pending.length === 0) {
      ticketAppliedRef.current = true;
      return;
    }
    const result = matchOrderTicketToLinks(pending, links);
    ticketAppliedRef.current = true;
    pendingTicketRef.current = [];
    if (result.matched === 0) {
      toast.error("Could not match that shared order to this supplier’s catalogue");
      return;
    }
    setCart(result.cart);
    setMobileOrderOpen(true);
    if (result.missed.length > 0) {
      toast.message(
        `Loaded ${result.matched} line${result.matched === 1 ? "" : "s"} · ${result.missed.length} unmatched`,
      );
    } else {
      toast.success(
        `Loaded shared order · ${result.matched} line${result.matched === 1 ? "" : "s"}`,
      );
    }
  }, [loadingLinks, links]);

  useEffect(() => {
    setParentFilterId(null);
  }, [supplierId]);

  useEffect(() => {
    if (!hydrated || !businessId) return;
    persistDraft(supplierId, cart);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist cart/supplier only
  }, [hydrated, businessId, branchId, supplierId, cart]);

  const selectSupplier = (nextId: string) => {
    const prev = supplierIdRef.current;
    if (prev && prev !== nextId) {
      const maps = { ...cartsBySupplierRef.current, [prev]: cart };
      cartsBySupplierRef.current = maps;
    }
    setSupplierId(nextId);
  };

  const activeSupplier = suppliers.find((s) => s.id === supplierId) ?? null;

  const filteredSuppliers = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => s.name.toLowerCase().includes(q));
  }, [suppliers, supplierQuery]);

  const parentOptions = useMemo((): OrderParentOption[] => {
    const map = new Map<
      string,
      {
        label: string;
        thumbnailUrl: string | null;
        itemCount: number;
        lowStockCount: number;
      }
    >();
    for (const link of links) {
      const id = linkParentId(link);
      const existing = map.get(id);
      const stock = toNum(link.currentStock);
      const reorder = toNum(link.reorderLevel);
      const low = reorder > 0 && stock <= reorder;
      const thumb =
        link.itemId === id
          ? link.thumbnailUrl?.trim() || null
          : link.thumbnailUrl?.trim() || null;
      if (!existing) {
        map.set(id, {
          label: linkParentLabel(link),
          thumbnailUrl: thumb,
          itemCount: 1,
          lowStockCount: low ? 1 : 0,
        });
        continue;
      }
      existing.itemCount += 1;
      if (low) existing.lowStockCount += 1;
      if (!existing.thumbnailUrl && thumb) existing.thumbnailUrl = thumb;
      if (link.itemId === id && link.thumbnailUrl?.trim()) {
        existing.thumbnailUrl = link.thumbnailUrl.trim();
      }
    }
    const families = [...map.entries()]
      .map(([id, row]) => ({ id, ...row }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const total = links.length;
    const lowTotal = families.reduce((sum, f) => sum + f.lowStockCount, 0);
    return [
      {
        id: "all",
        label: "All products",
        thumbnailUrl: null,
        itemCount: total,
        lowStockCount: lowTotal,
      },
      ...families,
    ];
  }, [links]);

  const visibleLinks = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let rows = links;
    if (parentFilterId) {
      rows = rows.filter((r) => linkParentId(r) === parentFilterId);
    }
    if (q) {
      rows = rows.filter((r) => {
        const hay = [
          r.itemName,
          r.sku,
          r.barcode,
          r.supplierSku,
          r.variantName,
          r.parentItemName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return [...rows].sort((a, b) => {
      const stockA = toNum(a.currentStock);
      const stockB = toNum(b.currentStock);
      const lowA = stockA <= toNum(a.reorderLevel || 0) ? 0 : 1;
      const lowB = stockB <= toNum(b.reorderLevel || 0) ? 0 : 1;
      if (lowA !== lowB) return lowA - lowB;
      return a.itemName.localeCompare(b.itemName);
    });
  }, [links, filter, parentFilterId]);

  const cartLines = useMemo(
    () =>
      links
        .filter((l) => (cart[l.itemId] ?? 0) > 0)
        .map((l) => ({ link: l, qty: cart[l.itemId] ?? 0 })),
    [links, cart],
  );

  const cartUnits = cartLines.reduce((sum, line) => sum + line.qty, 0);
  const cartTotal = cartLines.reduce(
    (sum, line) => sum + lineTotal(line.link, line.qty),
    0,
  );

  // Round to the nearest 10 (e.g. 100.04 → 100, 99.99 → 100). Tiny orders
  // (under 5) stay exact so a small cart can never round to 0.
  const roundedTotal = (() => {
    const r = Math.round(cartTotal / 10) * 10;
    return r > 0 ? r : cartTotal;
  })();
  const effectiveTotal = roundTo10 ? roundedTotal : cartTotal;
  const roundingActive = roundTo10 && roundedTotal !== cartTotal;

  const supplierPhone = useMemo(() => {
    const primary =
      contacts.find((c) => c.primaryContact)?.phone?.trim() ||
      contacts.find((c) => c.phone?.trim())?.phone?.trim() ||
      activeSupplier?.payoutPhone?.trim() ||
      null;
    return primary;
  }, [contacts, activeSupplier]);

  const orderTicketPath = useMemo(() => {
    if (!supplierId || cartLines.length === 0) return APP_ROUTES.order;
    return tenantOrderTicketPath({
      ticket: encodeTenantCartTicket(cartLines),
      supplierId,
      marketplaceSupplierId: activeSupplier?.marketplaceSupplierId,
      roundTo10: roundingActive,
    });
  }, [activeSupplier?.marketplaceSupplierId, cartLines, roundingActive, supplierId]);

  const orderTicketUrl = () => {
    const path = orderTicketPath;
    return typeof window === "undefined"
      ? path
      : `${window.location.origin}${path}`;
  };

  const whatsappLines = useMemo(
    () =>
      cartLines.map(({ link, qty }) => ({
        name: link.itemName,
        sku: link.sku,
        barcode: link.barcode,
        qty,
        unitPrice: unitCost(link) || null,
        currency: ORDER_CURRENCY,
      })),
    [cartLines],
  );

  const applyImportedTicket = (raw: string) => {
    const lines = parseOrderTicketFromInput(raw);
    if (lines.length === 0) {
      toast.error("That doesn’t look like a shareable order link");
      return;
    }
    if (links.length === 0) {
      pendingTicketRef.current = lines;
      ticketAppliedRef.current = false;
      toast.message("Pick a supplier — we’ll load the ticket onto their catalogue");
      setImportOpen(false);
      setImportText("");
      return;
    }
    const result = matchOrderTicketToLinks(lines, links);
    if (result.matched === 0) {
      toast.error("No products on this supplier matched that order");
      return;
    }
    setCart(result.cart);
    setImportOpen(false);
    setImportText("");
    setMobileOrderOpen(true);
    toast.success(
      `Imported ${result.matched} line${result.matched === 1 ? "" : "s"}${
        result.missed.length ? ` · ${result.missed.length} skipped` : ""
      }`,
    );
  };

  const savePurchaseOrder = async (): Promise<string | null> => {
    if (!supplierId || !activeSupplier) {
      toast.error("Pick a supplier first");
      return null;
    }
    if (!branchId.trim()) {
      toast.error("Select a branch before ordering");
      return null;
    }
    if (cartLines.length === 0) {
      toast.error("Add products to the order");
      return null;
    }

    const linesToPost = cartLines.map((line) => ({
      itemId: line.link.itemId,
      qtyOrdered: line.qty,
      unitEstimatedCost: unitCost(line.link),
    }));
    if (roundingActive && linesToPost.length > 0) {
      const last = linesToPost[linesToPost.length - 1];
      const diff = Math.round((effectiveTotal - cartTotal) * 100) / 100;
      last.unitEstimatedCost =
        Math.round((last.unitEstimatedCost + diff / last.qtyOrdered) * 10000) /
        10000;
    }

    const po = await postPathAPurchaseOrder({
      supplierId,
      branchId: branchId.trim(),
      notes: "Created from Order",
    });
    for (const line of linesToPost) {
      await postPathAPurchaseOrderLine(po.id, {
        itemId: line.itemId,
        qtyOrdered: line.qtyOrdered,
        unitEstimatedCost: line.unitEstimatedCost,
      });
    }
    try {
      await postPathAPurchaseOrderSendToSupplier(po.id, { toast: false });
    } catch {
      await postPathAPurchaseOrderSend(po.id);
    }

    setCart({});
    if (businessId) {
      clearOrderCartForSupplier({
        businessId,
        branchId,
        supplierId,
      });
      const maps = { ...cartsBySupplierRef.current };
      delete maps[supplierId];
      cartsBySupplierRef.current = maps;
    }
    return po.poNumber;
  };

  const openWhatsAppOrder = async (opts?: { savedPoNumber?: string | null }) => {
    if (whatsappLines.length === 0) {
      toast.error("Add products to the order");
      return false;
    }
    const filename = `order-${(activeSupplier?.name || "supplier")
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 40)}.pdf`;
    const ticketUrl = orderTicketUrl();
    const shortOrderUrl =
      typeof window === "undefined"
        ? APP_ROUTES.order
        : `${window.location.origin}${APP_ROUTES.order}${
            supplierId ? `?sid=${encodeURIComponent(supplierId)}` : ""
          }`;
    const wa = buildWhatsAppOrderUrl({
      phone: supplierPhone,
      supplierName: activeSupplier?.name || "Supplier",
      lines: whatsappLines,
      filename,
      catalogueUrl: shortOrderUrl,
      totalOverride: roundingActive ? effectiveTotal : undefined,
    });
    if (wa) {
      window.open(wa, "_blank", "noopener,noreferrer");
      toast.success(
        opts?.savedPoNumber
          ? `Order ${opts.savedPoNumber} saved — WhatsApp opened`
          : "WhatsApp opened with your order ticket",
      );
      return true;
    }

    // No supplier phone — share the ticket text so the receiver can open /order.
    const text = buildMarketplaceOrderText(whatsappLines, {
      supplierName: activeSupplier?.name || "Supplier",
      filename,
      catalogueUrl: ticketUrl,
      totalOverride: roundingActive ? effectiveTotal : undefined,
    });
    await copyText(text, "Order message");
    toast.message(
      "No supplier WhatsApp number — order message copied. Paste it to the person receiving.",
    );
    return false;
  };

  const placeOrder = async (alsoWhatsApp = false) => {
    setPlacing(true);
    if (alsoWhatsApp) setWhatsapping(true);
    try {
      const poNumber = await savePurchaseOrder();
      if (!poNumber) return;
      if (alsoWhatsApp) {
        await openWhatsAppOrder({ savedPoNumber: poNumber });
      } else {
        toast.success(`Order ${poNumber} placed — confirm when goods arrive`);
      }
      setMobileOrderOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place order");
    } finally {
      setPlacing(false);
      setWhatsapping(false);
    }
  };

  const whatsappOnly = async () => {
    setWhatsapping(true);
    try {
      await openWhatsAppOrder();
    } finally {
      setWhatsapping(false);
    }
  };

  const copyOrderTicket = async () => {
    if (cartLines.length === 0) {
      toast.error("Add products to the order");
      return;
    }
    await copyText(orderTicketUrl(), "Order ticket link");
  };

  const setQty = (itemId: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });
  };

  const familyChips = parentOptions.filter((o) => o.id !== "all");
  const showFamilies = familyChips.length >= 2;

  const cartLinesPanel = (
    <>
      {cartLines.length === 0 ? (
        <p className="px-4 py-12 text-center text-[13px] text-muted-foreground">
          Tap products to build your order.
        </p>
      ) : (
        cartLines.map(({ link, qty }) => {
          const cost = unitCost(link);
          const amount = lineTotal(link, qty);
          const thumb = posTileThumbUrl(link.itemName, link.thumbnailUrl);
          return (
            <div
              key={link.itemId}
              className="flex gap-3 border-b border-border/60 px-3 py-3 last:border-b-0"
            >
              <div className="relative size-12 shrink-0 overflow-hidden bg-muted/50">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-contain p-1"
                    unoptimized
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <Package className="size-4 opacity-30" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-snug">
                  {link.itemName}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center border border-border">
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center"
                      onClick={() => setQty(link.itemId, qty - 1)}
                    >
                      −
                    </button>
                    <span className="min-w-7 text-center font-mono text-[12px]">
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center"
                      onClick={() => setQty(link.itemId, qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <p className="font-mono text-[13px] font-semibold tabular-nums">
                    {cost > 0 ? formatMoney(amount, ORDER_CURRENCY) : "—"}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </>
  );

  const placeFooter = (
    <div className="shrink-0 space-y-2.5 border-t border-border bg-background px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col items-start gap-1">
          <p className="text-[12px] text-muted-foreground">
            {cartUnits} item{cartUnits === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            onClick={() => setRoundTo10((v) => !v)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition",
              roundTo10
                ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)] text-[var(--pos-primary,#0f766e)]"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={roundTo10}
            title="Round the order total to the nearest 10"
          >
            {roundTo10 ? "Round to 10 · on" : "Round to 10 · off"}
          </button>
        </div>
        <div className="text-right">
          <p className="font-mono text-[18px] font-semibold tabular-nums">
            {formatMoney(effectiveTotal, ORDER_CURRENCY)}
          </p>
          {roundingActive ? (
            <p className="text-[10px] text-muted-foreground">
              {effectiveTotal > cartTotal ? "rounded up" : "rounded down"} from{" "}
              {formatMoney(cartTotal, ORDER_CURRENCY)}
            </p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        disabled={placing || whatsapping || cartLines.length === 0}
        onClick={() => void placeOrder(true)}
        className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#128c4a] text-sm font-semibold text-white disabled:opacity-40"
      >
        {placing || whatsapping ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {placing ? "Saving…" : "Opening WhatsApp…"}
          </>
        ) : (
          <>
            <MessageCircle className="size-4" />
            Save & WhatsApp
          </>
        )}
      </button>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={placing || cartLines.length === 0}
          onClick={() => void placeOrder(false)}
          className="inline-flex h-9 items-center justify-center gap-1 border border-border bg-background text-[10px] font-semibold uppercase tracking-[0.06em] disabled:opacity-40"
        >
          <ShoppingCart className="size-3.5" />
          Save only
        </button>
        <button
          type="button"
          disabled={whatsapping || cartLines.length === 0}
          onClick={() => void whatsappOnly()}
          className="inline-flex h-9 items-center justify-center gap-1 border border-border bg-background text-[10px] font-semibold uppercase tracking-[0.06em] disabled:opacity-40"
        >
          <MessageCircle className="size-3.5" />
          WhatsApp
        </button>
        <button
          type="button"
          disabled={cartLines.length === 0}
          onClick={() => void copyOrderTicket()}
          className="inline-flex h-9 items-center justify-center gap-1 border border-border bg-background text-[10px] font-semibold uppercase tracking-[0.06em] disabled:opacity-40"
        >
          <Link2 className="size-3.5" />
          Ticket
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <button
          type="button"
          onClick={() => setImportOpen((v) => !v)}
          className="underline underline-offset-2 hover:text-foreground"
        >
          {importOpen ? "Hide import" : "Import marketplace / ticket link"}
        </button>
        {supplierPhone ? (
          <span className="truncate font-mono tabular-nums">
            WA {supplierPhone}
          </span>
        ) : (
          <span>No supplier phone — Ticket still shares</span>
        )}
      </div>
      {importOpen ? (
        <div className="space-y-2 border border-dashed border-border/70 p-2">
          <p className="text-[10px] leading-snug text-muted-foreground">
            Paste a marketplace order URL (`?o=`) or an `/order?ticket=` link to
            load it onto this supplier.
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={2}
            placeholder="https://…/marketplace/s/…?o=… or /order?ticket=…"
            className="w-full resize-none border border-border bg-background px-2 py-1.5 text-[12px] outline-none"
          />
          <button
            type="button"
            onClick={() => applyImportedTicket(importText)}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 bg-[var(--pos-primary,#0f766e)] text-[11px] font-semibold text-white"
          >
            <Copy className="size-3.5" />
            Load into this order
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className={cn(
        "relative flex w-full flex-col overflow-hidden border border-border bg-background font-sans",
        embedded
          ? "h-full min-h-0 flex-1 border-0"
          : /* Clear tablet header + floating bottom nav */
            "h-[calc(100dvh-12.25rem)] min-h-[20rem] sm:h-[min(68dvh,46rem)]",
      )}
      style={{ ["--pos-primary" as string]: "#0f766e" }}
    >
      {/* Supplier bar only — page title lives in app shell */}
      <div className="flex shrink-0 items-stretch border-b border-border">
        <button
          type="button"
          onClick={() => {
            setSupplierPickerOpen(true);
            setSupplierQuery("");
          }}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2.5 text-left active:bg-muted/40 lg:pointer-events-none"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Supplier
            </p>
            <p className="truncate text-[14px] font-semibold leading-tight">
              {activeSupplier?.name ?? "Select supplier"}
            </p>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground lg:hidden" />
        </button>
        {onOpenConfirm ? (
          <button
            type="button"
            onClick={onOpenConfirm}
            className="inline-flex shrink-0 items-center gap-1.5 border-l border-border px-3 text-[12px] font-medium text-[var(--pos-primary,#0f766e)]"
          >
            <ClipboardList className="size-3.5" />
            Confirm
          </button>
        ) : (
          <Link
            href={APP_ROUTES.orderReceive}
            className="inline-flex shrink-0 items-center gap-1.5 border-l border-border px-3 text-[12px] font-medium text-[var(--pos-primary,#0f766e)]"
          >
            <ClipboardList className="size-3.5" />
            Confirm
          </Link>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="hidden w-52 shrink-0 flex-col border-r border-border lg:flex xl:w-56">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-full bg-transparent pl-8 pr-2 text-[13px] outline-none placeholder:text-muted-foreground/60"
              placeholder="Find supplier"
              value={supplierQuery}
              onChange={(e) => setSupplierQuery(e.target.value)}
            />
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto p-1">
            {loadingSuppliers ? (
              <p className="px-2 py-8 text-center text-[12px] text-muted-foreground">
                <Loader2 className="mr-1 inline size-3.5 animate-spin" />
                Loading
              </p>
            ) : (
              filteredSuppliers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSupplier(s.id)}
                  className={cn(
                    "mb-0.5 w-full px-2.5 py-2.5 text-left text-[13px] font-medium",
                    supplierId === s.id
                      ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,transparent)]"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {s.name}
                </button>
              ))
            )}
          </nav>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative shrink-0 border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-11 w-full bg-transparent pl-10 pr-3 text-[16px] outline-none placeholder:text-muted-foreground/55 sm:h-10 sm:text-[14px]"
              placeholder="Search products"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              enterKeyHint="search"
            />
          </div>

          {showFamilies ? (
            <div className="shrink-0 border-b border-border">
              <div className="flex gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setParentFilterId(null)}
                  className={cn(
                    "shrink-0 border-r border-border px-3.5 py-2 text-[12px] font-medium",
                    !parentFilterId
                      ? "bg-[var(--pos-primary,#0f766e)] text-white"
                      : "bg-transparent text-muted-foreground",
                  )}
                >
                  All
                </button>
                {familyChips.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setParentFilterId(
                        parentFilterId === opt.id ? null : opt.id,
                      )
                    }
                    className={cn(
                      "max-w-[10rem] shrink-0 truncate border-r border-border px-3.5 py-2 text-[12px] font-medium",
                      parentFilterId === opt.id
                        ? "bg-[var(--pos-primary,#0f766e)] text-white"
                        : "text-muted-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-2.5">
            {!supplierId ? (
              <p className="py-16 text-center text-[13px] text-muted-foreground">
                Choose a supplier to start.
              </p>
            ) : loadingLinks ? (
              <p className="flex items-center justify-center gap-2 py-16 text-[13px] text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </p>
            ) : visibleLinks.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-muted-foreground">
                {parentFilterId
                  ? "Nothing in this family."
                  : "No linked products."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {visibleLinks.map((link) => {
                  const qty = cart[link.itemId] ?? 0;
                  const stock = toNum(link.currentStock);
                  const reorder = toNum(link.reorderLevel);
                  const low = reorder > 0 && stock <= reorder;
                  const cost = unitCost(link);
                  const thumb = posTileThumbUrl(
                    link.itemName,
                    link.thumbnailUrl,
                  );
                  return (
                    <div
                      key={link.id}
                      className={cn(
                        "flex flex-col overflow-hidden border bg-card",
                        qty > 0
                          ? "border-[var(--pos-primary,#0f766e)]"
                          : "border-border",
                      )}
                    >
                      <button
                        type="button"
                        className="relative aspect-square w-full touch-manipulation bg-muted/40"
                        onClick={() => setQty(link.itemId, qty + 1)}
                        aria-label={`Add ${link.itemName}`}
                      >
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 48vw, 140px"
                            className="object-contain p-2"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Package
                              className="size-5 opacity-25"
                              strokeWidth={1.5}
                            />
                          </span>
                        )}
                        {qty > 0 ? (
                          <span className="absolute left-0 top-0 z-[1] inline-flex h-5 min-w-5 items-center justify-center bg-[var(--pos-primary,#0f766e)] px-1 font-mono text-[10px] font-bold text-white">
                            {qty}
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 z-[1] px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-white",
                            low ? "bg-amber-600" : "bg-foreground/70",
                          )}
                        >
                          {stock}
                        </span>
                      </button>
                      <div className="flex flex-1 flex-col gap-1.5 p-2">
                        <p className="line-clamp-2 min-h-[2.25rem] text-[12px] font-medium leading-snug">
                          {link.itemName}
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-1">
                          <p className="font-mono text-[12px] font-semibold tabular-nums">
                            {cost > 0
                              ? formatMoney(cost, ORDER_CURRENCY)
                              : "—"}
                          </p>
                          {qty > 0 ? (
                            <div className="inline-flex items-center border border-border">
                              <button
                                type="button"
                                className="flex size-7 items-center justify-center touch-manipulation"
                                onClick={() => setQty(link.itemId, qty - 1)}
                              >
                                −
                              </button>
                              <span className="min-w-5 text-center font-mono text-[11px]">
                                {qty}
                              </span>
                              <button
                                type="button"
                                className="flex size-7 items-center justify-center touch-manipulation"
                                onClick={() => setQty(link.itemId, qty + 1)}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="px-1.5 py-1 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] touch-manipulation"
                              onClick={() => setQty(link.itemId, 1)}
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="hidden w-72 shrink-0 flex-col border-l border-border lg:flex xl:w-80">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
            <p className="text-[12px] font-medium text-muted-foreground">
              Order list
            </p>
            <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
              {cartUnits}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{cartLinesPanel}</div>
          {placeFooter}
        </aside>
      </div>

      {/* Flush ticket — sits above bottom nav via workspace height */}
      <button
        type="button"
        onClick={() => setMobileOrderOpen(true)}
        className="flex w-full shrink-0 items-center justify-between gap-3 border-t border-border bg-[var(--pos-primary,#0f766e)] px-3 py-3 text-white lg:hidden active:brightness-95"
      >
        <span className="text-left">
          <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-white/75">
            Your order
          </span>
          <span className="text-[14px] font-semibold">
            {cartUnits === 0
              ? "No items yet"
              : `${cartUnits} item${cartUnits === 1 ? "" : "s"}`}
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="font-mono text-[15px] font-semibold tabular-nums">
            {formatMoney(effectiveTotal, ORDER_CURRENCY)}
          </span>
          <ChevronUp className="size-4 opacity-90" />
        </span>
      </button>

      {supplierPickerOpen ? (
        <div className="absolute inset-0 z-50 flex flex-col lg:hidden">
          <button
            type="button"
            className="min-h-0 flex-[0.2] bg-black/40"
            aria-label="Close suppliers"
            onClick={() => setSupplierPickerOpen(false)}
          />
          <div className="flex max-h-[80%] min-h-[50%] flex-col border-t border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-3 py-3">
              <p className="text-[15px] font-semibold">Suppliers</p>
              <button
                type="button"
                className="flex size-9 items-center justify-center text-muted-foreground"
                onClick={() => setSupplierPickerOpen(false)}
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="relative border-b border-border">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                className="h-11 w-full bg-transparent pl-10 pr-3 text-[16px] outline-none"
                placeholder="Search suppliers"
                value={supplierQuery}
                onChange={(e) => setSupplierQuery(e.target.value)}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filteredSuppliers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    selectSupplier(s.id);
                    setSupplierPickerOpen(false);
                    setSupplierQuery("");
                  }}
                  className={cn(
                    "flex w-full border-b border-border/70 px-3 py-3.5 text-left text-[14px] font-medium",
                    supplierId === s.id
                      ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)]"
                      : "",
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {mobileOrderOpen ? (
        <div className="absolute inset-0 z-50 flex flex-col lg:hidden">
          <button
            type="button"
            className="min-h-0 flex-1 bg-black/40"
            aria-label="Dismiss order"
            onClick={() => setMobileOrderOpen(false)}
          />
          <div className="flex max-h-[88%] min-h-[45%] flex-col border-t border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-3 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Order list
                </p>
                <p className="truncate text-[15px] font-semibold">
                  {activeSupplier?.name ?? "Supplier"}
                </p>
              </div>
              <button
                type="button"
                className="flex size-9 items-center justify-center text-muted-foreground"
                onClick={() => setMobileOrderOpen(false)}
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {cartLinesPanel}
            </div>
            {placeFooter}
          </div>
        </div>
      ) : null}
    </div>
  );
}
