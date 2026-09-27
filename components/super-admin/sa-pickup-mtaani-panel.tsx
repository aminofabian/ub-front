"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, Unplug } from "lucide-react";
import { toast } from "sonner";

import { SaSection } from "@/components/super-admin/sa-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  disconnectSaPickupMtaaniCredential,
  fetchSaPickupMtaaniCredential,
  saveSaPickupMtaaniCredential,
  type SaPickupMtaaniCredential,
} from "@/lib/super-admin-api";

function fmtWhen(iso?: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * The tenant's Pickup Mtaani API key, owned by super-admin (scope §6). One key
 * per business, encrypted at rest, verified on save. The merchant never sees it.
 */
export function SaPickupMtaaniPanel({ businessId }: { businessId: string }) {
  const [credential, setCredential] = useState<SaPickupMtaaniCredential | null>(null);
  const [loadError, setLoadError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"idle" | "save" | "disconnect">("idle");

  const load = useCallback(async () => {
    try {
      setCredential(await fetchSaPickupMtaaniCredential(businessId));
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load Pickup Mtaani.");
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    const key = apiKey.trim();
    if (!key) {
      toast.error("Paste the Pickup Mtaani API key first.");
      return;
    }
    setBusy("save");
    try {
      const next = await saveSaPickupMtaaniCredential(businessId, key);
      setCredential(next);
      setApiKey("");
      if (next.status === "connected") {
        toast.success(`Connected to ${next.businessName ?? "Pickup Mtaani"}.`);
      } else if (next.statusDetail) {
        toast.error(next.statusDetail);
      } else {
        toast.error("Pickup Mtaani did not accept this key.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy("idle");
    }
  };

  const onDisconnect = async () => {
    setBusy("disconnect");
    try {
      const next = await disconnectSaPickupMtaaniCredential(businessId);
      setCredential(next);
      toast.success("Disconnected. The merchant option is now off.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Disconnect failed.");
    } finally {
      setBusy("idle");
    }
  };

  const c = credential;
  const connected = Boolean(c?.hasApiKey);

  return (
    <SaSection
      title="Pickup Mtaani"
      description="The shop's own Pickup Mtaani API key. Encrypted at rest; the merchant never sees it. A multi-business key is saved but unusable in V1."
    >
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : !c ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Status</p>
              <p className="text-sm font-semibold">{c.status}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Business</p>
              <p className="truncate text-sm font-semibold">{c.businessName ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Account mode</p>
              <p className="text-sm font-semibold">{c.accountMode ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Last verified</p>
              <p className="text-sm font-semibold">{fmtWhen(c.lastVerifiedAt)}</p>
            </div>
          </div>

          {c.statusDetail ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {c.statusDetail}
            </p>
          ) : null}

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="sa-pum-key">
                {connected ? "Replace API key" : "API key"}
              </Label>
              <Input
                id="sa-pum-key"
                type="password"
                autoComplete="off"
                placeholder="Paste the shop's Pickup Mtaani key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={busy !== "idle"}
              onClick={() => void onSave()}
            >
              {busy === "save" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ShieldCheck className="size-4" aria-hidden />
              )}
              {connected ? "Replace" : "Save & verify"}
            </Button>
            {connected ? (
              <Button
                type="button"
                variant="destructive"
                disabled={busy !== "idle"}
                onClick={() => void onDisconnect()}
              >
                {busy === "disconnect" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Unplug className="size-4" aria-hidden />
                )}
                Disconnect
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </SaSection>
  );
}
