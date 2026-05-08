"use client";

import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import type { CatalogListApi } from "../_hooks/useCatalogList";
import type { ProductMutationsApi } from "../_hooks/useProductMutations";

type Props = {
  open: boolean;
  onClose: () => void;
  catalog: Pick<CatalogListApi, "itemTypes" | "sortedCategories">;
  m: Pick<ProductMutationsApi,
    "parentDraft" | "setParentDraft" | "nextAutoSkuHint" |
    "suppliersForLink" | "suppliersLoading" | "loadSuppliersForLink" |
    "onCreateParent"
  >;
  canLinkSupplier: boolean;
  canListSuppliers: boolean;
};

export function ProductCreateDrawer({ open, onClose, catalog, m, canLinkSupplier, canListSuppliers }: Props) {
  return (
    <FormDrawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}
      title="New product" description="Creates one standalone sellable SKU." contextLabel="Catalog · Step 1"
      icon={<PackagePlus className="size-5 text-primary" aria-hidden />}
      footer={<div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="create-parent-form" disabled={catalog.itemTypes.length === 0}>Create product</Button>
      </div>}>
      <form id="create-parent-form" className="space-y-5" onSubmit={m.onCreateParent}>
        {catalog.itemTypes.length === 0 && <p className="text-sm text-destructive">No item types in tenant.</p>}
        <FormDrawerFields legend="Identity" hint="Starts as one sellable SKU.">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground" htmlFor="drawer-item-type">
            Item type
            <select id="drawer-item-type" className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={m.parentDraft.itemTypeId} onChange={(e) => m.setParentDraft(p => ({ ...p, itemTypeId: e.target.value }))} required>
              {catalog.itemTypes.map(t => <option key={t.id} value={t.id}>{t.label} ({t.key})</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Display name
            <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Customer-facing title"
              value={m.parentDraft.name} onChange={(e) => m.setParentDraft(p => ({ ...p, name: e.target.value }))} required />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">SKU</span>
              <div className="flex flex-wrap items-center gap-2">
                <input className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono" placeholder="Optional"
                  value={m.parentDraft.sku} onChange={(e) => m.setParentDraft(p => ({ ...p, sku: e.target.value }))} />
                {m.nextAutoSkuHint && <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 gap-1 px-2.5 text-xs"
                  onClick={() => m.setParentDraft(p => ({ ...p, sku: m.nextAutoSkuHint! }))}>Use {m.nextAutoSkuHint}</Button>}
              </div>
            </div>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Barcode
              <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono" placeholder="Optional"
                value={m.parentDraft.barcode} onChange={(e) => m.setParentDraft(p => ({ ...p, barcode: e.target.value }))} />
            </label>
          </div>
        </FormDrawerFields>
        <FormDrawerFields legend="Merchandising" hint="Categories power kiosk rails.">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground" htmlFor="drawer-parent-category">
            Category
            <select id="drawer-parent-category" className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={m.parentDraft.categoryId} onChange={(e) => m.setParentDraft(p => ({ ...p, categoryId: e.target.value }))}>
              <option value="">— None —</option>
              {catalog.sortedCategories.map(c => <option key={c.id} value={c.id}>{c.name}{!c.active ? " (inactive)" : ""}</option>)}
            </select>
          </label>
        </FormDrawerFields>
        {canLinkSupplier && (
          <FormDrawerFields legend="Supplier shortcut" hint="Optional live link.">
            {canListSuppliers && <Button type="button" variant="outline" size="sm" disabled={m.suppliersLoading} onClick={() => void m.loadSuppliersForLink()}>{m.suppliersLoading ? "Loading…" : "Refresh supplier list"}</Button>}
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">Supplier
              <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={m.suppliersForLink.some(s => s.id === m.parentDraft.supplierId) ? m.parentDraft.supplierId : ""}
                onChange={(e) => m.setParentDraft(p => ({ ...p, supplierId: e.target.value }))}>
                <option value="">— None —</option>
                {m.suppliersForLink.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">Supplier SKU
                <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={m.parentDraft.supplierSku}
                  onChange={(e) => m.setParentDraft(p => ({ ...p, supplierSku: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">Default cost
                <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" inputMode="decimal" placeholder="0.00"
                  value={m.parentDraft.defaultCostPrice} onChange={(e) => m.setParentDraft(p => ({ ...p, defaultCostPrice: e.target.value }))} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={m.parentDraft.setPrimarySupplier}
                onChange={(e) => m.setParentDraft(p => ({ ...p, setPrimarySupplier: e.target.checked }))} /> Set as primary supplier
            </label>
          </FormDrawerFields>
        )}
      </form>
    </FormDrawer>
  );
}
