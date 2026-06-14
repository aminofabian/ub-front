"use client";

import { Layers, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormDrawer, type FormDrawerProps } from "@/components/form-drawer";
import type { BranchRecord, CategoryRecord, SupplierRecord } from "@/lib/api";
import type { ProductMutationsApi } from "../_hooks/useProductMutations";
import { VariantDrawerForm } from "../variant-drawer-form";

type Props = {
  open: boolean;
  onClose: () => void;
  banner?: FormDrawerProps["banner"];
  parentDisplayName: string;
  parentIsProductGroup: boolean;
  parentCategoryId?: string;
  parentCategoryName?: string;
  variantCreateSubmitCount: number;
  sortedCategories: CategoryRecord[];
  branches: BranchRecord[];
  m: Pick<
    ProductMutationsApi,
    | "variantDraftRows"
    | "setVariantDraftRows"
    | "addVariantDraftRow"
    | "removeVariantDraftRow"
    | "nextAutoSkuHint"
    | "suppliersForLink"
    | "suppliersLoading"
    | "loadSuppliersForLink"
    | "onAddVariant"
    | "pendingVariantImage"
    | "setPendingVariantImage"
    | "variantCreateBusy"
  >;
  canLinkSupplier: boolean;
  canListSuppliers: boolean;
  canSetSellPrice: boolean;
  canInventoryWrite: boolean;
  currencyCode: string;
};

export function VariantCreateDrawer({
  open,
  onClose,
  banner,
  parentDisplayName,
  parentIsProductGroup,
  parentCategoryId,
  parentCategoryName,
  variantCreateSubmitCount,
  sortedCategories,
  branches,
  m,
  canLinkSupplier,
  canListSuppliers,
  canSetSellPrice,
  canInventoryWrite,
  currencyCode,
}: Props) {
  const submitLabel =
    variantCreateSubmitCount > 1
      ? `Create ${variantCreateSubmitCount} variants`
      : "Create variant";

  return (
    <FormDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      banner={banner}
      title={`Add variants to ${parentDisplayName}`}
      contextLabel={parentIsProductGroup ? "Parent group" : "Parent product"}
      icon={<Layers className="size-3.5 text-primary" aria-hidden />}
      width="wide"
      headerDensity="compact"
      footer={
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={onClose}
            disabled={m.variantCreateBusy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-variant-form"
            size="sm"
            disabled={m.variantCreateBusy || variantCreateSubmitCount === 0}
            className="h-8 gap-1.5 px-2.5 text-xs"
          >
            {m.variantCreateBusy ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {variantCreateSubmitCount > 1
                  ? `Creating ${variantCreateSubmitCount}…`
                  : "Creating…"}
              </>
            ) : (
              <>
                <Plus className="size-3.5" aria-hidden />
                {submitLabel}
              </>
            )}
          </Button>
        </div>
      }
    >
      <VariantDrawerForm
        variantDraftRows={m.variantDraftRows}
        setVariantDraftRows={m.setVariantDraftRows}
        addVariantDraftRow={m.addVariantDraftRow}
        removeVariantDraftRow={m.removeVariantDraftRow}
        parentIsProductGroup={parentIsProductGroup}
        parentCategoryId={parentCategoryId}
        parentCategoryName={parentCategoryName}
        suggestedNextSku={m.nextAutoSkuHint}
        sortedCategories={sortedCategories}
        branches={branches}
        suppliersForLink={m.suppliersForLink}
        suppliersLoading={m.suppliersLoading}
        loadSuppliersForLink={m.loadSuppliersForLink}
        canLinkSupplier={canLinkSupplier}
        canListSuppliers={canListSuppliers}
        canSetSellPrice={canSetSellPrice}
        canInventoryWrite={canInventoryWrite}
        currencyCode={currencyCode}
        pendingVariantImage={m.pendingVariantImage}
        setPendingVariantImage={m.setPendingVariantImage}
        onSubmit={m.onAddVariant}
      />
    </FormDrawer>
  );
}
