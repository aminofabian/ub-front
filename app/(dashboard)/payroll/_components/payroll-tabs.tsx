"use client";

import type { LucideIcon } from "lucide-react";
import { CalendarDays, LayoutGrid, Receipt, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

export type PayrollTab = "run" | "calendar" | "advances" | "history";

const TABS: {
  id: PayrollTab;
  label: string;
  short: string;
  icon: LucideIcon;
}[] = [
  { id: "run", label: "Pay run", short: "Run", icon: LayoutGrid },
  { id: "calendar", label: "Calendar", short: "Calendar", icon: CalendarDays },
  { id: "advances", label: "Advances", short: "Advances", icon: Wallet },
  { id: "history", label: "Payslips", short: "Payslips", icon: Receipt },
];

type Props = {
  tab: PayrollTab;
  onTabChange: (tab: PayrollTab) => void;
};

export function PayrollTabs({ tab, onTabChange }: Props) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-1"
      aria-label="Payroll sections"
    >
      {TABS.map(({ id, label, short, icon: Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-none px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "border border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]"
                : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:text-[var(--order-ink,#15231f)]",
            )}
            onClick={() => onTabChange(id)}
          >
            <Icon
              className={cn("size-4 shrink-0", active && "text-primary")}
              aria-hidden
            />
            <span className="hidden truncate sm:inline">{label}</span>
            <span className="truncate sm:hidden">{short}</span>
          </button>
        );
      })}
    </nav>
  );
}
