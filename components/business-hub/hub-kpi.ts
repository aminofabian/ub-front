import type { LucideIcon } from "lucide-react";

import type { StatAction, StatTone } from "@/components/dashboard/stat-strip";

export type HubKpiTint = Extract<
  StatTone,
  "teal" | "emerald" | "violet" | "amber"
>;

export type HubKpiAction = StatAction;

/** One of the shop's headline numbers, rendered by {@link HubMoneyHero}. */
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
