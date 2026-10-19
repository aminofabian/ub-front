"use client";

import * as React from "react";
import { AlertCircle, X } from "lucide-react";
import { Dialog } from "radix-ui";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { SheetGrabber, useSheetDragDismiss } from "@/components/ui/sheet-drag";
import { dashboardBrandingAccentStops } from "@/lib/brand-theme";
import { setFormDrawerOpen } from "@/lib/chrome-fabs";
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
  /** default ≈ md; wide ≈ 3xl; large ≈ 5xl; extraWide ≈ data tables; third = right ⅓; half = right 50vw; full = entire viewport */
  width?: "default" | "wide" | "large" | "extraWide" | "third" | "half" | "full";
  /**
   * When set on large layouts, the panel fills this node (the last products
   * column) instead of covering the whole page. Mobile still uses the overlay.
   */
  dockRoot?: HTMLElement | null;
  /** True when the host column is on screen (lg+). Overlay is used otherwise. */
  docked?: boolean;
  /** Square panels and crisp borders — buttons keep their default radius */
  appearance?: "default" | "sharp";
  /**
   * `sheet` (default) slides in from the right (bottom on phones).
   * `center` renders a centred, rounded modal instead.
   */
  presentation?: "sheet" | "center";
  /** Tighter header row — icon, kicker, and title on one line */
  headerDensity?: "default" | "compact";
  /**
   * `scroll` (default): body scrolls as one column.
   * `fill`: body is a fixed-height flex column — child manages its own scroll
   * (e.g. full-viewport Order workspace).
   */
  bodyLayout?: "scroll" | "fill";
  /**
   * Hide the title header entirely — used when the child brings its own chrome
   * (Sell till drawer with CashierBottomNav). A visually-hidden title stays for a11y.
   */
  hideHeader?: boolean;
  /** When set, marks the drawer panel for onboarding tour spotlight. */
  onboardingTarget?: OnboardingTargetId;
};

/** Compact alert for drawer banners — sharp by default for sheet drawers. */
export function FormDrawerMessageBanner({
  text,
  sharp = true,
  tone = "danger",
}: {
  text: string;
  sharp?: boolean;
  /** danger = errors; notice = success / guidance (e.g. group created) */
  tone?: "danger" | "notice";
}) {
  const t = text.trim();
  if (!t) return null;
  const isNotice = tone === "notice";
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 border px-3 py-2.5 text-[13px] leading-snug",
        sharp ? "rounded-none shadow-none" : "rounded-xl shadow-sm",
        isNotice
          ? "border-border bg-muted/30 text-foreground/80"
          : sharp
            ? "border-destructive/35 bg-destructive/[0.06] text-destructive dark:bg-destructive/10"
            : cn(
                "border-destructive/35 text-destructive",
                "bg-gradient-to-br from-destructive/[0.08] via-destructive/[0.04] to-transparent",
                "dark:border-destructive/30 dark:from-destructive/15 dark:via-destructive/8",
              ),
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center",
          sharp ? "rounded-none" : "rounded-lg",
          isNotice
            ? "bg-muted text-foreground/50"
            : "bg-destructive/10 text-destructive dark:bg-destructive/20",
        )}
      >
        <AlertCircle className="size-3.5" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 pt-0.5 whitespace-pre-wrap font-medium tracking-tight">
        {t}
      </p>
    </div>
  );
}

/** Pick banner tone from a catalog status string. */
export function catalogMessageBannerTone(text: string): "danger" | "notice" {
  const t = text.trim().toLowerCase();
  if (!t) return "danger";
  if (/error|fail|invalid|required|unable|denied|forbidden|conflict/.test(t)) {
    return "danger";
  }
  if (
    /created|saved|updated|added|success|linked|uploaded|turned on|tracking is on/.test(
      t,
    )
  ) {
    return "notice";
  }
  if (/turn on stock tracking|stock tracking first/.test(t)) {
    return "notice";
  }
  return "danger";
}

/**
 * Form sheet: right-edge on desktop, bottom sheet on phones. Built on Radix
 * Dialog for focus trap, scroll lock, and accessibility.
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
  appearance = "sharp",
  presentation = "sheet",
  headerDensity = "default",
  bodyLayout = "scroll",
  hideHeader = false,
  onboardingTarget,
  dockRoot = null,
  docked = false,
}: FormDrawerProps) {
  const sharp = appearance === "sharp";
  const compactHeader = headerDensity === "compact";
  const fillBody = bodyLayout === "fill";
  const isFull = width === "full";
  const inColumn = docked && !!dockRoot;
  const centered = presentation === "center" && !inColumn;
  const [phone, setPhone] = React.useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 639px)").matches
      : false,
  );
  React.useEffect(() => {
    if (!open) return;
    setFormDrawerOpen(true);
    return () => setFormDrawerOpen(false);
  }, [open]);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setPhone(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const sheetBottom = !inColumn && !isFull && !centered && phone;
  const { panelRef, grabberProps, dragging } = useSheetDragDismiss({
    enabled: sheetBottom,
    onDismiss: () => onOpenChange(false),
  });
  const dash = useOptionalDashboard();
  const brandStops = React.useMemo(
    () => dashboardBrandingAccentStops(dash?.business?.branding ?? null),
    [dash?.business?.branding],
  );

  const iconChromeStyle = brandStops
    ? {
        borderColor: `color-mix(in srgb, ${brandStops.from} 32%, transparent)`,
        color: brandStops.from,
      }
    : undefined;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
      modal={!onboardingTarget && !inColumn}
    >
      <Dialog.Portal container={inColumn ? dockRoot : undefined}>
        {!onboardingTarget && !isFull && !inColumn ? (
          <Dialog.Overlay
            className={cn(
              // Base color must read as a real scrim on browsers that don't
              // support `backdrop-filter` (older Chromium on Windows 10, GPUs
              // with hardware acceleration disabled, etc.). The blur is a
              // progressive enhancement, not the source of separation.
              "fixed inset-0 z-50 bg-black/35 dark:bg-black/55",
              "supports-[backdrop-filter]:bg-black/20 supports-[backdrop-filter]:backdrop-blur-[3px]",
              "supports-[backdrop-filter]:dark:bg-black/40",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200",
            )}
          />
        ) : null}
        <Dialog.Content
          ref={panelRef}
          {...(sheetBottom ? { "data-phone-sheet": "" } : {})}
          {...(onboardingTarget
            ? { "data-onboarding-target": onboardingTarget }
            : {})}
          className={cn(
            "form-drawer premium-portal flex flex-col overflow-hidden outline-none",
            inColumn
              ? "absolute inset-0 z-10 h-full max-h-full w-full max-w-none"
              : "fixed",
            !inColumn && (onboardingTarget ? "z-[250]" : "z-50"),
            inColumn
              ? cn(
                  "rounded-none border-0 bg-[var(--op-surface)] shadow-none",
                  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                )
              : centered
                ? cn(
                    "fixed inset-0 m-auto h-fit max-h-[min(92dvh,46rem)] w-[calc(100%-1.5rem)]",
                    "sm:w-[min(48rem,calc(100vw-4rem))]",
                    "rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)]",
                    "shadow-[0_24px_64px_-24px_rgba(18,26,22,0.3)] dark:border-border/60 dark:shadow-[0_24px_64px_-24px_rgba(0,0,0,0.6)]",
                    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                  )
                : isFull
                ? cn(
                    // No zoom — a transform on this panel traps `position: fixed`
                    // descendants (e.g. the Sell cart dock) and pins them mid-screen.
                    "inset-0 h-[100dvh] max-h-[100dvh] w-full max-w-none rounded-none border-0 bg-[var(--op-bg)] shadow-none",
                    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                  )
                : sheetBottom
                  ? cn(
                      "inset-x-0 bottom-0 top-auto h-auto max-h-[min(92dvh,44rem)] w-full",
                      "rounded-t-[2px] border border-[var(--op-rule)] border-b-0 bg-[var(--op-surface)]",
                      "shadow-[0_-16px_48px_-24px_rgba(18,26,22,0.22)]",
                      "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                    )
                  : cn(
                    "border-l border-[var(--op-rule)] bg-[var(--op-surface)] shadow-[-16px_0_48px_-28px_rgba(18,26,22,0.22)]",
                    "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
                    "inset-y-0 right-0 h-[100dvh] max-h-[100dvh] w-full",
                    "sm:rounded-l-[2px]",
                    width === "third"
                      ? "w-full min-w-0 sm:w-[38vw] sm:min-w-[22rem] sm:max-w-[40rem]"
                      : width === "half"
                        ? "w-full min-w-0 sm:w-[50vw] sm:max-w-[50vw]"
                        : width === "extraWide"
                          ? "sm:max-w-[min(92rem,calc(100vw-1.25rem))]"
                          : width === "large"
                            ? "sm:max-w-5xl"
                            : width === "wide"
                              ? "sm:max-w-3xl"
                              : "sm:max-w-xl",
                  ),
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            !inColumn &&
              (sheetBottom
                ? "pb-[env(safe-area-inset-bottom)]"
                : "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"),
            !inColumn &&
              (isFull
                ? "pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
                : sheetBottom
                  ? null
                  : "pr-[env(safe-area-inset-right)]"),
          )}
        >
          {/* Accent rail — thin when sharp, soft brand bar otherwise */}
          {!inColumn && !sheetBottom && !centered && brandStops ? (
            <div
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 opacity-[0.92]",
                "w-px",
              )}
              style={{ background: brandStops.from }}
              aria-hidden
            />
          ) : !inColumn && !sheetBottom && !centered ? (
            <div
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0",
                "w-px bg-[var(--op-accent)]",
              )}
              aria-hidden
            />
          ) : null}


          <div
            className={cn(
              "relative flex min-h-0 flex-1 flex-col",
              !inColumn && !sheetBottom && !centered && "pl-px",
            )}
          >
            {sheetBottom ? (
              <SheetGrabber {...grabberProps} dragging={dragging} />
            ) : null}
            {hideHeader ? (
              <>
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                <Dialog.Description className="sr-only">
                  {typeof description === "string" && description
                    ? description
                    : "Form panel. Press Escape to close."}
                </Dialog.Description>
                <Dialog.Close asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-2 top-2 z-40 size-9 rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] text-[var(--op-muted)] shadow-none hover:border-[var(--op-accent)] hover:text-[var(--op-accent)]"
                    aria-label="Close panel"
                  >
                    <X className="size-3.5" strokeWidth={2} />
                  </Button>
                </Dialog.Close>
              </>
            ) : (
            <header
              className={cn(
                "relative shrink-0 overflow-hidden border-b border-[var(--op-rule)]",
                compactHeader
                  ? "px-3 py-1.5"
                  : sheetBottom
                    ? "px-4 pb-3 pt-1"
                    : isFull
                      ? "px-3 py-2 sm:px-6 sm:py-5"
                      : "px-5 py-4 sm:px-6 sm:py-5",
                "bg-[var(--op-surface)] shadow-none",
              )}
            >
              <div
                className={cn(
                  "relative flex justify-between gap-2",
                  compactHeader ? "items-center" : "items-start sm:gap-4",
                )}
              >
                {compactHeader ? (
                  <>
                    <div className="flex min-w-0 items-center gap-2">
                      {icon ? (
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center border border-border bg-muted/30",
                            sharp ? "rounded-none" : "rounded-md",
                          )}
                          style={iconChromeStyle}
                        >
                          {icon}
                        </span>
                      ) : null}
                      <div className="flex min-w-0 items-center gap-2">
                        {contextLabel ? (
                          <>
                            <span
                              className={cn(
                                "shrink-0 text-[11px] font-semibold tracking-[-0.02em]",
                                sharp ? "text-foreground/40" : "text-primary",
                              )}
                            >
                              {contextLabel}
                            </span>
                            <span className="text-foreground/25" aria-hidden>
                              ·
                            </span>
                          </>
                        ) : null}
                        <Dialog.Title
                          className="truncate text-[1.05rem] font-normal tracking-[-0.02em] text-[var(--op-ink)]"
                          style={{
                            fontFamily:
                              'var(--font-cormorant), Georgia, "Times New Roman", serif',
                          }}
                        >
                          {title}
                        </Dialog.Title>
                      </div>
                      {description ? (
                        <Dialog.Description className="sr-only">
                          {typeof description === "string"
                            ? description
                            : title}
                        </Dialog.Description>
                      ) : (
                        <Dialog.Description className="sr-only">
                          Form panel. Press Escape to close.
                        </Dialog.Description>
                      )}
                    </div>
                    <Dialog.Close asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className={cn(
                          "size-7 shrink-0 rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] text-[var(--op-muted)] shadow-none hover:border-[var(--op-accent)] hover:text-[var(--op-accent)]",
                          sheetBottom && "size-10 sm:size-7",
                        )}
                        aria-label="Close panel"
                      >
                        <X className="size-3.5" strokeWidth={2} />
                      </Button>
                    </Dialog.Close>
                  </>
                ) : (
                  <>
                    <div className="flex min-w-0 gap-2 sm:gap-4">
                      {icon ? (
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center ring-offset-1 ring-offset-background sm:size-12",
                            "rounded-[2px]",
                            brandStops
                              ? cn(
                                  "border border-border bg-muted/40",

                                )
                              : cn(
                                  "text-primary border border-border",
                                  sharp
                                    ? "bg-muted/30"
                                    : "bg-[color-mix(in_srgb,var(--op-accent)_7%,var(--op-surface))]",
                                ),
                          )}
                          style={iconChromeStyle}
                        >
                          {icon}
                        </span>
                      ) : null}
                      <div className="min-w-0 space-y-1 pt-0.5 sm:space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          {contextLabel ? (
                            <span
                              className={cn(
                                "inline-flex max-w-full items-center",
                                "px-0 py-0",
                                "text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--op-accent)]",
                              )}
                            >
                              {contextLabel}
                            </span>
                          ) : null}
                          {description ? (
                            <span className="hidden text-[10px] font-medium tabular-nums text-muted-foreground/75 sm:inline">
                              Esc to close
                            </span>
                          ) : null}
                        </div>
                        <Dialog.Title
                          className={cn(
                            "font-normal tracking-[-0.02em] text-[var(--op-ink)]",
                            sheetBottom ? "text-[1.35rem]" : "text-[1.35rem] sm:text-[1.6rem]",
                          )}
                          style={{
                            fontFamily:
                              'var(--font-cormorant), Georgia, "Times New Roman", serif',
                          }}
                        >
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
                          <p className="hidden text-[11px] text-muted-foreground/80 sm:block">
                            Press Esc to close
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <Dialog.Close asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className={cn(
                          "relative z-50 shrink-0 rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] text-[var(--op-muted)]",
                          "hover:border-[var(--op-accent)] hover:text-[var(--op-accent)]",
                          "shadow-none transition-colors duration-150",
                          sheetBottom && "size-10 sm:size-8",
                        )}
                        aria-label="Close panel"
                      >
                        <X className="size-4" strokeWidth={2} />
                      </Button>
                    </Dialog.Close>
                  </>
                )}
              </div>
            </header>
            )}

            {banner ? (
              <div
                className={cn(
                  "shrink-0 border-b border-[var(--op-rule)]",
                  compactHeader ? "px-3 py-2" : "px-5 py-3.5 sm:px-6",
                  "bg-[var(--op-surface)]",
                )}
              >
                {sharp && React.isValidElement(banner)
                  ? React.cloneElement(
                      banner as React.ReactElement<{ sharp?: boolean }>,
                      { sharp: true },
                    )
                  : banner}
              </div>
            ) : null}

            <div
              className={cn(
                "relative min-h-0 flex-1",
                fillBody
                  ? "flex flex-col overflow-hidden"
                  : "overflow-y-auto overscroll-contain",
              )}
            >
              <div
                className={cn(
                  fillBody
                    ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                    : compactHeader && isFull
                      ? "px-3 pb-2 pt-1.5"
                      : isFull
                        ? "space-y-2 px-2.5 pb-3 pt-2 sm:space-y-5 sm:px-6 sm:pb-8 sm:pt-5"
                        : compactHeader && !isFull
                          ? "space-y-2 px-3 pb-4 pt-2"
                          : width === "half"
                            ? "space-y-4 px-4 pb-6 pt-4 sm:px-5"
                            : "space-y-5 px-5 pb-8 pt-5 sm:space-y-6 sm:px-6 sm:pt-6",
                )}
              >
                {children}
              </div>
            </div>

            {footer ? (
              <footer
                className={cn(
                  "relative shrink-0 border-t border-[var(--op-rule)]",
                  compactHeader
                    ? "px-3 py-2"
                    : isFull
                      ? "px-2.5 py-2 sm:px-6 sm:py-4"
                      : "px-5 py-3.5 sm:px-6 sm:py-4",
                  "bg-[var(--op-surface)] shadow-none",
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

/** Group fields inside a drawer — sharp = sheet blocks; default = soft cards */
export function FormDrawerFields({
  legend,
  hint,
  compact = false,
  appearance = "sharp",
  embedded = false,
  index,
  children,
}: {
  /** Omit to hide the section header (fields only). */
  legend?: string;
  hint?: React.ReactNode;
  /** Tighter panel for half-width or dense drawers */
  compact?: boolean;
  /** Square panels, thin borders, no shadow */
  appearance?: "default" | "sharp";
  /** Inside a divided sheet stack — no outer border */
  embedded?: boolean;
  /** Optional ledger index shown beside sharp legends (e.g. 01) */
  index?: number | string;
  children: React.ReactNode;
}) {
  const sharp = appearance === "sharp";
  const indexLabel =
    index == null
      ? null
      : typeof index === "number"
        ? String(index).padStart(2, "0")
        : index;
  const hasLegend = Boolean(legend?.trim());

  return (
    <fieldset
      className={cn(
        "relative overflow-hidden",
        sharp || compact
          ? cn(
              "bg-[var(--op-surface)] shadow-none",
              compact ? "space-y-2" : "space-y-2.5",
              embedded
                ? cn("rounded-none border-0", compact ? "p-2.5" : "p-3")
                : "rounded-none border border-[var(--op-rule)] p-2.5",
            )
          : cn(
              "relative overflow-hidden rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)]",
              compact
                ? "space-y-2 p-2.5 shadow-sm"
                : cn(
                    "space-y-3 bg-[var(--op-surface)] p-4 sm:p-5",
                  ),
            ),
      )}
    >
      {hasLegend ? (
        <legend
          className={cn(
            "block w-full border-b px-0.5",
            sharp || compact
              ? cn("border-border", compact ? "pb-1.5" : "pb-2")
              : "border-border/35 pb-3 font-heading text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground",
          )}
        >
          {sharp || compact ? (
            <span className="flex items-baseline gap-2">
              {indexLabel ? (
                <span className="font-mono text-[10px] font-medium tabular-nums tracking-tight text-foreground/35">
                  {indexLabel}
                </span>
              ) : null}
              <span className="text-[11px] font-semibold tracking-tight text-foreground/70">
                {legend}
              </span>
            </span>
          ) : (
            legend
          )}
        </legend>
      ) : null}
      {hint ? (
        <p
          className={cn(
            "px-0.5",
            sharp || compact
              ? "text-[11px] font-normal leading-snug text-foreground/45"
              : "text-xs leading-relaxed text-muted-foreground/90",
          )}
        >
          {hint}
        </p>
      ) : null}
      <div
        className={cn(
          compact ? "space-y-2" : sharp ? "space-y-2.5" : "space-y-3 pl-1 pt-1",
        )}
      >
        {children}
      </div>
    </fieldset>
  );
}

/** Continuous bordered sheet for stacking {@link FormDrawerFields} with embedded */
export function FormDrawerSheet({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col divide-y divide-[var(--op-rule)] overflow-hidden rounded-none border border-[var(--op-rule)] bg-[var(--op-surface)] shadow-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
