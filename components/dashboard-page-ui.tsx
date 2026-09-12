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

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const INK = "text-[var(--order-ink,#15231f)]";
const MUTED =
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]";
const TEAL = "text-[var(--pos-primary,#0f766e)]";

/** Standard admin page shell (vertical rhythm + max width) */
export const DASHBOARD_MAX =
  "relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col gap-1 bg-white px-0 pb-4";

/** Wider shell for dense consoles (products, categories, users) */
export const DASHBOARD_MAX_WIDE =
  "relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col gap-1 bg-white px-0 pb-4";

/** Primary content card (CTA blocks, filter panels, etc.) */
export const DASHBOARD_SECTION_SURFACE = cn(
  "rounded-none border bg-white p-3",
  HAIRLINE,
);

/** Table / list outer shell */
export const DASHBOARD_TABLE_SURFACE = cn(
  "overflow-hidden rounded-none border bg-white",
  HAIRLINE,
);

/** Header strip inside {@link DASHBOARD_TABLE_SURFACE} */
export const DASHBOARD_TABLE_HEAD = cn(
  "border-b bg-white px-3 py-1.5 sm:px-3.5",
  HAIRLINE,
);

/** Inset well for grouped controls (e.g. filter fields) */
export const DASHBOARD_FILTER_WELL = cn(
  "mt-1 rounded-none border bg-white p-3",
  HAIRLINE,
);

export function dashboardInputClass(disabled?: boolean, className?: string) {
  return cn(
    "h-8 w-full rounded-none border bg-white px-2.5 text-sm leading-snug",
    HAIRLINE,
    "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]",
    "focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:outline-none",
    disabled && "cursor-not-allowed opacity-60",
    className,
  );
}

export function dashboardSelectClass(disabled?: boolean, className?: string) {
  return cn(dashboardInputClass(disabled, className), "cursor-pointer py-0");
}

export function dashboardTextareaClass(disabled?: boolean, className?: string) {
  return cn(
    dashboardInputClass(disabled, className),
    "min-h-[4rem] h-auto resize-y py-2",
  );
}

export function dashboardLabelClass() {
  return cn("text-[11px] font-semibold tracking-[-0.02em]", MUTED);
}

/** Label tier for filter / form grids */
export function dashboardFilterFieldLabelClass() {
  return cn("font-sans text-[11px] font-semibold tracking-[-0.02em]", MUTED);
}

export function dashboardHintClass() {
  return cn("text-[11px] leading-snug", MUTED);
}

export type DashboardFeedbackKind = "success" | "error" | "warning";

export function DashboardFeedback({
  kind,
  text,
  className,
}: {
  kind: DashboardFeedbackKind;
  text: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-none border bg-white px-3 py-2 text-sm leading-relaxed",
        kind === "success" &&
          "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]",
        kind === "error" && "border-destructive/40 text-destructive",
        kind === "warning" &&
          "border-amber-700/40 text-amber-800 dark:text-amber-200",
        className,
      )}
    >
      {kind === "success" ? (
        <CheckCircle2
          className={cn("mt-0.5 size-4 shrink-0", TEAL)}
          aria-hidden
        />
      ) : kind === "warning" ? (
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-amber-800"
          aria-hidden
        />
      ) : (
        <AlertCircle
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden
        />
      )}
      <span className="min-w-0">{text}</span>
    </div>
  );
}

/** Single-line notices when you only have a string (e.g. legacy `message` state). */
export function DashboardNotice({ text }: { text: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-none border bg-white px-3 py-2 text-sm",
        HAIRLINE,
        INK,
      )}
    >
      <AlertCircle
        className={cn("mt-0.5 size-4 shrink-0", MUTED)}
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
      <div className="flex min-w-0 max-w-full flex-wrap gap-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-none border bg-white px-1.5 text-[11px] font-semibold tracking-[-0.02em]",
              HAIRLINE,
              MUTED,
              "hover:text-[var(--order-ink,#15231f)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
            )}
          >
            <Icon className="size-3 shrink-0 opacity-70" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-1 sm:grid-cols-3">
      {links.map(({ href, label, desc, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex items-center gap-2 rounded-none border bg-white px-3 py-2",
            HAIRLINE,
            "hover:border-[var(--pos-primary,#0f766e)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
          )}
        >
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-none border bg-white",
              HAIRLINE,
              TEAL,
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "flex items-center gap-1 text-[13px] font-semibold tracking-[-0.02em]",
                INK,
              )}
            >
              {label}
              <ArrowRight
                className="size-3 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </span>
            <span
              className={cn("mt-0.5 block text-[11px] leading-snug", MUTED)}
            >
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
  eyebrow: _eyebrow,
  title,
  description,
  compact: _compact = false,
  showActiveScope = false,
  children,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: ReactNode;
  compact?: boolean;
  /** When true, shows global branch · department under the title (§6.4). */
  showActiveScope?: boolean;
  /** e.g. {@link DashboardQuickLinks} — rendered in the header actions slot */
  children?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-none border bg-white px-2.5 py-1 sm:px-3",
        HAIRLINE,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-none border bg-white",
              "border-[var(--pos-primary,#0f766e)]",
              TEAL,
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </span>
          <h1
            className={cn(
              "truncate font-heading text-[15px] font-semibold tracking-[-0.02em]",
              INK,
            )}
          >
            {title}
          </h1>
        </div>
        {description || showActiveScope ? (
          <>
            <span
              aria-hidden
              className="hidden h-3.5 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
            />
            <div className={cn("min-w-0 truncate text-[11px]", MUTED)}>
              {showActiveScope ? (
                <ActiveScopeSubtitle className="text-[11px]" />
              ) : null}
              {description}
            </div>
          </>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {children}
        </div>
      ) : null}
    </header>
  );
}

export function DashboardLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-center gap-3 py-20">
      <Loader2 className={cn("size-6 animate-spin", TEAL)} aria-hidden />
      <p className={cn("text-[13px] font-medium", MUTED)}>{label}</p>
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
      <div
        className={cn(
          "rounded-none border bg-white p-6 text-center",
          "border-destructive/40",
        )}
      >
        <AlertCircle className="mx-auto size-8 text-destructive" aria-hidden />
        <h1
          className={cn(
            "mt-4 text-[15px] font-semibold tracking-[-0.02em]",
            INK,
          )}
        >
          {title}
        </h1>
        <p
          className={cn("mx-auto mt-2 max-w-sm text-sm leading-relaxed", MUTED)}
        >
          {message}
        </p>
        {onRetry ? (
          <Button
            className="mt-6 h-8 gap-2 rounded-none"
            variant="outline"
            type="button"
            onClick={onRetry}
          >
            <RefreshCw className="size-3.5" aria-hidden />
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
      <div
        className={cn("rounded-none border bg-white p-6 text-center", HAIRLINE)}
      >
        <div
          className={cn(
            "mx-auto flex size-10 items-center justify-center rounded-none border bg-white",
            HAIRLINE,
            MUTED,
          )}
        >
          <Lock className="size-5" aria-hidden />
        </div>
        <h1
          className={cn(
            "mt-4 text-[15px] font-semibold tracking-[-0.02em]",
            INK,
          )}
        >
          {title}
        </h1>
        <div className={cn("mt-2 text-sm", MUTED)}>{description}</div>
        {backHref ? (
          <Button asChild className="mt-6 h-8 rounded-none" variant="outline">
            <Link href={backHref}>{backLabel ?? "Go back"}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
