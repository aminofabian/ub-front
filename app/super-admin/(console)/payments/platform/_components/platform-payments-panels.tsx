"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { PaymentBrandMark } from "@/components/payments/payment-brand-mark";
import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type {
  PlatformCustodySettlementRecord,
  PlatformDarajaSettingsRecord,
  PlatformGatewayRecord,
  PlatformKioskPaySettingsRecord,
  PlatformMpesaCustodySettingsRecord,
  SaKioskPayAccountRow,
  SaKioskPayAccountSummary,
  SaKioskPayWithdrawalRow,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

export function money(n: number | null | undefined) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `KES ${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={dashboardHintClass()}>{label}</p>
      <p className="mt-0.5 truncate font-heading text-sm font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id?: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {id ? (
        <Label htmlFor={id} className={dashboardLabelClass()}>
          {label}
        </Label>
      ) : (
        <p className={dashboardLabelClass()}>{label}</p>
      )}
      {children}
    </div>
  );
}

export function KioskPayPanel({
  kioskPay,
  kioskSaving,
  resumingFloat,
  minWithdraw,
  dailyLimit,
  paystackEnv,
  paystackPublic,
  paystackSecret,
  kopokopoEnv,
  kkClientId,
  kkClientSecret,
  kkApiKey,
  kkTill,
  onMinWithdraw,
  onDailyLimit,
  onPaystackEnv,
  onPaystackPublic,
  onPaystackSecret,
  onKopokopoEnv,
  onKkClientId,
  onKkClientSecret,
  onKkApiKey,
  onKkTill,
  onEnabledChange,
  onResumeWithdrawals,
  onClearPaystack,
  onClearKopokopo,
}: {
  kioskPay: PlatformKioskPaySettingsRecord | null;
  kioskSaving: boolean;
  resumingFloat: boolean;
  minWithdraw: string;
  dailyLimit: string;
  paystackEnv: string;
  paystackPublic: string;
  paystackSecret: string;
  kopokopoEnv: string;
  kkClientId: string;
  kkClientSecret: string;
  kkApiKey: string;
  kkTill: string;
  onMinWithdraw: (v: string) => void;
  onDailyLimit: (v: string) => void;
  onPaystackEnv: (v: string) => void;
  onPaystackPublic: (v: string) => void;
  onPaystackSecret: (v: string) => void;
  onKopokopoEnv: (v: string) => void;
  onKkClientId: (v: string) => void;
  onKkClientSecret: (v: string) => void;
  onKkApiKey: (v: string) => void;
  onKkTill: (v: string) => void;
  onEnabledChange: (on: boolean) => void;
  onResumeWithdrawals: () => void;
  onClearPaystack: () => void;
  onClearKopokopo: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className={cn("flex items-center justify-between gap-2 border bg-white px-3 py-2.5", HAIRLINE)}>
        <div>
          <p className="text-[13px] font-semibold tracking-[-0.015em]">Enabled</p>
          <p className={dashboardHintClass()}>Tenants can collect and withdraw via Kiosk Pay.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={kioskPay?.enabled ? "success" : "secondary"}>
            {kioskPay?.enabled ? "On" : "Off"}
          </Badge>
          <Switch
            checked={Boolean(kioskPay?.enabled)}
            disabled={kioskSaving || !kioskPay}
            onCheckedChange={onEnabledChange}
          />
        </div>
      </div>

      {kioskPay?.sendMoneyFloatConstrainedUntil ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-amber-700/35 bg-amber-50 px-3 py-2 text-[12px] text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <p>
            Withdrawals are paused. The platform Send Money float is low
            (KopoKopo rejected a transfer). Card collections settle to Paystack, so
            top up the KopoKopo till or resume manually.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-none"
            disabled={resumingFloat || kioskSaving}
            onClick={onResumeWithdrawals}
          >
            {resumingFloat ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              "Resume withdrawals"
            )}
          </Button>
        </div>
      ) : null}

      <p className={cn(dashboardHintClass(), "leading-relaxed")}>
        No platform markup. Paystack / KopoKopo processing fees are deducted from
        the merchant&apos;s Kiosk Pay balance.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="sa-min-withdraw" label="Min withdraw">
          <Input
            id="sa-min-withdraw"
            className={dashboardInputClass()}
            value={minWithdraw}
            onChange={(e) => onMinWithdraw(e.target.value)}
          />
        </Field>
        <Field id="sa-daily-limit" label="Daily withdraw limit">
          <Input
            id="sa-daily-limit"
            className={dashboardInputClass()}
            value={dailyLimit}
            onChange={(e) => onDailyLimit(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold tracking-[-0.015em]">
              Paystack (collect){" "}
              <span className={cn(dashboardHintClass(), "font-normal")}>
                {kioskPay?.hasPaystackCredentials
                  ? `configured ${kioskPay.paystackPublicKeyHint ?? ""}`
                  : "not configured"}
              </span>
            </p>
            {kioskPay?.hasPaystackCredentials ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 rounded-none px-2 text-xs text-destructive hover:text-destructive"
                disabled={kioskSaving}
                onClick={onClearPaystack}
              >
                Clear
              </Button>
            ) : null}
          </div>
          <select
            className={dashboardSelectClass()}
            value={paystackEnv}
            onChange={(e) => onPaystackEnv(e.target.value)}
            aria-label="Paystack environment"
          >
            <option value="sandbox">Sandbox</option>
            <option value="production">Production</option>
          </select>
          <Input
            className={cn(dashboardInputClass(), "font-mono")}
            placeholder="pk_… public key"
            value={paystackPublic}
            onChange={(e) => onPaystackPublic(e.target.value)}
          />
          <Input
            className={cn(dashboardInputClass(), "font-mono")}
            type="password"
            autoComplete="off"
            placeholder="sk_… secret key"
            value={paystackSecret}
            onChange={(e) => onPaystackSecret(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold tracking-[-0.015em]">
              KopoKopo (withdraw){" "}
              <span className={cn(dashboardHintClass(), "font-normal")}>
                {kioskPay?.hasKopokopoCredentials ? "configured" : "not configured"}
              </span>
            </p>
            {kioskPay?.hasKopokopoCredentials ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 rounded-none px-2 text-xs text-destructive hover:text-destructive"
                disabled={kioskSaving}
                onClick={onClearKopokopo}
              >
                Clear
              </Button>
            ) : null}
          </div>
          <select
            className={dashboardSelectClass()}
            value={kopokopoEnv}
            onChange={(e) => onKopokopoEnv(e.target.value)}
            aria-label="KopoKopo environment"
          >
            <option value="sandbox">Sandbox</option>
            <option value="production">Production</option>
          </select>
          <Input
            className={cn(dashboardInputClass(), "font-mono")}
            placeholder="Client ID"
            value={kkClientId}
            onChange={(e) => onKkClientId(e.target.value)}
          />
          <Input
            className={cn(dashboardInputClass(), "font-mono")}
            type="password"
            autoComplete="off"
            placeholder="Client Secret"
            value={kkClientSecret}
            onChange={(e) => onKkClientSecret(e.target.value)}
          />
          <Input
            className={cn(dashboardInputClass(), "font-mono")}
            type="password"
            autoComplete="off"
            placeholder="API Key"
            value={kkApiKey}
            onChange={(e) => onKkApiKey(e.target.value)}
          />
          <Input
            className={dashboardInputClass()}
            placeholder="Till number"
            value={kkTill}
            onChange={(e) => onKkTill(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export function WalletsPanel({
  accountSummary,
  accounts,
  accountsLoading,
  withdrawals,
  onRefresh,
  onAdjust,
}: {
  accountSummary: SaKioskPayAccountSummary | null;
  accounts: SaKioskPayAccountRow[];
  accountsLoading: boolean;
  withdrawals: SaKioskPayWithdrawalRow[];
  onRefresh: () => void;
  onAdjust: (account: SaKioskPayAccountRow) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-none"
          disabled={accountsLoading}
          onClick={onRefresh}
        >
          {accountsLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            "Refresh"
          )}
        </Button>
      </div>
      {accountSummary ? (
        <div className={cn("grid gap-3 border bg-white p-3 sm:grid-cols-2", HAIRLINE)}>
          <SummaryTile label="Accounts" value={String(accountSummary.accountCount)} />
          <SummaryTile label="Available float" value={money(accountSummary.totalAvailable)} />
          <SummaryTile label="Pending (withdraw)" value={money(accountSummary.totalPending)} />
          <SummaryTile label="Lifetime in" value={money(accountSummary.totalLifetimeIn)} />
          <SummaryTile
            label="Lifetime out"
            value={money(accountSummary.totalLifetimeOut)}
          />
        </div>
      ) : null}
      {accounts.length > 0 ? (
        <ul className={cn("divide-y border bg-white", HAIRLINE)}>
          {accounts.map((a) => (
            <li key={a.businessId} className="flex items-start justify-between gap-3 px-3 py-3">
              <div className="min-w-0">
                <p className="font-mono text-[12px]">{shortId(a.businessId)}</p>
                <p className="mt-1 text-[13px] tabular-nums">
                  {money(a.availableBalance)}{" "}
                  <span className="text-muted-foreground">available</span>
                </p>
                <p className={cn(dashboardHintClass(), "tabular-nums")}>
                  Pending {money(a.pendingBalance)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant={a.status === "ACTIVE" ? "success" : "secondary"}>
                  {a.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-none"
                  onClick={() => onAdjust(a)}
                >
                  Adjust
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={cn(dashboardHintClass(), "px-1 py-6 text-center")}>
          No tenant Kiosk Pay accounts yet.
        </p>
      )}
      {withdrawals.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[13px] font-semibold tracking-[-0.015em]">Recent withdrawals</p>
          <ul className={cn("divide-y border bg-white", HAIRLINE)}>
            {withdrawals.map((w) => (
              <li key={w.id} className="px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-[12px]">{shortId(w.businessId)}</p>
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
                <p className="mt-1 text-[13px] tabular-nums">{money(w.amount)}</p>
                <p className={dashboardHintClass()}>{w.phoneNumber}</p>
                {w.failureReason ? (
                  <p className={cn(dashboardHintClass(), "mt-1")}>{w.failureReason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function DarajaPanel({
  daraja,
  darajaSaving,
  darajaEnv,
  darajaShortcodeType,
  darajaShortcode,
  darajaConsumerKey,
  darajaConsumerSecret,
  darajaPasskey,
  darajaInitiatorName,
  darajaInitiatorPassword,
  darajaB2bShortcode,
  onEnabledChange,
  onDarajaEnv,
  onShortcodeType,
  onShortcode,
  onConsumerKey,
  onConsumerSecret,
  onPasskey,
  onInitiatorName,
  onInitiatorPassword,
  onB2bShortcode,
  onClearCreds,
  onClearDisburse,
}: {
  daraja: PlatformDarajaSettingsRecord | null;
  darajaSaving: boolean;
  darajaEnv: string;
  darajaShortcodeType: string;
  darajaShortcode: string;
  darajaConsumerKey: string;
  darajaConsumerSecret: string;
  darajaPasskey: string;
  darajaInitiatorName: string;
  darajaInitiatorPassword: string;
  darajaB2bShortcode: string;
  onEnabledChange: (on: boolean) => void;
  onDarajaEnv: (v: string) => void;
  onShortcodeType: (v: string) => void;
  onShortcode: (v: string) => void;
  onConsumerKey: (v: string) => void;
  onConsumerSecret: (v: string) => void;
  onPasskey: (v: string) => void;
  onInitiatorName: (v: string) => void;
  onInitiatorPassword: (v: string) => void;
  onB2bShortcode: (v: string) => void;
  onClearCreds: () => void;
  onClearDisburse: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className={cn("flex items-center justify-between gap-2 border bg-white px-3 py-2.5", HAIRLINE)}>
        <div>
          <p className="text-[13px] font-semibold tracking-[-0.015em]">Enabled</p>
          <p className={dashboardHintClass()}>
            Fallback Paybill/Till when a shop has no BYO STK gateway.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={daraja?.enabled ? "success" : "secondary"}>
            {daraja?.enabled ? "On" : "Off"}
          </Badge>
          <Switch
            checked={Boolean(daraja?.enabled)}
            disabled={darajaSaving || !daraja}
            onCheckedChange={onEnabledChange}
          />
        </div>
      </div>

      <p className={cn(dashboardHintClass(), "leading-relaxed")}>
        Lipa Na M-Pesa STK with Party A = customer phone and Party B = the shortcode
        below. API keys are encrypted in the database, never set in env. Register
        callback URLs on the Daraja portal:{" "}
        <span className="font-mono text-[10px]">/webhooks/daraja/stk</span>,{" "}
        <span className="font-mono text-[10px]">/webhooks/daraja/c2b/validation</span>,{" "}
        <span className="font-mono text-[10px]">/webhooks/daraja/c2b/confirmation</span>.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="sa-daraja-env" label="Environment">
          <select
            id="sa-daraja-env"
            className={dashboardSelectClass()}
            value={darajaEnv}
            onChange={(e) => onDarajaEnv(e.target.value)}
          >
            <option value="sandbox">Sandbox</option>
            <option value="production">Production</option>
          </select>
        </Field>
        <Field id="sa-daraja-type" label="Shortcode type (Party B)">
          <select
            id="sa-daraja-type"
            className={dashboardSelectClass()}
            value={darajaShortcodeType}
            onChange={(e) => onShortcodeType(e.target.value)}
          >
            <option value="paybill">Paybill</option>
            <option value="till">Buy Goods till</option>
          </select>
        </Field>
        <Field id="sa-daraja-shortcode" label="Shortcode *" className="sm:col-span-2">
          <Input
            id="sa-daraja-shortcode"
            className={dashboardInputClass()}
            value={darajaShortcode}
            onChange={(e) => onShortcode(e.target.value)}
            placeholder="174379"
            autoComplete="off"
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold tracking-[-0.015em]">
          API credentials{" "}
          {daraja?.hasCredentials ? (
            <span className={cn(dashboardHintClass(), "font-normal")}>
              saved{daraja.consumerKeyHint ? ` · ${daraja.consumerKeyHint}` : ""}
            </span>
          ) : (
            <span className={cn(dashboardHintClass(), "font-normal")}>not set</span>
          )}
        </p>
        {daraja?.hasCredentials ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-none"
            onClick={onClearCreds}
          >
            Clear
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3">
        <Field id="sa-daraja-key" label="Consumer key">
          <Input
            id="sa-daraja-key"
            className={dashboardInputClass()}
            type="password"
            value={darajaConsumerKey}
            onChange={(e) => onConsumerKey(e.target.value)}
            placeholder={daraja?.hasCredentials ? "Leave blank to keep" : "Required"}
            autoComplete="off"
          />
        </Field>
        <Field id="sa-daraja-secret" label="Consumer secret">
          <Input
            id="sa-daraja-secret"
            className={dashboardInputClass()}
            type="password"
            value={darajaConsumerSecret}
            onChange={(e) => onConsumerSecret(e.target.value)}
            placeholder={daraja?.hasCredentials ? "Leave blank to keep" : "Required"}
            autoComplete="off"
          />
        </Field>
        <Field id="sa-daraja-passkey" label="Lipa Na M-Pesa passkey">
          <Input
            id="sa-daraja-passkey"
            className={dashboardInputClass()}
            type="password"
            value={darajaPasskey}
            onChange={(e) => onPasskey(e.target.value)}
            placeholder={daraja?.hasCredentials ? "Leave blank to keep" : "Required"}
            autoComplete="off"
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold tracking-[-0.015em]">
          B2B disburse{" "}
          {daraja?.disburseConfigured ? (
            <span className={cn(dashboardHintClass(), "font-normal")}>
              configured{daraja.initiatorName ? ` · ${daraja.initiatorName}` : ""}
            </span>
          ) : (
            <span className={cn(dashboardHintClass(), "font-normal")}>not set</span>
          )}
        </p>
        {daraja?.disburseConfigured ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-none"
            onClick={onClearDisburse}
          >
            Clear
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="sa-daraja-initiator" label="B2B initiator name">
          <Input
            id="sa-daraja-initiator"
            className={dashboardInputClass()}
            value={darajaInitiatorName}
            onChange={(e) => onInitiatorName(e.target.value)}
            placeholder="e.g. kioskapi"
            autoComplete="off"
          />
        </Field>
        <Field id="sa-daraja-initiator-pw" label="B2B initiator password">
          <Input
            id="sa-daraja-initiator-pw"
            className={dashboardInputClass()}
            type="password"
            value={darajaInitiatorPassword}
            onChange={(e) => onInitiatorPassword(e.target.value)}
            placeholder={
              daraja?.disburseConfigured ? "Leave blank to keep" : "Required for custody settle"
            }
            autoComplete="off"
          />
        </Field>
        <Field id="sa-daraja-b2b-shortcode" label="B2B sending shortcode" className="sm:col-span-2">
          <Input
            id="sa-daraja-b2b-shortcode"
            className={dashboardInputClass()}
            value={darajaB2bShortcode}
            onChange={(e) => onB2bShortcode(e.target.value)}
            placeholder={daraja?.shortcode ?? "Defaults to the shortcode above"}
            autoComplete="off"
          />
          <p className={cn(dashboardHintClass(), "leading-snug")}>
            Used to settle a shop&apos;s till/paybill after a Kiosk-collected payment
            (Daraja B2B). Requires the Safaricom B2B product on this shortcode. The
            Safaricom public certificate is supplied at deploy time via
            APP_PAYMENTS_DARAJA_SECURITY_CERTIFICATE_PEM.
          </p>
        </Field>
      </div>
    </div>
  );
}

export function CustodyPanel({
  mpesaCustody,
  daraja,
  custodySaving,
  onProviderChange,
}: {
  mpesaCustody: PlatformMpesaCustodySettingsRecord | null;
  daraja: PlatformDarajaSettingsRecord | null;
  custodySaving: boolean;
  onProviderChange: (value: "OFF" | "KOPOKOPO" | "DARAJA") => void;
}) {
  return (
    <div className="space-y-4">
      <p className={cn(dashboardHintClass(), "leading-relaxed")}>
        When a shop enters only their till or paybill (no API keys), Kiosk collects
        and settles on one rail end-to-end. Never mix Daraja collect with KopoKopo
        settle.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            {
              key: "kk",
              label: "KopoKopo",
              ready: !!mpesaCustody?.kopokopoReady,
              detail: mpesaCustody?.kopokopoReady ? "Ready" : "Not ready",
            },
            {
              key: "dj-collect",
              label: "Daraja collect",
              ready: !!mpesaCustody?.darajaReady,
              detail: mpesaCustody?.darajaReady
                ? "Ready"
                : !daraja?.enabled
                  ? "Enable Daraja"
                  : !daraja?.hasCredentials
                    ? "Add Daraja keys"
                    : "Not ready",
            },
            {
              key: "dj-disburse",
              label: "Daraja disburse",
              ready: !!mpesaCustody?.darajaDisburseAvailable,
              detail: mpesaCustody?.darajaDisburseAvailable
                ? "Ready"
                : !daraja?.enabled
                  ? "Enable Daraja"
                  : !daraja?.hasCredentials
                    ? "Add Daraja keys"
                    : !daraja?.disburseConfigured
                      ? "Add B2B initiator"
                      : "Check certificate env",
            },
          ] as const
        ).map((chip) => (
          <span
            key={chip.key}
            className={cn(
              "inline-flex items-center gap-1.5 border px-2 py-1 text-[11px] font-semibold tracking-[-0.02em]",
              chip.ready
                ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
                : cn(HAIRLINE, "bg-white text-muted-foreground"),
            )}
          >
            <span
              className={cn(
                "size-1.5 shrink-0",
                chip.ready
                  ? "bg-[var(--pos-primary,#0f766e)]"
                  : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_28%,transparent)]",
              )}
              aria-hidden
            />
            {chip.label}
            <span className="font-medium opacity-80">· {chip.detail}</span>
          </span>
        ))}
      </div>

      <fieldset className="space-y-2">
        <legend className={dashboardLabelClass()}>Active provider</legend>
        <div className={cn("grid gap-px border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] sm:grid-cols-3", HAIRLINE)}>
          {(
            [
              {
                value: "OFF" as const,
                title: "Off",
                hint: "Tenants cannot use till-only",
                disabled: false,
              },
              {
                value: "KOPOKOPO" as const,
                title: "KopoKopo",
                hint: "STK + Send Money",
                disabled: !mpesaCustody?.kopokopoReady,
              },
              {
                value: "DARAJA" as const,
                title: "Daraja",
                hint: "Unavailable until disburse ships",
                disabled: !mpesaCustody?.darajaDisburseAvailable,
              },
            ]
          ).map((opt) => {
            const active = (mpesaCustody?.custodyProvider ?? "OFF") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={custodySaving || !mpesaCustody || opt.disabled}
                onClick={() => onProviderChange(opt.value)}
                className={cn(
                  "flex min-h-[4.25rem] flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
                    : "bg-white text-[var(--order-ink,#15231f)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                )}
                aria-pressed={active}
              >
                <span className="text-[13px] font-semibold tracking-[-0.02em]">
                  {opt.title}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-snug",
                    active
                      ? "text-[color-mix(in_srgb,var(--pos-primary,#0f766e)_78%,transparent)]"
                      : "text-muted-foreground",
                  )}
                >
                  {opt.hint}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

export function SettlementsPanel({
  custodySettlements,
  retryingSettlement,
  onRetry,
}: {
  custodySettlements: PlatformCustodySettlementRecord[];
  retryingSettlement: string | null;
  onRetry: (id: string) => void;
}) {
  if (custodySettlements.length === 0) {
    return (
      <p className={cn(dashboardHintClass(), "px-1 py-8 text-center")}>
        No custody settlements yet. Model B auto-settle: platform collect then
        Send Money to the shop&apos;s till/paybill.
      </p>
    );
  }
  return (
    <ul className={cn("divide-y border bg-white", HAIRLINE)}>
      {custodySettlements.map((s) => (
        <li key={s.id} className="space-y-1.5 px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[12px]">{shortId(s.businessId)}</p>
            <Badge
              variant={
                s.status === "SETTLED"
                  ? "success"
                  : s.status === "FAILED"
                    ? "destructive"
                    : "secondary"
              }
            >
              {s.status}
            </Badge>
          </div>
          <p className="text-[13px] tabular-nums">{money(Number(s.amount))}</p>
          <p className={dashboardHintClass()}>
            {s.provider} ·{" "}
            {s.destinationType === "till"
              ? `Till ${s.destinationTill ?? "—"}`
              : `Paybill ${s.destinationPaybill ?? "—"} · ${s.destinationAccount ?? "—"}`}
          </p>
          {s.failureReason ? (
            <p className={cn(dashboardHintClass(), "line-clamp-2")} title={s.failureReason}>
              {s.failureReason}
            </p>
          ) : null}
          {s.status === "FAILED" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-none"
              disabled={retryingSettlement === s.id}
              onClick={() => onRetry(s.id)}
            >
              {retryingSettlement === s.id ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                "Retry"
              )}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ByoGatewaysPanel({
  gateways,
  saving,
  onToggle,
}: {
  gateways: PlatformGatewayRecord[];
  saving: string | null;
  onToggle: (gatewayType: string, current: PlatformGatewayRecord) => void;
}) {
  if (gateways.length === 0) {
    return (
      <p className={cn(dashboardHintClass(), "px-1 py-8 text-center")}>
        No gateways returned from the API.
      </p>
    );
  }
  return (
    <ul className={cn("divide-y border bg-white", HAIRLINE)}>
      {gateways.map((gw) => (
        <li key={gw.gatewayType} className="flex items-start justify-between gap-4 px-3 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <PaymentBrandMark
              gatewayType={gw.gatewayType}
              displayName={gw.displayName}
              logoUrl={gw.logoUrl}
              size="md"
              className="mt-0.5"
            />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-[-0.015em]">{gw.displayName}</p>
              {gw.description ? (
                <p className={cn(dashboardHintClass(), "mt-0.5 leading-relaxed")}>
                  {gw.description}
                </p>
              ) : null}
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{gw.gatewayType}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={gw.isEnabled ? "success" : "secondary"}>
              {gw.isEnabled ? "On" : "Off"}
            </Badge>
            <Switch
              checked={gw.isEnabled}
              disabled={saving === gw.gatewayType}
              onCheckedChange={() => onToggle(gw.gatewayType, gw)}
              aria-label={`${gw.isEnabled ? "Disable" : "Enable"} ${gw.displayName}`}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
