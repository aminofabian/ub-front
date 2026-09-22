"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Webhook,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { AirtimeSettingsSection } from "@/components/payments/airtime-settings-section";
import { GatewayConfigForm } from "@/components/payments/gateway-config-form";
import { GatewayStatusBadge } from "@/components/payments/gateway-status-badge";
import { PaymentBrandMark } from "@/components/payments/payment-brand-mark";
import { ManualMethodForm } from "@/components/payments/manual-method-form";
import { parseCustodyDestination } from "@/components/payments/custody-mpesa-method-form";
import {
  ReceiveMpesaFlow,
  receiveInitialFromCustodyJson,
} from "@/components/payments/receive-mpesa-flow";
import { SupplierPayoutSettingsSection } from "@/components/payments/supplier-payout-settings-section";
import { ProfitPocketSettingsSection } from "@/components/payments/profit-pocket-settings-section";
import { KioskPaySettingsSection } from "@/components/payments/kiosk-pay-settings-section";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import {
  activateGateway,
  createGatewayConfig,
  deactivateGateway,
  deleteGatewayConfig,
  fetchAvailableGateways,
  fetchDisplayInstructions,
  fetchGatewayCheckouts,
  fetchGatewayConfigs,
  fetchGatewayCredentialSettings,
  fetchMpesaCustodyAvailability,
  type DisplayInstructionRecord,
  type MpesaCustodyAvailabilityRecord,
  subscribeGatewayWebhookTills,
  testGatewayConnection,
  updateGatewayConfig,
  type AvailableGatewayRecord,
  type CreateGatewayConfigPayload,
  type GatewayCheckoutRecord,
  type GatewayConfigRecord,
  type GatewayCredentialSettingsRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import {
  AcceptPaymentsPanel,
  custodyProviderLabel,
  gatewayDisplayName,
  isCustodyMpesaGateway,
  isManualGateway,
} from "./_components/accept-payments-panel";
import {
  PAYMENTS_SETTINGS_NAV,
  PaymentsSettingsTheatre,
  type PaymentsSettingsSectionId,
} from "./_components/payments-settings-theatre";

type DrawerState =
  | { kind: "closed" }
  | { kind: "pick" }
  | { kind: "manual-create" }
  | { kind: "manual-edit"; config: GatewayConfigRecord }
  | { kind: "custody-create" }
  | { kind: "custody-edit"; config: GatewayConfigRecord }
  | {
      kind: "api-create";
      gatewayType: string;
      displayName: string;
    }
  | {
      kind: "api-edit";
      config: GatewayConfigRecord;
      displayName: string;
      credentialSettings: GatewayCredentialSettingsRecord | null;
    }
  | { kind: "manage"; config: GatewayConfigRecord };

function displayRecordToJson(record: DisplayInstructionRecord): string {
  const payload: Record<string, string> = {};
  if (record.type) payload.type = record.type;
  if (record.label) payload.label = record.label;
  if (record.instructions) payload.instructions = record.instructions;
  if (record.tillNumber) payload.tillNumber = record.tillNumber;
  if (record.businessNumber) payload.businessNumber = record.businessNumber;
  if (record.accountNumber) payload.accountNumber = record.accountNumber;
  if (record.bankName) payload.bankName = record.bankName;
  if (record.branchName) payload.branchName = record.branchName;
  if (record.accountName) payload.accountName = record.accountName;
  if (record.swiftCode) payload.swiftCode = record.swiftCode;
  return JSON.stringify(payload);
}

function checkoutStatusLabel(status: string | null): string {
  switch (status) {
    case "success":
      return "Paid";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

/** External merchant dashboards — settlement / withdrawals happen there, not in Kiosk. */
function providerDashboardUrl(
  gatewayType: string,
  environment: string | null | undefined,
): { href: string; label: string } | null {
  const production = (environment ?? "sandbox").toLowerCase() === "production";
  if (gatewayType === "PAYSTACK") {
    return {
      href: "https://dashboard.paystack.com/#/login",
      label: "Open Paystack Dashboard",
    };
  }
  if (gatewayType === "KOPOKOPO") {
    return {
      href: production
        ? "https://app.kopokopo.com"
        : "https://sandbox.kopokopo.com",
      label: production ? "Open KopoKopo Dashboard" : "Open KopoKopo Sandbox",
    };
  }
  return null;
}

function CheckoutStatusBadge({ status }: { status: string | null }) {
  const tone =
    status === "success"
      ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] text-[var(--pos-primary,#0f766e)]"
      : status === "failed"
        ? "border-[#9a2e16]/35 text-[#9a2e16]"
        : status === "cancelled"
          ? "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground"
          : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground";
  return (
    <span
      className={cn(
        "shrink-0 rounded-none border bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
        tone,
      )}
    >
      {checkoutStatusLabel(status)}
    </span>
  );
}

function formatCheckoutAmount(amount: number | null, currency: string | null) {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency ?? "KES",
    }).format(Number(amount));
  } catch {
    return String(amount);
  }
}

function sectionFromHash(hash: string): PaymentsSettingsSectionId | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (PAYMENTS_SETTINGS_NAV.some((item) => item.id === id)) {
    return id as PaymentsSettingsSectionId;
  }
  return null;
}

export default function PaymentGatewaySettingsPage() {
  const { me, business } = useDashboard();
  const canRead = hasPermission(
    me?.permissions,
    Permission.PaymentsGatewaysRead,
  );
  const canWrite = hasPermission(
    me?.permissions,
    Permission.PaymentsGatewaysWrite,
  );
  const canReadAirtime =
    hasPermission(me?.permissions, Permission.AirtimeRead) ||
    hasPermission(me?.permissions, Permission.AirtimeManage);

  const [activeSection, setActiveSection] =
    useState<PaymentsSettingsSectionId | null>(null);

  const [available, setAvailable] = useState<AvailableGatewayRecord[]>([]);
  const [configs, setConfigs] = useState<GatewayConfigRecord[]>([]);
  const [custodyAvailability, setCustodyAvailability] =
    useState<MpesaCustodyAvailabilityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>({ kind: "closed" });
  const [saving, setSaving] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [manualEditInitial, setManualEditInitial] = useState<
    Partial<{ label: string; displayInstructionsJson: string }> | undefined
  >(undefined);
  const [custodyEditInitial, setCustodyEditInitial] = useState<
    Partial<{ label: string; displayInstructionsJson: string }> | undefined
  >(undefined);
  const [checkoutRows, setCheckoutRows] = useState<
    GatewayCheckoutRecord[] | null
  >(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [manageEnvironment, setManageEnvironment] = useState<string | null>(
    null,
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [avail, list, custody] = await Promise.all([
        fetchAvailableGateways(),
        fetchGatewayConfigs(),
        fetchMpesaCustodyAvailability().catch(() => null),
      ]);
      setAvailable(avail);
      setConfigs(list);
      setCustodyAvailability(custody);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not load payment gateways.";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    void reload();
  }, [canRead, reload]);

  useEffect(() => {
    const applyHash = () => {
      const id = sectionFromHash(window.location.hash);
      if (id) setActiveSection(id);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const visibleSectionIds = useMemo((): PaymentsSettingsSectionId[] => {
    const ids: PaymentsSettingsSectionId[] = [
      "accept-payments",
      "kiosk-pay",
      "supplier-payouts",
      "profit-pocket",
    ];
    if (canReadAirtime) ids.push("airtime");
    return ids;
  }, [canReadAirtime]);

  const addableApi = useMemo(
    () =>
      available.filter(
        (a) =>
          a.gatewayType !== "MANUAL" &&
          a.gatewayType !== "CUSTODY_MPESA" &&
          !a.configured,
      ),
    [available],
  );

  const hasCustodyConfigured = configs.some((c) => c.gatewayType === "CUSTODY_MPESA");
  const hasManualConfigured = configs.some((c) => c.gatewayType === "MANUAL");

  const activeCount = configs.filter((c) => c.status === "ACTIVE").length;
  const draftOrErrorCount = configs.filter((c) =>
    ["DRAFT", "ERROR", "TESTED", "TESTING"].includes(c.status),
  ).length;
  const kopokopoNeedsAttention = configs.some(
    (c) => c.gatewayType === "KOPOKOPO" && c.status !== "ACTIVE",
  );

  const manageConfig = drawer.kind === "manage" ? drawer.config : null;
  const manageBusy = manageConfig ? rowBusyId === manageConfig.id : false;

  // Load recent Paystack checkout attempts when the Manage drawer opens on a
  // PAYSTACK config (admin visibility of storefront Paystack orders).
  useEffect(() => {
    const config = drawer.kind === "manage" ? drawer.config : null;
    if (!config || config.gatewayType !== "PAYSTACK") {
      setCheckoutRows(null);
      return;
    }
    let cancelled = false;
    setCheckoutLoading(true);
    fetchGatewayCheckouts(config.id, 10)
      .then((rows) => {
        if (cancelled) return;
        setCheckoutRows(rows);
      })
      .catch(() => {
        if (cancelled) return;
        setCheckoutRows([]);
      })
      .finally(() => {
        if (!cancelled) setCheckoutLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [drawer]);

  // Environment for dashboard links (sandbox vs production provider URLs).
  useEffect(() => {
    const config = drawer.kind === "manage" ? drawer.config : null;
    if (
      !config ||
      (config.gatewayType !== "PAYSTACK" && config.gatewayType !== "KOPOKOPO")
    ) {
      setManageEnvironment(null);
      return;
    }
    let cancelled = false;
    fetchGatewayCredentialSettings(config.id)
      .then((settings) => {
        if (cancelled) return;
        setManageEnvironment(settings.environment ?? "sandbox");
      })
      .catch(() => {
        if (cancelled) return;
        setManageEnvironment("sandbox");
      });
    return () => {
      cancelled = true;
    };
  }, [drawer]);

  const closeDrawer = () => setDrawer({ kind: "closed" });

  const onCreate = async (payload: CreateGatewayConfigPayload) => {
    setSaving(true);
    try {
      await createGatewayConfig(payload);
      toast.success("Payment method added.");
      closeDrawer();
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add gateway.");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const onUpdate = async (id: string, payload: CreateGatewayConfigPayload) => {
    setSaving(true);
    try {
      await updateGatewayConfig(id, payload);
      toast.success("Payment method updated.");
      closeDrawer();
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update gateway.");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (config: GatewayConfigRecord) => {
    if (isManualGateway(config)) {
      let displayInstructionsJson: string | undefined;
      try {
        const rows = await fetchDisplayInstructions();
        const row = rows.find((r) => r.configId === config.id);
        if (row) {
          displayInstructionsJson = displayRecordToJson(row);
        }
      } catch {
        /* inactive or unreadable — user can re-enter */
      }
      setManualEditInitial({
        label: config.label,
        displayInstructionsJson,
      });
      setDrawer({ kind: "manual-edit", config });
      return;
    }
    if (isCustodyMpesaGateway(config)) {
      setCustodyEditInitial({
        label: config.label,
        displayInstructionsJson: config.displayInstructionsJson ?? undefined,
      });
      setDrawer({ kind: "custody-edit", config });
      return;
    }
    const displayName =
      available.find((a) => a.gatewayType === config.gatewayType)
        ?.displayName ?? config.gatewayType;
    let credentialSettings: GatewayCredentialSettingsRecord | null = null;
    try {
      credentialSettings = await fetchGatewayCredentialSettings(config.id);
    } catch {
      credentialSettings = null;
    }
    setDrawer({
      kind: "api-edit",
      config,
      displayName,
      credentialSettings,
    });
  };

  const runRowAction = async (
    id: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setRowBusyId(id);
    try {
      await action();
      toast.success(successMessage);
      await reload();
      setDrawer((prev) => {
        if (prev.kind !== "manage") return prev;
        // Refresh managed row from latest list after reload via effect below
        return prev;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setRowBusyId(null);
    }
  };

  // Keep manage drawer in sync after reload
  useEffect(() => {
    if (drawer.kind !== "manage") return;
    const next = configs.find((c) => c.id === drawer.config.id);
    if (!next) {
      setDrawer({ kind: "closed" });
      return;
    }
    const prev = drawer.config;
    if (
      next.status !== prev.status ||
      next.label !== prev.label ||
      next.lastTestedAt !== prev.lastTestedAt ||
      next.isDefault !== prev.isDefault
    ) {
      setDrawer({ kind: "manage", config: next });
    }
  }, [configs, drawer]);

  const testConnection = async (config: GatewayConfigRecord) => {
    setRowBusyId(config.id);
    try {
      const result = await testGatewayConnection(config.id);
      if (result.success) {
        toast.success(
          isCustodyMpesaGateway(config)
            ? "Kiosk rail reachable — collect and settle on KopoKopo."
            : config.status === "ACTIVE"
              ? "Connection OK — gateway is ACTIVE."
              : "Connection OK — click Activate, then Till webhooks.",
        );
      } else {
        toast.error(
          result.errorMessage ||
            result.errorCode ||
            "KopoKopo connection failed. Check Client ID, Secret, API Key, and environment.",
        );
      }
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection test failed.");
    } finally {
      setRowBusyId(null);
    }
  };

  const subscribeTills = async (config: GatewayConfigRecord) => {
    setRowBusyId(config.id);
    try {
      let tills = ["3020127", "3502582"];
      try {
        const settings = await fetchGatewayCredentialSettings(config.id);
        const fromCreds = [
          ...(settings.tillNumber ?? "").split(/[,\s]+/),
          ...(settings.webhookTillNumbers ?? "").split(/[,\s]+/),
        ]
          .map((t) => t.trim())
          .filter((t) => /^\d{5,12}$/.test(t));
        if (fromCreds.length > 0) {
          tills = [...new Set(fromCreds)];
        }
      } catch {
        /* use defaults */
      }
      const result = await subscribeGatewayWebhookTills(config.id, tills);
      const ok = result.subscriptions.filter((s) => s.success).length;
      const fail = result.subscriptions.filter((s) => !s.success);
      if (fail.length === 0) {
        toast.success(
          `Webhook subscriptions active for ${ok} till(s). Callback: ${result.webhookUrl}`,
          { duration: 12_000 },
        );
      } else {
        toast.error(
          `Subscribed ${ok}/${result.subscriptions.length}. ${fail.map((f) => `${f.tillNumber}: ${f.errorMessage}`).join("; ")}`,
          { duration: 15_000 },
        );
      }
      await reload();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not subscribe webhooks.",
      );
    } finally {
      setRowBusyId(null);
    }
  };

  const sectionSummary = useCallback(
    (sectionId: PaymentsSettingsSectionId) => {
      switch (sectionId) {
        case "accept-payments":
          return (
            <>
              <span className="font-semibold tabular-nums">{configs.length}</span>{" "}
              method{configs.length === 1 ? "" : "s"} ·{" "}
              <span className="font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
                {activeCount}
              </span>{" "}
              active
              {draftOrErrorCount > 0 ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-[#9a2e16]">
                    {draftOrErrorCount} need attention
                  </span>
                </>
              ) : null}
            </>
          );
        case "kiosk-pay":
          return <>Wallet, storefront toggle, and M-Pesa withdraw in the panel.</>;
        case "supplier-payouts":
          return <>Send Money gateway, auto-pay schedule, and enable switch.</>;
        case "profit-pocket":
          return (
            <>Owner / expense destination for pocketing Hub cash surplus.</>
          );
        case "airtime":
          return <>POS and storefront airtime switches funded from Kiosk Pay.</>;
        default:
          return null;
      }
    },
    [configs.length, activeCount, draftOrErrorCount],
  );

  const theatreDrawerBody = useMemo(() => {
    switch (activeSection) {
      case "accept-payments":
        return (
          <AcceptPaymentsPanel
            loading={loading}
            configs={configs}
            available={available}
            canWrite={canWrite}
            rowBusyId={rowBusyId}
            kopokopoNeedsAttention={kopokopoNeedsAttention}
            custodyAvailability={custodyAvailability}
            onAddMethod={() => setDrawer({ kind: "pick" })}
            onEdit={(config) => void openEdit(config)}
            onManage={(config) => setDrawer({ kind: "manage", config })}
            compact
          />
        );
      case "supplier-payouts":
        return (
          <SupplierPayoutSettingsSection canWrite={canWrite} theatreMode />
        );
      case "profit-pocket":
        return (
          <ProfitPocketSettingsSection canWrite={canWrite} theatreMode />
        );
      case "kiosk-pay":
        return <KioskPaySettingsSection canWrite={canWrite} theatreMode />;
      case "airtime":
        return <AirtimeSettingsSection theatreMode />;
      default:
        return null;
    }
  }, [
    activeSection,
    loading,
    configs,
    available,
    canWrite,
    rowBusyId,
    kopokopoNeedsAttention,
    custodyAvailability,
    openEdit,
  ]);

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Payments"
        description="You do not have permission to view payment gateway settings."
      />
    );
  }

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={CreditCard}
        eyebrow="Money"
        title="Payments"
        description="Connect checkout providers, show till instructions to customers, and control how you pay suppliers with M-Pesa."
      >
        <button
          type="button"
          disabled={loading}
          onClick={() => void reload()}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[#666666]",
            "transition-colors hover:border-[#0f766e] hover:text-[#0f766e]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label="Refresh payment methods"
        >
          <RefreshCw
            className={cn("size-3.5", loading && "animate-spin")}
            aria-hidden
          />
        </button>
        {canWrite ? (
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white hover:bg-[#0d6b63]"
            onClick={() => setDrawer({ kind: "pick" })}
          >
            <Plus className="size-4" aria-hidden />
            Add method
          </Button>
        ) : null}
      </DashboardPageHero>

      {loadError ? <DashboardFeedback kind="error" text={loadError} /> : null}

      <PaymentsSettingsTheatre
        activeSectionId={activeSection}
        onActiveSectionChange={setActiveSection}
        visibleSectionIds={visibleSectionIds}
        methodsCount={configs.length}
        activeCount={activeCount}
        attentionCount={draftOrErrorCount}
        loading={loading}
        kopokopoNeedsAttention={kopokopoNeedsAttention}
        sectionSummary={sectionSummary}
        drawerBody={theatreDrawerBody}
      />

      {/* Pick provider */}
      <FormDrawer
        open={drawer.kind === "pick"}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        title="Add payment method"
        description="Choose a provider or add manual payment instructions for customers."
        contextLabel="Payments"
        icon={<Plus className="size-4" aria-hidden />}
        footer={
          <Button type="button" variant="outline" onClick={closeDrawer}>
            Cancel
          </Button>
        }
      >
        <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {canWrite && !hasManualConfigured ? (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)] active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]"
                onClick={() => setDrawer({ kind: "manual-create" })}
              >
                <span
                  className="grid size-7 shrink-0 place-items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                  aria-hidden
                >
                  T
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold tracking-[-0.015em] text-foreground">
                    Manual payment
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    Till, paybill, or bank — display only (no STK)
                  </span>
                </span>
                <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ) : null}
          {canWrite && !hasCustodyConfigured ? (
            <li>
              <button
                type="button"
                disabled={custodyAvailability != null && !custodyAvailability.available}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors",
                  custodyAvailability != null && !custodyAvailability.available
                    ? "cursor-not-allowed opacity-60"
                    : "hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] active:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)]",
                )}
                onClick={() => setDrawer({ kind: "custody-create" })}
              >
                <span
                  className="grid size-7 shrink-0 place-items-center border border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[10px] font-bold uppercase tracking-wide text-[var(--pos-primary,#0f766e)]"
                  aria-hidden
                >
                  C
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold tracking-[-0.015em] text-foreground">
                    Lipa Na M-Pesa — till, paybill, or bank
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {custodyAvailability != null && !custodyAvailability.available
                      ? (custodyAvailability.message ??
                        "Not available yet — ask Super Admin to enable a custody rail.")
                      : "No API keys. Prove it with a KES 1 prompt."}
                  </span>
                </span>
                <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ) : null}
          {addableApi.map((gw) => (
            <li key={gw.gatewayType}>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)] active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]"
                onClick={() =>
                  setDrawer({
                    kind: "api-create",
                    gatewayType: gw.gatewayType,
                    displayName: gw.displayName,
                  })
                }
              >
                <PaymentBrandMark
                  gatewayType={gw.gatewayType}
                  displayName={gw.displayName}
                  logoUrl={gw.logoUrl}
                  size="md"
                  className="shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold tracking-[-0.015em] text-foreground">
                    {gw.displayName}
                  </span>
                  {gw.description ? (
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {gw.description}
                    </span>
                  ) : null}
                </span>
                <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ))}
          {addableApi.length === 0 && !canWrite ? (
            <li className="px-3 py-8 text-center text-[12px] text-muted-foreground">
              No additional gateways available.
            </li>
          ) : null}
        </ul>
      </FormDrawer>

      {/* Manage gateway actions */}
      <FormDrawer
        open={drawer.kind === "manage"}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        title={manageConfig?.label ?? "Manage method"}
        description={
          manageConfig
            ? isCustodyMpesaGateway(manageConfig)
              ? "Lipa Na M-Pesa prompt — till or paybill only, no API keys"
              : `${gatewayDisplayName(manageConfig, available)} · ${manageConfig.status}`
            : undefined
        }
        contextLabel="Manage"
        icon={<MoreHorizontal className="size-4" aria-hidden />}
        width="wide"
        footer={
          <Button type="button" variant="outline" onClick={closeDrawer}>
            Close
          </Button>
        }
      >
        {manageConfig ? (
          <div className="space-y-5">
            {isCustodyMpesaGateway(manageConfig) ? (
              <CustodyManagePanel
                config={manageConfig}
                availability={custodyAvailability}
              />
            ) : (
              <div className="flex flex-wrap items-center gap-2 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-muted/20 px-3.5 py-3">
                <GatewayStatusBadge status={manageConfig.status} />
                {manageConfig.isDefault ? (
                  <span className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]">
                    Default
                  </span>
                ) : null}
                {manageConfig.lastTestedAt ? (
                  <span className="text-xs text-muted-foreground">
                    Last tested{" "}
                    {new Date(manageConfig.lastTestedAt).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Not tested yet
                  </span>
                )}
              </div>
            )}

            {!isCustodyMpesaGateway(manageConfig) ? (
            (() => {
              const raw = manageConfig.testErrorJson;
              if (!raw) return null;
              let code: string | null = null;
              let message = "";
              try {
                const parsed = JSON.parse(raw) as {
                  code?: string;
                  message?: string;
                };
                code = parsed.code ?? null;
                message = parsed.message ?? "";
              } catch {
                return null;
              }
              if (!message) return null;
              return (
                <p
                  role="status"
                  className="border border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_5%,white)] px-3 py-2 text-[12px] text-[#9a2e16]"
                >
                  <span className="font-semibold">Last test failed</span>
                  {code ? (
                    <span className="opacity-80"> · {code}</span>
                  ) : null}
                  <span className="mt-0.5 block leading-relaxed opacity-90">
                    {message}
                  </span>
                </p>
              );
            })()
            ) : null}

            {manageConfig.gatewayType === "KOPOKOPO" ? (
              <ol className="list-decimal space-y-1.5 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-4 py-3 pl-8 text-xs leading-relaxed text-muted-foreground">
                <li>Edit credentials if needed, then Test connection.</li>
                <li>Activate when the test succeeds.</li>
                <li>
                  Subscribe Till webhooks so till payments land in PalMart.
                </li>
              </ol>
            ) : null}

            {manageConfig.gatewayType === "PAYSTACK" ? (
              <ol className="list-decimal space-y-1.5 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-4 py-3 pl-8 text-xs leading-relaxed text-muted-foreground">
                <li>Edit keys if needed, then Test connection.</li>
                <li>Activate when the test succeeds.</li>
                <li>
                  Register your Kiosk webhook URL in the Paystack dashboard
                  (Settings → API Keys &amp; Webhooks).
                </li>
              </ol>
            ) : null}

            {(() => {
              if (isCustodyMpesaGateway(manageConfig)) return null;
              const dash = providerDashboardUrl(
                manageConfig.gatewayType,
                manageEnvironment,
              );
              if (!dash) return null;
              return (
                <div className="space-y-3 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                      Settlement &amp; withdrawals
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      Kiosk never holds your money. Payments settle to your{" "}
                      {manageConfig.gatewayType === "PAYSTACK"
                        ? "Paystack"
                        : "KopoKopo"}{" "}
                      account. Withdraw to your bank from their dashboard.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    asChild
                  >
                    <a
                      href={dash.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                      {dash.label}
                    </a>
                  </Button>
                </div>
              );
            })()}

            <div className="grid gap-2 sm:grid-cols-2">
              {canWrite ? (
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start gap-2"
                  disabled={manageBusy}
                  onClick={() => void openEdit(manageConfig)}
                >
                  <Pencil className="size-3.5" aria-hidden />
                  Edit details
                </Button>
              ) : null}

              {!isManualGateway(manageConfig) &&
              !isCustodyMpesaGateway(manageConfig) &&
              canWrite &&
              ["DRAFT", "ERROR", "TESTED", "ACTIVE"].includes(
                manageConfig.status,
              ) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start gap-2"
                  disabled={manageBusy}
                  onClick={() => void testConnection(manageConfig)}
                >
                  <Zap className="size-3.5" aria-hidden />
                  Test connection
                </Button>
              ) : null}

              {canWrite &&
              (isManualGateway(manageConfig) || isCustodyMpesaGateway(manageConfig)
                ? manageConfig.status !== "ACTIVE"
                : manageConfig.status === "TESTED") ? (
                <Button
                  type="button"
                  className="justify-start gap-2"
                  disabled={manageBusy}
                  onClick={() =>
                    void runRowAction(
                      manageConfig.id,
                      () => activateGateway(manageConfig.id),
                      "Gateway activated.",
                    )
                  }
                >
                  Activate
                </Button>
              ) : null}

              {canWrite && manageConfig.status === "ACTIVE" ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="justify-start gap-2"
                  disabled={manageBusy}
                  onClick={() =>
                    void runRowAction(
                      manageConfig.id,
                      () => deactivateGateway(manageConfig.id),
                      "Gateway deactivated.",
                    )
                  }
                >
                  Deactivate
                </Button>
              ) : null}

              {canWrite &&
              manageConfig.gatewayType === "KOPOKOPO" &&
              manageConfig.status === "ACTIVE" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start gap-2 sm:col-span-2"
                  disabled={manageBusy}
                  onClick={() => void subscribeTills(manageConfig)}
                >
                  <Webhook className="size-3.5" aria-hidden />
                  Subscribe till webhooks
                </Button>
              ) : null}

              {canWrite ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-start gap-2 text-destructive hover:text-destructive sm:col-span-2"
                  disabled={manageBusy || manageConfig.status === "ACTIVE"}
                  title={
                    manageConfig.status === "ACTIVE"
                      ? "Deactivate before deleting"
                      : undefined
                  }
                  onClick={() => {
                    showThemedConfirmToast({
                      id: `delete-gateway-${manageConfig.id}`,
                      title: `Delete “${manageConfig.label}”?`,
                      description: "This cannot be undone.",
                      confirmLabel: "Delete",
                      onConfirm: () => {
                        void runRowAction(
                          manageConfig.id,
                          () => deleteGatewayConfig(manageConfig.id),
                          "Gateway removed.",
                        );
                      },
                    });
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Delete method
                </Button>
              ) : null}
            </div>

            {manageConfig.gatewayType === "PAYSTACK" ? (
              <div className="space-y-2 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-[-0.02em] text-muted-foreground">
                    Recent Paystack checkouts
                  </p>
                  <RefreshCw
                    className="size-3.5 text-muted-foreground"
                    aria-hidden
                  />
                </div>
                {checkoutLoading ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" aria-hidden />
                    Loading attempts…
                  </p>
                ) : !checkoutRows || checkoutRows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No Paystack checkout attempts yet. Storefront “Pay by card”
                    orders will appear here.
                  </p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {checkoutRows.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs font-medium text-foreground">
                            {row.reference}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatCheckoutAmount(row.amount, row.currency)}
                            {row.contextId
                              ? ` · ${row.contextId.slice(0, 8).toUpperCase()}`
                              : ""}
                            {row.failureReason ? ` · ${row.failureReason}` : ""}
                          </p>
                        </div>
                        <CheckoutStatusBadge status={row.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {manageBusy ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Working…
              </p>
            ) : null}
          </div>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={drawer.kind === "manual-create"}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        title="Add manual payment"
        description="Shown on storefront checkout and order confirmations."
        contextLabel="Payments"
        width="wide"
      >
        <ManualMethodForm
          saving={saving}
          onCancel={closeDrawer}
          onSave={(payload) => onCreate(payload)}
        />
      </FormDrawer>

      <FormDrawer
        open={drawer.kind === "manual-edit"}
        onOpenChange={(open) => {
          if (!open) {
            setManualEditInitial(undefined);
            closeDrawer();
          }
        }}
        title="Edit manual payment"
        contextLabel="Payments"
        width="wide"
      >
        {drawer.kind === "manual-edit" ? (
          <ManualMethodForm
            saving={saving}
            initial={manualEditInitial}
            onCancel={closeDrawer}
            onSave={(payload) => onUpdate(drawer.config.id, payload)}
          />
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={drawer.kind === "custody-create"}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        title="Where should M-Pesa land?"
        description="Choose a till, paybill, or bank — then we’ll send KES 1 to check it."
        contextLabel="Payments"
        appearance="sharp"
        width="wide"
      >
        <ReceiveMpesaFlow
          appearance="sharp"
          embedded
          mode="setup"
          ownerPhone={me?.phone}
          countryCode={business?.countryCode}
          showSkip={false}
          onCancel={closeDrawer}
          onDone={() => {
            closeDrawer();
            void reload();
          }}
          doneLabel="Done"
        />
      </FormDrawer>

      <FormDrawer
        open={drawer.kind === "custody-edit"}
        onOpenChange={(open) => {
          if (!open) {
            setCustodyEditInitial(undefined);
            closeDrawer();
          }
        }}
        title="Update M-Pesa destination"
        description="Choose a till, paybill, or bank — then we’ll send KES 1 to check it."
        contextLabel="Payments"
        appearance="sharp"
        width="wide"
      >
        {drawer.kind === "custody-edit" ? (
          <ReceiveMpesaFlow
            appearance="sharp"
            embedded
            mode="update"
            ownerPhone={me?.phone}
            countryCode={business?.countryCode}
            initial={receiveInitialFromCustodyJson(
              custodyEditInitial?.displayInstructionsJson ??
                drawer.config.displayInstructionsJson,
              custodyEditInitial?.label ?? drawer.config.label,
            )}
            showSkip={false}
            onCancel={() => {
              setCustodyEditInitial(undefined);
              closeDrawer();
            }}
            onDone={() => {
              setCustodyEditInitial(undefined);
              closeDrawer();
              void reload();
            }}
            doneLabel="Done"
          />
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={drawer.kind === "api-create"}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        title={
          drawer.kind === "api-create"
            ? `Connect ${drawer.displayName}`
            : "Connect gateway"
        }
        contextLabel="Payments"
        width="wide"
      >
        {drawer.kind === "api-create" ? (
          <GatewayConfigForm
            gatewayType={drawer.gatewayType}
            displayName={drawer.displayName}
            saving={saving}
            onCancel={closeDrawer}
            onSave={(payload) => onCreate(payload)}
          />
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={drawer.kind === "api-edit"}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        title={
          drawer.kind === "api-edit"
            ? `Edit ${drawer.displayName}`
            : "Edit gateway"
        }
        contextLabel="Payments"
        width="wide"
      >
        {drawer.kind === "api-edit" ? (
          <GatewayConfigForm
            mode="edit"
            gatewayType={drawer.config.gatewayType}
            displayName={drawer.displayName}
            saving={saving}
            initial={{ label: drawer.config.label }}
            credentialSettings={drawer.credentialSettings}
            onCancel={closeDrawer}
            onSave={(payload) => onUpdate(drawer.config.id, payload)}
          />
        ) : null}
      </FormDrawer>
    </div>
  );
}

function CustodyManagePanel({
  config,
  availability,
}: {
  config: GatewayConfigRecord;
  availability: MpesaCustodyAvailabilityRecord | null;
}) {
  const dest = parseCustodyDestination(config.displayInstructionsJson);
  const destination =
    dest.type === "paybill"
      ? `Paybill ${dest.businessNumber || "—"}${
          dest.accountNumber ? ` · ${dest.accountNumber}` : ""
        }`
      : `Till ${dest.tillNumber || "—"}`;
  const rail = custodyProviderLabel(config.custodyProvider);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "border px-3.5 py-3",
          "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
        )}
      >
        <p className="text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
          Receiving account
        </p>
        <p className="mt-1 font-heading text-lg font-semibold tabular-nums tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
          {destination}
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
          Lipa Na M-Pesa Express to this Buy Goods till (PIN only). Party B =
          till under Kiosk&apos;s Head Office. No B2B. Bank paybills cannot use
          this lane.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3.5 py-2.5">
        <GatewayStatusBadge status={config.status} />
        {config.isDefault ? (
          <span className="border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]">
            Default
          </span>
        ) : null}
        {rail ? (
          <span className="text-[11px] text-muted-foreground">
            Prompt via {rail}
          </span>
        ) : null}
        {availability ? (
          <span
            className={cn(
              "text-[11px]",
              availability.available
                ? "text-[var(--pos-primary,#0f766e)]"
                : "text-[#9a2e16]",
            )}
          >
            {availability.available
              ? "Ready on cashier & storefront"
              : availability.message ?? "Platform rail not ready"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
