"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Package,
  PackagePlus,
  PenLine,
  Search,
  ShoppingCart,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { Input } from "@/components/ui/input";
import { useDashboard } from "@/components/dashboard-provider";
import {
  GlobalCatalogLoadMoreSkeleton,
  GlobalCatalogProductTableSkeleton,
} from "@/components/products/global-catalog-product-skeleton";
import { GlobalCatalogBuildPaths } from "@/components/products/global-catalog-build-paths";
import {
  GlobalCatalogActionProgressBar,
  type CatalogActionPhase,
} from "@/components/products/global-catalog-action-progress-bar";
import { GlobalCatalogReviewImportDialog } from "@/components/products/global-catalog-review-import-dialog";
import { useGlobalCatalogTenantSync } from "@/hooks/use-global-catalog-tenant-sync";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn, formatMoney } from "@/lib/utils";
import { isGlobalCatalogShellEmpty } from "@/lib/global-catalog-empty";
import { APP_ROUTES } from "@/lib/config";
import { flattenGlobalCategoriesForNav } from "@/lib/global-catalog-category-nav";
import {
  ApiRequestError,
  type GlobalCatalogAdoptLine,
  type GlobalCatalogAdoptProgress,
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
  previewGlobalCatalogReplace,
  previewGlobalCatalogRefresh,
  globalCatalogAdopt,
  refreshGlobalCatalog,
  replaceGlobalCatalog,
} from "@/lib/api";
import {
  allocateRenamedSkuAvoiding,
  isImportableAdoptStatus,
  isSkippablePreviewStatus,
  isUnresolvedSkuConflict,
  suggestRenamedSku,
} from "@/lib/global-catalog-sku-conflict";
import {
  getBusinessStoreTypes,
  isButcheryOnlyBusiness,
} from "@/lib/business-store-type";
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
    catalogCode?: string;
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
  const [importProgress, setImportProgress] =
    useState<GlobalCatalogAdoptProgress | null>(null);
  const [lineOverrides, setLineOverrides] = useState<Map<string, GlobalCatalogAdoptLine>>(new Map());
  const [skippedProductIds, setSkippedProductIds] = useState<Set<string>>(new Set());
  const [hideImported, setHideImported] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tenantCategories, setTenantCategories] = useState<CategoryRecord[]>([]);
  const [previewResult, setPreviewResult] = useState<GlobalCatalogAdoptResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [refreshOpen, setRefreshOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSell, setRefreshSell] = useState(true);
  const [refreshBuy, setRefreshBuy] = useState(false);
  const [refreshImage, setRefreshImage] = useState(true);
  const [skipCustomSell, setSkipCustomSell] = useState(false);
  const [createMissingCategories, setCreateMissingCategories] = useState(
    () => searchParams.get("from") === "onboarding",
  );
  const [replacing, setReplacing] = useState(false);
  const [actionPhase, setActionPhase] = useState<CatalogActionPhase>("ready");

  const fromOnboarding = searchParams.get("from") === "onboarding";
  const packIdFromUrl = searchParams.get("packId");

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const syncingRef = useRef(false);
  const selectedPackIdRef = useRef<string | null>(null);
  const productsCountRef = useRef(0);
  /** Pack id the current `products` list belongs to (null = browse-all). */
  const productsSourcePackIdRef = useRef<string | null>(null);
  /** Last pack we auto-selected rows for (onboarding only). */
  const autoSelectedForPackIdRef = useRef<string | null>(null);
  /** Bumped to cancel an in-flight progressive auto-select. */
  const selectGenerationRef = useRef(0);

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

  const storeTypes = useMemo(() => getBusinessStoreTypes(business), [business]);

  const orderedPacks = useMemo(() => {
    const packs = meta?.packs ?? [];
    if (packs.length === 0) {
      return packs;
    }
    const preferred = new Set<string>(storeTypes);
    return [...packs].sort((a, b) => {
      const aReady = a.productCount > 0 ? 0 : 1;
      const bReady = b.productCount > 0 ? 0 : 1;
      if (aReady !== bReady) return aReady - bReady;
      const aMatch = a.storeKitId && preferred.has(a.storeKitId) ? 0 : 1;
      const bMatch = b.storeKitId && preferred.has(b.storeKitId) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.sortOrder - b.sortOrder;
    });
  }, [meta?.packs, storeTypes]);

  const readyPacks = useMemo(
    () => orderedPacks.filter((p) => p.productCount > 0),
    [orderedPacks],
  );
  const comingSoonPacks = useMemo(
    () => orderedPacks.filter((p) => p.productCount <= 0),
    [orderedPacks],
  );
  const selectedPack = useMemo(
    () => orderedPacks.find((p) => p.id === selectedPackId) ?? null,
    [orderedPacks, selectedPackId],
  );
  const selectedPackEmpty = !!selectedPack && selectedPack.productCount <= 0;
  const suggestedReadyPack = readyPacks[0] ?? null;
  const categoryNavNodes = useMemo(
    () => flattenGlobalCategoriesForNav(meta?.categories ?? []),
    [meta?.categories],
  );

  const autoPickedPackRef = useRef(false);
  useEffect(() => {
    if (autoPickedPackRef.current || !meta || initialLoading) return;
    if (selectedPackId != null) return;

    if (packIdFromUrl) {
      const fromUrl = orderedPacks.find((p) => p.id === packIdFromUrl);
      if (fromUrl && fromUrl.productCount > 0) {
        autoPickedPackRef.current = true;
        setSelectedPackId(fromUrl.id);
        return;
      }
    }

    if (!fromOnboarding) return;
    const pick =
      readyPacks.find(
        (p) => !!p.storeKitId && storeTypes.some((t) => t === p.storeKitId),
      ) ?? readyPacks[0];
    if (!pick) return;
    autoPickedPackRef.current = true;
    setSelectedPackId(pick.id);
  }, [
    meta,
    initialLoading,
    selectedPackId,
    readyPacks,
    orderedPacks,
    storeTypes,
    fromOnboarding,
    packIdFromUrl,
  ]);

  // Auto-select every importable product in the starter pack once it has loaded.
  // Wait until `products` belongs to `selectedPackId` — otherwise we latch onto
  // the previous browse page (often 50 rows) and leave pack checkboxes empty.
  // Select in batches so the progress bar can show items being marked to sell.
  useEffect(() => {
    if (!fromOnboarding || !selectedPackId || initialLoading) return;
    if (productsSourcePackIdRef.current !== selectedPackId) return;
    if (autoSelectedForPackIdRef.current === selectedPackId) return;
    const importable = products.filter((p) => !p.alreadyImported);
    if (importable.length === 0) return;

    autoSelectedForPackIdRef.current = selectedPackId;
    const generation = ++selectGenerationRef.current;
    setActionPhase("selecting");
    setSelected(new Map());

    let index = 0;
    const batchSize = Math.max(1, Math.ceil(importable.length / 24));
    const selectedSoFar = new Map<string, GlobalProductRecord>();
    let cancelled = false;

    const tick = () => {
      if (cancelled || generation !== selectGenerationRef.current) return;
      const end = Math.min(index + batchSize, importable.length);
      for (; index < end; index += 1) {
        const product = importable[index];
        selectedSoFar.set(product.id, product);
      }
      setSelected(new Map(selectedSoFar));
      if (index >= importable.length) {
        setActionPhase("ready");
        return;
      }
      window.setTimeout(tick, 28);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [fromOnboarding, selectedPackId, initialLoading, products]);

  useEffect(() => {
    if (adopting) {
      setActionPhase("importing");
      return;
    }
    if (reviewOpen) {
      setActionPhase("reviewing");
      return;
    }
    setActionPhase((prev) => {
      if (prev === "reviewing" || prev === "importing") {
        return "ready";
      }
      return prev;
    });
    if (!fromOnboarding || !selectedPackId) return;
    if (autoSelectedForPackIdRef.current === selectedPackId) return;
    if (
      initialLoading ||
      productsSourcePackIdRef.current !== selectedPackId
    ) {
      setActionPhase("loading");
    }
  }, [
    adopting,
    reviewOpen,
    fromOnboarding,
    selectedPackId,
    initialLoading,
    products,
  ]);

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
          if (reset) {
            productsSourcePackIdRef.current = null;
          }
          const pack = await fetchGlobalCatalogPack(packId, {
            onlyNotImported: hideImported,
          });
          productsSourcePackIdRef.current = packId;
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

        if (reset) {
          productsSourcePackIdRef.current = null;
        }
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
        productsSourcePackIdRef.current = selectedPackId;
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
        if (p.alreadyImported) continue;
        next.set(p.id, p);
      }
      return next;
    });
  };

  const selectedImportable = useMemo(
    () => Array.from(selected.values()).filter((p) => !p.alreadyImported),
    [selected],
  );
  const selectedImported = useMemo(
    () => Array.from(selected.values()).filter((p) => p.alreadyImported),
    [selected],
  );

  const clearSelection = () => {
    selectGenerationRef.current += 1;
    setSelected(new Map());
    setSkippedProductIds(new Set());
    setActionPhase("ready");
  };

  const updateOverride = (productId: string, patch: Partial<GlobalCatalogAdoptLine>) => {
    setLineOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId) ?? { globalProductId: productId };
      next.set(productId, { ...existing, ...patch });
      return next;
    });
  };

  const applyBulkDefaults = (patch: Partial<GlobalCatalogAdoptLine>) => {
    if (Object.keys(patch).length === 0) return;
    const targets = selectedImportable.filter((product) => !skippedProductIds.has(product.id));
    if (targets.length === 0) return;
    setLineOverrides((prev) => {
      const next = new Map(prev);
      for (const product of targets) {
        const existing = next.get(product.id) ?? { globalProductId: product.id };
        next.set(product.id, { ...existing, ...patch });
      }
      return next;
    });
    toast.success(`Applied defaults to ${targets.length} products`);
  };

  const skipSingleProduct = (productId: string) => {
    setSkippedProductIds((prev) => new Set(prev).add(productId));
    setLineOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId) ?? { globalProductId: productId };
      next.set(productId, { ...existing, onSkuConflict: "skip" });
      return next;
    });
  };

  const unskipSingleProduct = (productId: string) => {
    setSkippedProductIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    setLineOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId);
      if (!existing) return prev;
      next.set(productId, { ...existing, onSkuConflict: undefined });
      return next;
    });
  };

  const buildLines = useCallback((): GlobalCatalogAdoptLine[] => {
    return selectedImportable
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
  }, [selectedImportable, skippedProductIds, lineOverrides, meta?.categories, tenantCategories]);

  const runPreview = useCallback(async () => {
    if (selectedImportable.length === 0) {
      setPreviewResult(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const result = await previewGlobalCatalogAdopt(buildLines(), {
        createMissingCategories,
      });
      setPreviewResult(result);
    } catch {
      toast.error("Could not preview import");
      setPreviewResult(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [buildLines, selectedImportable.length, createMissingCategories]);

  useEffect(() => {
    if (!reviewOpen) {
      setPreviewResult(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void runPreview();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [reviewOpen, runPreview, lineOverrides, selectedImportable, skippedProductIds, createMissingCategories]);

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
    if (selectedImportable.length === 0) {
      toast.error("Select products that are not already in your catalog.");
      return;
    }
    setReviewOpen(true);
  };

  const handleRefreshFromTemplate = async () => {
    if (!defaultBranchId) {
      toast.error("No branch selected");
      return;
    }
    if (selectedImported.length === 0) {
      toast.error("Select products already in your catalog (uncheck Hide already in catalog).");
      return;
    }
    if (!refreshSell && !refreshBuy && !refreshImage) {
      toast.error("Choose at least one update: sell, buy, or image.");
      return;
    }
    setRefreshing(true);
    try {
      const body = {
        branchId: defaultBranchId,
        globalProductIds: selectedImported.map((p) => p.id),
        refreshSellingPrice: refreshSell,
        refreshBuyingPrice: refreshBuy,
        refreshImage,
        skipCustomizedSellingPrice: skipCustomSell,
      };
      const preview = await previewGlobalCatalogRefresh(body);
      if (preview.updatedCount === 0) {
        toast.message("Nothing to update", {
          description: preview.lines[0]?.message ?? "All selected products were skipped.",
        });
        setRefreshOpen(false);
        return;
      }
      const confirmed = window.confirm(
        `Apply catalog template updates to ${preview.updatedCount} product${preview.updatedCount === 1 ? "" : "s"}?\n\n` +
          `${preview.skippedCount} will be skipped.`,
      );
      if (!confirmed) return;
      const result = await refreshGlobalCatalog(body);
      toast.success(
        `Updated ${result.updatedCount} · skipped ${result.skippedCount}`,
      );
      setRefreshOpen(false);
      clearSelection();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAdopt = async () => {
    if (!defaultBranchId) {
      toast.error("No branch selected");
      return;
    }
    try {
      const lines = buildLines();
      const preview =
        previewResult ??
        (await previewGlobalCatalogAdopt(lines, { createMissingCategories }));
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
        isUnresolvedSkuConflict(
          line.status,
          lineOverrides.get(line.globalProductId)?.onSkuConflict,
          skippedProductIds.has(line.globalProductId),
        ),
      ).length;
      if (stillUnresolved > 0) {
        toast.error("Resolve SKU conflicts (skip, rename, or merge) before importing.");
        setPreviewResult(preview);
        return;
      }

      setAdopting(true);
      setImportProgress({
        phase: "importing",
        processed: 0,
        total: Math.max(lines.length, 1),
        percent: 4,
        message: "Importing…",
      });

      const result = await globalCatalogAdopt(defaultBranchId, lines, {
        createMissingCategories,
        packId: selectedPackId,
        onProgress: setImportProgress,
      });
      const importedNew = result.lines.filter((l) => l.status === "imported").length;
      const mergedCount = result.lines.filter((l) => l.status === "merged").length;
      const skuSkipped = result.lines.filter((l) => l.status === "skip_sku_conflict").length;
      if (importedNew === 0 && mergedCount === 0) {
        toast.error(
          skuSkipped > 0
            ? "Import blocked by SKU conflicts — use skip, rename, or merge in the review dialog."
            : "No products were imported.",
        );
        setPreviewResult(result);
        return;
      }
      setImportProgress({
        phase: "finishing",
        processed: lines.length,
        total: Math.max(lines.length, 1),
        percent: 100,
        message: "Import complete",
      });
      setActionPhase("done");
      await new Promise((resolve) => window.setTimeout(resolve, 650));
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
      try {
        await loadTenantCategories();
      } catch {
        /* ignore */
      }
      if (fromOnboarding) {
        toast.message(
          `${importedNew + mergedCount} products ready in your catalog`,
        );
        router.replace(
          isButcheryOnlyBusiness(business)
            ? APP_ROUTES.butcher
            : APP_ROUTES.business,
        );
        return;
      }
      void fetchProducts({
        reset: true,
        page: 0,
        categoryId: selectedCategoryId,
        packId: selectedPackId,
      });
    } catch (e) {
      if (!(e instanceof ApiRequestError)) {
        toast.error("Adopt failed");
      }
    } finally {
      setAdopting(false);
      setImportProgress(null);
    }
  };

  const handleReplaceWithPack = async () => {
    if (!canAdopt || !selectedPackId || !defaultBranchId || replacing) return;
    const packName =
      orderedPacks.find((p) => p.id === selectedPackId)?.name ?? "this starter pack";
    try {
      const eligibility = await previewGlobalCatalogReplace(selectedPackId);
      if (!eligibility.eligible) {
        toast.error(eligibility.blockReason || "Cannot replace catalogue for this shop.");
        return;
      }
      const confirmed = window.confirm(
        `Replace your product catalogue with “${packName}”?\n\n` +
          `This soft-deletes ${eligibility.activeItemCount} current product(s) and imports ${eligibility.packProductCount} pack product(s). ` +
          `Only empty shops (no sales, no stock) can do this.`,
      );
      if (!confirmed) return;
      setReplacing(true);
      const result = await replaceGlobalCatalog(defaultBranchId, selectedPackId);
      toast.success(
        `Replaced catalogue: removed ${result.softDeletedCount}, imported ${result.adopt.importedCount}`,
      );
      if (result.adopt.skippedCount > 0) {
        toast.info(`${result.adopt.skippedCount} pack products skipped`);
      }
      setSelected(new Map());
      void fetchProducts({
        reset: true,
        page: 0,
        categoryId: selectedCategoryId,
        packId: selectedPackId,
      });
    } catch (e) {
      if (!(e instanceof ApiRequestError)) {
        toast.error("Replace catalogue failed");
      }
    } finally {
      setReplacing(false);
    }
  };

  const currency = business?.currency?.trim() || "KES";
  const isSearching = searchInput !== debouncedSearch;
  const showEmptyState = !initialLoading && products.length === 0;
  const catalogShellEmpty =
    showEmptyState &&
    isGlobalCatalogShellEmpty({
      meta,
      productCount: products.length,
      totalElements,
      search: debouncedSearch,
      categoryId: selectedCategoryId,
      packId: selectedPackId,
    });
  const loadedLabel =
    totalElements != null && totalElements > products.length
      ? `${products.length} of ${totalElements}`
      : `${products.length}`;

  const searchInputRef = useRef<HTMLInputElement>(null);

  const goCreateFromScratch = useCallback(() => {
    router.push(`${APP_ROUTES.products}?onboarding=create-product`);
  }, [router]);

  const goSuggestedPack = useCallback(() => {
    if (suggestedReadyPack) {
      setSelectedCategoryId(null);
      setSelectedPackId(suggestedReadyPack.id);
      return;
    }
    setSelectedPackId(null);
    setSelectedCategoryId(null);
  }, [suggestedReadyPack]);

  const goBrowseAll = useCallback(() => {
    setSelectedPackId(null);
    setSelectedCategoryId(null);
    setSearchInput("");
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const onboardingToastRef = useRef(false);
  useEffect(() => {
    if (!fromOnboarding) return;
    if (initialLoading) return;
    if (onboardingToastRef.current) return;
    if (catalogShellEmpty) {
      onboardingToastRef.current = true;
      toast.message(
        "No starter products for your country yet — add products manually or check back soon.",
      );
      return;
    }
    // Wait for pack auto-pick before toasting so the message matches the pack.
    if (!selectedPack && readyPacks.length > 0) return;
    onboardingToastRef.current = true;
    if (selectedPack) {
      toast.message(
        `${selectedPack.name} is ready — all items are selected to sell. Review prices, then import.`,
      );
      return;
    }
    toast.message(
      "Pick a starter pack to import ready-made products, or select items below.",
    );
  }, [
    fromOnboarding,
    initialLoading,
    catalogShellEmpty,
    selectedPack,
    readyPacks.length,
  ]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <header className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/products")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">
              {fromOnboarding ? "Import products we already have" : "Stock your shelves"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {fromOnboarding ? (
                <>
                  These are ready-made products with barcodes and prices. Everything
                  in the pack is selected to sell — uncheck anything you don&apos;t
                  carry, then press{" "}
                  <span className="font-medium text-foreground">Review &amp; import</span>.
                </>
              ) : (
                <>
                  Import ready-made products with barcodes and prices, then press{" "}
                  <span className="font-medium text-foreground">Review &amp; import</span>.
                </>
              )}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground/80">
              <ActiveScopeSubtitle className="text-[11px]" />
              {meta?.catalogName ? (
                <span>
                  · {meta.catalogName}
                  {meta.catalogCode ? (
                    <span className="ml-1 font-mono opacity-80">
                      ({meta.catalogCode})
                    </span>
                  ) : null}
                </span>
              ) : null}
              {!initialLoading && products.length > 0 ? (
                <span className="tabular-nums opacity-70">
                  · {loadedLabel} shown
                </span>
              ) : null}
              {syncing ? (
                <span className="inline-flex items-center gap-1 text-primary/80">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  Updating…
                </span>
              ) : null}
            </div>
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
            variant="outline"
            className="gap-1.5"
            onClick={goCreateFromScratch}
          >
            <PenLine className="size-3.5" />
            <span className="hidden sm:inline">Add your own product</span>
            <span className="sm:hidden">Add own</span>
          </Button>
          {selectedPackId && canAdopt ? (
            <Button
              size="sm"
              variant="outline"
              disabled={replacing || !defaultBranchId || selectedPackEmpty}
              title={
                selectedPackEmpty
                  ? "This pack has no products yet"
                  : "Replace your catalogue with this pack (empty shops only)"
              }
              onClick={() => void handleReplaceWithPack()}
            >
              {replacing ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <PackagePlus className="mr-1.5 size-4" />
              )}
              Replace with pack
            </Button>
          ) : null}
          {selectedImported.length > 0 && canAdopt ? (
            <Button
              size="sm"
              variant="outline"
              disabled={!defaultBranchId}
              onClick={() => setRefreshOpen(true)}
            >
              Refresh from template
            </Button>
          ) : null}
          <Button
            size="sm"
            disabled={selectedImportable.length === 0 || !canAdopt}
            title={
              selectedImportable.length === 0
                ? "Select products below to enable import"
                : undefined
            }
            onClick={handlePreview}
          >
            <ShoppingCart className="mr-1.5 size-4" />
            Review & import
            {selectedImportable.length > 0
              ? ` (${selectedImportable.length})`
              : ""}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 flex-col border-r bg-muted/20 lg:flex">
          <div className="flex-1 overflow-auto p-3">
            <div className="mb-4">
              <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Package className="size-3.5" /> Starter packs
              </h3>
              <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
                Bundles of products shops like yours already sell. Open one to
                import them in a click.
              </p>
              <div className="space-y-1">
                {readyPacks.map((pack) => {
                  const recommended =
                    !!pack.storeKitId &&
                    storeTypes.some((t) => t === pack.storeKitId);
                  const active = selectedPackId === pack.id;
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(null);
                        setSelectedPackId(pack.id === selectedPackId ? null : pack.id);
                      }}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-foreground shadow-sm"
                          : "border-transparent hover:border-border hover:bg-muted/60",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">
                          {pack.name}
                        </span>
                        {recommended ? (
                          <span className="mt-0.5 inline-flex rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-medium text-primary">
                            Matches your shop
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] tabular-nums",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {pack.productCount}
                      </span>
                    </button>
                  );
                })}
              </div>
              {comingSoonPacks.length > 0 ? (
                <div className="mt-3 space-y-1">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Coming soon
                  </p>
                  {comingSoonPacks.map((pack) => {
                    const active = selectedPackId === pack.id;
                    return (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(null);
                          setSelectedPackId(pack.id === selectedPackId ? null : pack.id);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors",
                          active
                            ? "bg-muted text-foreground"
                            : "hover:bg-muted/50",
                        )}
                      >
                        <span className="truncate">{pack.name}</span>
                        <span className="shrink-0 text-[10px] opacity-70">0</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="my-3 border-t" />

            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <BookOpen className="size-3.5" /> Browse by category
              </h3>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPackId(null);
                    setSelectedCategoryId(null);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                    selectedCategoryId === null && selectedPackId === null
                      ? "bg-primary/10 font-medium text-foreground ring-1 ring-primary/30"
                      : "hover:bg-muted",
                  )}
                >
                  <Store className="size-3.5" /> All products
                </button>
                {categoryNavNodes.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedPackId(null);
                      setSelectedCategoryId(
                        cat.id === selectedCategoryId ? null : cat.id,
                      );
                    }}
                    style={{ paddingLeft: `${0.625 + cat.depth * 0.75}rem` }}
                    className={cn(
                      "w-full rounded-lg py-1.5 pr-2.5 text-left text-xs transition-colors",
                      selectedCategoryId === cat.id
                        ? "bg-primary/10 font-medium text-foreground ring-1 ring-primary/30"
                        : "hover:bg-muted",
                      cat.depth > 0 && "text-muted-foreground",
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
          <div className="flex shrink-0 flex-col gap-2 border-b bg-card/40 p-3">
            {selectedPack || selectedCategoryId ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Viewing</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 font-medium">
                  {selectedPack ? (
                    <>
                      <Package className="size-3.5 text-primary" />
                      {selectedPack.name}
                      {selectedPackEmpty ? (
                        <span className="rounded bg-amber-500/15 px-1.5 py-px text-[10px] font-medium text-amber-800 dark:text-amber-200">
                          Empty
                        </span>
                      ) : (
                        <span className="tabular-nums text-muted-foreground">
                          {selectedPack.productCount}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <BookOpen className="size-3.5 text-primary" />
                      {meta?.categories.find((c) => c.id === selectedCategoryId)
                        ?.name ?? "Category"}
                    </>
                  )}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() => {
                    setSelectedPackId(null);
                    setSelectedCategoryId(null);
                  }}
                >
                  Clear filter
                </button>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className={cn(
                  "absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-opacity",
                  isSearching && "opacity-40"
                )}
              />
              <Input
                ref={searchInputRef}
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
              Hide items you already have
            </label>
            {selected.size > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={products.every((p) => p.alreadyImported)}
              onClick={selectAllVisible}
            >
              {fromOnboarding ? "Select all to sell" : "Select all"}
            </Button>
            </div>
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
                        onClick={() => toggleProduct(p)}
                        className={cn(
                          "cursor-pointer border-b transition-colors hover:bg-muted/40 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300",
                          p.alreadyImported && "opacity-50",
                          selected.has(p.id) && "bg-primary/5 hover:bg-primary/10"
                        )}
                        style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
                      >
                        <td className="py-2 pl-3">
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            disabled={false}
                            onChange={() => toggleProduct(p)}
                            onClick={(e) => e.stopPropagation()}
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/products?product=${p.adoptedItemId}`);
                                      }}
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
              <div className="flex flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
                {catalogShellEmpty ? (
                  <div className="w-full text-center">
                    <GlobalCatalogBuildPaths
                      suggestedPackName={suggestedReadyPack?.name}
                      onScratch={goCreateFromScratch}
                      onPack={goSuggestedPack}
                      onBrowse={goBrowseAll}
                    />
                    <p className="mt-6 text-[11px] text-muted-foreground">
                      {meta?.catalogName
                        ? `${meta.catalogName} is still light on templates`
                        : "Regional templates are still landing"}
                      — creating from scratch always works.
                    </p>
                  </div>
                ) : selectedPackEmpty ? (
                  <div className="w-full max-w-2xl text-center">
                    <p className="text-sm font-semibold">
                      {selectedPack?.name ?? "This pack"} isn’t stocked yet
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                      Products for this pack are on the way. Meanwhile, add your
                      own product or pick another pack.
                    </p>
                    <div className="mt-6">
                      <GlobalCatalogBuildPaths
                        compact
                        suggestedPackName={suggestedReadyPack?.name}
                        onScratch={goCreateFromScratch}
                        onPack={goSuggestedPack}
                        onBrowse={goBrowseAll}
                      />
                    </div>
                  </div>
                ) : debouncedSearch ? (
                  <div className="w-full max-w-lg text-center">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border bg-muted/40">
                      <Search className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold">
                      No luck for &ldquo;{debouncedSearch}&rdquo;
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Not every product is in the catalog yet. Add it yourself,
                      or try a different search.
                    </p>
                    <div className="mt-5">
                      <GlobalCatalogBuildPaths
                        compact
                        suggestedPackName={suggestedReadyPack?.name}
                        onScratch={goCreateFromScratch}
                        onPack={goSuggestedPack}
                        onBrowse={() => {
                          setSearchInput("");
                          goBrowseAll();
                        }}
                      />
                    </div>
                  </div>
                ) : hideImported ? (
                  <div className="w-full max-w-lg text-center">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border bg-muted/40">
                      <Package className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold">
                      Everything here is already on your shelves
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Nice progress. Show what you&apos;ve imported, try another
                      pack, or add a new product.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setHideImported(false)}
                      >
                        Show imported products
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={goCreateFromScratch}
                      >
                        <PenLine className="size-3.5" />
                        Add from scratch
                      </Button>
                      {suggestedReadyPack &&
                      suggestedReadyPack.id !== selectedPackId ? (
                        <Button size="sm" variant="ghost" onClick={goSuggestedPack}>
                          Try {suggestedReadyPack.name}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <GlobalCatalogBuildPaths
                    suggestedPackName={suggestedReadyPack?.name}
                    onScratch={goCreateFromScratch}
                    onPack={goSuggestedPack}
                    onBrowse={goBrowseAll}
                  />
                )}
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
              <p className="pb-20 pt-2 text-center text-[11px] text-muted-foreground/50">
                You&apos;ve reached the end · {products.length} product
                {products.length === 1 ? "" : "s"}
              </p>
            ) : !showEmptyState && !initialLoading ? (
              <div className="h-16" aria-hidden />
            ) : null}
          </div>

          {(!showEmptyState && !initialLoading) ||
          actionPhase === "loading" ||
          actionPhase === "selecting" ||
          actionPhase === "importing" ||
          actionPhase === "done" ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
              {selected.size > 0 ||
              actionPhase === "loading" ||
              actionPhase === "selecting" ||
              actionPhase === "reviewing" ||
              actionPhase === "importing" ||
              actionPhase === "done" ? (
                <GlobalCatalogActionProgressBar
                  phase={actionPhase}
                  selectedCount={selectedImportable.length}
                  totalCount={
                    selectedPack && !selectedPackEmpty
                      ? Math.max(
                          selectedPack.productCount,
                          products.filter((p) => !p.alreadyImported).length,
                        )
                      : Math.max(
                          products.filter((p) => !p.alreadyImported).length,
                          selectedImportable.length,
                        )
                  }
                  importProgress={importProgress}
                  canImport={selectedImportable.length > 0 && canAdopt}
                  onReview={handlePreview}
                  onClear={clearSelection}
                  className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-400"
                />
              ) : (
                <div className="pointer-events-auto flex max-w-xl items-center gap-2 rounded-full border border-border/80 bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-400">
                  <span className="hidden pl-2 text-[11px] text-muted-foreground sm:inline">
                    Can&apos;t find a product?
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 rounded-full"
                    onClick={goCreateFromScratch}
                  >
                    <PenLine className="size-3.5" />
                    Add your own
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-full text-xs"
                    onClick={goBrowseAll}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>

      <Dialog open={refreshOpen} onOpenChange={setRefreshOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Refresh from template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Apply latest catalog recommendations to {selectedImported.length} product
              {selectedImported.length === 1 ? "" : "s"} already in your shop. Nothing changes
              until you confirm.
            </p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 rounded border"
                checked={refreshSell}
                onChange={(e) => setRefreshSell(e.target.checked)}
              />
              Update selling prices
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 rounded border"
                checked={refreshBuy}
                onChange={(e) => setRefreshBuy(e.target.checked)}
              />
              Update buying prices
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 rounded border"
                checked={refreshImage}
                onChange={(e) => setRefreshImage(e.target.checked)}
              />
              Fill missing product images
            </label>
            <label className="flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border"
                checked={skipCustomSell}
                onChange={(e) => setSkipCustomSell(e.target.checked)}
                disabled={!refreshSell}
              />
              Skip products with customized sell prices
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRefreshOpen(false)} disabled={refreshing}>
                Cancel
              </Button>
              <Button disabled={refreshing} onClick={() => void handleRefreshFromTemplate()}>
                {refreshing ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                Preview & apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <GlobalCatalogReviewImportDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        products={selectedImportable}
        branchName={
          branches.find((b) => b.id === defaultBranchId)?.name ?? "default branch"
        }
        currency={meta?.currency}
        tenantCategories={tenantCategories}
        metaCategories={meta?.categories ?? []}
        lineOverrides={lineOverrides}
        skippedProductIds={skippedProductIds}
        previewResult={previewResult}
        previewLoading={previewLoading}
        readyImportCount={readyImportCount}
        createMissingCategories={createMissingCategories}
        onCreateMissingCategoriesChange={setCreateMissingCategories}
        adopting={adopting}
        importProgress={importProgress}
        canAdopt={canAdopt}
        unresolvedConflictCount={unresolvedConflictCount}
        unresolvedConflictLines={unresolvedConflictLines}
        duplicateImportLines={duplicateImportLines}
        nonImportableLines={nonImportableLines}
        skippablePreviewLines={skippablePreviewLines}
        onUpdateOverride={updateOverride}
        onApplyBulkDefaults={applyBulkDefaults}
        onMarkSkuConflictSkip={markSkuConflictSkip}
        onMarkSkuConflictRename={markSkuConflictRename}
        onMarkSkuConflictMerge={markSkuConflictMerge}
        onSkipProduct={skipSingleProduct}
        onUnskipProduct={unskipSingleProduct}
        onBulkSkipSkuConflicts={bulkSkipSkuConflicts}
        onBulkRenameSkuConflicts={bulkRenameSkuConflicts}
        onBulkMergeSkuConflicts={bulkMergeSkuConflicts}
        onBulkSkipDuplicates={bulkSkipDuplicates}
        onBulkSkipAllProblems={bulkSkipAllProblems}
        onBulkClearSkipped={bulkClearSkipped}
        onImport={handleAdopt}
        onViewExisting={(itemId) => router.push(`/products?product=${itemId}`)}
      />
    </div>
  );
}
