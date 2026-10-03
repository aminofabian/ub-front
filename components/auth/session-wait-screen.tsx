"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

import { WaitingBoxes } from "@/components/auth/waiting-boxes";
import { Button } from "@/components/ui/button";
import { hardReloadTill } from "@/lib/stale-client";

/** Soft copy change — still waiting, no action yet. */
const NUDGE_MS = 5_000;
/** Show a refresh escape hatch — never leave cashiers stranded. */
const STUCK_MS = 10_000;

type Phase = "waiting" | "nudge" | "stuck";

type SessionWaitScreenProps = {
  title: string;
  message: string;
  footer?: ReactNode;
};

export function SessionWaitScreen({
  title,
  message,
  footer,
}: SessionWaitScreenProps) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const nudge = window.setTimeout(() => setPhase("nudge"), NUDGE_MS);
    const stuck = window.setTimeout(() => setPhase("stuck"), STUCK_MS);
    return () => {
      window.clearTimeout(nudge);
      window.clearTimeout(stuck);
    };
  }, []);

  const displayTitle =
    phase === "stuck"
      ? "This crate jammed the belt"
      : phase === "nudge"
        ? "Still packing up"
        : title;

  const displayMessage =
    phase === "stuck"
      ? "Loading stalled. A quick restack clears it — open tickets stay on this till."
      : phase === "nudge"
        ? "Taking a beat longer than usual. Drag a crate, or hang tight."
        : message;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-6 py-10">
      <div className="w-full max-w-md text-center">
        <WaitingBoxes />
        <h1 className="font-heading mt-8 text-[1.65rem] font-semibold leading-tight tracking-[-0.03em] text-foreground">
          {displayTitle}
        </h1>
        <p
          className="mt-2 text-sm leading-relaxed text-muted-foreground"
          aria-live="polite"
        >
          {displayMessage}
        </p>
        {phase === "stuck" ? (
          <div className="mt-6 space-y-3">
            <Button
              type="button"
              className="w-full gap-2"
              disabled={busy}
              aria-busy={busy}
              onClick={() => {
                setBusy(true);
                void hardReloadTill();
              }}
            >
              <RefreshCw
                className={`size-4 shrink-0 ${busy ? "animate-spin" : ""}`}
                aria-hidden
              />
              {busy ? "Restacking…" : "Restack the till"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Or press the browser refresh button — same idea.
            </p>
          </div>
        ) : null}
        {footer ? (
          <div className={phase === "stuck" ? "mt-3" : "mt-6"}>{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
