"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Info,
  Loader2,
  Plug,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardToaster } from "@/components/dashboard-sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  fetchSupplierEasyTaxSettings,
  testSupplierEasyTaxConnection,
  updateSupplierEasyTaxSettings,
  type SupplierEasyTaxEnvironment,
  type SupplierEasyTaxSettingsRecord,
  type SupplierEasyTaxTestResult,
} from "@/lib/marketplace-api";
import { cn } from "@/lib/utils";

const HAIRLINE =
  "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function Field({
  id,
  label,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        htmlFor={id}
        className="text-xs font-semibold tracking-[-0.01em] text-muted-foreground"
      >
        {label}
      </Label>
      {children}
      {hint ? (
        <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        configured
          ? "border-emerald-600/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
          : "border-border text-muted-foreground",
      )}
    >
      <Plug className="size-3.5" aria-hidden />
      {configured ? "Details complete" : "Details missing"}
    </span>
  );
}

/**
 * Supplier-side EasyTax (KRA eTIMS) opt-in. A supplier files under its own TIN
 * with its own EasyTax/VSCU, so this never touches tenant settings. The endpoint
 * remains platform-owned; the supplier only chooses the environment.
 */
export function SupplierEasyTaxSettings() {
  const [settings, setSettings] =
    useState<SupplierEasyTaxSettingsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [testResult, setTestResult] =
    useState<SupplierEasyTaxTestResult | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [environment, setEnvironment] =
    useState<SupplierEasyTaxEnvironment>("SANDBOX");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tin, setTin] = useState("");
  const [kraBranchId, setKraBranchId] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");

  const apply = useCallback((next: SupplierEasyTaxSettingsRecord) => {
    setSettings(next);
    setEnabled(next.enabled);
    setEnvironment(next.environment === "PRODUCTION" ? "PRODUCTION" : "SANDBOX");
    setUsername(next.username ?? "");
    setTin(next.tin ?? "");
    setKraBranchId(next.kraBranchId ?? "");
    setDeviceSerial(next.deviceSerial ?? "");
    // The password is write-only — never echo the stored value back.
    setPassword("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await fetchSupplierEasyTaxSettings();
        if (!cancelled) apply(next);
      } catch (e) {
        if (!cancelled) {
          const message =
            e instanceof Error
              ? e.message
              : "Could not load EasyTax settings.";
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const platformEnabled = Boolean(settings?.platformEnabled);
  const resolvedBaseUrl = settings?.resolvedBaseUrl?.trim() || null;
  const hasStoredPassword = Boolean(settings?.hasPassword);
  const configured = Boolean(settings?.configured);
  const busy = saving || testing;

  const dirty = useMemo(() => {
    if (!settings) return false;
    return (
      enabled !== settings.enabled ||
      environment !== settings.environment ||
      username.trim() !== (settings.username ?? "") ||
      tin.trim() !== (settings.tin ?? "") ||
      kraBranchId.trim() !== (settings.kraBranchId ?? "") ||
      deviceSerial.trim() !== (settings.deviceSerial ?? "") ||
      password.trim().length > 0
    );
  }, [
    settings,
    enabled,
    environment,
    username,
    tin,
    kraBranchId,
    deviceSerial,
    password,
  ]);

  // Backend rejects enabling while the platform is off. Let the supplier turn a
  // stale "enabled" value off, but not switch it on until the platform is ready.
  const blockedByPlatform = !platformEnabled && enabled;
  const canSave = Boolean(settings) && dirty && !busy && !blockedByPlatform;
  const canTest =
    Boolean(settings) &&
    platformEnabled &&
    Boolean(resolvedBaseUrl) &&
    hasStoredPassword &&
    !busy;

  const testDisabledReason = !platformEnabled
    ? "Your platform administrator must enable EasyTax first."
    : !resolvedBaseUrl
      ? "Your platform administrator has not set an EasyTax endpoint yet."
      : !hasStoredPassword
        ? "Save your EasyTax password before testing the connection."
        : busy
          ? "Please wait for the current action to finish."
          : undefined;

  const onSave = async () => {
    if (!settings || busy) return;
    setSaving(true);
    setError("");
    try {
      const trimmedPassword = password.trim();
      const next = await updateSupplierEasyTaxSettings({
        enabled,
        environment,
        username: username.trim(),
        tin: tin.trim(),
        kraBranchId: kraBranchId.trim(),
        deviceSerial: deviceSerial.trim(),
        ...(trimmedPassword ? { password: trimmedPassword } : {}),
      });
      apply(next);
      toast.success(
        next.enabled
          ? "EasyTax enabled. Your invoices will be filed with KRA."
          : "EasyTax settings saved. The integration stays off.",
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not save EasyTax settings.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    if (!settings || busy) return;
    setTesting(true);
    setError("");
    try {
      const result = await testSupplierEasyTaxConnection();
      setTestResult(result);
      const message =
        result.message?.trim() ||
        (result.ok ? "EasyTax connection OK." : "EasyTax connection failed.");
      if (result.ok) {
        toast.success(message);
      } else {
        toast.error(message);
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not test the connection.";
      setError(message);
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const lastTestOk =
    testResult?.ok ?? (settings?.lastTestOk == null ? null : settings.lastTestOk);
  const lastTestMessage =
    testResult?.message ?? settings?.lastTestMessage ?? null;
  const lastTestedAt =
    testResult?.checkedAt ?? settings?.lastTestedAt ?? null;

  if (loading && !settings) {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading EasyTax settings…
        </div>
      </section>
    );
  }

  return (
    <>
      <DashboardToaster />
      <section className="space-y-3">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              EasyTax / KRA eTIMS
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              File your own sales invoices with KRA under your own TIN. Nothing
              is sent while this is off.
            </p>
          </div>
          {settings ? <StatusBadge configured={configured} /> : null}
        </header>

        {loadError ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {loadError}
          </p>
        ) : null}

        {settings ? (
          <form
            className={cn("space-y-4 rounded-xl bg-card p-4", HAIRLINE)}
            onSubmit={(e) => {
              e.preventDefault();
              void onSave();
            }}
          >
            {!platformEnabled ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-700/30 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <p>
                  EasyTax isn&apos;t enabled for the platform yet. Contact your
                  platform administrator to have it enabled and the endpoint
                  set. You can still save your details below.
                </p>
              </div>
            ) : null}

            <div className={cn("rounded-lg bg-muted/30 px-3 py-2.5", HAIRLINE)}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Endpoint
              </p>
              {resolvedBaseUrl ? (
                <p className="mt-0.5 break-all font-mono text-xs text-foreground">
                  {resolvedBaseUrl}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Not configured by your administrator
                </p>
              )}
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Your administrator sets this for the environment you choose. You
                don&apos;t type it here.
              </p>
            </div>

            <div
              className={cn(
                "flex items-start justify-between gap-4 rounded-lg bg-muted/20 px-3 py-3",
                HAIRLINE,
              )}
            >
              <div className="min-w-0">
                <Label
                  htmlFor="supplier-easytax-enabled"
                  className="text-sm font-semibold"
                >
                  File my invoices with KRA through EasyTax
                </Label>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Off by default. Turn it on once your details are complete and
                  the connection test passes.
                </p>
                {blockedByPlatform ? (
                  <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                    EasyTax is not available on the platform right now, so it
                    cannot be saved while on. Switch it off or contact your
                    administrator.
                  </p>
                ) : null}
              </div>
              <Switch
                id="supplier-easytax-enabled"
                checked={enabled}
                disabled={busy || (!platformEnabled && !enabled)}
                onCheckedChange={setEnabled}
                aria-label="File my invoices with KRA through EasyTax"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field id="supplier-easytax-environment" label="Environment">
                <select
                  id="supplier-easytax-environment"
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  value={environment}
                  disabled={busy}
                  onChange={(e) =>
                    setEnvironment(
                      e.target.value === "PRODUCTION"
                        ? "PRODUCTION"
                        : "SANDBOX",
                    )
                  }
                >
                  <option value="SANDBOX">Sandbox (testing)</option>
                  <option value="PRODUCTION">Production (live)</option>
                </select>
              </Field>

              <Field id="supplier-easytax-tin" label="TIN (KRA PIN)">
                <Input
                  id="supplier-easytax-tin"
                  value={tin}
                  disabled={busy}
                  autoComplete="off"
                  onChange={(e) => setTin(e.target.value)}
                />
              </Field>

              <Field id="supplier-easytax-username" label="EasyTax username">
                <Input
                  id="supplier-easytax-username"
                  value={username}
                  disabled={busy}
                  autoComplete="off"
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>

              <Field
                id="supplier-easytax-password"
                label="EasyTax password"
                hint={
                  hasStoredPassword
                    ? "A password is already saved. Leave blank to keep it."
                    : undefined
                }
              >
                <Input
                  id="supplier-easytax-password"
                  type="password"
                  value={password}
                  disabled={busy}
                  placeholder={
                    hasStoredPassword
                      ? "Stored — leave blank to keep"
                      : "Enter your EasyTax password"
                  }
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              <Field id="supplier-easytax-branch-id" label="KRA branch ID">
                <Input
                  id="supplier-easytax-branch-id"
                  value={kraBranchId}
                  disabled={busy}
                  autoComplete="off"
                  onChange={(e) => setKraBranchId(e.target.value)}
                />
              </Field>

              <Field
                id="supplier-easytax-device-serial"
                label="Device serial"
                hint="The serial on the VSCU device issued when it was approved."
              >
                <Input
                  id="supplier-easytax-device-serial"
                  value={deviceSerial}
                  disabled={busy}
                  autoComplete="off"
                  onChange={(e) => setDeviceSerial(e.target.value)}
                />
              </Field>
            </div>

            {!configured ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Add your TIN, EasyTax username, password, KRA branch ID and
                device serial before switching EasyTax on.
              </p>
            ) : null}

            <div className={cn("rounded-lg bg-muted/20 px-3 py-2.5", HAIRLINE)}>
              <p className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-muted-foreground">
                  Last test
                </span>
                {lastTestOk == null ? (
                  <span className="text-muted-foreground">Never tested</span>
                ) : (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 font-semibold",
                      lastTestOk
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-destructive",
                    )}
                  >
                    {lastTestOk ? (
                      <CheckCircle2 className="size-3.5" aria-hidden />
                    ) : (
                      <XCircle className="size-3.5" aria-hidden />
                    )}
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
                    "mt-1 text-xs leading-relaxed",
                    lastTestOk === false
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {lastTestMessage}
                </p>
              ) : null}
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                disabled={!canTest}
                title={canTest ? undefined : testDisabledReason}
                onClick={() => void onTest()}
              >
                {testing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="mr-2 size-4" aria-hidden />
                )}
                Test connection
              </Button>
              <Button type="submit" disabled={!canSave}>
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
          </form>
        ) : null}
      </section>
    </>
  );
}
