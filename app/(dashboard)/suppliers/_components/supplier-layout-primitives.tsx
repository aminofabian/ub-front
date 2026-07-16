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
        "overflow-hidden border border-border bg-card",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[#e8eef5] dark:bg-muted/40",
          compact ? "px-2 py-1" : "px-2.5 py-1.5",
        )}
      >
        <div className="min-w-0">
          <h3 className={cn(supSectionTitle, compact && "text-[11px]")}>{title}</h3>
          {hint && !compact ? <p className={supSectionHint}>{hint}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn(compact ? "p-0" : "p-0", bodyClassName)}>{children}</div>
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
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="max-w-sm space-y-0.5">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
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
        "flex flex-col items-center justify-center gap-2 py-10 text-xs text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
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
      className="flex shrink-0 flex-wrap items-center gap-2 border border-border bg-muted/15 px-2.5 py-2"
      aria-label="Workspace steps"
    >
      <span className={supKicker}>Workspace</span>
      <ol className="flex flex-1 flex-wrap items-center gap-1">
        {steps.map(({ n, label }, i, arr) => (
          <li key={n} className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1.5 border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground">
              <span className="flex size-4 shrink-0 items-center justify-center bg-primary text-[9px] font-bold text-primary-foreground">
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
        <span className="max-w-[12rem] truncate border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
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
      <Button type="button" variant="outline" className="h-9 rounded-none px-3" onClick={onCancel}>
        {cancelLabel}
      </Button>
      {hasCustomActions
        ? children
        : submitLabel && submitForm
          ? (
              <Button
                type="submit"
                form={submitForm}
                className="h-9 gap-2 rounded-none px-4 font-semibold"
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
    <div className="shrink-0 overflow-hidden border border-border bg-card">
      <div className="border-b border-border bg-[#e8eef5] px-2.5 py-1.5 dark:bg-muted/40">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Selected
        </p>
        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
          {name}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 p-2">{children}</div>
    </div>
  );
}

/** Bordered form section with spreadsheet header bar */
export function SupFormSection({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-card", className)}>
      <div className="border-b border-border bg-[#e8eef5] px-2.5 py-1.5 dark:bg-muted/40">
        <h3 className={supSectionTitle}>{title}</h3>
        {hint ? <p className={supSectionHint}>{hint}</p> : null}
      </div>
      <div className="p-0">{children}</div>
    </section>
  );
}

export function SupFormTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <table
      className={cn(
        "w-full border-collapse border-0 text-left text-xs",
        className,
      )}
    >
      <tbody>{children}</tbody>
    </table>
  );
}

export function SupFormRow({
  label,
  required,
  hint,
  children,
  labelClassName,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  labelClassName?: string;
}) {
  return (
    <tr>
      <th
        scope="row"
        className={cn(
          "w-[38%] border border-border bg-[#eef2f7] px-2 py-1.5 text-left align-top font-medium text-muted-foreground dark:bg-muted/35",
          labelClassName,
        )}
      >
        <span className={supKicker}>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
        {hint ? (
          <p className="mt-0.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground/80">
            {hint}
          </p>
        ) : null}
      </th>
      <td className="border border-border bg-background p-0 align-top">{children}</td>
    </tr>
  );
}

/** Excel-style label | value field table */
export function SupFieldTable({
  rows,
  className,
}: {
  rows: { label: string; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <table className={cn("w-full border-collapse border border-border text-left text-xs", className)}>
      <tbody>
        {rows.map(({ label, value }) => (
          <tr key={label}>
            <th
              scope="row"
              className="w-[36%] border border-border bg-[#eef2f7] px-2 py-1 text-left font-medium text-muted-foreground dark:bg-muted/35"
            >
              {label}
            </th>
            <td className="border border-border bg-background px-2 py-1 text-foreground">
              {value ?? "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
