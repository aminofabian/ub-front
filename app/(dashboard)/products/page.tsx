"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
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
    <section className="space-y-8">
      <header>
        <h2 className="text-xl font-semibold">Products</h2>
        <p className="text-sm text-muted-foreground">
          Parent items, variants, search, update, and soft-delete. When creating a parent, you can optionally
          link a supplier if you have{" "}
          <code className="text-xs">{Permission.CatalogItemsLinkSuppliers}</code> (and typically{" "}
          <code className="text-xs">{Permission.SuppliersRead}</code> to pick from a list).
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-2" onSubmit={onSearchSubmit}>
        <label className="text-sm font-medium" htmlFor="product-search">
          Search
        </label>
        <input
          id="product-search"
          className="min-w-[200px] rounded-md border bg-background px-3 py-2 text-sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, SKU, barcode…"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <form
        className="grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-6"
        onSubmit={onCreateParent}
      >
        <label className="text-sm font-medium md:col-span-6" htmlFor="item-type">
          New parent — item type
        </label>
        <select
          id="item-type"
          className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
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
        <input
          className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
          placeholder="Name"
          value={parentDraft.name}
          onChange={(event) =>
            setParentDraft((previous) => ({ ...previous, name: event.target.value }))
          }
          required
          aria-label="New product name"
        />
        <input
          className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-1"
          placeholder="SKU"
          value={parentDraft.sku}
          onChange={(event) =>
            setParentDraft((previous) => ({ ...previous, sku: event.target.value }))
          }
          required
          aria-label="New product SKU"
        />
        <input
          className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-1"
          placeholder="Barcode"
          value={parentDraft.barcode}
          onChange={(event) =>
            setParentDraft((previous) => ({ ...previous, barcode: event.target.value }))
          }
          aria-label="New product barcode"
        />
        <label className="text-sm font-medium md:col-span-6" htmlFor="parent-category">
          Category (optional)
        </label>
        <select
          id="parent-category"
          className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-3"
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
        {canLinkSupplier ? (
          <>
            <div className="md:col-span-6 mt-2 border-t pt-3">
              <p className="text-sm font-medium">Optional supplier link</p>
              <p className="text-xs text-muted-foreground">
                After create, the product is linked via{" "}
                <code className="text-[10px]">POST /items/&#123;id&#125;/supplier-links</code>. Leave supplier
                empty to skip.
              </p>
            </div>
            {canListSuppliers ? (
              <div className="md:col-span-6 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={suppliersLoading}
                  onClick={() => void loadSuppliersForLink()}
                >
                  {suppliersLoading ? "Loading suppliers…" : "Load suppliers"}
                </Button>
              </div>
            ) : null}
            <label className="md:col-span-3 flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Supplier</span>
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm"
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
            <label className="md:col-span-3 flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Supplier ID (override / paste)</span>
              <input
                className="rounded-md border bg-background px-3 py-2 font-mono text-xs"
                placeholder="UUID"
                value={parentDraft.supplierId}
                onChange={(event) =>
                  setParentDraft((p) => ({ ...p, supplierId: event.target.value }))
                }
                aria-label="Supplier ID"
              />
            </label>
            <label className="md:col-span-3 flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Supplier SKU (optional)</span>
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={parentDraft.supplierSku}
                onChange={(event) =>
                  setParentDraft((p) => ({ ...p, supplierSku: event.target.value }))
                }
                aria-label="Supplier SKU"
              />
            </label>
            <label className="md:col-span-3 flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Default cost (optional)</span>
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm"
                inputMode="decimal"
                placeholder="0.00"
                value={parentDraft.defaultCostPrice}
                onChange={(event) =>
                  setParentDraft((p) => ({ ...p, defaultCostPrice: event.target.value }))
                }
                aria-label="Default cost from supplier"
              />
            </label>
            <label className="md:col-span-6 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={parentDraft.setPrimarySupplier}
                onChange={(event) =>
                  setParentDraft((p) => ({ ...p, setPrimarySupplier: event.target.checked }))
                }
              />
              Set as primary supplier for this item
            </label>
          </>
        ) : null}
        <Button
          className="md:col-span-2 md:w-fit"
          type="submit"
          disabled={itemTypes.length === 0}
        >
          Create parent product
        </Button>
        {itemTypes.length === 0 ? (
          <p className="md:col-span-6 text-sm text-destructive">
            No item types in tenant — seed catalog (Slice 4) before creating products.
          </p>
        ) : null}
      </form>

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
            <p className="text-sm text-muted-foreground">
              Select a parent product to edit or add variants.
            </p>
          ) : (
            <>
              <h3 className="text-sm font-semibold">Edit selected</h3>
              <p className="text-xs text-muted-foreground">
                SKU <span className="font-mono">{detail.sku}</span>
                {detail.variantName ? ` · variant: ${detail.variantName}` : ""}
              </p>
              <div className="space-y-4 rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/50 via-background to-amber-50/35 p-4 dark:border-violet-900/40 dark:from-violet-950/25 dark:to-amber-950/15">
                <div>
                  <p className="text-sm font-semibold tracking-tight text-foreground">Chromatic shelf</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Binaries stay on Cloudinary; UB stores the secure URL, public id, size, dominant colour sample,
                    and a perceptual hash for clever duplicate detection later.
                  </p>
                </div>
                {coverImageUrl(detail) ? (
                  <div
                    className="relative h-40 w-full max-w-sm overflow-hidden rounded-lg border-2 border-background shadow-xl"
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
                    Cover (legacy / non-URL):{" "}
                    <span className="font-mono break-all text-foreground">{detail.imageKey}</span>
                  </p>
                ) : null}
                <form className="flex flex-col gap-2 border-t border-dashed border-muted-foreground/25 pt-3" onSubmit={(e) => onUploadCatalogImage(e).catch(() => undefined)}>
                  <p className="text-xs font-medium text-foreground">Beam a new photo</p>
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
                    className="rounded-md border bg-background px-2 py-1.5 text-sm"
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
                  <p className="text-[10px] text-muted-foreground">
                    Requires Cloudinary on the API (<code className="text-[10px]">APP_MEDIA_CLOUDINARY_ENABLED</code>
                    ). Otherwise you will see a service unavailable message.
                  </p>
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
                          <figcaption className="mt-2 space-y-1 pr-16 text-[10px] text-muted-foreground">
                            <div className="font-mono text-[9px] break-all text-foreground">
                              {img.provider === "cloudinary" ? img.publicId ?? img.s3Key : img.s3Key}
                            </div>
                            {img.phash ? (
                              <div>
                                Visual fingerprint · <span className="font-mono">{img.phash.slice(0, 14)}…</span>
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
                  <p className="text-xs text-muted-foreground">No gallery slots yet — upload above or use the legacy register API.</p>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Bundle / list price: <strong className="text-foreground">{formatAmount(sellPrice)}</strong>
                </span>
                {primaryLink ? (
                  <span>
                    Primary supplier cost:{" "}
                    <strong className="text-foreground">{formatAmount(primaryCost)}</strong>
                    {marginPct != null ? (
                      <span className="text-muted-foreground"> ({marginPct.toFixed(1)}% margin)</span>
                    ) : null}
                  </span>
                ) : supplierLinks.length === 0 ? (
                  <span>No supplier links.</span>
                ) : (
                  <span>Mark a primary supplier to compare cost.</span>
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
              <form className="space-y-2" onSubmit={onPatchItem}>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={patchDraft.name ?? ""}
                  onChange={(event) =>
                    setPatchDraft((previous) => ({ ...previous, name: event.target.value }))
                  }
                  aria-label="Product name"
                />
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={patchDraft.barcode ?? ""}
                  onChange={(event) =>
                    setPatchDraft((previous) => ({
                      ...previous,
                      barcode: event.target.value,
                    }))
                  }
                  aria-label="Barcode"
                />
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>Category</span>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground"
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
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>Bundle / selling price (optional)</span>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground"
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
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>Cover URL / legacy key (optional override)</span>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono text-foreground"
                    placeholder="HTTPS cover or legacy key — Cloudinary uploads set this automatically"
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
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">Save changes</Button>
                  <Button type="button" variant="destructive" onClick={onDeleteItem}>
                    Delete
                  </Button>
                </div>
              </form>

              <div className="mt-8 rounded-xl border bg-card/50 p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-foreground">Options (variants)</h4>
                <p className="mt-1 max-w-prose text-xs text-muted-foreground">
                  Each row is a separate SKU shoppers can buy (for example size, color, or flavor). You only need a
                  unique SKU and an option label; expand a section when you want shelf price, starting stock, vendor
                  cost, or a photo.
                </p>
                <div className="mt-3 overflow-x-auto rounded-lg border bg-background">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="py-2 pl-3 pr-2 w-10" aria-label="Photo" />
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
                            No options yet — create the first one below.
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

                <form className="mt-5 space-y-4" onSubmit={onAddVariant}>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Basics</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">
                          SKU <span className="text-destructive">*</span>
                        </span>
                        <input
                          className={VARIANT_INPUT_CLASS}
                          placeholder="e.g. TEESHIRT-RED-M"
                          value={variantDraft.sku}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              sku: event.target.value,
                            }))
                          }
                          required
                          autoComplete="off"
                          aria-label="Variant SKU"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">
                          Option label <span className="text-destructive">*</span>
                        </span>
                        <input
                          className={VARIANT_INPUT_CLASS}
                          placeholder="e.g. Red / Medium / 500 ml"
                          value={variantDraft.variantName}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              variantName: event.target.value,
                            }))
                          }
                          required
                          autoComplete="off"
                          aria-label="Variant option label"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                        <span className="font-medium text-muted-foreground">Barcode (scan or type)</span>
                        <input
                          className={VARIANT_INPUT_CLASS}
                          placeholder="Optional"
                          value={variantDraft.barcode}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              barcode: event.target.value,
                            }))
                          }
                          aria-label="Variant barcode"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                        <span className="font-medium text-muted-foreground">Name on receipts &amp; search</span>
                        <span className="font-normal text-muted-foreground/90">
                          Leave blank to reuse the parent product name.
                        </span>
                        <input
                          className={VARIANT_INPUT_CLASS}
                          placeholder="Optional — defaults to parent name"
                          value={variantDraft.name}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              name: event.target.value,
                            }))
                          }
                          aria-label="Variant display name"
                        />
                      </label>
                    </div>
                  </div>

                  <details className="group rounded-lg border bg-background open:pb-1">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                      <span
                        className="text-muted-foreground transition-transform duration-200 group-open:rotate-90"
                        aria-hidden
                      >
                        ▸
                      </span>
                      Description, category, unit &amp; cover image link
                    </summary>
                    <div className="space-y-3 border-t px-3 py-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
                      <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                        <span className="font-medium text-muted-foreground">Description</span>
                        <textarea
                          className={`${VARIANT_INPUT_CLASS} min-h-[5rem] resize-y`}
                          placeholder="Optional — defaults to parent description"
                          value={variantDraft.description}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              description: event.target.value,
                            }))
                          }
                          aria-label="Variant description"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">Category</span>
                        <select
                          className={VARIANT_INPUT_CLASS}
                          value={variantDraft.categoryId}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              categoryId: event.target.value,
                            }))
                          }
                          aria-label="Variant category"
                        >
                          <option value="">Same as parent product</option>
                          {sortedCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">Unit</span>
                        <input
                          className={VARIANT_INPUT_CLASS}
                          placeholder="each, kg, box… — blank matches parent"
                          value={variantDraft.unitType}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              unitType: event.target.value,
                            }))
                          }
                          aria-label="Variant unit type"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                        <span className="font-medium text-muted-foreground">Cover image URL</span>
                        <span className="font-normal text-muted-foreground/90">
                          Use a full https link, or leave blank to inherit the parent image.
                        </span>
                        <input
                          className={VARIANT_INPUT_CLASS}
                          placeholder="https://…"
                          value={variantDraft.imageKey}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              imageKey: event.target.value,
                            }))
                          }
                          aria-label="Variant cover image URL"
                        />
                      </label>
                    </div>
                  </details>

                  <details className="group rounded-lg border bg-background open:pb-1">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                      <span
                        className="text-muted-foreground transition-transform duration-200 group-open:rotate-90"
                        aria-hidden
                      >
                        ▸
                      </span>
                      Reorder reminders
                    </summary>
                    <div className="grid gap-3 border-t px-3 py-3 sm:grid-cols-3">
                      <label className="flex flex-col gap-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">Warn when below</span>
                        <input
                          className={VARIANT_INPUT_CLASS}
                          inputMode="decimal"
                          placeholder="Min on hand"
                          value={variantDraft.minStockLevel}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              minStockLevel: event.target.value,
                            }))
                          }
                          aria-label="Min stock level"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">Reorder at</span>
                        <input
                          className={VARIANT_INPUT_CLASS}
                          inputMode="decimal"
                          placeholder="Level"
                          value={variantDraft.reorderLevel}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              reorderLevel: event.target.value,
                            }))
                          }
                          aria-label="Reorder level"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">Suggest order qty</span>
                        <input
                          className={VARIANT_INPUT_CLASS}
                          inputMode="decimal"
                          placeholder="Units"
                          value={variantDraft.reorderQty}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              reorderQty: event.target.value,
                            }))
                          }
                          aria-label="Reorder quantity"
                        />
                      </label>
                    </div>
                  </details>

                  <details className="group rounded-lg border bg-background open:pb-1">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                      <span
                        className="text-muted-foreground transition-transform duration-200 group-open:rotate-90"
                        aria-hidden
                      >
                        ▸
                      </span>
                      Multipack or bundle pricing
                    </summary>
                    <div className="space-y-2 border-t px-3 py-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
                      <label className="flex flex-col gap-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">Items in pack</span>
                        <input
                          className={VARIANT_INPUT_CLASS}
                          inputMode="numeric"
                          placeholder="e.g. 6"
                          value={variantDraft.bundleQty}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              bundleQty: event.target.value,
                            }))
                          }
                          aria-label="Bundle quantity"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">
                          Price for the pack{currencyCode ? ` (${currencyCode})` : ""}
                        </span>
                        <input
                          className={VARIANT_INPUT_CLASS}
                          inputMode="decimal"
                          placeholder="Optional"
                          value={variantDraft.bundlePrice}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              bundlePrice: event.target.value,
                            }))
                          }
                          aria-label="Bundle price"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                        <span className="font-medium text-muted-foreground">Pack label</span>
                        <input
                          className={VARIANT_INPUT_CLASS}
                          placeholder='e.g. "6-pack"'
                          value={variantDraft.bundleName}
                          onChange={(event) =>
                            setVariantDraft((previous) => ({
                              ...previous,
                              bundleName: event.target.value,
                            }))
                          }
                          aria-label="Bundle name"
                        />
                      </label>
                    </div>
                  </details>

                  <details className="group rounded-lg border bg-background open:pb-1">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                      <span
                        className="text-muted-foreground transition-transform duration-200 group-open:rotate-90"
                        aria-hidden
                      >
                        ▸
                      </span>
                      Regular selling price
                      {!canSetSellPrice ? (
                        <span className="ml-auto text-xs font-normal text-muted-foreground">
                          (needs pricing access)
                        </span>
                      ) : null}
                    </summary>
                    <div className="space-y-3 border-t px-3 py-3">
                      <p className="text-xs text-muted-foreground">
                        Sets what cashiers charge from this date. Leave empty if you set prices elsewhere.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1.5 text-xs">
                          <span className="font-medium text-muted-foreground">
                            Price{currencyCode ? ` (${currencyCode})` : ""}
                          </span>
                          <input
                            className={VARIANT_INPUT_CLASS}
                            inputMode="decimal"
                            placeholder="Optional"
                            value={variantDraft.sellingPrice}
                            onChange={(event) =>
                              setVariantDraft((previous) => ({
                                ...previous,
                                sellingPrice: event.target.value,
                              }))
                            }
                            aria-label="Selling price"
                            disabled={!canSetSellPrice}
                          />
                        </label>
                        <label className="flex flex-col gap-1.5 text-xs">
                          <span className="font-medium text-muted-foreground">Effective from</span>
                          <input
                            className={VARIANT_INPUT_CLASS}
                            type="date"
                            value={variantDraft.sellEffectiveFrom}
                            onChange={(event) =>
                              setVariantDraft((previous) => ({
                                ...previous,
                                sellEffectiveFrom: event.target.value,
                              }))
                            }
                            aria-label="Price effective from"
                            disabled={!canSetSellPrice}
                          />
                        </label>
                        <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                          <span className="font-medium text-muted-foreground">Only at this branch</span>
                          <span className="font-normal text-muted-foreground/90">
                            Leave as “All locations” unless this price is branch-specific.
                          </span>
                          <select
                            className={VARIANT_INPUT_CLASS}
                            value={variantDraft.sellBranchId}
                            onChange={(event) =>
                              setVariantDraft((previous) => ({
                                ...previous,
                                sellBranchId: event.target.value,
                              }))
                            }
                            aria-label="Branch for selling price"
                            disabled={!canSetSellPrice}
                          >
                            <option value="">All locations</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  </details>

                  {canLinkSupplier ? (
                    <details className="group rounded-lg border bg-background open:pb-1">
                      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                        <span
                          className="text-muted-foreground transition-transform duration-200 group-open:rotate-90"
                          aria-hidden
                        >
                          ▸
                        </span>
                        Supplier &amp; buy cost
                      </summary>
                      <div className="space-y-3 border-t px-3 py-3">
                        <p className="text-xs text-muted-foreground">
                          Link this variant to who you purchase from and your usual unit cost. Load suppliers if the
                          list is empty.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={suppliersLoading || !canListSuppliers}
                            onClick={() => void loadSuppliersForLink()}
                          >
                            {suppliersLoading ? "Loading…" : "Refresh supplier list"}
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                            <span className="font-medium text-muted-foreground">Supplier</span>
                            <select
                              className={VARIANT_INPUT_CLASS}
                              value={
                                suppliersForLink.some((s) => s.id === variantDraft.supplierId)
                                  ? variantDraft.supplierId
                                  : ""
                              }
                              onChange={(event) =>
                                setVariantDraft((previous) => ({
                                  ...previous,
                                  supplierId: event.target.value,
                                }))
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
                          <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                            <span className="font-medium text-muted-foreground">Supplier ID (advanced)</span>
                            <span className="font-normal text-muted-foreground/90">
                              Paste a UUID only if the vendor is not in the dropdown.
                            </span>
                            <input
                              className={`${VARIANT_INPUT_CLASS} font-mono text-xs`}
                              placeholder="Optional"
                              value={variantDraft.supplierId}
                              onChange={(event) =>
                                setVariantDraft((previous) => ({
                                  ...previous,
                                  supplierId: event.target.value,
                                }))
                              }
                              aria-label="Supplier ID"
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 text-xs">
                            <span className="font-medium text-muted-foreground">Their SKU for this item</span>
                            <input
                              className={VARIANT_INPUT_CLASS}
                              placeholder="Optional"
                              value={variantDraft.supplierSku}
                              onChange={(event) =>
                                setVariantDraft((previous) => ({
                                  ...previous,
                                  supplierSku: event.target.value,
                                }))
                              }
                              aria-label="Supplier SKU"
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 text-xs">
                            <span className="font-medium text-muted-foreground">
                              Your buy price per unit{currencyCode ? ` (${currencyCode})` : ""}
                            </span>
                            <input
                              className={VARIANT_INPUT_CLASS}
                              inputMode="decimal"
                              placeholder="Optional"
                              value={variantDraft.defaultCostPrice}
                              onChange={(event) =>
                                setVariantDraft((previous) => ({
                                  ...previous,
                                  defaultCostPrice: event.target.value,
                                }))
                              }
                              aria-label="Buy cost"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-xs sm:col-span-2">
                            <input
                              type="checkbox"
                              checked={variantDraft.setPrimarySupplier}
                              onChange={(event) =>
                                setVariantDraft((previous) => ({
                                  ...previous,
                                  setPrimarySupplier: event.target.checked,
                                }))
                              }
                            />
                            <span className="text-foreground">Make this the main supplier for this variant</span>
                          </label>
                        </div>
                      </div>
                    </details>
                  ) : null}

                  <details className="group rounded-lg border bg-background open:pb-1">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                      <span
                        className="text-muted-foreground transition-transform duration-200 group-open:rotate-90"
                        aria-hidden
                      >
                        ▸
                      </span>
                      Starting stock at a branch
                      {!canInventoryWrite ? (
                        <span className="ml-auto text-xs font-normal text-muted-foreground">
                          (needs inventory access)
                        </span>
                      ) : null}
                    </summary>
                    <div className="space-y-3 border-t px-3 py-3">
                      <p className="text-xs text-muted-foreground">
                        Records an opening quantity when the variant is created. Unit cost is your landed cost per
                        unit (you can match buy price above).
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1.5 text-xs">
                          <span className="font-medium text-muted-foreground">Quantity</span>
                          <input
                            className={VARIANT_INPUT_CLASS}
                            inputMode="decimal"
                            placeholder="Optional"
                            value={variantDraft.openingQty}
                            onChange={(event) =>
                              setVariantDraft((previous) => ({
                                ...previous,
                                openingQty: event.target.value,
                              }))
                            }
                            aria-label="Opening quantity"
                            disabled={!canInventoryWrite}
                          />
                        </label>
                        <label className="flex flex-col gap-1.5 text-xs">
                          <span className="font-medium text-muted-foreground">Branch</span>
                          <select
                            className={VARIANT_INPUT_CLASS}
                            value={variantDraft.openingBranchId}
                            onChange={(event) =>
                              setVariantDraft((previous) => ({
                                ...previous,
                                openingBranchId: event.target.value,
                              }))
                            }
                            aria-label="Branch for opening stock"
                            disabled={!canInventoryWrite}
                          >
                            <option value="">Choose branch…</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                          <span className="font-medium text-muted-foreground">
                            Unit cost{currencyCode ? ` (${currencyCode})` : ""}
                          </span>
                          <span className="font-normal text-muted-foreground/90">
                            Required when adding quantity. If you set buy price above, it can be reused here.
                          </span>
                          <input
                            className={VARIANT_INPUT_CLASS}
                            inputMode="decimal"
                            placeholder="Optional if buy price is set"
                            value={variantDraft.openingUnitCost}
                            onChange={(event) =>
                              setVariantDraft((previous) => ({
                                ...previous,
                                openingUnitCost: event.target.value,
                              }))
                            }
                            aria-label="Opening unit cost"
                            disabled={!canInventoryWrite}
                          />
                        </label>
                      </div>
                    </div>
                  </details>

                  <details className="group rounded-lg border bg-background open:pb-1">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                      <span
                        className="text-muted-foreground transition-transform duration-200 group-open:rotate-90"
                        aria-hidden
                      >
                        ▸
                      </span>
                      Upload a photo
                    </summary>
                    <div className="border-t px-3 py-3">
                      <label className="flex flex-col gap-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">Image file</span>
                        <span className="font-normal text-muted-foreground/90">
                          Saved to the new variant after it is created (shown in catalog &amp; quick sale).
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="text-sm file:mr-3 file:rounded file:border file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setPendingVariantImage(file);
                          }}
                          aria-label="Variant photo file"
                        />
                        {pendingVariantImage ? (
                          <span className="text-xs text-muted-foreground">
                            Selected: {pendingVariantImage.name}
                          </span>
                        ) : null}
                      </label>
                    </div>
                  </details>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Button type="submit" size="sm" disabled={variantCreateBusy}>
                      {variantCreateBusy ? "Creating…" : "Create variant"}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Required fields: SKU and option label only.
                    </span>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}
