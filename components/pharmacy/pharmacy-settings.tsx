"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  RX_INK,
  RX_INPUT,
  RX_MUTED,
  RX_ROW,
  RX_RULE,
  RX_TD,
  RX_TH,
  Field,
  errorText,
} from "@/components/pharmacy/pharmacy-ui";
import { Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import {
  fetchPharmacyProfile,
  savePharmacyProfile,
  savePharmacyStaffCredential,
  type PharmacyProfile,
  type PharmacyStaff,
} from "@/lib/pharmacy-api";
import { cn } from "@/lib/utils";

export function PharmacySettings({ canManage, onChanged }: { canManage: boolean; onChanged: () => void }) {
  const [profile, setProfile] = useState<PharmacyProfile | null>(null);
  const [error, setError] = useState("");
  const [licenceNo, setLicenceNo] = useState("");
  const [expires, setExpires] = useState("");
  const [superintendent, setSuperintendent] = useState("");
  const [controlled, setControlled] = useState(false);
  const [secondCheck, setSecondCheck] = useState(false);
  const [shortDated, setShortDated] = useState("90");
  const [busy, setBusy] = useState(false);

  const apply = useCallback((p: PharmacyProfile) => {
    setProfile(p);
    setLicenceNo(p.premisesLicenceNo ?? "");
    setExpires(p.licenceExpiresOn ?? "");
    setSuperintendent(p.superintendentUserId ?? "");
    setControlled(p.controlledSalesEnabled);
    setSecondCheck(p.secondCheckEnabled ?? false);
    setShortDated(String(p.shortDatedDays));
  }, []);

  useEffect(() => {
    fetchPharmacyProfile()
      .then(apply)
      .catch((err) => setError(errorText(err, "Could not load pharmacy settings.")));
  }, [apply]);

  const save = async () => {
    const days = Number(shortDated);
    if (!Number.isInteger(days) || days < 7 || days > 730) {
      setError("Short-dated days must be a whole number from 7 to 730.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      apply(
        await savePharmacyProfile({
          premisesLicenceNo: licenceNo.trim() || null,
          licenceExpiresOn: expires || null,
          superintendentUserId: superintendent || null,
          controlledSalesEnabled: controlled,
          secondCheckEnabled: secondCheck,
          shortDatedDays: days,
        }),
      );
      toast.success("Saved");
      onChanged();
    } catch (err) {
      setError(errorText(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  };

  if (!profile) {
    return error ? (
      <p role="alert" className="px-1 py-4 text-sm text-destructive">{error}</p>
    ) : (
      <p className={cn("px-1 py-6 text-sm", RX_MUTED)}>Loading…</p>
    );
  }

  return (
    <>
      <Panel
        title="Premises and licence"
        description="Kiosk stores what you enter here and does not check it with any regulator. Recording a licence number does not make a shop licensed."
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Premises licence number">
              <input className={RX_INPUT} value={licenceNo} onChange={(e) => setLicenceNo(e.target.value)} maxLength={64} disabled={!canManage} />
            </Field>
            <Field label="Licence expires on">
              <input className={RX_INPUT} type="date" value={expires} onChange={(e) => setExpires(e.target.value)} disabled={!canManage} />
            </Field>
            <Field label="Superintending pharmacist" hint="Chosen from staff who may dispense.">
              <select className={RX_INPUT} value={superintendent} onChange={(e) => setSuperintendent(e.target.value)} disabled={!canManage}>
                <option value="">Not set</option>
                {profile.staff.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.name}
                  </option>
                ))}
                {profile.superintendentUserId && !profile.staff.some((s) => s.userId === profile.superintendentUserId) ? (
                  <option value={profile.superintendentUserId}>{profile.superintendentName ?? "Current"}</option>
                ) : null}
              </select>
            </Field>
            <Field label="Count stock as short-dated when it expires within" hint="Days. Used by the expiry lists and the overview.">
              <input className={RX_INPUT} inputMode="numeric" value={shortDated} onChange={(e) => setShortDated(e.target.value)} disabled={!canManage} />
            </Field>
          </div>
          <label className={cn("flex items-start gap-2 border-t pt-4 text-sm", RX_RULE)}>
            <input type="checkbox" className="mt-1" checked={controlled} onChange={(e) => setControlled(e.target.checked)} disabled={!canManage} />
            <span>
              <span className={cn("font-medium", RX_INK)}>Allow controlled medicines to be sold through the till</span>
              <span className={cn("block text-[12.5px] leading-snug", RX_MUTED)}>
                Off by default. Each sale needs a dispensing record and appears in the Controlled register
                tab. Check with your pharmacist that the register meets what your regulator asks for.
              </span>
            </span>
          </label>
          <label className={cn("flex items-start gap-2 border-t pt-4 text-sm", RX_RULE)}>
            <input type="checkbox" className="mt-1" checked={secondCheck} onChange={(e) => setSecondCheck(e.target.checked)} disabled={!canManage} />
            <span>
              <span className={cn("font-medium", RX_INK)}>Ask for a second check on each dispensing record</span>
              <span className={cn("block text-[12.5px] leading-snug", RX_MUTED)}>
                Off by default. When on, the dispensing log marks each record as awaiting a check until
                someone else who may dispense confirms it. It does not hold up the sale.
              </span>
            </span>
          </label>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {canManage ? (
            <div>
              <Button type="submit" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy}>
                Save
              </Button>
            </div>
          ) : null}
        </form>
      </Panel>

      <Panel
        title="Staff who may dispense"
        description="Anyone with the Pharmacist role, or another role that includes dispensing. Give a role under Business, Staff. A till PIN lets them approve a cashier's sale."
        flush
      >
        {profile.staff.length === 0 ? (
          <p className={cn("px-4 py-4 text-sm", RX_MUTED)}>
            Nobody may dispense yet. Until someone can, prescription-only medicines cannot be sold.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className={cn("border-b", RX_RULE)}>
                  <th className={RX_TH}>Name</th>
                  <th className={RX_TH}>Title</th>
                  <th className={RX_TH}>Registration number</th>
                  <th className={RX_TH}>Till PIN</th>
                  <th className={cn(RX_TH, "text-right")}>
                    <span className="sr-only">Save</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {profile.staff.map((s) => (
                  <StaffRow key={s.userId} staff={s} canManage={canManage} onSaved={apply} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function StaffRow({
  staff,
  canManage,
  onSaved,
}: {
  staff: PharmacyStaff;
  canManage: boolean;
  onSaved: (p: PharmacyProfile) => void;
}) {
  const [title, setTitle] = useState(staff.title ?? "");
  const [regNo, setRegNo] = useState(staff.registrationNo ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = title !== (staff.title ?? "") || regNo !== (staff.registrationNo ?? "");

  const save = async () => {
    setBusy(true);
    try {
      onSaved(await savePharmacyStaffCredential(staff.userId, { title: title.trim() || null, registrationNo: regNo.trim() || null }));
      toast.success("Saved");
    } catch (err) {
      toast.error(errorText(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className={RX_ROW}>
      <td className={cn(RX_TD, "font-medium", RX_INK)}>{staff.name}</td>
      <td className={RX_TD}>
        <input
          className={RX_INPUT}
          aria-label={`Title for ${staff.name}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={64}
          placeholder="e.g. Pharmacist"
          disabled={!canManage}
        />
      </td>
      <td className={RX_TD}>
        <input
          className={RX_INPUT}
          aria-label={`Registration number for ${staff.name}`}
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
          maxLength={64}
          disabled={!canManage}
        />
      </td>
      <td className={cn(RX_TD, staff.hasPin ? RX_MUTED : "text-[#8A4129]")}>{staff.hasPin ? "Set" : "Not set"}</td>
      <td className={cn(RX_TD, "text-right")}>
        {canManage ? (
          <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={!dirty || busy} onClick={() => void save()}>
            Save
          </Button>
        ) : null}
      </td>
    </tr>
  );
}
