"use client";

import Link from "next/link";
import {
  Globe2,
  MessageSquareText,
  Package,
  Sparkles,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import type { GatewayStkPushOpsRecord } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const CHARGE_META: Record<
  string,
  { label: string; short: string; Icon: LucideIcon }
> = {
  SMS_CREDIT_PURCHASE: {
    label: "SMS credits",
    short: "SMS",
    Icon: MessageSquareText,
  },
  SUBSCRIPTION_RENEWAL: {
    label: "Package",
    short: "Plan",
    Icon: Package,
  },
  DOMAIN_ORDER: {
    label: "Domain",
    short: "Domain",
    Icon: Globe2,
  },
  DOMAIN_THEME_OFFER: {
    label: "Domain + theme",
    short: "Theme",
    Icon: Sparkles,
  },
  KIOSK_PAY_TOPUP: {
    label: "Kiosk Pay top-up",
    short: "Float",
    Icon: WalletCards,
  },
};

const DISPLAY =
  'var(--font-cormorant), Georgia, "Times New Roman", serif';
const MONO = 'var(--font-geist-mono), ui-monospace, monospace';

export function platformChargeLabel(contextType: string | null | undefined): string {
  return (contextType && CHARGE_META[contextType]?.label) || "Platform charge";
}

export function formatChargeKes(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(Number.isFinite(n) ? n : 0);
}

/** Amount without the KES prefix — for the big display figure. */
export function formatChargeFigure(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function paidMs(p: GatewayStkPushOpsRecord): number {
  const t = Date.parse(p.confirmedAt ?? p.createdAt ?? "");
  return Number.isNaN(t) ? 0 : t;
}

function whenPaid(p: GatewayStkPushOpsRecord): string {
  const ms = paidMs(p);
  if (!ms) return "—";
  const d = new Date(ms);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function tenantHref(p: GatewayStkPushOpsRecord): string {
  const q = new URLSearchParams({
    name: p.businessName ?? "",
    slug: p.businessSlug ?? "",
  });
  return `${APP_ROUTES.superAdminBusinesses}/${encodeURIComponent(p.businessId)}?${q.toString()}`;
}

function chargeMeta(contextType: string | null | undefined) {
  return (
    (contextType && CHARGE_META[contextType]) || {
      label: "Platform charge",
      short: "Pay",
      Icon: WalletCards,
    }
  );
}

/** Counts of each charge kind in the list (for the ledger header chips). */
export function platformPaymentBreakdown(
  payments: GatewayStkPushOpsRecord[] | null | undefined,
): { key: string; label: string; short: string; Icon: LucideIcon; count: number; total: number }[] {
  const buckets = new Map<
    string,
    { key: string; label: string; short: string; Icon: LucideIcon; count: number; total: number }
  >();
  for (const p of payments ?? []) {
    const meta = chargeMeta(p.contextType);
    const key = p.contextType ?? "OTHER";
    const cur = buckets.get(key) ?? {
      key,
      label: meta.label,
      short: meta.short,
      Icon: meta.Icon,
      count: 0,
      total: 0,
    };
    cur.count += 1;
    cur.total += Number(p.amount) || 0;
    buckets.set(key, cur);
  }
  return Array.from(buckets.values()).sort((a, b) => b.total - a.total);
}

export function PlatformPaymentsEmpty({
  text = "No platform payments yet. They land here the moment M-Pesa confirms the PIN.",
}: {
  text?: string;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span
        className="flex size-11 items-center justify-center rounded-[2px] border border-[var(--op-rule)] bg-[color-mix(in_srgb,var(--op-accent)_6%,var(--op-surface))] text-[var(--op-accent)]"
        aria-hidden
      >
        <WalletCards className="size-4" strokeWidth={1.75} />
      </span>
      <p
        className="mt-4 text-[1.35rem] font-normal tracking-[-0.02em] text-[var(--op-ink)]"
        style={{ fontFamily: DISPLAY }}
      >
        The till is quiet
      </p>
      <p className="mt-1.5 max-w-[22rem] text-[13px] leading-relaxed text-[var(--op-muted)]">
        {text}
      </p>
    </div>
  );
}

function SkeletonRows({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-[var(--op-rule-soft)]" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="size-8 shrink-0 animate-pulse rounded-[2px] bg-[color-mix(in_srgb,var(--op-ink)_6%,transparent)]" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div
              className="h-3 animate-pulse rounded-[1px] bg-[color-mix(in_srgb,var(--op-ink)_8%,transparent)]"
              style={{ width: `${52 + (i % 3) * 12}%` }}
            />
            <div className="h-2.5 w-24 animate-pulse rounded-[1px] bg-[color-mix(in_srgb,var(--op-ink)_5%,transparent)]" />
          </div>
          <div className="h-3.5 w-16 shrink-0 animate-pulse rounded-[1px] bg-[color-mix(in_srgb,var(--op-ink)_8%,transparent)]" />
        </div>
      ))}
    </div>
  );
}

function PaymentRow({
  payment: p,
  isNew,
  dense,
}: {
  payment: GatewayStkPushOpsRecord;
  isNew: boolean;
  dense?: boolean;
}) {
  const meta = chargeMeta(p.contextType);
  const Icon = meta.Icon;
  return (
    <li>
      <Link
        href={tenantHref(p)}
        className={cn(
          "group relative flex items-center gap-3 transition-colors duration-200",
          "ease-[cubic-bezier(0.22,1,0.36,1)]",
          "hover:bg-[color-mix(in_srgb,var(--op-accent)_4%,transparent)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--op-surface)]",
          dense ? "py-2.5" : "py-3",
          isNew && "bg-[color-mix(in_srgb,var(--op-accent)_3.5%,transparent)]",
        )}
      >
        {isNew ? (
          <span
            className="absolute inset-y-2 left-0 w-px bg-[var(--op-accent)]"
            aria-hidden
          />
        ) : null}
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-[2px] border border-[var(--op-rule)]",
            "bg-[var(--op-surface)] text-[var(--op-accent)]",
            "transition-colors duration-200 group-hover:border-[var(--op-accent)]",
            dense ? "size-7" : "size-8",
          )}
          aria-hidden
        >
          <Icon className={dense ? "size-3.5" : "size-3.5"} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold tracking-[-0.015em] text-[var(--op-ink)]">
            {meta.label}
            <span className="font-normal text-[var(--op-muted)]">
              {" · "}
              {p.businessName ?? "Unknown shop"}
            </span>
          </p>
          <p
            className="mt-0.5 truncate text-[11px] tabular-nums text-[var(--op-muted)]"
            style={{ fontFamily: MONO }}
          >
            {p.gatewayTransactionId ?? p.phoneNumber}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className="text-[14px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--op-ink)]"
            style={{ fontFamily: DISPLAY }}
          >
            {formatChargeKes(p.amount)}
          </p>
          <p
            className="mt-0.5 text-[10.5px] uppercase tracking-[0.08em] text-[var(--op-muted)]"
            style={{ fontFamily: MONO }}
          >
            {whenPaid(p)}
            {isNew ? (
              <span className="ml-1.5 text-[var(--op-accent)] normal-case tracking-normal">
                new
              </span>
            ) : null}
          </p>
        </div>
      </Link>
    </li>
  );
}

export function PlatformPaymentsList({
  payments,
  seenAt = 0,
  limit,
  dense,
  emptyText,
}: {
  payments: GatewayStkPushOpsRecord[] | null;
  seenAt?: number;
  limit?: number;
  dense?: boolean;
  emptyText?: string;
}) {
  if (payments === null) {
    return <SkeletonRows rows={dense ? 4 : 5} />;
  }
  const rows = limit ? payments.slice(0, limit) : payments;
  if (rows.length === 0) {
    return <PlatformPaymentsEmpty text={emptyText} />;
  }
  return (
    <ul className="divide-y divide-[var(--op-rule-soft)]">
      {rows.map((p) => (
        <PaymentRow
          key={p.id}
          payment={p}
          isNew={paidMs(p) > seenAt}
          dense={dense}
        />
      ))}
    </ul>
  );
}

/**
 * Overview ledger strip: today's take in Cormorant, kind chips, then the
 * latest receipt rows. Hairline rules do the card work.
 */
export function PlatformPaymentsLedger({
  payments,
  seenAt = 0,
  todayTotal,
  todayCount,
  limit = 8,
}: {
  payments: GatewayStkPushOpsRecord[] | null;
  seenAt?: number;
  todayTotal: number;
  todayCount: number;
  limit?: number;
}) {
  const breakdown = platformPaymentBreakdown(
    (payments ?? []).filter((p) => {
      const ms = paidMs(p);
      if (!ms) return false;
      return new Date(ms).toDateString() === new Date().toDateString();
    }),
  );

  return (
    <section
      aria-labelledby="platform-payments-heading"
      className={cn(
        "overflow-hidden rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)]",
      )}
    >
      <div className="relative overflow-hidden border-b border-[var(--op-rule)] px-4 py-4 sm:px-5 sm:py-5">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-px bg-[var(--op-accent)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-[color-mix(in_srgb,var(--op-accent)_5%,transparent)] blur-2xl"
          aria-hidden
        />

        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h2
              id="platform-payments-heading"
              className="text-[1.55rem] font-normal leading-none tracking-[-0.025em] text-[var(--op-ink)] sm:text-[1.7rem]"
              style={{ fontFamily: DISPLAY }}
            >
              Till book
            </h2>
            <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--op-muted)]">
              Money paid to Kiosk — SMS credits, packages, domains, and float top-ups.
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p
              className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--op-muted)]"
              style={{ fontFamily: MONO }}
            >
              Today
            </p>
            <p
              className="mt-0.5 text-[1.85rem] font-normal leading-none tracking-[-0.03em] tabular-nums text-[var(--op-accent)] sm:text-[2.1rem]"
              style={{ fontFamily: DISPLAY }}
            >
              <span className="mr-1.5 text-[0.55em] tracking-normal text-[var(--op-muted)]">
                KES
              </span>
              {formatChargeFigure(todayTotal)}
            </p>
            <p className="mt-1 text-[12px] tabular-nums text-[var(--op-muted)]">
              {todayCount === 0
                ? "Nothing settled yet"
                : `${todayCount} payment${todayCount === 1 ? "" : "s"} settled`}
            </p>
          </div>
        </div>

        {breakdown.length > 0 ? (
          <ul className="relative mt-4 flex flex-wrap gap-1.5">
            {breakdown.map((b) => {
              const Icon = b.Icon;
              return (
                <li
                  key={b.key}
                  className="inline-flex items-center gap-1.5 rounded-[2px] border border-[var(--op-rule)] bg-[color-mix(in_srgb,var(--op-accent)_4%,var(--op-surface))] px-2 py-1 text-[11px] text-[var(--op-ink)]"
                >
                  <Icon
                    className="size-3 text-[var(--op-accent)]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="font-medium">{b.short}</span>
                  <span
                    className="tabular-nums text-[var(--op-muted)]"
                    style={{ fontFamily: MONO }}
                  >
                    {b.count} · {formatChargeKes(b.total)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="px-4 sm:px-5">
        <PlatformPaymentsList
          payments={payments}
          seenAt={seenAt}
          limit={limit}
          dense
          emptyText="No platform payments yet. They land here the moment M-Pesa confirms the PIN."
        />
      </div>

      {payments && payments.length > limit ? (
        <div className="border-t border-[var(--op-rule-soft)] px-4 py-2.5 sm:px-5">
          <p className="text-[11px] text-[var(--op-muted)]">
            Showing {limit} of {payments.length}. Open the bell for the full book.
          </p>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Notifications drawer body: a compact take strip, then the receipt list.
 */
export function PlatformPaymentsDrawerBody({
  payments,
  seenAt = 0,
}: {
  payments: GatewayStkPushOpsRecord[] | null;
  seenAt?: number;
}) {
  const today = new Date().toDateString();
  let todayTotal = 0;
  let todayCount = 0;
  let unread = 0;
  for (const p of payments ?? []) {
    const ms = paidMs(p);
    if (!ms) continue;
    if (new Date(ms).toDateString() === today) {
      todayTotal += Number(p.amount) || 0;
      todayCount += 1;
    }
    if (ms > seenAt) unread += 1;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-rule)]">
        <div className="bg-[var(--op-surface)] px-3.5 py-3">
          <p
            className="text-[10px] uppercase tracking-[0.12em] text-[var(--op-muted)]"
            style={{ fontFamily: MONO }}
          >
            Today
          </p>
          <p
            className="mt-1 text-[1.45rem] font-normal leading-none tracking-[-0.025em] tabular-nums text-[var(--op-accent)]"
            style={{ fontFamily: DISPLAY }}
          >
            {formatChargeKes(todayTotal)}
          </p>
          <p className="mt-1 text-[11px] tabular-nums text-[var(--op-muted)]">
            {todayCount} settled
          </p>
        </div>
        <div className="bg-[var(--op-surface)] px-3.5 py-3">
          <p
            className="text-[10px] uppercase tracking-[0.12em] text-[var(--op-muted)]"
            style={{ fontFamily: MONO }}
          >
            Unread
          </p>
          <p
            className="mt-1 text-[1.45rem] font-normal leading-none tracking-[-0.025em] tabular-nums text-[var(--op-ink)]"
            style={{ fontFamily: DISPLAY }}
          >
            {unread}
          </p>
          <p className="mt-1 text-[11px] text-[var(--op-muted)]">
            {unread === 0 ? "All caught up" : "since you last looked"}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <p
            className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--op-muted)]"
            style={{ fontFamily: MONO }}
          >
            Recent
          </p>
          {payments ? (
            <p className="text-[11px] tabular-nums text-[var(--op-muted)]">
              {payments.length} on file
            </p>
          ) : null}
        </div>
        <PlatformPaymentsList
          payments={payments}
          seenAt={seenAt}
          emptyText="No platform payments yet. They land here the moment M-Pesa confirms the PIN."
        />
      </div>
    </div>
  );
}
