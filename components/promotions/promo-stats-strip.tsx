"use client";

import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  Megaphone,
  Target,
  TrendingUp,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  promoStatAccent,
  promoStatsSkeleton,
  supKicker,
  supStatTile,
} from "./promotions-ui-tokens";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  accentClass,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent: keyof typeof promoStatAccent;
  accentClass?: string;
}) {
  return (
    <div
      className={cn(
        supStatTile,
        "group relative overflow-hidden border-l-[3px] pl-3.5",
        promoStatAccent[accent],
      )}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-primary/[0.04] blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={supKicker}>{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30",
            accentClass ?? "text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
    </div>
  );
}

export type PromoStatsData = {
  drafts: number;
  scheduled: number;
  active: number;
  completed: number;
  totalReach: number;
  totalTargeted: number;
};

export function PromoStatsStrip({
  stats,
  totalCampaigns,
}: {
  stats: PromoStatsData;
  totalCampaigns: number;
}) {
  const deliveryPct =
    stats.totalTargeted > 0
      ? Math.round((stats.totalReach / stats.totalTargeted) * 100)
      : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total campaigns"
        value={String(totalCampaigns)}
        hint={`${stats.drafts} draft · ${stats.scheduled} scheduled`}
        icon={Megaphone}
        accent="default"
      />
      <StatCard
        label="Shoppers reached"
        value={stats.totalReach.toLocaleString()}
        hint={
          deliveryPct != null
            ? `${deliveryPct}% delivery across completed sends`
            : "Delivered notifications to date"
        }
        icon={Target}
        accent="reach"
        accentClass="text-violet-600 dark:text-violet-400"
      />
      <StatCard
        label="Scheduled"
        value={String(stats.scheduled)}
        hint={
          stats.active > 0
            ? `${stats.active} sending now`
            : "Queued for automatic send"
        }
        icon={CalendarClock}
        accent="scheduled"
        accentClass="text-sky-600 dark:text-sky-400"
      />
      <StatCard
        label="Completed"
        value={String(stats.completed)}
        hint="Finished sends in your history"
        icon={TrendingUp}
        accent="completed"
        accentClass="text-emerald-600 dark:text-emerald-400"
      />
    </div>
  );
}

export function PromoStatsStripSkeleton() {
  return (
    <div className={promoStatsSkeleton}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[96px] animate-pulse rounded-lg border border-border/50 bg-muted/25"
        />
      ))}
    </div>
  );
}
