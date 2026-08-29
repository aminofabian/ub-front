"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { AuthAlert } from "@/components/auth/auth-alert";
import {
  BillingMetricTile,
  BillingSurface,
  formatBillingMoney,
} from "@/components/billing/billing-ui";
import { SaSection, SaToggleRow } from "@/components/super-admin/sa-section";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchSaSubscriptionDunning,
  fetchSaSubscriptionPlans,
  fetchSaSubscriptionSettings,
  updateSaSubscriptionSettings,
  upsertSaSubscriptionPlan,
  type SaSubscriptionDunningRecord,
  type SaSubscriptionPlanRecord,
  type SaSubscriptionSettingsRecord,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

export default function SuperAdminSubscriptionPage() {
  const [settings, setSettings] = useState<SaSubscriptionSettingsRecord | null>(null);
  const [plans, setPlans] = useState<SaSubscriptionPlanRecord[]>([]);
  const [dunning, setDunning] = useState<SaSubscriptionDunningRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTier, setSavingTier] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, p, d] = await Promise.all([
        fetchSaSubscriptionSettings(),
        fetchSaSubscriptionPlans(),
        fetchSaSubscriptionDunning(),
      ]);
      setSettings(s);
      setPlans(p);
      setDunning(d);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load subscription billing.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const updated = await updateSaSubscriptionSettings({
        billingEnabled: settings.billingEnabled,
        defaultGraceDays: settings.defaultGraceDays,
        renewalBaseUrl: settings.renewalBaseUrl,
        notificationCadenceDays: settings.notificationCadenceDays,
        preExpiryReminderDays: settings.preExpiryReminderDays,
      });
      setSettings(updated);
      toast.success("Subscription settings saved.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingSettings(false);
    }
  };

  const savePlan = async (plan: SaSubscriptionPlanRecord) => {
    setSavingTier(plan.tierCode);
    try {
      const updated = await upsertSaSubscriptionPlan(plan.tierCode, {
        displayName: plan.displayName,
        monthlyPriceKes: plan.monthlyPriceKes,
        annualPriceKes: plan.annualPriceKes,
        graceDays: plan.graceDays,
        active: plan.active,
      });
      setPlans(updated);
      toast.success(`${plan.tierCode} plan updated.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Plan save failed.");
    } finally {
      setSavingTier(null);
    }
  };

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Subscription billing"
        description="Plans, grace period, pre-expiry reminders, and dunning metrics."
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}

      {dunning ? (
        <SaSection title="Dunning snapshot" description="Live billing health — last 30/90 days.">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <BillingMetricTile
              label="In grace"
              value={String(dunning.tenantsInGrace)}
              tone={dunning.tenantsInGrace > 0 ? "warning" : "neutral"}
            />
            <BillingMetricTile
              label="Suspended"
              value={String(dunning.tenantsSuspended)}
              tone={dunning.tenantsSuspended > 0 ? "critical" : "neutral"}
            />
            <BillingMetricTile
              label="Revenue at risk / mo"
              value={formatBillingMoney(dunning.monthlyRevenueAtRiskKes)}
              tone={dunning.monthlyRevenueAtRiskKes > 0 ? "warning" : "neutral"}
            />
            <BillingMetricTile
              label="Grace recovery (90d)"
              value={`${dunning.graceRecoveryRatePercent}%`}
              hint={`${dunning.graceEpisodesLast90d} episodes`}
              tone={
                dunning.graceRecoveryRatePercent >= 70
                  ? "positive"
                  : dunning.graceRecoveryRatePercent >= 40
                    ? "neutral"
                    : "warning"
              }
            />
            <BillingMetricTile
              label="Renewals (30d)"
              value={String(dunning.renewalsLast30d)}
              tone="positive"
            />
            <BillingMetricTile
              label="Renewal revenue (30d)"
              value={formatBillingMoney(dunning.renewalRevenueLast30dKes)}
              tone="positive"
            />
            <BillingMetricTile
              label="Pre-expiry emails (30d)"
              value={String(dunning.preExpiryRemindersLast30d)}
            />
            <BillingMetricTile
              label="Billing enabled"
              value={dunning.billingEnabled ? "Yes" : "No"}
              tone={dunning.billingEnabled ? "positive" : "neutral"}
            />
          </div>
        </SaSection>
      ) : null}

      {settings ? (
        <SaSection title="Platform settings" description="Master toggle and notification cadence.">
          <div className="space-y-4">
            <SaToggleRow
              id="subscription-billing-enabled"
              label="Billing enabled"
              description="When off, schedulers and renewal STK are inactive."
              checked={settings.billingEnabled}
              onChange={(checked) =>
                setSettings({ ...settings, billingEnabled: checked })
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default grace days">
                <Input
                  type="number"
                  min={1}
                  value={settings.defaultGraceDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultGraceDays: Number(e.target.value) || 15,
                    })
                  }
                />
              </Field>
              <Field label="Pre-expiry reminder (days before)">
                <Input
                  type="number"
                  min={1}
                  value={settings.preExpiryReminderDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      preExpiryReminderDays: Number(e.target.value) || 7,
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Renewal URL">
              <Input
                value={settings.renewalBaseUrl}
                onChange={(e) =>
                  setSettings({ ...settings, renewalBaseUrl: e.target.value })
                }
              />
            </Field>
            <Field
              label="Expiry campaign cadence"
              hint="Comma-separated grace days for SMS/email (e.g. 0,2,5,8,11,13,14,15)."
            >
              <Input
                value={settings.notificationCadenceDays}
                onChange={(e) =>
                  setSettings({ ...settings, notificationCadenceDays: e.target.value })
                }
              />
            </Field>
            <Button
              type="button"
              disabled={savingSettings}
              className="active:scale-[0.98]"
              onClick={() => void saveSettings()}
            >
              {savingSettings ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              Save settings
            </Button>
          </div>
        </SaSection>
      ) : null}

      <SaSection title="Plans" description="Monthly and annual pricing (annual = pay 10, get 12).">
        {!plans.length ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <PlanRow
                key={plan.tierCode}
                plan={plan}
                saving={savingTier === plan.tierCode}
                onChange={(patch) =>
                  setPlans((rows) =>
                    rows.map((r) =>
                      r.tierCode === plan.tierCode ? { ...r, ...patch } : r,
                    ),
                  )
                }
                onSave={() => void savePlan(plan)}
              />
            ))}
          </div>
        )}
      </SaSection>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function PlanRow({
  plan,
  saving,
  onChange,
  onSave,
}: {
  plan: SaSubscriptionPlanRecord;
  saving: boolean;
  onChange: (patch: Partial<SaSubscriptionPlanRecord>) => void;
  onSave: () => void;
}) {
  const annualHint =
    plan.monthlyPriceKes > 0 && !plan.annualPriceKes
      ? formatBillingMoney(plan.monthlyPriceKes * 10)
      : null;

  return (
    <BillingSurface padding="none" className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {plan.tierCode}
          </p>
          <p className="font-heading text-base font-semibold tracking-tight">
            {plan.displayName || "Untitled plan"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={plan.active}
            className="size-3.5 accent-primary"
            onChange={(e) => onChange({ active: e.target.checked })}
          />
          Active
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <Input
          value={plan.displayName}
          placeholder="Display name"
          onChange={(e) => onChange({ displayName: e.target.value })}
        />
        <Input
          type="number"
          min={0}
          placeholder="Monthly KES"
          value={plan.monthlyPriceKes}
          onChange={(e) => onChange({ monthlyPriceKes: Number(e.target.value) || 0 })}
        />
        <Input
          type="number"
          min={0}
          placeholder={annualHint ? `Auto: ${annualHint}` : "Annual KES"}
          value={plan.annualPriceKes ?? ""}
          onChange={(e) =>
            onChange({
              annualPriceKes: e.target.value === "" ? null : Number(e.target.value) || 0,
            })
          }
        />
        <Input
          type="number"
          min={1}
          placeholder="Grace days"
          value={plan.graceDays}
          onChange={(e) => onChange({ graceDays: Number(e.target.value) || 15 })}
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("mt-3 active:scale-[0.98]", saving && "opacity-70")}
        disabled={saving}
        onClick={onSave}
      >
        {saving ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        Save plan
      </Button>
    </BillingSurface>
  );
}
