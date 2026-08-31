"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  hardReloadTill,
  isStaleClientFlagged,
  startStaleClientWatch,
  STALE_CLIENT_USER_MESSAGE,
  subscribeStaleClient,
} from "@/lib/stale-client";

import styles from "./stale-client-reload.module.css";

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

  // Dialog, not a custom overlay: an open modal disables body pointer-events
  // and only re-enables them on its own layer. z-index alone cannot win.
  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[400]"
        className="z-[410] w-[min(24rem,calc(100%-2rem))] gap-0 p-5"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div className="mb-3 flex items-center gap-2 text-foreground">
          <RefreshCw className="size-5 shrink-0" aria-hidden />
          <DialogTitle
            id="stale-client-title"
            className="text-lg font-semibold tracking-tight"
          >
            Reload to continue
          </DialogTitle>
        </div>
        <DialogDescription
          id="stale-client-copy"
          className="text-sm leading-relaxed text-muted-foreground"
        >
          {STALE_CLIENT_USER_MESSAGE} Open tickets stay on this till after reload.
        </DialogDescription>
        <button
          type="button"
          className={styles.btn}
          data-busy={busy ? "true" : "false"}
          disabled={busy}
          aria-busy={busy}
          onClick={() => {
            setBusy(true);
            void hardReloadTill();
          }}
        >
          <span className={styles.sheen} aria-hidden />
          <span className={styles.face}>
            <RefreshCw className={styles.icon} aria-hidden />
            <span className={styles.label}>
              <span className={styles.idle}>Reload till</span>
              <span className={styles.busy} aria-hidden={!busy}>
                Reloading
                <span className={styles.dots} aria-hidden>
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </span>
            </span>
          </span>
        </button>
      </DialogContent>
    </Dialog>
  );
}
