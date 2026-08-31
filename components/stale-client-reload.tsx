"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

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
        <Button
          type="button"
          disabled={busy}
          aria-busy={busy}
          className={cn(
            "mt-5 h-12 w-full gap-2 rounded-xl text-[15px] font-semibold tracking-tight",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_18px_-10px_rgba(0,0,0,0.4)]",
            "hover:brightness-[1.06] active:scale-[0.99]",
            "disabled:opacity-80",
          )}
          style={{
            backgroundColor: "var(--pos-primary, var(--primary))",
            color: "var(--pos-primary-ink, #fff)",
          }}
          onClick={() => {
            setBusy(true);
            void hardReloadTill();
          }}
        >
          <RefreshCw
            className={cn("size-4", busy && "animate-spin")}
            aria-hidden
          />
          {busy ? "Reloading…" : "Reload till"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
