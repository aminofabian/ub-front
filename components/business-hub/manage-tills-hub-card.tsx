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
  /** Narrow side-rail layout under live sales. */
  rail?: boolean;
};

/**
 * Business hub entry: trusted tills + waiting unlock requests.
 */
export function ManageTillsHubCard({
  branches,
  branchId,
  initiallyOpen = false,
  compact = false,
  rail = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(initiallyOpen);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const bid = branchId?.trim() || branches[0]?.id || "";
  const dense = compact || rail;

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
        data-hub-card=""
        aria-label="Trusted tills"
        className={cn(
          HUB_SURFACE,
          "text-left",
          rail && "border-0 shadow-none",
          waiting &&
            !rail &&
            "border-[color-mix(in_srgb,#F59E0B_45%,transparent)] border-l-[3px] border-l-[#F59E0B]",
          waiting && rail && "border-l-[3px] border-l-[#F59E0B]",
        )}
      >
        <div
          className={cn(
            "flex gap-3",
            rail
              ? "flex-col items-stretch gap-2.5 p-3"
              : dense
                ? "items-center p-3 sm:p-3.5"
                : "items-start p-4 sm:p-5",
          )}
        >
          <div className={cn("flex min-w-0 gap-3", rail && "items-start")}>
            <span
              className={cn(
                "grid shrink-0 place-items-center border",
                waiting
                  ? "border-[#F59E0B]/35 bg-[#FFFBEB] text-[#B45309]"
                  : "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_9%,white)] text-[var(--pos-primary,#0f766e)]",
                dense || rail ? "size-9" : "size-11",
              )}
              aria-hidden
            >
              <MonitorSmartphone className="size-3.5" />
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
                  <p
                    className={cn(
                      "mt-1 font-semibold tracking-[-0.02em] text-[#141414]",
                      rail ? "line-clamp-2 text-[13px]" : "text-[15px]",
                    )}
                  >
                    A cashier tried an unregistered till
                  </p>
                  <p
                    className={cn(
                      "mt-1 leading-snug",
                      rail ? "line-clamp-3 text-[11px]" : "text-[12px]",
                      HUB_MUTED,
                    )}
                  >
                    {rail
                      ? "Register it so their PIN unlocks that computer — or dismiss."
                      : "Register it so their PIN unlocks that computer — or dismiss if it was a mistake."}
                  </p>
                </>
              ) : (
                <>
                  <p
                    className={cn(
                      "mt-1 font-semibold tracking-[-0.02em] text-[#141414]",
                      rail ? "text-[13px]" : "text-[15px]",
                    )}
                  >
                    {activeCount > 0
                      ? `${activeCount} active till${activeCount === 1 ? "" : "s"}`
                      : "No tills registered yet"}
                  </p>
                  <p
                    className={cn(
                      "mt-1 leading-snug",
                      rail ? "text-[11px]" : "text-[12px]",
                      HUB_MUTED,
                    )}
                  >
                    {rail
                      ? "Activate, deactivate, or register a counter."
                      : "Manage which computers can unlock the POS. Activate, deactivate, or register a new counter."}
                  </p>
                </>
              )}
            </div>

            {!rail ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 border px-3 py-2 text-[13px] font-semibold text-white transition-[transform,background-color] duration-150 active:scale-[0.98]",
                  waiting
                    ? "border-[#B45309] bg-[#B45309] hover:bg-[#92400E]"
                    : "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]",
                  dense && "px-2.5 py-1.5 text-[12px]",
                )}
              >
                {waiting ? "Review" : "Manage"}
                <ArrowRight className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>

          {rail ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "inline-flex w-full items-center justify-center gap-1.5 border px-2.5 py-2 text-[12px] font-semibold text-white transition-[transform,background-color] duration-150 active:scale-[0.98]",
                waiting
                  ? "border-[#B45309] bg-[#B45309] hover:bg-[#92400E]"
                  : "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] hover:bg-[#0d6b63]",
              )}
            >
              {waiting ? "Review" : "Manage"}
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          ) : null}
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
