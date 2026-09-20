"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CreditCard, Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { formatBillingMoney } from "@/components/billing/billing-ui";
import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

import {
  SUBSCRIPTION_NAV,
  SubscriptionTheatre,
  type SubscriptionSectionId,
} from "./_components/subscription-theatre";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PRIMARY_BTN =
  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white shadow-none hover:bg-[#0d6b63]";

function sectionFromHash(hash: string): SubscriptionSectionId | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (SUBSCRIPTION_NAV.some((item) => item.id === id)) {
    return id as SubscriptionSectionId;
  }
  return null;
}

function Field({
  id,
  label,
  hint,
  className,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {id ? (
        <Label htmlFor={id} className={dashboardLabelClass()}>
          {label}
        </Label>
      ) : (
        <p className={dashboardLabelClass()}>{label}</p>
      )}
      {children}
      {hint ? <p className={dashboardHintClass()}>{hint}</p> : null}
    </div>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border bg-white px-3 py-2.5",
        HAIRLINE,
      )}
    >
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[13px] font-semibold tracking-[-0.015em] text-foreground">
          {label}
        </span>
        {description ? (
          <span className={cn(dashboardHintClass(), "mt-0.5 block")}>
            {description}
          </span>
        ) : null}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  critical,
  positive,
}: {
  label: string;
  value: string;
  hint?: string;
  critical?: boolean;
  positive?: boolean;
}) {
  return (
    <div className={cn("border bg-white px-3 py-2.5", HAIRLINE)}>
      <p className={dashboardHintClass()}>{label}</p>
      <p
        className={cn(
          "mt-1 text-[1.25rem] font-semibold tabular-nums tracking-[-0.03em]",
          critical
            ? "text-[#9a2e16]"
            : positive
              ? "text-[var(--pos-primary,#0f766e)]"
              : "text-foreground",
        )}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
      {hint ? (
        <p className={cn(dashboardHintClass(), "mt-1")}>{hint}</p>
      ) : null}
    </div>
  );
}

export default function SuperAdminSubscriptionPage() {
  const [settings, setSettings] =
    useState<SaSubscriptionSettingsRecord | null>(null);
  const [plans, setPlans] = useState<SaSubscriptionPlanRecord[]>([]);
  const [dunning, setDunning] = useState<SaSubscriptionDunningRecord | null>(
    null,
  );
  const [loadError, setLoadError] = useState("");
  const [booting, setBooting] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [activeSection, setActiveSection] =
    useState<SubscriptionSectionId | null>(null);

  const load = useCallback(async () => {
    setBooting(true);
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
      setLoadError(
        e instanceof Error
          ? e.message
          : "Failed to load subscription billing.",
      );
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const apply = () => {
      const next = sectionFromHash(window.location.hash);
      if (next) setActiveSection(next);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

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

  const sectionSummary = (sectionId: SubscriptionSectionId): ReactNode => {
    switch (sectionId) {
      case "dunning":
        return (
          <>
            <span
              className={cn(
                "font-semibold tabular-nums",
                (dunning?.tenantsInGrace ?? 0) > 0 && "text-amber-800",
              )}
            >
              {dunning?.tenantsInGrace ?? "—"}
            </span>{" "}
            grace
            {" · "}
            <span
              className={cn(
                "font-semibold tabular-nums",
                (dunning?.tenantsSuspended ?? 0) > 0 && "text-[#9a2e16]",
              )}
            >
              {dunning?.tenantsSuspended ?? "—"}
            </span>{" "}
            suspended
            {" · "}
            {dunning
              ? formatBillingMoney(dunning.monthlyRevenueAtRiskKes)
              : "—"}{" "}
            at risk
          </>
        );
      case "settings":
        return (
          <>
            Billing{" "}
            <span className="font-semibold">
              {settings?.billingEnabled ? "on" : "off"}
            </span>
            {" · "}
            <span className="font-semibold tabular-nums">
              {settings?.defaultGraceDays ?? "—"}
            </span>{" "}
            grace days
            {" · "}
            remind{" "}
            <span className="font-semibold tabular-nums">
              {settings?.preExpiryReminderDays ?? "—"}
            </span>
            d before
          </>
        );
      case "plans":
        return (
          <>
            <span className="font-semibold tabular-nums">{plans.length}</span>{" "}
            plan{plans.length === 1 ? "" : "s"}
            {" · "}
            <span className="font-semibold tabular-nums">
              {plans.filter((p) => p.active).length}
            </span>{" "}
            active
            {" · "}
            annual = pay 10, get 12
          </>
        );
      default:
        return null;
    }
  };

  const drawerBody = (() => {
    if (!activeSection) return null;

    if (activeSection === "dunning") {
      if (!dunning) {
        return (
          <p className={cn(dashboardHintClass(), "flex items-center gap-2")}>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading dunning…
          </p>
        );
      }
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Metric
            label="In grace"
            value={String(dunning.tenantsInGrace)}
            critical={dunning.tenantsInGrace > 0}
          />
          <Metric
            label="Suspended"
            value={String(dunning.tenantsSuspended)}
            critical={dunning.tenantsSuspended > 0}
          />
          <Metric
            label="Revenue at risk / mo"
            value={formatBillingMoney(dunning.monthlyRevenueAtRiskKes)}
            critical={dunning.monthlyRevenueAtRiskKes > 0}
          />
          <Metric
            label="Grace recovery · 90d"
            value={`${dunning.graceRecoveryRatePercent}%`}
            hint={`${dunning.graceEpisodesLast90d} episodes`}
            positive={dunning.graceRecoveryRatePercent >= 70}
            critical={dunning.graceRecoveryRatePercent < 40}
          />
          <Metric
            label="Renewals · 30d"
            value={String(dunning.renewalsLast30d)}
            positive
          />
          <Metric
            label="Renewal revenue · 30d"
            value={formatBillingMoney(dunning.renewalRevenueLast30dKes)}
            positive
          />
          <Metric
            label="Pre-expiry emails · 30d"
            value={String(dunning.preExpiryRemindersLast30d)}
          />
          <Metric
            label="Billing enabled"
            value={dunning.billingEnabled ? "Yes" : "No"}
            positive={dunning.billingEnabled}
            critical={!dunning.billingEnabled}
          />
        </div>
      );
    }

    if (activeSection === "settings") {
      if (!settings) {
        return (
          <p className={cn(dashboardHintClass(), "flex items-center gap-2")}>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading settings…
          </p>
        );
      }
      return (
        <div className="space-y-4">
          <ToggleRow
            id="subscription-billing-enabled"
            label="Billing enabled"
            description="When off, schedulers and renewal STK are inactive."
            checked={settings.billingEnabled}
            onChange={(checked) =>
              setSettings({ ...settings, billingEnabled: checked })
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="default-grace" label="Default grace days">
              <Input
                id="default-grace"
                type="number"
                min={1}
                className={dashboardInputClass()}
                value={settings.defaultGraceDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultGraceDays: Number(e.target.value) || 15,
                  })
                }
              />
            </Field>
            <Field
              id="pre-expiry"
              label="Pre-expiry reminder"
              hint="Days before expiry to send the reminder."
            >
              <Input
                id="pre-expiry"
                type="number"
                min={1}
                className={dashboardInputClass()}
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
          <Field id="renewal-url" label="Renewal URL">
            <Input
              id="renewal-url"
              className={dashboardInputClass()}
              value={settings.renewalBaseUrl}
              onChange={(e) =>
                setSettings({ ...settings, renewalBaseUrl: e.target.value })
              }
              spellCheck={false}
              autoComplete="off"
            />
          </Field>
          <Field
            id="cadence"
            label="Expiry campaign cadence"
            hint="Comma-separated grace days for SMS/email (e.g. 0,2,5,8,11,13,14,15)."
          >
            <Input
              id="cadence"
              className={dashboardInputClass()}
              value={settings.notificationCadenceDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notificationCadenceDays: e.target.value,
                })
              }
              spellCheck={false}
              autoComplete="off"
            />
          </Field>
        </div>
      );
    }

    if (activeSection === "plans") {
      if (!plans.length) {
        return (
          <p className={cn(dashboardHintClass(), "flex items-center gap-2")}>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading plans…
          </p>
        );
      }
      return (
        <div className="space-y-3">
          <p className={dashboardHintClass()}>
            Monthly and annual pricing. Annual defaults to pay 10, get 12 when
            left blank.
          </p>
          {plans.map((plan) => {
            const annualHint =
              plan.monthlyPriceKes > 0 && !plan.annualPriceKes
                ? formatBillingMoney(plan.monthlyPriceKes * 10)
                : null;
            const saving = savingTier === plan.tierCode;
            return (
              <div
                key={plan.tierCode}
                className={cn("space-y-2.5 border bg-white p-3", HAIRLINE)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {plan.tierCode}
                    </p>
                    <p className="truncate text-[13px] font-semibold tracking-[-0.015em]">
                      {plan.displayName || "Untitled plan"}
                    </p>
                  </div>
                  <label className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={plan.active}
                      className="size-3.5 accent-[var(--pos-primary,#0f766e)]"
                      onChange={(e) =>
                        setPlans((rows) =>
                          rows.map((r) =>
                            r.tierCode === plan.tierCode
                              ? { ...r, active: e.target.checked }
                              : r,
                          ),
                        )
                      }
                    />
                    Active
                  </label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    className={dashboardInputClass()}
                    value={plan.displayName}
                    placeholder="Display name"
                    onChange={(e) =>
                      setPlans((rows) =>
                        rows.map((r) =>
                          r.tierCode === plan.tierCode
                            ? { ...r, displayName: e.target.value }
                            : r,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    className={dashboardInputClass()}
                    placeholder="Monthly KES"
                    value={plan.monthlyPriceKes}
                    onChange={(e) =>
                      setPlans((rows) =>
                        rows.map((r) =>
                          r.tierCode === plan.tierCode
                            ? {
                                ...r,
                                monthlyPriceKes: Number(e.target.value) || 0,
                              }
                            : r,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    className={dashboardInputClass()}
                    placeholder={
                      annualHint ? `Auto: ${annualHint}` : "Annual KES"
                    }
                    value={plan.annualPriceKes ?? ""}
                    onChange={(e) =>
                      setPlans((rows) =>
                        rows.map((r) =>
                          r.tierCode === plan.tierCode
                            ? {
                                ...r,
                                annualPriceKes:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value) || 0,
                              }
                            : r,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min={1}
                    className={dashboardInputClass()}
                    placeholder="Grace days"
                    value={plan.graceDays}
                    onChange={(e) =>
                      setPlans((rows) =>
                        rows.map((r) =>
                          r.tierCode === plan.tierCode
                            ? {
                                ...r,
                                graceDays: Number(e.target.value) || 15,
                              }
                            : r,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-none"
                  disabled={saving}
                  onClick={() => void savePlan(plan)}
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Save className="size-3.5" aria-hidden />
                  )}
                  Save plan
                </Button>
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  })();

  const drawerFooter =
    activeSection === "settings" ? (
      <Button
        type="button"
        className={PRIMARY_BTN}
        disabled={savingSettings || !settings || Boolean(loadError)}
        onClick={() => void saveSettings()}
      >
        {savingSettings ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Save className="size-3.5" aria-hidden />
        )}
        {savingSettings ? "Saving…" : "Save settings"}
      </Button>
    ) : undefined;

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={CreditCard}
        eyebrow="Platform"
        title="Subscription billing"
        description="Platform plans, grace, and dunning. Per-shop plan overrides live on each tenant."
      >
        <button
          type="button"
          disabled={booting || savingSettings || Boolean(savingTier)}
          onClick={() => void load()}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border bg-white text-[#666666]",
            HAIRLINE,
            "transition-colors hover:border-[#0f766e] hover:text-[#0f766e]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label="Refresh subscription billing"
        >
          <RefreshCw
            className={cn("size-3.5", booting && "animate-spin")}
            aria-hidden
          />
        </button>
        <Button
          type="button"
          size="sm"
          className={PRIMARY_BTN}
          disabled={savingSettings || !settings || Boolean(loadError)}
          onClick={() => void saveSettings()}
        >
          {savingSettings ? "Saving…" : "Save settings"}
        </Button>
      </DashboardPageHero>

      {loadError ? <DashboardFeedback kind="error" text={loadError} /> : null}

      <SubscriptionTheatre
        activeSectionId={activeSection}
        onActiveSectionChange={setActiveSection}
        billingEnabled={settings?.billingEnabled ?? dunning?.billingEnabled ?? false}
        inGrace={dunning?.tenantsInGrace ?? 0}
        suspended={dunning?.tenantsSuspended ?? 0}
        renewals={dunning?.renewalsLast30d ?? 0}
        planCount={plans.length}
        loading={booting || !settings}
        sectionSummary={sectionSummary}
        drawerBody={drawerBody}
        drawerFooter={drawerFooter}
      />
    </div>
  );
}
