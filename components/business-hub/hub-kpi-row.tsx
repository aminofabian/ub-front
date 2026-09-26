"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export type HubKpiTint = "teal" | "emerald" | "violet" | "amber";

export type HubKpiAction = {
  label: string;
  onClick: () => void;
  emphasize?: boolean;
};

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

const TINTS: Record<HubKpiTint, string> = {
  teal: "bg-[#E6F2F0] text-[#0f766e]",
  emerald: "bg-[#E6F4EC] text-[#047857]",
  violet: "bg-[#EEEBF8] text-[#5B4DBE]",
  amber: "bg-[#FBEBD2] text-[#B45309]",
};

function trendDirection(trend?: string | null): "up" | "down" | null {
  if (!trend) return null;
  return trend.startsWith("-") || trend.startsWith("<-") ? "down" : "up";
}

function KpiCard({ kpi }: { kpi: HubKpi }) {
  const Icon = kpi.icon;
  const direction = trendDirection(kpi.trend);
  const TrendIcon = direction === "down" ? ArrowDownRight : ArrowUpRight;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md",
              TINTS[kpi.tint ?? "teal"],
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </span>
          <p className="truncate text-[11px] font-medium text-[#6F6F6F]">
            {kpi.label}
          </p>
        </div>
        {direction ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              direction === "down"
                ? "bg-[#FDECEC] text-[#B4342F]"
                : "bg-[#E6F4EC] text-[#047857]",
            )}
          >
            <TrendIcon className="size-3" aria-hidden />
            {kpi.trend}
          </span>
        ) : null}
      </div>

      <p
        className="mt-1.5 truncate text-[17px] font-semibold leading-none tracking-[-0.03em] text-[#141414] tabular-nums sm:text-[19px]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {kpi.value}
      </p>
      {kpi.hint || kpi.trendLabel ? (
        <p className="mt-1 truncate text-[10px] text-[#8A8A8A]">
          {kpi.hint ?? kpi.trendLabel}
        </p>
      ) : null}
    </>
  );

  const surface = cn(HUB_SURFACE, "min-w-0 p-2.5 sm:p-3");

  if (kpi.href && !kpi.actions?.length) {
    return (
      <Link
        href={kpi.href}
        className={cn(
          surface,
          "block transition-colors hover:border-[#0f766e]/35 hover:bg-[#FCFDFD]",
        )}
      >
        {body}
      </Link>
    );
  }

  return (
    <div className={surface}>
      {kpi.href ? (
        <Link href={kpi.href} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
      {kpi.actions?.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {kpi.actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors",
                action.emphasize
                  ? "bg-[#FDECEC] text-[#B4342F] hover:bg-[#FBDDDD]"
                  : "bg-[#F1F3F2] text-[#4A4A4A] hover:bg-[#E6EAE9]",
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The four numbers a shop owner checks first, one card each. */
export function HubKpiRow({ items }: { items: HubKpi[] }) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {items.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}
