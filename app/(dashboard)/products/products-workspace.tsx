"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MousePointerClick } from "lucide-react";

import { DashboardNotice } from "@/components/dashboard-page-ui";
import { FormDrawerMessageBanner, catalogMessageBannerTone } from "@/components/form-drawer";
import { useDashboard } from "@/components/dashboard-provider";
import { cn } from "@/lib/utils";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { canLinkSupplierProducts } from "@/lib/supplier-access";
import {
  type ProductDrawerId,
  emptyVariantDraft,
} from "./_types";
import { useCatalogList } from "./_hooks/useCatalogList";
import { useProductDetail } from "./_hooks/useProductDetail";
import { useQuickEdit } from "./_hooks/useQuickEdit";
import { useProductMutations } from "./_hooks/useProductMutations";
import { useStorefrontFeatured } from "./_hooks/useStorefrontFeatured";
import { CatalogListColumn } from "./_components/CatalogListColumn";
import { ProductDetailPanel } from "./_components/ProductDetailPanel";
import { ProductAttentionBar } from "./_components/ProductHeroHeader";
import { ProductHeaderActions } from "./_components/ProductHeaderActions";
import { ProductsPageLayout } from "./_components/products-page-layout";
import { ProductMobileChrome } from "./_components/ProductMobileChrome";
import { ProductCreateModal } from "./_components/ProductCreateModal";
import { VariantCreateDrawer } from "./_components/VariantCreateDrawer";
import { VariantParentPickDrawer } from "./_components/VariantParentPickDrawer";
import { AddPackageModal } from "./_components/AddPackageModal";
import { ChangeItemTypeModal } from "./_components/ChangeItemTypeModal";
import { ChangeAisleModal } from "./_components/ChangeAisleModal";
import { BulkStockAdjustModal } from "./_components/BulkStockAdjustModal";
import { resolveCatalogParentId } from "./_utils";
import { ProductFilterSidebar } from "./_components/ProductFilterSidebar";
import { ProductEditDrawer } from "./_components/ProductEditDrawer";
import {
  readShelfZoneBannerDismissed,
  UnassignedShelfZoneBanner,
} from "./_components/UnassignedShelfZoneBanner";
import {
  ProductPhotosDrawer,
  ProductQuickEditAllDrawer,
  ProductMobileDetailDrawer,
} from "./_components/ProductDrawers";
import { usePosEvents } from "@/hooks/use-pos-events";
import { fetchUnassignedAisleCount } from "@/lib/api";

export function ProductsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    me,
    business,
    branchId,
    branches,
    itemTypeId: dashboardItemTypeId,
    aisleId: dashboardAisleId,
    setAisleId,
  } = useDashboard();
  const canCatalogWrite = hasPermission(
    me?.permissions,
    Permission.CatalogItemsWrite,
  );
  const canLinkSupplier = canLinkSupplierProducts(me, business);
  const canListSuppliers = hasPermission(
    me?.permissions,
    Permission.SuppliersRead,
  );
  const canSetSellPrice = hasPermission(
    me?.permissions,
    Permission.PricingSellPriceSet,
  );
  const canInventoryWrite = hasPermission(
    me?.permissions,
    Permission.InventoryWrite,
  );
  const canGlobalCatalog = hasPermission(
    me?.permissions,
    Permission.CatalogGlobalRead,
  );
  const canGlobalAdopt = hasPermission(
    me?.permissions,
    Permission.CatalogGlobalAdopt,
  );
  const canCreateCategory = hasPermission(
    me?.permissions,
    Permission.CatalogCategoriesWrite,
  );

  const catalog = useCatalogList(branchId, dashboardItemTypeId, dashboardAisleId);
  const detail = useProductDetail(branchId);
  const featured = useStorefrontFeatured(catalog.setMessage);
  const quick = useQuickEdit({
    selectedId: detail.selectedId,
    detail: detail.detail,
    primaryCost: detail.primaryCost,
    primaryLink: detail.primaryLink ?? null,
    setSupplierLinks: detail.setSupplierLinks,
    canCatalogWrite,
    canInventoryWrite,
    branches: branches,
    defaultBranchId: branchId,
    syncListRowFromDetail: catalog.syncListRowFromDetail,
    refreshSelectedDetail: detail.refreshSelectedDetail,
    setMessage: catalog.setMessage,
  });
  const [activeDrawer, setActiveDrawer] = useState<ProductDrawerId | null>(
    null,
  );
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [changeItemTypeOpen, setChangeItemTypeOpen] = useState(false);
  const [changeItemTypeMode, setChangeItemTypeMode] = useState<
    "single" | "bulk"
  >("single");
  const [changeAisleOpen, setChangeAisleOpen] = useState(false);
  const [changeAisleMode, setChangeAisleMode] = useState<"single" | "bulk">(
    "single",
  );
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [variantParentPickBusy, setVariantParentPickBusy] = useState(false);
  const [bulkStockOpen, setBulkStockOpen] = useState(false);
  const [unassignedAisleCount, setUnassignedAisleCount] = useState<number | null>(
    null,
  );
  const [shelfZoneBannerDismissed, setShelfZoneBannerDismissed] = useState(
    () => readShelfZoneBannerDismissed(business?.id),
  );
  const didAutoOpenCreate = useRef(false);

  const openBaseStock = useCallback(async () => {
    const pid = detail.detail?.variantOfItemId?.trim();
    if (!pid) return;
    detail.selectProduct(pid);
    await detail.refreshSelectedDetail(pid);
    quick.openQuickEdit("stock");
  }, [
    detail.detail?.variantOfItemId,
    detail.selectProduct,
    detail.refreshSelectedDetail,
    quick.openQuickEdit,
  ]);
  const [isLg, setIsLg] = useState(false);
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsLg(mq.matches);  
    mq.addEventListener("change", () => setIsLg(mq.matches));
    return () => mq.removeEventListener("change", () => setIsLg(mq.matches));
  }, []);

  useEffect(() => {
    if (searchParams.get("onboarding") === "create-product") {
      setActiveDrawer("create-parent");
    }
    const aisleId = searchParams.get("aisleId")?.trim();
    const aisleUnset = searchParams.get("aisleUnset");
    if (aisleUnset === "1" || aisleUnset === "true") {
      setAisleId("__unset__");
    } else if (aisleId) {
      setAisleId(aisleId);
    }
    const productId = searchParams.get("product")?.trim();
    if (productId) {
      detail.selectProduct(productId);
      setMobileDetailOpen(true);
    }
  }, [searchParams, setAisleId, detail.selectProduct]);

  useEffect(() => {
    if (searchParams.get("action") === "global-catalog" && canGlobalCatalog) {
      router.replace(APP_ROUTES.productsCatalog);
    }
  }, [searchParams, canGlobalCatalog, router]);

  const m = useProductMutations({
    selectedId: detail.selectedId,
    detail: detail.detail,
    patchDraft: detail.patchDraft,
    setPatchDraft: detail.setPatchDraft,
    setDetail: detail.setDetail,
    setSupplierLinks: detail.setSupplierLinks,
    setParentVariants: detail.setParentVariants,
    setVariantParentDisplayName: detail.setVariantParentDisplayName,
    rowSelection: catalog.rowSelection,
    setRowSelection: catalog.setRowSelection,
    listRows: catalog.listRows,
    canCatalogWrite,
    canLinkSupplier,
    canListSuppliers,
    canSetSellPrice,
    canInventoryWrite,
    canGlobalAdopt,
    currencyCode: business?.currency?.trim() || "",
    refreshFullCatalog: catalog.refreshFullCatalog,
    syncListRowFromDetail: catalog.syncListRowFromDetail,
    refreshSelectedDetail: detail.refreshSelectedDetail,
    setMessage: catalog.setMessage,
    selectProduct: (id) => {
      detail.selectProduct(id);
      setMobileDetailOpen(!!id);
    },
    activeDrawer,
    setActiveDrawer,
    itemTypes: catalog.itemTypes,
    aisles: catalog.aisles,
    dashboardItemTypeId,
    headerBranchId: branchId,
  });

  /** Rows the bulk stock adjuster can touch: non-package items in the current selection. */
  const bulkStockRows = useMemo(
    () =>
      catalog.listRows.filter(
        (r) => catalog.rowSelection.has(r.id) && !r.packageVariant,
      ),
    [catalog.listRows, catalog.rowSelection],
  );

  usePosEvents({
    onPriceChanged: (frame) => {
      const itemId = String(frame.data.itemId ?? "");
      if (!itemId) return;
      void catalog.refreshFullCatalog();
      if (detail.selectedId === itemId) {
        void detail.refreshSelectedDetail();
      }
    },
  });

  const isListRowActive = useCallback(
    (row: { id: string; variantOfItemId?: string }) =>
      detail.selectedId === row.id ||
      (!!detail.selectedId &&
        !!detail.detail &&
        detail.detail.variantOfItemId === row.id),
    [detail.selectedId, detail.detail],
  );

  const D = detail.detail;
  const isViewingVariant = !!D?.variantOfItemId?.trim();
  const variantDrawerParentName =
    (isViewingVariant && detail.variantParentDisplayName?.trim()) ||
    D?.name?.trim() ||
    "This product";
  const variantDrawerParentIsGroup =
    isViewingVariant
      ? detail.variantParentIsGroup
      : !!D && !D.variantOfItemId?.trim() && D.isSellable === false;
  const variantDrawerParentCategoryId =
    (isViewingVariant
      ? detail.variantParentCategoryId?.trim()
      : D && !D.variantOfItemId?.trim()
        ? D.categoryId?.trim()
        : "") || "";
  const variantDrawerParentCategoryName = variantDrawerParentCategoryId
    ? catalog.sortedCategories.find((c) => c.id === variantDrawerParentCategoryId)
        ?.name ||
      D?.categoryName?.trim() ||
      ""
    : "";
  const handleOpenAddVariant = useCallback(() => {
    const seed = emptyVariantDraft();
    const parentCategory =
      variantDrawerParentCategoryId ||
      (isViewingVariant
        ? D?.categoryId?.trim() || ""
        : D && !D.variantOfItemId?.trim()
          ? D.categoryId?.trim() || ""
          : "");
    if (parentCategory) seed.categoryId = parentCategory;
    if (isViewingVariant && D) {
      seed.unitType = D.unitType?.trim() || "";
      seed.isPackageVariant = D.packageVariant ?? false;
    }
    m.setVariantDraftRows([seed]);
    setActiveDrawer("add-variant");
  }, [D, isViewingVariant, m, variantDrawerParentCategoryId]);
  const variantCreateSubmitCount = m.variantDraftRows.filter((r) =>
    r.variantName.trim(),
  ).length;
  const handleVariantParentPicked = useCallback(
    async (hit: { id: string }) => {
      setVariantParentPickBusy(true);
      catalog.setMessage("");
      detail.selectProduct(hit.id);
      setMobileDetailOpen(true);
      const row = await detail.refreshSelectedDetail(hit.id);
      if (!row || row.variantOfItemId?.trim()) {
        catalog.setMessage("Could not load the parent product.");
        setActiveDrawer("pick-variant-parent");
        setVariantParentPickBusy(false);
        return;
      }
      m.setVariantDraftRows([emptyVariantDraft()]);
      m.setPendingVariantImage(null);
      setActiveDrawer("add-variant");
      setVariantParentPickBusy(false);
    },
    [catalog, detail, m],
  );

  const catalogMessageInDrawer =
    !!catalog.message.trim() &&
    !!(
      activeDrawer ||
      quick.quickEditAllOpen ||
      (mobileDetailOpen && !isLg)
    );
  const catalogBanner = (text: string) => (
    <FormDrawerMessageBanner
      text={text}
      tone={catalogMessageBannerTone(text)}
    />
  );
  const quickEditDrawerBanner =
    quick.quickEditAllOpen && (quick.qeaError || catalog.message.trim()) ? (
      <div className="flex flex-col gap-2">
        {quick.qeaError ? (
          <FormDrawerMessageBanner text={quick.qeaError} />
        ) : null}
        {catalog.message.trim() ? catalogBanner(catalog.message) : null}
      </div>
    ) : undefined;
  const p = {
    detail: D!,
    patchDraft: detail.patchDraft,
    supplierLinks: detail.supplierLinks,
    variantRows: detail.variantRows,
    variantParentDisplayName: detail.variantParentDisplayName,
    parentVariants: detail.parentVariants,
    selectedId: detail.selectedId,
    sellPrice: detail.sellPrice,
    primaryCost: detail.primaryCost,
    marginPct: detail.marginPct,
    canCatalogWrite,
    canInventoryWrite,
    branches,
    canLinkSupplier,
    quickEdit: quick.quickEdit,
    quickProductName: quick.quickProductName,
    setQuickProductName: quick.setQuickProductName,
    quickSku: quick.quickSku,
    setQuickSku: quick.setQuickSku,
    quickBarcode: quick.quickBarcode,
    setQuickBarcode: quick.setQuickBarcode,
    quickBundleQty: quick.quickBundleQty,
    setQuickBundleQty: quick.setQuickBundleQty,
    quickBundlePrice: quick.quickBundlePrice,
    setQuickBundlePrice: quick.setQuickBundlePrice,
    quickBuyingPrice: quick.quickBuyingPrice,
    setQuickBuyingPrice: quick.setQuickBuyingPrice,
    quickMargin: quick.quickMargin,
    setQuickMargin: quick.setQuickMargin,
    quickMinStock: quick.quickMinStock,
    setQuickMinStock: quick.setQuickMinStock,
    quickReorderLevel: quick.quickReorderLevel,
    setQuickReorderLevel: quick.setQuickReorderLevel,
    quickReorderQty: quick.quickReorderQty,
    setQuickReorderQty: quick.setQuickReorderQty,
    quickSaving: quick.quickSaving,
    openQuickEdit: quick.openQuickEdit,
    cancelQuickEdit: quick.cancelQuickEdit,
    saveQuickProductName: quick.saveQuickProductName,
    saveQuickBarcode: quick.saveQuickBarcode,
    saveQuickSku: quick.saveQuickSku,
    saveQuickBundleQty: quick.saveQuickBundleQty,
    saveQuickBundlePrice: quick.saveQuickBundlePrice,
    saveQuickBuyingPrice: quick.saveQuickBuyingPrice,
    saveQuickMargin: quick.saveQuickMargin,
    saveQuickMinStock: quick.saveQuickMinStock,
    saveQuickReorder: quick.saveQuickReorder,
    quickStock: quick.quickStock,
    setQuickStock: quick.setQuickStock,
    quickStockBranchId: quick.quickStockBranchId,
    setQuickStockBranchId: quick.setQuickStockBranchId,
    quickStockUnitCost: quick.quickStockUnitCost,
    setQuickStockUnitCost: quick.setQuickStockUnitCost,
    quickStockBaseline: quick.quickStockBaseline,
    quickStockBaselineLoading: quick.quickStockBaselineLoading,
    saveQuickStock: quick.saveQuickStock,
    openQuickEditAll: quick.openQuickEditAll,
    variantInlineEditId: m.variantInlineEditId,
    variantEditName: m.variantEditName,
    setVariantEditName: m.setVariantEditName,
    quickSavingVariant: m.quickSavingVariant,
    startVariantRowEdit: m.startVariantRowEdit,
    cancelVariantInlineEdit: m.cancelVariantInlineEdit,
    saveVariantInline: m.saveVariantInline,
    setActiveDrawer: (d: string | null) =>
      setActiveDrawer(d as ProductDrawerId | null),
    selectProduct: (id: string | null) => {
      detail.selectProduct(id);
    },
    onOpenPackageSales: canCatalogWrite
      ? () => setPackageModalOpen(true)
      : undefined,
    onOpenBaseStock: canInventoryWrite
      ? () => void openBaseStock()
      : undefined,
    onOpenChangeItemType: canCatalogWrite
      ? () => {
          setChangeItemTypeMode("single");
          setChangeItemTypeOpen(true);
        }
      : undefined,
    onOpenChangeAisle: canCatalogWrite
      ? () => {
          setChangeAisleMode("single");
          setChangeAisleOpen(true);
        }
      : undefined,
    onOpenAddVariant: canCatalogWrite ? handleOpenAddVariant : undefined,
    itemTypeLabel:
      catalog.itemTypes.find((t) => t.id === D?.itemTypeId)?.label?.trim() ||
      undefined,
    aisleLabel:
      catalog.aisles.find((a) => a.id === D?.aisleId)?.name?.trim() ||
      D?.aisleName?.trim() ||
      undefined,
    isStorefrontFeatured: D?.id
      ? featured.isFeatured(D.id)
      : false,
    canManageFeatured: featured.canManageFeatured,
    featuredBusy: featured.featuredBusy,
    featuredAtCapacity: featured.featuredAtCapacity,
    onToggleFeatured: D?.id
      ? () => void featured.toggleFeatured(D.id)
      : undefined,
    onToggleWeighed: canCatalogWrite
      ? () => void m.onToggleWeighed()
      : undefined,
    weighedBusy: m.weighedBusy,
    polishCategories: catalog.sortedCategories,
    polishItemTypes: catalog.itemTypes,
    polishCurrencyCode: business?.currency?.trim() || "",
    onProductPolished: () => {
      void detail.refreshSelectedDetail();
      if (D) catalog.syncListRowFromDetail(D);
    },
  };

  const attentionStats = [
    {
      id: "missingBarcode" as const,
      count: catalog.catalogStats.missingBarcode,
      label: "missing barcode",
      active: catalog.filterNoBarcode,
    },
    {
      id: "noPrice" as const,
      count: catalog.catalogStats.missingPrice,
      label: "no price",
      active: catalog.filterNoPrice,
    },
    {
      id: "zeroStock" as const,
      count: catalog.catalogStats.zeroStock,
      label: "zero stock",
      active: catalog.filterZeroStock,
    },
    {
      id: "lowStock" as const,
      count: catalog.catalogStats.lowStock,
      label: "low stock",
      active: catalog.filterLowStock,
    },
    {
      id: "inactive" as const,
      count: catalog.catalogStats.inactive,
      label: "inactive",
      active: catalog.filterInactiveOnly,
    },
  ];

  const catalogEmpty =
    catalog.listTotalElements === 0 &&
    !catalog.listLoadingInitial &&
    !catalog.debouncedSearch.trim() &&
    !catalog.filterCategoryId.trim() &&
    catalog.catalogScope === "ALL" &&
    !catalog.barcodeExact.trim() &&
    !catalog.attentionFiltersActive;

  useEffect(() => {
    if (!canCatalogWrite) return;
    let cancelled = false;
    void fetchUnassignedAisleCount()
      .then((count) => {
        if (!cancelled) setUnassignedAisleCount(count);
      })
      .catch(() => {
        if (!cancelled) setUnassignedAisleCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [canCatalogWrite, catalog.listTotalElements]);

  const showShelfZoneBanner =
    canCatalogWrite &&
    !shelfZoneBannerDismissed &&
    unassignedAisleCount != null &&
    unassignedAisleCount > 0 &&
    !dashboardAisleId &&
    catalog.aisles.length > 0;

  useEffect(() => {
    if (didAutoOpenCreate.current) return;
    if (!catalogEmpty) return;
    if (!canCatalogWrite || catalog.itemTypes.length === 0) return;
    didAutoOpenCreate.current = true;
    try {
      if (sessionStorage.getItem("kiosk.autoOpenAddProduct") === "1") return;
      sessionStorage.setItem("kiosk.autoOpenAddProduct", "1");
    } catch {
      /* private mode: still open once this visit */
    }
    setActiveDrawer("create-parent");
  }, [catalogEmpty, canCatalogWrite, catalog.itemTypes.length]);

  const onAttentionToggle = (id: (typeof attentionStats)[number]["id"]) => {
    if (id === "missingBarcode") {
      catalog.setFilterNoBarcode((v) => !v);
    } else if (id === "noPrice") {
      catalog.setFilterNoPrice((v) => !v);
    } else if (id === "zeroStock") {
      catalog.setFilterZeroStock((v) => !v);
    } else if (id === "lowStock") {
      catalog.setFilterLowStock((v) => !v);
    } else {
      catalog.setFilterInactiveOnly((v) => !v);
    }
  };

  return (
    <>
      <ProductsPageLayout
        headerActions={
          <div className="flex w-full min-w-0 items-center gap-2">
            {showShelfZoneBanner && !catalogEmpty ? (
              <UnassignedShelfZoneBanner
                count={unassignedAisleCount ?? 0}
                businessId={business?.id}
                onDismiss={() => setShelfZoneBannerDismissed(true)}
                className="min-w-0 flex-1"
              />
            ) : null}
            <div
              className={cn(
                "flex shrink-0 items-center justify-end gap-1.5",
                catalogEmpty || !showShelfZoneBanner ? "ml-auto" : null,
                !catalogEmpty && "hidden lg:flex",
              )}
            >
              <ProductHeaderActions
                canCreate={catalog.itemTypes.length > 0}
                onCreateNew={() => setActiveDrawer("create-parent")}
              />
            </div>
          </div>
        }
        headerExtra={
          catalogEmpty ? undefined : (
            <div className="hidden lg:block">
              <ProductAttentionBar
                attentionStats={attentionStats}
                onAttentionToggle={onAttentionToggle}
              />
            </div>
          )
        }
      >
        <div className="relative flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-0 overflow-x-hidden lg:min-h-[min(72dvh,40rem)]">
        <div className="relative flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-0">
          {catalogEmpty ? null : (
          <ProductMobileChrome
            catalog={catalog}
            canCreate={catalog.itemTypes.length > 0}
            onCreateNew={() => setActiveDrawer("create-parent")}
            onAddFromCatalog={
              canGlobalCatalog
                ? () => router.push(APP_ROUTES.productsCatalog)
                : undefined
            }
            canAddFromCatalog={canGlobalCatalog}
          />
          )}
          <section
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              catalogEmpty
                ? "bg-transparent"
                : [
                    "lg:rounded-none lg:border lg:border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_8%,transparent)] lg:bg-white",
                    "lg:shadow-[0_1px_0_color-mix(in_srgb,var(--catalog-ink,#15231f)_6%,transparent),0_10px_28px_-18px_color-mix(in_srgb,var(--catalog-ink,#15231f)_22%,transparent)]",
                    "border-0 bg-transparent",
                  ],
            )}
          >
            <div
              className={cn(
                "grid min-h-0 min-w-0 max-w-full flex-1 grid-cols-1 gap-0 overflow-x-hidden p-0",
                !catalogEmpty &&
                  "lg:grid-cols-[minmax(0,1fr)_minmax(18rem,min(24rem,30vw))] lg:items-stretch 2xl:grid-cols-[minmax(0,1fr)_minmax(19rem,min(28rem,32vw))]",
              )}
            >
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row lg:items-stretch">
                {catalogEmpty ? null : <ProductFilterSidebar catalog={catalog} />}
                <CatalogListColumn
                catalog={catalog}
                selectedId={detail.selectedId}
                onRowClick={(id) => {
                  detail.selectProduct(id);
                  setMobileDetailOpen(true);
                }}
                isRowActive={isListRowActive}
                canCatalogWrite={canCatalogWrite}
                canInventoryWrite={canInventoryWrite}
                bulkDeleteBusy={m.bulkDeleteBusy}
                bulkChangeDepartmentBusy={m.changeItemTypeBusy}
                bulkChangeAisleBusy={m.changeAisleBusy}
                bulkActivateBusy={m.bulkActivateBusy}
                onBulkDelete={m.onBulkDeleteSelected}
                onBulkActivate={
                  canCatalogWrite ? m.onBulkActivateSelected : undefined
                }
                onBulkAdjustStock={
                  canInventoryWrite ? () => setBulkStockOpen(true) : undefined
                }
                onBulkChangeDepartment={
                  canCatalogWrite
                    ? () => {
                        setChangeItemTypeMode("bulk");
                        setChangeItemTypeOpen(true);
                      }
                    : undefined
                }
                onBulkChangeAisle={
                  canCatalogWrite
                    ? () => {
                        setChangeAisleMode("bulk");
                        setChangeAisleOpen(true);
                      }
                    : undefined
                }
                onAddFromCatalog={
                  canGlobalCatalog
                    ? () => router.push(APP_ROUTES.productsCatalog)
                    : undefined
                }
                canAddFromCatalog={canGlobalCatalog}
                onCreateNew={
                  canCatalogWrite
                    ? () => setActiveDrawer("create-parent")
                    : undefined
                }
                canCreateNew={canCatalogWrite && catalog.itemTypes.length > 0}
                />
              </div>
              {catalogEmpty ? null : (
              <div
                ref={setDockRoot}
                className="relative hidden min-h-0 min-w-0 max-w-full overflow-hidden lg:flex lg:flex-col lg:border-l lg:border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_8%,transparent)]"
              >
                {isLg && activeDrawer === "edit-product" && D ? null : D ? (
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-pb-24 p-0">
                    <ProductDetailPanel {...p} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 px-3 py-8 text-center">
                    <div className="flex size-10 items-center justify-center rounded-none border border-dashed border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_14%,transparent)] bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_60%,transparent)]">
                      <MousePointerClick className="size-4 text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_35%,transparent)]" />
                    </div>
                    <p className="text-[12px] font-medium tracking-tight text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_45%,transparent)]">
                      Select a product from the list
                    </p>
                  </div>
                )}
              </div>
              )}
            </div>
          </section>
          {catalog.message && !catalogMessageInDrawer ? (
            <div className="shrink-0 px-1">
              <DashboardNotice text={catalog.message} />
            </div>
          ) : null}
        </div>
        </div>
      </ProductsPageLayout>

      <VariantParentPickDrawer
        open={activeDrawer === "pick-variant-parent"}
        onClose={() => {
          if (!variantParentPickBusy) setActiveDrawer(null);
        }}
        busy={variantParentPickBusy}
        onParentSelected={handleVariantParentPicked}
      />

      <ProductCreateModal
        open={activeDrawer === "create-parent"}
        onClose={() => setActiveDrawer(null)}
        banner={
          activeDrawer === "create-parent" && catalog.message.trim() ? (
            catalogBanner(catalog.message)
          ) : undefined
        }
        catalog={catalog}
        m={m}
        canLinkSupplier={canLinkSupplier}
        canListSuppliers={canListSuppliers}
        currencyCode={business?.currency?.trim() || ""}
        branches={branches}
        canGlobalCatalog={canGlobalCatalog}
        canCreateCategory={canCreateCategory}
        onOpenExistingProduct={(itemId) => {
          detail.selectProduct(itemId);
          setMobileDetailOpen(true);
        }}
      />

      <ProductEditDrawer
        open={activeDrawer === "edit-product" && !!D}
        docked={isLg}
        dockRoot={dockRoot}
        onClose={() => setActiveDrawer(null)}
        banner={
          activeDrawer === "edit-product" && catalog.message.trim() ? (
            catalogBanner(catalog.message)
          ) : undefined
        }
        detail={detail}
        cats={catalog.sortedCategories}
        m={m}
        headerBranchId={branchId}
        syncListRowFromDetail={catalog.syncListRowFromDetail}
        refreshSelectedDetail={detail.refreshSelectedDetail}
        setMessage={catalog.setMessage}
        onOpenPhotos={() => setActiveDrawer("photos")}
        canCreateCategory={canCreateCategory}
        upsertCategory={catalog.upsertCategory}
        aisles={catalog.aisles}
        upsertAisle={catalog.upsertAisle}
      />

      <ProductPhotosDrawer
        open={activeDrawer === "photos" && !!D}
        onClose={() => setActiveDrawer(null)}
        banner={
          activeDrawer === "photos" && catalog.message.trim() ? (
            catalogBanner(catalog.message)
          ) : undefined
        }
        detail={detail}
        m={m}
      />

      <VariantCreateDrawer
        open={activeDrawer === "add-variant" && !!D}
        onClose={() => setActiveDrawer(null)}
        banner={
          activeDrawer === "add-variant" && catalog.message.trim() ? (
            catalogBanner(catalog.message)
          ) : undefined
        }
        parentDisplayName={variantDrawerParentName}
        parentIsProductGroup={variantDrawerParentIsGroup}
        parentCategoryId={variantDrawerParentCategoryId || undefined}
        parentCategoryName={variantDrawerParentCategoryName || undefined}
        siblingContextLabel={
          isViewingVariant
            ? D?.variantName?.trim() || D?.name?.trim() || undefined
            : undefined
        }
        variantCreateSubmitCount={variantCreateSubmitCount}
        sortedCategories={catalog.sortedCategories}
        branches={m.branches}
        m={m}
        canLinkSupplier={canLinkSupplier}
        canListSuppliers={canListSuppliers}
        canSetSellPrice={canSetSellPrice}
        canInventoryWrite={canInventoryWrite}
        currencyCode={business?.currency?.trim() || ""}
      />

      {D ? (
        <AddPackageModal
          open={packageModalOpen}
          onOpenChange={setPackageModalOpen}
          parentId={resolveCatalogParentId(D, detail.selectedId)}
          parentName={
            D.variantOfItemId
              ? detail.variantParentDisplayName?.trim() || D.name?.trim() || "Product"
              : D.name?.trim() || "Product"
          }
          baseUnitHint={
            D.variantOfItemId
              ? detail.variantParentDisplayName?.trim() || "base unit"
              : D.name?.trim() || "base unit"
          }
          currencyCode={business?.currency?.trim() || ""}
          busy={m.packageCreateBusy}
          onCreatePackages={m.onCreatePackages}
        />
      ) : null}

      {changeItemTypeOpen &&
      (changeItemTypeMode === "bulk" || D) ? (
        <ChangeItemTypeModal
          open={changeItemTypeOpen}
          onOpenChange={setChangeItemTypeOpen}
          productName={D?.name?.trim() || "Product"}
          itemTypes={catalog.itemTypes}
          currentItemTypeId={
            changeItemTypeMode === "bulk"
              ? dashboardItemTypeId?.trim() || null
              : (D?.itemTypeId ?? null)
          }
          selectionCount={
            changeItemTypeMode === "bulk"
              ? catalog.rowSelection.size
              : undefined
          }
          busy={m.changeItemTypeBusy}
          onSave={(nextId) =>
            changeItemTypeMode === "bulk"
              ? m.onBulkChangeItemType(nextId)
              : m.onChangeItemType(nextId)
          }
        />
      ) : null}

      {changeAisleOpen && (changeAisleMode === "bulk" || D) ? (
        <ChangeAisleModal
          open={changeAisleOpen}
          onOpenChange={setChangeAisleOpen}
          productName={D?.name?.trim() || "Product"}
          aisles={catalog.aisles}
          currentAisleId={
            changeAisleMode === "bulk" ? null : (D?.aisleId ?? null)
          }
          selectionCount={
            changeAisleMode === "bulk" ? catalog.rowSelection.size : undefined
          }
          busy={m.changeAisleBusy}
          onSave={(nextId) =>
            changeAisleMode === "bulk"
              ? m.onBulkChangeAisle(nextId)
              : m.onChangeAisle(nextId)
          }
        />
      ) : null}

      <ProductQuickEditAllDrawer
        open={quick.quickEditAllOpen}
        onClose={() => quick.setQuickEditAllOpen(false)}
        banner={quickEditDrawerBanner}
        detail={detail}
        quick={quick}
      />

      <BulkStockAdjustModal
        open={bulkStockOpen}
        onOpenChange={setBulkStockOpen}
        rows={bulkStockRows}
        totalSelected={catalog.rowSelection.size}
        branches={m.branches}
        currencyCode={business?.currency?.trim() || ""}
        apply={m.onBulkAdjustStock}
      />

      <ProductMobileDetailDrawer
        open={mobileDetailOpen && !isLg}
        onClose={() => setMobileDetailOpen(false)}
        banner={
          mobileDetailOpen && !isLg && catalog.message.trim() ? (
            catalogBanner(catalog.message)
          ) : undefined
        }
        detail={detail}
        detailPanelProps={p}
      />
    </>
  );
}
