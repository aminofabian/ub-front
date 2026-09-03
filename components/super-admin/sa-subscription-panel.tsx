"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SaSection, saSelectClass } from "@/components/super-admin/sa-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  extendSaBusinessGrace,
  extendSaBusinessSubscription,
  fetchSaBusinessSubscription,
  fetchSaSubscriptionPlans,
  overrideSaBusinessSubscription,
  reactivateSaBusinessSubscription,
  type SaBusinessSubscriptionRecord,
  type SaSubscriptionPlanRecord,
} from "@/lib/super-admin-api";
import { DEFAULT_PROBLEM_TITLE } from "@/lib/problem";
import { cn } from "@/lib/utils";

const NAIROBI = "Africa/Nairobi";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: NAIROBI,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function fromLocalInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+03:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-KE", {
    timeZone: NAIROBI,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusVariant(
  status: SaBusinessSubscriptionRecord["billingStatus"],
): "success" | "warning" | "secondary" {
  if (status === "ACTIVE") return "success";
  if (status === "GRACE") return "warning";
  return "secondary";
}

export function SaSubscriptionPanel({
  businessId,
  onTierChange,
}: {
  businessId: string;
  onTierChange?: (tier: string) => void;
}) {
  const [snap, setSnap] = useState<SaBusinessSubscriptionRecord | null>(null);
  const [plans, setPlans] = useState<SaSubscriptionPlanRecord[]>([]);
  const [loadError, setLoadError] = useState("");
  const [tier, setTier] = useState("");
  const [billingStatus, setBillingStatus] = useState<
    SaBusinessSubscriptionRecord["billingStatus"]
  >("ACTIVE");
  const [periodLocal, setPeriodLocal] = useState("");
  const [graceLocal, setGraceLocal] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [row, catalogue] = await Promise.all([
        fetchSaBusinessSubscription(businessId),
        fetchSaSubscriptionPlans(),
      ]);
      setSnap(row);
      setPlans(catalogue.filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder));
      setTier(row.tier);
      setBillingStatus(row.billingStatus);
      setPeriodLocal(toLocalInput(row.currentPeriodEnd));
      setGraceLocal(toLocalInput(row.graceEndsAt));
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load subscription.");
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const periodRunning = useMemo(() => {
    if (!snap || snap.billingStatus !== "ACTIVE" || !snap.currentPeriodEnd) {
      return false;
    }
    return Date.parse(snap.currentPeriodEnd) > Date.now();
  }, [snap]);

  const run = async (key: string, work: () => Promise<SaBusinessSubscriptionRecord>, ok: string) => {
    setBusy(key);
    try {
      const row = await work();
      setSnap(row);
      setTier(row.tier);
      setBillingStatus(row.billingStatus);
      setPeriodLocal(toLocalInput(row.currentPeriodEnd));
      setGraceLocal(toLocalInput(row.graceEndsAt));
      onTierChange?.(row.tier);
      setNote("");
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : DEFAULT_PROBLEM_TITLE);
    } finally {
      setBusy(null);
    }
  };

  const s = snap;
  return (
    <SaSection
      title="Subscription"
      description="Override plan and payment status, then extend paid time or grace if needed."
    >
      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : !s ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(s.billingStatus)}>{s.billingStatus}</Badge>
            <span className="text-sm font-medium capitalize">{s.tierDisplayName || s.tier}</span>
            {s.suspensionReason ? (
              <span className="text-xs text-muted-foreground">{s.suspensionReason}</span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Period ends</p>
              <p className="text-sm font-semibold tabular-nums">{fmtWhen(s.currentPeriodEnd)}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Grace ends</p>
              <p className="text-sm font-semibold tabular-nums">{fmtWhen(s.graceEndsAt)}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Amount due</p>
              <p className="text-sm font-semibold tabular-nums">
                KES {Number(s.amountDueKes ?? 0).toLocaleString("en-KE")}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Suspended at</p>
              <p className="text-sm font-semibold tabular-nums">{fmtWhen(s.billingSuspendedAt)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sa-sub-plan">Plan</Label>
              <select
                id="sa-sub-plan"
                className={saSelectClass}
                value={tier}
                disabled={busy != null}
                onChange={(e) => setTier(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.tierCode} value={p.tierCode}>
                    {p.displayName}
                    {p.productLimit != null ? ` · ${p.productLimit.toLocaleString()} products` : ""}
                  </option>
                ))}
                {tier && !plans.some((p) => p.tierCode === tier) ? (
                  <option value={tier}>{tier}</option>
                ) : null}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-sub-status">Payment status</Label>
              <select
                id="sa-sub-status"
                className={saSelectClass}
                value={billingStatus}
                disabled={busy != null}
                onChange={(e) =>
                  setBillingStatus(e.target.value as SaBusinessSubscriptionRecord["billingStatus"])
                }
              >
                <option value="ACTIVE">ACTIVE — paid, full access</option>
                <option value="GRACE">GRACE — expired, still open</option>
                <option value="SUSPENDED">SUSPENDED — locked out</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-sub-period">Period ends</Label>
              <Input
                id="sa-sub-period"
                type="datetime-local"
                value={periodLocal}
                disabled={busy != null}
                onChange={(e) => setPeriodLocal(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Nairobi time. Paid access until this instant.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-sub-grace">Grace ends</Label>
              <Input
                id="sa-sub-grace"
                type="datetime-local"
                value={graceLocal}
                disabled={busy != null || billingStatus === "ACTIVE"}
                onChange={(e) => setGraceLocal(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                {billingStatus === "ACTIVE"
                  ? "Cleared when status is ACTIVE."
                  : "Shop locks at this instant. Blank uses the plan default."}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sa-sub-note">Note (optional, audit)</Label>
            <Input
              id="sa-sub-note"
              value={note}
              disabled={busy != null}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this override"
            />
          </div>

          <Button
            type="button"
            disabled={busy != null}
            onClick={() =>
              void run(
                "save",
                () =>
                  overrideSaBusinessSubscription(businessId, {
                    tierCode: tier || null,
                    billingStatus,
                    currentPeriodEnd: fromLocalInput(periodLocal),
                    graceEndsAt:
                      billingStatus === "ACTIVE" ? null : fromLocalInput(graceLocal),
                    note: note.trim() || null,
                  }),
                "Subscription override saved.",
              )
            }
          >
            {busy === "save" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Save overrides
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Add paid time</span>
            {([1, 3, 12] as const).map((months) => (
              <Button
                key={months}
                type="button"
                size="sm"
                variant="outline"
                disabled={busy != null}
                onClick={() =>
                  void run(
                    `m${months}`,
                    () =>
                      extendSaBusinessSubscription(businessId, {
                        months,
                        note: note.trim() || null,
                      }),
                    `Extended ${months} month${months === 1 ? "" : "s"}.`,
                  )
                }
              >
                {busy === `m${months}` ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                +{months} {months === 1 ? "month" : "months"}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Add grace days</span>
            {([7, 15, 30] as const).map((days) => (
              <Button
                key={days}
                type="button"
                size="sm"
                variant="outline"
                disabled={busy != null || periodRunning}
                title={
                  periodRunning
                    ? "Paid period is still running. Add paid time instead."
                    : undefined
                }
                onClick={() =>
                  void run(
                    `d${days}`,
                    () =>
                      extendSaBusinessGrace(businessId, {
                        days,
                        note: note.trim() || null,
                      }),
                    `Grace extended by ${days} days.`,
                  )
                }
              >
                {busy === `d${days}` ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                +{days} days
              </Button>
            ))}
          </div>

          {s.billingStatus === "SUSPENDED" ? (
            <Button
              type="button"
              disabled={busy != null}
              className={cn("h-9")}
              onClick={() =>
                void run(
                  "reactivate",
                  () => reactivateSaBusinessSubscription(businessId),
                  "Shop reactivated.",
                )
              }
            >
              {busy === "reactivate" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Reactivate shop
            </Button>
          ) : null}
        </div>
      )}
    </SaSection>
  );
}
