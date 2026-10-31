"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { COUNT_TONE } from "./count-tone";

type Props = {
  completed: boolean;
  busy: boolean;
  onCancel: () => void;
  onStartNew: () => void;
};

/** Manager-only: start the next round, or call off a count with a second tap to confirm. */
export function CycleFooterActions({ completed, busy, onCancel, onStartNew }: Props) {
  const [confirming, setConfirming] = useState(false);
  if (completed) {
    return (
      <button type="button" className={COUNT_TONE.primaryButton} onClick={onStartNew}>
        Start the next full count
      </button>
    );
  }
  return (
    <div className={cn("flex flex-col items-start gap-0.5 border-t pt-3", COUNT_TONE.hair)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => (confirming ? onCancel() : setConfirming(true))}
        onBlur={() => setConfirming(false)}
        className={cn(
          "min-h-9 text-[13px] font-medium underline-offset-4 hover:underline disabled:opacity-50",
          confirming ? "text-red-700" : COUNT_TONE.mute,
        )}
      >
        {confirming ? "Tap again to call off the full count" : "Call off this full count"}
      </button>
      <p className={cn("text-[12px] leading-snug", COUNT_TONE.faint)}>
        Counts already posted stay. Uncounted products drop from the plan.
      </p>
    </div>
  );
}
