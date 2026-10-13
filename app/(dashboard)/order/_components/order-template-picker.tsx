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
        "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#eef1f0] p-0.5",
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
              "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold tracking-[-0.01em] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]",
              active
                ? "bg-white text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.10)]"
                : "text-[#667085] hover:text-[#101828]",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}
