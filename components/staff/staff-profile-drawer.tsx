"use client";

import { useCallback, useEffect, useState } from "react";
import { IdCard, Loader2, Save } from "lucide-react";

import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import {
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  createStaffSalary,
  fetchStaffProfile,
  fetchStaffSalaries,
  updateStaffProfile,
  type SalaryRecord,
  type StaffProfileRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userLabel: string;
  permissions: string[] | undefined;
};

type ProfileDraft = {
  displayName: string;
  title: string;
  photoUrl: string;
  startDate: string;
  employmentStatus: string;
  phone: string;
  address: string;
  nationalId: string;
  employeeCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bankPaybill: string;
  bankAccount: string;
  bankName: string;
  notes: string;
};

const EMPTY_DRAFT: ProfileDraft = {
  displayName: "",
  title: "",
  photoUrl: "",
  startDate: "",
  employmentStatus: "active",
  phone: "",
  address: "",
  nationalId: "",
  employeeCode: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  bankPaybill: "",
  bankAccount: "",
  bankName: "",
  notes: "",
};

function draftFromProfile(profile: StaffProfileRecord): ProfileDraft {
  const bank = profile.privateFields?.bankDetails ?? {};
  return {
    displayName: profile.publicFields.displayName ?? "",
    title: profile.publicFields.title ?? "",
    photoUrl: profile.publicFields.photoUrl ?? "",
    startDate: profile.publicFields.startDate ?? "",
    employmentStatus: profile.publicFields.employmentStatus || "active",
    phone: profile.privateFields?.phone ?? "",
    address: profile.privateFields?.address ?? "",
    nationalId: profile.privateFields?.nationalId ?? "",
    employeeCode: profile.privateFields?.employeeCode ?? "",
    emergencyContactName: profile.privateFields?.emergencyContactName ?? "",
    emergencyContactPhone: profile.privateFields?.emergencyContactPhone ?? "",
    bankPaybill: String(bank.paybill ?? bank.mobileMoney ?? ""),
    bankAccount: String(bank.accountNumber ?? ""),
    bankName: String(bank.bankName ?? ""),
    notes: profile.privateFields?.notes ?? "",
  };
}

export function StaffProfileDrawer({
  open,
  onOpenChange,
  userId,
  userLabel,
  permissions,
}: Props) {
  const canUpdate = hasPermission(permissions, Permission.StaffHrUpdate);
  const canViewPayroll = hasPermission(permissions, Permission.PayrollView);
  const canManagePayroll = hasPermission(permissions, Permission.PayrollManage);
  const canHrRead = hasPermission(permissions, Permission.StaffHrRead);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<StaffProfileRecord | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [salaryAmount, setSalaryAmount] = useState("");
  const [salaryFrom, setSalaryFrom] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [addingSalary, setAddingSalary] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchStaffProfile(userId);
      setProfile(next);
      setDraft(draftFromProfile(next));
      if (canViewPayroll) {
        const rows = await fetchStaffSalaries(userId);
        setSalaries(rows);
      } else {
        setSalaries([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userId, canViewPayroll]);

  useEffect(() => {
    if (open && userId) {
      void load();
    }
    if (!open) {
      setProfile(null);
      setDraft(EMPTY_DRAFT);
      setError(null);
    }
  }, [open, userId, load]);

  async function onSave() {
    if (!userId || !canUpdate) return;
    setSaving(true);
    setError(null);
    try {
      const bankDetails: Record<string, unknown> = {};
      if (draft.bankName.trim()) bankDetails.bankName = draft.bankName.trim();
      if (draft.bankAccount.trim()) {
        bankDetails.accountNumber = draft.bankAccount.trim();
      }
      if (draft.bankPaybill.trim()) {
        bankDetails.paybill = draft.bankPaybill.trim();
      }
      const updated = await updateStaffProfile(userId, {
        displayName: draft.displayName,
        title: draft.title,
        photoUrl: draft.photoUrl || null,
        startDate: draft.startDate || null,
        employmentStatus: draft.employmentStatus,
        phone: draft.phone,
        address: draft.address,
        nationalId: draft.nationalId,
        employeeCode: draft.employeeCode,
        emergencyContactName: draft.emergencyContactName,
        emergencyContactPhone: draft.emergencyContactPhone,
        bankDetails,
        notes: draft.notes,
      });
      setProfile(updated);
      setDraft(draftFromProfile(updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function onAddSalary() {
    if (!userId || !canManagePayroll) return;
    const amount = Number(salaryAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !salaryFrom) {
      setError("Enter a valid salary amount and effective date.");
      return;
    }
    setAddingSalary(true);
    setError(null);
    try {
      await createStaffSalary(userId, {
        amount,
        effectiveFrom: salaryFrom,
      });
      setSalaryAmount("");
      const rows = await fetchStaffSalaries(userId);
      setSalaries(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add salary");
    } finally {
      setAddingSalary(false);
    }
  }

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Staff profile"
      description={userLabel}
      contextLabel="People"
      icon={<IdCard className="size-5 text-primary" aria-hidden />}
      width="wide"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {canUpdate ? (
            <Button type="button" disabled={saving || loading} onClick={() => void onSave()}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-4" aria-hidden />
                  Save profile
                </>
              )}
            </Button>
          ) : null}
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading profile…
        </div>
      ) : (
        <div className="space-y-6">
          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <FormDrawerFields
            legend="Public"
            hint="Visible to colleagues with staff profile access. Safe for receipts or staff boards."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Display name
                <input
                  className={dashboardInputClass()}
                  value={draft.displayName}
                  disabled={!canUpdate}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, displayName: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Title
                <input
                  className={dashboardInputClass()}
                  placeholder="Sales Associate"
                  value={draft.title}
                  disabled={!canUpdate}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Photo URL
                <input
                  className={dashboardInputClass()}
                  value={draft.photoUrl}
                  disabled={!canUpdate}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, photoUrl: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Start date
                <input
                  type="date"
                  className={dashboardInputClass()}
                  value={draft.startDate}
                  disabled={!canUpdate}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, startDate: e.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Employment status
                <select
                  className={dashboardSelectClass()}
                  value={draft.employmentStatus}
                  disabled={!canUpdate}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      employmentStatus: e.target.value,
                    }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On leave</option>
                  <option value="terminated">Terminated</option>
                </select>
              </label>
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <p>
                  Branch: {profile?.branchName ?? "All / unset"}
                </p>
                <p>Login role: {profile?.roleName ?? "—"}</p>
              </div>
            </div>
          </FormDrawerFields>

          {canHrRead ? (
            <FormDrawerFields
              legend="Private (HR)"
              hint="Only managers and owners. PIN and password stay on the user account actions."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Phone
                  <input
                    className={dashboardInputClass()}
                    value={draft.phone}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, phone: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Employee code
                  <input
                    className={dashboardInputClass()}
                    value={draft.employeeCode}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, employeeCode: e.target.value }))
                    }
                  />
                </label>
                <label className="sm:col-span-2 flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Address
                  <input
                    className={dashboardInputClass()}
                    value={draft.address}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, address: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  National ID
                  <input
                    className={dashboardInputClass()}
                    value={draft.nationalId}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, nationalId: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Emergency contact
                  <input
                    className={dashboardInputClass()}
                    placeholder="Name"
                    value={draft.emergencyContactName}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        emergencyContactName: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Emergency phone
                  <input
                    className={dashboardInputClass()}
                    value={draft.emergencyContactPhone}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        emergencyContactPhone: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Bank name
                  <input
                    className={dashboardInputClass()}
                    value={draft.bankName}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, bankName: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Account number
                  <input
                    className={dashboardInputClass()}
                    value={draft.bankAccount}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, bankAccount: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Paybill / mobile money
                  <input
                    className={dashboardInputClass()}
                    value={draft.bankPaybill}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, bankPaybill: e.target.value }))
                    }
                  />
                </label>
                <label className="sm:col-span-2 flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Notes
                  <textarea
                    className={dashboardInputClass(false, "min-h-20")}
                    value={draft.notes}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                </label>
              </div>
            </FormDrawerFields>
          ) : null}

          {canViewPayroll ? (
            <FormDrawerFields
              legend="Salary"
              hint="Raises add a new row with an effective date — history is never overwritten."
            >
              <ul className="space-y-1.5 text-sm">
                {salaries.length === 0 ? (
                  <li className="text-muted-foreground">No salary records yet.</li>
                ) : (
                  salaries.map((row) => (
                    <li
                      key={row.id}
                      className="flex justify-between gap-3 rounded-md border border-border/50 px-3 py-2"
                    >
                      <span>
                        {Number(row.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}{" "}
                        from {row.effectiveFrom}
                      </span>
                    </li>
                  ))
                )}
              </ul>
              {canManagePayroll ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    className={dashboardInputClass()}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                  />
                  <input
                    className={dashboardInputClass()}
                    type="date"
                    value={salaryFrom}
                    onChange={(e) => setSalaryFrom(e.target.value)}
                  />
                  <Button
                    type="button"
                    disabled={addingSalary}
                    onClick={() => void onAddSalary()}
                  >
                    {addingSalary ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      "Add"
                    )}
                  </Button>
                </div>
              ) : null}
            </FormDrawerFields>
          ) : null}
        </div>
      )}
    </FormDrawer>
  );
}
