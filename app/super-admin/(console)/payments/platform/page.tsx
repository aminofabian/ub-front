"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, Shield, Wallet } from "lucide-react";
import { toast } from "sonner";

import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  type PlatformGatewayRecord,
  type PatchPlatformGatewayPayload,
  type PlatformKioskPaySettingsRecord,
  type SaKioskPayAccountRow,
  type SaKioskPayAccountSummary,
  adjustSaKioskPayAccount,
  fetchPlatformGateways,
  fetchSaKioskPayAccountSummary,
  fetchSaKioskPayAccounts,
  patchPlatformGateway,
  fetchPlatformKioskPaySettings,
  patchPlatformKioskPaySettings,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

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
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
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
      const [gws, kp, accs, summ] = await Promise.all([
        fetchPlatformGateways(),
        fetchPlatformKioskPaySettings(),
        fetchSaKioskPayAccounts(50).catch(() => []),
        fetchSaKioskPayAccountSummary().catch(() => null),
      ]);
      setGateways(gws);
      setKioskPay(kp);
      setAccounts(accs);
      setAccountSummary(summ);
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
      <div className="space-y-8">
        <SuperAdminPageHeader
          title="Payment gateways"
          description="Control which payment gateways are available to all tenants."
        />
        <Card className="border-destructive/25 bg-destructive/[0.04] shadow-sm">
          <CardHeader className="flex flex-row items-center gap-3">
            <Shield className="size-8 text-destructive" aria-hidden />
            <div>
              <CardTitle className="text-destructive">Could not load</CardTitle>
              <CardDescription className="text-destructive/90">{loadError}</CardDescription>
            </div>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => void reload()}>
              Try again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SuperAdminPageHeader
        title="Payment gateways"
        description="Enable BYO providers for tenants, and configure Kiosk Pay (platform custody + withdraw)."
      />

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="size-5 text-muted-foreground" aria-hidden />
              <div>
                <CardTitle className="font-heading text-base">Kiosk Pay</CardTitle>
                <CardDescription>
                  Platform Paystack collects; tenants see a wallet and withdraw via platform
                  KopoKopo Send Money.
                </CardDescription>
              </div>
            </div>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            No platform markup. Paystack / KopoKopo processing fees are deducted from
            the merchant&apos;s Kiosk Pay balance.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Min withdraw</span>
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={minWithdraw}
                onChange={(e) => setMinWithdraw(e.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Daily withdraw limit</span>
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Paystack (collect){" "}
                <span className="text-xs text-muted-foreground">
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
                  className="h-6 shrink-0 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={kioskSaving}
                  onClick={clearPaystackCreds}
                >
                  Clear
                </Button>
              ) : null}
            </div>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={paystackEnv}
                onChange={(e) => setPaystackEnv(e.target.value)}
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
                placeholder="pk_… public key"
                value={paystackPublic}
                onChange={(e) => setPaystackPublic(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
                placeholder="sk_… secret key"
                value={paystackSecret}
                onChange={(e) => setPaystackSecret(e.target.value)}
              />
            </div>
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                KopoKopo (withdraw){" "}
                <span className="text-xs text-muted-foreground">
                  {kioskPay?.hasKopokopoCredentials ? "· configured" : "· not configured"}
                </span>
              </p>
              {kioskPay?.hasKopokopoCredentials ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 shrink-0 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={kioskSaving}
                  onClick={clearKopokopoCreds}
                >
                  Clear
                </Button>
              ) : null}
            </div>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={kopokopoEnv}
                onChange={(e) => setKopokopoEnv(e.target.value)}
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
                placeholder="Client ID"
                value={kkClientId}
                onChange={(e) => setKkClientId(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
                placeholder="Client Secret"
                value={kkClientSecret}
                onChange={(e) => setKkClientSecret(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
                placeholder="API Key"
                value={kkApiKey}
                onChange={(e) => setKkApiKey(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="Till number"
                value={kkTill}
                onChange={(e) => setKkTill(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button disabled={kioskSaving} onClick={() => void saveKioskPay()}>
            {kioskSaving ? "Saving…" : "Save Kiosk Pay settings"}
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="size-5 text-muted-foreground" aria-hidden />
            <div>
              <CardTitle className="font-heading text-base">Tenant wallets</CardTitle>
              <CardDescription>
                Platform custody float — reconcile PSP settlements against these totals.
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={accountsLoading}
            onClick={() => void reload()}
          >
            {accountsLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              "Refresh"
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="border-b border-border/60 bg-muted/20 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Business</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Available</th>
                    <th className="px-3 py-2 text-right font-medium">Pending</th>
                    <th className="px-3 py-2 text-right font-medium">Lifetime in</th>
                    <th className="px-3 py-2 text-right font-medium">Lifetime out</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {accounts.map((a) => (
                    <tr key={a.businessId}>
                      <td className="px-3 py-2 font-mono">{shortId(a.businessId)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={a.status === "ACTIVE" ? "success" : "secondary"}>
                          {a.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(a.availableBalance)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(a.pendingBalance)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(a.lifetimeIn)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(a.lifetimeOut)}</td>
                      <td className="px-3 py-2 text-right">
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
          ) : (
            <p className="text-xs text-muted-foreground">No tenant Kiosk Pay accounts yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-muted/20 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-base">BYO gateways</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Enable providers so tenants can connect <span className="font-medium text-foreground">their own</span>{" "}
            credentials under Payments → Settings. Money settles to the tenant — not Kiosk Pay.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {gateways.map((gw) => (
          <Card
            key={gw.gatewayType}
            className={cn(
              "group border-border/70 shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md",
              gw.isEnabled && "ring-1 ring-primary/20",
            )}
          >
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background",
                      gw.isEnabled ? "bg-emerald-500 ring-emerald-500/30" : "bg-muted-foreground/25 ring-transparent",
                    )}
                    aria-hidden
                  />
                  <CardTitle className="truncate font-heading text-base leading-snug">{gw.displayName}</CardTitle>
                </div>
                <Badge variant={gw.isEnabled ? "success" : "secondary"}>{gw.isEnabled ? "On" : "Off"}</Badge>
              </div>
              {gw.description ? (
                <CardDescription className="line-clamp-3">{gw.description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground tabular-nums">
              Sort order: {gw.sortOrder} · <span className="font-mono">{gw.gatewayType}</span>
            </CardContent>
            <CardFooter className="border-t border-border/50 bg-muted/15 pt-4">
              <Button
                variant={gw.isEnabled ? "outline" : "default"}
                size="sm"
                disabled={saving === gw.gatewayType}
                onClick={() => onToggle(gw.gatewayType, gw)}
                className="w-full"
              >
                {saving === gw.gatewayType
                  ? "Saving…"
                  : gw.isEnabled
                    ? "Disable for platform"
                    : "Enable for platform"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {gateways.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-muted/10">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <CreditCard className="size-8 opacity-40" aria-hidden />
            No gateways returned from the API.
          </CardContent>
        </Card>
      ) : null}

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
            <label className="space-y-1.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Delta (KES)</span>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                placeholder="e.g. -500 or 250.50"
                value={adjustDelta}
                disabled={adjustSaving}
                onChange={(e) => setAdjustDelta(e.target.value)}
                autoFocus
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Note (audit trail)</span>
              <input
                type="text"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                placeholder="e.g. refund for voided sale #123"
                value={adjustNote}
                disabled={adjustSaving}
                onChange={(e) => setAdjustNote(e.target.value)}
              />
            </label>
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
