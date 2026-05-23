"use client";

import {
  CalendarClock,
  ChevronRight,
  Clock,
  Megaphone,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import type { NotificationCampaign } from "@/lib/api";
import {
  campaignStatusMeta,
  campaignTypeLabel,
  campaignWhenLabel,
  deliveryRate,
} from "@/lib/promotions-campaign-utils";
import { cn } from "@/lib/utils";

import {
  promoCardFooter,
  promoCardShell,
  promoStatusChipClass,
  promoStatusDotClass,
  promoTypeAccent,
} from "./promotions-ui-tokens";

function MetricCell({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/15 px-2.5 py-2 ring-1 ring-inset ring-border/30">
      <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-sm font-semibold tabular-nums",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </dd>
      {sub ? (
        <dd className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</dd>
      ) : null}
    </div>
  );
}

function expiryLabel(row: NotificationCampaign): { value: string; sub: string } {
  if (row.status === "SCHEDULED" && row.scheduledAt) {
    return { value: "Scheduled", sub: campaignWhenLabel(row) };
  }
  if (row.status === "DRAFT") {
    return { value: "Open", sub: "Not scheduled" };
  }
  if (row.status === "RUNNING") {
    return { value: "Live", sub: "Sending now" };
  }
  if (row.status === "COMPLETED" || row.status === "CANCELLED") {
    return { value: "Ended", sub: campaignWhenLabel(row) };
  }
  return { value: "—", sub: "Campaign window" };
}

export function PromoCampaignCard({
  row,
  scopeLabel,
  onOpen,
  busy,
  style,
}: {
  row: NotificationCampaign;
  scopeLabel: string;
  onOpen: () => void;
  busy: boolean;
  style?: React.CSSProperties;
}) {
  const meta = campaignStatusMeta(row.status);
  const rate = deliveryRate(row);
  const isFlash = row.campaignType === "FLASH_SALE";
  const accent = promoTypeAccent(row.campaignType);
  const TypeIcon = isFlash ? Zap : Sparkles;
  const expiry = expiryLabel(row);
  const isRunning = row.status === "RUNNING";

  return (
    <article
      style={style}
      className={cn(promoCardShell, busy && "pointer-events-none opacity-70")}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", accent.stripe)} aria-hidden />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          accent.glow,
        )}
        aria-hidden
      />
      <button
        type="button"
        onClick={onOpen}
        className="relative flex flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2"
      >
        <div className="flex flex-1 flex-col p-4 pl-5 sm:p-5 sm:pl-6">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
                accent.iconWrap,
              )}
            >
              <TypeIcon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                    promoStatusChipClass(row.status),
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      promoStatusDotClass(row.status),
                      isRunning && "motion-safe:animate-pulse",
                    )}
                    aria-hidden
                  />
                  {meta.label}
                </span>
                <span
                  className={cn(
                    "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                    accent.badge,
                  )}
                >
                  {campaignTypeLabel(row.campaignType)}
                </span>
              </div>
              <h3 className="mt-2 line-clamp-2 font-heading text-base font-semibold leading-snug tracking-tight text-foreground">
                {row.title}
              </h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.name}</p>
            </div>
          </div>

          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {row.body}
          </p>

          {rate != null && row.recipientsTargeted > 0 ? (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="font-medium text-muted-foreground">Delivery</span>
                <span className="font-semibold tabular-nums text-foreground">{rate}%</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted/60 ring-1 ring-inset ring-border/40"
                role="progressbar"
                aria-valuenow={rate}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out",
                    isFlash
                      ? "bg-gradient-to-r from-amber-400 to-orange-500"
                      : "bg-gradient-to-r from-sky-400 to-indigo-500",
                  )}
                  style={{ width: `${Math.min(100, rate)}%` }}
                />
              </div>
            </div>
          ) : null}

          <dl className="mt-4 grid grid-cols-2 gap-2">
            <MetricCell
              label="Reach"
              value={row.recipientsTargeted.toLocaleString()}
              sub="shoppers targeted"
            />
            <MetricCell
              label="Usage"
              value={row.recipientsSent.toLocaleString()}
              sub={rate != null ? `${rate}% delivered` : "not sent yet"}
              highlight={rate != null && rate > 0}
            />
            <MetricCell label="Timing" value={campaignWhenLabel(row)} />
            <MetricCell label="Status" value={expiry.value} sub={expiry.sub} />
          </dl>

          <p className="mt-3 flex items-center gap-1.5 rounded-md bg-muted/20 px-2.5 py-2 text-xs text-muted-foreground ring-1 ring-inset ring-border/30">
            <Users className="size-3.5 shrink-0 text-foreground/50" aria-hidden />
            <span className="truncate">{scopeLabel}</span>
          </p>
        </div>

        <div className={promoCardFooter}>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground transition-colors group-hover:text-primary">
            View & manage
            <ChevronRight
              className="size-3.5 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
          {row.status === "DRAFT" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary/15">
              <Megaphone className="size-3" aria-hidden />
              Ready to launch
            </span>
          ) : row.status === "SCHEDULED" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-800 ring-1 ring-sky-500/20 dark:text-sky-200">
              <CalendarClock className="size-3" aria-hidden />
              Queued
            </span>
          ) : row.status === "RUNNING" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-500/20 dark:text-amber-200">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden />
              Sending
            </span>
          ) : row.status === "COMPLETED" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Clock className="size-3" aria-hidden />
              Archived
            </span>
          ) : null}
        </div>
      </button>
    </article>
  );
}

export function PromoCampaignCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/50 bg-muted/20 ring-1 ring-black/[0.02] dark:ring-white/[0.03]">
      <div className="h-1 w-full animate-pulse bg-muted/50" />
      <div className="space-y-3 p-5 pl-6">
        <div className="flex gap-3">
          <div className="size-10 animate-pulse rounded-lg bg-muted/50" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
            <div className="h-5 w-full animate-pulse rounded bg-muted/50" />
          </div>
        </div>
        <div className="h-10 animate-pulse rounded bg-muted/40" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      </div>
      <div className="h-12 animate-pulse border-t border-border/40 bg-muted/25" />
    </div>
  );
}
