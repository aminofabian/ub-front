"use client";

import { ChevronLeft, X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tab-fg)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tab-card)]";

type Props = {
  title: string;
  titleId?: string;
  onClose: () => void;
  closeDisabled?: boolean;
  closeLabel?: string;
  kicker?: ReactNode;
  trailing?: ReactNode;
};

/**
 * Phone destinations use a back chevron (leave the job, return to the tab).
 * Desktop dialogs keep a close mark.
 */
export function TabDestinationHeader({
  title,
  titleId,
  onClose,
  closeDisabled,
  closeLabel = "Back",
  kicker,
  trailing,
}: Props) {
  return (
    <header className="flex shrink-0 items-center gap-1 px-2 pb-2 pt-[max(0.35rem,env(safe-area-inset-top))] lg:gap-2 lg:px-4 lg:pt-3">
      <button
        type="button"
        onClick={onClose}
        disabled={closeDisabled}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center text-[var(--tab-fg)] disabled:opacity-40",
          focusRing,
        )}
        aria-label={closeLabel}
      >
        <ChevronLeft className="size-6 lg:hidden" strokeWidth={1.75} aria-hidden />
        <X className="hidden size-4 lg:block" strokeWidth={1.75} aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <h2
          id={titleId}
          className="truncate text-[1.05rem] font-semibold leading-tight tracking-[-0.02em]"
        >
          {title}
        </h2>
        {kicker ? (
          <div className="mt-0.5 text-[13px] leading-snug text-[var(--tab-muted)]">
            {kicker}
          </div>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </header>
  );
}

export function TabDestinationCta({
  children,
  disabled,
  onClick,
  icon: Icon,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  icon?: LucideIcon;
}) {
  return (
    <div className="shrink-0 border-t border-[var(--tab-border)] bg-[var(--tab-card)] px-4 py-3">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "flex min-h-12 w-full items-center justify-center gap-2 bg-[var(--tab-cta-bg)] px-3 text-[15px] font-semibold text-[var(--tab-cta-fg)] active:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--tab-chip)] disabled:text-[var(--tab-muted)] disabled:opacity-100",
          focusRing,
        )}
      >
        {Icon ? <Icon className="size-4" strokeWidth={1.75} aria-hidden /> : null}
        {children}
      </button>
    </div>
  );
}
