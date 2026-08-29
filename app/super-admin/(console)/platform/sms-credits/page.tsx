"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { AuthAlert } from "@/components/auth/auth-alert";
import { BillingMetricTile } from "@/components/billing/billing-ui";
import {
  SaSection,
  SaToggleRow,
} from "@/components/super-admin/sa-section";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchPlatformSmsCreditSettings,
  fetchSmsCreditUsage,
  fetchSmsTierAllowances,
  updatePlatformSmsCreditSettings,
  upsertSmsTierAllowance,
  type PlatformSmsCreditSettingsRecord,
  type SaSmsCreditUsageRecord,
  type SmsTierAllowanceRecord,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

function Field({
  id,
  label,
  hint,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default function SuperAdminSmsCreditsPage() {
  const [settings, setSettings] = useState<PlatformSmsCreditSettingsRecord | null>(null);
  const [tiers, setTiers] = useState<SmsTierAllowanceRecord[]>([]);
  const [usage, setUsage] = useState<SaSmsCreditUsageRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SmsTierAllowanceRecord>>({});
  const [newTier, setNewTier] = useState({ tierCode: "", includedSmsPerMonth: 30 });

  const load = useCallback(async () => {
    try {
      const [s, t, u] = await Promise.all([
        fetchPlatformSmsCreditSettings(),
        fetchSmsTierAllowances(),
        fetchSmsCreditUsage(),
      ]);
      setSettings(s);
      setTiers(t);
      setUsage(u);
      setDrafts(Object.fromEntries(t.map((row) => [row.tierCode, { ...row }])));
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load SMS credit settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const updated = await updatePlatformSmsCreditSettings({
        enabled: settings.enabled,
        unitPriceKes: settings.unitPriceKes,
        minPurchaseCredits: settings.minPurchaseCredits,
        maxPurchaseCredits: settings.maxPurchaseCredits,
        lowBalanceThreshold: settings.lowBalanceThreshold,
        cycleTimezone: settings.cycleTimezone,
      });
      setSettings(updated);
      toast.success("SMS credit settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const saveTier = async (tierCode: string) => {
    const draft = drafts[tierCode];
    if (!draft) return;
    setSavingTier(tierCode);
    try {
      const updated = await upsertSmsTierAllowance(tierCode, {
        includedSmsPerMonth: draft.includedSmsPerMonth,
        active: draft.active,
      });
      setTiers(updated);
      setDrafts(Object.fromEntries(updated.map((row) => [row.tierCode, { ...row }])));
      toast.success(`Tier "${tierCode}" updated.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update tier.");
    } finally {
      setSavingTier(null);
    }
  };

  const addTier = async () => {
    const code = newTier.tierCode.trim().toLowerCase();
    if (!code) {
      toast.error("Enter a tier code.");
      return;
    }
    setBusy(true);
    try {
      const updated = await upsertSmsTierAllowance(code, {
        includedSmsPerMonth: newTier.includedSmsPerMonth,
        active: true,
      });
      setTiers(updated);
      setDrafts(Object.fromEntries(updated.map((row) => [row.tierCode, { ...row }])));
      setNewTier({ tierCode: "", includedSmsPerMonth: 30 });
      toast.success(`Tier "${code}" added.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add tier.");
    } finally {
      setBusy(false);
    }
  };

  const num = (v: string, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <SuperAdminPageHeader
        title="SMS credits & limits"
        description="Monthly included SMS per subscription tier, top-up pricing, and the platform kill switch."
      />

      {loadError ? (
        <AuthAlert variant="error">{loadError}</AuthAlert>
      ) : !settings ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
        </div>
      ) : (
        <>
          <SaSection
            title="Global settings"
            description="Applies platform-wide. The kill switch disables metering for migrations or emergencies."
            actions={
              <Button
                size="sm"
                variant="outline"
                disabled={savingSettings}
                onClick={() => void saveSettings()}
              >
                {savingSettings ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-4" aria-hidden />
                )}
                Save settings
              </Button>
            }
          >
            <div className="grid gap-4">
              <SaToggleRow
                id="sms-credits-enabled"
                label="Metering enabled"
                description="When off, SMS sends are unlimited (no credit deduction)."
                checked={settings.enabled}
                onChange={(v) => setSettings((s) => (s ? { ...s, enabled: v } : s))}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="unit-price" label="Unit price (KES per credit)">
                  <Input
                    id="unit-price"
                    type="number"
                    min={0.5}
                    step="0.05"
                    value={settings.unitPriceKes}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, unitPriceKes: num(e.target.value, 1) } : s,
                      )
                    }
                  />
                </Field>
                <Field
                  id="low-threshold"
                  label="Low balance threshold"
                  hint="Header chip turns amber at or below this many credits."
                >
                  <Input
                    id="low-threshold"
                    type="number"
                    min={0}
                    step={1}
                    value={settings.lowBalanceThreshold}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, lowBalanceThreshold: num(e.target.value, 5) } : s,
                      )
                    }
                  />
                </Field>
                <Field id="min-purchase" label="Minimum purchase (credits)">
                  <Input
                    id="min-purchase"
                    type="number"
                    min={1}
                    step={1}
                    value={settings.minPurchaseCredits}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, minPurchaseCredits: num(e.target.value, 10) } : s,
                      )
                    }
                  />
                </Field>
                <Field id="max-purchase" label="Maximum purchase (credits)">
                  <Input
                    id="max-purchase"
                    type="number"
                    min={1}
                    step={1}
                    value={settings.maxPurchaseCredits}
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, maxPurchaseCredits: num(e.target.value, 500) } : s,
                      )
                    }
                  />
                </Field>
              </div>
            </div>
          </SaSection>

          {usage ? (
            <SaSection
              title="Usage this month"
              description={`Cycle started ${new Date(usage.cycleStartedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} — metered SMS sends across the platform.`}
            >
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <BillingMetricTile
                  label="Total sent"
                  value={String(usage.totalSentThisCycle)}
                />
                <BillingMetricTile
                  label="Included"
                  value={String(usage.includedSentThisCycle)}
                />
                <BillingMetricTile
                  label="Purchased"
                  value={String(usage.purchasedSentThisCycle)}
                />
                <BillingMetricTile
                  label="Depleted tenants"
                  value={String(usage.depletedCount)}
                  tone={usage.depletedCount > 0 ? "critical" : "neutral"}
                />
              </div>

              {usage.topTenants.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Tenant</th>
                        <th className="px-3 py-2 font-medium">Tier</th>
                        <th className="px-3 py-2 text-right font-medium">Sent</th>
                        <th className="px-3 py-2 text-right font-medium">Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.topTenants.map((row) => (
                        <tr key={row.businessId} className="border-t border-border/50">
                          <td className="max-w-52 truncate px-3 py-1.5">{row.name}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{row.tier}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{row.sentThisCycle}</td>
                          <td
                            className={cn(
                              "px-3 py-1.5 text-right tabular-nums",
                              row.available <= 0 ? "text-destructive" : "text-foreground",
                            )}
                          >
                            {row.available}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No metered SMS sends this cycle yet.
                </p>
              )}
            </SaSection>
          ) : null}

          <SaSection
            title="Tier allowances"
            description="Included SMS per subscription tier each calendar month. Edits apply to the current cycle (next-cycle-only is a manual grant)."
          >
            <div className="space-y-2">
              {tiers.map((tier) => {
                const draft = drafts[tier.tierCode] ?? tier;
                const dirty =
                  draft.includedSmsPerMonth !== tier.includedSmsPerMonth ||
                  draft.active !== tier.active;
                return (
                  <div
                    key={tier.tierCode}
                    className="flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2"
                  >
                    <span className="w-28 shrink-0 truncate font-mono text-sm">
                      {tier.tierCode}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      className="h-8 w-28"
                      value={draft.includedSmsPerMonth}
                      onChange={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [tier.tierCode]: {
                            ...draft,
                            includedSmsPerMonth: num(e.target.value, 0),
                          },
                        }))
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      SMS / month
                    </span>
                    <label className="ml-auto flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={draft.active}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [tier.tierCode]: {
                              ...draft,
                              active: e.target.checked,
                            },
                          }))
                        }
                        className="size-3.5 accent-primary"
                      />
                      Active
                    </label>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn("h-8", dirty && "border-primary text-primary")}
                      disabled={savingTier === tier.tierCode}
                      onClick={() => void saveTier(tier.tierCode)}
                    >
                      {savingTier === tier.tierCode ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-end gap-2 border-t border-border/60 pt-4">
              <Field id="new-tier-code" label="New tier code">
                <Input
                  id="new-tier-code"
                  className="w-40 font-mono"
                  placeholder="e.g. premium"
                  value={newTier.tierCode}
                  onChange={(e) =>
                    setNewTier((n) => ({ ...n, tierCode: e.target.value }))
                  }
                />
              </Field>
              <Field id="new-tier-sms" label="Included SMS / month">
                <Input
                  id="new-tier-sms"
                  type="number"
                  min={0}
                  step={1}
                  className="w-32"
                  value={newTier.includedSmsPerMonth}
                  onChange={(e) =>
                    setNewTier((n) => ({
                      ...n,
                      includedSmsPerMonth: num(e.target.value, 30),
                    }))
                  }
                />
              </Field>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void addTier()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-4" aria-hidden />
                )}
                Add tier
              </Button>
            </div>
          </SaSection>

          <p className="text-xs text-muted-foreground">
            Per-business drill-down (grant credits, set an allowance override,
            view the ledger) lives on each business page under Super Admin →
            Businesses.
          </p>
        </>
      )}
    </div>
  );
}
