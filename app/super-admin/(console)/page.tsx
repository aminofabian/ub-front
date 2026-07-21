"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, Building2, ShieldCheck, Users } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_ROUTES } from "@/lib/config";
import { type SaBusinessRow, fetchSaBusinesses } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

export default function SuperAdminDashboardPage() {
  const [rows, setRows] = useState<SaBusinessRow[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setRows(await fetchSaBusinesses(0, 200));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tenants.");
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
    const chartData = [...tiers.entries()]
      .map(([tier, count]) => ({ tier, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    return { total: rows.length, active, inactive: rows.length - active, chartData };
  }, [rows]);

  return (
    <div className="space-y-8">
      <SuperAdminPageHeader
        title="Overview"
        description="High-level health of the Kiosk tenant fleet. Use this page to spot growth and activation trends before drilling into individual businesses."
        actions={
          <Button variant="outline" size="sm" type="button" asChild>
            <Link href={APP_ROUTES.superAdminBusinesses}>
              Manage tenants
              <ArrowUpRight className="size-3.5 opacity-70" />
            </Link>
          </Button>
        }
      />

      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total tenants</CardTitle>
            <Building2 className="size-4 text-muted-foreground/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight">{stats.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">Registered businesses on the platform</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <ShieldCheck className="size-4 text-emerald-600/80 dark:text-emerald-400/90" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight">{stats.active}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.inactive > 0 ? `${stats.inactive} paused or inactive` : "All tenants marked active"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm transition-shadow hover:shadow-md sm:col-span-2 xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Subscription mix</CardTitle>
            <Users className="size-4 text-muted-foreground/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full min-w-0 pt-1">
              {stats.chartData.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No tier data yet — create a tenant to populate this chart.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="saTierFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                    <XAxis
                      dataKey="tier"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      height={56}
                    />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-popover)",
                        fontSize: "12px",
                      }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      fill="url(#saTierFill)"
                      name="Tenants"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/70 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="font-heading text-lg">Recent tenants</CardTitle>
              <CardDescription>Newest businesses by created date (up to eight).</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" asChild>
              <Link href={APP_ROUTES.superAdminBusinesses}>View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y divide-border/60">
              {[...rows]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 8)
                .map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{b.slug}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={b.active ? "success" : "secondary"}>{b.active ? "Active" : "Inactive"}</Badge>
                      <Badge variant="outline" className="capitalize">
                        {b.subscriptionTier}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/super-admin/businesses/${encodeURIComponent(b.id)}?name=${encodeURIComponent(b.name)}&slug=${encodeURIComponent(b.slug)}&tier=${encodeURIComponent(b.subscriptionTier)}&active=${b.active ? "1" : "0"}`}
                        >
                          Open
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              {rows.length === 0 && !error ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">No tenants yet.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Operations</CardTitle>
            <CardDescription>Shortcuts for day-two platform tasks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href={APP_ROUTES.superAdminPlatformPayments}
              className={cn(
                "flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm font-medium",
                "transition-[background-color,box-shadow] hover:bg-muted/50 hover:shadow-sm",
              )}
            >
              Payment gateways
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </Link>
            <Link
              href={APP_ROUTES.superAdminSettings}
              className={cn(
                "flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm font-medium",
                "transition-[background-color,box-shadow] hover:bg-muted/50 hover:shadow-sm",
              )}
            >
              Profile & security
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </Link>
            <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
              This console is designed to scale with more platform modules — navigation groups keep related tools
              together.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
