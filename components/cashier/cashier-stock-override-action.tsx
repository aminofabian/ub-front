"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

type CashierStockOverrideActionProps = {
  message: string;
  disabled?: boolean;
  onConfirm: () => void;
};

export function CashierStockOverrideAction({
  message,
  disabled = false,
  onConfirm,
}: CashierStockOverrideActionProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    setArmed(false);
  }, [message]);

  return (
    <div className="rounded-none border border-amber-300/80 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="flex items-start gap-1.5 font-semibold leading-snug">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        Out of stock
      </p>
      <p className="mt-0.5 leading-snug">{message}</p>
      <p className="mt-1 leading-snug text-amber-900/80 dark:text-amber-100/75">
        {armed
          ? "Confirm to finish this sale. On-hand goes below zero until you receive more."
          : "Owners and admins can sell this once. Same result as Allow selling when out of stock in Configuration."}
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          onConfirm();
        }}
        className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-none bg-amber-500 px-2.5 text-[12px] font-bold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ShieldAlert className="size-4" aria-hidden />
        {armed ? "Confirm and sell" : "Sell anyway"}
      </button>
    </div>
  );
}
