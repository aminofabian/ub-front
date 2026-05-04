"use client";

import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import ShopProductGrid from "@/components/storefront/shop-product-grid";
import { APP_ROUTES } from "@/lib/config";
import type {
  PublicCatalogItemCard,
  PublicCatalogListPayload,
} from "@/lib/public-storefront";

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {heading}
          {!filtered ? (
            <Flame
              className="h-5 w-5"
              aria-hidden
              style={accent ? { color: accent } : { color: "#fb923c" }}
            />
          ) : null}
        </h2>
        <Link
          href={APP_ROUTES.shop}
          className="inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
          style={primary ? { color: primary } : { color: "var(--color-primary)" }}
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <ShopProductGrid
        items={items}
        currency={currency}
        filtered={filtered}
        clearHref={APP_ROUTES.shop}
        slug={slug}
        accentHex={accent}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {next ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center rounded-full border border-border/80 bg-card px-8 text-sm font-semibold shadow-sm transition hover:bg-muted/60 disabled:opacity-60"
          >
            {busy ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
