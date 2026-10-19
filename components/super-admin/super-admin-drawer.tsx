"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SuperAdminDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** default ≈ md; wide for tables / filters */
  width?: "default" | "wide";
};

/**
 * Right-edge panel for super-admin filters, settings shortcuts, and detail
 * views. Uses Radix Dialog for focus management and scroll lock.
 */
export function SuperAdminDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = "default",
}: SuperAdminDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/[0.14] backdrop-blur-[2px] dark:bg-black/45",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200",
          )}
        />
        <Dialog.Content
          className={cn(
            "premium-portal fixed z-50 flex max-h-[100dvh] flex-col overflow-hidden outline-none",
            "inset-y-0 right-0 h-[100dvh] w-full border-l border-[var(--op-rule)] bg-[var(--op-surface)] shadow-[-20px_0_56px_-28px_rgba(18,26,22,0.22)]",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "sm:rounded-l-[2px]",
            width === "wide" ? "sm:max-w-2xl" : "sm:max-w-md",
          )}
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-px bg-[var(--op-accent)]"
            aria-hidden
          />
          <header className="relative flex shrink-0 items-start justify-between gap-4 border-b border-[var(--op-rule)] px-5 py-4 sm:px-6">
            <div className="min-w-0 pt-0.5">
              <Dialog.Title
                className="text-[1.6rem] font-normal tracking-[-0.02em] text-[var(--op-ink)]"
                style={{
                  fontFamily:
                    'var(--font-cormorant), Georgia, "Times New Roman", serif',
                }}
              >
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-[var(--op-muted)]">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">Panel. Press Escape to close.</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 rounded-[2px] border border-[var(--op-rule)] text-[var(--op-muted)] hover:border-[var(--op-accent)] hover:text-[var(--op-accent)]"
                aria-label="Close panel"
              >
                <X className="size-4" strokeWidth={2} />
              </Button>
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--op-surface)] px-5 py-5 sm:px-6 sm:py-6">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
