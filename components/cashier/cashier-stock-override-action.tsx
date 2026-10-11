"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, ShoppingCart } from "lucide-react";

type CashierStockOverrideActionProps = {
  message: string;
  disabled?: boolean;
  onSellThisSale: () => void;
  onAllowForEverySale?: () => Promise<void> | void;
};

export function CashierStockOverrideAction({
  message,
  disabled = false,
  onSellThisSale,
  onAllowForEverySale,
}: CashierStockOverrideActionProps) {
  const [armed, setArmed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setArmed(false);
  }, [message]);

  const allowForEverySale = async () => {
    if (!onAllowForEverySale || saving) return;
    setSaving(true);
    try {
      await onAllowForEverySale();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-none border border-amber-400 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-50">
      <p className="flex items-start gap-1.5 font-semibold leading-snug">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        {message}
      </p>
      <div className="mt-2 grid gap-1.5">
        <button
          type="button"
          disabled={disabled || saving}
          onClick={() => {
            if (!armed) {
              setArmed(true);
              return;
            }
            onSellThisSale();
          }}
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-none bg-amber-500 px-2.5 text-[13px] font-bold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          <ShieldAlert className="size-4" aria-hidden />
          {armed ? "Confirm and sell this sale" : "Sell this sale"}
        </button>
        {onAllowForEverySale ? (
          <button
            type="button"
            disabled={disabled || saving}
            onClick={() => void allowForEverySale()}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-none border border-amber-700/40 bg-white px-2.5 text-[13px] font-bold text-amber-950 hover:bg-amber-100 disabled:opacity-50 dark:bg-amber-950 dark:text-amber-50"
          >
            <ShoppingCart className="size-4" aria-hidden />
            {saving ? "Saving…" : "Allow selling when out of stock"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
