"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Globe, Search, Sparkles, Wallet } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  type SaBusinessRow,
  type SaDomainOrderRecord,
  type SaKioskPayAccountRow,
  fetchSaBusinesses,
  fetchSaDomainOrders,
  fetchSaKioskPayAccounts,
} from "@/lib/super-admin-api";

/** Orders that have actually been paid (or stubbed-paid) and are being provisioned. */
const PAID_DOMAIN_STATUSES = new Set(["REGISTERING", "OWNED", "PROVISIONING", "LIVE"]);

function isPaidOrder(order: SaDomainOrderRecord) {
  if (PAID_DOMAIN_STATUSES.has(order.status)) return true;
  // Provisioning failure after payment still needs ops attention.
  return order.status === "FAILED" && Boolean(order.paidAt);
}

const DOMAIN_STATUS_VARIANT: Record<string, "success" | "warning" | "secondary"> = {
  LIVE: "success",
  REGISTERING: "warning",
  OWNED: "warning",
  PROVISIONING: "warning",
};

type AdoptionRow = {
  businessId: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  kioskPay: SaKioskPayAccountRow | null;
  domain: SaDomainOrderRecord | null;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function tenantHref(row: AdoptionRow) {
  const q = new URLSearchParams({
    name: row.name,
    slug: row.slug,
    tier: "",
    active: row.active ? "1" : "0",
  });
  return `${APP_ROUTES.superAdminBusinesses}/${encodeURIComponent(row.businessId)}?${q.toString()}`;
}

export default function SuperAdminAdoptionsPage() {
  const [rows, setRows] = useState<AdoptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [businesses, kioskAccounts, orders] = await Promise.all([
        fetchSaBusinesses(0, 500),
        fetchSaKioskPayAccounts(200),
        fetchSaDomainOrders(),
      ]);
      const bizById = new Map(businesses.map((b) => [b.id, b]));
      const kioskByBiz = new Map(
        kioskAccounts
          .filter((a) => a.status === "ACTIVE")
          .map((a) => [a.businessId, a] as [string, SaKioskPayAccountRow]),
      );
      const domainByBiz = new Map<string, SaDomainOrderRecord>();
      for (const order of orders) {
        if (!isPaidOrder(order)) continue;
        const existing = domainByBiz.get(order.businessId);
        const orderWhen = order.paidAt ?? order.createdAt ?? "";
        const existingWhen = existing ? existing.paidAt ?? existing.createdAt ?? "" : "";
        if (!existing || orderWhen > existingWhen) {
          domainByBiz.set(order.businessId, order);
        }
      }

      const ids = new Set<string>([...kioskByBiz.keys(), ...domainByBiz.keys()]);
      const merged: AdoptionRow[] = [...ids].map((id) => {
        const biz: SaBusinessRow | undefined = bizById.get(id);
        return {
          businessId: id,
          name: biz?.name ?? "Unknown tenant",
          slug: biz?.slug ?? id,
          active: biz?.active ?? false,
          createdAt: biz?.createdAt ?? "",
          kioskPay: kioskByBiz.get(id) ?? null,
          domain: domainByBiz.get(id) ?? null,
        };
      });
      merged.sort((a, b) => {
        const aWhen = a.domain?.paidAt ?? a.kioskPay?.updatedAt ?? a.createdAt ?? "";
        const bWhen = b.domain?.paidAt ?? b.kioskPay?.updatedAt ?? b.createdAt ?? "";
        return bWhen.localeCompare(aWhen);
      });
      setRows(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load adoptions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    let kiosk = 0;
    let domains = 0;
    let both = 0;
    for (const row of rows) {
      const hasKiosk = row.kioskPay !== null;
      const hasDomain = row.domain !== null;
      if (hasKiosk) kiosk += 1;
      if (hasDomain) domains += 1;
      if (hasKiosk && hasDomain) both += 1;
    }
    return { kiosk, domains, both };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.slug.toLowerCase().includes(q) ||
        (row.domain?.fqdn ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Adoptions"
        description="Tenants on paid Kiosk features — Kiosk Pay collection or a purchased custom domain. Follow up here."
        actions={
          <Button variant="outline" size="sm" type="button" className="gap-1.5" asChild>
            <Link href={APP_ROUTES.superAdminPlatformDomains}>
              Domain orders
              <ArrowUpRight className="size-3.5 opacity-70" />
            </Link>
          </Button>
        }
      />

      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

      <section className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm sm:grid-cols-3">
        <div className="border-b border-border/60 px-5 py-4 sm:border-b-0 sm:border-r">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wallet className="size-3.5" aria-hidden /> Kiosk Pay tenants
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight">
            {loading ? "—" : stats.kiosk}
          </p>
        </div>
        <div className="border-b border-border/60 px-5 py-4 sm:border-b-0 sm:border-r">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="size-3.5" aria-hidden /> Custom-domain tenants
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight">
            {loading ? "—" : stats.domains}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowUpRight className="size-3.5" aria-hidden /> Both
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight">
            {loading ? "—" : stats.both}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-sm font-medium text-foreground">Adopted tenants</h2>
            <p className="text-xs text-muted-foreground">
              Everyone on Kiosk Pay or with a paid custom domain
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenant or domain…"
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
            />
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-border/50" aria-hidden>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <div className="h-3.5 w-36 animate-pulse rounded bg-muted" />
                <div className="ml-auto h-5 w-24 animate-pulse rounded-md bg-muted" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <Sparkles className="mb-3 size-7 text-muted-foreground/45" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              {rows.length === 0 ? "No adoptions yet" : "No tenants match your search"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {rows.length === 0
                ? "When a tenant activates Kiosk Pay or buys a custom domain, they will show up here and you will get an SMS alert."
                : "Try a different tenant name, slug, or domain."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {filtered.map((row) => (
              <li
                key={row.businessId}
                className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/35 sm:px-5 lg:flex-row lg:items-center"
              >
                <Link href={tenantHref(row)} className="group min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate font-medium text-foreground group-hover:underline">
                      {row.name}
                    </p>
                    <Badge variant={row.active ? "success" : "secondary"} className="shrink-0">
                      {row.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="truncate font-mono text-xs text-muted-foreground">{row.slug}</p>
                </Link>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 lg:shrink-0">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Wallet className="size-3.5" aria-hidden /> Kiosk Pay
                    </p>
                    {row.kioskPay ? (
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Active · since {formatDate(row.kioskPay.updatedAt)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">—</p>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Globe className="size-3.5" aria-hidden /> Custom domain
                    </p>
                    {row.domain ? (
                      <p className="flex min-w-0 items-center gap-1.5 text-xs">
                        <span className="max-w-45 truncate font-mono font-medium text-foreground">
                          {row.domain.fqdn}
                        </span>
                        <Badge
                          variant={DOMAIN_STATUS_VARIANT[row.domain.status] ?? "secondary"}
                          className="shrink-0"
                        >
                          {row.domain.status}
                        </Badge>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">—</p>
                    )}
                  </div>

                  <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums xl:inline">
                    {row.domain?.paidAt
                      ? `paid ${formatDate(row.domain.paidAt)}`
                      : row.kioskPay?.updatedAt
                        ? `joined ${formatDate(row.createdAt)}`
                        : ""}
                  </span>

                  <Button variant="outline" size="sm" asChild>
                    <Link href={tenantHref(row)}>
                      Attend
                      <ArrowUpRight className="size-3.5 opacity-70" />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
