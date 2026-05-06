"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/ui/button";
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
  children: React.ReactNode;
  /** Sticky actions bar (Save, Cancel, etc.) */
  footer?: React.ReactNode;
  /** default ≈ md; wide ≈ 2xl; extraWide ≈ full data tables (supply lines, etc.) */
  width?: "default" | "wide" | "extraWide";
};

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
  children,
  footer,
  width = "default",
}: FormDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-background/40 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex flex-col border-l border-border/80 bg-background shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "duration-200 ease-out",
            "inset-y-0 right-0 h-[100dvh] max-h-[100dvh] w-full rounded-none",
            width === "extraWide"
              ? "sm:max-w-[min(90rem,calc(100vw-1.5rem))]"
              : width === "wide"
                ? "sm:max-w-2xl"
                : "sm:max-w-md",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          )}
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-500 via-fuchsia-400 to-amber-400 opacity-90"
            aria-hidden
          />
          <div className="flex min-h-0 flex-1 flex-col pl-1">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 bg-gradient-to-br from-muted/50 via-background to-background px-4 py-4 sm:px-5">
              <div className="flex min-w-0 gap-3">
                {icon ? (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background shadow-sm">
                    {icon}
                  </span>
                ) : null}
                <div className="min-w-0 space-y-1">
                  {contextLabel ? (
                    <span className="inline-flex max-w-full items-center rounded-full border border-primary/15 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {contextLabel}
                    </span>
                  ) : null}
                  <Dialog.Title className="font-heading text-lg font-semibold tracking-tight text-foreground">
                    {title}
                  </Dialog.Title>
                  {description ? (
                    <Dialog.Description className="text-sm leading-snug text-muted-foreground">
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
                  className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                  aria-label="Close panel"
                >
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              <div className="space-y-6">{children}</div>
            </div>

            {footer ? (
              <footer className="shrink-0 border-t border-border/60 bg-muted/20 px-4 py-3 backdrop-blur-sm sm:px-5">
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
    <fieldset className="space-y-3 rounded-xl border border-border/70 bg-gradient-to-br from-muted/15 via-background to-background p-4 shadow-sm">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {legend}
      </legend>
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}
