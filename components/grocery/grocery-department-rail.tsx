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
 * Vertical floating department filter for the grocery counter. Shown when the
 * clerk is assigned to more than one department so they can narrow the catalog
 * without leaving the POS surface.
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
        "pointer-events-auto flex w-[2.65rem] shrink-0 flex-col gap-1 rounded-xl border border-border/70 bg-card/95 p-1 shadow-lg backdrop-blur-sm",
        "ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
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
        "relative flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-2 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "touch-manipulation select-none",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
    >
      {icon}
      <span
        className="max-h-[4.5rem] w-full overflow-hidden text-[9px] font-semibold uppercase leading-[1.05] tracking-wide"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        {label}
      </span>
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary-foreground/70"
        />
      ) : null}
    </button>
  );
}
