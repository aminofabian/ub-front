"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";

import { ManageTillsDrawer } from "@/components/business/manage-tills-drawer";
import { useDashboard } from "@/components/dashboard-provider";
import { FormDrawerFields } from "@/components/form-drawer";
import { useFeatureFlags } from "@/components/providers/tenant-provider";
import { Button } from "@/components/ui/button";
import type { BranchRecord } from "@/lib/api";
import { updateBusiness } from "@/lib/api";
import { isTillRequireTrusted } from "@/lib/shift-settings";
import {
  listTillAccessRequests,
  listTillDevices,
  tillDeviceErrorMessage,
} from "@/lib/till-devices-api";
import { cn } from "@/lib/utils";

type TrustedTillsPanelProps = {
  branches: BranchRecord[];
  defaultBranchId?: string | null;
};

export function TrustedTillsPanel({
  branches,
  defaultBranchId,
}: TrustedTillsPanelProps) {
  const { canManageBusinessSettings, refreshSession } = useDashboard();
  const featureFlags = useFeatureFlags();
  const requireTrusted = isTillRequireTrusted(featureFlags);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingFlag, setSavingFlag] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const branchId = defaultBranchId?.trim() || branches[0]?.id || "";

  const refresh = useCallback(async () => {
    if (!branchId) {
      setActiveCount(0);
      setPendingCount(0);
      return;
    }
    setLoading(true);
    try {
      const [devices, pending] = await Promise.all([
        listTillDevices({ branchId, includeRevoked: false }),
        listTillAccessRequests({ branchId, status: "pending" }),
      ]);
      setActiveCount(devices.length);
      setPendingCount(pending.length);
    } catch (error) {
      toast.error(tillDeviceErrorMessage(error));
      setActiveCount(0);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) void refresh();
  }, [open, refresh]);

  const setRequireTrusted = useCallback(
    async (next: boolean) => {
      if (!canManageBusinessSettings || savingFlag) return;
      setSavingFlag(true);
      try {
        await updateBusiness({ featureFlags: { tillRequireTrusted: next } });
        await refreshSession();
        toast.success(
          next
            ? "Only registered tills may sell now."
            : "Any signed-in till can sell. New phones still notify you.",
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not update till setting.",
        );
      } finally {
        setSavingFlag(false);
      }
    },
    [canManageBusinessSettings, refreshSession, savingFlag],
  );

  return (
    <>
      <FormDrawerFields
        legend="Trusted tills"
        hint="Register counters and phones so you can see which till is selling. Selling stays open for signed-in staff unless you turn on the lock below. Waiting requests appear when someone uses a new phone."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/55 bg-muted/20 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Only registered tills may sell
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                When on, a branch with at least one registered till blocks PIN unlock and
                sales from unknown devices until you approve them.
              </p>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center gap-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                {requireTrusted ? "On" : "Off"}
              </span>
              <span className="relative inline-flex h-7 w-12 items-center">
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Only registered tills may sell"
                  className="peer sr-only"
                  checked={requireTrusted}
                  disabled={!canManageBusinessSettings || savingFlag}
                  onChange={(event) => void setRequireTrusted(event.target.checked)}
                />
                <span
                  className={cn(
                    "absolute inset-0 rounded-full bg-muted-foreground/25 transition-colors",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                    "peer-checked:bg-primary",
                    "peer-disabled:opacity-50",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 z-10 size-6 rounded-full bg-background shadow-sm transition-transform",
                    "peer-checked:translate-x-5",
                  )}
                  aria-hidden
                />
              </span>
            </label>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/10 px-3.5 py-3">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Checking tills…
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <p>
                  <span className="font-semibold tabular-nums">{activeCount}</span>{" "}
                  <span className="text-muted-foreground">active</span>
                </p>
                <p>
                  <span className="font-semibold tabular-nums">{pendingCount}</span>{" "}
                  <span className="text-muted-foreground">waiting</span>
                </p>
                {pendingCount > 0 ? (
                  <p className="text-amber-700 dark:text-amber-400">
                    A cashier tried an unregistered till — open Manage to
                    register it.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            onClick={() => setOpen(true)}
          >
            <MonitorSmartphone className="size-4" aria-hidden />
            Manage tills
          </Button>
        </div>
      </FormDrawerFields>

      <ManageTillsDrawer
        open={open}
        onOpenChange={setOpen}
        branches={branches}
        defaultBranchId={branchId}
      />
    </>
  );
}
