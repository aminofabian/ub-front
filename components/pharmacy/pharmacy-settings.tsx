"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setUserPin } from "@/lib/api";
import {
  fetchPharmacyProfile,
  savePharmacyProfile,
  savePharmacyStaffCredential,
  type PharmacyProfile,
  type PharmacyStaff,
} from "@/lib/pharmacy-api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function PharmacySettings({ canManage, onChanged }: { canManage: boolean; onChanged: () => void }) {
  const { me } = useDashboard();
  const canSetPin = hasPermission(me?.permissions, Permission.UsersUpdate);
  const [pinStaff, setPinStaff] = useState<PharmacyStaff | null>(null);
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
        description="Anyone with the Pharmacist role, or another role that includes dispensing. Give a role under Business, Staff. A till PIN lets them approve a cashier's sale. Setting one here needs the Users permission; ask an owner or admin if the buttons are missing."
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
                  <StaffRow
                    key={s.userId}
                    staff={s}
                    canManage={canManage}
                    canSetPin={canSetPin}
                    onSetPin={setPinStaff}
                    onSaved={apply}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {pinStaff ? (
        <PinDialog
          staff={pinStaff}
          onClose={() => setPinStaff(null)}
          onSaved={() => {
            setPinStaff(null);
            fetchPharmacyProfile()
              .then(apply)
              .catch(() => toast.error("PIN set, but the list could not be refreshed."));
          }}
        />
      ) : null}
    </>
  );
}

function StaffRow({
  staff,
  canManage,
  canSetPin,
  onSetPin,
  onSaved,
}: {
  staff: PharmacyStaff;
  canManage: boolean;
  canSetPin: boolean;
  onSetPin: (staff: PharmacyStaff) => void;
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
      <td className={cn(RX_TD, staff.hasPin ? RX_MUTED : "text-[#8A4129]")}>
        <span>{staff.hasPin ? "Set" : "Not set"}</span>
        {canSetPin ? (
          <button
            type="button"
            className="ml-2 font-medium text-[var(--op-accent,#1d4b3b)] underline underline-offset-4"
            onClick={() => onSetPin(staff)}
          >
            {staff.hasPin ? "Change" : "Set"}
          </button>
        ) : null}
      </td>
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

/**
 * Sets a till PIN for someone who may dispense. The PIN is what lets them approve a cashier's
 * sale at the counter, so this is the last step of setting a pharmacist up. The server signs
 * them out everywhere when an admin sets a PIN, hence the warning.
 */
function PinDialog({
  staff,
  onClose,
  onSaved,
}: {
  staff: PharmacyStaff;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!/^\d{4,6}$/.test(pin)) {
      setError("A till PIN is 4 to 6 digits.");
      return;
    }
    if (pin !== confirm) {
      setError("The two PINs do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await setUserPin(staff.userId, pin);
      toast.success(`Till PIN set for ${staff.name}`);
      onSaved();
    } catch (err) {
      setError(errorText(err, "Could not set the PIN."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent side="center" className="sm:max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DialogHeader className="text-left">
            <DialogTitle>{staff.hasPin ? "Change" : "Set"} till PIN for {staff.name}</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              They enter this PIN to approve a cashier&apos;s sale. Setting it signs them out on
              every device, so they will need to sign in again.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="PIN" hint="4 to 6 digits.">
              <input
                className={RX_INPUT}
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                value={pin}
                autoFocus
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </Field>
            <Field label="Enter it again">
              <input
                className={RX_INPUT}
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </Field>
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save PIN"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
