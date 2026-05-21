"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isWebPushSupported, registerWebPushSubscription, fetchPushConfig } from "@/lib/web-push";

type Props = {
  label?: string;
  className?: string;
};

export function PushNotificationsEnable({ label = "Enable push notifications", className }: Props) {
  const [supported, setSupported] = useState(false);
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSupported(isWebPushSupported());
    void fetchPushConfig().then((cfg) => setAvailable(cfg.enabled && Boolean(cfg.publicKey)));
  }, []);

  const onEnable = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const ok = await registerWebPushSubscription();
      setEnabled(ok);
      if (!ok) {
        setError("Could not enable push — check browser permissions or server VAPID keys.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Push setup failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  if (!supported || !available || enabled) {
    return null;
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 rounded-xl"
        disabled={loading}
        onClick={() => void onEnable()}
      >
        <BellRing className="size-4" aria-hidden />
        {loading ? "Enabling…" : label}
      </Button>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
