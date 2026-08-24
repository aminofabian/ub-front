"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  Copy,
  PackageSearch,
  ScanBarcode,
  Search,
  Smartphone,
  Store,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { BarcodeScanner } from "@/components/barcode-scanner";
import { KioskLogo } from "@/components/brand/kiosk-logo";
import type { PublicBarcodeLookup } from "@/lib/public-storefront";
import {
  fetchPublicBarcodeBrowser,
  fetchPublicBarcodeSearchBrowser,
} from "@/lib/public-storefront-client";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import {
  ghostCtaClass,
  goldCtaClass,
  landingCardClass,
  landingRootStyle,
} from "../tenant-console/landing/landing-styles";

type BarcodeState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "found"; item: PublicBarcodeLookup }
  | { phase: "not-found"; code: string }
  | { phase: "error"; message: string };

type SearchState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "results"; items: PublicBarcodeLookup[] }
  | { phase: "empty"; q: string }
  | { phase: "error"; message: string };

/** Which mode was last used — drives what results we show. */
type ActiveMode = "barcode" | "search";

const FEATURES = [
  {
    icon: ScanBarcode,
    title: "GTIN & retail codes",
    body: "EAN-13, UPC, and local product IDs — type or scan from your phone.",
  },
  {
    icon: Smartphone,
    title: "Camera scan",
    body: "Point your camera at the label. No app install required.",
  },
  {
    icon: Search,
    title: "Search by name",
    body: "Don't have a barcode? Just type a product name and we'll find it for you.",
  },
] as const;

/** FAQ shown on the page — kept in sync with the FAQPage JSON-LD in app/barcode/page.tsx. */
const FAQS = [
  {
    question: "How do I look up a barcode in Kenya?",
    answer:
      "Type the barcode digits into the search box, or scan them with your phone camera. Kiosk.ke matches the number against its product catalogue and shows the product name, typical price in KES, and stock availability. Free to use, no sign-up required.",
  },
  {
    question: "What barcode formats can I search?",
    answer:
      "The search accepts EAN-13 (the most common on Kenyan shelves), UPC-A, EAN-8, and GTIN codes. If you don't have a barcode, just type a product name — the same box searches by name too.",
  },
  {
    question: "Can I check a product's price with its barcode?",
    answer:
      "Yes. A lookup shows a typical selling price in Kenyan shillings and whether the product is in stock at Kiosk-powered stores, so you can compare prices before you pay.",
  },
  {
    question: "Do products in Kenya have barcodes?",
    answer:
      "Most packaged goods sold in Kenya carry EAN-13 barcodes, with 616 as the GS1 country prefix for Kenya. Unpackaged or informally produced goods often don't — for those, search by product name instead.",
  },
  {
    question: "What if my barcode doesn't show a result?",
    answer:
      "Try the product name search instead. If you run a shop on Kiosk POS, you can add the product to your own catalog so it resolves for you and your customers next time.",
  },
  {
    question: "Is barcode lookup really free?",
    answer:
      "Yes — free to use, no sign-up, and no app install. Point your camera or type a number and search across all Kiosk-powered stores.",
  },
];

/** Strips separators; returns the cleaned numeric string if it looks like a barcode. */
function parseBarcode(raw: string): string | null {
  const clean = raw.replace(/[\s\-._]/g, "").trim();
  if (!clean || clean.length < 4) return null;
  if (!/^\d+$/.test(clean)) return null;
  return clean;
}

// ── Main page ──────────────────────────────────────────────────────────────

export function BarcodePlatformPage() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ActiveMode>("barcode");
  const [barcodeState, setBarcodeState] = useState<BarcodeState>({
    phase: "idle",
  });
  const [searchState, setSearchState] = useState<SearchState>({
    phase: "idle",
  });
  const [scannerOpen, setScannerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setBarcodeState({ phase: "idle" });
    setSearchState({ phase: "idle" });
    setInput("");
    inputRef.current?.focus();
  }, []);

  const doBarcodeLookup = useCallback(async (code: string) => {
    const parsed = parseBarcode(code);
    if (!parsed) return;
    setMode("barcode");
    setSearchState({ phase: "idle" });
    setBarcodeState({ phase: "loading" });
    try {
      const item = await fetchPublicBarcodeBrowser(parsed);
      if (!item) {
        setBarcodeState({ phase: "not-found", code: parsed });
      } else {
        setBarcodeState({ phase: "found", item });
      }
    } catch {
      setBarcodeState({
        phase: "error",
        message: "Could not look up that barcode. Please try again.",
      });
    }
  }, []);

  const doProductSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setMode("search");
    setBarcodeState({ phase: "idle" });
    setSearchState({ phase: "loading" });
    try {
      const items = await fetchPublicBarcodeSearchBrowser(trimmed);
      if (items.length === 0) {
        setSearchState({ phase: "empty", q: trimmed });
      } else {
        setSearchState({ phase: "results", items });
      }
    } catch {
      setSearchState({
        phase: "error",
        message: "Something went wrong. Please try again.",
      });
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-detect: numbers-only → barcode, anything else → product search
    if (parseBarcode(input)) {
      void doBarcodeLookup(input);
    } else {
      void doProductSearch(input);
    }
  };

  const onScanned = useCallback(
    (barcode: string) => {
      setScannerOpen(false);
      setInput(barcode);
      void doBarcodeLookup(barcode);
    },
    [doBarcodeLookup],
  );

  const isLoading =
    barcodeState.phase === "loading" || searchState.phase === "loading";
  const submitDisabled = isLoading || input.trim().length < 2;

  return (
    <div
      className="landing-page min-h-screen antialiased selection:bg-[var(--kiosk-gold-soft)] selection:text-[var(--kiosk-text)]"
      style={landingRootStyle()}
    >
      <BarcodePlatformNav />

      <main className="relative isolate overflow-x-hidden">
        <BarcodeAtmosphere />

        <div className="relative z-10 mx-auto w-full max-w-[1120px] px-5 pb-24 pt-[7.5rem] sm:px-10 sm:pb-28 sm:pt-[8.5rem] lg:px-14">
          <header className="landing-reveal mb-10 max-w-[40rem]">
            <h1 className="font-heading text-[clamp(2.25rem,5.8vw,3.75rem)] leading-[1.06] tracking-[-0.03em] text-[var(--kiosk-text)]">
              Know what&apos;s on the shelf
              <span className="mt-2 block font-semibold text-[var(--kiosk-gold)]">
                before you ring it up.
              </span>
            </h1>
            <p className="mt-6 max-w-[32rem] text-[15px] leading-[1.75] text-[var(--kiosk-text-muted)] sm:text-[17px]">
              Type a barcode or product name — we&apos;ll figure out which one
              you meant. Scan, search, and see prices across all Kiosk stores.
            </p>
          </header>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-14 xl:gap-16">
            <div className="landing-reveal landing-reveal-delay-1 min-w-0">
              {/* ── Unified search bar ── */}
              <form onSubmit={handleSubmit} className="mb-6">
                <div
                  className="flex items-stretch overflow-hidden rounded-2xl border-2 border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] shadow-lg transition-all focus-within:border-[var(--kiosk-gold)] focus-within:shadow-[0_8px_32px_-8px_var(--kiosk-success-shadow)]"
                  role="search"
                >
                  <label className="sr-only" htmlFor="unified-search-input">
                    Enter a barcode or product name
                  </label>
                  <span className="flex items-center pl-5 text-[var(--kiosk-text-dim)]">
                    <Search className="h-5 w-5" aria-hidden />
                  </span>
                  <input
                    ref={inputRef}
                    id="unified-search-input"
                    type="text"
                    inputMode="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter a barcode or product name…"
                    className="h-14 sm:h-16 min-w-0 flex-1 border-0 bg-transparent px-4 text-base outline-none focus-visible:ring-0 sm:text-lg text-[var(--kiosk-text)] placeholder:text-[var(--kiosk-text-dim)]"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="flex w-12 shrink-0 items-center justify-center border-l border-[var(--kiosk-border)] text-[var(--kiosk-text-muted)] transition-colors hover:bg-[var(--kiosk-gold-soft)] hover:text-[var(--kiosk-gold)]"
                    aria-label="Scan barcode with camera"
                    title="Scan with camera"
                  >
                    <Camera className="h-5 w-5" aria-hidden />
                  </button>
                  <button
                    type="submit"
                    disabled={submitDisabled}
                    className={cn(
                      goldCtaClass,
                      "!rounded-none !px-6 !py-0 !shadow-none hover:!translate-y-0 min-w-[7rem] shrink-0 items-center justify-center text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                  >
                    {isLoading ? (
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

              {/* ── Results (auto-detected mode) ── */}
              {mode === "barcode" && (
                <BarcodeResults state={barcodeState} onReset={reset} />
              )}
              {mode === "search" && <SearchResults state={searchState} />}
            </div>

            <aside className="landing-reveal landing-reveal-delay-2 flex flex-col gap-5">
              <PosPromoCard />
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className={cn(landingCardClass, "p-5")}>
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--kiosk-gold-soft)]">
                    <Icon
                      className="h-[18px] w-[18px] text-[var(--kiosk-gold)]"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </span>
                  <h2 className="font-heading text-lg font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--kiosk-text-muted)]">
                    {body}
                  </p>
                </div>
              ))}
            </aside>
          </div>

          <section className="landing-reveal landing-reveal-delay-3 mt-20 rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-8 sm:p-10">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <h2 className="font-heading text-[clamp(1.75rem,3.5vw,2.25rem)] leading-[1.12] tracking-[-0.03em] text-[var(--kiosk-text)]">
                  Want this at your counter every day?
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--kiosk-text-muted)]">
                  Set up Kiosk POS in minutes — scan barcodes, take M-Pesa STK,
                  print receipts, and keep selling when Wi‑Fi drops. No card
                  needed to start.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                <Link
                  href="/"
                  className={`${goldCtaClass} w-full justify-center sm:w-auto`}
                >
                  Set up your POS
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                </Link>
                <Link
                  href="/#how"
                  className={`${ghostCtaClass} w-full justify-center sm:w-auto`}
                >
                  See how it works
                </Link>
              </div>
            </div>
          </section>

          {/* ── Guide link (SEO + reader value) ── */}
          <section className="landing-reveal mt-16 rounded-2xl border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
                  From the blog
                </p>
                <h2 className="mt-2 font-heading text-xl leading-[1.2] tracking-[-0.02em] text-[var(--kiosk-text)] sm:text-2xl">
                  Barcode Search in Kenya: the full guide
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--kiosk-text-soft)]">
                  What an EAN-13 is, why 616 is Kenya&apos;s country prefix,
                  the formats on local shelves, and how lookup turns shopping
                  into facts instead of guesses.
                </p>
              </div>
              <Link
                href="/blog/barcode-search-kenya-lookup-guide"
                className={`${goldCtaClass} w-full shrink-0 justify-center sm:w-auto`}
              >
                Read the guide
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
              </Link>
            </div>
          </section>

          {/* ── Formats — indexable content ── */}
          <section className="landing-reveal mt-16 grid gap-6 lg:grid-cols-2">
            <div className={cn(landingCardClass, "p-7")}>
              <h2 className="font-heading text-2xl tracking-[-0.02em] text-[var(--kiosk-text)]">
                Barcode formats you can search
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--kiosk-text-muted)]">
                Kenyan shelves are mostly EAN-13 — 13 digits that start with
                <span className="font-semibold text-[var(--kiosk-text)]">
                  {" "}616, Kenya&apos;s GS1 country prefix
                </span>
                {" "}— but the search handles more than that. One box, every
                common retail code:
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "EAN-13 · 13 digits",
                  "UPC-A · 12 digits",
                  "EAN-8 · small packs",
                  "GTIN-14 · wholesale cases",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-3.5 py-1.5 text-[12.5px] font-medium text-[var(--kiosk-text)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-[13.5px] leading-relaxed text-[var(--kiosk-text-dim)]">
                No barcode at all? The same box searches product names across
                every Kiosk-powered store — type &quot;cooking oil&quot; and
                you&apos;ll get real products, not guesses.
              </p>
            </div>

            <div className={cn(landingCardClass, "p-7")}>
              <h2 className="font-heading text-2xl tracking-[-0.02em] text-[var(--kiosk-text)]">
                Who uses barcode lookup in Kenya?
              </h2>
              <ul className="mt-4 space-y-3">
                {[
                  "Shoppers checking a fair price before they pay.",
                  "Shopkeepers building a product catalog without typing.",
                  "Suppliers confirming the exact item in an order.",
                  "Anyone reconciling stock, receipts, or purchase lists.",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-[14.5px] leading-relaxed text-[var(--kiosk-text-soft)]"
                  >
                    <span
                      aria-hidden
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--kiosk-gold)]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ── FAQ — matches FAQPage schema ── */}
          <section className="landing-reveal mt-16">
            <div className="rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-7 sm:p-9">
              <h2 className="font-heading text-2xl tracking-[-0.02em] text-[var(--kiosk-text)]">
                Barcode lookup in Kenya — common questions
              </h2>
              <div className="mt-2 border-t border-[var(--kiosk-border-soft)]">
                {FAQS.map((faq) => (
                  <details
                    key={faq.question}
                    className="border-b border-[var(--kiosk-border-soft)]"
                  >
                    <summary className="cursor-pointer list-none py-4 text-[15px] font-semibold tracking-[-0.015em] text-[var(--kiosk-text)] [&::-webkit-details-marker]:hidden">
                      {faq.question}
                    </summary>
                    <p className="pb-4 pr-4 text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      {scannerOpen ? (
        <BarcodeScanner
          onScan={onScanned}
          onClose={() => setScannerOpen(false)}
        />
      ) : null}

      <footer className="border-t border-[var(--kiosk-border-soft)] px-5 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <KioskLogo href="/" size="sm" variant="landing" layout="badge" />
          <p className="text-sm text-[var(--kiosk-text-dim)]">
            © {new Date().getFullYear()} Kiosk · Barcode lookup is free for
            everyone.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Barcode results ────────────────────────────────────────────────────────

function BarcodeResults({
  state,
  onReset,
}: {
  state: BarcodeState;
  onReset: () => void;
}) {
  if (state.phase === "idle") return null;

  if (state.phase === "loading") {
    return (
      <div
        className={cn(
          landingCardClass,
          "border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-6 backdrop-blur-sm",
        )}
      >
        <div className="grid gap-6 sm:grid-cols-[1fr_1.5fr]">
          <div className="aspect-square animate-pulse rounded-xl bg-[var(--kiosk-surface)]" />
          <div className="space-y-4">
            <div className="h-7 w-3/4 animate-pulse rounded-lg bg-[var(--kiosk-surface)]" />
            <div className="h-9 w-1/3 animate-pulse rounded-lg bg-[var(--kiosk-surface)]" />
            <div className="h-5 w-1/2 animate-pulse rounded-lg bg-[var(--kiosk-surface)]" />
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === "not-found") {
    return (
      <div
        className={cn(
          landingCardClass,
          "border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-6 text-center backdrop-blur-sm",
        )}
      >
        <PackageSearch
          className="mx-auto h-10 w-10 text-[var(--kiosk-text-dim)]"
          aria-hidden
        />
        <h2 className="mt-3 font-heading text-base font-semibold text-[var(--kiosk-text)]">
          No product found
        </h2>
        <p className="mt-1 text-sm text-[var(--kiosk-text-muted)]">
          Barcode{" "}
          <span className="font-mono font-medium text-[var(--kiosk-text)]">
            {state.code}
          </span>{" "}
          doesn&apos;t match any product in our catalog.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-4 text-sm font-semibold text-[var(--kiosk-gold)] hover:underline"
        >
          Try another search
        </button>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50/80 p-6 text-center dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-sm text-red-700 dark:text-red-300">
          {state.message}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-4 text-sm font-semibold text-red-700 hover:underline dark:text-red-300"
        >
          Try again
        </button>
      </div>
    );
  }

  // Found
  const { item } = state;
  const priceLabel = formatDisplayPrice(item.currency, item.price);
  const inStock =
    item.qtyOnHand != null &&
    Number.isFinite(item.qtyOnHand) &&
    item.qtyOnHand > 0;

  return (
    <div
      className={cn(
        landingCardClass,
        "border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-6 backdrop-blur-sm",
      )}
    >
      <div className="grid gap-6 sm:grid-cols-[1fr_1.5fr]">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--kiosk-surface)]">
          {item.images[0]?.url ? (
            <Image
              src={item.images[0].url}
              alt={item.images[0].altText?.trim() || item.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 40vw"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-4xl font-bold text-[var(--kiosk-text-dim)]">
              {item.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--kiosk-text-muted)]">
            {item.businessName}
          </p>
          <h2 className="mt-1 font-heading text-xl font-bold leading-tight text-[var(--kiosk-text)]">
            {item.name}
          </h2>
          {item.brand && (
            <p className="mt-1 text-sm text-[var(--kiosk-text-muted)]">
              {item.brand}
              {item.size ? ` · ${item.size}` : ""}
            </p>
          )}
          <p className="mt-3 font-heading text-2xl font-black tabular-nums text-[var(--kiosk-text)]">
            {priceLabel}
          </p>
          <p className="mt-1 text-sm text-[var(--kiosk-text-muted)]">
            SKU{" "}
            <span className="font-mono font-medium text-[var(--kiosk-text)]">
              {item.sku}
            </span>
            {inStock ? (
              <span className="ml-2 font-medium text-emerald-600">
                In stock
              </span>
            ) : null}
          </p>
          <BarcodeCopyButton barcode={item.barcode} />
          <button
            type="button"
            onClick={onReset}
            className="mt-3 text-sm font-semibold text-[var(--kiosk-gold)] hover:underline"
          >
            Try another search
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product search results ─────────────────────────────────────────────────

function SearchResults({ state }: { state: SearchState }) {
  if (state.phase === "idle") return null;

  if (state.phase === "loading") {
    return (
      <div
        className={cn(
          landingCardClass,
          "border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-6",
        )}
      >
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
    );
  }

  if (state.phase === "empty") {
    return (
      <div
        className={cn(
          landingCardClass,
          "border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-8 text-center",
        )}
      >
        <Search
          className="mx-auto h-10 w-10 text-[var(--kiosk-text-dim)]"
          aria-hidden
        />
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
    );
  }

  if (state.phase === "error") {
    return (
      <div className="rounded-xl border border-red-200/80 bg-red-50/80 p-6 text-center dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-sm text-red-700 dark:text-red-300">
          {state.message}
        </p>
      </div>
    );
  }

  return (
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
            {item.parentName ? (
              <>
                <p className="truncate text-xs text-[var(--kiosk-text-muted)]">
                  {item.parentName}
                </p>
                <p className="truncate text-sm font-semibold text-[var(--kiosk-text)]">
                  {item.name}
                </p>
              </>
            ) : (
              <p className="truncate text-sm font-semibold text-[var(--kiosk-text)]">
                {item.name}
              </p>
            )}
            {item.variantName ? (
              <p className="truncate text-xs text-[var(--kiosk-text-dim)]">
                {item.variantName}
              </p>
            ) : item.brand ? (
              <p className="truncate text-xs text-[var(--kiosk-text-muted)]">
                {item.brand}
                {item.size ? ` · ${item.size}` : ""}
              </p>
            ) : null}
          </div>
        </div>
      </td>
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
              <Check
                className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                aria-hidden
              />
            ) : (
              <Copy
                className="h-3.5 w-3.5 shrink-0 text-[var(--kiosk-text-dim)] opacity-0 transition group-hover:opacity-100"
                aria-hidden
              />
            )}
          </button>
        ) : (
          <span className="text-xs text-[var(--kiosk-text-dim)]">—</span>
        )}
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <div className="flex items-center gap-1.5 text-xs text-[var(--kiosk-text-muted)]">
          <Store className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate max-w-[140px]">{item.businessName}</span>
        </div>
      </td>
      <td className="hidden px-4 py-3 text-right md:table-cell">
        <span className="text-sm font-bold tabular-nums text-[var(--kiosk-text)]">
          {priceLabel}
        </span>
      </td>
    </tr>
  );
}

// ── Barcode copy button ────────────────────────────────────────────────────

function BarcodeCopyButton({
  barcode,
}: {
  barcode: string | null | undefined;
}) {
  const [copied, setCopied] = useState(false);
  const code = barcode?.trim();
  if (!code) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="mt-3 group inline-flex items-center gap-1.5 self-start rounded-lg border border-[var(--kiosk-border)] px-3 py-1.5 text-xs font-mono font-medium text-[var(--kiosk-text)] transition hover:bg-[var(--kiosk-gold-soft)]"
    >
      {code}
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
      ) : (
        <Copy
          className="h-3.5 w-3.5 text-[var(--kiosk-text-dim)] opacity-0 transition group-hover:opacity-100"
          aria-hidden
        />
      )}
    </button>
  );
}

// ── Nav / Promo / Atmosphere ────────────────────────────────────────────────

function BarcodePlatformNav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-[4.25rem] items-center justify-between border-b border-[var(--kiosk-border-soft)] bg-[var(--kiosk-nav-blur-bg)] px-5 backdrop-blur-xl sm:h-[4.5rem] sm:px-10">
      <KioskLogo href="/" size="lg" variant="landing" layout="badge" />

      <div className="hidden items-center gap-8 md:flex">
        <Link
          href="/"
          className="text-sm text-[var(--kiosk-text-muted)] transition-colors hover:text-[var(--kiosk-text)]"
        >
          Home
        </Link>
        <span className="text-sm font-medium text-[var(--kiosk-text)]">
          Barcode lookup
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={APP_ROUTES.login}
          className="hidden text-sm text-[var(--kiosk-text-muted)] transition-colors hover:text-[var(--kiosk-text)] sm:inline"
        >
          Sign in
        </Link>
        <Link href="/" className={`${goldCtaClass} !px-4 !py-2 !text-[13px]`}>
          Get Kiosk free
        </Link>
      </div>
    </nav>
  );
}

function PosPromoCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--kiosk-gold-border)] bg-gradient-to-br from-[var(--kiosk-gold-surface)] via-[var(--kiosk-elevated)] to-[var(--kiosk-elevated)] p-6 shadow-[0_8px_32px_-12px_var(--kiosk-success-shadow)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, var(--kiosk-gold-soft) 0%, transparent 70%)",
        }}
      />
      <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--kiosk-gold-soft)]">
        <Store
          className="h-5 w-5 text-[var(--kiosk-gold)]"
          strokeWidth={1.75}
          aria-hidden
        />
      </span>
      <h2 className="font-heading text-xl font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
        Run your own till
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--kiosk-text-muted)]">
        Turn this lookup into a full POS — shifts, M-Pesa, receipts, and stock
        in one place.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--kiosk-gold)] transition-colors hover:text-[var(--kiosk-gold-hover)]"
      >
        Set up Kiosk POS
        <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
      </Link>
    </div>
  );
}

function BarcodeAtmosphere() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-40"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 11px,
            var(--kiosk-grid-line) 11px,
            var(--kiosk-grid-line) 12px
          )`,
          maskImage:
            "linear-gradient(180deg, var(--kiosk-bg) 0%, transparent 85%)",
          WebkitMaskImage:
            "linear-gradient(180deg, var(--kiosk-bg) 0%, transparent 85%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-24 h-[min(50vh,420px)] w-[min(55%,480px)] opacity-[0.14]"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 70% 30%, var(--kiosk-gold) 0%, transparent 65%)",
        }}
      />
    </>
  );
}
