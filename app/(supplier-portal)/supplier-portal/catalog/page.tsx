"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { APP_ROUTES } from "@/lib/config";
import {
  createSupplierPortalProduct,
  deleteSupplierPortalProduct,
  fetchSupplierPortalProducts,
  type SupplierPortalProduct,
} from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { formatMoney } from "@/lib/utils";

const EMPTY_FORM = {
  name: "",
  barcode: "",
  sku: "",
  categoryName: "",
  unitPrice: "",
  currency: "KES",
};

export default function SupplierPortalCatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<SupplierPortalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchSupplierPortalProducts({ size: 100 });
      setProducts(page.content);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load catalogue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void load();
  }, [router, load]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(form.unitPrice);
    if (!form.name.trim() || !Number.isFinite(price)) {
      toast.error("Name and unit price are required");
      return;
    }
    setCreating(true);
    try {
      await createSupplierPortalProduct({
        name: form.name.trim(),
        barcode: form.barcode.trim() || undefined,
        sku: form.sku.trim() || undefined,
        categoryName: form.categoryName.trim() || undefined,
        unitPrice: price,
        currency: form.currency.trim() || "KES",
        available: true,
      });
      setForm(EMPTY_FORM);
      toast.success("Product added");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (productId: string) => {
    if (!window.confirm("Remove this product from your catalogue?")) return;
    try {
      await deleteSupplierPortalProduct(productId);
      toast.success("Product removed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  };

  return (
    <SupplierPortalShell>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight">Catalogue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Products and prices visible to businesses connected to your marketplace profile.
          </p>
        </header>

        <form
          className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={onCreate}
        >
          <Input
            placeholder="Product name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="sm:col-span-2"
          />
          <Input
            placeholder="Unit price *"
            value={form.unitPrice}
            onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
          />
          <Input
            placeholder="Barcode"
            value={form.barcode}
            onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
          />
          <Input
            placeholder="SKU"
            value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          />
          <Input
            placeholder="Category"
            value={form.categoryName}
            onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))}
          />
          <Button type="submit" disabled={creating} className="sm:col-span-2 lg:col-span-3">
            <Plus className="mr-2 size-4" />
            {creating ? "Adding…" : "Add product"}
          </Button>
        </form>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading products…
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Price</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No products yet. Add your first item above.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {product.barcode ?? product.sku ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {product.unitPrice != null
                          ? formatMoney(product.unitPrice, product.currency ?? "KES")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void onDelete(product.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SupplierPortalShell>
  );
}
