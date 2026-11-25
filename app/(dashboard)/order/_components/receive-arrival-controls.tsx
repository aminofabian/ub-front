"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ARRIVAL_AS_ORDERED,
  ARRIVAL_DAMAGED,
  ARRIVAL_MISSING,
  ARRIVAL_SHORT,
  type ArrivalDecision,
} from "@/app/(dashboard)/order/_lib/receive-arrival";

const CONTROL =
  "inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-xl border px-2 text-[11px] font-semibold leading-none transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)] disabled:opacity-40";

const IDLE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white text-[var(--order-ink,#15231f)]";

const ON = "border-[var(--pos-primary,#0f766e)] bg-[#e6f4f0] text-[#0f766e]";

const MISSING_ON = "border-red-700 bg-red-50 text-red-800";

type ReceiveArrivalControlsProps = {
  decision: ArrivalDecision | undefined;
  disabled?: boolean;
  onDecide: (kind: ArrivalDecision) => void;
};

export function ReceiveArrivalControls({
  decision,
  disabled = false,
  onDecide,
}: ReceiveArrivalControlsProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreOn = decision === ARRIVAL_SHORT || decision === ARRIVAL_DAMAGED;

  const choose = (kind: ArrivalDecision) => {
    setMoreOpen(false);
    onDecide(kind);
  };

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="What arrived">
      <button
        type="button"
        className={cn(CONTROL, decision === ARRIVAL_AS_ORDERED ? ON : IDLE)}
        aria-pressed={decision === ARRIVAL_AS_ORDERED}
        disabled={disabled}
        onClick={() => choose(ARRIVAL_AS_ORDERED)}
      >
        <Check className="size-4" aria-hidden />
        As ordered
      </button>
      <button
        type="button"
        className={cn(CONTROL, decision === ARRIVAL_MISSING ? MISSING_ON : IDLE)}
        aria-pressed={decision === ARRIVAL_MISSING}
        disabled={disabled}
        onClick={() => choose(ARRIVAL_MISSING)}
      >
        <X className="size-4" aria-hidden />
        Didn't come
      </button>
      <div className="relative">
        <button
          type="button"
          className={cn(CONTROL, moreOn ? ON : IDLE)}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          disabled={disabled}
          onClick={() => setMoreOpen((open) => !open)}
        >
          {decision === ARRIVAL_SHORT
            ? "Short"
            : decision === ARRIVAL_DAMAGED
              ? "Damaged"
              : "More"}
        </button>
        {moreOpen ? (
          <div
            role="menu"
            className="absolute left-0 z-20 mt-1 w-36 rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-1 shadow-[0_8px_24px_-12px_rgba(21,35,31,0.45)]"
          >
            <button
              type="button"
              role="menuitem"
              className="flex h-11 w-full items-center rounded-lg px-2 text-left text-[13px] font-semibold hover:bg-[#f4f7f6]"
              onClick={() => choose(ARRIVAL_SHORT)}
            >
              Short
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex h-11 w-full items-center rounded-lg px-2 text-left text-[13px] font-semibold hover:bg-[#f4f7f6]"
              onClick={() => choose(ARRIVAL_DAMAGED)}
            >
              Damaged
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
