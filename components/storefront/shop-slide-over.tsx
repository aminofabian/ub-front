"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accessible name for the panel (e.g. "Your cart", "Checkout"). */
  ariaLabel: string;
  className?: string;
};

/**
 * Right-edge panel (~50% viewport on md+). Avoids Radix Dialog `w-full` on the
 * `side="right"` variant, which was forcing full-width drawers.
 */
export function ShopSlideOver({
  open,
  onClose,
  children,
  ariaLabel,
  className,
}: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 md:relative md:inset-auto md:flex-1 md:bg-black/35"
        aria-label="Close"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          "relative z-10 flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background",
          "border-l border-border/60 shadow-2xl",
          "animate-in slide-in-from-right duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]",
          "md:w-1/2 md:max-w-[50vw] md:min-w-[22rem]",
          className,
        )}
      >
        {children}
      </aside>
    </div>
  );
}
