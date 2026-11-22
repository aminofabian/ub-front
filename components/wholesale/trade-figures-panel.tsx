"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  downloadSalesInvoicesCsv,
  fetchSalesFigures,
  fetchSupplierStanding,
  setSupplierClosedDays,
  setSupplierDispatchLeadTime,
  fetchSupplierStandingOrders,
  type SupplierStanding,
  stopSupplierStandingOrder,
  type SalesFigures,
  type StandingOrder,
} from "@/lib/api";

const PERIODS = [7, 30, 90];

function money(currency: string | null, value: number): string {
  return `${currency ?? ""} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
}

/** The supplier's own trade figures, its buyers' standing orders, and its invoices as a file. */
export function TradeFiguresPanel() {
  const [days, setDays] = useState(30);
  const [figures, setFigures] = useState<SalesFigures | null>(null);
  const [standing, setStanding] = useState<StandingOrder[]>([]);
  const [standingMeasures, setStandingMeasures] = useState<SupplierStanding | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const changeLeadTime = async (workingDays: number) => {
    try {
      await setSupplierDispatchLeadTime(workingDays);
      setStandingMeasures(await fetchSupplierStanding(days));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the dispatch time");
    }
  };

  const replaceClosedDays = async (dates: string[]) => {
    try {
      await setSupplierClosedDays(dates);
      setStandingMeasures(await fetchSupplierStanding(days));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the closed days");
    }
  };

  const load = useCallback(() => {
    let alive = true;
    setFailed(false);
    Promise.all([fetchSalesFigures(days), fetchSupplierStandingOrders()])
      .then(([f, s]) => {
        if (!alive) return;
        setFigures(f);
        setStanding(s);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    // Standing is separate, so a failure here never blanks the figures.
    fetchSupplierStanding(days)
      .then((s) => {
        if (alive) setStandingMeasures(s);
      })
      .catch(() => {
        if (alive) setStandingMeasures(null);
      });
    return () => {
      alive = false;
    };
  }, [days]);

  useEffect(() => load(), [load]);

  const stop = async (id: string) => {
    setBusy(true);
    try {
      await stopSupplierStandingOrder(id);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not stop the standing order");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setBusy(true);
    try {
      await downloadSalesInvoicesCsv();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download the invoices");
    } finally {
      setBusy(false);
    }
  };

  if (failed) {
    return (
      <p className="mt-6 text-[14px] text-foreground">
        Could not load the figures.{" "}
        <button type="button" className="font-medium underline underline-offset-4" onClick={() => load()}>
          Try again
        </button>
      </p>
    );
  }
  if (!figures) return <p className="mt-6 text-[14px] text-muted-foreground">Loading…</p>;

  const stat = (label: string, value: string) => (
    <div>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="text-[16px] font-semibold tabular-nums">{value}</dd>
    </div>
  );
  const table = (title: string, rows: SalesFigures["topBuyers"], withQuantity: boolean) =>
    rows.length === 0 ? null : (
      <div className="mt-5">
        <p className="text-[14px] font-medium">{title}</p>
        <table className="mt-1 w-full text-[13px]">
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-border">
                <td className="py-1.5 pr-2">{r.name}</td>
                {withQuantity ? <td className="py-1.5 text-right tabular-nums">{Number(r.quantity.toFixed(4))}</td> : null}
                <td className="py-1.5 text-right tabular-nums">{money(figures.currency, r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={days === p}
            className={`h-11 border px-3 text-[13px] font-medium sm:h-9 ${
              days === p ? "border-foreground bg-foreground text-background" : "border-foreground/15 text-foreground"
            }`}
            onClick={() => setDays(p)}
          >
            Last {p} days
          </button>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {stat("Orders", String(figures.orders))}
        {stat("Waiting for your answer", String(figures.waitingForAnAnswer))}
        {stat("Asked for", money(figures.currency, figures.askedValue))}
        {stat("You accepted", money(figures.currency, figures.acceptedValue))}
        {stat("Supplied of what was asked", figures.fillRatePercent == null ? "—" : `${figures.fillRatePercent}%`)}
        {stat("Invoiced", money(figures.currency, figures.invoiced))}
        {stat("Still owed on those invoices", money(figures.currency, figures.stillOwed))}
        {figures.answeredSample !== undefined
          ? stat(
              "Answer times",
              figures.medianAnswerWorkingHours != null
                ? `Usually ${figures.medianAnswerWorkingHours} working hours (${figures.answeredSample} orders)`
                : `Shown after 5 answered orders (${figures.answeredSample} so far)`,
            )
          : null}
      </dl>

      {standingMeasures?.enabled ? (
        <div className="mt-6">
          <p className="text-[14px] font-medium">Your standing, last {days} days</p>
          <label className="mt-2 flex items-center gap-2 text-[13px]">
            Dispatch within
            <select
              className="rounded-none border border-[#E8E8E8] bg-white px-2 py-1 text-[13px]"
              value={standingMeasures.dispatchLeadWorkingDays ?? 2}
              onChange={(e) => void changeLeadTime(Number(e.target.value))}
            >
              <option value={1}>1 working day</option>
              <option value={2}>2 working days</option>
              <option value={3}>3 working days</option>
            </select>
          </label>
          <div className="mt-3 text-[13px]">
            <p className="text-muted-foreground">Closed days stop the clock. Add the days you will not work.</p>
            <form
              className="mt-2 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem("closedDay") as HTMLInputElement | null;
                const value = input?.value ?? "";
                if (!value) return;
                const next = Array.from(new Set([...(standingMeasures.closedDays ?? []), value])).sort();
                void replaceClosedDays(next);
                input?.form?.reset();
              }}
            >
              <input
                name="closedDay"
                type="date"
                className="rounded-none border border-[#E8E8E8] bg-white px-2 py-1 text-[13px]"
              />
              <Button type="submit" size="sm" variant="outline">Add closed day</Button>
            </form>
            {(standingMeasures.closedDays ?? []).length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {(standingMeasures.closedDays ?? []).map((d) => (
                  <li key={d} className="flex items-center gap-1 border border-[#E8E8E8] px-2 py-1">
                    <span className="tabular-nums">{d}</span>
                    <button
                      type="button"
                      className="text-[12px] text-muted-foreground hover:underline"
                      onClick={() =>
                        void replaceClosedDays((standingMeasures.closedDays ?? []).filter((x) => x !== d))
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {standingMeasures.state === "new" ? (
            <p className="mt-1 text-[13px] text-muted-foreground">
              New on Kiosk. Standing appears after 10 answered orders from 3 buyers. So far: {standingMeasures.answeredOrders} answered, from {standingMeasures.buyers} buyers.
            </p>
          ) : (
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {standingMeasures.measures.map((m) =>
                stat(
                  m.label,
                  m.value == null
                    ? "—"
                    : m.unit === "hours"
                      ? `${m.value} working hours (${m.sample} orders)`
                      : `${m.value}% (${m.sample} orders)`,
                ),
              )}
            </dl>
          )}
        </div>
      ) : null}

      {table("Biggest buyers, by what you accepted", figures.topBuyers, false)}
      {table("Biggest products, by what you accepted", figures.topProducts, true)}

      <div className="mt-6">
        <p className="text-[14px] font-medium">Standing orders</p>
        {standing.length === 0 ? (
          <p className="mt-1 text-[13px] text-muted-foreground">
            No buyer has a standing order with you. A buyer sets one up from the marketplace basket.
          </p>
        ) : (
          <ul className="mt-1 divide-y divide-border border-y border-border text-[13px]">
            {standing.map((o) => (
              <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block font-medium">
                    {o.buyerBusinessName} · every {o.everyDays} days · next {o.nextRunOn}
                  </span>
                  <span className="block text-muted-foreground">
                    {o.lines.map((l) => `${Number(l.quantity.toFixed(4))} × ${l.itemName}`).join(", ")}
                  </span>
                  {o.lastResult ? <span className="block text-muted-foreground">{o.lastResult}</span> : null}
                </span>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void stop(o.id)}>
                  Stop
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void download()}>
          Download invoices (CSV)
        </Button>
        <p className="mt-1 text-[12px] text-muted-foreground">For your accountant or another system. It includes buyers&apos; phone numbers.</p>
      </div>
    </div>
  );
}
