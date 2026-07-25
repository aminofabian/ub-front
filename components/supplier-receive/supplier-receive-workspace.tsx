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
  Search,
  ShoppingCart,
  Trash2,
  Truck,
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
import { Button } from "@/components/ui/button";
import {
  addItemSupplierLink,
  addPathBLine,
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
import { posBrandThemeStyle } from "@/lib/brand-theme";
import { kioskPlaceholderWashClass } from "@/components/cashier/kiosk-listing-styles";
import { APP_ROUTES } from "@/lib/config";
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
  supplierSlugSearchHint,
} from "@/lib/supplier-slug";
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
};

type SupplierReceiveWorkspaceProps = {
  slug: string;
};

const TILE_SHELL = cn(
  "group relative flex h-full flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] text-left transition-[border-color,background-color] duration-150",
  "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] hover:bg-card",
  "focus:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_40%,transparent)]",
  "active:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_40%,var(--card))]",
  "dark:border-border/40 dark:bg-card",
);

const fieldClass = cn(
  "w-full rounded-lg border border-border/60 bg-background px-2.5 py-2 text-sm shadow-sm",
  "placeholder:text-muted-foreground/50",
  "focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_22%,transparent)]",
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
  // Standalone / parent row — strip variant suffix when present.
  const name = link.itemName?.trim() || link.sku?.trim() || "Product";
  const sep = name.indexOf(" · ");
  return sep > 0 ? name.slice(0, sep) : name;
}

type ParentOption = {
  id: string | null;
  label: string;
  thumbnailUrl: string | null;
};

const PARENT_RAIL_BASE = cn(
  "relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-none border",
  "text-center text-[11px] font-semibold leading-tight transition touch-manipulation",
);

function parentRailClass(active: boolean, hasImage: boolean): string {
  if (hasImage) {
    return cn(
      PARENT_RAIL_BASE,
      "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)]",
      "dark:border-border/40",
      active && "border-[var(--pos-primary)] ring-2 ring-inset ring-[var(--pos-primary)]",
    );
  }
  return active
    ? cn(
        PARENT_RAIL_BASE,
        "border-[var(--pos-primary)] bg-[var(--pos-primary)] px-1 text-[var(--pos-primary-ink,#fff)]",
      )
    : cn(
        PARENT_RAIL_BASE,
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-1",
        "bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] text-[var(--pos-ink,#1c1915)]",
        "hover:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,var(--card))]",
        "dark:border-border/40 dark:bg-card dark:text-foreground",
      );
}

const PARENT_RAIL_HEADER = cn(
  "flex h-10 shrink-0 items-center justify-center rounded-none",
  "bg-[var(--pos-primary)] px-2 text-center text-xs font-bold uppercase tracking-wide",
  "text-[var(--pos-primary-ink,#fff)]",
);

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
  };
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
              "pointer-events-none absolute left-0 top-0 z-[1] inline-flex h-6 min-w-6 items-center justify-center px-1.5 text-[11px] font-bold tabular-nums text-[var(--pos-primary-ink,#fff)] bg-[var(--pos-primary)]",
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
      <div className="flex min-h-[3.1rem] w-full flex-1 flex-col justify-center gap-0.5 px-1.5 pb-1.5 pt-1">
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

function SupplyCartPanel({
  supplierName,
  currency,
  lines,
  payable,
  pulse,
  saving,
  canPost,
  canSetSellPrice,
  onPatch,
  onRemove,
  onPost,
  onCloseMobile,
}: {
  supplierName: string;
  currency: string;
  lines: SupplyCartLine[];
  payable: number;
  pulse: boolean;
  saving: boolean;
  canPost: boolean;
  canSetSellPrice: boolean;
  onPatch: (itemId: string, patch: Partial<SupplyCartLine>) => void;
  onRemove: (itemId: string) => void;
  onPost: () => void;
  onCloseMobile?: () => void;
}) {
  return (
    <aside
      className={cn(
        "flex h-full max-h-full min-h-0 w-full shrink-0 flex-col self-stretch overflow-hidden lg:w-[min(100%,22rem)] xl:w-[24rem]",
      )}
    >
      <div
        className={cn(
          "pos-market-receipt flex h-full min-h-0 flex-1 flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] dark:border-border/40",
          pulse &&
            "outline outline-1 outline-[color-mix(in_srgb,var(--pos-primary)_45%,transparent)]",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-3 py-2 dark:border-border/40">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Supply cart
            </p>
            <h2 className="pos-market-section-label mt-0.5 truncate text-lg leading-none text-foreground">
              {supplierName}
            </h2>
          </div>
          {onCloseMobile ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 p-0 lg:hidden"
              onClick={onCloseMobile}
              aria-label="Close cart"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
          {lines.length === 0 ? (
            <p className="border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-3 py-8 text-center text-xs text-muted-foreground">
              Tap products to build this delivery.
            </p>
          ) : (
            lines.map((line) => {
              const qty = parsePos(line.qtyStr) ?? 0;
              const cost = parseNonNeg(line.costStr) ?? 0;
              const lineTotal = Math.round(qty * cost * 100) / 100;
              return (
                <div
                  key={line.itemId}
                  className="space-y-1.5 border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] pb-2 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight">
                        {line.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {line.sku ? `${line.sku} · ` : ""}
                        Stock {formatStock(line.stock)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 p-1 text-destructive/80 hover:text-destructive"
                      onClick={() => onRemove(line.itemId)}
                      aria-label={`Remove ${line.name}`}
                      disabled={saving}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div
                    className={cn(
                      "grid gap-1.5",
                      canSetSellPrice ? "grid-cols-3" : "grid-cols-2",
                    )}
                  >
                    <label className="space-y-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Qty
                      </span>
                      <input
                        className={fieldClass}
                        inputMode="decimal"
                        value={line.qtyStr}
                        disabled={saving}
                        onChange={(e) =>
                          onPatch(line.itemId, { qtyStr: e.target.value })
                        }
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Cost
                      </span>
                      <input
                        className={cn(fieldClass, "bg-amber-50/80 dark:bg-background")}
                        inputMode="decimal"
                        value={line.costStr}
                        disabled={saving}
                        onChange={(e) =>
                          onPatch(line.itemId, { costStr: e.target.value })
                        }
                      />
                    </label>
                    {canSetSellPrice ? (
                      <label className="space-y-0.5">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Sell
                        </span>
                        <input
                          className={fieldClass}
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
                  <p className="text-right text-[11px] font-semibold tabular-nums text-foreground">
                    {lineTotal.toLocaleString("en-KE", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {currency}
                  </p>
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 space-y-2 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-3 py-3 dark:border-border/40">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Payable
              </p>
              <p className="pos-market-section-label text-xl leading-none text-foreground">
                {payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })}{" "}
                <span className="text-sm font-semibold text-muted-foreground">
                  {currency}
                </span>
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {lines.length} line{lines.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            type="button"
            className="h-11 w-full rounded-none text-sm font-semibold"
            disabled={!canPost || saving}
            onClick={onPost}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Posting…
              </>
            ) : (
              <>
                <PackagePlus className="size-4" aria-hidden />
                Post supply
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function SupplierReceiveWorkspace({ slug }: SupplierReceiveWorkspaceProps) {
  const router = useRouter();
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
  const [saving, setSaving] = useState(false);
  const [pulseCart, setPulseCart] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [linkProductsOpen, setLinkProductsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResolveBusy(true);
    setResolveError(null);
    setSupplier(null);
    setCandidates([]);
    setCart([]);
    setParentFilterId(null);
    setFilter("");
    setFetchedParentThumbs({});
    setParentThumbOverrides({});

    const run = async () => {
      try {
        if (isSupplierIdSegment(slug)) {
          const row = await fetchSupplierById(slug.trim());
          if (cancelled) return;
          setSupplier(row);
          setCandidates([row]);
          return;
        }

        const hint = supplierSlugSearchHint(slug);
        const page = await fetchSuppliersPage({
          ...(hint ? { search: hint } : {}),
          status: "active",
          page: 0,
          size: 100,
        });
        if (cancelled) return;

        let resolved = resolveSupplierFromSlug(page.content, slug);
        if (resolved.candidates.length === 0 && hint) {
          const broad = await fetchSuppliersPage({
            status: "active",
            page: 0,
            size: 200,
          });
          if (cancelled) return;
          resolved = resolveSupplierFromSlug(broad.content, slug);
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
  }, [slug]);

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
      const q = parsePos(line.qtyStr) ?? 0;
      if (q > 0) map.set(line.itemId, q);
    }
    return map;
  }, [cart]);

  const readyLines = useMemo(
    () =>
      cart.filter((l) => {
        const qty = parsePos(l.qtyStr);
        const cost = parseNonNeg(l.costStr);
        return qty != null && cost != null;
      }),
    [cart],
  );

  const payable = useMemo(
    () =>
      readyLines.reduce((sum, l) => {
        const qty = parsePos(l.qtyStr) ?? 0;
        const cost = parseNonNeg(l.costStr) ?? 0;
        return sum + qty * cost;
      }, 0),
    [readyLines],
  );

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
        const qty = parsePos(line.qtyStr)!;
        const cost = parseNonNeg(line.costStr)!;
        const amountMoney = Math.round(qty * cost * 100) / 100;
        const created = await addPathBLine(session.id, {
          description: `${line.name}${line.sku ? ` (${line.sku})` : ""}`,
          amountMoney,
          suggestedItemId: line.itemId,
        });
        synced.push({ line, serverLineId: created.id });
      }

      await postPathBSession(session.id, {
        lines: synced.map(({ line, serverLineId }) => ({
          lineId: serverLineId,
          itemId: line.itemId,
          usableQty: parsePos(line.qtyStr)!,
          wastageQty: 0,
        })),
      });

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

      toast.success(
        readyLines.length === 1
          ? `Stock updated · ${payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })} ${currency}`
          : `${readyLines.length} products updated · ${payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })} ${currency}`,
      );
      setCart([]);
      setMobileCartOpen(false);
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
          backHref={APP_ROUTES.cashier}
          backLabel="Back to cashier"
        />
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
          More than one supplier uses “{slug}”. Pick one to open the receive till.
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
                  // Prefer a stable id URL when names collide.
                  router.replace(APP_ROUTES.supplier(c.id));
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
        <Link
          href={APP_ROUTES.suppliers}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to suppliers
        </Link>
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
          {resolveError ?? `No active supplier matches /supplier/${slug}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={APP_ROUTES.supplierDirectory}>Browse suppliers</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={APP_ROUTES.suppliers}>Suppliers directory</Link>
          </Button>
        </div>
      </div>
    );
  }

  const cartPanelProps = {
    supplierName: supplier.name,
    currency,
    lines: cart,
    payable,
    pulse: pulseCart,
    saving,
    canPost: readyLines.length > 0 && Boolean(branchId.trim()),
    canSetSellPrice,
    onPatch: patchLine,
    onRemove: removeLine,
    onPost,
  };

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden pb-28 lg:pb-0"
      style={brandTheme as CSSProperties}
    >
      <div className="flex h-full min-h-0 flex-1 items-stretch overflow-hidden">
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] dark:border-border/40">
          <section className="shrink-0 border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2 pb-1.5 pt-1 dark:border-border/40 sm:px-3">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="pos-market-section-label text-[0.95rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
                    {supplier.name}
                  </h2>
                  {branchesLoading ? (
                    <span className="text-[11px] text-muted-foreground">
                      Loading branches…
                    </span>
                  ) : activeBranchName ? (
                    <span className="truncate text-[11px] text-muted-foreground">
                      Receiving at {activeBranchName}
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-800 dark:text-amber-200">
                      Pick a branch in the top nav
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Tap products into the cart · set qty &amp; cost · post supply
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {canCreateProduct ? (
                  <button
                    type="button"
                    onClick={() => setCreateProductOpen(true)}
                    className="inline-flex h-7 items-center gap-1 border border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] px-2 text-[11px] font-medium text-[var(--pos-ink,#1c1915)] hover:bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)]"
                  >
                    <PackagePlus className="size-3.5 text-muted-foreground" aria-hidden />
                    Create product
                  </button>
                ) : null}
                {canLinkProducts ? (
                  <button
                    type="button"
                    onClick={() => setLinkProductsOpen(true)}
                    className="inline-flex h-7 items-center gap-1 border border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] px-2 text-[11px] font-medium text-[var(--pos-ink,#1c1915)] hover:bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)]"
                  >
                    <Link2 className="size-3.5 text-muted-foreground" aria-hidden />
                    Link product
                  </button>
                ) : null}
                <Link
                  href={APP_ROUTES.cashier}
                  className="inline-flex h-7 items-center gap-1 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" aria-hidden />
                  Cashier
                </Link>
                <Link
                  href={APP_ROUTES.suppliers}
                  className="inline-flex h-7 items-center gap-1 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <Truck className="size-3.5" aria-hidden />
                  Suppliers
                </Link>
              </div>
            </div>
          </section>

          <div className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] dark:border-border/40">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className={cn(
                fieldClass,
                "h-11 rounded-none border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0",
              )}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Find a product…"
              disabled={saving || linksBusy}
            />
          </div>

          {showParentRail ? (
            <div className="flex gap-1 overflow-x-auto border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] p-1.5 scrollbar-none dark:border-border/40 dark:bg-muted/20 lg:hidden">
              {parentOptions.map((parent) => (
                <ParentFolderButton
                  key={parent.id ?? "all"}
                  parent={parent}
                  active={parentFilterId === parent.id}
                  canEditPhoto={canEditCatalog}
                  className="size-[4.25rem] shrink-0"
                  onSelect={() => setParentFilterId(parent.id)}
                  onPhotoUploaded={onParentPhotoUploaded}
                />
              ))}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-y-contain px-2 py-2 sm:px-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="pos-market-section-label text-[0.95rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
                {parentFilterId
                  ? parentOptions.find((p) => p.id === parentFilterId)?.label ??
                    "Linked products"
                  : "Linked products"}
                <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Shelf
                </span>
              </h3>
              <div className="flex items-center gap-2">
                {canCreateProduct || canLinkProducts ? (
                  <div className="hidden items-center gap-1.5 sm:flex">
                    {canCreateProduct ? (
                      <button
                        type="button"
                        onClick={() => setCreateProductOpen(true)}
                        className="text-[11px] font-medium text-[var(--pos-primary)] underline-offset-2 hover:underline"
                      >
                        Create product
                      </button>
                    ) : null}
                    {canLinkProducts ? (
                      <button
                        type="button"
                        onClick={() => setLinkProductsOpen(true)}
                        className="text-[11px] font-medium text-[var(--pos-primary)] underline-offset-2 hover:underline"
                      >
                        Link product
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {visibleLinks.length}
                </span>
              </div>
            </div>

            {linksBusy ? (
              <div className="flex items-center justify-center gap-2 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] py-10 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading products…
              </div>
            ) : visibleLinks.length === 0 ? (
              <div className="space-y-3 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] py-10 text-center text-xs text-muted-foreground">
                <p>
                  {links.length === 0
                    ? "No linked products yet."
                    : parentFilterId
                      ? "No products under this parent."
                      : "No products match your search."}
                </p>
                {links.length === 0 && (canCreateProduct || canLinkProducts) ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {canCreateProduct ? (
                      <button
                        type="button"
                        onClick={() => setCreateProductOpen(true)}
                        className="inline-flex h-8 items-center gap-1.5 border border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] px-3 text-[11px] font-semibold text-[var(--pos-ink,#1c1915)] hover:bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)]"
                      >
                        <PackagePlus className="size-3.5" aria-hidden />
                        Create product
                      </button>
                    ) : null}
                    {canLinkProducts ? (
                      <button
                        type="button"
                        onClick={() => setLinkProductsOpen(true)}
                        className="inline-flex h-8 items-center gap-1.5 border border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] px-3 text-[11px] font-semibold text-[var(--pos-ink,#1c1915)] hover:bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)]"
                      >
                        <Link2 className="size-3.5" aria-hidden />
                        Link product
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1 sm:grid-cols-5 sm:gap-1.5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {visibleLinks.map((link) => (
                  <ProductTile
                    key={link.id}
                    link={link}
                    cartQty={cartQtyByItem.get(link.itemId) ?? 0}
                    justAdded={justAddedId === link.itemId}
                    currency={currency}
                    branchId={branchId}
                    canEditStock={canEditStock}
                    canEditCatalog={canEditCatalog}
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

        {showParentRail ? (
          <aside className="hidden min-h-0 w-[7rem] shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] dark:border-border/40 dark:bg-muted/20 xl:w-[8rem] lg:flex">
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
                  canEditPhoto={canEditCatalog}
                  onSelect={() => setParentFilterId(parent.id)}
                  onPhotoUploaded={onParentPhotoUploaded}
                />
              ))}
            </nav>
          </aside>
        ) : null}

        <div className="hidden h-full min-h-0 lg:flex">
          <SupplyCartPanel {...cartPanelProps} />
        </div>
      </div>

      <button
        type="button"
        className={cn(
          "fixed bottom-4 right-4 z-30 flex h-14 items-center gap-2 px-4 shadow-lg lg:hidden",
          "bg-[var(--pos-primary)] text-[var(--pos-primary-ink,#fff)]",
          pulseCart && "ring-2 ring-[var(--pos-primary)] ring-offset-2",
        )}
        onClick={() => setMobileCartOpen(true)}
      >
        <ShoppingCart className="size-5" aria-hidden />
        <span className="text-sm font-semibold">
          {cart.length} ·{" "}
          {payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })}{" "}
          {currency}
        </span>
      </button>

      {mobileCartOpen ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-background/80 p-3 backdrop-blur-sm lg:hidden">
          <SupplyCartPanel
            {...cartPanelProps}
            onCloseMobile={() => setMobileCartOpen(false)}
          />
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
    </div>
  );
}
