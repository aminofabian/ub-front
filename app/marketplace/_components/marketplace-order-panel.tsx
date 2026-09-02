"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Banknote,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  FileDown,
  List,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { kioskPlaceholderWashClass } from "@/components/cashier/kiosk-listing-styles";
import { TelLink } from "@/components/tel-link";
import { APP_ROUTES } from "@/lib/config";
import type { ItemLinkPackOfferRecord } from "@/lib/api";
import type {
  MarketplaceCatalogProductPreview,
  MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";
import {
  catalogEachFromPack,
  catalogFamilyAnchor,
  catalogFamilyId,
  catalogFamilyLetters,
  catalogPackLabel,
  catalogPackOptionById,
  catalogPackOptions,
  firstFamilyForLetter,
  groupCatalogProducts,
  type CatalogProductGroup,
} from "@/lib/marketplace-catalog-groups";
import {
  encodeOrderTicket,
  tenantOrderTicketPath,
} from "@/lib/order-ticket";
import {
  marketplacePassportProductPath,
  marketplaceSupplierOrderPath,
  marketplaceSupplierPath,
  parseMarketplaceOrderQuery,
  supplierPortalClaimPath,
} from "@/lib/marketplace-url";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { formatPaymentMethodLabel } from "@/lib/sale-payment-filter";
import { SupplyPackQtyModal } from "@/app/(dashboard)/supplies/_components/supply-pack-qty-modal";
import { WholesalePackStamp } from "@/components/pack/wholesale-pack-stamp";
import { cn, formatMoney } from "@/lib/utils";
import { useMarketplaceTemplate } from "@/hooks/use-marketplace-template";

import {
  buildMarketplaceCataloguePdf,
} from "../_lib/marketplace-catalogue-pdf";
import {
  buildMarketplaceCatalogueSheetPdf,
} from "../_lib/marketplace-catalogue-sheet-pdf";
import {
  buildMarketplaceCatalogueChalkPdf,
} from "../_lib/marketplace-catalogue-chalk-pdf";
import {
  buildMarketplaceOrderPdf,
  buildMarketplaceOrderText,
  buildWhatsAppOrderUrl,
  downloadBlob,
  normalizeWhatsAppPhone,
  shareOrDownloadOrderPdf,
} from "../_lib/marketplace-order-pdf";
import { mktBtnGhost } from "./marketplace-ui";
import { MarketplaceTemplatePicker } from "./marketplace-template-picker";

type CartQty = Record<string, number>;
/**
 * Buyer-opted pack choice — never auto-applied from the catalogue alone.
 * {@code packOptionId} is null for a custom (unsaved) pack from the qty modal.
 */
type CartPackSelection = {
  packOptionId: string | null;
  size: number;
  unit: string;
  /** Price for ONE pack; null when ask / custom. */
  price: number | null;
};
type CartPackMeta = Record<string, CartPackSelection>;
type OrderLayout = "default" | "shelf";
type PdfDownloadKind = "sheet" | "list" | "chalk" | "order";
type CatalogueStyleKind = "sheet" | "list" | "chalk";

function formatPackSize(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function pdfFilename(base: string, includePrices: boolean): string {
  return includePrices ? base : base.replace(/\.pdf$/i, "-no-prices.pdf");
}

const SHELF_TILE = cn(
  "group relative flex h-full flex-col overflow-hidden border",
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
  "bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] text-left",
  "transition-[border-color,background-color,box-shadow] duration-150",
  "hover:z-[1] hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_32%,transparent)] hover:bg-card",
  "hover:shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
);

const PARENT_RAIL_BASE = cn(
  "relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden border",
  "text-center text-[10px] font-semibold leading-tight transition touch-manipulation",
);

const PARENT_RAIL_HEADER = cn(
  "flex h-8 shrink-0 items-center justify-center",
  "bg-[var(--pos-primary,#0f766e)] px-1.5 text-center text-[10px] font-bold uppercase tracking-[0.14em]",
  "text-[var(--pos-primary-ink,#fff)]",
);

type ParentOption = {
  id: string | null;
  label: string;
  thumbnailUrl: string | null;
};

function parentRailClass(active: boolean, hasImage: boolean): string {
  if (hasImage) {
    return cn(
      PARENT_RAIL_BASE,
      "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_60%,transparent)]",
      active &&
        "border-[var(--pos-primary,#0f766e)] shadow-[inset_0_0_0_2px_var(--pos-primary,#0f766e)]",
    );
  }
  return active
    ? cn(
        PARENT_RAIL_BASE,
        "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] px-1 text-[var(--pos-primary-ink,#fff)]",
      )
    : cn(
        PARENT_RAIL_BASE,
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-1",
        "bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] text-[var(--pos-ink,#1c1915)]",
        "hover:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,var(--card))]",
      );
}

function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function isJunkLocation(value: string): boolean {
  return /^(optional|n\/a|na|none|-)$/i.test(value.trim());
}

/** Round money to the nearest 10 (e.g. 100.07 → 100, 106.56 → 110). */
function roundMoneyTo10(value: number): number {
  const rounded = Math.round(value / 10) * 10;
  return rounded > 0 ? rounded : value;
}

/** Effective price for one pack (or one unit when not packed). */
function packUnitPrice(
  product: MarketplaceCatalogProductPreview,
  pack: CartPackSelection | null,
): number | null {
  if (pack && pack.size > 1) {
    return pack.price ?? product.unitPrice ?? null;
  }
  return product.unitPrice ?? null;
}

function productLineTotal(
  product: MarketplaceCatalogProductPreview,
  qty: number,
  pack: CartPackSelection | null = null,
): number | null {
  const price = packUnitPrice(product, pack);
  return price == null ? null : price * qty;
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

function ProductImage({
  src,
  alt,
  hue,
  className,
  iconClassName = "size-5",
}: {
  src: string | null | undefined;
  alt: string;
  hue: number;
  className?: string;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src && !failed);

  return (
    <div
      className={cn("relative overflow-hidden bg-muted/40", className)}
      style={
        showImage
          ? undefined
          : {
              background: `linear-gradient(145deg, hsl(${hue} 18% 88%), hsl(${(hue + 28) % 360} 14% 78%))`,
            }
      }
    >
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          unoptimized
          className="object-contain p-2"
          sizes="(max-width: 640px) 50vw, 240px"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-foreground/60">
          <Package className={iconClassName} />
        </span>
      )}
    </div>
  );
}

function PackChoiceChip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "inline-flex h-6 min-w-7 items-center justify-center border px-1.5 font-mono text-[10px] font-bold tabular-nums transition",
        active
          ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]"
          : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] text-[var(--pos-ink,#1c1915)] hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]",
      )}
    >
      {children}
    </button>
  );
}

function QtyControl({
  qty,
  onChange,
  compact = false,
}: {
  qty: number;
  onChange: (qty: number) => void;
  compact?: boolean;
}) {
  if (qty <= 0) {
    return (
      <button
        type="button"
        className={cn(mktBtnGhost, compact ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-xs")}
        onClick={(e) => {
          e.stopPropagation();
          onChange(1);
        }}
      >
        <Plus className="size-3.5" />
        Add
      </button>
    );
  }
  return (
    <div
      className="inline-flex items-center border border-border"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={cn(
          "flex items-center justify-center hover:bg-muted",
          compact ? "size-8" : "size-9",
        )}
        onClick={() => onChange(qty - 1)}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" />
      </button>
      <span
        className={cn(
          "text-center text-sm font-semibold tabular-nums",
          compact ? "min-w-7" : "min-w-8",
        )}
      >
        {qty}
      </span>
      <button
        type="button"
        className={cn(
          "flex items-center justify-center hover:bg-muted",
          compact ? "size-8" : "size-9",
        )}
        onClick={() => onChange(qty + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function MarketplaceOrderWorkspace({
  detail,
  selectedProductSlug,
  orderQuery,
  roundOrderTo10,
  layout = "default",
  embedded = false,
  ownerMode = false,
}: {
  detail: MarketplaceSupplierDetail;
  selectedProductSlug?: string | null;
  /** Shareable cart encoded in the supplier page's `?o=` query parameter. */
  orderQuery?: string | null;
  /** Whether the shared order's grand total is rounded to the nearest 10. */
  roundOrderTo10?: boolean;
  layout?: OrderLayout;
  /** Fill parent height without outer border (e.g. nested in marketplace). */
  embedded?: boolean;
  /** Supplier portal preview — hide public “claim this stall” CTAs. */
  ownerMode?: boolean;
}) {
  const isShelf = layout === "shelf";
  const { effective: catalogTemplate, isLedger, setTemplate } =
    useMarketplaceTemplate();
  const catalogIsLedger = isShelf && isLedger;
  const focusProduct = useMemo(() => {
    if (!selectedProductSlug?.trim()) return null;
    const needle = selectedProductSlug.trim().toLowerCase();
    return (
      detail.products.find((p) => p.slug?.toLowerCase() === needle) ?? null
    );
  }, [detail.products, selectedProductSlug]);

  const selected = isShelf
    ? null
    : (focusProduct ?? detail.products[0] ?? null);

  const sharedOrder = useMemo(
    () => parseMarketplaceOrderQuery(orderQuery),
    [orderQuery],
  );
  const [cart, setCart] = useState<CartQty>(() => {
    if (isShelf && sharedOrder.length > 0) {
      return Object.fromEntries(
        sharedOrder.flatMap((line) => {
          const product = detail.products.find((p) => p.slug === line.slug);
          return product ? [[product.id, line.qty]] : [];
        }),
      );
    }
    if (isShelf && focusProduct) return { [focusProduct.id]: 1 };
    if (!isShelf && selected) return { [selected.id]: 1 };
    return {};
  });
  const [roundedLineIds, setRoundedLineIds] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      sharedOrder.flatMap((line) => {
        if (line.lineTotal == null) return [];
        const product = detail.products.find((p) => p.slug === line.slug);
        return product ? [[product.id, true]] : [];
      }),
    ),
  );
  /** Opt-in pack sizes for order lines (tap Package). Not applied by default. */
  const [packByProductId, setPackByProductId] = useState<CartPackMeta>(() => {
    // Rehydrate pack choices encoded in a shared `?o=` cart.
    const next: CartPackMeta = {};
    for (const line of sharedOrder) {
      if (!line.packOptionId) continue;
      const product = detail.products.find((p) => p.slug === line.slug);
      if (!product) continue;
      const option = catalogPackOptionById(product, line.packOptionId);
      if (!option) continue;
      next[product.id] = {
        packOptionId: option.id,
        size: option.unitsPerPack,
        unit: option.packUnit || "pack",
        price: option.unitPrice ?? product.unitPrice ?? null,
      };
    }
    return next;
  });
  const [packSheetProductId, setPackSheetProductId] = useState<string | null>(
    null,
  );
  const packSheetProduct = packSheetProductId
    ? detail.products.find((p) => p.id === packSheetProductId) ?? null
    : null;
  const [sendingOrder, setSendingOrder] = useState(false);
  const [catalogueBusy, setCatalogueBusy] = useState(false);
  const [pdfDownloadKind, setPdfDownloadKind] = useState<PdfDownloadKind | null>(null);
  const [catalogueStyleOpen, setCatalogueStyleOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [parentFilterId, setParentFilterId] = useState<string | null>(() => {
    if (!isShelf || !focusProduct) return null;
    return catalogFamilyId(focusProduct);
  });
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);
  /** Whole-order rounding remains available after optional per-line rounding. */
  const [roundTo10, setRoundTo10] = useState(
    roundOrderTo10 ?? !isShelf,
  );

  // Opening a product page starts a fresh order with only that product.
  // Related rows stay at Add (0) until the buyer chooses them.
  useEffect(() => {
    if (isShelf) return;
    setCart(selected ? { [selected.id]: 1 } : {});
  }, [selected, isShelf]);

  // Passport deep-link: select parent, seed cart, scroll product into view.
  useEffect(() => {
    if (!isShelf || !focusProduct) return;
    setParentFilterId(catalogFamilyId(focusProduct));
    setCart((prev) =>
      (prev[focusProduct.id] ?? 0) > 0 ? prev : { ...prev, [focusProduct.id]: 1 },
    );
    const timer = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(
          `[data-shelf-product="${CSS.escape(focusProduct.id)}"]`,
        )
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [isShelf, focusProduct]);

  const setQty = (productId: string, qty: number, announce = false) => {
    setCart((prev) => {
      const next = { ...prev };
      const prevQty = prev[productId] ?? 0;
      if (qty <= 0) {
        delete next[productId];
        setRoundedLineIds((rounded) => {
          if (!rounded[productId]) return rounded;
          const nextRounded = { ...rounded };
          delete nextRounded[productId];
          return nextRounded;
        });
        setPackByProductId((packs) => {
          if (!packs[productId]) return packs;
          const nextPacks = { ...packs };
          delete nextPacks[productId];
          return nextPacks;
        });
      }
      else next[productId] = qty;
      if (announce && prevQty === 0 && qty > 0) {
        queueMicrotask(() => toast.message("Added to order"));
      }
      return next;
    });
  };

  /**
   * Custom pack entry via the qty modal. Saved pack options are chosen with
   * {@link selectPack}; this path always yields an unsaved custom pack.
   */
  const togglePack = useCallback((productId: string) => {
    setPackSheetProductId(productId);
  }, []);

  const editPack = useCallback((productId: string) => {
    setPackSheetProductId(productId);
  }, []);

  /** Choose a saved pack option (or clear to unit mode) for an order line. */
  const selectPack = useCallback(
    (productId: string, packOptionId: string | null) => {
      setPackByProductId((prev) => {
        const product = detail.products.find((p) => p.id === productId);
        if (!product) return prev;
        if (packOptionId == null) {
          const next = { ...prev };
          delete next[productId];
          return next;
        }
        const option = catalogPackOptionById(product, packOptionId);
        if (!option) return prev;
        return {
          ...prev,
          [productId]: {
            packOptionId: option.id,
            size: option.unitsPerPack,
            unit: option.packUnit || "pack",
            // Prefer the pack's own price; fall back to catalogue unit so
            // line totals never show "Ask" when the shelf already lists a price.
            price: option.unitPrice ?? product.unitPrice ?? null,
          },
        };
      });
    },
    [detail.products],
  );

  const toggleLineRounding = (productId: string) => {
    setRoundedLineIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const cartLines = useMemo(
    () =>
      detail.products
        .filter((p) => (cart[p.id] ?? 0) > 0)
        .map((p) => ({
          product: p,
          qty: cart[p.id] ?? 0,
          pack: packByProductId[p.id] ?? null,
          packOptedIn: Boolean(packByProductId[p.id]),
        })),
    [cart, detail.products, packByProductId],
  );

  const cartUnits = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.qty, 0),
    [cartLines],
  );

  const rawCartTotal = useMemo(
    () =>
      cartLines.reduce((sum, line) => {
        const total = productLineTotal(line.product, line.qty, line.pack);
        return total == null ? sum : sum + total;
      }, 0),
    [cartLines],
  );

  const cartTotal = useMemo(
    () =>
      cartLines.reduce((sum, line) => {
        const total = productLineTotal(line.product, line.qty, line.pack);
        if (total == null) return sum;
        return (
          sum +
          (roundedLineIds[line.product.id] ? roundMoneyTo10(total) : total)
        );
      }, 0),
    [cartLines, roundedLineIds],
  );

  const roundedTotal = roundMoneyTo10(cartTotal);
  const effectiveTotal = roundTo10 ? roundedTotal : cartTotal;
  const roundingActive =
    effectiveTotal !== rawCartTotal ||
    Object.keys(roundedLineIds).some((id) => roundedLineIds[id]);

  const cartCurrency =
    cartLines.find((l) => l.product.currency)?.product.currency ?? "KES";

  const otherProducts = detail.products.filter((p) => p.id !== selected?.id);
  const supplierHref = detail.slug
    ? APP_ROUTES.marketplaceSupplier(detail.slug)
    : APP_ROUTES.marketplace;

  const areaLabel = [detail.location, ...detail.locations]
    .map((l) => l?.trim())
    .filter((l): l is string => typeof l === "string" && l.length > 0 && !isJunkLocation(l))
    .filter((l, i, arr) => arr.indexOf(l) === i)
    .join(" · ");

  // Location already shown under the product title — don't repeat in contact.
  const showAreaInContact = !selected;

  const catalogFamilies = useMemo(
    () => groupCatalogProducts(detail.products),
    [detail.products],
  );

  const parentOptions = useMemo((): ParentOption[] => {
    return [
      { id: null, label: "All", thumbnailUrl: null },
      ...catalogFamilies.map((family) => ({
        id: family.id,
        label: family.label,
        thumbnailUrl: family.thumbnailUrl,
      })),
    ];
  }, [catalogFamilies]);

  const showParentRail = parentOptions.length > 2;

  useEffect(() => {
    if (
      parentFilterId &&
      !parentOptions.some((p) => p.id === parentFilterId)
    ) {
      setParentFilterId(null);
    }
  }, [parentFilterId, parentOptions]);

  const shelfSections = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const matches = (p: MarketplaceCatalogProductPreview) => {
      if (!q) return true;
      const hay = [
        p.name,
        p.sku,
        p.barcode,
        p.categoryName,
        p.parentItemName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    };
    const source = parentFilterId
      ? catalogFamilies.filter((family) => family.id === parentFilterId)
      : catalogFamilies;
    return source
      .map((family) => ({
        ...family,
        items: family.items.filter(matches),
      }))
      .filter((family) => family.items.length > 0);
  }, [catalogFamilies, filter, parentFilterId]);

  const shelfProductCount = shelfSections.reduce(
    (n, family) => n + family.items.length,
    0,
  );
  const showFamilyHeadings = !parentFilterId && shelfSections.length > 1;
  /** One product per family → section stack looks like a single column; flatten to a dense grid. */
  const flattenSingletonFamilies =
    showFamilyHeadings &&
    shelfSections.every((family) => family.items.length === 1);
  const familyLetters =
    showFamilyHeadings && !flattenSingletonFamilies
      ? catalogFamilyLetters(shelfSections)
      : [];

  const jumpToFamilyLetter = (letter: string) => {
    const family = firstFamilyForLetter(shelfSections, letter);
    if (!family) return;
    document
      .getElementById(catalogFamilyAnchor(family.id))
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const activeParentLabel = parentFilterId
    ? parentOptions.find((p) => p.id === parentFilterId)?.label ?? "Catalogue"
    : "Catalogue";

  const orderLines = useMemo(
    () =>
      cartLines.map(({ product, qty, pack }) => {
        const raw = productLineTotal(product, qty, pack);
        return {
          name:
            pack != null
              ? `${product.name} (pack of ${pack.size})`
              : product.name,
          sku: product.sku,
          barcode: product.barcode,
          qty,
          unitPrice: packUnitPrice(product, pack),
          currency: product.currency,
          totalOverride:
            roundedLineIds[product.id] && raw != null ? roundMoneyTo10(raw) : undefined,
        };
      }),
    [cartLines, roundedLineIds],
  );

  const shareableOrderPath = useMemo(
    () =>
      marketplaceSupplierOrderPath(
        detail,
        cartLines.flatMap(({ product, qty, pack }) => {
          if (!product.slug) return [];
          const rawTotal = productLineTotal(product, qty, pack);
          return [
            {
              slug: product.slug,
              qty,
              lineTotal:
                roundedLineIds[product.id] && rawTotal != null
                  ? roundMoneyTo10(rawTotal)
                  : undefined,
              packOptionId: pack?.packOptionId ?? undefined,
            },
          ];
        }),
        null,
        roundTo10,
      ),
    [cartLines, detail, roundedLineIds, roundTo10],
  );

  /** Bridge into tenant /order using SKU-first keys so shops can import the ticket. */
  const tenantOrderBridgePath = useMemo(
    () =>
      tenantOrderTicketPath({
        ticket: encodeOrderTicket(
          cartLines.flatMap(({ product, qty, pack }) => {
            const key =
              product.sku?.trim() ||
              product.barcode?.trim() ||
              product.slug?.trim();
            if (!key || qty <= 0) return [];
            const rawTotal = productLineTotal(product, qty, pack);
            return [
              {
                slug: key,
                qty,
                lineTotal:
                  roundedLineIds[product.id] && rawTotal != null
                    ? roundMoneyTo10(rawTotal)
                    : undefined,
                packOptionId: pack?.packOptionId ?? undefined,
              },
            ];
          }),
        ),
        marketplaceSupplierId: detail.id,
        roundTo10,
      }),
    [cartLines, detail.id, roundedLineIds, roundTo10],
  );

  const orderFilename = `order-${detail.name.replace(/\s+/g, "-").toLowerCase().slice(0, 40)}.pdf`;
  const catalogueFilename = `catalogue-${detail.name.replace(/\s+/g, "-").toLowerCase().slice(0, 40)}.pdf`;
  const catalogueSheetFilename = `catalogue-sheet-${detail.name.replace(/\s+/g, "-").toLowerCase().slice(0, 40)}.pdf`;
  const catalogueChalkFilename = `catalogue-stall-${detail.name.replace(/\s+/g, "-").toLowerCase().slice(0, 40)}.pdf`;

  /** Absolute supplier URL with the current cart in the `?o=` query parameter. */
  const orderUrl = () =>
    typeof window === "undefined"
      ? shareableOrderPath
      : `${window.location.origin}${shareableOrderPath}`;

  /** Short supplier passport link for WhatsApp — order lines are already in the message. */
  const cataloguePageUrl = () => {
    const path = marketplaceSupplierPath(detail);
    return typeof window === "undefined"
      ? path
      : `${window.location.origin}${path}`;
  };

  const orderPdfInput = (includePrices = true) => ({
    supplierName: detail.name,
    supplierPhone: detail.contactPhone,
    location: areaLabel || detail.location,
    listedBy: detail.listedBy,
    lines: orderLines,
    includePrices,
    totalOverride: roundingActive ? effectiveTotal : undefined,
  });

  const downloadCatalogueList = async (includePrices: boolean) => {
    if (detail.products.length === 0) {
      toast.error("No products in this catalogue yet.");
      return;
    }
    setCatalogueBusy(true);
    try {
      const blob = await buildMarketplaceCataloguePdf({
        detail,
        origin: typeof window === "undefined" ? undefined : window.location.origin,
        includePrices,
      });
      downloadBlob(blob, pdfFilename(catalogueFilename, includePrices));
      toast.success(
        includePrices ? "Price list downloaded." : "Catalogue downloaded without prices.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not build catalogue",
      );
    } finally {
      setCatalogueBusy(false);
    }
  };

  const downloadCatalogueSheet = async (includePrices: boolean) => {
    if (detail.products.length === 0) {
      toast.error("No products in this catalogue yet.");
      return;
    }
    setCatalogueBusy(true);
    try {
      const blob = await buildMarketplaceCatalogueSheetPdf({
        detail,
        origin: typeof window === "undefined" ? undefined : window.location.origin,
        includePrices,
      });
      downloadBlob(blob, pdfFilename(catalogueSheetFilename, includePrices));
      toast.success(
        includePrices
          ? "Catalogue sheet downloaded."
          : "Catalogue sheet downloaded without prices.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not build catalogue",
      );
    } finally {
      setCatalogueBusy(false);
    }
  };

  const downloadCatalogueChalk = async (includePrices: boolean) => {
    if (detail.products.length === 0) {
      toast.error("No products in this catalogue yet.");
      return;
    }
    setCatalogueBusy(true);
    try {
      const blob = await buildMarketplaceCatalogueChalkPdf({
        detail,
        origin: typeof window === "undefined" ? undefined : window.location.origin,
        includePrices,
      });
      downloadBlob(blob, pdfFilename(catalogueChalkFilename, includePrices));
      toast.success(
        includePrices
          ? "Stall catalogue downloaded."
          : "Stall catalogue downloaded without prices.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not build catalogue",
      );
    } finally {
      setCatalogueBusy(false);
    }
  };

  const requestPdfDownload = (kind: PdfDownloadKind) => {
    if (kind === "order") {
      if (cartLines.length === 0) {
        toast.error("Add at least one product to the order.");
        return;
      }
    } else if (detail.products.length === 0) {
      toast.error("No products in this catalogue yet.");
      return;
    }
    setPdfDownloadKind(kind);
  };

  const requestCatalogueDownload = () => {
    if (detail.products.length === 0) {
      toast.error("No products in this catalogue yet.");
      return;
    }
    setCatalogueStyleOpen(true);
  };

  const pickCatalogueStyle = (kind: CatalogueStyleKind) => {
    setCatalogueStyleOpen(false);
    setPdfDownloadKind(kind);
  };

  const confirmPdfDownload = (includePrices: boolean) => {
    const kind = pdfDownloadKind;
    setPdfDownloadKind(null);
    if (!kind) return;
    if (kind === "sheet") void downloadCatalogueSheet(includePrices);
    else if (kind === "list") void downloadCatalogueList(includePrices);
    else if (kind === "chalk") void downloadCatalogueChalk(includePrices);
    else void downloadOrderPdf(includePrices);
  };

  /** Primary action: opens WhatsApp with the order list (incl. catalogue link). */
  const sendOrder = async () => {
    if (cartLines.length === 0) {
      toast.error("Add at least one product to the order.");
      return;
    }
    setSendingOrder(true);
    try {
      const wa = buildWhatsAppOrderUrl({
        phone: detail.contactPhone,
        supplierName: detail.name,
        lines: orderLines,
        filename: orderFilename,
        catalogueUrl: cataloguePageUrl(),
        totalOverride: roundingActive ? effectiveTotal : undefined,
      });
      if (wa) {
        window.open(wa, "_blank", "noopener,noreferrer");
        toast.success("WhatsApp opened with your order list.");
        return;
      }
      const blob = buildMarketplaceOrderPdf(orderPdfInput());
      const mode = await shareOrDownloadOrderPdf(blob, orderFilename, null);
      toast.message(
        mode === "shared"
          ? "Order shared — pick WhatsApp to send it."
          : "No WhatsApp number on this supplier — PDF downloaded, attach it in WhatsApp.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not build order",
      );
    } finally {
      setSendingOrder(false);
    }
  };

  const downloadOrderPdf = async (includePrices: boolean) => {
    if (cartLines.length === 0) {
      toast.error("Add at least one product to the order.");
      return;
    }
    setSendingOrder(true);
    try {
      downloadBlob(
        buildMarketplaceOrderPdf(orderPdfInput(includePrices)),
        pdfFilename(orderFilename, includePrices),
      );
      toast.success(
        includePrices ? "Order PDF downloaded." : "Order PDF downloaded without prices.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not build order PDF",
      );
    } finally {
      setSendingOrder(false);
    }
  };

  const copyOrderList = async () => {
    if (orderLines.length === 0) {
      toast.error("Add at least one product to the order.");
      return;
    }
    await copyText(
      buildMarketplaceOrderText(orderLines, {
        supplierName: detail.name,
        filename: orderFilename,
        catalogueUrl: cataloguePageUrl(),
        totalOverride: roundingActive ? effectiveTotal : undefined,
      }),
      "Order list",
    );
  };

  const copyOrderLink = async () => {
    if (cartLines.length === 0) {
      toast.error("Add at least one product to the order.");
      return;
    }
    await copyText(orderUrl(), "Order link");
  };

  const orderActions = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <ShoppingCart className="size-3.5" />
          {cartUnits === 0
            ? "Empty"
            : `${cartUnits} unit${cartUnits === 1 ? "" : "s"} · ${cartLines.length} line${cartLines.length === 1 ? "" : "s"}`}
        </span>
        <span className="flex flex-col items-end gap-0.5">
          <span
            className={cn(
              "font-semibold tabular-nums",
              isShelf ? "font-mono text-[1.05rem]" : "font-heading text-lg",
            )}
          >
            {formatMoney(effectiveTotal, cartCurrency)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRoundTo10((v) => !v)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[9px] font-semibold transition",
                roundTo10
                  ? "border-[color-mix(in_srgb,#128c4a_40%,transparent)] bg-[color-mix(in_srgb,#128c4a_10%,transparent)] text-[#0f7a3f]"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={roundTo10}
              title="Round the order total to the nearest 10"
            >
              {roundTo10 ? "Round to 10 · on" : "Round to 10 · off"}
            </button>
            {roundingActive ? (
              <span className="text-[9px] text-muted-foreground">
                from {formatMoney(rawCartTotal, cartCurrency)}
              </span>
            ) : null}
          </span>
        </span>
      </div>
      <button
        type="button"
        className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#128c4a] px-4 text-sm font-semibold text-white transition hover:bg-[#0f7a3f] disabled:pointer-events-none disabled:opacity-50"
        disabled={sendingOrder || cartLines.length === 0}
        onClick={() => void sendOrder()}
      >
        {sendingOrder ? (
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
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-1.5 border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          disabled={sendingOrder || cartLines.length === 0}
          onClick={() => requestPdfDownload("order")}
        >
          <FileDown className="size-3.5" />
          Download PDF
        </button>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-1.5 border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          disabled={sendingOrder || cartLines.length === 0}
          onClick={() => void copyOrderList()}
        >
          <Copy className="size-3.5" />
          Copy list
        </button>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        WhatsApp opens with your order list; the PDF is saved for attachment.
      </p>
    </div>
  );

  const orderFooter = (
    <div
      className={cn(
        "sticky bottom-0 space-y-2 border p-3 sm:p-4",
        isShelf
          ? "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,#faf8f4_94%,transparent)]"
          : "border-border/60 bg-card",
      )}
    >
      {orderActions}
    </div>
  );

  const pdfDownloadDialog = (
    <>
      <CatalogueStyleDialog
        open={catalogueStyleOpen}
        onOpenChange={setCatalogueStyleOpen}
        onPick={pickCatalogueStyle}
      />
      <PdfPriceFilterDialog
        kind={pdfDownloadKind}
        onOpenChange={(open) => {
          if (!open) setPdfDownloadKind(null);
        }}
        onConfirm={confirmPdfDownload}
      />
    </>
  );

  const packQtyModal = (
    <SupplyPackQtyModal
      open={packSheetProduct != null}
      onOpenChange={(open) => {
        if (!open) setPackSheetProductId(null);
      }}
      defaults={
        packSheetProduct
          ? {
              productLabel: packSheetProduct.name,
              packSize:
                packByProductId[packSheetProduct.id]?.size ??
                packSheetProduct.packSize,
              packUnit:
                packByProductId[packSheetProduct.id]?.unit ??
                packSheetProduct.packUnit ??
                "pack",
            }
          : null
      }
      initialUnitsPerPack={
        packSheetProduct
          ? packByProductId[packSheetProduct.id]?.size ?? null
          : null
      }
      savedOptions={
        packSheetProduct
          ? (catalogPackOptions(packSheetProduct) as ItemLinkPackOfferRecord[])
          : null
      }
      onApply={(result) => {
        if (!packSheetProduct) return;
        const id = packSheetProduct.id;
        setPackByProductId((prev) => ({
          ...prev,
          [id]: {
            packOptionId: result.packOptionId ?? null,
            size: result.unitsPerPack,
            unit: result.packUnit || "pack",
            price:
              result.packPrice ??
              packSheetProduct.unitPrice ??
              null,
          },
        }));
        if ((cart[id] ?? 0) <= 0) {
          setQty(id, result.packCount > 0 ? result.packCount : 1, true);
        } else if (result.packCount > 0) {
          setQty(id, result.packCount);
        }
        setPackSheetProductId(null);
      }}
    />
  );

  if (isShelf) {
    const primaryContact =
      detail.contacts.find((c) => c.primaryContact) ?? detail.contacts[0];
    const shelfPhone =
      primaryContact?.phone?.trim() || detail.contactPhone?.trim() || null;
    const shelfWa = shelfPhone ? normalizeWhatsAppPhone(shelfPhone) : null;

    return (
      <div
        className={cn(
          "relative flex w-full flex-col overflow-hidden",
          embedded
            ? "h-full min-h-0 bg-transparent"
            : "h-[min(78dvh,56rem)] border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-1 items-stretch overflow-hidden">
          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:border-r lg:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]">
            <section className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2.5 py-2 sm:px-3">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary,#0f766e)]"
              />
              {!embedded ? (
                <div className="flex items-start justify-between gap-2 pl-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold leading-tight text-[var(--pos-ink,#1c1915)]">
                      {detail.name}
                    </h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                      {areaLabel ? (
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="size-3 shrink-0" />
                          {areaLabel}
                        </span>
                      ) : null}
                      {detail.listedBy ? (
                        <span className="truncate">
                          {areaLabel ? "· " : ""}Listed by {detail.listedBy}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {shelfPhone ? (
                      <div className="flex flex-col items-end gap-0.5 text-right">
                        <TelLink
                          phone={shelfPhone}
                          className="font-mono text-[12px] font-semibold tabular-nums text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
                        />
                        {shelfWa ? (
                          <a
                            href={`https://wa.me/${shelfWa}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          >
                            <MessageCircle className="size-3" />
                            WhatsApp
                          </a>
                        ) : null}
                        {!ownerMode && shelfPhone ? (
                          <Link
                            href={supplierPortalClaimPath(shelfPhone)}
                            className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          >
                            This is your stall?
                          </Link>
                        ) : ownerMode ? (
                          <span className="text-[10px] font-medium text-muted-foreground">
                            Your public shelf
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={requestCatalogueDownload}
                      disabled={catalogueBusy || detail.products.length === 0}
                      className={cn(
                        "inline-flex h-7 shrink-0 items-center gap-1.5 border px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                        "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,transparent)]",
                        "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)]",
                        "text-[var(--pos-ink,#1c1915)] disabled:pointer-events-none disabled:opacity-50",
                      )}
                    >
                      {catalogueBusy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <BookOpen className="size-3.5" />
                      )}
                      Catalogue PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 pl-2">
                  <p className="min-w-0 truncate text-[13px] font-semibold text-[var(--pos-ink,#1c1915)]">
                    {detail.name}
                    <span className="ml-2 font-mono text-[10px] font-medium tabular-nums text-muted-foreground">
                      {detail.products.length}
                    </span>
                  </p>
                  {shelfPhone ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <TelLink
                        phone={shelfPhone}
                        className="font-mono text-[11px] font-semibold tabular-nums text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
                      />
                      {shelfWa ? (
                        <a
                          href={`https://wa.me/${shelfWa}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        >
                          <MessageCircle className="size-3" />
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <div className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-8 w-full rounded-none border-0 bg-transparent pl-8 pr-3 text-[13px] shadow-none outline-none placeholder:text-muted-foreground/50"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Find a product…"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1.5 pb-3 sm:px-2.5">
              <div className="sticky top-0 z-[2] -mx-1.5 flex flex-col gap-1.5 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[#faf8f4] px-1.5 py-1.5 sm:-mx-2.5 sm:px-2.5">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <h3 className="flex min-w-0 items-baseline gap-2 text-[13px] font-semibold leading-none text-[var(--pos-ink,#1c1915)]">
                    {catalogIsLedger ? "Ledger" : activeParentLabel}
                    <span className="font-mono text-[10px] font-medium tabular-nums tracking-normal text-muted-foreground">
                      {showFamilyHeadings
                        ? `${shelfSections.length} families · ${shelfProductCount}`
                        : shelfProductCount}
                    </span>
                  </h3>
                  <MarketplaceTemplatePicker
                    value={catalogTemplate}
                    onChange={setTemplate}
                  />
                </div>
                {familyLetters.length > 1 ? (
                  <div
                    role="navigation"
                    aria-label="Jump to letter"
                    className="flex gap-0.5 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {familyLetters.map((letter) => (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => jumpToFamilyLetter(letter)}
                        className={cn(
                          "flex h-8 w-7 shrink-0 items-center justify-center text-[11px] font-semibold",
                          "text-[var(--pos-ink,#1c1915)]",
                          "hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)]",
                        )}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {shelfProductCount === 0 ? (
                <div className="mt-2 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] py-10 text-center text-[11px] text-muted-foreground">
                  {detail.products.length === 0
                    ? "No linked products yet."
                    : parentFilterId
                      ? "No packs in this family."
                      : "No products match your search."}
                </div>
              ) : catalogIsLedger ? (
                <ShelfProductLedger
                  sections={shelfSections}
                  flatten={flattenSingletonFamilies}
                  showFamilyHeadings={showFamilyHeadings}
                  supplierSlug={detail.slug}
                  cart={cart}
                  packByProductId={packByProductId}
                  focusProductId={focusProduct?.id ?? null}
                  onAdd={(productId) =>
                    setQty(productId, (cart[productId] ?? 0) + 1, true)
                  }
                  onSetQty={(productId, qty) => setQty(productId, qty)}
                />
              ) : flattenSingletonFamilies ? (
                <div className="mt-1.5 grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {shelfSections.map((family) => {
                    const product = family.items[0]!;
                    return (
                      <ShelfProductTile
                        key={product.id}
                        product={product}
                        displayName={product.name}
                        supplierSlug={detail.slug}
                        qty={cart[product.id] ?? 0}
                        pack={packByProductId[product.id] ?? null}
                        focused={focusProduct?.id === product.id}
                        onAdd={() =>
                          setQty(product.id, (cart[product.id] ?? 0) + 1, true)
                        }
                        onSetQty={(qty) => setQty(product.id, qty)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="mt-1.5 space-y-3">
                  {shelfSections.map((family) => (
                    <section
                      key={family.id}
                      id={catalogFamilyAnchor(family.id)}
                      className="scroll-mt-14"
                    >
                      {showFamilyHeadings ? (
                        <header className="mb-1 flex items-baseline justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] pb-1">
                          <h4 className="text-[12px] font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
                            {family.label}
                          </h4>
                          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                            {family.items.length}
                          </span>
                        </header>
                      ) : null}
                      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {family.items.map((product) => (
                          <ShelfProductTile
                            key={product.id}
                            product={product}
                            displayName={catalogPackLabel(product, family.label)}
                            supplierSlug={detail.slug}
                            qty={cart[product.id] ?? 0}
                            pack={packByProductId[product.id] ?? null}
                            focused={focusProduct?.id === product.id}
                            onAdd={() =>
                              setQty(product.id, (cart[product.id] ?? 0) + 1, true)
                            }
                            onSetQty={(qty) => setQty(product.id, qty)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showParentRail ? (
            <aside className="hidden h-full min-h-0 w-[6.5rem] shrink-0 flex-col overflow-hidden border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] lg:flex xl:w-[7.25rem]">
              <div className={PARENT_RAIL_HEADER}>A–Z</div>
              <ParentRail
                options={parentOptions}
                activeId={parentFilterId}
                onSelect={setParentFilterId}
                orientation="vertical"
                className="min-h-0 flex-1 overflow-hidden"
              />
            </aside>
          ) : null}

          <div className="hidden h-full min-h-0 w-[min(100%,20rem)] shrink-0 overflow-hidden lg:flex xl:w-[22rem]">
            <OrderManifestPanel
              supplierName={detail.name}
              claimPhone={ownerMode ? null : shelfPhone}
              lines={cartLines}
              currency={cartCurrency}
              total={effectiveTotal}
              rawTotal={rawCartTotal}
              roundedLineIds={roundedLineIds}
              roundTo10={roundTo10}
              orderHref={shareableOrderPath}
              shopOrderHref={tenantOrderBridgePath}
              sending={sendingOrder}
              catalogueBusy={catalogueBusy}
              onSetQty={(productId, qty) => setQty(productId, qty)}
              onRemove={(productId) => setQty(productId, 0)}
              onToggleLineRounding={toggleLineRounding}
              onToggleOrderRounding={() => setRoundTo10((value) => !value)}
              onSend={() => void sendOrder()}
              onDownloadPdf={() => requestPdfDownload("order")}
              onCopy={() => void copyOrderList()}
              onCopyOrderLink={() => void copyOrderLink()}
              onCatalogue={requestCatalogueDownload}
              onTogglePack={togglePack}
              onEditPack={editPack}
              onSelectPack={selectPack}
            />
          </div>
        </div>

        {/* Mobile / tablet: thumb-zone parent stamps + order ticket dock */}
        <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_78%,transparent)] pb-[env(safe-area-inset-bottom)] lg:hidden">
          {showParentRail ? (
            <div className="border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]">
              <div className="flex items-center justify-between px-2.5 pt-1.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  A–Z
                </p>
                <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                  {parentOptions.length - 1}
                </span>
              </div>
              <ParentRail
                options={parentOptions}
                activeId={parentFilterId}
                onSelect={setParentFilterId}
                orientation="horizontal"
                className="min-w-0"
                tileClassName="size-[3rem]"
              />
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setMobileOrderOpen(true)}
            className={cn(
              "group relative flex w-full items-stretch overflow-hidden",
              "bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]",
              "transition active:brightness-95",
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1.5 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 8px 0, transparent 5px, currentColor 5.5px)",
                backgroundSize: "16px 8px",
                backgroundRepeat: "repeat-x",
                color: "color-mix(in srgb, #f7f3eb 70%, transparent)",
              }}
            />
            <span className="flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5 px-3 py-2.5 text-left">
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-80">
                Order ticket
              </span>
              <span className="truncate text-[13px] font-semibold">
                {cartUnits === 0
                  ? "Tap products to add lines"
                  : `${cartUnits} unit${cartUnits === 1 ? "" : "s"} · ${cartLines.length} line${cartLines.length === 1 ? "" : "s"}`}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end justify-center gap-0.5 border-l border-white/20 px-3 py-2.5">
              <span className="font-mono text-[15px] font-bold tabular-nums leading-none">
                {formatMoney(effectiveTotal, cartCurrency)}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-90">
                Open
                <ChevronUp className="size-3.5 transition group-active:-translate-y-0.5" />
              </span>
            </span>
          </button>
        </div>

        {mobileOrderOpen ? (
          <div className="absolute inset-0 z-40 flex flex-col lg:hidden">
            <button
              type="button"
              className="min-h-0 flex-1 bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_35%,transparent)] backdrop-blur-[2px] transition-opacity"
              aria-label="Dismiss order ticket"
              onClick={() => setMobileOrderOpen(false)}
            />
            <div
              className={cn(
                "relative flex max-h-[88%] min-h-[50%] flex-col",
                "animate-in slide-in-from-bottom duration-300",
                "border-t-2 border-[var(--pos-ink,#1c1915)]",
                "bg-[color-mix(in_srgb,#faf7f1_98%,transparent)] shadow-[0_-18px_40px_-20px_rgba(28,25,21,0.45)]",
              )}
            >
              <div className="flex shrink-0 justify-center pb-1 pt-2">
                <span className="h-1 w-10 bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_22%,transparent)]" />
              </div>
              <OrderManifestPanel
                supplierName={detail.name}
                claimPhone={ownerMode ? null : shelfPhone}
                lines={cartLines}
                currency={cartCurrency}
                total={effectiveTotal}
                rawTotal={rawCartTotal}
                roundedLineIds={roundedLineIds}
                roundTo10={roundTo10}
                orderHref={shareableOrderPath}
                shopOrderHref={tenantOrderBridgePath}
                sending={sendingOrder}
                catalogueBusy={catalogueBusy}
                onSetQty={(productId, qty) => setQty(productId, qty)}
                onRemove={(productId) => setQty(productId, 0)}
                onToggleLineRounding={toggleLineRounding}
                onToggleOrderRounding={() => setRoundTo10((value) => !value)}
                onSend={() => void sendOrder()}
                onDownloadPdf={() => requestPdfDownload("order")}
                onCopy={() => void copyOrderList()}
                onCopyOrderLink={() => void copyOrderLink()}
                onCatalogue={requestCatalogueDownload}
                onTogglePack={togglePack}
                onEditPack={editPack}
                onSelectPack={selectPack}
                onClose={() => setMobileOrderOpen(false)}
                className="min-h-0 flex-1 border-0"
              />
            </div>
          </div>
        ) : null}
        {pdfDownloadDialog}
        {packQtyModal}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-3 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <Link
          href={APP_ROUTES.marketplace}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Marketplace
        </Link>
        <p className="text-xs text-muted-foreground">
          {detail.name}
          {detail.products.length ? ` · ${detail.products.length} products` : ""}
        </p>
      </div>

      {selected ? (
        <section className="border border-border/55 bg-muted/10 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
            <ProductImage
              src={selected.imageUrl}
              alt={selected.name}
              hue={hueFromId(selected.id)}
              className="aspect-square border border-border/50"
              iconClassName="size-6 opacity-50"
            />
            <div className="min-w-0">
              {selected.categoryName ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {selected.categoryName}
                </p>
              ) : null}
              <h1 className="font-heading text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
                {selected.name}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                <Link href={supplierHref} className="underline underline-offset-2">
                  {detail.name}
                </Link>
                {areaLabel ? ` · ${areaLabel}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {(() => {
                  const selectedPack = packByProductId[selected.id] ?? null;
                  const packs = catalogPackOptions(selected);
                  const price = selectedPack?.price ?? selected.unitPrice;
                  return (
                    <div>
                      <p className="font-heading text-xl font-semibold tabular-nums sm:text-2xl">
                        {price != null
                          ? formatMoney(price, selected.currency ?? "KES")
                          : "Ask price"}
                      </p>
                      {selectedPack != null && selectedPack.price != null ? (
                        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                          {formatMoney(selectedPack.price, selected.currency ?? "KES")}{" "}
                          per {selectedPack.unit} ·{" "}
                          {formatMoney(
                            Math.round((selectedPack.price / selectedPack.size) * 100) / 100,
                            selected.currency ?? "KES",
                          )}{" "}
                          each
                        </p>
                      ) : null}
                      {packs.length > 0 ? (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <PackChoiceChip
                            active={selectedPack == null}
                            onClick={() => selectPack(selected.id, null)}
                            title="Buy loose units"
                          >
                            Unit
                          </PackChoiceChip>
                          {packs.map((option) => (
                            <PackChoiceChip
                              key={option.id}
                              active={selectedPack?.packOptionId === option.id}
                              onClick={() => selectPack(selected.id, option.id)}
                              title={
                                option.unitPrice != null
                                  ? `${formatMoney(option.unitPrice, selected.currency ?? "KES")} per ${option.packUnit || "pack"}`
                                  : `Pack of ${formatPackSize(option.unitsPerPack)}`
                              }
                            >
                              ×{formatPackSize(option.unitsPerPack)}
                            </PackChoiceChip>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
                <QtyControl
                  qty={cart[selected.id] ?? 0}
                  onChange={(qty) => setQty(selected.id, qty, true)}
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="border border-border/55 bg-muted/10 p-4">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {detail.name}
          </h1>
          {areaLabel ? (
            <p className="mt-1.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {areaLabel}
            </p>
          ) : null}
          {detail.description ? (
            <p className="mt-2 text-sm text-muted-foreground">{detail.description}</p>
          ) : null}
        </section>
      )}

      <SupplierContactSection
        detail={detail}
        areaLabel={showAreaInContact ? areaLabel : ""}
      />

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            {selected ? `More from ${detail.name}` : `Products from ${detail.name}`}
          </h2>
          <span className="text-xs text-muted-foreground">
            {(selected ? otherProducts : detail.products).length}
          </span>
        </div>
        {(selected ? otherProducts : detail.products).length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {selected
              ? "This is the only linked product for this supplier."
              : "No linked products yet."}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {(selected ? otherProducts : detail.products).map((product) => (
              <CatalogueOrderRow
                key={product.id}
                product={product}
                supplierSlug={detail.slug}
                qty={cart[product.id] ?? 0}
                pack={packByProductId[product.id] ?? null}
                onSelectPack={(packOptionId) => selectPack(product.id, packOptionId)}
                onSetQty={(qty) => setQty(product.id, qty, true)}
              />
            ))}
          </ul>
        )}
      </section>

      {orderFooter}
      {pdfDownloadDialog}
      {packQtyModal}
    </div>
  );
}

function SupplierContactSection({
  detail,
  areaLabel,
  className,
}: {
  detail: MarketplaceSupplierDetail;
  areaLabel: string;
  className?: string;
}) {
  const paymentLabel = detail.paymentMethodPreferred
    ? formatPaymentMethodLabel(detail.paymentMethodPreferred)
    : null;
  const paymentDetails = detail.paymentDetails?.trim() || null;
  const paymentCopyValue = [paymentLabel, paymentDetails].filter(Boolean).join(" · ");

  const payoutLine =
    detail.payoutType && detail.payoutPhone
      ? `${formatPaymentMethodLabel(detail.payoutType)} ${detail.payoutPhone}`
      : detail.payoutPhone?.trim() || null;

  const seenPhones = new Set<string>();
  const contactLines: { label: string; phone?: string; email?: string }[] = [];

  const addContact = (
    label: string,
    phone?: string | null,
    email?: string | null,
  ) => {
    const digits = phone?.replace(/\D/g, "") ?? "";
    if (digits && seenPhones.has(digits)) return;
    if (digits) seenPhones.add(digits);
    if (!phone?.trim() && !email?.trim()) return;
    contactLines.push({
      label,
      phone: phone?.trim() || undefined,
      email: email?.trim() || undefined,
    });
  };

  const primary =
    detail.contacts.find((c) => c.primaryContact) ?? detail.contacts[0];
  if (primary) {
    addContact(
      [primary.name, primary.roleLabel].filter(Boolean).join(" · ") || "Contact",
      primary.phone ?? detail.contactPhone,
      primary.email ?? detail.contactEmail,
    );
  } else {
    addContact("Contact", detail.contactPhone, detail.contactEmail);
  }

  for (const c of detail.contacts) {
    if (c === primary) continue;
    addContact(
      [c.name, c.roleLabel].filter(Boolean).join(" · ") || "Contact",
      c.phone,
      c.email,
    );
  }

  if (
    contactLines.length === 0 &&
    !paymentCopyValue &&
    !payoutLine &&
    !areaLabel &&
    !detail.listedBy
  ) {
    return null;
  }

  return (
    <section
      className={cn(
        className ?? "border border-border/55 bg-muted/5 px-3 py-3 sm:px-4",
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          {contactLines.map((line) => (
            <div key={`${line.label}-${line.phone ?? line.email}`} className="text-sm">
              <p className="text-[11px] text-muted-foreground">{line.label}</p>
              {line.phone ? (
                <PhoneLink phone={line.phone} showWhatsApp className="text-sm" />
              ) : null}
              {line.email ? (
                <a
                  href={`mailto:${line.email}`}
                  className="block text-sm underline underline-offset-2"
                >
                  {line.email}
                </a>
              ) : null}
            </div>
          ))}
          {areaLabel ? (
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {areaLabel}
            </p>
          ) : null}
        </div>

        <div className="min-w-0 space-y-2 text-sm">
          {paymentCopyValue ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">Payment</p>
                <CopyButton value={paymentCopyValue} label="Payment details" />
              </div>
              {paymentLabel ? (
                <p className="font-medium leading-snug">{paymentLabel}</p>
              ) : null}
              {paymentDetails ? (
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {paymentDetails}
                </p>
              ) : null}
            </div>
          ) : null}
          {payoutLine && payoutLine !== paymentCopyValue ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">Payout</p>
                <CopyButton value={payoutLine} label="Payout details" />
              </div>
              <p className="leading-snug">{payoutLine}</p>
            </div>
          ) : null}
          {detail.listedBy ? (
            <p className="text-xs text-muted-foreground">
              Listed by {detail.listedBy}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      onClick={() => {
        void copyText(value, label).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function PhoneLink({
  phone,
  showWhatsApp = false,
  className,
}: {
  phone: string;
  showWhatsApp?: boolean;
  className?: string;
}) {
  const wa = normalizeWhatsAppPhone(phone);
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-0.5", className)}>
      <TelLink phone={phone} className="underline underline-offset-2 hover:text-foreground/80" />
      {showWhatsApp && wa ? (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          <MessageCircle className="size-3" />
          WhatsApp
        </a>
      ) : null}
    </span>
  );
}

function ParentRail({
  options,
  activeId,
  onSelect,
  orientation,
  className,
  tileClassName,
}: {
  options: ParentOption[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  orientation: "horizontal" | "vertical";
  className?: string;
  tileClassName?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canStart, setCanStart] = useState(false);
  const [canEnd, setCanEnd] = useState(false);
  const [progress, setProgress] = useState(0);
  const vertical = orientation === "vertical";

  const syncScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = vertical
      ? el.scrollHeight - el.clientHeight
      : el.scrollWidth - el.clientWidth;
    const pos = vertical ? el.scrollTop : el.scrollLeft;
    setCanStart(pos > 2);
    setCanEnd(max - pos > 2);
    setProgress(max > 0 ? Math.min(1, Math.max(0, pos / max)) : 0);
  }, [vertical]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const run = () => syncScrollState();
    run();
    // Layout settles after images/fonts — re-check overflow.
    const t1 = window.setTimeout(run, 50);
    const t2 = window.setTimeout(run, 300);

    el.addEventListener("scroll", run, { passive: true });
    const ro = new ResizeObserver(run);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      el.removeEventListener("scroll", run);
      ro.disconnect();
    };
  }, [syncScrollState, options.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>("[data-parent-active='true']");
    if (!active) return;
    active.scrollIntoView({
      block: "nearest",
      inline: vertical ? "nearest" : "center",
      behavior: "smooth",
    });
    window.setTimeout(syncScrollState, 320);
  }, [activeId, vertical, syncScrollState]);

  // Trackpad / mouse wheel: map vertical wheel to horizontal scroll on mobile strip.
  useEffect(() => {
    if (vertical) return;
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [vertical, options.length]);

  const nudge = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = vertical
      ? Math.max(96, el.clientHeight * 0.7)
      : Math.max(112, el.clientWidth * 0.6);
    el.scrollBy({
      top: vertical ? dir * step : 0,
      left: vertical ? 0 : dir * step,
      behavior: "smooth",
    });
  };

  const StartIcon = vertical ? ChevronUp : ChevronLeft;
  const EndIcon = vertical ? ChevronDown : ChevronRight;
  const indexLabel = Math.max(
    1,
    options.findIndex((o) => o.id === activeId) + 1,
  );
  const overflow = canStart || canEnd;

  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0",
        vertical ? "h-full flex-col overflow-hidden" : "w-full flex-col overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "relative min-h-0 min-w-0 flex-1 overflow-hidden",
          !vertical && "h-[3.85rem]",
        )}
      >
        {canStart ? (
          <button
            type="button"
            aria-label={vertical ? "Scroll families up" : "Scroll families left"}
            onClick={() => nudge(-1)}
            className={cn(
              "absolute z-[3] flex items-center justify-center",
              "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
              "bg-[color-mix(in_srgb,#faf8f4_94%,transparent)] text-[var(--pos-ink,#1c1915)] shadow-sm backdrop-blur-sm",
              "transition hover:bg-white active:scale-95",
              vertical ? "inset-x-1 top-1 h-6" : "inset-y-1 left-1 w-6",
            )}
          >
            <StartIcon className="size-3.5" />
          </button>
        ) : null}

        {canEnd ? (
          <button
            type="button"
            aria-label={vertical ? "Scroll families down" : "Scroll families right"}
            onClick={() => nudge(1)}
            className={cn(
              "absolute z-[3] flex items-center justify-center",
              "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
              "bg-[color-mix(in_srgb,#faf8f4_94%,transparent)] text-[var(--pos-ink,#1c1915)] shadow-sm backdrop-blur-sm",
              "transition hover:bg-white active:scale-95",
              vertical ? "inset-x-1 bottom-1 h-6" : "inset-y-1 right-1 w-6",
            )}
          >
            <EndIcon className="size-3.5" />
          </button>
        ) : null}

        {/* Edge fades hint that more parents exist */}
        {canStart ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute z-[2]",
              vertical
                ? "inset-x-0 top-0 h-8 bg-gradient-to-b from-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_92%,transparent)] to-transparent"
                : "inset-y-0 left-0 w-8 bg-gradient-to-r from-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_92%,transparent)] to-transparent",
            )}
          />
        ) : null}
        {canEnd ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute z-[2]",
              vertical
                ? "inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_92%,transparent)] to-transparent"
                : "inset-y-0 right-0 w-8 bg-gradient-to-l from-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_92%,transparent)] to-transparent",
            )}
          />
        ) : null}

        <div
          ref={scrollerRef}
          role="navigation"
          aria-label="Filter by product family"
          tabIndex={0}
          className={cn(
            "absolute inset-0 overscroll-contain p-0.5 outline-none",
            "scroll-smooth",
            vertical
              ? cn(
                  "flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden",
                  // Thin visible scrollbar so the column is obviously scrollable
                  "[scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--pos-ink,#1c1915)_35%,transparent)_transparent]",
                  "[&::-webkit-scrollbar]:w-1.5",
                  "[&::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)]",
                )
              : "flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
          onKeyDown={(e) => {
            if (vertical && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              e.preventDefault();
              nudge(e.key === "ArrowDown" ? 1 : -1);
            }
            if (!vertical && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
              e.preventDefault();
              nudge(e.key === "ArrowRight" ? 1 : -1);
            }
          }}
        >
          {options.map((parent) => (
            <ParentFolderButton
              key={parent.id ?? "all"}
              parent={parent}
              active={activeId === parent.id}
              className={cn(
                "shrink-0",
                vertical ? "w-full" : cn("size-[3.75rem]", tileClassName),
              )}
              onSelect={() => onSelect(parent.id)}
            />
          ))}
        </div>
      </div>

      {overflow && vertical ? (
        <div className="flex shrink-0 flex-col items-center gap-1 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-1 py-1.5">
          <div className="relative h-8 w-1 overflow-hidden bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
            <span
              className="absolute inset-x-0 h-2.5 bg-[var(--pos-primary,#0f766e)] transition-[top] duration-150"
              style={{ top: `calc((100% - 0.625rem) * ${progress})` }}
            />
          </div>
          <p className="font-mono text-[8px] tabular-nums text-muted-foreground">
            {indexLabel}/{options.length}
          </p>
        </div>
      ) : null}

      {overflow && !vertical ? (
        <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-0.5">
          <div className="h-0.5 flex-1 overflow-hidden bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
            <span
              className="block h-full w-1/3 bg-[var(--pos-primary,#0f766e)] transition-transform duration-150"
              style={{ transform: `translateX(${progress * 200}%)` }}
            />
          </div>
          <p className="shrink-0 font-mono text-[8px] tabular-nums text-muted-foreground">
            {indexLabel}/{options.length}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ParentFolderButton({
  parent,
  active,
  className,
  onSelect,
}: {
  parent: ParentOption;
  active: boolean;
  className?: string;
  onSelect: () => void;
}) {
  const thumb = parent.thumbnailUrl?.trim() || null;
  const hasImage = Boolean(thumb);

  return (
    <button
      type="button"
      onClick={onSelect}
      data-parent-active={active ? "true" : "false"}
      className={cn(parentRailClass(active, hasImage), className)}
      title={parent.label}
    >
      {thumb ? (
        <>
          <Image
            src={thumb}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
            unoptimized
          />
          <span className="absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/80 via-black/45 to-transparent px-0.5 pb-0.5 pt-4 text-[9px] font-semibold leading-tight text-white">
            <span className="line-clamp-2">{parent.label}</span>
          </span>
        </>
      ) : (
        <span className="line-clamp-3 px-0.5">{parent.label}</span>
      )}
    </button>
  );
}

function OrderManifestPanel({
  supplierName,
  claimPhone,
  lines,
  currency,
  total,
  rawTotal,
  roundedLineIds,
  roundTo10,
  orderHref,
  shopOrderHref,
  sending,
  catalogueBusy,
  onSetQty,
  onRemove,
  onTogglePack,
  onEditPack,
  onSelectPack,
  onToggleLineRounding,
  onToggleOrderRounding,
  onSend,
  onDownloadPdf,
  onCopy,
  onCopyOrderLink,
  onCatalogue,
  onClose,
  className,
}: {
  supplierName: string;
  claimPhone?: string | null;
  lines: {
    product: MarketplaceCatalogProductPreview;
    qty: number;
    pack: CartPackSelection | null;
    packOptedIn: boolean;
  }[];
  currency: string;
  total: number;
  rawTotal: number;
  roundedLineIds: Record<string, boolean>;
  roundTo10: boolean;
  orderHref: string;
  shopOrderHref?: string | null;
  sending: boolean;
  catalogueBusy: boolean;
  onSetQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onTogglePack: (productId: string) => void;
  onEditPack: (productId: string) => void;
  onSelectPack: (productId: string, packOptionId: string | null) => void;
  onToggleLineRounding: (productId: string) => void;
  onToggleOrderRounding: () => void;
  onSend: () => void;
  onDownloadPdf: () => void;
  onCopy: () => void;
  onCopyOrderLink: () => void;
  onCatalogue: () => void;
  onClose?: () => void;
  className?: string;
}) {
  const units = lines.reduce((sum, line) => sum + line.qty, 0);

  return (
    <aside
      className={cn(
        "flex h-full max-h-full min-h-0 w-full shrink-0 flex-col self-stretch overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
          onClose
            ? "border-0 bg-transparent"
            : "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_92%,#faf7f1)]",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b-2 border-[var(--pos-ink,#1c1915)] px-2.5 py-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Order list
            </p>
            <h2 className="mt-0.5 truncate text-base font-semibold leading-none text-[var(--pos-ink,#1c1915)]">
              {supplierName}
            </h2>
          </div>
          {onClose ? (
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Close order list"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-0 overflow-y-auto">
          {lines.length === 0 ? (
            <p className="mx-2.5 my-3 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] px-3 py-10 text-center text-[11px] leading-relaxed text-muted-foreground">
              Tap shelf products to build this order. Use the pack icon on a
              line when the supplier sells by the pack.
            </p>
          ) : (
            lines.map((line, index) => {
              const rawLineTotal = productLineTotal(
                line.product,
                line.qty,
                line.pack,
              );
              const roundedLineTotal =
                rawLineTotal == null ? null : roundMoneyTo10(rawLineTotal);
              const canRound =
                roundedLineTotal != null && roundedLineTotal !== rawLineTotal;
              const lineIsRounded =
                canRound && Boolean(roundedLineIds[line.product.id]);
              const displayedLineTotal = lineIsRounded
                ? roundedLineTotal
                : rawLineTotal;
              const pack = line.pack;
              const packed = pack != null && pack.size > 1;

              return (
                <div
                  key={line.product.id}
                  className="space-y-1.5 border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2.5 py-2 last:border-b-0"
                >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-1.5">
                    {packed ? (
                      <WholesalePackStamp
                        units={pack.size}
                        packCount={line.qty}
                        packUnit={pack.unit}
                        className="mt-0.5 shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0">
                    <p className="flex items-start gap-1.5 text-[12px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)]">
                      <span className="mt-0.5 shrink-0 font-mono text-[9px] font-normal tabular-nums text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{line.product.name}</span>
                    </p>
                    {line.product.sku ? (
                      <p className="mt-0.5 pl-5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                        {line.product.sku}
                      </p>
                    ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 p-0.5 text-destructive/70 hover:text-destructive"
                    onClick={() => onRemove(line.product.id)}
                    aria-label={`Remove ${line.product.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 pl-5">
                  <div
                    className={cn(
                      "inline-flex items-center border",
                      packed
                        ? "border-amber-800/30 bg-amber-50/90"
                        : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
                    )}
                  >
                    <button
                      type="button"
                      className="flex size-7 items-center justify-center hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]"
                      onClick={() => onSetQty(line.product.id, line.qty - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="min-w-7 text-center font-mono text-[12px] font-semibold tabular-nums">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      className="flex size-7 items-center justify-center hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]"
                      onClick={() => onSetQty(line.product.id, line.qty + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-3" />
                    </button>
                    {packed ? (
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center px-1 font-mono text-[9px] font-black tabular-nums text-amber-950"
                        title="Change pack size"
                        onClick={() => onEditPack(line.product.id)}
                      >
                        ×{pack.size}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={cn(
                        "inline-flex size-7 shrink-0 items-center justify-center",
                        line.packOptedIn
                          ? "bg-amber-200/80 text-amber-950"
                          : "text-muted-foreground hover:bg-amber-100 hover:text-amber-950",
                      )}
                      title={
                        line.packOptedIn
                          ? "Edit custom pack size"
                          : "Custom pack size…"
                      }
                      aria-pressed={line.packOptedIn}
                      onClick={() => onTogglePack(line.product.id)}
                    >
                      <Package className="size-3" aria-hidden />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {canRound ? (
                      <button
                        type="button"
                        onClick={() => onToggleLineRounding(line.product.id)}
                        className={cn(
                          "border px-1.5 py-1 text-[9px] font-semibold transition",
                          lineIsRounded
                            ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]"
                            : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] text-muted-foreground hover:text-foreground",
                        )}
                        aria-pressed={lineIsRounded}
                        title="Round this item total to the nearest 10"
                      >
                        {lineIsRounded ? "Rounded" : "Round"}
                      </button>
                    ) : null}
                    <div className="text-right">
                      <p className="font-mono text-[12px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
                        {displayedLineTotal != null
                          ? formatMoney(
                              displayedLineTotal,
                              line.product.currency ?? currency,
                            )
                          : "Ask"}
                      </p>
                      {packed ? (
                        <p className="font-mono text-[9px] tabular-nums text-muted-foreground">
                          {packUnitPrice(line.product, pack) != null ? (
                            `${formatMoney(packUnitPrice(line.product, pack)!, line.product.currency ?? currency)} / pack`
                          ) : (
                            "Ask / pack"
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
                {catalogPackOptions(line.product).length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1 pl-5">
                    <PackChoiceChip
                      active={!packed}
                      onClick={() => onSelectPack(line.product.id, null)}
                      title="Buy loose units"
                    >
                      Unit
                    </PackChoiceChip>
                    {catalogPackOptions(line.product).map((option) => {
                      const active =
                        packed && line.pack?.packOptionId === option.id;
                      return (
                        <PackChoiceChip
                          key={option.id}
                          active={active}
                          onClick={() => onSelectPack(line.product.id, option.id)}
                          title={
                            option.unitPrice != null
                              ? `${formatMoney(option.unitPrice, line.product.currency ?? currency)} per ${option.packUnit || "pack"}`
                              : `Pack of ${formatPackSize(option.unitsPerPack)}`
                          }
                        >
                          ×{formatPackSize(option.unitsPerPack)}
                        </PackChoiceChip>
                      );
                    })}
                  </div>
                ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 space-y-2 border-t-2 border-[var(--pos-ink,#1c1915)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] px-2.5 py-2.5">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="text-muted-foreground">
              {units === 0
                ? "No lines yet"
                : `${units} unit${units === 1 ? "" : "s"} · ${lines.length} line${lines.length === 1 ? "" : "s"}`}
            </span>
            <span className="flex flex-col items-end gap-0.5">
              <span className="font-mono text-[14px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
                {formatMoney(total, currency)}
              </span>
              <button
                type="button"
                onClick={onToggleOrderRounding}
                className={cn(
                  "border px-1.5 py-0.5 text-[9px] font-semibold transition",
                  roundTo10
                    ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)] text-[var(--pos-primary,#0f766e)]"
                    : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={roundTo10}
                title="Round the whole order total to the nearest 10"
              >
                {roundTo10 ? "Total rounded" : "Round total"}
              </button>
              {total !== rawTotal ? (
                <span className="text-[9px] text-muted-foreground">
                  from {formatMoney(rawTotal, currency)}
                </span>
              ) : null}
            </span>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#128c4a] px-4 text-sm font-semibold text-white transition hover:bg-[#0f7a3f] disabled:pointer-events-none disabled:opacity-50"
            disabled={sending || lines.length === 0}
            onClick={onSend}
          >
            {sending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Opening WhatsApp…
              </>
            ) : (
              <>
                <MessageCircle className="size-4" />
                Send on WhatsApp
              </>
            )}
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-1 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_90%,#faf7f1)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-ink,#1c1915)] transition hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] disabled:pointer-events-none disabled:opacity-50"
              disabled={sending || lines.length === 0}
              onClick={onDownloadPdf}
            >
              <FileDown className="size-3.5" />
              PDF
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-1 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_90%,#faf7f1)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-ink,#1c1915)] transition hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] disabled:pointer-events-none disabled:opacity-50"
              disabled={sending || lines.length === 0}
              onClick={onCopy}
            >
              <Copy className="size-3.5" />
              Copy
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-1 border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-ink,#1c1915)] transition hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,transparent)] disabled:pointer-events-none disabled:opacity-50"
              disabled={sending}
              onClick={onCatalogue}
            >
              {catalogueBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <BookOpen className="size-3.5" />
              )}
              Catalogue
            </button>
          </div>
          {lines.length > 0 ? (
            <div className="space-y-2">
              <div className="flex h-8 items-stretch border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_90%,#faf7f1)]">
                <Link
                  href={orderHref}
                  className="min-w-0 flex-1 truncate px-2 py-2 text-[9px] font-medium underline underline-offset-2 hover:text-foreground"
                  title={orderHref}
                >
                  Shareable order link
                </Link>
                <button
                  type="button"
                  onClick={onCopyOrderLink}
                  className="inline-flex shrink-0 items-center gap-1 border-l border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-2 text-[9px] font-semibold uppercase tracking-[0.06em] hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]"
                  aria-label="Copy shareable order link"
                >
                  <Copy className="size-3" />
                  Copy link
                </button>
              </div>
              {shopOrderHref ? (
                <Link
                  href={shopOrderHref}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-ink,#1c1915)] transition hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,transparent)]"
                >
                  <ShoppingCart className="size-3.5" />
                  Open in shop Order
                </Link>
              ) : null}
            </div>
          ) : null}
          <p className="text-center text-[10px] leading-snug text-muted-foreground">
            WhatsApp opens with your list. Catalogue PDF lets you pick pictured
            sheet, forest price list, or chalkboard stall cards.
            {claimPhone ? (
              <>
                {" "}
                <Link
                  href={supplierPortalClaimPath(claimPhone)}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  This is your stall?
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </aside>
  );
}

function CatalogueOrderRow({
  product,
  supplierSlug,
  qty,
  pack = null,
  onSelectPack,
  onSetQty,
}: {
  product: MarketplaceCatalogProductPreview;
  supplierSlug: string | null;
  qty: number;
  pack?: CartPackSelection | null;
  onSelectPack?: (packOptionId: string | null) => void;
  onSetQty: (qty: number) => void;
}) {
  const hue = hueFromId(product.id);
  const href = marketplacePassportProductPath(supplierSlug, product.slug);
  const packs = catalogPackOptions(product);

  return (
    <div className="flex items-center gap-2.5 border border-border/50 bg-muted/10 p-2">
      {href ? (
        <Link href={href} className="shrink-0">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            hue={hue}
            className="size-12 border border-border/40"
            iconClassName="size-4 opacity-50"
          />
        </Link>
      ) : (
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          hue={hue}
          className="size-12 border border-border/40"
          iconClassName="size-4 opacity-50"
        />
      )}
      <div className="min-w-0 flex-1">
        {href ? (
          <Link
            href={href}
            className="block text-sm font-medium leading-snug hover:underline"
          >
            {product.name}
          </Link>
        ) : (
          <p className="text-sm font-medium leading-snug">{product.name}</p>
        )}
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {(pack?.price ?? product.unitPrice) != null ? (
            formatMoney(pack?.price ?? product.unitPrice!, product.currency ?? "KES")
          ) : (
            "Ask"
          )}
        </p>
        {pack != null && pack.price != null ? (
          <p className="text-[11px] font-semibold text-muted-foreground">
            {formatMoney(pack.price, product.currency ?? "KES")} / {pack.unit} ·{" "}
            {formatMoney(
              Math.round((pack.price / pack.size) * 100) / 100,
              product.currency ?? "KES",
            )}{" "}
            ea
          </p>
        ) : null}
        {packs.length > 0 ? (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <PackChoiceChip
              active={pack == null}
              onClick={() => onSelectPack?.(null)}
              title="Buy loose units"
            >
              Unit
            </PackChoiceChip>
            {packs.map((option) => (
              <PackChoiceChip
                key={option.id}
                active={pack?.packOptionId === option.id}
                onClick={() => onSelectPack?.(option.id)}
                title={
                  option.unitPrice != null
                    ? `${formatMoney(option.unitPrice, product.currency ?? "KES")} per ${option.packUnit || "pack"}`
                    : `Pack of ${formatPackSize(option.unitsPerPack)}`
                }
              >
                ×{formatPackSize(option.unitsPerPack)}
              </PackChoiceChip>
            ))}
          </div>
        ) : null}
      </div>
      <QtyControl qty={qty} onChange={onSetQty} compact />
    </div>
  );
}

function LedgerColHead({
  label,
  width,
  align = "left",
  className,
}: {
  label: string;
  width: string;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-8 shrink-0 items-center border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2 text-[10px] font-bold uppercase tracking-[0.08em] last:border-r-0",
        width,
        align === "right" && "justify-end",
        "text-muted-foreground",
        className,
      )}
    >
      {label}
    </div>
  );
}

function ShelfProductLedger({
  sections,
  flatten,
  showFamilyHeadings,
  supplierSlug,
  cart,
  packByProductId,
  focusProductId,
  onAdd,
  onSetQty,
}: {
  sections: CatalogProductGroup[];
  flatten: boolean;
  showFamilyHeadings: boolean;
  supplierSlug: string | null;
  cart: CartQty;
  packByProductId: CartPackMeta;
  focusProductId: string | null;
  onAdd: (productId: string) => void;
  onSetQty: (productId: string, qty: number) => void;
}) {
  const cartUnits = Object.values(cart).reduce((sum, n) => sum + n, 0);
  const grouped = !flatten && showFamilyHeadings;
  const rows: {
    family: CatalogProductGroup;
    items: CatalogProductGroup["items"];
    start: number;
  }[] = [];
  let running = 0;
  for (const family of sections) {
    const items = flatten ? family.items.slice(0, 1) : family.items;
    rows.push({ family, items, start: running });
    running += items.length;
  }
  const productCount = running;

  return (
    <div className="mt-1.5 overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)]">
      <div className="flex border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_60%,transparent)]">
        <LedgerColHead label="#" width="w-9" />
        <LedgerColHead label="Item" width="min-w-0 flex-1" />
        <LedgerColHead label="SKU" width="w-[5.5rem] hidden md:flex" />
        <LedgerColHead label="Price" width="w-[6.5rem]" align="right" />
        <LedgerColHead label="Qty" width="w-[7.5rem]" align="right" />
      </div>
      <div>
        {rows.map(({ family, items, start }) => (
            <section
              key={family.id}
              id={catalogFamilyAnchor(family.id)}
              className="scroll-mt-14"
            >
              {grouped ? (
                <div className="flex h-7 items-center justify-between border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_40%,transparent)] px-2.5">
                  <p className="truncate text-[11px] font-semibold text-[var(--pos-ink,#1c1915)]">
                    {family.label}
                  </p>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {items.length}
                  </span>
                </div>
              ) : null}
              {items.map((product, index) => {
                const qty = cart[product.id] ?? 0;
                const pack = packByProductId[product.id] ?? null;
                const inCart = qty > 0;
                const focused = focusProductId === product.id;
                const title = flatten
                  ? product.name
                  : catalogPackLabel(product, family.label);
                const href = marketplacePassportProductPath(
                  supplierSlug,
                  product.slug,
                );
                const price = pack?.price ?? product.unitPrice;
                const availablePacks = catalogPackOptions(product);
                const thumb = posTileThumbUrl(product.name, product.imageUrl);
                return (
                  <div
                    key={product.id}
                    data-shelf-product={product.id}
                    className={cn(
                      "flex min-h-11 items-stretch border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] text-[12px] last:border-b-0",
                      inCart
                        ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]"
                        : "hover:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_40%,transparent)]",
                      focused &&
                        "ring-1 ring-inset ring-[var(--pos-primary,#0f766e)]",
                    )}
                  >
                    <div className="flex w-9 shrink-0 items-center justify-center border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] font-mono text-[10px] tabular-nums text-muted-foreground">
                      {start + index + 1}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2 border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => onAdd(product.id)}
                        className="relative size-9 shrink-0 overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]"
                        aria-label={
                          qty > 0
                            ? `${title}, ${qty} in order. Tap to add another.`
                            : `Add ${title} to order`
                        }
                      >
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            sizes="36px"
                            className="object-contain p-0.5"
                            unoptimized
                          />
                        ) : (
                          <span
                            className={cn(
                              "flex h-full w-full items-center justify-center bg-gradient-to-br",
                              kioskPlaceholderWashClass(product.name),
                            )}
                            aria-hidden
                          >
                            <Package className="size-3.5 opacity-55" />
                          </span>
                        )}
                      </button>
                      <div className="min-w-0">
                        {href ? (
                          <Link
                            href={href}
                            className="block truncate font-medium text-[var(--pos-ink,#1c1915)] hover:underline"
                          >
                            {title}
                          </Link>
                        ) : (
                          <p className="truncate font-medium text-[var(--pos-ink,#1c1915)]">
                            {title}
                          </p>
                        )}
                        {pack ? (
                          <p className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                            Pack of {formatPackSize(pack.size)}
                          </p>
                        ) : availablePacks.length > 0 ? (
                          <p className="truncate font-mono text-[10px] text-muted-foreground">
                            {availablePacks
                              .map((p) => `×${formatPackSize(p.unitsPerPack)}`)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="hidden w-[5.5rem] shrink-0 items-center border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] px-2 md:flex">
                      <span className="truncate font-mono text-[10px] tabular-nums text-muted-foreground">
                        {product.sku || "—"}
                      </span>
                    </div>
                    <div className="flex w-[6.5rem] shrink-0 items-center justify-end border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] px-2 font-mono text-[11px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
                      {price != null
                        ? formatMoney(price, product.currency ?? "KES")
                        : "Ask"}
                    </div>
                    <div className="flex w-[7.5rem] shrink-0 items-center justify-end gap-1 px-1.5">
                      <button
                        type="button"
                        disabled={qty <= 0}
                        onClick={() => onSetQty(product.id, qty - 1)}
                        className="flex size-7 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] text-muted-foreground transition-colors hover:bg-white disabled:opacity-25"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="size-3.5" aria-hidden />
                      </button>
                      <span
                        className={cn(
                          "min-w-6 text-center font-mono text-[12px] font-bold tabular-nums",
                          inCart
                            ? "text-[var(--pos-primary,#0f766e)]"
                            : "text-muted-foreground",
                        )}
                      >
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAdd(product.id)}
                        className="flex size-7 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] text-muted-foreground transition-colors hover:bg-white"
                        aria-label="Increase quantity"
                      >
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
        ))}
      </div>
      {productCount > 0 ? (
        <div className="flex border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_50%,transparent)] px-3 py-2 text-[11px]">
          <span className="text-muted-foreground">
            {productCount} item{productCount === 1 ? "" : "s"}
          </span>
          {cartUnits > 0 ? (
            <span className="ml-auto font-mono font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
              {cartUnits} in order
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ShelfProductTile({
  product,
  displayName,
  supplierSlug,
  qty,
  pack = null,
  focused = false,
  onAdd,
  onSetQty,
}: {
  product: MarketplaceCatalogProductPreview;
  displayName?: string;
  supplierSlug: string | null;
  qty: number;
  pack?: CartPackSelection | null;
  focused?: boolean;
  onAdd: () => void;
  onSetQty: (qty: number) => void;
}) {
  const thumb = posTileThumbUrl(product.name, product.imageUrl);
  const href = marketplacePassportProductPath(supplierSlug, product.slug);
  const title = displayName?.trim() || product.name;
  const wholesalePack = pack;
  const availablePacks = catalogPackOptions(product);
  const eachFromPack = wholesalePack
    ? wholesalePack.price != null && wholesalePack.size > 0
      ? Math.round((wholesalePack.price / wholesalePack.size) * 100) / 100
      : null
    : catalogEachFromPack(product);

  return (
    <div
      data-shelf-product={product.id}
      className={cn(
        SHELF_TILE,
        qty > 0 &&
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_45%,var(--card))]",
        focused &&
          "z-[1] border-[var(--pos-primary,#0f766e)] ring-1 ring-[var(--pos-primary,#0f766e)]",
      )}
    >
      <div className="relative aspect-square w-full shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)]">
        <button
          type="button"
          onClick={onAdd}
          className="absolute inset-0 z-0 text-left"
          aria-label={
            qty > 0
              ? `${title}, ${qty} in order. Tap to add another.`
              : `Add ${title} to order`
          }
        >
          {thumb ? (
            <Image
              src={thumb}
              alt=""
              fill
              sizes="(max-width: 640px) 30vw, (max-width: 1024px) 16vw, 120px"
              className="object-contain p-0.5 transition-transform duration-300 group-hover:scale-[1.04]"
              unoptimized
            />
          ) : (
            <span
              className={cn(
                "flex h-full w-full items-center justify-center bg-gradient-to-br",
                kioskPlaceholderWashClass(product.name),
              )}
              aria-hidden
            >
              <Package className="size-5 opacity-55" strokeWidth={1.5} />
            </span>
          )}
        </button>
        {qty > 0 ? (
          <span className="pointer-events-none absolute left-0 top-0 z-[1] inline-flex h-5 min-w-5 items-center justify-center bg-[var(--pos-primary,#0f766e)] px-1 font-mono text-[10px] font-bold tabular-nums text-[var(--pos-primary-ink,#fff)]">
            {qty}
          </span>
        ) : null}
        {wholesalePack ? (
          <WholesalePackStamp
            overlay
            units={wholesalePack.size}
            packUnit={wholesalePack.unit}
          />
        ) : null}
      </div>
      <div className="flex min-h-[3.25rem] w-full flex-1 flex-col justify-between gap-1 px-1 pb-1 pt-1">
        {href ? (
          <Link
            href={href}
            className="text-[11px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {title}
          </Link>
        ) : (
          <p className="text-[11px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)]">
            {title}
          </p>
        )}
        {wholesalePack ? (
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_62%,transparent)]">
            Pack of {formatPackSize(wholesalePack.size)}
          </p>
        ) : availablePacks.length > 0 ? (
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_42%,transparent)]">
            {availablePacks.map((p) => `×${formatPackSize(p.unitsPerPack)}`).join(" · ")}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
              {(wholesalePack?.price ?? product.unitPrice) != null ? (
                formatMoney(
                  wholesalePack?.price ?? product.unitPrice!,
                  product.currency ?? "KES",
                )
              ) : (
                "Ask"
              )}
              {wholesalePack ? (
                <span className="font-sans font-semibold uppercase tracking-wide text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_55%,transparent)]">
                  {" "}/ pack
                </span>
              ) : null}
            </p>
            {eachFromPack != null ? (
              <p className="font-mono text-[9px] tabular-nums text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_55%,transparent)]">
                {formatMoney(eachFromPack, product.currency ?? "KES")} ea
              </p>
            ) : null}
          </div>
          {qty > 0 ? (
            <div
              className="inline-flex items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="flex size-6 items-center justify-center hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]"
                onClick={() => onSetQty(qty - 1)}
                aria-label="Decrease quantity"
              >
                <Minus className="size-3" />
              </button>
              <span className="min-w-5 text-center font-mono text-[10px] font-semibold tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                className="flex size-6 items-center justify-center hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]"
                onClick={() => onSetQty(qty + 1)}
                aria-label="Increase quantity"
              >
                <Plus className="size-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex h-6 items-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]"
            >
              <Plus className="mr-0.5 size-3" />
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const PDF_KIND_COPY: Record<
  PdfDownloadKind,
  { title: string; description: string }
> = {
  sheet: {
    title: "Download the pictured catalogue",
    description: "Photos of each family, listed A–Z. Include prices, or names only.",
  },
  list: {
    title: "Download the forest price list",
    description: "The A–Z list without photos. Include prices, or names only.",
  },
  chalk: {
    title: "Download the chalkboard stall sheet",
    description: "Cream cards, mango price tags, family rows. Include prices, or names only.",
  },
  order: {
    title: "Download this order",
    description: "Include line prices and a total, or names and quantities only.",
  },
};

function CatalogueStyleDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (kind: CatalogueStyleKind) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "z-[90] max-w-[22rem] gap-0 overflow-hidden rounded-none p-0",
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
          "bg-[color-mix(in_srgb,#faf7f1_98%,transparent)]",
        )}
        overlayClassName="z-[89]"
      >
        <div className="relative border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-5 pb-4 pt-5">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary,#0f766e)]"
          />
          <DialogHeader className="space-y-1.5 pl-2 text-left">
            <DialogTitle className="text-[1.05rem] font-semibold leading-tight tracking-tight text-[var(--pos-ink,#1c1915)]">
              Choose a catalogue
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
              Three print sheets. Next you can keep prices, or names only.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex flex-col gap-2 p-4">
          <button
            type="button"
            onClick={() => onPick("sheet")}
            className="inline-flex h-11 items-center justify-center gap-2 bg-[var(--pos-primary,#0f766e)] px-4 text-sm font-semibold text-[var(--pos-primary-ink,#fff)] transition hover:brightness-[1.08]"
          >
            <BookOpen className="size-4" />
            Pictured sheet
          </button>
          <button
            type="button"
            onClick={() => onPick("list")}
            className="inline-flex h-11 items-center justify-center gap-2 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_90%,#faf7f1)] px-4 text-sm font-semibold text-[var(--pos-ink,#1c1915)] transition hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]"
          >
            <List className="size-4" />
            Forest price list
          </button>
          <button
            type="button"
            onClick={() => onPick("chalk")}
            className="inline-flex h-11 items-center justify-center gap-2 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,#1F3D2B_8%,transparent)] px-4 text-sm font-semibold text-[var(--pos-ink,#1c1915)] transition hover:bg-[color-mix(in_srgb,#1F3D2B_14%,transparent)]"
          >
            <Store className="size-4" />
            Chalkboard stall
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PdfPriceFilterDialog({
  kind,
  onOpenChange,
  onConfirm,
}: {
  kind: PdfDownloadKind | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (includePrices: boolean) => void;
}) {
  const copy = kind ? PDF_KIND_COPY[kind] : PDF_KIND_COPY.order;
  return (
    <Dialog open={kind != null} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "z-[90] max-w-[22rem] gap-0 overflow-hidden rounded-none p-0",
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
          "bg-[color-mix(in_srgb,#faf7f1_98%,transparent)]",
        )}
        overlayClassName="z-[89]"
      >
        <div className="relative border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-5 pb-4 pt-5">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary,#0f766e)]"
          />
          <DialogHeader className="space-y-1.5 pl-2 text-left">
            <DialogTitle className="text-[1.05rem] font-semibold leading-tight tracking-tight text-[var(--pos-ink,#1c1915)]">
              {copy.title}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
              {copy.description}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex flex-col gap-2 p-4">
          <button
            type="button"
            onClick={() => onConfirm(true)}
            className="inline-flex h-11 items-center justify-center gap-2 bg-[var(--pos-primary,#0f766e)] px-4 text-sm font-semibold text-[var(--pos-primary-ink,#fff)] transition hover:brightness-[1.08]"
          >
            <Banknote className="size-4" />
            With prices
          </button>
          <button
            type="button"
            onClick={() => onConfirm(false)}
            className="inline-flex h-11 items-center justify-center gap-2 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_90%,#faf7f1)] px-4 text-sm font-semibold text-[var(--pos-ink,#1c1915)] transition hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]"
          >
            <List className="size-4" />
            Without prices
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
