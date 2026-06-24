"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  fetchShopperNotificationSubscriptions,
  subscribeShopperNotification,
  unsubscribeShopperNotification,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import Link from "next/link";

type Props = {
  itemId: string;
  outOfStock?: boolean;
};

export function ShopItemNotifyButton({ itemId, outOfStock }: Props) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const subs = await fetchShopperNotificationSubscriptions();
      setSubscribed(
        subs.some((s) => s.itemId === itemId && s.kind === "BACK_IN_STOCK" && s.active),
      );
      setNeedsAuth(false);
    } catch {
      setNeedsAuth(true);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!outOfStock) {
    return null;
  }

  if (loading) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">Checking alert status…</p>
    );
  }

  if (needsAuth) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        <Link href={APP_ROUTES.login} className="font-semibold text-[color:var(--auth-primary)] underline-offset-2 hover:underline">
          Sign in
        </Link>{" "}
        to get notified when this item is back in stock.
      </p>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="mt-3 h-10 w-full gap-2 rounded-xl border-dashed"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          if (subscribed) {
            await unsubscribeShopperNotification(itemId, "BACK_IN_STOCK");
            setSubscribed(false);
          } else {
            await subscribeShopperNotification(itemId, "BACK_IN_STOCK");
            setSubscribed(true);
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      {subscribed ? (
        <>
          <BellOff className="size-4" aria-hidden />
          Stop back-in-stock alerts
        </>
      ) : (
        <>
          <Bell className="size-4" aria-hidden />
          Notify me when available
        </>
      )}
    </Button>
  );
}
