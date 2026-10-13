"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

/**
 * The shop's number strip — one canonical stat card used by the business hub,
 * Sales, and the day ledger. Phone-first: two columns, values never below 15px,
 * actions 44px tall on phones. Desktop keeps the same card look.
 */

export type StatTone =
  | "teal"
  | "emerald"
  | "violet"
  | "amber"
  | "ink"
  | "owed"
  | "neutral";

export type StatAction = {
  label: string;
  onClick: () => void;
  emphasize?: boolean;
};

export type StatItem = {
  id: string;
  label: string;
  value: string;
  /** Short qualifier under the number — denominator, access note. */
  hint?: string;
  /** Signed percentage against the prior period, e.g. `+12.4%`. */
  trend?: string | null;
  trendLabel?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  href?: string;
  actions?: StatAction[];
  /** Embedded content — sparkline, progress bar, tender bars. */
  children?: ReactNode;
};

const TINTS: Record<StatTone, string> = {
  teal: "bg-[#E6F2F0] text-[#0f766e]",
  emerald: "bg-[#E6F4EC] text-[#047857]",
  violet: "bg-[#EEEBF8] text-[#5B4DBE]",
  amber: "bg-[#FBEBD2] text-[#B45309]",
  ink: "bg-[color-mix(in_srgb,#141414_5%,white)] text-[#141414]",
  owed: "bg-[#FDECEC] text-[#B4342F]",
  neutral: "bg-[color-mix(in_srgb,#141414_5%,white)] text-[#6F6F6F]",
};

/** Phone cue: a tone dot keeps the colour signal when the icon box is dropped. */
const DOTS: Record<StatTone, string> = {
  teal: "bg-[#0f766e]",
  emerald: "bg-[#047857]",
  violet: "bg-[#5B4DBE]",
  amber: "bg-[#B45309]",
  ink: "bg-[#141414]",
  owed: "bg-[#B4342F]",
  neutral: "bg-[#6F6F6F]",
};

function trendDirection(trend?: string | null): "up" | "down" | null {
  if (!trend) return null;
  return trend.startsWith("-") || trend.startsWith("<-") ? "down" : "up";
}

function StatCard({ item }: { item: StatItem }) {
  const Icon = item.icon;
  const direction = trendDirection(item.trend);
  const TrendIcon = direction === "down" ? ArrowDownRight : ArrowUpRight;
  const surface = cn(HUB_SURFACE, "flex min-w-0 flex-col p-2");

  const content = (
    <>
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {Icon ? (
            <span
              className={cn(
                "hidden size-6 shrink-0 items-center justify-center rounded-none sm:flex",
                TINTS[item.tone ?? "teal"],
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
          ) : null}
          {Icon ? (
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full sm:hidden",
                DOTS[item.tone ?? "teal"],
              )}
              aria-hidden
            />
          ) : null}
          <p className="truncate text-[11px] font-medium text-[#6F6F6F]">
            {item.label}
          </p>
        </div>
        {direction ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 rounded-none px-1 py-px text-[10px] font-semibold tabular-nums",
              direction === "down"
                ? "bg-[#FDECEC] text-[#B4342F]"
                : "bg-[#E6F4EC] text-[#047857]",
            )}
          >
            <TrendIcon className="size-2.5" aria-hidden />
            {item.trend}
          </span>
        ) : null}
      </div>

      <p
        className={cn(
          "mt-0.5 truncate font-semibold leading-none tracking-[-0.03em] text-[#141414] tabular-nums",
          item.value.length > 16 ? "text-[13px]" : "text-[15px] sm:text-[17px]",
        )}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {item.value}
      </p>
      {item.hint || item.trendLabel ? (
        <p className="mt-0.5 hidden truncate text-[10px] text-[#8A8A8A] sm:block sm:text-[11px]">
          {item.hint ?? item.trendLabel}
        </p>
      ) : null}
      {item.children ? <div className="mt-2">{item.children}</div> : null}
      {item.actions?.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={cn(
                "inline-flex min-h-7 items-center rounded-none px-2 text-[10px] font-semibold transition-colors sm:min-h-0 sm:px-2 sm:py-0.5",
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
    </>
  );

  if (item.href && !item.actions?.length) {
    return (
      <Link
        href={item.href}
        className={cn(
          surface,
          "transition-colors hover:border-[#0f766e]/35 hover:bg-[#FCFDFD]",
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={surface}>{content}</div>;
}

export function StatStrip({
  items,
  className,
}: {
  items: StatItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-2 gap-1.5 sm:gap-2 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <StatCard key={item.id} item={item} />
      ))}
    </div>
  );
}
