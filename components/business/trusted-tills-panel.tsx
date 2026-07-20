"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MonitorSmartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import type { BranchRecord } from "@/lib/api";
import {
  formatTillDeviceShortId,
  getOrCreateTillDeviceId,
  setTillDeviceLabel,
} from "@/lib/till-device";
import {
  listTillDevices,
  registerTillDevice,
  revokeTillDevice,
  tillDeviceErrorMessage,
  type TillDeviceRecord,
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
  const [branchId, setBranchId] = useState(
    () => defaultBranchId?.trim() || branches[0]?.id || "",
  );
  const [devices, setDevices] = useState<TillDeviceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [localDeviceKey, setLocalDeviceKey] = useState("");

  useEffect(() => {
    setLocalDeviceKey(getOrCreateTillDeviceId());
  }, []);

  const reload = useCallback(async (bid: string) => {
    if (!bid) {
      setDevices([]);
      return;
    }
    setLoading(true);
    try {
      setDevices(await listTillDevices({ branchId: bid }));
    } catch (error) {
      toast.error(tillDeviceErrorMessage(error));
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!branchId && branches[0]?.id) {
      setBranchId(branches[0].id);
      return;
    }
    void reload(branchId);
  }, [branchId, branches, reload]);

  const onRegisterThisBrowser = async () => {
    if (!branchId) {
      toast.error("Select a branch first.");
      return;
    }
    setRegistering(true);
    try {
      const row = await registerTillDevice({
        branchId,
        label: label.trim() || undefined,
      });
      setTillDeviceLabel(row.label);
      toast.success(`Registered as “${row.label}”`);
      setLabel("");
      await reload(branchId);
    } catch (error) {
      toast.error(tillDeviceErrorMessage(error));
    } finally {
      setRegistering(false);
    }
  };

  const onRevoke = async (id: string) => {
    setBusyId(id);
    try {
      await revokeTillDevice(id);
      toast.success("Till revoked");
      await reload(branchId);
    } catch (error) {
      toast.error(tillDeviceErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <FormDrawerFields
      legend="Trusted tills"
      hint="Once a branch has at least one registered till, PIN login on that branch only works from registered browsers. Revoking a till blocks it immediately."
    >
      <div className="space-y-3">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Branch</span>
          <select
            className={cn(
              "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm",
              "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            )}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={branches.length === 0}
          >
            {branches.length === 0 ? (
              <option value="">No branches</option>
            ) : (
              branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))
            )}
          </select>
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 space-y-1.5 text-sm">
            <span className="font-medium">Label for this browser</span>
            <input
              className={cn(
                "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm",
                "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              )}
              value={label}
              onChange={(e) => setLabel(e.target.value.slice(0, 80))}
              placeholder="e.g. Front counter"
              maxLength={80}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={!branchId || registering}
            onClick={() => void onRegisterThisBrowser()}
          >
            {registering ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <MonitorSmartphone className="size-4" aria-hidden />
            )}
            Register this browser
          </Button>
        </div>
        {localDeviceKey ? (
          <p className="text-xs text-muted-foreground">
            This browser: {formatTillDeviceShortId(localDeviceKey)}
          </p>
        ) : null}

        <div className="rounded-xl border border-border/60 bg-muted/10">
          {loading ? (
            <p className="flex items-center gap-2 px-3.5 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading tills…
            </p>
          ) : devices.length === 0 ? (
            <p className="px-3.5 py-3 text-sm text-muted-foreground">
              No registered tills for this branch yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {devices.map((d) => {
                const isThis =
                  localDeviceKey && d.deviceKey === localDeviceKey;
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {d.label}
                        {isThis ? (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            (this browser)
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatTillDeviceShortId(d.deviceKey)} · registered{" "}
                        {formatWhen(d.registeredAt)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 gap-1 text-xs text-muted-foreground hover:text-destructive"
                      disabled={busyId === d.id}
                      onClick={() => void onRevoke(d.id)}
                    >
                      {busyId === d.id ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="size-3.5" aria-hidden />
                      )}
                      Revoke
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </FormDrawerFields>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
