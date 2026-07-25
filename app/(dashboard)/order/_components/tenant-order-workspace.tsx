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
        <p className="m-2.5 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] px-3 py-10 text-center text-[11px] text-muted-foreground">
          Tap products to build an order. Stock is shown on each tile.
        </p>
      ) : (
        cartLines.map(({ link, qty }) => {
          const cost = unitCost(link);
          const amount = lineTotal(link, qty);
          const thumb = posTileThumbUrl(link.itemName, link.thumbnailUrl);
          return (
            <div
              key={link.itemId}
              className="flex gap-2 border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2.5 py-2.5"
            >
              <div className="relative size-12 shrink-0 overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] sm:size-11">
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
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-[13px] font-semibold leading-snug sm:text-[12px]">
                  {link.itemName}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]">
                    <button
                      type="button"
                      className="flex size-9 items-center justify-center sm:size-7"
                      onClick={() => setQty(link.itemId, qty - 1)}
                    >
                      −
                    </button>
                    <span className="min-w-8 text-center font-mono text-[13px] sm:min-w-7 sm:text-[12px]">
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="flex size-9 items-center justify-center sm:size-7"
                      onClick={() => setQty(link.itemId, qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[13px] font-semibold tabular-nums sm:text-[12px]">
                      {cost > 0 ? formatMoney(amount, ORDER_CURRENCY) : "—"}
                    </p>
                    <p className="font-mono text-[9px] text-muted-foreground">
                      {cost > 0
                        ? `${qty} × ${formatMoney(cost, ORDER_CURRENCY)}`
                        : `${toNum(link.currentStock)} on hand`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </>
  );

  const placeFooter = (
    <div className="shrink-0 space-y-2 border-t-2 border-[var(--pos-ink,#1c1915)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] px-2.5 py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end justify-between gap-2 px-0.5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Total
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            {cartUnits} unit{cartUnits === 1 ? "" : "s"} · {cartLines.length}{" "}
            line{cartLines.length === 1 ? "" : "s"}
          </p>
        </div>
        <p className="font-mono text-[18px] font-bold tabular-nums text-[var(--pos-ink,#1c1915)]">
          {formatMoney(cartTotal, ORDER_CURRENCY)}
        </p>
      </div>
      <button
        type="button"
        disabled={placing || cartLines.length === 0}
        onClick={() => void placeOrder()}
        className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[var(--pos-primary,#0f766e)] px-4 text-sm font-semibold text-white disabled:opacity-50 sm:h-11"
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
      <p className="text-center text-[10px] text-muted-foreground">
        Creates a purchase order. Confirm on arrival to post as a supply.
      </p>
    </div>
  );

  return (
    <div
      className={cn(
        "relative flex w-full flex-col overflow-hidden",
        "h-[calc(100dvh-3.75rem)] min-h-[22rem] sm:h-[min(78dvh,56rem)] sm:min-h-[28rem]",
        "border-y border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] sm:border",
        "bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)]",
      )}
      style={{ ["--pos-primary" as string]: "#0f766e" }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2.5 py-2 sm:px-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Order
          </p>
          <h1 className="truncate text-[14px] font-semibold text-[var(--pos-ink,#1c1915)] sm:text-[15px]">
            {activeSupplier?.name ?? "Pick a supplier"}
          </h1>
        </div>
        <Link
          href={APP_ROUTES.orderReceive}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] sm:h-8"
        >
          <ClipboardList className="size-3" />
          Confirm
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Mobile supplier strip */}
        <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_78%,transparent)] lg:hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5"
            onClick={() => setSuppliersExpanded((v) => !v)}
            aria-expanded={suppliersExpanded}
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Suppliers
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
              {filteredSuppliers.length}
              <ChevronUp
                className={cn(
                  "size-3.5 transition-transform",
                  !suppliersExpanded && "rotate-180",
                )}
              />
            </span>
          </button>
          <div
            className={cn(
              "overflow-hidden transition-[max-height] duration-300",
              suppliersExpanded ? "max-h-40" : "max-h-[3.25rem]",
            )}
          >
            <div className="flex gap-1.5 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {loadingSuppliers ? (
                <p className="px-2 py-2 text-[11px] text-muted-foreground">
                  <Loader2 className="mr-1 inline size-3 animate-spin" />
                  Loading…
                </p>
              ) : (
                filteredSuppliers.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      selectSupplier(s.id);
                      setSuppliersExpanded(false);
                    }}
                    className={cn(
                      "shrink-0 border px-3 py-2 text-left text-[12px] font-semibold transition",
                      supplierId === s.id
                        ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,transparent)] text-[var(--pos-ink,#1c1915)]"
                        : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_90%,transparent)] text-muted-foreground",
                    )}
                  >
                    {s.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Desktop supplier rail */}
        <aside className="hidden h-full min-h-0 w-[13rem] shrink-0 flex-col overflow-hidden border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] lg:flex xl:w-[14.5rem]">
          <div className="flex h-8 shrink-0 items-center justify-between bg-[var(--pos-primary,#0f766e)] px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--pos-primary-ink,#fff)]">
            <span>Supplier</span>
            <span className="font-mono tabular-nums opacity-80">
              {filteredSuppliers.length}
            </span>
          </div>
          <div className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-8 w-full bg-transparent pl-7 pr-2 text-[12px] outline-none placeholder:text-muted-foreground/50"
              placeholder="Search suppliers…"
              value={supplierQuery}
              onChange={(e) => setSupplierQuery(e.target.value)}
            />
          </div>
          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1">
            {loadingSuppliers ? (
              <p className="px-2 py-4 text-center text-[11px] text-muted-foreground">
                <Loader2 className="mr-1 inline size-3 animate-spin" />
                Loading…
              </p>
            ) : filteredSuppliers.length === 0 ? (
              <p className="px-2 py-4 text-center text-[11px] text-muted-foreground">
                No active suppliers.
              </p>
            ) : (
              filteredSuppliers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSupplier(s.id)}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 border px-2 py-2 text-left transition",
                    supplierId === s.id
                      ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)]"
                      : "border-transparent hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]",
                  )}
                >
                  <span className="text-[12px] font-semibold leading-snug">
                    {s.name}
                  </span>
                </button>
              ))
            )}
          </nav>
        </aside>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-11 w-full bg-transparent pl-8 pr-3 text-[16px] outline-none placeholder:text-muted-foreground/50 sm:h-9 sm:text-[13px]"
              placeholder="Find a product…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              enterKeyHint="search"
            />
          </div>

          {activeParentLabel ? (
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)] px-2.5 py-1.5">
              <p className="min-w-0 truncate text-[11px] font-semibold text-[var(--pos-ink,#1c1915)]">
                <span className="mr-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--pos-primary,#0f766e)]">
                  Family
                </span>
                {activeParentLabel}
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
                onClick={() => setParentFilterId(null)}
              >
                <X className="size-3" />
                Clear
              </button>
            </div>
          ) : null}

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              className={cn(
                "h-full overflow-y-auto overscroll-contain px-1.5 pt-1.5 sm:px-2.5",
                "pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] lg:pb-24",
              )}
            >
              {!supplierId ? (
                <p className="py-12 text-center text-[12px] text-muted-foreground">
                  Select a supplier to see linked products and stock.
                </p>
              ) : loadingLinks ? (
                <p className="flex items-center justify-center gap-2 py-12 text-[12px] text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading catalogue…
                </p>
              ) : visibleLinks.length === 0 ? (
                <p className="py-12 text-center text-[12px] text-muted-foreground">
                  {parentFilterId
                    ? "No products in this family."
                    : "No linked products for this supplier."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
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
                    const amount = lineTotal(link, qty);
                    return (
                      <div
                        key={link.id}
                        className={cn(
                          "flex flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)]",
                          qty > 0 &&
                            "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,transparent)]",
                        )}
                      >
                        <button
                          type="button"
                          className="relative aspect-square w-full touch-manipulation border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)]"
                          onClick={() => setQty(link.itemId, qty + 1)}
                          aria-label={`Add ${link.itemName}`}
                        >
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 48vw, (max-width: 1024px) 22vw, 140px"
                              className="object-contain p-1"
                              unoptimized
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center">
                              <Package
                                className="size-6 opacity-40"
                                strokeWidth={1.5}
                              />
                            </span>
                          )}
                          {qty > 0 ? (
                            <span className="absolute left-0 top-0 z-[1] inline-flex h-6 min-w-6 items-center justify-center bg-[var(--pos-primary,#0f766e)] px-1 font-mono text-[11px] font-bold text-white sm:h-5 sm:min-w-5 sm:text-[10px]">
                              {qty}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              "absolute bottom-0 right-0 z-[1] px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
                              low
                                ? "bg-amber-600 text-white"
                                : "bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_78%,transparent)] text-white",
                            )}
                          >
                            {stock} in stock
                          </span>
                        </button>
                        <div className="flex flex-1 flex-col gap-1 px-1.5 py-1.5">
                          <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)]">
                            {link.itemName}
                          </p>
                          <div className="mt-auto flex items-center justify-between gap-1">
                            <div className="min-w-0">
                              <p className="font-mono text-[10px] font-semibold tabular-nums">
                                {cost > 0
                                  ? formatMoney(cost, ORDER_CURRENCY)
                                  : "Ask"}
                              </p>
                              {qty > 0 && cost > 0 ? (
                                <p className="font-mono text-[9px] tabular-nums text-muted-foreground">
                                  = {formatMoney(amount, ORDER_CURRENCY)}
                                </p>
                              ) : null}
                            </div>
                            {qty > 0 ? (
                              <div className="inline-flex items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]">
                                <button
                                  type="button"
                                  className="flex size-8 items-center justify-center text-[14px] touch-manipulation sm:size-6 sm:text-[12px]"
                                  onClick={() => setQty(link.itemId, qty - 1)}
                                >
                                  −
                                </button>
                                <span className="min-w-6 text-center font-mono text-[12px] sm:min-w-5 sm:text-[11px]">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  className="flex size-8 items-center justify-center text-[14px] touch-manipulation sm:size-6 sm:text-[12px]"
                                  onClick={() => setQty(link.itemId, qty + 1)}
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="min-h-8 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-2 text-[9px] font-semibold uppercase tracking-[0.08em] touch-manipulation"
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
              className="bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-0"
            />
          </div>
        </div>

        <aside className="hidden h-full w-[min(100%,20rem)] shrink-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] lg:flex xl:w-[22rem]">
          <div className="flex h-8 shrink-0 items-center justify-between border-b-2 border-[var(--pos-ink,#1c1915)] px-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
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

      {/* Mobile order ticket dock */}
      <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_78%,transparent)] pb-[env(safe-area-inset-bottom)] lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOrderOpen(true)}
          className="group relative flex w-full items-stretch overflow-hidden bg-[var(--pos-primary,#0f766e)] text-white transition active:brightness-95"
        >
          <span className="flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5 px-3 py-3 text-left">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-80">
              Order ticket
            </span>
            <span className="truncate text-[13px] font-semibold">
              {cartUnits === 0
                ? "Tap products to add lines"
                : `${cartUnits} unit${cartUnits === 1 ? "" : "s"} · ${cartLines.length} line${cartLines.length === 1 ? "" : "s"}`}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end justify-center gap-0.5 border-l border-white/20 px-3 py-3">
            <span className="font-mono text-[15px] font-bold tabular-nums leading-none">
              {formatMoney(cartTotal, ORDER_CURRENCY)}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-90">
              Open
              <ChevronUp className="size-3.5" />
            </span>
          </span>
        </button>
      </div>

      {mobileOrderOpen ? (
        <div className="absolute inset-0 z-40 flex flex-col lg:hidden">
          <button
            type="button"
            className="min-h-0 flex-1 bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_35%,transparent)] backdrop-blur-[2px]"
            aria-label="Dismiss order ticket"
            onClick={() => setMobileOrderOpen(false)}
          />
          <div className="relative flex max-h-[88%] min-h-[45%] flex-col border-t-2 border-[var(--pos-ink,#1c1915)] bg-[color-mix(in_srgb,#faf7f1_98%,transparent)] shadow-[0_-18px_40px_-20px_rgba(28,25,21,0.45)]">
            <div className="flex shrink-0 justify-center pb-1 pt-2">
              <span className="h-1 w-10 bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_22%,transparent)]" />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 px-3 pb-2">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Order list
                </p>
                <p className="truncate text-[14px] font-semibold">
                  {activeSupplier?.name ?? "Supplier"}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]"
                aria-label="Close order ticket"
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
