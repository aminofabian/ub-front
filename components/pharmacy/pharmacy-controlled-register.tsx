"use client";

import { BookLock } from "lucide-react";
import { useEffect, useState } from "react";

import {
  RX_INK,
  RX_META,
  RX_INPUT,
  RX_MUTED,
  RX_ROW,
  RX_RULE,
  RX_TD,
  RX_TH,
  Field,
  errorText,
  formatDate,
  formatDateTime,
  formatQty,
} from "@/components/pharmacy/pharmacy-ui";
import { EmptyState, Panel } from "@/components/sms-hub/sms-hub-ui";
import { cn } from "@/lib/utils";
import {
  fetchControlledItems,
  fetchControlledRegister,
  type ControlledItem,
  type ControlledRegister,
} from "@/lib/pharmacy-api";

const MOVEMENT_LABEL: Record<string, string> = {
  opening: "Opening stock",
  receipt: "Received",
  purchase: "Received",
  adjustment: "Adjustment",
  transfer_out: "Transferred out",
  transfer_in: "Transferred in",
  sale: "Dispensed",
  sale_void: "Sale voided",
  refund: "Returned by patient",
  refund_wastage: "Return written off",
  return_to_supplier: "Returned to supplier",
  wastage: "Written off",
  web_order_expiry: "Online order lapsed",
  web_order_void: "Online order cancelled",
  batch_clearance: "Batch cleared",
};

function movementLabel(type: string): string {
  return MOVEMENT_LABEL[type] ?? type.replace(/_/g, " ");
}

function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * The controlled-medicines register: every movement of a controlled medicine with a running
 * balance, read straight from stock. Opening it is noted in the activity log.
 */
export function PharmacyControlledRegister() {
  const [items, setItems] = useState<ControlledItem[] | null>(null);
  const [itemId, setItemId] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return isoDay(d);
  });
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [register, setRegister] = useState<ControlledRegister | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetchControlledItems()
      .then((list) => {
        if (!alive) return;
        setItems(list);
        setItemId((current) => current || list[0]?.itemId || "");
      })
      .catch((err) => alive && setError(errorText(err, "Could not load controlled medicines.")));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!itemId) return;
    let alive = true;
    fetchControlledRegister(itemId, from, to)
      .then((res) => {
        if (!alive) return;
        setRegister(res);
        setError("");
      })
      .catch((err) => alive && setError(errorText(err, "Could not load the register.")));
    return () => {
      alive = false;
    };
  }, [itemId, from, to]);

  if (items != null && items.length === 0) {
    return (
      <Panel title="Controlled register">
        <EmptyState
          icon={BookLock}
          title="No controlled medicines"
          body="Classify a medicine as Controlled under Medicines and its register appears here."
        />
      </Panel>
    );
  }

  const shown = register && register.itemId === itemId ? register : null;

  return (
    <Panel
      title="Controlled register"
      description="Every receipt, sale and write-off of a controlled medicine, in date order, with the balance after each. Quarantined stock is still counted: it is on your premises."
      flush
    >
      <div className={cn("flex flex-wrap items-end gap-3 border-b px-4 py-3", RX_RULE)}>
        <Field label="Medicine" className="min-w-[14rem] flex-1">
          <select className={RX_INPUT} value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {(items ?? []).map((i) => (
              <option key={i.itemId} value={i.itemId}>
                {[i.name, i.strength, i.dosageForm].filter(Boolean).join(" · ")} (balance {formatQty(i.onRecord)})
              </option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input className={RX_INPUT} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <input className={RX_INPUT} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>

      {error ? <p role="alert" className="px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {!shown && !error ? <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>Loading…</p> : null}

      {shown ? (
        <>
          <div className={cn("flex flex-wrap gap-x-8 gap-y-1 border-b px-4 py-3 text-sm", RX_RULE)}>
            <p>
              <span className={RX_MUTED}>Balance at the start of {formatDate(shown.from)}: </span>
              <span className={cn("font-semibold tabular-nums", RX_INK)}>{formatQty(shown.openingBalance)}</span>
            </p>
            <p>
              <span className={RX_MUTED}>Balance at the end of {formatDate(shown.to)}: </span>
              <span className={cn("font-semibold tabular-nums", RX_INK)}>{formatQty(shown.closingBalance)}</span>
            </p>
          </div>
          {shown.truncated ? (
            <p role="alert" className="px-4 py-3 text-sm text-[#8A4129]">
              This period has more entries than can be shown at once. Choose a shorter range.
            </p>
          ) : null}
          {shown.entries.length === 0 ? (
            <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>No movements in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse">
                <thead>
                  <tr className={cn("border-b", RX_RULE)}>
                    <th className={RX_TH}>When</th>
                    <th className={RX_TH}>Entry</th>
                    <th className={RX_TH}>Lot</th>
                    <th className={cn(RX_TH, "text-right")}>In</th>
                    <th className={cn(RX_TH, "text-right")}>Out</th>
                    <th className={cn(RX_TH, "text-right")}>Balance</th>
                    <th className={RX_TH}>Patient and prescriber</th>
                    <th className={RX_TH}>By</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.entries.map((e, i) => (
                    <tr key={`${e.at}-${i}`} className={RX_ROW}>
                      <td className={cn(RX_TD, RX_META)}>{formatDateTime(e.at)}</td>
                      <td className={RX_TD}>
                        {movementLabel(e.movementType)}
                        {e.note ? <span className={cn("block text-[12.5px]", RX_MUTED)}>{e.note}</span> : null}
                      </td>
                      <td className={cn(RX_TD, "font-mono text-[13px]")}>{e.lotNumber ?? ""}</td>
                      <td className={cn(RX_TD, "text-right tabular-nums")}>{e.quantityIn != null ? formatQty(e.quantityIn) : ""}</td>
                      <td className={cn(RX_TD, "text-right tabular-nums")}>{e.quantityOut != null ? formatQty(e.quantityOut) : ""}</td>
                      <td className={cn(RX_TD, "text-right font-semibold tabular-nums", RX_INK)}>{formatQty(e.balance)}</td>
                      <td className={RX_TD}>
                        {e.patientName ?? ""}
                        {e.prescriberName ? <span className={cn("block text-[12.5px]", RX_MUTED)}>Prescribed by {e.prescriberName}</span> : null}
                      </td>
                      <td className={RX_TD}>{e.dispensedByName ?? e.byName ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </Panel>
  );
}
