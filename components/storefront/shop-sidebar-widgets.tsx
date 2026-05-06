import { ArrowRight, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ShopNewsletterCard } from "@/components/storefront/shop-newsletter-card";
import { ShopQuickAddButton } from "@/components/storefront/shop-quick-add-button";
import { APP_ROUTES, shopItemPath } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import { formatDisplayPrice, formatStoreQty } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

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
  const reminders = featured.slice(0, 4);
  const picks = featured.slice(0, 4);
  const threshold = freeDeliveryThreshold ?? 1500;

  return (
    <div className="flex flex-col gap-4">
      <OrderAgainCard primary={primary} reminders={reminders} />
      <FreeDeliveryCard accent={accent} threshold={threshold} currency={currency} />
      <TopPicksCard
        picks={picks}
        currency={currency}
        slug={slug}
        primary={primary}
        accent={accent}
      />
      <ShopNewsletterCard primary={primary} accent={accent} />
    </div>
  );
}

function OrderAgainCard({
  primary,
  reminders,
}: {
  primary: string | null;
  reminders: PublicCatalogItemCard[];
}) {
  const tiles = [...reminders];
  while (tiles.length < 4) {
    tiles.push({
      id: `placeholder-${tiles.length}`,
      name: "",
      variantName: null,
      imageUrl: null,
      price: null,
    });
  }

  return (
    <aside
      className="overflow-hidden rounded-2xl text-white shadow-md"
      style={{ backgroundColor: primary ?? "var(--color-primary)" }}
    >
      <div className="px-5 pb-3 pt-4">
        <p className="text-base font-bold leading-tight">Order Again</p>
        <p className="mt-0.5 text-xs text-white/70">Your last order in one click</p>
      </div>
      <div className="grid grid-cols-4 gap-2 px-5">
        {tiles.map((t, i) => (
          <div
            key={t.id || i}
            className="relative aspect-square overflow-hidden rounded-md bg-white/95 ring-1 ring-white/20"
          >
            {t.imageUrl ? (
              <Image
                src={t.imageUrl}
                alt=""
                fill
                sizes="80px"
                className="object-contain p-1.5"
                unoptimized
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-muted-foreground/60">
                —
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="px-5 pb-5 pt-4">
        <Link
          href={APP_ROUTES.login}
          className="flex h-10 w-full items-center justify-center rounded-md bg-black/30 text-sm font-semibold text-white transition hover:bg-black/40"
        >
          Repeat Last Order
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
  const accentColor = accent ?? "#fb923c";
  return (
    <aside
      className="relative overflow-hidden rounded-2xl border border-border/60 px-5 pb-5 pt-4 shadow-sm"
      style={{
        background: `linear-gradient(135deg, ${accentColor}1f 0%, var(--color-card) 100%)`,
        borderColor: `${accentColor}38`,
      }}
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-bold leading-tight" style={{ color: accentColor }}>
          Free Delivery
        </p>
        <p className="text-sm text-muted-foreground">
          On orders above{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatDisplayPrice(currency, threshold)}
          </span>
        </p>
        <Link
          href="#shop-catalog"
          className={cn(
            "mt-3 inline-flex h-9 w-fit items-center justify-center gap-1 rounded-md px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110",
          )}
          style={{ backgroundColor: accentColor }}
        >
          Shop Now
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <Truck
        className="pointer-events-none absolute -bottom-2 -right-2 h-24 w-24 opacity-25"
        aria-hidden
        style={{ color: accentColor }}
      />
    </aside>
  );
}

function TopPicksCard({
  picks,
  currency,
  slug,
  primary,
  accent,
}: {
  picks: PublicCatalogItemCard[];
  currency: string;
  slug: string;
  primary: string | null;
  accent: string | null;
}) {
  if (picks.length === 0) {
    return null;
  }
  return (
    <aside className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">Top Picks For You</p>
        <Link
          href={APP_ROUTES.shop}
          className="inline-flex items-center gap-1 text-xs font-semibold underline-offset-4 hover:underline"
          style={{ color: primary ?? "var(--color-primary)" }}
        >
          View all
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
      <ul className="mt-3 divide-y divide-border/50">
        {picks.map((item) => {
          const title = item.variantName
            ? `${item.name} ${item.variantName}`
            : item.name;
          const price = formatDisplayPrice(currency, item.price);
          const stock = formatStoreQty(item.qtyOnHand);
          return (
            <li key={item.id} className="flex items-center gap-3 py-2.5">
              <Link
                href={shopItemPath(item.id)}
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted/40"
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-contain p-1"
                    unoptimized
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {item.name.slice(0, 1)}
                  </span>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={shopItemPath(item.id)}
                  className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground hover:underline"
                >
                  {title}
                </Link>
                <p className="mt-0.5 text-[13px] font-bold tabular-nums text-foreground">
                  {price}
                </p>
                {stock ? (
                  <p className="mt-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                    {stock}
                  </p>
                ) : null}
              </div>
              <ShopQuickAddButton
                slug={slug}
                itemId={item.id}
                ariaLabel={`Add ${title} to basket`}
                accentHex={accent}
                size="sm"
              />
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

