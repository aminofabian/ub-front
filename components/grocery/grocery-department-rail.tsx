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
 * Vertical department filter for the grocery counter. Active = teal border
 * and teal text; inactive = hairline. No filled tickets, punch holes, or
 * offset shadows.
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
        "pointer-events-auto relative flex w-[2.9rem] shrink-0 flex-col gap-1 overflow-y-auto overscroll-contain rounded-none border bg-white p-1",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
        "[scrollbar-width:thin] [&::-webkit-scrollbar]:w-1",
        "[&::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_28%,transparent)]",
        className,
      )}
    >
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
        "relative flex min-h-[3.25rem] w-full shrink-0 flex-col items-center justify-center gap-1 rounded-none border px-0.5 py-2 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
        "touch-manipulation select-none",
        active
          ? "border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]"
          : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_26%,transparent)] hover:text-[var(--order-ink,#15231f)]",
      )}
    >
      {icon}
      <span
        className="max-h-[4.5rem] w-full overflow-hidden text-[10px] font-semibold leading-[1.05] tracking-[-0.02em]"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        {label}
      </span>
    </button>
  );
}
