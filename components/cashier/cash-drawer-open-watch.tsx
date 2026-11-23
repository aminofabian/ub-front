"use client";

import { useEffect } from "react";

import { startCashDrawerOpenLog } from "@/lib/cash-drawer-open-log";

/** Records drawer pulses and, when the printer reports the switch, key turns. */
export function CashDrawerOpenWatch({
  branchId,
  shiftId,
  printerName,
}: {
  branchId: string;
  shiftId: string | null;
  printerName?: string | null;
}) {
  useEffect(() => {
    const log = startCashDrawerOpenLog({ branchId, shiftId, printerName });
    return () => log.stop();
  }, [branchId, shiftId, printerName]);
  return null;
}
