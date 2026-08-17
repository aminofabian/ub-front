"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  hardReloadTill,
  isStaleClientFlagged,
  startStaleClientWatch,
  STALE_CLIENT_USER_MESSAGE,
  subscribeStaleClient,
} from "@/lib/stale-client";

export function StaleClientReload() {
  const [open, setOpen] = useState(isStaleClientFlagged);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stop = startStaleClientWatch();
    const unsub = subscribeStaleClient(() => setOpen(true));
    if (isStaleClientFlagged()) {
      setOpen(true);
    }
    return () => {
      stop();
      unsub();
    };
  }, []);

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-[300] bg-black/55" aria-hidden />
      <div
        className="fixed top-1/2 left-1/2 z-[310] w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="stale-client-title"
        aria-describedby="stale-client-copy"
      >
        <div className="mb-3 flex items-center gap-2 text-foreground">
          <RefreshCw className="size-5 shrink-0" aria-hidden />
          <h2
            id="stale-client-title"
            className="text-lg font-semibold tracking-tight"
          >
            Reload to continue
          </h2>
        </div>
        <p id="stale-client-copy" className="text-sm leading-relaxed text-muted-foreground">
          {STALE_CLIENT_USER_MESSAGE} Open tickets stay on this till after reload.
        </p>
        <Button
          type="button"
          size="lg"
          className="mt-5 h-11 w-full text-base"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void hardReloadTill();
          }}
        >
          {busy ? "Reloading…" : "Reload till"}
        </Button>
      </div>
    </>
  );
}
