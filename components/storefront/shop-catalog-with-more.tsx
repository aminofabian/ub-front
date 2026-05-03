"use client";

import { useCallback, useState } from "react";

import ShopProductGrid from "@/components/storefront/shop-product-grid";
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
}: {
  slug: string;
  currency: string;
  initialItems: PublicCatalogItemCard[];
  initialNextCursor: string | null;
  q?: string;
  categoryId?: string;
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

  return (
    <div className="space-y-6">
      <ShopProductGrid items={items} currency={currency} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {next ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={busy}
          className="w-full rounded-lg border border-border bg-card py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {busy ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
