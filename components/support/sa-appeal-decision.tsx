"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchSaStandingExclusion,
  setSaStandingExclusion,
  type SaStandingExclusion,
} from "@/lib/super-admin-api";

/**
 * Under a supplier's "This is wrong" appeal: shows whether the order counts in standing, and lets platform support
 * leave it out (with a note) or put it back. The supplier is told in its own thread either way.
 */
export function SaAppealDecision({ orderId }: { orderId: string }) {
  const [state, setState] = React.useState<SaStandingExclusion | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    fetchSaStandingExclusion(orderId)
      .then((next) => {
        if (active) setState(next);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load the order's standing");
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  const decide = async (excluded: boolean) => {
    setBusy(true);
    try {
      const next = await setSaStandingExclusion(orderId, excluded, note.trim() || null);
      setState(next);
      setNote("");
      toast.success(excluded ? "Left out of standing" : "Back in standing");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That did not go through");
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return <p className="mt-2 text-xs text-destructive">{error}</p>;
  }
  if (!state) {
    return <p className="mt-2 text-xs text-muted-foreground">Checking standing…</p>;
  }
  return (
    <div className="mt-2 w-full max-w-md space-y-2 border border-black/10 p-3 text-sm">
      <p className="font-medium">
        Order {orderId}: {state.standingExcluded ? "left out of standing" : "counts in standing"}
      </p>
      {state.standingExclusionNote ? (
        <p className="text-xs text-muted-foreground">Last note: {state.standingExclusionNote}</p>
      ) : null}
      {state.standingExcluded ? null : (
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Reason, shown to the supplier"
        />
      )}
      <div className="flex gap-2">
        {state.standingExcluded ? (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void decide(false)}>
            Put back in standing
          </Button>
        ) : (
          <Button type="button" disabled={busy || note.trim() === ""} onClick={() => void decide(true)}>
            Leave out of standing
          </Button>
        )}
      </div>
    </div>
  );
}
