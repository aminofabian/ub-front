"use client";

import {
  LANDING_TEMPLATE_META,
  STORE_THEME_META,
  type StorefrontTemplateMeta,
} from "@/lib/storefront-templates";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function TemplatePicker({
  kind,
  value,
  onChange,
  className,
  compact,
}: {
  kind: "store" | "landing";
  value: string;
  onChange: (id: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const items: readonly StorefrontTemplateMeta[] =
    kind === "store" ? STORE_THEME_META : LANDING_TEMPLATE_META;

  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "sm:grid-cols-2" : "sm:grid-cols-2",
        className,
      )}
      role="listbox"
      aria-label={kind === "store" ? "Store themes" : "Landing templates"}
    >
      {items.map((item) => {
        const selected = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              "group relative overflow-hidden border text-left transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              selected
                ? "border-stone-900 ring-1 ring-stone-900"
                : "border-stone-200 hover:border-stone-400",
              compact ? "rounded-lg" : "rounded-xl",
            )}
          >
            <div
              className={cn("w-full", compact ? "h-16" : "h-24")}
              style={{
                background: `linear-gradient(135deg, ${item.previewFrom}, ${item.previewTo})`,
              }}
            >
              <div
                className="absolute right-3 top-3 size-3 rounded-full shadow-sm"
                style={{ backgroundColor: item.accent }}
                aria-hidden
              />
            </div>
            <div className={cn("space-y-1", compact ? "p-2.5" : "p-3.5")}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-stone-900">
                  {item.name}
                </p>
                {selected ? (
                  <span className="inline-flex size-5 shrink-0 items-center justify-center bg-stone-900 text-white">
                    <Check className="size-3" aria-hidden />
                  </span>
                ) : null}
              </div>
              <p className="text-xs leading-snug text-stone-500">{item.blurb}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
