"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  createCategory,
  deleteCategoryImage,
  deleteCategoryPriceRule,
  deleteCategorySupplierLink,
  fetchCategories,
  fetchCategoryImages,
  fetchCategoryPriceRules,
  fetchPriceRules,
  fetchSuppliers,
  fetchTaxRates,
  patchCategory,
  patchCategorySupplierLink,
  postCategoryPriceRule,
  postCategorySupplierLink,
  uploadCategoryImageToCloudinary,
  type CategoryLinkedPriceRuleRecord,
  type CategoryRecord,
  type ItemImageRecord,
  type PatchCategoryPayload,
  type PriceRuleRecord,
  type SupplierRecord,
  type TaxRateRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const ROOT_PARENT_VALUE = "";

type CreateDraft = {
  name: string;
  parentId: string;
  positionStr: string;
  icon: string;
  description: string;
  markupStr: string;
  taxRateId: string;
};

const EMPTY_CREATE: CreateDraft = {
  name: "",
  parentId: ROOT_PARENT_VALUE,
  positionStr: "",
  icon: "",
  description: "",
  markupStr: "",
  taxRateId: "",
};

type EditDraft = {
  name: string;
  slug: string;
  positionStr: string;
  active: boolean;
  icon: string;
  parentId: string;
};

function categoryCoverUrl(row: CategoryRecord): string | null {
  const thumb = row.thumbnailUrl?.trim();
  if (thumb) {
    return thumb;
  }
  const key = row.imageKey?.trim();
  if (key?.startsWith("http://") || key?.startsWith("https://")) {
    return key;
  }
  return null;
}

function sortCategories(list: CategoryRecord[]): CategoryRecord[] {
  return [...list].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

function parseWholeNumber(raw: string, emptyOk: boolean): { error?: string; value?: number } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return emptyOk ? {} : { error: "Position is required." };
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { error: "Use a whole number for position." };
  }
  return { value: n };
}

function parseOptionalMarkup(raw: string): { error?: string; value?: number } {
  const t = raw.trim();
  if (!t) {
    return {};
  }
  const n = Number(t);
  if (!Number.isFinite(n)) {
    return { error: "Markup must be a valid number." };
  }
  return { value: n };
}

function childrenByParentMap(rows: CategoryRecord[]): Map<string, CategoryRecord[]> {
  const m = new Map<string, CategoryRecord[]>();
  for (const r of rows) {
    const key = r.parentId ?? ROOT_PARENT_VALUE;
    const list = m.get(key) ?? [];
    list.push(r);
    m.set(key, list);
  }
  return m;
}

/** Includes `rootId` and all descendants (invalid choices when moving parent). */
function subtreeIncludingSelf(rootId: string, childrenMap: Map<string, CategoryRecord[]>): Set<string> {
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || out.has(id)) {
      continue;
    }
    out.add(id);
    const kids = childrenMap.get(id) ?? [];
    for (const ch of kids) {
      stack.push(ch.id);
    }
  }
  return out;
}

function depthByIdMap(rows: CategoryRecord[]): Map<string, number> {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const memo = new Map<string, number>();
  function depth(id: string, guard: number): number {
    if (guard > 64) {
      return 0;
    }
    const cached = memo.get(id);
    if (cached !== undefined) {
      return cached;
    }
    const parentId = byId.get(id)?.parentId;
    const val = parentId ? 1 + depth(parentId, guard + 1) : 0;
    memo.set(id, val);
    return val;
  }
  const out = new Map<string, number>();
  for (const r of rows) {
    out.set(r.id, depth(r.id, 0));
  }
  return out;
}

function stopActivateRow(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export default function CategoriesPage() {
  const { loading, canViewCategories, canManageCategories, canViewSuppliers } = useDashboard();
  const [rows, setRows] = useState<CategoryRecord[]>([]);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(EMPTY_CREATE);
  const [edits, setEdits] = useState<Record<string, EditDraft>>({});
  const [listBusy, setListBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; kind: "error" | "success" } | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryImages, setCategoryImages] = useState<ItemImageRecord[]>([]);
  const [detailBusy, setDetailBusy] = useState(false);
  const [supplierRows, setSupplierRows] = useState<SupplierRecord[]>([]);
  const [supplierPickId, setSupplierPickId] = useState("");
  const [taxRates, setTaxRates] = useState<TaxRateRecord[]>([]);
  const [priceRules, setPriceRules] = useState<PriceRuleRecord[]>([]);
  const [linkedRules, setLinkedRules] = useState<CategoryLinkedPriceRuleRecord[]>([]);
  const [commercialDraft, setCommercialDraft] = useState<{
    description: string;
    markupStr: string;
    taxRateId: string;
  } | null>(null);
  const [rulePickId, setRulePickId] = useState("");
  const [rulePrecStr, setRulePrecStr] = useState("");
  const [uploadAsCover, setUploadAsCover] = useState(true);

  const sorted = useMemo(() => sortCategories(rows), [rows]);

  const byId = useMemo(() => new Map(rows.map((c) => [c.id, c])), [rows]);

  const childrenMap = useMemo(() => childrenByParentMap(rows), [rows]);

  const depths = useMemo(() => depthByIdMap(rows), [rows]);

  const selectedCategory = selectedCategoryId ? byId.get(selectedCategoryId) : undefined;

  const load = useCallback(async () => {
    const list = await fetchCategories();
    setRows(list);
    const next: Record<string, EditDraft> = {};
    for (const c of list) {
      next[c.id] = {
        name: c.name,
        slug: c.slug,
        positionStr: String(c.position),
        active: c.active,
        icon: c.icon ?? "",
        parentId: c.parentId ?? ROOT_PARENT_VALUE,
      };
    }
    setEdits(next);
  }, []);

  const refresh = useCallback(async () => {
    setFeedback(null);
    setListBusy(true);
    try {
      await load();
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Failed to load categories.",
        kind: "error",
      });
    } finally {
      setListBusy(false);
    }
  }, [load]);

  useEffect(() => {
    if (loading || !canViewCategories) {
      return;
    }
    queueMicrotask(() => void refresh());
  }, [refresh, loading, canViewCategories]);

  useEffect(() => {
    if (!canManageCategories || !canViewSuppliers) {
      return;
    }
    fetchSuppliers()
      .then(setSupplierRows)
      .catch(() => setSupplierRows([]));
  }, [canManageCategories, canViewSuppliers]);

  useEffect(() => {
    if (!canManageCategories) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [rates, rules] = await Promise.all([fetchTaxRates(), fetchPriceRules()]);
        if (!cancelled) {
          setTaxRates(rates);
          setPriceRules(rules);
        }
      } catch {
        if (!cancelled) {
          setTaxRates([]);
          setPriceRules([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManageCategories]);

  useEffect(() => {
    if (!selectedCategoryId || !canViewCategories) {
      queueMicrotask(() => setCategoryImages([]));
      return;
    }
    let cancelled = false;
    fetchCategoryImages(selectedCategoryId)
      .then((imgs) => {
        if (!cancelled) {
          setCategoryImages(imgs);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategoryImages([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, canViewCategories]);

  useEffect(() => {
    if (!selectedCategory) {
      setCommercialDraft(null);
      setLinkedRules([]);
      setRulePickId("");
      setRulePrecStr("");
      return;
    }
    setCommercialDraft({
      description: selectedCategory.description ?? "",
      markupStr:
        selectedCategory.defaultMarkupPct != null && selectedCategory.defaultMarkupPct !== ""
          ? String(selectedCategory.defaultMarkupPct)
          : "",
      taxRateId: selectedCategory.defaultTaxRateId ?? "",
    });
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedCategoryId || !canManageCategories) {
      setLinkedRules([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchCategoryPriceRules(selectedCategoryId);
        if (!cancelled) {
          setLinkedRules(rows);
        }
      } catch {
        if (!cancelled) {
          setLinkedRules([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, canManageCategories]);

  const reloadImagesOnly = useCallback(async () => {
    if (!selectedCategoryId) {
      return;
    }
    try {
      setCategoryImages(await fetchCategoryImages(selectedCategoryId));
    } catch {
      setCategoryImages([]);
    }
  }, [selectedCategoryId]);

  const onSaveCommercialDefaults = async () => {
    if (!canManageCategories || !selectedCategory || !commercialDraft) {
      return;
    }
    setFeedback(null);
    const baseline = selectedCategory;
    const cd = commercialDraft;
    const body: PatchCategoryPayload = {};
    const dDesc = cd.description.trim();
    const bDesc = (baseline.description ?? "").trim();
    if (dDesc !== bDesc) {
      body.description = dDesc;
    }
    const mk = parseOptionalMarkup(cd.markupStr);
    if (mk.error) {
      setFeedback({ text: mk.error, kind: "error" });
      return;
    }
    const bMarkupRaw = baseline.defaultMarkupPct;
    const bMarkup =
      bMarkupRaw != null && String(bMarkupRaw).trim() !== "" ? Number(bMarkupRaw) : null;
    if (mk.value !== undefined) {
      if (bMarkup === null || !Number.isFinite(bMarkup) || bMarkup !== mk.value) {
        body.defaultMarkupPct = mk.value;
      }
    } else if (bMarkup !== null && Number.isFinite(bMarkup)) {
      body.clearDefaultMarkup = true;
    }
    const btax = (baseline.defaultTaxRateId ?? "").trim();
    const dtax = cd.taxRateId.trim();
    if (dtax !== btax) {
      if (!dtax) {
        body.clearDefaultTaxRate = true;
      } else {
        body.defaultTaxRateId = dtax;
      }
    }
    if (Object.keys(body).length === 0) {
      setFeedback({ text: "No changes to save.", kind: "error" });
      return;
    }
    setDetailBusy(true);
    try {
      await patchCategory(baseline.id, body);
      await refresh();
      setFeedback({ text: "Commercial defaults saved.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Could not save defaults.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onLinkPriceRule = async () => {
    if (!canManageCategories || !selectedCategoryId || !rulePickId.trim()) {
      return;
    }
    setFeedback(null);
    const precRaw = rulePrecStr.trim();
    let precedence: number | undefined;
    if (precRaw) {
      precedence = Number(precRaw);
      if (!Number.isFinite(precedence) || !Number.isInteger(precedence)) {
        setFeedback({ text: "Precedence must be a whole number.", kind: "error" });
        return;
      }
    }
    setDetailBusy(true);
    try {
      await postCategoryPriceRule(selectedCategoryId, {
        ruleId: rulePickId.trim(),
        ...(precedence !== undefined ? { precedence } : {}),
      });
      setRulePickId("");
      setRulePrecStr("");
      setLinkedRules(await fetchCategoryPriceRules(selectedCategoryId));
      setFeedback({ text: "Price rule linked.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Could not link rule.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onUnlinkPriceRule = async (ruleId: string) => {
    if (!canManageCategories || !selectedCategoryId) {
      return;
    }
    setFeedback(null);
    setDetailBusy(true);
    try {
      await deleteCategoryPriceRule(selectedCategoryId, ruleId);
      setLinkedRules(await fetchCategoryPriceRules(selectedCategoryId));
      setFeedback({ text: "Price rule removed.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Could not remove rule.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onSetSupplierPrimary = async (supplierId: string) => {
    if (!canManageCategories || !selectedCategoryId) {
      return;
    }
    setFeedback(null);
    setDetailBusy(true);
    try {
      await patchCategorySupplierLink(selectedCategoryId, supplierId, { primary: true });
      await refresh();
      setFeedback({ text: "Primary supplier updated.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Could not update primary supplier.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageCategories) {
      return;
    }
    setFeedback(null);
    const name = createDraft.name.trim();
    if (!name) {
      setFeedback({ text: "Name is required.", kind: "error" });
      return;
    }
    const pos = parseWholeNumber(createDraft.positionStr, true);
    if (pos.error) {
      setFeedback({ text: pos.error, kind: "error" });
      return;
    }
    const mk = parseOptionalMarkup(createDraft.markupStr);
    if (mk.error) {
      setFeedback({ text: mk.error, kind: "error" });
      return;
    }
    try {
      await createCategory({
        name,
        ...(createDraft.parentId.trim()
          ? { parentId: createDraft.parentId.trim() }
          : {}),
        ...(pos.value !== undefined ? { position: pos.value } : {}),
        ...(createDraft.icon.trim() ? { icon: createDraft.icon.trim() } : {}),
        ...(createDraft.description.trim() ? { description: createDraft.description.trim() } : {}),
        ...(mk.value !== undefined ? { defaultMarkupPct: mk.value } : {}),
        ...(createDraft.taxRateId.trim() ? { defaultTaxRateId: createDraft.taxRateId.trim() } : {}),
      });
      setCreateDraft(EMPTY_CREATE);
      await refresh();
      setFeedback({
        text: "Category created. Slug was generated automatically—you can customize it when editing.",
        kind: "success",
      });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Create failed.",
        kind: "error",
      });
    }
  };

  const onSaveRow = async (categoryId: string) => {
    if (!canManageCategories) {
      return;
    }
    setFeedback(null);
    const draft = edits[categoryId];
    const baseline = byId.get(categoryId);
    if (!draft?.name.trim()) {
      setFeedback({ text: "Name is required.", kind: "error" });
      return;
    }
    const pos = parseWholeNumber(draft.positionStr, false);
    if (pos.error || pos.value === undefined) {
      setFeedback({ text: pos.error ?? "Position is required.", kind: "error" });
      return;
    }
    if (!baseline) {
      return;
    }

    try {
      const body: Parameters<typeof patchCategory>[1] = {
        name: draft.name.trim(),
        active: draft.active,
        position: pos.value,
      };

      const nextSlug = draft.slug.trim().toLowerCase();
      if (nextSlug && nextSlug !== baseline.slug) {
        body.slug = draft.slug.trim();
      }

      const baselineIcon = (baseline.icon ?? "").trim();
      const draftIcon = draft.icon.trim();
      if (draftIcon !== baselineIcon) {
        body.icon = draftIcon;
      }

      const baselineParent = baseline.parentId ?? ROOT_PARENT_VALUE;
      const draftParent = draft.parentId.trim();
      if (draftParent !== baselineParent) {
        if (!draftParent && baselineParent) {
          body.root = true;
        } else if (draftParent) {
          body.parentId = draftParent;
        }
      }

      await patchCategory(categoryId, body);
      await refresh();
      setFeedback({ text: "Category updated.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Update failed.",
        kind: "error",
      });
    }
  };

  const onUploadCategoryImage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageCategories || !selectedCategoryId) {
      return;
    }
    const form = event.currentTarget;
    const input = form.elements.namedItem("category-image-file") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setFeedback({ text: "Choose an image file.", kind: "error" });
      return;
    }
    setFeedback(null);
    setDetailBusy(true);
    try {
      await uploadCategoryImageToCloudinary(selectedCategoryId, file, { primary: uploadAsCover });
      form.reset();
      await refresh();
      await reloadImagesOnly();
      setFeedback({ text: "Image uploaded.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Upload failed.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onDeleteCategoryImage = async (imageId: string) => {
    if (!canManageCategories || !selectedCategoryId) {
      return;
    }
    setFeedback(null);
    setDetailBusy(true);
    try {
      await deleteCategoryImage(selectedCategoryId, imageId);
      await refresh();
      await reloadImagesOnly();
      setFeedback({ text: "Image removed.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Remove failed.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onLinkSupplier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageCategories || !selectedCategoryId || !supplierPickId.trim()) {
      return;
    }
    setFeedback(null);
    setDetailBusy(true);
    try {
      await postCategorySupplierLink(selectedCategoryId, { supplierId: supplierPickId.trim() });
      setSupplierPickId("");
      await refresh();
      setFeedback({ text: "Supplier linked to category.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Link failed.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  const onUnlinkSupplier = async (supplierId: string) => {
    if (!canManageCategories || !selectedCategoryId) {
      return;
    }
    setFeedback(null);
    setDetailBusy(true);
    try {
      await deleteCategorySupplierLink(selectedCategoryId, supplierId);
      await refresh();
      setFeedback({ text: "Supplier unlinked.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Unlink failed.",
        kind: "error",
      });
    } finally {
      setDetailBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!canViewCategories) {
    return (
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Categories</h2>
        <p className="text-sm text-muted-foreground">
          You need <code className="text-xs">catalog.items.read</code> to view this page.
        </p>
      </section>
    );
  }

  const linkedSupplierIds = new Set(selectedCategory?.linkedSuppliers?.map((l) => l.supplierId) ?? []);
  const supplierChoices = supplierRows.filter((s) => !linkedSupplierIds.has(s.id));

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Categories</h2>
        <p className="text-sm text-muted-foreground">
          Organize products into a tree. Upload a <span className="font-medium text-foreground">cover image</span>{" "}
          for kiosk or storefront rails; link{" "}
          <span className="font-medium text-foreground">suppliers</span> who anchor this aisle (reporting and ops).
          Editing needs <code className="text-xs">catalog.categories.write</code>; linking suppliers also needs{" "}
          <code className="text-xs">suppliers.read</code> to pick them.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={listBusy} onClick={() => void refresh()}>
          {listBusy ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {feedback ? (
        <p
          className={
            feedback.kind === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"
          }
        >
          {feedback.text}
        </p>
      ) : null}

      {canManageCategories ? (
        <form
          onSubmit={(e) => void onCreate(e)}
          className="space-y-3 rounded-md border bg-muted/20 p-4"
        >
          <div>
            <h3 className="text-sm font-medium">New category</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Slug is generated from the name when you create; edit it in the table if you need a stable URL key.
              Add photos after saving—select the row below and use Images & suppliers.
            </p>
          </div>
          <div className="grid max-w-4xl gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs text-muted-foreground">Name</span>
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={createDraft.name}
                onChange={(e) => setCreateDraft((p) => ({ ...p, name: e.target.value }))}
                required
                aria-label="New category name"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Parent</span>
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={createDraft.parentId}
                onChange={(e) => setCreateDraft((p) => ({ ...p, parentId: e.target.value }))}
                aria-label="Parent category"
              >
                <option value={ROOT_PARENT_VALUE}>Top level</option>
                {sorted.map((c) => (
                  <option key={c.id} value={c.id}>
                    {"—".repeat(depths.get(c.id) ?? 0)} {c.name}
                    {!c.active ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Sort position (optional)</span>
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="0"
                inputMode="numeric"
                value={createDraft.positionStr}
                onChange={(e) => setCreateDraft((p) => ({ ...p, positionStr: e.target.value }))}
                aria-label="Sort position optional"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs text-muted-foreground">Icon (optional)</span>
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Emoji or icon key for kiosk displays"
                value={createDraft.icon}
                onChange={(e) => setCreateDraft((p) => ({ ...p, icon: e.target.value }))}
                aria-label="Icon optional"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs text-muted-foreground">Description (optional)</span>
              <textarea
                className="min-h-[4rem] rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Shown on kiosk rails or category drill-down where supported"
                value={createDraft.description}
                onChange={(e) => setCreateDraft((p) => ({ ...p, description: e.target.value }))}
                aria-label="Description optional"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Default markup % (optional)</span>
              <input
                className="rounded-md border bg-background px-3 py-2 text-sm tabular-nums"
                placeholder="e.g. 35"
                inputMode="decimal"
                value={createDraft.markupStr}
                onChange={(e) => setCreateDraft((p) => ({ ...p, markupStr: e.target.value }))}
                aria-label="Default markup optional"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Default tax rate (optional)</span>
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={createDraft.taxRateId}
                onChange={(e) => setCreateDraft((p) => ({ ...p, taxRateId: e.target.value }))}
                aria-label="Default tax optional"
              >
                <option value="">None</option>
                {taxRates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({String(t.ratePercent)}%){t.inclusive ? " incl." : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button type="submit">Create category</Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          You can view categories but not edit. Ask an admin for{" "}
          <code className="text-xs">catalog.categories.write</code>.
        </p>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-3 py-2">Cover</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Icon</th>
              <th className="px-3 py-2">Position</th>
              <th className="px-3 py-2">Parent</th>
              <th className="px-3 py-2">Suppliers</th>
              <th className="px-3 py-2">Active</th>
              {canManageCategories ? <th className="px-3 py-2 w-[5rem]" /> : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const draft = edits[row.id];
              const parentName = row.parentId ? byId.get(row.parentId)?.name ?? "—" : "Top level";
              const blockedParents = subtreeIncludingSelf(row.id, childrenMap);
              const indentPx = (depths.get(row.id) ?? 0) * 12;
              const cover = categoryCoverUrl(row);
              const supplierHint =
                row.linkedSuppliers?.length > 0
                  ? row.linkedSuppliers
                      .map((l) => `${l.supplierName}${l.primary ? " ★" : ""}`)
                      .join(", ")
                  : "—";

              return (
                <tr
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "cursor-pointer border-b border-muted/50 align-top hover:bg-accent/40",
                    selectedCategoryId === row.id && "bg-accent/25",
                  )}
                  onClick={() => setSelectedCategoryId(row.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedCategoryId(row.id);
                    }
                  }}
                >
                  <td className="px-3 py-2 align-middle">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
                      {cover ? (
                        <Image src={cover} alt="" fill className="object-cover" sizes="40px" unoptimized />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                          —
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2" onMouseDown={stopActivateRow}>
                    {canManageCategories && draft ? (
                      <input
                        className="w-full min-w-[10rem] rounded border bg-background px-2 py-1 text-sm"
                        style={{ marginLeft: indentPx }}
                        value={draft.name}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, name: e.target.value },
                          }))
                        }
                        aria-label={`Name ${row.name}`}
                      />
                    ) : (
                      <span className="block text-muted-foreground" style={{ paddingLeft: indentPx }}>
                        {row.name}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground" onMouseDown={stopActivateRow}>
                    {canManageCategories && draft ? (
                      <input
                        className="w-full min-w-[7rem] rounded border bg-background px-2 py-1 text-xs"
                        value={draft.slug}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, slug: e.target.value },
                          }))
                        }
                        aria-label={`Slug ${row.slug}`}
                      />
                    ) : (
                      row.slug
                    )}
                  </td>
                  <td className="px-3 py-2" onMouseDown={stopActivateRow}>
                    {canManageCategories && draft ? (
                      <input
                        className="w-full min-w-[5rem] rounded border bg-background px-2 py-1 text-sm"
                        value={draft.icon}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, icon: e.target.value },
                          }))
                        }
                        aria-label={`Icon ${row.name}`}
                      />
                    ) : (
                      <span className="text-muted-foreground">{row.icon?.trim() ? row.icon : "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2" onMouseDown={stopActivateRow}>
                    {canManageCategories && draft ? (
                      <input
                        className="w-16 rounded border bg-background px-2 py-1 text-sm tabular-nums"
                        inputMode="numeric"
                        value={draft.positionStr}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, positionStr: e.target.value },
                          }))
                        }
                        aria-label={`Position ${row.name}`}
                      />
                    ) : (
                      row.position
                    )}
                  </td>
                  <td className="px-3 py-2" onMouseDown={stopActivateRow}>
                    {canManageCategories && draft ? (
                      <select
                        className="max-w-[14rem] rounded border bg-background px-2 py-1 text-xs"
                        value={draft.parentId}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, parentId: e.target.value },
                          }))
                        }
                        aria-label={`Parent ${row.name}`}
                      >
                        <option value={ROOT_PARENT_VALUE}>Top level</option>
                        {sorted
                          .filter((c) => !blockedParents.has(c.id))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {"—".repeat(depths.get(c.id) ?? 0)} {c.name}
                              {!c.active ? " (inactive)" : ""}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span className="text-muted-foreground">{parentName}</span>
                    )}
                  </td>
                  <td className="max-w-[10rem] px-3 py-2 text-xs text-muted-foreground">
                    <span className="line-clamp-2" title={supplierHint}>
                      {supplierHint}
                    </span>
                  </td>
                  <td className="px-3 py-2" onMouseDown={stopActivateRow}>
                    {canManageCategories && draft ? (
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={draft.active}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [row.id]: { ...draft, active: e.target.checked },
                            }))
                          }
                          aria-label={`Active ${row.name}`}
                        />
                        Active
                      </label>
                    ) : row.active ? (
                      "Yes"
                    ) : (
                      "No"
                    )}
                  </td>
                  {canManageCategories ? (
                    <td className="px-3 py-2" onMouseDown={stopActivateRow}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={listBusy || !draft}
                        onClick={() => void onSaveRow(row.id)}
                      >
                        Save
                      </Button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedCategory && canManageCategories ? (
        <div className="space-y-6 rounded-md border bg-muted/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium">Images & suppliers</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{selectedCategory.name}</span> · uploads use Cloudinary
                when configured on the server.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCategoryId(null)}>
              Clear selection
            </Button>
          </div>

          <div className="space-y-4">
            <div className="rounded-md border bg-background p-3 space-y-3">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Commercial defaults
              </h4>
              {!commercialDraft ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Description</span>
                    <textarea
                      className="min-h-[4rem] rounded border bg-background px-2 py-1 text-xs"
                      value={commercialDraft.description}
                      onChange={(e) =>
                        setCommercialDraft((d) => (d ? { ...d, description: e.target.value } : d))
                      }
                      disabled={detailBusy}
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Default markup %</span>
                      <input
                        className="w-28 rounded border bg-background px-2 py-1 text-xs tabular-nums"
                        inputMode="decimal"
                        placeholder="empty = none"
                        value={commercialDraft.markupStr}
                        onChange={(e) =>
                          setCommercialDraft((d) => (d ? { ...d, markupStr: e.target.value } : d))
                        }
                        disabled={detailBusy}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Default tax rate</span>
                      <select
                        className="min-w-[14rem] rounded border bg-background px-2 py-1 text-xs"
                        value={commercialDraft.taxRateId}
                        onChange={(e) =>
                          setCommercialDraft((d) => (d ? { ...d, taxRateId: e.target.value } : d))
                        }
                        disabled={detailBusy || taxRates.length === 0}
                      >
                        <option value="">None</option>
                        {taxRates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({String(t.ratePercent)}%){t.inclusive ? " incl." : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={detailBusy}
                    onClick={() => void onSaveCommercialDefaults()}
                  >
                    Save defaults
                  </Button>
                  {selectedCategory.defaultTaxRate ? (
                    <p className="text-[11px] text-muted-foreground">
                      Resolved summary:{" "}
                      <span className="font-medium text-foreground">
                        {selectedCategory.defaultTaxRate.name}
                      </span>{" "}
                      ({String(selectedCategory.defaultTaxRate.ratePercent)}%
                      {selectedCategory.defaultTaxRate.inclusive ? ", inclusive" : ""})
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div className="rounded-md border bg-background p-3 space-y-3">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Price rules (direct links)
              </h4>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Rule</span>
                  <select
                    className="min-w-[12rem] rounded border bg-background px-2 py-1 text-xs"
                    value={rulePickId}
                    onChange={(e) => setRulePickId(e.target.value)}
                    disabled={detailBusy || priceRules.length === 0}
                  >
                    <option value="">Choose…</option>
                    {priceRules
                      .filter((r) => r.active)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Precedence (optional)</span>
                  <input
                    className="w-24 rounded border bg-background px-2 py-1 text-xs tabular-nums"
                    inputMode="numeric"
                    value={rulePrecStr}
                    onChange={(e) => setRulePrecStr(e.target.value)}
                    disabled={detailBusy}
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  disabled={detailBusy || !rulePickId.trim()}
                  onClick={() => void onLinkPriceRule()}
                >
                  Link rule
                </Button>
              </div>
              <ul className="space-y-1 text-xs">
                {linkedRules.length === 0 ? (
                  <li className="text-muted-foreground">No rules linked on this category.</li>
                ) : (
                  linkedRules.map((lr) => (
                    <li
                      key={lr.ruleId}
                      className="flex items-center justify-between gap-2 border-b border-muted/40 py-1"
                    >
                      <span>
                        {lr.ruleName}{" "}
                        <span className="tabular-nums text-muted-foreground">
                          · precedence {lr.precedence}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] text-destructive"
                        disabled={detailBusy}
                        onClick={() => void onUnlinkPriceRule(lr.ruleId)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 text-sm">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gallery</h4>
              <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void onUploadCategoryImage(e)}>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Image file</span>
                  <input
                    name="category-image-file"
                    type="file"
                    accept="image/*"
                    className="max-w-[14rem] text-xs"
                    disabled={detailBusy}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={uploadAsCover}
                    onChange={(e) => setUploadAsCover(e.target.checked)}
                    disabled={detailBusy}
                  />
                  Set as cover
                </label>
                <Button type="submit" size="sm" disabled={detailBusy}>
                  {detailBusy ? "Uploading…" : "Upload"}
                </Button>
              </form>
              {categoryImages.length === 0 ? (
                <p className="text-xs text-muted-foreground">No gallery images yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {categoryImages.map((img) => {
                    const src = img.secureUrl?.trim() ?? "";
                    return (
                      <li
                        key={img.id}
                        className="relative w-24 shrink-0 overflow-hidden rounded border bg-background text-xs"
                      >
                        <div className="relative aspect-square w-full bg-muted">
                          {src ? (
                            <Image src={src} alt="" fill className="object-cover" sizes="96px" unoptimized />
                          ) : (
                            <span className="flex h-full items-center justify-center text-muted-foreground">—</span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-full rounded-none text-[11px] text-destructive hover:text-destructive"
                          disabled={detailBusy}
                          onClick={() => void onDeleteCategoryImage(img.id)}
                        >
                          Remove
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Linked suppliers
              </h4>
              {!canViewSuppliers ? (
                <p className="text-xs text-muted-foreground">
                  You need <code className="rounded bg-muted px-1">suppliers.read</code> to attach suppliers here.
                </p>
              ) : (
                <>
                  <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void onLinkSupplier(e)}>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">Supplier</span>
                      <select
                        className="min-w-[12rem] rounded border bg-background px-2 py-1.5 text-xs"
                        value={supplierPickId}
                        onChange={(e) => setSupplierPickId(e.target.value)}
                        disabled={detailBusy || supplierChoices.length === 0}
                      >
                        <option value="">Choose…</option>
                        {supplierChoices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button type="submit" size="sm" disabled={detailBusy || !supplierPickId.trim()}>
                      Link
                    </Button>
                  </form>
                  <ul className="space-y-1 rounded border bg-background p-2 text-xs">
                    {(selectedCategory.linkedSuppliers ?? []).length === 0 ? (
                      <li className="text-muted-foreground">No suppliers linked.</li>
                    ) : (
                      (selectedCategory.linkedSuppliers ?? []).map((l) => (
                        <li key={l.supplierId} className="flex flex-wrap items-center justify-between gap-2 py-1">
                          <span className="flex flex-wrap items-center gap-2">
                            {l.supplierName}
                            {l.primary ? (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                                Primary
                              </span>
                            ) : null}
                          </span>
                          <span className="flex shrink-0 gap-1">
                            {!l.primary ? (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 text-[11px]"
                                disabled={detailBusy}
                                onClick={() => void onSetSupplierPrimary(l.supplierId)}
                              >
                                Set primary
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] text-destructive"
                              disabled={detailBusy}
                              onClick={() => void onUnlinkSupplier(l.supplierId)}
                            >
                              Remove
                            </Button>
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories yet{canManageCategories ? ". Add one above." : "."}
        </p>
      ) : null}

      {!selectedCategory && sorted.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Tip: click a row to manage images and supplier links for that category.
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Tip: inactive categories stay in the tree for editing but can be hidden wherever products are filtered by
        active category.
      </p>
    </section>
  );
}
