"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { MarketplaceOrderWorkspace } from "@/app/marketplace/_components/marketplace-order-panel";
import { Input } from "@/components/ui/input";
import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import {
  spBtnGhost,
  spBtnPrimary,
  spPage,
  spSerifTitle,
} from "@/components/supplier-portal/supplier-portal-ui";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { APP_ROUTES } from "@/lib/config";
import {
  createSupplierPortalProduct,
  deleteSupplierPortalProduct,
  fetchSupplierPortalProducts,
  fetchSupplierPortalProfile,
  patchSupplierPortalProduct,
  type MarketplaceSupplierDetail,
  type SupplierPortalProduct,
  type SupplierPortalProfile,
} from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  name: "",
  barcode: "",
  sku: "",
  categoryName: "",
  unitPrice: "",
  currency: "KES",
};

function toShelfDetail(
  profile: SupplierPortalProfile | null,
  products: SupplierPortalProduct[],
): MarketplaceSupplierDetail {
  const phone = profile?.contactPhone?.trim() || null;
  return {
    id: profile?.marketplaceSupplierId || "portal-catalog",
    name: profile?.name?.trim() || "Your catalogue",
    slug: profile?.username?.trim() || null,
    description: profile?.description ?? null,
    supplierType: null,
    listedBy: null,
    location: profile?.contactLocation ?? null,
    locations: profile?.deliveryRegions ?? [],
    status: profile?.status ?? "ACTIVE",
    contactEmail: profile?.contactEmail ?? null,
    contactPhone: phone,
    contacts: phone
      ? [
          {
            name: profile?.name ?? null,
            roleLabel: "Supplier",
            phone,
            email: profile?.contactEmail ?? null,
            primaryContact: true,
          },
        ]
      : [],
    paymentMethodPreferred: null,
    paymentDetails: null,
    payoutType: null,
    payoutPhone: null,
    creditTermsDays: null,
    deliveryRegions: profile?.deliveryRegions ?? [],
    categoryTags: profile?.categoryTags ?? [],
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: null,
      barcode: p.barcode,
      sku: p.sku,
      categoryName: p.categoryName,
      imageUrl: p.imageUrl ?? null,
      packSize: p.packSize,
      packUnit: p.packUnit,
      minOrderQty: p.minOrderQty,
      unitPrice: p.unitPrice,
      currency: p.currency,
      available: p.available,
    })),
  };
}

export default function SupplierPortalCatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<SupplierPortalProduct[]>([]);
  const [profile, setProfile] = useState<SupplierPortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [page, me] = await Promise.all([
        fetchSupplierPortalProducts({ size: 200 }),
        fetchSupplierPortalProfile().catch(() => null),
      ]);
      setProducts(page.content);
      setProfile(me);
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

  const shelfDetail = useMemo(
    () => toShelfDetail(profile, products),
    [profile, products],
  );

  const publicHref =
    profile?.publicHubPath ||
    (profile?.username ? `/s/${encodeURIComponent(profile.username)}` : null);

  const onCreate = async (e: FormEvent) => {
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
      setComposerOpen(false);
      toast.success("Product added");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const onDelete = (productId: string, name: string) => {
    showThemedConfirmToast({
      id: `supplier-portal-delete-${productId}`,
      title: "Remove this product?",
      description: `${name} will be removed from your catalogue.`,
      confirmLabel: "Remove",
      onConfirm: async () => {
        try {
          await deleteSupplierPortalProduct(productId);
          toast.success("Product removed");
          await load();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Delete failed");
        }
      },
    });
  };

  const onEditPrice = async (product: SupplierPortalProduct) => {
    const raw = window.prompt(
      `New unit price for ${product.name}`,
      product.unitPrice != null ? String(product.unitPrice) : "",
    );
    if (raw == null) return;
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid price");
      return;
    }
    try {
      const updated = await patchSupplierPortalProduct(product.id, { unitPrice: price });
      if (updated.pendingEditId) {
        toast.success("Price change submitted for shop approval");
      } else {
        toast.success("Price updated");
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  };

  return (
    <SupplierPortalShell>
      <div className={cn(spPage, "space-y-3")}>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className={cn(spSerifTitle, "text-[1.85rem] leading-none sm:text-[2.35rem]")}>
              Catalogue
            </h2>
            <p className="mt-1.5 max-w-xl text-[13px] text-muted-foreground">
              Same public shelf shops see
              {publicHref ? " on your /s/ page" : ""} — PDFs match the marketplace lookbook.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {publicHref ? (
              <Link
                href={publicHref}
                target="_blank"
                rel="noopener noreferrer"
                className={spBtnGhost}
              >
                <ExternalLink className="size-3.5" />
                Public page
              </Link>
            ) : null}
            <button
              type="button"
              className={spBtnGhost}
              onClick={() => setManageOpen((v) => !v)}
            >
              {manageOpen ? "Hide manage" : "Manage prices"}
            </button>
            <button
              type="button"
              className={spBtnPrimary}
              onClick={() => setComposerOpen((v) => !v)}
            >
              {composerOpen ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
              {composerOpen ? "Close" : "Add product"}
            </button>
          </div>
        </header>

        {composerOpen ? (
          <section className="overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,#fff_88%,#f7f3eb)]">
            <div className="flex h-9 items-center justify-between bg-[var(--pos-primary,#0f766e)] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
              <span>New product</span>
              <span className="font-mono opacity-85">draft</span>
            </div>
            <form
              className="grid gap-2.5 p-3 sm:grid-cols-2 lg:grid-cols-3 sm:p-4"
              onSubmit={onCreate}
            >
              <Input
                placeholder="Product name *"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="h-9 rounded-none sm:col-span-2"
              />
              <Input
                placeholder="Unit price *"
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                className="h-9 rounded-none font-mono"
              />
              <Input
                placeholder="Barcode"
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                className="h-9 rounded-none font-mono"
              />
              <Input
                placeholder="SKU"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                className="h-9 rounded-none font-mono"
              />
              <Input
                placeholder="Category / family"
                value={form.categoryName}
                onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))}
                className="h-9 rounded-none"
              />
              <button
                type="submit"
                disabled={creating}
                className={cn(spBtnPrimary, "h-10 sm:col-span-2 lg:col-span-3")}
              >
                <Plus className="size-3.5" />
                {creating ? "Adding…" : "Add to shelf"}
              </button>
            </form>
          </section>
        ) : null}

        {manageOpen ? (
          <section className="overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,#fff_88%,#f7f3eb)]">
            <div className="flex h-9 items-center justify-between bg-[var(--pos-primary,#0f766e)] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
              <span>Manage prices</span>
              <span className="font-mono opacity-85">{products.length}</span>
            </div>
            {products.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No products yet.
              </p>
            ) : (
              <ul className="max-h-56 divide-y divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] overflow-y-auto">
                {products.map((product) => (
                  <li
                    key={product.id}
                    className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[var(--pos-ink,#1c1915)]">
                        {product.name}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {product.categoryName || "Uncategorised"}
                        {product.pendingEditId ? " · pending approval" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={cn(spBtnGhost, "h-7 text-[10px]")}
                      onClick={() => void onEditPrice(product)}
                    >
                      Price
                    </button>
                    <button
                      type="button"
                      className={cn(spBtnGhost, "h-7 text-[10px]")}
                      onClick={() => onDelete(product.id, product.name)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {loading ? (
          <div className="flex min-h-[28rem] items-center justify-center gap-2 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading shelf…
          </div>
        ) : (
          <MarketplaceOrderWorkspace
            key={`${shelfDetail.id}-${products.length}-${products.map((p) => p.updatedAt).join("|").slice(0, 80)}`}
            detail={shelfDetail}
            layout="shelf"
            ownerMode
          />
        )}
      </div>
    </SupplierPortalShell>
  );
}
