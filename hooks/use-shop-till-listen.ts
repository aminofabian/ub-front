"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  fetchPublicCheckoutPaymentOptionsBrowser,
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
  const keyRef = useRef<string | null>(null);
  const toastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !slug.trim() || !(amount > 0)) {
      keyRef.current = null;
      setListening(false);
      setCheckoutRequestId(null);
      return;
    }

    let cancelled = false;
    const phone = phoneNumber?.trim() || "";
    const awaitKey = `${amount.toFixed(2)}|${phone}`;
    if (keyRef.current === awaitKey && checkoutRequestId) {
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        const opts = await fetchPublicCheckoutPaymentOptionsBrowser(slug);
        if (cancelled || opts.tillListenEnabled === false) {
          return;
        }
        const result = await registerPublicTillAwait(slug, {
          amount,
          phoneNumber: phone || null,
        });
        if (cancelled) return;
        if (!result.accepted || !result.checkoutRequestId) {
          keyRef.current = awaitKey;
          setListening(false);
          return;
        }
        keyRef.current = awaitKey;
        setCheckoutRequestId(result.checkoutRequestId);
        setListening(true);
        setConfirmed(false);
        setReceipt("");
      })();
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-register on amount/phone/active
  }, [active, slug, amount, phoneNumber]);

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
