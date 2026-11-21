"use client";

import { useEffect } from "react";

import { startCashDrawerOpenLog } from "@/lib/cash-drawer-open-log";

/** Records drawer pulses and, when the printer reports the switch, key turns. */
export function CashDrawerOpenWatch({
  branchId,
  shiftId,
}: {
  branchId: string;
  shiftId: string | null;
}) {
  useEffect(() => {
    const log = startCashDrawerOpenLog({ branchId, shiftId });
    return () => log.stop();
  }, [branchId, shiftId]);
  return null;
}
