"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ClinicAppointments } from "@/components/clinic/clinic-appointments";
import { ClinicServices, ClinicSettingsForm } from "@/components/clinic/clinic-settings";
import { ClinicTakingsReport } from "@/components/clinic/clinic-takings";
import { ClinicToday } from "@/components/clinic/clinic-today";
import { ClinicVisitScreen } from "@/components/clinic/clinic-visit";
import { useDashboard } from "@/components/dashboard-provider";
import { DASHBOARD_MAX_WIDE, DashboardAccessDenied, DashboardLoading } from "@/components/dashboard-page-ui";
import { RX_INK, RX_MUTED, RX_RULE, errorText } from "@/components/pharmacy/pharmacy-ui";
import { Button } from "@/components/ui/button";
import {
  fetchClinicRooms,
  fetchClinicServices,
  fetchClinicSettings,
  fetchClinicians,
  type ClinicRoom,
  type ClinicService,
  type ClinicSettings,
  type Clinician,
} from "@/lib/clinic-api";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export type ClinicTab = "today" | "appointments" | "services" | "takings" | "settings";

const TABS: Array<{ key: ClinicTab; label: string }> = [
  { key: "today", label: "Today" },
  { key: "appointments", label: "Appointments" },
  { key: "services", label: "Services" },
  { key: "takings", label: "Takings" },
  { key: "settings", label: "Settings" },
];

/**
 * The Clinic section (ADR 0034). One page: the open tab and the open visit live in the address
 * (?tab=, ?visit=), so the side menu links to each tab and Back returns from a visit to Today.
 */
export function ClinicWorkspace() {
  const { loading, me, branchId, business } = useDashboard();
  const permissions = me?.permissions;
  const canEnter =
    hasPermission(permissions, Permission.ClinicReception) ||
    hasPermission(permissions, Permission.ClinicConsult) ||
    hasPermission(permissions, Permission.ClinicPrescribe) ||
    hasPermission(permissions, Permission.ClinicPerform) ||
    hasPermission(permissions, Permission.ClinicManage) ||
    hasPermission(permissions, Permission.PharmacyDispense);
  const canManage = hasPermission(permissions, Permission.ClinicManage);
  const canManageCatalogue = hasPermission(permissions, Permission.ServicesCatalogManage);
  const canManageClaims = hasPermission(permissions, Permission.PharmacyClaimsManage);

  const router = useRouter();
  const searchParams = useSearchParams();
  const visitId = searchParams.get("visit");
  const requested = searchParams.get("tab");
  const tab: ClinicTab = TABS.some((t) => t.key === requested) ? (requested as ClinicTab) : "today";
  const setTab = useCallback(
    (next: ClinicTab) =>
      router.push(next === "today" ? APP_ROUTES.clinic : `${APP_ROUTES.clinic}?tab=${next}`, { scroll: false }),
    [router],
  );
  const openVisit = useCallback(
    (id: string) => router.push(`${APP_ROUTES.clinic}?visit=${encodeURIComponent(id)}`, { scroll: false }),
    [router],
  );

  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [services, setServices] = useState<ClinicService[]>([]);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [reload, setReload] = useState(0);
  const load = () => setReload((n) => n + 1);

  useEffect(() => {
    if (loading || !canEnter) return;
    let alive = true;
    Promise.all([fetchClinicSettings(), fetchClinicServices(), fetchClinicians()])
      .then(([s, sv, c]) => {
        if (!alive) return;
        setSettings(s);
        setServices(sv);
        setClinicians(c);
        setError(null);
      })
      .catch((err) => {
        if (alive) setError(errorText(err, "Could not load the clinic. Check the connection."));
      });
    return () => {
      alive = false;
    };
  }, [loading, canEnter, reload]);

  // Rooms belong to a branch. A clinic with none simply never sees a room picker.
  useEffect(() => {
    if (loading || !canEnter || !branchId) return;
    fetchClinicRooms(branchId)
      .then(setRooms)
      .catch(() => setRooms([]));
  }, [loading, canEnter, branchId]);

  const onSettingsSaved = (next: ClinicSettings) => {
    setSettings(next);
    // Which services are tests comes back on the services themselves.
    fetchClinicServices()
      .then(setServices)
      .catch(() => undefined);
  };

  if (loading) {
    return <DashboardLoading label="Loading session…" />;
  }
  if (!canEnter) {
    return (
      <DashboardAccessDenied
        title="Clinic"
        description="You do not have access to this area."
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  const shell = (children: React.ReactNode) => (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-3 px-3 pb-28 pt-3 sm:px-4 xl:pb-6")}>{children}</div>
  );

  if (error && !settings) {
    return shell(
      <div className="space-y-3">
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        <Button type="button" variant="outline" onClick={load}>
          Try again
        </Button>
      </div>,
    );
  }
  if (!settings) {
    return <DashboardLoading label="Loading the clinic…" />;
  }

  // Not switched on yet: the only thing to do is set it up.
  if (!settings.enabled) {
    return shell(
      <>
        <Header />
        {canManage ? (
          <div className="space-y-4">
            <p className={cn("max-w-[62ch] text-sm", RX_MUTED)}>
              Clinic is not switched on yet. Add your consultation as a service, choose it below and switch Clinic on.
              Then open a visit from Today.
            </p>
            <ClinicServices
              settings={settings}
              services={services}
              clinicians={clinicians}
              canManage={false}
              canManageCatalogue={canManageCatalogue}
              onSaved={onSettingsSaved}
            />
            <ClinicSettingsForm settings={settings} services={services} canManage onSaved={onSettingsSaved} />
          </div>
        ) : (
          <p className={cn("text-sm", RX_MUTED)}>Clinic is not switched on yet. The owner or a manager sets it up.</p>
        )}
      </>,
    );
  }

  if (visitId) {
    return shell(
      <ClinicVisitScreen
        key={visitId}
        visitId={visitId}
        settings={settings}
        services={services}
        rooms={rooms}
        shopName={business?.name ?? "Clinic"}
        canManageClaims={canManageClaims}
        onBack={() => router.push(APP_ROUTES.clinic, { scroll: false })}
      />,
    );
  }

  const visibleTabs = TABS.filter((t) => (t.key === "settings" || t.key === "takings" ? canManage : true));

  return shell(
    <>
      <Header />
      <div role="tablist" aria-label="Clinic sections" className={cn("flex h-11 items-stretch gap-1 overflow-x-auto border-b", RX_RULE)}>
        {visibleTabs.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`clinic-tab-${t.key}`}
              aria-selected={active}
              aria-controls="clinic-panel"
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px inline-flex items-center whitespace-nowrap border-b-2 px-3 text-[14px] transition-colors",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]",
                active
                  ? "border-[var(--op-accent,#1d4b3b)] font-semibold text-[var(--op-accent,#1d4b3b)]"
                  : cn("border-transparent hover:text-[var(--op-ink,#121a16)]", RX_MUTED),
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div id="clinic-panel" role="tabpanel" aria-labelledby={`clinic-tab-${tab}`} className="pt-1">
        {tab === "today" ? (
          <ClinicToday
            branchId={branchId}
            settings={settings}
            services={services}
            clinicians={clinicians}
            onOpenVisit={openVisit}
          />
        ) : null}
        {tab === "appointments" ? (
          <ClinicAppointments branchId={branchId} settings={settings} services={services} clinicians={clinicians} />
        ) : null}
        {tab === "services" ? (
          <ClinicServices
            settings={settings}
            services={services}
            clinicians={clinicians}
            canManage={canManage}
            canManageCatalogue={canManageCatalogue}
            onSaved={onSettingsSaved}
            onServices={setServices}
          />
        ) : null}
        {tab === "takings" && canManage ? <ClinicTakingsReport branchId={branchId} /> : null}
        {tab === "settings" && canManage ? (
          <ClinicSettingsForm settings={settings} services={services} canManage onSaved={onSettingsSaved} />
        ) : null}
      </div>
    </>,
  );
}

function Header() {
  return (
    <header className="min-w-0">
      <h1 className={cn("font-serif text-[1.6rem] font-semibold leading-none tracking-[-0.01em]", RX_INK)}>Clinic</h1>
      <p className={cn("mt-1.5 max-w-[60ch] text-[13.5px]", RX_MUTED)}>
        Each patient&apos;s visit on one bill: what was done, the prescription, and payment.
      </p>
    </header>
  );
}
