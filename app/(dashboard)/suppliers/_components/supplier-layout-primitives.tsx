"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  supDrawerFooter,
  supEmptyIconWrap,
  supEmptyState,
  supKicker,
  supSectionHint,
  supSectionTitle,
} from "./supplier-ui-tokens";

export function SupSection({
  title,
  hint,
  action,
  children,
  className,
  bodyClassName,
  compact,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden border border-border/55 bg-card",
        compact ? "rounded-lg" : "rounded-xl",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/20",
          compact ? "px-2.5 py-1.5" : "gap-3 px-4 py-3 sm:px-5",
        )}
      >
        <div className="min-w-0">
          <h3 className={cn(supSectionTitle, compact && "text-xs font-semibold")}>
            {title}
          </h3>
          {hint && !compact ? <p className={supSectionHint}>{hint}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn(compact ? "p-1.5" : "p-4 sm:p-5", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

export function SupEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(supEmptyState, className)}>
      <div className={supEmptyIconWrap}>
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function SupLoadingBlock({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-14 text-sm text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="size-5 animate-spin text-primary/70" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function SupWorkflowRail({
  steps,
  activeLabel,
}: {
  steps: { n: number; label: string }[];
  activeLabel?: string | null;
}) {
  return (
    <nav
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-3 rounded-lg border border-border/50",
        "bg-muted/15 px-3 py-2.5 sm:px-4 sm:py-3",
      )}
      aria-label="Workspace steps"
    >
      <span className={supKicker}>Workspace</span>
      <ol className="flex flex-1 flex-wrap items-center gap-1">
        {steps.map(({ n, label }, i, arr) => (
          <li key={n} className="flex items-center gap-1">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
                "border-border/50 bg-background text-foreground",
              )}
            >
              <span className="flex size-4 shrink-0 items-center justify-center rounded-md bg-primary text-[9px] font-bold text-primary-foreground">
                {n}
              </span>
              {label}
            </span>
            {i < arr.length - 1 ? (
              <ChevronRight
                className="size-3 shrink-0 text-muted-foreground/35 max-sm:hidden"
                aria-hidden
              />
            ) : null}
          </li>
        ))}
      </ol>
      {activeLabel ? (
        <span className="max-w-[12rem] truncate rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/15">
          {activeLabel}
        </span>
      ) : null}
    </nav>
  );
}

export function SupDrawerFooter({
  onCancel,
  cancelLabel = "Cancel",
  submitLabel,
  submitForm,
  submitDisabled,
  children,
}: {
  onCancel: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  submitForm?: string;
  submitDisabled?: boolean;
  children?: React.ReactNode;
}) {
  const hasCustomActions = React.Children.count(children) > 0;

  return (
    <div className={supDrawerFooter}>
      <Button type="button" variant="outline" className="h-10 px-4" onClick={onCancel}>
        {cancelLabel}
      </Button>
      {hasCustomActions
        ? children
        : submitLabel && submitForm
          ? (
              <Button
                type="submit"
                form={submitForm}
                className="h-10 gap-2 px-5 font-semibold shadow-sm"
                disabled={submitDisabled}
              >
                {submitLabel}
              </Button>
            )
          : null}
    </div>
  );
}

export function SupMobileSelectionBar({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card p-3.5 shadow-sm",
        "sm:p-4",
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="flex size-2 shrink-0 rounded-full bg-primary"
          aria-hidden
        />
        <p className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground">
          {name}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
