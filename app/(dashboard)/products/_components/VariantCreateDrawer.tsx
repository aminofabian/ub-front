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
      title="Add variants to parent"
      description={
        parentIsProductGroup
          ? `Under group “${parentDisplayName}”.`
          : `Under “${parentDisplayName}”.`
      }
      contextLabel={parentIsProductGroup ? "Parent group" : "Parent product"}
      icon={<Layers className="size-5 text-primary" aria-hidden />}
      width="wide"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={m.variantCreateBusy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-variant-form"
            disabled={m.variantCreateBusy || variantCreateSubmitCount === 0}
            className="gap-2"
          >
            {m.variantCreateBusy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {variantCreateSubmitCount > 1
                  ? `Creating ${variantCreateSubmitCount}…`
                  : "Creating…"}
              </>
            ) : (
              <>
                <Plus className="size-4" aria-hidden />
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
        parentDisplayName={parentDisplayName}
        parentIsProductGroup={parentIsProductGroup}
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
