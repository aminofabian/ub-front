"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";

import {
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  fetchOnboardingSequenceStatus,
  muteOnboardingSequenceTips,
} from "@/lib/api";

type Props = {
  canEdit: boolean;
};

/**
 * Mute week-1 onboarding tip emails for this shop (same as the email footer link).
 */
export function OnboardingTipsMutePanel({ canEdit }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await fetchOnboardingSequenceStatus();
      setEnrolled(status.enrolled);
      setMuted(status.muted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tip settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onMute = async () => {
    if (!canEdit || muted || busy) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const status = await muteOnboardingSequenceTips();
      setEnrolled(status.enrolled);
      setMuted(status.muted);
      setOk("Onboarding tip emails are muted for this shop.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mute tips.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading tip settings…
      </div>
    );
  }

  if (!enrolled) {
    return null;
  }

  return (
    <section
      id="settings-onboarding-tips"
      className="space-y-3 rounded-2xl border border-border/60 bg-background/80 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
          <Mail className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            Onboarding tip emails
          </h3>
          <p className="text-xs text-muted-foreground">
            Week-1 setup tips from Kiosk (fill shelf, money loop, first sale).
            Muting stops further tip emails for this shop — support is still
            available at 0714 282 874.
          </p>
        </div>
      </div>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {ok ? <DashboardFeedback kind="success" text={ok} /> : null}

      {muted ? (
        <p className="text-sm font-medium text-muted-foreground">
          Tips are muted for this shop.
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={!canEdit || busy}
          onClick={() => void onMute()}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Muting…
            </>
          ) : (
            "Mute these tips"
          )}
        </Button>
      )}
    </section>
  );
}
