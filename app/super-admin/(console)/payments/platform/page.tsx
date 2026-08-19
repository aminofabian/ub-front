"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AuthAlert } from "@/components/auth/auth-alert";
import { PlatformAirtimeSection } from "@/components/super-admin/platform-airtime-section";
import { SaSection, saSelectClass } from "@/components/super-admin/sa-section";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  type PlatformGatewayRecord,
  type PatchPlatformGatewayPayload,
  type PlatformKioskPaySettingsRecord,
  type SaKioskPayAccountRow,
  type SaKioskPayAccountSummary,
  type SaKioskPayWithdrawalRow,
  adjustSaKioskPayAccount,
  fetchPlatformGateways,
  fetchSaKioskPayAccountSummary,
  fetchSaKioskPayAccounts,
  fetchSaKioskPayWithdrawals,
  patchPlatformGateway,
  fetchPlatformKioskPaySettings,
  patchPlatformKioskPaySettings,
  resumeSaKioskPayWithdrawals,
} from "@/lib/super-admin-api";

function money(n: number | null | undefined) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `KES ${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-heading text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function SuperAdminPlatformPaymentsPage() {
  const [gateways, setGateways] = useState<PlatformGatewayRecord[]>([]);
  const [kioskPay, setKioskPay] = useState<PlatformKioskPaySettingsRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [kioskSaving, setKioskSaving] = useState(false);

  const [accounts, setAccounts] = useState<SaKioskPayAccountRow[]>([]);
  const [accountSummary, setAccountSummary] = useState<SaKioskPayAccountSummary | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<SaKioskPayAccountRow | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [withdrawals, setWithdrawals] = useState<SaKioskPayWithdrawalRow[]>([]);
  const [resumingFloat, setResumingFloat] = useState(false);

  const [minWithdraw, setMinWithdraw] = useState("20");
  const [dailyLimit, setDailyLimit] = useState("200000");
  const [paystackEnv, setPaystackEnv] = useState("sandbox");
  const [paystackPublic, setPaystackPublic] = useState("");
  const [paystackSecret, setPaystackSecret] = useState("");
  const [kopokopoEnv, setKopokopoEnv] = useState("sandbox");
  const [kkClientId, setKkClientId] = useState("");
  const [kkClientSecret, setKkClientSecret] = useState("");
  const [kkApiKey, setKkApiKey] = useState("");
  const [kkTill, setKkTill] = useState("");

  const reload = useCallback(async () => {
    setLoadError("");
    setAccountsLoading(true);
    try {
      const [gws, kp, accs, summ, wds] = await Promise.all([
        fetchPlatformGateways(),
        fetchPlatformKioskPaySettings(),
        fetchSaKioskPayAccounts(50).catch(() => []),
        fetchSaKioskPayAccountSummary().catch(() => null),
        fetchSaKioskPayWithdrawals(20).catch(() => []),
      ]);
      setGateways(gws);
      setKioskPay(kp);
      setAccounts(accs);
      setAccountSummary(summ);
      setWithdrawals(wds);
      setMinWithdraw(String(kp.minWithdrawAmount ?? 20));
      setDailyLimit(String(kp.dailyWithdrawLimit ?? 200000));
      setPaystackEnv(kp.paystackEnvironment ?? "sandbox");
      setKopokopoEnv(kp.kopokopoEnvironment ?? "sandbox");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load platform payments.");
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onToggle = async (gatewayType: string, current: PlatformGatewayRecord) => {
    setSaving(gatewayType);
    try {
      const body: PatchPlatformGatewayPayload = {
        isEnabled: !current.isEnabled,
        displayName: current.displayName,
        description: current.description ?? undefined,
        logoUrl: current.logoUrl ?? undefined,
        sortOrder: current.sortOrder,
      };
      await patchPlatformGateway(gatewayType, body);
      toast.success(`${current.displayName} ${body.isEnabled ? "enabled" : "disabled"}.`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update gateway.");
    } finally {
      setSaving(null);
    }
  };

  const saveKioskPay = async (enabled?: boolean) => {
    setKioskSaving(true);
    try {
      const next = await patchPlatformKioskPaySettings({
        enabled: enabled ?? kioskPay?.enabled,
        feePercent: 0,
        minWithdrawAmount: Number(minWithdraw),
        dailyWithdrawLimit: Number(dailyLimit),
        paystackEnvironment: paystackEnv,
        kopokopoEnvironment: kopokopoEnv,
        ...(paystackPublic.trim() ? { paystackPublicKey: paystackPublic.trim() } : {}),
        ...(paystackSecret.trim() ? { paystackSecretKey: paystackSecret.trim() } : {}),
        ...(kkClientId.trim() ? { kopokopoClientId: kkClientId.trim() } : {}),
        ...(kkClientSecret.trim() ? { kopokopoClientSecret: kkClientSecret.trim() } : {}),
        ...(kkApiKey.trim() ? { kopokopoApiKey: kkApiKey.trim() } : {}),
        ...(kkTill.trim() ? { kopokopoTillNumber: kkTill.trim() } : {}),
      });
      setKioskPay(next);
      setPaystackPublic("");
      setPaystackSecret("");
      setKkClientId("");
      setKkClientSecret("");
      setKkApiKey("");
      setKkTill("");
      toast.success("Kiosk Pay settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save Kiosk Pay.");
    } finally {
      setKioskSaving(false);
    }
  };

  const resumeWithdrawals = async () => {
    setResumingFloat(true);
    try {
      const next = await resumeSaKioskPayWithdrawals();
      setKioskPay(next);
      toast.success("Withdrawals resumed.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resume withdrawals.");
    } finally {
      setResumingFloat(false);
    }
  };

  const onAdjust = async () => {
    if (!adjustTarget) return;
    const delta = Number(adjustDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error("Enter a non-zero adjustment (negative debits, positive credits).");
      return;
    }
    if (!adjustNote.trim()) {
      toast.error("A note is required for the audit trail.");
      return;
    }
    setAdjustSaving(true);
    try {
      await adjustSaKioskPayAccount(adjustTarget.businessId, delta, adjustNote.trim());
      toast.success("Wallet adjusted.");
      setAdjustTarget(null);
      setAdjustDelta("");
      setAdjustNote("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Adjustment failed.");
    } finally {
      setAdjustSaving(false);
    }
  };

  const clearPaystackCreds = () => {
    showThemedConfirmToast({
      id: "clear-paystack-kiosk",
      title: "Clear Paystack credentials?",
      description:
        "Kiosk Pay storefront card payments will stop until new credentials are saved. POS STK via KopoKopo is unaffected.",
      confirmLabel: "Clear credentials",
      onConfirm: async () => {
        setKioskSaving(true);
        try {
          const next = await patchPlatformKioskPaySettings({
            enabled: kioskPay?.enabled,
            feePercent: 0,
            minWithdrawAmount: Number(minWithdraw),
            dailyWithdrawLimit: Number(dailyLimit),
            paystackEnvironment: paystackEnv,
            kopokopoEnvironment: kopokopoEnv,
            clearPaystackCredentials: true,
          });
          setKioskPay(next);
          toast.success("Paystack credentials cleared.");
          await reload();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not clear credentials.");
        } finally {
          setKioskSaving(false);
        }
      },
    });
  };

  const clearKopokopoCreds = () => {
    showThemedConfirmToast({
      id: "clear-kopokopo-kiosk",
      title: "Clear KopoKopo credentials?",
      description:
        "Kiosk Pay withdrawals and POS STK collection will stop until new credentials are saved.",
      confirmLabel: "Clear credentials",
      onConfirm: async () => {
        setKioskSaving(true);
        try {
          const next = await patchPlatformKioskPaySettings({
            enabled: kioskPay?.enabled,
            feePercent: 0,
            minWithdrawAmount: Number(minWithdraw),
            dailyWithdrawLimit: Number(dailyLimit),
            paystackEnvironment: paystackEnv,
            kopokopoEnvironment: kopokopoEnv,
            clearKopokopoCredentials: true,
          });
          setKioskPay(next);
          toast.success("KopoKopo credentials cleared.");
          await reload();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not clear credentials.");
        } finally {
          setKioskSaving(false);
        }
      },
    });
  };

  if (loadError) {
    return (
      <div className="space-y-6">
        <SuperAdminPageHeader
          title="Payment gateways"
          description="Control which payment gateways are available to all tenants."
        />
        <AuthAlert variant="error">{loadError}</AuthAlert>
        <Button variant="outline" onClick={() => void reload()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Payment gateways"
        description="Enable BYO providers for tenants, and configure Kiosk Pay (platform custody + withdraw) and airtime resale."
      />

      <SaSection
        title="Kiosk Pay"
        description="Platform Paystack collects; tenants see a wallet and withdraw via platform KopoKopo Send Money."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={kioskPay?.enabled ? "success" : "secondary"}>
              {kioskPay?.enabled ? "On" : "Off"}
            </Badge>
            <Switch
              checked={Boolean(kioskPay?.enabled)}
              disabled={kioskSaving || !kioskPay}
              onCheckedChange={(on) => void saveKioskPay(on)}
            />
          </div>
        }
        footer={
          <Button disabled={kioskSaving} onClick={() => void saveKioskPay()}>
            {kioskSaving ? "Saving…" : "Save Kiosk Pay settings"}
          </Button>
        }
      >
        <div className="space-y-4">
          {kioskPay?.sendMoneyFloatConstrainedUntil ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <p>
                Withdrawals are paused — the platform Send Money float is low
                (KopoKopo rejected a transfer). Card collections settle to Paystack, so
                top up the KopoKopo till or resume manually.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={resumingFloat || kioskSaving}
                onClick={() => void resumeWithdrawals()}
              >
                {resumingFloat ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  "Resume withdrawals"
                )}
              </Button>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            No platform markup. Paystack / KopoKopo processing fees are deducted from
            the merchant&apos;s Kiosk Pay balance.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sa-min-withdraw">Min withdraw</Label>
              <Input
                id="sa-min-withdraw"
                value={minWithdraw}
                onChange={(e) => setMinWithdraw(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-daily-limit">Daily withdraw limit</Label>
              <Input
                id="sa-daily-limit"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Paystack (collect){" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {kioskPay?.hasPaystackCredentials
                      ? `· configured ${kioskPay.paystackPublicKeyHint ?? ""}`
                      : "· not configured"}
                  </span>
                </p>
                {kioskPay?.hasPaystackCredentials ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs text-destructive hover:text-destructive"
                    disabled={kioskSaving}
                    onClick={clearPaystackCreds}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
              <select
                className={saSelectClass}
                value={paystackEnv}
                onChange={(e) => setPaystackEnv(e.target.value)}
                aria-label="Paystack environment"
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
              <Input
                className="font-mono"
                placeholder="pk_… public key"
                value={paystackPublic}
                onChange={(e) => setPaystackPublic(e.target.value)}
              />
              <Input
                className="font-mono"
                type="password"
                autoComplete="off"
                placeholder="sk_… secret key"
                value={paystackSecret}
                onChange={(e) => setPaystackSecret(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  KopoKopo (withdraw){" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {kioskPay?.hasKopokopoCredentials ? "· configured" : "· not configured"}
                  </span>
                </p>
                {kioskPay?.hasKopokopoCredentials ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs text-destructive hover:text-destructive"
                    disabled={kioskSaving}
                    onClick={clearKopokopoCreds}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
              <select
                className={saSelectClass}
                value={kopokopoEnv}
                onChange={(e) => setKopokopoEnv(e.target.value)}
                aria-label="KopoKopo environment"
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
              <Input
                className="font-mono"
                placeholder="Client ID"
                value={kkClientId}
                onChange={(e) => setKkClientId(e.target.value)}
              />
              <Input
                className="font-mono"
                type="password"
                autoComplete="off"
                placeholder="Client Secret"
                value={kkClientSecret}
                onChange={(e) => setKkClientSecret(e.target.value)}
              />
              <Input
                className="font-mono"
                type="password"
                autoComplete="off"
                placeholder="API Key"
                value={kkApiKey}
                onChange={(e) => setKkApiKey(e.target.value)}
              />
              <Input
                placeholder="Till number"
                value={kkTill}
                onChange={(e) => setKkTill(e.target.value)}
              />
            </div>
          </div>
        </div>
      </SaSection>

      <SaSection
        title="Tenant wallets"
        description="Platform custody float — reconcile PSP settlements against these totals."
        actions={
          <Button variant="outline" size="sm" disabled={accountsLoading} onClick={() => void reload()}>
            {accountsLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Refresh"}
          </Button>
        }
      >
        <div className="space-y-4">
          {accountSummary ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryTile label="Accounts" value={String(accountSummary.accountCount)} />
              <SummaryTile label="Available float" value={money(accountSummary.totalAvailable)} />
              <SummaryTile label="Pending (withdraw)" value={money(accountSummary.totalPending)} />
              <SummaryTile label="Lifetime in" value={money(accountSummary.totalLifetimeIn)} />
              <SummaryTile label="Lifetime out" value={money(accountSummary.totalLifetimeOut)} />
            </div>
          ) : null}
          {accounts.length > 0 ? (
            <>
              <ul className="divide-y divide-border/60 lg:hidden">
                {accounts.map((a) => (
                  <li key={a.businessId} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm">{shortId(a.businessId)}</p>
                      <p className="mt-1 text-sm tabular-nums">
                        {money(a.availableBalance)}{" "}
                        <span className="text-muted-foreground">available</span>
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        Pending {money(a.pendingBalance)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant={a.status === "ACTIVE" ? "success" : "secondary"}>{a.status}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAdjustTarget(a);
                          setAdjustDelta("");
                          setAdjustNote("");
                        }}
                      >
                        Adjust
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-y border-border/60 text-muted-foreground">
                    <tr>
                      <th className="px-1 py-2 font-medium">Business</th>
                      <th className="px-1 py-2 font-medium">Status</th>
                      <th className="px-1 py-2 text-right font-medium">Available</th>
                      <th className="px-1 py-2 text-right font-medium">Pending</th>
                      <th className="px-1 py-2 text-right font-medium">Lifetime in</th>
                      <th className="px-1 py-2 text-right font-medium">Lifetime out</th>
                      <th className="px-1 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {accounts.map((a) => (
                      <tr key={a.businessId}>
                        <td className="px-1 py-2 font-mono text-xs">{shortId(a.businessId)}</td>
                        <td className="px-1 py-2">
                          <Badge variant={a.status === "ACTIVE" ? "success" : "secondary"}>
                            {a.status}
                          </Badge>
                        </td>
                        <td className="px-1 py-2 text-right tabular-nums">{money(a.availableBalance)}</td>
                        <td className="px-1 py-2 text-right tabular-nums">{money(a.pendingBalance)}</td>
                        <td className="px-1 py-2 text-right tabular-nums">{money(a.lifetimeIn)}</td>
                        <td className="px-1 py-2 text-right tabular-nums">{money(a.lifetimeOut)}</td>
                        <td className="px-1 py-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAdjustTarget(a);
                              setAdjustDelta("");
                              setAdjustNote("");
                            }}
                          >
                            Adjust
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No tenant Kiosk Pay accounts yet.</p>
          )}
          {withdrawals.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Recent withdrawals</p>
              <ul className="divide-y divide-border/60 lg:hidden">
                {withdrawals.map((w) => (
                  <li key={w.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-sm">{shortId(w.businessId)}</p>
                      <Badge
                        variant={
                          w.status === "SUCCESS"
                            ? "success"
                            : w.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {w.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm tabular-nums">{money(w.amount)}</p>
                    <p className="text-xs text-muted-foreground">{w.phoneNumber}</p>
                    {w.failureReason ? (
                      <p className="mt-1 text-xs text-muted-foreground">{w.failureReason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-y border-border/60 text-muted-foreground">
                    <tr>
                      <th className="px-1 py-2 font-medium">Business</th>
                      <th className="px-1 py-2 text-right font-medium">Amount</th>
                      <th className="px-1 py-2 font-medium">Phone</th>
                      <th className="px-1 py-2 font-medium">Status</th>
                      <th className="px-1 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td className="px-1 py-2 font-mono text-xs">{shortId(w.businessId)}</td>
                        <td className="px-1 py-2 text-right tabular-nums">{money(w.amount)}</td>
                        <td className="px-1 py-2">{w.phoneNumber}</td>
                        <td className="px-1 py-2">
                          <Badge
                            variant={
                              w.status === "SUCCESS"
                                ? "success"
                                : w.status === "FAILED"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {w.status}
                          </Badge>
                        </td>
                        <td className="max-w-[260px] px-1 py-2 text-muted-foreground">
                          <span className="line-clamp-2" title={w.failureReason ?? undefined}>
                            {w.failureReason ?? "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </SaSection>

      <PlatformAirtimeSection />

      <SaSection
        title="BYO gateways"
        description={
          <>
            Enable providers so tenants can connect <span className="font-medium text-foreground">their own</span>{" "}
            credentials under Payments → Settings. Money settles to the tenant — not Kiosk Pay.
          </>
        }
        padded={false}
      >
        {gateways.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
            No gateways returned from the API.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {gateways.map((gw) => (
              <li
                key={gw.gatewayType}
                className="flex items-start justify-between gap-4 px-4 py-3.5 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="font-medium">{gw.displayName}</p>
                  {gw.description ? (
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{gw.description}</p>
                  ) : null}
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{gw.gatewayType}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={gw.isEnabled ? "success" : "secondary"}>
                    {gw.isEnabled ? "On" : "Off"}
                  </Badge>
                  <Switch
                    checked={gw.isEnabled}
                    disabled={saving === gw.gatewayType}
                    onCheckedChange={() => void onToggle(gw.gatewayType, gw)}
                    aria-label={`${gw.isEnabled ? "Disable" : "Enable"} ${gw.displayName}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SaSection>

      <Dialog
        open={adjustTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAdjustTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Kiosk Pay wallet</DialogTitle>
            <DialogDescription>
              Business {adjustTarget ? shortId(adjustTarget.businessId) : ""} · available{" "}
              {adjustTarget ? money(adjustTarget.availableBalance) : ""}. Positive credits;
              negative debits.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="sa-adjust-delta">Delta (KES)</Label>
              <Input
                id="sa-adjust-delta"
                type="number"
                step="0.01"
                placeholder="e.g. -500 or 250.50"
                value={adjustDelta}
                disabled={adjustSaving}
                onChange={(e) => setAdjustDelta(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-adjust-note">Note (audit trail)</Label>
              <Input
                id="sa-adjust-note"
                type="text"
                placeholder="e.g. refund for voided sale #123"
                value={adjustNote}
                disabled={adjustSaving}
                onChange={(e) => setAdjustNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={adjustSaving}
              onClick={() => setAdjustTarget(null)}
            >
              Cancel
            </Button>
            <Button disabled={adjustSaving} onClick={() => void onAdjust()}>
              {adjustSaving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                "Apply adjustment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
