"use client";

import { cn } from "@/lib/utils";

const MAX_LANES = 2;

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
  const dual = selected.length === 2;

  function selectAll() {
    onChange([]);
  }

  function toggleCashier(name: string) {
    if (selected.includes(name)) {
      onChange(selected.filter((n) => n !== name));
      return;
    }
    if (selected.length === 0) {
      onChange([name]);
      return;
    }
    if (selected.length === 1) {
      onChange([...selected, name]);
      return;
    }
    // Already two lanes — swap the oldest for the new pick.
    onChange([selected[1]!, name]);
  }

  if (cashiers.length === 0) return null;

  return (
    <div
      className={cn(
        "hub-rise relative border border-[#E6E1D8] bg-white",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(176,141,72,0.65), transparent)",
        }}
        aria-hidden
      />

      <div className="flex flex-wrap items-end justify-between gap-3 px-3.5 pb-2.5 pt-3 sm:px-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B08D48]">
            Cashier stage
          </p>
          <p className="mt-0.5 text-[11px] text-[#8A8A8A]">
            {viewingAll
              ? "Floor feed · every till"
              : dual
                ? "Dual lanes · compare two tills"
                : `Solo lane · ${selected[0]}`}
          </p>
        </div>
        <p className="text-[10px] text-[#AAAAAA]">
          {dual
            ? "Tap a third cashier to swap a lane"
            : "Tap one for solo · tap a second for dual"}
        </p>
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto px-3.5 pb-3 sm:px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Cashier lanes"
      >
        <button
          type="button"
          role="tab"
          aria-selected={viewingAll}
          onClick={selectAll}
          className={cn(
            "group relative flex min-w-[4.5rem] shrink-0 flex-col items-center gap-1.5 border px-3 py-2.5 transition-all duration-300",
            viewingAll
              ? "border-[#141414] bg-[#141414] text-[#F5E6C8]"
              : "border-[#E6E1D8] bg-[#FCFAF6] text-[#666666] hover:border-[#B08D48]",
          )}
        >
          <span
            className={cn(
              "flex size-8 items-center justify-center text-[11px] font-semibold tracking-wide",
              viewingAll
                ? "bg-[#B08D48] text-[#141414]"
                : "bg-white text-[#8A8A8A] ring-1 ring-[#E6E1D8]",
            )}
          >
            All
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
            Floor
          </span>
          {live && viewingAll ? (
            <span className="absolute right-1.5 top-1.5 size-1.5 bg-emerald-400 hub-live-beacon" />
          ) : null}
        </button>

        {cashiers.map((name) => {
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
                  ? `Remove ${name} lane`
                  : selected.length >= MAX_LANES
                    ? `Swap into lane with ${name}`
                    : selected.length === 1
                      ? `Open dual lane with ${name}`
                      : `Open ${name} lane`
              }
              onClick={() => toggleCashier(name)}
              className={cn(
                "group relative flex min-w-[5.25rem] max-w-[8rem] shrink-0 flex-col items-center gap-1.5 border px-3 py-2.5 transition-all duration-300",
                active
                  ? "border-[#B08D48] bg-[#F9F6F0] text-[#8A6B2E]"
                  : "border-[#E6E1D8] bg-white text-[#666666] hover:border-[#B08D48]",
              )}
            >
              {laneIndex >= 0 ? (
                <span className="absolute left-1.5 top-1 font-mono text-[9px] tabular-nums text-[#C4BBA8]">
                  {String(laneIndex + 1).padStart(2, "0")}
                </span>
              ) : null}
              <span
                className={cn(
                  "flex size-8 items-center justify-center text-[11px] font-semibold tracking-wide transition-colors",
                  active
                    ? "bg-[#141414] text-[#F5E6C8]"
                    : "bg-[#FCFAF6] text-[#8A8A8A] ring-1 ring-[#E6E1D8] group-hover:ring-[#B08D48]",
                )}
              >
                {initials(name)}
              </span>
              <span className="w-full truncate text-center text-[10px] font-semibold tracking-[0.04em]">
                {shortName(name)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
