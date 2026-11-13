"use client";

import Link from "next/link";
import { Scissors } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { tryPostSaleWithRetries, type SaleRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { formatMoney } from "@/lib/money";
import { enqueuePendingSale, flushSaleOutbox, isSaleOutboxSupported } from "@/lib/sale-outbox";
import {
  fetchServicePerformers,
  fetchServices,
  type ServicePerformerRecord,
  type ServiceRecord,
} from "@/lib/service-business-api";
import {
  buildServiceSalePayload,
  cleanMoneyText,
  parseMoney,
  serviceCartProblem,
  serviceCartTotals,
  type ServiceCartLine,
} from "@/lib/service-cart";
import { cn } from "@/lib/utils";

const kes = (n: number) => formatMoney(n, "KES");

const TILE =
  "min-h-[4rem] rounded-[2px] border bg-[var(--op-surface,#FCFAF5)] px-3 py-2 text-left " +
  "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)] " +
  "hover:border-[var(--pos-primary,#1D4B3B)] focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-[var(--pos-primary,#1D4B3B)] disabled:cursor-not-allowed disabled:opacity-50";
const TILE_ON = "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)]";

type Done =
  | { kind: "paid"; sale: SaleRecord; toPay: number; change: number | null }
  | { kind: "queued"; toPay: number };

/**
 * Ring a service in three taps: who did it, what they did, take payment. Products are still
 * sold at the main till; this screen is for services only.
 */
export function ServiceCheckout() {
  const { branchId } = useDashboard();
  const [services, setServices] = useState<ServiceRecord[] | null>(null);
  const [performers, setPerformers] = useState<ServicePerformerRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [performerId, setPerformerId] = useState<string>("");
  const [lines, setLines] = useState<ServiceCartLine[]>([]);
  // Money fields are kept as the text the attendant typed. Parsing on every keystroke would
  // drop a trailing "." and turn 150.50 into 15050.
  const [tipText, setTipText] = useState<Record<string, string>>({});
  const [priceText, setPriceText] = useState<Record<string, string>>({});
  const [outboxProblem, setOutboxProblem] = useState<string | null>(null);
  const [method, setMethod] = useState<"cash" | "mpesa_manual">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsShift, setNeedsShift] = useState(false);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  // One key per cart: retrying the same sale after a dropped connection must not ring it twice.
  const saleKeyRef = useRef<string>(nextIdempotencyKey());
  const lineSeq = useRef(0);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [list, people] = await Promise.all([fetchServices({ active: true }), fetchServicePerformers()]);
      setServices(list);
      setPerformers(people);
      setPerformerId((current) => current || (people.length === 1 ? people[0]!.staffProfileId : ""));
    } catch {
      setLoadError("Could not load services. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Send anything this device saved while offline, now and whenever the connection returns.
  useEffect(() => {
    if (!isSaleOutboxSupported()) return;
    const flush = () =>
      void flushSaleOutbox()
        .then((result) => {
          // A saved sale the server refuses stays at the head of the queue and holds up every
          // sale behind it, so it must be seen, not swallowed.
          setOutboxProblem(result.status === "blocked" ? result.message : null);
        })
        .catch(() => undefined);
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);

  const performerName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of performers) map.set(p.staffProfileId, p.displayName);
    return map;
  }, [performers]);

  const tips = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [id, text] of Object.entries(tipText)) {
      const value = parseMoney(text);
      if (value != null && value > 0) out[id] = value;
    }
    return out;
  }, [tipText]);
  const totals = serviceCartTotals(lines, tips);
  const performersOnSale = useMemo(() => Array.from(new Set(lines.map((l) => l.performerId))), [lines]);
  const cashNumber = cashReceived.trim() === "" ? null : Number(cashReceived);
  const change = method === "cash" && cashNumber != null && cashNumber >= totals.toPay ? cashNumber - totals.toPay : null;

  function canPerform(service: ServiceRecord, who: string): boolean {
    return service.staffProfileIds.length === 0 || service.staffProfileIds.includes(who);
  }

  function addService(service: ServiceRecord) {
    if (!performerId) {
      setError("Choose who did the work first");
      return;
    }
    setError(null);
    lineSeq.current += 1;
    setLines((prev) => [
      ...prev,
      {
        key: `l${lineSeq.current}`,
        serviceId: service.id,
        name: service.name,
        performerId,
        performerName: performerName.get(performerId) ?? "Staff",
        quantity: 1,
        unitPrice: service.priceIsVariable ? service.price || 0 : service.price,
        priceIsVariable: service.priceIsVariable,
      },
    ]);
  }

  function reset() {
    saleKeyRef.current = nextIdempotencyKey();
    setLines([]);
    setTipText({});
    setPriceText({});
    setCashReceived("");
    setReference("");
    setError(null);
    setNeedsShift(false);
    setDone(null);
  }

  async function pay() {
    const problem = serviceCartProblem(lines);
    if (problem) return setError(problem);
    if (!branchId) return setError("Choose a branch at the top of the page first");
    if (method === "cash" && cashNumber != null && cashNumber < totals.toPay) {
      return setError(`That is less than ${kes(totals.toPay)}`);
    }
    setError(null);
    setNeedsShift(false);
    setPaying(true);
    const payload = buildServiceSalePayload({
      branchId,
      lines,
      tips,
      method,
      reference,
      cashReceived: cashNumber,
      soldAt: new Date(),
    });
    const key = saleKeyRef.current;
    try {
      const result = await tryPostSaleWithRetries(payload, key, 3, 400);
      if (result.ok) {
        setDone({ kind: "paid", sale: result.sale, toPay: totals.toPay, change });
        return;
      }
      // Only a server that could not be reached. A 500 is the server refusing this sale; saving
      // it would just fail again later and block the queue.
      const unreachable =
        result.status === 0 || result.status === 502 || result.status === 503 || result.status === 504;
      if (unreachable && isSaleOutboxSupported()) {
        // Keep the sale on this device with its key; it is sent, once, when the server is back.
        await enqueuePendingSale(key, payload);
        setDone({ kind: "queued", toPay: totals.toPay });
        return;
      }
      setNeedsShift(Boolean(result.setup) || /shift/i.test(result.message));
      setError(result.message || "The sale was not recorded. Try again.");
    } catch {
      setError("The sale was not recorded. Try again.");
    } finally {
      setPaying(false);
    }
  }

  if (loadError) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoadError title="Ring a service" message={loadError} onRetry={() => void load()} />
      </div>
    );
  }
  if (services == null) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoading label="Loading services…" />
      </div>
    );
  }

  if (done) {
    return (
      <div className={DASHBOARD_MAX}>
        <div className={cn(DASHBOARD_SECTION_SURFACE, "mx-auto mt-6 w-full max-w-md text-center")}>
          <p className="text-sm font-semibold">
            {done.kind === "paid" ? "Paid" : "Saved on this device"}
          </p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">{kes(done.toPay)}</p>
          {done.kind === "paid" ? (
            <p className={cn("mt-1", dashboardHintClass())}>
              {done.sale.receiptNo ? `Receipt ${done.sale.receiptNo}. ` : ""}
              {done.change != null && done.change > 0 ? `Change ${kes(done.change)}.` : ""}
            </p>
          ) : (
            <p className={cn("mt-1", dashboardHintClass())}>
              The server could not be reached. The sale is kept here and will be sent once when the
              connection is back. Keep this device on.
            </p>
          )}
          <Button className="mt-4 w-full" onClick={reset}>
            Next customer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        icon={Scissors}
        title="Ring a service"
        description="Who did it, what they did, then take payment."
      />

      {outboxProblem ? (
        <p role="alert" className={cn(DASHBOARD_SECTION_SURFACE, "text-sm text-red-700")}>
          A sale saved on this device could not be sent: {outboxProblem} Sales saved after it are
          waiting behind it. Open the cashier screen to clear it, or call support.
        </p>
      ) : null}

      {services.length === 0 || performers.length === 0 ? (
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">
            {services.length === 0 ? "Add a service first" : "Add your team first"}
          </p>
          <p className={dashboardHintClass()}>
            {services.length === 0
              ? "There is nothing to ring yet."
              : "A service is rung against the person who did it, so the till needs to know who serves customers."}
          </p>
          <Link
            className="mt-2 inline-block text-sm font-medium underline"
            href={services.length === 0 ? APP_ROUTES.services : APP_ROUTES.commissions}
          >
            {services.length === 0 ? "Go to services" : "Go to team and commissions"}
          </Link>
        </div>
      ) : (
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid content-start gap-2">
            <section className={DASHBOARD_SECTION_SURFACE} aria-label="Who did it">
              <h2 className={dashboardLabelClass()}>Who did it</h2>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {performers.map((person) => (
                  <button
                    key={person.staffProfileId}
                    type="button"
                    aria-pressed={performerId === person.staffProfileId}
                    className={cn(TILE, "text-base font-semibold", performerId === person.staffProfileId && TILE_ON)}
                    onClick={() => {
                      setPerformerId(person.staffProfileId);
                      setError(null);
                    }}
                  >
                    {person.displayName}
                  </button>
                ))}
              </div>
            </section>

            <section className={DASHBOARD_SECTION_SURFACE} aria-label="What they did">
              <h2 className={dashboardLabelClass()}>What they did</h2>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {services.map((service) => {
                  const allowed = !performerId || canPerform(service, performerId);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      disabled={!allowed}
                      className={TILE}
                      onClick={() => addService(service)}
                    >
                      <span className="block text-sm font-semibold">{service.name}</span>
                      <span className="block font-mono text-sm tabular-nums">
                        {service.priceIsVariable ? "Price at the till" : kes(service.price)}
                      </span>
                      {!allowed ? (
                        <span className={cn("block", dashboardHintClass())}>
                          Not done by {performerName.get(performerId) ?? "this person"}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <section className={cn(DASHBOARD_SECTION_SURFACE, "content-start")} aria-label="This customer">
            <h2 className={dashboardLabelClass()}>This customer</h2>
            {lines.length === 0 ? (
              <p className={cn("mt-2", dashboardHintClass())}>Tap a service to add it.</p>
            ) : (
              <ul className="mt-1 divide-y">
                {lines.map((line) => (
                  <li key={line.key} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{line.name}</div>
                      <div className={dashboardHintClass()}>{line.performerName}</div>
                    </div>
                    {line.priceIsVariable ? (
                      <input
                        className={dashboardInputClass(false, "w-24 text-right font-mono")}
                        inputMode="decimal"
                        aria-label={`Price for ${line.name}`}
                        placeholder="Price"
                        value={priceText[line.key] ?? (line.unitPrice > 0 ? String(line.unitPrice) : "")}
                        onChange={(e) => {
                          const text = cleanMoneyText(e.target.value);
                          setPriceText((prev) => ({ ...prev, [line.key]: text }));
                          const value = parseMoney(text);
                          setLines((prev) =>
                            prev.map((l) => (l.key === line.key ? { ...l, unitPrice: value ?? 0 } : l)),
                          );
                          setError(null);
                        }}
                      />
                    ) : (
                      <span className="font-mono text-sm tabular-nums">{kes(line.unitPrice)}</span>
                    )}
                    <button
                      type="button"
                      className="rounded-[2px] px-2 py-1 text-sm underline"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {performersOnSale.length > 0 ? (
              <div className="mt-2 grid gap-1.5 border-t pt-2">
                {performersOnSale.map((id) => (
                  <label key={id} className="flex items-center justify-between gap-2 text-sm">
                    <span>Tip for {performerName.get(id) ?? "staff"}</span>
                    <input
                      className={dashboardInputClass(false, "w-24 text-right font-mono")}
                      inputMode="decimal"
                      placeholder="0"
                      value={tipText[id] ?? ""}
                      onChange={(e) => {
                        const text = cleanMoneyText(e.target.value);
                        setTipText((prev) => ({ ...prev, [id]: text }));
                      }}
                    />
                  </label>
                ))}
              </div>
            ) : null}

            <dl className="mt-2 grid gap-0.5 border-t pt-2 text-sm">
              <div className="flex justify-between">
                <dt>Total</dt>
                <dd className="font-mono tabular-nums">{kes(totals.total)}</dd>
              </div>
              {totals.tips > 0 ? (
                <div className="flex justify-between">
                  <dt>Tips</dt>
                  <dd className="font-mono tabular-nums">{kes(totals.tips)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between text-base font-semibold">
                <dt>To pay</dt>
                <dd className="font-mono tabular-nums">{kes(totals.toPay)}</dd>
              </div>
            </dl>

            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["cash", "mpesa_manual"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={method === m}
                  className={cn(TILE, "min-h-0 py-2 text-center text-sm font-semibold", method === m && TILE_ON)}
                  onClick={() => setMethod(m)}
                >
                  {m === "cash" ? "Cash" : "M-Pesa"}
                </button>
              ))}
            </div>
            {method === "cash" ? (
              <label className="mt-2 grid gap-1">
                <span className={dashboardLabelClass()}>Cash received (optional)</span>
                <input
                  className={dashboardInputClass(false, "font-mono")}
                  inputMode="decimal"
                  value={cashReceived}
                  onChange={(e) => {
                    setCashReceived(e.target.value.replace(/[^0-9.]/g, ""));
                    setError(null);
                  }}
                />
                {change != null && change > 0 ? (
                  <span className="text-sm">
                    Change <span className="font-mono tabular-nums">{kes(change)}</span>
                  </span>
                ) : null}
              </label>
            ) : (
              <label className="mt-2 grid gap-1">
                <span className={dashboardLabelClass()}>M-Pesa code (optional)</span>
                <input
                  className={dashboardInputClass(false, "font-mono uppercase")}
                  value={reference}
                  maxLength={20}
                  onChange={(e) => setReference(e.target.value)}
                />
                <span className={dashboardHintClass()}>Check the payment on your phone before you confirm.</span>
              </label>
            )}

            {error ? (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {error}{" "}
                {needsShift ? (
                  <Link className="underline" href={APP_ROUTES.shifts}>
                    Open a shift
                  </Link>
                ) : null}
              </p>
            ) : null}

            <Button className="mt-3 h-12 w-full text-base" disabled={paying} onClick={() => void pay()}>
              {paying ? "Recording…" : `Take ${kes(totals.toPay)}`}
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
