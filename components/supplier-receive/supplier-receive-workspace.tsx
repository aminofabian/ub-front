"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  Link2,
  Loader2,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  Unlock,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DashboardAccessDenied,
  DASHBOARD_SECTION_SURFACE,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { CashierCreateProductModal } from "@/components/cashier/cashier-create-product-modal";
import { SupplierReceiveLinkModal } from "@/components/supplier-receive/supplier-receive-link-modal";
import { SupplyInvoiceReceipt } from "@/components/supplier-receive/supply-invoice-receipt";
import { Button } from "@/components/ui/button";
import {
  addItemSupplierLink,
  addPathBLine,
  addSupplyBatchExpense,
  createPathBSession,
  fetchItemById,
  fetchSupplierById,
  fetchSupplierItemLinks,
  fetchSuppliersPage,
  itemListThumbnailUrl,
  patchItem,
  postPathBSession,
  postSellingPrice,
  uploadItemImageFile,
  type SupplierItemLinkRecord,
  type SupplierRecord,
} from "@/lib/api";
import { resolveReceiptWebsite } from "@/lib/branch-receipt";
import { posBrandThemeStyle } from "@/lib/brand-theme";
import { kioskPlaceholderWashClass } from "@/components/cashier/kiosk-listing-styles";
import { APP_ROUTES } from "@/lib/config";
import { getSessionTenantId } from "@/lib/auth";
import { printSupplyInvoiceReceipt } from "@/lib/desktop-print";
import { usePosBarcodeWedge } from "@/hooks/use-pos-barcode-wedge";
import { hasPermission, Permission } from "@/lib/permissions";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import {
  canAdminEditOnHandStock,
  resolveStockHolderForEdit,
  setCatalogOnHandStock,
} from "@/lib/set-on-hand-stock";
import { canLinkSupplierProducts } from "@/lib/supplier-access";
import {
  isSupplierIdSegment,
  resolveSupplierFromSlug,
  supplierSlug,
  supplierSlugSearchHint,
} from "@/lib/supplier-slug";
import {
  buildSupplyInvoiceReceiptSnapshot,
  type SupplyInvoiceReceiptSnapshot,
} from "@/lib/supply-invoice-receipt";
import {
  clearReceiveTillDraft,
  formatReceiveTillDraftAge,
  loadReceiveTillDraft,
  saveReceiveTillDraft,
  type SupplyDraftExtraPersisted,
} from "@/lib/supply-draft-storage";
import {
  supplyLineTotal,
  supplyStockQty,
  supplyUnitCost,
  toPackEntry,
  toUnitEntry,
  type SupplyPackMode,
} from "@/lib/supply-pack-math";
import { SupplyPackQtyModal } from "@/app/(dashboard)/supplies/_components/supply-pack-qty-modal";
import { SupplyPackGuideHintButton } from "@/app/(dashboard)/supplies/_components/supply-pack-guide-drawer";
import { WholesalePackStamp } from "@/components/pack/wholesale-pack-stamp";
import { publicSupplierPortalUrl } from "@/lib/public-supplier-portal";
import { cn } from "@/lib/utils";

type SupplyCartLine = {
  itemId: string;
  name: string;
  sku: string;
  stock: number | null;
  qtyStr: string;
  costStr: string;
  sellStr: string;
  seedCost: string;
  seedSell: string;
  packMode?: SupplyPackMode | null;
  catalogPackSize?: number | null;
  catalogPackUnit?: string | null;
};

type ManifestExtra = SupplyDraftExtraPersisted;

const EXTRA_CATEGORIES: { value: string; label: string }[] = [
  { value: "transport", label: "Shipping" },
  { value: "interest", label: "Interest" },
  { value: "handling", label: "Handling" },
  { value: "customs", label: "Customs" },
  { value: "storage", label: "Storage" },
  { value: "other", label: "Other" },
];

function newExtraKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `x-${Date.now()}`;
}

function emptyManifestExtra(): ManifestExtra {
  return {
    key: newExtraKey(),
    category: "transport",
    amount: "",
    desc: "",
  };
}

type SupplierReceiveWorkspaceProps = {
  /** Page route segment (`/supplier/[slug]`). Ignored when `supplierId` is set. */
  slug?: string;
  /** Direct supplier id (cashier receive drawer). */
  supplierId?: string | null;
  /** `drawer` hides page nav and uses Close instead of leaving cashier. */
  variant?: "page" | "drawer";
  onClose?: () => void;
  onPosted?: () => void;
};

/** Browser-local: admin can flip tile edits on/off without a page reload. */
const ADMIN_EDIT_STORAGE_KEY = "palmart.supplier-receive.admin-edit";

const CHIP = cn(
  "inline-flex h-7 shrink-0 items-center gap-1.5 border px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
  "transition-colors touch-manipulation",
);

const CHIP_IDLE = cn(
  CHIP,
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-transparent text-muted-foreground",
  "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] hover:text-foreground",
);

const CHIP_ACCENT = cn(
  CHIP,
  "border-[color-mix(in_srgb,var(--pos-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)] text-[var(--pos-ink,#1c1915)]",
  "hover:bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)]",
);

const TILE_SHELL = cn(
  "group relative flex h-full flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
  "bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] text-left",
  "transition-[border-color,background-color,box-shadow] duration-150",
  "hover:z-[1] hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_32%,transparent)] hover:bg-card",
  "hover:shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
  "focus-within:border-[color-mix(in_srgb,var(--pos-primary)_50%,transparent)]",
  "active:shadow-none dark:border-border/50 dark:bg-card dark:hover:shadow-none",
);

const fieldClass = cn(
  "w-full border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)]",
  "px-2 py-1.5 text-sm tabular-nums shadow-none",
  "placeholder:text-muted-foreground/45",
  "focus-visible:border-[var(--pos-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)]",
  "disabled:opacity-50 dark:border-border/50 dark:bg-background",
);

const fieldCompact = cn(fieldClass, "h-7 px-1.5 py-0.5 text-[11px]");

const PARENT_RAIL_BASE = cn(
  "relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden border",
  "text-center text-[10px] font-semibold leading-tight transition touch-manipulation",
);

function parentRailClass(active: boolean, hasImage: boolean): string {
  if (hasImage) {
    return cn(
      PARENT_RAIL_BASE,
      "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] bg-[color-mix(in_srgb,var(--card)_70%,transparent)]",
      "dark:border-border/50",
      active &&
        "border-[var(--pos-primary)] shadow-[inset_0_0_0_2px_var(--pos-primary)]",
    );
  }
  return active
    ? cn(
        PARENT_RAIL_BASE,
        "border-[var(--pos-primary)] bg-[var(--pos-primary)] px-1 text-[var(--pos-primary-ink,#fff)]",
      )
    : cn(
        PARENT_RAIL_BASE,
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] px-1",
        "bg-[color-mix(in_srgb,var(--card)_55%,transparent)] text-[var(--pos-ink,#1c1915)]",
        "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)]",
        "hover:bg-[color-mix(in_srgb,var(--card)_78%,transparent)]",
        "dark:border-border/50 dark:bg-background/40 dark:text-foreground",
      );
}

const PARENT_RAIL_HEADER = cn(
  "flex h-8 shrink-0 items-center justify-center",
  "bg-[var(--pos-primary)] px-1.5 text-center text-[10px] font-bold uppercase tracking-[0.14em]",
  "text-[var(--pos-primary-ink,#fff)]",
);

function moneySeed(raw: number | string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return "";
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : "";
}

function parsePos(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNonNeg(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function extrasTotalOf(extras: ManifestExtra[]): number {
  let sum = 0;
  for (const e of extras) {
    const n = parseNonNeg(e.amount);
    if (n != null && n > 0) sum += n;
  }
  return Math.round(sum * 100) / 100;
}

/** Unit cost from line total ÷ qty, preferring 2dp when it still reproduces total. */
function unitCostFromTotal(total: number, qty: number): string {
  if (!(qty > 0) || !Number.isFinite(total) || total < 0) return "";
  const unit = total / qty;
  const u2 = Math.round(unit * 100) / 100;
  if (Math.abs(u2 * qty - total) < 0.005) return u2.toFixed(2);
  const u4 = Math.round(unit * 10_000) / 10_000;
  if (Math.abs(Math.round(u4 * qty * 100) / 100 - total) < 0.005) {
    return String(u4);
  }
  return unit.toFixed(6).replace(/\.?0+$/, "");
}

function ManifestLineTotalInput({
  qty,
  unitCost,
  disabled,
  onCommitTotal,
}: {
  qty: number;
  unitCost: number;
  disabled?: boolean;
  onCommitTotal: (total: number) => void;
}) {
  const derived = Math.round(qty * unitCost * 100) / 100;
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <label className="space-y-0.5">
      <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Total
      </span>
      <input
        className={cn(
          fieldCompact,
          "bg-[color-mix(in_srgb,var(--pos-primary)_6%,transparent)]",
        )}
        inputMode="decimal"
        disabled={disabled}
        value={focused ? draft : derived.toFixed(2)}
        onFocus={() => {
          setFocused(true);
          setDraft(derived.toFixed(2));
        }}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          const total = parseNonNeg(next);
          if (total != null && qty > 0) onCommitTotal(total);
        }}
        onBlur={() => {
          setFocused(false);
          const total = parseNonNeg(draft);
          if (total == null) return;
          if (!(qty > 0)) {
            toast.error("Enter quantity first");
            return;
          }
          onCommitTotal(total);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        aria-label="Line total"
        title="Line total — updates unit cost as total ÷ qty"
      />
    </label>
  );
}

function formatStock(n: number | null): string {
  if (n == null) return "—";
  return Number.isInteger(n)
    ? n.toLocaleString("en-KE")
    : n.toLocaleString("en-KE", { maximumFractionDigits: 2 });
}

function linkStock(link: SupplierItemLinkRecord): number | null {
  if (link.currentStock == null || String(link.currentStock).trim() === "") {
    return null;
  }
  const n = Number(link.currentStock);
  return Number.isFinite(n) ? n : null;
}

/** Parent product id for filtering: variant parent, else the item itself. */
function linkParentId(link: SupplierItemLinkRecord): string {
  return link.variantOfItemId?.trim() || link.itemId;
}

function linkParentLabel(link: SupplierItemLinkRecord): string {
  const parent = link.parentItemName?.trim();
  if (parent) return parent;
  const name = link.itemName?.trim() || link.sku?.trim() || "Product";
  const sep = name.indexOf(" · ");
  return sep > 0 ? name.slice(0, sep) : name;
}

type ParentOption = {
  id: string | null;
  label: string;
  thumbnailUrl: string | null;
};

function ParentFolderButton({
  parent,
  active,
  canEditPhoto,
  className,
  onSelect,
  onPhotoUploaded,
}: {
  parent: ParentOption;
  active: boolean;
  canEditPhoto: boolean;
  className?: string;
  onSelect: () => void;
  onPhotoUploaded: (parentId: string, imageUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const thumb = parent.thumbnailUrl?.trim() || null;
  const hasImage = Boolean(thumb);

  const handleFile = async (file: File | null | undefined) => {
    if (!file || !parent.id) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a photo (JPG, PNG, or HEIC).");
      return;
    }
    setUploading(true);
    try {
      const saved = await uploadItemImageFile(parent.id, file, {
        altText: parent.label,
        primary: true,
      });
      const url = saved.secureUrl?.trim();
      if (!url) {
        toast.error("Upload finished but no image URL was returned.");
        return;
      }
      onPhotoUploaded(parent.id, url);
      toast.success("Parent photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={onSelect}
        className={cn(parentRailClass(active, hasImage), "h-full w-full")}
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
      {canEditPhoto && parent.id ? (
        <>
          <button
            type="button"
            disabled={uploading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              inputRef.current?.click();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "absolute bottom-0.5 right-0.5 z-[3] flex size-5 items-center justify-center",
              "border border-white/50 bg-black/55 text-white shadow-sm",
              "transition-colors hover:bg-black/70 disabled:opacity-70",
            )}
            aria-label={`Add photo for ${parent.label}`}
            title="Add parent photo"
          >
            {uploading ? (
              <Loader2 className="size-2.5 animate-spin" aria-hidden />
            ) : (
              <Camera className="size-2.5" aria-hidden />
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function linkToCartSeed(link: SupplierItemLinkRecord): SupplyCartLine {
  const cost = moneySeed(
    link.lastCostPrice ?? link.defaultCostPrice ?? link.catalogBuyingPrice,
  );
  const sell = moneySeed(link.catalogShelfPrice);
  const packSize = Number(link.packSize);
  const catalogPackSize =
    Number.isFinite(packSize) && packSize > 1 ? packSize : null;
  const catalogPackUnit = link.packUnit?.trim() || null;
  return {
    itemId: link.itemId,
    name: link.itemName || link.sku || "Product",
    sku: link.sku || "",
    stock: linkStock(link),
    qtyStr: "1",
    costStr: cost,
    sellStr: sell,
    seedCost: cost,
    seedSell: sell,
    packMode: null,
    catalogPackSize,
    catalogPackUnit,
  };
}

function applyLinePackMode(
  line: SupplyCartLine,
  next: SupplyPackMode | null,
): SupplyCartLine {
  const current = line.packMode;
  if (!next) {
    if (!current) return { ...line, packMode: null };
    const converted = toUnitEntry(line.qtyStr, line.costStr, current.unitsPerPack);
    return { ...line, ...converted, packMode: null };
  }
  if (current) {
    return { ...line, packMode: next };
  }
  const converted = toPackEntry(line.qtyStr, line.costStr, next.unitsPerPack);
  return { ...line, ...converted, packMode: next };
}

function seedUnitCost(link: SupplierItemLinkRecord): number {
  for (const raw of [
    link.lastCostPrice,
    link.defaultCostPrice,
    link.catalogBuyingPrice,
  ]) {
    if (raw == null || String(raw).trim() === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

function TilePhotoButton({
  itemId,
  itemName,
  onUploaded,
}: {
  itemId: string;
  itemName: string;
  onUploaded: (imageUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a photo (JPG, PNG, or HEIC).");
      return;
    }
    setUploading(true);
    try {
      const saved = await uploadItemImageFile(itemId, file, {
        altText: itemName,
        primary: true,
      });
      const url = saved.secureUrl?.trim();
      if (!url) {
        toast.error("Upload finished but no image URL was returned.");
        return;
      }
      onUploaded(url);
      toast.success("Photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={uploading}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          inputRef.current?.click();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "absolute bottom-0.5 right-0.5 z-[3] flex size-6 items-center justify-center",
          "border border-white/50 bg-black/55 text-white shadow-sm backdrop-blur-[1px]",
          "transition-colors hover:bg-black/70 disabled:opacity-70",
        )}
        aria-label={`Edit photo for ${itemName}`}
        title="Edit photo"
      >
        {uploading ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : (
          <Camera className="size-3" aria-hidden />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
        }}
      />
    </>
  );
}

function TileStockEditor({
  link,
  branchId,
  disabled,
  onUpdated,
}: {
  link: SupplierItemLinkRecord;
  branchId: string;
  disabled?: boolean;
  onUpdated: (nextStock: number) => void;
}) {
  const displayStock = linkStock(link);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [baseline, setBaseline] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const startEdit = async (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || busy) return;
    const bid = branchId.trim();
    if (!bid) {
      toast.error("Select a branch in the top nav first");
      return;
    }
    setBusy(true);
    try {
      const resolved = await resolveStockHolderForEdit({
        itemId: link.itemId,
        branchId: bid,
      });
      const current = resolved.displayCurrent;
      setBaseline(current);
      setDraft(Number.isInteger(current) ? String(current) : current.toFixed(2));
      setEditing(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load stock");
    } finally {
      setBusy(false);
    }
  };

  const cancel = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditing(false);
    setDraft("");
    setBaseline(null);
  };

  const save = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (busy) return;
    const bid = branchId.trim();
    if (!bid) {
      toast.error("Select a branch in the top nav first");
      return;
    }
    const target = Number(draft.trim());
    if (!Number.isFinite(target) || target < 0) {
      toast.error("Enter zero or a positive quantity");
      return;
    }
    const current = baseline ?? displayStock ?? 0;
    if (Math.abs(target - current) < 0.0001) {
      cancel();
      return;
    }
    setBusy(true);
    try {
      await setCatalogOnHandStock({
        itemId: link.itemId,
        branchId: bid,
        targetDisplay: target,
        unitCost: seedUnitCost(link),
        notes: "Stock set from supplier receive till",
      });
      setEditing(false);
      setDraft("");
      setBaseline(null);
      onUpdated(target);
      toast.success(`Stock set to ${formatStock(target)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stock update failed");
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div
        className="flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className={cn(
            "h-6 w-[3.25rem] border border-border/60 bg-background px-1 text-right font-mono text-[10px] tabular-nums",
            "focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] focus-visible:outline-none",
          )}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          inputMode="decimal"
          aria-label={`Set on-hand stock for ${link.itemName || link.sku}`}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save(e);
            if (e.key === "Escape") cancel(e);
          }}
        />
        <button
          type="button"
          className="flex size-6 items-center justify-center text-[var(--pos-primary)] disabled:opacity-50"
          disabled={busy}
          title="Save stock"
          onClick={(e) => void save(e)}
        >
          {busy ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : (
            <Check className="size-3" aria-hidden />
          )}
        </button>
        <button
          type="button"
          className="flex size-6 items-center justify-center text-muted-foreground disabled:opacity-50"
          disabled={busy}
          title="Cancel"
          onClick={cancel}
        >
          <X className="size-3" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={(e) => void startEdit(e)}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-[10px] tabular-nums",
        "underline-offset-2 hover:underline disabled:opacity-50",
        displayStock != null && displayStock <= 0
          ? "font-semibold text-red-700 dark:text-red-300"
          : "text-muted-foreground",
      )}
      title="Set on-hand stock"
    >
      {busy ? (
        <Loader2 className="size-2.5 animate-spin" aria-hidden />
      ) : (
        <Pencil className="size-2.5" aria-hidden />
      )}
      Stock {formatStock(displayStock)}
    </button>
  );
}

function TileNameEditor({
  link,
  onPick,
  onUpdated,
}: {
  link: SupplierItemLinkRecord;
  onPick: () => void;
  onUpdated: (name: string) => void;
}) {
  const current = link.itemName?.trim() || link.sku?.trim() || "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const startEdit = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setDraft(link.itemName?.trim() || "");
    setEditing(true);
  };

  const cancel = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditing(false);
    setDraft("");
  };

  const save = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (busy) return;
    const next = draft.trim();
    if (!next) {
      toast.error("Name can’t be empty");
      return;
    }
    if (next === (link.itemName?.trim() || "")) {
      cancel();
      return;
    }
    setBusy(true);
    try {
      await patchItem(link.itemId, { name: next });
      setEditing(false);
      setDraft("");
      onUpdated(next);
      toast.success("Name updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update name");
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div
        className="flex items-start gap-0.5"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className={cn(
            "min-h-[1.5rem] min-w-0 flex-1 border border-border/60 bg-background px-1 text-[11px] font-semibold leading-snug",
            "focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] focus-visible:outline-none",
          )}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          aria-label="Product name"
          onKeyDown={(e) => {
            if (e.key === "Enter") void save(e);
            if (e.key === "Escape") cancel(e);
          }}
        />
        <button
          type="button"
          className="flex size-6 shrink-0 items-center justify-center text-[var(--pos-primary)] disabled:opacity-50"
          disabled={busy}
          title="Save name"
          onClick={(e) => void save(e)}
        >
          {busy ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : (
            <Check className="size-3" aria-hidden />
          )}
        </button>
        <button
          type="button"
          className="flex size-6 shrink-0 items-center justify-center text-muted-foreground disabled:opacity-50"
          disabled={busy}
          title="Cancel"
          onClick={cancel}
        >
          <X className="size-3" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-0.5">
      <button
        type="button"
        onClick={onPick}
        className="min-w-0 flex-1 text-left"
      >
        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)] dark:text-foreground">
          {current || "Product"}
        </p>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={startEdit}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
        title="Edit name"
        aria-label={`Edit name for ${current || "product"}`}
      >
        <Pencil className="size-2.5" aria-hidden />
      </button>
    </div>
  );
}

function TileBarcodeEditor({
  link,
  canEdit,
  onUpdated,
}: {
  link: SupplierItemLinkRecord;
  canEdit: boolean;
  onUpdated: (barcode: string | null) => void;
}) {
  const current = link.barcode?.trim() || "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const startEdit = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canEdit || busy) return;
    setDraft(current);
    setEditing(true);
  };

  const cancel = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditing(false);
    setDraft("");
  };

  const save = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (busy) return;
    const next = draft.trim();
    if (next === current) {
      cancel();
      return;
    }
    setBusy(true);
    try {
      await patchItem(link.itemId, { barcode: next });
      setEditing(false);
      setDraft("");
      onUpdated(next || null);
      toast.success(next ? "Barcode updated" : "Barcode cleared");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update barcode");
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div
        className="flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className={cn(
            "h-6 min-w-0 flex-1 border border-border/60 bg-background px-1 font-mono text-[10px] tabular-nums",
            "focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] focus-visible:outline-none",
          )}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          inputMode="text"
          aria-label={`Barcode for ${link.itemName || link.sku}`}
          placeholder="Barcode"
          onKeyDown={(e) => {
            if (e.key === "Enter") void save(e);
            if (e.key === "Escape") cancel(e);
          }}
        />
        <button
          type="button"
          className="flex size-6 shrink-0 items-center justify-center text-[var(--pos-primary)] disabled:opacity-50"
          disabled={busy}
          title="Save barcode"
          onClick={(e) => void save(e)}
        >
          {busy ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : (
            <Check className="size-3" aria-hidden />
          )}
        </button>
        <button
          type="button"
          className="flex size-6 shrink-0 items-center justify-center text-muted-foreground disabled:opacity-50"
          disabled={busy}
          title="Cancel"
          onClick={cancel}
        >
          <X className="size-3" aria-hidden />
        </button>
      </div>
    );
  }

  if (!canEdit) {
    if (!current) return null;
    return (
      <p className="truncate font-mono text-[9px] tabular-nums text-muted-foreground">
        {current}
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={startEdit}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 truncate font-mono text-[9px] tabular-nums",
        "underline-offset-2 hover:underline disabled:opacity-50",
        current ? "text-muted-foreground" : "text-muted-foreground/70",
      )}
      title={current ? "Edit barcode" : "Add barcode"}
    >
      <Pencil className="size-2.5 shrink-0" aria-hidden />
      <span className="truncate">{current || "Add barcode"}</span>
    </button>
  );
}

function ProductTile({
  link,
  cartQty,
  justAdded,
  currency,
  branchId,
  canEditStock,
  canEditCatalog,
  onPick,
  onPhotoUploaded,
  onStockUpdated,
  onBarcodeUpdated,
  onNameUpdated,
}: {
  link: SupplierItemLinkRecord;
  cartQty: number;
  justAdded: boolean;
  currency: string;
  branchId: string;
  canEditStock: boolean;
  canEditCatalog: boolean;
  onPick: () => void;
  onPhotoUploaded: (itemId: string, imageUrl: string) => void;
  onStockUpdated: (itemId: string, nextStock: number) => void;
  onBarcodeUpdated: (itemId: string, barcode: string | null) => void;
  onNameUpdated: (itemId: string, name: string) => void;
}) {
  const title = link.itemName || link.sku || "Product";
  const thumb = posTileThumbUrl(title, link.thumbnailUrl);
  const cost = moneySeed(
    link.lastCostPrice ?? link.defaultCostPrice ?? link.catalogBuyingPrice,
  );
  const stock = linkStock(link);

  return (
    <div
      className={cn(
        TILE_SHELL,
        cartQty > 0 &&
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_45%,var(--card))]",
      )}
    >
      <div className="relative aspect-square w-full shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] dark:border-border/40">
        <button
          type="button"
          onClick={onPick}
          className="absolute inset-0 z-0 text-left"
          aria-label={
            cartQty > 0
              ? `${title}, ${cartQty} in supply cart. Tap to add another.`
              : `Add ${title} to supply cart`
          }
        >
          {thumb ? (
            <Image
              src={thumb}
              alt=""
              fill
              sizes="(max-width: 640px) 22vw, (max-width: 1024px) 12vw, 90px"
              className="object-contain p-0.5 transition-transform duration-300 group-hover:scale-[1.04]"
              unoptimized
            />
          ) : (
            <span
              className={cn(
                "flex h-full w-full items-center justify-center bg-gradient-to-br",
                kioskPlaceholderWashClass(title),
              )}
              aria-hidden
            >
              <Package className="size-5 opacity-55" strokeWidth={1.5} />
            </span>
          )}
        </button>
        {cartQty > 0 ? (
          <span
            className={cn(
              "pointer-events-none absolute left-0 top-0 z-[1] inline-flex h-5 min-w-5 items-center justify-center px-1 font-mono text-[10px] font-bold tabular-nums text-[var(--pos-primary-ink,#fff)] bg-[var(--pos-primary)]",
              justAdded && "animate-pulse",
            )}
          >
            {cartQty}
          </span>
        ) : null}
        {canEditCatalog ? (
          <TilePhotoButton
            itemId={link.itemId}
            itemName={title}
            onUploaded={(url) => onPhotoUploaded(link.itemId, url)}
          />
        ) : null}
      </div>
      <div className="flex min-h-[2.75rem] w-full flex-1 flex-col justify-center gap-0.5 px-1 pb-1 pt-0.5">
        {canEditCatalog ? (
          <TileNameEditor
            link={link}
            onPick={onPick}
            onUpdated={(name) => onNameUpdated(link.itemId, name)}
          />
        ) : (
          <button type="button" onClick={onPick} className="w-full text-left">
            <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)] dark:text-foreground">
              {title}
            </p>
          </button>
        )}
        <button type="button" onClick={onPick} className="w-full text-left">
          <p className="truncate text-[10px] tabular-nums text-muted-foreground">
            {cost
              ? `${Number(cost).toLocaleString("en-KE", { minimumFractionDigits: 2 })} ${currency}`
              : "Set cost"}
            {!canEditStock && stock != null
              ? ` · Stock ${formatStock(stock)}`
              : ""}
          </p>
        </button>
        {canEditCatalog || link.barcode?.trim() ? (
          <TileBarcodeEditor
            link={link}
            canEdit={canEditCatalog}
            onUpdated={(barcode) => onBarcodeUpdated(link.itemId, barcode)}
          />
        ) : null}
        {canEditStock ? (
          <TileStockEditor
            link={link}
            branchId={branchId}
            onUpdated={(next) => onStockUpdated(link.itemId, next)}
          />
        ) : null}
      </div>
    </div>
  );
}

function ManifestExtrasBlock({
  extras,
  currency,
  saving,
  onChange,
}: {
  extras: ManifestExtra[];
  currency: string;
  saving: boolean;
  onChange: (extras: ManifestExtra[]) => void;
}) {
  const total = extrasTotalOf(extras);
  return (
    <div className="space-y-1.5 border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Extra costs
        </p>
        {total > 0 ? (
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
            +{total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}{" "}
            {currency}
          </p>
        ) : null}
      </div>
      {extras.length === 0 ? (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Shipping, interest, handling…
        </p>
      ) : (
        <div className="space-y-1.5">
          {extras.map((e) => (
            <div key={e.key} className="space-y-1">
              <div className="grid grid-cols-[1fr_4.5rem_auto] gap-1">
                <select
                  className={cn(fieldCompact, "px-1")}
                  value={e.category}
                  disabled={saving}
                  aria-label="Extra cost category"
                  onChange={(ev) =>
                    onChange(
                      extras.map((x) =>
                        x.key === e.key
                          ? { ...x, category: ev.target.value }
                          : x,
                      ),
                    )
                  }
                >
                  {EXTRA_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  className={cn(fieldCompact, "text-right")}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={e.amount}
                  disabled={saving}
                  aria-label="Extra cost amount"
                  onChange={(ev) =>
                    onChange(
                      extras.map((x) =>
                        x.key === e.key
                          ? { ...x, amount: ev.target.value }
                          : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="flex size-7 items-center justify-center text-destructive/70 hover:text-destructive disabled:opacity-50"
                  disabled={saving}
                  aria-label="Remove extra cost"
                  onClick={() =>
                    onChange(extras.filter((x) => x.key !== e.key))
                  }
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
              <input
                className={fieldCompact}
                placeholder="Note (optional)"
                value={e.desc}
                disabled={saving}
                aria-label="Extra cost note"
                onChange={(ev) =>
                  onChange(
                    extras.map((x) =>
                      x.key === e.key ? { ...x, desc: ev.target.value } : x,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="inline-flex h-7 items-center gap-1 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground disabled:opacity-50"
        disabled={saving}
        onClick={() => onChange([...extras, emptyManifestExtra()])}
      >
        <Plus className="size-3" aria-hidden />
        Add cost
      </button>
    </div>
  );
}

function SupplyCartPanel({
  supplierName,
  currency,
  lines,
  extras,
  payable,
  pulse,
  saving,
  canPost,
  canSetSellPrice,
  draftHint,
  onClearDraft,
  onPatch,
  onRemove,
  onTogglePack,
  onEditPack,
  onExtrasChange,
  onPost,
  onCloseMobile,
}: {
  supplierName: string;
  currency: string;
  lines: SupplyCartLine[];
  extras: ManifestExtra[];
  payable: number;
  pulse: boolean;
  saving: boolean;
  canPost: boolean;
  canSetSellPrice: boolean;
  draftHint?: string | null;
  onClearDraft?: () => void;
  onPatch: (itemId: string, patch: Partial<SupplyCartLine>) => void;
  onRemove: (itemId: string) => void;
  onTogglePack: (itemId: string) => void;
  onEditPack: (itemId: string) => void;
  onExtrasChange: (extras: ManifestExtra[]) => void;
  onPost: () => void;
  onCloseMobile?: () => void;
}) {
  return (
    <aside
      className={cn(
        "flex h-full max-h-full min-h-0 w-full shrink-0 flex-col self-stretch overflow-hidden lg:w-[min(100%,20rem)] xl:w-[22rem]",
      )}
    >
      <div
        className={cn(
          "pos-market-receipt flex h-full min-h-0 flex-1 flex-col overflow-hidden",
          "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
          "bg-[color-mix(in_srgb,var(--card)_92%,#faf7f1)] dark:border-border/40 dark:bg-card",
          pulse &&
            "shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--pos-primary)_55%,transparent)]",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b-2 border-[var(--pos-ink,#1c1915)] px-2.5 py-2 dark:border-foreground/80">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Manifest
            </p>
            <h2 className="pos-market-section-label mt-0.5 truncate text-base leading-none text-foreground">
              {supplierName}
            </h2>
            {draftHint ? (
              <p className="mt-1 text-[10px] leading-snug text-emerald-800 dark:text-emerald-200">
                {draftHint}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <SupplyPackGuideHintButton className="h-7 border-amber-900/20 px-1.5 text-[9px] sm:h-7 sm:text-[9px]" />
            {(lines.length > 0 || extras.length > 0) && onClearDraft ? (
              <button
                type="button"
                className="h-7 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-destructive"
                onClick={onClearDraft}
                disabled={saving}
                title="Clear manifest draft"
              >
                Clear
              </button>
            ) : null}
            {onCloseMobile ? (
              <button
                type="button"
                className="flex size-7 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] text-muted-foreground hover:text-foreground lg:hidden"
                onClick={onCloseMobile}
                aria-label="Close cart"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-0 overflow-y-auto">
          {lines.length === 0 ? (
            <p className="mx-2.5 my-3 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] px-3 py-10 text-center text-[11px] leading-relaxed text-muted-foreground">
              Tap shelf products or scan a barcode to build this delivery.
              Drafts save on this device until you post.
            </p>
          ) : (
            lines.map((line, index) => {
              const pack = line.packMode;
              const packed = pack != null && pack.unitsPerPack > 0;
              const qty = parsePos(line.qtyStr) ?? 0;
              const cost = parseNonNeg(line.costStr) ?? 0;
              const stockQty = supplyStockQty(line.qtyStr, pack) ?? 0;
              const unitEach = supplyUnitCost(line.costStr, pack);
              const lineTotal = supplyLineTotal(line.qtyStr, line.costStr, pack);
              return (
                <div
                  key={line.itemId}
                  className="space-y-1.5 border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2.5 py-2 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-1.5">
                      {packed ? (
                        <WholesalePackStamp
                          units={pack.unitsPerPack}
                          packCount={qty > 0 ? qty : 1}
                          packUnit={pack.packUnit}
                          className="mt-0.5 shrink-0"
                        />
                      ) : null}
                      <div className="min-w-0">
                      <p className="flex items-baseline gap-1.5 truncate text-[12px] font-semibold leading-tight">
                        <span className="font-mono text-[9px] font-normal tabular-nums text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {line.name}
                      </p>
                      <p className="mt-0.5 pl-5 text-[9px] uppercase tracking-wide text-muted-foreground">
                        {line.sku ? `${line.sku} · ` : ""}
                        Stock {formatStock(line.stock)}
                        {packed && qty > 0
                          ? ` → +${stockQty}`
                          : ""}
                      </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 p-0.5 text-destructive/70 hover:text-destructive"
                      onClick={() => onRemove(line.itemId)}
                      aria-label={`Remove ${line.name}`}
                      disabled={saving}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                  <div
                    className={cn(
                      "grid gap-1",
                      canSetSellPrice ? "grid-cols-4" : "grid-cols-3",
                    )}
                  >
                    <label className="space-y-0.5">
                      <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {packed ? "Packs" : "Qty"}
                      </span>
                      <div
                        className={cn(
                          "flex items-stretch",
                          packed &&
                            "border border-amber-800/30 bg-amber-50/90 dark:bg-amber-950/40",
                        )}
                      >
                        <input
                          className={cn(
                            fieldCompact,
                            packed && "border-0 bg-transparent",
                          )}
                          inputMode="decimal"
                          value={line.qtyStr}
                          disabled={saving}
                          onChange={(e) =>
                            onPatch(line.itemId, { qtyStr: e.target.value })
                          }
                        />
                        {packed ? (
                          <button
                            type="button"
                            className="inline-flex shrink-0 items-center px-0.5 font-mono text-[9px] font-black tabular-nums text-amber-950 dark:text-amber-100"
                            disabled={saving}
                            title="Change pack size"
                            onClick={() => onEditPack(line.itemId)}
                          >
                            ×{pack.unitsPerPack}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={cn(
                            "inline-flex size-7 shrink-0 items-center justify-center",
                            packed
                              ? "bg-amber-200/80 text-amber-950 dark:bg-amber-800 dark:text-amber-50"
                              : "text-muted-foreground hover:bg-amber-100 hover:text-amber-950",
                          )}
                          disabled={saving}
                          title={
                            packed
                              ? "Counting packs — click to count pieces"
                              : "Sold as a pack"
                          }
                          aria-pressed={packed}
                          onClick={() => onTogglePack(line.itemId)}
                        >
                          <Package className="size-3" aria-hidden />
                        </button>
                      </div>
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {packed ? "Pack" : "Unit"}
                      </span>
                      <input
                        className={cn(
                          fieldCompact,
                          packed &&
                            "border-amber-800/30 bg-amber-50/90 dark:bg-amber-950/40",
                        )}
                        inputMode="decimal"
                        value={line.costStr}
                        disabled={saving}
                        onChange={(e) =>
                          onPatch(line.itemId, { costStr: e.target.value })
                        }
                        title={
                          packed
                            ? unitEach != null
                              ? `Pack price — ${unitEach.toFixed(2)} each`
                              : "Pack price"
                            : "Unit cost — editing this updates total"
                        }
                      />
                    </label>
                    <ManifestLineTotalInput
                      qty={qty}
                      unitCost={cost}
                      disabled={saving}
                      onCommitTotal={(total) => {
                        if (!(qty > 0)) {
                          toast.error("Enter quantity first");
                          return;
                        }
                        onPatch(line.itemId, {
                          costStr: unitCostFromTotal(total, qty),
                        });
                      }}
                    />
                    {canSetSellPrice ? (
                      <label className="space-y-0.5">
                        <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          Sell
                        </span>
                        <input
                          className={fieldCompact}
                          inputMode="decimal"
                          value={line.sellStr}
                          disabled={saving}
                          onChange={(e) =>
                            onPatch(line.itemId, { sellStr: e.target.value })
                          }
                        />
                      </label>
                    ) : null}
                  </div>
                  {packed && lineTotal != null && unitEach != null ? (
                    <p className="text-[9px] text-amber-950/75 dark:text-amber-100/70">
                      {qty} pack{qty === 1 ? "" : "s"} · {stockQty} pcs ·{" "}
                      {unitEach.toFixed(2)} ea · total {lineTotal.toFixed(2)}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <ManifestExtrasBlock
          extras={extras}
          currency={currency}
          saving={saving}
          onChange={onExtrasChange}
        />

        <div className="shrink-0 space-y-2 border-t-2 border-[var(--pos-ink,#1c1915)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] px-2.5 py-2.5 dark:border-foreground/80 dark:bg-muted/20">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Payable
              </p>
              <p className="pos-market-section-label text-xl leading-none text-foreground">
                {payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })}{" "}
                <span className="text-xs font-semibold text-muted-foreground">
                  {currency}
                </span>
              </p>
            </div>
            <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {lines.length} ln
              {extrasTotalOf(extras) > 0
                ? ` · ${extras.length} extra`
                : ""}
            </p>
          </div>
          <Button
            type="button"
            className="h-10 w-full rounded-none text-xs font-bold uppercase tracking-[0.12em]"
            disabled={!canPost || saving}
            onClick={onPost}
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Posting…
              </>
            ) : (
              <>
                <PackagePlus className="size-3.5" aria-hidden />
                Post supply
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function SupplierReceiveWorkspace({
  slug = "",
  supplierId = null,
  variant = "page",
  onClose,
  onPosted,
}: SupplierReceiveWorkspaceProps) {
  const router = useRouter();
  const isDrawer = variant === "drawer";
  const resolveKey = (supplierId?.trim() || slug.trim()).toLowerCase();
  const {
    me,
    business,
    loading,
    branchId,
    branches,
    branchesLoading,
    itemTypes,
    itemTypeId,
    canPathBWrite,
    canViewSuppliers,
  } = useDashboard();

  const currency =
    business?.currency?.trim().toUpperCase() || "KES";
  const brandTheme = useMemo(
    () => posBrandThemeStyle(business?.branding ?? null),
    [business?.branding],
  );
  const canSetSellPrice = hasPermission(
    me?.permissions,
    Permission.PricingSellPriceSet,
  );
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const isOwnerOrAdmin = roleKey === "owner" || roleKey === "admin";
  const canEditStock = canAdminEditOnHandStock(me);
  const canEditCatalog =
    isOwnerOrAdmin &&
    hasPermission(me?.permissions, Permission.CatalogItemsWrite);
  const canToggleAdminEdit = canEditStock || canEditCatalog;
  const canCreateProduct = hasPermission(
    me?.permissions,
    Permission.CatalogItemsWrite,
  );
  const canLinkProducts = canLinkSupplierProducts(me, business);
  const canAccess = canPathBWrite && canViewSuppliers;
  const activeBranchName =
    branches.find((b) => b.id === branchId)?.name?.trim() || "";

  const [resolveBusy, setResolveBusy] = useState(true);
  const [supplier, setSupplier] = useState<SupplierRecord | null>(null);
  const [candidates, setCandidates] = useState<SupplierRecord[]>([]);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [links, setLinks] = useState<SupplierItemLinkRecord[]>([]);
  const [linksBusy, setLinksBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [parentFilterId, setParentFilterId] = useState<string | null>(null);
  /** Fetched parent catalog thumbnails (keyed by parent item id). */
  const [fetchedParentThumbs, setFetchedParentThumbs] = useState<
    Record<string, string | null>
  >({});
  /** Local uploads win over fetched thumbs until the next supplier load. */
  const [parentThumbOverrides, setParentThumbOverrides] = useState<
    Record<string, string>
  >({});
  const [cart, setCart] = useState<SupplyCartLine[]>([]);
  const [extras, setExtras] = useState<ManifestExtra[]>([]);
  const [saving, setSaving] = useState(false);
  const [pulseCart, setPulseCart] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [linkProductsOpen, setLinkProductsOpen] = useState(false);
  /** When false, tile/parent edit controls stay hidden even for admins. */
  const [adminEditOn, setAdminEditOn] = useState(false);
  const [lastInvoice, setLastInvoice] =
    useState<SupplyInvoiceReceiptSnapshot | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestoredAt, setDraftRestoredAt] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const linksRef = useRef<SupplierItemLinkRecord[]>([]);
  const persistSnapshotRef = useRef<{
    supplierId: string;
    supplierName: string;
    branchId: string;
    lines: SupplyCartLine[];
    extras: ManifestExtra[];
  } | null>(null);
  const draftBusinessId =
    business?.id?.trim() || getSessionTenantId()?.trim() || "";
  const draftUserId = me?.id?.trim() || "";

  useEffect(() => {
    if (!canToggleAdminEdit) return;
    try {
      setAdminEditOn(
        window.localStorage.getItem(ADMIN_EDIT_STORAGE_KEY) === "1",
      );
    } catch {
      // Storage unavailable — stay locked until the admin toggles.
    }
  }, [canToggleAdminEdit]);

  const editStockLive = canEditStock && adminEditOn;
  const editCatalogLive = canEditCatalog && adminEditOn;

  const toggleAdminEdit = () => {
    setAdminEditOn((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          ADMIN_EDIT_STORAGE_KEY,
          next ? "1" : "0",
        );
      } catch {
        // Ignore quota / private-mode failures.
      }
      toast.success(
        next
          ? "Editing on — tap pencils, stock, photos, barcodes"
          : "Editing locked",
      );
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    setResolveBusy(true);
    setResolveError(null);
    setSupplier(null);
    setCandidates([]);
    setCart([]);
    setExtras([]);
    setDraftReady(false);
    setDraftRestoredAt(null);
    setParentFilterId(null);
    setFilter("");
    setFetchedParentThumbs({});
    setParentThumbOverrides({});

    const run = async () => {
      try {
        const idHint = supplierId?.trim() || "";
        const slugHint = slug.trim();
        if (idHint || isSupplierIdSegment(slugHint)) {
          const row = await fetchSupplierById(idHint || slugHint);
          if (cancelled) return;
          setSupplier(row);
          setCandidates([row]);
          return;
        }

        if (!slugHint) {
          setResolveError("No supplier selected.");
          return;
        }

        const hint = supplierSlugSearchHint(slugHint);
        const page = await fetchSuppliersPage({
          ...(hint ? { search: hint } : {}),
          status: "active",
          page: 0,
          size: 100,
        });
        if (cancelled) return;

        let resolved = resolveSupplierFromSlug(page.content, slugHint);
        if (resolved.candidates.length === 0 && hint) {
          const broad = await fetchSuppliersPage({
            status: "active",
            page: 0,
            size: 200,
          });
          if (cancelled) return;
          resolved = resolveSupplierFromSlug(broad.content, slugHint);
        }

        setCandidates(resolved.candidates);
        setSupplier(resolved.match);
        if (!resolved.match && resolved.candidates.length === 0) {
          setResolveError("No supplier matches this link.");
        }
      } catch (e) {
        if (!cancelled) {
          setResolveError(
            e instanceof Error ? e.message : "Could not load supplier",
          );
        }
      } finally {
        if (!cancelled) setResolveBusy(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [resolveKey, supplierId, slug]);

  // Restore per-supplier manifest draft after supplier resolves.
  useEffect(() => {
    if (!supplier?.id || !draftBusinessId || !draftUserId) {
      setDraftReady(false);
      return;
    }
    const draft = loadReceiveTillDraft(
      draftBusinessId,
      draftUserId,
      supplier.id,
    );
    const draftExtras = draft?.extras ?? [];
    const hasLines = Boolean(draft && draft.lines.length > 0);
    const hasExtras = draftExtras.some(
      (e) => e.amount.trim() || e.desc.trim() || e.category.trim(),
    );
    if (draft && (hasLines || hasExtras)) {
      setCart(draft.lines);
      setExtras(draftExtras);
      setDraftRestoredAt(draft.updatedAt);
      const n = draft.lines.length;
      toast.message(
        hasLines
          ? `Restored draft · ${n} item${n === 1 ? "" : "s"}`
          : "Restored draft · extra costs",
        {
          description: formatReceiveTillDraftAge(draft.updatedAt),
          duration: 4000,
        },
      );
    } else {
      setCart([]);
      setExtras([]);
      setDraftRestoredAt(null);
    }
    setDraftReady(true);
  }, [supplier?.id, draftBusinessId, draftUserId]);

  // Keep a flushable snapshot so exit / supplier switch cannot drop mid-edit qty.
  useEffect(() => {
    if (!supplier?.id || !draftReady) {
      return;
    }
    persistSnapshotRef.current = {
      supplierId: supplier.id,
      supplierName: supplier.name,
      branchId: branchId.trim(),
      lines: cart,
      extras,
    };
  }, [supplier?.id, supplier?.name, branchId, cart, extras, draftReady]);

  // Debounced autosave while editing this till.
  useEffect(() => {
    if (!draftReady || !supplier?.id || !draftBusinessId || !draftUserId) {
      return;
    }
    const timer = window.setTimeout(() => {
      saveReceiveTillDraft({
        businessId: draftBusinessId,
        userId: draftUserId,
        branchId: branchId.trim(),
        supplierId: supplier.id,
        supplierName: supplier.name,
        lines: cart,
        extras,
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [
    cart,
    extras,
    draftReady,
    supplier?.id,
    supplier?.name,
    draftBusinessId,
    draftUserId,
    branchId,
  ]);

  // Flush previous supplier draft when leaving this till (Cashier / List / switch).
  useEffect(() => {
    if (!draftBusinessId || !draftUserId) {
      return;
    }
    return () => {
      const snap = persistSnapshotRef.current;
      if (!snap) {
        return;
      }
      saveReceiveTillDraft({
        businessId: draftBusinessId,
        userId: draftUserId,
        branchId: snap.branchId,
        supplierId: snap.supplierId,
        supplierName: snap.supplierName,
        lines: snap.lines,
        extras: snap.extras,
      });
    };
  }, [supplier?.id, draftBusinessId, draftUserId]);

  useEffect(() => {
    if (!supplier || !branchId.trim()) {
      setLinks([]);
      return;
    }
    let cancelled = false;
    setLinksBusy(true);
    void fetchSupplierItemLinks(supplier.id, { branchId })
      .then((list) => {
        if (!cancelled) setLinks(list.filter((l) => l.active));
      })
      .catch(() => {
        if (!cancelled) {
          setLinks([]);
          toast.error("Could not load supplier products");
        }
      })
      .finally(() => {
        if (!cancelled) setLinksBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplier, branchId]);

  useEffect(() => {
    const parentIds = [...new Set(links.map(linkParentId))];
    if (parentIds.length === 0) {
      setFetchedParentThumbs({});
      return;
    }

    let cancelled = false;
    void Promise.all(
      parentIds.map(async (id) => {
        const direct = links
          .find((l) => l.itemId === id)
          ?.thumbnailUrl?.trim();
        if (direct) {
          return [id, direct] as const;
        }
        try {
          const detail = await fetchItemById(id, {
            branchId: branchId.trim() || undefined,
          });
          const fromSummary = itemListThumbnailUrl(detail);
          if (fromSummary) {
            return [id, fromSummary] as const;
          }
          const fromGallery = detail.images
            ?.map((img) => img.secureUrl?.trim())
            .find((url): url is string => Boolean(url));
          return [id, fromGallery ?? null] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, string | null> = {};
      for (const [id, url] of pairs) {
        next[id] = url;
      }
      setFetchedParentThumbs(next);
    });

    return () => {
      cancelled = true;
    };
  }, [links, branchId]);

  const parentOptions = useMemo((): ParentOption[] => {
    const map = new Map<string, string>();
    for (const link of links) {
      const id = linkParentId(link);
      if (!map.has(id)) {
        map.set(id, linkParentLabel(link));
      }
    }
    const sorted = [...map.entries()]
      .map(([id, label]) => ({
        id,
        label,
        thumbnailUrl:
          parentThumbOverrides[id] ??
          fetchedParentThumbs[id] ??
          links.find((l) => l.itemId === id)?.thumbnailUrl?.trim() ??
          null,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, "en", { sensitivity: "base" }),
      );
    return [
      { id: null, label: "All", thumbnailUrl: null },
      ...sorted,
    ];
  }, [links, fetchedParentThumbs, parentThumbOverrides]);

  const showParentRail = parentOptions.length > 2;

  useEffect(() => {
    if (
      parentFilterId &&
      !parentOptions.some((p) => p.id === parentFilterId)
    ) {
      setParentFilterId(null);
    }
  }, [parentFilterId, parentOptions]);

  const visibleLinks = useMemo(() => {
    const byParent = parentFilterId
      ? links.filter((l) => linkParentId(l) === parentFilterId)
      : links;
    const q = filter.trim().toLowerCase();
    if (!q) return byParent;
    return byParent.filter(
      (l) =>
        l.itemName.toLowerCase().includes(q) ||
        l.sku.toLowerCase().includes(q) ||
        (l.barcode ?? "").toLowerCase().includes(q) ||
        (l.parentItemName ?? "").toLowerCase().includes(q),
    );
  }, [links, filter, parentFilterId]);

  const cartQtyByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart) {
      const q = supplyStockQty(line.qtyStr, line.packMode) ?? 0;
      if (q > 0) map.set(line.itemId, q);
    }
    return map;
  }, [cart]);

  const readyLines = useMemo(
    () =>
      cart.filter((l) => {
        const qty = supplyStockQty(l.qtyStr, l.packMode);
        const cost = supplyUnitCost(l.costStr, l.packMode);
        return qty != null && cost != null;
      }),
    [cart],
  );

  const payable = useMemo(() => {
    const linesTotal = readyLines.reduce((sum, l) => {
      const total = supplyLineTotal(l.qtyStr, l.costStr, l.packMode) ?? 0;
      return sum + total;
    }, 0);
    return Math.round((linesTotal + extrasTotalOf(extras)) * 100) / 100;
  }, [readyLines, extras]);

  const [packSheetItemId, setPackSheetItemId] = useState<string | null>(null);
  const packSheetLine = packSheetItemId
    ? cart.find((l) => l.itemId === packSheetItemId) ?? null
    : null;

  const togglePack = useCallback((itemId: string) => {
    const line = cart.find((l) => l.itemId === itemId);
    if (!line) return;
    if (line.packMode) {
      setCart((prev) =>
        prev.map((l) =>
          l.itemId === itemId ? applyLinePackMode(l, null) : l,
        ),
      );
      return;
    }
    setPackSheetItemId(itemId);
  }, [cart]);

  const editPack = useCallback((itemId: string) => {
    setPackSheetItemId(itemId);
  }, []);

  const markAdded = useCallback((itemId: string) => {
    setPulseCart(true);
    setJustAddedId(itemId);
    window.setTimeout(() => {
      setPulseCart(false);
      setJustAddedId(null);
    }, 450);
  }, []);

  const addLinkToCart = useCallback(
    (link: SupplierItemLinkRecord) => {
      setCart((prev) => {
        const existing = prev.find((l) => l.itemId === link.itemId);
        if (!existing) {
          return [...prev, linkToCartSeed(link)];
        }
        const qty = parsePos(existing.qtyStr) ?? 0;
        return prev.map((l) =>
          l.itemId === link.itemId
            ? { ...l, qtyStr: String(qty + 1) }
            : l,
        );
      });
      markAdded(link.itemId);
    },
    [markAdded],
  );

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  const applyBarcodeToCart = useCallback(
    (raw: string) => {
      const code = raw.trim();
      if (!code) return;
      const q = code.toLowerCase();
      const hit = linksRef.current.find((l) => {
        const barcode = (l.barcode ?? "").trim().toLowerCase();
        const sku = (l.sku ?? "").trim().toLowerCase();
        return (barcode && barcode === q) || (sku && sku === q);
      });
      if (hit) {
        addLinkToCart(hit);
        toast.success(`Added ${hit.itemName || hit.sku || "product"}`);
        setFilter("");
        return;
      }
      toast.error("Not linked to this supplier", {
        description: code,
      });
      setFilter(code);
    },
    [addLinkToCart],
  );

  usePosBarcodeWedge({
    enabled: Boolean(supplier) && !saving && !resolveBusy,
    onScan: applyBarcodeToCart,
    searchInputRef,
  });

  const clearManifestDraft = useCallback(() => {
    if (!supplier?.id || !draftBusinessId || !draftUserId) {
      setCart([]);
      setExtras([]);
      setDraftRestoredAt(null);
      return;
    }
    clearReceiveTillDraft(draftBusinessId, draftUserId, supplier.id);
    persistSnapshotRef.current = {
      supplierId: supplier.id,
      supplierName: supplier.name,
      branchId: branchId.trim(),
      lines: [],
      extras: [],
    };
    setCart([]);
    setExtras([]);
    setDraftRestoredAt(null);
    toast.message("Draft cleared");
  }, [
    supplier?.id,
    supplier?.name,
    draftBusinessId,
    draftUserId,
    branchId,
  ]);

  const reloadLinks = useCallback(async () => {
    if (!supplier || !branchId.trim()) return;
    try {
      const list = await fetchSupplierItemLinks(supplier.id, {
        branchId,
      });
      setLinks(list.filter((l) => l.active));
    } catch {
      toast.error("Could not refresh supplier products");
    }
  }, [supplier, branchId]);

  const linkedItemIds = useMemo(
    () => new Set(links.map((l) => l.itemId)),
    [links],
  );

  const onPhotoUploaded = useCallback((itemId: string, imageUrl: string) => {
    setLinks((prev) =>
      prev.map((l) =>
        l.itemId === itemId ? { ...l, thumbnailUrl: imageUrl } : l,
      ),
    );
    setParentThumbOverrides((prev) => ({ ...prev, [itemId]: imageUrl }));
  }, []);

  const onParentPhotoUploaded = useCallback(
    (parentId: string, imageUrl: string) => {
      setParentThumbOverrides((prev) => ({ ...prev, [parentId]: imageUrl }));
      setLinks((prev) =>
        prev.map((l) =>
          l.itemId === parentId ? { ...l, thumbnailUrl: imageUrl } : l,
        ),
      );
    },
    [],
  );

  const onStockUpdated = useCallback((itemId: string, nextStock: number) => {
    setLinks((prev) =>
      prev.map((l) =>
        l.itemId === itemId ? { ...l, currentStock: nextStock } : l,
      ),
    );
    setCart((prev) =>
      prev.map((l) =>
        l.itemId === itemId ? { ...l, stock: nextStock } : l,
      ),
    );
  }, []);

  const onBarcodeUpdated = useCallback(
    (itemId: string, barcode: string | null) => {
      setLinks((prev) =>
        prev.map((l) =>
          l.itemId === itemId ? { ...l, barcode } : l,
        ),
      );
    },
    [],
  );

  const onNameUpdated = useCallback((itemId: string, name: string) => {
    setLinks((prev) =>
      prev.map((l) => {
        if (l.itemId === itemId) {
          return { ...l, itemName: name };
        }
        // Keep parent rail labels in sync when renaming a parent product.
        if (l.variantOfItemId === itemId) {
          return { ...l, parentItemName: name };
        }
        return l;
      }),
    );
    setCart((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, name } : l)),
    );
  }, []);

  const patchLine = (itemId: string, patch: Partial<SupplyCartLine>) => {
    setCart((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)),
    );
  };

  const removeLine = (itemId: string) => {
    setCart((prev) => prev.filter((l) => l.itemId !== itemId));
  };

  const onPost = async () => {
    if (!supplier) {
      toast.error("Pick a supplier");
      return;
    }
    const bid = branchId.trim();
    if (!bid) {
      toast.error("Select a branch first");
      return;
    }
    if (readyLines.length === 0) {
      toast.error("Enter qty and buy price on at least one product");
      return;
    }

    const postedLines = readyLines.map((line) => {
      const qty = supplyStockQty(line.qtyStr, line.packMode)!;
      const cost = supplyUnitCost(line.costStr, line.packMode)!;
      const lineTotal = supplyLineTotal(line.qtyStr, line.costStr, line.packMode)!;
      return {
        description: line.name,
        quantity: qty,
        unitCost: cost,
        lineTotal,
        sku: line.sku || null,
      };
    });
    const receiptBranch = branches.find((b) => b.id === bid) ?? null;
    const receiptSettings = receiptBranch?.receipt ?? null;

    setSaving(true);
    try {
      const session = await createPathBSession({
        supplierId: supplier.id,
        branchId: bid,
        receivedAt: new Date().toISOString(),
        notes: `Receive from ${supplier.name}`,
      });

      const synced: { line: SupplyCartLine; serverLineId: string }[] = [];
      for (const line of readyLines) {
        const qty = supplyStockQty(line.qtyStr, line.packMode)!;
        const cost = supplyUnitCost(line.costStr, line.packMode)!;
        const amountMoney =
          supplyLineTotal(line.qtyStr, line.costStr, line.packMode)!;
        const created = await addPathBLine(session.id, {
          description: `${line.name}${line.sku ? ` (${line.sku})` : ""}`,
          amountMoney,
          suggestedItemId: line.itemId,
          draftQty: qty,
          draftUnitCost: cost,
        });
        synced.push({ line, serverLineId: created.id });
      }

      const postedExtras = extras
        .map((e) => {
          const amount = parseNonNeg(e.amount);
          if (amount == null || amount <= 0) return null;
          const category = (e.category.trim() || "other").toLowerCase();
          return {
            category,
            amount,
            description: e.desc?.trim() || null,
          };
        })
        .filter((e): e is NonNullable<typeof e> => e != null);

      const postResult = await postPathBSession(session.id, {
        lines: synced.map(({ line, serverLineId }) => ({
          lineId: serverLineId,
          itemId: line.itemId,
          usableQty: supplyStockQty(line.qtyStr, line.packMode)!,
          wastageQty: 0,
        })),
      });

      const sbId = postResult.supplyBatchId?.trim();
      if (sbId && postedExtras.length > 0) {
        for (const e of postedExtras) {
          try {
            await addSupplyBatchExpense(sbId, {
              category: e.category,
              amount: e.amount,
              description: e.description,
            });
          } catch {
            /* stock already posted; expense is best-effort */
          }
        }
      }

      if (canSetSellPrice) {
        const now = new Date().toISOString();
        for (const line of readyLines) {
          const sell = parseNonNeg(line.sellStr);
          if (sell == null) continue;
          const seed = parseNonNeg(line.seedSell);
          if (seed != null && Math.abs(sell - seed) < 0.005) continue;
          try {
            await postSellingPrice({
              itemId: line.itemId,
              branchId: bid,
              price: sell,
              effectiveFrom: now,
              notes: `Set from supplier receive · ${supplier.name}`,
            });
          } catch {
            /* stock already posted; price is best-effort */
          }
        }
      }

      const invoice = buildSupplyInvoiceReceiptSnapshot({
        businessName: business?.name?.trim() || "Store",
        logoUrl: business?.branding?.logoUrl ?? null,
        branchName: receiptBranch?.name?.trim() || activeBranchName || "",
        branchAddress: receiptBranch?.address ?? null,
        branchPhone: receiptSettings?.phone ?? null,
        branchEmail: receiptSettings?.email ?? null,
        branchWebsite: resolveReceiptWebsite(
          receiptSettings?.website,
          business?.primaryDomain,
        ),
        tillNumber: receiptSettings?.tillNumber ?? null,
        receivedByName: me?.name?.trim() || null,
        sessionId: session.id,
        supplierName: supplier.name,
        supplierCode: supplier.code ?? null,
        currency,
        receivedAt: new Date().toISOString(),
        lines: postedLines,
        extras: postedExtras,
        portalUrl: publicSupplierPortalUrl(supplierSlug(supplier)),
      });

      setLastInvoice(invoice);
      setCart([]);
      setExtras([]);
      setMobileCartOpen(false);
      setDraftRestoredAt(null);
      if (draftBusinessId && draftUserId) {
        clearReceiveTillDraft(draftBusinessId, draftUserId, supplier.id);
      }
      persistSnapshotRef.current = {
        supplierId: supplier.id,
        supplierName: supplier.name,
        branchId: bid,
        lines: [],
        extras: [],
      };
      onPosted?.();

      const printed = await printSupplyInvoiceReceipt(
        invoice,
        undefined,
        {
          cupsName: receiptSettings?.printerCupsName ?? null,
          branchId: bid,
        },
        { quiet: true },
      );

      toast.success(
        printed
          ? readyLines.length === 1
            ? `Stock updated · invoice printed · ${payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })} ${currency}`
            : `${readyLines.length} products updated · invoice printed · ${payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })} ${currency}`
          : readyLines.length === 1
            ? `Stock updated · ${payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })} ${currency}`
            : `${readyLines.length} products updated · ${payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })} ${currency}`,
      );

      void fetchSupplierItemLinks(supplier.id, { branchId: bid }).then((list) =>
        setLinks(list.filter((l) => l.active)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post supply");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className={cn(DASHBOARD_SECTION_SURFACE, "m-3")}>
        <DashboardAccessDenied
          title="Receive stock locked"
          description="You need receive-stock access to open a supplier till."
          backHref={isDrawer ? undefined : APP_ROUTES.cashier}
          backLabel={isDrawer ? undefined : "Back to cashier"}
        />
        {isDrawer && onClose ? (
          <div className="mt-3 flex justify-center pb-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  if (resolveBusy) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Finding supplier…
      </div>
    );
  }

  if (!supplier && candidates.length > 1) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-4 py-6" style={brandTheme}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Multiple matches
        </p>
        <h1 className="pos-market-section-label text-2xl text-[var(--pos-ink,#1c1915)] dark:text-foreground">
          Which supplier?
        </h1>
        <p className="text-sm text-muted-foreground">
          More than one supplier uses “{slug || "this link"}”. Pick one to open the receive till.
        </p>
        <ul className="divide-y border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
          {candidates.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/40"
                onClick={() => {
                  setSupplier(c);
                  setCandidates([c]);
                  if (!isDrawer) {
                    // Prefer a stable id URL when names collide.
                    router.replace(APP_ROUTES.supplier(c.id));
                  }
                }}
              >
                <Truck className="size-4 shrink-0 text-[var(--pos-primary)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.name}</span>
                  {c.code ? (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {c.code}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {isDrawer && onClose ? (
          <Button type="button" variant="ghost" size="sm" className="self-start gap-1.5" onClick={onClose}>
            <ArrowLeft className="size-3.5" />
            Back to cashier
          </Button>
        ) : (
          <Link
            href={APP_ROUTES.suppliers}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to suppliers
          </Link>
        )}
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-4 py-6" style={brandTheme}>
        <h1 className="pos-market-section-label text-2xl text-[var(--pos-ink,#1c1915)] dark:text-foreground">
          Supplier not found
        </h1>
        <p className="text-sm text-muted-foreground">
          {resolveError ??
            (slug
              ? `No active supplier matches /supplier/${slug}.`
              : "No supplier selected.")}
        </p>
        <div className="flex flex-wrap gap-2">
          {isDrawer && onClose ? (
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={APP_ROUTES.supplierDirectory}>Browse suppliers</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={APP_ROUTES.suppliers}>Suppliers directory</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  const draftHint =
    cart.length > 0 || extras.length > 0
      ? draftRestoredAt
        ? `Draft restored · ${formatReceiveTillDraftAge(draftRestoredAt)} · saves on this device`
        : "Draft saved on this device"
      : null;

  const cartPanelProps = {
    supplierName: supplier.name,
    currency,
    lines: cart,
    extras,
    payable,
    pulse: pulseCart,
    saving,
    canPost: readyLines.length > 0 && Boolean(branchId.trim()),
    canSetSellPrice,
    draftHint,
    onClearDraft: clearManifestDraft,
    onPatch: patchLine,
    onRemove: removeLine,
    onTogglePack: togglePack,
    onEditPack: editPack,
    onExtrasChange: setExtras,
    onPost,
  };

  return (
    <div
      className={cn(
        "mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden",
        isDrawer ? "pb-0" : "pb-24 lg:pb-0",
      )}
      style={brandTheme as CSSProperties}
    >
      <div className="flex h-full min-h-0 flex-1 items-stretch overflow-hidden">
        {showParentRail ? (
          <aside
            className={cn(
              "hidden min-h-0 w-[6.75rem] shrink-0 flex-col lg:flex xl:w-[7.5rem]",
              "border-r-2 border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_22%,transparent)]",
              "bg-[color-mix(in_srgb,var(--pos-paper,#e8e0d4)_88%,var(--pos-primary)_6%)]",
              "shadow-[inset_-6px_0_12px_-10px_color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)]",
              "dark:border-border dark:bg-muted/35 dark:shadow-none",
            )}
          >
            <div className={PARENT_RAIL_HEADER}>Parent</div>
            <nav
              aria-label="Filter by parent product"
              className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-1"
            >
              {parentOptions.map((parent) => (
                <ParentFolderButton
                  key={parent.id ?? "all"}
                  parent={parent}
                  active={parentFilterId === parent.id}
                  canEditPhoto={editCatalogLive}
                  onSelect={() => setParentFilterId(parent.id)}
                  onPhotoUploaded={onParentPhotoUploaded}
                />
              ))}
            </nav>
          </aside>
        ) : null}

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] dark:border-border/40 dark:bg-background">
          <section className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2 pb-1.5 pt-1.5 dark:border-border/40 sm:px-3">
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary)]"
            />
            <div className="flex flex-wrap items-center justify-between gap-1.5 pl-1.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Receive
                  </p>
                  {branchesLoading ? (
                    <span className="text-[10px] text-muted-foreground">
                      Loading branches…
                    </span>
                  ) : activeBranchName ? (
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      @ {activeBranchName}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-800 dark:text-amber-200">
                      Pick a branch ↑
                    </span>
                  )}
                </div>
                <h2 className="pos-market-section-label mt-0.5 text-[1.05rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
                  {supplier.name}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {canToggleAdminEdit ? (
                  <button
                    type="button"
                    onClick={toggleAdminEdit}
                    className={cn(
                      adminEditOn ? CHIP_ACCENT : CHIP_IDLE,
                      adminEditOn &&
                        "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)]",
                    )}
                    aria-pressed={adminEditOn}
                    title={
                      adminEditOn
                        ? "Lock editing (photos, name, stock, barcode)"
                        : "Enable editing (photos, name, stock, barcode)"
                    }
                  >
                    {adminEditOn ? (
                      <Unlock className="size-3" aria-hidden />
                    ) : (
                      <Pencil className="size-3" aria-hidden />
                    )}
                    {adminEditOn ? "Editing" : "Edit"}
                  </button>
                ) : null}
                {canCreateProduct ? (
                  <button
                    type="button"
                    onClick={() => setCreateProductOpen(true)}
                    className={CHIP_ACCENT}
                  >
                    <PackagePlus className="size-3" aria-hidden />
                    Create
                  </button>
                ) : null}
                {canLinkProducts ? (
                  <button
                    type="button"
                    onClick={() => setLinkProductsOpen(true)}
                    className={CHIP_ACCENT}
                  >
                    <Link2 className="size-3" aria-hidden />
                    Link
                  </button>
                ) : null}
                {isDrawer && onClose ? (
                  <button type="button" onClick={onClose} className={CHIP_IDLE}>
                    <X className="size-3" aria-hidden />
                    Close
                  </button>
                ) : (
                  <>
                    <Link href={APP_ROUTES.cashier} className={CHIP_IDLE}>
                      <ArrowLeft className="size-3" aria-hidden />
                      Cashier
                    </Link>
                    <Link href={APP_ROUTES.suppliers} className={CHIP_IDLE}>
                      <Truck className="size-3" aria-hidden />
                      List
                    </Link>
                  </>
                )}
              </div>
            </div>
          </section>

          <div className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] dark:border-border/40">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              className={cn(
                fieldClass,
                "h-9 border-0 bg-transparent pl-8 text-[13px] shadow-none focus-visible:ring-0",
              )}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const q = filter.trim();
                if (q.length < 4) return;
                // HID scanners that focus the search box end with Enter.
                const exact = linksRef.current.find((l) => {
                  const barcode = (l.barcode ?? "").trim().toLowerCase();
                  const sku = (l.sku ?? "").trim().toLowerCase();
                  const needle = q.toLowerCase();
                  return (barcode && barcode === needle) || (sku && sku === needle);
                });
                if (!exact) return;
                e.preventDefault();
                applyBarcodeToCart(q);
              }}
              placeholder="Find a product or scan barcode…"
              disabled={saving || linksBusy}
            />
          </div>

          {showParentRail ? (
            <div
              className={cn(
                "flex gap-1 overflow-x-auto border-b-2 p-1.5 scrollbar-none lg:hidden",
                "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)]",
                "bg-[color-mix(in_srgb,var(--pos-paper,#e8e0d4)_88%,var(--pos-primary)_6%)]",
                "dark:border-border dark:bg-muted/35",
              )}
            >
              {parentOptions.map((parent) => (
                <ParentFolderButton
                  key={parent.id ?? "all"}
                  parent={parent}
                  active={parentFilterId === parent.id}
                  canEditPhoto={editCatalogLive}
                  className="size-[3.75rem] shrink-0"
                  onSelect={() => setParentFilterId(parent.id)}
                  onPhotoUploaded={onParentPhotoUploaded}
                />
              ))}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-y-contain px-1.5 py-1.5 sm:px-2.5">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <h3 className="flex items-baseline gap-2 pos-market-section-label text-[0.9rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
                {parentFilterId
                  ? parentOptions.find((p) => p.id === parentFilterId)?.label ??
                    "Shelf"
                  : "Shelf"}
                <span className="font-mono text-[10px] font-medium tabular-nums tracking-normal text-muted-foreground">
                  {visibleLinks.length}
                </span>
              </h3>
              {canCreateProduct || canLinkProducts ? (
                <div className="hidden items-center gap-2 sm:flex">
                  {canCreateProduct ? (
                    <button
                      type="button"
                      onClick={() => setCreateProductOpen(true)}
                      className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--pos-primary)] underline-offset-2 hover:underline"
                    >
                      Create
                    </button>
                  ) : null}
                  {canLinkProducts ? (
                    <button
                      type="button"
                      onClick={() => setLinkProductsOpen(true)}
                      className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--pos-primary)] underline-offset-2 hover:underline"
                    >
                      Link
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {linksBusy ? (
              <div className="flex items-center justify-center gap-2 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] py-10 text-[11px] text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Loading products…
              </div>
            ) : visibleLinks.length === 0 ? (
              <div className="space-y-3 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] py-10 text-center text-[11px] text-muted-foreground">
                <p>
                  {links.length === 0
                    ? "No linked products yet."
                    : parentFilterId
                      ? "No products under this parent."
                      : "No products match your search."}
                </p>
                {links.length === 0 && (canCreateProduct || canLinkProducts) ? (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {canCreateProduct ? (
                      <button
                        type="button"
                        onClick={() => setCreateProductOpen(true)}
                        className={CHIP_ACCENT}
                      >
                        <PackagePlus className="size-3" aria-hidden />
                        Create product
                      </button>
                    ) : null}
                    {canLinkProducts ? (
                      <button
                        type="button"
                        onClick={() => setLinkProductsOpen(true)}
                        className={CHIP_ACCENT}
                      >
                        <Link2 className="size-3" aria-hidden />
                        Link product
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1 sm:grid-cols-5 sm:gap-1 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                {visibleLinks.map((link) => (
                  <ProductTile
                    key={link.id}
                    link={link}
                    cartQty={cartQtyByItem.get(link.itemId) ?? 0}
                    justAdded={justAddedId === link.itemId}
                    currency={currency}
                    branchId={branchId}
                    canEditStock={editStockLive}
                    canEditCatalog={editCatalogLive}
                    onPick={() => addLinkToCart(link)}
                    onPhotoUploaded={onPhotoUploaded}
                    onStockUpdated={onStockUpdated}
                    onBarcodeUpdated={onBarcodeUpdated}
                    onNameUpdated={onNameUpdated}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="hidden h-full min-h-0 lg:flex">
          <SupplyCartPanel {...cartPanelProps} />
        </div>
      </div>

      <button
        type="button"
        className={cn(
          "fixed bottom-3 right-3 z-30 flex h-12 items-center gap-2 px-3.5 lg:hidden",
          "bg-[var(--pos-primary)] text-[var(--pos-primary-ink,#fff)]",
          "shadow-[3px_3px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_35%,transparent)]",
          pulseCart && "translate-x-px translate-y-px shadow-none",
        )}
        onClick={() => setMobileCartOpen(true)}
      >
        <ShoppingCart className="size-4" aria-hidden />
        <span className="font-mono text-[12px] font-bold tabular-nums">
          {cart.length}
          <span className="mx-1.5 opacity-50">·</span>
          {payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })}{" "}
          {currency}
        </span>
      </button>

      {mobileCartOpen ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_45%,transparent)] p-2 backdrop-blur-[2px] lg:hidden">
          <SupplyCartPanel
            {...cartPanelProps}
            onCloseMobile={() => setMobileCartOpen(false)}
          />
        </div>
      ) : null}

      {lastInvoice ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_50%,transparent)] p-3 backdrop-blur-[2px] sm:items-center">
          <div
            className="max-h-[min(92dvh,40rem)] w-full max-w-sm overflow-y-auto border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--card)_96%,#faf7f1)] p-3 shadow-[4px_4px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_25%,transparent)]"
            style={brandTheme as CSSProperties}
          >
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Posted · supply invoice
            </p>
            <SupplyInvoiceReceipt
              receipt={lastInvoice}
              receiptPrinter={{
                cupsName:
                  branches.find((b) => b.id === branchId)?.receipt
                    ?.printerCupsName ?? null,
                branchId,
              }}
              onDismiss={() => setLastInvoice(null)}
            />
          </div>
        </div>
      ) : null}

      {canCreateProduct ? (
        <CashierCreateProductModal
          open={createProductOpen}
          onOpenChange={setCreateProductOpen}
          brandTheme={brandTheme}
          currency={currency}
          branchId={branchId}
          itemTypes={itemTypes}
          preferredItemTypeId={itemTypeId || null}
          purpose="receive"
          onCreated={(item) => {
            void (async () => {
              try {
                await addItemSupplierLink(item.id, {
                  supplierId: supplier.id,
                  setPrimary: true,
                });
                toast.success(`Linked “${item.name}” → ${supplier.name}`);
              } catch (e) {
                toast.error(
                  e instanceof Error
                    ? e.message
                    : "Product created but could not link to supplier",
                );
              }
              await reloadLinks();
            })();
          }}
        />
      ) : null}

      {canLinkProducts ? (
        <SupplierReceiveLinkModal
          open={linkProductsOpen}
          onOpenChange={setLinkProductsOpen}
          brandTheme={brandTheme}
          supplier={supplier}
          linkedItemIds={linkedItemIds}
          onLinked={() => {
            void reloadLinks();
          }}
        />
      ) : null}

      <SupplyPackQtyModal
        open={packSheetLine != null}
        onOpenChange={(open) => {
          if (!open) setPackSheetItemId(null);
        }}
        defaults={
          packSheetLine
            ? {
                productLabel: packSheetLine.name,
                packSize:
                  packSheetLine.packMode?.unitsPerPack ??
                  packSheetLine.catalogPackSize ??
                  null,
                packUnit:
                  packSheetLine.packMode?.packUnit ??
                  packSheetLine.catalogPackUnit ??
                  "pack",
              }
            : null
        }
        initialUnitsPerPack={packSheetLine?.packMode?.unitsPerPack ?? null}
        onApply={(result) => {
          if (!packSheetLine) return;
          const itemId = packSheetLine.itemId;
          setCart((prev) =>
            prev.map((l) => {
              if (l.itemId !== itemId) return l;
              const withMode = applyLinePackMode(l, {
                unitsPerPack: result.unitsPerPack,
                packUnit: result.packUnit || "pack",
              });
              const next: SupplyCartLine = {
                ...withMode,
                qtyStr: withMode.qtyStr.trim() ? withMode.qtyStr : "1",
              };
              if (result.packPrice != null) {
                next.costStr = result.packPrice.toFixed(2);
              }
              return next;
            }),
          );
          setPackSheetItemId(null);
        }}
      />
    </div>
  );
}
