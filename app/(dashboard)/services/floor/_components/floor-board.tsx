"use client";

import Link from "next/link";
import { Armchair } from "lucide-react";
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
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiRequestError } from "@/lib/api";
import { serviceStationLabel } from "@/lib/business-store-type";
import { APP_ROUTES } from "@/lib/config";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { formatMoney } from "@/lib/money";
import {
  cancelServiceTicket,
  createServiceTicket,
  fetchServiceBoard,
  fetchServicePerformers,
  fetchServices,
  finishServiceTicket,
  minutesSince,
  payServiceTicket,
  reopenServiceTicket,
  startServiceTicket,
  type ServiceBoard,
  type ServicePerformerRecord,
  type ServiceRecord,
  type ServiceTicketRecord,
} from "@/lib/service-business-api";
import { cleanMoneyText, parseMoney } from "@/lib/service-cart";
import { cn } from "@/lib/utils";

const kes = (n: number) => formatMoney(n, "KES");
const REFRESH_MS = 15000;

function message(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const payload = err.payload as { detail?: unknown } | null;
    if (payload && typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  }
  return fallback;
}

/**
 * The floor of a service business: who is waiting, who is in which chair, who is ready to pay.
 * Every change is a tap on a button (no dragging), and the board refreshes itself so two
 * devices at the counter stay in step.
 */
export function FloorBoard() {
  const { branchId, business } = useDashboard();
  const chairWord = serviceStationLabel(business);
  const [board, setBoard] = useState<ServiceBoard | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [performers, setPerformers] = useState<ServicePerformerRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [starting, setStarting] = useState<ServiceTicketRecord | null>(null);
  const [paying, setPaying] = useState<ServiceTicketRecord | null>(null);
  const [, setTick] = useState(0);

  const refresh = useCallback(async () => {
    if (!branchId) return;
    try {
      setBoard(await fetchServiceBoard(branchId));
      setLoadError(null);
    } catch {
      setLoadError("Could not load the floor. Check your connection.");
    }
  }, [branchId]);

  useEffect(() => {
    void refresh();
    void fetchServices({ active: true }).then(setServices).catch(() => setServices([]));
    void fetchServicePerformers().then(setPerformers).catch(() => setPerformers([]));
    const timer = window.setInterval(() => {
      void refresh();
      setTick((t) => t + 1);
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const run = useCallback(
    async (ticketId: string, action: () => Promise<unknown>, failure: string) => {
      setBusy(ticketId);
      setNotice(null);
      try {
        await action();
      } catch (err) {
        setNotice(message(err, failure));
      } finally {
        setBusy(null);
        await refresh();
      }
    },
    [refresh],
  );

  const waiting = useMemo(() => (board?.tickets ?? []).filter((t) => t.stage === "WAITING"), [board]);
  const ready = useMemo(() => (board?.tickets ?? []).filter((t) => t.stage === "READY_TO_PAY"), [board]);
  const byChair = useMemo(() => {
    const map = new Map<number, ServiceTicketRecord>();
    for (const t of board?.tickets ?? []) {
      if (t.stage === "IN_SERVICE" && t.stationNo != null) map.set(t.stationNo, t);
    }
    return map;
  }, [board]);

  if (!branchId) {
    return (
      <div className={DASHBOARD_MAX}>
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">Choose a branch</p>
          <p className={dashboardHintClass()}>Pick a branch at the top of the page to see its floor.</p>
        </div>
      </div>
    );
  }
  if (loadError && !board) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoadError title="Floor" message={loadError} onRetry={() => void refresh()} />
      </div>
    );
  }
  if (!board) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoading label="Loading the floor…" />
      </div>
    );
  }

  const chairs = Array.from({ length: board.stationCount }, (_, i) => i + 1);
  const freeChairs = chairs.filter((n) => !byChair.has(n));

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero icon={Armchair} title="Floor" description="Who is waiting, who is being served, who is ready to pay.">
        <Button size="sm" onClick={() => setAdding(true)}>
          New customer
        </Button>
      </DashboardPageHero>

      {loadError ? (
        <p role="status" className={cn(DASHBOARD_SECTION_SURFACE, "text-sm")}>
          {loadError} Showing the last known floor.
        </p>
      ) : null}
      {notice ? (
        <p role="alert" className={cn(DASHBOARD_SECTION_SURFACE, "text-sm text-red-700")}>
          {notice}
        </p>
      ) : null}

      {board.stationCount === 0 ? (
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">Say how many {chairWord.toLowerCase()}s you have</p>
          <p className={dashboardHintClass()}>The floor shows one column for each.</p>
          <Link className="mt-2 inline-block text-sm font-medium underline" href={APP_ROUTES.servicesSetup}>
            Set up the shop
          </Link>
        </div>
      ) : (
        <div className="grid gap-2 lg:grid-cols-[16rem_minmax(0,1fr)_16rem]">
          <section className={DASHBOARD_SECTION_SURFACE} aria-label="Waiting">
            <h2 className={dashboardLabelClass()}>Waiting ({waiting.length})</h2>
            {waiting.length === 0 ? (
              <p className={cn("mt-2", dashboardHintClass())}>No one is waiting.</p>
            ) : (
              <ol className="mt-1 divide-y">
                {waiting.map((ticket, i) => (
                  <li key={ticket.id} className="py-2">
                    <TicketSummary ticket={ticket} position={i + 1} sinceIso={ticket.createdAt} sinceLabel="waiting" />
                    <div className="mt-1.5 flex gap-1.5">
                      <Button
                        size="sm"
                        disabled={busy === ticket.id || freeChairs.length === 0}
                        onClick={() => setStarting(ticket)}
                      >
                        Start
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy === ticket.id}
                        onClick={() => {
                          if (!window.confirm(`Ticket ${ticket.ticketNumber}: did the customer leave?`)) return;
                          void run(
                            ticket.id,
                            () => cancelServiceTicket(ticket.id, { abandoned: true }),
                            "Could not update the ticket.",
                          );
                        }}
                      >
                        Left
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {waiting.length > 0 && freeChairs.length === 0 ? (
              <p className={cn("mt-1", dashboardHintClass())}>Every {chairWord.toLowerCase()} is taken.</p>
            ) : null}
          </section>

          <section aria-label={`${chairWord}s`} className="grid content-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {chairs.map((n) => {
              const ticket = byChair.get(n);
              return (
                <div key={n} className={cn(DASHBOARD_SECTION_SURFACE, "min-h-[8rem]")}>
                  <h3 className={dashboardLabelClass()}>
                    {chairWord} {n}
                  </h3>
                  {ticket ? (
                    <>
                      <p className="mt-1 text-lg font-semibold leading-tight">{ticket.staffName ?? "Staff"}</p>
                      <TicketSummary ticket={ticket} sinceIso={ticket.startedAt} sinceLabel="in the chair" />
                      <Button
                        className="mt-2 w-full"
                        disabled={busy === ticket.id}
                        onClick={() => void run(ticket.id, () => finishServiceTicket(ticket.id), "Could not finish the ticket.")}
                      >
                        Done
                      </Button>
                      <CancelButton ticket={ticket} busy={busy === ticket.id} run={run} />
                    </>
                  ) : (
                    <p className={cn("mt-2", dashboardHintClass())}>Free</p>
                  )}
                </div>
              );
            })}
          </section>

          <section className={DASHBOARD_SECTION_SURFACE} aria-label="Ready to pay">
            <h2 className={dashboardLabelClass()}>Ready to pay ({ready.length})</h2>
            {ready.length === 0 ? (
              <p className={cn("mt-2", dashboardHintClass())}>No one is waiting to pay.</p>
            ) : (
              <ul className="mt-1 divide-y">
                {ready.map((ticket) => (
                  <li key={ticket.id} className="py-2">
                    <TicketSummary ticket={ticket} sinceIso={ticket.finishedAt} sinceLabel="since done" />
                    <p className={dashboardHintClass()}>{ticket.staffName ?? "Staff"}</p>
                    <div className="mt-1.5 flex gap-1.5">
                      <Button size="sm" disabled={busy === ticket.id} onClick={() => setPaying(ticket)}>
                        Take {kes(ticket.total)}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy === ticket.id}
                        onClick={() => void run(ticket.id, () => reopenServiceTicket(ticket.id), "Could not undo.")}
                      >
                        Not done
                      </Button>
                      <CancelButton ticket={ticket} busy={busy === ticket.id} run={run} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {adding ? (
        <NewCustomerDialog
          branchId={branchId}
          services={services}
          performers={performers}
          onClose={() => setAdding(false)}
          onDone={async () => {
            setAdding(false);
            await refresh();
          }}
        />
      ) : null}
      {starting ? (
        <StartDialog
          ticket={starting}
          chairWord={chairWord}
          freeChairs={freeChairs}
          performers={performers}
          onClose={() => setStarting(null)}
          onDone={async () => {
            setStarting(null);
            await refresh();
          }}
        />
      ) : null}
      {paying ? (
        <PayDialog
          ticket={paying}
          onChanged={async (text) => {
            // The ticket was changed under us (a price update): show why and the new total.
            setPaying(null);
            setNotice(text);
            await refresh();
          }}
          onClose={() => setPaying(null)}
          onDone={async () => {
            setPaying(null);
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}

/** Cancels a ticket that has been started. The server only allows it for a manager. */
function CancelButton({
  ticket,
  busy,
  run,
}: {
  ticket: ServiceTicketRecord;
  busy: boolean;
  run: (ticketId: string, action: () => Promise<unknown>, failure: string) => Promise<void>;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="mt-1"
      disabled={busy}
      onClick={() => {
        const reason = window.prompt(`Cancel ticket ${ticket.ticketNumber}? Say why.`);
        if (reason == null) return;
        if (!reason.trim()) return;
        void run(
          ticket.id,
          () => cancelServiceTicket(ticket.id, { reason: reason.trim() }),
          "Only a manager can cancel a ticket once the customer has been served.",
        );
      }}
    >
      Cancel ticket
    </Button>
  );
}

function TicketSummary({
  ticket,
  position,
  sinceIso,
  sinceLabel,
}: {
  ticket: ServiceTicketRecord;
  position?: number;
  sinceIso: string | null;
  sinceLabel: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium">
        {position != null ? `${position}. ` : ""}Ticket {ticket.ticketNumber}
      </p>
      <p className="text-sm">{ticket.lines.map((l) => l.name).join(", ")}</p>
      <p className={dashboardHintClass()}>
        <span className="font-mono tabular-nums">{minutesSince(sinceIso)} min</span> {sinceLabel}
        {position != null && ticket.staffName ? ` · asked for ${ticket.staffName}` : ""}
      </p>
    </div>
  );
}

function NewCustomerDialog({
  branchId,
  services,
  performers,
  onClose,
  onDone,
}: {
  branchId: string;
  services: ServiceRecord[];
  performers: ServicePerformerRecord[];
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [staffId, setStaffId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // One id per new customer: a retry after a dropped connection opens no second ticket.
  const clientIdRef = useRef<string>(nextIdempotencyKey());

  async function save() {
    if (picked.length === 0) return setError("Choose at least one service");
    const lines: { serviceId: string; unitPrice?: number }[] = [];
    for (const id of picked) {
      const service = services.find((s) => s.id === id);
      if (!service) continue;
      if (service.priceIsVariable) {
        const price = Number(prices[id] ?? "");
        if (!(price > 0) && !(service.price > 0)) return setError(`Enter the price for ${service.name}`);
        lines.push(price > 0 ? { serviceId: id, unitPrice: price } : { serviceId: id });
      } else {
        lines.push({ serviceId: id });
      }
    }
    setError(null);
    setSaving(true);
    try {
      await createServiceTicket({
        branchId,
        clientTicketId: clientIdRef.current,
        requestedStaffProfileId: staffId || null,
        lines,
      });
      await onDone();
    } catch (err) {
      setError(message(err, "Could not add the customer. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
          <DialogDescription>What do they want, and did they ask for someone?</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {services.length === 0 ? (
            <p className="text-sm">
              There are no services yet.{" "}
              <Link className="underline" href={APP_ROUTES.services}>
                Add a service
              </Link>
            </p>
          ) : (
            <ul className="grid gap-1.5">
              {services.map((service) => {
                const on = picked.includes(service.id);
                return (
                  <li key={service.id} className="flex items-center gap-2">
                    <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => {
                          setPicked((prev) =>
                            e.target.checked ? [...prev, service.id] : prev.filter((id) => id !== service.id),
                          );
                          setError(null);
                        }}
                      />
                      <span className="truncate">{service.name}</span>
                    </label>
                    {service.priceIsVariable ? (
                      on ? (
                        <input
                          className={dashboardInputClass(false, "w-24 text-right font-mono")}
                          inputMode="decimal"
                          placeholder="Price"
                          aria-label={`Price for ${service.name}`}
                          value={prices[service.id] ?? ""}
                          onChange={(e) =>
                            setPrices((prev) => ({ ...prev, [service.id]: e.target.value.replace(/[^0-9.]/g, "") }))
                          }
                        />
                      ) : (
                        <span className={dashboardHintClass()}>Price at the till</span>
                      )
                    ) : (
                      <span className="font-mono text-sm tabular-nums">{kes(service.price)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Asked for</span>
            <select className={dashboardSelectClass()} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Next available</option>
              {performers.map((p) => (
                <option key={p.staffProfileId} value={p.staffProfileId}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </label>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving || services.length === 0} onClick={() => void save()}>
            {saving ? "Adding…" : "Add to the queue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StartDialog({
  ticket,
  chairWord,
  freeChairs,
  performers,
  onClose,
  onDone,
}: {
  ticket: ServiceTicketRecord;
  chairWord: string;
  freeChairs: number[];
  performers: ServicePerformerRecord[];
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const [staffId, setStaffId] = useState(ticket.staffProfileId ?? (performers.length === 1 ? performers[0]!.staffProfileId : ""));
  const [chair, setChair] = useState<number | null>(freeChairs.length === 1 ? freeChairs[0]! : null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function start() {
    if (!staffId) return setError("Choose who is serving them");
    if (chair == null) return setError(`Choose a ${chairWord.toLowerCase()}`);
    setError(null);
    setSaving(true);
    try {
      await startServiceTicket(ticket.id, { performerStaffProfileId: staffId, stationNo: chair });
      await onDone();
    } catch (err) {
      setError(message(err, "Could not start. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start ticket {ticket.ticketNumber}</DialogTitle>
          <DialogDescription>{ticket.lines.map((l) => l.name).join(", ")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <fieldset className="grid gap-1.5">
            <legend className={dashboardLabelClass()}>Who is serving them</legend>
            <div className="grid grid-cols-2 gap-2">
              {performers.map((p) => (
                <Button
                  key={p.staffProfileId}
                  variant={staffId === p.staffProfileId ? "default" : "outline"}
                  aria-pressed={staffId === p.staffProfileId}
                  onClick={() => {
                    setStaffId(p.staffProfileId);
                    setError(null);
                  }}
                >
                  {p.displayName}
                </Button>
              ))}
            </div>
          </fieldset>
          <fieldset className="grid gap-1.5">
            <legend className={dashboardLabelClass()}>{chairWord}</legend>
            <div className="flex flex-wrap gap-2">
              {freeChairs.map((n) => (
                <Button
                  key={n}
                  variant={chair === n ? "default" : "outline"}
                  aria-pressed={chair === n}
                  onClick={() => {
                    setChair(n);
                    setError(null);
                  }}
                >
                  {n}
                </Button>
              ))}
            </div>
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void start()}>
            {saving ? "Starting…" : "Start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({
  ticket,
  onClose,
  onDone,
  onChanged,
}: {
  ticket: ServiceTicketRecord;
  onClose: () => void;
  onDone: () => Promise<void> | void;
  onChanged: (text: string) => Promise<void> | void;
}) {
  const [method, setMethod] = useState<"cash" | "mpesa_manual">("cash");
  const [tip, setTip] = useState("");
  const [cash, setCash] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // One key per ticket payment: a retry never rings the ticket twice.
  const keyRef = useRef<string>(nextIdempotencyKey());

  const tipNumber = parseMoney(tip) ?? 0;
  const toPay = Math.round((ticket.total + (tipNumber > 0 ? tipNumber : 0)) * 100) / 100;
  const cashNumber = parseMoney(cash);
  const change = method === "cash" && cashNumber != null && cashNumber >= toPay ? cashNumber - toPay : null;

  async function pay() {
    if (method === "cash" && cashNumber != null && cashNumber < toPay) return setError(`That is less than ${kes(toPay)}`);
    setError(null);
    setSaving(true);
    try {
      await payServiceTicket(
        ticket.id,
        {
          payments: [
            {
              method,
              amount: toPay,
              ...(method === "mpesa_manual" && reference.trim() ? { reference: reference.trim().toUpperCase() } : {}),
            },
          ],
          ...(tipNumber > 0 && ticket.staffProfileId
            ? { tips: [{ staffProfileId: ticket.staffProfileId, amount: tipNumber }] }
            : {}),
          ...(method === "cash" && cashNumber != null && cashNumber >= toPay ? { cashReceived: cashNumber } : {}),
          clientSoldAt: new Date().toISOString(),
        },
        keyRef.current,
      );
      await onDone();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        // The total on screen is out of date; nothing was charged.
        await onChanged(message(err, "This ticket has changed. Check it and take payment again."));
        return;
      }
      setError(message(err, "The payment was not recorded. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ticket {ticket.ticketNumber}</DialogTitle>
          <DialogDescription>
            {ticket.lines.map((l) => l.name).join(", ")} · {ticket.staffName ?? "Staff"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>Tip for {ticket.staffName ?? "staff"}</span>
            <input
              className={dashboardInputClass(false, "w-24 text-right font-mono")}
              inputMode="decimal"
              placeholder="0"
              value={tip}
              onChange={(e) => {
                setTip(cleanMoneyText(e.target.value));
                setError(null);
              }}
            />
          </label>
          <div className="flex justify-between text-base font-semibold">
            <span>To pay</span>
            <span className="font-mono tabular-nums">{kes(toPay)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["cash", "mpesa_manual"] as const).map((m) => (
              <Button key={m} variant={method === m ? "default" : "outline"} aria-pressed={method === m} onClick={() => setMethod(m)}>
                {m === "cash" ? "Cash" : "M-Pesa"}
              </Button>
            ))}
          </div>
          {method === "cash" ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Cash received (optional)</span>
              <input
                className={dashboardInputClass(false, "font-mono")}
                inputMode="decimal"
                value={cash}
                onChange={(e) => {
                  setCash(cleanMoneyText(e.target.value));
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
            <label className="grid gap-1">
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
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void pay()}>
            {saving ? "Recording…" : `Take ${kes(toPay)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
