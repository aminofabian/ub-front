"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { SaSection } from "@/components/super-admin/sa-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchSaSmsCreditAccount,
  grantSaSmsCredits,
  updateSaSmsCreditAccount,
  type SaSmsCreditAccountRecord,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const KIND_LABELS: Record<string, string> = {
  INCLUDED_SPEND: "Included spend",
  PURCHASED_SPEND: "Purchased spend",
  PURCHASE: "Top-up",
  GRANT: "Grant",
  REFUND: "Refund",
  CYCLE_RESET: "Cycle reset",
};

export function SaSmsCreditsPanel({ businessId }: { businessId: string }) {
  const [account, setAccount] = useState<SaSmsCreditAccountRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [grantCredits, setGrantCredits] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [override, setOverride] = useState("");
  const [savingGrant, setSavingGrant] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);

  const load = useCallback(async () => {
    try {
      const row = await fetchSaSmsCreditAccount(businessId);
      setAccount(row);
      setOverride(row.includedOverride != null ? String(row.includedOverride) : "");
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load SMS credits.");
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onGrant = async () => {
    const credits = Number(grantCredits);
    if (!Number.isFinite(credits) || credits <= 0) {
      toast.error("Enter a positive credit amount.");
      return;
    }
    setSavingGrant(true);
    try {
      const updated = await grantSaSmsCredits(businessId, {
        credits: Math.round(credits),
        note: grantNote.trim() || null,
      });
      setAccount(updated);
      setGrantCredits("");
      setGrantNote("");
      toast.success("Credits granted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Grant failed.");
    } finally {
      setSavingGrant(false);
    }
  };

  const onOverride = async () => {
    const value = override.trim() === "" ? null : Number(override);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      toast.error("Override must be a non-negative number.");
      return;
    }
    setSavingOverride(true);
    try {
      const updated = await updateSaSmsCreditAccount(businessId, {
        includedOverride: value,
      });
      setAccount(updated);
      toast.success(value === null ? "Override cleared." : "Allowance override saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingOverride(false);
    }
  };

  const a = account;
  return (
    <SaSection
      title="SMS credits"
      description="Included monthly allowance, purchased top-up balance, and manual adjustments."
    >
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : !a ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Available</p>
              <p className="text-lg font-bold tabular-nums">{a.available}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">
                Included {a.includedOverride != null ? "(override)" : ""}
              </p>
              <p className="text-lg font-bold tabular-nums">
                {a.includedUsed} / {a.includedAllowance}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Purchased</p>
              <p className="text-lg font-bold tabular-nums">{a.purchasedBalance}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Cycle started</p>
              <p className="text-lg font-bold tabular-nums">{fmtWhen(a.cycleStartedAt)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="sa-grant-credits">Grant credits</Label>
              <Input
                id="sa-grant-credits"
                type="number"
                min={1}
                step={1}
                className="w-28"
                placeholder="e.g. 100"
                value={grantCredits}
                onChange={(e) => setGrantCredits(e.target.value)}
              />
            </div>
            <div className="min-w-40 flex-1 space-y-1.5">
              <Label htmlFor="sa-grant-note">Note (optional)</Label>
              <Input
                id="sa-grant-note"
                className="w-full"
                placeholder="e.g. emergency grant"
                value={grantNote}
                onChange={(e) => setGrantNote(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={savingGrant}
              onClick={() => void onGrant()}
            >
              {savingGrant ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              Grant
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="sa-credit-override">
                Included allowance override
              </Label>
              <Input
                id="sa-credit-override"
                type="number"
                min={0}
                step={1}
                className="w-28"
                placeholder="blank = use tier"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={savingOverride}
              onClick={() => void onOverride()}
            >
              {savingOverride ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                "Save override"
              )}
            </Button>
          </div>

          {a.recentLedger.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 text-right font-medium">Delta</th>
                    <th className="px-3 py-2 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {a.recentLedger.slice(0, 8).map((row) => (
                    <tr key={row.id} className="border-t border-border/50">
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {fmtWhen(row.createdAt)}
                      </td>
                      <td className="px-3 py-1.5">
                        {KIND_LABELS[row.kind] ?? row.kind}
                        {row.reason ? (
                          <span className="text-muted-foreground"> · {row.reason}</span>
                        ) : null}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-1.5 text-right tabular-nums",
                          row.delta < 0 ? "text-destructive" : "text-emerald-600",
                        )}
                      >
                        {row.delta > 0 ? `+${row.delta}` : row.delta}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {row.balanceAfter}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No ledger movements yet.</p>
          )}
        </div>
      )}
    </SaSection>
  );
}
