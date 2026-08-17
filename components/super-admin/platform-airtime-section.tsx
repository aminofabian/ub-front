"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Loader2,
  PlugZap,
  RefreshCw,
  RotateCcw,
  Signal,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  type PlatformAirtimeSettingsRecord,
  type SaAirtimeOrderRow,
  fetchPlatformAirtimeSettings,
  fetchSaAirtimeOrders,
  patchPlatformAirtimeSettings,
  requerySaAirtimeOrder,
  resumeSaAirtime,
  testPlatformAirtime,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const MONO_INPUT_CLASS = `${INPUT_CLASS} font-mono`;

function money(n: number | null | undefined, currency = "KES") {
  if (typeof n !== "number" || !Number.isFinite(n)) {
    return "—";
  }
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortId(id: string | null | undefined) {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Positive numbers only; blank / junk becomes undefined so the field is left alone. */
function num(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function StatusStamp({ status }: { status: string }) {
  if (status === "SUCCESS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
        <Check className="size-3 stroke-[2.5]" aria-hidden />
        Sent
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-600/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-rose-800 dark:bg-rose-400/15 dark:text-rose-300">
        <X className="size-3 stroke-[2.5]" aria-hidden />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
      <Loader2 className="size-3 animate-spin" aria-hidden />
      {status === "AWAITING_PAYMENT" ? "Unpaid" : "In flight"}
    </span>
  );
}

/**
 * Platform Instalipa configuration plus cross-tenant airtime ops.
 *
 * <p>One Instalipa application backs every tenant, so the float shown here is
 * shared — a single busy shop can drain it, which is why the low-float warning
 * and the per-tenant daily cap both live on this screen.
 */
export function PlatformAirtimeSection() {
  const [settings, setSettings] = useState<PlatformAirtimeSettingsRecord | null>(null);
  const [orders, setOrders] = useState<SaAirtimeOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [requeryingId, setRequeryingId] = useState<string | null>(null);

  const [baseUrl, setBaseUrl] = useState("");
  const [environment, setEnvironment] = useState("sandbox");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [commission, setCommission] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [floatThreshold, setFloatThreshold] = useState("");

  const applySettings = useCallback((next: PlatformAirtimeSettingsRecord) => {
    setSettings(next);
    setBaseUrl(next.baseUrl ?? "");
    setEnvironment(next.environment ?? "sandbox");
    setCommission(String(next.tenantCommissionPercent ?? ""));
    setMinAmount(String(next.minAmount ?? ""));
    setMaxAmount(String(next.maxAmount ?? ""));
    setDailyLimit(String(next.dailyTenantLimit ?? ""));
    setFloatThreshold(String(next.floatLowThreshold ?? ""));
    // Never re-populate secrets — they are write-only from here.
    setConsumerKey("");
    setConsumerSecret("");
  }, []);

  const reload = useCallback(async () => {
    try {
      const [next, rows] = await Promise.all([
        fetchPlatformAirtimeSettings(),
        fetchSaAirtimeOrders(50).catch(() => []),
      ]);
      applySettings(next);
      setOrders(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load airtime settings.");
    } finally {
      setLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = async (enabledOverride?: boolean) => {
    setSaving(true);
    try {
      const next = await patchPlatformAirtimeSettings({
        enabled: enabledOverride ?? settings?.enabled,
        baseUrl: baseUrl.trim() || undefined,
        environment,
        consumerKey: consumerKey.trim() || undefined,
        consumerSecret: consumerSecret.trim() || undefined,
        tenantCommissionPercent: num(commission),
        minAmount: num(minAmount),
        maxAmount: num(maxAmount),
        dailyTenantLimit: num(dailyLimit),
        floatLowThreshold: num(floatThreshold),
      });
      applySettings(next);
      toast.success(
        enabledOverride === true
          ? "Airtime is live."
          : enabledOverride === false
            ? "Airtime switched off."
            : "Airtime settings saved.",
      );
      setOrders(await fetchSaAirtimeOrders(50).catch(() => []));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save airtime settings.");
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    try {
      applySettings(await testPlatformAirtime());
      toast.success("Instalipa credentials authenticated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  const resume = async () => {
    setResuming(true);
    try {
      applySettings(await resumeSaAirtime());
      toast.success("Airtime sending resumed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resume airtime.");
    } finally {
      setResuming(false);
    }
  };

  const requery = async (orderId: string) => {
    setRequeryingId(orderId);
    try {
      const updated = await requerySaAirtimeOrder(orderId);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      toast.success(`Provider says: ${updated.status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Re-query failed.");
    } finally {
      setRequeryingId(null);
    }
  };

  const clearCredentials = () => {
    showThemedConfirmToast({
      id: "clear-instalipa-credentials",
      title: "Clear Instalipa credentials?",
      description:
        "Every tenant selling airtime stops immediately. In-flight orders still settle, and held wallet funds are released by the reconciler.",
      confirmLabel: "Clear credentials",
      onConfirm: async () => {
        setSaving(true);
        try {
          applySettings(
            await patchPlatformAirtimeSettings({ enabled: false, clearCredentials: true }),
          );
          toast.success("Instalipa credentials cleared.");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not clear credentials.");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const stats = useMemo(() => {
    let sent = 0;
    let failed = 0;
    let inFlight = 0;
    let volume = 0;
    let margin = 0;
    for (const o of orders) {
      if (o.status === "SUCCESS") {
        sent += 1;
        volume += o.amount;
        margin += o.commission;
      } else if (o.status === "FAILED") {
        failed += 1;
      } else {
        inFlight += 1;
      }
    }
    return { sent, failed, inFlight, volume, margin };
  }, [orders]);

  const currency = settings?.currency || "KES";
  const paused = Boolean(settings?.floatConstrainedUntil);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Signal className="size-5 text-muted-foreground" aria-hidden />
            <div>
              <CardTitle className="font-heading text-base">Airtime (Instalipa)</CardTitle>
              <CardDescription>
                One platform float sells airtime for every tenant. Merchants pay from
                their Kiosk Pay wallet and keep the commission you set below.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={settings?.enabled ? "success" : "secondary"}>
              {settings?.enabled ? "On" : "Off"}
            </Badge>
            <Switch
              checked={Boolean(settings?.enabled)}
              disabled={saving || loading || !settings}
              onCheckedChange={(on) => void save(on)}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 px-1 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading airtime settings…
          </div>
        ) : (
          <>
            {paused ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                <p>
                  Airtime sending is paused — Instalipa rejected a recharge for
                  insufficient float. Top up the Instalipa account, then resume.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={resuming || saving}
                  onClick={() => void resume()}
                >
                  {resuming ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    "Resume airtime"
                  )}
                </Button>
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div
                className={cn(
                  "rounded-lg border px-3 py-2",
                  settings?.floatLow
                    ? "border-rose-300/70 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30"
                    : "border-border/60 bg-muted/20",
                )}
              >
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Instalipa float
                  {settings?.floatLow ? (
                    <TriangleAlert
                      className="size-3 text-rose-700 dark:text-rose-300"
                      aria-hidden
                    />
                  ) : null}
                </p>
                <p className="mt-0.5 truncate font-heading text-sm font-semibold tabular-nums">
                  {money(settings?.floatBalance, currency)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  seen {fmtWhen(settings?.floatCheckedAt)}
                </p>
              </div>
              <SummaryTile
                label="Sent (last 50)"
                value={String(stats.sent)}
                hint={money(stats.volume, currency)}
              />
              <SummaryTile
                label="Tenant margin paid"
                value={money(stats.margin, currency)}
                hint={`${settings?.tenantCommissionPercent ?? 0}% per sale`}
              />
              <SummaryTile
                label="Failed / in flight"
                value={`${stats.failed} / ${stats.inFlight}`}
                hint={stats.failed > 0 ? "check reasons below" : "healthy"}
              />
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Instalipa API{" "}
                  <span className="text-xs text-muted-foreground">
                    {settings?.hasCredentials
                      ? `· configured ${settings.consumerKeyHint ?? ""}`
                      : "· not configured"}
                  </span>
                </p>
                <div className="flex items-center gap-1">
                  {settings?.hasCredentials ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 px-2 text-[11px]"
                      disabled={testing || saving}
                      onClick={() => void runTest()}
                    >
                      {testing ? (
                        <Loader2 className="size-3 animate-spin" aria-hidden />
                      ) : (
                        <PlugZap className="size-3" aria-hidden />
                      )}
                      Test
                    </Button>
                  ) : null}
                  {settings?.hasCredentials ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={saving}
                      onClick={clearCredentials}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Base URL</span>
                  <input
                    className={INPUT_CLASS}
                    placeholder="https://business.instalipa.co.ke"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">Environment</span>
                  <select
                    className={INPUT_CLASS}
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>
                </label>
              </div>
              <input
                className={MONO_INPUT_CLASS}
                placeholder="Consumer key"
                autoComplete="off"
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
              />
              <input
                className={MONO_INPUT_CLASS}
                placeholder="Consumer secret"
                type="password"
                autoComplete="new-password"
                value={consumerSecret}
                onChange={(e) => setConsumerSecret(e.target.value)}
              />
              <p className="text-[11px] leading-snug text-muted-foreground">
                Instalipa shows these once. Leave both blank to keep what is stored.
                Register the callback URL{" "}
                <code className="rounded bg-muted px-1 py-px font-mono text-[10px]">
                  /webhooks/instalipa/airtime
                </code>{" "}
                in the Instalipa portal so deliveries confirm without polling.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">
                  Tenant commission (%)
                </span>
                <input
                  className={INPUT_CLASS}
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                />
                <span className="block text-[10px] text-muted-foreground">
                  Kept by the merchant on each sale
                </span>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Min per sale</span>
                <input
                  className={INPUT_CLASS}
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Max per sale</span>
                <input
                  className={INPUT_CLASS}
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">
                  Daily limit per tenant
                </span>
                <input
                  className={INPUT_CLASS}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                />
                <span className="block text-[10px] text-muted-foreground">
                  Caps how much of the shared float one shop can take
                </span>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">
                  Low float warning at
                </span>
                <input
                  className={INPUT_CLASS}
                  value={floatThreshold}
                  onChange={(e) => setFloatThreshold(e.target.value)}
                />
              </label>
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Recent airtime</p>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => void reload()}
                  aria-label="Refresh airtime orders"
                >
                  <RefreshCw className="size-3" aria-hidden />
                </Button>
              </div>
              {orders.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No airtime has been sold yet.
                </p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {orders.map((o) => (
                    <li
                      key={o.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <StatusStamp status={o.status} />
                          <span className="font-heading text-sm font-semibold tabular-nums">
                            {money(o.amount, o.currency || currency)}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            → {o.phoneNumber}
                            {o.network ? ` · ${o.network}` : ""}
                          </span>
                          <span className="rounded bg-muted/70 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {o.channel}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[10px] tabular-nums text-muted-foreground">
                          {fmtWhen(o.requestedAt)} · tenant {shortId(o.businessId)} ·{" "}
                          {shortId(o.providerTransactionId)}
                        </p>
                        {o.failureReason ? (
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-rose-800 dark:text-rose-300">
                            {o.failureReason}
                          </p>
                        ) : null}
                      </div>
                      {o.status !== "SUCCESS" && o.status !== "FAILED" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0 gap-1 px-2 text-[11px]"
                          disabled={requeryingId === o.id}
                          onClick={() => void requery(o.id)}
                        >
                          {requeryingId === o.id ? (
                            <Loader2 className="size-3 animate-spin" aria-hidden />
                          ) : (
                            <RotateCcw className="size-3" aria-hidden />
                          )}
                          Re-query
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>

      <CardFooter>
        <Button disabled={saving || loading} onClick={() => void save()}>
          {saving ? "Saving…" : "Save airtime settings"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate font-heading text-sm font-semibold tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
