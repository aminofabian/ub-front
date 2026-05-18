"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, PackageSearch, ScanBarcode } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BarcodeScanner } from "@/components/barcode-scanner";
import type { PublicBarcodeLookup } from "@/lib/public-storefront";
import { fetchPublicBarcodeBrowser } from "@/lib/public-storefront-client";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { shopItemPathFromCard } from "@/lib/shop-item-url";
import { cn } from "@/lib/utils";

/** Parsed result of a GTIN / UPC / EAN barcode. */
function parseBarcode(raw: string): string | null {
  const clean = raw.replace(/[\s\-._]/g, "").trim();
  if (!clean || clean.length < 4) return null;
  if (!/^\d+$/.test(clean)) return null;
  return clean;
}

function resolveHex(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t && /^#[0-9a-fA-F]{6}$/.test(t) ? t : null;
}

type LookupState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "found"; item: PublicBarcodeLookup }
  | { phase: "not-found"; code: string }
  | { phase: "error"; message: string };

type BarcodeLookupProps = {
  variant?: "page" | "compact";
  primaryHex?: string | null;
  accentHex?: string | null;
  className?: string;
};

export function BarcodeLookup({
  variant = "page",
  primaryHex,
  className,
}: BarcodeLookupProps) {
  const primary = resolveHex(primaryHex);
  const isCompact = variant === "compact";

  const [input, setInput] = useState("");
  const [state, setState] = useState<LookupState>({ phase: "idle" });
  const [scannerOpen, setScannerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetLookup = useCallback(() => {
    setState({ phase: "idle" });
    setInput("");
    inputRef.current?.focus();
  }, []);

  const doLookup = useCallback(async (code: string) => {
    const parsed = parseBarcode(code);
    if (!parsed) return;

    setState({ phase: "loading" });

    try {
      const item = await fetchPublicBarcodeBrowser(parsed);

      if (!item) {
        setState({ phase: "not-found", code: parsed });
        return;
      }

      setState({ phase: "found", item });
    } catch {
      setState({
        phase: "error",
        message: "Could not look up that barcode. Please try again.",
      });
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void doLookup(input);
  };

  const onScanned = useCallback(
    (barcode: string) => {
      setScannerOpen(false);
      setInput(barcode);
      void doLookup(barcode);
    },
    [doLookup],
  );

  useEffect(() => {
    if (!isCompact) {
      inputRef.current?.focus();
    }
  }, [isCompact]);

  const submitDisabled = state.phase === "loading" || !parseBarcode(input);

  return (
    <div className={cn("space-y-4", className)}>
      {!isCompact ? (
        <div className="flex items-start gap-3 rounded-xl border border-border/30 bg-card/70 p-4 backdrop-blur-sm sm:p-5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: primary
                ? `${primary}14`
                : "color-mix(in srgb, var(--color-primary) 10%, transparent)",
            }}
          >
            <ScanBarcode
              className="h-5 w-5"
              aria-hidden
              style={
                primary ? { color: primary } : { color: "var(--color-primary)" }
              }
            />
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Barcode lookup
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter or scan a barcode to see product details, price, and
              availability.
            </p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            "flex items-stretch overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.04] transition-shadow focus-within:border-primary/30 focus-within:shadow-md",
            isCompact ? "h-11" : "h-12 sm:h-[3.25rem]",
          )}
          role="search"
        >
          <label className="sr-only" htmlFor="barcode-lookup-input">
            Barcode number
          </label>
          <input
            ref={inputRef}
            id="barcode-lookup-input"
            type="text"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter barcode number…"
            className="min-w-0 flex-1 border-0 bg-transparent px-4 font-mono text-sm tracking-wide outline-none placeholder:text-muted-foreground/60 focus-visible:ring-0 sm:text-base"
            disabled={state.phase === "loading"}
          />
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="flex w-11 shrink-0 items-center justify-center border-l border-border/60 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            aria-label="Scan barcode with camera"
            title="Scan with camera"
          >
            <Camera className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="submit"
            disabled={submitDisabled}
            className={cn(
              "flex shrink-0 items-center justify-center px-4 text-sm font-semibold text-white transition hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5",
              !primary && "bg-primary",
              isCompact ? "min-w-[5.5rem]" : "min-w-[6.5rem]",
            )}
            style={primary ? { backgroundColor: primary } : undefined}
          >
            {state.phase === "loading" ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span className="hidden sm:inline">Looking up…</span>
              </span>
            ) : (
              "Look up"
            )}
          </button>
        </div>
      </form>

      {state.phase === "loading" ? <LookupSkeleton compact={isCompact} /> : null}

      {state.phase === "not-found" ? (
        <StatusCard>
          <PackageSearch
            className="mx-auto h-10 w-10 text-muted-foreground/50"
            aria-hidden
          />
          <h2 className="mt-3 text-base font-semibold text-foreground">
            No product found
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Barcode{" "}
            <span className="font-mono font-medium text-foreground">
              {state.code}
            </span>{" "}
            doesn&apos;t match any product in our catalog.
          </p>
          <ResetButton primary={primary} onReset={resetLookup} />
        </StatusCard>
      ) : null}

      {state.phase === "error" ? (
        <StatusCard className="border-red-200/80 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{state.message}</p>
          <ResetButton
            primary={primary}
            onReset={resetLookup}
            labelClassName="text-red-700 dark:text-red-300"
          />
        </StatusCard>
      ) : null}

      {state.phase === "found" ? (
        <FoundCard
          item={state.item}
          primary={primary}
          compact={isCompact}
          onReset={resetLookup}
        />
      ) : null}

      {scannerOpen ? (
        <BarcodeScanner onScan={onScanned} onClose={() => setScannerOpen(false)} />
      ) : null}
    </div>
  );
}

function StatusCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/30 bg-card/70 p-6 text-center backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ResetButton({
  primary,
  onReset,
  labelClassName,
}: {
  primary: string | null;
  onReset: () => void;
  labelClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onReset}
      className={cn(
        "mt-4 text-sm font-semibold hover:underline",
        labelClassName ?? (primary ? undefined : "text-primary"),
      )}
      style={primary && !labelClassName ? { color: primary } : undefined}
    >
      Try another barcode
    </button>
  );
}

function LookupSkeleton({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <div className="flex gap-3 rounded-xl border border-border/30 bg-card/70 p-3">
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-muted" />
        <div className="flex flex-1 flex-col justify-center gap-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/30 bg-card/70 p-6 backdrop-blur-sm">
      <div className="grid gap-6 sm:grid-cols-[1fr_1.5fr]">
        <div className="aspect-square animate-pulse rounded-xl bg-muted" />
        <div className="space-y-4">
          <div className="h-7 w-3/4 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-1/3 animate-pulse rounded-lg bg-muted" />
          <div className="h-5 w-1/2 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}

function FoundCard({
  item,
  primary,
  compact,
  onReset,
}: {
  item: PublicBarcodeLookup;
  primary: string | null;
  compact: boolean;
  onReset: () => void;
}) {
  const priceLabel = formatDisplayPrice(item.currency, item.price);
  const inStock =
    item.qtyOnHand != null && Number.isFinite(item.qtyOnHand) && item.qtyOnHand > 0;

  if (compact) {
    return (
      <div className="flex gap-3 rounded-xl border border-border/30 bg-card/70 p-3 backdrop-blur-sm">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          {item.images[0]?.url ? (
            <Image
              src={item.images[0].url}
              alt={item.images[0].altText?.trim() || item.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-lg font-semibold text-muted-foreground/40">
              {item.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {item.name}
          </p>
          <p className="mt-1 text-lg font-black tabular-nums text-foreground">
            {priceLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            SKU <span className="font-mono">{item.sku}</span>
            {inStock ? (
              <span className="ml-2 font-medium text-emerald-600">In stock</span>
            ) : null}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={shopItemPathFromCard({ sku: item.sku })}
              className={cn(
                "inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-white transition hover:brightness-110",
                !primary && "bg-primary",
              )}
              style={primary ? { backgroundColor: primary } : undefined}
            >
              View details
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-8 items-center rounded-lg border border-border/60 px-3 text-xs font-medium transition-colors hover:bg-muted/50"
            >
              Scan again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/30 bg-card/70 p-6 backdrop-blur-sm">
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_1.5fr]">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
          {item.images[0]?.url ? (
            <Image
              src={item.images[0].url}
              alt={item.images[0].altText?.trim() || item.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 320px"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl font-medium text-muted-foreground/40">
              {item.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground">
            {item.name}
          </h2>

          {item.brand ? (
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {item.brand}
              {item.size ? ` · ${item.size}` : ""}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-black tabular-nums text-foreground">
              {priceLabel}
            </span>
            {inStock ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                In stock
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            SKU <span className="font-mono text-foreground">{item.sku}</span>
            {" · "}
            Barcode{" "}
            <span className="font-mono text-foreground">{item.barcode}</span>
          </p>

          {item.description ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {item.description.length > 200
                ? `${item.description.slice(0, 200)}…`
                : item.description}
            </p>
          ) : null}

          <p className="mt-3 text-xs text-muted-foreground">
            Sold by{" "}
            <span className="font-medium text-foreground">{item.businessName}</span>
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={shopItemPathFromCard({ sku: item.sku })}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110",
                !primary && "bg-primary",
              )}
              style={primary ? { backgroundColor: primary } : undefined}
            >
              View full details
              <span aria-hidden>→</span>
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="rounded-xl border border-border/70 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50"
            >
              Look up another
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
