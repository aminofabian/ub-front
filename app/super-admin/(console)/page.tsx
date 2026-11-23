"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, LayoutDashboard, Loader2, RefreshCw } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  type SaPlatformOverview,
  fetchSaPlatformOverview,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import { OverviewDesk } from "./_components/overview-desk";

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<SaPlatformOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setData(await fetchSaPlatformOverview());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load platform overview.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-5 pb-8")}>
      <DashboardPageHero
        icon={LayoutDashboard}
        title="Overview"
        description="What needs you now, what the fleet sold, and who is stuck before first sale."
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={loading || refreshing}
          onClick={() => void load(true)}
          aria-label="Refresh overview"
        >
          {refreshing ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
        </Button>
        <Button asChild>
          <Link href={APP_ROUTES.superAdminBusinesses}>
            All tenants
            <ArrowUpRight className="size-3.5 opacity-80" aria-hidden />
          </Link>
        </Button>
      </DashboardPageHero>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <OverviewDesk data={data} loading={loading && !data} />
    </div>
  );
}
