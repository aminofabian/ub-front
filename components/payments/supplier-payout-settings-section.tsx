"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Truck } from "lucide-react";
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

export function SupplierPayoutSettingsSection({
  canWrite,
}: SupplierPayoutSettingsSectionProps) {
  const [settings, setSettings] = useState<SupplierPayoutSettingsRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [configId, setConfigId] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchSupplierPayoutSettings();
      setSettings(s);
      setEnabled(s.enabled);
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
        selectableGateways: [],
      });
      toast.error(msg, {
        description:
          msg.includes("migration") || msg.includes("Database")
            ? "Redeploy the API so database migrations V92/V93 can run."
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
    setSaving(true);
    try {
      const next = await updateSupplierPayoutSettings({
        enabled,
        paymentGatewayConfigId: enabled ? configId || null : null,
      });
      setSettings(next);
      setEnabled(next.enabled);
      setConfigId(next.paymentGatewayConfigId ?? "");
      toast.success(
        next.enabled
          ? "Supplier payouts enabled."
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
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span className="text-sm font-medium text-foreground">
              Enable paying suppliers via payment gateway
            </span>
          </label>

          {enabled ? (
            <div className="space-y-2">
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
              ) : settings?.gatewayReady ? (
                <p className="text-xs text-emerald-800 dark:text-emerald-200">
                  Ready: {settings.gatewayLabel} ({settings.gatewayType})
                </p>
              ) : (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Select an active gateway and save.
                </p>
              )}
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
