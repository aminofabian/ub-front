"use client";

import Image from "next/image";
import { Check, Copy, Search, ShoppingBag, Store } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import type { PublicBarcodeLookup } from "@/lib/public-storefront";
import { fetchPublicBarcodeSearchBrowser } from "@/lib/public-storefront-client";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

import { goldCtaClass, landingCardClass } from "../tenant-console/landing/landing-styles";

type SearchState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "results"; items: PublicBarcodeLookup[] }
  | { phase: "empty"; q: string }
  | { phase: "error"; message: string };

export function ProductSearch() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<SearchState>({ phase: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;

    setState({ phase: "loading" });

    try {
      const items = await fetchPublicBarcodeSearchBrowser(trimmed);
      if (items.length === 0) {
        setState({ phase: "empty", q: trimmed });
      } else {
        setState({ phase: "results", items });
      }
    } catch {
      setState({ phase: "error", message: "Something went wrong. Please try again." });
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void doSearch(input);
  };

  const disabled = state.phase === "loading" || input.trim().length < 2;

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit}>
        <div
          className="flex items-stretch overflow-hidden rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] shadow-sm transition-shadow focus-within:border-[var(--kiosk-gold-border)] focus-within:shadow-[0_4px_20px_-6px_var(--kiosk-success-shadow)]"
          role="search"
        >
          <label className="sr-only" htmlFor="product-search-input">
            Search products by name
          </label>
          <input
            ref={inputRef}
            id="product-search-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Try "coffee", "milk", "bread"…'
            className="min-w-0 flex-1 border-0 bg-transparent px-4 font-sans text-sm tracking-normal outline-none focus-visible:ring-0 sm:text-base text-[var(--kiosk-text)] placeholder:text-[var(--kiosk-text-dim)]"
            disabled={state.phase === "loading"}
          />
          <button
            type="submit"
            disabled={disabled}
            className={cn(
              goldCtaClass,
              "!rounded-none !px-5 !py-0 !shadow-none hover:!translate-y-0 min-w-[6.5rem] shrink-0 items-center justify-center text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            {state.phase === "loading" ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span className="hidden sm:inline">Searching…</span>
              </span>
            ) : (
              "Search"
            )}
          </button>
        </div>
      </form>

      {/* Loading skeleton */}
      {state.phase === "loading" ? (
        <div className={cn(landingCardClass, "border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-6")}>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 animate-pulse rounded-lg bg-[var(--kiosk-surface)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--kiosk-surface)]" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--kiosk-surface)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Empty state */}
      {state.phase === "empty" ? (
        <div className={cn(landingCardClass, "border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-8 text-center")}>
          <Search className="mx-auto h-10 w-10 text-[var(--kiosk-text-dim)]" aria-hidden />
          <h2 className="mt-4 font-heading text-lg font-semibold text-[var(--kiosk-text)]">
            No products found
          </h2>
          <p className="mt-2 text-sm text-[var(--kiosk-text-muted)]">
            No published products matched{" "}
            <span className="font-semibold text-[var(--kiosk-text)]">
              &ldquo;{state.q}&rdquo;
            </span>
            . Try a different search term.
          </p>
        </div>
      ) : null}

      {/* Error */}
      {state.phase === "error" ? (
        <div className="rounded-xl border border-red-200/80 bg-red-50/80 p-6 text-center dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{state.message}</p>
        </div>
      ) : null}

      {/* Results table */}
      {state.phase === "results" ? (
        <div className="overflow-hidden rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--kiosk-border)] bg-[var(--kiosk-surface)]">
                  <th className="px-4 py-3 font-heading text-xs font-semibold uppercase tracking-wider text-[var(--kiosk-text-muted)]">
                    Product
                  </th>
                  <th className="px-4 py-3 font-heading text-xs font-semibold uppercase tracking-wider text-[var(--kiosk-text-muted)]">
                    Barcode
                  </th>
                  <th className="hidden px-4 py-3 font-heading text-xs font-semibold uppercase tracking-wider text-[var(--kiosk-text-muted)] sm:table-cell">
                    Store
                  </th>
                  <th className="hidden px-4 py-3 text-right font-heading text-xs font-semibold uppercase tracking-wider text-[var(--kiosk-text-muted)] md:table-cell">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--kiosk-border-soft)]">
                {state.items.map((item) => (
                  <SearchResultRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--kiosk-border)] px-4 py-3 text-xs text-[var(--kiosk-text-dim)]">
            {state.items.length} result{state.items.length !== 1 ? "s" : ""}
          </div>
        </div>
      ) : null}

      {/* Idle hint */}
      {state.phase === "idle" ? (
        <div className={cn(landingCardClass, "border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-6 text-center")}>
          <ShoppingBag className="mx-auto h-10 w-10 text-[var(--kiosk-text-dim)]" aria-hidden />
          <h2 className="mt-3 font-heading text-base font-semibold text-[var(--kiosk-text)]">
            Search by product name
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--kiosk-text-muted)]">
            Type a product name above to search across all Kiosk-powered stores.
            Find barcodes, prices, and the store that carries each item.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SearchResultRow({ item }: { item: PublicBarcodeLookup }) {
  const [copied, setCopied] = useState(false);

  const copyBarcode = useCallback(async () => {
    const code = item.barcode?.trim();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS / older browsers
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [item.barcode]);

  const priceLabel = formatDisplayPrice(item.currency, item.price);
  const hasBarcode = item.barcode?.trim();

  return (
    <tr className="transition-colors hover:bg-[var(--kiosk-surface)]">
      {/* Product name + image */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[var(--kiosk-surface)]">
            {item.images[0]?.url ? (
              <Image
                src={item.images[0].url}
                alt={item.images[0].altText?.trim() || item.name}
                fill
                className="object-cover"
                sizes="36px"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-xs font-semibold text-[var(--kiosk-text-dim)]">
                {item.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--kiosk-text)]">
              {item.name}
            </p>
            {item.brand ? (
              <p className="truncate text-xs text-[var(--kiosk-text-muted)]">
                {item.brand}{item.size ? ` · ${item.size}` : ""}
              </p>
            ) : null}
          </div>
        </div>
      </td>

      {/* Barcode (copyable) */}
      <td className="px-4 py-3">
        {hasBarcode ? (
          <button
            type="button"
            onClick={copyBarcode}
            className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-mono font-medium text-[var(--kiosk-text)] transition hover:bg-[var(--kiosk-gold-soft)]"
            title="Click to copy barcode"
          >
            {item.barcode}
            {copied ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <Copy className="h-3.5 w-3.5 shrink-0 text-[var(--kiosk-text-dim)] opacity-0 transition group-hover:opacity-100" aria-hidden />
            )}
          </button>
        ) : (
          <span className="text-xs text-[var(--kiosk-text-dim)]">—</span>
        )}
      </td>

      {/* Store name */}
      <td className="hidden px-4 py-3 sm:table-cell">
        <div className="flex items-center gap-1.5 text-xs text-[var(--kiosk-text-muted)]">
          <Store className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate max-w-[140px]">{item.businessName}</span>
        </div>
      </td>

      {/* Price */}
      <td className="hidden px-4 py-3 text-right md:table-cell">
        <span className="text-sm font-bold tabular-nums text-[var(--kiosk-text)]">
          {priceLabel}
        </span>
      </td>
    </tr>
  );
}
