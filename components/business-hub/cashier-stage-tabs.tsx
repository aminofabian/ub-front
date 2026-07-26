"use client";

import { cn } from "@/lib/utils";

const DUAL_LANE_MAX = 2;
const GALLERY_MIN = 3;

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
  const gallery = selected.length >= GALLERY_MIN;
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
    <div
      className={cn(
        "overflow-hidden border border-[#E6E1D8] bg-white",
        className,
      )}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `auto repeat(${columns}, minmax(0, 1fr))`,
        }}
        role="tablist"
        aria-label="Cashier lanes"
      >
        <div className="flex items-center gap-2 border-r border-[#E6E1D8] bg-[#FCFAF6] px-2.5 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#B08D48]">
            Stage
          </p>
          <span className="hidden text-[10px] text-[#8A8A8A] lg:inline">
            {modeCopy(selected)}
          </span>
        </div>

        <button
          type="button"
          role="tab"
          aria-selected={viewingAll}
          onClick={selectAll}
          className={cn(
            "relative flex items-center justify-between gap-2 border-r border-[#E6E1D8] px-3 py-2 text-left transition-colors",
            viewingAll
              ? "bg-[#141414] text-[#F5E6C8]"
              : "bg-white text-[#141414] hover:bg-[#FCFAF6]",
          )}
        >
          <span className="min-w-0">
            <span
              className={cn(
                "block text-[9px] font-semibold uppercase tracking-[0.12em]",
                viewingAll ? "text-[#B08D48]" : "text-[#8A8A8A]",
              )}
            >
              All
            </span>
            <span
              className="block truncate text-[13px] font-medium leading-tight"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              Floor
            </span>
          </span>
          {live ? (
            <span
              className={cn(
                "size-1.5 shrink-0 hub-live-beacon",
                viewingAll ? "bg-emerald-400" : "bg-emerald-500",
              )}
              aria-hidden
            />
          ) : null}
          {viewingAll ? (
            <span
              className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[#B08D48]"
              aria-hidden
            />
          ) : null}
        </button>

        {cashiers.map((name, index) => {
          const active = selected.includes(name);
          const laneIndex = selected.indexOf(name);
          const isLast = index === cashiers.length - 1;
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
                "relative flex items-center gap-2 px-3 py-2 text-left transition-colors",
                !isLast && "border-r border-[#E6E1D8]",
                active
                  ? gallery
                    ? "bg-[#141414] text-[#F5E6C8]"
                    : "bg-[#F9F6F0] text-[#8A6B2E]"
                  : "bg-white text-[#141414] hover:bg-[#FCFAF6]",
              )}
            >
              <span
                className={cn(
                  "font-mono text-[9px] tabular-nums",
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
                    "block text-[9px] font-semibold uppercase tracking-[0.12em]",
                    active ? "text-[#B08D48]" : "text-[#8A8A8A]",
                  )}
                >
                  Till
                </span>
                <span
                  className="block truncate text-[13px] font-medium leading-tight"
                  style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
                  title={name}
                >
                  {shortName(name)}
                </span>
              </span>
              {active ? (
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[#B08D48]"
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
