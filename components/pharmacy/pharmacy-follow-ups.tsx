"use client";

import { CalendarClock, PackageOpen } from "lucide-react";
import { useEffect, useState } from "react";

import {
  RX_INK,
  RX_META,
  RX_MUTED,
  RX_ROW,
  RX_RULE,
  RX_TD,
  RX_TH,
  errorText,
  formatDate,
  formatDateTime,
  formatQty,
} from "@/components/pharmacy/pharmacy-ui";
import { Chip, EmptyState, Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/components/dashboard-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { hasPermission, Permission } from "@/lib/permissions";
import { closeFollowUp, fetchOwings, fetchRefillsDue, type Owing, type RefillDue } from "@/lib/pharmacy-api";

/**
 * What the pharmacy still owes its patients: prescriptions supplied in part, and supplies about
 * to run out. Opening this is noted in the activity log because it names patients.
 */
export function PharmacyFollowUps() {
  const [owings, setOwings] = useState<Owing[] | null>(null);
  const [refills, setRefills] = useState<RefillDue[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const { me } = useDashboard();
  // Clearing a follow-up is a dispenser's call, not a reader's.
  const canClose =
    hasPermission(me?.permissions, Permission.PharmacyDispense) ||
    hasPermission(me?.permissions, Permission.PharmacyManage);
  const [closing, setClosing] = useState<{ lineId: string; kind: "owed" | "refill"; what: string } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchOwings(), fetchRefillsDue()])
      .then(([o, r]) => {
        if (!alive) return;
        setOwings(o);
        setRefills(r);
        setError("");
      })
      .catch((err) => alive && setError(errorText(err, "Could not load follow-ups.")));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  return (
    <>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Panel
        title="Balances owed"
        description="Prescriptions you supplied in part in the last 180 days. A balance clears when a later sale is marked as supplying it, in the dispensing dialog."
        aside={
          <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setReloadKey((k) => k + 1)}>
            Refresh
          </Button>
        }
        flush
      >
        {owings == null && !error ? <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>Loading…</p> : null}
        {owings != null && owings.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="Nothing owed"
            body="When you supply less than a prescription asks for, enter the prescribed quantity in the dispensing dialog and the balance shows here."
          />
        ) : null}
        {owings != null && owings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className={cn("border-b", RX_RULE)}>
                  <th className={RX_TH}>First supplied</th>
                  <th className={RX_TH}>Patient</th>
                  <th className={RX_TH}>Medicine</th>
                  <th className={cn(RX_TH, "text-right")}>Prescribed</th>
                  <th className={cn(RX_TH, "text-right")}>Supplied</th>
                  <th className={cn(RX_TH, "text-right")}>Still owed</th>
                  {canClose ? (
                    <th className={cn(RX_TH, "text-right")}>
                      <span className="sr-only">Clear</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {owings.map((o) => (
                  <tr key={o.lineId} className={RX_ROW}>
                    <td className={cn(RX_TD, RX_META)}>{formatDateTime(o.dispensedAt)}</td>
                    <td className={RX_TD}>
                      <span className={o.patientName ? cn("font-medium", RX_INK) : RX_MUTED}>{o.patientName ?? "Name not recorded"}</span>
                      {o.patientPhone ? <span className={cn("block font-mono text-[12.5px]", RX_MUTED)}>{o.patientPhone}</span> : null}
                    </td>
                    <td className={RX_TD}>
                      {o.itemName}
                      {o.prescriptionRef ? <span className={cn("block text-[12.5px]", RX_MUTED)}>Prescription {o.prescriptionRef}</span> : null}
                    </td>
                    <td className={cn(RX_TD, "text-right tabular-nums")}>{formatQty(o.quantityPrescribed)}</td>
                    <td className={cn(RX_TD, "text-right tabular-nums")}>{formatQty(o.quantitySupplied)}</td>
                    <td className={cn(RX_TD, "text-right font-semibold tabular-nums text-[#8A4129]")}>
                      {formatQty(o.quantityOutstanding)}
                    </td>
                    {canClose ? (
                      <td className={cn(RX_TD, "text-right")}>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 rounded-[2px] px-3 sm:h-9"
                          aria-label={`Clear the balance of ${o.itemName}`}
                          onClick={() => setClosing({ lineId: o.lineId, kind: "owed", what: o.itemName })}
                        >
                          Clear
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Refills due"
        description="Supplies that ran out in the last two weeks or run out in the next one. Contact only patients who agreed to reminders. Kiosk does not send these for you."
        flush
      >
        {refills == null && !error ? <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>Loading…</p> : null}
        {refills != null && refills.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No refills due"
            body="Enter how many days a supply lasts in the dispensing dialog, and it shows here when it is about to run out."
          />
        ) : null}
        {refills != null && refills.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className={cn("border-b", RX_RULE)}>
                  <th className={RX_TH}>Runs out</th>
                  <th className={RX_TH}>Patient</th>
                  <th className={RX_TH}>Medicine</th>
                  <th className={RX_TH}>Reminders</th>
                  {canClose ? (
                    <th className={cn(RX_TH, "text-right")}>
                      <span className="sr-only">Dealt with</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {refills.map((r) => (
                  <tr key={r.lineId} className={RX_ROW}>
                    <td className={RX_TD}>{formatDate(r.dueOn)}</td>
                    <td className={RX_TD}>
                      <span className={r.patientName ? cn("font-medium", RX_INK) : RX_MUTED}>{r.patientName ?? "Name not recorded"}</span>
                      {r.patientPhone && r.reminderConsent ? (
                        <span className={cn("block font-mono text-[12.5px]", RX_MUTED)}>{r.patientPhone}</span>
                      ) : null}
                    </td>
                    <td className={RX_TD}>{r.itemName}</td>
                    <td className={RX_TD}>
                      {r.reminderConsent ? <Chip tone="good">Agreed</Chip> : <Chip tone="quiet">Has not agreed</Chip>}
                    </td>
                    {canClose ? (
                      <td className={cn(RX_TD, "text-right")}>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 rounded-[2px] px-3 sm:h-9"
                          aria-label={`Mark the refill of ${r.itemName} as dealt with`}
                          onClick={() => setClosing({ lineId: r.lineId, kind: "refill", what: r.itemName })}
                        >
                          Dealt with
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
      {closing ? (
        <CloseFollowUpDialog
          target={closing}
          onClose={() => setClosing(null)}
          onDone={() => {
            setClosing(null);
            setReloadKey((k) => k + 1);
          }}
        />
      ) : null}
    </>
  );
}


const REASONS: Record<"owed" | "refill", string[]> = {
  owed: ["Got the rest elsewhere", "No longer needed", "Could not be reached", "Prescription changed"],
  refill: ["Refilled", "Contacted, not refilling", "Stopped by the prescriber", "Could not be reached"],
};

function CloseFollowUpDialog({
  target,
  onClose,
  onDone,
}: {
  target: { lineId: string; kind: "owed" | "refill"; what: string };
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState(REASONS[target.kind][0]!);
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    const note = reason === "other" ? other.trim() : reason;
    if (!note) {
      setError("Say why.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await closeFollowUp(target.lineId, note);
      onDone();
    } catch (err) {
      setError(errorText(err, "Could not save. Check the connection and try again."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{target.kind === "owed" ? "Clear this balance?" : "Refill dealt with?"}</DialogTitle>
          <DialogDescription>
            {target.what} leaves this list. The dispensing record keeps what was supplied and gains a note saying why.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block space-y-1.5 text-sm">
            <span className={cn("font-medium", RX_INK)}>Why</span>
            <select
              className={cn("h-11 w-full rounded-[2px] border bg-[var(--op-surface,#FCFAF5)] px-2.5 text-sm sm:h-9", RX_RULE)}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REASONS[target.kind].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="other">Something else</option>
            </select>
          </label>
          {reason === "other" ? (
            <label className="block space-y-1.5 text-sm">
              <span className={cn("font-medium", RX_INK)}>What happened</span>
              <input
                className={cn("h-11 w-full rounded-[2px] border bg-[var(--op-surface,#FCFAF5)] px-2.5 text-sm sm:h-9", RX_RULE)}
                value={other}
                onChange={(e) => setOther(e.target.value)}
                maxLength={255}
                autoFocus
              />
            </label>
          ) : null}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Keep it on the list
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : target.kind === "owed" ? "Clear the balance" : "Mark as dealt with"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
