"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { SaSection, SaToggleRow } from "@/components/super-admin/sa-section";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Button } from "@/components/ui/button";
import {
  fetchPlatformEasyTaxSettings,
  updatePlatformEasyTaxSettings,
  type PlatformEasyTaxSettingsRecord,
} from "@/lib/super-admin-api";

/**
 * Platform-level EasyTax controls. Shops pick Sandbox or Production and then
 * use whichever endpoint is set here; they never type a base URL themselves.
 */
export default function SuperAdminPlatformEasyTaxPage() {
  const [record, setRecord] = useState<PlatformEasyTaxSettingsRecord | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [sandboxBaseUrl, setSandboxBaseUrl] = useState("");
  const [productionBaseUrl, setProductionBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const apply = useCallback((next: PlatformEasyTaxSettingsRecord) => {
    setRecord(next);
    setEnabled(next.enabled);
    setSandboxBaseUrl(next.sandboxBaseUrl ?? "");
    setProductionBaseUrl(next.productionBaseUrl ?? "");
  }, []);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      apply(await fetchPlatformEasyTaxSettings());
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : "Could not load EasyTax platform settings.",
      );
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!record) return false;
    return (
      enabled !== record.enabled ||
      sandboxBaseUrl.trim() !== (record.sandboxBaseUrl ?? "") ||
      productionBaseUrl.trim() !== (record.productionBaseUrl ?? "")
    );
  }, [record, enabled, sandboxBaseUrl, productionBaseUrl]);

  const onSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const next = await updatePlatformEasyTaxSettings({
        enabled,
        sandboxBaseUrl: sandboxBaseUrl.trim(),
        productionBaseUrl: productionBaseUrl.trim(),
      });
      apply(next);
      setSuccess(
        next.enabled
          ? "EasyTax saved. Shops can now turn it on with their own credentials."
          : "EasyTax saved. The integration stays unavailable to shops while this is off.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save EasyTax settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="EasyTax (KRA eTIMS)"
        description="Make the EasyTax tax integration available to shops and set the KRA endpoint for each environment. Shops choose Sandbox or Production, enter their own login and TIN, and never type a base URL. Each branch then supplies its own KRA branch ID and device serial."
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}

      <SaSection
        title="Platform availability"
        description="When this is off, shops see that EasyTax is not available and cannot switch it on. Turn it on once the endpoints below are ready."
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              disabled={loading || saving || !record || !dirty}
              onClick={() => void onSave()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save settings"
              )}
            </Button>
          </div>
        }
      >
        {loading && !record ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading EasyTax settings…
          </div>
        ) : (
          <div className="space-y-5">
            <SaToggleRow
              id="easytax-platform-enabled"
              label="Enable EasyTax for shops"
              description="Shops can opt in to EasyTax and report their sales to KRA. They still supply their own username, password and TIN."
              checked={enabled}
              onChange={setEnabled}
              disabled={!record || saving}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className={dashboardLabelClass()}>
                  Sandbox base URL
                </span>
                <input
                  className={dashboardInputClass()}
                  value={sandboxBaseUrl}
                  disabled={!record || saving}
                  placeholder="https://sandbox.easytax.example"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setSandboxBaseUrl(e.target.value)}
                />
                <span className={dashboardHintClass()}>
                  Used by shops that pick Sandbox while testing.
                </span>
              </label>

              <label className="space-y-1.5">
                <span className={dashboardLabelClass()}>
                  Production base URL
                </span>
                <input
                  className={dashboardInputClass()}
                  value={productionBaseUrl}
                  disabled={!record || saving}
                  placeholder="https://easytax.example"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setProductionBaseUrl(e.target.value)}
                />
                <span className={dashboardHintClass()}>
                  Used by shops that pick Production for live reporting.
                </span>
              </label>
            </div>

            <p className={dashboardHintClass()}>
              These endpoints appear to shops as a read-only reference. Save
              here, then test from the shop&apos;s EasyTax page to confirm the
              credentials work.
            </p>
          </div>
        )}
      </SaSection>
    </div>
  );
}
