import { ArrowRight, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ShopNewsletterCard } from "@/components/storefront/shop-newsletter-card";
import { ShopSidebarTopPicksLive } from "@/components/storefront/shop-sidebar-top-picks-live";
import { APP_ROUTES, shopItemPathFromCard } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import { formatDisplayPrice } from "@/lib/public-storefront";

function isHex(v: string | null | undefined): v is string {
  return !!v && /^#[0-9a-fA-F]{6}$/.test(v.trim());
}

export function ShopSidebarWidgets({
  currency,
  featured,
  primaryHex,
  accentHex,
  slug,
  freeDeliveryThreshold,
}: {
  currency: string;
  featured: PublicCatalogItemCard[];
  primaryHex: string | null;
  accentHex: string | null;
  slug: string;
  freeDeliveryThreshold?: number | null;
}) {
  const primary = isHex(primaryHex) ? primaryHex.trim() : null;
  const accent = isHex(accentHex) ? accentHex.trim() : null;
  const picks = featured.slice(0, 4);
  const threshold = freeDeliveryThreshold ?? 1500;

  return (
    <div className="flex flex-col gap-4">
      <FeaturedCard featured={featured} primary={primary} />
      <FreeDeliveryCard
        accent={accent}
        threshold={threshold}
        currency={currency}
      />
      {picks.length > 0 ? (
        <ShopSidebarTopPicksLive
          picks={picks}
          currency={currency}
          slug={slug}
          accent={accent}
        />
      ) : null}
      <ShopNewsletterCard primary={primary} accent={accent} />
    </div>
  );
}

function FeaturedCard({
  featured,
  primary,
}: {
  featured: PublicCatalogItemCard[];
  primary: string | null;
}) {
  const reminders = featured.slice(0, 4);
  if (reminders.length === 0) {
    return (
      <aside className="rounded-xl border border-border/40 bg-card p-4">
        <p className="text-xs font-semibold text-foreground">Order History</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Sign in to view past orders and reorder.
        </p>
        <Link
          href={APP_ROUTES.shopAccount}
          className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground"
        >
          View account
        </Link>
      </aside>
    );
  }

  return (
    <aside
      className="overflow-hidden rounded-2xl shadow-md"
      style={{
        backgroundColor: primary ?? "var(--color-primary)",
      }}
    >
      <div className="px-4 pb-3 pt-4">
        <p className="text-sm font-bold text-white">Featured picks</p>
        <p className="mt-0.5 text-[11px] text-white/55">
          Staff favorites from this catalog
        </p>
      </div>
      <div className="grid grid-cols-4 gap-1.5 px-4">
        {reminders.map((t) => {
          const label = t.variantName ? `${t.name} ${t.variantName}` : t.name;
          return (
            <Link
              key={t.id}
              href={shopItemPathFromCard(t)}
              className="relative aspect-square overflow-hidden rounded-lg bg-white/90 ring-1 ring-white/15 transition-all duration-200 hover:scale-105 hover:ring-white/30"
            >
              {t.imageUrl ? (
                <Image
                  src={t.imageUrl}
                  alt={label.trim() || "Product"}
                  fill
                  sizes="64px"
                  className="object-contain p-1"
                  unoptimized
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-muted-foreground/50">
                  {(t.name || "?").slice(0, 1).toUpperCase()}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <div className="px-4 pb-4 pt-3">
        <Link
          href={APP_ROUTES.shopAccount}
          className="flex h-8 w-full items-center justify-center rounded-lg bg-black/25 text-xs font-semibold text-white transition hover:bg-black/35"
        >
          Past orders & account
        </Link>
      </div>
    </aside>
  );
}

function FreeDeliveryCard({
  accent,
  threshold,
  currency,
}: {
  accent: string | null;
  threshold: number;
  currency: string;
}) {
  const accentColor = accent ?? "#f59e0b";
  return (
    <aside
      className="relative overflow-hidden rounded-2xl border px-4 pb-4 pt-4"
      style={{
        backgroundColor: `${accentColor}0a`,
        borderColor: `${accentColor}25`,
      }}
    >
      <p
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: accentColor }}
      >
        Free Delivery
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        On orders above{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {formatDisplayPrice(currency, threshold)}
        </span>
      </p>
      <Link
        href="#shop-catalog"
        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold text-white transition hover:brightness-110"
        style={{ backgroundColor: accentColor }}
      >
        Shop Now
        <ArrowRight className="h-3 w-3" />
      </Link>
      <Truck
        className="pointer-events-none absolute -bottom-1 -right-1 h-16 w-16 opacity-[0.12]"
        aria-hidden
        style={{ color: accentColor }}
      />
    </aside>
  );
}
