"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { RecentTicksRail } from "@/components/business-hub/recent-ticks-rail";
import {
  filterDrawoutsByCashiers,
  type HubDrawout,
} from "@/lib/business-hub/drawouts-for-hub";
import { filterTicksByCashiers } from "@/lib/business-hub/ticks-from-transactions";
import type { RecentTick } from "@/lib/business-hub/ticks-from-transactions";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return parts[0]!;
}

export function CashierTillDrawer({
  open,
  cashiers,
  ticks,
  drawouts = [],
  currency,
  live = false,
  justUpdated = false,
  onClose,
  onRemoveCashier,
}: {
  open: boolean;
  cashiers: string[];
  ticks: RecentTick[];
  drawouts?: HubDrawout[];
  currency?: string | null;
  live?: boolean;
  justUpdated?: boolean;
  onClose: () => void;
  onRemoveCashier?: (name: string) => void;
}) {
  const [activeCashier, setActiveCashier] = useState(cashiers[0] ?? "");

  useEffect(() => {
    if (!open) return;
    if (cashiers.length === 0) return;
    if (!cashiers.includes(activeCashier)) {
      setActiveCashier(cashiers[0]!);
    }
  }, [open, cashiers, activeCashier]);

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

  if (!open || cashiers.length === 0) return null;

  const activeTicks = filterTicksByCashiers(ticks, [activeCashier]);
  const activeDrawouts = filterDrawoutsByCashiers(drawouts, [activeCashier]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#141414]/40"
      role="dialog"
      aria-modal="true"
      aria-label="Cashier till gallery"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close till gallery"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-10 flex h-[100dvh] w-full flex-col bg-white",
          "animate-in fade-in slide-in-from-bottom duration-300 sm:slide-in-from-right",
        )}
      >
        <header className="shrink-0 border-b border-[#E6E1D8] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B08D48]">
                Till gallery
              </p>
              <p
                className="mt-1 text-xl font-medium tracking-tight text-[#141414]"
                style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
              >
                {cashiers.length} cashiers on stage
              </p>
              <p className="mt-0.5 text-[11px] text-[#8A8A8A]">
                Switch tabs to read each till tape · Esc to close
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-9 items-center justify-center border border-[#E6E1D8] text-[#666666] transition-colors hover:border-[#B08D48] hover:text-[#8A6B2E]"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div
            className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Cashiers in gallery"
          >
            {cashiers.map((name, index) => {
              const active = name === activeCashier;
              return (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCashier(name)}
                  onDoubleClick={() => onRemoveCashier?.(name)}
                  title={
                    onRemoveCashier
                      ? `View ${name} · double-click to remove`
                      : name
                  }
                  className={cn(
                    "relative flex min-w-[5.5rem] max-w-[9rem] shrink-0 flex-col items-center gap-1 border bg-white px-3 py-2 transition-colors",
                    active
                      ? "border-[#B08D48] text-[#141414]"
                      : "border-[#E6E1D8] text-[#666666] hover:border-[#D4C4A0]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-1.5 top-1 font-mono text-[9px] tabular-nums",
                      active ? "text-[#B08D48]" : "text-[#C4BBA8]",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center text-[10px] font-semibold",
                      active
                        ? "border border-[#B08D48] bg-[#F9F6F0] text-[#8A6B2E]"
                        : "border border-[#E6E1D8] bg-white text-[#8A8A8A]",
                    )}
                  >
                    {initials(name)}
                  </span>
                  <span className="w-full truncate text-center text-[10px] font-semibold tracking-[0.04em]">
                    {shortName(name)}
                  </span>
                  {active ? (
                    <span
                      className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 bg-[#B08D48]"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden pb-[env(safe-area-inset-bottom)]">
          <RecentTicksRail
            key={activeCashier}
            ticks={activeTicks}
            drawouts={activeDrawouts}
            currency={currency}
            live={live}
            justUpdated={justUpdated}
            title={activeCashier}
            subtitle={
              activeDrawouts.length > 0
                ? `Sales & drawouts · ${shortName(activeCashier)}`
                : `Last 3 · ${shortName(activeCashier)}`
            }
            showCashier={false}
            accent="brass"
            fillViewport={false}
            className="h-full min-h-0 border-0"
          />
        </div>
      </div>
    </div>
  );
}
