"use client";

import { useEffect, useState } from "react";

import { fetchCustomerLastSaleSummary } from "@/lib/api";

/**
 * One line after a till customer is selected. Hides on error, abort, or timeout
 * so the keypad never waits.
 */
export function TillLastBasketHint({
  customerId,
  className,
}: {
  customerId: string | null | undefined;
  className?: string;
}) {
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const id = customerId?.trim() ?? "";
    if (!id) {
      setHint(null);
      return;
    }
    const ac = new AbortController();
    setHint(null);
    void fetchCustomerLastSaleSummary(id, { signal: ac.signal })
      .then((row) => {
        if (!ac.signal.aborted) setHint(row.hint?.trim() || null);
      })
      .catch(() => {
        if (!ac.signal.aborted) setHint(null);
      });
    return () => ac.abort();
  }, [customerId]);

  if (!hint) return null;
  return (
    <p className={className ?? "mt-0.5 truncate text-[11px] text-zinc-600"}>
      {hint}
    </p>
  );
}
