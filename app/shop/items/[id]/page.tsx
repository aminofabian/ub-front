import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { APP_BASE_URL, APP_ROUTES, shopItemPath } from "@/lib/config";
import {
  fetchPublicItemDetail,
  fetchPublicStorefront,
  formatDisplayPrice,
  formatStoreQty,
} from "@/lib/public-storefront";
import ShopAddToCart from "@/components/storefront/shop-add-to-cart";
import { ShopItemLivePrice } from "@/components/storefront/shop-item-live-price";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const slug = await resolveStorefrontSlug();
  if (!slug) return { title: "Product" };
  const [item, storefront] = await Promise.all([
    fetchPublicItemDetail(slug, id),
    fetchPublicStorefront(slug),
  ]);
  const shopLabel =
    storefront?.label?.trim() || storefront?.businessName || "Shop";
  const canonical = `${APP_BASE_URL.replace(/\/+$/, "")}/shop/items/${encodeURIComponent(id)}`;
  if (!item)
    return { title: `Product · ${shopLabel}`, alternates: { canonical } };
  const heading = item.variantName
    ? `${item.name} · ${item.variantName}`
    : item.name;
  return {
    title: `${heading} · ${shopLabel}`,
    description:
      item.description?.trim().slice(0, 160) ||
      `${heading} — ${formatDisplayPrice(item.currency, item.price)}`,
    alternates: { canonical },
    openGraph: {
      title: heading,
      description: item.description?.trim().slice(0, 160),
      url: canonical,
      images: item.images[0]?.url ? [{ url: item.images[0].url }] : undefined,
    },
  };
}

export default async function ShopItemPage({ params }: PageProps) {
  const { id } = await params;
  const slug = await resolveStorefrontSlug();
  if (!slug) notFound();
  const item = await fetchPublicItemDetail(slug, id);
  if (!item) notFound();

  const heading = item.variantName
    ? `${item.name} · ${item.variantName}`
    : item.name;
  const stockLabel = formatStoreQty(item.qtyOnHand);
  const hero = item.images[0];
  const featureLines = item.description
    ? item.description
        .split(/\r?\n|[•·]/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-[#f6f6f6] py-4 sm:py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Link
          href={APP_ROUTES.shop}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to shop"
        >
          <span aria-hidden>←</span>
          <span>Back to shop</span>
        </Link>
        <div className="rounded-2xl border border-border/60 bg-background p-3 shadow-sm sm:p-5">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr]">
            <section>
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                {hero ? (
                  <Image
                    src={hero.url}
                    alt={hero.altText?.trim() || heading}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 640px"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-6xl font-medium text-muted-foreground/40">
                    {item.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              {item.images.length > 1 && (
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {item.images.slice(0, 5).map((img, idx) => (
                    <div
                      key={`${img.url}-${idx}`}
                      className="relative aspect-square overflow-hidden rounded-md border border-border/60 bg-muted"
                    >
                      <Image
                        src={img.url}
                        alt={img.altText?.trim() || `${heading} ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
                {heading}
              </h1>

              <div className="mt-4 flex items-baseline gap-3">
                <ShopItemLivePrice
                  slug={slug}
                  itemId={item.id}
                  currency={item.currency}
                  initialPrice={item.price}
                  className="text-4xl font-black tabular-nums text-foreground"
                />
                {stockLabel && (
                  <span className="text-sm font-semibold text-emerald-600">
                    {stockLabel}
                  </span>
                )}
              </div>

              {featureLines.length > 0 && (
                <ul className="mt-5 divide-y divide-border/70 rounded-lg border border-border/60">
                  {featureLines.slice(0, 6).map((line, idx) => (
                    <li
                      key={`${line}-${idx}`}
                      className="flex items-center gap-3 px-3 py-3 text-[15px]"
                    >
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-black text-xs text-white">
                        •
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}

              <ShopAddToCart slug={slug} itemId={item.id} className="mt-6" />

              <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-border/70 text-center">
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  Safe Payments
                </div>
                <div className="border-x border-border/70 px-2 py-3 text-xs text-muted-foreground">
                  Secure Logistics
                </div>
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  Privacy Protection
                </div>
              </div>
            </section>
          </div>

          {item.variants.length > 0 && (
            <div className="mt-8 border-t border-border/60 pt-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Options
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {item.variants.map((v) => {
                  const vTitle = v.variantName
                    ? `${v.name} · ${v.variantName}`
                    : v.name;
                  return (
                    <Link
                      key={v.id}
                      href={shopItemPath(v.id)}
                      className={
                        v.id === item.id
                          ? "flex items-center justify-between gap-3 rounded-xl border-2 border-primary bg-primary/5 px-4 py-3 text-sm font-medium"
                          : "flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm transition hover:border-primary/40"
                      }
                    >
                      <span className="min-w-0 truncate">{vTitle}</span>
                      <span className="font-semibold tabular-nums text-primary">
                        {formatDisplayPrice(item.currency, v.price)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
