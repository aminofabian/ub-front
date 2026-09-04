"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Plus, Send } from "lucide-react";

import {
  MAIL_PANEL,
  MAIL_PRIMARY_BTN,
  mailStatusTone,
} from "@/components/credits/customer-email-campaign-ui";
import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  fetchCustomerEmailCampaigns,
  type CustomerEmailCampaignSummary,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { resolveShopMailBrand } from "@/lib/shop-mail-brand";
import { cn } from "@/lib/utils";

export function CustomerEmailCampaignsHistory() {
  const { business } = useDashboard();
  const brand = useMemo(
    () => resolveShopMailBrand(business?.branding, business?.name),
    [business?.branding, business?.name],
  );
  const [rows, setRows] = useState<CustomerEmailCampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchCustomerEmailCampaigns({ size: 50 })
      .then((page) => {
        if (!cancelled) setRows(page.content ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load campaigns",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "space-y-6 pb-16")} style={brand.cssVars}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt=""
              className="h-10 w-auto max-w-[7rem] shrink-0 object-contain"
            />
          ) : (
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--mail-brand)_20%,transparent)] bg-[var(--mail-soft)] text-[var(--mail-brand)] shadow-sm"
              aria-hidden
            >
              <Mail className="size-[18px]" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Email campaigns
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Compose HTML email as {brand.displayName} — specific people,
              filtered lists, or everyone eligible.
            </p>
          </div>
        </div>
        <Button asChild size="sm" className={MAIL_PRIMARY_BTN}>
          <Link href={APP_ROUTES.customerEmailCampaignNew}>
            <Plus className="mr-1 size-3.5" />
            New campaign
          </Link>
        </Button>
      </header>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading campaigns…
        </div>
      ) : rows.length === 0 ? (
        <EmptyCampaigns shopName={brand.displayName} logoUrl={brand.logoUrl} />
      ) : (
        <div className={MAIL_PANEL}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium sm:px-5">Campaign</th>
                  <th className="px-4 py-3 font-medium">Audience</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Sent</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border/40 transition-colors last:border-0 hover:bg-[color-mix(in_srgb,var(--mail-brand)_5%,transparent)]",
                      "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
                    )}
                    style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                  >
                    <td className="px-4 py-3.5 sm:px-5">
                      <Link
                        href={APP_ROUTES.customerEmailCampaign(row.id)}
                        className="group block min-w-0"
                      >
                        <span className="font-medium text-foreground group-hover:text-[var(--mail-brand)]">
                          {row.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {row.subject}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 capitalize text-muted-foreground">
                      {String(row.recipientMethod).replace("_", " ")}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                          mailStatusTone(row.status),
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {row.recipientsSent}
                      </span>
                      <span className="text-border"> / </span>
                      {row.recipientsTargeted}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground sm:px-5">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString("en-KE", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyCampaigns({
  shopName,
  logoUrl,
}: {
  shopName: string;
  logoUrl: string | null;
}) {
  return (
    <div
      className={cn(
        MAIL_PANEL,
        "relative overflow-hidden px-6 py-14 text-center sm:px-10",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--mail-brand)_14%,transparent)_0%,transparent_55%)]"
      />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-12 w-auto max-w-[10rem] object-contain"
          />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--mail-brand)_20%,transparent)] bg-[var(--mail-soft)] text-[var(--mail-brand)] shadow-sm">
            <Send className="size-6" />
          </span>
        )}
        <h2 className="mt-5 text-lg font-semibold tracking-tight">
          No campaigns yet
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Write one email in {shopName}&apos;s colors, pick who should get it,
          preview on desktop and phone, then send.
        </p>
        <Button asChild className={cn("mt-6", MAIL_PRIMARY_BTN)}>
          <Link href={APP_ROUTES.customerEmailCampaignNew}>
            <Plus className="mr-1.5 size-3.5" />
            Compose first email
          </Link>
        </Button>
      </div>
    </div>
  );
}
