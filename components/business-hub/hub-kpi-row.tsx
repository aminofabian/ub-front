"use client";

import type { LucideIcon } from "lucide-react";

import {
  StatStrip,
  type StatAction,
  type StatItem,
  type StatTone,
} from "@/components/dashboard/stat-strip";

export type HubKpiTint = Extract<
  StatTone,
  "teal" | "emerald" | "violet" | "amber"
>;

export type HubKpiAction = StatAction;

export type HubKpi = {
  id: string;
  label: string;
  value: string;
  /** Short qualifier under the number — margin, denominator, access note. */
  hint?: string;
  /** Signed percentage against the prior period, e.g. `+12.4%`. */
  trend?: string | null;
  trendLabel?: string;
  icon: LucideIcon;
  tint?: HubKpiTint;
  href?: string;
  actions?: HubKpiAction[];
};

/**
 * The numbers a shop owner checks first, one card each.
 * Delegates to the canonical {@link StatStrip} shared with Sales and the ledger.
 */
export function HubKpiRow({ items }: { items: HubKpi[] }) {
  if (items.length === 0) return null;

  const stats: StatItem[] = items.map((kpi) => ({
    id: kpi.id,
    label: kpi.label,
    value: kpi.value,
    hint: kpi.hint,
    trend: kpi.trend,
    trendLabel: kpi.trendLabel,
    icon: kpi.icon,
    tone: kpi.tint ?? "teal",
    href: kpi.href,
    actions: kpi.actions,
  }));

  return <StatStrip items={stats} />;
}
