"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  X,
} from "lucide-react";

import type { StockHubAction } from "@/lib/inventory-access";
import { APP_ROUTES } from "@/lib/config";
import {
  SheetGrabber,
  useSheetDragDismiss,
} from "@/components/ui/sheet-drag";
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
 * Soft washes for the services tiles, cycled by position so the board reads as
 * one calm family rather than a rainbow. Each tone pairs a fill with its own
 * readable ink for the icon.
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

/** One services tile: label top-left, icon bottom-right, tinted fill. */
function ServicesTile({
  action,
  toneIndex,
}: {
  action: StockHubAction;
  toneIndex: number;
}) {
  const tone = TILE_TONES[toneIndex % TILE_TONES.length]!;
  return (
    <Link
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
}

/** The full board — always a closed rectangle, whatever the action count. */
function ServicesGrid({ actions }: { actions: readonly StockHubAction[] }) {
  const fill = (3 - (actions.length % 3)) % 3;
  return (
    <div className="grid grid-cols-3 gap-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
      {actions.map((action, index) => (
        <ServicesTile key={action.id} action={action} toneIndex={index} />
      ))}
      {Array.from({ length: fill }).map((_, index) => (
        <span
          key={`fill-${index}`}
          aria-hidden
          className="min-h-[5.75rem] bg-white dark:bg-[#0c1512]"
        />
      ))}
    </div>
  );
}

/**
 * Phone bottom sheet carrying the full tools board. Behaves like the platform
 * ones: slides up, dims the page, drags down by the grabber, and Escape closes.
 */
function StockToolsSheet({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: readonly StockHubAction[];
}) {
  const [render, setRender] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const { panelRef, grabberProps } = useSheetDragDismiss({
    enabled: open && !leaving,
    onDismiss: onClose,
  });

  useEffect(() => {
    if (open) {
      setRender(true);
      return;
    }
    if (!render) return;
    setLeaving(true);
    const timer = window.setTimeout(() => {
      setRender(false);
      setLeaving(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [open, render]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!render) return null;

  return (
    <div
      className="fixed inset-0 z-50 sm:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Inventory tools"
    >
      <button
        type="button"
        aria-label="Close inventory tools"
        onClick={onClose}
        className={cn(
          "absolute inset-0 cursor-default bg-[#141414]/45",
          leaving
            ? "animate-out fade-out duration-200"
            : "animate-in fade-in duration-250",
        )}
      />

      <div
        ref={panelRef}
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex max-h-[86dvh] flex-col",
          "rounded-t-[1.25rem] bg-white shadow-[0_-16px_48px_-20px_rgba(0,0,0,0.28)]",
          "pb-[env(safe-area-inset-bottom)] dark:bg-[#0c1512]",
          leaving
            ? "animate-out fade-out slide-out-to-bottom duration-200 ease-in"
            : "animate-in fade-in slide-in-from-bottom duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        )}
      >
        <SheetGrabber {...grabberProps} />

        <header
          className={cn(
            "flex shrink-0 items-center gap-3 border-b px-4 pb-2.5",
            hair,
          )}
        >
          <div className="min-w-0 flex-1">
            <h2
              className={cn(
                "font-heading text-[1.05rem] font-semibold leading-none tracking-[-0.02em]",
                ink,
              )}
            >
              Inventory tools
            </h2>
            <p className={cn("mt-1 text-[11px] leading-none", mute)}>
              {actions.length} jobs · drag down to close
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center border bg-white transition-colors",
              hair,
              ink,
              "hover:border-[var(--pos-primary,#0f766e)] hover:text-[var(--pos-primary,#0f766e)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
            )}
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-2">
          <ServicesGrid actions={actions} />
        </div>
      </div>
    </div>
  );
}

/** Stock Home — hero banner, attention pair, and the tools behind a sheet. */
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

  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

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

  // Phone home keeps a single closed row of teasers; the full board lives in
  // the sheet. The last cell is the sheet trigger, so one tap reaches anything.
  const teaser = services.slice(0, 2);
  const teaserCells = teaser.length + 1;
  const teaserFill = (3 - (teaserCells % 3)) % 3;

  return (
    <div className="flex flex-col gap-3 px-0.5 pb-8 pt-1 sm:gap-5 sm:px-0 sm:pb-6">
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

      {/* Attention strip — the two numbers that can cost money today */}
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
            "transition-transform duration-150 ease-out active:scale-[0.985]",
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

      {/* Phone: a teaser row plus the sheet. Tablet up: the ranked desk. */}
      {services.length > 0 ? (
        <>
          <section aria-label="Inventory tools" className="sm:hidden">
            <p
              className={cn(
                "px-0.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]",
                mute,
              )}
            >
              Inventory tools
            </p>
            <div className="grid grid-cols-3 gap-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
              {teaser.map((action, index) => (
                <ServicesTile
                  key={action.id}
                  action={action}
                  toneIndex={index}
                />
              ))}
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-haspopup="dialog"
                className={cn(
                  "flex min-h-[5.75rem] flex-col items-start justify-between gap-2 bg-white p-2.5 text-left transition-colors",
                  "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
                )}
              >
                <span
                  className={cn(
                    "text-[12.5px] font-semibold leading-[1.2] tracking-[-0.01em]",
                    ink,
                  )}
                >
                  All tools
                </span>
                <span
                  className={cn(
                    "inline-flex size-7 items-center justify-center self-end border bg-white",
                    hair,
                  )}
                >
                  <LayoutGrid
                    className="size-4 text-[var(--pos-primary,#0f766e)]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </span>
              </button>
              {Array.from({ length: teaserFill }).map((_, index) => (
                <span
                  key={`fill-${index}`}
                  aria-hidden
                  className="min-h-[5.75rem] bg-white dark:bg-[#0c1512]"
                />
              ))}
            </div>
          </section>

          <StockToolsSheet
            open={sheetOpen}
            onClose={closeSheet}
            actions={services}
          />
        </>
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
