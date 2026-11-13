"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { BranchSetupDialog } from "@/components/setup/branch-setup-dialog";
import { ShiftSetupDialog } from "@/components/setup/shift-setup-dialog";
import { TillSetupDialog } from "@/components/setup/till-setup-dialog";
import {
  activeSetupHostId,
  completeSetup,
  currentSetupRequest,
  isSetupDelegated,
  registerSetupHost,
  subscribeSetup,
} from "@/lib/setup-requirements";

/**
 * Mount once per shell. Draws the "set this up first" dialog (branch, shift or till) whenever
 * the API or a screen asks for one, and reports back so the blocked action can carry on.
 *
 * If several hosts are mounted at once, only the newest draws, so nothing opens twice.
 */
export function SetupRequirementHost() {
  const [hostId, setHostId] = useState<number | null>(null);

  useEffect(() => {
    const host = registerSetupHost();
    setHostId(host.id);
    return host.unregister;
  }, []);

  const request = useSyncExternalStore(
    subscribeSetup,
    currentSetupRequest,
    () => null,
  );
  const activeId = useSyncExternalStore(
    subscribeSetup,
    activeSetupHostId,
    () => null,
  );

  if (!request || hostId == null || activeId !== hostId) {
    return null;
  }
  // A screen that owns a richer dialog for this requirement (the till's shift count) took it.
  if (isSetupDelegated(request)) {
    return null;
  }

  const onDone = () => completeSetup(request.requirement, true);
  const onDismiss = () => completeSetup(request.requirement, false);

  switch (request.requirement) {
    case "branch":
      return (
        <BranchSetupDialog
          key="branch"
          hint={request.hint}
          onDone={onDone}
          onDismiss={onDismiss}
        />
      );
    case "shift":
      return <ShiftSetupDialog key="shift" onDone={onDone} onDismiss={onDismiss} />;
    case "till":
      return <TillSetupDialog key="till" onDone={onDone} onDismiss={onDismiss} />;
    default:
      return null;
  }
}
