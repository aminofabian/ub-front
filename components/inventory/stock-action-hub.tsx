"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

import type { StockHubAction } from "@/lib/inventory-access";
import { cn } from "@/lib/utils";

const ink = "text-[var(--order-ink,#15231f)]";
const mute =
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]";
const hair =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const teal = "var(--pos-primary,#0f766e)";

type StockActionHubProps = {
  actions: readonly StockHubAction[];
  branchName: string;
  departmentLabel: string;
  outCount: number | null;
  lowCount: number | null;
  countsLoading: boolean;
  onOpenLevels: (status?: "out" | "low" | "all") => void;
};

/**
 * Take-stock home — count first, then the jobs around keeping shelves honest.
 */
export function StockActionHub({
  actions,
  branchName,
  departmentLabel,
  outCount,
  lowCount,
  countsLoading,
  onOpenLevels,
}: StockActionHubProps) {
  const hero = actions.find((a) => a.rank === "hero");
  const pair = actions.filter((a) => a.rank === "pair");
  const list = actions.filter(
    (a) => a.rank === "list" && a.id !== "levels",
  );
  const levelsAction = actions.find((a) => a.id === "levels");

  const placeLine = [branchName, departmentLabel].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-4 px-1 pb-6 pt-1 sm:gap-5 sm:px-0">
      <header className="min-w-0">
        <h1
          className={cn(
            "font-heading text-[1.65rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[1.85rem]",
            ink,
          )}
        >
          Take stock
        </h1>
        <p className={cn("mt-1.5 max-w-md text-[13px] leading-snug", mute)}>
          Count what’s on the shelf, bring goods in, and keep the room honest.
          {placeLine ? (
            <span className="mt-1 block text-[12px] tracking-[-0.01em]">
              {placeLine}
            </span>
          ) : null}
        </p>
      </header>

      {/* Attention strip — doors into on-hand corrections */}
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
          <span className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", mute)}>
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
          <span className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", mute)}>
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
            "group relative flex min-h-[5.5rem] items-end overflow-hidden border px-4 py-4 text-white sm:min-h-[6.25rem] sm:px-5 sm:py-5",
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
              <span className="block text-[1.35rem] font-semibold tracking-[-0.02em] sm:text-[1.5rem]">
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

      {levelsAction ? (
        <button
          type="button"
          onClick={() => onOpenLevels("all")}
          className={cn(
            "group flex w-full items-center justify-between gap-3 border bg-white px-4 py-3.5 text-left transition-colors",
            hair,
            "hover:border-[var(--pos-primary,#0f766e)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
          )}
        >
          <span className="min-w-0">
            <span
              className={cn(
                "block text-[14px] font-semibold tracking-[-0.015em]",
                ink,
              )}
            >
              {levelsAction.label}
            </span>
            <span className={cn("mt-0.5 block text-[12px]", mute)}>
              {levelsAction.hint}
            </span>
          </span>
          <ArrowRight
            className="size-4 shrink-0 text-[var(--pos-primary,#0f766e)] transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onOpenLevels("all")}
          className={cn(
            "group flex w-full items-center justify-between gap-3 border bg-white px-4 py-3.5 text-left",
            hair,
          )}
        >
          <span className={cn("text-[14px] font-semibold", ink)}>
            Correct on-hand qty
          </span>
          <ArrowRight className="size-4 text-[var(--pos-primary,#0f766e)]" aria-hidden />
        </button>
      )}
    </div>
  );
}
