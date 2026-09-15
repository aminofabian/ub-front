"use client";

import { useState } from "react";
import { Boxes, Check, Loader2, RefreshCcw } from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import type { StoreRoomMode } from "@/lib/api";
import { cn } from "@/lib/utils";

const OPTIONS: readonly {
  mode: StoreRoomMode;
  icon: typeof Boxes;
  title: string;
  blurb: string;
  points: readonly string[];
  recommended?: boolean;
  cta: string;
}[] = [
  {
    mode: "standalone",
    icon: Boxes,
    title: "Back-room only",
    blurb: "A shelf list you keep by hand.",
    points: [
      "For anything — cleaning cloths, bags, spares",
      "Counts stay exactly as you type them",
      "Never touches the products you sell",
    ],
    cta: "Use back-room only",
  },
  {
    mode: "connected",
    icon: RefreshCcw,
    title: "Follow inventory",
    blurb: "Counts come from stock and move as products sell.",
    points: [
      "Mirror products you already sell",
      "Counts update the moment a sale is rung up",
      "We match your existing items by barcode first",
    ],
    recommended: true,
    cta: "Follow inventory",
  },
];

/**
 * The first thing a merchant answers about a store room: does it stand on its
 * own, or does it follow the products they sell? Deliberately a two-step pick —
 * choosing a card selects it, the button commits — so nobody lands in the wrong
 * mode by mis-tapping.
 */
export function StoreRoomConnectionChooser({
  itemCount,
  canWrite,
  busy,
  onChoose,
}: {
  itemCount: number;
  canWrite: boolean;
  busy: boolean;
  onChoose: (mode: StoreRoomMode) => void;
}) {
  const [picked, setPicked] = useState<StoreRoomMode | null>(null);

  return (
    <div className={cn(DASHBOARD_SECTION_SURFACE, "p-4 sm:p-6")}>
      <h2 className="text-base font-semibold tracking-tight text-foreground">
        What is this store room for?
      </h2>
      <p className={cn(dashboardHintClass(), "mt-1 max-w-2xl")}>
        Pick one to get started. You can switch later, and nothing is ever deleted
        — your list comes with you either way.
      </p>

      <div
        role="radiogroup"
        aria-label="Store room mode"
        className="mt-5 grid gap-3 sm:grid-cols-2"
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = picked === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={!canWrite || busy}
              onClick={() => setPicked(option.mode)}
              className={cn(
                "flex flex-col border px-3.5 py-3.5 text-left transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)]"
                  : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_30%,transparent)]",
              )}
            >
              <span className="flex items-start gap-3">
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center border",
                    active
                      ? "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
                      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)] text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {option.title}
                    </span>
                    {option.recommended ? (
                      <span className="border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--pos-primary,#0f766e)]">
                        Recommended
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
                    {option.blurb}
                  </span>
                </span>
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border",
                    active
                      ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_25%,transparent)]",
                  )}
                  aria-hidden
                >
                  {active ? <Check className="size-3" /> : null}
                </span>
              </span>

              <ul className="mt-3.5 space-y-1.5 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-3">
                {option.points.map((point) => (
                  <li
                    key={point}
                    className="flex gap-2 text-[12px] leading-snug text-muted-foreground"
                  >
                    <span
                      className="mt-1.5 size-1 shrink-0 rounded-full bg-current opacity-40"
                      aria-hidden
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className={cn(dashboardHintClass(), "max-w-md")}>
          {itemCount > 0
            ? `${itemCount} item${itemCount === 1 ? "" : "s"} already on the list will be kept.`
            : "Your list is empty, so this is a clean start."}
          {!canWrite
            ? " You need catalogue write access to choose."
            : null}
        </p>
        <Button
          type="button"
          className="gap-2 shadow-none"
          disabled={!canWrite || busy || picked == null}
          onClick={() => picked && onChoose(picked)}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {picked == null
            ? "Choose one to continue"
            : OPTIONS.find((option) => option.mode === picked)?.cta}
        </Button>
      </div>
    </div>
  );
}
