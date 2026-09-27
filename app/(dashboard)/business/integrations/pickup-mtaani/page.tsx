"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Info, Loader2, MapPin, Truck } from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DashboardAccessDenied,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchPickupMtaaniAgents,
  fetchPickupMtaaniAreas,
  fetchPickupMtaaniLocations,
  fetchPickupMtaaniSettings,
  fetchPickupMtaaniZones,
  updatePickupMtaaniSettings,
  type PickupMtaaniGeoOption,
  type PickupMtaaniSettings,
} from "@/lib/pickup-mtaani-api";
import { cn } from "@/lib/utils";

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function StatusBadge({ settings }: { settings: PickupMtaaniSettings }) {
  const connected = settings.status === "connected";
  const tone = !connected
    ? "text-muted-foreground"
    : settings.ready
      ? "text-emerald-700"
      : "text-amber-600";
  const label = !connected
    ? "Not connected"
    : settings.ready
      ? "Live"
      : "Connected";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", tone)}>
      <CheckCircle2 className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

export default function PickupMtaaniSettingsPage() {
  const { canManageBusinessSettings } = useDashboard();

  const [settings, setSettings] = useState<PickupMtaaniSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [agentMode, setAgentMode] = useState(true);
  const [doorstepMode, setDoorstepMode] = useState(true);
  const [bookOnDispatch, setBookOnDispatch] = useState(true);
  const [feeMode, setFeeMode] = useState("pass_through");
  const [markupKes, setMarkupKes] = useState(0);

  const [zones, setZones] = useState<PickupMtaaniGeoOption[]>([]);
  const [areas, setAreas] = useState<PickupMtaaniGeoOption[]>([]);
  const [locations, setLocations] = useState<PickupMtaaniGeoOption[]>([]);
  const [agents, setAgents] = useState<PickupMtaaniGeoOption[]>([]);
  const [zoneId, setZoneId] = useState<number | "">("");
  const [areaId, setAreaId] = useState<number | "">("");
  const [locationId, setLocationId] = useState<number | "">("");
  const [originAgentId, setOriginAgentId] = useState<number | "">("");
  const [originAgentName, setOriginAgentName] = useState("");
  const [originLocationName, setOriginLocationName] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  const apply = useCallback((next: PickupMtaaniSettings) => {
    setSettings(next);
    setEnabled(next.enabled);
    setAgentMode(next.agent);
    setDoorstepMode(next.doorstep);
    setBookOnDispatch(next.bookOnDispatch);
    setFeeMode(next.feeMode);
    setMarkupKes(next.markupKes);
    setOriginAgentId(next.originAgentId ?? "");
    setOriginAgentName(next.originAgentName ?? "");
    setOriginLocationName(next.originLocationName ?? "");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      apply(await fetchPickupMtaaniSettings());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    if (canManageBusinessSettings) void load();
  }, [canManageBusinessSettings, load]);

  const connected = settings?.status === "connected";

  // Origin search only works once support has connected a key.
  useEffect(() => {
    if (!connected) {
      setZones([]);
      return;
    }
    let active = true;
    void fetchPickupMtaaniZones()
      .then((rows) => active && setZones(rows))
      .catch(() => active && setZones([]));
    return () => {
      active = false;
    };
  }, [connected]);

  useEffect(() => {
    if (!connected || zoneId === "") {
      setAreas([]);
      return;
    }
    let active = true;
    void fetchPickupMtaaniAreas(Number(zoneId))
      .then((rows) => active && setAreas(rows))
      .catch(() => active && setAreas([]));
    return () => {
      active = false;
    };
  }, [connected, zoneId]);

  useEffect(() => {
    if (!connected || areaId === "") {
      setLocations([]);
      return;
    }
    let active = true;
    void fetchPickupMtaaniLocations({ areaId: Number(areaId), purpose: "origin" })
      .then((rows) => active && setLocations(rows))
      .catch(() => active && setLocations([]));
    return () => {
      active = false;
    };
  }, [connected, areaId]);

  useEffect(() => {
    if (!connected || locationId === "") {
      setAgents([]);
      return;
    }
    let active = true;
    setGeoLoading(true);
    void fetchPickupMtaaniAgents({ locationId: Number(locationId), purpose: "origin" })
      .then((rows) => active && setAgents(rows))
      .catch(() => active && setAgents([]))
      .finally(() => active && setGeoLoading(false));
    return () => {
      active = false;
    };
  }, [connected, locationId]);

  const handleSave = async () => {
    if (feeMode === "markup" && (!markupKes || markupKes <= 0)) {
      toast.error("Enter a markup amount greater than zero.");
      return;
    }
    setSaving(true);
    try {
      const next = await updatePickupMtaaniSettings({
        enabled,
        agent: agentMode,
        doorstep: doorstepMode,
        bookOnDispatch,
        feeMode,
        markupKes,
        ...(originAgentId !== ""
          ? {
              originAgentId: Number(originAgentId),
              originAgentName: originAgentName || undefined,
              originLocationName: originLocationName || undefined,
            }
          : {}),
      });
      apply(next);
      toast.success("Pickup Mtaani settings saved.");
    } catch (e) {
      toast.error(messageFor(e, "Could not save settings."));
    } finally {
      setSaving(false);
    }
  };

  const selectedLocationName = useMemo(
    () => locations.find((l) => l.id === locationId)?.name ?? "",
    [locations, locationId],
  );

  if (!canManageBusinessSettings) {
    return (
      <DashboardAccessDenied
        title="Pickup Mtaani"
        description="You need permission to manage business settings."
        backHref={APP_ROUTES.businessSettings}
        backLabel="Back to business settings"
      />
    );
  }

  if (loading && !settings) return <DashboardLoading label="Loading integration…" />;

  if (loadFailed && !settings) {
    return (
      <DashboardLoadError
        title="Could not load Pickup Mtaani"
        message="Check your connection and try again."
        onRetry={() => void load()}
      />
    );
  }

  if (!settings) return null;

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5")}>
      <DashboardPageHero
        icon={Truck}
        eyebrow="Integrations"
        title="Pickup Mtaani"
        description="Offer pickup-point and doorstep delivery on your storefront. Palmart books and tracks the parcel on your Pickup Mtaani account."
      />

      {/* Connection (read-only; support owns the key) */}
      <section className={cn(DASHBOARD_SECTION_SURFACE, "space-y-3")}>
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Account</h2>
            <p className={dashboardHintClass()}>
              Connected by Palmart support. The API key is never shown to you.
            </p>
          </div>
          <StatusBadge settings={settings} />
        </header>

        {connected ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2">
              <dt className={dashboardHintClass()}>Pickup Mtaani business</dt>
              <dd className="font-medium">{settings.businessName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className={dashboardHintClass()}>Integration ready</dt>
              <dd className="font-medium">{settings.ready ? "Yes" : "Not yet"}</dd>
            </div>
          </dl>
        ) : (
          <div className="flex items-start gap-2 rounded-none border border-border bg-muted/30 px-3 py-2 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <p>
              This shop is not connected yet. Ask Palmart support to connect your
              Pickup Mtaani account, then set your origin agent and delivery options
              here.
            </p>
          </div>
        )}

        {settings.statusDetail ? (
          <p className="rounded-none border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {settings.statusDetail}
          </p>
        ) : null}
      </section>

      {/* Origin agent */}
      <section className={cn(DASHBOARD_SECTION_SURFACE, "space-y-3")}>
        <header>
          <h2 className="text-sm font-semibold tracking-tight">Origin agent</h2>
          <p className={dashboardHintClass()}>
            The Pickup Mtaani point where you drop parcels. Shoppers only choose the
            destination.
          </p>
        </header>

        {!connected ? (
          <p className={dashboardHintClass()}>
            Available once support has connected your Pickup Mtaani account.
          </p>
        ) : (
          <div className="space-y-3">
            {settings.originAgentId ? (
              <p className="flex items-center gap-1.5 text-sm">
                <MapPin className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="font-medium">
                  {settings.originAgentName ?? "Saved agent"}
                </span>
                {settings.originLocationName ? (
                  <span className={dashboardHintClass()}>
                    · {settings.originLocationName}
                  </span>
                ) : null}
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className={dashboardLabelClass()}>Zone</label>
                <select
                  className={dashboardSelectClass()}
                  value={zoneId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setZoneId(value ? Number(value) : "");
                    setAreaId("");
                    setLocationId("");
                    setAgents([]);
                  }}
                >
                  <option value="">Select zone</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name ?? `Zone ${z.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className={dashboardLabelClass()}>Area</label>
                <select
                  className={dashboardSelectClass(zoneId === "")}
                  disabled={zoneId === ""}
                  value={areaId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAreaId(value ? Number(value) : "");
                    setLocationId("");
                    setAgents([]);
                  }}
                >
                  <option value="">Select area</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name ?? `Area ${a.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className={dashboardLabelClass()}>Location</label>
                <select
                  className={dashboardSelectClass(areaId === "")}
                  disabled={areaId === ""}
                  value={locationId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLocationId(value ? Number(value) : "");
                    setAgents([]);
                  }}
                >
                  <option value="">Select location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name ?? `Location ${l.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className={dashboardLabelClass()}>Agent</label>
                <select
                  className={dashboardSelectClass(locationId === "")}
                  disabled={locationId === ""}
                  value={originAgentId}
                  onChange={(e) => {
                    const value = e.target.value;
                    const id = value ? Number(value) : "";
                    setOriginAgentId(id);
                    const chosen = agents.find((a) => a.id === id);
                    setOriginAgentName(chosen?.name ?? "");
                    setOriginLocationName(selectedLocationName);
                  }}
                >
                  <option value="">{geoLoading ? "Loading…" : "Select agent"}</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name ?? `Agent ${a.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Delivery preferences */}
      <section className={cn(DASHBOARD_SECTION_SURFACE, "space-y-3")}>
        <header>
          <h2 className="text-sm font-semibold tracking-tight">Delivery options</h2>
          <p className={dashboardHintClass()}>
            What shoppers see at checkout, and how carriage is priced.
          </p>
        </header>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              disabled={!connected}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Offer Pickup Mtaani on the storefront
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={agentMode}
                disabled={!connected}
                onChange={(e) => setAgentMode(e.target.checked)}
              />
              Collect at an agent
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={doorstepMode}
                disabled={!connected}
                onChange={(e) => setDoorstepMode(e.target.checked)}
              />
              Doorstep
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={bookOnDispatch}
                disabled={!connected}
                onChange={(e) => setBookOnDispatch(e.target.checked)}
              />
              Book automatically when dispatched
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={dashboardLabelClass()}>Delivery fee</label>
              <select
                className={dashboardSelectClass(!connected)}
                disabled={!connected}
                value={feeMode}
                onChange={(e) => setFeeMode(e.target.value)}
              >
                <option value="pass_through">Pass through (shopper pays the fee)</option>
                <option value="absorb">Absorb (free to the shopper)</option>
                <option value="markup">Add a fixed markup</option>
              </select>
            </div>
            {feeMode === "markup" ? (
              <div className="space-y-1">
                <label className={dashboardLabelClass()}>Markup (KES)</label>
                <input
                  type="number"
                  min={1}
                  disabled={!connected}
                  className={dashboardInputClass(!connected)}
                  value={markupKes || ""}
                  onChange={(e) => setMarkupKes(Number(e.target.value) || 0)}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={saving || !connected}
            onClick={() => void handleSave()}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : null}
            Save settings
          </Button>
        </div>
      </section>

      <p className={cn(dashboardHintClass(), "px-1")}>
        Booking, tracking, and cancellation appear on each web order once a
        Pickup Mtaani destination is chosen.{" "}
        <Link
          href={APP_ROUTES.businessSettings}
          className="underline underline-offset-2"
        >
          Back to business settings
        </Link>
      </p>
    </div>
  );
}
