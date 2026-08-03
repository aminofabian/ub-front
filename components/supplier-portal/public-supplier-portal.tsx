"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ChevronDown,
  Loader2,
  MessageSquareWarning,
  Package,
  Receipt,
  TrendingUp,
} from "lucide-react";

import { PageSealGate } from "@/components/page-seal/page-seal-gate";
import { PublicSupplierComplaintModal } from "@/components/supplier-portal/public-supplier-complaint-modal";
import {
  fetchPublicSupplierPortal,
  fetchPublicSupplierProductsSelling,
  type PublicSupplierPortal,
  type PublicSupplierProductSellingRow,
  type PublicSupplierProductsSelling,
  type PublicSupplierSellingPeriod,
  type PublicSupplierSupplyLine,
  type PublicSupplierSupplyRow,
} from "@/lib/public-supplier-portal";
import {
  fetchShopSupplierPageSealStatus,
  type PageSealStatus,
} from "@/lib/page-seal";
import {
  formatMoneyCompact,
  resolveCurrencyCode,
} from "@/lib/money";
import { cn } from "@/lib/utils";

type Branding = {
  shopName: string;
  primaryHex: string | null;
  logoUrl: string | null;
};

type Props = {
  username: string;
  branding: Branding;
};

type PortalTab = "supplies" | "movements" | "selling";

const SELLING_PERIODS: { id: PublicSupplierSellingPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

const INK_BORDER =
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]";
const INK_BORDER_SOFT =
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]";
const INK_DIVIDE =
  "divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]";
const PAPER =
  "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)]";

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function fmtMoney(amount: unknown, currency: string): string {
  return formatMoneyCompact(toNum(amount), resolveCurrencyCode(currency));
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtQty(amount: unknown): string {
  const n = toNum(amount);
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("en", { maximumFractionDigits: 2 });
}

function fmtSoldAt(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function statusTone(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === "PAID") return "bg-emerald-500/12 text-emerald-800";
  if (s === "PARTIAL") return "bg-amber-500/12 text-amber-900";
  return "bg-rose-500/12 text-rose-800";
}

function resolveSupplyLines(
  row: PublicSupplierSupplyRow,
  movementsByInvoice: Map<string, PublicSupplierSupplyLine[]>,
): PublicSupplierSupplyLine[] {
  const fromApi = row.lines ?? [];
  if (fromApi.length > 0) return fromApi;
  return movementsByInvoice.get(row.invoiceNumber) ?? [];
}

function SupplyLinesDetail({
  row,
  lines,
  currency,
}: {
  row: PublicSupplierSupplyRow;
  lines: PublicSupplierSupplyLine[];
  currency: string;
}) {
  if (lines.length === 0) {
    return (
      <p className={cn("border-t px-3.5 py-3 text-center text-[11px] text-muted-foreground", INK_BORDER_SOFT, PAPER)}>
        No line items on this supply.
      </p>
    );
  }
  return (
    <div className={cn("space-y-2 border-t px-3.5 py-3", INK_BORDER_SOFT, PAPER)}>
      {lines.map((line, i) => (
        <div
          key={`${line.description}-${i}`}
          className="flex items-baseline justify-between gap-3 text-[12px]"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug text-[var(--pos-ink,#1c1915)]">
              {line.description}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {toNum(line.quantity)} × {toNum(line.unitCost).toFixed(2)}
            </p>
          </div>
          <p className="shrink-0 font-mono text-[11px] font-semibold tabular-nums">
            {fmtMoney(line.lineTotal, currency)}
          </p>
        </div>
      ))}
      <div
        className={cn(
          "flex items-baseline justify-between border-t pt-2 text-[11px]",
          INK_BORDER_SOFT,
        )}
      >
        <span className="text-muted-foreground">
          Paid {fmtMoney(row.amountPaid, currency)}
        </span>
        <span className="font-mono font-semibold tabular-nums">
          Due {fmtMoney(row.grandTotal, currency)}
        </span>
      </div>
    </div>
  );
}

export function PublicSupplierPortalView({ username, branding }: Props) {
  const [data, setData] = useState<PublicSupplierPortal | null>(null);
  const [busy, setBusy] = useState(true);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<PortalTab>("supplies");
  const [openSupplyKey, setOpenSupplyKey] = useState<string | null>(null);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [sealStatus, setSealStatus] = useState<PageSealStatus | null>(null);
  const [sealEpoch, setSealEpoch] = useState(0);
  const [sellingPeriod, setSellingPeriod] =
    useState<PublicSupplierSellingPeriod>("today");
  const [selling, setSelling] = useState<PublicSupplierProductsSelling | null>(
    null,
  );
  const [sellingBusy, setSellingBusy] = useState(false);

  const theme = useMemo(
    () =>
      ({
        ["--pos-primary" as string]: branding.primaryHex || "#0f766e",
      }) as CSSProperties,
    [branding.primaryHex],
  );

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    void fetchPublicSupplierPortal(username).then((portal) => {
      if (cancelled) return;
      setBusy(false);
      if (!portal) {
        setMissing(true);
        setData(null);
        return;
      }
      setMissing(false);
      setData(portal);
    });
    return () => {
      cancelled = true;
    };
  }, [username, sealEpoch]);

  useEffect(() => {
    let cancelled = false;
    void fetchShopSupplierPageSealStatus(username)
      .then((row) => {
        if (!cancelled) setSealStatus(row);
      })
      .catch(() => {
        if (!cancelled) {
          setSealStatus({
            sealed: false,
            scope: "shop_supplier",
            subjectKey: username,
            displayName: null,
            phoneHint: null,
            unlockValid: true,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [username, sealEpoch]);

  useEffect(() => {
    if (tab !== "selling") return;
    let cancelled = false;
    setSellingBusy(true);
    void fetchPublicSupplierProductsSelling(username, sellingPeriod, "units")
      .then((row) => {
        if (cancelled) return;
        setSelling(row);
        setSellingBusy(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSelling(null);
        setSellingBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, username, sellingPeriod, sealEpoch]);

  if (busy) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading supplier portal…
      </div>
    );
  }

  if (missing || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center" style={theme}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {branding.shopName}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
          Supplier not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No supplier on this shop matches{" "}
          <span className="font-mono text-foreground">/s/{username}</span>.
        </p>
      </div>
    );
  }

  const currency = data.currency;
  const owed = toNum(data.openBalance);
  const advanceCredit = toNum(data.advanceCredit);
  const hasCredit = advanceCredit > 0.009;
  const settled = owed <= 0.009;
  const movementsByInvoice = new Map<string, PublicSupplierSupplyLine[]>();
  for (const m of data.movements) {
    const list = movementsByInvoice.get(m.invoiceNumber) ?? [];
    list.push({
      description: m.description,
      quantity: m.quantity,
      unitCost: m.unitCost,
      lineTotal: m.lineTotal,
    });
    movementsByInvoice.set(m.invoiceNumber, list);
  }

  const sealedLocked = Boolean(sealStatus?.sealed && !sealStatus.unlockValid);

  return (
    <div
      className="min-h-dvh bg-[radial-gradient(120%_80%_at_50%_-10%,color-mix(in_srgb,var(--pos-primary)_14%,#f7f4ef),#efeae2_42%,#e7e1d6)] text-[var(--pos-ink,#1c1915)]"
      style={theme}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <header
          className={cn(
            "sticky top-0 z-20 border-b bg-[color-mix(in_srgb,#faf8f4_92%,transparent)] pt-[max(0.35rem,env(safe-area-inset-top))] backdrop-blur-md",
            INK_BORDER_SOFT,
          )}
        >
          <div className="flex items-center gap-2 px-3 pb-1.5">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl}
                alt=""
                className={cn(
                  "size-7 shrink-0 border object-contain bg-white",
                  INK_BORDER_SOFT,
                )}
              />
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center bg-[var(--pos-primary)] text-[9px] font-bold text-[var(--pos-primary-ink,#fff)]">
                {data.supplierName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-[13px] font-semibold leading-tight tracking-tight">
                  {data.supplierName}
                </h1>
                <span
                  className={cn(
                    "shrink-0 px-1 py-px text-[8px] font-bold uppercase tracking-[0.1em]",
                    hasCredit
                      ? "bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--pos-primary)]"
                      : settled
                        ? "bg-emerald-500/12 text-emerald-800"
                        : "bg-amber-500/14 text-amber-900",
                  )}
                >
                  {hasCredit ? "Credit" : settled ? "Settled" : "Open"}
                </span>
              </div>
              <p className="truncate text-[10px] leading-tight text-muted-foreground">
                {data.shopName}
              </p>
            </div>
          </div>
        </header>

        <div className="px-3 pt-1.5">
          <PageSealGate
            scope="shop-supplier"
            subjectKey={username}
            status={sealStatus}
            canManage
            onUnlocked={() => {
              // Optimistic unlock so the pad dismisses even before status refetch.
              setSealStatus((prev) =>
                prev ? { ...prev, unlockValid: true } : prev,
              );
              setSealEpoch((n) => n + 1);
            }}
            onSealedChange={() => setSealEpoch((n) => n + 1)}
          >
            {sealedLocked ? null : (
              <>
        <section>
          <div
            className={cn(
              "grid grid-cols-3 divide-x border bg-white/85",
              INK_BORDER,
              INK_DIVIDE,
            )}
          >
            <div className="px-2 py-1.5">
              <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Amount owed
              </p>
              <p className="mt-px text-[1.05rem] font-semibold leading-none tracking-tight tabular-nums">
                {fmtMoney(data.openBalance, currency)}
              </p>
            </div>
            <div className="px-2 py-1.5">
              <p
                className={cn(
                  "text-[8px] font-semibold uppercase tracking-[0.1em]",
                  hasCredit
                    ? "text-[var(--pos-primary)]"
                    : "text-muted-foreground",
                )}
              >
                Advance credit
              </p>
              <p
                className={cn(
                  "mt-px text-[1.05rem] font-semibold leading-none tracking-tight tabular-nums",
                  hasCredit && "text-[var(--pos-primary)]",
                )}
              >
                {fmtMoney(advanceCredit, currency)}
              </p>
              <p className="mt-px text-[9px] leading-tight text-muted-foreground">
                {hasCredit ? "Prepaid · next supply" : "No wallet deposit yet"}
              </p>
            </div>
            <div className="px-2 py-1.5">
              <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Paid to date
              </p>
              <p className="mt-px text-[1.05rem] font-semibold leading-none tracking-tight tabular-nums">
                {fmtMoney(data.totalPaid, currency)}
              </p>
              <p className="mt-px text-[9px] leading-tight text-muted-foreground">
                of {fmtMoney(data.totalSpent, currency)} · {data.invoiceCount}{" "}
                {data.invoiceCount === 1 ? "supply" : "supplies"}
              </p>
            </div>
          </div>
        </section>

        <div className="pt-1.5">
          <div
            role="tablist"
            aria-label="Portal sections"
            className={cn("grid grid-cols-3 border bg-white/70", INK_BORDER)}
          >
            {(
              [
                ["supplies", "Supplies", Receipt, data.supplies.length],
                ["movements", "Items", Package, data.movements.length],
                [
                  "selling",
                  "Selling",
                  TrendingUp,
                  selling?.products.length ?? data.linkedProducts.length,
                ],
              ] as const
            ).map(([id, label, Icon, count]) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(id)}
                  className={cn(
                    "relative flex h-8 items-center justify-center gap-0.5 px-0.5 text-[10px] font-semibold transition-colors sm:gap-1 sm:text-[11px]",
                    active
                      ? "bg-white text-[var(--pos-ink,#1c1915)]"
                      : "text-muted-foreground hover:bg-white/60",
                  )}
                >
                  <Icon className="size-3 shrink-0 sm:size-3.5" aria-hidden />
                  {label}
                  <span
                    className={cn(
                      "px-1 py-px font-mono text-[9px] tabular-nums sm:px-1.5 sm:text-[10px]",
                      active
                        ? "bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] text-[var(--pos-primary)]"
                        : "bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)]",
                    )}
                  >
                    {count}
                  </span>
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--pos-primary)]"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto pb-6 pt-1.5">
          {tab === "supplies" ? (
            data.supplies.length === 0 ? (
              <EmptyState label="No posted supplies yet." />
            ) : (
              <ul className={cn("overflow-hidden border bg-white/90", INK_BORDER)}>
                {data.supplies.map((row) => {
                  const key = `${row.invoiceNumber}-${row.invoiceDate}`;
                  const open = openSupplyKey === key;
                  const lines = resolveSupplyLines(row, movementsByInvoice);
                  return (
                    <li
                      key={key}
                      className={cn(
                        "border-b last:border-b-0",
                        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSupplyKey((prev) => (prev === key ? null : key))
                        }
                        className="flex w-full items-start justify-between gap-3 px-3.5 py-3.5 text-left transition-colors active:bg-[color-mix(in_srgb,var(--pos-primary)_6%,transparent)]"
                        aria-expanded={open}
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                            <ChevronDown
                              className={cn(
                                "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                                open && "rotate-180",
                              )}
                              aria-hidden
                            />
                            <span className="truncate font-mono tracking-tight">
                              {row.invoiceNumber}
                            </span>
                          </p>
                          <p className="mt-1 pl-5 text-[10px] text-muted-foreground">
                            {fmtDate(row.invoiceDate)} ·{" "}
                            {row.sourceType.replace(/_/g, " ").toLowerCase()}
                            {lines.length > 0
                              ? ` · ${lines.length} item${lines.length === 1 ? "" : "s"}`
                              : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-[13px] font-semibold tabular-nums">
                            {fmtMoney(row.grandTotal, currency)}
                          </p>
                          <span
                            className={cn(
                              "mt-1 inline-flex px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]",
                              statusTone(row.paymentStatus),
                            )}
                          >
                            {row.paymentStatus}
                          </span>
                        </div>
                      </button>
                      {open ? (
                        <SupplyLinesDetail
                          row={row}
                          lines={lines}
                          currency={currency}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )
          ) : tab === "movements" ? (
            data.movements.length === 0 ? (
              <EmptyState label="No line movements yet." />
            ) : (
              <ul className={cn("overflow-hidden border bg-white/90", INK_BORDER)}>
                {data.movements.map((m, i) => (
                  <li
                    key={`${m.invoiceNumber}-${m.description}-${i}`}
                    className={cn(
                      "border-b px-3.5 py-3.5 last:border-b-0",
                      "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)]",
                    )}
                  >
                    <p className="text-[13px] font-medium leading-snug text-[var(--pos-ink,#1c1915)]">
                      {m.description}
                    </p>
                    <div className="mt-2.5 flex items-end justify-between gap-3">
                      <div className="min-w-0 space-y-0.5 text-[11px] leading-tight text-muted-foreground">
                        <p>
                          <span className="tabular-nums">
                            {fmtDate(m.invoiceDate)}
                          </span>
                          <span className="mx-1.5 text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_22%,transparent)]">
                            ·
                          </span>
                          <span className="font-mono tabular-nums">
                            {toNum(m.quantity)} × {toNum(m.unitCost).toFixed(2)}
                          </span>
                        </p>
                        <p className="font-mono tracking-tight">
                          {m.invoiceNumber}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-[14px] font-semibold tabular-nums tracking-tight text-[var(--pos-ink,#1c1915)]">
                        {fmtMoney(m.lineTotal, currency)}
                      </p>
                    </div>
                  </li>
                ))}
                {data.linkedProducts.length > 0 ? (
                  <li className={cn("px-3.5 py-3", PAPER)}>
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Linked catalogue
                    </p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      {data.linkedProducts.slice(0, 18).join(" · ")}
                      {data.linkedProducts.length > 18
                        ? ` · +${data.linkedProducts.length - 18} more`
                        : ""}
                    </p>
                  </li>
                ) : null}
              </ul>
            )
          ) : (
            <SellingPanel
              busy={sellingBusy}
              selling={selling}
              period={sellingPeriod}
              onPeriodChange={setSellingPeriod}
              currency={selling?.currency ?? currency}
            />
          )}

          <p className="mt-4 pb-2 text-center text-[10px] text-muted-foreground">
            Reference only for {data.shopName} — not a formal statement.
          </p>
        </main>

        <div className="pointer-events-none sticky bottom-0 z-30 mt-auto px-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8">
          <div className="pointer-events-auto bg-gradient-to-t from-[#e7e1d6] via-[#e7e1d6]/90% to-transparent pb-1 pt-6">
            <button
              type="button"
              onClick={() => setComplaintOpen(true)}
              className="flex h-12 w-full items-center justify-center gap-2 bg-[var(--pos-primary)] text-[13px] font-semibold text-[var(--pos-primary-ink,#fff)] shadow-[0_12px_28px_-10px_color-mix(in_srgb,var(--pos-primary)_70%,transparent)] transition-opacity active:opacity-90"
            >
              <MessageSquareWarning className="size-4" aria-hidden />
              Voice a complaint
            </button>
          </div>
        </div>
              </>
            )}
          </PageSealGate>
        </div>
      </div>

      <PublicSupplierComplaintModal
        open={complaintOpen}
        onOpenChange={setComplaintOpen}
        username={username}
        shopName={data.shopName}
        theme={theme}
      />
    </div>
  );
}

function SellingPanel({
  busy,
  selling,
  period,
  onPeriodChange,
  currency,
}: {
  busy: boolean;
  selling: PublicSupplierProductsSelling | null;
  period: PublicSupplierSellingPeriod;
  onPeriodChange: (period: PublicSupplierSellingPeriod) => void;
  currency: string;
}) {
  const products = selling?.products ?? [];
  const soldCount = products.filter((p) => toNum(p.unitsSold) > 0).length;

  return (
    <div className="space-y-1.5">
      <div
        role="group"
        aria-label="Sales period"
        className={cn("grid grid-cols-3 border bg-white/70", INK_BORDER)}
      >
        {SELLING_PERIODS.map((p) => {
          const active = period === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPeriodChange(p.id)}
              className={cn(
                "relative h-7 text-[11px] font-semibold transition-colors",
                active
                  ? "bg-white text-[var(--pos-ink,#1c1915)]"
                  : "text-muted-foreground hover:bg-white/60",
              )}
            >
              {p.label}
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--pos-primary)]"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {busy && !selling ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Loading sell-through…
        </div>
      ) : products.length === 0 ? (
        <EmptyState label="No linked products yet." />
      ) : (
        <ul className={cn("overflow-hidden border bg-white/90", INK_BORDER)}>
          <li
            className={cn(
              "flex items-center justify-between px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground",
              PAPER,
            )}
          >
            <span>
              Fastest first
              {soldCount > 0 ? ` · ${soldCount} sold` : ""}
            </span>
            <span className={busy ? "opacity-60" : undefined}>
              {busy ? "Updating…" : "Sold · on hand"}
            </span>
          </li>
          {products.map((row, index) => (
            <SellingRow
              key={row.itemId}
              row={row}
              rank={index + 1}
              currency={currency}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SellingRow({
  row,
  rank,
  currency,
}: {
  row: PublicSupplierProductSellingRow;
  rank: number;
  currency: string;
}) {
  const units = toNum(row.unitsSold);
  const stock = Math.max(0, toNum(row.currentStock));
  const last = fmtSoldAt(row.lastSoldAt);
  return (
    <li
      className={cn(
        "flex items-start justify-between gap-3 border-b px-3 py-2.5 last:border-b-0",
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)]",
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span
          className={cn(
            "mt-0.5 w-5 shrink-0 text-center font-mono text-[10px] tabular-nums",
            units > 0 ? "text-[var(--pos-primary)]" : "text-muted-foreground",
          )}
        >
          {rank}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-snug text-[var(--pos-ink,#1c1915)]">
            {row.name}
          </p>
          <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
            {row.sku ? (
              <span className="font-mono tracking-tight">{row.sku}</span>
            ) : null}
            {row.sku && last ? " · " : null}
            {last ? `Last ${last}` : units <= 0 ? "No sales in period" : null}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-[13px] font-semibold tabular-nums">
          {fmtQty(units)}
          <span className="ml-1 text-[10px] font-medium text-muted-foreground">
            sold
          </span>
        </p>
        <p
          className={cn(
            "mt-0.5 font-mono text-[12px] font-semibold tabular-nums",
            stock <= 0.009
              ? "text-rose-700"
              : "text-[var(--pos-ink,#1c1915)]",
          )}
        >
          {fmtQty(stock)}
          <span className="ml-1 text-[10px] font-medium text-muted-foreground">
            on hand
          </span>
        </p>
        {units > 0 ? (
          <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
            {fmtMoney(row.revenue, currency)}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div
      className={cn(
        "border border-dashed bg-white/50 px-4 py-10 text-center text-[12px] text-muted-foreground",
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
      )}
    >
      {label}
    </div>
  );
}
