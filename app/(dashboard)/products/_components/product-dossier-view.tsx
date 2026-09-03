"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, PencilLine } from "lucide-react";

import { ProductsHubNav } from "@/components/products/products-hub-nav";
import { useDashboard } from "@/components/dashboard-provider";
import {
  ApiRequestError,
  fetchCurrentSellingPrice,
  fetchItemById,
  fetchItemEconomics,
  itemListThumbnailUrl,
  type ItemDetailRecord,
  type ItemEconomicsRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { resolveCatalogItemName } from "@/lib/catalog-display";
import { parseProductDossierSlug } from "@/lib/product-dossier-url";
import { cn, formatMoney } from "@/lib/utils";
import { coverImageUrl, toNumber } from "../_utils";
import { PRODUCTS_CATALOG_VARS } from "./products-page-layout";

function n(v: number | string | null | undefined): number {
  return toNumber(v) ?? 0;
}

function formatQty(v: number | string | null | undefined): string {
  const x = toNumber(v);
  if (x == null) return "0";
  return x.toLocaleString("en-KE", { maximumFractionDigits: 2 });
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso?.trim()) return "No sale yet";
  try {
    return new Date(iso).toLocaleString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDay(isoDate: string): string {
  try {
    const d = new Date(`${isoDate}T12:00:00`);
    return d.toLocaleDateString("en-KE", { weekday: "narrow" });
  } catch {
    return "";
  }
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
  const [ledger, setLedger] = useState<"sales" | "buying">("sales");

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
  const remainingOfBought =
    bought > 0 ? Math.max(0, Math.min(100, (n(econ?.onHand) / bought) * 100)) : null;
  const gross = n(econ?.grossProfit);
  const revenue = n(econ?.revenue);
  const spend = n(econ?.supplierSpend);

  return (
    <div
      className="relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col px-2 pb-6 pt-2 sm:px-4 sm:pt-3"
      style={PRODUCTS_CATALOG_VARS}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(120%_100%_at_12%_-20%,color-mix(in_srgb,var(--catalog-primary)_14%,transparent),transparent_60%),linear-gradient(180deg,color-mix(in_srgb,var(--catalog-shelf)_85%,#fff),transparent)]"
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-3">
        <div className="shrink-0 rounded-xl border border-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)] bg-[color-mix(in_srgb,var(--catalog-slip)_92%,transparent)] p-1 shadow-[0_1px_0_color-mix(in_srgb,var(--catalog-ink)_6%,transparent),0_12px_40px_-24px_color-mix(in_srgb,var(--catalog-ink)_18%,transparent)]">
          <ProductsHubNav />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <Link
            href={APP_ROUTES.products}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-[color-mix(in_srgb,var(--catalog-ink)_62%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--catalog-ink)_5%,transparent)] hover:text-[var(--catalog-ink)]"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Catalog
          </Link>
          {detail ? (
            <Link
              href={`${APP_ROUTES.products}?product=${encodeURIComponent(detail.id)}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--catalog-ink)_12%,transparent)] bg-white px-3 text-[12px] font-medium text-[var(--catalog-ink)]"
            >
              <PencilLine className="size-3.5" aria-hidden />
              Edit in catalog
            </Link>
          ) : null}
        </div>

        {loading ? (
          <DossierSkeleton />
        ) : error || !econ || !detail ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--catalog-ink)_10%,transparent)] bg-white px-4 py-10 text-center text-sm text-[color-mix(in_srgb,var(--catalog-ink)_62%,transparent)]">
            {error ?? "Product not found."}
          </div>
        ) : (
          <>
            <header className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
              <div className="flex min-w-0 items-start gap-3.5">
                <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--catalog-ink)_10%,transparent)] bg-[var(--catalog-shelf)] sm:size-24">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center font-heading text-2xl font-semibold text-[color-mix(in_srgb,var(--catalog-ink)_35%,transparent)]">
                      {title.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="font-heading text-2xl font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--catalog-ink)] sm:text-[1.75rem]">
                    {title}
                  </h1>
                  <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[color-mix(in_srgb,var(--catalog-ink)_55%,transparent)]">
                    {detail.sku ? (
                      <span className="font-mono">{detail.sku}</span>
                    ) : null}
                    <span>
                      On hand {formatQty(econ.onHand)}
                      {detail.unitType ? ` ${detail.unitType}` : ""}
                    </span>
                    {sellPrice != null ? (
                      <span>Sell {formatMoney(sellPrice, currency)}</span>
                    ) : null}
                    {econ.includesVariants ? (
                      <span>{econ.skuCount} SKUs in this family</span>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[12px] leading-snug text-[color-mix(in_srgb,var(--catalog-ink)_58%,transparent)]">
                  Last sold {formatWhen(econ.lastSoldAt)}
                </p>
                <p className="mt-1 font-heading text-[13px] font-semibold tabular-nums text-[var(--catalog-ink)]">
                  {formatQty(econ.unitsSold7d)} this week, {formatQty(econ.unitsSold30d)} last 30 days
                </p>
              </div>
            </header>

            <section
              className="overflow-hidden rounded-xl bg-[var(--catalog-ink)] text-white shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_8%,transparent),0_16px_40px_-24px_color-mix(in_srgb,var(--catalog-ink)_55%,transparent)]"
              aria-label="Product money"
            >
              <div className="grid gap-5 p-4 sm:p-5 sm:grid-cols-2 lg:grid-cols-4">
                <MoneyStat
                  label="Sold"
                  value={`${formatQty(sold)}`}
                  hint={`${econ.saleCount} receipts`}
                  emphasize
                />
                <MoneyStat
                  label="Took in"
                  value={formatMoney(revenue, currency)}
                  hint="Completed sales"
                />
                <MoneyStat
                  label="Paid suppliers"
                  value={formatMoney(spend, currency)}
                  hint={`${formatQty(bought)} bought in`}
                />
                <MoneyStat
                  label="Left after cost"
                  value={formatMoney(gross, currency)}
                  hint={
                    remainingOfBought != null
                      ? `${Math.round(remainingOfBought)}% of bought still on shelf`
                      : "Sale profit vs cost on the till"
                  }
                />
              </div>
            </section>

            <section className="rounded-xl border border-[color-mix(in_srgb,var(--catalog-ink)_10%,transparent)] bg-white px-3 py-3 sm:px-4">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="font-heading text-[15px] font-semibold tracking-[-0.02em] text-[var(--catalog-ink)]">
                  Units out, last 30 days
                </h2>
                <p className="text-[11px] tabular-nums text-[color-mix(in_srgb,var(--catalog-ink)_48%,transparent)]">
                  Peak {formatQty(maxDay)}
                </p>
              </div>
              {econ.last30Days.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-[color-mix(in_srgb,var(--catalog-ink)_50%,transparent)]">
                  No sales in the last 30 days.
                </p>
              ) : (
              <>
              <div className="flex h-24 items-end gap-px sm:gap-0.5">
                {econ.last30Days.map((day) => {
                  const qty = n(day.unitsSold);
                  const h = Math.max(qty > 0 ? 8 : 2, Math.round((qty / maxDay) * 96));
                  return (
                    <div
                      key={day.date}
                      className="group relative flex min-w-0 flex-1 flex-col items-center justify-end"
                      title={`${day.date}: ${formatQty(qty)} sold`}
                    >
                      <div
                        className={cn(
                          "w-full rounded-sm",
                          qty > 0
                            ? "bg-[var(--catalog-primary)]"
                            : "bg-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)]",
                        )}
                        style={{ height: h }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-[color-mix(in_srgb,var(--catalog-ink)_38%,transparent)]">
                <span>{formatDay(econ.last30Days[0]?.date ?? "")}</span>
                <span>Today</span>
              </div>
              </>
              )}
            </section>

            {econ.supplierSpendBreakdown.length > 0 ? (
              <section>
                <h2 className="mb-2 font-heading text-[15px] font-semibold tracking-[-0.02em] text-[var(--catalog-ink)]">
                  Who you buy from
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {econ.supplierSpendBreakdown.map((row) => {
                    const share =
                      spend > 0 ? Math.round((n(row.spend) / spend) * 100) : 0;
                    return (
                      <li
                        key={row.supplierId}
                        className="rounded-xl border border-[color-mix(in_srgb,var(--catalog-ink)_10%,transparent)] bg-white px-3 py-2.5"
                      >
                        <p className="truncate text-[13px] font-semibold text-[var(--catalog-ink)]">
                          {row.supplierName}
                        </p>
                        <p className="mt-0.5 text-[12px] tabular-nums text-[color-mix(in_srgb,var(--catalog-ink)_55%,transparent)]">
                          {formatMoney(n(row.spend), currency)}, {formatQty(row.quantity)} in
                        </p>
                        <p className="mt-1 text-[11px] tabular-nums text-[var(--catalog-primary)]">
                          {share}% of spend
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <div className="flex rounded-lg border border-[color-mix(in_srgb,var(--catalog-ink)_10%,transparent)] bg-[var(--catalog-shelf)] p-1 lg:hidden">
              <LedgerTab
                active={ledger === "sales"}
                onClick={() => setLedger("sales")}
                label="Sales"
                count={econ.sales.length}
              />
              <LedgerTab
                active={ledger === "buying"}
                onClick={() => setLedger("buying")}
                label="Buying"
                count={econ.purchases.length}
              />
            </div>

            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
              <HistoryPanel
                title="Sales"
                empty="No completed sales on this SKU yet. The first till ring shows up here."
                hiddenOnMobile={ledger !== "sales"}
              >
                {econ.sales.map((row, i) => (
                  <li
                    key={`${row.saleId}-${row.itemId}-${row.soldAt}-${i}`}
                    className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 py-2.5"
                  >
                    <p className="text-[13px] font-medium text-[var(--catalog-ink)]">
                      {row.receiptNo != null ? `Receipt ${row.receiptNo}` : "Sale"}
                      {row.branchName ? ` at ${row.branchName}` : ""}
                    </p>
                    <p className="text-right text-[13px] font-semibold tabular-nums text-[var(--catalog-ink)]">
                      {formatMoney(n(row.lineTotal), currency)}
                    </p>
                    <p className="text-[11px] text-[color-mix(in_srgb,var(--catalog-ink)_50%,transparent)]">
                      {formatWhen(row.soldAt)}, {formatQty(row.quantity)} sold
                    </p>
                    <p className="text-right text-[11px] tabular-nums text-[color-mix(in_srgb,var(--catalog-ink)_50%,transparent)]">
                      {formatMoney(n(row.profit), currency)} kept
                    </p>
                  </li>
                ))}
              </HistoryPanel>

              <HistoryPanel
                title="Buying"
                empty="No posted supplier invoices for this SKU yet. Receive a supply and it lands here."
                hiddenOnMobile={ledger !== "buying"}
              >
                {econ.purchases.map((row, i) => (
                  <li
                    key={`${row.invoiceId}-${row.itemId}-${row.invoiceDate}-${i}`}
                    className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 py-2.5"
                  >
                    <p className="truncate text-[13px] font-medium text-[var(--catalog-ink)]">
                      {row.supplierName}
                    </p>
                    <p className="text-right text-[13px] font-semibold tabular-nums text-[var(--catalog-ink)]">
                      {formatMoney(n(row.lineTotal), currency)}
                    </p>
                    <p className="text-[11px] text-[color-mix(in_srgb,var(--catalog-ink)_50%,transparent)]">
                      {row.invoiceDate} {row.invoiceNumber}, {formatQty(row.quantity)} in
                    </p>
                    <p className="text-right text-[11px] tabular-nums text-[color-mix(in_srgb,var(--catalog-ink)_50%,transparent)]">
                      {formatMoney(n(row.unitCost), currency)} each
                    </p>
                  </li>
                ))}
              </HistoryPanel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MoneyStat({
  label,
  value,
  hint,
  emphasize = false,
}: {
  label: string;
  value: string;
  hint: string;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-[color-mix(in_srgb,#fff_58%,transparent)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-heading font-semibold leading-none tracking-[-0.03em] tabular-nums",
          emphasize ? "text-[28px] sm:text-[30px]" : "text-[20px] sm:text-[22px]",
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-[color-mix(in_srgb,#fff_52%,transparent)]">
        {hint}
      </p>
    </div>
  );
}

function LedgerTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md px-3 py-2 text-[13px] font-semibold",
        active
          ? "bg-white text-[var(--catalog-ink)] shadow-sm"
          : "text-[color-mix(in_srgb,var(--catalog-ink)_55%,transparent)]",
      )}
    >
      {label}
      <span className="ml-1 tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function HistoryPanel({
  title,
  empty,
  hiddenOnMobile,
  children,
}: {
  title: string;
  empty: string;
  hiddenOnMobile: boolean;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasRows = items.filter(Boolean).length > 0 && !(Array.isArray(children) && children.length === 0);

  return (
    <section
      className={cn(
        "min-h-0 rounded-xl border border-[color-mix(in_srgb,var(--catalog-ink)_10%,transparent)] bg-white",
        hiddenOnMobile && "hidden lg:block",
      )}
    >
      <h2 className="border-b border-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)] px-3 py-2.5 font-heading text-[15px] font-semibold tracking-[-0.02em] text-[var(--catalog-ink)] sm:px-4">
        {title}
      </h2>
      {hasRows ? (
        <ul className="divide-y divide-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)] px-3 sm:px-4">
          {children}
        </ul>
      ) : (
        <p className="px-4 py-8 text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--catalog-ink)_55%,transparent)]">
          {empty}
        </p>
      )}
    </section>
  );
}

function DossierSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex gap-3">
        <div className="size-24 rounded-xl bg-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)]" />
        <div className="flex-1 space-y-2 pt-2">
          <div className="h-7 w-2/3 rounded-md bg-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)]" />
          <div className="h-4 w-1/2 rounded-md bg-[color-mix(in_srgb,var(--catalog-ink)_6%,transparent)]" />
        </div>
      </div>
      <div className="h-28 rounded-xl bg-[var(--catalog-ink)] opacity-80" />
      <div className="h-28 rounded-xl bg-[color-mix(in_srgb,var(--catalog-ink)_6%,transparent)]" />
    </div>
  );
}
