"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
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
const INK = "#1c1915";
const TEAL = "#0f766e";
const MANGO = "#b9691a";

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

  const pdfProductCount =
    filtered.length > 0 && (query || category !== ALL_CATEGORY)
      ? filtered.length
      : products.length;

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
        products:
          filtered.length > 0 && (query || category !== ALL_CATEGORY) ? filtered : products,
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
      <div
        className={cn(spPage, "space-y-4")}
        style={
          {
            ["--pos-primary" as string]: TEAL,
            ["--cat-ink" as string]: INK,
            ["--cat-mango" as string]: MANGO,
        } as CSSProperties
      }
      >
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className={cn(spSerifTitle, "text-[1.85rem] leading-none sm:text-[2.35rem]")}>
              Catalogue
            </h2>
            <p className="mt-1.5 max-w-xl text-[13px] text-[color-mix(in_srgb,var(--cat-ink)_55%,transparent)]">
              Your wholesale shelf — prices shops see when they order.
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
              Price list PDF
            </button>
          </div>
        </header>

        {/* Ledger strip */}
        <div className="flex flex-wrap items-stretch gap-px overflow-hidden border border-[color-mix(in_srgb,var(--cat-ink)_14%,transparent)] bg-[color-mix(in_srgb,var(--cat-ink)_14%,transparent)]">
          <LedgerStat label="Products" value={String(products.length)} />
          <LedgerStat label="Categories" value={String(categories.length)} />
          <LedgerStat label="Priced" value={String(pricedCount)} />
          <LedgerStat label="With photos" value={String(withPhotos)} />
        </div>

        {composerOpen ? (
          <section className="overflow-hidden border border-[color-mix(in_srgb,var(--cat-ink)_14%,transparent)] bg-[color-mix(in_srgb,#fff_82%,#f7f3eb)]">
            <div className="flex h-9 items-center justify-between bg-[var(--pos-primary)] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
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
                className="h-9 rounded-none border-[color-mix(in_srgb,var(--cat-ink)_16%,transparent)] bg-[color-mix(in_srgb,#faf7f1_90%,transparent)] sm:col-span-2"
              />
              <Input
                placeholder="Unit price *"
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                className="h-9 rounded-none border-[color-mix(in_srgb,var(--cat-ink)_16%,transparent)] bg-[color-mix(in_srgb,#faf7f1_90%,transparent)] font-mono"
              />
              <Input
                placeholder="Barcode"
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                className="h-9 rounded-none border-[color-mix(in_srgb,var(--cat-ink)_16%,transparent)] bg-[color-mix(in_srgb,#faf7f1_90%,transparent)] font-mono"
              />
              <Input
                placeholder="SKU"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                className="h-9 rounded-none border-[color-mix(in_srgb,var(--cat-ink)_16%,transparent)] bg-[color-mix(in_srgb,#faf7f1_90%,transparent)] font-mono"
              />
              <Input
                placeholder="Category"
                value={form.categoryName}
                onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))}
                className="h-9 rounded-none border-[color-mix(in_srgb,var(--cat-ink)_16%,transparent)] bg-[color-mix(in_srgb,#faf7f1_90%,transparent)]"
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

        {/* Shelf board */}
        <section
          className={cn(
            "overflow-hidden border border-[color-mix(in_srgb,var(--cat-ink)_14%,transparent)]",
            "bg-[linear-gradient(165deg,#faf7f1_0%,#f3eee6_48%,#ebe4d8_100%)]",
          )}
        >
          <div
            className={cn(
              "flex h-9 items-center justify-between px-3",
              "bg-[linear-gradient(100deg,var(--pos-primary)_0%,#0d6a63_70%,#b9691a_160%)]",
              "text-[10px] font-bold uppercase tracking-[0.16em] text-white",
            )}
          >
            <span>Shelf</span>
            <span className="font-mono tabular-nums opacity-85">{filtered.length}</span>
          </div>

          <div className="flex flex-col gap-2.5 border-b border-[color-mix(in_srgb,var(--cat-ink)_10%,transparent)] bg-[color-mix(in_srgb,#fff_55%,transparent)] px-3 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--cat-ink)_40%,transparent)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, barcode, SKU…"
                className="h-9 w-full border border-[color-mix(in_srgb,var(--cat-ink)_14%,transparent)] bg-[color-mix(in_srgb,#fff_88%,transparent)] pl-8 pr-2 text-[13px] text-[var(--cat-ink)] outline-none placeholder:text-[color-mix(in_srgb,var(--cat-ink)_35%,transparent)] focus:border-[var(--pos-primary)]"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <CategoryChip
                label="All"
                active={category === ALL_CATEGORY}
                onClick={() => setCategory(ALL_CATEGORY)}
              />
              {categories.map((c) => (
                <CategoryChip
                  key={c}
                  label={c}
                  active={category === c}
                  onClick={() => setCategory(c)}
                />
              ))}
              {products.some((p) => !p.categoryName?.trim()) ? (
                <CategoryChip
                  label="Uncategorised"
                  active={category === "Uncategorised"}
                  onClick={() => setCategory("Uncategorised")}
                />
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-16 text-[13px] text-[color-mix(in_srgb,var(--cat-ink)_48%,transparent)]">
              <Loader2 className="size-4 animate-spin" />
              Loading shelf…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyShelf hasAny={products.length > 0} />
          ) : (
            <div className="grid grid-cols-2 gap-px bg-[color-mix(in_srgb,var(--cat-ink)_10%,transparent)] sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
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

        {/* Lookbook / PDF */}
        <section className="overflow-hidden border border-[color-mix(in_srgb,var(--cat-ink)_14%,transparent)] bg-[color-mix(in_srgb,#fff_82%,#f7f3eb)]">
          <div className="flex h-9 items-center justify-between bg-[var(--pos-primary)] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
            <span>Price list</span>
            <span className="font-mono opacity-85">print-ready</span>
          </div>
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative border-b border-[color-mix(in_srgb,var(--cat-ink)_12%,transparent)] p-5 lg:border-b-0 lg:border-r">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary)]"
              />
              <h3 className="pl-3 font-[family-name:var(--font-heading)] text-[1.45rem] font-semibold leading-tight tracking-tight text-[var(--cat-ink)]">
                Download a wholesale price list
              </h3>
              <p className="mt-2 max-w-md pl-3 text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--cat-ink)_55%,transparent)]">
                Cover page, category chapters, mango prices — ready to email or print for
                shopkeepers.
              </p>
              <ul className="mt-4 space-y-2 pl-3 text-[13px] text-[var(--cat-ink)]">
                <li className="flex gap-2">
                  <span
                    aria-hidden
                    className="mt-1.5 size-1.5 shrink-0 bg-[var(--pos-primary)]"
                  />
                  Groups by category with a trade-list cover
                </li>
                <li className="flex gap-2">
                  <span
                    aria-hidden
                    className="mt-1.5 size-1.5 shrink-0 bg-[var(--pos-primary)]"
                  />
                  Uses your current search / filter when set
                </li>
                <li className="flex gap-2">
                  <span
                    aria-hidden
                    className="mt-1.5 size-1.5 shrink-0 bg-[var(--pos-primary)]"
                  />
                  Includes contact details from your profile
                </li>
              </ul>
              <div className="mt-5 pl-3">
                <button
                  type="button"
                  className={cn(spBtnPrimary, "h-10")}
                  disabled={pdfBusy || products.length === 0}
                  onClick={onDownloadPdf}
                >
                  {pdfBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  Download price list PDF
                </button>
              </div>
            </div>

            <LookbookPreview
              supplierName={profile?.name ?? "Your brand"}
              productCount={pdfProductCount}
              categoryCount={categories.length}
              sample={filtered.slice(0, 5)}
            />
          </div>
        </section>
      </div>
    </SupplierPortalShell>
  );
}

function LedgerStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[6.5rem] flex-1 flex-col gap-0.5 bg-[color-mix(in_srgb,#fff_78%,#f7f3eb)] px-3 py-2.5">
      <span className="font-mono text-[1.15rem] font-bold tabular-nums leading-none text-[var(--pos-primary)]">
        {value}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--cat-ink)_48%,transparent)]">
        {label}
      </span>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-2.5 py-1 text-[11px] font-semibold transition-colors",
        active
          ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--cat-ink)]"
          : "border-[color-mix(in_srgb,var(--cat-ink)_14%,transparent)] bg-[color-mix(in_srgb,#fff_70%,transparent)] text-[color-mix(in_srgb,var(--cat-ink)_58%,transparent)] hover:border-[color-mix(in_srgb,var(--cat-ink)_28%,transparent)] hover:text-[var(--cat-ink)]",
      )}
    >
      {label}
    </button>
  );
}

function EmptyShelf({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center border border-dashed border-[color-mix(in_srgb,var(--cat-ink)_22%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_6%,transparent)]">
        <Package className="size-6 text-[var(--pos-primary)] opacity-80" strokeWidth={1.4} />
      </span>
      <p className="max-w-[18rem] text-[13px] leading-snug text-[color-mix(in_srgb,var(--cat-ink)_55%,transparent)]">
        {hasAny
          ? "No products match this filter."
          : "No products yet. Add your first item, or sign out/in so linked shop products can import."}
      </p>
    </div>
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
      className="group flex flex-col bg-[color-mix(in_srgb,#fff_92%,#f7f3eb)] transition-[background] duration-200 hover:bg-white"
      style={{ animationDelay: `${Math.min(index, 16) * 28}ms` }}
    >
      <div
        className="relative aspect-square w-full overflow-hidden border-b border-[color-mix(in_srgb,var(--cat-ink)_8%,transparent)]"
        style={
          showImage
            ? undefined
            : {
                background: `linear-gradient(145deg, hsl(${hue} 18% 90%), hsl(${(hue + 28) % 360} 14% 78%))`,
              }
        }
      >
        {showImage ? (
          <Image
            src={thumb!}
            alt={product.name}
            fill
            unoptimized
            className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 160px"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <span className="inline-flex size-10 items-center justify-center border border-[color-mix(in_srgb,var(--cat-ink)_14%,transparent)] bg-[color-mix(in_srgb,#fff_70%,transparent)] font-mono text-[11px] font-bold tracking-wide text-[var(--cat-ink)]">
              {productInitials(product.name)}
            </span>
          </div>
        )}
        <span className="absolute bottom-1.5 left-1.5 font-mono text-[9px] font-bold tabular-nums text-[color-mix(in_srgb,var(--pos-primary)_80%,transparent)]">
          {String(index + 1).padStart(2, "0")}
        </span>
        {product.pendingEditId ? (
          <span className="absolute left-1.5 top-1.5 border border-[color-mix(in_srgb,var(--cat-mango)_45%,transparent)] bg-[color-mix(in_srgb,var(--cat-mango)_10%,#fff)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--cat-mango)]">
            Pending
          </span>
        ) : null}
        {!product.available ? (
          <span className="absolute right-1.5 top-1.5 border border-[color-mix(in_srgb,var(--cat-ink)_18%,transparent)] bg-[color-mix(in_srgb,#fff_90%,transparent)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--cat-ink)_55%,transparent)]">
            Off
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2 pb-2 pt-1.5">
        <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-[var(--cat-ink)]">
          {product.name}
        </p>
        <p className="font-mono text-[12px] font-bold tabular-nums text-[var(--cat-mango)]">
          {product.unitPrice != null
            ? formatMoney(product.unitPrice, product.currency ?? "KES")
            : "Ask"}
        </p>
        <p className="truncate font-mono text-[9px] text-[color-mix(in_srgb,var(--cat-ink)_45%,transparent)]">
          {product.categoryName || "Uncategorised"}
          {product.barcode || product.sku ? ` · ${product.barcode ?? product.sku}` : ""}
        </p>
        {product.pendingProposed?.unitPrice != null ? (
          <p className="text-[9px] text-[var(--cat-mango)]">
            Proposed → {String(product.pendingProposed.unitPrice)}
          </p>
        ) : null}
        <div className="mt-auto flex gap-1 pt-1.5">
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
  categoryCount,
  sample,
}: {
  supplierName: string;
  productCount: number;
  categoryCount: number;
  sample: SupplierPortalProduct[];
}) {
  return (
    <div className="relative flex items-center justify-center bg-[linear-gradient(160deg,#e8e2d6,#f4efe6_45%,#ddd5c6)] p-6 sm:p-8">
      <div
        className={cn(
          "relative w-full max-w-[270px] overflow-hidden",
          "border border-[color-mix(in_srgb,var(--cat-ink)_16%,transparent)] bg-[#fbf8f2]",
          "shadow-[0_12px_28px_-8px_color-mix(in_srgb,var(--cat-ink)_28%,transparent)]",
          "transition-transform duration-300 hover:-translate-y-0.5",
        )}
      >
        <div className="relative bg-[var(--pos-primary)] px-3.5 pb-4 pt-3 text-white">
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1 bg-[var(--cat-mango)]"
          />
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,#fff_75%,transparent)]">
            Kiosk · supplier
          </p>
          <p className="mt-2 font-[family-name:var(--font-heading)] text-[1.35rem] font-semibold leading-none tracking-tight">
            Wholesale
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-heading)] text-[1.35rem] font-semibold leading-none tracking-tight">
            price list
          </p>
          <p className="mt-2 truncate text-[11px] text-[color-mix(in_srgb,#fff_85%,transparent)]">
            {supplierName}
          </p>
          <span
            aria-hidden
            className="absolute right-3 top-3 rotate-6 border border-[color-mix(in_srgb,#fff_45%,transparent)] px-1.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-[color-mix(in_srgb,#fff_90%,transparent)]"
          >
            Trade
          </span>
        </div>
        <div className="flex gap-4 border-b border-[color-mix(in_srgb,var(--cat-ink)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)] px-3.5 py-2">
          <div>
            <p className="font-mono text-[13px] font-bold tabular-nums text-[var(--pos-primary)]">
              {productCount}
            </p>
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--cat-ink)_48%,transparent)]">
              products
            </p>
          </div>
          <div>
            <p className="font-mono text-[13px] font-bold tabular-nums text-[var(--pos-primary)]">
              {categoryCount}
            </p>
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--cat-ink)_48%,transparent)]">
              categories
            </p>
          </div>
        </div>
        <div className="space-y-2 px-3.5 py-3">
          <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--pos-primary)]">
            <span>Product</span>
            <span>Price</span>
          </div>
          {(sample.length > 0
            ? sample
            : [
                {
                  id: "empty",
                  name: "Your products appear here",
                  unitPrice: null,
                  currency: "KES",
                } as SupplierPortalProduct,
              ]
          ).map((row) => (
            <div
              key={row.id}
              className="flex items-baseline justify-between gap-2 border-b border-dashed border-[color-mix(in_srgb,var(--cat-ink)_12%,transparent)] pb-1.5 text-[11px]"
            >
              <span className="truncate font-medium text-[var(--cat-ink)]">{row.name}</span>
              <span className="shrink-0 font-mono tabular-nums text-[var(--cat-mango)]">
                {row.unitPrice != null
                  ? formatMoney(row.unitPrice, row.currency ?? "KES")
                  : "—"}
              </span>
            </div>
          ))}
          <p className="pt-1 text-center font-mono text-[8px] uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--cat-ink)_42%,transparent)]">
            kiosk.ke
          </p>
        </div>
      </div>
    </div>
  );
}
