"use client";

import { useEffect, useState } from "react";

import { Field, RX_INK, RX_INPUT, RX_MUTED, RX_ROW, RX_RULE, RX_TD, RX_TH, errorText } from "@/components/pharmacy/pharmacy-ui";
import { Figure, Panel } from "@/components/sms-hub/sms-hub-ui";
import { fetchClinicTakings, type ClinicTakings } from "@/lib/clinic-api";
import { formatKsh } from "@/lib/clinic-visit";
import { cn } from "@/lib/utils";

function localDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * What the clinic billed between two days, by service and by who did it. Money and counts only:
 * no patient appears here. A refund made afterwards is not taken off.
 */
export function ClinicTakingsReport({ branchId }: { branchId: string }) {
  const [from, setFrom] = useState(() => localDay(-6));
  const [to, setTo] = useState(() => localDay(0));
  const [data, setData] = useState<ClinicTakings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId || !from || !to || from > to) return;
    let alive = true;
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    fetchClinicTakings(branchId, start.toISOString(), end.toISOString())
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((err) => {
        if (alive) setError(errorText(err, "Could not load the takings. Check the connection."));
      });
    return () => {
      alive = false;
    };
  }, [branchId, from, to]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From" className="w-44">
          <input className={RX_INPUT} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To" className="w-44">
          <input className={RX_INPUT} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>
      {from > to ? <p className="text-sm text-destructive">The first day is after the last.</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {data ? (
        <>
          <div className={cn("grid gap-4 rounded-[2px] border p-4 sm:grid-cols-3", RX_RULE)}>
            <Figure label="Visits paid" value={data.visits} />
            <Figure label="Services" value={formatKsh(data.services)} />
            <Figure label="Medicines and products" value={formatKsh(data.products)} />
          </div>
          <Panel title="By service and who did it" description="What was billed. A refund made afterwards is not taken off." flush>
            {data.rows.length === 0 ? (
              <p className={cn("p-4 text-sm", RX_MUTED)}>No visits were paid in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse">
                  <thead>
                    <tr className={cn("border-b", RX_RULE)}>
                      <th className={RX_TH}>Service</th>
                      <th className={RX_TH}>Done by</th>
                      <th className={cn(RX_TH, "text-right")}>Times</th>
                      <th className={cn(RX_TH, "text-right")}>Billed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={`${r.serviceId ?? r.serviceName}-${r.staffProfileId ?? "none"}`} className={RX_ROW}>
                        <td className={cn(RX_TD, "font-medium", RX_INK)}>{r.serviceName}</td>
                        <td className={RX_TD}>{r.staffName ?? <span className={RX_MUTED}>Not recorded</span>}</td>
                        <td className={cn(RX_TD, "text-right tabular-nums")}>{r.times}</td>
                        <td className={cn(RX_TD, "text-right tabular-nums")}>{formatKsh(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      ) : !error ? (
        <p className={cn("text-sm", RX_MUTED)}>Loading…</p>
      ) : null}
    </div>
  );
}
