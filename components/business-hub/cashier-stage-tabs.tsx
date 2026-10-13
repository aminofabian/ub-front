"use client";

import { cn } from "@/lib/utils";

const DUAL_LANE_MAX = 2;

const CHIP_BASE =
  "inline-flex h-9 shrink-0 items-center rounded-full px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]";
const CHIP_ON = "bg-[#0f766e] text-white";
const CHIP_OFF = "bg-white text-[#344054] ring-1 ring-black/[0.06] hover:bg-[#f7f9f8]";

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
  className,
}: {
  cashiers: string[];
  selected: string[];
  onChange: (next: string[]) => void;
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
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <div
        className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Cashier lanes"
      >
        <button
          type="button"
          role="tab"
          aria-selected={viewingAll}
          onClick={selectAll}
          className={cn(CHIP_BASE, viewingAll ? CHIP_ON : CHIP_OFF)}
        >
          Floor
        </button>

        {cashiers.map((name) => {
          const active = selected.includes(name);
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
                CHIP_BASE,
                "max-w-[8rem] gap-1.5",
                active ? CHIP_ON : CHIP_OFF,
              )}
            >
              <span className="truncate">{shortName(name)}</span>
            </button>
          );
        })}
      </div>

      <span className="hidden shrink-0 text-[11px] text-[#98a2b3] sm:inline">
        {modeCopy(selected)}
      </span>
    </div>
  );
}
