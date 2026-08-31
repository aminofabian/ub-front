"use client";

import { useEffect, useState } from "react";
import { Signal } from "lucide-react";

import { CashierAirtimeDrawer } from "@/components/airtime/cashier-airtime-drawer";
import type { AirtimeCartPayload } from "@/lib/airtime-cart-line";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { fetchAirtimeAvailability, type AirtimeAvailabilityRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  /** Chip styling supplied by the host so the trigger matches its action row. */
  triggerClassName?: string;
  currency?: string;
  channel?: "POS" | "DASHBOARD";
  onAddToCart?: (payload: AirtimeCartPayload) => boolean;
  /** Fired when the cashier opens airtime (e.g. close a parent menu). */
  onTrigger?: () => void;
};

/**
 * Till-side entry point for airtime.
 *
 * <p>Renders nothing at all unless the business has airtime switched on and the
 * platform is configured — a dead button on a busy POS is worse than no button.
 * Opens as the same right-edge drawer the cart uses, with Cash / M-Pesa / Tab.
 */
export function AirtimeQuickAction({
  triggerClassName,
  currency,
  channel = "POS",
  onAddToCart,
  onTrigger,
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
        onClick={() => {
          onTrigger?.();
          setOpen(true);
        }}
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
        <DialogContent
          side="right"
          overlayClassName="bg-[rgba(0,0,0,0.5)]"
          className={cn(
            "max-w-[min(100%,26rem)] gap-0 rounded-none border-l border-[#cfc6b4] p-0 shadow-none sm:max-w-[26rem] sm:!rounded-none",
            "flex flex-col overflow-hidden bg-[#f3eee4] dark:border-[#3f3a32] dark:bg-[#161410]",
          )}
          showCloseButton={false}
        >
          {open ? (
            <CashierAirtimeDrawer
              channel={channel}
              currency={currency}
              onAddToCart={
                onAddToCart
                  ? (payload) => {
                      const ok = onAddToCart(payload);
                      if (ok) setOpen(false);
                      return ok;
                    }
                  : undefined
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
