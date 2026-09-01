"use client";

import { LayoutGrid, Table2 } from "lucide-react";

import {
  ORDER_TEMPLATES,
  type OrderTemplateId,
} from "@/lib/order-templates";
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
        "inline-flex shrink-0 items-center rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white p-0.5",
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
              "inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
              active
                ? "bg-[var(--order-ink,#15231f)] text-white shadow-sm"
                : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)] hover:text-[var(--order-ink,#15231f)]",
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
