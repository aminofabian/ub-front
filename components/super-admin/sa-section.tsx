"use client";

import type { ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const saSelectClass = cn(
  "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm shadow-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const saSegmentWrapClass =
  "inline-flex max-w-full flex-wrap rounded-lg border border-border/80 bg-muted/25 p-0.5";

export function saSegmentButtonClass(active: boolean) {
  return cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-colors",
    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
  );
}

export function SaSection({
  title,
  description,
  actions,
  children,
  footer,
  padded = true,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
          {description ? (
            <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className={padded ? "px-4 py-5 sm:px-5" : ""}>{children}</div>
      {footer ? <div className="border-t border-border/60 px-4 py-3 sm:px-5">{footer}</div> : null}
    </section>
  );
}

export function SaToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/70 px-3 py-2.5">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{description}</span>
        ) : null}
      </label>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
