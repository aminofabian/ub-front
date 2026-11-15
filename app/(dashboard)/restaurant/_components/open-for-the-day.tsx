"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { fetchCurrentShift } from "@/lib/api";
import { POS_GUIDANCE_RESOLVED_EVENT } from "@/lib/pos-guidance";
import { requestSetup, setupGapFromShiftProbe, type SetupRequiredDetail } from "@/lib/setup-requirements";
import { cn } from "@/lib/utils";

/**
 * Says, before the first order, that the restaurant is not open for the day yet, and opens it.
 *
 * Money cannot be taken until a shift is open on a till. Left alone, the app only says so when
 * payment is pressed, with the customer standing there. This asks the same question first, at
 * a quiet moment, and uses the shell's own dialog to answer it (counting the drawer, and naming
 * this device as a till where the branch asks for that).
 *
 * It shows nothing while it is finding out, when the day is open, or when the probe failed for
 * a reason that is not about setup (offline, no permission): the payment path still explains.
 */
export function OpenForTheDay({ branchId, className }: { branchId: string; className?: string }) {
  const [gap, setGap] = useState<SetupRequiredDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const probe = useCallback(async () => {
    try {
      await fetchCurrentShift(branchId, { toast: false });
      setGap(null);
    } catch (error) {
      setGap(setupGapFromShiftProbe(error));
    }
  }, [branchId]);

  useEffect(() => {
    void probe();
    // A shift opened or a till named anywhere else in the app (the payment dialog, the Shifts
    // page in another tab's lifetime) clears the strip without a reload.
    const again = () => void probe();
    window.addEventListener(POS_GUIDANCE_RESOLVED_EVENT, again);
    window.addEventListener("focus", again);
    return () => {
      window.removeEventListener(POS_GUIDANCE_RESOLVED_EVENT, again);
      window.removeEventListener("focus", again);
    };
  }, [probe]);

  if (!gap || gap.requirement === "branch") return null;

  const till = gap.requirement === "till";

  async function open() {
    if (!gap) return;
    setBusy(true);
    try {
      await requestSetup(gap);
    } finally {
      setBusy(false);
      void probe();
    }
  }

  return (
    <section
      role="status"
      aria-label="Not open for the day"
      className={cn(
        "flex flex-col gap-3 rounded-[2px] border px-4 py-3 sm:flex-row sm:items-center sm:gap-5",
        "border-[color-mix(in_srgb,var(--kiosk-highlight,#A55237)_45%,transparent)]",
        "bg-[color-mix(in_srgb,var(--kiosk-highlight,#A55237)_7%,var(--op-surface,#FCFAF5))]",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-serif text-xl italic leading-tight text-[var(--order-ink,#121A16)]">
          {till ? "This device is not a till yet" : "Not open for the day yet"}
        </p>
        <p className="mt-0.5 text-sm text-[color-mix(in_srgb,var(--order-ink,#121A16)_74%,transparent)]">
          {till
            ? "Name it as a till once, then count the cash in the drawer. After that you can take payment here."
            : "Count the cash in the drawer before the first order (0 is fine). You can ring orders now, but payment waits for this."}
        </p>
      </div>
      <Button className="h-11 shrink-0" disabled={busy} onClick={() => void open()}>
        {busy ? "Opening…" : till ? "Set up this till" : "Open for the day"}
      </Button>
    </section>
  );
}
