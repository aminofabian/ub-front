"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";

import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Standard admin page shell (vertical rhythm + max width) */
export const DASHBOARD_MAX = "mx-auto w-full max-w-5xl space-y-10 pb-20";

/** Wider shell for dense consoles (products, categories, users) */
export const DASHBOARD_MAX_WIDE = "mx-auto w-full max-w-6xl space-y-10 pb-20";

/** Primary content card (CTA blocks, filter panels, etc.) */
export const DASHBOARD_SECTION_SURFACE =
  "rounded-2xl border border-border/70 bg-card p-5 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04] sm:p-6";

/** Table / list outer shell */
export const DASHBOARD_TABLE_SURFACE =
  "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]";

/** Header strip inside {@link DASHBOARD_TABLE_SURFACE} */
export const DASHBOARD_TABLE_HEAD =
  "border-b border-border/50 bg-muted/35 px-5 py-4 sm:px-6";

/** Inset well for grouped controls (e.g. filter fields) */
export const DASHBOARD_FILTER_WELL =
  "mt-5 rounded-xl border border-border/50 bg-muted/25 p-4 sm:p-5";

export function dashboardInputClass(disabled?: boolean, className?: string) {
  return cn(
    "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-snug shadow-sm",
    "transition-[color,box-shadow,border-color,background-color] duration-150",
    "placeholder:text-muted-foreground/70",
    "hover:border-foreground/15",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    disabled && "cursor-not-allowed opacity-60",
    className,
  );
}

export function dashboardSelectClass(disabled?: boolean, className?: string) {
  return cn(dashboardInputClass(disabled, className), "cursor-pointer py-2");
}

export function dashboardTextareaClass(disabled?: boolean, className?: string) {
  return cn(dashboardInputClass(disabled, className), "min-h-[4rem] resize-y");
}

export function dashboardLabelClass() {
  return "text-sm font-medium leading-none text-foreground";
}

/** Uppercase label tier for filter / form grids */
export function dashboardFilterFieldLabelClass() {
  return "font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground";
}

export function dashboardHintClass() {
  return "text-xs leading-relaxed text-muted-foreground";
}

export type DashboardFeedbackKind = "success" | "error" | "warning";

export function DashboardFeedback({
  kind,
  text,
}: {
  kind: DashboardFeedbackKind;
  text: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm leading-relaxed shadow-sm",
        kind === "success" &&
          "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-50",
        kind === "error" &&
          "border-destructive/25 bg-destructive/5 text-destructive",
        kind === "warning" &&
          "border-amber-500/25 bg-amber-500/[0.07] text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50",
      )}
    >
      {kind === "success" ? (
        <CheckCircle2
          className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
      ) : kind === "warning" ? (
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
      ) : (
        <AlertCircle
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden
        />
      )}
      <span
        className={cn(
          "min-w-0",
          kind === "error" && "text-destructive",
          kind === "warning" && "text-amber-950 dark:text-amber-50",
        )}
      >
        {text}
      </span>
    </div>
  );
}

/** Single-line notices when you only have a string (e.g. legacy `message` state). */
export function DashboardNotice({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm text-foreground shadow-sm">
      <AlertCircle
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <span>{text}</span>
    </div>
  );
}

export type DashboardQuickLink = {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
};

export function DashboardQuickLinks({
  links,
  compact = false,
}: {
  links: DashboardQuickLink[];
  /** Single-line chips; saves vertical space on dense pages (e.g. Products). */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex min-w-0 max-w-full flex-wrap gap-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/90 px-2.5 py-1.5 text-xs font-semibold tracking-tight text-foreground shadow-sm",
              "transition-all duration-200",
              "hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "active:translate-y-0 active:shadow-sm",
            )}
          >
            <Icon
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            {label}
            <ArrowRight
              className="size-3 shrink-0 text-muted-foreground opacity-60"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {links.map(({ href, label, desc, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex items-start gap-3 rounded-xl border border-border/60 bg-card/80 p-3.5 shadow-sm backdrop-blur-sm transition-all duration-200",
            "hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-md",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "active:translate-y-0 active:shadow-sm",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/60 text-muted-foreground transition-colors group-hover:border-primary/20 group-hover:bg-primary/8 group-hover:text-foreground">
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 font-sans text-sm font-semibold tracking-tight text-foreground">
              {label}
              <ArrowRight
                className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
                aria-hidden
              />
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              {desc}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function DashboardPageHero({
  icon: Icon,
  eyebrow,
  title,
  description,
  compact = false,
  showActiveScope = false,
  children,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: ReactNode;
  compact?: boolean;
  /** When true, shows global branch · department under the title (§6.4). */
  showActiveScope?: boolean;
  /** e.g. {@link DashboardQuickLinks} — rendered below the title block in default mode */
  children?: ReactNode;
}) {
  if (compact) {
    return (
      <header className="flex flex-wrap items-start gap-x-4 gap-y-3 sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-foreground shadow-sm">
            <Icon className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <span className="block font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {eyebrow}
            </span>
            <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            {showActiveScope ? (
              <ActiveScopeSubtitle className="mt-0.5 text-xs" />
            ) : null}
          </div>
        </div>
        {description ? (
          <div className="w-full min-w-0 text-sm leading-relaxed text-muted-foreground sm:w-auto sm:max-w-xl sm:flex-1">
            {description}
          </div>
        ) : null}
      </header>
    );
  }
  return (
    <header className="space-y-8 border-b border-border/50 pb-10">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-foreground shadow-sm">
            <Icon className="size-[18px]" aria-hidden />
          </span>
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </span>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-[2rem] sm:leading-tight">
            {title}
          </h1>
          {showActiveScope ? <ActiveScopeSubtitle /> : null}
          {description ? (
            <div className="max-w-prose text-[15px] leading-relaxed text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </header>
  );
}

export function DashboardLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-4 py-28">
      <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
      <p className="font-sans text-sm font-medium text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function DashboardLoadError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-lg py-16">
      <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-8 text-center shadow-sm ring-1 ring-destructive/10">
        <AlertCircle className="mx-auto size-10 text-destructive" aria-hidden />
        <h1 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
        {onRetry ? (
          <Button
            className="mt-8 gap-2"
            variant="outline"
            type="button"
            onClick={onRetry}
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardAccessDenied({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <div className="rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="size-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <div className="mt-2 text-sm text-muted-foreground">{description}</div>
        {backHref ? (
          <Button asChild className="mt-6" variant="outline">
            <Link href={backHref}>{backLabel ?? "Go back"}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
