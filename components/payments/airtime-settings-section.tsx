"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Signal, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  fetchAirtimeSettings,
  updateAirtimeSettings,
  type AirtimeSettingsRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function money(n: number | null | undefined, currency = "KES") {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${currency} ${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Lets a merchant switch airtime resale on and choose where it appears.
 *
 * <p>Airtime is paid for out of the Kiosk Pay wallet, so this section stays
 * read-only-ish until the platform has Instalipa credentials and the wallet is
 * active — the blocked reason from the API explains which one is missing.
 */
export function AirtimeSettingsSection() {
  const { me } = useDashboard();
  const canRead =
    hasPermission(me?.permissions, Permission.AirtimeRead) ||
    hasPermission(me?.permissions, Permission.AirtimeManage);
  const canWrite = hasPermission(me?.permissions, Permission.AirtimeManage);

  const [settings, setSettings] = useState<AirtimeSettingsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maxSingle, setMaxSingle] = useState("");

  const apply = useCallback((next: AirtimeSettingsRecord) => {
    setSettings(next);
    setMaxSingle(next.maxSingleAmount === null ? "" : String(next.maxSingleAmount));
  }, []);

  const reload = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      apply(await fetchAirtimeSettings());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load airtime settings.");
    } finally {
      setLoading(false);
    }
  }, [apply, canRead]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = async (patch: Partial<AirtimeSettingsRecord>) => {
    if (!canWrite) return;
    const trimmed = maxSingle.trim();
    const parsedMax = trimmed ? Number(trimmed) : null;
    if (trimmed && (!Number.isFinite(parsedMax) || (parsedMax ?? 0) <= 0)) {
      toast.error("Enter a valid per-sale cap, or leave it blank.");
      return;
    }
    setSaving(true);
    try {
      apply(
        await updateAirtimeSettings({
          enabled: patch.enabled ?? settings?.enabled,
          posEnabled: patch.posEnabled ?? settings?.posEnabled,
          storefrontEnabled: patch.storefrontEnabled ?? settings?.storefrontEnabled,
          maxSingleAmount: parsedMax,
        }),
      );
      toast.success(
        patch.enabled === true
          ? "Airtime is on — look for the Airtime button at the till."
          : patch.enabled === false
            ? "Airtime turned off."
            : "Airtime settings saved.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save airtime settings.");
    } finally {
      setSaving(false);
    }
  };

  const platformReady =
    settings?.platformEnabled === true && settings?.platformCredentialsConfigured === true;
  const walletReady = settings?.walletActive === true;
  const currency = settings?.currency || "KES";
  const on = settings?.enabled === true;

  if (!canRead) {
    return null;
  }

  return (
    <section id="airtime" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight text-[#141414]">
            <Signal className="size-4 text-[#B08D48]" aria-hidden />
            Sell airtime
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#666666]">
            Turn your Kiosk Pay balance into an extra earner. Every top-up you sell
            debits the airtime face value from your wallet and credits your commission
            straight back — no separate float to manage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={APP_ROUTES.airtime}>Airtime activity</Link>
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={APP_ROUTES.onlineAirtime}>Online purchases</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || saving}
            onClick={() => void reload()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {loading && !settings ? (
        <div className={cn(HUB_SURFACE, "flex items-center gap-2 px-4 py-8 text-sm text-[#666666]")}>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading airtime…
        </div>
      ) : (
        <div className={cn(HUB_SURFACE, "space-y-4 p-4")}>
          {!platformReady ? (
            <p className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              Airtime is not switched on for this platform yet. Ask your platform admin
              to configure the airtime provider.
            </p>
          ) : null}

          {platformReady && !walletReady ? (
            <p className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              Activate Kiosk Pay first — airtime is funded from that wallet.{" "}
              <Link
                href="#kiosk-pay"
                className="font-medium underline underline-offset-2"
              >
                Set up Kiosk Pay
              </Link>
              .
            </p>
          ) : null}

          {platformReady && walletReady && settings?.blockedReason ? (
            <p className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              {settings.blockedReason}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-border/60 bg-muted/20 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Wallet available
              </p>
              <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
                {money(settings?.walletBalance, currency)}
              </p>
              <Link
                href={APP_ROUTES.paymentsKioskPay}
                className="mt-1 inline-block text-[11px] font-medium text-foreground underline underline-offset-2"
              >
                Top up wallet
              </Link>
            </div>
            <div className="border border-border/60 bg-muted/20 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                You earn
              </p>
              <p className="mt-1 flex items-baseline gap-1 font-heading text-xl font-semibold tabular-nums">
                {settings?.commissionPercent ?? 0}%
                <Sparkles className="size-3.5 text-amber-500" aria-hidden />
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {money(settings?.commissionPercent ?? 0, currency)} on a{" "}
                {money(100, currency)} sale
              </p>
            </div>
            <div className="border border-border/60 bg-muted/20 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Per-sale range
              </p>
              <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
                {settings?.minAmount ?? 0}–{settings?.maxAmount ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Daily cap {money(settings?.dailyLimit, currency)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Sell airtime</p>
              <p className="text-xs text-muted-foreground">
                Master switch for this business.
              </p>
            </div>
            <Switch
              checked={on}
              disabled={!canWrite || saving || !platformReady || !walletReady}
              onCheckedChange={(next) => void save({ enabled: next })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">At the till</p>
                <p className="text-xs text-muted-foreground">
                  Airtime button in the cashier workspace.
                  {settings?.platformPosEnabled === false
                    ? " Disabled by the platform."
                    : ""}
                </p>
              </div>
              <Switch
                checked={settings?.posEnabled === true}
                disabled={
                  !canWrite || saving || !on || settings?.platformPosEnabled === false
                }
                onCheckedChange={(next) => void save({ posEnabled: next })}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">On the storefront</p>
                <p className="text-xs text-muted-foreground">
                  Shoppers buy airtime and pay by M-Pesa.
                  {settings?.platformStorefrontEnabled === false
                    ? " Disabled by the platform."
                    : ""}
                </p>
              </div>
              <Switch
                checked={settings?.storefrontEnabled === true}
                disabled={
                  !canWrite ||
                  saving ||
                  !on ||
                  settings?.platformStorefrontEnabled === false
                }
                onCheckedChange={(next) => void save({ storefrontEnabled: next })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                Your own cap per sale (optional)
              </span>
              <input
                type="number"
                min={0}
                step="1"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
                placeholder={`Platform max ${settings?.maxAmount ?? 0}`}
                value={maxSingle}
                disabled={!canWrite || saving}
                onChange={(e) => setMaxSingle(e.target.value)}
              />
              <span className="block text-[11px] text-muted-foreground">
                Handy guard against fat-finger amounts at a busy till.
              </span>
            </label>
          </div>

          {canWrite ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => void save({})}
            >
              {saving ? "Saving…" : "Save airtime settings"}
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
