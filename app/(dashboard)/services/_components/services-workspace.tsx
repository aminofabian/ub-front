"use client";

import { Scissors } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import {
  deleteService,
  fetchCommissionPlans,
  fetchServiceCategories,
  fetchServices,
  updateService,
  type CommissionPlanRecord,
  type ServiceCategoryRecord,
  type ServiceRecord,
} from "@/lib/service-business-api";

import { ServiceFormDialog } from "./service-form-dialog";
import { PackageOfferDialog } from "./package-offer-dialog";
import { ProductsUsedDialog } from "./products-used-dialog";

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function ServicesWorkspace({ canManage }: { canManage: boolean }) {
  const [services, setServices] = useState<ServiceRecord[] | null>(null);
  const [categories, setCategories] = useState<ServiceCategoryRecord[]>([]);
  const [staff, setStaff] = useState<CommissionPlanRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ServiceRecord | "new" | null>(null);
  const [packaging, setPackaging] = useState<ServiceRecord | null>(null);
  const [productsFor, setProductsFor] = useState<ServiceRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, cats] = await Promise.all([fetchServices(), fetchServiceCategories()]);
      setServices(list);
      setCategories(cats);
    } catch {
      setError("Could not load your services. Check your connection and try again.");
    }
    if (canManage) {
      // Staff names are only needed to choose who performs a service; the page works without them.
      try {
        setStaff((await fetchCommissionPlans()).filter((p) => p.current));
      } catch {
        setStaff([]);
      }
    }
  }, [canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.name);
    return map;
  }, [categories]);

  const staffName = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of staff) map.set(s.staffProfileId, s.displayName);
    return map;
  }, [staff]);

  async function toggleActive(service: ServiceRecord) {
    setBusyId(service.id);
    try {
      const next = await updateService(service.id, { active: !service.active, version: service.version });
      setServices((prev) => (prev ?? []).map((s) => (s.id === next.id ? next : s)));
    } catch {
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(service: ServiceRecord) {
    if (!window.confirm(`Remove ${service.name}? Past sales keep it; it just can\u2019t be sold any more.`)) {
      return;
    }
    setBusyId(service.id);
    try {
      await deleteService(service.id);
      setServices((prev) => (prev ?? []).filter((s) => s.id !== service.id));
      toast.success(`${service.name} removed`);
    } catch {
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        icon={Scissors}
        title="Services"
        description="What you offer, how long it takes and what it costs."
      >
        {canManage ? (
          <Button size="sm" onClick={() => setEditing("new")}>
            Add service
          </Button>
        ) : null}
      </DashboardPageHero>

      {error ? (
        <DashboardLoadError title="Services" message={error} onRetry={() => void load()} />
      ) : services == null ? (
        <DashboardLoading label="Loading services…" />
      ) : services.length === 0 ? (
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">Add your first service</p>
          <p className={dashboardHintClass()}>
            A haircut, a beard trim, a massage — anything you charge for by the visit. Once it is
            here it can be rung at the till against the person who did it.
          </p>
          {canManage ? (
            <Button className="mt-3" size="sm" onClick={() => setEditing("new")}>
              Add service
            </Button>
          ) : null}
        </div>
      ) : (
        <div className={DASHBOARD_TABLE_SURFACE}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-[11px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#121A16)_60%,transparent)]">
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2">Who does it</th>
                  <th className="px-3 py-2">Status</th>
                  {canManage ? <th className="px-3 py-2 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <div className="font-medium">{service.name}</div>
                      {service.categoryId && categoryName.get(service.categoryId) ? (
                        <div className={dashboardHintClass()}>{categoryName.get(service.categoryId)}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{durationLabel(service.durationMinutes)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {service.priceIsVariable
                        ? service.price > 0
                          ? `from ${formatMoney(service.price, "KES")}`
                          : "Set at the till"
                        : formatMoney(service.price, "KES")}
                    </td>
                    <td className="px-3 py-2">
                      {service.staffProfileIds.length === 0
                        ? "Anyone"
                        : service.staffProfileIds
                            .map((id) => staffName.get(id) ?? "Staff")
                            .join(", ")}
                    </td>
                    <td className="px-3 py-2">{service.active ? "On" : "Off"}</td>
                    {canManage ? (
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === service.id}
                            onClick={() => setEditing(service)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === service.id || service.priceIsVariable}
                            title={service.priceIsVariable ? "A package needs a fixed price" : undefined}
                            onClick={() => setPackaging(service)}
                          >
                            Package
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === service.id}
                            onClick={() => setProductsFor(service)}
                          >
                            Products used
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === service.id}
                            onClick={() => void toggleActive(service)}
                          >
                            {service.active ? "Switch off" : "Switch on"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyId === service.id}
                            onClick={() => void remove(service)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing ? (
        <ServiceFormDialog
          service={editing === "new" ? null : editing}
          categories={categories}
          staff={staff}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      ) : null}
      {productsFor ? <ProductsUsedDialog service={productsFor} onClose={() => setProductsFor(null)} /> : null}
      {packaging ? <PackageOfferDialog service={packaging} onClose={() => setPackaging(null)} /> : null}
    </div>
  );
}
