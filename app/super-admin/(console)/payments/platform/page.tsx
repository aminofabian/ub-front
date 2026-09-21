"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { PlatformAirtimeSection } from "@/components/super-admin/platform-airtime-section";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
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
import {
  type PlatformGatewayRecord,
  type PatchPlatformGatewayPayload,
  type PlatformCustodySettlementRecord,
  type PlatformDarajaSettingsRecord,
  type PlatformKioskPaySettingsRecord,
  type PlatformMpesaCustodySettingsRecord,
  type SaKioskPayAccountRow,
  type SaKioskPayAccountSummary,
  type SaKioskPayWithdrawalRow,
  type TenantPaymentMethodsOverview,
  adjustSaKioskPayAccount,
  fetchPlatformCustodySettlements,
  fetchPlatformDarajaSettings,
  fetchPlatformGateways,
  fetchPlatformMpesaCustodySettings,
  fetchSaKioskPayAccountSummary,
  fetchSaKioskPayAccounts,
  fetchSaKioskPayWithdrawals,
  fetchTenantPaymentMethodsOverview,
  patchPlatformDarajaSettings,
  patchPlatformGateway,
  fetchPlatformKioskPaySettings,
  patchPlatformKioskPaySettings,
  patchPlatformMpesaCustodySettings,
  resumeSaKioskPayWithdrawals,
  retryPlatformCustodySettlement,
  testPlatformDarajaConnection,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  ByoGatewaysPanel,
  CustodyPanel,
  DarajaPanel,
  KioskPayPanel,
  SettlementsPanel,
  WalletsPanel,
  money,
  shortId,
} from "./_components/platform-payments-panels";
import { TenantMethodsPanel } from "./_components/tenant-methods-panel";
import {
  PLATFORM_PAYMENTS_NAV,
  PlatformPaymentsTheatre,
  type PlatformPaymentsSectionId,
} from "./_components/platform-payments-theatre";

const PRIMARY_BTN =
  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white shadow-none hover:bg-[#0d6b63]";

function sectionFromHash(hash: string): PlatformPaymentsSectionId | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (PLATFORM_PAYMENTS_NAV.some((item) => item.id === id)) {
    return id as PlatformPaymentsSectionId;
  }
  return null;
}

export default function SuperAdminPlatformPaymentsPage() {
  const [gateways, setGateways] = useState<PlatformGatewayRecord[]>([]);
  const [kioskPay, setKioskPay] = useState<PlatformKioskPaySettingsRecord | null>(null);
  const [daraja, setDaraja] = useState<PlatformDarajaSettingsRecord | null>(null);
  const [mpesaCustody, setMpesaCustody] = useState<PlatformMpesaCustodySettingsRecord | null>(
    null,
  );
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [kioskSaving, setKioskSaving] = useState(false);
  const [darajaSaving, setDarajaSaving] = useState(false);
  const [darajaTesting, setDarajaTesting] = useState(false);
  const [custodySaving, setCustodySaving] = useState(false);

  const [accounts, setAccounts] = useState<SaKioskPayAccountRow[]>([]);
  const [accountSummary, setAccountSummary] = useState<SaKioskPayAccountSummary | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<SaKioskPayAccountRow | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [withdrawals, setWithdrawals] = useState<SaKioskPayWithdrawalRow[]>([]);
  const [resumingFloat, setResumingFloat] = useState(false);
  const [custodySettlements, setCustodySettlements] = useState<
    PlatformCustodySettlementRecord[]
  >([]);
  const [retryingSettlement, setRetryingSettlement] = useState<string | null>(null);
  const [tenantMethods, setTenantMethods] =
    useState<TenantPaymentMethodsOverview | null>(null);

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

  const [darajaEnv, setDarajaEnv] = useState("sandbox");
  const [darajaShortcodeType, setDarajaShortcodeType] = useState("paybill");
  const [darajaShortcode, setDarajaShortcode] = useState("");
  const [darajaConsumerKey, setDarajaConsumerKey] = useState("");
  const [darajaConsumerSecret, setDarajaConsumerSecret] = useState("");
  const [darajaPasskey, setDarajaPasskey] = useState("");
  const [darajaInitiatorName, setDarajaInitiatorName] = useState("");
  const [darajaInitiatorPassword, setDarajaInitiatorPassword] = useState("");
  const [darajaB2bShortcode, setDarajaB2bShortcode] = useState("");
  const [activeSection, setActiveSection] =
    useState<PlatformPaymentsSectionId | null>(null);
  const [booting, setBooting] = useState(true);

  const reload = useCallback(async () => {
    setLoadError("");
    setAccountsLoading(true);
    try {
      const [gws, kp, dj, custody, accs, summ, wds, sx, methods] = await Promise.all([
        fetchPlatformGateways(),
        fetchPlatformKioskPaySettings(),
        fetchPlatformDarajaSettings(),
        fetchPlatformMpesaCustodySettings().catch(() => null),
        fetchSaKioskPayAccounts(50).catch(() => []),
        fetchSaKioskPayAccountSummary().catch(() => null),
        fetchSaKioskPayWithdrawals(20).catch(() => []),
        fetchPlatformCustodySettlements(20).catch(() => []),
        fetchTenantPaymentMethodsOverview().catch(() => null),
      ]);
      setGateways(gws);
      setKioskPay(kp);
      setDaraja(dj);
      setMpesaCustody(custody);
      setAccounts(accs);
      setAccountSummary(summ);
      setWithdrawals(wds);
      setCustodySettlements(sx);
      setTenantMethods(methods);
      setMinWithdraw(String(kp.minWithdrawAmount ?? 20));
      setDailyLimit(String(kp.dailyWithdrawLimit ?? 200000));
      setPaystackEnv(kp.paystackEnvironment ?? "sandbox");
      setKopokopoEnv(kp.kopokopoEnvironment ?? "sandbox");
      setDarajaEnv(dj.environment ?? "sandbox");
      setDarajaShortcodeType(dj.shortcodeType ?? "paybill");
      setDarajaShortcode(dj.shortcode ?? "");
      setDarajaInitiatorName(dj.initiatorName ?? "");
      setDarajaB2bShortcode(dj.b2bShortcode ?? "");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load platform payments.");
    } finally {
      setAccountsLoading(false);
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const applyHash = () => {
      const id = sectionFromHash(window.location.hash);
      if (id) setActiveSection(id);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

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

  const retrySettlement = async (id: string) => {
    setRetryingSettlement(id);
    try {
      await retryPlatformCustodySettlement(id);
      toast.success("Settlement retry queued.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not retry settlement.");
    } finally {
      setRetryingSettlement(null);
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

  const saveDaraja = async (enabled?: boolean) => {
    setDarajaSaving(true);
    try {
      const next = await patchPlatformDarajaSettings({
        enabled: enabled ?? daraja?.enabled,
        environment: darajaEnv,
        shortcodeType: darajaShortcodeType,
        shortcode: darajaShortcode.trim(),
        ...(darajaConsumerKey.trim() ? { consumerKey: darajaConsumerKey.trim() } : {}),
        ...(darajaConsumerSecret.trim() ? { consumerSecret: darajaConsumerSecret.trim() } : {}),
        ...(darajaPasskey.trim() ? { passkey: darajaPasskey.trim() } : {}),
        ...(darajaInitiatorName.trim() ? { initiatorName: darajaInitiatorName.trim() } : {}),
        ...(darajaInitiatorPassword.trim()
          ? { initiatorPassword: darajaInitiatorPassword.trim() }
          : {}),
        ...(darajaB2bShortcode.trim() ? { b2bShortcode: darajaB2bShortcode.trim() } : {}),
      });
      setDaraja(next);
      setDarajaConsumerKey("");
      setDarajaConsumerSecret("");
      setDarajaPasskey("");
      setDarajaInitiatorPassword("");
      toast.success("Daraja settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save Daraja.");
    } finally {
      setDarajaSaving(false);
    }
  };

  const testDaraja = async () => {
    setDarajaTesting(true);
    try {
      await testPlatformDarajaConnection();
      toast.success("Daraja OAuth OK — credentials are valid.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Daraja connection test failed.");
    } finally {
      setDarajaTesting(false);
    }
  };

  const saveCustodyProvider = async () => {
    if (!mpesaCustody) return;
    setCustodySaving(true);
    try {
      const next = await patchPlatformMpesaCustodySettings({
        custodyProvider: mpesaCustody.custodyProvider,
      });
      setMpesaCustody(next);
      toast.success("Platform custody provider saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save custody provider.");
      void reload();
    } finally {
      setCustodySaving(false);
    }
  };

  const clearDarajaCreds = () => {
    showThemedConfirmToast({
      id: "clear-daraja-platform",
      title: "Clear Daraja credentials?",
      description:
        "Platform Safaricom STK / Paybill collection will stop until new credentials are saved.",
      confirmLabel: "Clear credentials",
      onConfirm: async () => {
        setDarajaSaving(true);
        try {
          const next = await patchPlatformDarajaSettings({
            enabled: false,
            clearCredentials: true,
          });
          setDaraja(next);
          toast.success("Daraja credentials cleared.");
          await reload();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not clear credentials.");
        } finally {
          setDarajaSaving(false);
        }
      },
    });
  };

  const clearDarajaDisburseCreds = () => {
    const custodyUsesDaraja = mpesaCustody?.custodyProvider === "DARAJA";
    showThemedConfirmToast({
      id: "clear-daraja-disburse",
      title: "Clear Daraja B2B credentials?",
      description: custodyUsesDaraja
        ? "Daraja is the active custody provider. Clearing B2B stops till/paybill-only settlement and will switch Platform custody provider to Off."
        : "Kiosk-collected payments will no longer settle to tenant tills/paybills on Daraja.",
      confirmLabel: "Clear B2B credentials",
      onConfirm: async () => {
        setDarajaSaving(true);
        try {
          const next = await patchPlatformDarajaSettings({
            clearDisburseCredentials: true,
          });
          setDaraja(next);
          setDarajaInitiatorName("");
          setDarajaInitiatorPassword("");
          setDarajaB2bShortcode("");
          if (custodyUsesDaraja) {
            const custody = await patchPlatformMpesaCustodySettings({
              custodyProvider: "OFF",
            });
            setMpesaCustody(custody);
          }
          toast.success("Daraja B2B credentials cleared.");
          await reload();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not clear B2B credentials.");
        } finally {
          setDarajaSaving(false);
        }
      },
    });
  };

  const enabledCount = gateways.filter((g) => g.isEnabled).length;
  const custodyLabel =
    !mpesaCustody
      ? "—"
      : mpesaCustody.custodyProvider === "OFF"
        ? "Off"
        : mpesaCustody.custodyProvider === "KOPOKOPO"
          ? "KopoKopo"
          : "Daraja";
  const attentionHint = kioskPay?.sendMoneyFloatConstrainedUntil
    ? "Kiosk Pay withdrawals paused on low Send Money float"
    : daraja?.enabled && !daraja.hasCredentials
      ? "Daraja is on but API keys are missing"
      : mpesaCustody?.custodyProvider === "OFF"
        ? "Till-only shops cannot collect until a custody rail is on"
        : "Collect and settle on one rail";

  const sectionSummary = useCallback(
    (sectionId: PlatformPaymentsSectionId) => {
      switch (sectionId) {
        case "tenant-methods":
          return (
            <>
              <span className="font-semibold tabular-nums">
                {tenantMethods?.tenantsWithAnyMethod ?? "—"}
              </span>
              {" of "}
              <span className="font-semibold tabular-nums">
                {tenantMethods?.totalBusinesses ?? "—"}
              </span>{" "}
              tenants configured
              {" · "}
              <span className="font-semibold tabular-nums">
                {tenantMethods?.tenantsWithCustody ?? 0}
              </span>{" "}
              Lipa
            </>
          );
        case "kiosk-pay":
          return (
            <>
              Kiosk Pay{" "}
              <span className="font-semibold">{kioskPay?.enabled ? "on" : "off"}</span>
              {" · "}
              Paystack {kioskPay?.hasPaystackCredentials ? "configured" : "not set"}
              {" · "}
              KopoKopo {kioskPay?.hasKopokopoCredentials ? "configured" : "not set"}
            </>
          );
        case "wallets":
          return (
            <>
              <span className="font-semibold tabular-nums">
                {accountSummary?.accountCount ?? accounts.length}
              </span>{" "}
              accounts · available{" "}
              <span className="font-semibold tabular-nums">
                {money(accountSummary?.totalAvailable)}
              </span>
            </>
          );
        case "daraja":
          return (
            <>
              Daraja <span className="font-semibold">{daraja?.enabled ? "on" : "off"}</span>
              {" · "}
              {daraja?.hasCredentials ? "keys saved" : "keys not set"}
              {" · "}
              B2B {daraja?.disburseConfigured ? "configured" : "not set"}
            </>
          );
        case "custody":
          return (
            <>
              Active rail{" "}
              <span className="font-semibold">{custodyLabel}</span>
            </>
          );
        case "settlements":
          return (
            <>
              <span className="font-semibold tabular-nums">{custodySettlements.length}</span>{" "}
              recent settlement{custodySettlements.length === 1 ? "" : "s"}
            </>
          );
        case "airtime":
          return <>Instalipa float, tenant commission, and recent top-ups.</>;
        case "byo-gateways":
          return (
            <>
              <span className="font-semibold tabular-nums">{gateways.length}</span> providers
              {" · "}
              <span className="font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
                {enabledCount}
              </span>{" "}
              enabled for tenants
            </>
          );
        default:
          return null;
      }
    },
    [
      tenantMethods,
      kioskPay,
      accountSummary,
      accounts.length,
      daraja,
      custodyLabel,
      custodySettlements.length,
      gateways.length,
      enabledCount,
    ],
  );

  const theatreDrawerBody = (() => {
    switch (activeSection) {
      case "tenant-methods":
        return <TenantMethodsPanel overview={tenantMethods} />;
      case "kiosk-pay":
        return (
          <KioskPayPanel
            kioskPay={kioskPay}
            kioskSaving={kioskSaving}
            resumingFloat={resumingFloat}
            minWithdraw={minWithdraw}
            dailyLimit={dailyLimit}
            paystackEnv={paystackEnv}
            paystackPublic={paystackPublic}
            paystackSecret={paystackSecret}
            kopokopoEnv={kopokopoEnv}
            kkClientId={kkClientId}
            kkClientSecret={kkClientSecret}
            kkApiKey={kkApiKey}
            kkTill={kkTill}
            onMinWithdraw={setMinWithdraw}
            onDailyLimit={setDailyLimit}
            onPaystackEnv={setPaystackEnv}
            onPaystackPublic={setPaystackPublic}
            onPaystackSecret={setPaystackSecret}
            onKopokopoEnv={setKopokopoEnv}
            onKkClientId={setKkClientId}
            onKkClientSecret={setKkClientSecret}
            onKkApiKey={setKkApiKey}
            onKkTill={setKkTill}
            onEnabledChange={(on) => void saveKioskPay(on)}
            onResumeWithdrawals={() => void resumeWithdrawals()}
            onClearPaystack={clearPaystackCreds}
            onClearKopokopo={clearKopokopoCreds}
          />
        );
      case "wallets":
        return (
          <WalletsPanel
            accountSummary={accountSummary}
            accounts={accounts}
            accountsLoading={accountsLoading}
            withdrawals={withdrawals}
            onRefresh={() => void reload()}
            onAdjust={(a) => {
              setAdjustTarget(a);
              setAdjustDelta("");
              setAdjustNote("");
            }}
          />
        );
      case "daraja":
        return (
          <DarajaPanel
            daraja={daraja}
            darajaSaving={darajaSaving}
            darajaEnv={darajaEnv}
            darajaShortcodeType={darajaShortcodeType}
            darajaShortcode={darajaShortcode}
            darajaConsumerKey={darajaConsumerKey}
            darajaConsumerSecret={darajaConsumerSecret}
            darajaPasskey={darajaPasskey}
            darajaInitiatorName={darajaInitiatorName}
            darajaInitiatorPassword={darajaInitiatorPassword}
            darajaB2bShortcode={darajaB2bShortcode}
            onEnabledChange={(on) => void saveDaraja(on)}
            onDarajaEnv={setDarajaEnv}
            onShortcodeType={setDarajaShortcodeType}
            onShortcode={setDarajaShortcode}
            onConsumerKey={setDarajaConsumerKey}
            onConsumerSecret={setDarajaConsumerSecret}
            onPasskey={setDarajaPasskey}
            onInitiatorName={setDarajaInitiatorName}
            onInitiatorPassword={setDarajaInitiatorPassword}
            onB2bShortcode={setDarajaB2bShortcode}
            onClearCreds={clearDarajaCreds}
            onClearDisburse={clearDarajaDisburseCreds}
          />
        );
      case "custody":
        return (
          <CustodyPanel
            mpesaCustody={mpesaCustody}
            daraja={daraja}
            custodySaving={custodySaving}
            onProviderChange={(value) =>
              setMpesaCustody((prev) =>
                prev ? { ...prev, custodyProvider: value } : prev,
              )
            }
          />
        );
      case "settlements":
        return (
          <SettlementsPanel
            custodySettlements={custodySettlements}
            retryingSettlement={retryingSettlement}
            onRetry={(id) => void retrySettlement(id)}
          />
        );
      case "airtime":
        return <PlatformAirtimeSection theatreMode />;
      case "byo-gateways":
        return (
          <ByoGatewaysPanel
            gateways={gateways}
            saving={saving}
            onToggle={(type, current) => void onToggle(type, current)}
          />
        );
      default:
        return null;
    }
  })();

  const drawerFooter = (() => {
    switch (activeSection) {
      case "kiosk-pay":
        return (
          <Button
            className={PRIMARY_BTN}
            disabled={kioskSaving}
            onClick={() => void saveKioskPay()}
          >
            {kioskSaving ? "Saving…" : "Save Kiosk Pay settings"}
          </Button>
        );
      case "daraja":
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              className={PRIMARY_BTN}
              disabled={darajaSaving}
              onClick={() => void saveDaraja()}
            >
              {darajaSaving ? "Saving…" : "Save Daraja settings"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-none"
              disabled={darajaTesting || darajaSaving || !daraja?.hasCredentials}
              onClick={() => void testDaraja()}
            >
              {darajaTesting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Testing…
                </>
              ) : (
                "Test connection"
              )}
            </Button>
          </div>
        );
      case "custody":
        return (
          <Button
            className={PRIMARY_BTN}
            disabled={custodySaving || !mpesaCustody}
            onClick={() => void saveCustodyProvider()}
          >
            {custodySaving ? "Saving…" : "Save custody provider"}
          </Button>
        );
      default:
        return undefined;
    }
  })();

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={CreditCard}
        eyebrow="Platform"
        title="Payments"
        description="Tenant methods, Kiosk Pay, Daraja, custody settle, airtime, and BYO gateways."
      >
        <button
          type="button"
          disabled={accountsLoading || booting}
          onClick={() => void reload()}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[#666666]",
            "transition-colors hover:border-[#0f766e] hover:text-[#0f766e]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label="Refresh platform payments"
        >
          <RefreshCw
            className={cn("size-3.5", (accountsLoading || booting) && "animate-spin")}
            aria-hidden
          />
        </button>
      </DashboardPageHero>

      {loadError ? (
        <DashboardFeedback kind="error" text={loadError} />
      ) : null}

      <PlatformPaymentsTheatre
        activeSectionId={activeSection}
        onActiveSectionChange={setActiveSection}
        gatewayCount={gateways.length}
        enabledCount={enabledCount}
        kioskPayOn={Boolean(kioskPay?.enabled)}
        custodyLabel={custodyLabel}
        tenantsConfigured={tenantMethods?.tenantsWithAnyMethod ?? null}
        totalTenants={tenantMethods?.totalBusinesses ?? null}
        loading={booting}
        attentionHint={attentionHint}
        sectionSummary={sectionSummary}
        drawerBody={theatreDrawerBody}
        drawerFooter={drawerFooter}
      />

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
