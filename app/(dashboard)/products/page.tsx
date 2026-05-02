"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  createItem,
  createItemVariant,
  deleteItem,
  fetchItemById,
  fetchItemTypes,
  fetchItems,
  patchItem,
  type CreateVariantPayload,
  type ItemDetailRecord,
  type ItemSummaryRecord,
  type ItemTypeRecord,
  type PatchItemPayload,
} from "@/lib/api";

type ParentDraft = {
  name: string;
  sku: string;
  barcode: string;
  itemTypeId: string;
};

const EMPTY_PARENT: ParentDraft = {
  name: "",
  sku: "",
  barcode: "",
  itemTypeId: "",
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
  const [itemTypes, setItemTypes] = useState<ItemTypeRecord[]>([]);
  const [items, setItems] = useState<ItemSummaryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [parentDraft, setParentDraft] = useState<ParentDraft>(EMPTY_PARENT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItemDetailRecord | null>(null);
  const [patchDraft, setPatchDraft] = useState<PatchItemPayload>({});
  const [variantDraft, setVariantDraft] = useState<VariantDraft>(EMPTY_VARIANT);
  const [message, setMessage] = useState("");

  const loadTypesAndItems = useCallback(async () => {
    const [types, rows] = await Promise.all([
      fetchItemTypes(),
      fetchItems(search.trim() || undefined),
    ]);
    setItemTypes(types);
    setItems(rows);
  }, [search]);

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
      return;
    }
    fetchItemById(selectedId)
      .then((row) => {
        setDetail(row);
        setPatchDraft({
          name: row.name,
          barcode: row.barcode,
          description: row.description,
          active: row.active,
        });
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "Failed to load item."),
      );
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
    try {
      await createItem({
        name: parentDraft.name,
        sku: parentDraft.sku,
        itemTypeId: parentDraft.itemTypeId,
        barcode: parentDraft.barcode || undefined,
      });
      setParentDraft((previous) => ({
        ...EMPTY_PARENT,
        itemTypeId: previous.itemTypeId,
      }));
      await loadTypesAndItems();
      setMessage("Product created.");
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
    try {
      await patchItem(selectedId, patchDraft);
      await loadTypesAndItems();
      const next = await fetchItemById(selectedId);
      setDetail(next);
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

  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-xl font-semibold">Products</h2>
        <p className="text-sm text-muted-foreground">
          Parent items, variants, search, update, and soft-delete (scaffold).
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
              .map((row) => (
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
                  </button>
                </li>
              ))}
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
