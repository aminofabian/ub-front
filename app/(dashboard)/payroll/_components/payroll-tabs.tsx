"use client";

import { cn } from "@/lib/utils";

export type PayrollTab = "run" | "calendar" | "advances" | "history";

const TABS: { id: PayrollTab; label: string }[] = [
  { id: "run", label: "Pay run" },
  { id: "calendar", label: "Calendar" },
  { id: "advances", label: "Advances" },
  { id: "history", label: "Payslips" },
];

type Props = {
  tab: PayrollTab;
  onTabChange: (tab: PayrollTab) => void;
};

export function PayrollTabs({ tab, onTabChange }: Props) {
  return (
    <nav className="flex flex-wrap gap-1" aria-label="Payroll sections">
      {TABS.map(({ id, label }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            className={cn(
              "h-8 rounded-[2px] px-2.5 text-[13px] font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)]",
              active
                ? "bg-[var(--op-ink)] text-white"
                : "text-[var(--op-muted)] hover:text-[var(--op-ink)]",
            )}
            onClick={() => onTabChange(id)}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
