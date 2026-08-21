"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Mail, Plus, RefreshCw } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSaEmailCampaigns,
  type SaEmailCampaignSummary,
} from "@/lib/super-admin-api";

function statusVariant(status: string): "success" | "secondary" | "outline" | "destructive" {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return "success";
  if (s === "FAILED") return "destructive";
  if (s === "RUNNING") return "outline";
  return "secondary";
}

export default function SuperAdminCampaignsPage() {
  const [rows, setRows] = useState<SaEmailCampaignSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoadError("");
    try {
      const result = await fetchSaEmailCampaigns(0, 50);
      setRows(result.rows);
      setTotal(result.total);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Email campaigns"
        description="Write to merchants who stalled mid-signup, or any tenants you select. From name is Kiosk."
        actions={
          <>
            <Button variant="outline" size="sm" type="button" className="gap-1.5" onClick={() => void reload()}>
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
            <Button size="sm" className="gap-1.5 shadow-sm" type="button" asChild>
              <Link href={`${APP_ROUTES.superAdminCampaignNew}?segment=stuck_signup`}>
                <Plus className="size-3.5" />
                Email stuck signups
              </Link>
            </Button>
          </>
        }
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 text-sm text-muted-foreground sm:px-5">
          <Mail className="size-4 shrink-0 opacity-70" aria-hidden />
          <span>
            {loading ? (
              "Loading campaigns…"
            ) : (
              <>
                <span className="font-medium text-foreground tabular-nums">{total}</span> campaign
                {total === 1 ? "" : "s"}
              </>
            )}
          </span>
        </div>
        {loading ? (
          <div className="divide-y divide-border/50" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
                <div className="ml-auto h-5 w-16 animate-pulse rounded-md bg-muted" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="text-sm font-medium text-foreground">No campaigns yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Email stuck signups to reach merchants who never finished setup.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border/50 lg:hidden">
              {rows.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{row.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.segmentKey.replaceAll("_", " ")} · {row.recipientsSent}/{row.recipientsTargeted} sent
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    <Button variant="outline" size="sm" type="button" asChild>
                      <Link href={`${APP_ROUTES.superAdminCampaigns}/${row.id}`}>Open</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/35 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Segment</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Targeted</th>
                    <th className="px-4 py-3 font-medium">Sent</th>
                    <th className="px-4 py-3 font-medium">Failed</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {rows.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-muted/35">
                      <td className="px-4 py-2.5 font-medium text-foreground">{row.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.segmentKey.replaceAll("_", " ")}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">{row.recipientsTargeted}</td>
                      <td className="px-4 py-2.5 tabular-nums">{row.recipientsSent}</td>
                      <td className="px-4 py-2.5 tabular-nums">{row.recipientsFailed}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground tabular-nums">
                        {new Date(row.createdAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="ghost" size="sm" type="button" asChild>
                          <Link href={`${APP_ROUTES.superAdminCampaigns}/${row.id}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
