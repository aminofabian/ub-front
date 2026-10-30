"use client";

import Link from "next/link";

import { APP_ROUTES } from "@/lib/config";
import type { GatewayStkPushOpsRecord } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const CHARGE_LABELS: Record<string, string> = {
  SMS_CREDIT_PURCHASE: "SMS credits",
  SUBSCRIPTION_RENEWAL: "Package",
  DOMAIN_ORDER: "Domain",
  DOMAIN_THEME_OFFER: "Domain + theme",
  KIOSK_PAY_TOPUP: "Kiosk Pay top-up",
};

export function platformChargeLabel(contextType: string | null | undefined): string {
  return (contextType && CHARGE_LABELS[contextType]) || "Platform charge";
}

export function formatChargeKes(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function whenPaid(p: GatewayStkPushOpsRecord): string {
  const iso = p.confirmedAt ?? p.createdAt;
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function tenantHref(p: GatewayStkPushOpsRecord): string {
  const q = new URLSearchParams({
    name: p.businessName ?? "",
    slug: p.businessSlug ?? "",
  });
  return `${APP_ROUTES.superAdminBusinesses}/${encodeURIComponent(p.businessId)}?${q.toString()}`;
}

export function PlatformPaymentsList({
  payments,
  seenAt = 0,
  limit,
  emptyText = "No platform payments yet.",
}: {
  payments: GatewayStkPushOpsRecord[] | null;
  seenAt?: number;
  limit?: number;
  emptyText?: string;
}) {
  if (payments === null) {
    return (
      <div className="space-y-2 py-2" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-9 animate-pulse bg-muted/60" />
        ))}
      </div>
    );
  }
  const rows = limit ? payments.slice(0, limit) : payments;
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <ul className="divide-y divide-border/60">
      {rows.map((p) => {
        const isNew = Date.parse(p.confirmedAt ?? p.createdAt ?? "") > seenAt;
        return (
          <li key={p.id}>
            <Link
              href={tenantHref(p)}
              className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  isNew ? "bg-emerald-500" : "bg-transparent",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold tracking-[-0.015em]">
                  {platformChargeLabel(p.contextType)}
                  <span className="font-normal text-muted-foreground"> · {p.businessName ?? "Unknown shop"}</span>
                </p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {p.gatewayTransactionId ?? p.phoneNumber}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-semibold tabular-nums">{formatChargeKes(p.amount)}</p>
                <p className="text-[11px] tabular-nums text-muted-foreground">{whenPaid(p)}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
