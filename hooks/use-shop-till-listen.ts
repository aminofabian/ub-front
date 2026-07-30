"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  fetchPublicTillAwaitStatus,
  registerPublicTillAwait,
} from "@/lib/public-storefront-client";

export type ShopTillListenState = {
  listening: boolean;
  confirmed: boolean;
  receipt: string;
  checkoutRequestId: string | null;
};

/**
 * Registers a Buy Goods till-await while the storefront cart/checkout surface
 * is open, and polls until a gateway receipt arrives.
 *
 * In-flight registrations still apply if the amount/phone is still desired
 * after a React effect cleanup (avoids lost listens from remounts / Strict Mode).
 */
export function useShopTillListen(opts: {
  slug: string;
  active: boolean;
  amount: number;
  phoneNumber?: string | null;
}): ShopTillListenState {
  const { slug, active, amount, phoneNumber } = opts;
  const [listening, setListening] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(
    null,
  );
  const [retryTick, setRetryTick] = useState(0);
  const keyRef = useRef<string | null>(null);
  const desiredRef = useRef<{ active: boolean; key: string }>({
    active: false,
    key: "",
  });
  const toastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const phone = phoneNumber?.trim() || "";
    const awaitKey =
      active && slug.trim() && amount > 0
        ? `${amount.toFixed(2)}|${phone}`
        : "";
    desiredRef.current = { active: Boolean(awaitKey), key: awaitKey };

    if (!awaitKey) {
      keyRef.current = null;
      setListening(false);
      setCheckoutRequestId(null);
      return;
    }

    // Already registered (or soft-fail backoff) for this amount/phone.
    if (keyRef.current === awaitKey) {
      return;
    }

    setConfirmed(false);
    setReceipt("");

    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await registerPublicTillAwait(slug, {
          amount,
          phoneNumber: phone || null,
        });
        const desired = desiredRef.current;
        if (!desired.active || desired.key !== awaitKey) {
          return;
        }
        if (!result.accepted || !result.checkoutRequestId) {
          keyRef.current = awaitKey;
          setListening(false);
          window.setTimeout(() => {
            if (
              desiredRef.current.key === awaitKey &&
              keyRef.current === awaitKey
            ) {
              keyRef.current = null;
              setRetryTick((n) => n + 1);
            }
          }, 15_000);
          return;
        }
        keyRef.current = awaitKey;
        setCheckoutRequestId(result.checkoutRequestId);
        setListening(true);
        setConfirmed(false);
        setReceipt("");
      })();
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [active, slug, amount, phoneNumber, retryTick]);

  useEffect(() => {
    if (!listening || !checkoutRequestId || !slug.trim()) return;
    let cancelled = false;
    const poll = async () => {
      const status = await fetchPublicTillAwaitStatus(slug, checkoutRequestId);
      if (cancelled || !status) return;
      if (status.success) {
        const ref = status.gatewayTransactionId?.trim() || "";
        setConfirmed(true);
        setListening(false);
        setReceipt(ref);
        if (toastKeyRef.current !== checkoutRequestId) {
          toastKeyRef.current = checkoutRequestId;
          toast.success("M-Pesa till payment received", {
            description: ref
              ? `Ref ${ref} — continue checkout to finish your order.`
              : "Continue checkout to finish your order.",
            duration: 10_000,
          });
        }
      } else if (status.failed) {
        setListening(false);
        keyRef.current = null;
        setRetryTick((n) => n + 1);
      }
    };
    const interval = window.setInterval(() => void poll(), 4000);
    void poll();
    const stop = window.setTimeout(() => clearInterval(interval), 180_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [listening, checkoutRequestId, slug]);

  return { listening, confirmed, receipt, checkoutRequestId };
}
