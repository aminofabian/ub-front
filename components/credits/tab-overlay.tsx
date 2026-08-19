"use client";

import { useEffect, type ReactNode, type Ref } from "react";

import { cn } from "@/lib/utils";

export const tabOverlayHeaderClass =
  "flex shrink-0 items-start justify-between gap-3 px-4 pb-2 lg:bg-[var(--tab-fg)] lg:px-5 lg:py-4 lg:text-[var(--tab-bg)]";

export const tabOverlayCloseClass =
  "flex size-9 shrink-0 items-center justify-center border border-[var(--tab-border)] text-[var(--tab-muted)] lg:border-[color-mix(in_oklab,var(--tab-bg)_32%,transparent)] lg:text-[color-mix(in_oklab,var(--tab-bg)_82%,var(--tab-fg))]";

export const tabOverlayKickerClass =
  "mt-1 text-[14px] text-[var(--tab-muted)] lg:text-[color-mix(in_oklab,var(--tab-bg)_72%,var(--tab-fg))]";

type TabOverlaySize = "ticket" | "ledger" | "destination";

type Props = {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  label?: string;
  keyboardInset: number;
  size?: TabOverlaySize;
  closeDisabled?: boolean;
  panelRef?: Ref<HTMLDivElement>;
  children: ReactNode;
};

export function TabOverlay({
  open,
  onClose,
  labelledBy,
  label,
  keyboardInset,
  size = "ticket",
  closeDisabled,
  panelRef,
  children,
}: Props) {
  const destination = size === "destination";

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closeDisabled) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeDisabled, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col",
        destination
          ? "justify-stretch lg:items-center lg:justify-center lg:p-8"
          : "justify-end lg:items-center lg:justify-center lg:p-8",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 bg-black/60",
          destination && "max-lg:hidden",
        )}
        aria-label="Close"
        disabled={closeDisabled}
        onClick={() => {
          if (!closeDisabled) onClose();
        }}
      />
      <div
        ref={panelRef}
        className={cn(
          "relative flex w-full flex-col overflow-hidden bg-[var(--tab-card)]",
          "motion-safe:animate-in motion-safe:duration-200 motion-safe:ease-out",
          destination
            ? cn(
                "h-[100dvh] max-h-[100dvh] border-0 bg-[var(--tab-bg)]",
                "max-lg:motion-safe:fade-in-0 max-lg:motion-safe:slide-in-from-right-4",
                "lg:h-auto lg:max-h-[min(44rem,86dvh)] lg:border-2 lg:border-[var(--tab-border)] lg:bg-[var(--tab-card)]",
                "lg:motion-safe:fade-in-0 lg:motion-safe:zoom-in-[0.98]",
                "lg:w-[min(100%,28rem)]",
              )
            : cn(
                "max-h-[92dvh] border-t-2 border-[var(--tab-border)]",
                "max-lg:motion-safe:slide-in-from-bottom-full",
                "lg:max-h-[min(44rem,86dvh)] lg:border-2 lg:border-t-2",
                "lg:motion-safe:fade-in-0 lg:motion-safe:zoom-in-[0.98]",
                size === "ledger"
                  ? "lg:min-h-[32rem] lg:w-[min(100%,54rem)]"
                  : "lg:w-[min(100%,28rem)]",
              ),
        )}
        style={{
          paddingBottom: `max(${keyboardInset}px, env(safe-area-inset-bottom))`,
        }}
      >
        {!destination ? (
          <div className="flex shrink-0 justify-center py-1.5 lg:hidden" aria-hidden>
            <div className="h-1 w-10 bg-[var(--tab-border)]" />
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
