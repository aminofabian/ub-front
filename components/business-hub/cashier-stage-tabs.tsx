"use client";

import { cn } from "@/lib/utils";
import { HUB_BTN } from "@/lib/business-hub/constants";

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
    <div
      className={cn(
        "flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#141414] before:block before:h-px before:w-2 before:bg-[#B08D48] before:content-['']">
          Stage
        </p>
        <span className="text-[11px] text-[#8A8A8A]">{modeCopy(selected)}</span>
        {live ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800">
            <span
              className="size-1.5 rounded-full bg-emerald-500 hub-live-beacon"
              aria-hidden
            />
            Live
          </span>
        ) : null}
      </div>

      <div
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Cashier lanes"
      >
        <button
          type="button"
          role="tab"
          aria-selected={viewingAll}
          onClick={selectAll}
          className={cn(
            HUB_BTN,
            "inline-flex h-7 shrink-0 items-center px-2.5 text-[12px] font-medium",
            viewingAll
              ? "bg-[#141414] text-[#F5E6C8]"
              : "bg-white text-[#5A5A5A] ring-1 ring-[color-mix(in_srgb,#141414_8%,transparent)] hover:text-[#141414]",
          )}
        >
          Floor
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
                HUB_BTN,
                "inline-flex h-7 max-w-[8.5rem] shrink-0 items-center gap-1.5 px-2.5 text-[12px] font-medium",
                active
                  ? "bg-[#141414] text-[#F5E6C8]"
                  : "bg-white text-[#5A5A5A] ring-1 ring-[color-mix(in_srgb,#141414_8%,transparent)] hover:text-[#141414]",
              )}
            >
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums",
                  active ? "text-[#F5E6C8]/70" : "text-[#C4BBA8]",
                )}
              >
                {laneIndex >= 0
                  ? String(laneIndex + 1).padStart(2, "0")
                  : String(index + 1).padStart(2, "0")}
              </span>
              <span className="truncate" title={name}>
                {shortName(name)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
