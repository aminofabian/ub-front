"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Info, Loader2, Plug, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  fetchEasyTaxSettings,
  testEasyTaxConnection,
  updateEasyTaxSettings,
  type EasyTaxEnvironment,
  type EasyTaxSettingsRecord,
  type EasyTaxTestResult,
} from "@/lib/api";
import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

type EasyTaxSettingsSectionProps = {
  canWrite: boolean;
};

const HAIRLINE =
  "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

const FIELD_INPUT =
  "h-10 w-full border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

/**
 * Optional opt-in EasyTax (KRA eTIMS) tax integration. Off by default; nothing
 * is sent to KRA until it is switched on and every field is filled in.
 */
export function EasyTaxSettingsSection({
  canWrite,
}: EasyTaxSettingsSectionProps) {
  const [settings, setSettings] = useState<EasyTaxSettingsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<EasyTaxTestResult | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [environment, setEnvironment] = useState<EasyTaxEnvironment>("SANDBOX");
  const [baseUrl, setBaseUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tin, setTin] = useState("");
  const [branchId, setBranchId] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");

  const apply = useCallback((next: EasyTaxSettingsRecord) => {
    setSettings(next);
    setEnabled(next.enabled);
    setEnvironment(next.environment);
    setBaseUrl(next.baseUrl ?? "");
    setUsername(next.username ?? "");
    setTin(next.tin ?? "");
    setBranchId(next.branchId ?? "");
    setDeviceSerial(next.deviceSerial ?? "");
    // The password is write-only — never echo the stored value back.
    setPassword("");
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      apply(await fetchEasyTaxSettings());
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not load EasyTax settings.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const configured = Boolean(settings?.configured);
  const hasStoredPassword = Boolean(settings?.hasPassword);

  const dirty = useMemo(() => {
    if (!settings) return false;
    return (
      enabled !== settings.enabled ||
      environment !== settings.environment ||
      baseUrl.trim() !== (settings.baseUrl ?? "") ||
      username.trim() !== (settings.username ?? "") ||
      tin.trim() !== (settings.tin ?? "") ||
      branchId.trim() !== (settings.branchId ?? "") ||
      deviceSerial.trim() !== (settings.deviceSerial ?? "") ||
      password.trim().length > 0
    );
  }, [
    settings,
    enabled,
    environment,
    baseUrl,
    username,
    tin,
    branchId,
    deviceSerial,
    password,
  ]);

  const canTest =
    baseUrl.trim().length > 0 &&
    (password.trim().length > 0 || hasStoredPassword);

  const onSave = async () => {
    if (!canWrite) return;
    setSaving(true);
    try {
      const trimmedPassword = password.trim();
      const next = await updateEasyTaxSettings({
        enabled,
        environment,
        baseUrl: baseUrl.trim(),
        username: username.trim(),
        tin: tin.trim(),
        branchId: branchId.trim(),
        deviceSerial: deviceSerial.trim(),
        ...(trimmedPassword ? { password: trimmedPassword } : {}),
      });
      apply(next);
      toast.success(
        next.enabled
          ? "EasyTax enabled. Sales will be reported to KRA."
          : "EasyTax settings saved. The integration stays off.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    if (!canWrite) return;
    setTesting(true);
    try {
      const result = await testEasyTaxConnection();
      setTestResult(result);
      if (result.ok) {
        toast.success(result.message || "EasyTax connection OK.");
      } else {
        toast.error(result.message || "EasyTax connection failed.");
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not test the connection.",
      );
    } finally {
      setTesting(false);
    }
  };

  const lastTestOk =
    testResult?.ok ?? (settings?.lastTestOk == null ? null : settings.lastTestOk);
  const lastTestMessage = testResult?.message ?? settings?.lastTestMessage ?? null;
  const lastTestedAt = testResult?.checkedAt ?? settings?.lastTestedAt ?? null;

  const busy = saving || testing;

  return (
    <section className={cn(HUB_SURFACE, "space-y-4 p-4")}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-[#141414]">
            EasyTax / KRA eTIMS
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#666666]">
            Optional. When it is on, your sales are sent to KRA through EasyTax
            for tax compliance. Nothing is sent while this is off.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold",
            configured
              ? "border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
              : "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
          )}
        >
          <Plug className="size-3.5" aria-hidden />
          {configured ? "Configured" : "Not configured"}
        </span>
      </header>

      {loading && !settings ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading EasyTax settings…
        </div>
      ) : (
        <>
          {!configured ? (
            <div className="flex items-start gap-2 border border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_8%,white)] px-3 py-2 text-xs leading-relaxed text-[#9a2e16]">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <p>
                This integration can’t run yet. Fill in every field below and
                save. It stays off until you switch it on.
              </p>
            </div>
          ) : null}

          <div
            className={cn(
              HAIRLINE,
              "flex items-start justify-between gap-4 bg-muted/15 px-3.5 py-3",
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Enable EasyTax / KRA eTIMS
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Off by default. Turn it on only after the connection test
                succeeds.
              </p>
            </div>
            <Switch
              checked={enabled}
              disabled={!canWrite || busy}
              onCheckedChange={setEnabled}
              aria-label="Enable EasyTax"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                Environment
              </span>
              <select
                className={FIELD_INPUT}
                value={environment}
                disabled={!canWrite || busy}
                onChange={(e) =>
                  setEnvironment(
                    e.target.value === "PRODUCTION" ? "PRODUCTION" : "SANDBOX",
                  )
                }
              >
                <option value="SANDBOX">Sandbox (testing)</option>
                <option value="PRODUCTION">Production (live)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                Base URL
              </span>
              <input
                className={FIELD_INPUT}
                value={baseUrl}
                disabled={!canWrite || busy}
                placeholder="https://…"
                autoComplete="off"
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                Username
              </span>
              <input
                className={FIELD_INPUT}
                value={username}
                disabled={!canWrite || busy}
                autoComplete="off"
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                Password
              </span>
              <input
                type="password"
                className={FIELD_INPUT}
                value={password}
                disabled={!canWrite || busy}
                placeholder={
                  hasStoredPassword
                    ? "Stored — leave blank to keep"
                    : "Enter password"
                }
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
              />
              {hasStoredPassword ? (
                <span className="text-[11px] leading-snug text-muted-foreground">
                  A password is already saved. Leave blank to keep it.
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                TIN
              </span>
              <input
                className={FIELD_INPUT}
                value={tin}
                disabled={!canWrite || busy}
                autoComplete="off"
                onChange={(e) => setTin(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                Branch ID
              </span>
              <input
                className={FIELD_INPUT}
                value={branchId}
                disabled={!canWrite || busy}
                autoComplete="off"
                onChange={(e) => setBranchId(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                Device Serial
              </span>
              <input
                className={FIELD_INPUT}
                value={deviceSerial}
                disabled={!canWrite || busy}
                autoComplete="off"
                onChange={(e) => setDeviceSerial(e.target.value)}
              />
            </label>
          </div>

          <div className="space-y-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-3">
            <p className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold tracking-[-0.02em] text-muted-foreground">
                Last test
              </span>
              {lastTestOk == null ? (
                <span className="text-muted-foreground">Never tested</span>
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 font-semibold",
                    lastTestOk
                      ? "text-[var(--pos-primary,#0f766e)]"
                      : "text-[#9a2e16]",
                  )}
                >
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  {lastTestOk ? "Passed" : "Failed"}
                </span>
              )}
              {lastTestedAt ? (
                <span className="text-muted-foreground">
                  · {formatWhen(lastTestedAt)}
                </span>
              ) : null}
            </p>
            {lastTestMessage ? (
              <p
                className={cn(
                  "text-xs leading-relaxed",
                  lastTestOk === false ? "text-[#9a2e16]" : "text-muted-foreground",
                )}
              >
                {lastTestMessage}
              </p>
            ) : null}
          </div>

          {canWrite ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-3">
              <Button
                type="button"
                variant="outline"
                disabled={busy || !canTest}
                onClick={() => void onTest()}
                title={
                  canTest
                    ? undefined
                    : "Add a Base URL and password before testing."
                }
              >
                {testing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="mr-2 size-4" aria-hidden />
                )}
                Test connection
              </Button>
              <Button
                type="button"
                disabled={busy || !dirty}
                onClick={() => void onSave()}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Save settings"
                )}
              </Button>
            </div>
          ) : (
            <p className="border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-3 text-xs text-muted-foreground">
              You can view these settings but not change them.
            </p>
          )}
        </>
      )}
    </section>
  );
}
