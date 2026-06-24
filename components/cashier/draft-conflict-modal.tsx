"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DraftConflictModalProps = {
  open: boolean;
  ticketLabel: string;
  busy?: boolean;
  onUseServer: () => void;
  onUseMine: () => void;
  onDismiss?: () => void;
  brandTheme?: React.CSSProperties;
};

export function DraftConflictModal({
  open,
  ticketLabel,
  busy = false,
  onUseServer,
  onUseMine,
  onDismiss,
  brandTheme,
}: DraftConflictModalProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/40"
        onClick={onDismiss}
        aria-hidden
      />
      <div
        className="fixed inset-x-4 top-1/2 z-[90] mx-auto max-w-md -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-xl sm:inset-x-auto"
        style={brandTheme}
        role="dialog"
        aria-labelledby="draft-conflict-title"
      >
        <h2
          id="draft-conflict-title"
          className="text-lg font-semibold text-foreground"
        >
          Sale sync conflict
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {ticketLabel} was modified on the server while you were working
          offline. Choose which version to keep before checkout.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={onUseServer}
          >
            Use server version
          </Button>
          <Button
            type="button"
            className={cn("flex-1", busy && "pointer-events-none")}
            disabled={busy}
            onClick={onUseMine}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Use my version"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
