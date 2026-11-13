"use client";

import { Banknote } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { BranchSetupDialog } from "@/components/setup/branch-setup-dialog";
import { SetupExplainer } from "@/components/setup/setup-explainer";
import { useTurnOffShifts } from "@/components/setup/use-turn-off-shifts";
import { OpenShiftModal } from "@/components/shifts/shift-action-modals";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isBranchLockedRole } from "@/lib/branch-access";
import { hasPermission, Permission } from "@/lib/permissions";
import { notifyPosGuidanceResolved } from "@/lib/pos-guidance";

type Props = {
  onDone: () => void;
  onDismiss: () => void;
};

/**
 * Shown when a sale is blocked because no shift is open on this till. Explains the shift,
 * takes the opening cash count, and lets an owner switch shifts off instead.
 */
export function ShiftSetupDialog({ onDone, onDismiss }: Props) {
  const { branches, branchId, me } = useDashboard();
  const { turnOff } = useTurnOffShifts();

  const activeBranches = branches.filter((b) => b.active);
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const canOpenShift =
    hasPermission(me?.permissions, Permission.ShiftsOpen) ||
    roleKey === "owner" ||
    roleKey === "admin";

  // A shift belongs to a branch: with none yet, set that up first. Once it exists the list
  // above refreshes and this component re-renders into the shift form.
  if (activeBranches.length === 0) {
    return <BranchSetupDialog hint="none" onDone={() => {}} onDismiss={onDismiss} />;
  }

  if (!canOpenShift) {
    return <AskForShift onDismiss={onDismiss} />;
  }

  return (
    <OpenShiftModal
      open
      explain
      allowZeroFloat
      branches={activeBranches}
      preferredBranchId={branchId?.trim() || null}
      lockBranchSelectionTo={
        isBranchLockedRole(roleKey) ? (me?.branchId ?? null) : null
      }
      onSkipShifts={
        turnOff
          ? async () => {
              await turnOff();
              onDone();
            }
          : undefined
      }
      onOpened={() => {
        notifyPosGuidanceResolved("open-shift");
        onDone();
      }}
      onClose={onDismiss}
    />
  );
}

/** For accounts that may sell but may not open a shift: say what is missing and who to ask. */
function AskForShift({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <DialogContent side="center" className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-start gap-3 space-y-0 text-left">
          <span
            className="mt-1 flex size-8 shrink-0 items-center justify-center bg-[var(--op-accent,#1D4B3B)] text-white"
            aria-hidden
          >
            <Banknote className="size-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1 pr-6">
            <DialogTitle>No shift is open on this till</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              Ask the shop owner or a manager to open one, then try the sale again.
            </DialogDescription>
          </div>
        </DialogHeader>
        <SetupExplainer
          items={[
            {
              label: "What is a shift?",
              body: "A shift is one cashier's session on a till, from counting the cash in the drawer to counting it again when the session ends.",
            },
            {
              label: "Why it matters",
              body: "Sales are recorded against the open shift, and the closing count is checked against the opening float, so cash that is missing shows up as a difference.",
            },
          ]}
        />
        <DialogFooter>
          <Button type="button" onClick={onDismiss}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
