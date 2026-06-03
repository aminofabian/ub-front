"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  HardDrive,
  Loader2,
  Network,
  Printer,
  RefreshCw,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import { useDesktopLicense } from "@/components/desktop/desktop-license-provider";
import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { DesktopLanQr } from "@/components/desktop/desktop-lan-qr";
import {
  fetchDesktopBackups,
  fetchDesktopLanStatus,
  fetchDesktopPrinterConfig,
  renewDesktopLicense,
  restoreDesktopBackup,
  runDesktopBackupNow,
  saveDesktopPrinterConfig,
  toggleDesktopLan,
  type DesktopBackupInfo,
  type DesktopLanStatus,
  type DesktopPrinterConfig,
} from "@/lib/desktop-api";
import { APP_ROUTES } from "@/lib/config";
import { IS_DESKTOP } from "@/lib/runtime";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function DesktopSettingsPage() {
  const router = useRouter();
  const { me } = useDashboard();
  const { status: license, refresh: refreshLicense } = useDesktopLicense();
  const isOwner = me?.role?.key === "owner";
  const [lan, setLan] = useState<DesktopLanStatus | null>(null);
  const [printer, setPrinter] = useState<DesktopPrinterConfig | null>(null);
  const [backups, setBackups] = useState<DesktopBackupInfo[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [licenseKey, setLicenseKey] = useState("");
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [lanToggling, setLanToggling] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [printerSaving, setPrinterSaving] = useState(false);

  useEffect(() => {
    if (!IS_DESKTOP) {
      router.replace(APP_ROUTES.overview);
    }
  }, [router]);

  const reload = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const [lanStatus, backupList, printerCfg] = await Promise.all([
        fetchDesktopLanStatus(),
        fetchDesktopBackups(),
        fetchDesktopPrinterConfig(),
      ]);
      await refreshLicense();
      setLan(lanStatus);
      setBackups(backupList);
      setPrinter(printerCfg);
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Could not load desktop settings.",
      );
    } finally {
      setLoading(false);
    }
  }, [refreshLicense]);

  useEffect(() => {
    if (IS_DESKTOP) void reload();
  }, [reload]);

  async function onRenewLicense() {
    if (!licenseKey.trim()) {
      toast.error("Paste your license key first.");
      return;
    }
    setLicenseSaving(true);
    try {
      await renewDesktopLicense(licenseKey);
      await refreshLicense();
      setLicenseKey("");
      toast.success("License updated.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "License verification failed.",
      );
    } finally {
      setLicenseSaving(false);
    }
  }

  async function onToggleLan() {
    setLanToggling(true);
    try {
      const next = await toggleDesktopLan();
      setLan(next);
      if (next.restartRequired) {
        toast.message("Restart Kiosk Desktop to apply the network change.", {
          duration: 8000,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not toggle LAN mode.");
    } finally {
      setLanToggling(false);
    }
  }

  async function onBackupNow() {
    setBackupRunning(true);
    try {
      await runDesktopBackupNow();
      toast.success("Backup completed.");
      setBackups(await fetchDesktopBackups());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed.");
    } finally {
      setBackupRunning(false);
    }
  }

  async function onRestore(filename: string) {
    const ok = window.confirm(
      `Restore from "${filename}"?\n\nThis overwrites the current database. Kiosk will need a restart afterward.`,
    );
    if (!ok) return;
    setRestoring(filename);
    try {
      await restoreDesktopBackup(filename);
      toast.success("Restore finished. Restart Kiosk Desktop.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed.");
    } finally {
      setRestoring(null);
    }
  }

  async function onSavePrinter() {
    if (!printer) return;
    setPrinterSaving(true);
    try {
      const saved = await saveDesktopPrinterConfig(printer);
      setPrinter(saved);
      toast.success("Printer settings saved.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save printer settings.",
      );
    } finally {
      setPrinterSaving(false);
    }
  }

  function copyLanUrl() {
    const url = lan?.lanUrl;
    if (!url) return;
    void navigator.clipboard.writeText(url).then(
      () => toast.success("LAN URL copied."),
      () => toast.error("Could not copy to clipboard."),
    );
  }

  if (!IS_DESKTOP) {
    return null;
  }

  if (loading) {
    return <DashboardLoading label="Loading desktop settings…" />;
  }

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        icon={Shield}
        eyebrow="Desktop"
        title="Desktop & offline"
        description="License, LAN tills, and local backups for this install. Everything stays on this PC unless you turn on LAN sharing."
      />

      {loadError ? <DashboardFeedback kind="error" text={loadError} /> : null}

      {/* License */}
      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h2 className="text-base font-semibold">License</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Offline subscription for this machine. When expired, sales and
                stock changes are blocked; reports and history stay available.
              </p>
            </div>

            {license ? (
              <div
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm",
                  license.readOnly
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border/60 bg-muted/30",
                )}
              >
                <p className="font-medium capitalize">{license.state}</p>
                <p className="mt-1 text-muted-foreground">{license.message}</p>
                {license.plan ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Plan: {license.plan}
                    {license.daysRemaining != null
                      ? ` · ${license.daysRemaining} day(s) left`
                      : null}
                  </p>
                ) : null}
              </div>
            ) : null}

            {isOwner ? (
              <div className="space-y-2">
                <label className={dashboardLabelClass()} htmlFor="license-key">
                  License key
                </label>
                <textarea
                  id="license-key"
                  className={cn(dashboardInputClass(), "min-h-[5rem] font-mono text-xs")}
                  placeholder="Paste the full license token from your vendor"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  disabled={licenseSaving}
                />
                <Button
                  type="button"
                  disabled={licenseSaving || !licenseKey.trim()}
                  onClick={() => void onRenewLicense()}
                >
                  {licenseSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Apply license"
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only the shop owner can apply a new license key.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* LAN */}
      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex items-start gap-3">
          <Network className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h2 className="text-base font-semibold">Share on LAN</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Let other devices on the same Wi‑Fi open the POS in a browser
                (no extra install). Requires a restart after toggling.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant={lan?.enabled ? "secondary" : "default"}
                disabled={lanToggling}
                onClick={() => void onToggleLan()}
              >
                {lanToggling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {lan?.enabled ? "Disable LAN sharing" : "Enable LAN sharing"}
              </Button>
              <span className="text-sm text-muted-foreground">
                {lan?.enabled
                  ? "Enabled (applies after restart)"
                  : "Disabled — loopback only"}
              </span>
            </div>

            {lan?.enabled && lan.lanUrl ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <DesktopLanQr
                  url={lan.lanUrl}
                  className="rounded-lg border border-border/60 bg-white p-2"
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/25 px-4 py-3">
                  <code className="text-sm font-medium break-all">{lan.lanUrl}</code>
                  <Button type="button" size="sm" variant="outline" onClick={copyLanUrl}>
                    <Copy className="size-3.5" />
                    Copy URL
                  </Button>
                </div>
              </div>
            ) : null}

            {lan && lan.detectedAddresses.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Detected addresses: {lan.detectedAddresses.join(", ")} · port{" "}
                {lan.port}
              </p>
            ) : null}

            {lan?.restartRequired ? (
              <DashboardFeedback
                kind="warning"
                text="Restart Kiosk Desktop for the bind address change to take effect."
              />
            ) : null}
          </div>
        </div>
      </section>

      {/* Printer */}
      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex items-start gap-3">
          <Printer className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h2 className="text-base font-semibold">Receipt printer</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                ESC/POS over the network (port 9100) or append to a file for
                testing. POS receipts use this instead of the browser print
                dialog on desktop.
              </p>
            </div>

            {printer ? (
              <div className="grid max-w-lg gap-3">
                <div>
                  <label className={dashboardLabelClass()} htmlFor="printer-mode">
                    Mode
                  </label>
                  <select
                    id="printer-mode"
                    className={dashboardInputClass()}
                    value={printer.mode}
                    onChange={(e) =>
                      setPrinter({ ...printer, mode: e.target.value })
                    }
                  >
                    <option value="file">File (dev / test)</option>
                    <option value="network">Network (RAW 9100)</option>
                    <option value="none">Disabled</option>
                  </select>
                </div>
                {printer.mode === "network" ? (
                  <>
                    <div>
                      <label className={dashboardLabelClass()} htmlFor="printer-host">
                        Printer IP or hostname
                      </label>
                      <input
                        id="printer-host"
                        className={dashboardInputClass()}
                        value={printer.host}
                        onChange={(e) =>
                          setPrinter({ ...printer, host: e.target.value })
                        }
                        placeholder="192.168.1.50"
                      />
                    </div>
                    <div>
                      <label className={dashboardLabelClass()} htmlFor="printer-port">
                        Port
                      </label>
                      <input
                        id="printer-port"
                        type="number"
                        className={dashboardInputClass()}
                        value={printer.port}
                        onChange={(e) =>
                          setPrinter({
                            ...printer,
                            port: Number(e.target.value) || 9100,
                          })
                        }
                      />
                    </div>
                  </>
                ) : null}
                {printer.mode === "file" ? (
                  <div>
                    <label className={dashboardLabelClass()} htmlFor="printer-path">
                      Output file (optional)
                    </label>
                    <input
                      id="printer-path"
                      className={dashboardInputClass()}
                      value={printer.path}
                      onChange={(e) =>
                        setPrinter({ ...printer, path: e.target.value })
                      }
                      placeholder="Defaults to APP_DATA/receipts.log"
                    />
                  </div>
                ) : null}
                <Button
                  type="button"
                  disabled={printerSaving}
                  onClick={() => void onSavePrinter()}
                >
                  {printerSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Save printer
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Backups */}
      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex items-start gap-3">
          <HardDrive className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Backups</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nightly database dumps under your Kiosk data folder. Use
                  &quot;Backup now&quot; before risky changes.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => void reload()}
                >
                  <RefreshCw className="size-3.5" />
                  Refresh
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={backupRunning}
                  onClick={() => void onBackupNow()}
                >
                  {backupRunning ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Backup now
                </Button>
              </div>
            </div>

            {backups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No backups yet. The first nightly run is at 23:00, or use Backup
                now.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border border-border/60">
                {backups.map((b) => (
                  <li
                    key={b.filename}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs sm:text-sm">{b.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatWhen(b.modifiedAt)} · {formatBytes(b.sizeBytes)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={restoring !== null}
                      onClick={() => void onRestore(b.filename)}
                    >
                      {restoring === b.filename ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
