"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import {
  ArrowRight,
  Camera,
  ChevronLeft,
  ClipboardCheck,
  Loader2,
  LogOut,
  Package,
  PlusCircle,
  PackagePlus,
  ScanLine,
  Search,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useOptionalPosTillLock } from "@/components/auth/pos-till-lock";
import { CashierFirstSaleDrawer } from "@/components/cashier/cashier-first-sale-drawer";
import { CashierOrderConfirmDrawer } from "@/components/cashier/cashier-order-confirm-drawer";
import { TenantOrderDrawer } from "@/components/order/tenant-order-drawer";
import { Button } from "@/components/ui/button";
import {
  fetchItemById,
  fetchItems,
  itemListThumbnailUrl,
  uploadItemImageFile,
  type CategoryTreeNodeRecord,
  type ItemDetailRecord,
  type ItemSummaryRecord,
  type ItemTypeRecord,
} from "@/lib/api";
import { fetchPosShelfPrice } from "@/lib/pos-shelf-price";
import type { CashierPosUiCopy } from "@/lib/cashier-pos-copy";
import {
  cashierItemPrimaryLabel,
  cashierItemTitleParts,
  isPosPackageSellRow,
  posAvailablePackages,
} from "@/lib/cashier-item-display";
import {
  formatShelfPriceLabel,
  isHighValueShelfPrice,
  parseShelfAmount,
  shelfPriceToInputString,
  splitShelfPriceDisplay,
} from "@/lib/cashier-shelf-price";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { CART_STALE_MS, CART_VERY_STALE_MS } from "@/lib/cart-session";
import { useMediaLg } from "@/hooks/use-media-lg";
import { usePosBarcodeWedge } from "@/hooks/use-pos-barcode-wedge";
import { usePosEvents } from "@/hooks/use-pos-events";
import { type TopProductRecord } from "@/lib/top-products";
import { useFeatureFlag } from "@/components/providers/tenant-provider";
import { POS_CASHIER_CAPABILITY_FLAGS } from "@/lib/pos-cashier-capabilities";
import { PosFrequentChips } from "@/components/cashier/pos-frequent-chips";
import { PosSearchHitList } from "@/components/cashier/pos-search-hit-list";
import { PosVariantPicker } from "@/components/cashier/pos-variant-picker";
import { cn } from "@/lib/utils";
import {
  CashierProductModal,
  type CashierProductModalSubmit,
} from "./cashier-product-modal";
import {
  CashierCartDrawer,
  type CashierCartDrawerProps,
} from "./cashier-cart-drawer";
import { CashierCartSidePanel } from "./cashier-cart-side-panel";
import {
  CashierCurrencySuffix,
  CashierDottedLeader,
} from "./cashier-currency-inline";
import {
  kioskPlaceholderWashClass,
} from "./kiosk-listing-styles";
import { AirtimeQuickAction } from "@/components/airtime/airtime-quick-action";
import type { AirtimeCartPayload } from "@/lib/airtime-cart-line";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { CashierCreateProductModal } from "./cashier-create-product-modal";
import { CashierEditPriceModal } from "./cashier-edit-price-modal";
import { CashierCreditTabsModal } from "./cashier-credit-tabs-modal";
import { CashierReceiveTillDrawer } from "./cashier-receive-till-drawer";
import { CashierSuppliersModal } from "./cashier-suppliers-modal";

const POS_SHIFT_CHIP_CLASS = cn(
  "inline-flex items-center gap-1.5 rounded-md border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-transparent px-2.5 py-1.5 text-xs font-medium tracking-tight text-foreground",
  "transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_40%,transparent)]",
  "active:scale-[0.98]",
);

const POS_PRIMARY_CHIP_CLASS = cn(
  POS_SHIFT_CHIP_CLASS,
  "border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] text-[var(--pos-ink,#1c1915)]",
  "hover:bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)]",
);

const POS_SECONDARY_CHIP_CLASS = cn(
  POS_SHIFT_CHIP_CLASS,
  "border-transparent text-muted-foreground",
  "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] hover:text-foreground",
);

const KIOSK_TILE_SHELL = cn(
  "group relative flex h-full flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] text-left transition-[border-color,background-color] duration-150",
  "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] hover:bg-card",
  "focus:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_40%,transparent)]",
  "active:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_40%,var(--card))]",
  "dark:border-border/40 dark:bg-card",
);

/** Match HID wedge MIN_CODE_LEN — skip plain name searches like "milk". */
function looksLikeScannedCode(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 4) return false;
  if (/^GI-/i.test(t)) return true;
  const compact = t.replace(/[\s-]/g, "");
  if (/^\d{4,}$/.test(compact)) return true;
  // Compact alphanumeric / SKU codes must include a digit.
  return (
    !/\s/.test(t) &&
    /\d/.test(t) &&
    /^[A-Za-z0-9._/-]+$/.test(t)
  );
}

export type CashierPosShiftLinksProps = {
  branchId: string;
  branchSelected: boolean;
  hasOpenShift: boolean;
  shiftLoading: boolean;
  canOpenShift: boolean;
  canCloseShift: boolean;
  canDrawout: boolean;
  /** Who opened the live till shift (for chip label). */
  openedByLabel?: string | null;
  tillLabel?: string | null;
  /** Open shift / drawout / close flows in-place (no redirect to Shifts). */
  onShortcut: (action: "new-drawout" | "open-shift" | "close-shift") => void;
};

export type CashierPosLayoutProps = {
  /** Page heading (default: Point of sale). */
  pageTitle?: string;
  /** Changes after a successful auto-print; closes checkout for the next sale. */
  checkoutCompletedKey?: number;
  /** Controlled pay / checkout drawer (till listen + layout share one source of truth). */
  checkoutDrawerOpen: boolean;
  onCheckoutDrawerOpenChange: (open: boolean) => void;
  /** When true, lifts fixed cart controls above the dashboard mobile bottom nav. */
  embeddedInDashboard?: boolean;
  /** Brand CSS variables on the layout root (POS primary colors). */
  brandTheme?: CSSProperties;
  online: boolean;
  /** Extra offline hint (e.g. draft mirror pending sync). */
  offlineBanner?: string | null;
  /** Cloud cashier: till bridge + CUPS printer readiness. */
  tillPrinterStatus?: React.ReactNode;
  currency: string;
  uiCopy: CashierPosUiCopy;
  activeBranchName: string;
  branchesLoading: boolean;
  branchSelected: boolean;
  /** Used to resolve branch-scoped shelf prices in the add-item modal. */
  branchId: string;
  /** Scopes local frequent-item cache pruning when pricing returns "Item not found". */
  businessId?: string | null;
  onStalePosItem?: (itemId: string) => void;
  /** Brand CSS variables for portaled dialogs (must be set on each modal root). */
  dialogBrandTheme: CSSProperties;

  search: string;
  setSearch: (v: string) => void;
  hits: ItemSummaryRecord[];
  searchBanner: string | null;
  topProducts: TopProductRecord[];
  topProductsLoading?: boolean;
  topProductsTitle?: string;
  topProductsSubtitle?: string;
  /** When true, the top sellers panel is shown even while loading or empty. */
  alwaysShowTopProducts?: boolean;
  addLine: (
    item: ItemSummaryRecord,
    qty?: number,
    unitPrice?: string,
  ) => boolean;
  onAddAirtimeToCart?: (payload: AirtimeCartPayload) => boolean;

  canBrowseCategories: boolean;
  categoryRoots: CategoryTreeNodeRecord[];
  visibleCategoryTiles: CategoryTreeNodeRecord[];
  categoryBrowseStack: CategoryTreeNodeRecord[];
  setCategoryBrowseStack: React.Dispatch<
    React.SetStateAction<CategoryTreeNodeRecord[]>
  >;
  applySubtreeFilter: (id: string, label: string) => void;
  clearCategoryFilter: () => void;
  categoryFilterId: string | null;
  categoryFilterLabel: string | null;
  categoryTreeBusy: boolean;
  categoryBrowseParentId: string | null;
  /** When true, aisle filter stays active after add-to-cart. */
  keepAisleFilter?: boolean;
  onKeepAisleFilterChange?: (keep: boolean) => void;
  /** When set, catalog hits (search / aisle / type-only browse) are limited to this item type. */
  typeFilterId: string | null;
  typeFilterLabel: string | null;
  /** Optional local clear action. If omitted, the type badge is read-only (e.g., driven by the global header). */
  clearTypeFilter?: () => void;
  /** Shift / drawer shortcuts (cashier); opens modals in-place via {@link CashierPosShiftLinksProps.onShortcut}. */
  posShiftLinks: CashierPosShiftLinksProps | null;

  /** Multi-cart tab strip data. */
  cartTabs: {
    id: string;
    label: string;
    itemCount: number;
    grandTotal: number;
    /** held = parked ticket, empty = blank lane, open = local cart with lines */
    kind: "held" | "empty" | "open";
    /** Age in ms for stale held-sale cues. */
    ageMs: number;
    /** Server-sync status for the active cart (idle = synced). */
    syncStatus?: string;
  }[];
  activeCartId: string;
  canCreateCart: boolean;
  onCreateCart: () => void;
  onSwitchCart: (id: string) => void;
  onRemoveCart: (id: string) => void;
  /** When true, cart quantity is not capped by on-hand stock. */
  allowNegativeStock?: boolean;
  /** Override shelf unit prices (permission or admin flag). */
  allowPriceEdit?: boolean;
  /**
   * Admins with pricing.sell_price.set may also write the shelf price
   * when editing a cart line from POS.
   */
  canPersistShelfPrice?: boolean;
  /** Quick-create products from POS. */
  allowCreateProduct?: boolean;
  /**
   * Owners/admins may upload product photos from shelf tiles when the
   * business setting is enabled.
   */
  allowAddPhoto?: boolean;
  /** Optimistic thumbnail update after a successful POS photo upload. */
  onProductPhotoUploaded?: (itemId: string, imageUrl: string) => void;
  /** Create suppliers from POS (cashier modal). */
  allowCreateSupplier?: boolean;
  /** Link catalog products to suppliers from POS. */
  allowLinkSupplierProducts?: boolean;
  /** Receive / post Path B supplies from POS. */
  allowReceiveSupply?: boolean;
  /** View / propose credit tab clearances from POS. */
  allowCreditTabs?: boolean;
  /** Add lines to the shared order pad. */
  allowOrderPad?: boolean;
  /** Confirm Path A purchase orders from the till. */
  allowOrderConfirm?: boolean;
  /** Offer the airtime chip — the panel hides itself if airtime is switched off. */
  allowAirtime?: boolean;
  /** Mark cart lines as sold by weight (permission or admin flag). */
  allowWeighedToggle?: boolean;
  weighedToggleBusyItemId?: string | null;
  onToggleWeighed?: (lineKey: string) => void;
  itemTypes?: ItemTypeRecord[];
  preferredItemTypeId?: string | null;

  cart: Pick<
    CashierCartDrawerProps,
    | "lines"
    | "grandTotal"
    | "payableTotal"
    | "removeLine"
    | "updateLine"
    | "payMethod"
    | "setPayMethod"
    | "kioskPayAvailable"
    | "kioskPayHint"
    | "mpesaRef"
    | "setMpesaRef"
    | "splitPay"
    | "setSplitPay"
    | "cashSplitStr"
    | "setCashSplitStr"
    | "mpesaSplitStr"
    | "setMpesaSplitStr"
    | "splitMpesaRef"
    | "setSplitMpesaRef"
    | "walletSplitStr"
    | "setWalletSplitStr"
    | "cashTenderStr"
    | "setCashTenderStr"
    | "creditChangeToWallet"
    | "setCreditChangeToWallet"
    | "canLookupCustomers"
    | "canManageCustomers"
    | "canCreateRemoteBill"
    | "customerPhoneQuery"
    | "setCustomerPhoneQuery"
    | "customerHits"
    | "customerNoPhoneMatch"
    | "customerRegisterName"
    | "setCustomerRegisterName"
    | "customerSearchBusy"
    | "customerRegisterBusy"
    | "phoneVerificationSent"
    | "phoneVerificationCode"
    | "setPhoneVerificationCode"
    | "phoneVerificationChannel"
    | "phoneVerificationCooldownUntil"
    | "requirePhoneVerificationForNewTabCustomers"
    | "allowSearchCustomersByName"
    | "onSearchCustomers"
    | "onSendPhoneVerification"
    | "onRegisterCustomer"
    | "selectedCustomer"
    | "setSelectedCustomer"
    | "onComplete"
    | "canCompleteSale"
    | "loading"
    | "outboxCount"
    | "outboxBusy"
    | "onRetryOutbox"
    | "error"
    | "notice"
    | "canVoid"
    | "lastSale"
    | "lastReceipt"
    | "lastSaleCustomerName"
    | "stkAreaCode"
    | "setStkAreaCode"
    | "stkPhone"
    | "setStkPhone"
    | "stkPushStatus"
    | "stkPushError"
    | "stkLockedAmount"
    | "onStkPush"
    | "onCancelInFlightMpesa"
    | "voidNotes"
    | "setVoidNotes"
    | "onVoidLastSale"
    | "voidLoading"
    | "onDownloadReceiptPdf"
    | "receiptLoading"
    | "onStartNewSale"
    | "receiptPrinter"
  >;
};

function tileShelfLine(
  online: boolean,
  prices: Record<string, string>,
  id: string,
  copy: Pick<CashierPosUiCopy, "tileShelfLoading" | "tileShelfEmpty">,
): string {
  if (!online) return copy.tileShelfEmpty;
  if (!(id in prices)) return copy.tileShelfLoading;
  return prices[id] ? prices[id] : copy.tileShelfEmpty;
}

/** Shelf price under the title — supporting, never overlaid on the photo. */
function KioskTileShelfPrice({
  shelfLine,
  compact = false,
}: {
  shelfLine: string;
  compact?: boolean;
}) {
  const { amount, code } = splitShelfPriceDisplay(shelfLine);
  if (!amount) {
    if (!shelfLine.trim()) return null;
    return (
      <p
        className={cn(
          "truncate tabular-nums text-muted-foreground",
          compact ? "text-[9px]" : "text-[10px]",
        )}
      >
        {shelfLine}
      </p>
    );
  }
  return (
    <p
      className={cn(
        "inline-flex max-w-full items-baseline gap-0.5 truncate tabular-nums text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_72%,transparent)] dark:text-muted-foreground",
        compact ? "text-[10px]" : "text-[11px]",
      )}
    >
      <span className="font-semibold leading-none">{amount}</span>
      {code ? (
        <span className="text-[8px] font-medium uppercase tracking-[0.12em] opacity-70">
          {code}
        </span>
      ) : null}
    </p>
  );
}

/** In-cart qty chip — cart glyph + count (not brand green / not a “rank”). */
function KioskTileCartQty({
  cartQty,
  justAdded,
}: {
  cartQty: number;
  justAdded: boolean;
}) {
  if (cartQty <= 0) return null;
  return (
    <span
      key={cartQty}
      className={cn(
        "pos-tile-qty-badge absolute right-1.5 top-1.5 z-[2] inline-flex h-5 items-center gap-0.5 px-1.5 text-[10px] font-semibold tabular-nums",
        "bg-[var(--pos-ink,#1c1915)] text-[#f7f3eb]",
        "dark:bg-neutral-950 dark:text-white",
        justAdded && "outline outline-1 outline-offset-1 outline-[var(--pos-primary)]",
      )}
      title={`${cartQty} in cart — tap to add another`}
    >
      <ShoppingCart className="size-2.5 shrink-0 opacity-90" aria-hidden />
      <span>{cartQty > 99 ? "99+" : cartQty}</span>
    </span>
  );
}

function tileStockTone(item: ItemSummaryRecord): "out" | "low" | null {
  if (isPosPackageSellRow(item)) {
    const pkgs = posAvailablePackages(item);
    if (pkgs == null) return null;
    if (pkgs <= 0) return "out";
    if (pkgs <= 3) return "low";
    return null;
  }
  const raw = item.stockQty;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return "out";
  if (n <= 5) return "low";
  return null;
}

function KioskTileStockCue({ tone }: { tone: "out" | "low" | null }) {
  if (!tone) return null;
  return (
    <span
      className={cn(
        "pointer-events-none absolute left-1.5 top-1.5 z-[2] px-1 py-px text-[8px] font-semibold uppercase tracking-wide",
        tone === "out"
          ? "bg-[var(--pos-ink,#1c1915)] text-[#f7f3eb]"
          : "bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] text-[var(--pos-ink,#1c1915)]",
      )}
    >
      {tone === "out" ? "Out" : "Low"}
    </span>
  );
}

/**
 * Camera control only — the file input lives on CashierPosLayout so search
 * result remounts cannot kill an in-flight picker, and so we can blur the
 * focused search field before opening it (iOS/Safari swallows hidden
 * file-input clicks while a text field is focused).
 */
function KioskTileAddPhotoButton({
  itemName,
  compact,
  uploading,
  onOpenPicker,
}: {
  itemName: string;
  compact: boolean;
  uploading: boolean;
  onOpenPicker: () => void;
}) {
  return (
    <button
      type="button"
      disabled={uploading}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenPicker();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "pointer-events-auto absolute z-[3] flex items-center justify-center rounded-md border border-white/50 bg-black/55 text-white shadow-sm backdrop-blur-[1px] transition-colors hover:bg-black/70 disabled:opacity-70",
        compact
          ? "right-0.5 bottom-0.5 size-6"
          : "right-1 bottom-1 size-7 sm:size-8",
      )}
      aria-label={`Add photo for ${itemName}`}
      title="Add photo"
    >
      {uploading ? (
        <Loader2
          className={cn(compact ? "size-3" : "size-3.5", "animate-spin")}
        />
      ) : (
        <Camera className={cn(compact ? "size-3" : "size-3.5")} />
      )}
    </button>
  );
}

/** Tile chrome with a sibling pick-button so the camera is not nested in a <button>. */
function PosTileFrame({
  onPick,
  ariaLabel,
  title,
  className,
  children,
}: {
  onPick: () => void;
  ariaLabel: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        KIOSK_TILE_SHELL,
        "focus-within:border-[color-mix(in_srgb,var(--pos-primary)_40%,transparent)]",
        className,
      )}
      onClick={onPick}
    >
      <button
        type="button"
        className="absolute inset-0 z-0"
        aria-label={ariaLabel}
        title={title}
      />
      <div className="pointer-events-none relative z-[1] flex h-full min-h-0 flex-col">
        {children}
      </div>
    </div>
  );
}

function KioskTileMedia({
  title,
  thumb,
  cartQty,
  justAdded,
  stockTone,
  compact = false,
  canAddPhoto = false,
  itemId,
  photoUploading = false,
  onOpenPhotoPicker,
}: {
  title: string;
  thumb: string | null;
  cartQty: number;
  justAdded: boolean;
  stockTone: "out" | "low" | null;
  compact?: boolean;
  canAddPhoto?: boolean;
  itemId?: string;
  photoUploading?: boolean;
  onOpenPhotoPicker?: () => void;
}) {
  const showAddPhoto =
    canAddPhoto && Boolean(itemId) && Boolean(onOpenPhotoPicker);

  return (
    <div
      className={cn(
        "relative w-full shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] dark:border-border/40 dark:from-muted/30 dark:to-muted/50",
        compact ? "aspect-square" : "aspect-[4/3]",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute left-0 top-0 z-[1] h-full w-[3px] transition-opacity duration-200",
          cartQty > 0
            ? "bg-[var(--pos-ink,#1c1915)] opacity-100"
            : "bg-[var(--pos-primary)] opacity-0 group-hover:opacity-100",
        )}
        aria-hidden
      />
      {thumb ? (
        <Image
          src={thumb}
          alt=""
          fill
          sizes={
            compact
              ? "(max-width: 640px) 22vw, (max-width: 1024px) 12vw, 90px"
              : "(max-width: 640px) 34vw, (max-width: 1024px) 18vw, 140px"
          }
          className={cn(
            "object-contain transition-transform duration-300 group-hover:scale-[1.04]",
            compact ? "p-0.5" : "p-1.5",
          )}
          unoptimized
        />
      ) : (
        <span
          className={cn(
            "flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br",
            kioskPlaceholderWashClass(title),
          )}
          aria-hidden
        >
          <Package
            className={cn(
              "opacity-55",
              compact ? "size-5" : "size-7 sm:size-8",
            )}
            strokeWidth={1.5}
          />
        </span>
      )}
      <KioskTileCartQty cartQty={cartQty} justAdded={justAdded} />
      <KioskTileStockCue tone={stockTone} />
      {showAddPhoto && !thumb ? (
        <KioskTileAddPhotoButton
          itemName={title}
          compact={compact}
          uploading={photoUploading}
          onOpenPicker={onOpenPhotoPicker!}
        />
      ) : null}
    </div>
  );
}

function KioskTileTitle({
  primary,
  option,
  fullTitle,
  shelfLine,
  highValue = false,
  compact = false,
}: {
  primary: string;
  option: string | null;
  fullTitle: string;
  shelfLine: string;
  highValue?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="relative min-w-0 space-y-0.5">
      <p
        className={cn(
          "text-left leading-snug tracking-tight text-[var(--pos-ink,#1c1915)] dark:text-neutral-50",
          compact
            ? "line-clamp-3 text-[11px] font-semibold sm:text-[12px]"
            : "line-clamp-3 text-[12px] font-semibold sm:text-[13px]",
        )}
      >
        {primary}
      </p>
      {option ? (
        <p
          className={cn(
            "text-left font-bold leading-snug text-[var(--pos-ink,#1c1915)] dark:text-neutral-100",
            compact
              ? "line-clamp-2 text-[10px] sm:text-[11px]"
              : "line-clamp-2 text-[11px] sm:text-[12px]",
          )}
        >
          {option}
        </p>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <KioskTileShelfPrice shelfLine={shelfLine} compact={compact} />
        {highValue ? (
          <span
            className={cn(
              "shrink-0 font-semibold uppercase tracking-[0.06em] text-muted-foreground",
              compact ? "text-[8px]" : "text-[9px]",
            )}
            title="Confirm price — high-value item"
          >
            Confirm
          </span>
        ) : null}
      </div>
      {/* Hover/focus reveal for truncated near-duplicates. */}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-[calc(100%+0.25rem)] left-0 z-20 hidden max-w-[14rem] bg-[var(--pos-ink,#1c1915)] px-2 py-1.5 text-left text-[11px] font-medium leading-snug text-[#f7f3eb]",
          "group-hover:block group-focus-visible:block",
        )}
      >
        {fullTitle}
        {shelfLine ? ` · ${shelfLine}` : ""}
      </span>
    </div>
  );
}

function TopSellerTile({
  product,
  onPick,
  shelfLine,
  highValue = false,
  cartQty,
  justAdded,
  compact = false,
  canAddPhoto = false,
  photoUploading = false,
  onOpenPhotoPicker,
}: {
  product: TopProductRecord;
  onPick: () => void;
  shelfLine: string;
  highValue?: boolean;
  cartQty: number;
  justAdded: boolean;
  compact?: boolean;
  canAddPhoto?: boolean;
  photoUploading?: boolean;
  onOpenPhotoPicker?: (itemId: string, itemName: string) => void;
}) {
  const itemLike: ItemSummaryRecord = {
    id: product.id,
    name: product.name,
    sku: product.sku ?? "",
    variantName: product.variantName ?? undefined,
    brand: product.brand ?? undefined,
    size: product.size ?? undefined,
    packageVariant: product.packageVariant,
    packageUnitsPerSale: product.packageUnitsPerSale ?? undefined,
    variantOfItemId: product.variantOfItemId ?? undefined,
    thumbnailUrl: product.thumbnailUrl ?? null,
    stockQty: product.stockQty ?? undefined,
  };
  const { primary, option } = cashierItemTitleParts(itemLike);
  const title = cashierItemPrimaryLabel(itemLike);
  const thumb = posTileThumbUrl(product.name, product.thumbnailUrl);
  const stockTone = tileStockTone(itemLike);
  return (
    <PosTileFrame
      onPick={onPick}
      title={title}
      ariaLabel={
        cartQty > 0
          ? `${title}, ${cartQty} in cart. Tap to add another. ${shelfLine}`
          : `Add ${title}, ${shelfLine}`
      }
      className={cn(
        cartQty > 0 &&
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_45%,var(--card))]",
        stockTone === "out" && "opacity-70",
      )}
    >
      <KioskTileMedia
        title={title}
        thumb={thumb}
        cartQty={cartQty}
        justAdded={justAdded}
        stockTone={stockTone}
        compact={compact}
        canAddPhoto={canAddPhoto}
        itemId={product.id}
        photoUploading={photoUploading}
        onOpenPhotoPicker={
          onOpenPhotoPicker
            ? () => onOpenPhotoPicker(product.id, title)
            : undefined
        }
      />
      <div
        className={cn(
          "flex flex-1 flex-col justify-center",
          compact
            ? "min-h-[3.1rem] px-1 pb-1 pt-0.5"
            : "min-h-[4rem] px-2 pb-2 pt-1.5",
        )}
      >
        <KioskTileTitle
          primary={primary}
          option={option}
          fullTitle={title}
          shelfLine={shelfLine}
          highValue={highValue}
          compact={compact}
        />
      </div>
    </PosTileFrame>
  );
}

function SearchHitTile({
  item,
  onPick,
  shelfLine,
  highValue = false,
  showCategory,
  cartQty,
  justAdded,
  compact = false,
  canAddPhoto = false,
  photoUploading = false,
  onOpenPhotoPicker,
}: {
  item: ItemSummaryRecord;
  onPick: () => void;
  shelfLine: string;
  highValue?: boolean;
  showCategory: boolean;
  cartQty: number;
  justAdded: boolean;
  compact?: boolean;
  canAddPhoto?: boolean;
  photoUploading?: boolean;
  onOpenPhotoPicker?: (itemId: string, itemName: string) => void;
}) {
  const thumb = posTileThumbUrl(item.name, itemListThumbnailUrl(item));
  const { primary, option } = cashierItemTitleParts(item);
  const title = cashierItemPrimaryLabel(item);
  const categoryLabel = item.categoryName?.trim() || "Menu";
  const stockTone = tileStockTone(item);
  return (
    <PosTileFrame
      onPick={onPick}
      title={title}
      ariaLabel={
        cartQty > 0
          ? `${title}, ${cartQty} in cart. Tap to add another. ${shelfLine}`
          : `Add ${title} to cart, ${shelfLine}`
      }
      className={cn(
        cartQty > 0 &&
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_45%,var(--card))]",
        stockTone === "out" && "opacity-70",
      )}
    >
      <KioskTileMedia
        title={title}
        thumb={thumb}
        cartQty={cartQty}
        justAdded={justAdded}
        stockTone={stockTone}
        compact={compact}
        canAddPhoto={canAddPhoto}
        itemId={item.id}
        photoUploading={photoUploading}
        onOpenPhotoPicker={
          onOpenPhotoPicker
            ? () => onOpenPhotoPicker(item.id, title)
            : undefined
        }
      />
      <div
        className={cn(
          "flex flex-1 flex-col justify-center gap-1",
          compact
            ? "min-h-[3.1rem] px-1 pb-1 pt-0.5"
            : "min-h-[4rem] px-2 pb-2 pt-1.5",
          showCategory && (compact ? "min-h-[3.75rem]" : "min-h-[4.5rem]"),
        )}
      >
        <KioskTileTitle
          primary={primary}
          option={option}
          fullTitle={title}
          shelfLine={shelfLine}
          highValue={highValue}
          compact={compact}
        />
        {showCategory ? (
          <span className="max-w-full truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            {categoryLabel}
          </span>
        ) : null}
      </div>
    </PosTileFrame>
  );
}

export function CashierPosLayout(props: CashierPosLayoutProps) {
  const {
    pageTitle = "Point of sale",
    checkoutCompletedKey = 0,
    checkoutDrawerOpen,
    onCheckoutDrawerOpenChange,
    embeddedInDashboard = false,
    brandTheme,
    online,
    offlineBanner,
    tillPrinterStatus,
    currency,
    uiCopy,
    activeBranchName,
    branchesLoading,
    branchSelected,
    branchId,
    businessId,
    onStalePosItem,
    dialogBrandTheme,
    search,
    setSearch,
    hits,
    searchBanner,
    topProducts,
    topProductsLoading = false,
    topProductsTitle = "Top sellers",
    topProductsSubtitle = "Tap · ranked on this register",
    alwaysShowTopProducts = false,
    addLine,
    onAddAirtimeToCart,
    canBrowseCategories,
    visibleCategoryTiles,
    categoryBrowseStack,
    setCategoryBrowseStack,
    applySubtreeFilter,
    clearCategoryFilter,
    categoryFilterId,
    categoryFilterLabel,
    categoryTreeBusy,
    categoryBrowseParentId,
    keepAisleFilter = false,
    onKeepAisleFilterChange,
    typeFilterId,
    typeFilterLabel,
    clearTypeFilter,
    posShiftLinks,
    cartTabs,
    activeCartId,
    canCreateCart,
    onCreateCart,
    onSwitchCart,
    onRemoveCart,
    allowNegativeStock = false,
    allowPriceEdit = false,
    canPersistShelfPrice = false,
    allowCreateProduct = false,
    allowAddPhoto = false,
    onProductPhotoUploaded,
    allowCreateSupplier = false,
    allowLinkSupplierProducts = false,
    allowReceiveSupply = false,
    allowCreditTabs = false,
    allowOrderPad = false,
    allowOrderConfirm = false,
    allowAirtime = false,
    allowWeighedToggle = false,
    weighedToggleBusyItemId = null,
    onToggleWeighed,
    itemTypes = [],
    preferredItemTypeId = null,
    cart,
  } = props;

  const [pickedItem, setPickedItem] = useState<ItemSummaryRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const setCheckoutDrawerOpen = useCallback(
    (open: boolean) => {
      onCheckoutDrawerOpenChange(open);
    },
    [onCheckoutDrawerOpenChange],
  );
  const drawerOpen = checkoutDrawerOpen;
  const [pulseCart, setPulseCart] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [suppliersOpen, setSuppliersOpen] = useState(false);
  const [receiveTillOpen, setReceiveTillOpen] = useState(false);
  const [receiveTillSupplier, setReceiveTillSupplier] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [creditTabsOpen, setCreditTabsOpen] = useState(false);
  const [orderPadOpen, setOrderPadOpen] = useState(false);
  const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
  const [editPriceKey, setEditPriceKey] = useState<string | null>(null);
  const allowManageSuppliers =
    allowCreateSupplier || allowLinkSupplierProducts || allowReceiveSupply;
  const [tileShelfPrices, setTileShelfPrices] = useState<
    Record<string, string>
  >({});
  const isLg = useMediaLg();
  const compactShelf = !embeddedInDashboard;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoRef = useRef<{ itemId: string; itemName: string } | null>(
    null,
  );
  const [photoUploadingId, setPhotoUploadingId] = useState<string | null>(null);

  const focusSearch = useCallback((select = false) => {
    const el = searchInputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    if (select) {
      el.select();
    }
  }, []);

  const openProductPhotoPicker = useCallback((itemId: string, itemName: string) => {
    pendingPhotoRef.current = { itemId, itemName };
    // iOS/Safari (and some Android WebViews) ignore programmatic file-input
    // clicks while a text field — here, POS search — still has focus.
    searchInputRef.current?.blur();
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== photoFileInputRef.current) {
      active.blur();
    }
    photoFileInputRef.current?.click();
  }, []);

  const handleProductPhotoFile = useCallback(
    async (file: File | null | undefined) => {
      const pending = pendingPhotoRef.current;
      pendingPhotoRef.current = null;
      if (photoFileInputRef.current) photoFileInputRef.current.value = "";
      if (!file || !pending) return;
      const looksLikeImage =
        file.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name);
      if (!looksLikeImage) {
        toast.error("Choose a photo (JPG, PNG, or HEIC).");
        return;
      }
      setPhotoUploadingId(pending.itemId);
      try {
        const saved = await uploadItemImageFile(pending.itemId, file, {
          altText: pending.itemName,
          primary: true,
        });
        const url = saved.secureUrl?.trim();
        if (!url) {
          toast.error("Upload finished but no image URL was returned.");
          return;
        }
        onProductPhotoUploaded?.(pending.itemId, url);
        toast.success("Photo added");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not upload photo");
      } finally {
        setPhotoUploadingId(null);
      }
    },
    [onProductPhotoUploaded],
  );

  const tillLock = useOptionalPosTillLock();
  const tillLocked = tillLock?.locked === true;

  const scanToCartEnabled = useFeatureFlag(
    POS_CASHIER_CAPABILITY_FLAGS.scanToCart,
  );
  const catalogHybrid = useFeatureFlag(
    POS_CASHIER_CAPABILITY_FLAGS.catalogHybrid,
  );

  const markAdded = useCallback(
    (itemId: string) => {
      setPulseCart(true);
      setJustAddedId(itemId);
      window.setTimeout(() => {
        setJustAddedId((cur) => (cur === itemId ? null : cur));
      }, 700);
      if (!isLg) {
        setCheckoutDrawerOpen(true);
      } else {
        // Keep the wedge / keyboard ready for the next scan.
        window.requestAnimationFrame(() => focusSearch(true));
      }
    },
    [isLg, setCheckoutDrawerOpen, focusSearch],
  );

  // Guard against concurrent barcode resolves (wedge can fire faster than fetch).
  const barcodeResolveBusyRef = useRef(false);

  const applyBarcodeSearch = useCallback(
    (code: string) => {
      if (tillLocked) return;
      const trimmed = code.trim();
      if (!trimmed) return;

      // ── Special-code guard: delegate to existing handlers ──
      if (/^GI-/i.test(trimmed)) {
        setSearch(trimmed);
        window.requestAnimationFrame(() => focusSearch(true));
        return;
      }

      // ── Scan-to-cart: resolve barcode, auto-add on single match ──
      if (
        scanToCartEnabled &&
        online &&
        branchId &&
        !barcodeResolveBusyRef.current
      ) {
        barcodeResolveBusyRef.current = true;
        const bid = branchId.trim();
        void (async () => {
          let shouldFillSearch = false;
          try {
            const items = await fetchItems(undefined, {
              barcode: trimmed,
              catalogScope: "SKUS_ONLY",
              softAuth: true,
              branchId: bid,
            });
            const sellable = items.filter((row) => !row.groupLabelOnly);

            if (sellable.length === 1) {
              const item = sellable[0]!;
              // Try tile price cache first, then fetch shelf price
              const cachedLabel = tileShelfPrices[item.id] ?? "";
              const shelfLabel: string =
                cachedLabel ||
                (await fetchPosShelfPrice(item.id, bid, {
                  businessId,
                  onStaleItem: onStalePosItem,
                }).then((sp) => {
                  if (!sp) return "";
                  const label =
                    formatShelfPriceLabel(sp.price, currency) ?? "";
                  if (label) {
                    setTileShelfPrices((prev) => ({
                      ...prev,
                      [item.id]: label,
                    }));
                  }
                  return label;
                }));

              const shelfAmount = shelfLabel
                ? shelfPriceToInputString(
                    splitShelfPriceDisplay(shelfLabel).amount,
                  )
                : "";
              if (shelfAmount) {
                const added = addLine(item, 1, shelfAmount);
                if (added) {
                  markAdded(item.id);
                  return; // success — silent add, done
                }
                // addLine returned false (e.g. stock cap) — fill search
              } else {
                // No shelf price → open product modal for cashier to set price
                setPickedItem(item);
                setModalOpen(true);
                return;
              }
            } else if (sellable.length === 0) {
              toast.error("Barcode not found in catalog", { duration: 2500 });
            }
            // 0 or 2+ matches → fill search so cashier can pick
            shouldFillSearch = true;
          } catch {
            toast.error("Could not look up barcode", { duration: 2500 });
            shouldFillSearch = true;
          } finally {
            barcodeResolveBusyRef.current = false;
          }
          if (shouldFillSearch) {
            setSearch(trimmed);
            window.requestAnimationFrame(() => focusSearch(true));
          }
        })();
        return;
      }

      // ── Fallback: fill search (original behaviour) ──
      setSearch(trimmed);
      window.requestAnimationFrame(() => focusSearch(true));
    },
    [
      tillLocked,
      scanToCartEnabled,
      online,
      branchId,
      setSearch,
      focusSearch,
      addLine,
      tileShelfPrices,
      currency,
      businessId,
      onStalePosItem,
      markAdded,
    ],
  );

  usePosBarcodeWedge({
    enabled:
      !tillLocked &&
      !drawerOpen &&
      !modalOpen &&
      !showScanner &&
      !createProductOpen &&
      !suppliersOpen &&
      !receiveTillOpen &&
      !creditTabsOpen &&
      !orderPadOpen &&
      !orderConfirmOpen &&
      editPriceKey == null,
    onScan: applyBarcodeSearch,
    searchInputRef,
  });

  useEffect(() => {
    if (tillLocked) {
      return;
    }
    focusSearch();
  }, [focusSearch, tillLocked]);

  const hitIdsKey = useMemo(
    () =>
      [...hits]
        .map((h) => h.id)
        .sort()
        .join(","),
    [hits],
  );
  const topIdsKey = useMemo(
    () =>
      [...topProducts]
        .map((p) => p.id)
        .sort()
        .join(","),
    [topProducts],
  );

  const cartQtyByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart.lines) {
      const q = Number(line.quantity);
      if (!Number.isFinite(q) || q <= 0) continue;
      map.set(line.itemId, (map.get(line.itemId) ?? 0) + q);
    }
    return map;
  }, [cart.lines]);

  const shelfPeerAmounts = useMemo(() => {
    const amounts: number[] = [];
    for (const line of Object.values(tileShelfPrices)) {
      const n = parseShelfAmount(line);
      if (n != null && n > 0) amounts.push(n);
    }
    return amounts;
  }, [tileShelfPrices]);

  const isHighValueTile = useCallback(
    (shelfLine: string) => {
      const n = parseShelfAmount(shelfLine);
      if (n == null) return false;
      return isHighValueShelfPrice(n, shelfPeerAmounts);
    },
    [shelfPeerAmounts],
  );

  const sharedCategoryLabel = useMemo(() => {
    if (hits.length < 2) return null;
    const first = hits[0]?.categoryName?.trim() || "";
    if (!first) return null;
    return hits.every((h) => (h.categoryName?.trim() || "") === first)
      ? first
      : null;
  }, [hits]);

  const hasSearch =
    search.trim().length > 0 ||
    categoryFilterId != null ||
    Boolean(typeFilterId?.trim());
  const showCatalog = !hasSearch;

  const [variantPicker, setVariantPicker] = useState<
    | {
        parent: ItemSummaryRecord;
        /** Detail already fetched (chip parent check) so the picker skips its own fetch. */
        preloaded?: ItemDetailRecord;
      }
    | null
  >(null);
  /** Session cache of "is this item a group-label parent?" from chip lookups. */
  const parentCheckCache = useRef(new Map<string, boolean>());

  const handlePickItem = (item: ItemSummaryRecord, presetShelfLine?: string) => {
    if (item.groupLabelOnly) {
      // Non-sellable family header — open the size picker instead of a dead tap.
      setVariantPicker({ parent: item });
      return;
    }
    const shelfLine = presetShelfLine ?? tileShelfPrices[item.id];
    const shelfAmount = shelfLine
      ? shelfPriceToInputString(splitShelfPriceDisplay(shelfLine).amount)
      : "";
    const canQuickAdd =
      Boolean(shelfAmount) && online && !isPosPackageSellRow(item);
    if (canQuickAdd) {
      const added = addLine(item, 1, shelfAmount);
      if (added) {
        markAdded(item.id);
      }
      return;
    }
    setPickedItem(item);
    setModalOpen(true);
  };

  /**
   * Pick from a top-product chip/tile. Chips never carry `groupLabelOnly`
   * (`TopProductRecord` has no such field), so for rows without a variant
   * parent we lazily check the catalog once per session: a group-label parent
   * opens the size picker instead of adding a non-sellable family header.
   */
  const handleTopProductPick = (product: TopProductRecord) => {
    const item: ItemSummaryRecord = {
      id: product.id,
      name: product.name,
      sku: product.sku ?? "",
      thumbnailUrl: product.thumbnailUrl ?? null,
      variantName: product.variantName ?? undefined,
      brand: product.brand ?? undefined,
      size: product.size ?? undefined,
      packageVariant: product.packageVariant,
      packageUnitsPerSale: product.packageUnitsPerSale ?? undefined,
      variantOfItemId: product.variantOfItemId ?? undefined,
      stockQty: product.stockQty ?? undefined,
    };
    // Known variant child — add it directly (matches tile behavior).
    if (product.variantOfItemId?.trim()) {
      handlePickItem(item);
      return;
    }
    const cached = parentCheckCache.current.get(product.id);
    if (cached !== undefined) {
      if (cached) {
        setVariantPicker({ parent: item });
      } else {
        handlePickItem(item);
      }
      return;
    }
    // Can't verify parent status without the catalog — keep today's behavior.
    if (!online || !branchId?.trim()) {
      handlePickItem(item);
      return;
    }
    void fetchItemById(product.id, { branchId: branchId.trim(), toast: false })
      .then((detail) => {
        const isParent = detail.groupLabelOnly === true;
        parentCheckCache.current.set(product.id, isParent);
        if (isParent) {
          setVariantPicker({ parent: item, preloaded: detail });
        } else {
          handlePickItem(item);
        }
      })
      .catch(() => {
        // Lookup failed (offline / stale row). Fall back to today's direct add
        // and don't re-check this item again this session.
        parentCheckCache.current.set(product.id, false);
        handlePickItem(item);
      });
  };

  const handleAddFromModal = (payload: CashierProductModalSubmit) => {
    const added = addLine(payload.item, payload.quantity, payload.unitPrice);
    setModalOpen(false);
    setPickedItem(null);
    if (added) {
      markAdded(payload.item.id);
    }
  };

  useEffect(() => {
    if (!pulseCart) return;
    const t = window.setTimeout(() => setPulseCart(false), 700);
    return () => window.clearTimeout(t);
  }, [pulseCart]);

  useEffect(() => {
    if (cart.error) {
      setCheckoutDrawerOpen(true);
    }
  }, [cart.error]);

  useEffect(() => {
    if (checkoutCompletedKey > 0) {
      setCheckoutDrawerOpen(false);
      window.requestAnimationFrame(() => focusSearch(true));
    }
  }, [checkoutCompletedKey, focusSearch]);

  useEffect(() => {
    if (!online) {
      setTileShelfPrices({});
      return;
    }
    const fromHits = hitIdsKey ? hitIdsKey.split(",") : [];
    const fromTop = topIdsKey ? topIdsKey.split(",") : [];
    const ids = Array.from(new Set([...fromHits, ...fromTop]));
    if (ids.length === 0) {
      setTileShelfPrices({});
      return;
    }
    let cancelled = false;
    const bid = branchId?.trim() || undefined;
    const shelfCtx = { businessId, onStaleItem: onStalePosItem };
    void Promise.all(
      ids.map(async (id) => {
        const r = await fetchPosShelfPrice(id, bid, shelfCtx);
        if (!r) {
          return [id, ""] as const;
        }
        const label = formatShelfPriceLabel(r.price, currency);
        return [id, label ?? ""] as const;
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setTileShelfPrices((prev) => {
        const next = { ...prev };
        for (const [id, v] of pairs) {
          next[id] = v;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [
    online,
    branchId,
    businessId,
    currency,
    hitIdsKey,
    topIdsKey,
    onStalePosItem,
  ]);

  usePosEvents({
    onPriceChanged: (frame) => {
      const itemId = String(frame.data.itemId ?? "");
      if (!itemId || !online) return;
      const bid = branchId?.trim() || undefined;
      void fetchPosShelfPrice(itemId, bid, {
        businessId,
        onStaleItem: onStalePosItem,
      }).then((r) => {
        if (!r) return;
        const label = formatShelfPriceLabel(r.price, currency);
        setTileShelfPrices((prev) => ({
          ...prev,
          [itemId]: label ?? "",
        }));
      });
    },
  });

  const cartFabBottomClass = embeddedInDashboard
    ? "bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-6"
    : "bottom-4 sm:bottom-6";

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1600px]",
        embeddedInDashboard
          ? "pos-market-paper max-w-none px-2 py-2 pb-28 sm:px-3 sm:py-3 lg:pb-6"
          : "flex h-full min-h-0 flex-1 flex-col overflow-hidden pb-28 lg:pb-0",
      )}
      style={brandTheme}
    >
      <div
        className={cn(
          "flex gap-3 lg:gap-4",
          embeddedInDashboard
            ? "items-start"
            : "h-full min-h-0 flex-1 items-stretch overflow-hidden",
        )}
      >
        <div
          className={cn(
            "min-w-0 flex-1",
            compactShelf ? "space-y-1.5" : "space-y-3 sm:space-y-4",
            !embeddedInDashboard &&
              "h-full min-h-0 overflow-y-auto overscroll-y-contain pr-0.5",
          )}
        >
      <section
        className={cn(
          "border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] dark:border-border/40",
          compactShelf ? "pb-1.5" : "pb-3",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="min-w-0">
            {compactShelf ? (
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="pos-market-section-label text-[0.95rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
                  {pageTitle}
                </h2>
                {branchesLoading ? (
                  <span className="text-[11px] text-muted-foreground">
                    Loading branches…
                  </span>
                ) : activeBranchName ? (
                  <span className="truncate text-[11px] text-muted-foreground">
                    {activeBranchName}
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-800 dark:text-amber-200">
                    Pick a branch in the top nav
                  </span>
                )}
              </div>
            ) : (
              <>
                <h2 className="pos-market-section-label flex items-center gap-2 text-xl leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground sm:text-2xl">
                  <span>{pageTitle}</span>
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--pos-primary)] opacity-80"
                    aria-hidden
                  />
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                  {branchesLoading ? (
                    "Loading branches…"
                  ) : activeBranchName ? (
                    <>
                      Selling at{" "}
                      <span className="font-semibold text-foreground">
                        {activeBranchName}
                      </span>
                    </>
                  ) : (
                    <span className="text-amber-800 dark:text-amber-200">
                      Pick a branch in the top nav to start.
                    </span>
                  )}
                </p>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {allowCreateProduct ? (
              <button
                type="button"
                onClick={() => setCreateProductOpen(true)}
                className={POS_PRIMARY_CHIP_CLASS}
              >
                <PackagePlus className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                Add product
              </button>
            ) : null}
            {allowManageSuppliers ? (
              <button
                type="button"
                onClick={() => setSuppliersOpen(true)}
                className={POS_PRIMARY_CHIP_CLASS}
              >
                <Truck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                Suppliers
              </button>
            ) : null}
            {allowCreditTabs ? (
              <button
                type="button"
                onClick={() => setCreditTabsOpen(true)}
                className={POS_PRIMARY_CHIP_CLASS}
              >
                <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                Tabs
              </button>
            ) : null}
            {allowOrderPad ? (
              <button
                type="button"
                onClick={() => setOrderPadOpen(true)}
                className={POS_PRIMARY_CHIP_CLASS}
              >
                <ShoppingCart className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                Order
              </button>
            ) : null}
            {allowOrderConfirm ? (
              <button
                type="button"
                onClick={() => setOrderConfirmOpen(true)}
                className={POS_PRIMARY_CHIP_CLASS}
              >
                <ClipboardCheck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                Confirm
              </button>
            ) : null}
            {allowAirtime ? (
              <AirtimeQuickAction
                triggerClassName={POS_PRIMARY_CHIP_CLASS}
                currency={currency}
                channel="POS"
                onAddToCart={onAddAirtimeToCart}
              />
            ) : null}
            {!online ? (
              <span className="border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {uiCopy.offlinePill}
              </span>
            ) : null}
            {posShiftLinks?.branchSelected && !posShiftLinks.shiftLoading ? (
              <div className="ml-1 flex flex-wrap items-center gap-1 border-l border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] pl-2.5 dark:border-border/50">
                {posShiftLinks.canDrawout && posShiftLinks.hasOpenShift ? (
                  <button
                    type="button"
                    onClick={() => posShiftLinks.onShortcut("new-drawout")}
                    className={POS_SECONDARY_CHIP_CLASS}
                  >
                    <Wallet className="size-3.5 shrink-0" aria-hidden />
                    Drawout
                  </button>
                ) : null}
                {posShiftLinks.canOpenShift && !posShiftLinks.hasOpenShift ? (
                  <button
                    type="button"
                    onClick={() => posShiftLinks.onShortcut("open-shift")}
                    className={POS_PRIMARY_CHIP_CLASS}
                  >
                    <PlusCircle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    Open shift
                  </button>
                ) : null}
                {posShiftLinks.canCloseShift && posShiftLinks.hasOpenShift ? (
                  <button
                    type="button"
                    onClick={() => posShiftLinks.onShortcut("close-shift")}
                    className={cn(
                      POS_SHIFT_CHIP_CLASS,
                      "border-transparent text-destructive/80 hover:border-destructive/25 hover:text-destructive",
                    )}
                  >
                    <LogOut className="size-3.5 shrink-0" aria-hidden />
                    Close shift
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {offlineBanner ? (
          <p className="mt-2 text-[10px] leading-snug text-amber-800 dark:text-amber-200">
            {offlineBanner}
          </p>
        ) : null}
        {tillPrinterStatus ? (
          <div className="mt-2 print:hidden">{tillPrinterStatus}</div>
        ) : null}
      </section>

      {/* ── Sticky cart tabs + search ───────────────────────────── */}
      <div
        className={cn(
          "sticky z-20 -mx-1 space-y-1 sm:-mx-0",
          embeddedInDashboard ? "top-[3.5rem]" : "top-0",
        )}
      >
      {cartTabs.length > 0 ? (
          <div
            className={cn(
              "flex items-center gap-1.5 overflow-x-auto px-1 py-1.5",
              "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_88%,transparent)]",
              "supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_78%,transparent)] supports-[backdrop-filter]:backdrop-blur-sm",
              "border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] dark:border-border/40 dark:bg-background/85",
            )}
          >
            {([...cartTabs] as typeof cartTabs)
              .sort((a, b) => {
                // Active tab first, then held (stale first), then open, empty last.
                const rank = (t: (typeof cartTabs)[number]) => {
                  if (t.id === activeCartId) return 0;
                  if (t.kind === "held") return 1;
                  if (t.kind === "open") return 2;
                  return 3;
                };
                const d = rank(a) - rank(b);
                if (d !== 0) return d;
                if (a.kind === "held" && b.kind === "held") {
                  return b.ageMs - a.ageMs;
                }
                return 0;
              })
              .map((tab) => {
              const isActive = tab.id === activeCartId;
              const hasItems = tab.itemCount > 0;
              const veryStale =
                tab.kind === "held" && tab.ageMs >= CART_VERY_STALE_MS;
              const stale =
                tab.kind === "held" && tab.ageMs >= CART_STALE_MS;
              const role = isActive
                ? "Open"
                : tab.kind === "held"
                  ? stale
                    ? "Stale"
                    : "Held"
                  : tab.kind === "empty"
                    ? "Spare"
                    : "Parked";
              const totalLabel = Number.isFinite(tab.grandTotal)
                ? tab.grandTotal.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })
                : "0";
              return (
                <div
                  key={tab.id}
                  className={cn(
                    "pos-market-ticket group relative flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                    isActive
                      ? "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_22%,transparent)] bg-card text-foreground"
                      : veryStale || stale
                        ? "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-transparent text-foreground"
                        : tab.kind === "held"
                          ? "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-transparent text-foreground"
                          : tab.kind === "empty"
                            ? "border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-transparent text-muted-foreground"
                            : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSwitchCart(tab.id)}
                    className="flex min-w-0 flex-col items-start gap-0.5 text-left"
                    title={
                      hasItems
                        ? `${role} ${tab.label} · ${tab.itemCount} items · ${totalLabel} ${currency}`
                        : `${role} · ${tab.label}`
                    }
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          isActive
                            ? "bg-[var(--pos-ink,#1c1915)]"
                            : veryStale || stale
                              ? "bg-muted-foreground"
                              : hasItems
                                ? "bg-muted-foreground/50"
                                : "bg-muted-foreground/25",
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "text-[9px] font-semibold uppercase tracking-[0.12em]",
                          veryStale || stale
                            ? "text-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {role}
                      </span>
                      <span className="truncate font-semibold tabular-nums">
                        {tab.label}
                      </span>
                      {tab.syncStatus && tab.kind !== "empty" ? (
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            tab.syncStatus === "idle"
                              ? "bg-emerald-500"
                              : tab.syncStatus === "syncing"
                                ? "animate-pulse bg-amber-500"
                                : "bg-red-500",
                          )}
                          title={
                            tab.syncStatus === "idle"
                              ? "Synced"
                              : tab.syncStatus === "syncing"
                                ? "Syncing…"
                                : tab.syncStatus === "error"
                                  ? "Sync error"
                                  : "Conflict"
                          }
                          aria-label={`Sync status: ${tab.syncStatus}`}
                        />
                      ) : null}
                    </span>
                    {hasItems ? (
                      <span className="pl-3 text-[10px] tabular-nums text-muted-foreground">
                        {tab.itemCount}{" "}
                        {tab.itemCount === 1 ? "item" : "items"} · {totalLabel}{" "}
                        {currency}
                      </span>
                    ) : null}
                  </button>
                  {cartTabs.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => onRemoveCart(tab.id)}
                      className="rounded p-0.5 text-muted-foreground/70 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                      aria-label={`Close ${tab.label}`}
                    >
                      <X className="size-3" />
                    </button>
                  ) : null}
                </div>
              );
            })}
            {canCreateCart ? (
              <button
                type="button"
                onClick={onCreateCart}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-[var(--pos-primary)] hover:text-foreground"
              >
                <PlusCircle className="size-3.5" />
                <span>New</span>
              </button>
            ) : null}
          </div>
      ) : null}

        <section
          className={cn(
            "py-1",
            "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_92%,transparent)]",
            "supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_82%,transparent)] supports-[backdrop-filter]:backdrop-blur-sm",
            "dark:bg-background/90",
          )}
        >
          <div
            className={cn(
              "group flex items-center gap-2 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-card pl-3.5 pr-1.5 transition-colors",
              "focus-within:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_22%,transparent)]",
              "dark:border-border/40 dark:bg-card/80",
            )}
          >
            <Search
              className="size-5 shrink-0 text-muted-foreground/75"
              aria-hidden
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground dark:text-muted-foreground"
              aria-label="Scan barcode with phone camera"
              title="Scan barcode with camera"
            >
              <ScanLine className="size-5" />
            </button>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                // HID scanners type into the focused search box and finish with
                // Enter. The wedge skips this input, so Enter must drive
                // scan-to-cart (or grocery invoice lookup) here.
                const q = e.currentTarget.value.trim();
                if (scanToCartEnabled && looksLikeScannedCode(q)) {
                  e.preventDefault();
                  applyBarcodeSearch(q);
                  return;
                }
                // Select so the next hardware scan replaces this code.
                window.requestAnimationFrame(() => focusSearch(true));
              }}
              placeholder={
                categoryFilterId
                  ? "Search within this aisle…"
                  : typeFilterId
                    ? "Search within this type…"
                    : catalogHybrid
                      ? "Search product, SKU or scan barcode…"
                      : "Search name, SKU, or scan barcode…"
              }
              className={cn(
                "flex-1 bg-transparent outline-none placeholder:text-muted-foreground/55",
                compactShelf
                  ? "h-9 text-sm"
                  : "h-12 text-[15px] sm:h-[3.25rem] sm:text-base",
              )}
              autoComplete="off"
              enterKeyHint="search"
              aria-label="Search products"
            />
            {search ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="text-muted-foreground"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
          {searchBanner ? (
            <p className="mt-2 px-0.5 text-[11px] text-amber-800 dark:text-amber-200">
              {searchBanner}
            </p>
          ) : null}
          {categoryFilterId ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 px-0.5 text-xs">
              <span className="bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] px-2.5 py-0.5 font-medium text-foreground">
                Aisle: {categoryFilterLabel ?? categoryFilterId}
              </span>
              <button
                type="button"
                onClick={clearCategoryFilter}
                className="text-muted-foreground underline-offset-2 hover:underline"
              >
                Clear aisle
              </button>
              {onKeepAisleFilterChange ? (
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground">
                  <input
                    type="checkbox"
                    className="size-3.5 border-border accent-[var(--pos-primary)]"
                    checked={keepAisleFilter}
                    onChange={(e) => onKeepAisleFilterChange(e.target.checked)}
                  />
                  Keep aisle after add
                </label>
              ) : null}
            </div>
          ) : null}
          {typeFilterId ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 px-0.5 text-xs">
              <span className="bg-muted px-2.5 py-0.5 font-medium text-foreground">
                Type: {typeFilterLabel ?? typeFilterId}
              </span>
              {clearTypeFilter ? (
                <button
                  type="button"
                  onClick={clearTypeFilter}
                  className="text-muted-foreground underline-offset-2 hover:underline"
                >
                  Clear type
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      {hasSearch ? (
        <section
          className={cn(
            "border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] dark:border-border/40",
            compactShelf ? "space-y-1.5 pt-1.5" : "space-y-2.5 pt-3",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <h3
              className={cn(
                "pos-market-section-label leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground",
                compactShelf ? "text-[0.95rem]" : "text-lg sm:text-xl",
              )}
            >
              {sharedCategoryLabel
                ? `${sharedCategoryLabel} — ${hits.length} result${hits.length === 1 ? "" : "s"}`
                : search.trim()
                  ? "Search results"
                  : categoryFilterId
                    ? "Aisle items"
                    : typeFilterId
                      ? "Type items"
                      : "Items"}
            </h3>
            {!sharedCategoryLabel && hits.length > 0 ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {hits.length} match{hits.length === 1 ? "" : "es"}
              </span>
            ) : null}
          </div>
          {hits.length === 0 ? (
            <div className="space-y-2">
              <p className="border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_50%,transparent)] py-7 text-center text-xs text-muted-foreground sm:py-8">
                {search.trim()
                  ? "No items match your search."
                  : categoryFilterId
                    ? "No items in this aisle."
                    : typeFilterId
                      ? "No items for this type."
                      : "No items."}
              </p>
              {!search.trim() && !categoryFilterId && !typeFilterId ? (
                <CashierFirstSaleDrawer
                  trigger={
                    <button
                      type="button"
                      className="group flex w-full items-center justify-center gap-2 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] bg-[color-mix(in_srgb,var(--card)_60%,transparent)] px-4 py-3 text-center text-xs font-semibold text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_55%,transparent)] transition hover:border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] hover:text-[var(--pos-primary,#0f766e)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="How to take your first sale — summary + full guide"
                    >
                      How to take your first sale
                      <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                    </button>
                  }
                />
              ) : null}
            </div>
          ) : catalogHybrid ? (
            <PosSearchHitList
              hits={hits}
              shelfPrices={Object.fromEntries(
                hits.map((item) => [
                  item.id,
                  tileShelfLine(online, tileShelfPrices, item.id, uiCopy),
                ]),
              )}
              cartQtyByItem={cartQtyByItem}
              justAddedId={justAddedId}
              currency={currency}
              sharedCategoryLabel={sharedCategoryLabel}
              onPick={handlePickItem}
            />
          ) : (
            <div
              className={cn(
                "grid gap-1.5 sm:gap-2",
                compactShelf
                  ? "grid-cols-4 gap-1 sm:grid-cols-5 sm:gap-1.5 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8"
                  : "grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
              )}
            >
              {hits.map((item) => {
                const shelfLine = tileShelfLine(
                  online,
                  tileShelfPrices,
                  item.id,
                  uiCopy,
                );
                return (
                <SearchHitTile
                  key={item.id}
                  item={item}
                  shelfLine={shelfLine}
                  highValue={isHighValueTile(shelfLine)}
                  showCategory={!sharedCategoryLabel}
                  cartQty={cartQtyByItem.get(item.id) ?? 0}
                  justAdded={justAddedId === item.id}
                  compact={compactShelf}
                  canAddPhoto={allowAddPhoto}
                  photoUploading={photoUploadingId === item.id}
                  onOpenPhotoPicker={
                    allowAddPhoto ? openProductPhotoPicker : undefined
                  }
                  onPick={() => handlePickItem(item)}
                />
              );
              })}
            </div>
          )}
        </section>
      ) : null}

      {showCatalog && (alwaysShowTopProducts || topProducts.length > 0) ? (
        catalogHybrid ? (
          <PosFrequentChips
            products={topProducts}
            loading={alwaysShowTopProducts && topProductsLoading}
            title="Frequently sold"
            subtitle="Based on this cashier's recent sales"
            cartQtyByItem={cartQtyByItem}
            justAddedId={justAddedId}
            onPick={handleTopProductPick}
          />
        ) : (
        <section
          aria-label="Top selling products"
          className={cn(
            "border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] dark:border-border/40",
            compactShelf ? "space-y-1.5 pt-1.5" : "space-y-3 pt-3",
          )}
        >
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              {compactShelf ? (
                <h3 className="pos-market-section-label text-[0.95rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
                  {topProductsTitle}
                </h3>
              ) : (
                <>
                  <h3 className="pos-market-section-label mt-0.5 text-lg leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground sm:text-xl">
                    {topProductsTitle}
                  </h3>
                  <p className="mt-1 truncate text-[11px] leading-tight text-muted-foreground">
                    Shelf prices · {topProductsSubtitle}
                  </p>
                </>
              )}
            </div>
          </div>
          {alwaysShowTopProducts && topProductsLoading ? (
            <div className="flex items-center justify-center gap-2 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_50%,transparent)] py-7 text-xs text-muted-foreground sm:py-8">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading top sellers…
            </div>
          ) : alwaysShowTopProducts && topProducts.length === 0 ? (
            <p className="border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_50%,transparent)] py-7 text-center text-xs text-muted-foreground sm:py-8">
              No sales yet — top sellers will appear here after the first sale.
            </p>
          ) : (
            <div
              className={cn(
                "grid gap-1.5 sm:gap-2",
                compactShelf
                  ? "grid-cols-4 gap-1 sm:grid-cols-5 sm:gap-1.5 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8"
                  : "grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5",
              )}
            >
              {topProducts.map((p) => {
                const shelfLine = tileShelfLine(online, tileShelfPrices, p.id, uiCopy);
                return (
                <TopSellerTile
                  key={p.id}
                  product={p}
                  shelfLine={shelfLine}
                  highValue={isHighValueTile(shelfLine)}
                  cartQty={cartQtyByItem.get(p.id) ?? 0}
                  justAdded={justAddedId === p.id}
                  compact={compactShelf}
                  canAddPhoto={allowAddPhoto}
                  photoUploading={photoUploadingId === p.id}
                  onOpenPhotoPicker={
                    allowAddPhoto ? openProductPhotoPicker : undefined
                  }
                  onPick={() => handleTopProductPick(p)}
                />
              );
              })}
            </div>
          )}
        </section>
        )
      ) : null}

      {showCatalog && canBrowseCategories ? (
        <section
          className={cn(
            "border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] dark:border-border/40",
            compactShelf ? "mt-2 space-y-1.5 pt-2" : "mt-3 space-y-3 pt-3",
          )}
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              {compactShelf ? (
                <h3 className="pos-market-section-label text-[0.95rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
                  Browse aisles
                </h3>
              ) : (
                <>
                  <h3 className="pos-market-section-label mt-0.5 text-lg leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground sm:text-xl">
                    Browse aisles
                  </h3>
                  <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                    A–Z
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {categoryBrowseStack.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  disabled={!online}
                  onClick={() => setCategoryBrowseStack((s) => s.slice(0, -1))}
                >
                  <ChevronLeft className="size-3.5" />
                  Back
                </Button>
              ) : null}
              {categoryBrowseParentId ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!online}
                  onClick={() => {
                    const cur =
                      categoryBrowseStack[categoryBrowseStack.length - 1];
                    applySubtreeFilter(cur.id, cur.name);
                  }}
                >
                  Items here + subs
                </Button>
              ) : null}
            </div>
          </div>
          {!online ? (
            <p className="text-xs text-muted-foreground">
              Go online to load the aisle tree.
            </p>
          ) : categoryTreeBusy ? (
            <p className="text-xs text-muted-foreground">Loading aisles…</p>
          ) : visibleCategoryTiles.length === 0 ? (
            <p className="border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_50%,transparent)] py-8 text-center text-xs text-muted-foreground">
              No active aisles.
            </p>
          ) : (
            <div className="pos-snap-row -mx-1 overflow-x-auto px-1 pb-1 sm:-mx-1.5 sm:px-1.5">
              <div className={cn("flex", compactShelf ? "gap-2" : "gap-2.5 sm:gap-3")}>
                {visibleCategoryTiles.map((node, index) => {
                  const thumb = node.thumbnailUrl?.trim();
                  const kids = (node.children ?? []).filter((c) => c.active);
                  const drillable = kids.length > 0;
                  const countLabel = drillable
                    ? `${kids.length} sub${kids.length === 1 ? "" : "s"}`
                    : node.childCount > 0
                      ? `${node.childCount} item${node.childCount === 1 ? "" : "s"}`
                      : "";
                  const letter = node.name.trim().charAt(0).toUpperCase() || "?";
                  const prevLetter =
                    visibleCategoryTiles[index - 1]?.name
                      .trim()
                      .charAt(0)
                      .toUpperCase() || "";
                  const showLetter = letter !== prevLetter;
                  return (
                    <div key={node.id} className="flex shrink-0 items-stretch gap-1.5">
                      {showLetter ? (
                        <span
                          className="flex shrink-0 items-center self-center px-1 text-[10px] font-semibold tabular-nums text-muted-foreground"
                          aria-hidden
                        >
                          {letter}
                        </span>
                      ) : null}
                    <button
                      type="button"
                      disabled={!online}
                      className={cn(
                        "group relative shrink-0 overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-card text-left transition-colors duration-150",
                        "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] disabled:opacity-50",
                        "focus-visible:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)]",
                        "dark:border-border/40 dark:bg-card",
                        compactShelf
                          ? "h-[5.25rem] w-[5.25rem]"
                          : "h-[6.5rem] w-[6.5rem]",
                      )}
                      onClick={() => {
                        if (!online) return;
                        if (drillable) {
                          setCategoryBrowseStack((s) => [...s, node]);
                          return;
                        }
                        applySubtreeFilter(node.id, node.name);
                      }}
                    >
                      <span
                        className={cn(
                          "absolute inset-0 flex items-center justify-center overflow-hidden",
                          !thumb && `bg-gradient-to-br ${kioskPlaceholderWashClass(node.name)}`,
                        )}
                      >
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            width={52}
                            height={48}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            unoptimized
                          />
                        ) : (
                          <Package
                            className={cn(
                              "opacity-50",
                              compactShelf ? "size-4" : "size-5",
                            )}
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        )}
                      </span>
                      <span
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent"
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "absolute inset-x-0 bottom-0 z-10 flex flex-col px-1.5 pb-1.5 pt-5 text-white",
                          compactShelf ? "gap-px" : "gap-0.5",
                        )}
                      >
                        <span
                          className={cn(
                            "line-clamp-2 w-full font-semibold uppercase leading-[1.15] tracking-wide drop-shadow-sm",
                            compactShelf ? "text-[10px]" : "text-[11px]",
                          )}
                        >
                          {node.name}
                        </span>
                        {countLabel ? (
                          <span className="text-[9px] font-medium uppercase tracking-wide tabular-nums text-white/75 drop-shadow-sm">
                            {countLabel}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ) : null}

        </div>

        <CashierCartSidePanel
          currency={currency}
          lines={cart.lines}
          grandTotal={cart.grandTotal}
          pulse={pulseCart}
          loading={cart.loading}
          branchSelected={branchSelected}
          allowPriceEdit={allowPriceEdit}
          allowWeighedToggle={allowWeighedToggle}
          weighedToggleBusyItemId={weighedToggleBusyItemId}
          tillListening={cart.stkPushStatus === "awaiting_till"}
          removeLine={cart.removeLine}
          updateLine={cart.updateLine}
          onCheckout={() => setCheckoutDrawerOpen(true)}
          onEditPrice={(key) => setEditPriceKey(key)}
          onToggleWeighed={onToggleWeighed}
          className={cn(
            embeddedInDashboard
              ? "sticky top-[3.75rem] h-[calc(100dvh-5.5rem)]"
              : "h-full max-h-full overflow-hidden",
            drawerOpen && "lg:invisible lg:pointer-events-none",
          )}
        />
      </div>

      {/* ── Stacked cart buttons (mobile / tablet) ─────────────────── */}
      <div
        className={cn(
          "fixed left-1/2 z-30 flex -translate-x-1/2 flex-col-reverse items-stretch gap-2 lg:hidden",
          cartFabBottomClass,
          "sm:left-auto sm:right-6 sm:translate-x-0 sm:items-end",
        )}
      >
        {[...cartTabs].reverse().map((tab) => {
          const isActive = tab.id === activeCartId;
          const hasItems = tab.itemCount > 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (!isActive) onSwitchCart(tab.id);
                setCheckoutDrawerOpen(true);
              }}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl px-3.5 py-2 shadow-lg transition-all duration-200",
                "hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? "z-30 scale-100 opacity-100"
                  : "z-20 scale-[0.94] opacity-85 hover:opacity-100",
                pulseCart &&
                  isActive &&
                  "ring-[3px] ring-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] ring-offset-2 ring-offset-[var(--pos-paper,#f1ece3)] dark:ring-offset-background",
              )}
              style={{
                backgroundColor: isActive
                  ? "var(--pos-primary)"
                  : "color-mix(in srgb, var(--pos-primary) 65%, var(--muted-foreground))",
                color: "var(--pos-primary-ink)",
                boxShadow: isActive
                  ? "0 4px 6px -1px color-mix(in srgb, var(--pos-primary) 18%, transparent), 0 12px 28px -8px color-mix(in srgb, var(--pos-primary) 32%, transparent)"
                  : "0 2px 4px -1px color-mix(in srgb, var(--pos-primary) 12%, transparent), 0 6px 14px -6px color-mix(in srgb, var(--pos-primary) 20%, transparent)",
              }}
              aria-label={`${isActive ? "Open" : "Switch to"} ${tab.label}${hasItems ? ` · ${tab.grandTotal.toFixed(2)}` : ""}`}
            >
              <span className="relative inline-flex size-7 shrink-0 items-center justify-center bg-[color-mix(in_srgb,var(--pos-primary-ink)_12%,transparent)] sm:size-8">
                <ShoppingCart className="size-3.5 sm:size-4" />
                {hasItems ? (
                  <span
                    className="absolute -right-1 -top-1 inline-flex size-4 items-center justify-center text-[9px] font-bold shadow sm:size-5 sm:text-[10px]"
                    style={{
                      backgroundColor: "var(--pos-primary-ink)",
                      color: "var(--pos-primary)",
                    }}
                  >
                    {tab.itemCount > 99 ? "99+" : tab.itemCount}
                  </span>
                ) : null}
              </span>
              <span className="flex min-w-[7rem] flex-col items-stretch leading-none">
                <span className="max-w-[10rem] truncate text-[10px] font-medium uppercase tracking-wide opacity-80">
                  {hasItems ? tab.label : `${tab.label} · empty`}
                </span>
                {hasItems ? (
                  <span className="mt-0.5 flex items-end gap-1">
                    <CashierDottedLeader onPrimary />
                    <span className="inline-flex shrink-0 items-baseline gap-0.5 text-sm font-semibold tabular-nums">
                      <span>{tab.grandTotal.toFixed(2)}</span>
                      <CashierCurrencySuffix code={currency} onPrimary />
                    </span>
                  </span>
                ) : (
                  <span className="mt-0.5 text-[10px] opacity-60">
                    No items
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <input
        ref={photoFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        className="sr-only"
        aria-hidden
        onChange={(e) => {
          void handleProductPhotoFile(e.target.files?.[0]);
        }}
      />

      <CashierProductModal
        item={pickedItem}
        open={modalOpen}
        currency={currency}
        uiCopy={uiCopy}
        branchId={branchId}
        businessId={businessId}
        onStaleItem={onStalePosItem}
        online={online}
        brandTheme={dialogBrandTheme}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) {
            setPickedItem(null);
            window.requestAnimationFrame(() => focusSearch(true));
          }
        }}
        onSubmit={handleAddFromModal}
        allowNegativeStock={allowNegativeStock}
        allowPriceEdit={allowPriceEdit}
      />

      <PosVariantPicker
        parent={variantPicker?.parent ?? null}
        preloaded={variantPicker?.preloaded ?? null}
        open={variantPicker !== null}
        onOpenChange={(o) => {
          if (!o) {
            setVariantPicker(null);
            window.requestAnimationFrame(() => focusSearch(true));
          }
        }}
        online={online}
        currency={currency}
        branchId={branchId}
        businessId={businessId}
        onStaleItem={onStalePosItem}
        brandTheme={dialogBrandTheme}
        cartQtyByItem={cartQtyByItem}
        justAddedId={justAddedId}
        onPick={handlePickItem}
      />

      <CashierCreateProductModal
        open={createProductOpen}
        onOpenChange={(o) => {
          setCreateProductOpen(o);
          if (!o) window.requestAnimationFrame(() => focusSearch());
        }}
        brandTheme={dialogBrandTheme}
        currency={currency}
        branchId={branchId}
        itemTypes={itemTypes}
        preferredItemTypeId={preferredItemTypeId}
        onCreated={(item, unitPrice) => {
          const added = addLine(item, 1, unitPrice);
          if (added) markAdded(item.id);
        }}
      />

      <CashierSuppliersModal
        open={suppliersOpen}
        onOpenChange={(o) => {
          setSuppliersOpen(o);
          if (!o) window.requestAnimationFrame(() => focusSearch());
        }}
        brandTheme={dialogBrandTheme}
        canWrite={allowCreateSupplier}
        canLink={allowLinkSupplierProducts}
        canReceive={allowReceiveSupply}
        onReceiveSupply={(supplier) => {
          if (!supplier?.id) {
            toast.message("Pick a supplier first", {
              description: "Select a vendor, then Open till — you stay on cashier.",
            });
            return;
          }
          setSuppliersOpen(false);
          setReceiveTillSupplier({
            id: supplier.id,
            name: supplier.name,
          });
          setReceiveTillOpen(true);
        }}
      />

      <CashierReceiveTillDrawer
        open={receiveTillOpen}
        onOpenChange={(o) => {
          setReceiveTillOpen(o);
          if (!o) {
            setReceiveTillSupplier(null);
            window.requestAnimationFrame(() => focusSearch());
          }
        }}
        supplierId={receiveTillSupplier?.id ?? null}
        supplierName={receiveTillSupplier?.name ?? null}
      />

      <CashierCreditTabsModal
        open={creditTabsOpen}
        onOpenChange={(o) => {
          setCreditTabsOpen(o);
          if (!o) window.requestAnimationFrame(() => focusSearch());
        }}
        brandTheme={dialogBrandTheme}
        currency={currency}
        receiptPrinter={cart.receiptPrinter}
      />

      <TenantOrderDrawer
        open={orderPadOpen}
        onOpenChange={(o) => {
          setOrderPadOpen(o);
          if (!o) window.requestAnimationFrame(() => focusSearch());
        }}
        onOpenConfirm={
          allowOrderConfirm
            ? () => {
                setOrderPadOpen(false);
                setOrderConfirmOpen(true);
              }
            : undefined
        }
      />

      <CashierOrderConfirmDrawer
        open={orderConfirmOpen}
        onOpenChange={(o) => {
          setOrderConfirmOpen(o);
          if (!o) window.requestAnimationFrame(() => focusSearch());
        }}
      />

      <CashierEditPriceModal
        open={editPriceKey != null}
        onOpenChange={(o) => {
          if (!o) {
            setEditPriceKey(null);
            window.requestAnimationFrame(() => focusSearch());
          }
        }}
        brandTheme={dialogBrandTheme}
        currency={currency}
        label={
          cart.lines.find((l) => l.key === editPriceKey)?.label ?? "Line price"
        }
        currentPrice={
          cart.lines.find((l) => l.key === editPriceKey)?.unitPrice ?? ""
        }
        itemId={cart.lines.find((l) => l.key === editPriceKey)?.itemId ?? null}
        branchId={branchId}
        online={online}
        canUpdateCatalog={canPersistShelfPrice}
        onSave={(unitPrice) => {
          if (editPriceKey) {
            cart.updateLine(editPriceKey, "unitPrice", unitPrice);
          }
        }}
        onCatalogPriceSaved={(savedItemId, price) => {
          const label = formatShelfPriceLabel(price, currency);
          if (!label) return;
          setTileShelfPrices((prev) => ({
            ...prev,
            [savedItemId]: label,
          }));
        }}
      />

      <CashierCartDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setCheckoutDrawerOpen(open);
          if (
            !open &&
            cart.lastSale != null &&
            cart.lastReceipt != null
          ) {
            cart.onStartNewSale();
          }
          if (!open) {
            window.requestAnimationFrame(() => focusSearch(true));
          }
        }}
        online={online}
        currency={currency}
        branchSelected={branchSelected}
        brandTheme={dialogBrandTheme}
        allowWeighedToggle={allowWeighedToggle}
        weighedToggleBusyItemId={weighedToggleBusyItemId}
        onToggleWeighed={onToggleWeighed}
        {...cart}
      />

      {showScanner && (
        <BarcodeScanner
          onScan={(barcode) => {
            applyBarcodeSearch(barcode);
            setShowScanner(false);
          }}
          onClose={() => {
            setShowScanner(false);
            window.requestAnimationFrame(() => focusSearch());
          }}
        />
      )}
    </div>
  );
}
