"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  CreditCard,
  ExternalLink,
  Landmark,
  Search,
  Store,
  Wallet,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Badge } from "@/components/ui/badge";
import { APP_ROUTES } from "@/lib/config";
import type {
  TenantPaymentMethodRow,
  TenantPaymentMethodsOverview,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

type FilterId =
  | "all"
  | "custody"
  | "byo"
  | "manual"
  | "active"
  | "inactive"
  | "till"
  | "paybill";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "custody", label: "Lipa / custody" },
  { id: "byo", label: "BYO keys" },
  { id: "manual", label: "Manual" },
  { id: "till", label: "Till" },
  { id: "paybill", label: "Paybill / bank" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Not active" },
];

/**
 * Super-admin inventory of tenant payment methods — coverage pulse +
 * destination details (till / paybill / bank) without credentials.
 */
export function TenantMethodsPanel({
  overview,
}: {
  overview: TenantPaymentMethodsOverview | null;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");

  const coveragePct = useMemo(() => {
    if (!overview || overview.totalBusinesses <= 0) return 0;
    return Math.round(
      (overview.tenantsWithAnyMethod / overview.totalBusinesses) * 100,
    );
  }, [overview]);

  const filtered = useMemo(() => {
    if (!overview) return [];
    const q = query.trim().toLowerCase();
    return overview.methods.filter((m) => {
      if (filter === "custody" && m.gatewayType !== "CUSTODY_MPESA") return false;
      if (filter === "manual" && m.gatewayType !== "MANUAL") return false;
      if (
        filter === "byo" &&
        (m.gatewayType === "CUSTODY_MPESA" || m.gatewayType === "MANUAL")
      ) {
        return false;
      }
      if (filter === "active" && m.status !== "ACTIVE") return false;
      if (filter === "inactive" && m.status === "ACTIVE") return false;
      if (filter === "till" && m.destinationType !== "till") return false;
      if (filter === "paybill" && m.destinationType !== "paybill") return false;
      if (!q) return true;
      const hay = [
        m.businessName,
        m.businessSlug,
        m.label,
        m.gatewayType,
        m.destinationSummary,
        m.tillNumber,
        m.businessNumber,
        m.accountNumber,
        m.businessId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [overview, query, filter]);

  if (!overview) {
    return (
      <p className={cn(dashboardHintClass(), "px-1 py-8 text-center")}>
        Loading tenant payment methods…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <CoveragePulse overview={overview} coveragePct={coveragePct} />

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
            placeholder="Search shop, till, paybill, bank…"
            aria-label="Search tenant payment methods"
          />
        </label>
        <p className={cn(dashboardHintClass(), "shrink-0 tabular-nums")}>
          {filtered.length} method{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                HAIRLINE,
                active
                  ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
                  : "bg-white text-muted-foreground hover:border-[var(--pos-primary,#0f766e)] hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className={cn(dashboardHintClass(), "px-1 py-10 text-center")}>
          {overview.methods.length === 0
            ? "No tenants have configured a payment method yet."
            : "No methods match this filter."}
        </p>
      ) : (
        <ul className={cn("divide-y border bg-white", HAIRLINE)}>
          {filtered.map((m) => (
            <MethodRow key={m.configId} method={m} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CoveragePulse({
  overview,
  coveragePct,
}: {
  overview: TenantPaymentMethodsOverview;
  coveragePct: number;
}) {
  const stats = [
    {
      label: "Shops with methods",
      value: `${overview.tenantsWithAnyMethod}`,
      sub: `of ${overview.totalBusinesses} tenants`,
    },
    {
      label: "Lipa Na M-Pesa",
      value: String(overview.tenantsWithCustody),
      sub: overview.custodyProvider
        ? `Rail · ${overview.custodyProvider}`
        : "Custody till / paybill",
    },
    {
      label: "BYO gateways",
      value: String(overview.tenantsWithByo),
      sub: "Own Daraja / KopoKopo / …",
    },
    {
      label: "Still empty",
      value: String(overview.tenantsWithoutMethods),
      sub: "No STK destination yet",
    },
  ];

  return (
    <div className={cn("border bg-white", HAIRLINE)}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b px-3 py-3 sm:px-4" style={{ borderColor: "color-mix(in srgb, var(--order-ink, #15231f) 10%, transparent)" }}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-primary,#0f766e)]">
            Payment coverage
          </p>
          <p className="mt-0.5 text-[22px] font-semibold tracking-[-0.03em] tabular-nums text-[var(--order-ink,#15231f)]">
            {coveragePct}%
            <span className="ml-2 text-[13px] font-medium text-muted-foreground">
              of tenants ready to take payments
            </span>
          </p>
        </div>
        <p className={cn(dashboardHintClass(), "tabular-nums")}>
          {overview.activeConfigs} active · {overview.inactiveConfigs} inactive configs
        </p>
      </div>

      <div className="h-1.5 w-full bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)]">
        <div
          className="h-full bg-[var(--pos-primary,#0f766e)] transition-[width] duration-500"
          style={{ width: `${Math.min(100, Math.max(0, coveragePct))}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-0.5 text-[20px] font-semibold tracking-[-0.03em] tabular-nums text-foreground">
              {s.value}
            </p>
            <p className={cn(dashboardHintClass(), "mt-0.5 line-clamp-1")}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MethodRow({ method: m }: { method: TenantPaymentMethodRow }) {
  const Icon = methodIcon(m);
  const kindLabel = gatewayKindLabel(m.gatewayType);
  const dest = destinationParts(m);

  return (
    <li className="flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-stretch sm:gap-4">
      <div className="flex min-w-0 flex-1 gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center border",
            HAIRLINE,
            m.gatewayType === "CUSTODY_MPESA"
              ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
              : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,#f3eee6)] text-muted-foreground",
          )}
          aria-hidden
        >
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[14px] font-semibold tracking-[-0.015em] text-foreground">
              {m.businessName?.trim() || "Unnamed shop"}
            </p>
            <Badge
              variant={m.status === "ACTIVE" ? "success" : "secondary"}
              className="rounded-none"
            >
              {m.status}
            </Badge>
            {m.isDefault ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--pos-primary,#0f766e)]">
                Default
              </span>
            ) : null}
            {!m.businessActive ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Shop paused
              </span>
            ) : null}
          </div>
          <p className={cn(dashboardHintClass(), "mt-0.5")}>
            {kindLabel}
            {m.label?.trim() ? ` · ${m.label.trim()}` : ""}
            {m.businessSlug ? ` · ${m.businessSlug}` : ""}
            {m.custodyProvider ? ` · rail ${m.custodyProvider}` : ""}
          </p>
          <Link
            href={`${APP_ROUTES.superAdminBusinesses}/${m.businessId}`}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] hover:underline"
          >
            Open tenant
            <ExternalLink className="size-3" aria-hidden />
          </Link>
        </div>
      </div>

      <DestinationTicket dest={dest} summary={m.destinationSummary} gatewayType={m.gatewayType} />
    </li>
  );
}

function DestinationTicket({
  dest,
  summary,
  gatewayType,
}: {
  dest: ReturnType<typeof destinationParts>;
  summary: string | null;
  gatewayType: string;
}) {
  if (!dest.kind && !summary) {
    return (
      <div
        className={cn(
          "flex w-full shrink-0 flex-col justify-center border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,#f3eee6)] px-3 py-2.5 sm:w-[14.5rem]",
          HAIRLINE,
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Destination
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {gatewayType === "CUSTODY_MPESA" || gatewayType === "MANUAL"
            ? "Not set"
            : "API keys · no till display"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full shrink-0 overflow-hidden border bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,white)] px-3 py-2.5 sm:w-[14.5rem]",
        HAIRLINE,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--pos-primary,#0f766e)]">
        {dest.kind === "till"
          ? "Buy Goods till"
          : dest.kind === "paybill"
            ? "Paybill / bank"
            : "Where money lands"}
      </p>
      {dest.kind === "till" && dest.primary ? (
        <p className="mt-1 font-mono text-[18px] font-semibold tracking-wider tabular-nums text-[var(--order-ink,#15231f)]">
          {dest.primary}
        </p>
      ) : null}
      {dest.kind === "paybill" ? (
        <div className="mt-1 space-y-0.5">
          <p className="font-mono text-[15px] font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
            {dest.primary ?? "—"}
          </p>
          {dest.secondary ? (
            <p className="truncate text-[12px] text-muted-foreground">
              Acc {dest.secondary}
            </p>
          ) : null}
        </div>
      ) : null}
      {!dest.kind && summary ? (
        <p className="mt-1 text-[13px] font-semibold text-foreground">{summary}</p>
      ) : null}
      {summary && dest.kind ? (
        <p className="mt-1 truncate text-[11px] text-muted-foreground" title={summary}>
          {summary}
        </p>
      ) : null}
    </div>
  );
}

function methodIcon(m: TenantPaymentMethodRow) {
  if (m.destinationType === "till") return Store;
  if (m.destinationType === "paybill") {
    if ((m.label ?? "").toLowerCase().includes("bank")) return Landmark;
    return Building2;
  }
  if (m.gatewayType === "CUSTODY_MPESA") return Wallet;
  return CreditCard;
}

function gatewayKindLabel(type: string) {
  switch (type) {
    case "CUSTODY_MPESA":
      return "Lipa Na M-Pesa (custody)";
    case "MANUAL":
      return "Manual instructions";
    case "DARAJA":
      return "Daraja (BYO)";
    case "KOPOKOPO":
      return "KopoKopo (BYO)";
    case "PAYSTACK":
      return "Paystack (BYO)";
    case "PESAPAL":
      return "Pesapal (BYO)";
    default:
      return type;
  }
}

function destinationParts(m: TenantPaymentMethodRow) {
  if (m.destinationType === "till") {
    return { kind: "till" as const, primary: m.tillNumber, secondary: null };
  }
  if (m.destinationType === "paybill") {
    return {
      kind: "paybill" as const,
      primary: m.businessNumber,
      secondary: m.accountNumber,
    };
  }
  return { kind: null, primary: null, secondary: null };
}
