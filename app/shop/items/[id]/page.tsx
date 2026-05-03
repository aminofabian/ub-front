import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { APP_BASE_URL, APP_ROUTES, shopItemPath } from "@/lib/config";
import {
  fetchPublicItemDetail,
  fetchPublicStorefront,
  formatDisplayPrice,
} from "@/lib/public-storefront";
import ShopAddToCart from "@/components/storefront/shop-add-to-cart";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";
import { whatsAppProductLink } from "@/lib/shop-url";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    return { title: "Product" };
  }
  const [item, storefront] = await Promise.all([
    fetchPublicItemDetail(slug, id),
    fetchPublicStorefront(slug),
  ]);
  const shopLabel = storefront?.label?.trim() || storefront?.businessName || "Shop";
  const base = APP_BASE_URL.replace(/\/+$/, "");
  const canonical = `${base}/shop/items/${encodeURIComponent(id)}`;

  if (!item) {
    return {
      title: `Product · ${shopLabel}`,
      alternates: { canonical },
    };
  }

  const heading = item.variantName ? `${item.name} · ${item.variantName}` : item.name;
  const description =
    item.description?.trim().slice(0, 160) ||
    `${heading} — ${formatDisplayPrice(item.currency, item.price)} at ${shopLabel}.`;

  return {
    title: `${heading} · ${shopLabel}`,
    description,
    alternates: { canonical },
    openGraph: {
      title: heading,
      description,
      url: canonical,
      images: item.images[0]?.url ? [{ url: item.images[0].url }] : undefined,
    },
  };
}

export default async function ShopItemPage({ params }: PageProps) {
  const { id } = await params;
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }
  const item = await fetchPublicItemDetail(slug, id);
  if (!item) {
    notFound();
  }

  const heading = item.variantName ? `${item.name} · ${item.variantName}` : item.name;
  const priceLabel = formatDisplayPrice(item.currency, item.price);
  const hero = item.images[0];
  const wa = whatsAppProductLink(heading);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={APP_ROUTES.shop}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to shop
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/70 bg-muted">
              {hero ? (
                <Image
                  src={hero.url}
                  alt={hero.altText?.trim() || heading}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl font-medium text-muted-foreground/60">
                  {item.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            {item.images.length > 1 ? (
              <ul className="flex flex-wrap gap-2">
                {item.images.slice(1).map((img, idx) => (
                  <li
                    key={`${img.url}-${idx}`}
                    className="relative h-16 w-16 overflow-hidden rounded-lg border border-border/60"
                  >
                    <Image
                      src={img.url}
                      alt={img.altText?.trim() || heading}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
            <p className="mt-3 text-xl font-semibold tabular-nums text-primary">{priceLabel}</p>
            {item.description ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            ) : null}

            {item.variants.length > 0 ? (
              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Options
                </p>
                <ul className="mt-3 flex flex-col gap-2">
                  {item.variants.map((v) => {
                    const vTitle = v.variantName ? `${v.name} · ${v.variantName}` : v.name;
                    const active = v.id === item.id;
                    const vPrice = formatDisplayPrice(item.currency, v.price);
                    return (
                      <li key={v.id}>
                        <Link
                          href={shopItemPath(v.id)}
                          className={
                            active
                              ? "flex items-center justify-between rounded-lg border-2 border-primary bg-secondary/50 px-3 py-2 text-sm"
                              : "flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-sm transition hover:border-primary/40"
                          }
                        >
                          <span>{vTitle}</span>
                          <span className="font-medium tabular-nums text-primary">{vPrice}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <ShopAddToCart slug={slug} itemId={item.id} />

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-[#25D366] px-5 text-sm font-semibold text-white hover:opacity-95"
                >
                  Ask on WhatsApp
                </a>
              ) : null}
              <p className="flex min-h-11 items-center text-sm text-muted-foreground">
                {wa
                  ? "Or pick up in store — checkout on the web is coming next."
                  : "Visit us in store or ask about this product in person."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
