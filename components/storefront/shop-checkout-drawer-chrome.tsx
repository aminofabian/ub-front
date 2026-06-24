"use client";

import type { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

/** Desktop checkout panel chrome — title rail + secure hint */
export function ShopCheckoutDrawerChrome({ onClose, children, className }: Props) {
  return (
    <div className={cn("relative flex h-full min-h-0 flex-col", className)}>
      <header className="relative z-20 flex shrink-0 items-center gap-3 border-b border-border/50 bg-background/90 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 sm:px-5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Back to shop"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary/85">
            Secure checkout
          </p>
          <h2 className="truncate font-serif text-lg font-semibold tracking-tight text-foreground">
            Complete your order
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close checkout"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_100%_0%,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
