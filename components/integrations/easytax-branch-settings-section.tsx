"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plug } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  fetchBranches,
  fetchEasyTaxBranchSettings,
  updateEasyTaxBranchSettings,
  type BranchRecord,
  type EasyTaxBranchSettingsRecord,
} from "@/lib/api";
import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

type EasyTaxBranchSettingsSectionProps = {
  canWrite: boolean;
  /** The signed-in user's branch, used as the first choice when available. */
  defaultBranchId?: string | null;
};

const FIELD_INPUT =
  "h-10 w-full border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Every branch has its own KRA branch id and VSCU device serial, even when the
 * shop uses a single EasyTax login. This card edits one branch at a time.
 */
export function EasyTaxBranchSettingsSection({
  canWrite,
  defaultBranchId,
}: EasyTaxBranchSettingsSectionProps) {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchId, setBranchId] = useState("");
  const [record, setRecord] = useState<EasyTaxBranchSettingsRecord | null>(null);
  const [kraBranchId, setKraBranchId] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingBranches(true);
    fetchBranches()
      .then((list) => {
        if (cancelled) return;
        const active = list.filter((branch) => branch.active !== false);
        const usable = active.length > 0 ? active : list;
        setBranches(usable);
        setBranchId((current) => {
          if (current) return current;
          const preferred =
            defaultBranchId && usable.some((b) => b.id === defaultBranchId)
              ? defaultBranchId
              : usable[0]?.id;
          return preferred ?? "";
        });
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(
          e instanceof Error ? e.message : "Could not load your branches.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingBranches(false);
      });
    return () => {
      cancelled = true;
    };
  }, [defaultBranchId]);

  useEffect(() => {
    if (!branchId) {
      setRecord(null);
      setKraBranchId("");
      setDeviceSerial("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setRecord(null);
    setKraBranchId("");
    setDeviceSerial("");
    fetchEasyTaxBranchSettings(branchId)
      .then((next) => {
        if (cancelled) return;
        setRecord(next);
        setKraBranchId(next.kraBranchId ?? "");
        setDeviceSerial(next.deviceSerial ?? "");
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(
          e instanceof Error
            ? e.message
            : "Could not load this branch's EasyTax details.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const dirty = useMemo(() => {
    if (!record) return false;
    return (
      kraBranchId.trim() !== (record.kraBranchId ?? "") ||
      deviceSerial.trim() !== (record.deviceSerial ?? "")
    );
  }, [record, kraBranchId, deviceSerial]);

  const onSave = useCallback(async () => {
    if (!canWrite || !branchId) return;
    setSaving(true);
    try {
      const next = await updateEasyTaxBranchSettings(branchId, {
        kraBranchId: kraBranchId.trim(),
        deviceSerial: deviceSerial.trim(),
      });
      setRecord(next);
      setKraBranchId(next.kraBranchId ?? "");
      setDeviceSerial(next.deviceSerial ?? "");
      toast.success("Branch EasyTax details saved.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save branch details.",
      );
    } finally {
      setSaving(false);
    }
  }, [branchId, canWrite, deviceSerial, kraBranchId]);

  const busy = loading || saving;
  const fieldsDisabled = !canWrite || busy || !record;

  return (
    <section className={cn(HUB_SURFACE, "space-y-4 p-4")}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-[#141414]">
            Branch EasyTax details
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#666666]">
            Each branch reports through its own KRA branch ID and device. Set
            these for every branch that sells through EasyTax.
          </p>
        </div>
        {record ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold",
              record.configured
                ? "border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
                : "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
            )}
          >
            <Plug className="size-3.5" aria-hidden />
            {record.configured ? "Branch ready" : "Needs device details"}
          </span>
        ) : null}
      </header>

      {loadingBranches ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading branches…
        </div>
      ) : branches.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          No branches found. Add a branch first, then come back to set its KRA
          branch ID and device serial.
        </p>
      ) : (
        <>
          <label className="flex max-w-md flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
              Branch
            </span>
            <select
              className={FIELD_INPUT}
              value={branchId}
              disabled={saving}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading branch details…
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                  KRA branch ID
                </span>
                <input
                  className={FIELD_INPUT}
                  value={kraBranchId}
                  disabled={fieldsDisabled}
                  autoComplete="off"
                  placeholder="e.g. 001"
                  onChange={(e) => setKraBranchId(e.target.value)}
                />
                <span className="text-[11px] leading-snug text-muted-foreground">
                  The branch code KRA issued for this shop location.
                </span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                  Device serial
                </span>
                <input
                  className={FIELD_INPUT}
                  value={deviceSerial}
                  disabled={fieldsDisabled}
                  autoComplete="off"
                  placeholder="VSCU serial number"
                  onChange={(e) => setDeviceSerial(e.target.value)}
                />
                <span className="text-[11px] leading-snug text-muted-foreground">
                  The VSCU serial number issued when this branch&apos;s eTIMS
                  device was approved. It is printed on the device approval
                  letter.
                </span>
              </label>
            </div>
          )}

          {canWrite ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-3">
              <Button
                type="button"
                disabled={busy || !dirty}
                onClick={() => void onSave()}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Save branch details"
                )}
              </Button>
            </div>
          ) : (
            <p className="border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-3 text-xs text-muted-foreground">
              You can view these details but not change them.
            </p>
          )}
        </>
      )}
    </section>
  );
}
