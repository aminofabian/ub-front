"use client";

import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  productFormHintClass,
  productFormSectionToggleClass,
  productFormSectionToggleLabelClass,
} from "./product-form-styles";

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
        expanded ? "bg-muted/25" : "bg-transparent hover:bg-muted/15",
      )}
      aria-expanded={expanded}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-none border border-border transition-colors",
          expanded ? "bg-foreground text-background" : "bg-muted/40 text-foreground/50",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className={productFormSectionToggleLabelClass}>{label}</span>
          {badge}
        </div>
        {hint ? <p className={cn(productFormHintClass, "mt-0.5")}>{hint}</p> : null}
      </div>
      <div className="shrink-0 text-foreground/40">
        {expanded ? (
          <ChevronDown className="size-4" aria-hidden />
        ) : (
          <ChevronRight className="size-4" aria-hidden />
        )}
      </div>
    </button>
  );
}
