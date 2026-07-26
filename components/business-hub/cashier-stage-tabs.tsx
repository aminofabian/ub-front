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
  if (selected.length === 0) return "Floor · every till";
  if (selected.length === 1) return `Solo · ${shortName(selected[0]!)}`;
  if (selected.length === 2) return "Dual · side-by-side";
  return `Gallery · ${selected.length} tills`;
}

function hintCopy(selected: string[]): string {
  if (selected.length === 0) return "Tap a cashier for solo";
  if (selected.length === 1) return "Tap another for dual lanes";
  if (selected.length === 2) return "Tap a third for full-screen gallery";
  return "Switch inside the gallery · Esc closes";
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
        "hub-rise overflow-hidden border border-[#E6E1D8] bg-white",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#E6E1D8] bg-[#FCFAF6] px-3 py-1.5 sm:px-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B08D48]">
            Stage
          </p>
          <span className="text-[#D0C6B4]" aria-hidden>
            /
          </span>
          <p className="truncate text-[11px] text-[#5A5A5A]">{modeCopy(selected)}</p>
        </div>
        <p className="hidden shrink-0 text-[10px] text-[#9A9A9A] sm:block">
          {hintCopy(selected)}
        </p>
      </div>

      <div
        className="grid"
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
            "relative flex min-h-[4.25rem] flex-col justify-center gap-1 border-r border-[#E6E1D8] px-3 py-3 text-left transition-colors sm:px-4",
            viewingAll
              ? "bg-[#141414] text-[#F5E6C8]"
              : "bg-white text-[#141414] hover:bg-[#FCFAF6]",
          )}
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.14em]",
                viewingAll ? "text-[#B08D48]" : "text-[#8A8A8A]",
              )}
            >
              All
            </span>
            {live ? (
              <span
                className={cn(
                  "size-1.5 hub-live-beacon",
                  viewingAll ? "bg-emerald-400" : "bg-emerald-500",
                )}
                aria-hidden
              />
            ) : null}
          </span>
          <span
            className={cn(
              "text-sm font-medium tracking-tight sm:text-base",
              viewingAll ? "text-[#F5E6C8]" : "text-[#141414]",
            )}
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            Floor
          </span>
          <span
            className={cn(
              "text-[10px]",
              viewingAll ? "text-[#A89878]" : "text-[#9A9A9A]",
            )}
          >
            Every till
          </span>
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
                "relative flex min-h-[4.25rem] flex-col justify-center gap-1 px-3 py-3 text-left transition-colors sm:px-4",
                !isLast && "border-r border-[#E6E1D8]",
                active
                  ? gallery
                    ? "bg-[#141414] text-[#F5E6C8]"
                    : "bg-[#F9F6F0] text-[#8A6B2E]"
                  : "bg-white text-[#141414] hover:bg-[#FCFAF6]",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums",
                    active
                      ? gallery
                        ? "text-[#B08D48]"
                        : "text-[#B08D48]"
                      : "text-[#C4BBA8]",
                  )}
                >
                  {laneIndex >= 0
                    ? String(laneIndex + 1).padStart(2, "0")
                    : String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.12em]",
                    active
                      ? gallery
                        ? "text-[#B08D48]"
                        : "text-[#B08D48]"
                      : "text-[#8A8A8A]",
                  )}
                >
                  Till
                </span>
              </span>
              <span
                className={cn(
                  "truncate text-sm font-medium tracking-tight sm:text-base",
                  active && gallery
                    ? "text-[#F5E6C8]"
                    : active
                      ? "text-[#141414]"
                      : "text-[#141414]",
                )}
                style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
                title={name}
              >
                {shortName(name)}
              </span>
              <span
                className={cn(
                  "truncate text-[10px]",
                  active
                    ? gallery
                      ? "text-[#A89878]"
                      : "text-[#8A6B2E]/80"
                    : "text-[#9A9A9A]",
                )}
              >
                {active
                  ? gallery
                    ? "In gallery"
                    : selected.length === 1
                      ? "Solo lane"
                      : `Lane ${laneIndex + 1}`
                  : "Tap to open"}
              </span>
              {active ? (
                <span
                  className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-0 h-0.5",
                    gallery ? "bg-[#B08D48]" : "bg-[#B08D48]",
                  )}
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
