"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
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
  DASHBOARD_MAX,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { GatewayConfigForm } from "@/components/payments/gateway-config-form";
import { GatewayStatusBadge } from "@/components/payments/gateway-status-badge";
import { ManualMethodForm } from "@/components/payments/manual-method-form";
import { SupplierPayoutSettingsSection } from "@/components/payments/supplier-payout-settings-section";
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
      <div className={cn(DASHBOARD_MAX, "relative")}>
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Payments
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Configure M-Pesa, card, and manual payment methods for your storefront
            and POS.
          </p>
        </header>
        <DashboardFeedback
          kind="warning"
          text="You do not have permission to view payment gateway settings."
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        DASHBOARD_MAX,
        "relative before:pointer-events-none before:absolute before:-inset-x-6 before:-top-6 before:h-56 before:bg-[radial-gradient(ellipse_at_top,_rgba(15,118,110,0.09),_transparent_60%)] before:content-[''] dark:before:bg-[radial-gradient(ellipse_at_top,_rgba(45,212,191,0.07),_transparent_60%)]",
      )}
    >
      <header className="relative space-y-4 border-b border-border/60 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-2xl space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
              Payments
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Connect checkout providers, show till instructions to customers, and
              control how you pay suppliers with M-Pesa.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={loading}
              onClick={() => void reload()}
            >
              <RefreshCw
                className={cn("size-3.5", loading && "animate-spin")}
                aria-hidden
              />
              Refresh
            </Button>
            {canWrite ? (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={() => setDrawer({ kind: "pick" })}
              >
                <Plus className="size-4" aria-hidden />
                Add method
              </Button>
            ) : null}
          </div>
        </div>

        <nav
          aria-label="Payment settings sections"
          className="flex flex-wrap gap-1"
        >
          {[
            { id: "accept-payments", label: "Accept payments" },
            { id: "supplier-payouts", label: "Pay suppliers" },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-teal-700/35 hover:bg-teal-50/50 hover:text-foreground dark:hover:bg-teal-950/30"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <dl className="grid gap-px overflow-hidden border border-border/70 bg-border/70 sm:grid-cols-3">
          <div className="bg-card px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Methods
            </dt>
            <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
              {loading ? "—" : configs.length}
            </dd>
          </div>
          <div className="bg-card px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Active
            </dt>
            <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-teal-800 dark:text-teal-200">
              {loading ? "—" : activeCount}
            </dd>
          </div>
          <div className="bg-card px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Needs attention
            </dt>
            <dd
              className={cn(
                "mt-1 font-mono text-lg font-semibold tabular-nums",
                draftOrErrorCount > 0
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-foreground",
              )}
            >
              {loading ? "—" : draftOrErrorCount}
            </dd>
          </div>
        </dl>
      </header>

      {loadError ? (
        <DashboardFeedback kind="error" text={loadError} />
      ) : null}

      <section id="accept-payments" className="relative scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Accept payments
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              API gateways need a successful connection test before activation.
              Manual till / paybill methods go live immediately.
            </p>
          </div>
        </div>

        {kopokopoNeedsAttention ? (
          <div
            role="status"
            className="border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
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
          <div className="flex items-center gap-2 border border-border/70 bg-card px-4 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading payment methods…
          </div>
        ) : configs.length === 0 ? (
          <div className="border border-dashed border-border bg-card px-5 py-12 text-center">
            <span className="mx-auto flex size-12 items-center justify-center bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-100">
              <CreditCard className="size-6" aria-hidden />
            </span>
            <p className="mt-4 text-sm font-semibold text-foreground">
              No payment methods yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {canWrite
                ? "Add KopoKopo for M-Pesa STK and supplier Send Money, or a manual till / paybill for receipt instructions."
                : "Ask an admin to connect a payment gateway."}
            </p>
            {canWrite ? (
              <Button
                type="button"
                size="sm"
                className="mt-5 gap-1.5"
                onClick={() => setDrawer({ kind: "pick" })}
              >
                <Plus className="size-4" aria-hidden />
                Add your first method
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-border/70 border border-border/80 bg-card">
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
                        "mt-0.5 flex size-10 shrink-0 items-center justify-center font-mono text-sm font-bold",
                        config.status === "ACTIVE"
                          ? "bg-teal-700 text-white"
                          : config.status === "ERROR"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-muted text-muted-foreground",
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
                className="flex w-full items-center justify-between border border-border/80 bg-card px-4 py-3.5 text-left transition-colors hover:border-teal-700/35 hover:bg-teal-50/40 dark:hover:bg-teal-950/20"
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
                className="flex w-full items-center justify-between border border-border/80 bg-card px-4 py-3.5 text-left transition-colors hover:border-teal-700/35 hover:bg-teal-50/40 dark:hover:bg-teal-950/20"
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
    </div>
  );
}
