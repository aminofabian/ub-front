"use client";

import { ArrowRight, Flame, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import ShopProductGrid from "@/components/storefront/shop-product-grid";
import { APP_ROUTES } from "@/lib/config";
import type {
  PublicCatalogItemCard,
  PublicCatalogListPayload,
} from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

export default function ShopCatalogWithMore({
  slug,
  currency,
  initialItems,
  initialNextCursor,
  q,
  categoryId,
  accentHex,
  primaryHex,
}: {
  slug: string;
  currency: string;
  initialItems: PublicCatalogItemCard[];
  initialNextCursor: string | null;
  q?: string;
  categoryId?: string;
  accentHex?: string | null;
  primaryHex?: string | null;
}) {
  const [items, setItems] = useState<PublicCatalogItemCard[]>(initialItems);
  const [next, setNext] = useState<string | null>(initialNextCursor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (!next || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      p.set("limit", "24");
      p.set("cursor", next);
      const qt = q?.trim();
      if (qt) {
        p.set("q", qt);
      }
      const cid = categoryId?.trim();
      if (cid) {
        p.set("categoryId", cid);
      }
      const path = `/api/v1/public/businesses/${encodeURIComponent(slug)}/catalog/items?${p}`;
      const res = await fetch(path, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        setError("Could not load more.");
        return;
      }
      const payload = (await res.json()) as PublicCatalogListPayload;
      setItems((prev) => [...prev, ...payload.items]);
      setNext(payload.nextCursor);
    } catch {
      setError("Could not load more.");
    } finally {
      setBusy(false);
    }
  }, [busy, next, q, categoryId, slug]);

  const filtered = Boolean(q?.trim() || categoryId?.trim());
  const heading = filtered ? "Search results" : "Fast Moving Today";
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim()) ? accentHex.trim() : null;
  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim()) ? primaryHex.trim() : null;

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h2 className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {heading}
            {!filtered ? (
              <Flame
                className="h-5 w-5"
                aria-hidden
                style={accent ? { color: accent } : { color: "#fb923c" }}
              />
            ) : null}
          </h2>
          <div
            className="h-0.5 w-12 rounded-full"
            style={{
              backgroundColor: accent ?? primary ?? "var(--color-primary)",
            }}
          />
        </div>
        {!filtered ? (
          <Link
            href={APP_ROUTES.shop}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 transition hover:underline"
            style={primary ? { color: primary } : { color: "var(--color-primary)" }}
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      <ShopProductGrid
        items={items}
        currency={currency}
        filtered={filtered}
        clearHref={APP_ROUTES.shop}
        slug={slug}
        accentHex={accent}
      />

      {error ? (
        <p className="text-center text-sm text-destructive">{error}</p>
      ) : null}

      {next ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={busy}
            className={cn(
              "group inline-flex h-12 items-center justify-center gap-2 rounded-full border px-10 text-sm font-semibold shadow-sm transition-all duration-200",
              "border-border/60 bg-white hover:border-primary/30 hover:bg-muted/40 hover:shadow-md",
              "disabled:opacity-60"
            )}
            style={
              primary
                ? {
                    borderColor: `${primary}30`,
                  }
                : undefined
            }
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading more…
              </>
            ) : (
              <>
                Load more products
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </>
            )}
          </button>
        </div>
      ) : items.length > 0 ? (
        <p className="text-center text-xs font-medium text-muted-foreground/70">
          You&apos;ve reached the end of the catalog
        </p>
      ) : null}
    </div>
  );
}
