"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Outer width for most admin pages */
export const DASHBOARD_MAX = "mx-auto max-w-5xl space-y-8 pb-16";

/** Wider shell for dense consoles (products, categories) */
export const DASHBOARD_MAX_WIDE = "mx-auto max-w-6xl space-y-8 pb-16";

export function dashboardInputClass(disabled?: boolean, className?: string) {
  return cn(
    "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
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

export function dashboardHintClass() {
  return "text-xs leading-relaxed text-muted-foreground";
}

export type DashboardFeedbackKind = "success" | "error";

export function DashboardFeedback({ kind, text }: { kind: DashboardFeedbackKind; text: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm",
        kind === "success" &&
          "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-950 dark:text-emerald-100",
        kind === "error" && "border-destructive/30 bg-destructive/5 text-destructive",
      )}
    >
      {kind === "success" ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      )}
      <span>{text}</span>
    </div>
  );
}

/** Single-line notices when you only have a string (e.g. legacy `message` state). */
export function DashboardNotice({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm text-foreground shadow-sm">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
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
      <div className="flex flex-wrap gap-1.5">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/80 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors",
              "hover:border-primary/30 hover:bg-accent/50",
            )}
          >
            <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {label}
            <ArrowRight className="size-3 opacity-50" aria-hidden />
          </Link>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {links.map(({ href, label, desc, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all",
            "hover:border-primary/25 hover:bg-accent/40 hover:shadow-md",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
              {label}
              <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
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
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: React.ReactNode;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <header className="flex flex-wrap items-start gap-x-3 gap-y-1 sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-primary">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Icon className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-primary/90">
              {eyebrow}
            </span>
            <h1 className="text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl">{title}</h1>
          </div>
        </div>
        {description ?
          <div className="w-full min-w-0 text-xs leading-snug text-muted-foreground sm:w-auto sm:max-w-xl sm:flex-1">
            {description}
          </div>
        : null}
      </header>
    );
  }
  return (
    <header className="space-y-1">
      <div className="flex items-center gap-2 text-primary">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-primary/90">{eyebrow}</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
      <div className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</div>
    </header>
  );
}

export function DashboardLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center justify-center py-24">
      <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
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
    <div className="mx-auto max-w-lg py-16">
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto size-10 text-destructive" aria-hidden />
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {onRetry ? (
          <Button className="mt-6 gap-2" variant="outline" type="button" onClick={onRetry}>
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
  description: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <div className="rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="size-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {backHref ? (
          <Button asChild className="mt-6" variant="outline">
            <Link href={backHref}>{backLabel ?? "Go back"}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
