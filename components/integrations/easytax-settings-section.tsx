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
 *
 * The endpoint comes from the platform, not the shop. Tenants only supply
 * their own login and TIN here; each branch has its own device details.
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tin, setTin] = useState("");

  const apply = useCallback((next: EasyTaxSettingsRecord) => {
    setSettings(next);
    setEnabled(next.enabled);
    setEnvironment(next.environment);
    setUsername(next.username ?? "");
    setTin(next.tin ?? "");
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
  const platformEnabled = Boolean(settings?.platformEnabled);
  const resolvedBaseUrl = settings?.resolvedBaseUrl?.trim() || null;
  const hasStoredPassword = Boolean(settings?.hasPassword);

  const dirty = useMemo(() => {
    if (!settings) return false;
    return (
      enabled !== settings.enabled ||
      environment !== settings.environment ||
      username.trim() !== (settings.username ?? "") ||
      tin.trim() !== (settings.tin ?? "") ||
      password.trim().length > 0
    );
  }, [settings, enabled, environment, username, tin, password]);

  const canTest =
    platformEnabled &&
    Boolean(resolvedBaseUrl) &&
    (password.trim().length > 0 || hasStoredPassword);

  const onSave = async () => {
    if (!canWrite) return;
    setSaving(true);
    try {
      const trimmedPassword = password.trim();
      const next = await updateEasyTaxSettings({
        enabled,
        environment,
        username: username.trim(),
        tin: tin.trim(),
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

  const testDisabledReason = !platformEnabled
    ? "Your platform administrator must enable EasyTax first."
    : !resolvedBaseUrl
      ? "Your platform administrator has not set an EasyTax endpoint yet."
      : "Add a password before testing.";

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
          {configured ? "Shop details saved" : "Shop details missing"}
        </span>
      </header>

      {loading && !settings ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading EasyTax settings…
        </div>
      ) : (
        <>
          {!platformEnabled ? (
            <div className="flex items-start gap-2 border border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_8%,white)] px-3 py-2 text-xs leading-relaxed text-[#9a2e16]">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <p>
                EasyTax is not available on this platform yet. Contact your
                platform administrator to have it enabled. You can still save
                your shop details below.
              </p>
            </div>
          ) : null}

          {!configured ? (
            <div className="flex items-start gap-2 border border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_8%,white)] px-3 py-2 text-xs leading-relaxed text-[#9a2e16]">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <p>
                This shop still needs its EasyTax username, password and TIN.
                Fill them in below and save. It stays off until you switch it
                on. Each branch also needs its own KRA branch ID and device
                serial — add those in the branch section below.
              </p>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              This shop has saved its EasyTax login and TIN. Each branch still
              needs its own KRA branch ID and device serial — add those in the
              branch section below.
            </p>
          )}

          <div
            className={cn(
              HAIRLINE,
              "bg-muted/15 px-3.5 py-3",
            )}
          >
            <p className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
              Endpoint
            </p>
            {resolvedBaseUrl ? (
              <p className="mt-0.5 break-all font-mono text-xs leading-relaxed text-foreground">
                {resolvedBaseUrl}
              </p>
            ) : (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Not configured by your platform administrator.
              </p>
            )}
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Your shop does not need to enter this. The platform sets it for
              the environment you save below.
            </p>
          </div>

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
                succeeds and every branch has its device details.
              </p>
              {!platformEnabled ? (
                <p className="mt-1 text-xs leading-relaxed text-[#9a2e16]">
                  Your platform administrator must enable EasyTax before you
                  can switch it on.
                </p>
              ) : null}
            </div>
            <Switch
              checked={enabled}
              disabled={!canWrite || busy || !platformEnabled}
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
                title={canTest ? undefined : testDisabledReason}
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
