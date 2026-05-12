"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

import ShopProductGrid from "@/components/storefront/shop-product-grid";
import { useStorefrontCatalogSync } from "@/hooks/use-storefront-catalog-sync";
import { getApiBaseUrl } from "@/lib/config";
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
}: {
  slug: string;
  currency: string;
  initialItems: PublicCatalogItemCard[];
  initialNextCursor: string | null;
  q?: string;
  categoryId?: string;
  accentHex?: string | null;
}) {
  const [items, setItems] = useState<PublicCatalogItemCard[]>(initialItems);
  const [next, setNext] = useState<string | null>(initialNextCursor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useStorefrontCatalogSync({
    slug,
    q,
    categoryId,
    items,
    setItems,
  });

  const loadMore = useCallback(async () => {
    if (!next || busy) return;
    setBusy(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      p.set("limit", "24");
      p.set("cursor", next);
      const qt = q?.trim();
      if (qt) p.set("q", qt);
      const cid = categoryId?.trim();
      if (cid) p.set("categoryId", cid);
      const path = `/api/v1/public/businesses/${encodeURIComponent(slug)}/catalog/items?${p}`;
      const res = await fetch(`${getApiBaseUrl()}${path}`, {
        headers: { Accept: "application/json" },
      });
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

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
          {filtered ? `Results for "${q || categoryId}"` : "All Products"}
        </h2>
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground/50">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      <ShopProductGrid
        items={items}
        currency={currency}
        filtered={filtered}
        clearHref={`/shop`}
        slug={slug}
        accentHex={accentHex}
      />

      {error ? (
        <p className="text-center text-xs text-destructive">{error}</p>
      ) : null}

      {next ? (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={busy}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-lg border border-border/50 bg-card px-6 text-sm font-medium text-foreground transition-all hover:border-border hover:bg-muted/30 disabled:opacity-50",
            )}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                Show more
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      ) : items.length > 0 ? (
        <p className="text-center text-[11px] text-muted-foreground/40">
          End of catalog
        </p>
      ) : null}
    </div>
  );
}
