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
  addSupplierPortalProductPack,
  createSupplierPortalProduct,
  deleteSupplierPortalProduct,
  fetchSupplierPortalProducts,
  fetchSupplierPortalProfile,
  patchSupplierPortalProduct,
  removeSupplierPortalProductPack,
  uploadSupplierPortalProductImage,
  type MarketplaceSupplierDetail,
  type SupplierPortalProduct,
  type SupplierPortalProfile,
} from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { cn } from "@/lib/utils";

const EMPTY_PACK = { packSize: "", packUnit: "", unitPrice: "" };

/** Product pictures a supplier uploads; the server allows 8 MB. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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
      // Group packs under category so the shelf fills a multi-column grid.
      parentItemName: p.categoryName?.trim() || null,
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
  const [packsOpenId, setPacksOpenId] = useState<string | null>(null);
  const [packForm, setPackForm] = useState(EMPTY_PACK);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const onUploadImage = async (product: SupplierPortalProduct, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a picture file");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("The picture is too large (8 MB at most)");
      return;
    }
    setBusyId(product.id);
    try {
      await uploadSupplierPortalProductImage(product.id, file);
      toast.success("Picture updated");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusyId(null);
    }
  };

  const onAddPack = async (product: SupplierPortalProduct) => {
    const packSize = Number(packForm.packSize);
    const unitPrice = Number(packForm.unitPrice);
    if (!Number.isFinite(packSize) || packSize <= 0) {
      toast.error("Enter how many are in the pack");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      toast.error("Enter the price for one pack");
      return;
    }
    setBusyId(product.id);
    try {
      await addSupplierPortalProductPack(product.id, {
        packSize,
        packUnit: packForm.packUnit.trim() || undefined,
        unitPrice,
      });
      setPackForm(EMPTY_PACK);
      toast.success("Pack added");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the pack");
    } finally {
      setBusyId(null);
    }
  };

  const onRemovePack = async (product: SupplierPortalProduct, packId: string) => {
    setBusyId(product.id);
    try {
      await removeSupplierPortalProductPack(product.id, packId);
      toast.success("Pack removed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the pack");
    } finally {
      setBusyId(null);
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
              {manageOpen ? "Hide manage" : "Manage products"}
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
              <span>Manage products</span>
              <span className="font-mono opacity-85">{products.length}</span>
            </div>
            {products.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No products yet.
              </p>
            ) : (
              <ul className="max-h-[28rem] divide-y divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] overflow-y-auto">
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
                        {product.pricePublic === false
                          ? " · price not public yet, save it to show it"
                          : ""}
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
                      onClick={() => {
                        setPackForm(EMPTY_PACK);
                        setPacksOpenId((id) => (id === product.id ? null : product.id));
                      }}
                    >
                      Packs{product.packs && product.packs.length > 1 ? ` (${product.packs.length})` : ""}
                    </button>
                    <label
                      className={cn(
                        spBtnGhost,
                        "h-7 cursor-pointer text-[10px]",
                        busyId === product.id && "pointer-events-none opacity-60",
                      )}
                    >
                      {product.imageUrl ? "Change photo" : "Add photo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={busyId === product.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          void onUploadImage(product, file);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className={cn(spBtnGhost, "h-7 text-[10px]")}
                      onClick={() => onDelete(product.id, product.name)}
                    >
                      Remove
                    </button>
                    {packsOpenId === product.id ? (
                      <div className="w-full space-y-2 border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] pt-2">
                        {(product.packs ?? []).length === 0 ? (
                          <p className="text-[12px] text-muted-foreground">No packs yet.</p>
                        ) : (
                          <ul className="space-y-1">
                            {(product.packs ?? []).map((pack) => (
                              <li
                                key={pack.id}
                                className="flex items-center justify-between gap-2 font-mono text-[12px] tabular-nums"
                              >
                                <span>
                                  {pack.packSize ?? 1} {pack.packUnit || "each"} ·{" "}
                                  {pack.currency || "KES"} {pack.unitPrice ?? "—"}
                                </span>
                                {(product.packs ?? []).length > 1 ? (
                                  <button
                                    type="button"
                                    className={cn(spBtnGhost, "h-6 text-[10px]")}
                                    disabled={busyId === product.id}
                                    onClick={() => void onRemovePack(product, pack.id)}
                                  >
                                    Remove pack
                                  </button>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="grid gap-2 sm:grid-cols-4">
                          <Input
                            placeholder="How many in the pack"
                            inputMode="decimal"
                            value={packForm.packSize}
                            onChange={(e) =>
                              setPackForm((f) => ({ ...f, packSize: e.target.value }))
                            }
                            className="h-8 rounded-none font-mono"
                          />
                          <Input
                            placeholder="Pack name (carton, dozen)"
                            value={packForm.packUnit}
                            onChange={(e) =>
                              setPackForm((f) => ({ ...f, packUnit: e.target.value }))
                            }
                            className="h-8 rounded-none"
                          />
                          <Input
                            placeholder="Price for one pack"
                            inputMode="decimal"
                            value={packForm.unitPrice}
                            onChange={(e) =>
                              setPackForm((f) => ({ ...f, unitPrice: e.target.value }))
                            }
                            className="h-8 rounded-none font-mono"
                          />
                          <button
                            type="button"
                            className={cn(spBtnPrimary, "h-8 text-[11px]")}
                            disabled={busyId === product.id}
                            onClick={() => void onAddPack(product)}
                          >
                            <Plus className="size-3.5" />
                            Add pack
                          </button>
                        </div>
                      </div>
                    ) : null}
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
