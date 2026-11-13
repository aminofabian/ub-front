"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import { updateBusiness } from "@/lib/api";

/**
 * The "sell without shifts" shortcut offered next to the open-shift count.
 *
 * Only people who can change business settings get it (`turnOff` is null for everyone else).
 * It flips the same switch as Business settings, then reloads the session so every till on
 * this screen sees the new value. Rejects with the API's message when saving fails, so the
 * dialog that called it can show the reason in place.
 */
export function useTurnOffShifts(): { turnOff: (() => Promise<void>) | null } {
  const { canManageBusinessSettings, refreshSession } = useDashboard();

  const turnOff = useCallback(async () => {
    await updateBusiness({ featureFlags: { shiftsDisabled: true } });
    await refreshSession();
    toast.success("Shifts are off. Tills now sell without opening one.");
  }, [refreshSession]);

  return { turnOff: canManageBusinessSettings ? turnOff : null };
}
