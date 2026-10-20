"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Building2, Loader2, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { createBranch, type BranchRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

type AddBranchDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Used for a friendly duplicate-name check before hitting the API. */
  existingBranches?: readonly Pick<BranchRecord, "name">[];
  /** Fired after the branch exists. Refresh the switcher, then select it. */
  onCreated?: (branch: BranchRecord) => void | Promise<void>;
};

/**
 * Small, focused create form for a second (or first) location. Deliberately
 * asks only for the two things needed to start selling here — receipt details
 * and opening hours live on the full Branches page.
 */
export function AddBranchDrawer({
  open,
  onOpenChange,
  existingBranches = [],
  onCreated,
}: AddBranchDrawerProps) {
  const formId = useId();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setAddress("");
    setError(null);
    setSaving(false);
  }, [open]);

  const trimmedName = name.trim();
  const duplicate = useMemo(() => {
    const key = trimmedName.toLowerCase();
    if (!key) return false;
    return existingBranches.some(
      (branch) => branch.name.trim().toLowerCase() === key,
    );
  }, [existingBranches, trimmedName]);

  const canSubmit = Boolean(trimmedName) && !duplicate && !saving;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setError(null);
    try {
      const branch = await createBranch({
        name: trimmedName,
        address: address.trim() || undefined,
      });
      toast.success(`“${branch.name}” is ready to sell.`);
      onOpenChange(false);
      await onCreated?.(branch);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create this branch. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        onOpenChange(next);
      }}
      title="Add a new branch"
      description="A branch is a shop or counter with its own stock, sales, and till."
      contextLabel="Locations"
      icon={<Building2 className="size-4" aria-hidden />}
      headerDensity="compact"
      banner={
        error ? <FormDrawerMessageBanner text={error} /> : null
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!canSubmit}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Creating…
              </>
            ) : (
              <>
                <Plus className="size-4" aria-hidden />
                Add branch
              </>
            )}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-start gap-2.5 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,white)] px-3 py-2.5">
          <MapPin
            className="mt-0.5 size-4 shrink-0 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          <p className={cn(dashboardHintClass(), "text-[11.5px] leading-relaxed")}>
            It shows up in the branch switcher immediately. You can add a
            receipt header, address, and staff to it later.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className={dashboardLabelClass()}>Branch name</span>
          <input
            className={dashboardInputClass()}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Kilimani branch"
            autoComplete="off"
            autoFocus
            maxLength={120}
            aria-invalid={duplicate || undefined}
          />
          {duplicate ? (
            <span className="block text-[11px] leading-snug text-destructive">
              You already have a branch called “{trimmedName}”.
            </span>
          ) : (
            <span className={dashboardHintClass()}>
              Use the name staff will recognise on the till.
            </span>
          )}
        </label>

        <label className="block space-y-1.5">
          <span className={dashboardLabelClass()}>
            Address <span className="font-normal opacity-60">(optional)</span>
          </span>
          <textarea
            className={cn(dashboardInputClass(), "min-h-20 h-auto py-2")}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Street, building, floor — anything a rider needs."
            rows={3}
            maxLength={240}
          />
        </label>
      </form>
    </FormDrawer>
  );
}
