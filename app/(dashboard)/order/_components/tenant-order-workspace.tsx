"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
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
      if (activeSupplier?.marketplaceSupplierId?.trim()) {
        await postPathAPurchaseOrderSendToSupplier(po.id, { toast: false });
      } else {
        await postPathAPurchaseOrderSend(po.id);
      }
    } catch (error) {
      // Do not fall back to plain /send when the supplier is portal-linked —
      // that would hide the PO from their inbox (no sentToSupplierAt).
      throw error instanceof Error
        ? error
        : new Error("Could not send order to supplier");
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
      } else if (activeSupplier?.marketplaceSupplierId?.trim()) {
        toast.success(
          `Order ${poNumber} sent to ${activeSupplier.name}. They’ll see it in their portal.`,
        );
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
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,transparent)]">
            <ShoppingCart
              className="size-5 text-[var(--pos-primary,#0f766e)]/70"
              strokeWidth={1.5}
              aria-hidden
            />
          </span>
          <div className="space-y-1">
            <p className="text-[13px] font-semibold text-[var(--order-ink,#15231f)]">
              Empty slip
            </p>
            <p className="max-w-[16rem] text-[12px] leading-relaxed text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
              Tap a product on the shelf to start this order.
            </p>
          </div>
        </div>
      ) : (
        cartLines.map(({ link, qty }) => {
          const cost = unitCost(link);
          const amount = lineTotal(link, qty);
          const thumb = posTileThumbUrl(link.itemName, link.thumbnailUrl);
          return (
            <div
              key={link.itemId}
              className="flex gap-3 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3.5 py-3 last:border-b-0"
            >
              <div className="relative size-11 shrink-0 overflow-hidden bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,#fff)] ring-1 ring-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-contain p-1"
                    unoptimized
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <Package className="size-3.5 opacity-25" aria-hidden />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-snug text-[var(--order-ink,#15231f)]">
                  {link.itemName}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[var(--order-shelf,#f3f6f5)]">
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center text-[15px] text-[var(--order-ink,#15231f)]/70 transition-colors hover:bg-white hover:text-[var(--order-ink,#15231f)]"
                      onClick={() => setQty(link.itemId, qty - 1)}
                      aria-label="Decrease"
                    >
                      −
                    </button>
                    <span className="min-w-7 text-center font-mono text-[12px] font-semibold tabular-nums">
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center text-[15px] text-[var(--order-ink,#15231f)]/70 transition-colors hover:bg-white hover:text-[var(--order-ink,#15231f)]"
                      onClick={() => setQty(link.itemId, qty + 1)}
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>
                  <p className="font-mono text-[13px] font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
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
    <div className="shrink-0 space-y-3 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)] bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_50%,transparent)]">
            {cartUnits} line{cartUnits === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            onClick={() => setRoundTo10((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 text-[11px] font-medium transition-colors",
              roundTo10
                ? "text-[var(--pos-primary,#0f766e)]"
                : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)] hover:text-[var(--order-ink,#15231f)]",
            )}
            aria-pressed={roundTo10}
            title="Round the order total to the nearest 10"
          >
            <span
              className={cn(
                "relative h-4 w-7 shrink-0 border transition-colors",
                roundTo10
                  ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)]"
                  : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_20%,transparent)] bg-transparent",
              )}
              aria-hidden
            >
              <span
                className={cn(
                  "absolute top-0.5 size-2.5 bg-white transition-[left]",
                  roundTo10 ? "left-3.5" : "left-0.5",
                )}
              />
            </span>
            Round to 10
          </button>
        </div>
        <div className="text-right">
          <p className="font-mono text-[26px] font-semibold leading-none tracking-tight tabular-nums text-[var(--order-ink,#15231f)]">
            {formatMoney(effectiveTotal, ORDER_CURRENCY)}
          </p>
          {roundingActive ? (
            <p className="mt-1.5 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
              {effectiveTotal > cartTotal ? "up" : "down"} from{" "}
              {formatMoney(cartTotal, ORDER_CURRENCY)}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        disabled={placing || whatsapping || cartLines.length === 0}
        onClick={() => void placeOrder(true)}
        className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[var(--pos-primary,#0f766e)] text-[14px] font-semibold text-white transition-[filter,transform,opacity] hover:brightness-[1.05] active:scale-[0.995] disabled:opacity-40"
      >
        {placing || whatsapping ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {placing ? "Saving…" : "Opening WhatsApp…"}
          </>
        ) : (
          <>
            <MessageCircle className="size-4" aria-hidden />
            Save & WhatsApp
          </>
        )}
      </button>

      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            disabled={placing || cartLines.length === 0}
            onClick={() => void placeOrder(false)}
            className="font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_60%,transparent)] transition-colors hover:text-[var(--order-ink,#15231f)] disabled:opacity-40"
          >
            Save only
          </button>
          <span
            className="text-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)]"
            aria-hidden
          >
            ·
          </span>
          <button
            type="button"
            disabled={whatsapping || cartLines.length === 0}
            onClick={() => void whatsappOnly()}
            className="font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_60%,transparent)] transition-colors hover:text-[var(--order-ink,#15231f)] disabled:opacity-40"
          >
            WhatsApp
          </button>
          <span
            className="text-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)]"
            aria-hidden
          >
            ·
          </span>
          <button
            type="button"
            disabled={cartLines.length === 0}
            onClick={() => void copyOrderTicket()}
            className="font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_60%,transparent)] transition-colors hover:text-[var(--order-ink,#15231f)] disabled:opacity-40"
          >
            Ticket
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)] pt-2.5 text-[10px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]">
        <button
          type="button"
          onClick={() => setImportOpen((v) => !v)}
          className="underline decoration-[color-mix(in_srgb,var(--order-ink,#15231f)_20%,transparent)] underline-offset-2 transition-colors hover:text-[var(--order-ink,#15231f)]"
        >
          {importOpen ? "Hide import" : "Import ticket"}
        </button>
        {supplierPhone ? (
          <span className="truncate font-mono tabular-nums">
            WA {supplierPhone}
          </span>
        ) : (
          <span>No phone on file</span>
        )}
      </div>

      {importOpen ? (
        <div className="space-y-2 border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-[var(--order-shelf,#f3f6f5)] p-2.5">
          <p className="text-[10px] leading-relaxed text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
            Paste a marketplace `?o=` URL or an `/order?ticket=` link.
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={2}
            placeholder="https://…?o=… or /order?ticket=…"
            className="w-full resize-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2.5 py-2 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/30"
          />
          <button
            type="button"
            onClick={() => applyImportedTicket(importText)}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 bg-[var(--order-ink,#15231f)] text-[11px] font-semibold text-white"
          >
            <Copy className="size-3.5" aria-hidden />
            Load into this order
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className={cn(
        "relative flex w-full flex-col overflow-hidden font-sans text-[var(--order-ink,#15231f)]",
        embedded
          ? "h-full min-h-0 flex-1 border-0"
          : "h-[calc(100dvh-12.25rem)] min-h-[20rem] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] sm:h-[min(68dvh,46rem)]",
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

      <div className="relative z-[1] flex shrink-0 items-stretch border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_88%,transparent)] backdrop-blur-[2px]">
        <button
          type="button"
          onClick={() => {
            setSupplierPickerOpen(true);
            setSupplierQuery("");
          }}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3.5 py-3 text-left transition-colors active:bg-black/[0.03] lg:pointer-events-none"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]">
              Ordering from
            </p>
            <p className="mt-0.5 truncate font-heading text-[17px] font-semibold leading-tight tracking-[-0.02em]">
              {activeSupplier?.name ?? "Select supplier"}
            </p>
          </div>
          <ChevronDown className="size-4 shrink-0 text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)] lg:hidden" />
        </button>
        {onOpenConfirm ? (
          <button
            type="button"
            onClick={onOpenConfirm}
            className="inline-flex shrink-0 items-center gap-1.5 border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-4 text-[12px] font-semibold text-[var(--pos-primary,#0f766e)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)]"
          >
            <ClipboardList className="size-3.5" aria-hidden />
            Confirm
          </button>
        ) : (
          <Link
            href={APP_ROUTES.orderReceive}
            className="inline-flex shrink-0 items-center gap-1.5 border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-4 text-[12px] font-semibold text-[var(--pos-primary,#0f766e)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)]"
          >
            <ClipboardList className="size-3.5" aria-hidden />
            Confirm
          </Link>
        )}
        <Link
          href={APP_ROUTES.helpSuppliersSuppliesOrders}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-4 text-[12px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_5%,transparent)] hover:text-[var(--order-ink,#15231f)]"
          title="Suppliers, supplies & purchase orders — step-by-step guide"
        >
          <BookOpen className="size-3.5" aria-hidden />
          Guide
        </Link>
      </div>

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="hidden min-h-0 w-48 shrink-0 flex-col overflow-hidden border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)] bg-white/40 lg:flex xl:w-52">
          <div className="relative border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]" />
            <input
              className="h-10 w-full bg-transparent pl-9 pr-2 text-[13px] outline-none placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_35%,transparent)]"
              placeholder="Find supplier"
              value={supplierQuery}
              onChange={(e) => setSupplierQuery(e.target.value)}
            />
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
            {loadingSuppliers ? (
              <p className="px-2 py-10 text-center text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]">
                <Loader2 className="mr-1 inline size-3.5 animate-spin" />
                Loading
              </p>
            ) : (
              filteredSuppliers.map((s) => {
                const active = supplierId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectSupplier(s.id)}
                    className={cn(
                      "mb-0.5 w-full px-2.5 py-2 text-left text-[13px] transition-colors",
                      active
                        ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] font-semibold text-[var(--pos-primary,#0f766e)]"
                        : "font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:bg-white/80 hover:text-[var(--order-ink,#15231f)]",
                    )}
                  >
                    {s.name}
                  </button>
                );
              })
            )}
          </nav>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white/50">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]" />
            <input
              className="h-11 w-full bg-transparent pl-11 pr-3 text-[16px] outline-none placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_35%,transparent)] sm:h-10 sm:text-[14px]"
              placeholder="Search products"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              enterKeyHint="search"
            />
          </div>

          {showFamilies ? (
            <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white/40">
              <div className="flex gap-0.5 overflow-x-auto px-2.5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setParentFilterId(null)}
                  className={cn(
                    "shrink-0 px-2.5 py-1 text-[12px] font-medium transition-colors",
                    !parentFilterId
                      ? "bg-[var(--order-ink,#15231f)] text-white"
                      : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)] hover:text-[var(--order-ink,#15231f)]",
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
                      "max-w-[9.5rem] shrink-0 truncate px-2.5 py-1 text-[12px] font-medium transition-colors",
                      parentFilterId === opt.id
                        ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,transparent)] text-[var(--pos-primary,#0f766e)]"
                        : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)] hover:text-[var(--order-ink,#15231f)]",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 [scrollbar-width:thin]">
            {!supplierId ? (
              <div className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-3 text-center">
                <Package
                  className="size-8 text-[var(--pos-primary,#0f766e)]/40"
                  strokeWidth={1.25}
                  aria-hidden
                />
                <p className="text-[13px] font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_60%,transparent)]">
                  Choose a supplier to open the shelf.
                </p>
              </div>
            ) : loadingLinks ? (
              <p className="flex items-center justify-center gap-2 py-20 text-[13px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_50%,transparent)]">
                <Loader2 className="size-4 animate-spin" />
                Loading shelf…
              </p>
            ) : visibleLinks.length === 0 ? (
              <p className="py-20 text-center text-[13px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_50%,transparent)]">
                {parentFilterId
                  ? "Nothing in this family."
                  : "No linked products."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 min-[1500px]:grid-cols-8 min-[1500px]:gap-3">
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
                        "group flex flex-col overflow-hidden bg-white transition-[box-shadow,ring-color] duration-150",
                        qty > 0
                          ? "ring-2 ring-[var(--pos-primary,#0f766e)]"
                          : "ring-1 ring-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] hover:ring-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]",
                      )}
                    >
                      <button
                        type="button"
                        className="relative aspect-[5/4] w-full touch-manipulation bg-[#fafbfa] transition-transform active:scale-[0.985]"
                        onClick={() => setQty(link.itemId, qty + 1)}
                        aria-label={`Add ${link.itemName}`}
                      >
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 48vw, (min-width: 1536px) 10vw, 140px"
                            className="object-contain p-3 transition-transform duration-200 group-hover:scale-[1.02]"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Package
                              className="size-5 opacity-15"
                              strokeWidth={1.5}
                              aria-hidden
                            />
                          </span>
                        )}
                        {qty > 0 ? (
                          <span className="absolute left-1.5 top-1.5 z-[1] inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center bg-[var(--pos-primary,#0f766e)] px-1 font-mono text-[10px] font-bold text-white">
                            {qty}
                          </span>
                        ) : null}
                        {low ? (
                          <span className="absolute bottom-1.5 right-1.5 z-[1] bg-amber-700/90 px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums text-white">
                            {stock}
                          </span>
                        ) : null}
                      </button>
                      <div className="flex flex-1 flex-col gap-2 px-2 pb-2 pt-1.5">
                        <p className="line-clamp-2 min-h-[2.1rem] text-[12px] font-medium leading-snug text-[var(--order-ink,#15231f)]">
                          {link.itemName}
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-1.5">
                          <p className="font-mono text-[12px] font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
                            {cost > 0
                              ? formatMoney(cost, ORDER_CURRENCY)
                              : "—"}
                          </p>
                          <div className="inline-flex items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[var(--order-shelf,#f3f6f5)]/80">
                            <button
                              type="button"
                              disabled={qty <= 0}
                              className="flex size-7 items-center justify-center touch-manipulation text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)] transition-colors hover:bg-white disabled:opacity-25"
                              onClick={() => setQty(link.itemId, qty - 1)}
                              aria-label="Decrease"
                            >
                              −
                            </button>
                            <span className="min-w-5 text-center font-mono text-[11px] font-semibold tabular-nums">
                              {qty}
                            </span>
                            <button
                              type="button"
                              className="flex size-7 items-center justify-center touch-manipulation text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)] transition-colors hover:bg-white"
                              onClick={() => setQty(link.itemId, qty + 1)}
                              aria-label="Increase"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="hidden min-h-0 w-[20rem] shrink-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)] bg-white lg:flex xl:w-[22rem]">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-4">
            <p className="font-heading text-[16px] font-semibold tracking-[-0.02em]">
              This order
            </p>
            <span className="font-mono text-[12px] font-semibold tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]">
              {cartUnits}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
            {cartLinesPanel}
          </div>
          {placeFooter}
        </aside>
      </div>

      <button
        type="button"
        onClick={() => setMobileOrderOpen(true)}
        className="relative z-[1] flex w-full shrink-0 items-center justify-between gap-3 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[var(--pos-primary,#0f766e)] px-3.5 py-3 text-white lg:hidden active:brightness-95"
      >
        <span className="text-left">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
            This order
          </span>
          <span className="text-[14px] font-semibold">
            {cartUnits === 0
              ? "No items yet"
              : `${cartUnits} line${cartUnits === 1 ? "" : "s"}`}
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="font-mono text-[15px] font-semibold tabular-nums">
            {formatMoney(effectiveTotal, ORDER_CURRENCY)}
          </span>
          <ChevronUp className="size-4 opacity-90" aria-hidden />
        </span>
      </button>

      {supplierPickerOpen ? (
        <div className="absolute inset-0 z-50 flex flex-col lg:hidden">
          <button
            type="button"
            className="min-h-0 flex-[0.2] bg-[var(--order-ink,#15231f)]/40"
            aria-label="Close suppliers"
            onClick={() => setSupplierPickerOpen(false)}
          />
          <div className="flex max-h-[80%] min-h-[50%] flex-col border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white">
            <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3.5 py-3">
              <p className="font-heading text-[17px] font-semibold tracking-[-0.02em]">
                Suppliers
              </p>
              <button
                type="button"
                className="flex size-9 items-center justify-center text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]"
                onClick={() => setSupplierPickerOpen(false)}
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="relative border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]" />
              <input
                autoFocus
                className="h-11 w-full bg-transparent pl-11 pr-3 text-[16px] outline-none"
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
                    "flex w-full border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)] px-3.5 py-3.5 text-left text-[14px] font-medium",
                    supplierId === s.id
                      ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)]"
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
            className="min-h-0 flex-1 bg-[var(--order-ink,#15231f)]/40"
            aria-label="Dismiss order"
            onClick={() => setMobileOrderOpen(false)}
          />
          <div className="flex max-h-[88%] min-h-[45%] flex-col border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white">
            <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]">
                  This order
                </p>
                <p className="truncate font-heading text-[16px] font-semibold tracking-[-0.02em]">
                  {activeSupplier?.name ?? "Supplier"}
                </p>
              </div>
              <button
                type="button"
                className="flex size-9 items-center justify-center text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]"
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
