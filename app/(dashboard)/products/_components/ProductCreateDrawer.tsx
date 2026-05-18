"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  PackagePlus,
  Package,
  Layers,
  Camera,
  X,
  Upload,
  Boxes,
  FileText,
  Loader2,
  ChevronDown,
  ChevronRight,
  Barcode,
  Hash,
  Truck,
  Settings2,
  Plus,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormDrawer, type FormDrawerProps } from "@/components/form-drawer";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import type { CatalogListApi } from "../_hooks/useCatalogList";
import type { ProductMutationsApi } from "../_hooks/useProductMutations";
import type { BranchRecord } from "@/lib/api";
import {
  productFormInputClass,
  productFormLabelClass,
} from "./product-form-styles";
import { StockIncreaseFields } from "./StockIncreaseFields";
import { ProductCreatePricingSection } from "./ProductCreatePricingSection";
import { toNumber } from "../_utils";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Types
/* ═══════════════════════════════════════════════════════════════════════════ */

type Props = {
  open: boolean;
  onClose: () => void;
  banner?: FormDrawerProps["banner"];
  catalog: Pick<CatalogListApi, "itemTypes" | "sortedCategories">;
  m: Pick<
    ProductMutationsApi,
    | "parentDraft"
    | "setParentDraft"
    | "nextAutoSkuHint"
    | "suppliersForLink"
    | "suppliersLoading"
    | "loadSuppliersForLink"
    | "onCreateParent"
    | "pendingCreateImage"
    | "setPendingCreateImage"
    | "parentCreateBusy"
  >;
  canLinkSupplier: boolean;
  canListSuppliers: boolean;
  currencyCode: string;
  branches: BranchRecord[];
};

type SectionKey = "identifiers" | "stock" | "supplier" | "details";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Sub-components
/* ═══════════════════════════════════════════════════════════════════════════ */

function SectionToggle({
  icon: Icon,
  label,
  hint,
  expanded,
  onToggle,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
        expanded
          ? "border-primary/20 bg-primary/[0.03] ring-1 ring-primary/10"
          : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/30",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
          expanded ? "bg-primary/10" : "bg-muted group-hover:bg-muted/80",
        )}
      >
        <Icon className={cn("size-4", expanded ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {badge}
        </div>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="shrink-0 text-muted-foreground transition-transform duration-200">
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </div>
    </button>
  );
}

function Label({
  children,
  className,
  required,
}: {
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={cn("flex flex-col gap-1", productFormLabelClass, className)}>
      <span className="flex items-center gap-1">
        {children}
        {required ? <span className="text-destructive">*</span> : null}
      </span>
    </label>
  );
}

function icClass(disabled?: boolean) {
  return cn(
    productFormInputClass,
    disabled && "bg-muted/50 text-muted-foreground cursor-not-allowed",
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  min,
  step,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: string;
  step?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={cn(icClass(disabled), "w-full", className)}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      min={min}
      step={step}
    />
  );
}

function ToggleChip({
  checked,
  onChange,
  label,
  icon: Icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon?: React.ElementType;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition",
        checked
          ? "border-primary/30 bg-primary/[0.08] text-primary ring-1 ring-primary/10"
          : "border-border/60 bg-background text-muted-foreground hover:bg-muted/30",
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      <span
        className={cn(
          "flex h-3.5 w-3.5 items-center justify-center rounded-sm border transition",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
        )}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Main component
/* ═══════════════════════════════════════════════════════════════════════════ */

export function ProductCreateDrawer({
  open,
  onClose,
  banner,
  catalog,
  m,
  canLinkSupplier,
  canListSuppliers,
  currencyCode,
  branches,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isGroup = m.parentDraft.productStructure === "group";
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    identifiers: false,
    stock: true,
    supplier: false,
    details: false,
  });

  /* ── Reset expanded state when drawer opens ── */
  useEffect(() => {
    if (open) {
      setExpanded({ identifiers: false, stock: true, supplier: false, details: false });
      setKeepOpen(false);
    }
  }, [open]);

  const syncCostsFromBuyingPrice = useCallback(
    (buyingPrice: string, prev: typeof m.parentDraft) => {
      const buy = toNumber(buyingPrice);
      if (buy == null) return { ...prev, buyingPrice };
      const packQty = Math.max(1, toNumber(prev.bundleQty) ?? 1);
      const perUnit = buy / packQty;
      const perUnitStr = Number.isFinite(perUnit) ? String(perUnit) : "";
      return {
        ...prev,
        buyingPrice,
        openingUnitCost: prev.openingUnitCost.trim()
          ? prev.openingUnitCost
          : perUnitStr,
        defaultCostPrice: prev.defaultCostPrice.trim()
          ? prev.defaultCostPrice
          : String(buy),
      };
    },
    [],
  );

  /* ── Image preview ── */
  useEffect(() => {
    if (!m.pendingCreateImage) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(m.pendingCreateImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [m.pendingCreateImage]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        m.setPendingCreateImage(file);
      }
    },
    [m],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const toggleSection = (key: SectionKey) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ── Live margin math ── */
  const marginInfo = useMemo(() => {
    const buy = Number(m.parentDraft.buyingPrice);
    const sell = Number(m.parentDraft.bundlePrice);
    const qty = Math.max(1, Number(m.parentDraft.bundleQty) || 1);
    if (!Number.isFinite(buy) || !Number.isFinite(sell) || sell <= 0) return null;
    const unitCost = buy / qty;
    const profit = sell - unitCost;
    const margin = (profit / sell) * 100;
    return {
      profit,
      margin,
      unitCost,
      valid: true,
    };
  }, [m.parentDraft.buyingPrice, m.parentDraft.bundlePrice, m.parentDraft.bundleQty]);

  /* ── Derived: has supplier data ── */
  const hasSupplierData = Boolean(
    m.parentDraft.supplierId || m.parentDraft.supplierSku || m.parentDraft.defaultCostPrice,
  );

  /* ── Derived: has identifier data ── */
  const hasIdentifierData = Boolean(m.parentDraft.sku || m.parentDraft.barcode);

  /* ── Derived: has detail data ── */
  const hasDetailData = Boolean(
    m.parentDraft.description || m.parentDraft.unitType,
  );

  /** Per sellable unit — used to value opening stock batches (buy ÷ pack qty). */
  const costPerUnit = useMemo(() => {
    const buy = toNumber(m.parentDraft.buyingPrice);
    const pack = Math.max(1, toNumber(m.parentDraft.bundleQty) ?? 1);
    if (buy != null) return buy / pack;
    const sup = toNumber(m.parentDraft.defaultCostPrice);
    if (sup != null && pack > 0) return sup / pack;
    return null;
  }, [
    m.parentDraft.buyingPrice,
    m.parentDraft.bundleQty,
    m.parentDraft.defaultCostPrice,
  ]);

  /* ── Submit wrapper that optionally keeps drawer open ── */
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      /* Keep the drawer open: call the original handler with keepOpen flag,
         then clear only the user-entered fields after success. */
      const savedType = m.parentDraft.itemTypeId;
      const savedBranch = m.parentDraft.openingBranchId;
      const savedStructure = m.parentDraft.productStructure;
      const savedStocked = m.parentDraft.isStocked;
      const savedSellable = m.parentDraft.isSellable;

      await m.onCreateParent(e, { keepOpen });

      if (!keepOpen) return;

      /* Reset draft but preserve structural defaults for rapid entry */
      m.setParentDraft({
        ...m.parentDraft,
        name: "",
        sku: "",
        barcode: "",
        brand: "",
        size: "",
        description: "",
        unitType: "",
        buyingPrice: "",
        bundleQty: "",
        bundlePrice: "",
        bundleName: "",
        minStockLevel: "",
        reorderLevel: "",
        reorderQty: "",
        supplierId: "",
        supplierSku: "",
        defaultCostPrice: "",
        openingQty: "",
        openingUnitCost: "",
        /* preserved: */
        productStructure: savedStructure,
        itemTypeId: savedType,
        openingBranchId: savedBranch,
        isStocked: savedStocked,
        isSellable: savedSellable,
        isWeighed: false,
        setPrimarySupplier: true,
      });
      m.setPendingCreateImage(null);
    },
    [keepOpen, m],
  );

  return (
    <FormDrawer
      open={open}
      onboardingTarget={ONBOARDING_TARGETS.productsDrawer}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      banner={banner}
      title={isGroup ? "New product group" : "New product"}
      description={
        isGroup
          ? "Create a label that holds variants."
          : "Add a sellable product to the catalog."
      }
      contextLabel="Catalog"
      width="wide"
      icon={<PackagePlus className="size-5 text-primary" aria-hidden />}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={keepOpen}
              onChange={(e) => setKeepOpen(e.target.checked)}
              className="size-4 rounded border-border text-primary"
            />
            <span>Keep open after create</span>
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={m.parentCreateBusy}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-parent-form"
              disabled={catalog.itemTypes.length === 0 || m.parentCreateBusy}
              className="gap-2"
            >
              {m.parentCreateBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {isGroup ? "Creating group…" : "Creating product…"}
                </>
              ) : isGroup ? (
                "Create group"
              ) : (
                <>
                  <Plus className="size-4" />
                  Create product
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <form id="create-parent-form" className="space-y-5" onSubmit={handleSubmit}>
        {catalog.itemTypes.length === 0 && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            No item types in tenant.
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  LIVE PREVIEW CARD                                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex gap-3 rounded-xl border border-border/60 bg-gradient-to-br from-muted/30 to-background p-3 shadow-sm">
          <div
            className={cn(
              "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background",
              previewUrl ? "border-border/50" : "border-dashed border-border/50",
            )}
          >
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt=""
                width={56}
                height={56}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : isGroup ? (
              <FolderOpen className="size-5 text-muted-foreground/30" aria-hidden />
            ) : (
              <Camera className="size-5 text-muted-foreground/30" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {m.parentDraft.name.trim() || (isGroup ? "Group name" : "Product name")}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {isGroup ? (
                <span className="inline-flex items-center gap-1 rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-violet-700">
                  <Layers className="size-2.5" aria-hidden />
                  GROUP
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-primary">
                  <Package className="size-2.5" aria-hidden />
                  {m.parentDraft.sku.trim() || m.nextAutoSkuHint || "—"}
                </span>
              )}
              {m.parentDraft.brand.trim() ? (
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  {m.parentDraft.brand.trim()}
                </span>
              ) : null}
              {m.parentDraft.size.trim() ? (
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                  {m.parentDraft.size.trim()}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  PRODUCT STRUCTURE                                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              m.setParentDraft((p) => ({
                ...p,
                productStructure: "standalone",
                isSellable: true,
              }))
            }
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition",
              !isGroup
                ? "border-primary bg-primary/[0.04] ring-1 ring-primary/20"
                : "border-border/70 bg-muted/20 hover:bg-muted/40",
            )}
          >
            <Package
              className={cn("mt-0.5 size-5 shrink-0", !isGroup ? "text-primary" : "text-muted-foreground")}
              aria-hidden
            />
            <div>
              <p className={cn("text-sm font-medium", !isGroup ? "text-primary" : "text-foreground")}>
                Standalone SKU
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() =>
              m.setParentDraft((p) => ({
                ...p,
                productStructure: "group",
                isSellable: false,
              }))
            }
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 text-left transition",
              isGroup
                ? "border-primary bg-primary/[0.04] ring-1 ring-primary/20"
                : "border-border/70 bg-muted/20 hover:bg-muted/40",
            )}
          >
            <Layers
              className={cn("mt-0.5 size-5 shrink-0", isGroup ? "text-primary" : "text-muted-foreground")}
              aria-hidden
            />
            <div>
              <p className={cn("text-sm font-medium", isGroup ? "text-primary" : "text-foreground")}>
                Product group
              </p>
            </div>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  ESSENTIALS (always visible)                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          {/* Name + Item type */}
          <div className="space-y-3">
            <Label required>
              {isGroup ? "Group name" : "Product name"}
              <input
                className={cn(icClass(), "text-base font-medium")}
                placeholder={isGroup ? "Group name" : "Product name"}
                value={m.parentDraft.name}
                onChange={(e) => m.setParentDraft((p) => ({ ...p, name: e.target.value }))}
                required
                autoFocus
              />
            </Label>

            <div className="grid gap-3 sm:grid-cols-2">
              <Label required>
                Item type
                <select
                  className={icClass()}
                  value={m.parentDraft.itemTypeId}
                  onChange={(e) => m.setParentDraft((p) => ({ ...p, itemTypeId: e.target.value }))}
                  required
                >
                  {catalog.itemTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Label>
              <Label>
                Category
                <select
                  className={icClass()}
                  value={m.parentDraft.categoryId}
                  onChange={(e) => m.setParentDraft((p) => ({ ...p, categoryId: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {catalog.sortedCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {!c.active ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </Label>
            </div>
          </div>

          {/* Photo — compact */}
          <div>
            {m.pendingCreateImage ? (
              <div className="relative overflow-hidden rounded-xl border border-border/60">
                <Image
                  src={previewUrl ?? ""}
                  alt="Preview"
                  width={640}
                  height={120}
                  unoptimized
                  className="h-28 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => m.setPendingCreateImage(null)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                  <p className="text-xs font-medium text-white">{m.pendingCreateImage.name}</p>
                  <p className="text-[10px] text-white/80">{(m.pendingCreateImage.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border/60 bg-muted/20 px-4 py-3 transition hover:border-primary/40 hover:bg-primary/[0.02]",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="size-4 text-primary" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Drop an image or click to browse</p>
                </div>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file) m.setPendingCreateImage(file);
              }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
              <Label>
                Brand
                <input
                  className={icClass()}
                  placeholder="e.g. Brookside"
                  value={m.parentDraft.brand}
                  onChange={(e) => m.setParentDraft((p) => ({ ...p, brand: e.target.value }))}
                />
              </Label>
              <Label>
                Size
                <input
                  className={icClass()}
                  placeholder="e.g. 500ml, 1kg"
                  value={m.parentDraft.size}
                  onChange={(e) => m.setParentDraft((p) => ({ ...p, size: e.target.value }))}
                />
              </Label>
            </div>
        </div>

        {!isGroup ? (
          <ProductCreatePricingSection
            draft={m.parentDraft}
            setDraft={m.setParentDraft}
            syncCostsFromBuyingPrice={syncCostsFromBuyingPrice}
            currencyCode={currencyCode}
            marginInfo={marginInfo}
          />
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  STOCK — standalone only                                        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {!isGroup && (
          <div className="space-y-3">
            <SectionToggle
              icon={Boxes}
              label="Stock & inventory"
              expanded={expanded.stock}
              onToggle={() => toggleSection("stock")}
            />

            {expanded.stock && (
              <div className="space-y-4 rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-background to-muted/15 p-4 shadow-sm sm:p-5">
                <StockIncreaseFields
                  minimal
                  mode="opening"
                  branches={branches}
                  branchId={m.parentDraft.openingBranchId}
                  onBranchIdChange={(id) =>
                    m.setParentDraft((p) => ({ ...p, openingBranchId: id }))
                  }
                  quantity={m.parentDraft.openingQty}
                  onQuantityChange={(v) =>
                    m.setParentDraft((p) => ({ ...p, openingQty: v }))
                  }
                  unitCost={m.parentDraft.openingUnitCost}
                  onUnitCostChange={(v) =>
                    m.setParentDraft((p) => ({ ...p, openingUnitCost: v }))
                  }
                  currentUnitCost={costPerUnit}
                  className="border-0 bg-transparent p-0 shadow-none ring-0"
                />

                {/* Tracking toggles */}
                <div className="flex flex-wrap gap-2">
                  <ToggleChip
                    checked={m.parentDraft.isStocked}
                    onChange={(v) => m.setParentDraft((p) => ({ ...p, isStocked: v }))}
                    label="Track stock"
                  />
                  <ToggleChip
                    checked={m.parentDraft.isSellable}
                    onChange={(v) => m.setParentDraft((p) => ({ ...p, isSellable: v }))}
                    label="Sellable"
                  />
                  <ToggleChip
                    checked={m.parentDraft.isWeighed}
                    onChange={(v) => m.setParentDraft((p) => ({ ...p, isWeighed: v }))}
                    label="Weighed at sale"
                  />
                </div>

                {/* Reorder levels — subtle, collapsible inside stock */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Settings2 className="size-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Reorder settings
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Label>
                      Min stock
                      <NumberInput
                        value={m.parentDraft.minStockLevel}
                        onChange={(v) => m.setParentDraft((p) => ({ ...p, minStockLevel: v }))}
                        placeholder="Warn below"
                      />
                    </Label>
                    <Label>
                      Reorder at
                      <NumberInput
                        value={m.parentDraft.reorderLevel}
                        onChange={(v) => m.setParentDraft((p) => ({ ...p, reorderLevel: v }))}
                        placeholder="Level"
                      />
                    </Label>
                    <Label>
                      Reorder qty
                      <NumberInput
                        value={m.parentDraft.reorderQty}
                        onChange={(v) => m.setParentDraft((p) => ({ ...p, reorderQty: v }))}
                        placeholder="Units"
                      />
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  IDENTIFIERS — collapsed by default                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {!isGroup && (
          <div className="space-y-3">
            <SectionToggle
              icon={Hash}
              label="Identifiers"
              expanded={expanded.identifiers}
              onToggle={() => toggleSection("identifiers")}
              badge={
                hasIdentifierData ? (
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                ) : undefined
              }
            />
            {expanded.identifiers && (
              <div className="space-y-3 rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-background to-muted/15 p-4 shadow-sm sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">SKU</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        className={cn(
                          icClass(),
                          "min-w-0 flex-1 font-mono text-sm",
                        )}
                        placeholder="Auto-generated"
                        value={m.parentDraft.sku}
                        onChange={(e) => m.setParentDraft((p) => ({ ...p, sku: e.target.value }))}
                      />
                      {m.nextAutoSkuHint && !m.parentDraft.sku && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0 gap-1 px-2.5 text-xs"
                          onClick={() =>
                            m.setParentDraft((p) => ({
                              ...p,
                              sku: m.nextAutoSkuHint!,
                            }))
                          }
                        >
                          Use {m.nextAutoSkuHint}
                        </Button>
                      )}
                    </div>
                  </div>
                  <Label>
                    <span className="flex items-center gap-1">
                      <Barcode className="size-3" />
                      Barcode
                    </span>
                    <input
                      className={icClass()}
                      placeholder="Scan or type"
                      value={m.parentDraft.barcode}
                      onChange={(e) => m.setParentDraft((p) => ({ ...p, barcode: e.target.value }))}
                    />
                  </Label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  SUPPLIER — collapsed by default                                */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {!isGroup && canLinkSupplier && (
          <div className="space-y-3">
            <SectionToggle
              icon={Truck}
              label="Supplier"
              expanded={expanded.supplier}
              onToggle={() => toggleSection("supplier")}
              badge={
                hasSupplierData ? (
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                ) : undefined
              }
            />
            {expanded.supplier && (
              <div className="space-y-3 rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-background to-muted/15 p-4 shadow-sm sm:p-5">
                {canListSuppliers && m.suppliersForLink.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={m.suppliersLoading}
                    onClick={() => void m.loadSuppliersForLink()}
                  >
                    {m.suppliersLoading ? "Loading…" : "Load suppliers"}
                  </Button>
                )}
                <Label>
                  Supplier
                  <select
                    className={icClass()}
                    value={
                      m.suppliersForLink.some((s) => s.id === m.parentDraft.supplierId)
                        ? m.parentDraft.supplierId
                        : ""
                    }
                    onChange={(e) => m.setParentDraft((p) => ({ ...p, supplierId: e.target.value }))}
                  >
                    <option value="">— None —</option>
                    {m.suppliersForLink.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Label>
                    Supplier SKU
                    <input
                      className={icClass()}
                      placeholder="Their reference code"
                      value={m.parentDraft.supplierSku}
                      onChange={(e) => m.setParentDraft((p) => ({ ...p, supplierSku: e.target.value }))}
                    />
                  </Label>
                  <Label>
                    <span className="flex items-center gap-1">
                      Default cost
                      {currencyCode ? (
                        <span className="text-[10px] font-normal text-muted-foreground">
                          ({currencyCode})
                        </span>
                      ) : null}
                    </span>
                    <NumberInput
                      value={m.parentDraft.defaultCostPrice}
                      onChange={(v) => m.setParentDraft((p) => ({ ...p, defaultCostPrice: v }))}
                      placeholder="0.00"
                    />
                  </Label>
                </div>
                <ToggleChip
                  checked={m.parentDraft.setPrimarySupplier}
                  onChange={(v) => m.setParentDraft((p) => ({ ...p, setPrimarySupplier: v }))}
                  label="Set as primary supplier"
                />
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/*  DETAILS — collapsed by default                                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <SectionToggle
            icon={FileText}
            label="More details"
            expanded={expanded.details}
            onToggle={() => toggleSection("details")}
            badge={
              hasDetailData ? (
                <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
              ) : undefined
            }
          />
          {expanded.details && (
            <div className="space-y-3 rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-background to-muted/15 p-4 shadow-sm sm:p-5">
              <Label>
                Description
                <textarea
                  className={cn(icClass(), "min-h-[4rem] resize-y")}
                  placeholder="Optional"
                  value={m.parentDraft.description}
                  onChange={(e) => m.setParentDraft((p) => ({ ...p, description: e.target.value }))}
                />
              </Label>
              {!isGroup ? (
                <Label>
                  Unit
                  <input
                    className={icClass()}
                    placeholder="each, kg, box…"
                    value={m.parentDraft.unitType}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({ ...p, unitType: e.target.value }))
                    }
                  />
                </Label>
              ) : null}
            </div>
          )}
        </div>
      </form>
    </FormDrawer>
  );
}

