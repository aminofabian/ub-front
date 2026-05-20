"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Plus, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  type AvailableGatewayRecord,
  type GatewayConfigRecord,
  type CreateGatewayConfigPayload,
  type GatewayCredentialSettingsRecord,
  fetchAvailableGateways,
  fetchGatewayConfigs,
  fetchGatewayCredentialSettings,
  createGatewayConfig,
  updateGatewayConfig,
  deleteGatewayConfig,
  testGatewayConnection,
  activateGateway,
  deactivateGateway,
} from "@/lib/api";
import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { GatewayConfigForm } from "@/components/payments/gateway-config-form";
import { ManualMethodForm } from "@/components/payments/manual-method-form";
import { GatewayStatusBadge } from "@/components/payments/gateway-status-badge";
import { Button } from "@/components/ui/button";
import { hasPermission, Permission } from "@/lib/permissions";
import { useDashboard } from "@/components/dashboard-provider";

type DrawerMode =
  | { kind: "closed" }
  | { kind: "setup"; gatewayType: string; displayName: string }
  | {
      kind: "edit";
      config: GatewayConfigRecord;
      credentialSettings: GatewayCredentialSettingsRecord;
    }
  | { kind: "manual_new" }
  | { kind: "manual_edit"; config: GatewayConfigRecord };

export default function PaymentSettingsPage() {
  const { me } = useDashboard();
  const canWrite = hasPermission(
    me?.permissions,
    Permission.PaymentsGatewaysWrite,
  );

  const [available, setAvailable] = useState<AvailableGatewayRecord[]>([]);
  const [configs, setConfigs] = useState<GatewayConfigRecord[]>([]);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });
  const [drawerError, setDrawerError] = useState("");

  const reload = useCallback(async () => {
    setLoadError("");
    try {
      const [a, c] = await Promise.all([
        fetchAvailableGateways(),
        fetchGatewayConfigs(),
      ]);
      setAvailable(a);
      setConfigs(c);
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Could not load payment gateways.",
      );
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const getConfigId = (gatewayType: string): string | undefined => {
    return configs.find((c) => c.gatewayType === gatewayType)?.id;
  };

  const getConfig = (gatewayType: string): GatewayConfigRecord | undefined => {
    return configs.find((c) => c.gatewayType === gatewayType);
  };

  // All non-MANUAL configured gateways
  const configuredApiGateways = configs.filter(
    (c) => c.gatewayType !== "MANUAL",
  );
  const configuredManualConfigs = configs.filter(
    (c) => c.gatewayType === "MANUAL",
  );

  // Available API gateways not yet configured by tenant
  const unconfiguredAvailable = available.filter((a) => !a.configured);

  // Gateways not enabled by super admin (all platform gateways minus available ones)
  const allPlatformTypes = ["KOPOKOPO", "PAYSTACK", "DARAJA", "PESAPAL"];
  const availableTypes = available.map((a) => a.gatewayType);
  const unavailableTypes = allPlatformTypes.filter(
    (t) => !availableTypes.includes(t),
  );

  // ── Drawer actions ─────────────────────────────────────────────

  const openSetup = (gatewayType: string, displayName: string) => {
    setDrawer({ kind: "setup", gatewayType, displayName });
    setDrawerError("");
  };

  const openEdit = async (config: GatewayConfigRecord) => {
    if (config.gatewayType === "MANUAL") {
      setDrawer({ kind: "manual_edit", config });
      setDrawerError("");
      return;
    }
    setDrawerError("");
    try {
      const credentialSettings = await fetchGatewayCredentialSettings(config.id);
      setDrawer({ kind: "edit", config, credentialSettings });
    } catch (e) {
      setDrawer({
        kind: "edit",
        config,
        credentialSettings: {
          environment: "sandbox",
          tillNumber: null,
          shortcode: null,
          shortcodeType: null,
          hasClientId: false,
          hasClientSecret: false,
          hasApiKey: false,
          hasSecretKey: false,
          hasPublicKey: false,
          hasConsumerKey: false,
          hasConsumerSecret: false,
          hasPasskey: false,
          credentialsReadable: false,
          readError:
            e instanceof Error
              ? e.message
              : "Could not load saved settings. Re-enter all credentials below.",
        },
      });
    }
  };

  const closeDrawer = () => {
    setDrawer({ kind: "closed" });
    setDrawerError("");
  };

  const handleSave = async (payload: CreateGatewayConfigPayload) => {
    setSaving(true);
    setDrawerError("");
    try {
      if (drawer.kind === "edit" || drawer.kind === "manual_edit") {
        await updateGatewayConfig(drawer.config.id, payload);
        toast.success("Gateway configuration updated.");
      } else {
        await createGatewayConfig(payload);
        toast.success("Gateway configuration saved as draft.");
      }
      await reload();
      closeDrawer();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed.";
      setDrawerError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const result = await testGatewayConnection(id);
      if (result.success) {
        toast.success("Connection test passed! Gateway is ready to activate.");
      } else {
        toast.error(
          `Connection test failed: ${result.errorMessage ?? "Unknown error"}`,
        );
      }
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection test failed.");
    } finally {
      setTesting(null);
    }
  };

  const handleToggle = async (config: GatewayConfigRecord) => {
    setToggling(config.id);
    try {
      if (config.status === "ACTIVE") {
        await deactivateGateway(config.id);
        toast.success(`${config.label} deactivated.`);
      } else {
        // DRAFT, TESTED, ERROR → activate (manual methods skip testing)
        await activateGateway(config.id);
        toast.success(`${config.label} is now active!`);
      }
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (config: GatewayConfigRecord) => {
    if (!confirm(`Delete "${config.label}"? This cannot be undone.`)) return;
    try {
      await deleteGatewayConfig(config.id);
      toast.success(`${config.label} deleted.`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  // ── Render ─────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 py-8">
        <h1 className="text-lg font-semibold">Payments Settings</h1>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button variant="outline" className="mt-3" onClick={reload}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 py-8">
      <div className="flex items-center gap-3">
        <CreditCard className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Payments Settings</h1>
          <p className="text-sm text-muted-foreground">
            Set up how your customers pay you.
          </p>
        </div>
      </div>

      {/* Configured API gateways */}
      {configuredApiGateways.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Connected Gateways
          </h2>
          {configuredApiGateways.map((cfg) => (
            <div
              key={cfg.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-background p-4 shadow-sm"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{cfg.label}</span>
                  <GatewayStatusBadge status={cfg.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {cfg.gatewayType}
                  {cfg.lastTestedAt &&
                    ` · Last tested: ${new Date(cfg.lastTestedAt).toLocaleString()}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {cfg.status === "TESTED" && canWrite && (
                  <Button
                    size="sm"
                    disabled={toggling === cfg.id}
                    onClick={() => handleToggle(cfg)}
                  >
                    {toggling === cfg.id ? "…" : "Activate"}
                  </Button>
                )}
                {cfg.status === "ACTIVE" && canWrite && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={toggling === cfg.id}
                    onClick={() => handleToggle(cfg)}
                  >
                    {toggling === cfg.id ? "…" : "Deactivate"}
                  </Button>
                )}
                {(cfg.status === "DRAFT" || cfg.status === "ERROR") &&
                  canWrite && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={testing === cfg.id}
                      onClick={() => handleTest(cfg.id)}
                    >
                      {testing === cfg.id ? "Testing…" : "Test"}
                    </Button>
                  )}
                {canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(cfg)}
                  >
                    Edit
                  </Button>
                )}
                {canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(cfg)}
                  >
                    Del
                  </Button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Available API gateways (not yet configured) */}
      {unconfiguredAvailable.length > 0 && canWrite && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Available Gateways
          </h2>
          {unconfiguredAvailable.map((a) => (
            <div
              key={a.gatewayType}
              className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-background p-4 shadow-sm"
            >
              <div className="min-w-0 space-y-1">
                <span className="font-medium">{a.displayName}</span>
                {a.description && (
                  <p className="text-xs text-muted-foreground">
                    {a.description}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => openSetup(a.gatewayType, a.displayName)}
              >
                Set Up
              </Button>
            </div>
          ))}
        </section>
      )}

      {/* Unavailable gateways (super admin hasn't enabled) */}
      {unavailableTypes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Not Available
          </h2>
          <div className="space-y-2">
            {unavailableTypes.map((t) => (
              <div
                key={t}
                className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 p-3"
              >
                <Lock className="size-4 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground/60">
                  {t === "DARAJA" ? "M-Pesa (Daraja)" : t}
                  {" — Not enabled by super admin."}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Manual Payment Methods */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Manual Payment Methods
          </h2>
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawer({ kind: "manual_new" })}
            >
              <Plus className="mr-1 size-3" />
              Add Manual Method
            </Button>
          )}
        </div>
        {configuredManualConfigs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No manual methods configured yet. Add a Till number, Paybill, or
            bank account for your customers to see at checkout.
          </p>
        )}
        {configuredManualConfigs.map((cfg) => (
          <div
            key={cfg.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-background p-4 shadow-sm"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{cfg.label}</span>
                <GatewayStatusBadge status={cfg.status} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {cfg.status !== "ACTIVE" && canWrite && (
                <Button
                  size="sm"
                  disabled={toggling === cfg.id}
                  onClick={() => handleToggle(cfg)}
                >
                  {toggling === cfg.id ? "…" : "Activate"}
                </Button>
              )}
              {cfg.status === "ACTIVE" && canWrite && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={toggling === cfg.id}
                  onClick={() => handleToggle(cfg)}
                >
                  {toggling === cfg.id ? "…" : "Deactivate"}
                </Button>
              )}
              {canWrite && (
                <Button variant="ghost" size="sm" onClick={() => openEdit(cfg)}>
                  Edit
                </Button>
              )}
              {canWrite && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(cfg)}
                >
                  Del
                </Button>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Drawer */}
      <FormDrawer
        open={drawer.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        title={
          drawer.kind === "setup"
            ? `Set Up ${drawer.displayName}`
            : drawer.kind === "edit"
              ? `Edit ${drawer.config.label}`
              : drawer.kind === "manual_new"
                ? "Add Manual Payment Method"
                : drawer.kind === "manual_edit"
                  ? `Edit ${drawer.config.label}`
                  : ""
        }
        description={
          drawer.kind === "setup"
            ? "Enter your API credentials. You'll test the connection before going live."
            : drawer.kind === "manual_new"
              ? "Add a Till number, Paybill, or bank account for customers to see."
              : undefined
        }
        banner={
          drawerError ? (
            <FormDrawerMessageBanner text={drawerError} />
          ) : undefined
        }
      >
        {drawer.kind === "setup" && (
          <GatewayConfigForm
            gatewayType={drawer.gatewayType}
            displayName={drawer.displayName}
            onSave={handleSave}
            onCancel={closeDrawer}
            saving={saving}
          />
        )}
        {drawer.kind === "edit" && (
          <GatewayConfigForm
            mode="edit"
            gatewayType={drawer.config.gatewayType}
            displayName={drawer.config.gatewayType}
            onSave={handleSave}
            onCancel={closeDrawer}
            saving={saving}
            credentialSettings={drawer.credentialSettings}
            initial={{
              label: drawer.config.label,
            }}
          />
        )}
        {drawer.kind === "manual_new" && (
          <ManualMethodForm
            onSave={handleSave}
            onCancel={closeDrawer}
            saving={saving}
          />
        )}
        {drawer.kind === "manual_edit" && (
          <ManualMethodForm
            onSave={handleSave}
            onCancel={closeDrawer}
            saving={saving}
            initial={{
              label: drawer.config.label,
            }}
          />
        )}
      </FormDrawer>
    </div>
  );
}
