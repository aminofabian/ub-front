"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Shield, Wallet } from "lucide-react";
import { toast } from "sonner";

import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  type PlatformGatewayRecord,
  type PatchPlatformGatewayPayload,
  type PlatformKioskPaySettingsRecord,
  fetchPlatformGateways,
  patchPlatformGateway,
  fetchPlatformKioskPaySettings,
  patchPlatformKioskPaySettings,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

export default function SuperAdminPlatformPaymentsPage() {
  const [gateways, setGateways] = useState<PlatformGatewayRecord[]>([]);
  const [kioskPay, setKioskPay] = useState<PlatformKioskPaySettingsRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [kioskSaving, setKioskSaving] = useState(false);

  const [feePercent, setFeePercent] = useState("1");
  const [minWithdraw, setMinWithdraw] = useState("100");
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
    try {
      const [gws, kp] = await Promise.all([
        fetchPlatformGateways(),
        fetchPlatformKioskPaySettings(),
      ]);
      setGateways(gws);
      setKioskPay(kp);
      setFeePercent(String(kp.feePercent ?? 1));
      setMinWithdraw(String(kp.minWithdrawAmount ?? 100));
      setDailyLimit(String(kp.dailyWithdrawLimit ?? 200000));
      setPaystackEnv(kp.paystackEnvironment ?? "sandbox");
      setKopokopoEnv(kp.kopokopoEnvironment ?? "sandbox");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load platform payments.");
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
        feePercent: Number(feePercent),
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
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Fee %</span>
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
              />
            </label>
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
              <p className="text-sm font-medium">
                Paystack (collect){" "}
                <span className="text-xs text-muted-foreground">
                  {kioskPay?.hasPaystackCredentials
                    ? `· configured ${kioskPay.paystackPublicKeyHint ?? ""}`
                    : "· not configured"}
                </span>
              </p>
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
              <p className="text-sm font-medium">
                KopoKopo (withdraw){" "}
                <span className="text-xs text-muted-foreground">
                  {kioskPay?.hasKopokopoCredentials ? "· configured" : "· not configured"}
                </span>
              </p>
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
    </div>
  );
}
