"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  Settings2,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  fetchSupplierPayoutSettings,
  updateSupplierPayoutSettings,
  type SupplierPayoutSettingsRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type SupplierPayoutSettingsSectionProps = {
  canWrite: boolean;
};

const DEFAULT_AUTO_PAY_TIMES = ["00:00", "18:00"];

function normalizeTimes(times: string[] | null | undefined): string[] {
  const cleaned = (times ?? [])
    .map((t) => t.trim())
    .filter((t) => /^\d{1,2}:\d{2}$/.test(t));
  return cleaned.length > 0 ? cleaned : [...DEFAULT_AUTO_PAY_TIMES];
}

function formatTimeLabel(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function SupplierPayoutSettingsSection({
  canWrite,
}: SupplierPayoutSettingsSectionProps) {
  const [settings, setSettings] = useState<SupplierPayoutSettingsRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [autoPayTimes, setAutoPayTimes] = useState<string[]>([
    ...DEFAULT_AUTO_PAY_TIMES,
  ]);
  const [configId, setConfigId] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchSupplierPayoutSettings();
      setSettings(s);
      setEnabled(s.enabled);
      setAutoPayEnabled(Boolean(s.autoPayEnabled));
      setAutoPayTimes(normalizeTimes(s.autoPayTimes));
      setConfigId(s.paymentGatewayConfigId ?? "");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not load supplier payout settings.";
      setSettings({
        enabled: false,
        paymentGatewayConfigId: null,
        gatewayType: null,
        gatewayLabel: null,
        gatewayReady: false,
        autoPayEnabled: false,
        autoPayTimes: [...DEFAULT_AUTO_PAY_TIMES],
        selectableGateways: [],
      });
      toast.error(msg, {
        description:
          msg.includes("migration") || msg.includes("Database")
            ? "Redeploy the API so database migrations can run (including auto-pay)."
            : undefined,
        duration: 12_000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#supplier-payouts") {
      setDrawerOpen(true);
    }
  }, []);

  const activeSelectable = (settings?.selectableGateways ?? []).filter(
    (g) => g.status === "ACTIVE",
  );

  const dirty = useMemo(() => {
    if (!settings) return false;
    const savedTimes = normalizeTimes(settings.autoPayTimes).join(",");
    const draftTimes = normalizeTimes(autoPayTimes).join(",");
    return (
      enabled !== settings.enabled ||
      Boolean(autoPayEnabled) !== Boolean(settings.autoPayEnabled) ||
      (configId || "") !== (settings.paymentGatewayConfigId ?? "") ||
      savedTimes !== draftTimes
    );
  }, [settings, enabled, autoPayEnabled, configId, autoPayTimes]);

  const openConfigure = () => {
    if (settings) {
      setEnabled(settings.enabled);
      setAutoPayEnabled(Boolean(settings.autoPayEnabled));
      setAutoPayTimes(normalizeTimes(settings.autoPayTimes));
      setConfigId(settings.paymentGatewayConfigId ?? "");
    }
    setDrawerOpen(true);
  };

  const onSave = async () => {
    if (!canWrite) return;
    const times = normalizeTimes(autoPayTimes);
    if (enabled && autoPayEnabled && times.length === 0) {
      toast.error("Add at least one auto-pay time.");
      return;
    }
    setSaving(true);
    try {
      const next = await updateSupplierPayoutSettings({
        enabled,
        paymentGatewayConfigId: enabled ? configId || null : null,
        autoPayEnabled: enabled ? autoPayEnabled : false,
        autoPayTimes: enabled ? times : undefined,
      });
      setSettings(next);
      setEnabled(next.enabled);
      setAutoPayEnabled(Boolean(next.autoPayEnabled));
      setAutoPayTimes(normalizeTimes(next.autoPayTimes));
      setConfigId(next.paymentGatewayConfigId ?? "");
      toast.success(
        next.enabled
          ? next.autoPayEnabled
            ? `Supplier payouts + auto-pay saved (${normalizeTimes(next.autoPayTimes).join(", ")} EAT).`
            : "Supplier payouts enabled."
          : "Supplier payouts disabled.",
      );
      setDrawerOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const statusTone = !settings?.enabled
    ? "off"
    : settings.gatewayReady
      ? settings.autoPayEnabled
        ? "auto"
        : "ready"
      : "warn";

  return (
    <section id="supplier-payouts" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Pay suppliers
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Send Money to vendor M-Pesa from Supplies. Turn this on after an active
            KopoKopo gateway is ready, then set phones on each supplier.
          </p>
        </div>
        {canWrite && !loading ? (
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            onClick={openConfigure}
          >
            <Settings2 className="size-3.5" aria-hidden />
            Configure
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 border border-border/70 bg-card px-4 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading supplier payout settings…
        </div>
      ) : (
        <button
          type="button"
          onClick={canWrite ? openConfigure : undefined}
          disabled={!canWrite}
          className={cn(
            "group w-full border border-border/80 bg-card text-left transition-colors",
            canWrite && "hover:border-teal-700/30 hover:bg-teal-50/40 dark:hover:bg-teal-950/20",
            !canWrite && "cursor-default",
          )}
        >
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-0">
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:pr-5">
              <span
                className={cn(
                  "mt-0.5 flex size-10 shrink-0 items-center justify-center",
                  statusTone === "off" && "bg-muted text-muted-foreground",
                  statusTone === "warn" &&
                    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
                  statusTone === "ready" &&
                    "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-100",
                  statusTone === "auto" &&
                    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
                )}
              >
                <Truck className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {settings?.enabled
                    ? settings.gatewayReady
                      ? "Supplier payouts on"
                      : "Payouts on — gateway needed"
                    : "Supplier payouts off"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {settings?.enabled
                    ? settings.gatewayReady
                      ? `${settings.gatewayLabel ?? "Gateway"} · ${settings.gatewayType ?? "—"}`
                      : "Pick an active KopoKopo gateway in Configure."
                    : "Disabled by default. Enable when you are ready to Send Money."}
                </p>
              </div>
            </div>

            <div className="grid flex-1 gap-3 border-t border-border/60 pt-4 sm:grid-cols-2 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Auto-pay
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {settings?.autoPayEnabled ? (
                    <>
                      <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
                      Scheduled
                    </>
                  ) : (
                    "Manual only"
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Times (EAT)
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                  <Clock3 className="size-3.5 text-muted-foreground" aria-hidden />
                  {normalizeTimes(settings?.autoPayTimes)
                    .map(formatTimeLabel)
                    .join(" · ")}
                </p>
              </div>
            </div>
          </div>
          {canWrite ? (
            <div className="border-t border-border/60 bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground transition-colors group-hover:text-foreground">
              Open configure drawer to change gateway, auto-pay, and schedule →
            </div>
          ) : null}
        </button>
      )}

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open && dirty && saving) return;
          setDrawerOpen(open);
        }}
        title="Supplier payouts"
        description="Choose the Send Money gateway, optional auto-pay, and custom run times (East Africa Time)."
        icon={<Truck className="size-4" aria-hidden />}
        contextLabel="Payments"
        width="wide"
        footer={
          canWrite ? (
            <div className="flex w-full items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setDrawerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving || !dirty}
                onClick={() => void onSave()}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Save payout settings"
                )}
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4 border border-border/70 bg-muted/15 px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Enable paying suppliers
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Allows Supplies → Pay to send M-Pesa when the supplier has a payout
                phone.
              </p>
            </div>
            <Switch
              checked={enabled}
              disabled={!canWrite || saving}
              onCheckedChange={(on) => {
                setEnabled(on);
                if (!on) setAutoPayEnabled(false);
              }}
              aria-label="Enable paying suppliers"
            />
          </div>

          {enabled ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Payout gateway
                </span>
                <select
                  className="h-10 border border-input bg-background px-3 text-sm"
                  value={configId}
                  disabled={!canWrite || saving || activeSelectable.length === 0}
                  onChange={(e) => setConfigId(e.target.value)}
                >
                  <option value="">Select an active gateway…</option>
                  {activeSelectable.map((g) => (
                    <option key={g.configId} value={g.configId}>
                      {g.label} ({g.gatewayType})
                    </option>
                  ))}
                </select>
                {activeSelectable.length === 0 ? (
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    No eligible gateway is active. Activate KopoKopo under Accept
                    payments first.
                  </p>
                ) : settings?.gatewayReady && configId ? (
                  <p className="text-xs text-emerald-800 dark:text-emerald-200">
                    Ready: {settings.gatewayLabel} ({settings.gatewayType})
                  </p>
                ) : (
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Select an active gateway and save.
                  </p>
                )}
              </label>

              <div className="space-y-4 border border-border/70 bg-card p-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Auto-pay unpaid supply bills
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      At each scheduled time, send M-Pesa for unpaid supplies whose
                      suppliers have an M-Pesa payout phone. Keep enough till balance.
                    </p>
                  </div>
                  <Switch
                    checked={autoPayEnabled}
                    disabled={!canWrite || saving || !configId}
                    onCheckedChange={setAutoPayEnabled}
                    aria-label="Enable auto-pay"
                  />
                </div>

                <div
                  id="supplier-auto-pay-times"
                  className="space-y-2.5 border-t border-border/60 pt-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Override payment times
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      Replace the default 12:00 AM and 6:00 PM. Up to 8 times per day
                      (Africa/Nairobi).
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {autoPayTimes.map((time, idx) => (
                      <li key={`t-${idx}`} className="flex items-center gap-2">
                        <input
                          type="time"
                          className="h-9 flex-1 border border-input bg-background px-3 font-mono text-sm"
                          value={time}
                          disabled={!canWrite || saving}
                          onChange={(e) => {
                            const next = [...autoPayTimes];
                            next[idx] = e.target.value || "00:00";
                            setAutoPayTimes(next);
                          }}
                        />
                        {canWrite && autoPayTimes.length > 1 ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                            disabled={saving}
                            onClick={() =>
                              setAutoPayTimes(
                                autoPayTimes.filter((_, i) => i !== idx),
                              )
                            }
                            aria-label="Remove time"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {canWrite && autoPayTimes.length < 8 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      disabled={saving}
                      onClick={() =>
                        setAutoPayTimes([...autoPayTimes, "12:00"])
                      }
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Add time
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </FormDrawer>
    </section>
  );
}
