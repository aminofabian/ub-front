"use client";

import type { ReactNode } from "react";
import { LayoutGrid } from "lucide-react";

import type { ItemTypeRecord } from "@/lib/api";
import { ALL_DEPARTMENTS_LABEL } from "@/hooks/use-session-scope";
import { cn } from "@/lib/utils";

type GroceryDepartmentRailProps = {
  departments: ItemTypeRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
};

function departmentLabel(t: ItemTypeRecord): string {
  return t.label?.trim() || "Department";
}

/**
 * Vertical floating department filter for the grocery counter — a shelf-edge
 * ticket rail in the marketplace paper/ink/teal grammar. The teal lip is the
 * shelf edge; each department is a ticket clipped to it (punched hole, ink
 * hairline, vertical label). The active ticket is teal with a notched bottom,
 * like a pulled shelf ticket. Shown when the clerk is assigned to more than
 * one department so they can narrow the catalog without leaving the POS.
 */
export function GroceryDepartmentRail({
  departments,
  selectedId,
  onSelect,
  className,
}: GroceryDepartmentRailProps) {
  if (departments.length <= 1) return null;

  return (
    <nav
      aria-label="Department filters"
      className={cn(
        "pointer-events-auto relative flex w-[2.9rem] shrink-0 flex-col gap-1 overflow-hidden rounded-none border",
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
        "bg-[color-mix(in_srgb,var(--card)_90%,#f7f3eb)] p-1 pt-2.5",
        "shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
        className,
      )}
    >
      {/* Shelf lip */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[var(--pos-primary,#0f766e)]"
      />
      <DepartmentRailButton
        active={selectedId == null}
        label="All"
        title={ALL_DEPARTMENTS_LABEL}
        onClick={() => onSelect(null)}
        icon={<LayoutGrid className="size-3.5 shrink-0" aria-hidden />}
      />
      {departments.map((dept) => {
        const label = departmentLabel(dept);
        const active = selectedId === dept.id;
        return (
          <DepartmentRailButton
            key={dept.id}
            active={active}
            label={label}
            title={label}
            onClick={() => onSelect(dept.id)}
          />
        );
      })}
    </nav>
  );
}

function DepartmentRailButton({
  active,
  label,
  title,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  title: string;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "relative flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-1 rounded-none border px-0.5 py-2 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/40",
        "touch-manipulation select-none",
        active
          ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)] [clip-path:polygon(0_0,100%_0,100%_calc(100%-6px),calc(50%+6px)_100%,calc(50%-6px)_100%,0_calc(100%-6px))]"
          : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)] text-muted-foreground hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)] hover:text-[var(--pos-ink,#1c1915)]",
      )}
    >
      {/* Ticket punch hole */}
      <span
        aria-hidden
        className={cn(
          "absolute left-1/2 top-1 -translate-x-1/2 size-1.5 rounded-full border",
          active
            ? "border-white/60 bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_92%,transparent)]"
            : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_35%,transparent)] bg-[var(--pos-paper,#f1ece3)]",
        )}
      />
      {icon}
      <span
        className="max-h-[4.5rem] w-full overflow-hidden text-[9px] font-semibold uppercase leading-[1.05] tracking-wide"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        {label}
      </span>
    </button>
  );
}
