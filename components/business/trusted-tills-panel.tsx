"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";

import { ManageTillsDrawer } from "@/components/business/manage-tills-drawer";
import { FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import type { BranchRecord } from "@/lib/api";
import {
  listTillAccessRequests,
  listTillDevices,
  tillDeviceErrorMessage,
} from "@/lib/till-devices-api";

type TrustedTillsPanelProps = {
  branches: BranchRecord[];
  defaultBranchId?: string | null;
};

export function TrustedTillsPanel({
  branches,
  defaultBranchId,
}: TrustedTillsPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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

  return (
    <>
      <FormDrawerFields
        legend="Trusted tills"
        hint="Once a branch has at least one registered till, PIN login only works from registered browsers. Waiting requests appear when someone unlocks with the right PIN on a new computer."
      >
        <div className="space-y-3">
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
