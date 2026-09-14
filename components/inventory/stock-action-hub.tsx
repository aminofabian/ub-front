"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, ClipboardList } from "lucide-react";

import type { StockHubAction } from "@/lib/inventory-access";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

const ink = "text-[var(--order-ink,#15231f)]";
const mute =
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]";
const hair =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const teal = "var(--pos-primary,#0f766e)";

export type FullCountProgress = {
  counted: number;
  total: number;
  remaining: number;
  sessionName: string;
};

type StockActionHubProps = {
  actions: readonly StockHubAction[];
  branchName: string;
  departmentLabel: string;
  outCount: number | null;
  lowCount: number | null;
  countsLoading: boolean;
  onOpenLevels: (status?: "out" | "low" | "all") => void;
  /** Open Full count session progress — resume across days. */
  fullCountProgress?: FullCountProgress | null;
};

/**
 * Stock Home — Take stock is the hero (on-hand qty). Full count / audit stay secondary.
 */
export function StockActionHub({
  actions,
  branchName,
  departmentLabel,
  outCount,
  lowCount,
  countsLoading,
  onOpenLevels,
  fullCountProgress,
}: StockActionHubProps) {
  const hero = actions.find((a) => a.rank === "hero");
  const pair = actions.filter((a) => a.rank === "pair");
  const list = actions.filter((a) => a.rank === "list");

  const placeLine = [branchName, departmentLabel].filter(Boolean).join(" · ");
  const countPct =
    fullCountProgress && fullCountProgress.total > 0
      ? Math.min(
          100,
          Math.round(
            (fullCountProgress.counted / fullCountProgress.total) * 100,
          ),
        )
      : 0;

  return (
    <div className="flex flex-col gap-4 px-1 pb-6 pt-1 sm:gap-5 sm:px-0">
      <header className="min-w-0">
        <h1
          className={cn(
            "font-heading text-[1.65rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[1.85rem]",
            ink,
          )}
        >
          Home
        </h1>
        <p className={cn("mt-1.5 max-w-md text-[13px] leading-snug", mute)}>
          Jump into Take stock to set shelf qty, or receive and order from here.
          {placeLine ? (
            <span className="mt-1 block text-[12px] tracking-[-0.01em]">
              {placeLine}
            </span>
          ) : null}
        </p>
      </header>

      {fullCountProgress && fullCountProgress.remaining > 0 ? (
        <Link
          href={APP_ROUTES.inventoryStockTake}
          className={cn(
            "block border bg-white px-3 py-3 transition-colors",
            hair,
            "hover:border-[var(--pos-primary,#0f766e)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
          )}
        >
          <div className="flex items-start gap-2.5">
            <ClipboardList
              className="mt-0.5 size-4 shrink-0 text-[var(--pos-primary,#0f766e)]"
              strokeWidth={1.75}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.12em]",
                  mute,
                )}
              >
                Full count in progress
              </p>
              <p className={cn("mt-0.5 text-[13px] font-semibold", ink)}>
                {fullCountProgress.counted.toLocaleString("en-KE")} of{" "}
                {fullCountProgress.total.toLocaleString("en-KE")} counted
                <span className={cn("ml-1.5 font-normal", mute)}>
                  · {fullCountProgress.remaining.toLocaleString("en-KE")} left
                </span>
              </p>
              <p className={cn("mt-0.5 truncate text-[11px]", mute)}>
                {fullCountProgress.sessionName} — resume tomorrow if needed
              </p>
              <div
                className={cn(
                  "mt-2.5 h-1.5 overflow-hidden border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)]",
                  hair,
                )}
                role="progressbar"
                aria-valuenow={countPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Full count progress"
              >
                <div
                  className="h-full bg-[var(--pos-primary,#0f766e)] transition-[width] duration-300"
                  style={{ width: `${countPct}%` }}
                />
              </div>
            </div>
            <ChevronRight className={cn("mt-1 size-4 shrink-0", mute)} aria-hidden />
          </div>
        </Link>
      ) : null}

      <div className={cn("grid grid-cols-2 gap-px border bg-white", hair)}>
        <button
          type="button"
          onClick={() => onOpenLevels("out")}
          className={cn(
            "flex flex-col items-start gap-0.5 bg-white px-3 py-2.5 text-left transition-colors",
            "hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,white)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
          )}
        >
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.12em]",
              mute,
            )}
          >
            Sold out
          </span>
          <span
            className={cn(
              "font-mono text-[1.35rem] font-semibold tabular-nums leading-none tracking-[-0.02em]",
              (outCount ?? 0) > 0
                ? "text-rose-700 dark:text-rose-300"
                : ink,
            )}
          >
            {countsLoading && outCount == null
              ? "—"
              : (outCount ?? 0).toLocaleString("en-KE")}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onOpenLevels("low")}
          className={cn(
            "flex flex-col items-start gap-0.5 bg-white px-3 py-2.5 text-left transition-colors",
            "hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,white)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
          )}
        >
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.12em]",
              mute,
            )}
          >
            Running low
          </span>
          <span
            className={cn(
              "font-mono text-[1.35rem] font-semibold tabular-nums leading-none tracking-[-0.02em]",
              (lowCount ?? 0) > 0
                ? "text-amber-800 dark:text-amber-200"
                : ink,
            )}
          >
            {countsLoading && lowCount == null
              ? "—"
              : (lowCount ?? 0).toLocaleString("en-KE")}
          </span>
        </button>
      </div>

      {hero ? (
        <Link
          href={hero.href}
          className={cn(
            "group relative flex min-h-[5.75rem] items-end overflow-hidden border px-4 py-4 text-white sm:min-h-[6.5rem] sm:px-5 sm:py-5",
            "transition-[transform,opacity] duration-200 ease-out active:scale-[0.99]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)] focus-visible:ring-offset-2",
          )}
          style={{
            background: `linear-gradient(135deg, ${teal} 0%, color-mix(in srgb, ${teal} 72%, #0a3d38) 100%)`,
            borderColor: teal,
          }}
        >
          <span
            className="pointer-events-none absolute -right-6 -top-8 size-28 rotate-12 opacity-[0.12]"
            aria-hidden
          >
            <hero.icon className="size-full" strokeWidth={1.25} />
          </span>
          <span className="relative flex w-full items-end justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-[1.4rem] font-semibold tracking-[-0.02em] sm:text-[1.55rem]">
                {hero.label}
              </span>
              <span className="mt-1 block text-[13px] text-white/80">
                {hero.hint}
              </span>
            </span>
            <ArrowRight
              className="mb-0.5 size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </Link>
      ) : null}

      {pair.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {pair.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                "group flex min-h-[5.25rem] flex-col justify-between border bg-white px-3 py-3 transition-colors",
                hair,
                "hover:border-[var(--pos-primary,#0f766e)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
              )}
            >
              <action.icon
                className="size-5 text-[var(--pos-primary,#0f766e)]"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[14px] font-semibold tracking-[-0.015em]",
                    ink,
                  )}
                >
                  {action.label}
                </span>
                <span className={cn("mt-0.5 block text-[11px] leading-snug", mute)}>
                  {action.hint}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {list.length > 0 ? (
        <div className={cn("divide-y border bg-white", hair)}>
          {list.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                "flex min-h-12 items-center gap-3 px-3 py-2.5 transition-colors",
                "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
              )}
            >
              <action.icon
                className={cn("size-4 shrink-0", mute)}
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-[13px] font-semibold tracking-[-0.01em]",
                    ink,
                  )}
                >
                  {action.label}
                </span>
                <span className={cn("block text-[11px]", mute)}>
                  {action.hint}
                </span>
              </span>
              <ChevronRight className={cn("size-4 shrink-0", mute)} aria-hidden />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
