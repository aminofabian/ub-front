"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ShopSlideOverVariant = "floating" | "panel";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accessible name for the panel (e.g. "Your cart", "Checkout"). */
  ariaLabel: string;
  variant?: ShopSlideOverVariant;
  className?: string;
  /** Stacking order when cart + checkout can overlap */
  zIndex?: number;
};

const Z = {
  backdrop: 70,
  panel: 71,
  checkoutBackdrop: 74,
  checkoutPanel: 75,
} as const;

/**
 * Storefront overlays — `floating` cart card (desktop) or `panel` checkout sheet (~50vw).
 */
export function ShopSlideOver({
  open,
  onClose,
  children,
  ariaLabel,
  variant = "panel",
  className,
  zIndex,
}: Props) {
  if (!open) {
    return null;
  }

  const isFloating = variant === "floating";
  const backdropZ = zIndex ?? (isFloating ? Z.backdrop : Z.checkoutBackdrop);
  const panelZ = (zIndex ?? (isFloating ? Z.backdrop : Z.checkoutBackdrop)) + 1;

  return (
    <div className="fixed inset-0" style={{ zIndex: backdropZ }} role="presentation">
      <button
        type="button"
        className={cn(
          "absolute inset-0 transition-[background,backdrop-filter] duration-200",
          isFloating
            ? "bg-black/20 backdrop-blur-[2px]"
            : "bg-black/40 backdrop-blur-[3px] md:bg-black/35",
        )}
        aria-label="Close"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        style={{ zIndex: panelZ }}
        className={cn(
          "pointer-events-auto flex min-h-0 flex-col overflow-hidden bg-background",
          isFloating
            ? cn(
                "fixed right-5 top-[max(4.75rem,env(safe-area-inset-top))] bottom-[max(1.25rem,env(safe-area-inset-bottom))]",
                "w-[min(22rem,calc(100vw-2.5rem))] min-w-[19rem] max-w-md",
                "rounded-[2px] border border-border/60",
                "shadow-[0_24px_64px_-24px_rgba(18,26,22,0.3)]",
                "bg-background/97 backdrop-blur-xl supports-[backdrop-filter]:bg-background/92",
                "origin-top-right animate-in fade-in-0 zoom-in-[0.98] slide-in-from-right-5 duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
              )
            : cn(
                "fixed inset-y-0 right-0 h-[100dvh] max-h-[100dvh] w-full",
                "border-l border-border/60",
                "shadow-[-24px_0_72px_-32px_rgba(18,26,22,0.28)]",
                "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]",
                "animate-in slide-in-from-right duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                "md:w-1/2 md:max-w-[min(50vw,36rem)] md:min-w-[26rem]",
              ),
          className,
        )}
      >
        {!isFloating ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-[var(--primary)]"
            aria-hidden
          />
        ) : null}
        {children}
      </aside>
    </div>
  );
}
