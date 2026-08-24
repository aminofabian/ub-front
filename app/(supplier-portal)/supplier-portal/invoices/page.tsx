"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, Search } from "lucide-react";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import {
  spBtnGhost,
  spPage,
  spSerifTitle,
} from "@/components/supplier-portal/supplier-portal-ui";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalHubShops,
  fetchSupplierPortalInvoices,
  type SupplierPortalInvoiceRow,
} from "@/lib/marketplace-api";
import { formatMoneyCompact, resolveCurrencyCode } from "@/lib/money";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { cn } from "@/lib/utils";

const INK = "#1c1915";
const TEAL = "#0f766e";
const MANGO = "#b9691a";

type StatusFilter = "all" | "open" | "partial" | "paid";

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function money(amount: unknown, currency: string): string {
  return formatMoneyCompact(toNum(amount), resolveCurrencyCode(currency));
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function normalizeStatus(row: SupplierPortalInvoiceRow): StatusFilter {
  const raw = (row.paymentStatus || row.status || "").toLowerCase().replace(/\s+/g, "_");
  const balance = toNum(row.balanceOpen);
  if (raw.includes("paid") && !raw.includes("partial") && balance <= 0.009) return "paid";
  if (raw.includes("partial") || (toNum(row.amountPaid) > 0 && balance > 0)) return "partial";
  if (balance > 0 || raw.includes("unpaid") || raw.includes("open") || raw.includes("owed")) {
    return "open";
  }
  if (balance <= 0 && toNum(row.grandTotal) > 0) return "paid";
  return "open";
}

function statusLabel(kind: StatusFilter, raw: string): string {
  if (kind === "paid") return "Paid";
  if (kind === "partial") return "Partial";
  if (kind === "open") return "Open";
  return raw.replaceAll("_", " ") || "—";
}

export default function SupplierPortalInvoicesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SupplierPortalInvoiceRow[]>([]);
  const [currency, setCurrency] = useState("KES");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [shopFilter, setShopFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    setLoading(true);
    void Promise.all([fetchSupplierPortalInvoices(), fetchSupplierPortalHubShops()])
      .then(([invoices, hub]) => {
        setRows(invoices);
        setCurrency(hub.currency || "KES");
        setError("");
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load invoices"),
      )
      .finally(() => setLoading(false));
  }, [router]);

  const shops = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const row of rows) {
      const existing = map.get(row.businessId);
      if (existing) {
        existing.count += 1;
        continue;
      }
      map.set(row.businessId, {
        id: row.businessId,
        name: row.businessName?.trim() || "Shop",
        count: 1,
      });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const stats = useMemo(() => {
    let billed = 0;
    let collected = 0;
    let openBalance = 0;
    let openCount = 0;
    let partialCount = 0;
    let paidCount = 0;
    for (const row of rows) {
      billed += toNum(row.grandTotal);
      collected += toNum(row.amountPaid);
      openBalance += toNum(row.balanceOpen);
      const kind = normalizeStatus(row);
      if (kind === "open") openCount += 1;
      else if (kind === "partial") partialCount += 1;
      else paidCount += 1;
    }
    return {
      billed,
      collected,
      openBalance,
      openCount,
      partialCount,
      paidCount,
      shopCount: shops.length,
    };
  }, [rows, shops.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (shopFilter && row.businessId !== shopFilter) return false;
        const kind = normalizeStatus(row);
        if (statusFilter !== "all" && kind !== statusFilter) return false;
        if (!q) return true;
        return (
          row.invoiceNumber.toLowerCase().includes(q) ||
          row.businessName.toLowerCase().includes(q) ||
          (row.paymentStatus ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const da = a.invoiceDate || "";
        const db = b.invoiceDate || "";
        if (db !== da) return db.localeCompare(da);
        return b.invoiceNumber.localeCompare(a.invoiceNumber);
      });
  }, [rows, query, statusFilter, shopFilter]);

  return (
    <SupplierPortalShell>
      <div
        className={cn(spPage, "space-y-4")}
        style={
          {
            ["--pos-primary" as string]: TEAL,
            ["--inv-ink" as string]: INK,
            ["--inv-mango" as string]: MANGO,
          } as CSSProperties
        }
      >
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className={cn(spSerifTitle, "text-[1.85rem] leading-none sm:text-[2.35rem]")}>
              Invoices
            </h2>
            <p className="mt-1.5 max-w-xl text-[13px] text-[color-mix(in_srgb,var(--inv-ink)_55%,transparent)]">
              Supply invoices across connected shops — open balances first.
            </p>
          </div>
          <Link href={APP_ROUTES.supplierPortalPayments} className={cn(spBtnGhost, "h-9")}>
            Payments
          </Link>
        </header>

        {error ? (
          <p className="border border-[#b42318]/25 bg-[#fef3f2] px-3 py-2 text-sm text-[#b42318]">
            {error}
          </p>
        ) : null}

        {/* Stats */}
        <div className="flex flex-wrap items-stretch gap-px overflow-hidden border border-[color-mix(in_srgb,var(--inv-ink)_14%,transparent)] bg-[color-mix(in_srgb,var(--inv-ink)_14%,transparent)]">
          <Stat
            label="Invoices"
            value={loading ? "…" : String(rows.length)}
          />
          <Stat
            label="Open"
            value={loading ? "…" : String(stats.openCount + stats.partialCount)}
            hot={(stats.openCount + stats.partialCount) > 0}
          />
          <Stat
            label="Outstanding"
            value={loading ? "…" : money(stats.openBalance, currency)}
            hot={stats.openBalance > 0}
          />
          <Stat
            label="Collected"
            value={loading ? "…" : money(stats.collected, currency)}
          />
          <Stat
            label="Billed"
            value={loading ? "…" : money(stats.billed, currency)}
          />
          <Stat
            label="Shops"
            value={loading ? "…" : String(stats.shopCount)}
          />
        </div>

        {/* Ledger board */}
        <section
          className={cn(
            "overflow-hidden border border-[color-mix(in_srgb,var(--inv-ink)_14%,transparent)]",
            "bg-[linear-gradient(165deg,#faf7f1_0%,#f3eee6_48%,#ebe4d8_100%)]",
          )}
        >
          <div
            className={cn(
              "flex h-9 items-center justify-between px-3",
              stats.openBalance > 0
                ? "bg-[linear-gradient(100deg,var(--pos-primary)_0%,#0d6a63_55%,#b9691a_160%)]"
                : "bg-[var(--pos-primary)]",
              "text-[10px] font-bold uppercase tracking-[0.16em] text-white",
            )}
          >
            <span>Invoice ledger</span>
            <span className="font-mono tabular-nums opacity-85">{filtered.length}</span>
          </div>

          <div className="flex flex-col gap-2.5 border-b border-[color-mix(in_srgb,var(--inv-ink)_10%,transparent)] bg-[color-mix(in_srgb,#fff_55%,transparent)] px-3 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--inv-ink)_40%,transparent)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search invoice, shop, status…"
                className="h-9 w-full border border-[color-mix(in_srgb,var(--inv-ink)_14%,transparent)] bg-[color-mix(in_srgb,#fff_88%,transparent)] pl-8 pr-2 text-[13px] text-[var(--inv-ink)] outline-none placeholder:text-[color-mix(in_srgb,var(--inv-ink)_35%,transparent)] focus:border-[var(--pos-primary)]"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                label="All"
                active={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
              />
              <Chip
                label={`Open · ${stats.openCount}`}
                active={statusFilter === "open"}
                onClick={() => setStatusFilter("open")}
                hot={stats.openCount > 0}
              />
              <Chip
                label={`Partial · ${stats.partialCount}`}
                active={statusFilter === "partial"}
                onClick={() => setStatusFilter("partial")}
              />
              <Chip
                label={`Paid · ${stats.paidCount}`}
                active={statusFilter === "paid"}
                onClick={() => setStatusFilter("paid")}
              />
            </div>
            {shops.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  label="All shops"
                  active={!shopFilter}
                  onClick={() => setShopFilter(null)}
                />
                {shops.map((shop) => (
                  <Chip
                    key={shop.id}
                    label={`${shop.name} · ${shop.count}`}
                    active={shopFilter === shop.id}
                    onClick={() => setShopFilter(shop.id)}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-16 text-[13px] text-[color-mix(in_srgb,var(--inv-ink)_48%,transparent)]">
              <Loader2 className="size-4 animate-spin" />
              Loading ledger…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyLedger hasAny={rows.length > 0} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[color-mix(in_srgb,var(--inv-ink)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)] text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--pos-primary)]">
                      <th className="px-3 py-2.5 font-bold">Invoice</th>
                      <th className="px-3 py-2.5 font-bold">Shop</th>
                      <th className="px-3 py-2.5 font-bold">Date</th>
                      <th className="px-3 py-2.5 text-right font-bold">Total</th>
                      <th className="px-3 py-2.5 text-right font-bold">Paid</th>
                      <th className="px-3 py-2.5 text-right font-bold">Balance</th>
                      <th className="px-3 py-2.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, index) => {
                      const kind = normalizeStatus(row);
                      const balance = toNum(row.balanceOpen);
                      return (
                        <tr
                          key={row.invoiceId}
                          className={cn(
                            "border-b border-[color-mix(in_srgb,var(--inv-ink)_8%,transparent)] last:border-0",
                            index % 2 === 0
                              ? "bg-[color-mix(in_srgb,#fff_78%,transparent)]"
                              : "bg-[color-mix(in_srgb,#fff_55%,transparent)]",
                            "transition-colors hover:bg-white",
                          )}
                        >
                          <td className="px-3 py-2.5">
                            <div className="flex items-baseline gap-2">
                              <span className="font-mono text-[10px] tabular-nums text-[color-mix(in_srgb,var(--pos-primary)_75%,transparent)]">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="font-mono text-[12px] font-semibold text-[var(--inv-ink)]">
                                {row.invoiceNumber}
                              </span>
                            </div>
                          </td>
                          <td className="max-w-[12rem] truncate px-3 py-2.5 font-medium text-[var(--inv-ink)]">
                            {row.businessName}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[12px] text-[color-mix(in_srgb,var(--inv-ink)_55%,transparent)]">
                            {fmtDate(row.invoiceDate)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[var(--inv-ink)]">
                            {money(row.grandTotal, currency)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[color-mix(in_srgb,var(--inv-ink)_65%,transparent)]">
                            {money(row.amountPaid, currency)}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-2.5 text-right font-mono font-bold tabular-nums",
                              balance > 0
                                ? "text-[var(--inv-mango)]"
                                : "text-[var(--pos-primary)]",
                            )}
                          >
                            {money(row.balanceOpen, currency)}
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusStamp kind={kind} label={statusLabel(kind, row.paymentStatus)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile slips */}
              <ul className="divide-y divide-[color-mix(in_srgb,var(--inv-ink)_10%,transparent)] md:hidden">
                {filtered.map((row, index) => {
                  const kind = normalizeStatus(row);
                  const balance = toNum(row.balanceOpen);
                  return (
                    <li
                      key={row.invoiceId}
                      className="relative bg-[color-mix(in_srgb,#fff_72%,transparent)] px-3 py-3.5"
                    >
                      {kind !== "paid" ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute right-3 top-3 rotate-6 border border-[color-mix(in_srgb,var(--inv-mango)_50%,transparent)] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--inv-mango)]"
                        >
                          {kind === "partial" ? "Partial" : "Open"}
                        </span>
                      ) : null}
                      <div className="flex items-baseline gap-2 pr-14">
                        <span className="font-mono text-[10px] font-bold text-[var(--pos-primary)]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <p className="font-mono text-[13px] font-semibold text-[var(--inv-ink)]">
                          {row.invoiceNumber}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-[13px] font-medium text-[var(--inv-ink)]">
                        {row.businessName}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-[color-mix(in_srgb,var(--inv-ink)_48%,transparent)]">
                        {fmtDate(row.invoiceDate)}
                        {row.dueDate ? ` · due ${fmtDate(row.dueDate)}` : ""}
                      </p>
                      <dl className="mt-2.5 grid grid-cols-3 gap-2 border border-dashed border-[color-mix(in_srgb,var(--inv-ink)_12%,transparent)] bg-[color-mix(in_srgb,#fff_50%,transparent)] px-2.5 py-2">
                        <div>
                          <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--inv-ink)_45%,transparent)]">
                            Total
                          </dt>
                          <dd className="mt-0.5 font-mono text-[12px] font-bold tabular-nums text-[var(--inv-ink)]">
                            {money(row.grandTotal, currency)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--inv-ink)_45%,transparent)]">
                            Paid
                          </dt>
                          <dd className="mt-0.5 font-mono text-[12px] font-bold tabular-nums text-[var(--inv-ink)]">
                            {money(row.amountPaid, currency)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--inv-ink)_45%,transparent)]">
                            Balance
                          </dt>
                          <dd
                            className={cn(
                              "mt-0.5 font-mono text-[12px] font-bold tabular-nums",
                              balance > 0
                                ? "text-[var(--inv-mango)]"
                                : "text-[var(--pos-primary)]",
                            )}
                          >
                            {money(row.balanceOpen, currency)}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </SupplierPortalShell>
  );
}

function Stat({
  label,
  value,
  hot,
}: {
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[6.5rem] flex-1 flex-col gap-0.5 px-3 py-2.5",
        hot
          ? "bg-[color-mix(in_srgb,var(--inv-mango)_12%,#fff)]"
          : "bg-[color-mix(in_srgb,#fff_78%,#f7f3eb)]",
      )}
    >
      <span
        className={cn(
          "font-mono text-[1.05rem] font-bold tabular-nums leading-none sm:text-[1.15rem]",
          hot ? "text-[var(--inv-mango)]" : "text-[var(--pos-primary)]",
        )}
      >
        {value}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--inv-ink)_48%,transparent)]">
        {label}
      </span>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  hot,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  hot?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "max-w-[14rem] truncate border px-2.5 py-1 text-[11px] font-semibold transition-colors",
        active
          ? hot
            ? "border-[var(--inv-mango)] bg-[color-mix(in_srgb,var(--inv-mango)_14%,transparent)] text-[var(--inv-ink)]"
            : "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--inv-ink)]"
          : "border-[color-mix(in_srgb,var(--inv-ink)_14%,transparent)] bg-[color-mix(in_srgb,#fff_70%,transparent)] text-[color-mix(in_srgb,var(--inv-ink)_58%,transparent)] hover:text-[var(--inv-ink)]",
      )}
    >
      {label}
    </button>
  );
}

function StatusStamp({ kind, label }: { kind: StatusFilter; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]",
        kind === "paid" &&
          "border-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)] text-[var(--pos-primary)]",
        kind === "partial" &&
          "border-[color-mix(in_srgb,var(--inv-mango)_45%,transparent)] bg-[color-mix(in_srgb,var(--inv-mango)_10%,transparent)] text-[var(--inv-mango)]",
        kind === "open" &&
          "border-[color-mix(in_srgb,var(--inv-mango)_45%,transparent)] bg-[color-mix(in_srgb,var(--inv-mango)_12%,transparent)] text-[var(--inv-mango)]",
        kind === "all" &&
          "border-[color-mix(in_srgb,var(--inv-ink)_14%,transparent)] text-[color-mix(in_srgb,var(--inv-ink)_55%,transparent)]",
      )}
    >
      {label}
    </span>
  );
}

function EmptyLedger({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center border border-dashed border-[color-mix(in_srgb,var(--inv-ink)_22%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_6%,transparent)]">
        <ClipboardList
          className="size-6 text-[var(--pos-primary)] opacity-80"
          strokeWidth={1.4}
        />
      </span>
      <p className="max-w-[18rem] text-[13px] leading-snug text-[color-mix(in_srgb,var(--inv-ink)_55%,transparent)]">
        {hasAny
          ? "No invoices match this filter."
          : "No invoices yet. They appear here when connected shops record supplies against you."}
      </p>
    </div>
  );
}
