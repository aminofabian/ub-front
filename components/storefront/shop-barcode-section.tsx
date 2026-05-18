"use client";

import Link from "next/link";
import { ArrowRight, ScanBarcode } from "lucide-react";

import { BarcodeLookup } from "@/components/storefront/barcode-lookup";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

function isHexColor(value: string | null | undefined): value is string {
  return !!value && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function ShopBarcodeSection({
  primaryHex,
  accentHex,
  className,
}: {
  primaryHex?: string | null;
  accentHex?: string | null;
  className?: string;
}) {
  const primary = isHexColor(primaryHex) ? primaryHex.trim() : null;
  const accent = isHexColor(accentHex) ? accentHex.trim() : null;

  return (
    <section
      id="barcode-lookup"
      className={cn("scroll-mt-24", className)}
      aria-labelledby="barcode-lookup-heading"
    >
      <div className="rounded-xl border border-border/30 bg-card/70 p-4 backdrop-blur-sm sm:p-5">
        <div className="flex flex-wrap items-start gap-3 sm:items-center">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
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
          <div className="min-w-0 flex-1">
            <h2
              id="barcode-lookup-heading"
              className="text-sm font-bold tracking-tight text-foreground sm:text-base"
            >
              Barcode lookup
            </h2>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              Scan or type a product barcode for instant price and availability.
            </p>
          </div>
          <Link
            href={APP_ROUTES.barcode}
            className="hidden shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:ml-auto sm:inline-flex"
          >
            Full page
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <BarcodeLookup
          variant="compact"
          primaryHex={primary}
          accentHex={accent}
          className="mt-4"
        />

        <Link
          href={APP_ROUTES.barcode}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline sm:hidden"
        >
          Open full barcode lookup
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
