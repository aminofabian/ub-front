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
import { BusinessPageLayout } from "@/components/business-hub/business-page-layout";
import { HubSettingsSectionNav } from "@/components/business-hub/hub-settings-section-nav";
import {
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { AirtimeSettingsSection } from "@/components/payments/airtime-settings-section";
import { GatewayConfigForm } from "@/components/payments/gateway-config-form";
import { GatewayStatusBadge } from "@/components/payments/gateway-status-badge";
import { ManualMethodForm } from "@/components/payments/manual-method-form";
import { SupplierPayoutSettingsSection } from "@/components/payments/supplier-payout-settings-section";
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
  type DisplayInstructionRecord,
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
import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

type DrawerState =
  | { kind: "closed" }
  | { kind: "pick" }
  | { kind: "manual-create" }
  | { kind: "manual-edit"; config: GatewayConfigRecord }
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

function isManualGateway(config: GatewayConfigRecord) {
  return config.gatewayType === "MANUAL";
}

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

function gatewayDisplayName(
  config: GatewayConfigRecord,
  available: AvailableGatewayRecord[],
) {
  if (isManualGateway(config)) {
    return "Manual payment";
  }
  return (
    available.find((a) => a.gatewayType === config.gatewayType)?.displayName ??
    config.gatewayType
  );
}

function gatewayGlyph(type: string) {
  if (type === "KOPOKOPO") return "K";
  if (type === "MPESA_STK" || type === "SAFARICOM") return "M";
  if (type === "PAYSTACK") return "P";
  if (type === "MANUAL") return "T";
  return type.slice(0, 1).toUpperCase() || "?";
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
      label: production
        ? "Open KopoKopo Dashboard"
        : "Open KopoKopo Sandbox",
    };
  }
  return null;
}

function CheckoutStatusBadge({ status }: { status: string | null }) {
  const tone =
    status === "success"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : status === "failed"
        ? "bg-destructive/10 text-destructive"
        : status === "cancelled"
          ? "bg-muted text-muted-foreground"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
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

export default function PaymentGatewaySettingsPage() {
  const { me } = useDashboard();
  const canRead = hasPermission(
    me?.permissions,
    Permission.PaymentsGatewaysRead,
  );
  const canWrite = hasPermission(
    me?.permissions,
    Permission.PaymentsGatewaysWrite,
  );

  const [available, setAvailable] = useState<AvailableGatewayRecord[]>([]);
  const [configs, setConfigs] = useState<GatewayConfigRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>({ kind: "closed" });
  const [saving, setSaving] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [manualEditInitial, setManualEditInitial] = useState<
    Partial<{ label: string; displayInstructionsJson: string }> | undefined
  >(undefined);
  const [checkoutRows, setCheckoutRows] = useState<GatewayCheckoutRecord[] | null>(
    null,
  );
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [manageEnvironment, setManageEnvironment] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [avail, list] = await Promise.all([
        fetchAvailableGateways(),
        fetchGatewayConfigs(),
      ]);
      setAvailable(avail);
      setConfigs(list);
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

  const addableApi = useMemo(
    () =>
      available.filter(
        (a) => a.gatewayType !== "MANUAL" && !a.configured,
      ),
    [available],
  );

  const activeCount = configs.filter((c) => c.status === "ACTIVE").length;
  const draftOrErrorCount = configs.filter((c) =>
    ["DRAFT", "ERROR", "TESTED", "TESTING"].includes(c.status),
  ).length;
  const kopokopoNeedsAttention = configs.some(
    (c) => c.gatewayType === "KOPOKOPO" && c.status !== "ACTIVE",
  );

  const manageConfig =
    drawer.kind === "manage" ? drawer.config : null;
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

  const onUpdate = async (
    id: string,
    payload: CreateGatewayConfigPayload,
  ) => {
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
          config.status === "ACTIVE"
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
      toast.error(
        e instanceof Error ? e.message : "Connection test failed.",
      );
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

  if (!canRead) {
    return (
      <BusinessPageLayout
        title="Payments"
        description="Configure M-Pesa, card, and manual payment methods for your storefront and POS."
      >
        <DashboardFeedback
          kind="warning"
          text="You do not have permission to view payment gateway settings."
        />
      </BusinessPageLayout>
    );
  }

  return (
    <BusinessPageLayout
      title="Payments"
      description="Connect checkout providers, show till instructions to customers, and control how you pay suppliers with M-Pesa."
      headerActions={
        <>
          <button
            type="button"
            disabled={loading}
            onClick={() => void reload()}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-lg border border-[#E6E1D8] bg-white text-[#666666]",
              "transition-colors hover:border-[#B08D48] hover:text-[#8A6B2E]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/30",
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
              className="h-9 gap-1.5 rounded-lg bg-[#141414] px-3.5 text-[#F5E6C8] hover:bg-[#141414]/90"
              onClick={() => setDrawer({ kind: "pick" })}
            >
              <Plus className="size-4" aria-hidden />
              Add method
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-6 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:pb-2">
        <HubSettingsSectionNav
          ariaLabel="Payment settings sections"
          items={[
            { id: "accept-payments", label: "Accept payments" },
            { id: "kiosk-pay", label: "Kiosk Pay" },
            { id: "supplier-payouts", label: "Pay suppliers" },
            { id: "airtime", label: "Airtime" },
          ]}
        />

        <dl className={cn(HUB_SURFACE, "grid gap-px bg-[#E6E1D8]/80 sm:grid-cols-3")}>
          <div className="bg-white px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A8A8A]">
              Methods
            </dt>
            <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-[#141414]">
              {loading ? "—" : configs.length}
            </dd>
          </div>
          <div className="bg-white px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A8A8A]">
              Active
            </dt>
            <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-emerald-700">
              {loading ? "—" : activeCount}
            </dd>
          </div>
          <div className="bg-white px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A8A8A]">
              Needs attention
            </dt>
            <dd
              className={cn(
                "mt-1 font-mono text-lg font-semibold tabular-nums",
                draftOrErrorCount > 0 ? "text-amber-700" : "text-[#141414]",
              )}
            >
              {loading ? "—" : draftOrErrorCount}
            </dd>
          </div>
        </dl>

      {loadError ? (
        <DashboardFeedback kind="error" text={loadError} />
      ) : null}

      <section id="accept-payments" className="relative scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-[#141414]">
              Accept payments
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#666666]">
              API gateways need a successful connection test before activation.
              Manual till / paybill methods go live immediately.
            </p>
          </div>
        </div>

        {kopokopoNeedsAttention ? (
          <div
            role="status"
            className="rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <p className="font-semibold">KopoKopo is not active yet</p>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              Open <strong>Manage</strong> on the KopoKopo row →{" "}
              <strong>Test</strong> → <strong>Activate</strong> →{" "}
              <strong>Till webhooks</strong>. A Manual “Mpesa Till” row only prints
              instructions; it does not receive payments.
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className={cn(HUB_SURFACE, "flex items-center gap-2 px-4 py-10 text-sm text-[#666666]")}>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading payment methods…
          </div>
        ) : configs.length === 0 ? (
          <div className={cn(HUB_SURFACE, "border-dashed px-5 py-12 text-center")}>
            <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#F9F6F0] text-[#8A6B2E]">
              <CreditCard className="size-6" aria-hidden />
            </span>
            <p className="mt-4 text-sm font-semibold text-[#141414]">
              No payment methods yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#666666]">
              {canWrite
                ? "Add KopoKopo for M-Pesa STK and supplier Send Money, or a manual till / paybill for receipt instructions."
                : "Ask an admin to connect a payment gateway."}
            </p>
            {canWrite ? (
              <Button
                type="button"
                size="sm"
                className="mt-5 gap-1.5 rounded-lg bg-[#141414] text-[#F5E6C8] hover:bg-[#141414]/90"
                onClick={() => setDrawer({ kind: "pick" })}
              >
                <Plus className="size-4" aria-hidden />
                Add your first method
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className={cn(HUB_SURFACE, "divide-y divide-[#E6E1D8]/80")}>
            {configs.map((config) => {
              const busy = rowBusyId === config.id;
              const name = gatewayDisplayName(config, available);
              return (
                <li
                  key={config.id}
                  className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold",
                        config.status === "ACTIVE"
                          ? "bg-[#141414] text-[#F5E6C8]"
                          : config.status === "ERROR"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-[#F0EBE3] text-[#666666]",
                      )}
                      aria-hidden
                    >
                      {gatewayGlyph(config.gatewayType)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-foreground">
                          {config.label}
                        </p>
                        <GatewayStatusBadge status={config.status} />
                        {config.isDefault ? (
                          <span className="bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Default
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {name}
                        {config.lastTestedAt
                          ? ` · Last tested ${new Date(config.lastTestedAt).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {canWrite ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={busy}
                        onClick={() => void openEdit(config)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Edit
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5"
                      disabled={busy}
                      onClick={() =>
                        setDrawer({ kind: "manage", config })
                      }
                    >
                      <MoreHorizontal className="size-3.5" aria-hidden />
                      Manage
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <SupplierPayoutSettingsSection canWrite={canWrite} />
      <KioskPaySettingsSection canWrite={canWrite} />
      <AirtimeSettingsSection />
      </div>

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
        <ul className="space-y-2">
          {canWrite ? (
            <li>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-[#E6E1D8]/90 bg-white px-4 py-3.5 text-left transition-colors hover:border-[#B08D48]/55 hover:bg-[#FCFAF6]"
                onClick={() => setDrawer({ kind: "manual-create" })}
              >
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Manual payment
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Till, paybill, or bank transfer instructions
                  </span>
                </span>
                <Plus className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ) : null}
          {addableApi.map((gw) => (
            <li key={gw.gatewayType}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-[#E6E1D8]/90 bg-white px-4 py-3.5 text-left transition-colors hover:border-[#B08D48]/55 hover:bg-[#FCFAF6]"
                onClick={() =>
                  setDrawer({
                    kind: "api-create",
                    gatewayType: gw.gatewayType,
                    displayName: gw.displayName,
                  })
                }
              >
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    {gw.displayName}
                  </span>
                  {gw.description ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {gw.description}
                    </span>
                  ) : null}
                </span>
                <Plus className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
          {addableApi.length === 0 && !canWrite ? (
            <li className="text-sm text-muted-foreground">
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
            ? `${gatewayDisplayName(manageConfig, available)} · ${manageConfig.status}`
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
            <div className="flex flex-wrap items-center gap-2 border border-border/70 bg-muted/20 px-3.5 py-3">
              <GatewayStatusBadge status={manageConfig.status} />
              {manageConfig.isDefault ? (
                <span className="bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
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

            {manageConfig.gatewayType === "KOPOKOPO" ? (
              <ol className="list-decimal space-y-1.5 border border-border/70 bg-card px-4 py-3 pl-8 text-xs leading-relaxed text-muted-foreground">
                <li>Edit credentials if needed, then Test connection.</li>
                <li>Activate when the test succeeds.</li>
                <li>Subscribe Till webhooks so till payments land in PalMart.</li>
              </ol>
            ) : null}

            {manageConfig.gatewayType === "PAYSTACK" ? (
              <ol className="list-decimal space-y-1.5 border border-border/70 bg-card px-4 py-3 pl-8 text-xs leading-relaxed text-muted-foreground">
                <li>Edit keys if needed, then Test connection.</li>
                <li>Activate when the test succeeds.</li>
                <li>
                  Register your Kiosk webhook URL in the Paystack dashboard
                  (Settings → API Keys &amp; Webhooks).
                </li>
              </ol>
            ) : null}

            {(() => {
              const dash = providerDashboardUrl(
                manageConfig.gatewayType,
                manageEnvironment,
              );
              if (!dash) return null;
              return (
                <div className="space-y-3 border border-border/70 bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
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
                  <Button type="button" variant="outline" className="w-full justify-start gap-2" asChild>
                    <a href={dash.href} target="_blank" rel="noopener noreferrer">
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
              (isManualGateway(manageConfig)
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
              <div className="space-y-2 border border-border/70 bg-card px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Recent Paystack checkouts
                  </p>
                  <RefreshCw className="size-3.5 text-muted-foreground" aria-hidden />
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
    </BusinessPageLayout>
  );
}
