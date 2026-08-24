"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { type SaBusinessRow, fetchSaBusinesses } from "@/lib/super-admin-api";

function tenantHref(b: SaBusinessRow) {
  const q = new URLSearchParams({
    name: b.name,
    slug: b.slug,
    tier: b.subscriptionTier,
    active: b.active ? "1" : "0",
  });
  return `${APP_ROUTES.superAdminBusinesses}/${encodeURIComponent(b.id)}?${q.toString()}`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const DIRECTORY = [
  { href: APP_ROUTES.superAdminBusinesses, label: "Tenants", hint: "Provision, impersonate, domains" },
  { href: APP_ROUTES.superAdminAdoptions, label: "Adoptions", hint: "Kiosk Pay and custom-domain tenants" },
  { href: APP_ROUTES.superAdminCampaigns, label: "Campaigns", hint: "Email stuck signups and selected shops" },
  { href: APP_ROUTES.superAdminMessages, label: "Messages", hint: "Talk to Us inbox" },
  { href: APP_ROUTES.superAdminPlatformGlobalCatalog, label: "Global catalog", hint: "Shared packs, categories, suppliers" },
  { href: APP_ROUTES.superAdminPlatformPayments, label: "Payments", hint: "M-Pesa and gateway credentials" },
  { href: APP_ROUTES.superAdminPlatformIntegrations, label: "Integrations", hint: "SMS, WhatsApp, DeepSeek" },
  { href: APP_ROUTES.superAdminPlatformDomains, label: "Domains", hint: "Reseller and hostname orders" },
  { href: APP_ROUTES.superAdminPlatformLogs, label: "Client logs", hint: "Browser API and proxy errors" },
] as const;

export default function SuperAdminDashboardPage() {
  const [rows, setRows] = useState<SaBusinessRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    try {
      setRows(await fetchSaBusinesses(0, 200));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tenants.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.active).length;
    const tiers = new Map<string, number>();
    for (const r of rows) {
      const t = (r.subscriptionTier || "unspecified").trim() || "unspecified";
      tiers.set(t, (tiers.get(t) ?? 0) + 1);
    }
    const topTier = [...tiers.entries()].sort((a, b) => b[1] - a[1])[0];
    const recent = [...rows]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
    return { total: rows.length, active, inactive: rows.length - active, topTier, recent };
  }, [rows]);

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Overview"
        description="Fleet health and the work you open most. Drill into a tenant when something needs a session."
        actions={
          <Button variant="outline" size="sm" type="button" className="gap-1.5" asChild>
            <Link href={APP_ROUTES.superAdminBusinesses}>
              All tenants
              <ArrowUpRight className="size-3.5 opacity-70" />
            </Link>
          </Button>
        }
      />

      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

      <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm lg:grid-cols-4">
        <div className="border-b border-border/60 px-5 py-4 lg:border-b-0 lg:border-r">
          <p className="text-xs text-muted-foreground">Tenants</p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight">
            {loading ? "—" : stats.total}
          </p>
        </div>
        <div className="border-b border-border/60 px-5 py-4 lg:border-b-0 lg:border-r">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight">
            {loading ? "—" : stats.active}
          </p>
        </div>
        <div className="border-border/60 px-5 py-4 lg:border-r">
          <p className="text-xs text-muted-foreground">Inactive</p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight">
            {loading ? "—" : stats.inactive}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-muted-foreground">Largest tier</p>
          <p className="mt-1 truncate font-heading text-2xl font-semibold capitalize tracking-tight">
            {loading ? "—" : stats.topTier ? stats.topTier[0] : "—"}
          </p>
          {!loading && stats.topTier ? (
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{stats.topTier[1]} tenants</p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-sm font-medium text-foreground">Recent tenants</h2>
              <p className="text-xs text-muted-foreground">Newest eight, by created date</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={APP_ROUTES.superAdminBusinesses}>View all</Link>
            </Button>
          </div>
          {loading ? (
            <div className="divide-y divide-border/50" aria-hidden>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="h-3.5 w-36 animate-pulse rounded bg-muted" />
                  <div className="ml-auto h-5 w-14 animate-pulse rounded-md bg-muted" />
                </div>
              ))}
            </div>
          ) : stats.recent.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">No tenants yet.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {stats.recent.map((b) => (
                <li key={b.id}>
                  <Link
                    href={tenantHref(b)}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/35 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{b.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{b.slug}</p>
                    </div>
                    <Badge variant={b.active ? "success" : "secondary"} className="shrink-0">
                      {b.active ? "Active" : "Inactive"}
                    </Badge>
                    <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">
                      {formatDate(b.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm xl:col-span-2">
          <div className="border-b border-border/60 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-medium text-foreground">Directory</h2>
            <p className="text-xs text-muted-foreground">Jump to a console tool</p>
          </div>
          <ul className="divide-y divide-border/50">
            {DIRECTORY.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-start justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/35 sm:px-5"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{item.hint}</span>
                  </span>
                  <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
