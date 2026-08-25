"use client";

import { cn } from "@/lib/utils";

const DUAL_LANE_MAX = 2;

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return parts[0]!;
}

function modeCopy(selected: string[]): string {
  if (selected.length === 0) return "Everyone";
  if (selected.length === 1) return shortName(selected[0]!);
  if (selected.length === 2) return "Two tills";
  return `${selected.length} tills`;
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
    <div className={cn("bg-transparent", className)}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <p className="text-[13px] font-semibold tracking-tight text-[#141414]">
            Who sold
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
        className="flex flex-wrap gap-x-3 gap-y-1"
        role="tablist"
        aria-label="Cashier lanes"
      >
        <button
          type="button"
          role="tab"
          aria-selected={viewingAll}
          onClick={selectAll}
          className={cn(
            "group relative pb-1 text-left transition-colors",
            viewingAll
              ? "text-[#141414]"
              : "text-[#8A8A8A] hover:text-[#141414]",
          )}
        >
            <span className="text-[13px] font-medium">Everyone</span>
          {viewingAll ? (
            <span
              className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[#B08D48]"
              aria-hidden
            />
          ) : null}
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
                "relative pb-1 text-left transition-colors",
                active
                  ? "text-[#141414]"
                  : "text-[#8A8A8A] hover:text-[#141414]",
              )}
            >
              <span className="text-[13px] font-medium" title={name}>
                {shortName(name)}
              </span>
              {active ? (
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[#B08D48]"
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
