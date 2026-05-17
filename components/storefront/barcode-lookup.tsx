"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PublicBarcodeLookup } from "@/lib/public-storefront";
import { fetchPublicBarcodeBrowser } from "@/lib/public-storefront-client";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { shopItemPathFromCard } from "@/lib/shop-item-url";

/** Parsed result of a GTIN / UPC / EAN barcode. */
function parseBarcode(raw: string): string | null {
  const clean = raw.replace(/[\s\-._]/g, "").trim();
  if (!clean || clean.length < 4) return null;
  if (!/^\d+$/.test(clean)) return null;
  return clean;
}

type LookupState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "found"; item: PublicBarcodeLookup }
  | { phase: "not-found"; code: string }
  | { phase: "error"; message: string };

export function BarcodeLookup() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<LookupState>({ phase: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  const doLookup = useCallback(async (code: string) => {
    const parsed = parseBarcode(code);
    if (!parsed) return;

    setState({ phase: "loading" });

    const item = await fetchPublicBarcodeBrowser(parsed);

    if (!item) {
      setState({ phase: "not-found", code: parsed });
      return;
    }

    setState({ phase: "found", item });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLookup(input);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm"
      >
        <h1 className="mb-2 text-2xl font-extrabold tracking-tight">
          Barcode Lookup
        </h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Enter a barcode to instantly see product details, price, and
          availability.
        </p>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter barcode number…"
              className="w-full rounded-xl border border-border/70 bg-muted/50 px-4 py-3 text-lg font-mono tracking-wide placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={state.phase === "loading"}
              aria-label="Barcode number"
            />
          </div>
          <button
            type="submit"
            disabled={state.phase === "loading" || !parseBarcode(input)}
            className="shrink-0 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {state.phase === "loading" ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Looking up…
              </span>
            ) : (
              "Look Up"
            )}
          </button>
        </div>
      </form>

      {/* Loading */}
      {state.phase === "loading" && (
        <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-[1fr_1.5fr]">
            <div className="aspect-square animate-pulse rounded-xl bg-muted" />
            <div className="space-y-4">
              <div className="h-7 w-3/4 animate-pulse rounded-lg bg-muted" />
              <div className="h-9 w-1/3 animate-pulse rounded-lg bg-muted" />
              <div className="h-5 w-1/2 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        </div>
      )}

      {/* Not found */}
      {state.phase === "not-found" && (
        <div className="rounded-2xl border border-border/60 bg-background p-6 text-center shadow-sm">
          <p className="text-4xl">🔍</p>
          <h2 className="mt-3 text-lg font-semibold">No product found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Barcode <span className="font-mono font-medium">{state.code}</span>{" "}
            doesn&apos;t match any product.
          </p>
          <button
            onClick={() => {
              setState({ phase: "idle" });
              setInput("");
              inputRef.current?.focus();
            }}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Try another barcode
          </button>
        </div>
      )}

      {/* Error */}
      {state.phase === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-sm text-red-700">{state.message}</p>
          <button
            onClick={() => {
              setState({ phase: "idle" });
              inputRef.current?.focus();
            }}
            className="mt-3 text-sm font-medium text-red-700 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Found */}
      {state.phase === "found" && (
        <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-[1fr_1.5fr]">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
              {state.item.images[0]?.url ? (
                <Image
                  src={state.item.images[0].url}
                  alt={state.item.images[0].altText?.trim() || state.item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 320px"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl font-medium text-muted-foreground/40">
                  {state.item.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight">
                {state.item.name}
              </h2>

              {state.item.brand && (
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {state.item.brand}
                  {state.item.size && ` · ${state.item.size}`}
                </p>
              )}

              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-3xl font-black tabular-nums text-foreground">
                  {formatDisplayPrice(state.item.currency, state.item.price)}
                </span>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                SKU: <span className="font-mono">{state.item.sku}</span>
              </p>

              {state.item.description && (
                <div className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {state.item.description.length > 200
                    ? `${state.item.description.slice(0, 200)}…`
                    : state.item.description}
                </div>
              )}

              <p className="mt-3 text-xs text-muted-foreground">
                Sold by{" "}
                <span className="font-medium text-foreground">
                  {state.item.businessName}
                </span>
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={shopItemPathFromCard({ sku: state.item.sku })}
                  className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  View Full Details
                  <span aria-hidden>→</span>
                </Link>
                <button
                  onClick={() => {
                    setState({ phase: "idle" });
                    setInput("");
                    inputRef.current?.focus();
                  }}
                  className="rounded-xl border border-border/70 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Look Up Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
