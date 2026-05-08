"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Props = {
  stockLabel: string | null;
  qtyOnHand: number | null | undefined;
};

export default function LowStockNotice({ stockLabel, qtyOnHand }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const qty = qtyOnHand ?? 0;
  const label = stockLabel ?? "";

  useEffect(() => {
    if (qty <= 0 || qty > 5) return;
    const t = setTimeout(() => setDismissed(true), 6000);
    return () => clearTimeout(t);
  }, [qty]);

  if (dismissed || qty <= 0 || qty > 5 || !label) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-3 sm:px-6">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm shadow-sm">
        <p className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <span className="text-base">⚠️</span>
          Only {label.replace(/^(\d+).*/, "$1")} available at this store
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-amber-600 hover:bg-amber-500/20"
          aria-label="Dismiss"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
