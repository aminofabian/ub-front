"use client";

import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { productFormSectionToggleClass } from "./product-form-styles";

type Props = {
  icon: React.ElementType;
  label: string;
  hint?: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
};

export function ProductFormSectionToggle({
  icon: Icon,
  label,
  hint,
  expanded,
  onToggle,
  badge,
}: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        productFormSectionToggleClass,
        expanded
          ? "border-primary/20 bg-primary/[0.04] ring-1 ring-primary/10"
          : "border-border/55 bg-muted/20 hover:border-border hover:bg-muted/30",
      )}
      aria-expanded={expanded}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          expanded ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {label}
          </span>
          {badge}
        </div>
        {hint ? (
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-muted-foreground">
        {expanded ? (
          <ChevronDown className="size-4" aria-hidden />
        ) : (
          <ChevronRight className="size-4" aria-hidden />
        )}
      </div>
    </button>
  );
}
