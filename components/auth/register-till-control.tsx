"use client";

import { useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getOrCreateTillDeviceId,
  setTillDeviceLabel,
  tillDeviceDisplayName,
} from "@/lib/till-device";
import {
  registerTillDevice,
  tillDeviceErrorMessage,
} from "@/lib/till-devices-api";
import { cn } from "@/lib/utils";

type RegisterTillControlProps = {
  branchId: string | null | undefined;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  /** Called after a successful register (e.g. refresh shell till label). */
  onRegistered?: (label: string) => void;
};

export function RegisterTillControl({
  branchId,
  disabled,
  className,
  buttonClassName,
  onRegistered,
}: RegisterTillControlProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const openDialog = () => {
    getOrCreateTillDeviceId();
    const current = tillDeviceDisplayName();
    // Prefill only a custom label — skip the default "Till {shortId}".
    setLabel(/^Till\s+[a-f0-9]{6,}$/i.test(current) ? "" : current);
    setOpen(true);
  };

  const onRegister = async () => {
    const bid = branchId?.trim();
    if (!bid) {
      toast.error("Select a branch before registering this till.");
      return;
    }
    setSaving(true);
    try {
      const row = await registerTillDevice({
        branchId: bid,
        label: label.trim() || undefined,
      });
      setTillDeviceLabel(row.label);
      onRegistered?.(row.label);
      toast.success(`Registered as “${row.label}”`);
      setOpen(false);
    } catch (error) {
      toast.error(tillDeviceErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={className}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground",
          buttonClassName,
        )}
        disabled={disabled || !branchId}
        onClick={openDialog}
      >
        <MonitorSmartphone className="size-3.5" aria-hidden />
        Register till
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register this till</DialogTitle>
            <DialogDescription>
              Bind this browser to the current branch so managers can see and
              revoke it from Business Settings → Trusted tills.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Label</span>
            <input
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              value={label}
              onChange={(e) => setLabel(e.target.value.slice(0, 80))}
              placeholder="e.g. Front counter"
              maxLength={80}
              autoFocus
            />
            <span className="block text-xs text-muted-foreground">
              Device id: {getOrCreateTillDeviceId() || "—"}
            </span>
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void onRegister()}>
              {saving ? "Registering…" : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
