"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  fetchSupplierPayoutSettings,
  updateSupplierPayoutSettings,
  type SupplierPayoutSettingsRecord,
} from "@/lib/api";

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

export function SupplierPayoutSettingsSection({
  canWrite,
}: SupplierPayoutSettingsSectionProps) {
  const [settings, setSettings] = useState<SupplierPayoutSettingsRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const activeSelectable = (settings?.selectableGateways ?? []).filter(
    (g) => g.status === "ACTIVE",
  );

  const onSave = async () => {
    if (!canWrite) {
      return;
    }
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Truck className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Supplier payouts
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pay vendors from Supplies via Send Money (e.g. KopoKopo M-Pesa). Disabled by default —
            turn on here and choose which connected gateway to use. Each supplier still needs an M-Pesa
            payout phone on their profile.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-border/80 p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-border/80 bg-background p-4 shadow-sm">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={enabled}
              disabled={!canWrite || saving}
              onChange={(e) => {
                const on = e.target.checked;
                setEnabled(on);
                if (!on) {
                  setAutoPayEnabled(false);
                }
              }}
            />
            <span className="text-sm font-medium text-foreground">
              Enable paying suppliers via payment gateway
            </span>
          </label>

          {enabled ? (
            <div className="space-y-3">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Payout gateway
                <select
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
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
              </label>
              {activeSelectable.length === 0 ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  No eligible gateway is active. Set up and activate a gateway above (KopoKopo must be
                  enabled for supplier payouts by your platform admin).
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

              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 rounded border-input"
                    checked={autoPayEnabled}
                    disabled={!canWrite || saving || !configId}
                    onChange={(e) => setAutoPayEnabled(e.target.checked)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      Auto-pay unpaid supply bills
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      When on, PalMart sends M-Pesa via KopoKopo for unpaid supplies whose suppliers
                      have an M-Pesa payout phone. Times use East Africa Time (Africa/Nairobi). Keep
                      enough till balance.
                    </span>
                  </span>
                </label>

                {autoPayEnabled ? (
                  <div className="space-y-2 border-t border-border/50 pt-2.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Payment times (EAT)
                    </p>
                    <ul className="space-y-2">
                      {autoPayTimes.map((time, idx) => (
                        <li key={`t-${idx}`} className="flex items-center gap-2">
                          <input
                            type="time"
                            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
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
                              className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                              disabled={saving}
                              onClick={() =>
                                setAutoPayTimes(autoPayTimes.filter((_, i) => i !== idx))
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
                        onClick={() => setAutoPayTimes([...autoPayTimes, "12:00"])}
                      >
                        <Plus className="size-3.5" aria-hidden />
                        Add time
                      </Button>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground">
                      Default is 12:00 AM and 6:00 PM. You can set up to 8 times per day.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {canWrite ? (
            <Button size="sm" disabled={saving || loading} onClick={() => void onSave()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save supplier payouts"
              )}
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
