"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Loader2, MonitorSmartphone } from "lucide-react";

import { ManageTillsDrawer } from "@/components/business/manage-tills-drawer";
import type { BranchRecord } from "@/lib/api";
import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import {
  listTillAccessRequests,
  listTillDevices,
} from "@/lib/till-devices-api";
import { cn } from "@/lib/utils";

type Props = {
  branches: BranchRecord[];
  branchId?: string | null;
  /** Open from `?manageTills=1` on first mount. */
  initiallyOpen?: boolean;
  compact?: boolean;
};

/**
 * Business hub entry: trusted tills + waiting unlock requests.
 */
export function ManageTillsHubCard({
  branches,
  branchId,
  initiallyOpen = false,
  compact = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(initiallyOpen);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const bid = branchId?.trim() || branches[0]?.id || "";

  const refreshCounts = useCallback(async () => {
    if (!bid) {
      setActiveCount(0);
      setPendingCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [devices, pending] = await Promise.all([
        listTillDevices({ branchId: bid, includeRevoked: false }),
        listTillAccessRequests({ branchId: bid, status: "pending" }),
      ]);
      setActiveCount(devices.length);
      setPendingCount(pending.length);
    } catch {
      setActiveCount(0);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  }, [bid]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    if (!open) void refreshCounts();
  }, [open, refreshCounts]);

  useEffect(() => {
    if (initiallyOpen) setOpen(true);
  }, [initiallyOpen]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && initiallyOpen) {
      router.replace(pathname, { scroll: false });
    }
  };

  const waiting = pendingCount > 0;

  return (
    <>
      <section
        aria-label="Trusted tills"
        className={cn(
          HUB_SURFACE,
          "text-left",
          waiting &&
            "border-[color-mix(in_srgb,#F59E0B_45%,transparent)] border-l-[3px] border-l-[#F59E0B]",
        )}
      >
        <div
          className={cn(
            "flex gap-3",
            compact ? "items-center p-3 sm:p-3.5" : "items-start p-4 sm:p-5",
          )}
        >
          <span
            className={cn(
              "grid shrink-0 place-items-center border",
              waiting
                ? "border-[#F59E0B]/35 bg-[#FFFBEB] text-[#B45309]"
                : "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_9%,white)] text-[var(--pos-primary,#0f766e)]",
              compact ? "size-10" : "size-11",
            )}
            aria-hidden
          >
            <MonitorSmartphone className="size-4" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.08em]",
                  waiting
                    ? "text-[#B45309]"
                    : "text-[var(--pos-primary,#0f766e)]",
                )}
              >
                Trusted tills
              </p>
              {waiting ? (
                <span className="inline-flex items-center border border-[#F59E0B]/40 bg-[#FFFBEB] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#B45309]">
                  {pendingCount} waiting
                </span>
              ) : null}
            </div>

            {loading ? (
              <p className={cn("mt-1 flex items-center gap-2 text-[13px]", HUB_MUTED)}>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Checking…
              </p>
            ) : waiting ? (
              <>
                <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-[#141414]">
                  A cashier tried an unregistered till
                </p>
                <p className={cn("mt-1 text-[12px] leading-snug", HUB_MUTED)}>
                  Register it so their PIN unlocks that computer — or dismiss if
                  it was a mistake.
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-[#141414]">
                  {activeCount > 0
                    ? `${activeCount} active till${activeCount === 1 ? "" : "s"}`
                    : "No tills registered yet"}
                </p>
                <p className={cn("mt-1 text-[12px] leading-snug", HUB_MUTED)}>
                  Manage which computers can unlock the POS. Activate,
                  deactivate, or register a new counter.
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 border px-3 py-2 text-[13px] font-semibold text-white transition-[transform,background-color] duration-150 active:scale-[0.98]",
              waiting
                ? "border-[#B45309] bg-[#B45309] hover:bg-[#92400E]"
                : "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]",
              compact && "px-2.5 py-1.5 text-[12px]",
            )}
          >
            {waiting ? "Review" : "Manage"}
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </section>

      <ManageTillsDrawer
        open={open}
        onOpenChange={onOpenChange}
        branches={branches}
        defaultBranchId={bid}
      />
    </>
  );
}
