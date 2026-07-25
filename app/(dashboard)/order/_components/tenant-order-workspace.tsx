"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronUp,
  ClipboardList,
  Loader2,
  Package,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import { getSessionTenantId } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierItemLinks,
  fetchSuppliers,
  postPathAPurchaseOrder,
  postPathAPurchaseOrderLine,
  postPathAPurchaseOrderSend,
  postPathAPurchaseOrderSendToSupplier,
  type SupplierItemLinkRecord,
  type SupplierRecord,
} from "@/lib/api";
import {
  clearOrderCartForSupplier,
  readOrderCartDraft,
  writeOrderCartDraft,
  type OrderCartQty,
} from "@/lib/order-cart-storage";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { cn, formatMoney } from "@/lib/utils";

import {
  OrderParentFloater,
  type OrderParentOption,
} from "./order-parent-floater";

const ORDER_CURRENCY = "KES";

type CartQty = OrderCartQty;

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

export function TenantOrderWorkspace() {
  const { branchId } = useDashboard();
  const businessId = getSessionTenantId()?.trim() ?? "";
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [links, setLinks] = useState<SupplierItemLinkRecord[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [filter, setFilter] = useState("");
  const [cart, setCart] = useState<CartQty>({});
  const [placing, setPlacing] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [parentFilterId, setParentFilterId] = useState<string | null>(null);
  const [parentDialOpen, setParentDialOpen] = useState(false);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);
  const [suppliersExpanded, setSuppliersExpanded] = useState(false);
  const cartsBySupplierRef = useRef<Record<string, CartQty>>({});
  const supplierIdRef = useRef<string | null>(null);
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
      if (draft.selectedSupplierId) {
        setSupplierId(draft.selectedSupplierId);
        setCart(draft.cartsBySupplier[draft.selectedSupplierId] ?? {});
      }
    } else {
      cartsBySupplierRef.current = {};
      setCart({});
    }
    setHydrated(true);
  }, [businessId, branchId]);

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
          return active[0]?.id ?? null;
        });
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
  }, []);

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

  useEffect(() => {
    setParentFilterId(null);
    setParentDialOpen(false);
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

  const activeParentLabel = parentFilterId
    ? parentOptions.find((p) => p.id === parentFilterId)?.label ?? null
    : null;

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

  const setQty = (itemId: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });
  };

  const placeOrder = async () => {
    if (!supplierId || !activeSupplier) {
      toast.error("Pick a supplier first");
      return;
    }
    if (!branchId.trim()) {
      toast.error("Select a branch before ordering");
      return;
    }
    if (cartLines.length === 0) {
      toast.error("Add products to the order");
      return;
    }
    setPlacing(true);
    try {
      const po = await postPathAPurchaseOrder({
        supplierId,
        branchId: branchId.trim(),
        notes: "Created from Order marketplace",
      });
      for (const line of cartLines) {
        await postPathAPurchaseOrderLine(po.id, {
          itemId: line.link.itemId,
          qtyOrdered: line.qty,
          unitEstimatedCost: unitCost(line.link),
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
      toast.success(`Order ${po.poNumber} placed — confirm when goods arrive`);
      setMobileOrderOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place order");
    } finally {
      setPlacing(false);
    }
  };


  const cartLinesPanel = (
    <>
      {cartLines.length === 0 ? (
        <p className="px-4 py-12 text-center text-[12px] text-muted-foreground">
          Tap products to build an order.
        </p>
      ) : (
        cartLines.map(({ link, qty }) => {
          const cost = unitCost(link);
          const amount = lineTotal(link, qty);
          const thumb = posTileThumbUrl(link.itemName, link.thumbnailUrl);
          return (
            <div
              key={link.itemId}
              className="flex gap-2.5 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-3 py-2.5"
            >
              <div className="relative size-11 shrink-0 overflow-hidden bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)]">
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
                <p className="text-[13px] font-medium leading-snug">
                  {link.itemName}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]">
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
                  <p className="font-mono text-[12px] font-semibold tabular-nums">
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
    <div className="shrink-0 space-y-2 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {cartUnits} item{cartUnits === 1 ? "" : "s"}
        </p>
        <p className="font-mono text-[17px] font-semibold tabular-nums">
          {formatMoney(cartTotal, ORDER_CURRENCY)}
        </p>
      </div>
      <button
        type="button"
        disabled={placing || cartLines.length === 0}
        onClick={() => void placeOrder()}
        className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[var(--pos-primary,#0f766e)] text-sm font-semibold text-white disabled:opacity-45"
      >
        {placing ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Placing…
          </>
        ) : (
          <>
            <ShoppingCart className="size-4" />
            Place order
          </>
        )}
      </button>
    </div>
  );

  return (
    <div
      className={cn(
        "relative flex w-full flex-col overflow-hidden bg-[color-mix(in_srgb,var(--card)_96%,#f7f3eb)]",
        "h-[calc(100dvh-9.75rem)] min-h-[20rem] sm:h-[min(72dvh,52rem)] sm:min-h-[28rem]",
        "border-y border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] sm:border",
      )}
      style={{ ["--pos-primary" as string]: "#0f766e" }}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Order
          </p>
          <h1 className="truncate text-[15px] font-semibold leading-tight">
            {activeSupplier?.name ?? "Choose a supplier"}
          </h1>
        </div>
        <Link
          href={APP_ROUTES.orderReceive}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-[11px] font-medium text-[var(--pos-primary,#0f766e)]"
        >
          <ClipboardList className="size-3.5" />
          Confirm
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] lg:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-full bg-transparent pl-9 pr-3 text-[16px] outline-none placeholder:text-muted-foreground/55"
              placeholder="Search suppliers"
              value={supplierQuery}
              onChange={(e) => {
                setSupplierQuery(e.target.value);
                if (e.target.value.trim()) setSuppliersExpanded(true);
              }}
              enterKeyHint="search"
              aria-label="Search suppliers"
              onFocus={() => setSuppliersExpanded(true)}
            />
          </div>
          {(suppliersExpanded || supplierQuery.trim()) && (
            <div className="flex gap-1.5 overflow-x-auto border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {loadingSuppliers ? (
                <p className="px-2 py-1 text-[11px] text-muted-foreground">
                  <Loader2 className="mr-1 inline size-3 animate-spin" />
                  Loading
                </p>
              ) : filteredSuppliers.length === 0 ? (
                <p className="px-2 py-1 text-[11px] text-muted-foreground">
                  No match
                </p>
              ) : (
                filteredSuppliers.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      selectSupplier(s.id);
                      setSuppliersExpanded(false);
                      setSupplierQuery("");
                    }}
                    className={cn(
                      "shrink-0 px-3 py-1.5 text-[12px] font-medium",
                      supplierId === s.id
                        ? "bg-[var(--pos-primary,#0f766e)] text-white"
                        : "bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] text-[var(--pos-ink,#1c1915)]",
                    )}
                  >
                    {s.name}
                  </button>
                ))
              )}
            </div>
          )}
        </section>

        <aside className="hidden w-52 shrink-0 flex-col overflow-hidden border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] lg:flex xl:w-56">
          <div className="relative border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-9 w-full bg-transparent pl-8 pr-2 text-[12px] outline-none placeholder:text-muted-foreground/50"
              placeholder="Suppliers"
              value={supplierQuery}
              onChange={(e) => setSupplierQuery(e.target.value)}
            />
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {loadingSuppliers ? (
              <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
                <Loader2 className="mr-1 inline size-3 animate-spin" />
                Loading
              </p>
            ) : filteredSuppliers.length === 0 ? (
              <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
                No suppliers
              </p>
            ) : (
              filteredSuppliers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSupplier(s.id)}
                  className={cn(
                    "mb-0.5 w-full px-2.5 py-2 text-left text-[12px] font-medium",
                    supplierId === s.id
                      ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] text-[var(--pos-ink,#1c1915)]"
                      : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] hover:text-foreground",
                  )}
                >
                  {s.name}
                </button>
              ))
            )}
          </nav>
        </aside>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-full bg-transparent pl-9 pr-3 text-[16px] outline-none placeholder:text-muted-foreground/55 sm:h-9 sm:text-[13px]"
              placeholder="Search products"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              enterKeyHint="search"
            />
          </div>

          {activeParentLabel ? (
            <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-1.5 text-[11px]">
              <p className="min-w-0 truncate font-medium">
                <span className="text-muted-foreground">Family · </span>
                {activeParentLabel}
              </p>
              <button
                type="button"
                className="shrink-0 text-muted-foreground"
                onClick={() => setParentFilterId(null)}
                aria-label="Clear family"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : null}

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto overscroll-contain px-2 pb-36 pt-2 sm:px-2.5 lg:pb-28">
              {!supplierId ? (
                <p className="py-16 text-center text-[12px] text-muted-foreground">
                  Choose a supplier to start.
                </p>
              ) : loadingLinks ? (
                <p className="flex items-center justify-center gap-2 py-16 text-[12px] text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading…
                </p>
              ) : visibleLinks.length === 0 ? (
                <p className="py-16 text-center text-[12px] text-muted-foreground">
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
                          "flex flex-col overflow-hidden bg-[color-mix(in_srgb,var(--card)_90%,#f7f3eb)]",
                          "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]",
                          qty > 0 && "border-[var(--pos-primary,#0f766e)]",
                        )}
                      >
                        <button
                          type="button"
                          className="relative aspect-square w-full touch-manipulation bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_40%,transparent)]"
                          onClick={() => setQty(link.itemId, qty + 1)}
                          aria-label={`Add ${link.itemName}`}
                        >
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 48vw, 140px"
                              className="object-contain p-1.5"
                              unoptimized
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center">
                              <Package
                                className="size-5 opacity-30"
                                strokeWidth={1.5}
                              />
                            </span>
                          )}
                          {qty > 0 ? (
                            <span className="absolute left-1.5 top-1.5 z-[1] inline-flex h-5 min-w-5 items-center justify-center bg-[var(--pos-primary,#0f766e)] px-1 font-mono text-[10px] font-bold text-white">
                              {qty}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              "absolute bottom-1.5 right-1.5 z-[1] px-1.5 py-0.5 font-mono text-[9px] font-medium tabular-nums",
                              low
                                ? "bg-amber-600 text-white"
                                : "bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_72%,transparent)] text-white",
                            )}
                          >
                            {stock}
                          </span>
                        </button>
                        <div className="flex flex-1 flex-col gap-1.5 p-2">
                          <p className="line-clamp-2 text-[11px] font-medium leading-snug">
                            {link.itemName}
                          </p>
                          <div className="mt-auto flex items-center justify-between gap-1">
                            <p className="font-mono text-[11px] font-semibold tabular-nums">
                              {cost > 0
                                ? formatMoney(cost, ORDER_CURRENCY)
                                : "—"}
                            </p>
                            {qty > 0 ? (
                              <div className="inline-flex items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]">
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
                                className="px-1.5 py-1 text-[10px] font-medium text-[var(--pos-primary,#0f766e)] touch-manipulation"
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

            <OrderParentFloater
              options={parentOptions}
              activeId={parentFilterId}
              open={parentDialOpen}
              onOpenChange={setParentDialOpen}
              onSelect={setParentFilterId}
              className="bottom-[4.5rem] mb-1.5 lg:bottom-2 lg:mb-0"
            />
          </div>
        </div>

        <aside className="hidden w-72 shrink-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] lg:flex xl:w-80">
          <div className="flex h-9 shrink-0 items-center justify-between px-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              Order list
            </p>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {cartUnits}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{cartLinesPanel}</div>
          {placeFooter}
        </aside>
      </div>

      <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOrderOpen(true)}
          className="flex w-full items-center justify-between gap-3 bg-[var(--pos-primary,#0f766e)] px-3 py-3 text-white active:brightness-95"
        >
          <span className="min-w-0 text-left">
            <span className="block text-[10px] font-medium uppercase tracking-[0.12em] opacity-80">
              Order
            </span>
            <span className="block truncate text-[13px] font-semibold">
              {cartUnits === 0
                ? "Empty"
                : `${cartUnits} item${cartUnits === 1 ? "" : "s"}`}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-2">
            <span className="font-mono text-[14px] font-semibold tabular-nums">
              {formatMoney(cartTotal, ORDER_CURRENCY)}
            </span>
            <ChevronUp className="size-4 opacity-90" />
          </span>
        </button>
      </div>

      {mobileOrderOpen ? (
        <div className="absolute inset-0 z-40 flex flex-col lg:hidden">
          <button
            type="button"
            className="min-h-0 flex-1 bg-black/30"
            aria-label="Dismiss order"
            onClick={() => setMobileOrderOpen(false)}
          />
          <div className="flex max-h-[85%] min-h-[40%] flex-col bg-[color-mix(in_srgb,#faf8f4_98%,transparent)]">
            <div className="flex items-center justify-between px-3 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Order list
                </p>
                <p className="truncate text-[14px] font-semibold">
                  {activeSupplier?.name ?? "Supplier"}
                </p>
              </div>
              <button
                type="button"
                className="flex size-9 items-center justify-center text-muted-foreground"
                aria-label="Close"
                onClick={() => setMobileOrderOpen(false)}
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
