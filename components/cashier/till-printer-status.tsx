"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, CheckCircle2, ChevronDown, Printer } from "lucide-react";
import { toast } from "sonner";

import { CashierPrinterGuideDrawer } from "@/components/cashier/cashier-printer-guide-drawer";
import { TillBridgeDownloadButton } from "@/components/cashier/till-bridge-download-button";
import { CupsPrinterPicker } from "@/components/cups-printer-picker";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { patchBranch } from "@/lib/api";
import { EMPTY_BRANCH_RECEIPT } from "@/lib/branch-receipt";
import {
  fetchDesktopPrinterConfig,
  saveDesktopPrinterConfig,
  type DesktopPrinterConfig,
} from "@/lib/desktop-api";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  fetchTillBridgeHealth,
  getLocalTillCupsName,
  REQUIRED_WIN_PRINT_ENGINE,
  setLocalTillCupsName,
  type TillBridgeHealth,
} from "@/lib/till-print-bridge";
import { cn } from "@/lib/utils";

type TillPrinterStatusProps = {
  cupsName?: string | null;
  /** When set, Detect can save the printer name onto this branch (if permitted). */
  branchId?: string | null;
  className?: string;
  /** Slim ink-line treatment for the market-till command strip. */
  compact?: boolean;
  /** Called after a printer is chosen so the parent can refresh branch data. */
  onCupsNameChosen?: (cupsName: string) => void;
};

/**
 * Cashier printer chip — paper receipts are optional.
 * Cloud: Till Print Bridge download + Detect.
 * Desktop: built-in device bridge; Detect (CUPS) or network IP.
 */
export function TillPrinterStatus({
  cupsName,
  branchId,
  className,
  compact = false,
  onCupsNameChosen,
}: TillPrinterStatusProps) {
  const { canManageBusinessSettings, me, refreshBranches } = useDashboard();
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const isOwnerOrAdmin = roleKey === "owner" || roleKey === "admin";
  const branchName = cupsName?.trim() || null;
  const [localName, setLocalName] = useState<string | null>(null);
  const [bridgeUp, setBridgeUp] = useState<boolean | null>(null);
  const [health, setHealth] = useState<TillBridgeHealth | null>(null);
  const [saving, setSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [desktopCfg, setDesktopCfg] = useState<DesktopPrinterConfig | null>(
    null,
  );
  const [netHost, setNetHost] = useState("");
  const [netPort, setNetPort] = useState(9100);

  useEffect(() => {
    setLocalName(getLocalTillCupsName());
  }, [branchName]);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      const h = await fetchTillBridgeHealth();
      if (cancelled) return;
      setHealth(h);
      setBridgeUp(Boolean(h?.ok));
    };

    void check();
    // Fixed cadence — do not depend on bridgeUp (that restarted the effect
    // and re-hit /health on every status flip during mount).
    const id = window.setInterval(() => void check(), 60_000);
    const onVis = () => {
      if (!document.hidden) void check();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (!IS_DESKTOP) return;
    let cancelled = false;
    void (async () => {
      try {
        const cfg = await fetchDesktopPrinterConfig();
        if (cancelled) return;
        setDesktopCfg(cfg);
        if (cfg.host?.trim()) setNetHost(cfg.host.trim());
        if (cfg.port > 0) setNetPort(cfg.port);
      } catch {
        // Settings page still works if this fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const desktopCupsName =
    desktopCfg?.mode === "cups" ? desktopCfg.cupsName?.trim() || null : null;
  const desktopNetworkReady =
    desktopCfg?.mode === "network" && Boolean(desktopCfg.host?.trim());
  const effectiveName =
    desktopCupsName || branchName || localName || null;
  const printerConfigured = Boolean(
    effectiveName || (IS_DESKTOP && desktopNetworkReady),
  );
  const showInstallGuide = !IS_DESKTOP && isOwnerOrAdmin && !printerConfigured;
  const winEngineStale =
    !IS_DESKTOP &&
    health?.platform === "win32" &&
    health.printEngine !== REQUIRED_WIN_PRINT_ENGINE;
  const printerReady = Boolean(
    bridgeUp &&
      !winEngineStale &&
      (effectiveName || (IS_DESKTOP && desktopNetworkReady)),
  );
  const readyLabel = effectiveName
    ? effectiveName
    : desktopNetworkReady
      ? `${desktopCfg?.host}:${desktopCfg?.port || 9100}`
      : null;

  const openSetupFromGuide = useCallback(() => {
    setGuideOpen(false);
    setPanelOpen(true);
    setSetupOpen(true);
  }, []);

  const handleSelect = useCallback(
    async (name: string) => {
      const cups = name.trim();
      if (!cups) return;
      setLocalTillCupsName(cups);
      setLocalName(cups);
      onCupsNameChosen?.(cups);

      if (IS_DESKTOP) {
        setSaving(true);
        try {
          const saved = await saveDesktopPrinterConfig({
            mode: "cups",
            host: "",
            port: 9100,
            path: "",
            cupsName: cups,
          });
          setDesktopCfg(saved);
          toast.success(`Using ${cups} on this till.`);
        } catch {
          toast.message(
            `Remembered ${cups} on this PC. Could not write Desktop printer settings — try Settings → Desktop & LAN.`,
            { duration: 10_000 },
          );
        } finally {
          setSaving(false);
        }
        return;
      }

      const bid = branchId?.trim();
      if (bid && canManageBusinessSettings) {
        setSaving(true);
        try {
          await patchBranch(bid, {
            receipt: {
              ...EMPTY_BRANCH_RECEIPT,
              printerCupsName: cups,
            },
          });
          await refreshBranches();
          toast.success(`Saved printer ${cups} for this branch.`);
        } catch {
          toast.message(
            `Using ${cups} on this PC. Could not save to branch — set it under Branches → Receipt details.`,
            { duration: 10_000 },
          );
        } finally {
          setSaving(false);
        }
      } else {
        toast.success(`Using ${cups} on this PC.`);
      }
    },
    [branchId, canManageBusinessSettings, onCupsNameChosen, refreshBranches],
  );

  const handleSaveNetwork = useCallback(async () => {
    const host = netHost.trim();
    if (!host) {
      toast.error("Enter the printer IP or hostname.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveDesktopPrinterConfig({
        mode: "network",
        host,
        port: netPort > 0 ? netPort : 9100,
        path: "",
        cupsName: "",
      });
      setDesktopCfg(saved);
      setLocalTillCupsName(null);
      setLocalName(null);
      toast.success(`Network printer ${host}:${saved.port} saved.`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save network printer.",
      );
    } finally {
      setSaving(false);
    }
  }, [netHost, netPort]);

  const chipClass = cn(
    "inline-flex max-w-full items-center gap-1.5",
    compact && "h-6 px-2 text-[11px]",
  );

  const panelClass = cn(
    compact
      ? "flex flex-col gap-1.5 rounded-none border border-border/50 bg-background px-2.5 py-2 text-[11px]"
      : "flex flex-col gap-2 rounded-none border border-border/60 bg-background px-3 py-2.5 text-xs",
  );

  const setupTools = (
    <div className="flex flex-col gap-1.5 border-t border-border/50 pt-1.5">
      {IS_DESKTOP ? (
        <>
          {bridgeUp === false ? (
            <p className="leading-snug text-muted-foreground">
              Printer bridge is not running. Restart Kiosk Desktop, then try
              Detect again.
            </p>
          ) : null}
          {bridgeUp ? (
            <CupsPrinterPicker
              compact={compact}
              value={effectiveName}
              disabled={saving}
              onSelect={(n) => void handleSelect(n)}
            />
          ) : null}
          <div className="flex flex-col gap-1.5 border-t border-border/40 pt-1.5">
            <p className="font-medium text-foreground">
              Or network printer (Ethernet / Wi‑Fi)
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                className="h-7 min-w-[8rem] flex-1 border border-border bg-background px-2 text-[11px] outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="192.168.1.50"
                value={netHost}
                disabled={saving}
                onChange={(e) => setNetHost(e.target.value)}
                aria-label="Printer IP or hostname"
              />
              <input
                className="h-7 w-16 border border-border bg-background px-2 text-[11px] outline-none focus-visible:ring-1 focus-visible:ring-ring"
                type="number"
                value={netPort}
                disabled={saving}
                onChange={(e) => setNetPort(Number(e.target.value) || 9100)}
                aria-label="Printer port"
              />
              <Button
                type="button"
                size={compact ? "xs" : "sm"}
                variant="outline"
                disabled={saving}
                onClick={() => void handleSaveNetwork()}
              >
                Save IP
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          {!bridgeUp || winEngineStale ? (
            <TillBridgeDownloadButton
              compact={compact}
              update={Boolean(winEngineStale)}
            />
          ) : null}
          {bridgeUp ? (
            <CupsPrinterPicker
              compact={compact}
              value={effectiveName}
              disabled={saving}
              onSelect={(n) => void handleSelect(n)}
            />
          ) : null}
        </>
      )}
    </div>
  );

  if (printerReady && readyLabel) {
    return (
      <div className={cn("inline-flex max-w-full flex-col gap-1", className)}>
        <Button
          type="button"
          variant="outline"
          size={compact ? "xs" : "sm"}
          className={chipClass}
          aria-expanded={panelOpen}
          aria-controls="till-printer-panel"
          onClick={() => setPanelOpen((open) => !open)}
        >
          <CheckCircle2
            className={cn(
              "shrink-0 text-[var(--pos-primary)]",
              compact ? "size-3" : "size-3.5",
            )}
            aria-hidden
          />
          <Printer className={cn("shrink-0", compact ? "size-3" : "size-3.5")} aria-hidden />
          <span className="min-w-0 truncate font-medium">{readyLabel}</span>
          <ChevronDown
            className={cn(
              "size-3 shrink-0 text-muted-foreground transition-transform",
              panelOpen && "rotate-180",
            )}
            aria-hidden
          />
        </Button>
        {panelOpen ? (
          <div
            id="till-printer-panel"
            role="region"
            aria-label="Receipt printer options"
            className={panelClass}
          >
            <p className="text-muted-foreground">
              {IS_DESKTOP
                ? "Change printer — Detect a USB queue or save a network IP."
                : "Change printer, or update the helper on this PC."}
            </p>
            {IS_DESKTOP ? (
              setupTools
            ) : (
              <>
                <CupsPrinterPicker
                  compact={compact}
                  value={effectiveName}
                  disabled={saving}
                  onSelect={(n) => void handleSelect(n)}
                />
                <TillBridgeDownloadButton compact={compact} update />
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex max-w-full flex-col gap-1", className)}>
      <div className="flex max-w-full flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size={compact ? "xs" : "sm"}
          className={cn(
            chipClass,
            "text-muted-foreground hover:text-foreground",
          )}
          aria-expanded={panelOpen}
          aria-controls="till-printer-panel"
          onClick={() => {
            setPanelOpen((open) => {
              if (open) setSetupOpen(false);
              return !open;
            });
          }}
        >
          <Printer className={cn("shrink-0", compact ? "size-3" : "size-3.5")} aria-hidden />
          <span className="min-w-0 truncate font-medium">Receipts on screen</span>
          <ChevronDown
            className={cn(
              "size-3 shrink-0 text-muted-foreground/70 transition-transform",
              panelOpen && "rotate-180",
            )}
            aria-hidden
          />
        </Button>
        {showInstallGuide ? (
          <Button
            type="button"
            variant="outline"
            size={compact ? "xs" : "sm"}
            className={cn(chipClass, "font-medium text-foreground")}
            onClick={() => setGuideOpen(true)}
          >
            <BookOpen
              className={cn("shrink-0", compact ? "size-3" : "size-3.5")}
              aria-hidden
            />
            <span className="min-w-0 truncate">Install printer</span>
          </Button>
        ) : null}
      </div>
      {showInstallGuide ? (
        <CashierPrinterGuideDrawer
          open={guideOpen}
          onOpenChange={setGuideOpen}
          onStartSetup={openSetupFromGuide}
        />
      ) : null}
      {panelOpen ? (
        <div
          id="till-printer-panel"
          role="region"
          aria-label="Paper receipts are optional"
          className={panelClass}
        >
          <p className="font-medium text-foreground">You can sell without a printer.</p>
          <p className="leading-snug text-muted-foreground">
            After checkout, the receipt stays on this screen. Show the customer,
            or print later if you connect a printer.
          </p>
          {!setupOpen ? (
            <div className="flex flex-col items-start gap-1">
              <button
                type="button"
                className="self-start text-left font-medium text-foreground underline-offset-2 hover:underline"
                onClick={() => setSetupOpen(true)}
              >
                Connect a printer
              </button>
              {showInstallGuide ? (
                <button
                  type="button"
                  className="self-start text-left text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() => setGuideOpen(true)}
                >
                  How to install — screenshots
                </button>
              ) : null}
            </div>
          ) : (
            setupTools
          )}
        </div>
      ) : null}
    </div>
  );
}
