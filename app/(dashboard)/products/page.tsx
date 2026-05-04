"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Camera,
  CircleDollarSign,
  LayoutGrid,
  Layers,
  Package,
  PackagePlus,
  PencilLine,
  Sparkles,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardNotice,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  addItemSupplierLink,
  createItem,
  createItemVariant,
  deleteItem,
  deleteItemImage,
  fetchBranches,
  fetchCategories,
  fetchItemById,
  fetchItemSupplierLinks,
  fetchItemTypes,
  fetchItems,
  fetchSuppliers,
  itemListThumbnailUrl,
  patchItem,
  postSellingPrice,
  postStockIncrease,
  uploadItemImageToCloudinary,
  type BranchRecord,
  type CategoryRecord,
  type CreateVariantPayload,
  type ItemDetailRecord,
  type ItemImageRecord,
  type ItemSupplierLinkRecord,
  type ItemSummaryRecord,
  type ItemTypeRecord,
  type PatchItemPayload,
  type SupplierRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

import { VariantDrawerForm } from "./variant-drawer-form";

type ProductDrawerId = "create-parent" | "edit-product" | "photos" | "add-variant";

type ProductEditDraft = {
  name?: string;
  barcode?: string;
  description?: string;
  active?: boolean;
  webPublished?: boolean;
  bundlePriceStr: string;
  imageKey: string;
  categoryId: string;
};

const EMPTY_EDIT_DRAFT: ProductEditDraft = {
  bundlePriceStr: "",
  imageKey: "",
  description: "",
  active: true,
  webPublished: false,
  categoryId: "",
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatAmount(value: number | null | undefined): string {
  if (value == null) {
    return "—";
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function galleryImageUrl(img: ItemImageRecord): string | null {
  const secure = img.secureUrl?.trim();
  if (secure) {
    return secure;
  }
  const key = img.s3Key?.trim();
  if (key?.startsWith("http")) {
    return key;
  }
  return null;
}

function coverImageUrl(detail: ItemDetailRecord): string | null {
  const k = detail.imageKey?.trim();
  if (k?.startsWith("http")) {
    return k;
  }
  const sorted = detail.images ? [...detail.images].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  for (const img of sorted) {
    const u = galleryImageUrl(img);
    if (u) {
      return u;
    }
  }
  return null;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function optionalPositiveNumber(raw: string, label: string): number | undefined {
  const t = raw.trim();
  if (!t) {
    return undefined;
  }
  const n = Number(t);
  if (!Number.isFinite(n)) {
    throw new Error(`${label} must be a valid number.`);
  }
  return n;
}

type ParentDraft = {
  name: string;
  sku: string;
  barcode: string;
  itemTypeId: string;
  categoryId: string;
  supplierId: string;
  supplierSku: string;
  defaultCostPrice: string;
  setPrimarySupplier: boolean;
};

const EMPTY_PARENT: ParentDraft = {
  name: "",
  sku: "",
  barcode: "",
  itemTypeId: "",
  categoryId: "",
  supplierId: "",
  supplierSku: "",
  defaultCostPrice: "",
  setPrimarySupplier: true,
};

type VariantDraft = {
  sku: string;
  variantName: string;
  name: string;
  barcode: string;
  description: string;
  categoryId: string;
  unitType: string;
  minStockLevel: string;
  reorderLevel: string;
  reorderQty: string;
  imageKey: string;
  bundleQty: string;
  bundlePrice: string;
  bundleName: string;
  sellingPrice: string;
  sellBranchId: string;
  sellEffectiveFrom: string;
  supplierId: string;
  supplierSku: string;
  defaultCostPrice: string;
  setPrimarySupplier: boolean;
  openingQty: string;
  openingBranchId: string;
  openingUnitCost: string;
};

const VARIANT_DRAFT_FIELDS: Omit<VariantDraft, "sellEffectiveFrom"> = {
  sku: "",
  variantName: "",
  name: "",
  barcode: "",
  description: "",
  categoryId: "",
  unitType: "",
  minStockLevel: "",
  reorderLevel: "",
  reorderQty: "",
  imageKey: "",
  bundleQty: "",
  bundlePrice: "",
  bundleName: "",
  sellingPrice: "",
  sellBranchId: "",
  supplierId: "",
  supplierSku: "",
  defaultCostPrice: "",
  setPrimarySupplier: true,
  openingQty: "",
  openingBranchId: "",
  openingUnitCost: "",
};

function emptyVariantDraft(): VariantDraft {
  return { ...VARIANT_DRAFT_FIELDS, sellEffectiveFrom: todayIsoDate() };
}

function buildCreateVariantBody(draft: VariantDraft): CreateVariantPayload {
  const sku = draft.sku.trim();
  const variantName = draft.variantName.trim();
  if (!sku || !variantName) {
    throw new Error("SKU and variant label are required.");
  }
  const body: CreateVariantPayload = { sku, variantName };
  const disp = draft.name.trim();
  if (disp) {
    body.name = disp;
  }
  const bc = draft.barcode.trim();
  if (bc) {
    body.barcode = bc;
  }
  const desc = draft.description.trim();
  if (desc) {
    body.description = desc;
  }
  const cat = draft.categoryId.trim();
  if (cat) {
    body.categoryId = cat;
  }
  const ut = draft.unitType.trim();
  if (ut) {
    body.unitType = ut;
  }
  const ik = draft.imageKey.trim();
  if (ik) {
    body.imageKey = ik;
  }
  const minL = optionalPositiveNumber(draft.minStockLevel, "Min stock level");
  if (minL !== undefined) {
    body.minStockLevel = minL;
  }
  const rL = optionalPositiveNumber(draft.reorderLevel, "Reorder level");
  if (rL !== undefined) {
    body.reorderLevel = rL;
  }
  const rQ = optionalPositiveNumber(draft.reorderQty, "Reorder qty");
  if (rQ !== undefined) {
    body.reorderQty = rQ;
  }
  return body;
}

function bundlePatchFromVariantDraft(draft: VariantDraft): PatchItemPayload | null {
  const patch: PatchItemPayload = {};
  const bq = draft.bundleQty.trim();
  if (bq) {
    const n = Number(bq);
    if (!Number.isFinite(n)) {
      throw new Error("Bundle qty must be a valid number.");
    }
    patch.bundleQty = n;
  }
  const bp = draft.bundlePrice.trim();
  if (bp) {
    const n = Number(bp);
    if (!Number.isFinite(n)) {
      throw new Error("Bundle price must be a valid number.");
    }
    patch.bundlePrice = n;
  }
  const bn = draft.bundleName.trim();
  if (bn) {
    patch.bundleName = bn;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

const VARIANT_INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground";

export default function ProductsPage() {
  const { me, business } = useDashboard();
  const currencyCode = business?.currency?.trim() || "";
  const canLinkSupplier = hasPermission(me?.permissions, Permission.CatalogItemsLinkSuppliers);
  const canListSuppliers = hasPermission(me?.permissions, Permission.SuppliersRead);
  const canSetSellPrice = hasPermission(me?.permissions, Permission.PricingSellPriceSet);
  const canInventoryWrite = hasPermission(me?.permissions, Permission.InventoryWrite);

  const [itemTypes, setItemTypes] = useState<ItemTypeRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [items, setItems] = useState<ItemSummaryRecord[]>([]);
  const [suppliersForLink, setSuppliersForLink] = useState<SupplierRecord[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [parentDraft, setParentDraft] = useState<ParentDraft>(EMPTY_PARENT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItemDetailRecord | null>(null);
  const [supplierLinks, setSupplierLinks] = useState<ItemSupplierLinkRecord[]>([]);
  const [patchDraft, setPatchDraft] = useState<ProductEditDraft>(EMPTY_EDIT_DRAFT);
  const [variantDraft, setVariantDraft] = useState<VariantDraft>(() => emptyVariantDraft());
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [message, setMessage] = useState("");
  const [catalogImageUploadBusy, setCatalogImageUploadBusy] = useState(false);
  const [pendingCatalogImage, setPendingCatalogImage] = useState<File | null>(null);
  const [pendingVariantImage, setPendingVariantImage] = useState<File | null>(null);
  const [variantCreateBusy, setVariantCreateBusy] = useState(false);
  const [catalogImageAlt, setCatalogImageAlt] = useState("");
  const [catalogImagePrimary, setCatalogImagePrimary] = useState(true);
  const [activeDrawer, setActiveDrawer] = useState<ProductDrawerId | null>(null);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }, [categories]);

  const categoryById = useMemo(() => {
    const map = new Map<string, CategoryRecord>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

  const loadTypesAndItems = useCallback(async () => {
    const [types, rows, cats] = await Promise.all([
      fetchItemTypes(),
      fetchItems(search.trim() || undefined),
      fetchCategories(),
    ]);
    setItemTypes(types);
    setItems(rows);
    setCategories(cats);
  }, [search]);

  const loadSuppliersForLink = useCallback(async () => {
    if (!canListSuppliers) {
      return;
    }
    setSuppliersLoading(true);
    try {
      setSuppliersForLink(await fetchSuppliers());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load suppliers.");
    } finally {
      setSuppliersLoading(false);
    }
  }, [canListSuppliers]);

  useEffect(() => {
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) {
          setBranches(list.filter((b) => b.active));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBranches([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSelectedDetail = useCallback(async () => {
    if (!selectedId) {
      return;
    }
    const row = await fetchItemById(selectedId);
    setDetail(row);
    setPatchDraft({
      name: row.name,
      barcode: row.barcode,
      description: row.description,
      active: row.active ?? true,
      webPublished: row.webPublished ?? false,
      bundlePriceStr:
        row.bundlePrice != null && row.bundlePrice !== ""
          ? String(row.bundlePrice)
          : "",
      imageKey: row.imageKey ?? "",
      categoryId: row.categoryId ?? "",
    });
  }, [selectedId]);

  useEffect(() => {
    loadTypesAndItems().catch((error) =>
      setMessage(error instanceof Error ? error.message : "Failed to load products."),
    );
  }, [loadTypesAndItems]);

  useEffect(() => {
    if (itemTypes.length === 0) {
      return;
    }
    setParentDraft((previous) =>
      previous.itemTypeId ? previous : { ...previous, itemTypeId: itemTypes[0].id },
    );
  }, [itemTypes]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setSupplierLinks([]);
      setPatchDraft(EMPTY_EDIT_DRAFT);
      setPendingCatalogImage(null);
      setCatalogImageAlt("");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const row = await fetchItemById(selectedId);
        if (cancelled) {
          return;
        }
        setDetail(row);
        setPatchDraft({
          name: row.name,
          barcode: row.barcode,
          description: row.description,
          active: row.active ?? true,
          webPublished: row.webPublished ?? false,
          bundlePriceStr:
            row.bundlePrice != null && row.bundlePrice !== ""
              ? String(row.bundlePrice)
              : "",
          imageKey: row.imageKey ?? "",
          categoryId: row.categoryId ?? "",
        });
        try {
          const links = await fetchItemSupplierLinks(selectedId);
          if (!cancelled) {
            setSupplierLinks(links);
          }
        } catch {
          if (!cancelled) {
            setSupplierLinks([]);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Failed to load item.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    loadTypesAndItems().catch((error) =>
      setMessage(error instanceof Error ? error.message : "Search failed."),
    );
  };

  const onCreateParent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const savedItemTypeId = parentDraft.itemTypeId;
    try {
      const categoryChosen = parentDraft.categoryId.trim();
      const created = await createItem({
        name: parentDraft.name,
        sku: parentDraft.sku,
        itemTypeId: parentDraft.itemTypeId,
        barcode: parentDraft.barcode || undefined,
        ...(categoryChosen ? { categoryId: categoryChosen } : {}),
      });
      const supplierChosen = parentDraft.supplierId.trim();
      if (canLinkSupplier && supplierChosen) {
        const costRaw = parentDraft.defaultCostPrice.trim();
        let defaultCostPrice: number | undefined;
        if (costRaw) {
          const n = Number(costRaw);
          if (!Number.isFinite(n)) {
            throw new Error("Default cost must be a valid number.");
          }
          defaultCostPrice = n;
        }
        try {
          await addItemSupplierLink(created.id, {
            supplierId: supplierChosen,
            setPrimary: parentDraft.setPrimarySupplier,
            supplierSku: parentDraft.supplierSku.trim() || undefined,
            defaultCostPrice,
          });
        } catch (linkErr) {
          await loadTypesAndItems();
          setSelectedId(created.id);
          setParentDraft({ ...EMPTY_PARENT, itemTypeId: savedItemTypeId });
          setMessage(
            linkErr instanceof Error
              ? `Product created. Supplier link failed: ${linkErr.message}`
              : "Product created but supplier link failed.",
          );
          return;
        }
      }
      setParentDraft({ ...EMPTY_PARENT, itemTypeId: savedItemTypeId });
      await loadTypesAndItems();
      setSelectedId(created.id);
      setActiveDrawer(null);
      setMessage(
        canLinkSupplier && supplierChosen
          ? "Product created and linked to supplier."
          : "Product created.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create product failed.");
    }
  };

  const onPatchItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) {
      return;
    }
    setMessage("");
    const body: PatchItemPayload = {
      name: patchDraft.name,
      barcode: patchDraft.barcode,
      description: patchDraft.description,
      active: patchDraft.active,
      webPublished: patchDraft.webPublished,
      imageKey: patchDraft.imageKey,
      categoryId: patchDraft.categoryId.trim(),
    };
    const bps = patchDraft.bundlePriceStr.trim();
    if (bps) {
      const n = Number(bps);
      if (!Number.isFinite(n)) {
        setMessage("Bundle price must be a valid number.");
        return;
      }
      body.bundlePrice = n;
    }
    try {
      await patchItem(selectedId, body);
      await loadTypesAndItems();
      const next = await fetchItemById(selectedId);
      setDetail(next);
      try {
        setSupplierLinks(await fetchItemSupplierLinks(selectedId));
      } catch {
        setSupplierLinks([]);
      }
      setPatchDraft({
        name: next.name,
        barcode: next.barcode,
        description: next.description,
        active: next.active ?? true,
        webPublished: next.webPublished ?? false,
        bundlePriceStr:
          next.bundlePrice != null && next.bundlePrice !== ""
            ? String(next.bundlePrice)
            : "",
        imageKey: next.imageKey ?? "",
        categoryId: next.categoryId ?? "",
      });
      setActiveDrawer(null);
      setMessage("Product updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    }
  };

  const onAddVariant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) {
      return;
    }
    setMessage("");
    setVariantCreateBusy(true);
    const warnings: string[] = [];
    try {
      let body: CreateVariantPayload;
      try {
        body = buildCreateVariantBody(variantDraft);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Invalid variant fields.");
        return;
      }

      let bundlePatch: PatchItemPayload | null;
      try {
        bundlePatch = bundlePatchFromVariantDraft(variantDraft);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Invalid bundle fields.");
        return;
      }

      const oq = variantDraft.openingQty.trim();
      if (oq) {
        if (!variantDraft.openingBranchId.trim()) {
          setMessage("Opening stock requires a branch.");
          return;
        }
        const qtyNum = Number(oq);
        if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
          setMessage("Opening qty must be a positive number.");
          return;
        }
        const ucRaw =
          variantDraft.openingUnitCost.trim() || variantDraft.defaultCostPrice.trim();
        if (!ucRaw) {
          setMessage("Opening stock needs a unit cost (or default buy price).");
          return;
        }
        const unitCost = Number(ucRaw);
        if (!Number.isFinite(unitCost) || unitCost <= 0) {
          setMessage("Unit cost must be a positive number.");
          return;
        }
      }

      const sup = variantDraft.supplierId.trim();
      if (sup && canLinkSupplier) {
        const costRaw = variantDraft.defaultCostPrice.trim();
        if (costRaw) {
          const n = Number(costRaw);
          if (!Number.isFinite(n)) {
            setMessage("Default cost must be a valid number.");
            return;
          }
        }
      }

      const created = await createItemVariant(selectedId, body);
      const vid = created.id;

      if (bundlePatch) {
        try {
          await patchItem(vid, bundlePatch);
        } catch (err) {
          warnings.push(
            `Bundle fields not saved: ${err instanceof Error ? err.message : "error"}.`,
          );
        }
      }

      const sp = variantDraft.sellingPrice.trim();
      if (sp) {
        if (!canSetSellPrice) {
          warnings.push("Selling price skipped (no permission).");
        } else {
          const from = variantDraft.sellEffectiveFrom.trim() || todayIsoDate();
          try {
            await postSellingPrice({
              itemId: vid,
              branchId: variantDraft.sellBranchId.trim() || null,
              price: sp,
              effectiveFrom: from,
            });
          } catch (err) {
            warnings.push(
              `Selling price: ${err instanceof Error ? err.message : "save failed"}.`,
            );
          }
        }
      }

      if (sup) {
        if (!canLinkSupplier) {
          warnings.push("Supplier / buy price skipped (no permission).");
        } else {
          const costRaw = variantDraft.defaultCostPrice.trim();
          let defaultCostPrice: number | undefined;
          if (costRaw) {
            defaultCostPrice = Number(costRaw);
          }
          try {
            await addItemSupplierLink(vid, {
              supplierId: sup,
              setPrimary: variantDraft.setPrimarySupplier,
              supplierSku: variantDraft.supplierSku.trim() || undefined,
              defaultCostPrice,
            });
          } catch (err) {
            warnings.push(
              `Supplier link: ${err instanceof Error ? err.message : "failed"}.`,
            );
          }
        }
      }

      if (oq) {
        if (!canInventoryWrite) {
          warnings.push("Opening stock skipped (no permission).");
        } else {
          const branch = variantDraft.openingBranchId.trim();
          const ucRaw =
            variantDraft.openingUnitCost.trim() || variantDraft.defaultCostPrice.trim();
          const unitCost = Number(ucRaw);
          try {
            await postStockIncrease({
              branchId: branch,
              itemId: vid,
              quantity: oq,
              unitCost,
              notes: "Opening stock when creating variant",
            });
          } catch (err) {
            warnings.push(
              `Opening stock: ${err instanceof Error ? err.message : "failed"}.`,
            );
          }
        }
      }

      if (pendingVariantImage) {
        try {
          await uploadItemImageToCloudinary(vid, pendingVariantImage, { primary: true });
        } catch (err) {
          warnings.push(
            `Photo upload: ${err instanceof Error ? err.message : "failed"}.`,
          );
        }
      }

      setVariantDraft(emptyVariantDraft());
      setPendingVariantImage(null);
      const next = await fetchItemById(selectedId);
      setDetail(next);
      try {
        setSupplierLinks(await fetchItemSupplierLinks(selectedId));
      } catch {
        setSupplierLinks([]);
      }
      await loadTypesAndItems();
      setActiveDrawer(null);
      setMessage(["Variant created.", ...warnings].filter(Boolean).join(" "));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Variant create failed.");
    } finally {
      setVariantCreateBusy(false);
    }
  };

  const onDeleteItem = async () => {
    if (!selectedId || !window.confirm("Delete this item?")) {
      return;
    }
    setMessage("");
    try {
      await deleteItem(selectedId, false);
      setSelectedId(null);
      setDetail(null);
      setActiveDrawer(null);
      await loadTypesAndItems();
      setMessage("Item deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  const onUploadCatalogImage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !pendingCatalogImage) {
      setMessage("Choose an image file first.");
      return;
    }
    setCatalogImageUploadBusy(true);
    setMessage("");
    try {
      await uploadItemImageToCloudinary(selectedId, pendingCatalogImage, {
        altText: catalogImageAlt.trim() || undefined,
        primary: catalogImagePrimary,
      });
      setPendingCatalogImage(null);
      setCatalogImageAlt("");
      await refreshSelectedDetail();
      await loadTypesAndItems();
      setMessage("Photo uploaded to Cloudinary — only the URL and fingerprint metadata are stored here.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setCatalogImageUploadBusy(false);
    }
  };

  const onRemoveGalleryImage = async (imageId: string) => {
    if (!selectedId || !window.confirm("Remove this photo from the product?")) {
      return;
    }
    setMessage("");
    try {
      await deleteItemImage(selectedId, imageId);
      await refreshSelectedDetail();
      await loadTypesAndItems();
      setMessage("Image removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove image.");
    }
  };

  const variantRows = detail?.variants ?? [];
  const sortedImages = detail?.images
    ? [...detail.images].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const sellPrice = detail ? toNumber(detail.bundlePrice) : null;
  const primaryLink = supplierLinks.find((l) => l.primary);
  const primaryCost = primaryLink ? toNumber(primaryLink.defaultCostPrice) : null;
  const marginPct =
    sellPrice != null && sellPrice > 0 && primaryCost != null
      ? ((sellPrice - primaryCost) / sellPrice) * 100
      : null;

  return (
    <>
    <div className={DASHBOARD_MAX_WIDE}>
      <div className="space-y-8">
      <header className="space-y-4">
        <DashboardPageHero
          icon={Package}
          eyebrow="Catalog"
          title="Products"
          description={
            <>
              Search the shelf, then refine details in slide-over panels — tuned for kiosk-style speed. Parent items
              hold variants; supplier links need{" "}
              <code className="text-xs">{Permission.CatalogItemsLinkSuppliers}</code>
              {canListSuppliers ? (
                <>
                  {" "}
                  and <code className="text-xs">{Permission.SuppliersRead}</code> to pick vendors.
                </>
              ) : (
                "."
              )}
            </>
          }
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <DashboardQuickLinks
            links={[
              { href: APP_ROUTES.categories, label: "Categories", desc: "Tree & aisles", icon: LayoutGrid },
              { href: APP_ROUTES.suppliers, label: "Suppliers", desc: "Costs & links", icon: Building2 },
              { href: APP_ROUTES.pricing, label: "Pricing", desc: "Rules & sell price", icon: CircleDollarSign },
            ]}
          />
          <Button
            type="button"
            size="lg"
            className="gap-2 shadow-md sm:shrink-0"
            disabled={itemTypes.length === 0}
            onClick={() => setActiveDrawer("create-parent")}
          >
            <PackagePlus className="size-4" />
            New product
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/15 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <form className="flex min-w-0 flex-1 flex-wrap items-end gap-2" onSubmit={onSearchSubmit}>
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm font-medium" htmlFor="product-search">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Sparkles className="size-3.5 opacity-70" aria-hidden />
              Find on shelf
            </span>
            <input
              id="product-search"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, SKU, barcode…"
            />
          </label>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <p className="text-xs text-muted-foreground sm:max-w-xs sm:text-right">
          Tip: open <strong className="text-foreground">New product</strong> to add a parent row, then add options
          (variants) from the inspector.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border bg-background">
          <div className="border-b bg-muted/30 px-3 py-2 text-sm font-medium">
            Catalog (top-level rows)
          </div>
          <ul className="max-h-80 divide-y overflow-y-auto text-sm">
            {items
              .filter((row) => !row.variantOfItemId)
              .map((row) => {
                const category =
                  row.categoryId != null && row.categoryId !== ""
                    ? categoryById.get(row.categoryId)
                    : undefined;
                const categoryLabel =
                  category != null
                    ? `${category.name}${!category.active ? " (inactive)" : ""}`
                    : row.categoryId
                      ? "Unknown category"
                      : null;
                const listThumb = itemListThumbnailUrl(row);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`flex w-full gap-3 px-3 py-2 text-left hover:bg-muted/40 ${
                        selectedId === row.id ? "bg-muted/50" : ""
                      }`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      {listThumb ? (
                        <span className="relative mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-md border bg-muted shadow-sm">
                          <Image
                            src={listThumb}
                            alt=""
                            width={44}
                            height={44}
                            className="object-cover"
                          />
                        </span>
                      ) : (
                        <span
                          className="mt-0.5 h-11 w-11 shrink-0 rounded-md border border-dashed border-muted-foreground/25 bg-muted/30"
                          aria-hidden
                        />
                      )}
                      <span className="flex min-w-0 flex-1 flex-col items-start">
                        <span className="font-medium">{row.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.sku}
                          {row.barcode ? ` · ${row.barcode}` : ""}
                        </span>
                        {categoryLabel ? (
                          <span className="text-xs text-muted-foreground">{categoryLabel}</span>
                        ) : null}
                        {row.webPublished ? (
                          <span className="text-xs font-medium text-primary">Online shop</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>

        <div className="space-y-4 rounded-md border bg-background p-4">
          {!detail ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03]">
                <Package className="size-8 text-muted-foreground" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Nothing selected yet</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Tap a parent row on the left, or open{" "}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    disabled={itemTypes.length === 0}
                    onClick={() => setActiveDrawer("create-parent")}
                  >
                    New product
                  </button>{" "}
                  to start fresh.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={itemTypes.length === 0}
                onClick={() => setActiveDrawer("create-parent")}
                className="gap-2"
              >
                <PackagePlus className="size-4" />
                Add parent product
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-muted shadow-inner">
                    {coverImageUrl(detail) ? (
                      <Image
                        src={coverImageUrl(detail)!}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="size-6 text-muted-foreground/50" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="truncate text-base font-semibold tracking-tight">{detail.name}</h3>
                    <p className="font-mono text-xs text-muted-foreground">
                      {detail.sku}
                      {detail.variantName ? ` · ${detail.variantName}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {detail.active === false ? (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                          Inactive
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                      {detail.webPublished ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Online shop
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setActiveDrawer("edit-product")}
                  >
                    <PencilLine className="size-3.5" />
                    Details
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setActiveDrawer("photos")}
                  >
                    <Camera className="size-3.5" />
                    Photos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 shadow-sm"
                    onClick={() => setActiveDrawer("add-variant")}
                  >
                    <Layers className="size-3.5" />
                    Add option
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <span>
                  Shelf price: <strong className="text-foreground">{formatAmount(sellPrice)}</strong>
                </span>
                {primaryLink ? (
                  <span>
                    Primary cost:{" "}
                    <strong className="text-foreground">{formatAmount(primaryCost)}</strong>
                    {marginPct != null ? (
                      <span className="text-muted-foreground"> ({marginPct.toFixed(1)}% margin)</span>
                    ) : null}
                  </span>
                ) : supplierLinks.length === 0 ? (
                  <span>No supplier links.</span>
                ) : (
                  <span>Pick a primary supplier to see margin.</span>
                )}
              </div>

              {supplierLinks.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Supplier links
                  </h4>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="py-1 pr-2">Supplier</th>
                          <th className="py-1 pr-2">Primary</th>
                          <th className="py-1 pr-2">Supplier SKU</th>
                          <th className="py-1 pr-2">Default cost</th>
                          <th className="py-1">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierLinks.map((link) => (
                          <tr key={link.id} className="border-b border-muted/50">
                            <td className="py-1 pr-2">{link.supplierName}</td>
                            <td className="py-1 pr-2">{link.primary ? "Yes" : "—"}</td>
                            <td className="py-1 pr-2">{link.supplierSku ?? "—"}</td>
                            <td className="py-1 pr-2">
                              {formatAmount(toNumber(link.defaultCostPrice))}
                            </td>
                            <td className="py-1">{link.active ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="rounded-xl border bg-card/50 p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-foreground">Options (variants)</h4>
                <p className="mt-1 max-w-prose text-xs text-muted-foreground">
                  Each row is a sellable SKU. Use <strong className="text-foreground">Add option</strong> for sizes,
                  flavours, or multipacks — only SKU and label are required to start.
                </p>
                <div className="mt-3 overflow-x-auto rounded-lg border bg-background">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="w-10 py-2 pl-3 pr-2" aria-label="Photo" />
                        <th className="py-2 pr-2 font-medium">Name</th>
                        <th className="py-2 pr-2 font-medium">Option</th>
                        <th className="py-2 pr-2 font-medium">SKU</th>
                        <th className="py-2 pr-3 font-medium">Barcode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variantRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                            No options yet — open Add option to create one.
                          </td>
                        </tr>
                      ) : (
                        variantRows.map((v) => {
                          const vThumb = itemListThumbnailUrl(v);
                          return (
                            <tr key={v.id} className="border-b border-muted/50 last:border-0">
                              <td className="py-2 pl-3 pr-2 align-middle">
                                {vThumb ? (
                                  <span className="relative block h-9 w-9 overflow-hidden rounded border bg-muted">
                                    <Image
                                      src={vThumb}
                                      alt=""
                                      width={36}
                                      height={36}
                                      className="object-cover"
                                    />
                                  </span>
                                ) : (
                                  <span className="block h-9 w-9 rounded border border-dashed border-muted-foreground/20 bg-muted/20" />
                                )}
                              </td>
                              <td className="py-2 pr-2">{v.name}</td>
                              <td className="py-2 pr-2">{v.variantName ?? "—"}</td>
                              <td className="py-2 pr-2">{v.sku}</td>
                              <td className="py-2 pr-3">{v.barcode ?? "—"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {message ? <DashboardNotice text={message} /> : null}
      </div>
    </div>

    <FormDrawer
      open={activeDrawer === "create-parent"}
      onOpenChange={(open) => {
        if (!open) setActiveDrawer(null);
      }}
      title="New parent product"
      description="Name it, scan or type a SKU, optionally drop it into a category — then fold open supplier chips if you buy from someone specific."
      contextLabel="Catalog · Step 1"
      icon={<PackagePlus className="size-5 text-primary" aria-hidden />}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setActiveDrawer(null)}>
            Cancel
          </Button>
          <Button type="submit" form="create-parent-form" disabled={itemTypes.length === 0}>
            Create product
          </Button>
        </div>
      }
    >
      <form id="create-parent-form" className="space-y-5" onSubmit={onCreateParent}>
        {itemTypes.length === 0 ? (
          <p className="text-sm text-destructive">
            No item types in tenant — seed catalog (Slice 4) before creating products.
          </p>
        ) : null}
        <FormDrawerFields legend="Identity" hint="These land on the till grid immediately after save.">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground" htmlFor="drawer-item-type">
            Item type
            <select
              id="drawer-item-type"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={parentDraft.itemTypeId}
              onChange={(event) =>
                setParentDraft((previous) => ({
                  ...previous,
                  itemTypeId: event.target.value,
                }))
              }
              required
            >
              {itemTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label} ({type.key})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Display name
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="Customer-facing title"
              value={parentDraft.name}
              onChange={(event) =>
                setParentDraft((previous) => ({ ...previous, name: event.target.value }))
              }
              required
              aria-label="New product name"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              SKU
              <input
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder="Internal code"
                value={parentDraft.sku}
                onChange={(event) =>
                  setParentDraft((previous) => ({ ...previous, sku: event.target.value }))
                }
                required
                aria-label="New product SKU"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Barcode
              <input
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder="Optional"
                value={parentDraft.barcode}
                onChange={(event) =>
                  setParentDraft((previous) => ({ ...previous, barcode: event.target.value }))
                }
                aria-label="New product barcode"
              />
            </label>
          </div>
        </FormDrawerFields>

        <FormDrawerFields legend="Merchandising" hint="Categories power kiosk rails and shop navigation.">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground" htmlFor="drawer-parent-category">
            Category
            <select
              id="drawer-parent-category"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={parentDraft.categoryId}
              onChange={(event) =>
                setParentDraft((previous) => ({ ...previous, categoryId: event.target.value }))
              }
            >
              <option value="">— None —</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {!category.active ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </label>
        </FormDrawerFields>

        {canLinkSupplier ? (
          <FormDrawerFields
            legend="Supplier shortcut"
            hint={
              <>
                Optional live link via{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">POST /supplier-links</code>. Leave
                blank to wire vendors later.
              </>
            }
          >
            {canListSuppliers ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={suppliersLoading}
                onClick={() => void loadSuppliersForLink()}
              >
                {suppliersLoading ? "Loading suppliers…" : "Load suppliers"}
              </Button>
            ) : null}
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Supplier
              <select
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={
                  suppliersForLink.some((s) => s.id === parentDraft.supplierId)
                    ? parentDraft.supplierId
                    : ""
                }
                onChange={(event) =>
                  setParentDraft((p) => ({ ...p, supplierId: event.target.value }))
                }
              >
                <option value="">— None —</option>
                {suppliersForLink.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Supplier ID (override)
              <input
                className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs"
                placeholder="UUID"
                value={parentDraft.supplierId}
                onChange={(event) =>
                  setParentDraft((p) => ({ ...p, supplierId: event.target.value }))
                }
                aria-label="Supplier ID"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Supplier SKU
                <input
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={parentDraft.supplierSku}
                  onChange={(event) =>
                    setParentDraft((p) => ({ ...p, supplierSku: event.target.value }))
                  }
                  aria-label="Supplier SKU"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Default cost
                <input
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={parentDraft.defaultCostPrice}
                  onChange={(event) =>
                    setParentDraft((p) => ({ ...p, defaultCostPrice: event.target.value }))
                  }
                  aria-label="Default cost from supplier"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={parentDraft.setPrimarySupplier}
                onChange={(event) =>
                  setParentDraft((p) => ({ ...p, setPrimarySupplier: event.target.checked }))
                }
              />
              Set as primary supplier
            </label>
          </FormDrawerFields>
        ) : null}
      </form>
    </FormDrawer>

    <FormDrawer
      open={activeDrawer === "edit-product" && detail !== null}
      onOpenChange={(open) => {
        if (!open) setActiveDrawer(null);
      }}
      title="Product details"
      description={
        detail
          ? `Editing SKU ${detail.sku}${detail.variantName ? ` · ${detail.variantName}` : ""}`
          : ""
      }
      contextLabel="Inspector"
      icon={<PencilLine className="size-5 text-primary" aria-hidden />}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setActiveDrawer(null)}>
            Close
          </Button>
          <Button type="submit" form="edit-product-form">
            Save changes
          </Button>
          <Button type="button" variant="destructive" onClick={() => void onDeleteItem()}>
            Delete
          </Button>
        </div>
      }
    >
      {detail ? (
        <form id="edit-product-form" className="space-y-4" onSubmit={onPatchItem}>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Name
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={patchDraft.name ?? ""}
              onChange={(event) =>
                setPatchDraft((previous) => ({ ...previous, name: event.target.value }))
              }
              aria-label="Product name"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Barcode
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
              value={patchDraft.barcode ?? ""}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  barcode: event.target.value,
                }))
              }
              aria-label="Barcode"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Long description
            <textarea
              className="min-h-[6rem] resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={patchDraft.description ?? ""}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              aria-label="Product description"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Category
            <select
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={patchDraft.categoryId}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  categoryId: event.target.value,
                }))
              }
              aria-label="Product category"
            >
              <option value="">— None —</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {!category.active ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Bundle / selling price (optional)
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              inputMode="decimal"
              placeholder="Leave empty to leave unchanged on save"
              value={patchDraft.bundlePriceStr}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  bundlePriceStr: event.target.value,
                }))
              }
              aria-label="Bundle price"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Cover URL / legacy key
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground"
              placeholder="HTTPS cover or legacy key"
              value={patchDraft.imageKey}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  imageKey: event.target.value,
                }))
              }
              aria-label="Image key"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={patchDraft.active ?? true}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  active: event.target.checked,
                }))
              }
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={patchDraft.webPublished ?? false}
              onChange={(event) =>
                setPatchDraft((previous) => ({
                  ...previous,
                  webPublished: event.target.checked,
                }))
              }
            />
            Show on online shop (when storefront is enabled)
          </label>
        </form>
      ) : null}
    </FormDrawer>

    <FormDrawer
      open={activeDrawer === "photos" && detail !== null}
      onOpenChange={(open) => {
        if (!open) setActiveDrawer(null);
      }}
      title="Photo studio"
      description="Upload once — we stash Cloudinary metadata plus a colour accent you will see shimmer on cards."
      contextLabel="Media"
      icon={<Camera className="size-5 text-primary" aria-hidden />}
      footer={
        <p className="text-[11px] text-muted-foreground">
          Requires{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            APP_MEDIA_CLOUDINARY_ENABLED
          </code>{" "}
          on the API.
        </p>
      }
    >
      {detail ? (
        <div className="space-y-5">
          <div className="space-y-3 rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/50 via-background to-amber-50/35 p-4 dark:border-violet-900/40 dark:from-violet-950/25 dark:to-amber-950/15">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">Live cover</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Dominant colours paint subtle shadows around thumbnails across kiosk lanes.
              </p>
            </div>
            {coverImageUrl(detail) ? (
              <div
                className="relative mx-auto h-44 w-full max-w-sm overflow-hidden rounded-xl border-2 border-background shadow-xl"
                style={{
                  boxShadow: `0 18px 42px -16px ${sortedImages.find((i) => i.predominantColorHex)?.predominantColorHex ?? "rgba(99,102,241,0.45)"}`,
                }}
              >
                <Image
                  src={coverImageUrl(detail)!}
                  alt="Cover"
                  fill
                  className="object-cover"
                  sizes="320px"
                  priority
                />
              </div>
            ) : detail.imageKey ? (
              <p className="text-xs text-muted-foreground">
                Cover (legacy):{" "}
                <span className="font-mono break-all text-foreground">{detail.imageKey}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No hero image yet — beam one in below.</p>
            )}
          </div>

          <form
            className="space-y-3 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10 p-4"
            onSubmit={(e) => onUploadCatalogImage(e).catch(() => undefined)}
          >
            <p className="text-sm font-medium text-foreground">Beam a new photo</p>
            <input
              type="file"
              accept="image/*"
              className="max-w-full text-xs file:mr-2 file:rounded file:border file:bg-background file:px-2 file:py-1"
              onChange={(event) => setPendingCatalogImage(event.target.files?.[0] ?? null)}
            />
            {pendingCatalogImage ? (
              <p className="text-[11px] text-muted-foreground">Selected: {pendingCatalogImage.name}</p>
            ) : null}
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="Alt text (optional)"
              value={catalogImageAlt}
              onChange={(event) => setCatalogImageAlt(event.target.value)}
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={catalogImagePrimary}
                onChange={(event) => setCatalogImagePrimary(event.target.checked)}
              />
              Set as cover / listing thumbnail
            </label>
            <Button type="submit" size="sm" className="w-fit" disabled={catalogImageUploadBusy || !pendingCatalogImage}>
              {catalogImageUploadBusy ? "Uploading…" : "Upload to Cloudinary"}
            </Button>
          </form>

          {sortedImages.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {sortedImages.map((img) => {
                const url = galleryImageUrl(img);
                const accent = img.predominantColorHex?.trim() ?? "#818cf8";
                return (
                  <figure
                    key={img.id}
                    className="relative overflow-hidden rounded-lg border bg-background p-2 shadow-sm transition hover:shadow-md"
                    style={{ borderColor: `${accent}66` }}
                  >
                    {url ? (
                      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                        <Image
                          src={url}
                          alt={img.altText ?? "Product"}
                          fill
                          className="object-cover"
                          sizes="180px"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-square items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                        No preview
                      </div>
                    )}
                    <figcaption className="mt-2 space-y-1 pr-14 text-[10px] text-muted-foreground">
                      <div className="font-mono text-[9px] break-all text-foreground">
                        {img.provider === "cloudinary" ? img.publicId ?? img.s3Key : img.s3Key}
                      </div>
                      {img.phash ? (
                        <div>
                          Fingerprint · <span className="font-mono">{img.phash.slice(0, 14)}…</span>
                        </div>
                      ) : null}
                      {img.bytes != null ? (
                        <div>
                          {(img.bytes / 1024).toFixed(1)} KB
                          {img.format ? ` · ${img.format}` : ""}
                          {img.width && img.height ? ` · ${img.width}×${img.height}` : ""}
                        </div>
                      ) : null}
                    </figcaption>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute bottom-2 right-2 h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => onRemoveGalleryImage(img.id).catch(() => undefined)}
                    >
                      Remove
                    </Button>
                  </figure>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No gallery slots yet.</p>
          )}
        </div>
      ) : null}
    </FormDrawer>

    <FormDrawer
      open={activeDrawer === "add-variant" && detail !== null}
      onOpenChange={(open) => {
        if (!open) setActiveDrawer(null);
      }}
      title="Add an option"
      description="Spin up another sellable SKU under this parent — fold advanced pricing or stock open only when you need it."
      contextLabel="Variants · Step 2"
      icon={<Layers className="size-5 text-primary" aria-hidden />}
      width="wide"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setActiveDrawer(null)}>
            Cancel
          </Button>
          <Button type="submit" form="add-variant-form" disabled={variantCreateBusy}>
            {variantCreateBusy ? "Creating…" : "Create variant"}
          </Button>
        </div>
      }
    >
      {detail ? (
        <VariantDrawerForm
          variantDraft={variantDraft}
          setVariantDraft={setVariantDraft}
          sortedCategories={sortedCategories}
          branches={branches}
          suppliersForLink={suppliersForLink}
          suppliersLoading={suppliersLoading}
          loadSuppliersForLink={loadSuppliersForLink}
          canLinkSupplier={canLinkSupplier}
          canListSuppliers={canListSuppliers}
          canSetSellPrice={canSetSellPrice}
          canInventoryWrite={canInventoryWrite}
          currencyCode={currencyCode}
          pendingVariantImage={pendingVariantImage}
          setPendingVariantImage={setPendingVariantImage}
          onSubmit={onAddVariant}
          inputClassName={VARIANT_INPUT_CLASS}
        />
      ) : null}
    </FormDrawer>

    </>
  );
}
