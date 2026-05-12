"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Layers,
  List,
  Loader2,
  MousePointerClick,
  PackagePlus,
  Rows3,
  Trash2,
} from "lucide-react";

import {
  DashboardNotice,
  dashboardHintClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { cn } from "@/lib/utils";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  type ProductDrawerId,
  panelClass,
  VARIANT_INPUT_CLASS,
} from "./_types";
import { useCatalogList } from "./_hooks/useCatalogList";
import { useProductDetail } from "./_hooks/useProductDetail";
import { useQuickEdit } from "./_hooks/useQuickEdit";
import { useProductMutations } from "./_hooks/useProductMutations";
import { VirtualizedCatalogBody } from "./_components/VirtualizedCatalogBody";
import { VariantDrawerForm } from "./variant-drawer-form";
import { ProductDetailPanel } from "./_components/ProductDetailPanel";
import { ProductHeroHeader } from "./_components/ProductHeroHeader";
import { ProductMobileFilterBar } from "./_components/ProductMobileFilterBar";
import { ProductCreateDrawer } from "./_components/ProductCreateDrawer";
import { ProductFilterSidebar } from "./_components/ProductFilterSidebar";
import {
  ProductEditDrawer,
  ProductPhotosDrawer,
  ProductQuickEditAllDrawer,
  ProductMobileDetailDrawer,
} from "./_components/ProductDrawers";
import { usePosEvents } from "@/hooks/use-pos-events";

export default function ProductsPage() {
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

  const catalog = useCatalogList();
  const detail = useProductDetail(branchId);
  const quick = useQuickEdit({
    selectedId: detail.selectedId,
    detail: detail.detail,
    primaryCost: detail.primaryCost,
    canCatalogWrite,
    canInventoryWrite,
    branches: branches,
    defaultBranchId: branchId,
    refreshFullCatalog: catalog.refreshFullCatalog,
    refreshSelectedDetail: detail.refreshSelectedDetail,
    setMessage: catalog.setMessage,
  });
  const [activeDrawer, setActiveDrawer] = useState<ProductDrawerId | null>(
    null,
  );
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsLg(mq.matches);  
    mq.addEventListener("change", () => setIsLg(mq.matches));
    return () => mq.removeEventListener("change", () => setIsLg(mq.matches));
  }, []);

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
    saveQuickMinStock: quick.saveQuickMinStock,
    saveQuickReorder: quick.saveQuickReorder,
    quickStock: quick.quickStock,
    setQuickStock: quick.setQuickStock,
    quickStockBranchId: quick.quickStockBranchId,
    setQuickStockBranchId: quick.setQuickStockBranchId,
    quickStockUnitCost: quick.quickStockUnitCost,
    setQuickStockUnitCost: quick.setQuickStockUnitCost,
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
  };

  return (
    <>
      <div className="relative -mx-4 flex h-full min-h-0 w-[calc(100%+2rem)] max-w-none flex-col gap-4 overflow-hidden px-3 pb-6 sm:px-4 md:-mx-6 md:w-[calc(100%+3rem)] md:px-4">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4">
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
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-3 sm:p-4 lg:flex-row lg:items-stretch lg:gap-4 lg:p-4">
              <ProductFilterSidebar catalog={catalog} />
              <div className="flex min-h-[12rem] min-w-0 flex-1 flex-col gap-2 lg:min-h-0 lg:flex-[3_1_0%] lg:overflow-hidden lg:pr-1">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-muted/25 px-3 py-2.5 ring-1 ring-inset ring-black/[0.02] dark:ring-white/[0.04]">
                  <span
                    className={cn(
                      dashboardHintClass(),
                      "font-medium tabular-nums text-muted-foreground",
                    )}
                  >
                    <span className="text-foreground">
                      {catalog.listTotalElements}
                    </span>{" "}
                    in view
                    {catalog.listRows.length < catalog.listTotalElements && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {catalog.listRows.length} loaded
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        catalog.listDensity === "comfortable"
                          ? "secondary"
                          : "ghost"
                      }
                      className="h-8 gap-1 px-2 shadow-sm transition-shadow hover:shadow"
                      onClick={() => catalog.setListDensity("comfortable")}
                    >
                      <Rows3 className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        catalog.listDensity === "dense" ? "secondary" : "ghost"
                      }
                      className="h-8 gap-1 px-2 shadow-sm transition-shadow hover:shadow"
                      onClick={() => catalog.setListDensity("dense")}
                    >
                      <List className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {catalog.rowSelection.size > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5 text-xs shadow-sm ring-1 ring-primary/10">
                    <span className="font-medium text-foreground">
                      {catalog.rowSelection.size} selected
                    </span>
                    <div className="flex items-center gap-2">
                      {canCatalogWrite && (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="h-7 gap-1 text-xs"
                          disabled={m.bulkDeleteBusy}
                          onClick={() => void m.onBulkDeleteSelected()}
                        >
                          {m.bulkDeleteBusy ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}{" "}
                          Delete selected
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        disabled={m.bulkDeleteBusy}
                        onClick={() => catalog.setRowSelection(new Set())}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <VirtualizedCatalogBody
                    rows={catalog.listRows}
                    categoryById={catalog.categoryById}
                    selectedId={detail.selectedId}
                    selectedIds={catalog.rowSelection}
                    density={catalog.listDensity}
                    onRowClick={(id) => {
                      detail.selectProduct(id);
                      setMobileDetailOpen(true);
                    }}
                    onToggleRowSelect={catalog.onToggleRowSelect}
                    isRowActive={isListRowActive}
                    loadingMore={catalog.listLoadingMore}
                    hasMore={!catalog.listLast}
                    onLoadMore={catalog.loadMoreCatalog}
                    initialLoading={catalog.listLoadingInitial}
                  />
                </div>
              </div>
              <div className="hidden lg:flex lg:min-h-0 lg:flex-[2_1_0%] lg:min-w-[22rem] lg:flex-col lg:border-l lg:border-border/50 lg:pl-3 xl:min-w-[24rem] 2xl:min-w-[26rem]">
                <div
                  className={cn(
                    "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.02] dark:bg-card/90 dark:ring-white/[0.04]",
                  )}
                >
                  {D ? (
                    <>
                      <div className="shrink-0 border-b border-border/50 bg-muted/35 px-4 py-3.5 sm:px-5">
                        <h2 className="text-sm font-semibold tracking-tight text-foreground">
                          Product details
                        </h2>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
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
        refreshFullCatalog={catalog.refreshFullCatalog}
        refreshSelectedDetail={detail.refreshSelectedDetail}
        setMessage={catalog.setMessage}
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

      <FormDrawer
        open={activeDrawer === "add-variant" && !!D}
        onOpenChange={(o) => {
          if (!o) setActiveDrawer(null);
        }}
        banner={
          activeDrawer === "add-variant" && catalog.message.trim() ? (
            <FormDrawerMessageBanner text={catalog.message} />
          ) : undefined
        }
        title="Add variants"
        description={
          variantDrawerParentIsGroup
            ? `Add SKUs under “${variantDrawerParentName}”. Each row has its own prices and stock; story and reorder fields use the selector when you add several rows.`
            : `Add options under “${variantDrawerParentName}”. Each row has its own prices and stock.`
        }
        contextLabel="Variants"
        icon={<Layers className="size-5 text-primary" />}
        width="wide"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveDrawer(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-variant-form"
              disabled={m.variantCreateBusy || variantCreateSubmitCount === 0}
            >
              {m.variantCreateBusy
                ? "Creating…"
                : variantCreateSubmitCount > 1
                  ? `Create ${variantCreateSubmitCount} variants`
                  : "Create variant"}
            </Button>
          </div>
        }
      >
        {D && (
          <VariantDrawerForm
            variantDraftRows={m.variantDraftRows}
            setVariantDraftRows={m.setVariantDraftRows}
            addVariantDraftRow={m.addVariantDraftRow}
            removeVariantDraftRow={m.removeVariantDraftRow}
            parentDisplayName={variantDrawerParentName}
            parentIsProductGroup={variantDrawerParentIsGroup}
            suggestedNextSku={m.nextAutoSkuHint}
            sortedCategories={catalog.sortedCategories}
            branches={m.branches}
            suppliersForLink={m.suppliersForLink}
            suppliersLoading={m.suppliersLoading}
            loadSuppliersForLink={m.loadSuppliersForLink}
            canLinkSupplier={canLinkSupplier}
            canListSuppliers={canListSuppliers}
            canSetSellPrice={canSetSellPrice}
            canInventoryWrite={canInventoryWrite}
            currencyCode={business?.currency?.trim() || ""}
            pendingVariantImage={m.pendingVariantImage}
            setPendingVariantImage={m.setPendingVariantImage}
            onSubmit={m.onAddVariant}
            inputClassName={VARIANT_INPUT_CLASS}
          />
        )}
      </FormDrawer>

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
