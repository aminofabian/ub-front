"use client";

import { useEffect, useState } from "react";

import { dashboardHintClass, dashboardInputClass, dashboardSelectClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "@/lib/api";
import {
  fetchServices,
  fetchStaffServiceRates,
  serviceRateDraftError,
  serviceRateInWords,
  setStaffServiceRates,
  type CommissionType,
  type ServiceRecord,
  type StaffServiceRate,
} from "@/lib/service-business-api";
import { cn } from "@/lib/utils";

const FIELD = "h-11 rounded-[2px] shadow-none sm:h-8";

/**
 * What one person earns on particular services when it is not what their plan says: a senior
 * barber on 60% for a shave, a trainee on a set amount for braids. Their own rate for a service
 * beats the service's rate and their plan.
 */
export function OwnRates({ staffProfileId, name, canEdit }: { staffProfileId: string; name: string; canEdit: boolean }) {
  const [rates, setRates] = useState<StaffServiceRate[] | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [type, setType] = useState<CommissionType>("PERCENT");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([fetchStaffServiceRates(staffProfileId), fetchServices({ active: true })])
      .then(([found, list]) => {
        if (!live) return;
        setRates(found);
        setServices(list);
      })
      .catch(() => {
        if (live) setError(`Could not load ${name}'s own rates. Close this and open it again.`);
      });
    return () => {
      live = false;
    };
  }, [staffProfileId, name]);

  async function save(next: StaffServiceRate[]) {
    setBusy(true);
    setError(null);
    try {
      setRates(await setStaffServiceRates(staffProfileId, next));
      setServiceId("");
      setValue("");
    } catch (err) {
      const detail = err instanceof ApiRequestError ? (err.payload as { detail?: unknown } | null)?.detail : null;
      setError(typeof detail === "string" && detail.trim() ? detail : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (rates == null) {
    return error ? (
      <p role="alert" className="text-[13px] text-[var(--op-highlight)]">
        {error}
      </p>
    ) : (
      <p className={dashboardHintClass()} aria-busy="true">
        Loading {name}&apos;s own rates…
      </p>
    );
  }

  const nameOf = (id: string) => services.find((s) => s.id === id)?.name ?? "A service no longer offered";
  const free = services.filter((s) => !rates.some((r) => r.serviceId === s.id));

  return (
    <div className="grid gap-1.5 border-t border-[var(--op-rule-soft)] pt-2">
      {rates.length === 0 ? (
        <p className={dashboardHintClass()}>
          {name} earns by the plan above on every service. Add a service here to pay them differently for it.
        </p>
      ) : (
        <ul aria-label={`${name}'s own rates`} className="grid gap-1">
          {rates.map((rate) => (
            <li key={rate.serviceId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px]">
              <span className="min-w-0">
                <span className="font-medium text-[var(--op-ink)]">{nameOf(rate.serviceId)}</span>
                <span className="text-[var(--op-muted)]"> · {serviceRateInWords(rate)}</span>
              </span>
              {canEdit ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(FIELD, "px-2 text-[12px]")}
                  disabled={busy}
                  onClick={() => void save(rates.filter((r) => r.serviceId !== rate.serviceId))}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canEdit && free.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            className={dashboardSelectClass(busy, cn(FIELD, "w-auto min-w-[10rem] max-w-full flex-1 sm:max-w-[16rem] sm:flex-none"))}
            disabled={busy}
            value={serviceId}
            aria-label="Service"
            onChange={(e) => {
              setServiceId(e.target.value);
              setError(null);
            }}
          >
            <option value="">Choose a service…</option>
            {free.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className={dashboardSelectClass(busy, cn(FIELD, "w-[9.5rem]"))}
            disabled={busy}
            value={type}
            aria-label="How they earn on it"
            onChange={(e) => setType(e.target.value as CommissionType)}
          >
            <option value="PERCENT">Percent</option>
            <option value="FIXED">Fixed amount</option>
          </select>
          <input
            className={dashboardInputClass(busy, cn(FIELD, "w-20 font-mono"))}
            disabled={busy}
            inputMode="decimal"
            value={value}
            placeholder={type === "PERCENT" ? "60" : "150"}
            aria-label={type === "PERCENT" ? "Percent" : "Shillings for each one"}
            onChange={(e) => {
              setValue(e.target.value.replace(/[^0-9.]/g, ""));
              setError(null);
            }}
          />
          <Button
            size="sm"
            className={cn(FIELD, "w-fit")}
            disabled={busy}
            onClick={() => {
              const problem = serviceRateDraftError(serviceId, type, value);
              if (problem) return setError(problem);
              void save([...rates, { serviceId, type, value: Number(value) }]);
            }}
          >
            {busy ? "Saving…" : "Add"}
          </Button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-[13px] text-[var(--op-highlight)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
