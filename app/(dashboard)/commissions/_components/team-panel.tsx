"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import {
  createStaffWithoutLogin,
  previewCommission,
  setCommissionPlan,
  type CommissionPlanRecord,
  type CommissionType,
} from "@/lib/service-business-api";

/** The people who serve customers and how each one earns. */
export function TeamPanel({
  plans,
  canManagePlans,
  canAddStaff,
  onChanged,
}: {
  plans: CommissionPlanRecord[];
  canManagePlans: boolean;
  canAddStaff: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const current = plans.filter((p) => p.current);

  async function addStaff() {
    const name = newName.trim();
    if (!name) return setAddError("Enter a name first");
    setAddError(null);
    setAdding(true);
    try {
      await createStaffWithoutLogin({ displayName: name, bookable: true });
      setNewName("");
      toast.success(`${name} added`);
      await onChanged();
    } catch (err) {
      setAddError(
        err instanceof ApiRequestError && err.status === 409
          ? `${name} is already on the team`
          : "Could not add them. Try again.",
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className={DASHBOARD_TABLE_SURFACE} aria-label="Team and commission">
      <div className={DASHBOARD_TABLE_HEAD}>
        <h2 className="text-sm font-semibold">Team and how they earn</h2>
        <p className={dashboardHintClass()}>
          A change applies to sales from now on. What was already earned stays as it was.
        </p>
      </div>
      {current.length === 0 ? (
        <p className={`px-3 py-3 ${dashboardHintClass()}`}>No one on the team yet.</p>
      ) : (
        <ul>
          {current.map((plan) => (
            <PlanRow key={plan.staffProfileId} plan={plan} canEdit={canManagePlans} onChanged={onChanged} />
          ))}
        </ul>
      )}
      {canAddStaff ? (
        <div className="border-t px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={dashboardInputClass(false, "w-56")}
              value={newName}
              maxLength={255}
              placeholder="Brian"
              aria-label="Name of the new team member"
              onChange={(e) => {
                setNewName(e.target.value);
                setAddError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addStaff();
              }}
            />
            <Button variant="outline" size="sm" disabled={adding} onClick={() => void addStaff()}>
              {adding ? "Adding…" : "Add to team"}
            </Button>
          </div>
          <p className={`mt-1 ${dashboardHintClass()}`}>A name is enough. They do not need an email or a password.</p>
          {addError ? (
            <p role="alert" className="mt-1 text-sm text-red-700">
              {addError}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PlanRow({
  plan,
  canEdit,
  onChanged,
}: {
  plan: CommissionPlanRecord;
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [type, setType] = useState<CommissionType | "">(plan.type ?? "");
  const [rate, setRate] = useState(plan.rate != null ? String(plan.rate) : "");
  const [productRate, setProductRate] = useState(plan.productRate != null ? String(plan.productRate) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    type !== (plan.type ?? "") ||
    rate !== (plan.rate != null ? String(plan.rate) : "") ||
    productRate !== (plan.productRate != null ? String(plan.productRate) : "");
  const rateNumber = rate.trim() === "" ? null : Number(rate);
  const example = type !== "" && rateNumber != null ? previewCommission(300, type, rateNumber) : null;

  async function save() {
    const productNumber = productRate.trim() === "" ? null : Number(productRate);
    if (type !== "" && (rateNumber == null || !Number.isFinite(rateNumber) || rateNumber < 0)) {
      return setError("Enter the rate");
    }
    if (type === "PERCENT" && rateNumber != null && rateNumber > 100) {
      return setError("A percent cannot be more than 100");
    }
    if (productNumber != null && (!Number.isFinite(productNumber) || productNumber < 0 || productNumber > 100)) {
      return setError("Product commission is a percent from 0 to 100");
    }
    setError(null);
    setSaving(true);
    try {
      await setCommissionPlan(plan.staffProfileId, {
        type: type === "" ? null : type,
        rate: type === "" ? null : rateNumber,
        productRate: productNumber,
      });
      await onChanged();
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="border-b px-3 py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-[8rem] flex-1 text-sm font-medium">{plan.displayName}</span>
        <select
          className={dashboardSelectClass(!canEdit, "w-44")}
          disabled={!canEdit}
          value={type}
          aria-label={`How ${plan.displayName} earns on services`}
          onChange={(e) => setType(e.target.value as CommissionType | "")}
        >
          <option value="">No commission</option>
          <option value="PERCENT">Percent of each service</option>
          <option value="FIXED">Fixed amount per service</option>
        </select>
        {type !== "" ? (
          <input
            className={dashboardInputClass(!canEdit, "w-24 font-mono")}
            disabled={!canEdit}
            inputMode="decimal"
            value={rate}
            placeholder={type === "PERCENT" ? "40" : "100"}
            aria-label={type === "PERCENT" ? "Percent" : "Shillings per service"}
            onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        ) : null}
        <label className="flex items-center gap-1.5 text-sm">
          <span className={dashboardHintClass()}>On products they sell</span>
          <input
            className={dashboardInputClass(!canEdit, "w-16 font-mono")}
            disabled={!canEdit}
            inputMode="decimal"
            value={productRate}
            placeholder="0"
            aria-label="Percent on products"
            onChange={(e) => setProductRate(e.target.value.replace(/[^0-9.]/g, ""))}
          />
          <span className={dashboardHintClass()}>%</span>
        </label>
        {canEdit && dirty ? (
          <Button size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        ) : null}
      </div>
      {example != null && example > 0 ? (
        <p className={`mt-1 ${dashboardHintClass()}`}>
          On a {formatMoney(300, "KES")} service they earn {formatMoney(example, "KES")} and the shop keeps{" "}
          {formatMoney(300 - example, "KES")}.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </li>
  );
}
