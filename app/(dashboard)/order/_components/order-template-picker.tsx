"use client";

import { LayoutGrid, Table2 } from "lucide-react";

import { ORDER_TEMPLATES, type OrderTemplateId } from "@/lib/order-templates";
import { cn } from "@/lib/utils";

const ICONS: Record<OrderTemplateId, typeof LayoutGrid> = {
  shelf: LayoutGrid,
  ledger: Table2,
};

export function OrderTemplatePicker({
  value,
  onChange,
  className,
}: {
  value: OrderTemplateId;
  onChange: (id: OrderTemplateId) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-[2px] border border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)] bg-[var(--op-panel,#EFEBE2)] p-0.5",
        className,
      )}
      role="group"
      aria-label="Order layout"
    >
      {ORDER_TEMPLATES.map((t) => {
        const Icon = ICONS[t.id];
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            title={`${t.name} — ${t.blurb}`}
            aria-pressed={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-[2px] px-2.5 text-[12px] font-semibold tracking-[-0.02em] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]",
              active
                ? "bg-[var(--op-surface,#FCFAF5)] text-[var(--op-ink,#121A16)]"
                : "text-[var(--op-muted,#556159)] hover:text-[var(--op-ink,#121A16)]",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}
