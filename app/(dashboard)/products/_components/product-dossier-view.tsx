"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, PencilLine } from "lucide-react";

import { ProductsHubNav } from "@/components/products/products-hub-nav";
import { useDashboard } from "@/components/dashboard-provider";
import {
  ApiRequestError,
  fetchCurrentSellingPrice,
  fetchItemById,
  fetchItemEconomics,
  itemListThumbnailUrl,
  type ItemCustomerBuyRow,
  type ItemDetailRecord,
  type ItemEconomicsRecord,
  type ItemPurchaseHistoryRow,
  type ItemSaleHistoryRow,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { resolveCatalogItemName } from "@/lib/catalog-display";
import { parseProductDossierSlug } from "@/lib/product-dossier-url";
import { cn, formatMoney } from "@/lib/utils";
import { coverImageUrl, toNumber } from "../_utils";
import { PRODUCTS_CATALOG_VARS } from "./products-page-layout";
import styles from "./product-dossier.module.css";

function n(v: number | string | null | undefined): number {
  return toNumber(v) ?? 0;
}

function formatQty(v: number | string | null | undefined): string {
  const x = toNumber(v);
  if (x == null) return "0";
  return x.toLocaleString("en-KE", { maximumFractionDigits: 2 });
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  try {
    return new Date(iso).toLocaleString("en-KE", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

export function ProductDossierView({ slug }: { slug: string }) {
  const { business, branchId } = useDashboard();
  const currency = business?.currency?.trim() || "KES";
  const itemId = parseProductDossierSlug(slug);
  const [detail, setDetail] = useState<ItemDetailRecord | null>(null);
  const [econ, setEcon] = useState<ItemEconomicsRecord | null>(null);
  const [sellPrice, setSellPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) {
      setLoading(false);
      setError("This product link is missing its id.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [row, stats] = await Promise.all([
          fetchItemById(itemId, { branchId }),
          fetchItemEconomics(itemId),
        ]);
        if (cancelled) return;
        setDetail(row);
        setEcon(stats);
        try {
          const sp = await fetchCurrentSellingPrice(itemId, branchId);
          if (!cancelled) setSellPrice(toNumber(sp.price));
        } catch {
          if (!cancelled) setSellPrice(toNumber(row.bundlePrice));
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiRequestError) {
          setError(e.status === 404 ? "Product not found." : e.message);
        } else {
          setError("Could not load this product.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId, branchId]);

  const thumb = detail
    ? coverImageUrl(detail) ?? itemListThumbnailUrl(detail)
    : null;
  const displayName = detail ? resolveCatalogItemName(detail) : null;
  const title = displayName?.label || econ?.name || "Product";

  const maxDay = useMemo(() => {
    if (!econ?.last30Days?.length) return 1;
    return Math.max(1, ...econ.last30Days.map((d) => n(d.unitsSold)));
  }, [econ]);

  const sold = n(econ?.unitsSold);
  const bought = n(econ?.unitsBought);
  const gross = n(econ?.grossProfit);
  const revenue = n(econ?.revenue);
  const spend = n(econ?.supplierSpend);
  const namedBuyers = (econ?.buyers ?? []).filter((b) => b.customerId);
  const walkIn = (econ?.buyers ?? []).find((b) => !b.customerId);

  return (
    <div
      className={cn(styles.page, "relative mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col px-3 pb-8 pt-2 sm:px-5 sm:pt-3")}
      style={PRODUCTS_CATALOG_VARS}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(90%_80%_at_8%_-10%,color-mix(in_srgb,var(--catalog-primary)_16%,transparent),transparent_58%)]"
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-4">
        <div className="shrink-0 rounded-xl border border-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)] bg-[color-mix(in_srgb,var(--catalog-slip)_92%,transparent)] p-1">
          <ProductsHubNav />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={APP_ROUTES.products}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-1.5 text-[13px] font-medium text-[color-mix(in_srgb,var(--catalog-ink)_62%,transparent)] hover:text-[var(--catalog-ink)]"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Catalog
          </Link>
          {detail ? (
            <Link
              href={`${APP_ROUTES.products}?product=${encodeURIComponent(detail.id)}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--catalog-ink)] px-3 text-[12px] font-medium text-white hover:bg-[color-mix(in_srgb,var(--catalog-ink)_88%,#000)]"
            >
              <PencilLine className="size-3.5" aria-hidden />
              Edit
            </Link>
          ) : null}
        </div>

        {loading ? (
          <DossierSkeleton />
        ) : error || !econ || !detail ? (
          <div className="rounded-xl bg-[var(--catalog-shelf)] px-4 py-12 text-center text-sm text-[color-mix(in_srgb,var(--catalog-ink)_62%,transparent)]">
            {error ?? "Product not found."}
          </div>
        ) : (
          <div className={styles.board}>
            <aside className={styles.pack}>
              <div className={styles.photo}>
                {thumb ? (
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(min-width: 1180px) 280px, 40vw"
                    priority
                  />
                ) : (
                  <span className="flex h-full items-center justify-center font-heading text-5xl font-semibold text-[color-mix(in_srgb,var(--catalog-ink)_28%,transparent)]">
                    {title.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <h1 className="mt-4 font-heading text-[1.65rem] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--catalog-ink)]">
                {title}
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--catalog-ink)_58%,transparent)]">
                {detail.sku ? <span className="font-mono">{detail.sku}</span> : null}
                {detail.sku ? " " : null}
                {formatQty(econ.onHand)}
                {detail.unitType ? ` ${detail.unitType}` : ""} on the shelf
                {sellPrice != null ? `, selling at ${formatMoney(sellPrice, currency)}` : ""}
                {econ.includesVariants ? `, ${econ.skuCount} SKUs in the family` : ""}
              </p>

              <dl className={styles.tape}>
                <TapeStat label="Sold" value={formatQty(sold)} hint={`${econ.saleCount} receipts`} />
                <TapeStat label="Took in" value={formatMoney(revenue, currency)} hint="Till" />
                <TapeStat label="Paid out" value={formatMoney(spend, currency)} hint={`${formatQty(bought)} bought`} />
                <TapeStat label="Kept" value={formatMoney(gross, currency)} hint="After cost" />
              </dl>

              <div className="mt-5">
                <div className={styles.colHead}>
                  <h2 className="font-heading text-[15px] font-semibold tracking-[-0.02em] text-[var(--catalog-ink)]">
                    Last 30 days
                  </h2>
                  <p className={cn(styles.mono, "text-[11px] text-[color-mix(in_srgb,var(--catalog-ink)_48%,transparent)]")}>
                    {formatQty(econ.unitsSold30d)} out
                  </p>
                </div>
                {econ.last30Days.length === 0 ? (
                  <p className="text-[13px] text-[color-mix(in_srgb,var(--catalog-ink)_52%,transparent)]">
                    Quiet month.
                  </p>
                ) : (
                  <div className={styles.bars} aria-hidden>
                    {econ.last30Days.map((day) => {
                      const qty = n(day.unitsSold);
                      const h = Math.max(qty > 0 ? 10 : 3, Math.round((qty / maxDay) * 72));
                      return (
                        <span
                          key={day.date}
                          title={`${day.date}: ${formatQty(qty)}`}
                          style={{
                            height: h,
                            background:
                              qty > 0
                                ? "var(--dossier-teal)"
                                : "color-mix(in srgb, var(--dossier-ink) 10%, transparent)",
                          }}
                        />
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 text-[12px] text-[color-mix(in_srgb,var(--catalog-ink)_52%,transparent)]">
                  {econ.lastSoldAt
                    ? `Last sold ${formatWhen(econ.lastSoldAt)}`
                    : "Not sold yet"}
                  {`, ${formatQty(econ.unitsSold7d)} this week`}
                </p>
              </div>
            </aside>

            <section className={styles.people}>
              <div className={styles.colHead}>
                <h2 className="font-heading text-[17px] font-semibold tracking-[-0.02em] text-[var(--catalog-ink)]">
                  Who bought this
                </h2>
                <p className={cn(styles.mono, "text-[12px] text-[color-mix(in_srgb,var(--catalog-ink)_48%,transparent)]")}>
                  {namedBuyers.length}
                  {walkIn ? ` + walk-in` : ""}
                </p>
              </div>
              {(econ.buyers ?? []).length === 0 ? (
                <p className="text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--catalog-ink)_55%,transparent)]">
                  No named till sales yet. Attach a customer on the sale and they show up here.
                </p>
              ) : (
                <ol className={styles.list}>
                  {(econ.buyers ?? []).map((row, i) => (
                    <BuyerRow
                      key={row.customerId ?? `walk-in-${i}`}
                      row={row}
                      currency={currency}
                    />
                  ))}
                </ol>
              )}
            </section>

            <section className={styles.sales}>
              <div className={styles.colHead}>
                <h2 className="font-heading text-[17px] font-semibold tracking-[-0.02em] text-[var(--catalog-ink)]">
                  Sold at the till
                </h2>
              </div>
              {econ.sales.length === 0 ? (
                <p className="text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--catalog-ink)_55%,transparent)]">
                  No completed sales on this SKU yet.
                </p>
              ) : (
                <ol className={cn(styles.list, styles.scroll, "max-h-[28rem] overflow-y-auto pr-1")}>
                  {econ.sales.map((row, i) => (
                    <SaleRow
                      key={`${row.saleId}-${row.soldAt}-${i}`}
                      row={row}
                      currency={currency}
                    />
                  ))}
                </ol>
              )}
            </section>

            <section className={styles.buyin}>
              <div className={styles.colHead}>
                <h2 className="font-heading text-[17px] font-semibold tracking-[-0.02em] text-[var(--catalog-ink)]">
                  Who you buy from
                </h2>
              </div>
              {econ.supplierSpendBreakdown.length === 0 && econ.purchases.length === 0 ? (
                <p className="text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--catalog-ink)_55%,transparent)]">
                  No posted supplier invoices for this SKU yet.
                </p>
              ) : (
                <>
                  {econ.supplierSpendBreakdown.length > 0 ? (
                    <ol className={styles.list}>
                      {econ.supplierSpendBreakdown.map((row) => {
                        const share =
                          spend > 0 ? Math.round((n(row.spend) / spend) * 100) : 0;
                        return (
                          <li key={row.supplierId} className={styles.person}>
                            <span
                              className="flex size-8 items-center justify-center rounded-full bg-[var(--catalog-shelf)] text-[11px] font-semibold text-[var(--catalog-ink)]"
                              aria-hidden
                            >
                              {initials(row.supplierName)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold text-[var(--catalog-ink)]">
                                {row.supplierName}
                              </p>
                              <p className="text-[11px] text-[color-mix(in_srgb,var(--catalog-ink)_52%,transparent)]">
                                {formatQty(row.quantity)} in, {share}% of spend
                              </p>
                            </div>
                            <p className={cn(styles.mono, "text-right text-[13px] font-semibold text-[var(--catalog-ink)]")}>
                              {formatMoney(n(row.spend), currency)}
                            </p>
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}

                  <h3 className="mt-5 font-heading text-[15px] font-semibold tracking-[-0.02em] text-[var(--catalog-ink)]">
                    Buying history
                  </h3>
                  {econ.purchases.length === 0 ? (
                    <p className="mt-2 text-[13px] text-[color-mix(in_srgb,var(--catalog-ink)_52%,transparent)]">
                      Invoices will list here once they are posted.
                    </p>
                  ) : (
                    <ol className={cn(styles.list, styles.scroll, "mt-1 max-h-[22rem] overflow-y-auto pr-1")}>
                      {econ.purchases.map((row, i) => (
                        <PurchaseRow
                          key={`${row.invoiceId}-${row.invoiceDate}-${i}`}
                          row={row}
                          currency={currency}
                        />
                      ))}
                    </ol>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function TapeStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-[color-mix(in_srgb,var(--catalog-ink)_52%,transparent)]">
        {label}
      </dt>
      <dd className={cn(styles.mono, "mt-0.5 font-heading text-[1.05rem] font-semibold tracking-[-0.03em] text-[var(--catalog-ink)]")}>
        {value}
      </dd>
      <p className="mt-0.5 text-[11px] text-[color-mix(in_srgb,var(--catalog-ink)_46%,transparent)]">
        {hint}
      </p>
    </div>
  );
}

function BuyerRow({
  row,
  currency,
}: {
  row: ItemCustomerBuyRow;
  currency: string;
}) {
  const name = row.customerName?.trim() || "Walk-in";
  const inner = (
    <>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--catalog-ink)] text-[10px] font-semibold tracking-wide text-white"
        aria-hidden
      >
        {initials(name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-[var(--catalog-ink)]">
          {name}
        </p>
        <p className="text-[11px] text-[color-mix(in_srgb,var(--catalog-ink)_52%,transparent)]">
          {formatQty(row.quantity)} taken, {row.saleCount} times
          {row.lastSoldAt ? `, last ${formatWhen(row.lastSoldAt)}` : ""}
        </p>
      </div>
      <p className={cn(styles.mono, "text-right text-[13px] font-semibold text-[var(--catalog-ink)]")}>
        {formatMoney(n(row.spend), currency)}
      </p>
    </>
  );

  if (row.customerId) {
    return (
      <li>
        <Link
          href={APP_ROUTES.customer(row.customerId)}
          className={cn(styles.person, "rounded-lg hover:bg-[color-mix(in_srgb,var(--catalog-shelf)_80%,transparent)]")}
        >
          {inner}
        </Link>
      </li>
    );
  }

  return <li className={styles.person}>{inner}</li>;
}

function SaleRow({
  row,
  currency,
}: {
  row: ItemSaleHistoryRow;
  currency: string;
}) {
  const name = row.customerName?.trim() || "Walk-in";
  return (
    <li className={styles.person}>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--catalog-shelf)] text-[10px] font-semibold text-[var(--catalog-ink)]"
        aria-hidden
      >
        {initials(name)}
      </span>
      <div className="min-w-0">
        {row.customerId ? (
          <Link
            href={APP_ROUTES.customer(row.customerId)}
            className="truncate text-[13px] font-semibold text-[var(--catalog-ink)] hover:underline"
          >
            {name}
          </Link>
        ) : (
          <p className="truncate text-[13px] font-semibold text-[var(--catalog-ink)]">
            {name}
          </p>
        )}
        <p className="text-[11px] text-[color-mix(in_srgb,var(--catalog-ink)_52%,transparent)]">
          {row.receiptNo != null ? `Receipt ${row.receiptNo}` : "Sale"}
          {row.branchName ? ` at ${row.branchName}` : ""}
          {`, ${formatWhen(row.soldAt)}`}
        </p>
      </div>
      <div className="text-right">
        <p className={cn(styles.mono, "text-[13px] font-semibold text-[var(--catalog-ink)]")}>
          {formatMoney(n(row.lineTotal), currency)}
        </p>
        <p className={cn(styles.mono, "text-[11px] text-[color-mix(in_srgb,var(--catalog-ink)_48%,transparent)]")}>
          {formatQty(row.quantity)}
        </p>
      </div>
    </li>
  );
}

function PurchaseRow({
  row,
  currency,
}: {
  row: ItemPurchaseHistoryRow;
  currency: string;
}) {
  return (
    <li className={styles.person}>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--catalog-shelf)] text-[10px] font-semibold text-[var(--catalog-ink)]"
        aria-hidden
      >
        {initials(row.supplierName)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-[var(--catalog-ink)]">
          {row.supplierName}
        </p>
        <p className="text-[11px] text-[color-mix(in_srgb,var(--catalog-ink)_52%,transparent)]">
          {row.invoiceDate} {row.invoiceNumber}, {formatQty(row.quantity)} in
        </p>
      </div>
      <div className="text-right">
        <p className={cn(styles.mono, "text-[13px] font-semibold text-[var(--catalog-ink)]")}>
          {formatMoney(n(row.lineTotal), currency)}
        </p>
        <p className={cn(styles.mono, "text-[11px] text-[color-mix(in_srgb,var(--catalog-ink)_48%,transparent)]")}>
          {formatMoney(n(row.unitCost), currency)} each
        </p>
      </div>
    </li>
  );
}

function DossierSkeleton() {
  return (
    <div className="grid animate-pulse gap-5 lg:grid-cols-[18rem_1fr_1fr]">
      <div className="aspect-[4/5] rounded-[14px] bg-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)]" />
      <div className="space-y-3 pt-2">
        <div className="h-6 w-1/2 rounded-md bg-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)]" />
        <div className="h-24 rounded-md bg-[color-mix(in_srgb,var(--catalog-ink)_6%,transparent)]" />
      </div>
      <div className="space-y-3 pt-2">
        <div className="h-6 w-1/3 rounded-md bg-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)]" />
        <div className="h-24 rounded-md bg-[color-mix(in_srgb,var(--catalog-ink)_6%,transparent)]" />
      </div>
    </div>
  );
}
