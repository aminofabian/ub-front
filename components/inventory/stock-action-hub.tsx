"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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
import type { FullCountProgress } from "@/lib/count-cycle/to-full-count-progress";
import {
  SheetGrabber,
  useSheetDragDismiss,
} from "@/components/ui/sheet-drag";
import { cn } from "@/lib/utils";

const ink = "text-[var(--op-ink)]";
const mute = "text-[var(--op-muted)]";
const hair = "border-[var(--op-rule)]";
const ease = "duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";
/* Explicit radius — .premium-stock-levels remaps rounded-xl/lg to 2px. */
const surface =
  "rounded-[12px] border border-[var(--op-rule)] bg-[var(--op-surface)]";
const sectionLabel =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--op-muted)]";
const sectionLink =
  "text-[12px] font-semibold text-[var(--op-accent)] transition-colors hover:text-[var(--op-accent-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--op-bg)]";

type StockWatchItem = {
  itemId: string;
  itemName: string;
  currentStock: number | string;
  reorderLevel: number | string;
};

type StockActionHubProps = {
  actions: readonly StockHubAction[];
  outCount: number | null;
  lowCount: number | null;
  countsLoading: boolean;
  onOpenLevels: (status?: "out" | "low" | "all") => void;
  /** Batch-by-batch full count still running at this branch. */
  fullCountProgress?: FullCountProgress | null;
  /** Products already under their reorder point for this branch. */
  watchlist?: readonly StockWatchItem[];
};

function watchQty(n: number | string | null | undefined): number {
  if (n == null || n === "") return 0;
  const value = typeof n === "number" ? n : Number(n);
  return Number.isFinite(value) ? value : 0;
}

function formatCount(
  loading: boolean,
  value: number | null,
  fallback = 0,
): string {
  if (loading && value == null) return "—";
  return (value ?? fallback).toLocaleString("en-KE");
}

function padToCols(count: number, cols: number): number {
  return (cols - (count % cols)) % cols;
}

/** One tools tile: icon, title, short hint. */
function ToolTile({
  action,
  accent = false,
}: {
  action: StockHubAction;
  accent?: boolean;
}) {
  return (
    <Link
      href={action.href}
      className={cn(
        "group flex h-full min-h-[6.25rem] flex-col gap-3 bg-[var(--op-surface)] p-3.5 transition-colors",
        ease,
        "hover:bg-[color-mix(in_srgb,var(--op-accent)_4%,var(--op-surface))]",
        "active:bg-[color-mix(in_srgb,var(--op-accent)_7%,var(--op-surface))]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--op-accent)]",
      )}
    >
      <span
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
          accent
            ? "bg-[var(--op-accent)] text-[var(--op-surface)]"
            : "bg-[color-mix(in_srgb,var(--op-ink)_6%,var(--op-surface))] text-[var(--op-muted)]",
        )}
      >
        <action.icon className="size-4" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="mt-auto min-w-0">
        <span
          className={cn(
            "block text-[13px] font-semibold leading-tight tracking-[-0.01em]",
            ink,
          )}
        >
          {action.label}
        </span>
        {action.hint ? (
          <span
            className={cn(
              "mt-1 block text-[11.5px] leading-snug line-clamp-2",
              mute,
            )}
          >
            {action.hint}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function ToolsGrid({
  actions,
  colsClass = "grid-cols-2 sm:grid-cols-3",
  fillCols = 3,
}: {
  actions: readonly StockHubAction[];
  colsClass?: string;
  fillCols?: number;
}) {
  const fill = padToCols(actions.length, fillCols);
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-[12px] border border-[var(--op-rule)] bg-[var(--op-rule)]",
        colsClass,
      )}
    >
      {actions.map((action) => (
        <ToolTile
          key={action.id}
          action={action}
          accent={action.rank === "pair"}
        />
      ))}
      {Array.from({ length: fill }).map((_, index) => (
        <span
          key={`fill-${index}`}
          aria-hidden
          className="min-h-[6.25rem] bg-[var(--op-surface)]"
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
      className="fixed inset-0 z-50 lg:hidden"
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
          "premium-portal absolute inset-x-0 bottom-0 z-10 flex max-h-[86dvh] flex-col",
          "rounded-t-2xl border border-[var(--op-rule)] border-b-0 bg-[var(--op-surface)] shadow-[0_-16px_48px_-24px_rgba(18,26,22,0.24)]",
          "pb-[env(safe-area-inset-bottom)]",
          leaving
            ? "animate-out fade-out slide-out-to-bottom duration-200 ease-in"
            : "animate-in fade-in slide-in-from-bottom duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
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
            <h2 className="text-[1.35rem] font-normal leading-none tracking-[-0.02em] text-[var(--op-ink)]">
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
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--op-rule)] bg-[var(--op-surface)] transition-colors",
              ink,
              "hover:border-[var(--op-accent)] hover:text-[var(--op-accent)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)]",
            )}
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3">
          <ToolsGrid actions={actions} />
        </div>
      </div>
    </div>
  );
}

type MetricTone = "alert" | "quiet" | "warn" | "cta";

function MetricCell({
  label,
  value,
  action,
  tone,
  onClick,
  href,
  children,
  className,
}: {
  label: string;
  value?: string;
  action?: string;
  tone: MetricTone;
  onClick?: () => void;
  href?: string;
  children?: ReactNode;
  className?: string;
}) {
  const shell = cn(
    "flex h-full min-h-[5.75rem] flex-col justify-between bg-[var(--op-surface)] p-3.5 text-left transition-colors",
    ease,
    tone === "alert" &&
      "bg-[color-mix(in_srgb,var(--op-highlight)_9%,var(--op-surface))]",
    tone === "warn" &&
      "bg-[color-mix(in_srgb,var(--op-highlight)_5%,var(--op-surface))]",
    tone === "cta" && "bg-[var(--op-accent-deep)] text-[var(--op-surface)]",
    tone === "quiet" &&
      "hover:bg-[color-mix(in_srgb,var(--op-accent)_3%,var(--op-surface))]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--op-accent)]",
    className,
  );

  const body = children ?? (
    <>
      <span
        className={cn(
          "text-[12px] font-medium tracking-[-0.01em]",
          tone === "alert" && "text-[var(--op-highlight)]",
          tone === "warn" && "text-[color-mix(in_srgb,var(--op-highlight)_82%,var(--op-ink))]",
          tone === "quiet" && mute,
          tone === "cta" &&
            "text-[color-mix(in_srgb,var(--op-surface)_78%,transparent)]",
        )}
      >
        {label}
      </span>
      <span className="flex items-end justify-between gap-2">
        <span
          className={cn(
            "font-heading text-[1.85rem] font-semibold tabular-nums leading-none tracking-[-0.03em]",
            tone === "alert" && "text-[var(--op-highlight)]",
            tone === "warn" && "text-[var(--op-highlight)]",
            tone === "quiet" && ink,
            tone === "cta" && "text-[var(--op-surface)]",
          )}
        >
          {value}
        </span>
        {action ? (
          <span
            className={cn(
              "mb-0.5 text-[12px] font-semibold",
              tone === "alert" && "text-[var(--op-highlight)]",
              tone === "warn" && "text-[var(--op-accent)]",
              tone === "quiet" && "text-[var(--op-accent)]",
              tone === "cta" && "text-[var(--op-surface)]",
            )}
          >
            {action}
          </span>
        ) : null}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={shell}>
      {body}
    </button>
  );
}

function SectionHead({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-7 items-baseline justify-between gap-3 px-0.5">
      <h2 className={sectionLabel}>{title}</h2>
      {action}
    </div>
  );
}

/** Stock Home — attention strip, under-reorder desk, and the tools board. */
export function StockActionHub({
  actions,
  outCount,
  lowCount,
  countsLoading,
  onOpenLevels,
  fullCountProgress,
  watchlist = [],
}: StockActionHubProps) {
  const hero = actions.find((a) => a.rank === "hero");
  const pair = actions.filter((a) => a.rank === "pair");
  const list = actions.filter((a) => a.rank === "list");
  const services = [...pair, ...list];

  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

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
  const reorderN = watchlist.length > 0 ? watchlist.length : lowN;
  const watch = watchlist.slice(0, 6);
  const mobileCells = services.slice(0, 5);
  const mobileFill = padToCols(mobileCells.length + (services.length > mobileCells.length ? 1 : 0), 2);

  return (
    <div className="flex flex-col gap-6 px-0.5 pb-8 pt-1 sm:gap-7 sm:px-0 sm:pb-6">
      {fullCountProgress && fullCountProgress.remaining > 0 ? (
        <Link
          href={APP_ROUTES.inventoryStockTakeBatches}
          className={cn(
            "block px-4 py-3.5 transition-colors",
            surface,
            ease,
            "hover:border-[var(--op-accent)]",
            "active:bg-[color-mix(in_srgb,var(--op-accent)_4%,var(--op-surface))]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)]",
          )}
        >
          <div className="flex items-start gap-3">
            <ClipboardList
              className="mt-0.5 size-5 shrink-0 text-[var(--op-accent)]"
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
                {fullCountProgress.detail}
              </p>
              <div
                className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--op-ink)_8%,var(--op-surface))]"
                role="progressbar"
                aria-valuenow={countPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Full count progress"
              >
                <div
                  className={cn("h-full rounded-full bg-[var(--op-accent)] transition-[width]", ease)}
                  style={{ width: `${countPct}%` }}
                />
              </div>
            </div>
            <ChevronRight className={cn("mt-1 size-5 shrink-0", mute)} aria-hidden />
          </div>
        </Link>
      ) : null}

      {/* Attention strip — one board, four equal cells */}
      <div
        className={cn(
          "grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-[var(--op-rule)] bg-[var(--op-rule)]",
          hero ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        <MetricCell
          label="Sold out"
          value={formatCount(countsLoading, outCount)}
          action={outN > 0 ? "Open" : "Clear"}
          tone={outN > 0 ? "alert" : "quiet"}
          onClick={() => onOpenLevels("out")}
        />
        <MetricCell
          label="Running low"
          value={formatCount(countsLoading, lowCount)}
          action={lowN > 0 ? "Open" : "Clear"}
          tone={lowN > 0 ? "warn" : "quiet"}
          onClick={() => onOpenLevels("low")}
        />
        <MetricCell
          label="Under reorder"
          value={formatCount(countsLoading, reorderN)}
          action={reorderN > 0 ? "View" : "Clear"}
          tone="quiet"
          onClick={() => onOpenLevels("low")}
          className="col-span-2 sm:col-span-1"
        />
        {hero ? (
          <MetricCell
            label={hero.label}
            tone="cta"
            href={hero.href}
            className="col-span-2 sm:col-span-1"
          >
            <span className="flex h-full min-h-[4.75rem] flex-col justify-between gap-3">
              <span className="flex items-start justify-between gap-3">
                <span className="text-[12px] font-medium tracking-[-0.01em] text-[color-mix(in_srgb,var(--op-surface)_78%,transparent)]">
                  {hero.label}
                </span>
                <hero.icon
                  className="size-5 shrink-0 text-[color-mix(in_srgb,var(--op-surface)_42%,transparent)]"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </span>
              <span className="flex items-end justify-between gap-3">
                <span className="min-w-0 max-w-[16rem] text-[12.5px] leading-snug text-[color-mix(in_srgb,var(--op-surface)_86%,transparent)]">
                  {watch.length > 0
                    ? "Open the shelf and correct the ones that sell."
                    : hero.hint || "Find a product and set what’s on the shelf."}
                </span>
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--op-surface)_28%,transparent)] bg-[color-mix(in_srgb,var(--op-surface)_12%,transparent)]">
                  <ArrowRight className="size-4 text-[var(--op-surface)]" aria-hidden />
                </span>
              </span>
            </span>
          </MetricCell>
        ) : null}
      </div>

      {/* Desk: under reorder + tools — equal columns, matched headers */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-5">
        <section aria-label="Under reorder" className="flex min-w-0 flex-col">
          <SectionHead
            title="Under reorder"
            action={
              <button
                type="button"
                onClick={() => onOpenLevels("low")}
                className={sectionLink}
              >
                Open the low list
              </button>
            }
          />

          <div className={cn("mt-2.5 flex min-h-0 flex-1 flex-col overflow-hidden", surface)}>
            <div
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_5.5rem_6.25rem] items-center gap-2 border-b px-3.5 py-2.5",
                hair,
              )}
            >
              <span className={cn("text-[10px] font-semibold uppercase tracking-[0.1em]", mute)}>
                Item
              </span>
              <span
                className={cn(
                  "text-right text-[10px] font-semibold uppercase tracking-[0.1em]",
                  mute,
                )}
              >
                On hand
              </span>
              <span className="sr-only">Action</span>
            </div>

            {watch.length > 0 ? (
              <ul className="divide-y divide-[var(--op-rule-soft)]">
                {watch.map((item) => {
                  const onHand = watchQty(item.currentStock);
                  return (
                    <li key={item.itemId}>
                      <button
                        type="button"
                        onClick={() => onOpenLevels("low")}
                        className={cn(
                          "grid w-full grid-cols-[minmax(0,1fr)_5.5rem_6.25rem] items-center gap-2 px-3.5 py-3 text-left transition-colors",
                          ease,
                          "hover:bg-[color-mix(in_srgb,var(--op-accent)_3%,var(--op-surface))]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--op-accent)]",
                        )}
                      >
                        <span
                          className={cn(
                            "min-w-0 truncate text-[14px] font-medium",
                            ink,
                          )}
                        >
                          {item.itemName}
                        </span>
                        <span className="text-right font-heading text-[15px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--op-highlight)]">
                          {onHand.toLocaleString("en-KE")}
                        </span>
                        <span className="flex items-center justify-end gap-1.5">
                          <span
                            className={cn(
                              "inline-flex h-7 items-center rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-[0.06em]",
                              "bg-[color-mix(in_srgb,var(--op-highlight)_10%,var(--op-surface))] text-[var(--op-highlight)]",
                            )}
                          >
                            Recount
                          </span>
                          <ChevronRight
                            className={cn("size-4 shrink-0", mute)}
                            aria-hidden
                          />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                <p className={cn("text-[14px] font-medium", ink)}>
                  Nothing under reorder
                </p>
                <p className={cn("mt-1 max-w-[22ch] text-[12.5px] leading-snug", mute)}>
                  When stock dips below the reorder point, it shows up here.
                </p>
              </div>
            )}
          </div>
        </section>

        {services.length > 0 ? (
          <section
            aria-label="Orders and stock tools"
            className="flex min-w-0 flex-col"
          >
            <SectionHead
              title="Orders and stock tools"
              action={
                <span className={cn("text-[12px] tabular-nums", mute)}>
                  {services.length} jobs
                </span>
              }
            />

            {/* Phone: compact board + sheet for the rest */}
            <div className="mt-2.5 flex-1 lg:hidden">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-[var(--op-rule)] bg-[var(--op-rule)]">
                {mobileCells.map((action) => (
                  <ToolTile
                    key={action.id}
                    action={action}
                    accent={action.rank === "pair"}
                  />
                ))}
                {services.length > mobileCells.length ? (
                  <button
                    type="button"
                    onClick={() => setSheetOpen(true)}
                    aria-haspopup="dialog"
                    className={cn(
                      "flex min-h-[6.25rem] flex-col gap-3 bg-[var(--op-surface)] p-3.5 text-left transition-colors",
                      ease,
                      "active:bg-[color-mix(in_srgb,var(--op-accent)_4%,var(--op-surface))]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--op-accent)]",
                    )}
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--op-ink)_6%,var(--op-surface))] text-[var(--op-muted)]">
                      <LayoutGrid className="size-4" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="mt-auto min-w-0">
                      <span
                        className={cn(
                          "block text-[13px] font-semibold leading-tight tracking-[-0.01em]",
                          ink,
                        )}
                      >
                        All tools
                      </span>
                      <span className={cn("mt-1 block text-[11.5px] leading-snug", mute)}>
                        {services.length} jobs on the desk
                      </span>
                    </span>
                  </button>
                ) : null}
                {Array.from({ length: mobileFill }).map((_, index) => (
                  <span
                    key={`mfill-${index}`}
                    aria-hidden
                    className="min-h-[6.25rem] bg-[var(--op-surface)]"
                  />
                ))}
              </div>
            </div>

            {/* Desktop: full descriptive board */}
            <div className="mt-2.5 hidden flex-1 lg:block">
              <ToolsGrid actions={services} />
            </div>

            <StockToolsSheet
              open={sheetOpen}
              onClose={closeSheet}
              actions={services}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
