"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PriceTagPreview } from "@/components/price-tags/price-tag-preview";
import { ProductsPageLayout } from "@/app/(dashboard)/products/_components/products-page-layout";
import {
  CATALOG_BTN_GHOST,
  CATALOG_BTN_OUTLINE,
  CATALOG_BTN_PRIMARY,
} from "@/app/(dashboard)/products/_components/catalog-chrome";
import { useSessionBranch } from "@/hooks/use-session-scope";
import { useSessionBootstrapSnapshot } from "@/hooks/use-session-bootstrap-snapshot";
import {
  fetchCategories,
  fetchItemById,
  fetchItemsPage,
  fetchItemTypes,
  type CategoryRecord,
  type ItemTypeRecord,
} from "@/lib/api";
import { barcodeSvgMarkup } from "@/lib/price-tags/barcode";
import { pageCount, paginate, resolveSheet, tagHeightForRows, tagWidthForColumns } from "@/lib/price-tags/layout";
import { tagPriceLabel, toAmount } from "@/lib/price-tags/money";
import { barcodeValueFor, type TagRenderContext } from "@/lib/price-tags/markup";
import { downloadPriceTagsPdf } from "@/lib/price-tags/pdf";
import { printPriceTagPages } from "@/lib/price-tags/print";
import { tagProductFromDetail, tagProductFromSummary } from "@/lib/price-tags/product";
import { copiesOf, duplicateSlot, moveSlot, removeSlot, setCopies } from "@/lib/price-tags/slots";
import { readPriceTagPreferences, writePriceTagPreferences } from "@/lib/price-tags/storage";
import {
  ALL_TAG_FIELDS,
  DEFAULT_LAYOUT,
  LABEL_PRESETS,
  TEMPLATE_COPY,
  applyPreset,
  applyTemplate,
  fieldLabel,
} from "@/lib/price-tags/templates";
import type {
  LabelPresetId,
  SavedTagLayout,
  TagField,
  TagInstance,
  TagLayout,
  TagProduct,
  TagTemplateId,
} from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

const TEMPLATES = Object.keys(TEMPLATE_COPY) as TagTemplateId[];
const PRESETS = Object.keys(LABEL_PRESETS) as Exclude<LabelPresetId, "custom">[];

export function PriceTagsWorkspace() {
  const { branchId, branchName } = useSessionBranch();
  const business = useSessionBootstrapSnapshot().business;
  const businessId = business?.id ?? "";
  const businessName = business?.branding?.displayName?.trim() || business?.name?.trim() || "";
  const currency = business?.currency;

  const [layout, setLayout] = useState<TagLayout>(() => ({
    ...DEFAULT_LAYOUT,
    fields: DEFAULT_LAYOUT.fields.slice(),
  }));
  const [saved, setSaved] = useState<SavedTagLayout[]>([]);
  const [hydratedFor, setHydratedFor] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [itemTypeId, setItemTypeId] = useState("");
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemTypeRecord[]>([]);
  const [rows, setRows] = useState<TagProduct[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [products, setProducts] = useState<Map<string, TagProduct>>(() => new Map());
  const [instances, setInstances] = useState<TagInstance[]>([]);
  const [wasOverrides, setWasOverrides] = useState<Record<string, number | null>>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [printFrom, setPrintFrom] = useState(1);
  const [printTo, setPrintTo] = useState(1);
  const [barcodes, setBarcodes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"print" | "pdf" | "bulk" | null>(null);
  const [saveName, setSaveName] = useState("");
  const [showSelected, setShowSelected] = useState(false);

  useEffect(() => {
    if (!businessId || hydratedFor === businessId) return;
    const stored = readPriceTagPreferences(businessId);
    setLayout(stored.layout);
    setSaved(stored.saved);
    setHydratedFor(businessId);
  }, [businessId, hydratedFor]);

  useEffect(() => {
    if (!businessId || hydratedFor !== businessId) return;
    writePriceTagPreferences(businessId, { layout, saved });
  }, [businessId, hydratedFor, layout, saved]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchCategories(), fetchItemTypes()])
      .then(([categoryRows, typeRows]) => {
        if (cancelled) return;
        setCategories(categoryRows.filter((row) => row.active));
        setItemTypes(typeRows.filter((row) => row.active));
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load departments");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      setListLoading(true);
      try {
        const result = await fetchItemsPage(debouncedSearch, {
          page: nextPage,
          size: 40,
          catalogScope: "SKUS_ONLY",
          categoryId: categoryId || undefined,
          includeCategoryDescendants: true,
          itemTypeId: itemTypeId || undefined,
          branchId: branchId || undefined,
          sort: [{ property: "name", direction: "asc" }],
        });
        const mapped = result.content
          .map(tagProductFromSummary)
          .filter((row): row is TagProduct => row != null);
        setRows((current) => (replace ? mapped : current.concat(mapped)));
        setHasMore(!result.last);
        setPage(nextPage);
      } catch {
        toast.error("Could not load products");
      } finally {
        setListLoading(false);
      }
    },
    [debouncedSearch, categoryId, itemTypeId, branchId],
  );

  useEffect(() => {
    void loadPage(0, true);
  }, [loadPage]);

  const geometry = useMemo(() => resolveSheet(layout), [layout]);
  const pages = useMemo(
    () => paginate(instances, geometry.perPage),
    [instances, geometry],
  );
  const totalPages = pageCount(instances.length, geometry.perPage);

  useEffect(() => {
    setPrintFrom(1);
    setPrintTo(totalPages);
    setPageIndex((current) => Math.min(current, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const barcodeKey = useMemo(() => {
    const codes: string[] = [];
    const seen = new Set<string>();
    for (const slot of instances) {
      const product = products.get(slot.itemId);
      if (!product) continue;
      const code = barcodeValueFor(product, layout);
      if (code && !seen.has(code)) {
        seen.add(code);
        codes.push(code);
      }
    }
    codes.sort();
    return codes.join("\n");
  }, [instances, products, layout]);

  useEffect(() => {
    if (!barcodeKey) {
      setBarcodes({});
      return;
    }
    const next: Record<string, string> = {};
    for (const code of barcodeKey.split("\n")) {
      next[code] = barcodeSvgMarkup(code);
    }
    setBarcodes(next);
  }, [barcodeKey]);

  const context: TagRenderContext = {
    layout,
    geometry,
    businessName,
    currency,
    products,
    wasOverrides,
    barcodes,
  };

  const selectedIds = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const slot of instances) {
      if (!seen.has(slot.itemId)) {
        seen.add(slot.itemId);
        ids.push(slot.itemId);
      }
    }
    return ids;
  }, [instances]);

  function patchLayout(partial: Partial<TagLayout>, customPreset = false) {
    setLayout((current) => ({
      ...current,
      ...partial,
      presetId: customPreset ? "custom" : partial.presetId ?? current.presetId,
    }));
  }

  function addProducts(incoming: TagProduct[]) {
    if (incoming.length === 0) return;
    setProducts((current) => {
      const next = new Map(current);
      for (const product of incoming) next.set(product.id, product);
      return next;
    });
    setInstances((current) => {
      let next = current;
      for (const product of incoming) {
        if (copiesOf(next, product.id) === 0) next = setCopies(next, product.id, 1);
      }
      return next;
    });
  }

  async function addEveryMatch() {
    setBusy("bulk");
    try {
      const gathered: TagProduct[] = [];
      for (let index = 0; index < 8; index += 1) {
        const result = await fetchItemsPage(debouncedSearch, {
          page: index,
          size: 100,
          catalogScope: "SKUS_ONLY",
          categoryId: categoryId || undefined,
          includeCategoryDescendants: true,
          itemTypeId: itemTypeId || undefined,
          branchId: branchId || undefined,
          sort: [{ property: "name", direction: "asc" }],
        });
        for (const row of result.content) {
          const product = tagProductFromSummary(row);
          if (product) gathered.push(product);
        }
        if (result.last) break;
      }
      addProducts(gathered);
      toast.success(
        gathered.length === 1 ? "Added 1 product" : `Added ${gathered.length} products`,
      );
    } catch {
      toast.error("Could not add the matching products");
    } finally {
      setBusy(null);
    }
  }

  async function refreshSelected(): Promise<Map<string, TagProduct>> {
    const ids = selectedIds;
    const next = new Map(products);
    let cursor = 0;
    async function worker() {
      while (cursor < ids.length) {
        const id = ids[cursor];
        cursor += 1;
        try {
          const detail = await fetchItemById(id, { branchId, toast: false });
          const product = tagProductFromDetail(detail);
          if (product) next.set(product.id, product);
        } catch {
          // Keep the price already on the sheet if this read fails.
        }
      }
    }
    const workers: Promise<void>[] = [];
    const pool = Math.min(6, ids.length);
    for (let index = 0; index < pool; index += 1) workers.push(worker());
    await Promise.all(workers);
    setProducts(new Map(next));
    return next;
  }

  async function runOutput(kind: "print" | "pdf") {
    if (instances.length === 0) return;
    setBusy(kind);
    try {
      const fresh = await refreshSelected();
      const live: TagRenderContext = { ...context, products: fresh };
      const livePages = paginate(instances, geometry.perPage);
      const start = Math.min(printFrom, printTo);
      const end = Math.max(printFrom, printTo);
      if (kind === "print") {
        printPriceTagPages(livePages, live, start, end);
      } else {
        const chosen = livePages.slice(Math.max(0, start - 1), end);
        await downloadPriceTagsPdf({
          layout,
          geometry,
          pages: chosen,
          products: fresh,
          wasOverrides,
          businessName,
          currency,
          fileName: "price-tags.pdf",
        });
      }
    } catch {
      toast.error(kind === "print" ? "Could not open the print dialog" : "Could not build the PDF");
    } finally {
      setBusy(null);
    }
  }

  const visibleRows = showSelected
    ? selectedIds
        .map((id) => products.get(id))
        .filter((row): row is TagProduct => row != null)
    : rows;
  const missingPrices = selectedIds.filter((id) => products.get(id)?.sellingPrice == null).length;

  return (
    <ProductsPageLayout className="max-w-none">
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <section className="flex max-h-[46vh] min-h-0 w-full shrink-0 flex-col border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_10%,transparent)] bg-[var(--catalog-shelf,#FCFAF5)] lg:max-h-none lg:w-[22.5rem]">
          <header className="border-b border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_10%,transparent)] px-3 py-3">
            <h1 className="font-[family-name:var(--font-cormorant)] text-[1.65rem] font-normal leading-none text-[var(--catalog-ink,#121A16)]">
              Price tags
            </h1>
            <p className="mt-1.5 text-[12.5px] leading-snug text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_62%,transparent)]">
              {selectedIds.length === 0
                ? "Nothing selected"
                : `${selectedIds.length} products · ${instances.length} tags`}
              {branchName ? ` · ${branchName}` : ""}
            </p>
          </header>

          <div className="flex flex-col gap-2 px-3 py-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, SKU, or barcode"
              aria-label="Search products"
              className="h-9 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-2.5 text-[13px] outline-none focus:border-[#1D4B3B]"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Department"
                value={itemTypeId}
                onChange={(event) => setItemTypeId(event.target.value)}
                className="h-8 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-1.5 text-[12px]"
              >
                <option value="">All departments</option>
                {itemTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-8 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-1.5 text-[12px]"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1">
              <button type="button" className={CATALOG_BTN_GHOST} onClick={() => addProducts(rows)}>
                Add listed
              </button>
              <button
                type="button"
                className={CATALOG_BTN_GHOST}
                disabled={busy === "bulk"}
                onClick={() => void addEveryMatch()}
              >
                {busy === "bulk" ? "Adding…" : "Add every match"}
              </button>
              <button
                type="button"
                className={cn(CATALOG_BTN_GHOST, showSelected && "text-[#1D4B3B]")}
                onClick={() => setShowSelected((current) => !current)}
              >
                {showSelected ? "Show search" : "Show selected"}
              </button>
            </div>
          </div>

          <ul className="min-h-0 flex-1 overflow-auto border-t border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_8%,transparent)]">
            {visibleRows.length === 0 && !listLoading ? (
              <li className="px-3 py-8 text-center font-[family-name:var(--font-cormorant)] text-[1.35rem] text-[#556159]">
                {showSelected ? "No products on the sheet." : "No products match."}
              </li>
            ) : null}
            {visibleRows.map((product) => {
              const copies = copiesOf(instances, product.id);
              const checked = copies > 0;
              return (
                <li
                  key={product.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_4.5rem] items-center gap-2 border-b border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_6%,transparent)] px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    aria-label={`Select ${product.name}`}
                    onChange={() => {
                      if (checked) {
                        setInstances((current) => setCopies(current, product.id, 0));
                        setWasOverrides((current) => {
                          const next = { ...current };
                          delete next[product.id];
                          return next;
                        });
                      } else {
                        addProducts([product]);
                      }
                    }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[var(--catalog-ink,#121A16)]">
                      {product.name}
                    </p>
                    <p className="truncate font-mono text-[11px] text-[#556159]">
                      {product.sku || "No SKU"}
                      {product.barcode ? ` · ${product.barcode}` : ""}
                      {" · "}
                      {tagPriceLabel(product.sellingPrice, currency)}
                    </p>
                    {checked && layout.fields.includes("previousPrice") ? (
                      <label className="mt-1 flex items-center gap-1 text-[11px] text-[#556159]">
                        Was
                        <input
                          inputMode="decimal"
                          value={wasFieldValue(wasOverrides, product)}
                          placeholder="Optional"
                          aria-label={`Previous price for ${product.name}`}
                          className="h-6 w-20 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-1 text-[12px]"
                          onChange={(event) => {
                            const raw = event.target.value.trim();
                            setWasOverrides((current) => ({
                              ...current,
                              [product.id]: raw === "" ? null : toAmount(raw),
                            }));
                          }}
                        />
                      </label>
                    ) : null}
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    disabled={!checked}
                    aria-label={`Copies of ${product.name}`}
                    value={copies}
                    className="h-8 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-1 text-center text-[13px] tabular-nums disabled:opacity-40"
                    onChange={(event) => {
                      const count = Number(event.target.value);
                      setInstances((current) => setCopies(current, product.id, count));
                    }}
                  />
                </li>
              );
            })}
          </ul>
          {!showSelected && hasMore ? (
            <button
              type="button"
              className={cn(CATALOG_BTN_GHOST, "m-2")}
              disabled={listLoading}
              onClick={() => void loadPage(page + 1, false)}
            >
              {listLoading ? "Loading…" : "Load more"}
            </button>
          ) : null}
        </section>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-1">
              {TEMPLATES.map((templateId) => (
                <button
                  key={templateId}
                  type="button"
                  title={TEMPLATE_COPY[templateId].detail}
                  className={cn(
                    "h-8 border px-2.5 text-[12px]",
                    layout.templateId === templateId
                      ? "border-[#1D4B3B] bg-[#1D4B3B] text-white"
                      : "border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white text-[var(--catalog-ink,#121A16)]",
                  )}
                  onClick={() => setLayout((current) => applyTemplate(current, templateId))}
                >
                  {TEMPLATE_COPY[templateId].label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[12px] text-[#556159]">
                Pages
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={printFrom}
                  aria-label="First page to print"
                  className="ml-1 h-8 w-12 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white text-center text-[12px]"
                  onChange={(event) => setPrintFrom(Number(event.target.value) || 1)}
                />
                <span className="px-1">–</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={printTo}
                  aria-label="Last page to print"
                  className="h-8 w-12 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white text-center text-[12px]"
                  onChange={(event) => setPrintTo(Number(event.target.value) || 1)}
                />
              </label>
              <button
                type="button"
                className={CATALOG_BTN_OUTLINE}
                disabled={instances.length === 0 || busy != null}
                onClick={() => void runOutput("pdf")}
              >
                {busy === "pdf" ? "Preparing PDF…" : "Download PDF"}
              </button>
              <button
                type="button"
                className={CATALOG_BTN_PRIMARY}
                disabled={instances.length === 0 || busy != null}
                onClick={() => void runOutput("print")}
              >
                {busy === "print" ? "Preparing…" : "Print"}
              </button>
            </div>
          </div>

          {missingPrices > 0 ? (
            <p className="text-[12.5px] text-[#A55237]">
              {missingPrices === 1
                ? "1 selected product has no selling price."
                : `${missingPrices} selected products have no selling price.`}
            </p>
          ) : null}

          <PriceTagPreview
            pages={pages.length > 0 ? pages : [[]]}
            pageIndex={pageIndex}
            context={context}
            onPageIndex={setPageIndex}
            onReorder={(from, to) => setInstances((current) => moveSlot(current, from, to))}
            onRemove={(key) => setInstances((current) => removeSlot(current, key))}
            onDuplicate={(key) => setInstances((current) => duplicateSlot(current, key))}
          />

          <details className="border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_10%,transparent)] bg-[var(--catalog-shelf,#FCFAF5)]">
            <summary className="cursor-pointer px-3 py-2 text-[13px] text-[var(--catalog-ink,#121A16)]">
              Sheet size, spacing, and what each tag shows
            </summary>
            <div className="grid gap-4 px-3 pb-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-1">
                  {PRESETS.map((presetId) => (
                    <button
                      key={presetId}
                      type="button"
                      className={cn(
                        "h-7 border px-2 text-[11.5px]",
                        layout.presetId === presetId
                          ? "border-[#1D4B3B] text-[#1D4B3B]"
                          : "border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)]",
                      )}
                      onClick={() => setLayout((current) => applyPreset(current, presetId))}
                    >
                      {LABEL_PRESETS[presetId].label}
                    </button>
                  ))}
                  {layout.presetId === "custom" ? (
                    <span className="px-1 text-[11.5px] text-[#556159]">Custom size</span>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <NumberField
                    label="Columns"
                    value={geometry.columns}
                    min={1}
                    max={8}
                    onChange={(columns) =>
                      patchLayout({ tagWidthMm: tagWidthForColumns(layout, columns) }, true)
                    }
                  />
                  <NumberField
                    label="Rows"
                    value={geometry.rows}
                    min={1}
                    max={14}
                    onChange={(rows) =>
                      patchLayout({ tagHeightMm: tagHeightForRows(layout, rows) }, true)
                    }
                  />
                  <NumberField
                    label="Width mm"
                    value={layout.tagWidthMm}
                    min={18}
                    max={190}
                    step={0.5}
                    onChange={(tagWidthMm) => patchLayout({ tagWidthMm }, true)}
                  />
                  <NumberField
                    label="Height mm"
                    value={layout.tagHeightMm}
                    min={12}
                    max={270}
                    step={0.5}
                    onChange={(tagHeightMm) => patchLayout({ tagHeightMm }, true)}
                  />
                  <NumberField
                    label="Gap across"
                    value={layout.gapXMm}
                    min={0}
                    max={20}
                    step={0.5}
                    onChange={(gapXMm) => patchLayout({ gapXMm }, true)}
                  />
                  <NumberField
                    label="Gap down"
                    value={layout.gapYMm}
                    min={0}
                    max={20}
                    step={0.5}
                    onChange={(gapYMm) => patchLayout({ gapYMm }, true)}
                  />
                  <NumberField
                    label="Top mm"
                    value={layout.marginTopMm}
                    min={0}
                    max={30}
                    step={0.5}
                    onChange={(marginTopMm) => patchLayout({ marginTopMm }, true)}
                  />
                  <NumberField
                    label="Right mm"
                    value={layout.marginRightMm}
                    min={0}
                    max={30}
                    step={0.5}
                    onChange={(marginRightMm) => patchLayout({ marginRightMm }, true)}
                  />
                  <NumberField
                    label="Bottom mm"
                    value={layout.marginBottomMm}
                    min={0}
                    max={30}
                    step={0.5}
                    onChange={(marginBottomMm) => patchLayout({ marginBottomMm }, true)}
                  />
                  <NumberField
                    label="Left mm"
                    value={layout.marginLeftMm}
                    min={0}
                    max={30}
                    step={0.5}
                    onChange={(marginLeftMm) => patchLayout({ marginLeftMm }, true)}
                  />
                  <label className="flex flex-col gap-1 text-[11px] text-[#556159]">
                    Direction
                    <select
                      value={layout.orientation}
                      className="h-8 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-1 text-[12px] text-[var(--catalog-ink,#121A16)]"
                      onChange={(event) =>
                        patchLayout({
                          orientation: event.target.value === "vertical" ? "vertical" : "horizontal",
                        })
                      }
                    >
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-[11px] text-[#556159]">
                    Border
                    <select
                      value={layout.border}
                      className="h-8 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-1 text-[12px] text-[var(--catalog-ink,#121A16)]"
                      onChange={(event) =>
                        patchLayout({ border: event.target.value as TagLayout["border"] })
                      }
                    >
                      <option value="none">None</option>
                      <option value="hairline">Hairline</option>
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="ticket">Ticket</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-[#556159]">
                    Alignment
                    <select
                      value={layout.align}
                      className="h-8 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-1 text-[12px] text-[var(--catalog-ink,#121A16)]"
                      onChange={(event) =>
                        patchLayout({ align: event.target.value === "center" ? "center" : "left" })
                      }
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <fieldset className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <legend className="mb-1 text-[11px] text-[#556159]">On each tag</legend>
                  {ALL_TAG_FIELDS.map((field) => (
                    <label key={field} className="flex items-center gap-1.5 text-[12.5px]">
                      <input
                        type="checkbox"
                        checked={layout.fields.includes(field)}
                        onChange={() => patchLayout({ fields: toggleField(layout.fields, field) })}
                      />
                      {fieldLabel(field)}
                    </label>
                  ))}
                </fieldset>
                <label className="flex flex-col gap-1 text-[11px] text-[#556159]">
                  Promotional line
                  <input
                    value={layout.promoMessage}
                    maxLength={40}
                    placeholder="Fresh deal"
                    className="h-8 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-2 text-[13px] text-[var(--catalog-ink,#121A16)]"
                    onChange={(event) => patchLayout({ promoMessage: event.target.value })}
                  />
                </label>
                <label className="flex items-center gap-2 text-[12.5px]">
                  <input
                    type="checkbox"
                    checked={layout.generateBarcodeFromSku}
                    onChange={(event) => patchLayout({ generateBarcodeFromSku: event.target.checked })}
                  />
                  Barcode from SKU when the product has none
                </label>
                <p className="text-[11.5px] leading-relaxed text-[#556159]">
                  Selling prices are read from this branch when you print or download. Saved layouts keep the sheet, not the prices.
                  A previous price appears when the catalog price is higher than the current selling price, or when you type one.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={saveName}
                    placeholder="Layout name"
                    aria-label="Layout name"
                    className="h-8 min-w-0 flex-1 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-2 text-[12.5px]"
                    onChange={(event) => setSaveName(event.target.value)}
                  />
                  <button
                    type="button"
                    className={CATALOG_BTN_OUTLINE}
                    onClick={() => {
                      const name = saveName.trim();
                      if (!name) return;
                      const entry: SavedTagLayout = {
                        id: `layout-${Date.now()}`,
                        name,
                        layout: { ...layout, fields: layout.fields.slice() },
                      };
                      setSaved((current) => [entry, ...current.filter((row) => row.name !== name)].slice(0, 24));
                      setSaveName("");
                    }}
                  >
                    Save layout
                  </button>
                  {saved.length > 0 ? (
                    <select
                      aria-label="Saved layouts"
                      defaultValue=""
                      className="h-8 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-1 text-[12px]"
                      onChange={(event) => {
                        const entry = saved.find((row) => row.id === event.target.value);
                        if (entry) setLayout({ ...entry.layout, fields: entry.layout.fields.slice() });
                      }}
                    >
                      <option value="">Use a saved layout</option>
                      {saved.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </div>
            </div>
          </details>
        </section>
      </div>
    </ProductsPageLayout>
  );
}

function wasFieldValue(
  overrides: Readonly<Record<string, number | null>>,
  product: TagProduct,
): string | number {
  if (Object.prototype.hasOwnProperty.call(overrides, product.id)) {
    return overrides[product.id] ?? "";
  }
  return product.catalogWasPrice ?? "";
}

function toggleField(fields: TagField[], field: TagField): TagField[] {
  return fields.includes(field) ? fields.filter((item) => item !== field) : fields.concat(field);
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-[#556159]">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        className="h-8 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-1.5 text-[12px] text-[var(--catalog-ink,#121A16)] tabular-nums"
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
