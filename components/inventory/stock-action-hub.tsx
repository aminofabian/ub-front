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
 * Soft washes for the services board, cycled by position so the grid reads as
 * one family (M-Pesa-style tiles) without rainbow noise. Each tone pairs a
 * fill with its own readable ink for the icon.
 */
const TILE_TONES = [
  {
    bg: "bg-[color-mix(in_srgb,#0f766e_7%,white)] dark:bg-[color-mix(in_srgb,#0f766e_22%,#0c1512)]",
    icon: "text-[#0f766e] dark:text-[#2dd4bf]",
  },
  {
    bg: "bg-[color-mix(in_srgb,#0369a1_7%,white)] dark:bg-[color-mix(in_srgb,#0369a1_24%,#0c1512)]",
    icon: "text-[#0369a1] dark:text-[#38bdf8]",
  },
  {
    bg: "bg-[color-mix(in_srgb,#b45309_8%,white)] dark:bg-[color-mix(in_srgb,#b45309_24%,#0c1512)]",
    icon: "text-[#b45309] dark:text-[#fbbf24]",
  },
  {
    bg: "bg-[color-mix(in_srgb,#6d28d9_7%,white)] dark:bg-[color-mix(in_srgb,#6d28d9_24%,#0c1512)]",
    icon: "text-[#6d28d9] dark:text-[#a78bfa]",
  },
  {
    bg: "bg-[color-mix(in_srgb,#be123c_6%,white)] dark:bg-[color-mix(in_srgb,#be123c_22%,#0c1512)]",
    icon: "text-[#be123c] dark:text-[#fb7185]",
  },
  {
    bg: "bg-[color-mix(in_srgb,#047857_7%,white)] dark:bg-[color-mix(in_srgb,#047857_22%,#0c1512)]",
    icon: "text-[#047857] dark:text-[#34d399]",
  },
] as const;

/** Stock Home — the jobs board: hero banner, attention pair, services grid. */
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
  const services = [...pair, ...list];

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
  const outN = outCount ?? 0;
  const lowN = lowCount ?? 0;
  const phoneFill = (3 - (services.length % 3)) % 3;

  return (
    <div className="flex flex-col gap-3.5 px-0.5 pb-8 pt-1 sm:gap-5 sm:px-0 sm:pb-6">
      <header className="min-w-0">
        <h1
          className={cn(
            "font-heading text-[1.75rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[1.85rem]",
            ink,
          )}
        >
          Stock
        </h1>
        <p className={cn("mt-1 max-w-md text-[13px] leading-snug", mute)}>
          {placeLine ? (
            <span className="block tracking-[-0.01em]">{placeLine}</span>
          ) : (
            "Shelf qty, orders, and receive — one place."
          )}
        </p>
      </header>

      {fullCountProgress && fullCountProgress.remaining > 0 ? (
        <Link
          href={APP_ROUTES.inventoryStockTake}
          className={cn(
            "block border bg-white px-3.5 py-3.5 transition-colors active:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]",
            hair,
            "hover:border-[var(--pos-primary,#0f766e)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
          )}
        >
          <div className="flex items-start gap-3">
            <ClipboardList
              className="mt-0.5 size-5 shrink-0 text-[var(--pos-primary,#0f766e)]"
              strokeWidth={1.75}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className={cn("text-[13px] font-semibold", ink)}>
                Full count · {fullCountProgress.counted.toLocaleString("en-KE")}/
                {fullCountProgress.total.toLocaleString("en-KE")}
                <span className={cn("ml-1.5 font-normal", mute)}>
                  · {fullCountProgress.remaining.toLocaleString("en-KE")} left
                </span>
              </p>
              <p className={cn("mt-0.5 truncate text-[12px]", mute)}>
                {fullCountProgress.sessionName}
              </p>
              <div
                className={cn(
                  "mt-2.5 h-2 overflow-hidden bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)]",
                  hair,
                  "border",
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
            <ChevronRight className={cn("mt-1 size-5 shrink-0", mute)} aria-hidden />
          </div>
        </Link>
      ) : null}

      {/* Attention strip — first things to fix */}
      <div className={cn("grid grid-cols-2 gap-2")}>
        <button
          type="button"
          onClick={() => onOpenLevels("out")}
          className={cn(
            "flex min-h-[4.75rem] flex-col justify-between border bg-white px-3.5 py-3 text-left transition-colors",
            hair,
            outN > 0
              ? "border-rose-300/80 bg-rose-50/80 dark:border-rose-500/30 dark:bg-rose-500/10"
              : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
          )}
        >
          <span
            className={cn(
              "text-[11px] font-semibold tracking-[-0.01em]",
              outN > 0 ? "text-rose-800 dark:text-rose-200" : mute,
            )}
          >
            Sold out
          </span>
          <span className="flex items-end justify-between gap-2">
            <span
              className={cn(
                "font-mono text-[1.75rem] font-semibold tabular-nums leading-none tracking-[-0.03em]",
                outN > 0 ? "text-rose-700 dark:text-rose-300" : ink,
              )}
            >
              {countsLoading && outCount == null
                ? "—"
                : outN.toLocaleString("en-KE")}
            </span>
            <span
              className={cn(
                "mb-0.5 text-[11px] font-semibold",
                outN > 0
                  ? "text-rose-700 dark:text-rose-300"
                  : "text-[var(--pos-primary,#0f766e)]",
              )}
            >
              Fix →
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onOpenLevels("low")}
          className={cn(
            "flex min-h-[4.75rem] flex-col justify-between border bg-white px-3.5 py-3 text-left transition-colors",
            hair,
            lowN > 0
              ? "border-amber-300/80 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10"
              : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
          )}
        >
          <span
            className={cn(
              "text-[11px] font-semibold tracking-[-0.01em]",
              lowN > 0 ? "text-amber-900 dark:text-amber-200" : mute,
            )}
          >
            Running low
          </span>
          <span className="flex items-end justify-between gap-2">
            <span
              className={cn(
                "font-mono text-[1.75rem] font-semibold tabular-nums leading-none tracking-[-0.03em]",
                lowN > 0 ? "text-amber-800 dark:text-amber-200" : ink,
              )}
            >
              {countsLoading && lowCount == null
                ? "—"
                : lowN.toLocaleString("en-KE")}
            </span>
            <span
              className={cn(
                "mb-0.5 text-[11px] font-semibold",
                lowN > 0
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-[var(--pos-primary,#0f766e)]",
              )}
            >
              Fix →
            </span>
          </span>
        </button>
      </div>

      {hero ? (
        <Link
          href={hero.href}
          className={cn(
            "group relative flex min-h-[6.5rem] items-end overflow-hidden border px-4 py-4 text-white sm:min-h-[6.5rem] sm:px-5 sm:py-5",
            "transition-[transform,opacity] duration-150 ease-out active:scale-[0.985]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)] focus-visible:ring-offset-2",
          )}
          style={{
            background: `linear-gradient(145deg, ${teal} 0%, color-mix(in srgb, ${teal} 68%, #062e2a) 100%)`,
            borderColor: teal,
          }}
        >
          <span
            className="pointer-events-none absolute -right-4 -top-6 size-32 rotate-12 opacity-[0.14]"
            aria-hidden
          >
            <hero.icon className="size-full" strokeWidth={1.25} />
          </span>
          <span className="relative flex w-full items-end justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-[1.55rem] font-semibold tracking-[-0.025em] sm:text-[1.55rem]">
                {hero.label}
              </span>
              <span className="mt-1.5 block max-w-[16rem] text-[13px] leading-snug text-white/85">
                {hero.hint || "Tap a product, set the shelf qty, save."}
              </span>
            </span>
            <span className="mb-0.5 inline-flex size-11 shrink-0 items-center justify-center bg-white/15">
              <ArrowRight className="size-5" aria-hidden />
            </span>
          </span>
        </Link>
      ) : null}

      {/* Phone: services board — label top-left, icon bottom-right, tinted
          fills, hairline dividers, square corners. */}
      {services.length > 0 ? (
        <section aria-label="Inventory tools" className="sm:hidden">
          <p
            className={cn(
              "px-0.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]",
              mute,
            )}
          >
            Inventory tools
          </p>
          <div
            className={cn(
              "grid grid-cols-3 gap-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
            )}
          >
            {services.map((action, index) => {
              const tone = TILE_TONES[index % TILE_TONES.length]!;
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className={cn(
                    "flex min-h-[5.75rem] flex-col items-start justify-between gap-2 p-2.5 transition-colors",
                    "active:brightness-[0.96]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
                    tone.bg,
                  )}
                >
                  <span
                    className={cn(
                      "text-[12.5px] font-semibold leading-[1.2] tracking-[-0.01em]",
                      ink,
                    )}
                  >
                    {action.label}
                  </span>
                  <action.icon
                    className={cn("size-7 self-end", tone.icon)}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </Link>
              );
            })}
            {Array.from({ length: phoneFill }).map((_, index) => (
              <span
                key={`fill-${index}`}
                aria-hidden
                className="min-h-[5.75rem] bg-white dark:bg-[#0c1512]"
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Tablet and up: ranked desk — pair cards, then the row list. */}
      {pair.length > 0 ? (
        <div className="hidden gap-2 sm:grid sm:grid-cols-2">
          {pair.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                "group flex min-h-[5.75rem] flex-col justify-between border bg-white px-3.5 py-3.5 transition-colors",
                hair,
                "active:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]",
                "hover:border-[var(--pos-primary,#0f766e)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
              )}
            >
              <action.icon
                className="size-6 text-[var(--pos-primary,#0f766e)]"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[15px] font-semibold tracking-[-0.015em]",
                    ink,
                  )}
                >
                  {action.label}
                </span>
                <span className={cn("mt-0.5 block text-[12px] leading-snug", mute)}>
                  {action.hint}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {list.length > 0 ? (
        <div
          className={cn(
            "hidden divide-y border bg-white sm:block",
            hair,
          )}
        >
          {list.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                "flex min-h-14 items-center gap-3 px-3.5 py-3 transition-colors",
                "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]",
                "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]",
                  hair,
                )}
              >
                <action.icon
                  className={cn("size-4", mute)}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-[14px] font-semibold tracking-[-0.01em]",
                    ink,
                  )}
                >
                  {action.label}
                </span>
                <span className={cn("block text-[12px]", mute)}>
                  {action.hint}
                </span>
              </span>
              <ChevronRight className={cn("size-5 shrink-0", mute)} aria-hidden />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
