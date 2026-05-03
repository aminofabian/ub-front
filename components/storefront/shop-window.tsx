import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PublicStorefrontPayload } from "@/lib/public-storefront";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { APP_ROUTES, shopItemPath } from "@/lib/config";

export default function ShopWindow({ data }: { data: PublicStorefrontPayload }) {
  const label = data.label?.trim() || data.businessName;
  const featured = data.featured ?? [];

  if (featured.length === 0) {
    return null;
  }

  return (
    <section
      className="w-full border-y border-border/60 bg-gradient-to-b from-muted/40 to-background px-4 py-10 dark:from-muted/20"
      aria-labelledby="shop-window-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Shop window
            </p>
            <h2
              id="shop-window-heading"
              className="mt-1 text-2xl font-semibold tracking-tight"
            >
              {label}
            </h2>
            {data.announcement ? (
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {data.announcement}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Prices from{" "}
              <span className="font-medium text-foreground">
                {data.catalogBranchName}
              </span>
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 self-start sm:self-auto">
            <Link href={APP_ROUTES.shop}>View shop</Link>
          </Button>
        </div>

        <div className="mt-8 flex gap-4 overflow-x-auto overflow-y-visible pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
          {featured.map((item) => {
            const href = shopItemPath(item.id);
            const title = item.variantName
              ? `${item.name} · ${item.variantName}`
              : item.name;
            const priceLabel = formatDisplayPrice(data.currency, item.price);

            return (
              <article
                key={item.id}
                className="min-w-[12.5rem] max-w-[12.5rem] shrink-0 snap-start sm:min-w-[14rem] sm:max-w-[14rem]"
              >
                <Link
                  href={href}
                  className="group block overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="relative aspect-[4/5] w-full bg-muted">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={title}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 45vw, 224px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl font-medium text-muted-foreground/60">
                        {item.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-3 text-left">
                    <h3 className="line-clamp-2 text-sm font-medium leading-snug">
                      {title}
                    </h3>
                    <p className="text-sm font-semibold tabular-nums text-primary">
                      {priceLabel}
                    </p>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                      View →
                    </span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
