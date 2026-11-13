"use client";

import { MonitorSmartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import { BranchSetupDialog } from "@/components/setup/branch-setup-dialog";
import { SetupExplainer } from "@/components/setup/setup-explainer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { notifyPosGuidanceResolved } from "@/lib/pos-guidance";
import {
  getOrCreateTillDeviceId,
  humanTillLabel,
  setTillDeviceLabel,
  tillDeviceDisplayName,
} from "@/lib/till-device";
import {
  registerTillDevice,
  tillDeviceErrorMessage,
} from "@/lib/till-devices-api";

type Props = {
  onDone: () => void;
  onDismiss: () => void;
};

/**
 * Shown when this branch only accepts sales from registered tills and this computer is not
 * one yet. Names the device, registers it, and carries on with whatever was blocked.
 */
export function TillSetupDialog({ onDone, onDismiss }: Props) {
  const { branchId, branches } = useDashboard();
  const bid = branchId?.trim() ?? "";
  const hasBranch = bid !== "" && branches.some((b) => b.id === bid);

  // A till belongs to a branch, so a shop with no branch yet sets that up first. Once it
  // exists the dashboard selects it and this component re-renders into the till form.
  if (!hasBranch) {
    return <BranchSetupDialog hint="none" onDone={() => {}} onDismiss={onDismiss} />;
  }
  return <RegisterTill branchId={bid} onDone={onDone} onDismiss={onDismiss} />;
}

function RegisterTill({
  branchId,
  onDone,
  onDismiss,
}: {
  branchId: string;
  onDone: () => void;
  onDismiss: () => void;
}) {
  const { branches } = useDashboard();
  const branchName = branches.find((b) => b.id === branchId)?.name?.trim();

  const [label, setLabel] = useState(() => {
    getOrCreateTillDeviceId();
    const current = tillDeviceDisplayName();
    // Prefill only a name someone chose, never the generated "Till 1a2b3c4d".
    return /^Till\s+[a-f0-9]{6,}$/i.test(current) ? "" : current;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const register = async () => {
    setError("");
    setSaving(true);
    try {
      const row = await registerTillDevice({
        branchId,
        label: label.trim() || undefined,
        toast: false,
      });
      const friendly = humanTillLabel(row.label);
      setTillDeviceLabel(friendly ?? "");
      notifyPosGuidanceResolved("register-till");
      toast.success(`Registered as “${friendly ?? tillDeviceDisplayName()}”`);
      onDone();
    } catch (e) {
      setError(tillDeviceErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <DialogContent side="center" className="sm:max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void register();
          }}
        >
          <DialogHeader className="flex flex-row items-start gap-3 space-y-0 text-left">
            <span
              className="mt-1 flex size-8 shrink-0 items-center justify-center bg-[var(--op-accent,#1D4B3B)] text-white"
              aria-hidden
            >
              <MonitorSmartphone className="size-4" />
            </span>
            <div className="min-w-0 flex-1 space-y-1 pr-6">
              <DialogTitle>Register this till</DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed">
                {branchName
                  ? `${branchName} only accepts sales from tills it knows. This computer is not one yet.`
                  : "This branch only accepts sales from tills it knows. This computer is not one yet."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <SetupExplainer
            items={[
              {
                label: "What is a till?",
                body: "A till is a computer or tablet that rings up sales at one counter. Registering gives this one a name.",
              },
              {
                label: "Why it matters",
                body: "Every sale, shift and receipt is kept against the till that made it, so you can tell counters apart. Managers can revoke a till later in Business settings, under Trusted tills.",
              },
            ]}
          />
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Till name</span>
            <Input
              className="rounded-[2px]"
              value={label}
              onChange={(e) => setLabel(e.target.value.slice(0, 80))}
              placeholder="e.g. Front counter"
              maxLength={80}
              autoFocus
              disabled={saving}
            />
          </label>
          {error ? (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onDismiss}
            >
              Not now
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Registering…" : "Register this till"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
