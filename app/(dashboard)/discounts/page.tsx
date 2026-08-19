// NOTE: This is a minimal "both_small" implementation for V1:
// - Product picker + preview only for Products (ITEM scope)
// - Other scopes are temporarily disabled in the UI.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MinusCircle, Plus, Search, Tag } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  createDiscount,
  fetchDiscounts,
  fetchCategories,
  fetchItems,
  fetchSuppliers,
  pauseDiscount,
  previewDiscount,
  publishDiscount,
  resumeDiscount,
  type CreateDiscountPayload,
  type DiscountPreviewResponse,
  type DiscountRecord,
  type CategoryRecord,
  type SupplierRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import { formatDisplayPrice } from "@/lib/money";
import { Permission } from "@/lib/permissions";

const DISCOUNT_METHOD_PERCENT = "PERCENTAGE";
const DISCOUNT_METHOD_FIXED = "FIXED_AMOUNT";
const DISCOUNT_SCOPE_ITEM = "ITEM";
const DISCOUNT_SCOPE_CATEGORY = "CATEGORY";
const DISCOUNT_SCOPE_SUPPLIER = "SUPPLIER";
const DISCOUNT_SCOPE_STORE = "STORE";

function statusTone(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "text-emerald-700 bg-emerald-50";
    case "SCHEDULED":
      return "text-sky-700 bg-sky-50";
    case "PAUSED":
      return "text-amber-700 bg-amber-50";
    case "EXPIRED":
      return "text-muted-foreground bg-muted";
    default:
      return "text-muted-foreground bg-muted";
  }
}

function toNumber(v: number | string): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatMethod(d: DiscountRecord, currency: string): string {
  if (d.method === DISCOUNT_METHOD_PERCENT) {
    return `${d.value}%`;
  }
  return formatDisplayPrice(currency, toNumber(d.value));
}

function formatPeriod(d: DiscountRecord): string {
  const start = new Date(d.startAt).toLocaleDateString();
  if (!d.endAt) {
    return `${start} · Ongoing`;
  }
  return `${start} – ${new Date(d.endAt).toLocaleDateString()}`;
}

export default function DiscountsPage() {
  const { me, business, canManageDiscounts, branchId } = useDashboard();
  const currency = business?.currency ?? "KES";

  const [rows, setRows] = useState<DiscountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create drawer state
  const [name, setName] = useState("");
  const [scope, setScope] = useState<string>(DISCOUNT_SCOPE_ITEM);
  const [method, setMethod] = useState<string>(DISCOUNT_METHOD_PERCENT);
  const [value, setValue] = useState("10");
  const [selectedItemsById, setSelectedItemsById] = useState<Record<string, ItemSummaryRecord>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const [selectedCategoriesById, setSelectedCategoriesById] = useState<Record<string, CategoryRecord>>({});
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [selectedSuppliersById, setSelectedSuppliersById] = useState<Record<string, SupplierRecord>>({});
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [includeAnyLinkedSupplier, setIncludeAnyLinkedSupplier] = useState(false);

  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [categoriesBusy, setCategoriesBusy] = useState(false);
  const [categorySearchQ, setCategorySearchQ] = useState("");

  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [suppliersBusy, setSuppliersBusy] = useState(false);
  const [supplierSearchQ, setSupplierSearchQ] = useState("");

  // Exclusions (only shown for CATEGORY / SUPPLIER / STORE scopes)
  const [excludedItemsById, setExcludedItemsById] = useState<
    Record<string, ItemSummaryRecord>
  >({});
  const [excludedItemIds, setExcludedItemIds] = useState<string[]>([]);
  const [excludedSearchQ, setExcludedSearchQ] = useState("");
  const [excludedSearchBusy, setExcludedSearchBusy] = useState(false);
  const [excludedSearchResults, setExcludedSearchResults] = useState<
    ItemSummaryRecord[]
  >([]);

  const [startAt, setStartAt] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [endAt, setEndAt] = useState("");

  const [searchQ, setSearchQ] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchResults, setSearchResults] = useState<ItemSummaryRecord[]>([]);

  const [previewBusy, setPreviewBusy] = useState(false);
  const [preview, setPreview] = useState<DiscountPreviewResponse | null>(null);

  const allowed = useMemo(
    () => canManageDiscounts || Boolean(me?.permissions?.includes(Permission.PricingDiscountsManage)),
    [canManageDiscounts, me?.permissions],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchDiscounts());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load discounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) {
      void load();
    }
  }, [allowed, load]);

  // Search for items when scope=ITEM
  useEffect(() => {
    if (!drawerOpen || scope !== DISCOUNT_SCOPE_ITEM) return;
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    let alive = true;
    setSearchBusy(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetchItems(q);
        if (!alive) return;
        setSearchResults(res.slice(0, 10));
      } catch {
        // ignore
      } finally {
        if (alive) setSearchBusy(false);
      }
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [drawerOpen, scope, searchQ]);

  useEffect(() => {
    if (!drawerOpen || scope !== DISCOUNT_SCOPE_CATEGORY) return;
    if (categoriesBusy) return;
    if (categories.length > 0) return;
    setCategoriesBusy(true);
    void fetchCategories()
      .then((list) => setCategories(list.filter((c) => c.active)))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesBusy(false));
  }, [drawerOpen, scope, categoriesBusy, categories.length]);

  useEffect(() => {
    if (!drawerOpen || scope !== DISCOUNT_SCOPE_SUPPLIER) return;
    if (suppliersBusy) return;
    if (suppliers.length > 0) return;
    setSuppliersBusy(true);
    void fetchSuppliers()
      .then((list) => setSuppliers(list.filter((s) => s.status === "ACTIVE")))
      .catch(() => setSuppliers([]))
      .finally(() => setSuppliersBusy(false));
  }, [drawerOpen, scope, suppliersBusy, suppliers.length]);

  // Excluded item picker (admin-side, simple search)
  useEffect(() => {
    const canPickExcluded = drawerOpen && scope !== DISCOUNT_SCOPE_ITEM;
    if (!canPickExcluded) {
      setExcludedSearchResults([]);
      return;
    }

    const q = excludedSearchQ.trim();
    if (q.length < 2) {
      setExcludedSearchResults([]);
      return;
    }

    let alive = true;
    setExcludedSearchBusy(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetchItems(q);
        if (!alive) return;
        setExcludedSearchResults(res.slice(0, 10));
      } catch {
        // ignore
      } finally {
        if (alive) setExcludedSearchBusy(false);
      }
    }, 250);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [drawerOpen, scope, excludedSearchQ]);

  useEffect(() => {
    if (!drawerOpen) return;
    if (scope !== DISCOUNT_SCOPE_ITEM) return;
    setExcludedItemsById({});
    setExcludedItemIds([]);
    setExcludedSearchQ("");
    setExcludedSearchResults([]);
    setPreview(null);
  }, [drawerOpen, scope]);

  useEffect(() => {
    if (!drawerOpen) return;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setPreview(null);
      return;
    }

    if (scope === DISCOUNT_SCOPE_ITEM && selectedItemIds.length === 0) {
      setPreview(null);
      return;
    }
    if (scope === DISCOUNT_SCOPE_CATEGORY && selectedCategoryIds.length === 0) {
      setPreview(null);
      return;
    }
    if (scope === DISCOUNT_SCOPE_SUPPLIER && selectedSupplierIds.length === 0) {
      setPreview(null);
      return;
    }

    let alive = true;
    setPreviewBusy(true);
    setError(null);
    const payload = {
      method,
      value: numeric,
      scope,
      branchId: branchId || null,
      startAt: new Date(startAt).toISOString(),
      endAt: endAt ? new Date(endAt).toISOString() : null,
      itemIds: scope === DISCOUNT_SCOPE_ITEM ? selectedItemIds : [],
      categoryIds: scope === DISCOUNT_SCOPE_CATEGORY ? selectedCategoryIds : [],
      supplierIds: scope === DISCOUNT_SCOPE_SUPPLIER ? selectedSupplierIds : [],
      includeAnyLinkedSupplier:
        scope === DISCOUNT_SCOPE_SUPPLIER ? includeAnyLinkedSupplier : false,
      excludedItemIds,
    };
    void previewDiscount(payload)
      .then((p) => {
        if (!alive) return;
        setPreview(p);
      })
      .catch((e) => {
        if (!alive) return;
        setPreview(null);
        setError(e instanceof Error ? e.message : "Preview failed");
      })
      .finally(() => {
        if (!alive) return;
        setPreviewBusy(false);
      });

    return () => {
      alive = false;
    };
  }, [
    drawerOpen,
    scope,
    selectedItemIds,
    selectedCategoryIds,
    selectedSupplierIds,
    includeAnyLinkedSupplier,
    excludedItemIds,
    method,
    value,
    startAt,
    endAt,
    branchId,
  ]);

  async function handleCreate(publish: boolean) {
    setSaving(true);
    setError(null);
    try {
      const payload: CreateDiscountPayload = {
        name: name.trim(),
        method,
        value: Number(value),
        scope,
        branchId: branchId || null,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : null,
        itemIds: scope === DISCOUNT_SCOPE_ITEM ? selectedItemIds : [],
        categoryIds: scope === DISCOUNT_SCOPE_CATEGORY ? selectedCategoryIds : [],
        supplierIds: scope === DISCOUNT_SCOPE_SUPPLIER ? selectedSupplierIds : [],
        includeAnyLinkedSupplier:
          scope === DISCOUNT_SCOPE_SUPPLIER ? includeAnyLinkedSupplier : false,
        excludedItemIds,
        publish,
      };
      const created = await createDiscount(payload);
      if (publish && !created.publishedAt) {
        await publishDiscount(created.id);
      }

      setDrawerOpen(false);
      setName("");
      setSelectedItemsById({});
      setSelectedItemIds([]);
      setSelectedCategoriesById({});
      setSelectedCategoryIds([]);
      setSelectedSuppliersById({});
      setSelectedSupplierIds([]);
      setIncludeAnyLinkedSupplier(false);
      setSearchResults([]);
      setSearchQ("");
      setCategorySearchQ("");
      setSupplierSearchQ("");
      setExcludedItemsById({});
      setExcludedItemIds([]);
      setExcludedSearchQ("");
      setExcludedSearchResults([]);
      setPreview(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save discount");
    } finally {
      setSaving(false);
    }
  }

  async function togglePause(row: DiscountRecord) {
    try {
      if (row.paused) {
        await resumeDiscount(row.id);
      } else {
        await pauseDiscount(row.id);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  }

  function removeSelectedId(id: string) {
    setSelectedItemsById((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    setSelectedItemIds((prev) => prev.filter((x) => x !== id));
  }

  function toggleSelected(item: ItemSummaryRecord) {
    setSelectedItemIds((prev) => {
      const exists = prev.includes(item.id);
      if (exists) {
        setSelectedItemsById((p) => {
          const { [item.id]: _removed, ...rest } = p;
          return rest;
        });
        return prev.filter((x) => x !== item.id);
      }
      setSelectedItemsById((p) => ({ ...p, [item.id]: item }));
      return [...prev, item.id];
    });
  }

  function removeSelectedCategoryId(id: string) {
    setSelectedCategoriesById((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    setSelectedCategoryIds((prev) => prev.filter((x) => x !== id));
  }

  function toggleCategorySelected(cat: CategoryRecord) {
    setSelectedCategoryIds((prev) => {
      const exists = prev.includes(cat.id);
      if (exists) {
        setSelectedCategoriesById((p) => {
          const { [cat.id]: _removed, ...rest } = p;
          return rest;
        });
        return prev.filter((x) => x !== cat.id);
      }
      setSelectedCategoriesById((p) => ({ ...p, [cat.id]: cat }));
      return [...prev, cat.id];
    });
  }

  function removeSelectedSupplierId(id: string) {
    setSelectedSuppliersById((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    setSelectedSupplierIds((prev) => prev.filter((x) => x !== id));
  }

  function toggleSupplierSelected(supplier: SupplierRecord) {
    setSelectedSupplierIds((prev) => {
      const exists = prev.includes(supplier.id);
      if (exists) {
        setSelectedSuppliersById((p) => {
          const { [supplier.id]: _removed, ...rest } = p;
          return rest;
        });
        return prev.filter((x) => x !== supplier.id);
      }
      setSelectedSuppliersById((p) => ({
        ...p,
        [supplier.id]: supplier,
      }));
      return [...prev, supplier.id];
    });
  }

  function removeExcludedId(id: string) {
    setExcludedItemsById((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    setExcludedItemIds((prev) => prev.filter((x) => x !== id));
  }

  function toggleExcludedSelected(item: ItemSummaryRecord) {
    setExcludedItemIds((prev) => {
      const exists = prev.includes(item.id);
      if (exists) {
        setExcludedItemsById((p) => {
          const { [item.id]: _removed, ...rest } = p;
          return rest;
        });
        return prev.filter((x) => x !== item.id);
      }
      setExcludedItemsById((p) => ({ ...p, [item.id]: item }));
      return [...prev, item.id];
    });
  }

  if (!allowed) {
    return <DashboardAccessDenied title="Access denied" description="You don't have permission to manage discounts." />;
  }

  const targetCount =
    scope === DISCOUNT_SCOPE_ITEM
      ? selectedItemIds.length
      : scope === DISCOUNT_SCOPE_CATEGORY
        ? selectedCategoryIds.length
        : scope === DISCOUNT_SCOPE_SUPPLIER
          ? selectedSupplierIds.length
          : 0;

  const targetsReady = scope === DISCOUNT_SCOPE_STORE || targetCount > 0;

  const filteredCategories = useMemo(() => {
    const q = categorySearchQ.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return categories
      .filter((c) => `${c.name} ${c.id}`.toLowerCase().includes(q))
      .slice(0, 10);
  }, [categories, categorySearchQ]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearchQ.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return suppliers
      .filter((s) => `${s.name} ${s.id}`.toLowerCase().includes(q))
      .slice(0, 10);
  }, [suppliers, supplierSearchQ]);

  return (
    <div className={`mx-auto w-full ${DASHBOARD_MAX_WIDE} space-y-6 px-4 py-6`}>
      <DashboardPageHero
        title="Discounts"
        description="Time-bound promotions on shelf prices — without changing your regular prices."
        icon={Tag}
      >
        <Button type="button" onClick={() => setDrawerOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create discount
        </Button>
      </DashboardPageHero>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Discount</th>
              <th className="px-4 py-3 font-medium">Applies to</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No discounts yet. Create your first promotion.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 capitalize">{row.scope.toLowerCase()}</td>
                  <td className="px-4 py-3">
                    {formatMethod(row, currency)}
                  </td>
                  <td className="px-4 py-3">{formatPeriod(row)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(row.status)}`}
                    >
                      {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.publishedAt && row.status !== "EXPIRED" && row.status !== "DRAFT" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void togglePause(row)}
                      >
                        {row.paused ? "Resume" : "Pause"}
                      </Button>
                    ) : row.status === "DRAFT" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void publishDiscount(row.id).then(load)}
                      >
                        Publish
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Create discount"
        description="Minimal V1: product/category/supplier picker + preview."
      >
        <FormDrawerFields>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Name</span>
            <input
              className="rounded-md border bg-background px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekend Grocery Sale"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Applies to</span>
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value={DISCOUNT_SCOPE_ITEM}>Products</option>
              <option value={DISCOUNT_SCOPE_CATEGORY}>Category</option>
              <option value={DISCOUNT_SCOPE_SUPPLIER}>Supplier</option>
              <option value={DISCOUNT_SCOPE_STORE}>Entire store</option>
            </select>
            <p className="text-[12px] text-muted-foreground">
              Store scope applies to all eligible items; use exclusions below to narrow it.
            </p>
          </label>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">
                {scope === DISCOUNT_SCOPE_ITEM
                  ? "Select products"
                  : scope === DISCOUNT_SCOPE_CATEGORY
                    ? "Select categories"
                    : scope === DISCOUNT_SCOPE_SUPPLIER
                      ? "Select suppliers"
                      : "Select targets"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (scope === DISCOUNT_SCOPE_ITEM) {
                    setSelectedItemIds([]);
                    setSelectedItemsById({});
                    setSearchResults([]);
                    setSearchQ("");
                  }
                  if (scope === DISCOUNT_SCOPE_CATEGORY) {
                    setSelectedCategoryIds([]);
                    setSelectedCategoriesById({});
                    setCategorySearchQ("");
                  }
                  if (scope === DISCOUNT_SCOPE_SUPPLIER) {
                    setSelectedSupplierIds([]);
                    setSelectedSuppliersById({});
                    setSupplierSearchQ("");
                    setIncludeAnyLinkedSupplier(false);
                  }
                  setPreview(null);
                }}
                disabled={targetCount === 0}
              >
                Clear
              </Button>
            </div>

            {scope === DISCOUNT_SCOPE_ITEM ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
                <input
                  className="w-full rounded-md border bg-background py-2 pl-8 pr-2"
                  value={searchQ}
                  placeholder="Search by name, SKU, barcode"
                  onChange={(e) => setSearchQ(e.target.value)}
                />
              </div>
            </div>
            ) : null}

            {scope === DISCOUNT_SCOPE_ITEM ? (searchBusy ? (
              <p className="text-[12px] text-muted-foreground">Searching…</p>
            ) : searchResults.length > 0 ? (
              <div className="max-h-52 overflow-auto rounded-md border bg-muted/10 p-2">
                {searchResults.map((it) => {
                  const checked = selectedItemIds.includes(it.id);
                  return (
                    <label
                      key={it.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/30"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelected(it)}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{it.name}</div>
                        <div className="truncate text-[12px] text-muted-foreground">
                          {it.sku ?? it.id}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                {searchQ.trim().length < 2 ? "Type at least 2 characters to search." : "No results."}
              </p>
            )) : null}

            {scope === DISCOUNT_SCOPE_ITEM ? (selectedItemIds.length > 0 ? (
              <div className="mt-2 rounded-md border bg-background p-2">
                <div className="mb-2 text-[12px] font-semibold text-muted-foreground">
                  Selected: {selectedItemIds.length}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedItemIds.slice(0, 8).map((id) => {
                    const it = selectedItemsById[id];
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-1 rounded-full border bg-muted/10 px-2 py-1 text-[12px] font-medium"
                      >
                        <span className="max-w-36 truncate">{it?.name ?? id}</span>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                          onClick={() => removeSelectedId(id)}
                          aria-label="Remove selected item"
                        >
                          <MinusCircle className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                  {selectedItemIds.length > 8 ? (
                    <div className="rounded-full border bg-muted/10 px-2 py-1 text-[12px] font-medium text-muted-foreground">
                      +{selectedItemIds.length - 8} more
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null) : null}

            {scope === DISCOUNT_SCOPE_CATEGORY ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
                    <input
                      className="w-full rounded-md border bg-background py-2 pl-8 pr-2"
                      value={categorySearchQ}
                      placeholder="Search by category name"
                      onChange={(e) => setCategorySearchQ(e.target.value)}
                    />
                  </div>
                </div>

                {categoriesBusy ? (
                  <p className="text-[12px] text-muted-foreground">Loading…</p>
                ) : filteredCategories.length > 0 ? (
                  <div className="max-h-52 overflow-auto rounded-md border bg-muted/10 p-2">
                    {filteredCategories.map((c) => {
                      const checked = selectedCategoryIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/30"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCategorySelected(c)}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {c.name}
                            </div>
                            <div className="truncate text-[12px] text-muted-foreground">
                              {c.id}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    {categorySearchQ.trim().length < 2
                      ? "Type at least 2 characters to search."
                      : "No results."}
                  </p>
                )}

                {selectedCategoryIds.length > 0 ? (
                  <div className="mt-2 rounded-md border bg-background p-2">
                    <div className="mb-2 text-[12px] font-semibold text-muted-foreground">
                      Selected: {selectedCategoryIds.length}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCategoryIds.slice(0, 8).map((id) => {
                        const c = selectedCategoriesById[id];
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-1 rounded-full border bg-muted/10 px-2 py-1 text-[12px] font-medium"
                          >
                            <span className="max-w-36 truncate">
                              {c?.name ?? id}
                            </span>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                              onClick={() => removeSelectedCategoryId(id)}
                              aria-label="Remove selected category"
                            >
                              <MinusCircle className="size-3" />
                            </button>
                          </div>
                        );
                      })}
                      {selectedCategoryIds.length > 8 ? (
                        <div className="rounded-full border bg-muted/10 px-2 py-1 text-[12px] font-medium text-muted-foreground">
                          +{selectedCategoryIds.length - 8} more
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {scope === DISCOUNT_SCOPE_SUPPLIER ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
                    <input
                      className="w-full rounded-md border bg-background py-2 pl-8 pr-2"
                      value={supplierSearchQ}
                      placeholder="Search by supplier name"
                      onChange={(e) => setSupplierSearchQ(e.target.value)}
                    />
                  </div>
                </div>

                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeAnyLinkedSupplier}
                    onChange={(e) => setIncludeAnyLinkedSupplier(e.target.checked)}
                  />
                  <span className="text-muted-foreground">
                    Apply to any linked supplier products
                    {includeAnyLinkedSupplier ? "" : " (primary only)"}
                  </span>
                </label>

                {suppliersBusy ? (
                  <p className="mt-2 text-[12px] text-muted-foreground">Loading…</p>
                ) : filteredSuppliers.length > 0 ? (
                  <div className="max-h-52 overflow-auto rounded-md border bg-muted/10 p-2">
                    {filteredSuppliers.map((s) => {
                      const checked = selectedSupplierIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/30"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSupplierSelected(s)}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {s.name}
                            </div>
                            <div className="truncate text-[12px] text-muted-foreground">
                              {s.id}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    {supplierSearchQ.trim().length < 2
                      ? "Type at least 2 characters to search."
                      : "No results."}
                  </p>
                )}

                {selectedSupplierIds.length > 0 ? (
                  <div className="mt-2 rounded-md border bg-background p-2">
                    <div className="mb-2 text-[12px] font-semibold text-muted-foreground">
                      Selected: {selectedSupplierIds.length}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedSupplierIds.slice(0, 8).map((id) => {
                        const s = selectedSuppliersById[id];
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-1 rounded-full border bg-muted/10 px-2 py-1 text-[12px] font-medium"
                          >
                            <span className="max-w-36 truncate">
                              {s?.name ?? id}
                            </span>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                              onClick={() => removeSelectedSupplierId(id)}
                              aria-label="Remove selected supplier"
                            >
                              <MinusCircle className="size-3" />
                            </button>
                          </div>
                        );
                      })}
                      {selectedSupplierIds.length > 8 ? (
                        <div className="rounded-full border bg-muted/10 px-2 py-1 text-[12px] font-medium text-muted-foreground">
                          +{selectedSupplierIds.length - 8} more
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          {scope !== DISCOUNT_SCOPE_ITEM ? (
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Exclusions (optional)</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setExcludedItemsById({});
                    setExcludedItemIds([]);
                    setExcludedSearchQ("");
                    setExcludedSearchResults([]);
                    setPreview(null);
                  }}
                  disabled={excludedItemIds.length === 0}
                >
                  Clear
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
                  <input
                    className="w-full rounded-md border bg-background py-2 pl-8 pr-2"
                    value={excludedSearchQ}
                    placeholder="Search items to exclude"
                    onChange={(e) => setExcludedSearchQ(e.target.value)}
                  />
                </div>
              </div>

              {excludedSearchBusy ? (
                <p className="text-[12px] text-muted-foreground">
                  Searching…
                </p>
              ) : excludedSearchResults.length > 0 ? (
                <div className="max-h-52 overflow-auto rounded-md border bg-muted/10 p-2">
                  {excludedSearchResults.map((it) => {
                    const checked = excludedItemIds.includes(it.id);
                    return (
                      <label
                        key={it.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/30"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleExcludedSelected(it)}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {it.name}
                          </div>
                          <div className="truncate text-[12px] text-muted-foreground">
                            {it.sku ?? it.id}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  {excludedSearchQ.trim().length < 2
                    ? "Type at least 2 characters to search."
                    : "No results."}
                </p>
              )}

              {excludedItemIds.length > 0 ? (
                <div className="mt-2 rounded-md border bg-background p-2">
                  <div className="mb-2 text-[12px] font-semibold text-muted-foreground">
                    Excluded: {excludedItemIds.length}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {excludedItemIds.slice(0, 8).map((id) => {
                      const it = excludedItemsById[id];
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-1 rounded-full border bg-muted/10 px-2 py-1 text-[12px] font-medium"
                        >
                          <span className="max-w-36 truncate">
                            {it?.name ?? id}
                          </span>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                            onClick={() => removeExcludedId(id)}
                            aria-label="Remove excluded item"
                          >
                            <MinusCircle className="size-3" />
                          </button>
                        </div>
                      );
                    })}
                    {excludedItemIds.length > 8 ? (
                      <div className="rounded-full border bg-muted/10 px-2 py-1 text-[12px] font-medium text-muted-foreground">
                        +{excludedItemIds.length - 8} more
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Method</span>
              <select
                className="rounded-md border bg-background px-3 py-2"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value={DISCOUNT_METHOD_PERCENT}>Percentage</option>
                <option value={DISCOUNT_METHOD_FIXED}>Fixed amount</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Value</span>
              <input
                type="number"
                min="0"
                step="any"
                className="rounded-md border bg-background px-3 py-2"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Start</span>
              <input
                type="datetime-local"
                className="rounded-md border bg-background px-3 py-2"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">End (optional)</span>
              <input
                type="datetime-local"
                className="rounded-md border bg-background px-3 py-2"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-3 rounded-lg border bg-muted/10 p-3">
            <div className="mb-2 text-sm font-semibold">Preview</div>
            {previewBusy ? (
              <p className="text-[12px] text-muted-foreground">Calculating…</p>
            ) : preview ? (
              <>
                <p className="text-[12px] text-muted-foreground">
                  {preview.affectedCount} items will be affected
                </p>
                {preview.errors.length > 0 ? (
                  <div className="mt-2 text-[12px] text-destructive">
                    {preview.errors.slice(0, 3).map((e) => (
                      <div key={e}>• {e}</div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 space-y-1">
                    {preview.sample.slice(0, 6).map((line) => (
                      <div key={line.itemId} className="text-[12px]">
                        <div className="font-medium">{line.itemName}</div>
                        <div className="text-muted-foreground">
                          {formatDisplayPrice(currency, toNumber(line.regularPrice ?? 0))} →
                          {" "}
                          {formatDisplayPrice(currency, toNumber(line.finalPrice ?? 0))}{" "}
                          {line.savedAmount && toNumber(line.savedAmount) > 0 ? (
                            <span className="font-semibold text-emerald-700">
                              (Save {formatDisplayPrice(currency, toNumber(line.savedAmount))})
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Select targets, set method/value, and preview will appear here.
              </p>
            )}
          </div>
        </FormDrawerFields>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={saving || !name.trim() || !targetsReady}
            onClick={() => void handleCreate(false)}
          >
            Save draft
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={saving || !name.trim() || !targetsReady}
            onClick={() => void handleCreate(true)}
          >
            Publish
          </Button>
        </div>
      </FormDrawer>
    </div>
  );
}
