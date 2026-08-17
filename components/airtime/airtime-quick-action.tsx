"use client";

import { useEffect, useState } from "react";
import { Signal } from "lucide-react";

import { AirtimeSellPanel } from "@/components/airtime/airtime-sell-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchAirtimeAvailability, type AirtimeAvailabilityRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  /** Chip styling supplied by the host so the trigger matches its action row. */
  triggerClassName?: string;
  currency?: string;
  channel?: "POS" | "DASHBOARD";
};

/**
 * Till-side entry point for airtime.
 *
 * <p>Renders nothing at all unless the business has airtime switched on and the
 * platform is configured — a dead button on a busy POS is worse than no button.
 */
export function AirtimeQuickAction({
  triggerClassName,
  currency,
  channel = "POS",
}: Props) {
  const [open, setOpen] = useState(false);
  const [availability, setAvailability] = useState<AirtimeAvailabilityRecord | null>(null);

  useEffect(() => {
    let stopped = false;
    fetchAirtimeAvailability()
      .then((a) => {
        if (!stopped) setAvailability(a);
      })
      .catch(() => undefined);
    return () => {
      stopped = true;
    };
  }, []);

  const offerable =
    availability?.platformEnabled === true &&
    availability?.businessEnabled === true &&
    availability?.credentialsConfigured === true;

  if (!offerable) return null;

  const lowWallet = !availability?.available;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(triggerClassName, "relative")}
        title={
          lowWallet
            ? availability?.reason ?? "Airtime unavailable"
            : "Sell airtime from your Kiosk Pay wallet"
        }
      >
        <Signal className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        Airtime
        {lowWallet ? (
          <span
            className="size-1.5 rounded-full bg-amber-500"
            aria-label="Airtime needs attention"
          />
        ) : null}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-4 p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Signal className="size-4 text-muted-foreground" aria-hidden />
              Sell airtime
            </DialogTitle>
            <DialogDescription>
              Any network. Paid straight from your Kiosk Pay wallet, commission
              credited back on delivery.
            </DialogDescription>
          </DialogHeader>
          <AirtimeSellPanel channel={channel} currency={currency} />
        </DialogContent>
      </Dialog>
    </>
  );
}
