"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PackagePlus,
  Package,
  Layers,
  Camera,
  X,
  Upload,
  Tag,
  Boxes,
  FileText,
  FolderOpen,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormDrawer, type FormDrawerProps } from "@/components/form-drawer";
import type { CatalogListApi } from "../_hooks/useCatalogList";
import type { ProductMutationsApi } from "../_hooks/useProductMutations";
import type { BranchRecord } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Validation / API messages from the page (shown under the drawer title). */
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
  >;
  canLinkSupplier: boolean;
  canListSuppliers: boolean;
  currencyCode: string;
  branches: BranchRecord[];
};

function SectionHeader({
  icon: Icon,
  label,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
        <Icon className="size-3.5 text-primary" aria-hidden />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {label}
        </p>
        {hint ? (
          <p className="text-[10px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

function InputRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>{children}</div>
  );
}

function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex flex-col gap-1.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </label>
  );
}

function icClass(disabled?: boolean) {
  return cn(
    "rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors",
    "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
    disabled && "bg-muted/50 text-muted-foreground cursor-not-allowed",
  );
}

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

  return (
    <FormDrawer
      open={open}
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
      icon={<PackagePlus className="size-5 text-primary" aria-hidden />}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-parent-form"
            disabled={catalog.itemTypes.length === 0}
          >
            {isGroup ? "Create group" : "Create product"}
          </Button>
        </div>
      }
    >
      <form
        id="create-parent-form"
        className="space-y-5"
        onSubmit={m.onCreateParent}
      >
        {catalog.itemTypes.length === 0 && (
          <p className="text-sm text-destructive">No item types in tenant.</p>
        )}

        {/* ── Live Preview Card ── */}
        <div className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/50 bg-background">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : isGroup ? (
              <FolderOpen
                className="size-5 text-muted-foreground/30"
                aria-hidden
              />
            ) : (
              <Camera className="size-5 text-muted-foreground/30" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {m.parentDraft.name.trim() ||
                (isGroup ? "Group name" : "Product name")}
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
                  {m.nextAutoSkuHint || m.parentDraft.sku.trim() || "—"}
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
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {isGroup
                ? "Container — add variants with their own SKUs, prices and stock"
                : "Standalone SKU — sold directly with its own barcode and price"}
            </p>
          </div>
        </div>

        {/* ── Product Structure ── */}
        <div>
          <SectionHeader
            icon={Boxes}
            label="Product structure"
            hint="Choose how this product is organised"
          />
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
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  !isGroup ? "text-primary" : "text-muted-foreground",
                )}
                aria-hidden
              />
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    !isGroup ? "text-primary" : "text-foreground",
                  )}
                >
                  Standalone SKU
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Has its own barcode, price and stock. Sold individually.
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
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  isGroup ? "text-primary" : "text-muted-foreground",
                )}
                aria-hidden
              />
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isGroup ? "text-primary" : "text-foreground",
                  )}
                >
                  Product group
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Just a label. Variants inside carry SKUs, prices and stock.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ── Identity ── */}
        <div>
          <SectionHeader
            icon={Tag}
            label="Identity"
            hint={
              isGroup
                ? "Name and classification"
                : "Names, codes and classification"
            }
          />
          <div className="space-y-3">
            <Label>
              Item type
              <select
                className={icClass()}
                value={m.parentDraft.itemTypeId}
                onChange={(e) =>
                  m.setParentDraft((p) => ({
                    ...p,
                    itemTypeId: e.target.value,
                  }))
                }
                required
              >
                {catalog.itemTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.key})
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              {isGroup ? "Group name" : "Display name"}
              <input
                className={icClass()}
                placeholder={
                  isGroup ? "e.g. Brookside Milk" : "Customer-facing title"
                }
                value={m.parentDraft.name}
                onChange={(e) =>
                  m.setParentDraft((p) => ({ ...p, name: e.target.value }))
                }
                required
              />
            </Label>

            {/* SKU + Barcode — standalone only */}
            {!isGroup && (
              <InputRow>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    SKU
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                      placeholder="Auto-generated if empty"
                      value={m.parentDraft.sku}
                      onChange={(e) =>
                        m.setParentDraft((p) => ({ ...p, sku: e.target.value }))
                      }
                    />
                    {m.nextAutoSkuHint && (
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
                  Barcode
                  <input
                    className={icClass()}
                    placeholder="Scan or type"
                    value={m.parentDraft.barcode}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        barcode: e.target.value,
                      }))
                    }
                  />
                </Label>
              </InputRow>
            )}
          </div>
        </div>

        {/* ── Photo ── */}
        <div>
          <SectionHeader
            icon={Camera}
            label="Photo"
            hint="Upload a cover image"
          />
          {m.pendingCreateImage ? (
            <div className="relative overflow-hidden rounded-xl border border-border/60">
              <img
                src={previewUrl ?? undefined}
                alt="Preview"
                className="h-40 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => m.setPendingCreateImage(null)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
              >
                <X className="size-3.5" aria-hidden />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                <p className="text-xs font-medium text-white">
                  {m.pendingCreateImage.name}
                </p>
                <p className="text-[10px] text-white/80">
                  {(m.pendingCreateImage.size / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 bg-muted/20 px-4 py-8 transition hover:border-primary/40 hover:bg-primary/[0.02]",
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Upload className="size-5 text-primary" aria-hidden />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Drop an image here
                </p>
                <p className="text-[11px] text-muted-foreground">
                  or click to browse — JPG, PNG, WEBP
                </p>
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

        {/* ── Categorisation ── */}
        <div>
          <SectionHeader
            icon={Boxes}
            label="Categorisation"
            hint="Category, brand and size"
          />
          <div className="space-y-3">
            <Label>
              Category
              <select
                className={icClass()}
                value={m.parentDraft.categoryId}
                onChange={(e) =>
                  m.setParentDraft((p) => ({
                    ...p,
                    categoryId: e.target.value,
                  }))
                }
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
            <InputRow>
              <Label>
                Brand
                <input
                  className={icClass()}
                  placeholder="e.g. Brookside"
                  value={m.parentDraft.brand}
                  onChange={(e) =>
                    m.setParentDraft((p) => ({ ...p, brand: e.target.value }))
                  }
                />
              </Label>
              {!isGroup && (
                <Label>
                  Size
                  <input
                    className={icClass()}
                    placeholder="e.g. 500ml, 1kg"
                    value={m.parentDraft.size}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({ ...p, size: e.target.value }))
                    }
                  />
                </Label>
              )}
            </InputRow>
          </div>
        </div>

        {/* ── Pricing ── */}
        {!isGroup && (
          <div>
            <SectionHeader
              icon={Tag}
              label="Pricing"
              hint="Buy cost and sell price"
            />
            <div className="space-y-3">
              <InputRow className="sm:grid-cols-3">
                <Label>
                  Buy price {currencyCode ? `(${currencyCode})` : ""}
                  <input
                    className={icClass()}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={m.parentDraft.buyingPrice}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        buyingPrice: e.target.value,
                      }))
                    }
                  />
                </Label>
                <Label>
                  Pack qty
                  <input
                    className={icClass()}
                    inputMode="numeric"
                    placeholder="e.g. 6"
                    value={m.parentDraft.bundleQty}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        bundleQty: e.target.value,
                      }))
                    }
                  />
                </Label>
                <Label>
                  Sell price {currencyCode ? `(${currencyCode})` : ""}
                  <input
                    className={icClass()}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={m.parentDraft.bundlePrice}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        bundlePrice: e.target.value,
                      }))
                    }
                  />
                </Label>
              </InputRow>
              <Label>
                Pack label
                <input
                  className={icClass()}
                  placeholder='e.g. "6-pack"'
                  value={m.parentDraft.bundleName}
                  onChange={(e) =>
                    m.setParentDraft((p) => ({
                      ...p,
                      bundleName: e.target.value,
                    }))
                  }
                />
              </Label>
            </div>
          </div>
        )}

        {/* ── Stock & Tracking ── */}
        {!isGroup && (
          <div>
            <SectionHeader
              icon={Tag}
              label="Stock & tracking"
              hint="Inventory levels and behaviour"
            />
            <div className="space-y-3">
              <InputRow className="sm:grid-cols-3">
                <Label>
                  Min stock
                  <input
                    className={icClass()}
                    inputMode="decimal"
                    placeholder="Warn when below"
                    value={m.parentDraft.minStockLevel}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        minStockLevel: e.target.value,
                      }))
                    }
                  />
                </Label>
                <Label>
                  Reorder at
                  <input
                    className={icClass()}
                    inputMode="decimal"
                    placeholder="Level"
                    value={m.parentDraft.reorderLevel}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        reorderLevel: e.target.value,
                      }))
                    }
                  />
                </Label>
                <Label>
                  Reorder qty
                  <input
                    className={icClass()}
                    inputMode="decimal"
                    placeholder="Units"
                    value={m.parentDraft.reorderQty}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        reorderQty: e.target.value,
                      }))
                    }
                  />
                </Label>
              </InputRow>
              <div className="flex flex-wrap items-center gap-5 rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={m.parentDraft.isStocked}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        isStocked: e.target.checked,
                      }))
                    }
                    className="size-4 rounded border-border text-primary"
                  />
                  <span>Track stock</span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={m.parentDraft.isSellable}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        isSellable: e.target.checked,
                      }))
                    }
                    className="size-4 rounded border-border text-primary"
                  />
                  <span>Sellable</span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={m.parentDraft.isWeighed}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        isWeighed: e.target.checked,
                      }))
                    }
                    className="size-4 rounded border-border text-primary"
                  />
                  <span>Weighed at sale</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── Opening stock ── */}
        {!isGroup && (
          <div>
            <SectionHeader
              icon={MapPin}
              label="Opening stock"
              hint="Initial quantity for a branch"
            />
            <div className="space-y-3">
              <Label>
                Branch
                <select
                  className={icClass()}
                  value={m.parentDraft.openingBranchId}
                  onChange={(e) =>
                    m.setParentDraft((p) => ({
                      ...p,
                      openingBranchId: e.target.value,
                    }))
                  }
                >
                  <option value="">— None —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Label>
              <InputRow>
                <Label>
                  Quantity
                  <input
                    className={icClass()}
                    inputMode="decimal"
                    placeholder="0"
                    value={m.parentDraft.openingQty}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        openingQty: e.target.value,
                      }))
                    }
                  />
                </Label>
                <Label>
                  Unit cost {currencyCode ? `(${currencyCode})` : ""}
                  <input
                    className={icClass()}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={m.parentDraft.openingUnitCost}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        openingUnitCost: e.target.value,
                      }))
                    }
                  />
                </Label>
              </InputRow>
            </div>
          </div>
        )}

        {/* ── Details ── */}
        <div>
          <SectionHeader
            icon={FileText}
            label="Details"
            hint="Extra product info"
          />
          <div className="space-y-3">
            <Label>
              Description
              <textarea
                className={cn(icClass(), "min-h-[5rem] resize-y")}
                placeholder="Optional — visible on receipts and storefront"
                value={m.parentDraft.description}
                onChange={(e) =>
                  m.setParentDraft((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
              />
            </Label>
            {!isGroup && (
              <InputRow>
                <Label>
                  Unit
                  <input
                    className={icClass()}
                    placeholder="each, kg, box…"
                    value={m.parentDraft.unitType}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        unitType: e.target.value,
                      }))
                    }
                  />
                </Label>
                <Label>
                  Image URL (advanced)
                  <input
                    className={icClass()}
                    placeholder="https://…"
                    value={m.parentDraft.imageKey}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        imageKey: e.target.value,
                      }))
                    }
                  />
                </Label>
              </InputRow>
            )}
          </div>
        </div>

        {/* ── Supplier ── */}
        {!isGroup && canLinkSupplier && (
          <div>
            <SectionHeader
              icon={Tag}
              label="Supplier"
              hint="Optional supplier link"
            />
            <div className="space-y-3">
              {canListSuppliers && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={m.suppliersLoading}
                  onClick={() => void m.loadSuppliersForLink()}
                >
                  {m.suppliersLoading ? "Loading…" : "Refresh supplier list"}
                </Button>
              )}
              <Label>
                Supplier
                <select
                  className={icClass()}
                  value={
                    m.suppliersForLink.some(
                      (s) => s.id === m.parentDraft.supplierId,
                    )
                      ? m.parentDraft.supplierId
                      : ""
                  }
                  onChange={(e) =>
                    m.setParentDraft((p) => ({
                      ...p,
                      supplierId: e.target.value,
                    }))
                  }
                >
                  <option value="">— None —</option>
                  {m.suppliersForLink.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Label>
              <InputRow>
                <Label>
                  Supplier SKU
                  <input
                    className={icClass()}
                    placeholder="Their reference code"
                    value={m.parentDraft.supplierSku}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        supplierSku: e.target.value,
                      }))
                    }
                  />
                </Label>
                <Label>
                  Default cost {currencyCode ? `(${currencyCode})` : ""}
                  <input
                    className={icClass()}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={m.parentDraft.defaultCostPrice}
                    onChange={(e) =>
                      m.setParentDraft((p) => ({
                        ...p,
                        defaultCostPrice: e.target.value,
                      }))
                    }
                  />
                </Label>
              </InputRow>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={m.parentDraft.setPrimarySupplier}
                  onChange={(e) =>
                    m.setParentDraft((p) => ({
                      ...p,
                      setPrimarySupplier: e.target.checked,
                    }))
                  }
                  className="size-4 rounded border-border text-primary"
                />
                <span>Set as primary supplier</span>
              </label>
            </div>
          </div>
        )}
      </form>
    </FormDrawer>
  );
}
