"use client";

import { useEffect, useRef } from "react";

import { syncTeamAccounts } from "@/lib/service-business-api";

/**
 * In a shop that sells services, makes sure everyone on the team has an account before a page
 * that lists accounts (Users, Payroll, Commissions) is read, so nobody added by name is missing
 * from it. Runs once per page visit; when it made any, `onSynced` is called to read the list
 * again. A person who may not add accounts simply gets the list as it is.
 */
export function useTeamAccountSync(enabled: boolean, onSynced: () => void): void {
  const ran = useRef(false);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  useEffect(() => {
    if (!enabled || ran.current) return;
    ran.current = true;
    void syncTeamAccounts()
      .then((result) => {
        if (result.created > 0) onSyncedRef.current();
      })
      .catch(() => undefined);
  }, [enabled]);
}
