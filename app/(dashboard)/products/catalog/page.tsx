"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Package,
  PackagePlus,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboard } from "@/components/dashboard-provider";
import {
  GlobalCatalogLoadMoreSkeleton,
  GlobalCatalogProductTableSkeleton,
} from "@/components/products/global-catalog-product-skeleton";
import { useGlobalCatalogTenantSync } from "@/hooks/use-global-catalog-tenant-sync";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn, formatMoney } from "@/lib/utils";
import {
  type GlobalCatalogAdoptLine,
  type GlobalCatalogAdoptResult,
  type GlobalCategoryRecord,
  type GlobalProductPackRecord,
  type GlobalProductRecord,
  type CategoryRecord,
  fetchCategories,
  fetchGlobalCatalogMeta,
  fetchGlobalCatalogPack,
  fetchGlobalCatalogProducts,
  previewGlobalCatalogAdopt,
  globalCatalogAdopt,
} from "@/lib/api";
import {
  adoptStatusClassName,
  adoptStatusPresentation,
} from "@/lib/global-catalog-adopt-status";
import {
  allocateRenamedSkuAvoiding,
  isImportableAdoptStatus,
  isSkippablePreviewStatus,
  isSkuConflictStatus,
  isUnresolvedSkuConflict,
  suggestRenamedSku,
} from "@/lib/global-catalog-sku-conflict";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 320;

function globalCatalogImageSrc(url?: string | null): string | null {
  const trimmed = url?.trim();
  if (!trimmed || trimmed.startsWith("/api/media/")) {
    return null;
  }
  return trimmed;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export default function GlobalCatalogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { me, business, branches, branchId } = useDashboard();
  const canAdopt = hasPermission(me?.permissions, Permission.CatalogGlobalAdopt);

  const [meta, setMeta] = useState<{
    catalogId: string;
    catalogName: string;
    currency: string;
    categories: GlobalCategoryRecord[];
    packs: GlobalProductPackRecord[];
  } | null>(null);
  const [products, setProducts] = useState<GlobalProductRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalElements, setTotalElements] = useState<number | null>(null);
  const [selected, setSelected] = useState<Map<string, GlobalProductRecord>>(new Map());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [adopting, setAdopting] = useState(false);
  const [lineOverrides, setLineOverrides] = useState<Map<string, GlobalCatalogAdoptLine>>(new Map());
  const [skippedProductIds, setSkippedProductIds] = useState<Set<string>>(new Set());
  const [hideImported, setHideImported] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tenantCategories, setTenantCategories] = useState<CategoryRecord[]>([]);
  const [previewResult, setPreviewResult] = useState<GlobalCatalogAdoptResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const syncingRef = useRef(false);
  const selectedPackIdRef = useRef<string | null>(null);
  const productsCountRef = useRef(0);

  const defaultBranchId = branchId || branches[0]?.id;

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    selectedPackIdRef.current = selectedPackId;
  }, [selectedPackId]);

  useEffect(() => {
    productsCountRef.current = products.length;
  }, [products.length]);

  const pruneSelectedImported = useCallback((rows: GlobalProductRecord[]) => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const importedIds = new Set(
        rows.filter((product) => product.alreadyImported).map((product) => product.id),
      );
      if (importedIds.size === 0) return prev;
      const next = new Map(prev);
      for (const id of importedIds) {
        next.delete(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, []);

  const loadMeta = useCallback(async () => {
    try {
      const m = await fetchGlobalCatalogMeta();
      setMeta(m);
    } catch {
      toast.error("Could not load global catalog");
    }
  }, []);

  const loadTenantCategories = useCallback(async () => {
    try {
      const categories = await fetchCategories();
      setTenantCategories(categories.filter((category) => category.active));
    } catch {
      setTenantCategories([]);
    }
  }, []);

  const fetchProducts = useCallback(
    async ({
      reset,
      page,
      categoryId,
      packId,
    }: {
      reset: boolean;
      page: number;
      categoryId: string | null;
      packId: string | null;
    }) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      if (reset) {
        setInitialLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        if (packId) {
          const pack = await fetchGlobalCatalogPack(packId, {
            onlyNotImported: hideImported,
          });
          setProducts(pack.products);
          setHasMore(false);
          hasMoreRef.current = false;
          setTotalElements(pack.products.length);
          pageRef.current = 0;
          return;
        }

        const result = await fetchGlobalCatalogProducts({
          categoryId: categoryId ?? undefined,
          q: debouncedSearch || undefined,
          onlyNotImported: hideImported,
          page,
          size: PAGE_SIZE,
        });

        setProducts((prev) => (reset ? result.content : [...prev, ...result.content]));
        const nextHasMore = !result.last;
        setHasMore(nextHasMore);
        hasMoreRef.current = nextHasMore;
        setTotalElements(result.totalElements);
        pageRef.current = page;
      } catch {
        toast.error("Could not load products");
      } finally {
        loadingRef.current = false;
        setInitialLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, hideImported]
  );

  const syncLoadedProducts = useCallback(async () => {
    if (loadingRef.current || syncingRef.current || initialLoading) return;

    syncingRef.current = true;
    setSyncing(true);
    const previousCount = productsCountRef.current;

    try {
      if (selectedPackId) {
        const pack = await fetchGlobalCatalogPack(selectedPackId, {
          onlyNotImported: hideImported,
        });
        setProducts(pack.products);
        setTotalElements(pack.products.length);
        pruneSelectedImported(pack.products);
        return;
      }

      const pagesToLoad = Math.max(1, pageRef.current + 1);
      const results = await Promise.all(
        Array.from({ length: pagesToLoad }, (_, page) =>
          fetchGlobalCatalogProducts({
            categoryId: selectedCategoryId ?? undefined,
            q: debouncedSearch || undefined,
            onlyNotImported: hideImported,
            page,
            size: PAGE_SIZE,
          }),
        ),
      );

      const merged = results.flatMap((result) => result.content);
      const lastResult = results[results.length - 1];
      const nextHasMore = !lastResult?.last;

      setProducts(merged);
      pruneSelectedImported(merged);
      setHasMore(nextHasMore);
      hasMoreRef.current = nextHasMore;
      setTotalElements(lastResult?.totalElements ?? merged.length);

      if (hideImported && merged.length < previousCount && nextHasMore) {
        const backfillPage = pageRef.current + 1;
        const backfill = await fetchGlobalCatalogProducts({
          categoryId: selectedCategoryId ?? undefined,
          q: debouncedSearch || undefined,
          onlyNotImported: hideImported,
          page: backfillPage,
          size: PAGE_SIZE,
        });
        if (backfill.content.length > 0) {
          setProducts((prev) => [...prev, ...backfill.content]);
          pageRef.current = backfillPage;
          const backfillHasMore = !backfill.last;
          setHasMore(backfillHasMore);
          hasMoreRef.current = backfillHasMore;
        }
      }
    } catch {
      // Background sync — avoid noisy toasts while browsing.
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [
    debouncedSearch,
    hideImported,
    initialLoading,
    pruneSelectedImported,
    selectedCategoryId,
    selectedPackId,
  ]);

  useGlobalCatalogTenantSync({
    enabled: !initialLoading,
    onSync: syncLoadedProducts,
  });

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current || selectedPackIdRef.current) return;
    void fetchProducts({
      reset: false,
      page: pageRef.current + 1,
      categoryId: selectedCategoryId,
      packId: null,
    });
  }, [fetchProducts, selectedCategoryId]);

  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  useEffect(() => {
    if (searchParams.get("from") === "onboarding") {
      toast.message("Pick products to import, or skip and add your own later.");
    }
  }, [searchParams]);

  useEffect(() => {
    void loadMeta();
    void loadTenantCategories();
  }, [loadMeta, loadTenantCategories]);

  useEffect(() => {
    pageRef.current = 0;
    void fetchProducts({
      reset: true,
      page: 0,
      categoryId: selectedCategoryId,
      packId: selectedPackId,
    });
  }, [selectedCategoryId, selectedPackId, debouncedSearch, hideImported, fetchProducts]);

  useEffect(() => {
    if (initialLoading || !hasMore || selectedPackId) return;

    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreRef.current();
        }
      },
      {
        root,
        rootMargin: "160px 0px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [initialLoading, hasMore, selectedPackId, products.length]);

  const toggleProduct = (product: GlobalProductRecord) => {
    if (product.alreadyImported) return;
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.set(product.id, product);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const p of products) {
        if (!p.alreadyImported) next.set(p.id, p);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Map());
    setSkippedProductIds(new Set());
  };

  const updateOverride = (productId: string, patch: Partial<GlobalCatalogAdoptLine>) => {
    setLineOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId) ?? { globalProductId: productId };
      next.set(productId, { ...existing, ...patch });
      return next;
    });
  };

  const buildLines = useCallback((): GlobalCatalogAdoptLine[] => {
    return Array.from(selected.values())
      .filter((p) => !skippedProductIds.has(p.id))
      .map((p) => {
      const override = lineOverrides.get(p.id);
      const globalCategory = meta?.categories.find((c) => c.id === p.globalCategoryId);
      const slugHint = globalCategory?.tenantCategorySlugHint?.trim();
      const suggestedCategoryId = slugHint
        ? tenantCategories.find((category) => category.slug === slugHint)?.id
        : undefined;
      return {
        globalProductId: p.id,
        sku: override?.sku ?? p.skuTemplate ?? undefined,
        categoryId: override?.categoryId ?? suggestedCategoryId ?? undefined,
        sellingPrice: override?.sellingPrice ?? p.recommendedSellingPrice ?? undefined,
        buyingPrice: override?.buyingPrice ?? p.recommendedBuyingPrice ?? undefined,
        openingQty: override?.openingQty ?? undefined,
        openingUnitCost: override?.openingUnitCost ?? override?.buyingPrice ?? p.recommendedBuyingPrice ?? undefined,
        reorderLevel: override?.reorderLevel ?? p.defaultReorderLevel ?? undefined,
        reorderQty: override?.reorderQty ?? p.defaultReorderQty ?? undefined,
        minStockLevel: override?.minStockLevel ?? p.defaultMinStockLevel ?? undefined,
        onSkuConflict: override?.onSkuConflict ?? undefined,
      };
    });
  }, [selected, skippedProductIds, lineOverrides, meta?.categories, tenantCategories]);

  const runPreview = useCallback(async () => {
    if (selected.size === 0) {
      setPreviewResult(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const result = await previewGlobalCatalogAdopt(buildLines());
      setPreviewResult(result);
    } catch {
      toast.error("Could not preview import");
      setPreviewResult(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [buildLines, selected.size]);

  useEffect(() => {
    if (!reviewOpen) {
      setPreviewResult(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void runPreview();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [reviewOpen, runPreview, lineOverrides, selected, skippedProductIds]);

  const previewByProductId = useMemo(() => {
    const map = new Map<string, GlobalCatalogAdoptResult["lines"][number]>();
    for (const line of previewResult?.lines ?? []) {
      map.set(line.globalProductId, line);
    }
    return map;
  }, [previewResult]);

  const readyImportCount = useMemo(
    () =>
      previewResult?.lines.filter((line) => isImportableAdoptStatus(line.status)).length ??
      buildLines().length,
    [previewResult, buildLines],
  );

  const unresolvedConflictCount = useMemo(() => {
    if (!previewResult) {
      return 0;
    }
    return previewResult.lines.filter((line) =>
      isUnresolvedSkuConflict(
        line.status,
        lineOverrides.get(line.globalProductId)?.onSkuConflict,
        skippedProductIds.has(line.globalProductId),
      ),
    ).length;
  }, [previewResult, skippedProductIds, lineOverrides]);

  const unresolvedConflictLines = useMemo(() => {
    if (!previewResult) {
      return [];
    }
    return previewResult.lines.filter((line) =>
      isUnresolvedSkuConflict(
        line.status,
        lineOverrides.get(line.globalProductId)?.onSkuConflict,
        skippedProductIds.has(line.globalProductId),
      ),
    );
  }, [previewResult, skippedProductIds, lineOverrides]);

  const duplicateImportLines = useMemo(() => {
    if (!previewResult) {
      return [];
    }
    return previewResult.lines.filter(
      (line) =>
        line.status === "skip_already_imported" &&
        !skippedProductIds.has(line.globalProductId),
    );
  }, [previewResult, skippedProductIds]);

  const skippablePreviewLines = useMemo(() => {
    if (!previewResult) {
      return [];
    }
    return previewResult.lines.filter(
      (line) =>
        isSkippablePreviewStatus(line.status) &&
        !skippedProductIds.has(line.globalProductId),
    );
  }, [previewResult, skippedProductIds]);

  const nonImportableLines = useMemo(() => {
    if (!previewResult) {
      return [];
    }
    return previewResult.lines.filter(
      (line) =>
        !isImportableAdoptStatus(line.status) &&
        !skippedProductIds.has(line.globalProductId),
    );
  }, [previewResult, skippedProductIds]);

  const applyBulkSkip = (productIds: string[]) => {
    if (productIds.length === 0) {
      return;
    }
    setSkippedProductIds((prev) => {
      const next = new Set(prev);
      for (const id of productIds) {
        next.add(id);
      }
      return next;
    });
    setLineOverrides((prev) => {
      const next = new Map(prev);
      for (const id of productIds) {
        const existing = next.get(id) ?? { globalProductId: id };
        next.set(id, { ...existing, onSkuConflict: "skip" });
      }
      return next;
    });
  };

  const bulkSkipProductIds = (productIds: string[], label: string) => {
    if (productIds.length === 0) {
      return;
    }
    applyBulkSkip(productIds);
    toast.success(`${label} (${productIds.length})`);
  };

  const bulkSkipSkuConflicts = () => {
    bulkSkipProductIds(
      unresolvedConflictLines.map((line) => line.globalProductId),
      "Skipped SKU conflicts",
    );
  };

  const bulkMergeSkuConflicts = () => {
    const conflicts = unresolvedConflictLines;
    if (conflicts.length === 0) {
      return;
    }
    setSkippedProductIds((prev) => {
      const next = new Set(prev);
      for (const line of conflicts) {
        next.delete(line.globalProductId);
      }
      return next;
    });
    setLineOverrides((prev) => {
      const next = new Map(prev);
      for (const line of conflicts) {
        const existing = next.get(line.globalProductId) ?? {
          globalProductId: line.globalProductId,
        };
        next.set(line.globalProductId, { ...existing, onSkuConflict: "merge" });
      }
      return next;
    });
    toast.success(`Will merge ${conflicts.length} SKU conflicts`);
  };

  const bulkRenameSkuConflicts = () => {
    const conflicts = unresolvedConflictLines;
    if (conflicts.length === 0) {
      return;
    }
    const taken = new Set<string>();
    for (const line of conflicts) {
      const sku = line.sku?.trim();
      if (sku) {
        taken.add(sku);
      }
    }
    setSkippedProductIds((prev) => {
      const next = new Set(prev);
      for (const line of conflicts) {
        next.delete(line.globalProductId);
      }
      return next;
    });
    setLineOverrides((prev) => {
      const next = new Map(prev);
      for (const line of conflicts) {
        const product = selected.get(line.globalProductId);
        const existing = next.get(line.globalProductId) ?? {
          globalProductId: line.globalProductId,
        };
        const base =
          line.sku?.trim() ||
          existing.sku?.trim() ||
          product?.skuTemplate?.trim() ||
          "";
        const renamed =
          allocateRenamedSkuAvoiding(base, taken) ?? suggestRenamedSku(base);
        next.set(line.globalProductId, {
          ...existing,
          onSkuConflict: "rename",
          sku: renamed,
        });
      }
      return next;
    });
    toast.success(`Renamed ${conflicts.length} conflicting SKUs`);
  };

  const bulkSkipDuplicates = () => {
    bulkSkipProductIds(
      duplicateImportLines.map((line) => line.globalProductId),
      "Skipped duplicates",
    );
  };

  const bulkSkipAllProblems = () => {
    bulkSkipProductIds(
      nonImportableLines.map((line) => line.globalProductId),
      "Skipped non-importable rows",
    );
  };

  const bulkClearSkipped = () => {
    if (skippedProductIds.size === 0) {
      return;
    }
    setSkippedProductIds(new Set());
    toast.info("Restored skipped rows");
  };

  const markSkuConflictSkip = (productId: string) => {
    setSkippedProductIds((prev) => new Set(prev).add(productId));
    setLineOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId) ?? { globalProductId: productId };
      next.set(productId, { ...existing, onSkuConflict: "skip" });
      return next;
    });
  };

  const markSkuConflictMerge = (productId: string) => {
    setSkippedProductIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    setLineOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId) ?? { globalProductId: productId };
      next.set(productId, { ...existing, onSkuConflict: "merge" });
      return next;
    });
  };

  const markSkuConflictRename = (productId: string, currentSku: string) => {
    setSkippedProductIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    setLineOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId) ?? { globalProductId: productId };
      next.set(productId, {
        ...existing,
        onSkuConflict: "rename",
        sku: suggestRenamedSku(currentSku || existing.sku || ""),
      });
      return next;
    });
  };

  const handlePreview = () => {
    if (selected.size === 0) return;
    setReviewOpen(true);
  };

  const handleAdopt = async () => {
    if (!defaultBranchId) {
      toast.error("No branch selected");
      return;
    }
    setAdopting(true);
    try {
      const lines = buildLines();
      const preview = previewResult ?? (await previewGlobalCatalogAdopt(lines));
      const hasErrors = preview.lines.some((l) => l.status.startsWith("error"));
      const readyCount = preview.lines.filter((l) => isImportableAdoptStatus(l.status)).length;
      if (hasErrors) {
        toast.error("Preview has errors. Fix or remove those products.");
        setPreviewResult(preview);
        return;
      }
      if (unresolvedConflictCount > 0) {
        toast.error("Resolve SKU conflicts (skip, rename, or merge) before importing.");
        setPreviewResult(preview);
        return;
      }
      if (readyCount === 0) {
        toast.error("No products are ready to import.");
        setPreviewResult(preview);
        return;
      }
      const stillUnresolved = preview.lines.filter((line) =>
        isSkuConflictStatus(line.status),
      ).length;
      if (stillUnresolved > 0) {
        toast.error("Resolve SKU conflicts (skip, rename, or merge) before importing.");
        setPreviewResult(preview);
        return;
      }
      const result = await globalCatalogAdopt(defaultBranchId, lines);
      const importedNew = result.lines.filter((l) => l.status === "imported").length;
      const mergedCount = result.lines.filter((l) => l.status === "merged").length;
      toast.success(
        mergedCount > 0
          ? `Imported ${importedNew} · linked ${mergedCount} to existing`
          : `Imported ${result.importedCount} products`,
      );
      if (result.skippedCount > 0) {
        toast.info(`${result.skippedCount} skipped`);
      }
      setReviewOpen(false);
      setSelected(new Map());
      setSkippedProductIds(new Set());
      setLineOverrides(new Map());
      void fetchProducts({
        reset: true,
        page: 0,
        categoryId: selectedCategoryId,
        packId: selectedPackId,
      });
    } catch {
      toast.error("Adopt failed");
    } finally {
      setAdopting(false);
    }
  };

  const currency = business?.currency?.trim() || "KES";
  const isSearching = searchInput !== debouncedSearch;
  const showEmptyState = !initialLoading && products.length === 0;
  const loadedLabel =
    totalElements != null && totalElements > products.length
      ? `${products.length} of ${totalElements}`
      : `${products.length}`;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <header className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/products")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">Add products from catalog</h1>
            <p className="text-xs text-muted-foreground">
              {meta?.catalogName ?? "Global catalog"}
              {!initialLoading && products.length > 0 ? (
                <span className="ml-1.5 tabular-nums text-muted-foreground/70">
                  · {loadedLabel} shown
                </span>
              ) : null}
              {syncing ? (
                <span className="ml-2 inline-flex items-center gap-1 text-primary/80">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  Updating…
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <span className="text-xs text-muted-foreground">
              {selected.size} selected
            </span>
          )}
          <Button
            size="sm"
            disabled={selected.size === 0 || !canAdopt}
            onClick={handlePreview}
          >
            <ShoppingCart className="mr-1.5 size-4" />
            Review & import
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/30 lg:flex">
          <div className="flex-1 overflow-auto p-3">
            <div className="mb-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Package className="size-3.5" /> Starter packs
              </h3>
              <div className="space-y-1">
                {meta?.packs.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => {
                      setSelectedCategoryId(null);
                      setSelectedPackId(pack.id === selectedPackId ? null : pack.id);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      selectedPackId === pack.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <span className="truncate">{pack.name}</span>
                    <span className="shrink-0 tabular-nums opacity-70">{pack.productCount}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="my-3 border-t" />

            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <BookOpen className="size-3.5" /> Categories
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedPackId(null);
                    setSelectedCategoryId(null);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    selectedCategoryId === null && selectedPackId === null
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Store className="size-3.5" /> All products
                </button>
                {meta?.categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedPackId(null);
                      setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id);
                    }}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      selectedCategoryId === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b p-3">
            <div className="relative flex-1">
              <Search
                className={cn(
                  "absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-opacity",
                  isSearching && "opacity-40"
                )}
              />
              <Input
                placeholder="Search by name, brand, or barcode..."
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {isSearching ? (
                <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={hideImported}
                onChange={(e) => setHideImported(e.target.checked)}
                className="size-4 rounded border"
              />
              Hide already in catalog
            </label>
            {selected.size > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={selectAllVisible}>
              Select all
            </Button>
          </div>

          <div
            ref={scrollRef}
            className="relative flex-1 overflow-auto scroll-smooth"
          >
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-card/95 shadow-[0_1px_0_0_hsl(var(--border))] backdrop-blur-sm">
                <tr className="text-xs text-muted-foreground">
                  <th className="w-10 bg-card/95 py-2.5 pl-3" />
                  <th className="bg-card/95 py-2.5">Product</th>
                  <th className="bg-card/95 py-2.5">Category</th>
                  <th className="bg-card/95 py-2.5">Barcode</th>
                  <th className="bg-card/95 py-2.5 text-right">Buy</th>
                  <th className="bg-card/95 py-2.5 pr-3 text-right">Sell</th>
                </tr>
              </thead>

              {initialLoading ? (
                <GlobalCatalogProductTableSkeleton rows={12} />
              ) : (
                <tbody>
                  {products.map((p, index) => {
                    const imageSrc = globalCatalogImageSrc(p.imageUrl);
                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          "border-b motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300",
                          p.alreadyImported && "opacity-50",
                          selected.has(p.id) && "bg-muted/80"
                        )}
                        style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
                      >
                        <td className="py-2 pl-3">
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            disabled={p.alreadyImported}
                            onChange={() => toggleProduct(p)}
                            className="size-4 rounded border"
                          />
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {imageSrc ? (
                              <img
                                src={imageSrc}
                                alt={p.name}
                                className="size-8 rounded border object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex size-8 items-center justify-center rounded border bg-muted">
                                <Package className="size-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {[p.brand, p.size].filter(Boolean).join(" · ")}
                                {p.alreadyImported && p.adoptedItemId ? (
                                  <>
                                    {" · "}
                                    <button
                                      type="button"
                                      className="text-primary underline-offset-2 hover:underline"
                                      onClick={() => router.push(`/products?product=${p.adoptedItemId}`)}
                                    >
                                      In your catalog
                                    </button>
                                  </>
                                ) : null}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2">
                          <span className="text-xs">
                            {meta?.categories.find((c) => c.id === p.globalCategoryId)?.name ?? "—"}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">{p.barcode ?? "—"}</td>
                        <td className="py-2 text-right text-xs">
                          {p.recommendedBuyingPrice != null
                            ? formatMoney(p.recommendedBuyingPrice, currency)
                            : "—"}
                        </td>
                        <td className="py-2 pr-3 text-right text-xs">
                          {p.recommendedSellingPrice != null
                            ? formatMoney(p.recommendedSellingPrice, currency)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>

            {showEmptyState ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border bg-muted/40">
                  <Sparkles className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No products to show</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {debouncedSearch
                    ? `Nothing matched "${debouncedSearch}". Try a different search or category.`
                    : hideImported
                      ? "Everything in this view is already in your catalog, or this pack is empty."
                      : "Try another category or starter pack."}
                </p>
              </div>
            ) : null}

            {loadingMore ? <GlobalCatalogLoadMoreSkeleton rows={5} /> : null}

            {!initialLoading && hasMore && !selectedPackId ? (
              <div
                ref={sentinelRef}
                className="flex min-h-16 items-center justify-center py-4"
                aria-live="polite"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading more products…
                  </span>
                ) : (
                  <span className="sr-only">More products load as you scroll</span>
                )}
              </div>
            ) : null}

            {!initialLoading && !hasMore && products.length > 0 ? (
              <p className="pb-6 pt-2 text-center text-[11px] text-muted-foreground/50">
                You&apos;ve reached the end · {products.length} products
              </p>
            ) : null}
          </div>
        </main>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Review & import</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto px-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {selected.size} selected · importing into{" "}
                {branches.find((b) => b.id === defaultBranchId)?.name ?? "default branch"}
              </p>
              {previewLoading ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Checking…
                </span>
              ) : previewResult ? (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {readyImportCount} ready
                  {previewResult.skippedCount > 0
                    ? ` · ${previewResult.skippedCount} will skip`
                    : ""}
                </span>
              ) : null}
            </div>
            {previewResult && !previewLoading ? (
              <div className="mt-3 space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
                <p className="text-[11px] font-medium text-foreground">
                  Bulk actions
                </p>
                <div className="flex flex-wrap gap-2">
                  {unresolvedConflictLines.length > 0 ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={bulkSkipSkuConflicts}
                      >
                        Skip {unresolvedConflictLines.length} conflicts
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={bulkRenameSkuConflicts}
                      >
                        Rename all conflicts
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={bulkMergeSkuConflicts}
                      >
                        Merge all conflicts
                      </Button>
                    </>
                  ) : null}
                  {duplicateImportLines.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={bulkSkipDuplicates}
                    >
                      Skip {duplicateImportLines.length} duplicates
                    </Button>
                  ) : null}
                  {nonImportableLines.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={bulkSkipAllProblems}
                    >
                      Skip all problems ({nonImportableLines.length})
                    </Button>
                  ) : null}
                  {skippedProductIds.size > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={bulkClearSkipped}
                    >
                      Undo skips ({skippedProductIds.size})
                    </Button>
                  ) : null}
                </div>
                {unresolvedConflictLines.length > 0 ? (
                  <p className="text-[10px] text-muted-foreground">
                    Conflicts need a choice: skip (exclude), rename (new SKU), or
                    merge (link to existing product).
                  </p>
                ) : skippablePreviewLines.length > 0 ? (
                  <p className="text-[10px] text-muted-foreground">
                    Some rows cannot be imported as-is — skip them or resolve
                    individually below.
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="mt-3 space-y-3">
              {Array.from(selected.values()).map((p) => {
                const override = lineOverrides.get(p.id);
                const previewLine = previewByProductId.get(p.id);
                const isSkipped = skippedProductIds.has(p.id);
                const status = previewLine
                  ? adoptStatusPresentation(previewLine.status)
                  : isSkipped
                    ? { label: "Skipped", tone: "skip" as const }
                    : null;
                const conflictSku =
                  previewLine?.sku ??
                  override?.sku ??
                  p.skuTemplate ??
                  "";
                const showConflictActions =
                  isSkuConflictStatus(previewLine?.status) && !isSkipped;
                const globalCategory = meta?.categories.find((c) => c.id === p.globalCategoryId);
                const slugHint = globalCategory?.tenantCategorySlugHint?.trim();
                const suggestedCategoryId = slugHint
                  ? tenantCategories.find((category) => category.slug === slugHint)?.id ?? ""
                  : "";
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "rounded-lg border p-3",
                      (status?.tone === "skip" || isSkipped) && "opacity-70",
                      status?.tone === "error" && "border-destructive/40",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium">{p.name}</p>
                      {status ? (
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                            adoptStatusClassName(status.tone),
                          )}
                        >
                          {status.label}
                        </span>
                      ) : null}
                    </div>
                    {previewLine?.message ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">{previewLine.message}</p>
                    ) : null}
                    {showConflictActions ? (
                      <div className="mt-2 space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
                        <p className="text-[11px] font-medium text-amber-900 dark:text-amber-100">
                          SKU <span className="font-mono">{conflictSku}</span> is already
                          in your catalog. Choose what to do:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => markSkuConflictSkip(p.id)}
                          >
                            Skip
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() =>
                              markSkuConflictRename(p.id, conflictSku)
                            }
                          >
                            Rename
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => markSkuConflictMerge(p.id)}
                          >
                            Merge
                          </Button>
                          {previewLine?.itemId ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() =>
                                router.push(`/products?product=${previewLine.itemId}`)
                              }
                            >
                              View existing
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {override?.onSkuConflict === "merge" && !isSkipped ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Will link this catalog item to your existing product
                        {previewLine?.itemId ? (
                          <>
                            {" "}
                            <button
                              type="button"
                              className="font-medium text-primary underline-offset-2 hover:underline"
                              onClick={() =>
                                router.push(`/products?product=${previewLine.itemId}`)
                              }
                            >
                              (view)
                            </button>
                          </>
                        ) : null}
                        .
                      </p>
                    ) : null}
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground">SKU</label>
                        <Input
                          className="h-8 text-xs"
                          value={override?.sku ?? p.skuTemplate ?? ""}
                          onChange={(e) => updateOverride(p.id, { sku: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground">Category</label>
                        <select
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                          value={override?.categoryId ?? suggestedCategoryId}
                          onChange={(e) =>
                            updateOverride(p.id, {
                              categoryId: e.target.value || undefined,
                            })
                          }
                        >
                          <option value="">Uncategorized</option>
                          {tenantCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground">Buy price</label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={override?.buyingPrice ?? p.recommendedBuyingPrice ?? ""}
                          onChange={(e) => updateOverride(p.id, { buyingPrice: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground">Sell price</label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={override?.sellingPrice ?? p.recommendedSellingPrice ?? ""}
                          onChange={(e) => updateOverride(p.id, { sellingPrice: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground">Open stock</label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={override?.openingQty ?? ""}
                          onChange={(e) => updateOverride(p.id, { openingQty: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground">Reorder level</label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={override?.reorderLevel ?? p.defaultReorderLevel ?? ""}
                          onChange={(e) => updateOverride(p.id, { reorderLevel: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground">Reorder qty</label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={override?.reorderQty ?? p.defaultReorderQty ?? ""}
                          onChange={(e) => updateOverride(p.id, { reorderQty: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-muted-foreground">Min stock</label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={override?.minStockLevel ?? p.defaultMinStockLevel ?? ""}
                          onChange={(e) => updateOverride(p.id, { minStockLevel: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              className="mt-4 w-full"
              disabled={
                adopting ||
                previewLoading ||
                !canAdopt ||
                readyImportCount === 0 ||
                unresolvedConflictCount > 0
              }
              onClick={handleAdopt}
            >
              {adopting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <PackagePlus className="mr-2 size-4" />
              )}
              Import {readyImportCount > 0 ? readyImportCount : selected.size} products
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
