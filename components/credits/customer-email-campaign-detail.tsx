"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

import {
  MAIL_PANEL,
  MAIL_PRIMARY_BTN,
  MAIL_SHELL,
  mailSkipLabel,
  mailStatusTone,
} from "@/components/credits/customer-email-campaign-ui";
import { CustomerEmailCampaignComposer } from "@/components/credits/customer-email-campaign-composer";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  fetchCustomerEmailCampaign,
  type CustomerEmailCampaignDetail,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { resolveShopMailBrand } from "@/lib/shop-mail-brand";
import { cn } from "@/lib/utils";

export function CustomerEmailCampaignDetailView({
  campaignId,
}: {
  campaignId: string;
}) {
  const { business } = useDashboard();
  const brand = useMemo(
    () => resolveShopMailBrand(business?.branding, business?.name),
    [business?.branding, business?.name],
  );
  const [campaign, setCampaign] = useState<CustomerEmailCampaignDetail | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchCustomerEmailCampaign(campaignId)
      .then((row) => {
        if (!cancelled) setCampaign(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Campaign not found");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-6 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Opening campaign…
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-6 py-12">
        <p className="text-sm text-red-700">{error ?? "Campaign not found"}</p>
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link href={APP_ROUTES.customerEmailCampaigns}>Back to history</Link>
        </Button>
      </div>
    );
  }

  if (campaign.status === "DRAFT") {
    return <CustomerEmailCampaignComposer initialCampaign={campaign} />;
  }

  return (
    <div
      className={cn(MAIL_SHELL, "lg:h-auto lg:overflow-visible")}
      style={brand.cssVars}
    >
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="mt-0.5 size-8 shrink-0"
            >
              <Link href={APP_ROUTES.customerEmailCampaigns} aria-label="Back">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt=""
                className="mt-0.5 hidden h-8 w-auto max-w-[6rem] object-contain sm:block"
              />
            ) : null}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight">
                  {campaign.name}
                </h1>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                    mailStatusTone(campaign.status),
                  )}
                >
                  {campaign.status}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {campaign.subject}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sent as {brand.displayName}
              </p>
            </div>
          </div>
          <Button asChild size="sm" className={MAIL_PRIMARY_BTN}>
            <Link href={APP_ROUTES.customerEmailCampaignNew}>
              <Mail className="mr-1.5 size-3.5" />
              New campaign
            </Link>
          </Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-4">
          <Stat
            label="Audience"
            value={String(campaign.recipientMethod).replace("_", " ")}
            capitalize
          />
          <Stat label="Targeted" value={String(campaign.recipientsTargeted)} />
          <Stat label="Sent" value={String(campaign.recipientsSent)} />
          <Stat
            label="Skipped / failed"
            value={`${campaign.recipientsSkipped} / ${campaign.recipientsFailed}`}
          />
        </div>

        <div className={MAIL_PANEL}>
          <div className="border-b border-border/50 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold tracking-tight">Recipients</h2>
            <p className="text-xs text-muted-foreground">
              Delivery outcome for each customer in this send
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/25 text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium sm:px-5">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium sm:px-5">Detail</th>
                </tr>
              </thead>
              <tbody>
                {campaign.recipients.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-4 py-2.5 sm:px-5">
                      {row.customerName ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.email}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                          mailStatusTone(row.status),
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
                      {row.skipReason
                        ? mailSkipLabel(row.skipReason)
                        : row.error || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className={cn(MAIL_PANEL, "px-4 py-3")}>
      <div className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-sm font-semibold tracking-tight",
          capitalize && "capitalize",
        )}
      >
        {value}
      </div>
    </div>
  );
}
