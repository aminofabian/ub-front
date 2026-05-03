"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  addItemSupplierLink,
  createItem,
  createItemVariant,
  deleteItem,
  fetchCategories,
  fetchItemById,
  fetchItemSupplierLinks,
  fetchItemTypes,
  fetchItems,
  fetchSuppliers,
  patchItem,
  type CategoryRecord,
  type CreateVariantPayload,
  type ItemDetailRecord,
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
  bundlePriceStr: string;
  imageKey: string;
  categoryId: string;
};

const EMPTY_EDIT_DRAFT: ProductEditDraft = {
  bundlePriceStr: "",
  imageKey: "",
  active: true,
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
};

const EMPTY_VARIANT: VariantDraft = {
  sku: "",
  variantName: "",
  name: "",
  barcode: "",
};

export default function ProductsPage() {
  const { me } = useDashboard();
  const canLinkSupplier = hasPermission(me?.permissions, Permission.CatalogItemsLinkSuppliers);
  const canListSuppliers = hasPermission(me?.permissions, Permission.SuppliersRead);

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
  const [variantDraft, setVariantDraft] = useState<VariantDraft>(EMPTY_VARIANT);
  const [message, setMessage] = useState("");

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
    const body: CreateVariantPayload = {
      sku: variantDraft.sku,
      variantName: variantDraft.variantName,
      name: variantDraft.name || undefined,
      barcode: variantDraft.barcode || undefined,
    };
    try {
      await createItemVariant(selectedId, body);
      setVariantDraft(EMPTY_VARIANT);
      const next = await fetchItemById(selectedId);
      setDetail(next);
      try {
        setSupplierLinks(await fetchItemSupplierLinks(selectedId));
      } catch {
        setSupplierLinks([]);
      }
      await loadTypesAndItems();
      setMessage("Variant created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Variant create failed.");
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
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted/40 ${
                        selectedId === row.id ? "bg-muted/50" : ""
                      }`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <span className="font-medium">{row.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.sku}
                        {row.barcode ? ` · ${row.barcode}` : ""}
                      </span>
                      {categoryLabel ? (
                        <span className="text-xs text-muted-foreground">{categoryLabel}</span>
                      ) : null}
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
              {(sortedImages.length > 0 || detail.imageKey) && (
                <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 p-3 text-xs">
                  <p className="font-medium text-foreground">Images</p>
                  {detail.imageKey ? (
                    <p className="mt-1 text-muted-foreground">
                      Cover key: <span className="font-mono break-all">{detail.imageKey}</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">No cover image key set.</p>
                  )}
                  {sortedImages.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {sortedImages.map((img) => (
                        <li key={img.id} className="font-mono text-[11px] break-all">
                          #{img.sortOrder} {img.s3Key}
                          {img.width && img.height ? ` (${img.width}×${img.height})` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-muted-foreground">No gallery rows (POST register image API).</p>
                  )}
                </div>
              )}
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
                  <span>Image key (S3 key / cover)</span>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono text-foreground"
                    placeholder="Optional — clear field and save to unset"
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
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">Save changes</Button>
                  <Button type="button" variant="destructive" onClick={onDeleteItem}>
                    Delete
                  </Button>
                </div>
              </form>

              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                  Variants
                </h4>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1 pr-2">Name</th>
                        <th className="py-1 pr-2">Variant</th>
                        <th className="py-1 pr-2">SKU</th>
                        <th className="py-1">Barcode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variantRows.map((v) => (
                        <tr key={v.id} className="border-b border-muted/50">
                          <td className="py-1 pr-2">{v.name}</td>
                          <td className="py-1 pr-2">{v.variantName ?? "—"}</td>
                          <td className="py-1 pr-2">{v.sku}</td>
                          <td className="py-1">{v.barcode ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <form className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={onAddVariant}>
                  <input
                    className="rounded border bg-background px-2 py-1 text-xs"
                    placeholder="Variant SKU *"
                    value={variantDraft.sku}
                    onChange={(event) =>
                      setVariantDraft((previous) => ({
                        ...previous,
                        sku: event.target.value,
                      }))
                    }
                    required
                    aria-label="Variant SKU"
                  />
                  <input
                    className="rounded border bg-background px-2 py-1 text-xs"
                    placeholder="Variant label *"
                    value={variantDraft.variantName}
                    onChange={(event) =>
                      setVariantDraft((previous) => ({
                        ...previous,
                        variantName: event.target.value,
                      }))
                    }
                    required
                    aria-label="Variant name label"
                  />
                  <input
                    className="rounded border bg-background px-2 py-1 text-xs"
                    placeholder="Display name (optional)"
                    value={variantDraft.name}
                    onChange={(event) =>
                      setVariantDraft((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                    aria-label="Variant display name"
                  />
                  <input
                    className="rounded border bg-background px-2 py-1 text-xs"
                    placeholder="Barcode (optional)"
                    value={variantDraft.barcode}
                    onChange={(event) =>
                      setVariantDraft((previous) => ({
                        ...previous,
                        barcode: event.target.value,
                      }))
                    }
                    aria-label="Variant barcode"
                  />
                  <Button className="md:col-span-2 w-fit" size="sm" type="submit">
                    Add variant
                  </Button>
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
