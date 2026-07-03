"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MousePointerClick, PackagePlus } from "lucide-react";

import { DashboardNotice } from "@/components/dashboard-page-ui";
import { FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { cn } from "@/lib/utils";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  type ProductDrawerId,
  emptyVariantDraft,
  panelClass,
} from "./_types";
import { useCatalogList } from "./_hooks/useCatalogList";
import { useProductDetail } from "./_hooks/useProductDetail";
import { useQuickEdit } from "./_hooks/useQuickEdit";
import { useProductMutations } from "./_hooks/useProductMutations";
import { useStorefrontFeatured } from "./_hooks/useStorefrontFeatured";
import { CatalogListColumn } from "./_components/CatalogListColumn";
import { ProductDetailPanel } from "./_components/ProductDetailPanel";
import { ProductHeroHeader } from "./_components/ProductHeroHeader";
import { ProductMobileFilterBar } from "./_components/ProductMobileFilterBar";
import { ProductCreateDrawer } from "./_components/ProductCreateDrawer";
import { VariantCreateDrawer } from "./_components/VariantCreateDrawer";
import { VariantParentPickDrawer } from "./_components/VariantParentPickDrawer";
import { AddPackageModal } from "./_components/AddPackageModal";
import { ChangeItemTypeModal } from "./_components/ChangeItemTypeModal";
import { resolveCatalogParentId } from "./_utils";
import { ProductFilterSidebar } from "./_components/ProductFilterSidebar";
import { ProductEditDrawer } from "./_components/ProductEditDrawer";
import {
  ProductPhotosDrawer,
  ProductQuickEditAllDrawer,
  ProductMobileDetailDrawer,
} from "./_components/ProductDrawers";
import { usePosEvents } from "@/hooks/use-pos-events";

export function ProductsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    me,
    business,
    branchId,
    branches,
    itemTypeId: dashboardItemTypeId,
  } = useDashboard();
  const canCatalogWrite = hasPermission(
    me?.permissions,
    Permission.CatalogItemsWrite,
  );
  const canLinkSupplier = hasPermission(
    me?.permissions,
    Permission.CatalogItemsLinkSuppliers,
  );
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

  const catalog = useCatalogList(branchId, dashboardItemTypeId);
  const detail = useProductDetail(branchId);
  const featured = useStorefrontFeatured(catalog.setMessage);
  const quick = useQuickEdit({
    selectedId: detail.selectedId,
    detail: detail.detail,
    primaryCost: detail.primaryCost,
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
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [variantParentPickBusy, setVariantParentPickBusy] = useState(false);

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
  }, [searchParams]);

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
    dashboardItemTypeId,
    headerBranchId: branchId,
  });

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
    if (isViewingVariant && D) {
      seed.brand = D.brand?.trim() || "";
      seed.unitType = D.unitType?.trim() || "";
      seed.isPackageVariant = D.packageVariant ?? false;
      if (D.categoryId?.trim()) seed.categoryId = D.categoryId.trim();
    }
    m.setVariantDraftRows([seed]);
    setActiveDrawer("add-variant");
  }, [D, isViewingVariant, m]);
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
  const quickEditDrawerBanner =
    quick.quickEditAllOpen && (quick.qeaError || catalog.message.trim()) ? (
      <div className="flex flex-col gap-2">
        {quick.qeaError ? (
          <FormDrawerMessageBanner text={quick.qeaError} />
        ) : null}
        {catalog.message.trim() ? (
          <FormDrawerMessageBanner text={catalog.message} />
        ) : null}
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
      ? () => setChangeItemTypeOpen(true)
      : undefined,
    onOpenAddVariant: canCatalogWrite ? handleOpenAddVariant : undefined,
    itemTypeLabel:
      catalog.itemTypes.find((t) => t.id === D?.itemTypeId)?.label?.trim() ||
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
  };

  return (
    <>
      <div className="relative flex h-full min-h-0 w-full min-w-0 max-w-full flex-col gap-2 overflow-x-hidden px-3 pb-6 sm:px-4 2xl:gap-4 2xl:px-4">
        <div className="relative flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-2 2xl:gap-4">
          <ProductHeroHeader
            itemTypeCount={catalog.itemTypes.length}
            totalProducts={catalog.listTotalElements}
            attentionStats={[
              { count: catalog.catalogStats.missingBarcode, label: "missing barcode" },
              { count: catalog.catalogStats.missingPrice, label: "no price" },
              { count: catalog.catalogStats.zeroStock, label: "zero stock" },
              { count: catalog.catalogStats.lowStock, label: "low stock" },
              { count: catalog.catalogStats.inactive, label: "inactive" },
            ]}
            onCreateNew={() => setActiveDrawer("create-parent")}
            onAddVariant={
              canCatalogWrite
                ? () => setActiveDrawer("pick-variant-parent")
                : undefined
            }
            onAddFromCatalog={
              canGlobalCatalog
                ? () => router.push(APP_ROUTES.productsCatalog)
                : undefined
            }
            canAddFromCatalog={canGlobalCatalog}
            canAddVariant={canCatalogWrite}
          />
          <ProductMobileFilterBar catalog={catalog} />
          <section
            className={cn(
              panelClass,
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            )}
          >
            <div className="grid min-h-0 min-w-0 max-w-full flex-1 grid-cols-1 gap-2 overflow-x-hidden p-2 sm:p-3 lg:grid-cols-[minmax(0,1fr)_minmax(19.5rem,min(27rem,33vw))] lg:items-stretch lg:gap-4 lg:p-4 2xl:grid-cols-[minmax(0,1fr)_minmax(21rem,min(31.5rem,34.5vw))] 2xl:gap-4 2xl:p-4">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row lg:items-stretch">
                <ProductFilterSidebar catalog={catalog} />
                <CatalogListColumn
                catalog={catalog}
                selectedId={detail.selectedId}
                onRowClick={(id) => {
                  detail.selectProduct(id);
                  setMobileDetailOpen(true);
                }}
                isRowActive={isListRowActive}
                canCatalogWrite={canCatalogWrite}
                bulkDeleteBusy={m.bulkDeleteBusy}
                onBulkDelete={m.onBulkDeleteSelected}
                onAddFromCatalog={
                  canGlobalCatalog
                    ? () => router.push(APP_ROUTES.productsCatalog)
                    : undefined
                }
                canAddFromCatalog={canGlobalCatalog}
                />
              </div>
              <div className="hidden min-w-0 max-w-full overflow-x-hidden lg:flex lg:min-h-0 lg:flex-col lg:border-l lg:border-border/50 lg:pl-3">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-border bg-card">
                  {D ? (
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:px-3.5 sm:py-3">
                      <ProductDetailPanel {...p} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                      <div className="flex size-12 items-center justify-center border border-dashed border-border bg-muted/50">
                        <MousePointerClick className="size-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Select a product from the list
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        disabled={catalog.itemTypes.length === 0}
                        onClick={() => setActiveDrawer("create-parent")}
                        className="gap-2"
                      >
                        <PackagePlus className="size-4" /> New product
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
          {catalog.message && !catalogMessageInDrawer ? (
            <div className="shrink-0 px-1">
              <DashboardNotice text={catalog.message} />
            </div>
          ) : null}
        </div>
      </div>

      <VariantParentPickDrawer
        open={activeDrawer === "pick-variant-parent"}
        onClose={() => {
          if (!variantParentPickBusy) setActiveDrawer(null);
        }}
        busy={variantParentPickBusy}
        onParentSelected={handleVariantParentPicked}
      />

      <ProductCreateDrawer
        open={activeDrawer === "create-parent"}
        onClose={() => setActiveDrawer(null)}
        banner={
          activeDrawer === "create-parent" && catalog.message.trim() ? (
            <FormDrawerMessageBanner text={catalog.message} />
          ) : undefined
        }
        catalog={catalog}
        m={m}
        canLinkSupplier={canLinkSupplier}
        canListSuppliers={canListSuppliers}
        currencyCode={business?.currency?.trim() || ""}
        branches={branches}
        canGlobalCatalog={canGlobalCatalog}
      />

      <ProductEditDrawer
        open={activeDrawer === "edit-product" && !!D}
        onClose={() => setActiveDrawer(null)}
        banner={
          activeDrawer === "edit-product" && catalog.message.trim() ? (
            <FormDrawerMessageBanner text={catalog.message} />
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
      />

      <ProductPhotosDrawer
        open={activeDrawer === "photos" && !!D}
        onClose={() => setActiveDrawer(null)}
        banner={
          activeDrawer === "photos" && catalog.message.trim() ? (
            <FormDrawerMessageBanner text={catalog.message} />
          ) : undefined
        }
        detail={detail}
        m={m}
      />

      {D ? (
        <VariantCreateDrawer
          open={activeDrawer === "add-variant"}
          onClose={() => setActiveDrawer(null)}
          banner={
            activeDrawer === "add-variant" && catalog.message.trim() ? (
              <FormDrawerMessageBanner text={catalog.message} />
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
      ) : null}

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

      {D ? (
        <ChangeItemTypeModal
          open={changeItemTypeOpen}
          onOpenChange={setChangeItemTypeOpen}
          productName={D.name?.trim() || "Product"}
          itemTypes={catalog.itemTypes}
          currentItemTypeId={D.itemTypeId ?? null}
          busy={m.changeItemTypeBusy}
          onSave={(nextId) => m.onChangeItemType(nextId)}
        />
      ) : null}

      <ProductQuickEditAllDrawer
        open={quick.quickEditAllOpen}
        onClose={() => quick.setQuickEditAllOpen(false)}
        banner={quickEditDrawerBanner}
        detail={detail}
        quick={quick}
      />

      <ProductMobileDetailDrawer
        open={mobileDetailOpen && !isLg}
        onClose={() => setMobileDetailOpen(false)}
        banner={
          mobileDetailOpen && !isLg && catalog.message.trim() ? (
            <FormDrawerMessageBanner text={catalog.message} />
          ) : undefined
        }
        detail={detail}
        detailPanelProps={p}
      />

      <button
        type="button"
        disabled={catalog.itemTypes.length === 0}
        onClick={() => setActiveDrawer("create-parent")}
        className="fixed bottom-[76px] right-4 z-30 lg:hidden flex size-14 items-center justify-center rounded-full shadow-lg bg-foreground text-background active:scale-95 disabled:opacity-40"
      >
        <PackagePlus className="size-6" />
      </button>
    </>
  );
}
