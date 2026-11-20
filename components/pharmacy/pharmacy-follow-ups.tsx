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
import { fetchOwings, fetchRefillsDue, type Owing, type RefillDue } from "@/lib/pharmacy-api";

/**
 * What the pharmacy still owes its patients: prescriptions supplied in part, and supplies about
 * to run out. Opening this is noted in the activity log because it names patients.
 */
export function PharmacyFollowUps() {
  const [owings, setOwings] = useState<Owing[] | null>(null);
  const [refills, setRefills] = useState<RefillDue[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
    </>
  );
}
