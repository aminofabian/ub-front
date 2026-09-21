"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, Search, Smartphone } from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Badge } from "@/components/ui/badge";
import { APP_ROUTES } from "@/lib/config";
import type { GatewayStkPushOpsRecord } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import { money, shortId } from "./platform-payments-panels";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

type StatusFilter = "all" | "pending" | "success" | "failed";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "success", label: "Success" },
  { id: "failed", label: "Failed" },
];

/**
 * Super-admin ledger of STK pushes across tenants — prompts, receipts, failures.
 */
export function StkPushesPanel({
  pushes,
  loading,
}: {
  pushes: GatewayStkPushOpsRecord[] | null;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    if (!pushes) return [];
    const q = query.trim().toLowerCase();
    return pushes.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!q) return true;
      const hay = [
        p.businessName,
        p.businessSlug,
        p.businessId,
        p.phoneNumber,
        p.gatewayTransactionId,
        p.gatewayCheckoutId,
        p.merchantReference,
        p.contextType,
        p.gatewayType,
        p.failureReason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [pushes, query, status]);

  const counts = useMemo(() => {
    const base = { all: 0, pending: 0, success: 0, failed: 0 };
    if (!pushes) return base;
    base.all = pushes.length;
    for (const p of pushes) {
      if (p.status === "pending") base.pending++;
      else if (p.status === "success") base.success++;
      else if (p.status === "failed") base.failed++;
    }
    return base;
  }, [pushes]);

  if (pushes === null || loading) {
    return (
      <p className={cn(dashboardHintClass(), "px-1 py-8 text-center")}>
        Loading STK pushes…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cn("border bg-white px-3 py-3", HAIRLINE)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-primary,#0f766e)]">
          STK push ledger
        </p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Every M-Pesa prompt sent through Daraja, KopoKopo, or custody — across
          all shops.
        </p>
        <p className={cn(dashboardHintClass(), "mt-2 tabular-nums")}>
          {counts.success} success · {counts.pending} pending · {counts.failed}{" "}
          failed
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            className={cn(dashboardInputClass(), "h-9 pl-8 text-[13px]")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shop, phone, receipt…"
            aria-label="Search STK pushes"
          />
        </label>
        <p className={cn(dashboardHintClass(), "shrink-0 tabular-nums")}>
          {filtered.length} shown
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatus(f.id)}
              className={cn(
                "border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                HAIRLINE,
                active
                  ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
                  : "bg-white text-muted-foreground hover:border-[var(--pos-primary,#0f766e)] hover:text-foreground",
              )}
            >
              {f.label}
              <span className="ml-1 tabular-nums opacity-70">
                {counts[f.id]}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className={cn(dashboardHintClass(), "px-1 py-10 text-center")}>
          {pushes.length === 0
            ? "No STK pushes yet. Prompts from POS, storefront, Kiosk Pay, and onboarding tests appear here."
            : "No pushes match this filter."}
        </p>
      ) : (
        <ul className={cn("divide-y border bg-white", HAIRLINE)}>
          {filtered.map((p) => (
            <StkPushRow key={p.id} push={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StkPushRow({ push: p }: { push: GatewayStkPushOpsRecord }) {
  const amount = typeof p.amount === "number" ? p.amount : Number(p.amount);

  return (
    <li className="flex flex-col gap-2 px-3 py-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center border",
            HAIRLINE,
            p.status === "success"
              ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
              : p.status === "failed"
                ? "border-red-300 bg-red-50 text-red-700"
                : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,#f3eee6)] text-muted-foreground",
          )}
          aria-hidden
        >
          <Smartphone className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 max-w-full truncate text-[14px] font-semibold tracking-[-0.015em] text-foreground">
              {p.businessName?.trim() || shortId(p.businessId)}
            </p>
            <Badge
              variant={
                p.status === "success"
                  ? "success"
                  : p.status === "failed"
                    ? "destructive"
                    : "secondary"
              }
              className="rounded-none uppercase"
            >
              {p.status}
            </Badge>
          </div>
          <p className="mt-0.5 text-[15px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
            {money(Number.isFinite(amount) ? amount : 0)}
          </p>
          <p className={cn(dashboardHintClass(), "mt-0.5 break-words")}>
            {formatPhone(p.phoneNumber)}
            {p.contextType ? ` · ${formatContext(p.contextType)}` : ""}
            {p.gatewayType ? ` · ${p.gatewayType}` : ""}
          </p>
          {p.gatewayTransactionId ? (
            <p className="mt-1 font-mono text-[11px] tabular-nums text-foreground">
              Receipt {p.gatewayTransactionId}
            </p>
          ) : (
            <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground" title={p.gatewayCheckoutId}>
              Checkout {p.gatewayCheckoutId}
            </p>
          )}
          {p.failureReason ? (
            <p
              className={cn(dashboardHintClass(), "mt-1 line-clamp-2 text-red-700")}
              title={p.failureReason}
            >
              {p.failureReason}
            </p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className={cn(dashboardHintClass(), "tabular-nums")}>
              {formatWhen(p.createdAt)}
            </p>
            <Link
              href={`${APP_ROUTES.superAdminBusinesses}/${p.businessId}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] hover:underline"
            >
              Open tenant
              <ExternalLink className="size-3" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length >= 9) return phone;
  return phone || "—";
}

function formatContext(ctx: string) {
  return ctx
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
