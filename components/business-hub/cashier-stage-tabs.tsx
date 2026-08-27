"use client";

import { cn } from "@/lib/utils";
import { HUB_ACCENT } from "@/lib/business-hub/constants";

const DUAL_LANE_MAX = 2;

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return parts[0]!;
}

function modeCopy(selected: string[]): string {
  if (selected.length === 0) return "Floor";
  if (selected.length === 1) return `Solo · ${shortName(selected[0]!)}`;
  if (selected.length === 2) return "Dual";
  return `Gallery · ${selected.length}`;
}

export function CashierStageTabs({
  cashiers,
  selected,
  onChange,
  live = false,
  className,
}: {
  cashiers: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  live?: boolean;
  className?: string;
}) {
  const viewingAll = selected.length === 0;
  const columns = 1 + cashiers.length;

  function selectAll() {
    onChange([]);
  }

  function toggleCashier(name: string) {
    if (selected.includes(name)) {
      onChange(selected.filter((n) => n !== name));
      return;
    }
    onChange([...selected, name]);
  }

  if (cashiers.length === 0) return null;

  return (
    <div className={cn("bg-transparent", className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: HUB_ACCENT }}
          >
            Stage
          </p>
          <span className="text-[11px] text-[#8A8A8A]">{modeCopy(selected)}</span>
        </div>
        {live ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
            <span className="size-1.5 bg-emerald-500 hub-live-beacon" aria-hidden />
            Live
          </span>
        ) : null}
      </div>

      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
        role="tablist"
        aria-label="Cashier lanes"
      >
        <button
          type="button"
          role="tab"
          aria-selected={viewingAll}
          onClick={selectAll}
          className={cn(
            "group relative flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5 text-left transition-colors",
            viewingAll
              ? "border-[#B08D48] bg-[#FCFAF6] text-[#141414] shadow-[0_1px_0_rgba(20,20,20,0.04)]"
              : "border-[#E6E1D8]/90 text-[#141414] hover:border-[#D4C4A0]",
          )}
        >
          <span className="min-w-0">
            <span
              className={cn(
                "block text-[9px] font-semibold uppercase tracking-[0.14em]",
                viewingAll ? "text-[#B08D48]" : "text-[#8A8A8A]",
              )}
            >
              All
            </span>
            <span
              className="mt-0.5 block truncate text-[14px] font-medium leading-tight"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              Floor
            </span>
          </span>
          {viewingAll ? (
            <span
              className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 bg-[#B08D48]"
              aria-hidden
            />
          ) : null}
        </button>

        {cashiers.map((name, index) => {
          const active = selected.includes(name);
          const laneIndex = selected.indexOf(name);
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={active}
              title={
                active
                  ? `Remove ${name}`
                  : selected.length >= DUAL_LANE_MAX
                    ? `Add ${name} · opens till gallery`
                    : selected.length === 1
                      ? `Open dual lane with ${name}`
                      : `Open ${name} lane`
              }
              onClick={() => toggleCashier(name)}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 text-left transition-colors",
                active
                  ? "border-[#B08D48] bg-[#FCFAF6] text-[#141414] shadow-[0_1px_0_rgba(20,20,20,0.04)]"
                  : "border-[#E6E1D8]/90 text-[#141414] hover:border-[#D4C4A0]",
              )}
            >
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums",
                  active ? "text-[#B08D48]" : "text-[#C4BBA8]",
                )}
              >
                {laneIndex >= 0
                  ? String(laneIndex + 1).padStart(2, "0")
                  : String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-[9px] font-semibold uppercase tracking-[0.14em]",
                    active ? "text-[#B08D48]" : "text-[#8A8A8A]",
                  )}
                >
                  Till
                </span>
                <span
                  className="mt-0.5 block truncate text-[14px] font-medium leading-tight"
                  style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
                  title={name}
                >
                  {shortName(name)}
                </span>
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
    </div>
  );
}
