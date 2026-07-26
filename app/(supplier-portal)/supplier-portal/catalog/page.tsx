"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Download,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import {
  mktChip,
  mktChipActive,
  mktPosAccentBar,
  mktPosHeader,
  mktPosSearch,
  mktPosTile,
  spBtnGhost,
  spBtnPrimary,
  spEyebrow,
  spPage,
  spPanel,
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
  type SupplierPortalProduct,
  type SupplierPortalProfile,
} from "@/lib/marketplace-api";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { downloadSupplierPortalCatalogPdf } from "@/lib/supplier-portal-catalog-pdf";
import { cn, formatMoney } from "@/lib/utils";

const EMPTY_FORM = {
  name: "",
  barcode: "",
  sku: "",
  categoryName: "",
  unitPrice: "",
  currency: "KES",
};

const ALL_CATEGORY = "all";

function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function productInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export default function SupplierPortalCatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<SupplierPortalProduct[]>([]);
  const [profile, setProfile] = useState<SupplierPortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [pdfBusy, setPdfBusy] = useState(false);

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

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const c = p.categoryName?.trim();
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== ALL_CATEGORY) {
        const c = p.categoryName?.trim() || "Uncategorised";
        if (c !== category) return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.categoryName ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, query, category]);

  const pricedCount = useMemo(
    () => products.filter((p) => p.unitPrice != null).length,
    [products],
  );
  const withPhotos = useMemo(
    () => products.filter((p) => Boolean(posTileThumbUrl(p.name, p.imageUrl))).length,
    [products],
  );

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
      setComposerOpen(false);
      toast.success("Product added");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const onDelete = (productId: string) => {
    showThemedConfirmToast({
      id: `supplier-portal-delete-${productId}`,
      title: "Remove this product?",
      description: "It will be removed from your catalogue.",
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

  const onDownloadPdf = () => {
    if (products.length === 0) {
      toast.error("Add products before downloading a lookbook");
      return;
    }
    setPdfBusy(true);
    try {
      downloadSupplierPortalCatalogPdf({
        supplierName: profile?.name ?? "Supplier",
        contactPhone: profile?.contactPhone,
        contactEmail: profile?.contactEmail,
        username: profile?.username,
        products: filtered.length > 0 && (query || category !== ALL_CATEGORY) ? filtered : products,
      });
      toast.success("Catalogue PDF downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF failed");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <SupplierPortalShell>
      <div className={cn(spPage, "space-y-5")}>
        <header className="relative overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              background:
                "radial-gradient(80% 120% at 0% 0%, color-mix(in_srgb,#0f766e 22%, transparent), transparent 55%)," +
                "radial-gradient(60% 80% at 100% 20%, color-mix(in_srgb,#c4a574 18%, transparent), transparent 50%)," +
                "linear-gradient(135deg, transparent 40%, color-mix(in_srgb,var(--pos-ink,#1c1915) 4%, transparent) 40.5%, transparent 41%)",
            }}
          />
          <div className="relative flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div>
              <p className={spEyebrow}>sell · catalogue</p>
              <h2 className={cn(spSerifTitle, "mt-1")}>Catalogue</h2>
              <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                Your wholesale shelf — photos from linked shops, prices shops see when they order.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={spBtnGhost}
                onClick={() => setComposerOpen((v) => !v)}
              >
                {composerOpen ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                {composerOpen ? "Close" : "Add product"}
              </button>
              <button
                type="button"
                className={spBtnPrimary}
                disabled={pdfBusy || loading || products.length === 0}
                onClick={onDownloadPdf}
              >
                {pdfBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                Download PDF
              </button>
            </div>
          </div>
          <div className="relative flex flex-wrap gap-2 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-4 py-3 sm:px-5">
            <span className={mktChip}>{products.length} products</span>
            <span className={mktChip}>{categories.length} categories</span>
            <span className={mktChip}>{pricedCount} priced</span>
            <span className={mktChip}>{withPhotos} with photos</span>
          </div>
        </header>

        {composerOpen ? (
          <section className={spPanel}>
            <div className={mktPosHeader}>
              <span>New product</span>
              <span>draft</span>
            </div>
            <form className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onCreate}>
              <Input
                placeholder="Product name *"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-none sm:col-span-2"
              />
              <Input
                placeholder="Unit price *"
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                className="rounded-none"
              />
              <Input
                placeholder="Barcode"
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                className="rounded-none"
              />
              <Input
                placeholder="SKU"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                className="rounded-none"
              />
              <Input
                placeholder="Category"
                value={form.categoryName}
                onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))}
                className="rounded-none"
              />
              <button
                type="submit"
                disabled={creating}
                className={cn(spBtnPrimary, "sm:col-span-2 lg:col-span-3")}
              >
                <Plus className="size-3.5" />
                {creating ? "Adding…" : "Add to shelf"}
              </button>
            </form>
          </section>
        ) : null}

        <section className={spPanel}>
          <div className={mktPosHeader}>
            <span>1 · Shelf</span>
            <span>{filtered.length}</span>
          </div>
          <div className="flex flex-col gap-3 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-3 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, barcode, SKU…"
                className={cn(mktPosSearch, "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_96%,#f7f3eb)]")}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={cn(mktChip, category === ALL_CATEGORY && mktChipActive)}
                onClick={() => setCategory(ALL_CATEGORY)}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(mktChip, category === c && mktChipActive)}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
              {products.some((p) => !p.categoryName?.trim()) ? (
                <button
                  type="button"
                  className={cn(mktChip, category === "Uncategorised" && mktChipActive)}
                  onClick={() => setCategory("Uncategorised")}
                >
                  Uncategorised
                </button>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading shelf…
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {products.length === 0
                ? "No products yet. Add your first item, or sign out/in so linked shop products can import."
                : "No products match this filter."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-px bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {filtered.map((product, index) => (
                <CatalogTile
                  key={product.id}
                  product={product}
                  index={index}
                  onEditPrice={() => void onEditPrice(product)}
                  onDelete={() => onDelete(product.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className={cn(spPanel, "overflow-hidden")}>
          <div className={mktPosHeader}>
            <span>2 · Lookbook PDF</span>
            <span>print-ready</span>
          </div>
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] p-5 lg:border-b-0 lg:border-r">
              <span className={mktPosAccentBar} />
              <p className={cn(spEyebrow, "pl-2")}>share with buyers</p>
              <h3 className="mt-1 pl-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
                Download a styled price list
              </h3>
              <p className="mt-2 max-w-md pl-2 text-sm text-muted-foreground">
                Teal cover, category sections, pack sizes and wholesale prices — ready to email or
                print for shopkeepers.
              </p>
              <ul className="mt-4 space-y-1.5 pl-2 text-sm text-[var(--pos-ink,#1c1915)]">
                <li className="flex gap-2">
                  <span className="text-[var(--pos-primary,#0f766e)]">▸</span>
                  Groups by category automatically
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--pos-primary,#0f766e)]">▸</span>
                  Uses your current search / filter when set
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--pos-primary,#0f766e)]">▸</span>
                  Includes contact details from your profile
                </li>
              </ul>
              <div className="mt-5 pl-2">
                <button
                  type="button"
                  className={spBtnPrimary}
                  disabled={pdfBusy || products.length === 0}
                  onClick={onDownloadPdf}
                >
                  {pdfBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  Download catalogue PDF
                </button>
              </div>
            </div>

            <LookbookPreview
              supplierName={profile?.name ?? "Your brand"}
              productCount={
                filtered.length > 0 && (query || category !== ALL_CATEGORY)
                  ? filtered.length
                  : products.length
              }
              sample={filtered.slice(0, 5)}
            />
          </div>
        </section>
      </div>
    </SupplierPortalShell>
  );
}

function CatalogTile({
  product,
  index,
  onEditPrice,
  onDelete,
}: {
  product: SupplierPortalProduct;
  index: number;
  onEditPrice: () => void;
  onDelete: () => void;
}) {
  const hue = hueFromId(product.id);
  const thumb = posTileThumbUrl(product.name, product.imageUrl);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(thumb && !failed);

  return (
    <article
      className={cn(mktPosTile, "bg-[color-mix(in_srgb,var(--card)_96%,#f7f3eb)]")}
      style={{ animationDelay: `${Math.min(index, 16) * 28}ms` }}
    >
      <div
        className="relative aspect-square w-full overflow-hidden border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]"
        style={
          showImage
            ? undefined
            : {
                background: `linear-gradient(145deg, hsl(${hue} 22% 88%), hsl(${(hue + 32) % 360} 16% 76%))`,
              }
        }
      >
        {showImage ? (
          <Image
            src={thumb!}
            alt={product.name}
            fill
            unoptimized
            className="object-contain p-1 transition-transform duration-300 group-hover:scale-[1.05]"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 160px"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <span className="inline-flex size-10 items-center justify-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-card/80 text-[11px] font-bold tracking-wide text-[var(--pos-ink,#1c1915)]">
              {productInitials(product.name)}
            </span>
            <Package className="size-4 opacity-40" />
          </div>
        )}
        {product.pendingEditId ? (
          <span className="absolute left-1.5 top-1.5 border border-amber-700/30 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800">
            Pending
          </span>
        ) : null}
        {!product.available ? (
          <span className="absolute right-1.5 top-1.5 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_20%,transparent)] bg-card/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Off
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-2 pb-2 pt-1.5">
        <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)]">
          {product.name}
        </p>
        <p className="font-mono text-[11px] font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
          {product.unitPrice != null
            ? formatMoney(product.unitPrice, product.currency ?? "KES")
            : "Ask"}
        </p>
        <p className="truncate text-[9px] text-muted-foreground">
          {product.categoryName || "Uncategorised"}
          {product.barcode || product.sku ? ` · ${product.barcode ?? product.sku}` : ""}
        </p>
        {product.pendingProposed?.unitPrice != null ? (
          <p className="text-[9px] text-amber-700">
            Proposed → {String(product.pendingProposed.unitPrice)}
          </p>
        ) : null}
        <div className="mt-auto flex gap-1 pt-1">
          <button
            type="button"
            className={cn(spBtnGhost, "h-7 flex-1 px-1.5 text-[9px]")}
            onClick={onEditPrice}
          >
            <Pencil className="size-3" />
            Price
          </button>
          <button
            type="button"
            className={cn(spBtnGhost, "h-7 px-2 text-[9px]")}
            onClick={onDelete}
            aria-label={`Remove ${product.name}`}
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
    </article>
  );
}

function LookbookPreview({
  supplierName,
  productCount,
  sample,
}: {
  supplierName: string;
  productCount: number;
  sample: SupplierPortalProduct[];
}) {
  return (
    <div className="relative flex items-center justify-center bg-[linear-gradient(160deg,#e8e2d6,#f4efe6_45%,#ddd5c6)] p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-12deg, transparent, transparent 10px, color-mix(in_srgb,var(--pos-ink,#1c1915) 4%, transparent) 10px, color-mix(in_srgb,var(--pos-ink,#1c1915) 4%, transparent) 11px)",
        }}
      />
      <div className="relative w-full max-w-[280px] rotate-[-2.5deg] border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] bg-[#fbf8f2] shadow-[8px_10px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] transition duration-300 hover:rotate-0">
        <div className="bg-[var(--pos-primary,#0f766e)] px-3 py-3 text-[var(--pos-primary-ink,#fff)]">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] opacity-80">Kiosk</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-lg font-semibold leading-tight">
            Wholesale catalogue
          </p>
          <p className="mt-1 truncate text-[10px] opacity-90">{supplierName}</p>
        </div>
        <div className="space-y-2 px-3 py-3">
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[var(--pos-primary,#0f766e)]">
            <span>Product</span>
            <span>Price</span>
          </div>
          {(sample.length > 0 ? sample : [{ id: "empty", name: "Your products appear here", unitPrice: null, currency: "KES" } as SupplierPortalProduct]).map(
            (row) => (
              <div
                key={row.id}
                className="flex items-baseline justify-between gap-2 border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] pb-1.5 text-[11px]"
              >
                <span className="truncate font-medium text-[var(--pos-ink,#1c1915)]">
                  {row.name}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-[var(--pos-ink,#1c1915)]">
                  {row.unitPrice != null
                    ? formatMoney(row.unitPrice, row.currency ?? "KES")
                    : "—"}
                </span>
              </div>
            ),
          )}
          <p className="pt-1 text-center text-[9px] text-muted-foreground">
            {productCount} products · kiosk.ke
          </p>
        </div>
      </div>
    </div>
  );
}
