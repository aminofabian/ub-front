"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { toast } from "sonner";

import {
  OnboardingCatalogShelf,
  type CatalogParentFilter,
} from "@/components/onboarding/onboarding-catalog-shelf";
import {
  fetchGlobalCatalogMeta,
  fetchGlobalCatalogPack,
  fetchAllGlobalCatalogProducts,
  globalCatalogAdopt,
  previewGlobalCatalogAdopt,
  type GlobalCatalogAdoptLine,
  type GlobalCatalogAdoptProgress,
  type GlobalCatalogMetaRecord,
  type GlobalProductRecord,
} from "@/lib/api";
import { pickSuggestedOnboardingPack } from "@/lib/onboarding-suggested-pack";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedPackId?: string | null;
  storeTypes: readonly string[];
  openingBranchId: string;
  currency?: string | null;
  canAdopt: boolean;
  onSuccess: (importedCount: number) => void;
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function buildAdoptLines(
  products: GlobalProductRecord[],
  webPublished: boolean,
): GlobalCatalogAdoptLine[] {
  return products.map((p) => ({
    globalProductId: p.id,
    sku: p.skuTemplate ?? undefined,
    sellingPrice: p.recommendedSellingPrice ?? undefined,
    buyingPrice: p.recommendedBuyingPrice ?? undefined,
    openingUnitCost: p.recommendedBuyingPrice ?? undefined,
    reorderLevel: p.defaultReorderLevel ?? undefined,
    reorderQty: p.defaultReorderQty ?? undefined,
    minStockLevel: p.defaultMinStockLevel ?? undefined,
    webPublished,
  }));
}

export function OnboardingCatalogDrawer({
  open,
  onOpenChange,
  suggestedPackId = null,
  storeTypes,
  openingBranchId,
  currency = "KES",
  canAdopt,
  onSuccess,
}: Props) {
  const [meta, setMeta] = useState<GlobalCatalogMetaRecord | null>(null);
  const [packProducts, setPackProducts] = useState<GlobalProductRecord[]>([]);
  const [packFilter, setPackFilter] = useState<{
    packId: string;
    packName: string;
  } | null>(null);
  const [parentFilter, setParentFilter] = useState<CatalogParentFilter>({
    kind: "all",
  });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [browseProducts, setBrowseProducts] = useState<GlobalProductRecord[]>(
    [],
  );
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browseLoadLabel, setBrowseLoadLabel] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, GlobalProductRecord>>(
    () => new Map(),
  );
  const [storefrontVisible, setStorefrontVisible] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingShelf, setLoadingShelf] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] =
    useState<GlobalCatalogAdoptProgress | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileManifestOpen, setMobileManifestOpen] = useState(false);
  const seededPackIdRef = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset / load when opened
  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    seededPackIdRef.current = null;
    setSelected(new Map());
    setSearch("");
    setStorefrontVisible(true);
    setErrorMessage(null);
    setImportProgress(null);
    setImportNotice(null);
    setMobileManifestOpen(false);
    setLoadingMeta(true);

    void (async () => {
      try {
        const nextMeta = await fetchGlobalCatalogMeta();
        if (cancelled) return;
        setMeta(nextMeta);

        const preferred =
          (suggestedPackId
            ? nextMeta.packs.find((p) => p.id === suggestedPackId)
            : null) ?? pickSuggestedOnboardingPack(nextMeta.packs, storeTypes);

        if (!preferred) {
          setPackFilter(null);
          setPackProducts([]);
          setParentFilter({ kind: "all" });
          return;
        }

        setPackFilter({ packId: preferred.id, packName: preferred.name });
        setParentFilter({
          kind: "pack",
          packId: preferred.id,
          packName: preferred.name,
        });

        try {
          const detail = await fetchGlobalCatalogPack(preferred.id, {
            onlyNotImported: true,
          });
          if (cancelled) return;
          const importable = detail.products.filter((p) => !p.alreadyImported);
          setPackProducts(importable);
          if (seededPackIdRef.current !== preferred.id) {
            seededPackIdRef.current = preferred.id;
            setSelected(new Map(importable.map((p) => [p.id, p])));
          }
        } catch {
          if (!cancelled) {
            setPackProducts([]);
          }
        }
      } catch {
        if (!cancelled) {
          setMeta(null);
          setErrorMessage("Could not load the product catalogue.");
        }
      } finally {
        if (!cancelled) {
          setLoadingMeta(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, suggestedPackId, storeTypes]);

  // Browse products for All / category (+ search overrides pack view)
  useEffect(() => {
    if (!open || !meta) {
      return;
    }

    const usePackShelf =
      parentFilter.kind === "pack" && !debouncedSearch.trim();

    if (usePackShelf) {
      setBrowseProducts([]);
      setBrowseTotal(0);
      setBrowseLoadLabel(null);
      setLoadingShelf(false);
      return;
    }

    let cancelled = false;
    const signal = { cancelled: false };
    setLoadingShelf(true);
    setBrowseLoadLabel("Loading products…");
    void (async () => {
      try {
        const products = await fetchAllGlobalCatalogProducts(
          {
            categoryId:
              parentFilter.kind === "category"
                ? parentFilter.categoryId
                : null,
            q: debouncedSearch.trim() || null,
            onlyNotImported: true,
          },
          {
            pageSize: 200,
            signal,
            onProgress: (loaded, total) => {
              if (cancelled) return;
              setBrowseLoadLabel(
                total > 0
                  ? `Loading ${loaded} of ${total}…`
                  : `Loading ${loaded}…`,
              );
            },
          },
        );
        if (!cancelled) {
          setBrowseProducts(products);
          setBrowseTotal(products.length);
          setBrowseLoadLabel(null);
        }
      } catch {
        if (!cancelled) {
          setBrowseProducts([]);
          setBrowseTotal(0);
          setBrowseLoadLabel(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingShelf(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      signal.cancelled = true;
    };
  }, [open, meta, parentFilter, debouncedSearch]);

  const shelfProducts = useMemo(() => {
    if (parentFilter.kind === "pack" && !debouncedSearch.trim()) {
      return packProducts;
    }
    return browseProducts;
  }, [parentFilter, debouncedSearch, packProducts, browseProducts]);

  const shelfSelectable = useMemo(
    () => shelfProducts.filter((p) => !p.alreadyImported),
    [shelfProducts],
  );

  const allShelfSelected =
    shelfSelectable.length > 0 &&
    shelfSelectable.every((p) => selected.has(p.id));

  const shelfCountLabel = useMemo(() => {
    const count =
      parentFilter.kind === "pack" && !debouncedSearch.trim()
        ? shelfProducts.length
        : browseTotal || shelfProducts.length;
    if (parentFilter.kind === "pack" && !debouncedSearch.trim()) {
      return `Shelf ${count}${packFilter ? ` · ${packFilter.packName}` : ""}`;
    }
    if (parentFilter.kind === "category") {
      const name =
        meta?.categories.find((c) => c.id === parentFilter.categoryId)?.name ??
        "Category";
      return `Shelf ${count} · ${name}`;
    }
    return `Shelf ${count}`;
  }, [
    parentFilter,
    debouncedSearch,
    shelfProducts.length,
    browseTotal,
    packFilter,
    meta,
  ]);

  const parentCategories = useMemo(() => {
    const all = [...(meta?.categories ?? [])].sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name),
    );
    const roots = all.filter((c) => !c.parentId);
    return roots.length > 0 ? roots : all;
  }, [meta?.categories]);

  const toggleProduct = useCallback((product: GlobalProductRecord) => {
    if (product.alreadyImported) {
      return;
    }
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.set(product.id, product);
      }
      return next;
    });
  }, []);

  const removeSelected = useCallback((productId: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }, []);

  const clearSelected = useCallback(() => {
    setSelected(new Map());
  }, []);

  const selectAllOnShelf = useCallback(() => {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const product of shelfSelectable) {
        next.set(product.id, product);
      }
      return next;
    });
  }, [shelfSelectable]);

  const clearShelfSelection = useCallback(() => {
    setSelected((prev) => {
      if (shelfSelectable.length === 0) {
        return prev;
      }
      const drop = new Set(shelfSelectable.map((p) => p.id));
      const next = new Map(prev);
      for (const id of drop) {
        next.delete(id);
      }
      return next;
    });
  }, [shelfSelectable]);

  const handleImport = useCallback(async () => {
    if (!canAdopt || selected.size === 0 || !openingBranchId.trim()) {
      if (!openingBranchId.trim()) {
        setErrorMessage(
          "Your shop location is still setting up. Wait a moment, or go back and finish branch setup, then try again.",
        );
      }
      return;
    }

    const products = [...selected.values()];
    const lines = buildAdoptLines(products, storefrontVisible);
    setImporting(true);
    setErrorMessage(null);
    setImportNotice(null);
    setImportProgress({
      phase: "queued",
      processed: 0,
      total: Math.max(products.length, 1),
      percent: 2,
      message: "Checking selection…",
    });

    try {
      const preview = await previewGlobalCatalogAdopt(lines, {
        createMissingCategories: true,
      });
      const blocking = preview.lines.filter(
        (line) =>
          line.status.startsWith("error_") ||
          line.status === "skip_sku_conflict",
      );
      // First-run shops: skip hard SKU conflicts; import ready lines.
      const readyIds = new Set(
        preview.lines
          .filter((line) => line.status === "ready")
          .map((line) => line.globalProductId),
      );
      const importLines = lines.filter((line) =>
        readyIds.has(line.globalProductId),
      );

      const dropped = lines.length - importLines.length;
      if (dropped > 0 && importLines.length > 0) {
        setImportNotice(
          `${dropped} product${dropped === 1 ? "" : "s"} skipped — already in your shop or has a SKU conflict.`,
        );
      }

      if (importLines.length === 0) {
        setErrorMessage(
          blocking.length > 0
            ? "These products could not be imported (SKU conflicts). Add products manually instead."
            : "Nothing ready to import.",
        );
        setImportProgress(null);
        return;
      }

      setImportProgress({
        phase: "importing",
        processed: 0,
        total: importLines.length,
        percent: 4,
        message: `Importing 0 of ${importLines.length}…`,
      });
      const result = await globalCatalogAdopt(openingBranchId, importLines, {
        createMissingCategories: true,
        packId: parentFilter.kind === "pack" ? packFilter?.packId : undefined,
        onProgress: (progress) => {
          setImportProgress(progress);
        },
      });

      const imported = result.importedCount;
      if (imported <= 0) {
        setErrorMessage("Import finished but no products were added.");
        setImportProgress(null);
        return;
      }

      toast.success(
        imported === 1
          ? "1 product added to your shop"
          : `${imported} products added to your shop`,
      );
      setImportProgress({
        phase: "finishing",
        processed: imported,
        total: Math.max(importLines.length, imported),
        percent: 100,
        message: `Imported ${imported} product${imported === 1 ? "" : "s"}`,
      });
      window.setTimeout(() => {
        onSuccess(imported);
        onOpenChange(false);
      }, 450);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message.toLowerCase().includes("branch")
            ? "Choose a shop location first — pick a branch in the top bar, then import again."
            : error.message
          : "Could not import products. Try again.",
      );
      setImportProgress(null);
    } finally {
      setImporting(false);
    }
  }, [
    canAdopt,
    selected,
    openingBranchId,
    storefrontVisible,
    parentFilter,
    packFilter,
    onSuccess,
    onOpenChange,
  ]);

  // Focus the dialog on open and restore focus to the opener when it closes.
  useEffect(() => {
    if (!open) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, [open]);

  // Escape closes the drawer unless an import is in flight.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !importing) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, importing, onOpenChange]);

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") {
      return;
    }
    const el = dialogRef.current;
    if (!el) {
      return;
    }
    const focusable = el.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !el.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !el.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      onKeyDown={handleDialogKeyDown}
      className={cn(
        "fixed inset-0 z-[650] flex flex-col bg-white focus:outline-none",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Starter catalogue"
    >
      <OnboardingCatalogShelf
        currency={currency ?? "KES"}
        categories={parentCategories}
        packFilter={packFilter}
        parentFilter={parentFilter}
        onParentFilterChange={setParentFilter}
        search={search}
        onSearchChange={setSearch}
        products={shelfProducts}
        selected={selected}
        onToggleProduct={toggleProduct}
        onRemoveSelected={removeSelected}
        onClearSelected={clearSelected}
        onSelectAllOnShelf={selectAllOnShelf}
        onClearShelfSelection={clearShelfSelection}
        allShelfSelected={allShelfSelected}
        shelfSelectableCount={shelfSelectable.length}
        storefrontVisible={storefrontVisible}
        onStorefrontVisibleChange={setStorefrontVisible}
        loading={loadingMeta || loadingShelf}
        loadingLabel={browseLoadLabel}
        shelfCountLabel={shelfCountLabel}
        canAdopt={canAdopt}
        importing={importing}
        importProgress={importProgress}
        importNotice={importNotice}
        errorMessage={
          errorMessage ??
          (!canAdopt
            ? "You do not have permission to import the catalogue."
            : null)
        }
        onImport={() => {
          void handleImport();
        }}
        onClose={() => {
          if (!importing) {
            onOpenChange(false);
          }
        }}
        mobileManifestOpen={mobileManifestOpen}
        onMobileManifestOpenChange={setMobileManifestOpen}
      />
    </div>
  );
}
