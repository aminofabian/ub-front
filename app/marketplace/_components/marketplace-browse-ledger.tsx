"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Package } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import type {
  MarketplaceProductSearchRow,
  MarketplaceSupplierSearchRow,
} from "@/lib/marketplace-api";
import { marketplacePassportProductPath } from "@/lib/marketplace-url";
import { cn, formatMoney } from "@/lib/utils";

function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function ColHead({
  label,
  width,
  align = "left",
  className,
}: {
  label: string;
  width: string;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-8 shrink-0 items-center border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2 text-[10px] font-bold uppercase tracking-[0.08em] last:border-r-0",
        width,
        align === "right" && "justify-end",
        "text-muted-foreground",
        className,
      )}
    >
      {label}
    </div>
  );
}

function LedgerThumb({
  src,
  alt,
  hue,
}: {
  src: string | null | undefined;
  alt: string;
  hue: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src && !failed);

  return (
    <div
      className="relative size-9 shrink-0 overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-muted/40"
      style={
        showImage
          ? undefined
          : {
              background: `linear-gradient(145deg, hsl(${hue} 18% 88%), hsl(${(hue + 28) % 360} 14% 78%))`,
            }
      }
    >
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          unoptimized
          className="object-contain p-0.5"
          sizes="36px"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-foreground/55">
          <Package className="size-3.5" aria-hidden />
        </span>
      )}
    </div>
  );
}

const LEDGER_SHELL =
  "overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)]";

const LEDGER_ROW =
  "flex min-h-11 items-stretch border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] text-[12px] last:border-b-0 hover:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_45%,transparent)]";

function ledgerStats(rows: MarketplaceProductSearchRow[]) {
  const suppliers = new Set(rows.map((r) => r.supplierId)).size;
  const priced = rows
    .map((r) => r.unitPrice)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const low = priced.length > 0 ? Math.min(...priced) : null;
  const currency = rows.find((r) => r.currency)?.currency ?? "KES";
  return { suppliers, low, currency };
}

export function MarketplaceProductLedger({
  rows,
}: {
  rows: MarketplaceProductSearchRow[];
}) {
  const stats = ledgerStats(rows);
  return (
    <div className={LEDGER_SHELL}>
      <div className="flex items-end justify-between gap-3 bg-[var(--pos-ink,#1c1915)] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[color-mix(in_srgb,#fff_48%,transparent)]">
            Marketplace ledger
          </p>
          <p className="mt-0.5 truncate font-heading text-[15px] font-semibold tracking-[-0.03em] text-white tabular-nums">
            {rows.length} product{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <p className="shrink-0 text-right text-[10px] leading-snug text-[color-mix(in_srgb,#fff_62%,transparent)]">
          {stats.suppliers} supplier{stats.suppliers === 1 ? "" : "s"}
          {stats.low != null
            ? ` · from ${formatMoney(stats.low, stats.currency)}`
            : ""}
        </p>
      </div>
      <div className="flex border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_60%,transparent)]">
        <ColHead label="#" width="w-9" />
        <ColHead label="Item" width="min-w-0 flex-1" />
        <ColHead label="Supplier" width="w-[9.5rem] hidden md:flex" />
        <ColHead label="Area" width="w-[6.5rem] hidden lg:flex" />
        <ColHead label="Price" width="w-[6.5rem]" align="right" />
      </div>
      <div>
        {rows.map((row, index) => {
          const href =
            marketplacePassportProductPath(row.supplierSlug, row.productSlug) ??
            (row.supplierSlug
              ? APP_ROUTES.marketplaceSupplier(row.supplierSlug)
              : APP_ROUTES.marketplace);
          const hue = hueFromId(row.productId);
          return (
            <Link
              key={`${row.supplierId}-${row.productId}`}
              href={href}
              className={LEDGER_ROW}
            >
              <div className="flex w-9 shrink-0 items-center justify-center border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] font-mono text-[10px] tabular-nums text-muted-foreground">
                {index + 1}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] px-2 py-1.5">
                <LedgerThumb
                  src={row.imageUrl}
                  alt=""
                  hue={hue}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--pos-ink,#1c1915)]">
                    {row.productName}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground md:hidden">
                    {row.supplierName}
                    {row.location ? ` · ${row.location}` : ""}
                  </p>
                </div>
              </div>
              <div className="hidden w-[9.5rem] shrink-0 items-center border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] px-2 md:flex">
                <span className="truncate text-[11px] text-[var(--pos-ink,#1c1915)]">
                  {row.supplierName}
                </span>
              </div>
              <div className="hidden w-[6.5rem] shrink-0 items-center border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] px-2 lg:flex">
                <span className="truncate text-[11px] text-muted-foreground">
                  {row.location || "—"}
                </span>
              </div>
              <div className="flex w-[6.5rem] shrink-0 items-center justify-end px-2 font-mono text-[11px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
                {row.unitPrice != null
                  ? formatMoney(row.unitPrice, row.currency ?? "KES")
                  : "Ask"}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function MarketplaceSupplierLedger({
  rows,
}: {
  rows: MarketplaceSupplierSearchRow[];
}) {
  const listed = rows.reduce((sum, row) => sum + (row.productCount ?? 0), 0);
  return (
    <div className={LEDGER_SHELL}>
      <div className="flex items-end justify-between gap-3 bg-[var(--pos-ink,#1c1915)] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[color-mix(in_srgb,#fff_48%,transparent)]">
            Marketplace ledger
          </p>
          <p className="mt-0.5 truncate font-heading text-[15px] font-semibold tracking-[-0.03em] text-white tabular-nums">
            {rows.length} supplier{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <p className="shrink-0 text-right text-[10px] leading-snug text-[color-mix(in_srgb,#fff_62%,transparent)]">
          {listed} product{listed === 1 ? "" : "s"} listed
        </p>
      </div>
      <div className="flex border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_60%,transparent)]">
        <ColHead label="#" width="w-9" />
        <ColHead label="Supplier" width="min-w-0 flex-1" />
        <ColHead label="Area" width="w-[8rem] hidden md:flex" />
        <ColHead label="Products" width="w-[5.5rem]" align="right" />
      </div>
      <div>
        {rows.map((row, index) => {
          const href = row.slug
            ? APP_ROUTES.marketplaceSupplier(row.slug)
            : APP_ROUTES.marketplace;
          const hue = hueFromId(row.id);
          return (
            <Link key={row.id} href={href} className={LEDGER_ROW}>
              <div className="flex w-9 shrink-0 items-center justify-center border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] font-mono text-[10px] tabular-nums text-muted-foreground">
                {index + 1}
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] px-2 py-1.5">
                <span
                  className="inline-flex size-9 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] text-[10px] font-bold"
                  style={{
                    background: `linear-gradient(145deg, hsl(${hue} 18% 88%), hsl(${(hue + 28) % 360} 14% 78%))`,
                  }}
                >
                  {initials(row.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--pos-ink,#1c1915)]">
                    {row.name}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground md:hidden">
                    {row.location || (row.locations?.[0] ?? "—")}
                    {row.listedBy ? ` · ${row.listedBy}` : ""}
                  </p>
                </div>
              </div>
              <div className="hidden w-[8rem] shrink-0 items-center border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] px-2 md:flex">
                <span className="truncate text-[11px] text-muted-foreground">
                  {row.location || (row.locations?.[0] ?? "—")}
                </span>
              </div>
              <div className="flex w-[5.5rem] shrink-0 items-center justify-end px-2 font-mono text-[11px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
                {row.productCount}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function MarketplaceLedgerSkeleton({
  tab,
}: {
  tab: "products" | "suppliers";
}) {
  return (
    <div className={LEDGER_SHELL}>
      <div className="flex h-8 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_60%,transparent)]">
        <div className="w-9 border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]" />
        <div className="min-w-0 flex-1" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex min-h-11 items-center gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] px-2 last:border-b-0"
        >
          <div className="h-2.5 w-4 animate-pulse bg-muted/50" />
          <div className="size-9 shrink-0 animate-pulse bg-muted/40" />
          <div className="h-3 min-w-0 flex-1 animate-pulse bg-muted/50" />
          <div className="h-3 w-14 shrink-0 animate-pulse bg-muted/40" />
        </div>
      ))}
      <span className="sr-only">
        Loading {tab === "suppliers" ? "suppliers" : "products"}…
      </span>
    </div>
  );
}
