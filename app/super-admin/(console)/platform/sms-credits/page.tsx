"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2, MessageSquare, Plus, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

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

import {
  SMS_CREDITS_NAV,
  SmsCreditsTheatre,
  type SmsCreditsSectionId,
} from "./_components/sms-credits-theatre";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PRIMARY_BTN =
  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white shadow-none hover:bg-[#0d6b63]";

function sectionFromHash(hash: string): SmsCreditsSectionId | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (SMS_CREDITS_NAV.some((item) => item.id === id)) {
    return id as SmsCreditsSectionId;
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
  critical,
}: {
  label: string;
  value: string;
  critical?: boolean;
}) {
  return (
    <div className={cn("border bg-white px-3 py-2.5", HAIRLINE)}>
      <p className={dashboardHintClass()}>{label}</p>
      <p
        className={cn(
          "mt-1 text-[1.25rem] font-semibold tabular-nums tracking-[-0.03em]",
          critical ? "text-[#9a2e16]" : "text-foreground",
        )}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value}
      </p>
    </div>
  );
}

export default function SuperAdminSmsCreditsPage() {
  const [settings, setSettings] =
    useState<PlatformSmsCreditSettingsRecord | null>(null);
  const [tiers, setTiers] = useState<SmsTierAllowanceRecord[]>([]);
  const [usage, setUsage] = useState<SaSmsCreditUsageRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, SmsTierAllowanceRecord>
  >({});
  const [newTier, setNewTier] = useState({
    tierCode: "",
    includedSmsPerMonth: 30,
  });
  const [activeSection, setActiveSection] =
    useState<SmsCreditsSectionId | null>(null);

  const load = useCallback(async () => {
    setBooting(true);
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
      setLoadError(
        e instanceof Error ? e.message : "Failed to load SMS credit settings.",
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
      const updated = await updatePlatformSmsCreditSettings({
        enabled: settings.enabled,
        unitPriceKes: settings.unitPriceKes,
        minPurchaseCredits: settings.minPurchaseCredits,
        maxPurchaseCredits: settings.maxPurchaseCredits,
        lowBalanceThreshold: settings.lowBalanceThreshold,
        cycleTimezone: settings.cycleTimezone,
        aiLogoFreeAllowance: settings.aiLogoFreeAllowance,
        aiLogoCreditCost: settings.aiLogoCreditCost,
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
      setDrafts(
        Object.fromEntries(updated.map((row) => [row.tierCode, { ...row }])),
      );
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
      setDrafts(
        Object.fromEntries(updated.map((row) => [row.tierCode, { ...row }])),
      );
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

  const sectionSummary = (sectionId: SmsCreditsSectionId): ReactNode => {
    switch (sectionId) {
      case "settings":
        return (
          <>
            Metering{" "}
            <span className="font-semibold">
              {settings?.enabled ? "on" : "off"}
            </span>
            {" · "}
            KES{" "}
            <span className="font-semibold tabular-nums">
              {settings?.unitPriceKes ?? "—"}
            </span>
            /credit
          </>
        );
      case "usage":
        return (
          <>
            <span className="font-semibold tabular-nums">
              {usage?.totalSentThisCycle ?? 0}
            </span>{" "}
            sent
            {" · "}
            <span className="font-semibold tabular-nums">
              {usage?.depletedCount ?? 0}
            </span>{" "}
            depleted
          </>
        );
      case "tiers":
        return (
          <>
            <span className="font-semibold tabular-nums">{tiers.length}</span>{" "}
            tier{tiers.length === 1 ? "" : "s"}
            {" · "}
            <span className="font-semibold tabular-nums">
              {tiers.filter((t) => t.active).length}
            </span>{" "}
            active
          </>
        );
      default:
        return null;
    }
  };

  const drawerBody = (() => {
    if (!activeSection) return null;

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
            id="sms-credits-enabled"
            label="Metering enabled"
            description="When off, SMS sends are unlimited (no credit deduction)."
            checked={settings.enabled}
            onChange={(v) =>
              setSettings((s) => (s ? { ...s, enabled: v } : s))
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="unit-price" label="Unit price (KES per credit)">
              <Input
                id="unit-price"
                type="number"
                min={0.5}
                step="0.05"
                className={dashboardInputClass()}
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
                className={dashboardInputClass()}
                value={settings.lowBalanceThreshold}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? { ...s, lowBalanceThreshold: num(e.target.value, 5) }
                      : s,
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
                className={dashboardInputClass()}
                value={settings.minPurchaseCredits}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? { ...s, minPurchaseCredits: num(e.target.value, 10) }
                      : s,
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
                className={dashboardInputClass()}
                value={settings.maxPurchaseCredits}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? { ...s, maxPurchaseCredits: num(e.target.value, 500) }
                      : s,
                  )
                }
              />
            </Field>
            <Field id="ai-logo-free" label="Free AI logos per shop">
              <Input
                id="ai-logo-free"
                type="number"
                min={0}
                step={1}
                className={dashboardInputClass()}
                value={settings.aiLogoFreeAllowance ?? 1}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          aiLogoFreeAllowance: num(e.target.value, 1),
                        }
                      : s,
                  )
                }
              />
            </Field>
            <Field id="ai-logo-cost" label="Credits per AI logo kit">
              <Input
                id="ai-logo-cost"
                type="number"
                min={1}
                step={1}
                className={dashboardInputClass()}
                value={settings.aiLogoCreditCost ?? 50}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          aiLogoCreditCost: num(e.target.value, 50),
                        }
                      : s,
                  )
                }
              />
            </Field>
          </div>
          <p className={dashboardHintClass()}>
            After the free AI logos, each brand kit spends purchased credits
            (not the monthly SMS allowance).
          </p>
        </div>
      );
    }

    if (activeSection === "usage") {
      if (!usage) {
        return (
          <p className={dashboardHintClass()}>
            No usage data for this cycle yet.
          </p>
        );
      }
      return (
        <div className="space-y-4">
          <p className={dashboardHintClass()}>
            Cycle started{" "}
            {new Date(usage.cycleStartedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            — metered SMS sends across the platform.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Total sent" value={String(usage.totalSentThisCycle)} />
            <Metric
              label="Included"
              value={String(usage.includedSentThisCycle)}
            />
            <Metric
              label="Purchased"
              value={String(usage.purchasedSentThisCycle)}
            />
            <Metric
              label="Depleted tenants"
              value={String(usage.depletedCount)}
              critical={usage.depletedCount > 0}
            />
          </div>

          {usage.topTenants.length > 0 ? (
            <div className={cn("overflow-x-auto border", HAIRLINE)}>
              <table className="w-full text-left text-[12px]">
                <thead className="bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Tenant</th>
                    <th className="px-3 py-2 font-medium">Tier</th>
                    <th className="px-3 py-2 text-right font-medium">Sent</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Available
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usage.topTenants.map((row) => (
                    <tr
                      key={row.businessId}
                      className="border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]"
                    >
                      <td className="max-w-40 truncate px-3 py-1.5 font-medium">
                        {row.name}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {row.tier}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {row.sentThisCycle}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-1.5 text-right tabular-nums",
                          row.available <= 0
                            ? "text-[#9a2e16]"
                            : "text-foreground",
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
            <p className={dashboardHintClass()}>
              No metered SMS sends this cycle yet.
            </p>
          )}

          <p className={dashboardHintClass()}>
            Per-business grants, overrides, and ledger live on each business
            page under Super Admin → Businesses.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className={dashboardHintClass()}>
          Included SMS per subscription tier each calendar month. Edits apply to
          the current cycle.
        </p>
        <div className="space-y-2">
          {tiers.map((tier) => {
            const draft = drafts[tier.tierCode] ?? tier;
            const dirty =
              draft.includedSmsPerMonth !== tier.includedSmsPerMonth ||
              draft.active !== tier.active;
            return (
              <div
                key={tier.tierCode}
                className={cn(
                  "flex flex-wrap items-center gap-2 border bg-white px-3 py-2",
                  HAIRLINE,
                )}
              >
                <span className="w-24 shrink-0 truncate font-mono text-[12px] font-semibold">
                  {tier.tierCode}
                </span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  className={cn(dashboardInputClass(), "h-8 w-24")}
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
                <span className={dashboardHintClass()}>SMS / month</span>
                <label className="ml-auto flex items-center gap-1.5 text-[11px]">
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
                    className="size-3.5 accent-[var(--pos-primary,#0f766e)]"
                  />
                  Active
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-8 rounded-none",
                    dirty &&
                      "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]",
                  )}
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

        <div className={cn("space-y-3 border p-3", HAIRLINE)}>
          <p className="text-[13px] font-semibold tracking-[-0.015em]">
            Add tier
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field id="new-tier-code" label="Tier code">
              <Input
                id="new-tier-code"
                className={cn(dashboardInputClass(), "w-36 font-mono")}
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
                className={cn(dashboardInputClass(), "w-28")}
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
              className={PRIMARY_BTN}
              disabled={busy}
              onClick={() => void addTier()}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-3.5" aria-hidden />
              )}
              Add tier
            </Button>
          </div>
        </div>
      </div>
    );
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
    ) : activeSection === "tiers" ? (
      <Button
        type="button"
        className={PRIMARY_BTN}
        disabled={busy}
        onClick={() => void addTier()}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Plus className="size-3.5" aria-hidden />
        )}
        Add tier
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
        icon={MessageSquare}
        eyebrow="Platform"
        title="SMS credits"
        description="Monthly included SMS per subscription tier, top-up pricing, and the platform kill switch."
      >
        <button
          type="button"
          disabled={booting || savingSettings || busy}
          onClick={() => void load()}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border bg-white text-[#666666]",
            HAIRLINE,
            "transition-colors hover:border-[#0f766e] hover:text-[#0f766e]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label="Refresh SMS credit settings"
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

      <SmsCreditsTheatre
        activeSectionId={activeSection}
        onActiveSectionChange={setActiveSection}
        enabled={settings?.enabled ?? false}
        unitPriceKes={settings?.unitPriceKes ?? 0}
        tierCount={tiers.length}
        totalSent={usage?.totalSentThisCycle ?? 0}
        depletedCount={usage?.depletedCount ?? 0}
        loading={booting || !settings}
        sectionSummary={sectionSummary}
        drawerBody={drawerBody}
        drawerFooter={drawerFooter}
      />
    </div>
  );
}
