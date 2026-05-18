"use client";

import * as React from "react";
import { AlertCircle, X } from "lucide-react";
import { Dialog } from "radix-ui";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { dashboardBrandingAccentStops } from "@/lib/brand-theme";
import type { OnboardingTargetId } from "@/lib/onboarding-tour";
import { cn } from "@/lib/utils";

export type FormDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Visible helper text under the title */
  description?: React.ReactNode;
  /** Compact pill above the title (e.g. “Catalog”) */
  contextLabel?: string;
  icon?: React.ReactNode;
  /**
   * Renders directly under the header (validation / submit errors stay visible
   * without scrolling the main page behind the drawer).
   */
  banner?: React.ReactNode;
  children: React.ReactNode;
  /** Sticky actions bar (Save, Cancel, etc.) */
  footer?: React.ReactNode;
  /** default ≈ md; wide ≈ 2xl; extraWide ≈ full data tables (supply lines, etc.) */
  width?: "default" | "wide" | "extraWide";
  /** When set, marks the drawer panel for onboarding tour spotlight. */
  onboardingTarget?: OnboardingTargetId;
};

/** Compact destructive alert for plain-string messages (API / validation). */
export function FormDrawerMessageBanner({ text }: { text: string }) {
  const t = text.trim();
  if (!t) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-destructive/20",
        "bg-gradient-to-br from-destructive/[0.08] via-destructive/[0.04] to-transparent",
        "px-3.5 py-3 text-sm text-destructive shadow-sm",
        "dark:border-destructive/30 dark:from-destructive/15 dark:via-destructive/8",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive dark:bg-destructive/20">
        <AlertCircle className="size-4" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 pt-0.5 whitespace-pre-wrap leading-relaxed">{t}</p>
    </div>
  );
}

/**
 * Right-edge drawer shell for forms. Built on Radix Dialog for focus trap,
 * scroll lock, and accessibility. Reuse this for every slide-over form in the app.
 */
export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  contextLabel,
  icon,
  banner,
  children,
  footer,
  width = "default",
  onboardingTarget,
}: FormDrawerProps) {
  const dash = useOptionalDashboard();
  const brandStops = React.useMemo(
    () => dashboardBrandingAccentStops(dash?.business?.branding ?? null),
    [dash?.business?.branding],
  );

  const headerOrbPrimary = brandStops
    ? { background: `color-mix(in srgb, ${brandStops.from} 12%, transparent)` }
    : undefined;
  const headerOrbSecondary = brandStops
    ? { background: `color-mix(in srgb, ${brandStops.secondary} 10%, transparent)` }
    : undefined;
  const iconChromeStyle = brandStops
    ? {
        borderColor: `color-mix(in srgb, ${brandStops.from} 32%, transparent)`,
        color: brandStops.from,
      }
    : undefined;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={!onboardingTarget}>
      <Dialog.Portal>
        {!onboardingTarget ? (
          <Dialog.Overlay
            className={cn(
              "fixed inset-0 z-50 bg-black/[0.12] backdrop-blur-[3px] dark:bg-black/40",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300",
            )}
          />
        ) : null}
        <Dialog.Content
          {...(onboardingTarget
            ? { "data-onboarding-target": onboardingTarget }
            : {})}
          className={cn(
            "fixed flex flex-col overflow-hidden outline-none",
            onboardingTarget ? "z-[250]" : "z-50",
            "border-l border-border/60 bg-background/95 shadow-[0_0_0_1px_rgba(0,0,0,0.03),-24px_0_80px_-20px_rgba(0,0,0,0.12)]",
            "dark:border-border/80 dark:bg-background dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04),-24px_0_80px_-24px_rgba(0,0,0,0.45)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "inset-y-0 right-0 h-[100dvh] max-h-[100dvh] w-full sm:rounded-l-2xl",
            width === "extraWide"
              ? "sm:max-w-[min(92rem,calc(100vw-1.25rem))]"
              : width === "wide"
                ? "sm:max-w-3xl"
                : "sm:max-w-xl",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]",
          )}
        >
          {/* Accent rail: business branding hex when set, else theme --primary */}
          {brandStops ? (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-[5px] opacity-[0.92]"
              style={{
                background: `linear-gradient(180deg, ${brandStops.from}, ${brandStops.via}, ${brandStops.to})`,
              }}
              aria-hidden
            />
          ) : (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-[5px] bg-gradient-to-b from-primary via-primary/75 to-primary/35 opacity-90"
              aria-hidden
            />
          )}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary-foreground/25 via-transparent to-primary-foreground/15 dark:from-primary-foreground/20 dark:to-transparent"
            aria-hidden
          />

          <div className="relative flex min-h-0 flex-1 flex-col pl-[5px]">
            <header
              className={cn(
                "relative shrink-0 overflow-hidden border-b border-border/45",
                "shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.04)] dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.06)]",
                "bg-gradient-to-br from-muted/35 via-background to-background",
                "px-5 py-4 sm:px-6 sm:py-5",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full blur-3xl dark:opacity-90",
                  !brandStops && "bg-primary/[0.08] dark:bg-primary/[0.12]",
                )}
                style={headerOrbPrimary}
                aria-hidden
              />
              <div
                className={cn(
                  "pointer-events-none absolute -bottom-8 left-1/3 h-28 w-72 -translate-x-1/2 rounded-full blur-2xl dark:opacity-90",
                  !brandStops && "bg-primary/[0.05] dark:bg-primary/[0.08]",
                )}
                style={headerOrbSecondary}
                aria-hidden
              />

              <div className="relative flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex min-w-0 gap-3 sm:gap-4">
                  {icon ? (
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-2xl ring-offset-1 ring-offset-background sm:size-12",
                        brandStops
                          ? cn(
                              "border bg-gradient-to-br from-muted/40 to-background/95",
                              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_14px_-4px_rgba(0,0,0,0.08)]",
                              "ring-1 ring-black/[0.06] dark:from-muted/25 dark:to-background dark:ring-white/[0.08]",
                            )
                          : cn(
                              "text-primary",
                              "border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-muted/50",
                              "ring-1 ring-primary/10",
                              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55),0_4px_14px_-4px_rgba(0,0,0,0.1)]",
                              "dark:from-primary/[0.12] dark:to-background dark:ring-primary/20 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_4px_20px_-6px_rgba(0,0,0,0.45)]",
                            ),
                      )}
                      style={iconChromeStyle}
                    >
                      {icon}
                    </span>
                  ) : null}
                  <div className="min-w-0 space-y-2 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {contextLabel ? (
                        <span
                          className={cn(
                            "inline-flex max-w-full items-center rounded-full",
                            "border border-primary/20 bg-primary/[0.07] px-2.5 py-0.5",
                            "text-[10px] font-semibold uppercase tracking-[0.12em] text-primary",
                            "shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset] dark:shadow-none dark:border-primary/25 dark:bg-primary/15",
                          )}
                        >
                          {contextLabel}
                        </span>
                      ) : null}
                      {description ? (
                        <span className="text-[10px] font-medium tabular-nums text-muted-foreground/75">
                          Esc to close
                        </span>
                      ) : null}
                    </div>
                    <Dialog.Title className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                      {title}
                    </Dialog.Title>
                    {description ? (
                      <Dialog.Description className="max-w-[50ch] text-[13px] leading-relaxed text-muted-foreground">
                        {description}
                      </Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">
                        Form panel. Press Escape to close.
                      </Dialog.Description>
                    )}
                    {!description ? (
                      <p className="text-[11px] text-muted-foreground/80">Press Esc to close</p>
                    ) : null}
                  </div>
                </div>
                <Dialog.Close asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      "relative z-50 shrink-0 rounded-xl border border-border/40 bg-background/70 text-muted-foreground",
                      "hover:border-border hover:bg-muted/70 hover:text-foreground",
                      "shadow-sm transition-[border-color,background-color,color] duration-150",
                      "dark:border-border/50 dark:bg-background/40",
                    )}
                    aria-label="Close panel"
                  >
                    <X className="size-4" strokeWidth={2} />
                  </Button>
                </Dialog.Close>
              </div>
            </header>

            {banner ? (
              <div
                className={cn(
                  "shrink-0 border-b border-border/40",
                  "bg-gradient-to-b from-muted/25 via-muted/15 to-background/80 px-5 py-3.5 sm:px-6",
                  "backdrop-blur-[2px] dark:from-muted/20 dark:via-muted/12 dark:to-background/90",
                )}
              >
                {banner}
              </div>
            ) : null}

            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="space-y-5 px-5 pb-8 pt-5 sm:space-y-6 sm:px-6 sm:pt-6">
                {children}
              </div>
            </div>

            {footer ? (
              <footer
                className={cn(
                  "relative shrink-0 border-t border-border/45",
                  "bg-gradient-to-t from-muted/30 via-background/95 to-background",
                  "px-5 py-3.5 backdrop-blur-md sm:px-6 sm:py-4",
                  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_-12px_40px_-18px_rgba(0,0,0,0.1)]",
                  "dark:from-muted/15 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_-12px_40px_-18px_rgba(0,0,0,0.4)]",
                )}
              >
                {footer}
              </footer>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Group fields inside a drawer with a soft panel — keeps long forms scannable */
export function FormDrawerFields({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      className={cn(
        "relative space-y-3 overflow-hidden rounded-2xl border border-border/50",
        "bg-gradient-to-br from-card/90 via-background to-muted/15",
        "p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_1px_2px_rgba(0,0,0,0.04)] sm:p-5",
        "dark:from-card/35 dark:via-background dark:to-muted/8 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-y-4 left-0 w-px rounded-full bg-gradient-to-b from-primary/0 via-primary/30 to-primary/0"
        aria-hidden
      />
      <legend className="block w-full border-b border-border/35 px-0.5 pb-3 font-heading text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {legend}
      </legend>
      {hint ? (
        <p className="px-0.5 text-xs leading-relaxed text-muted-foreground/90">{hint}</p>
      ) : null}
      <div className="space-y-3 pl-1 pt-1">{children}</div>
    </fieldset>
  );
}
