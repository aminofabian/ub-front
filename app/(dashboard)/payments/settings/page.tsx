"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { GatewayConfigForm } from "@/components/payments/gateway-config-form";
import { GatewayStatusBadge } from "@/components/payments/gateway-status-badge";
import { ManualMethodForm } from "@/components/payments/manual-method-form";
import { SupplierPayoutSettingsSection } from "@/components/payments/supplier-payout-settings-section";
import { Button } from "@/components/ui/button";
import {
  activateGateway,
  createGatewayConfig,
  deactivateGateway,
  deleteGatewayConfig,
  fetchAvailableGateways,
  fetchDisplayInstructions,
  fetchGatewayConfigs,
  fetchGatewayCredentialSettings,
  type DisplayInstructionRecord,
  testGatewayConnection,
  updateGatewayConfig,
  type AvailableGatewayRecord,
  type CreateGatewayConfigPayload,
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
    };

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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setRowBusyId(null);
    }
  };

  if (!canRead) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardPageHero
          eyebrow="Payments"
          title="Gateway settings"
          description="Configure M-Pesa, card, and manual payment methods for your storefront and POS."
          icon={CreditCard}
        />
        <DashboardFeedback
          kind="warning"
          text="You do not have permission to view payment gateway settings."
        />
      </div>
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        eyebrow="Payments"
        title="Gateway settings"
        description="Connect online payment providers, add manual pay instructions, and control which methods are active on checkout."
        icon={CreditCard}
      >
        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => setDrawer({ kind: "pick" })}
            >
              <Plus className="size-4" aria-hidden />
              Add payment method
            </Button>
          </div>
        ) : null}
      </DashboardPageHero>

      {loadError ? (
        <DashboardFeedback kind="error" text={loadError} />
      ) : null}

      <section className={DASHBOARD_TABLE_SURFACE}>
        <div className={DASHBOARD_TABLE_HEAD}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Configured methods
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                API gateways must pass a connection test before activation.
                Manual methods are active immediately.
              </p>
            </div>
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
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted-foreground sm:px-6">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading gateways…
          </div>
        ) : configs.length === 0 ? (
          <div className="px-5 py-10 text-center sm:px-6">
            <p className="text-sm text-muted-foreground">
              No payment methods yet.
              {canWrite
                ? " Add M-Pesa STK, KopoKopo, Paystack, or manual till / paybill instructions."
                : ""}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {configs.map((config) => {
              const busy = rowBusyId === config.id;
              const api = !isManualGateway(config);
              const name = gatewayDisplayName(config, available);
              const canTest =
                api && canWrite && ["DRAFT", "ERROR", "TESTED"].includes(config.status);
              const canActivate =
                canWrite &&
                (isManualGateway(config)
                  ? config.status !== "ACTIVE"
                  : config.status === "TESTED");
              const canDeactivate =
                canWrite && config.status === "ACTIVE";

              return (
                <li
                  key={config.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{config.label}</p>
                      <GatewayStatusBadge status={config.status} />
                      {config.isDefault ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
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

                  <div className="flex flex-wrap gap-2">
                    {canWrite ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={busy}
                        onClick={() => void openEdit(config)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Edit
                      </Button>
                    ) : null}
                    {canTest ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={busy}
                        onClick={() =>
                          void runRowAction(
                            config.id,
                            () => testGatewayConnection(config.id),
                            "Connection test completed.",
                          )
                        }
                      >
                        <Zap className="size-3.5" aria-hidden />
                        Test
                      </Button>
                    ) : null}
                    {canActivate ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void runRowAction(
                            config.id,
                            () => activateGateway(config.id),
                            "Gateway activated.",
                          )
                        }
                      >
                        Activate
                      </Button>
                    ) : null}
                    {canDeactivate ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void runRowAction(
                            config.id,
                            () => deactivateGateway(config.id),
                            "Gateway deactivated.",
                          )
                        }
                      >
                        Deactivate
                      </Button>
                    ) : null}
                    {canWrite ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={busy || config.status === "ACTIVE"}
                        title={
                          config.status === "ACTIVE"
                            ? "Deactivate before deleting"
                            : undefined
                        }
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Delete “${config.label}”? This cannot be undone.`,
                            )
                          ) {
                            return;
                          }
                          void runRowAction(
                            config.id,
                            () => deleteGatewayConfig(config.id),
                            "Gateway removed.",
                          );
                        }}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={DASHBOARD_SECTION_SURFACE}>
        <SupplierPayoutSettingsSection canWrite={canWrite} />
      </section>

      <FormDrawer
        open={drawer.kind === "pick"}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        title="Add payment method"
        description="Choose a provider or add manual payment instructions for customers."
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
                className="flex w-full items-center justify-between rounded-lg border border-border/80 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40"
                onClick={() => setDrawer({ kind: "manual-create" })}
              >
                <span>
                  <span className="font-medium text-foreground">
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
                className="flex w-full items-center justify-between rounded-lg border border-border/80 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40"
                onClick={() =>
                  setDrawer({
                    kind: "api-create",
                    gatewayType: gw.gatewayType,
                    displayName: gw.displayName,
                  })
                }
              >
                <span>
                  <span className="font-medium text-foreground">
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

      <FormDrawer
        open={drawer.kind === "manual-create"}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        title="Add manual payment"
        description="Shown on storefront checkout and order confirmations."
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
