"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, MousePointerClick, PackagePlus } from "lucide-react";

import { DashboardNotice } from "@/components/dashboard-page-ui";
import { FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { cn } from "@/lib/utils";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  type ProductDrawerId,
  panelClass,
} from "./_types";
import { useCatalogList } from "./_hooks/useCatalogList";
import { useProductDetail } from "./_hooks/useProductDetail";
import { useQuickEdit } from "./_hooks/useQuickEdit";
import { useProductMutations } from "./_hooks/useProductMutations";
import { CatalogListColumn } from "./_components/CatalogListColumn";
import { ProductDetailPanel } from "./_components/ProductDetailPanel";
import { ProductHeroHeader } from "./_components/ProductHeroHeader";
import { ProductMobileFilterBar } from "./_components/ProductMobileFilterBar";
import { ProductCreateDrawer } from "./_components/ProductCreateDrawer";
import { VariantCreateDrawer } from "./_components/VariantCreateDrawer";
import { AddPackageModal } from "./_components/AddPackageModal";
import { resolveCatalogParentId } from "./_utils";
import { ProductFilterSidebar } from "./_components/ProductFilterSidebar";
import { ProductEditDrawer } from "./_components/ProductEditDrawer";
import {
  ProductPhotosDrawer,
  ProductQuickEditAllDrawer,
  ProductMobileDetailDrawer,
} from "./_components/ProductDrawers";
import { usePosEvents } from "@/hooks/use-pos-events";

export default function ProductsPage() {
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

  const catalog = useCatalogList(branchId);
  const detail = useProductDetail(branchId);
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
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

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
  const variantDrawerParentName =
    (D?.variantOfItemId && detail.variantParentDisplayName?.trim()) ||
    D?.name?.trim() ||
    "This product";
  const variantDrawerParentIsGroup =
    !!D && !D.variantOfItemId?.trim() && D.isSellable === false;
  const variantCreateSubmitCount = m.variantDraftRows.filter((r) =>
    r.variantName.trim(),
  ).length;
  const catalogMessageInDrawer =
    !!catalog.message.trim() &&
    !!(activeDrawer || quick.quickEditAllOpen || (mobileDetailOpen && !isLg));
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
  };

  return (
    <>
      <div className="relative flex h-full min-h-0 w-full min-w-0 max-w-full flex-col gap-4 overflow-x-hidden px-3 pb-6 sm:px-4 md:px-4">
        <div className="relative flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-4">
          <ProductHeroHeader
            itemTypeCount={catalog.itemTypes.length}
            onCreateNew={() => setActiveDrawer("create-parent")}
          />
          <ProductMobileFilterBar catalog={catalog} />
          <section
            className={cn(
              panelClass,
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            )}
          >
            <div className="grid min-h-0 min-w-0 max-w-full flex-1 grid-cols-1 gap-4 overflow-x-hidden p-3 sm:p-4 lg:grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)_minmax(0,min(22rem,34vw))] lg:items-stretch lg:gap-4 lg:p-4">
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
              />
              <div className="hidden min-w-0 max-w-full overflow-x-hidden lg:flex lg:min-h-0 lg:flex-col lg:border-l lg:border-border/50 lg:pl-3">
                <div
                  className={cn(
                    "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.02] dark:bg-card/90 dark:ring-white/[0.04]",
                  )}
                >
                  {D ? (
                    <>
                      <div className="shrink-0 border-b border-border/50 bg-muted/35 px-3 py-2 ring-1 ring-inset ring-black/[0.02] dark:bg-muted/25 dark:ring-white/[0.04] sm:px-3.5">
                        <h2 className="text-xs font-semibold tracking-tight text-foreground">
                          Product details
                        </h2>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:px-3.5 sm:py-3">
                        <ProductDetailPanel {...p} />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                      <div className="flex size-16 items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04]">
                        <MousePointerClick className="size-8 text-primary/70" />
                      </div>
                      <p className="text-sm font-semibold">
                        Choose something from the catalog
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        disabled={catalog.itemTypes.length === 0}
                        onClick={() => setActiveDrawer("create-parent")}
                        className="gap-2 rounded-xl shadow-sm"
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
