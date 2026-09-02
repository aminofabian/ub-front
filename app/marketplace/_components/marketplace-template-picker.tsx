"use client";

import { LayoutGrid, Table2 } from "lucide-react";

import {
  MARKETPLACE_TEMPLATES,
  type MarketplaceTemplateId,
} from "@/lib/marketplace-templates";
import { cn } from "@/lib/utils";

const ICONS: Record<MarketplaceTemplateId, typeof LayoutGrid> = {
  shelf: LayoutGrid,
  ledger: Table2,
};

export function MarketplaceTemplatePicker({
  value,
  onChange,
  className,
}: {
  value: MarketplaceTemplateId;
  onChange: (id: MarketplaceTemplateId) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,#fff_82%,transparent)] p-0.5",
        className,
      )}
      role="group"
      aria-label="Catalogue layout"
    >
      {MARKETPLACE_TEMPLATES.map((t) => {
        const Icon = ICONS[t.id];
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            title={`${t.name} - ${t.blurb}`}
            aria-pressed={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)] focus-visible:ring-offset-1",
              active
                ? "bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)] shadow-sm"
                : "text-muted-foreground hover:text-[var(--pos-ink,#1c1915)]",
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
