"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiRequestError } from "@/lib/api";
import {
  createService,
  createServiceCategory,
  setServiceStaff,
  updateService,
  type CommissionPlanRecord,
  type CommissionType,
  type ServiceCategoryRecord,
  type ServiceRecord,
} from "@/lib/service-business-api";

const NEW_CATEGORY = "__new__";

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function ServiceFormDialog({
  service,
  categories,
  staff,
  onClose,
  onSaved,
}: {
  service: ServiceRecord | null;
  categories: ServiceCategoryRecord[];
  staff: CommissionPlanRecord[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [minutes, setMinutes] = useState(service ? String(service.durationMinutes) : "30");
  const [price, setPrice] = useState(service ? String(service.price) : "");
  const [variable, setVariable] = useState(service?.priceIsVariable ?? false);
  const [categoryId, setCategoryId] = useState(service?.categoryId ?? "");
  const [newCategory, setNewCategory] = useState("");
  const [commissionType, setCommissionType] = useState<CommissionType | "">(service?.commissionType ?? "");
  const [commissionValue, setCommissionValue] = useState(
    service?.commissionValue != null ? String(service.commissionValue) : "",
  );
  const [staffIds, setStaffIds] = useState<string[]>(service?.staffProfileIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmedName = name.trim();
    const durationMinutes = parseAmount(minutes);
    const priceValue = parseAmount(price);
    if (!trimmedName) return setError("Enter a name for the service");
    if (durationMinutes == null || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
      return setError("Enter how long it takes, in minutes");
    }
    if (!variable && (priceValue == null || priceValue <= 0)) {
      return setError("Enter the price, or tick that the price is set at the till");
    }
    if (priceValue != null && priceValue < 0) return setError("The price cannot be negative");
    const commission = commissionType === "" ? null : parseAmount(commissionValue);
    if (commissionType !== "" && (commission == null || commission < 0)) {
      return setError("Enter the commission for this service");
    }
    if (commissionType === "PERCENT" && commission != null && commission > 100) {
      return setError("A commission percent cannot be more than 100");
    }
    if (categoryId === NEW_CATEGORY && !newCategory.trim()) {
      return setError("Name the new category");
    }

    setError(null);
    setSaving(true);
    try {
      let resolvedCategory: string | null = categoryId || null;
      if (categoryId === NEW_CATEGORY) {
        resolvedCategory = (await createServiceCategory(newCategory.trim())).id;
      }
      const body = {
        name: trimmedName,
        durationMinutes,
        price: priceValue ?? 0,
        priceIsVariable: variable,
      };
      let saved: ServiceRecord;
      if (service) {
        saved = await updateService(service.id, {
          ...body,
          ...(resolvedCategory ? { categoryId: resolvedCategory } : { clearCategory: true }),
          ...(commissionType !== "" && commission != null
            ? { commissionType, commissionValue: commission }
            : { clearCommission: true }),
          version: service.version,
        });
      } else {
        saved = await createService({
          ...body,
          categoryId: resolvedCategory,
          ...(commissionType !== "" && commission != null
            ? { commissionType, commissionValue: commission }
            : {}),
        });
      }
      const before = [...(service?.staffProfileIds ?? [])].sort().join(",");
      const after = [...staffIds].sort().join(",");
      if (before !== after) {
        await setServiceStaff(saved.id, staffIds);
      }
      toast.success(service ? `${trimmedName} updated` : `${trimmedName} added`);
      await onSaved();
    } catch (err) {
      const status = err instanceof ApiRequestError ? err.status : 0;
      setError(
        status === 409
          ? "That name is already used, or someone else changed this service. Close and reopen it."
          : "Could not save the service. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Edit service" : "Add service"}</DialogTitle>
          <DialogDescription>
            The name and price are what the till and the receipt show.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Name</span>
            <input
              className={dashboardInputClass()}
              value={name}
              maxLength={191}
              placeholder="Haircut"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Time (minutes)</span>
              <input
                className={dashboardInputClass()}
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>{variable ? "Usual price (KSh, optional)" : "Price (KSh)"}</span>
              <input
                className={dashboardInputClass(false, "font-mono")}
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </label>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={variable}
              onChange={(e) => setVariable(e.target.checked)}
            />
            <span>
              The price is set at the till
              <span className={`block ${dashboardHintClass()}`}>For work priced by the job, such as braids by length.</span>
            </span>
          </label>

          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Category (optional)</span>
            <select
              className={dashboardSelectClass()}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={NEW_CATEGORY}>New category…</option>
            </select>
          </label>
          {categoryId === NEW_CATEGORY ? (
            <input
              className={dashboardInputClass()}
              value={newCategory}
              maxLength={191}
              placeholder="Haircuts"
              aria-label="New category name"
              onChange={(e) => setNewCategory(e.target.value)}
            />
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Commission on this service</span>
              <select
                className={dashboardSelectClass()}
                value={commissionType}
                onChange={(e) => setCommissionType(e.target.value as CommissionType | "")}
              >
                <option value="">Use each person&apos;s own rate</option>
                <option value="PERCENT">Percent of the price</option>
                <option value="FIXED">Fixed amount (KSh)</option>
              </select>
            </label>
            {commissionType !== "" ? (
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>{commissionType === "PERCENT" ? "Percent" : "KSh per service"}</span>
                <input
                  className={dashboardInputClass(false, "font-mono")}
                  inputMode="decimal"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </label>
            ) : null}
          </div>

          {staff.length > 0 ? (
            <fieldset className="grid gap-1">
              <legend className={dashboardLabelClass()}>Who does this service</legend>
              <p className={dashboardHintClass()}>Leave everyone unticked if anyone can do it.</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5">
                {staff.map((person) => (
                  <label key={person.staffProfileId} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={staffIds.includes(person.staffProfileId)}
                      onChange={(e) =>
                        setStaffIds((prev) =>
                          e.target.checked
                            ? [...prev, person.staffProfileId]
                            : prev.filter((id) => id !== person.staffProfileId),
                        )
                      }
                    />
                    {person.displayName}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : service ? "Save changes" : "Add service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
