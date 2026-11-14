"use client";

import { Armchair, Check, CircleCheck, Play, Plus, Scissors, UserRound, X } from "lucide-react";
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
import { ApiRequestError, fetchItems, type ItemSummaryRecord } from "@/lib/api";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { formatMoney } from "@/lib/money";
import {
  addServiceTicketLine,
  addVisitProduct,
  amountStillDue,
  assignServiceLine,
  cancelServiceTicket,
  createServiceTicket,
  lineTeam,
  setServiceLineTeam,
  toggleTeamMember,
  fetchServiceBoard,
  fetchServicePerformers,
  fetchServiceResources,
  fetchServices,
  fetchVisitEarnings,
  finishServiceLine,
  minutesSince,
  payServiceTicket,
  removeServiceLine,
  removeVisitProduct,
  resourceIsFree,
  visitServiceTotal,
  startServiceLine,
  type FloorStaffRecord,
  type ServicePerformerRecord,
  type ServiceRecord,
  type ServiceResourceRecord,
  type ServiceTicketRecord,
  type ServiceVisitLine,
  type VisitEarnings,
} from "@/lib/service-business-api";
import { cleanMoneyText, parseMoney } from "@/lib/service-cart";
import { allocateTip, tipLeftToAllocate, type TipMode, type TipPerson } from "@/lib/tip-allocation";
import { cn } from "@/lib/utils";

import { NewCustomerDialog } from "../../floor/_components/floor-board";
import { ResourcesDialog } from "./resources-dialog";

/** Whole shillings read as the till says them: "Ksh 300", not "Ksh 300.00". Cents stay when there are any. */
const kes = (n: number) => formatMoney(n, "KES").replace(/\.00$/, "");
const REFRESH_MS = 15000;

function message(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const payload = err.payload as { detail?: unknown } | null;
    if (payload && typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  }
  return fallback;
}

const clock = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", hour: "numeric", minute: "2-digit", hour12: true }).format(
        new Date(iso),
      )
    : "";

const STAGE_WORD: Record<string, string> = {
  WAITING: "Not started",
  IN_SERVICE: "In progress",
  DONE: "Finished",
  READY_TO_PAY: "Ready to pay",
  BOOKED: "Booked",
};

/** Everyone who worked on a visit, with the value of what each did (helpers by their share). */
export function visitPeople(
  ticket: Pick<ServiceTicketRecord, "lines">,
  names: ReadonlyMap<string, string> = new Map(),
): (TipPerson & { name: string })[] {
  const byId = new Map<string, TipPerson & { name: string }>();
  const add = (id: string, name: string, work: number) => {
    const row = byId.get(id) ?? { staffProfileId: id, name, work: 0 };
    row.work = Math.round((row.work + work) * 100) / 100;
    byId.set(id, row);
  };
  for (const line of ticket.lines) {
    const helpers = line.helpers ?? [];
    const helped = helpers.reduce((sum, h) => sum + h.sharePercent, 0);
    if (line.performerStaffProfileId) {
      add(line.performerStaffProfileId, line.performerName ?? "Staff", (line.lineTotal * (100 - helped)) / 100);
    }
    for (const h of helpers) add(h.staffProfileId, names.get(h.staffProfileId) ?? "Staff", (line.lineTotal * h.sharePercent) / 100);
  }
  return [...byId.values()];
}

/** Paper-docket surface: the visit reads like the slip a cashier would write by hand. */
const DOCKET =
  "rounded-[2px] border border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)] bg-[var(--op-surface,#FCFAF5)]";
const CHIP =
  "inline-flex min-h-10 items-center gap-1.5 rounded-[2px] border px-2.5 text-sm font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)] disabled:opacity-50";
const CHIP_OFF = "border-[color-mix(in_srgb,var(--order-ink,#121A16)_15%,transparent)] hover:border-[var(--pos-primary,#1D4B3B)]";
const CHIP_ON = "border-[var(--pos-primary,#1D4B3B)] bg-[var(--pos-primary,#1D4B3B)] text-white";

/**
 * The service till. Three taps cover the common case: tap what the customer wants, tap who is
 * doing it, take the money. Everything else — several people on one service, what each is paid,
 * which chair, starting and finishing, products, tips — opens up on the same slip when needed.
 */
export function VisitWorkspace({
  canSeeEarnings,
  canSetAmounts,
  canManage,
  onQuickRing,
}: {
  canSeeEarnings: boolean;
  /** May decide what a person is paid for a service (a commission decision). */
  canSetAmounts: boolean;
  canManage: boolean;
  onQuickRing: () => void;
}) {
  const { branchId, business } = useDashboard();
  const shopName = (business as { name?: string | null } | null)?.name?.trim() || "Your shop";
  const [visits, setVisits] = useState<ServiceTicketRecord[] | null>(null);
  const [floorStaff, setFloorStaff] = useState<FloorStaffRecord[]>([]);
  // The barber tapped before the service: the next slip opens in their name.
  const [startWith, setStartWith] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [performers, setPerformers] = useState<ServicePerformerRecord[]>([]);
  const [resources, setResources] = useState<ServiceResourceRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);
  const [earnings, setEarnings] = useState<VisitEarnings | null>(null);
  const [paid, setPaid] = useState<{ ticket: ServiceTicketRecord; earnings: VisitEarnings | null; tips: { name: string; amount: number }[]; change: number } | null>(null);
  const pickNewest = useRef(false);

  const refresh = useCallback(async () => {
    if (!branchId) return;
    try {
      const [board, places] = await Promise.all([fetchServiceBoard(branchId), fetchServiceResources(branchId).catch(() => [])]);
      setVisits(board.tickets);
      setFloorStaff(board.staff ?? []);
      setResources(places);
      setLoadError(null);
      if (pickNewest.current && board.tickets.length > 0) {
        pickNewest.current = false;
        setSelectedId([...board.tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]!.id);
      }
    } catch {
      setLoadError("Could not load the till. Check your connection.");
    }
  }, [branchId]);

  useEffect(() => {
    void refresh();
    void fetchServices({ active: true }).then(setServices).catch(() => setServices([]));
    void fetchServicePerformers().then(setPerformers).catch(() => setPerformers([]));
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const selected = useMemo(() => (visits ?? []).find((v) => v.id === selectedId) ?? null, [visits, selectedId]);
  const names = useMemo(() => new Map(performers.map((p) => [p.staffProfileId, p.displayName])), [performers]);

  // What each person will get follows the slip: who is on each service and any amounts set.
  const fingerprint = selected
    ? selected.lines
        .map((l) => `${l.id}:${l.performerStaffProfileId ?? ""}:${l.performerAmount ?? ""}:${l.lineTotal}:${(l.helpers ?? []).map((h) => `${h.staffProfileId}=${h.sharePercent}=${h.amount ?? ""}`).join(",")}`)
        .join("|")
    : "";
  useEffect(() => {
    setEarnings(null);
    if (!canSeeEarnings || !selectedId) return;
    let live = true;
    void fetchVisitEarnings(selectedId)
      .then((e) => (live ? setEarnings(e) : undefined))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [selectedId, fingerprint, canSeeEarnings]);

  const act = useCallback(
    async (action: () => Promise<unknown>, failure: string) => {
      setBusy(true);
      setNotice(null);
      try {
        await action();
      } catch (err) {
        setNotice(message(err, failure));
      } finally {
        setBusy(false);
        await refresh();
      }
    },
    [refresh],
  );

  // One id per tap on a service tile with no slip open: a retry opens no second visit.
  const newVisitKey = useRef<string>(nextIdempotencyKey());
  const startVisitWith = useCallback(
    (serviceId: string, unitPrice?: number) =>
      act(async () => {
        if (!branchId) return;
        const ticket = await createServiceTicket({
          branchId,
          clientTicketId: newVisitKey.current,
          lines: [{ serviceId, ...(unitPrice != null ? { unitPrice } : {}) }],
        });
        newVisitKey.current = nextIdempotencyKey();
        setPaid(null);
        setSelectedId(ticket.id);
        const barber = startWith;
        setStartWith(null);
        if (barber && ticket.lines[0]) {
          // The barber was tapped first: the slip opens already in their name.
          await setServiceLineTeam(ticket.id, ticket.lines[0].id, [{ staffProfileId: barber }]);
        }
      }, "Could not start the visit."),
    [act, branchId, startWith],
  );

  if (!branchId) {
    return (
      <div className={DASHBOARD_MAX}>
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">Choose a branch</p>
          <p className={dashboardHintClass()}>Pick a branch at the top of the page to serve customers there.</p>
        </div>
      </div>
    );
  }
  if (loadError && !visits) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoadError title="Service till" message={loadError} onRetry={() => void refresh()} />
      </div>
    );
  }
  if (!visits) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoading label="Opening the till…" />
      </div>
    );
  }

  const places = resources.filter((r) => r.active);
  // The first service on the open slip that is nobody's yet: a tap on a barber gives it to them.
  const openLine = selected?.lines.find((l) => !l.performerStaffProfileId) ?? null;
  const busyIds = new Set(
    visits.flatMap((v) =>
      v.lines
        .filter((l) => l.stage === "IN_SERVICE")
        .flatMap((l) => [l.performerStaffProfileId, ...(l.helpers ?? []).map((h) => h.staffProfileId)].filter((id): id is string => !!id)),
    ),
  );
  const toCollect = visits.filter((v) => v.stage === "READY_TO_PAY").reduce((sum, v) => sum + v.total, 0);

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero icon={Scissors} title={`${shopName} till`} description="Tap who is working, tap what they are doing, take the money.">
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" onClick={onQuickRing}>
            Quick ring
          </Button>
          {canManage ? (
            <Button size="sm" variant="outline" onClick={() => setManaging(true)}>
              Chairs and rooms
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            Customer with a phone number
          </Button>
        </div>
      </DashboardPageHero>

      {/* A barber-pole rule: the one decorative touch, in the shop's own green. */}
      <div
        aria-hidden
        className="h-1.5 rounded-[2px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--pos-primary,#1D4B3B) 0 10px, var(--op-surface,#FCFAF5) 10px 20px, var(--kiosk-highlight,#A55237) 20px 30px, var(--op-surface,#FCFAF5) 30px 40px)",
        }}
      />

      {/* The team, as the cashier sees the shop: who is on a customer, who is free to take the next. */}
      <section aria-label="The team now" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {performers.map((p) => {
          const status = floorStaff.find((f) => f.staffProfileId === p.staffProfileId)?.floorStatus ?? "AVAILABLE";
          const working = visits
            .flatMap((v) => v.lines.map((l) => ({ v, l })))
            .find(({ l }) => l.stage === "IN_SERVICE" && (l.performerStaffProfileId === p.staffProfileId || (l.helpers ?? []).some((h) => h.staffProfileId === p.staffProfileId)));
          const askedFor = visits.filter((v) => v.stage === "WAITING" && v.staffProfileId === p.staffProfileId && !v.lines.some((l) => l.performerStaffProfileId)).length;
          const picked = startWith === p.staffProfileId;
          const away = status !== "AVAILABLE" && !working;
          return (
            <button
              key={p.staffProfileId}
              type="button"
              aria-pressed={picked}
              onClick={() => {
                setPaid(null);
                if (working) {
                  setStartWith(null);
                  setSelectedId(working.v.id);
                } else if (selected && openLine && !away) {
                  // A slip is open and one of its services is nobody's yet: this barber takes it.
                  void act(
                    () => setServiceLineTeam(selected.id, openLine.id, [{ staffProfileId: p.staffProfileId }]),
                    "Could not put them on it.",
                  );
                } else {
                  setSelectedId(null);
                  setStartWith(picked ? null : p.staffProfileId);
                }
              }}
              className={cn(
                DOCKET,
                "flex min-h-[4.5rem] items-center gap-2.5 p-2 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]",
                picked && "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_10%,var(--op-surface,#FCFAF5))]",
                away && "opacity-60",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-[2px] font-mono text-base font-semibold",
                  working
                    ? "bg-[var(--pos-primary,#1D4B3B)] text-white"
                    : "border border-dashed border-[color-mix(in_srgb,var(--order-ink,#121A16)_30%,transparent)]",
                )}
              >
                {p.displayName.trim().slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{p.displayName}</span>
                <span className={cn("block truncate", dashboardHintClass())}>
                  {working
                    ? `${working.l.name}${working.l.resourceName ? ` · ${working.l.resourceName}` : ""} · ${minutesSince(working.l.startedAt ?? null)} min`
                    : status === "ON_BREAK"
                      ? "On a break"
                      : status === "OFF"
                        ? "Off today"
                        : picked
                          ? "Now tap what they are doing"
                          : selected && openLine
                            ? `Free · tap to give them the ${openLine.name}`
                            : "Free · tap to start"}
                </span>
                {askedFor > 0 ? (
                  <span className="block text-xs font-medium text-[var(--kiosk-highlight,#A55237)]">
                    {askedFor} waiting for {p.displayName.split(/\s+/)[0]}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
        {performers.length === 0 ? (
          <p className={cn(DOCKET, "p-3 text-sm sm:col-span-2")}>
            Add your barbers on the Commissions page, then they appear here.
          </p>
        ) : null}
      </section>

      {notice ? (
        <p role="alert" className={cn(DOCKET, "p-3 text-sm text-red-700")}>
          {notice}
        </p>
      ) : null}

      <div className="grid gap-2 lg:grid-cols-[14rem_minmax(0,1fr)_21rem]">
        {/* The shop from door to till: on the bench, in the chair, paying. */}
        <nav className={cn(DOCKET, "order-3 content-start p-2 lg:order-none")} aria-label="Customers in the shop">
          <Button
            className="w-full"
            variant={selected || paid ? "outline" : "default"}
            onClick={() => {
              setSelectedId(null);
              setPaid(null);
            }}
          >
            <Plus className="size-4" aria-hidden /> Next customer
          </Button>
          {(
            [
              ["READY_TO_PAY", "Paying", "Nobody is waiting to pay."],
              ["IN_SERVICE", "In the chair", "No one is being served."],
              ["WAITING", "On the bench", "The bench is empty."],
            ] as const
          ).map(([stage, title, empty]) => {
            const group = visits.filter((v) => v.stage === stage);
            return (
              <div key={stage} className="mt-3">
                <h2 className={cn("flex items-baseline justify-between", dashboardLabelClass())}>
                  <span>{title}</span>
                  <span
                    className={cn(
                      "font-mono tabular-nums",
                      stage === "READY_TO_PAY" && group.length > 0 && "font-semibold text-[var(--kiosk-highlight,#A55237)]",
                    )}
                  >
                    {stage === "READY_TO_PAY" && toCollect > 0 ? kes(toCollect) : group.length}
                  </span>
                </h2>
                {group.length === 0 ? (
                  <p className={cn("mt-0.5", dashboardHintClass())}>{empty}</p>
                ) : (
                  <ul className="mt-1 grid gap-1">
                    {group.map((v) => {
                      const who = [...new Set(v.lines.map((l) => l.performerName).filter(Boolean))].join(", ");
                      return (
                        <li key={v.id}>
                          <button
                            type="button"
                            aria-current={v.id === selectedId}
                            onClick={() => {
                              setSelectedId(v.id);
                              setStartWith(null);
                              setPaid(null);
                            }}
                            className={cn(
                              "w-full rounded-[2px] border border-dashed px-2 py-1.5 text-left text-sm",
                              v.id === selectedId
                                ? "border-solid border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)]"
                                : "border-[color-mix(in_srgb,var(--order-ink,#121A16)_18%,transparent)] hover:border-[var(--pos-primary,#1D4B3B)]",
                            )}
                          >
                            <span className="flex justify-between gap-2 font-semibold">
                              <span className="truncate">
                                <span className="font-mono tabular-nums">#{v.ticketNumber}</span>
                                {v.bookingName ? ` ${v.bookingName}` : ""}
                              </span>
                              <span className="shrink-0 font-mono tabular-nums">{kes(v.total)}</span>
                            </span>
                            <span className="block truncate">{v.lines.map((l) => l.name).join(", ")}</span>
                            <span className={dashboardHintClass()}>
                              {who || (v.staffName ? `asked for ${v.staffName}` : "no barber yet")}
                              {stage === "WAITING" ? ` · ${minutesSince(v.createdAt)} min` : ""}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {paid ? (
          <PaidSummary
            paid={paid}
            onNext={() => {
              setPaid(null);
              setSelectedId(null);
            }}
          />
        ) : selected ? (
          <>
            <VisitSlip
              visit={selected}
              services={services}
              performers={performers}
              resources={places}
              earnings={earnings}
              canSetAmounts={canSetAmounts}
              shopName={shopName}
              busyIds={busyIds}
              busy={busy}
              act={act}
              onCancelled={() => setSelectedId(null)}
            />
            <Checkout
              key={selected.id}
              visit={selected}
              names={names}
              earnings={canSeeEarnings ? earnings : null}
              onPaid={async (ticket, paidEarnings, tips, change) => {
                setPaid({ ticket, earnings: paidEarnings, tips, change });
                await refresh();
              }}
              onChanged={async (text) => {
                setNotice(text);
                await refresh();
              }}
            />
          </>
        ) : (
          <section className={cn(DOCKET, "p-3 lg:col-span-2")} aria-label="Start a visit">
            <h2 className="text-lg font-semibold">
              {startWith ? `What is ${names.get(startWith) ?? "the barber"} doing?` : "What would they like?"}
            </h2>
            <p className={dashboardHintClass()}>
              {startWith
                ? "Tap the service. The slip opens in their name."
                : "Tap a service to open a slip, or tap a barber above first to open it in their name."}
            </p>
            <ServiceTiles services={services} busy={busy} onPick={(id, price) => void startVisitWith(id, price)} />
          </section>
        )}
      </div>

      {adding ? (
        <NewCustomerDialog
          branchId={branchId}
          services={services}
          performers={performers}
          statuses={Object.fromEntries(floorStaff.map((member) => [member.staffProfileId, member.floorStatus]))}
          onClose={() => setAdding(false)}
          onDone={async () => {
            setAdding(false);
            pickNewest.current = true;
            await refresh();
          }}
        />
      ) : null}
      {managing ? (
        <ResourcesDialog
          branchId={branchId}
          onClose={() => {
            setManaging(false);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}

/** The menu: one large button per service, with its price and how long it takes. */
function ServiceTiles({
  services,
  busy,
  onPick,
  compact = false,
}: {
  services: ServiceRecord[];
  busy: boolean;
  /** `unitPrice` is sent only for a service whose price is agreed with the customer. */
  onPick: (serviceId: string, unitPrice?: number) => void;
  compact?: boolean;
}) {
  const [asking, setAsking] = useState<ServiceRecord | null>(null);
  const [priceText, setPriceText] = useState("");
  const agreed = parseMoney(priceText);
  const sellable = services.filter((s) => s.price > 0);
  if (sellable.length === 0) {
    return <p className={cn("mt-2", dashboardHintClass())}>There are no priced services yet. Add them on the Services page.</p>;
  }
  if (asking) {
    // The price of this one is agreed with the customer: ask once, with the usual price ready.
    const submit = () => {
      if (agreed == null || !(agreed > 0)) return;
      onPick(asking.id, agreed);
      setAsking(null);
    };
    return (
      <div className="mt-2 grid max-w-sm gap-2 rounded-[2px] border border-[var(--pos-primary,#1D4B3B)] p-3">
        <label htmlFor="agreed-price" className="text-base font-semibold">
          How much for the {asking.name}?
        </label>
        <div className="flex items-center gap-2">
          <span className={dashboardHintClass()}>KSh</span>
          <input
            id="agreed-price"
            autoFocus
            className={dashboardInputClass(false, "min-h-11 flex-1 text-right font-mono text-lg")}
            inputMode="decimal"
            value={priceText}
            onChange={(e) => setPriceText(cleanMoneyText(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </div>
        <p className={dashboardHintClass()}>Starts from {kes(asking.price)}. Type what you agreed with the customer.</p>
        <div className="flex gap-2">
          <Button className="min-h-11 flex-1" disabled={busy || agreed == null || !(agreed > 0)} onClick={submit}>
            Add at {kes(agreed ?? 0)}
          </Button>
          <Button variant="ghost" className="min-h-11" onClick={() => setAsking(null)}>
            Back
          </Button>
        </div>
      </div>
    );
  }
  return (
    <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {sellable.map((service) => (
        <li key={service.id}>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (service.priceIsVariable) {
                setPriceText(String(service.price));
                setAsking(service);
              } else {
                onPick(service.id);
              }
            }}
            className={cn(
              "flex w-full flex-col items-start rounded-[2px] border px-3 text-left transition-colors disabled:opacity-50",
              compact ? "min-h-14 py-1.5" : "min-h-20 py-2.5",
              CHIP_OFF,
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]",
            )}
          >
            <span className={cn("font-semibold leading-tight", compact ? "text-sm" : "text-base")}>{service.name}</span>
            <span className="mt-auto flex w-full items-baseline justify-between gap-2">
              <span className="font-mono text-sm tabular-nums">
                {service.priceIsVariable ? "from " : ""}
                {kes(service.price)}
              </span>
              <span className={dashboardHintClass()}>{service.durationMinutes} min</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** One visit as a slip: each service with who is on it, what each gets, where, and how far along it is. */
function VisitSlip({
  visit,
  services,
  performers,
  resources,
  earnings,
  canSetAmounts,
  shopName,
  busyIds,
  busy,
  act,
  onCancelled,
}: {
  visit: ServiceTicketRecord;
  services: ServiceRecord[];
  performers: ServicePerformerRecord[];
  resources: ServiceResourceRecord[];
  earnings: VisitEarnings | null;
  canSetAmounts: boolean;
  shopName: string;
  /** People in the middle of a service right now, on any slip. */
  busyIds: ReadonlySet<string>;
  busy: boolean;
  act: (action: () => Promise<unknown>, failure: string) => Promise<void>;
  onCancelled: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [otherReason, setOtherReason] = useState("");
  const started = visit.lines.some((l) => l.stage && l.stage !== "WAITING");
  const cancelWith = (reason: string, abandoned = false) =>
    void act(async () => {
      await cancelServiceTicket(visit.id, { reason, ...(abandoned ? { abandoned: true } : {}) });
      onCancelled();
    }, "Only a manager can cancel a visit once work has started.");
  return (
    <section className={cn(DOCKET, "relative content-start px-4 pb-3 pt-4")} aria-label={`Slip ${visit.ticketNumber}`}>
      {/* Torn top edge, like a slip off the pad. */}
      <div
        aria-hidden
        className="absolute inset-x-0 -top-px h-2"
        style={{
          backgroundImage: "radial-gradient(circle at 6px -1px, var(--op-bg,#F4F1EA) 5px, transparent 5.5px)",
          backgroundSize: "12px 8px",
        }}
      />
      <div className="border-b border-dashed pb-2 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--kiosk-text-muted,#556159)]">{shopName}</p>
        <h2 className="mt-0.5 text-xl font-semibold">
          Slip <span className="font-mono tabular-nums">#{visit.ticketNumber}</span>
          {visit.bookingName ? ` · ${visit.bookingName}` : ""}
        </h2>
        <p className={dashboardHintClass()}>
          {visit.bookingName ? "" : "Walk-in · "}in at {clock(visit.createdAt)} · {STAGE_WORD[visit.stage] ?? visit.stage}
        </p>
      </div>

      <NextStep visit={visit} busy={busy} act={act} />

      <ol className="grid gap-0 divide-y divide-dashed">
        {visit.lines.map((line) => (
          <LineCard
            key={line.id}
            visit={visit}
            line={line}
            performers={performers}
            resources={resources}
            shares={earnings?.lines.find((l) => l.lineId === line.id) ?? null}
            canSetAmounts={canSetAmounts}
            busyIds={busyIds}
            busy={busy}
            act={act}
            canRemove={visit.lines.length > 1}
          />
        ))}
      </ol>

      <div className="border-t border-dashed pt-2">
        <Button variant={adding ? "default" : "outline"} size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="size-4" aria-hidden /> {adding ? "Done adding" : "Another service"}
        </Button>
        {adding ? (
          <ServiceTiles
            compact
            services={services}
            busy={busy}
            onPick={(serviceId, unitPrice) =>
              void act(async () => {
                await addServiceTicketLine(visit.id, { serviceId, ...(unitPrice != null ? { unitPrice } : {}) });
                setAdding(false);
              }, "Could not add the service.")
            }
          />
        ) : null}
      </div>

      <VisitProducts visit={visit} busy={busy} act={act} />

      <div className="mt-3 border-t border-dashed pt-2">
        {cancelling ? (
          <div className="grid gap-2">
            <p className="text-sm font-semibold">
              Why is slip #{visit.ticketNumber} being cancelled?{started ? " Work has started, so a manager must do this." : ""}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" disabled={busy} className={cn(CHIP, CHIP_OFF)} onClick={() => cancelWith("Customer left", true)}>
                Customer left
              </button>
              {["Opened by mistake", "Changed their mind"].map((reason) => (
                <button key={reason} type="button" disabled={busy} className={cn(CHIP, CHIP_OFF)} onClick={() => cancelWith(reason)}>
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                className={dashboardInputClass(false, "min-w-0 flex-1")}
                placeholder="Another reason"
                aria-label="Another reason"
                maxLength={200}
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
              />
              <Button size="sm" variant="outline" disabled={busy || !otherReason.trim()} onClick={() => cancelWith(otherReason.trim())}>
                Cancel the slip
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCancelling(false)}>
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setCancelling(true)}>
              Cancel this slip
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * The one thing to do next on this slip, said plainly, with the button that does it. Starting and
 * finishing are optional (payment only needs to know who did the work), so the strip says so.
 */
function NextStep({
  visit,
  busy,
  act,
}: {
  visit: ServiceTicketRecord;
  busy: boolean;
  act: (action: () => Promise<unknown>, failure: string) => Promise<void>;
}) {
  const nobody = visit.lines.find((l) => !l.performerStaffProfileId);
  const working = visit.lines.find((l) => l.stage === "IN_SERVICE");
  const toStart = visit.lines.find((l) => (l.stage ?? "WAITING") === "WAITING" && l.performerStaffProfileId);
  const step = nobody ? 1 : working || toStart ? 2 : 3;
  const first = (name: string | null | undefined) => (name ?? "them").split(/\s+/)[0];
  return (
    <div className="mt-2 rounded-[2px] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)] p-2.5">
      <ol className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em]" aria-label="Where this slip is">
        {["Who", "In the chair", "Pay"].map((label, i) => (
          <li
            key={label}
            aria-current={step === i + 1 ? "step" : undefined}
            className={cn(
              "flex items-center gap-1",
              step === i + 1 ? "font-semibold text-[var(--pos-primary,#1D4B3B)]" : "text-[var(--kiosk-text-muted,#556159)]",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px]",
                step > i + 1 && "border-[var(--pos-primary,#1D4B3B)] bg-[var(--pos-primary,#1D4B3B)] text-white",
                step === i + 1 && "border-[var(--pos-primary,#1D4B3B)]",
              )}
            >
              {step > i + 1 ? "✓" : i + 1}
            </span>
            {label}
            {i < 2 ? <span aria-hidden className="mx-1 w-4 border-t border-dashed border-current opacity-50" /> : null}
          </li>
        ))}
      </ol>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold" role="status">
          {nobody
            ? `Who is doing the ${nobody.name}? Tap a name below, or a free barber at the top.`
            : working
              ? `${first(working.performerName)} is on the ${working.name}. Tap Finished when it is done, or take the money now.`
              : toStart
                ? `${first(toStart.performerName)} has the ${toStart.name}. Start it when the customer sits down, or take the money now.`
                : "All done. Take the money."}
        </p>
        {nobody ? null : working ? (
          <Button className="min-h-11" disabled={busy} onClick={() => void act(() => finishServiceLine(visit.id, working.id), "Could not finish the service.")}>
            <Check className="size-4" aria-hidden /> Finished
          </Button>
        ) : toStart ? (
          <Button className="min-h-11" disabled={busy} onClick={() => void act(() => startServiceLine(visit.id, toStart.id), "Could not start the service.")}>
            <Play className="size-4" aria-hidden /> Start the {toStart.name}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Products the customer buys on the visit (hair food after a haircut): paid with the services, as one sale. */
function VisitProducts({
  visit,
  busy,
  act,
}: {
  visit: ServiceTicketRecord;
  busy: boolean;
  act: (action: () => Promise<unknown>, failure: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<ItemSummaryRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const latest = useRef(0);
  const products = visit.products ?? [];

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setFound([]);
      return;
    }
    // Only the newest search may show its results.
    const ticket = latest.current + 1;
    latest.current = ticket;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void fetchItems(term, { size: 6 })
        .then((items) => (latest.current === ticket ? setFound(items) : undefined))
        .catch(() => (latest.current === ticket ? setFound([]) : undefined))
        .finally(() => (latest.current === ticket ? setSearching(false) : undefined));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className={dashboardLabelClass()}>Products ({products.length})</h3>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Done adding" : "Add a product"}
        </Button>
      </div>
      {products.length > 0 ? (
        <ul className="mt-1 divide-y text-sm">
          {products.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.name}</span>
                <span className={dashboardHintClass()}>
                  {p.quantity} × {kes(p.unitPrice)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className="font-mono tabular-nums">{kes(p.lineTotal)}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  aria-label={`One more ${p.name}`}
                  onClick={() => void act(() => addVisitProduct(visit.id, p.itemId, 1), "Could not add the product.")}
                >
                  +1
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void act(() => removeVisitProduct(visit.id, p.id), "Could not remove the product.")}
                >
                  Remove
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : !open ? (
        <p className={dashboardHintClass()}>Nothing from the shelf on this visit.</p>
      ) : null}
      {open ? (
        <div className="mt-2 grid gap-1">
          <input
            className={dashboardInputClass(false)}
            placeholder="Search your products"
            aria-label="Search your products"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search.trim().length < 2 ? null : searching ? (
            <p className={dashboardHintClass()}>Searching…</p>
          ) : found.length === 0 ? (
            <p className={dashboardHintClass()}>No product matches.</p>
          ) : (
            <ul className="grid gap-1">
              {found.map((item) => (
                <li key={item.id}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        await addVisitProduct(visit.id, item.id, 1);
                        setSearch("");
                      }, "Could not add the product.")
                    }
                  >
                    <span className="truncate">{item.name}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <p className={dashboardHintClass()}>Sold at the shelf price. Stock is taken when the visit is paid.</p>
        </div>
      ) : null}
    </div>
  );
}

function LineCard({
  visit,
  line,
  performers,
  resources,
  shares,
  canSetAmounts,
  busyIds,
  busy,
  act,
  canRemove,
}: {
  visit: ServiceTicketRecord;
  line: ServiceVisitLine;
  performers: ServicePerformerRecord[];
  resources: ServiceResourceRecord[];
  /** What each person on this service will get, when this user may see it. */
  shares: VisitEarnings["lines"][number] | null;
  canSetAmounts: boolean;
  busyIds: ReadonlySet<string>;
  busy: boolean;
  act: (action: () => Promise<unknown>, failure: string) => Promise<void>;
  canRemove: boolean;
}) {
  // "swap" replaces the one person on it; "add" puts a helper beside them.
  const [picking, setPicking] = useState<"swap" | "add" | null>(null);
  const stage = line.stage ?? "WAITING";
  const team = lineTeam(line);
  const where = line.resourceId ?? "";
  const [pricing, setPricing] = useState(team.some((m) => m.amount != null));
  const [typed, setTyped] = useState<Record<string, string>>({});
  const elapsed = stage === "IN_SERVICE" ? minutesSince(line.startedAt ?? null) : null;
  const took =
    stage === "DONE" && line.startedAt && line.finishedAt
      ? Math.max(0, Math.round((new Date(line.finishedAt).getTime() - new Date(line.startedAt).getTime()) / 60000))
      : null;
  const over = elapsed != null && (line.plannedMinutes ?? 0) > 0 && elapsed > (line.plannedMinutes ?? 0);
  const nameOf = (id: string) => performers.find((p) => p.staffProfileId === id)?.displayName ?? "Staff";
  const takeOf = (id: string) => shares?.shares.find((sh) => sh.staffProfileId === id)?.commission ?? null;

  const saveTeam = (next: { staffProfileId: string; amount?: number | null }[], failure: string) =>
    act(() => setServiceLineTeam(visit.id, line.id, next), failure);

  function commitAmount(staffProfileId: string) {
    const text = typed[staffProfileId];
    if (text === undefined) return;
    const amount = text.trim() === "" ? null : Math.round(Number(text));
    const current = team.find((m) => m.staffProfileId === staffProfileId)?.amount ?? null;
    setTyped((prev) => {
      const next = { ...prev };
      delete next[staffProfileId];
      return next;
    });
    if (amount === current || (amount != null && !(amount >= 0))) return;
    void saveTeam(
      team.map((m) => (m.staffProfileId === staffProfileId ? { ...m, amount } : m)),
      "Could not set that amount.",
    );
  }

  return (
    <li className="py-3">
      <div className="flex items-baseline gap-2">
        <p className="text-base font-semibold leading-tight">{line.name}</p>
        <span aria-hidden className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-[color-mix(in_srgb,var(--order-ink,#121A16)_30%,transparent)]" />
        <span className="font-mono text-base font-semibold tabular-nums">{kes(line.lineTotal)}</span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={dashboardHintClass()}>
            {STAGE_WORD[stage]}
            {(line.plannedMinutes ?? 0) > 0 ? ` · about ${line.plannedMinutes} min` : ""}
            {stage === "IN_SERVICE" ? ` · started ${clock(line.startedAt)}, ${elapsed} min ago${over ? " (running over)" : ""}` : ""}
            {took != null ? ` · took ${took} min` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {stage === "WAITING" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy || team.length === 0}
              title={team.length === 0 ? "Choose who is doing it first" : "Start the clock and take the chair"}
              onClick={() => void act(() => startServiceLine(visit.id, line.id), "Could not start the service.")}
            >
              <Play className="size-3.5" aria-hidden /> Start
            </Button>
          ) : stage === "IN_SERVICE" ? (
            <Button size="sm" disabled={busy} onClick={() => void act(() => finishServiceLine(visit.id, line.id), "Could not finish the service.")}>
              <Check className="size-3.5" aria-hidden /> Finished
            </Button>
          ) : (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act(() => startServiceLine(visit.id, line.id), "Could not reopen the service.")}>
              Not finished
            </Button>
          )}
          {stage === "WAITING" && canRemove ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act(() => removeServiceLine(visit.id, line.id), "Could not remove the service.")}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-2">
        {team.length > 0 ? (
          <>
            <ul className="flex flex-wrap items-center gap-1.5" aria-label={`Who is on the ${line.name}`}>
              {team.map((m, index) => {
                const take = takeOf(m.staffProfileId);
                return (
                  <li key={m.staffProfileId} className={cn(CHIP, CHIP_ON, "pr-1")}>
                    <UserRound className="size-3.5" aria-hidden />
                    {nameOf(m.staffProfileId)}
                    {team.length > 1 && index === 0 ? <span className="text-xs font-normal opacity-80">leads</span> : null}
                    {take != null ? <span className="font-mono text-xs tabular-nums opacity-90">gets {kes(take)}</span> : null}
                    {team.length > 1 ? (
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Take ${nameOf(m.staffProfileId)} off the ${line.name}`}
                        className="ml-0.5 flex size-8 items-center justify-center rounded-[2px] hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        onClick={() => void saveTeam(toggleTeamMember(team, m.staffProfileId), "Could not take them off.")}
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    ) : (
                      <span className="w-1.5" aria-hidden />
                    )}
                  </li>
                );
              })}
              {team.length === 1 ? (
                <li>
                  <button
                    type="button"
                    aria-pressed={picking === "swap"}
                    className={cn(CHIP, picking === "swap" ? CHIP_ON : CHIP_OFF)}
                    onClick={() => setPicking((v) => (v === "swap" ? null : "swap"))}
                  >
                    Change
                  </button>
                </li>
              ) : null}
              <li>
                <button
                  type="button"
                  aria-pressed={picking === "add"}
                  className={cn(CHIP, picking === "add" ? CHIP_ON : CHIP_OFF)}
                  onClick={() => setPicking((v) => (v === "add" ? null : "add"))}
                >
                  <Plus className="size-3.5" aria-hidden /> Someone helped
                </button>
              </li>
            </ul>
            {team.length > 1 || canSetAmounts ? (
              <p className={cn("mt-1", dashboardHintClass())}>
                {team.length > 1
                  ? shares
                    ? `Shared ${team.length} ways. The shop keeps ${kes(shares.shopShare)} of this one.`
                    : `Shared equally between ${team.length}.`
                  : ""}
                {canSetAmounts ? (
                  <>
                    {" "}
                    <button type="button" className="underline" onClick={() => setPricing((v) => !v)}>
                      {pricing ? "Hide amounts" : team.length > 1 ? "Type what each gets" : `Type what ${nameOf(team[0]!.staffProfileId).split(/\s+/)[0]} gets`}
                    </button>
                  </>
                ) : null}
              </p>
            ) : null}
          </>
        ) : null}

        {team.length === 0 || picking ? (
          <fieldset className={cn(team.length > 0 && "mt-2 rounded-[2px] border border-dashed p-2")}>
            <legend className={cn("flex items-center gap-1 px-1", team.length === 0 ? "text-sm font-semibold" : dashboardLabelClass())}>
              {team.length === 0 ? (
                <>
                  <UserRound className="size-4" aria-hidden /> Who is doing it?
                </>
              ) : picking === "swap" ? (
                `Who is doing it instead of ${nameOf(team[0]!.staffProfileId).split(/\s+/)[0]}?`
              ) : (
                "Who helped?"
              )}
            </legend>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {performers
                .filter((p) => !team.some((m) => m.staffProfileId === p.staffProfileId))
                .map((p) => {
                  const occupied = busyIds.has(p.staffProfileId);
                  return (
                    <button
                      key={p.staffProfileId}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const next =
                          picking === "add" ? [...team, { staffProfileId: p.staffProfileId, amount: null }] : [{ staffProfileId: p.staffProfileId, amount: null }];
                        setPicking(null);
                        void saveTeam(next, "Could not change who is on it.");
                      }}
                      className={cn(CHIP, CHIP_OFF, team.length === 0 && "min-h-11 px-3")}
                    >
                      {p.displayName}
                      {occupied ? <span className="text-xs font-normal text-[var(--kiosk-highlight,#A55237)]">busy now</span> : null}
                    </button>
                  );
                })}
            </div>
            {team.length === 0 ? (
              <p className={cn("mt-1", dashboardHintClass())}>If more than one person works on it, add the others after.</p>
            ) : null}
          </fieldset>
        ) : null}

        {pricing && canSetAmounts && team.length > 0 ? (
          <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {team.map((m) => {
              const byPlan = m.amount == null ? takeOf(m.staffProfileId) : null;
              return (
                <li key={m.staffProfileId} className="flex items-center justify-between gap-2 text-sm">
                  <label htmlFor={`amt-${line.id}-${m.staffProfileId}`}>{nameOf(m.staffProfileId)} gets</label>
                  <span className="flex items-center gap-1">
                    <span className={dashboardHintClass()}>KSh</span>
                    <input
                      id={`amt-${line.id}-${m.staffProfileId}`}
                      className={dashboardInputClass(false, "w-24 text-right font-mono")}
                      inputMode="numeric"
                      placeholder={byPlan != null ? String(byPlan) : "usual"}
                      value={typed[m.staffProfileId] ?? (m.amount != null ? String(m.amount) : "")}
                      onChange={(e) => setTyped((prev) => ({ ...prev, [m.staffProfileId]: e.target.value.replace(/[^0-9]/g, "") }))}
                      onBlur={() => commitAmount(m.staffProfileId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                    />
                  </span>
                </li>
              );
            })}
            <li className={cn("sm:col-span-2", dashboardHintClass())}>
              Leave a box empty to pay that person their usual commission. Together they cannot come to more than {kes(line.lineTotal)}.
            </li>
          </ul>
        ) : null}
      </div>

      {resources.length > 0 && stage !== "WAITING" ? (
        line.resourceName ? (
          <p className={cn("mt-2 flex items-center gap-1 text-sm")}>
            <Armchair className="size-3.5" aria-hidden /> {line.resourceName}
          </p>
        ) : null
      ) : resources.length > 0 ? (
        <fieldset className="mt-2">
          <legend className={cn("flex items-center gap-1", dashboardLabelClass())}>
            <Armchair className="size-3.5" aria-hidden /> Where (optional)
          </legend>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {resources.map((r) => {
              const on = r.id === where;
              const free = resourceIsFree(r) || on;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={on}
                  disabled={busy || stage !== "WAITING" || (!free && !on)}
                  title={free ? undefined : r.busyTicketId ? "In use" : "Not free yet"}
                  onClick={() =>
                    void act(() => assignServiceLine(visit.id, line.id, { resourceId: on ? "" : r.id }), "Could not choose that place.")
                  }
                  className={cn(CHIP, "min-h-9 text-xs", on ? CHIP_ON : CHIP_OFF, !free && "line-through")}
                >
                  {r.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
    </li>
  );
}

function Checkout({
  visit,
  names,
  earnings,
  onPaid,
  onChanged,
}: {
  visit: ServiceTicketRecord;
  names: ReadonlyMap<string, string>;
  /** What each person will get; null when this user may not see staff earnings. */
  earnings: VisitEarnings | null;
  onPaid: (
    ticket: ServiceTicketRecord,
    earnings: VisitEarnings | null,
    tips: { name: string; amount: number }[],
    /** Cash to hand back, when the cashier typed what the customer gave. */
    change: number,
  ) => Promise<void> | void;
  onChanged: (text: string) => Promise<void> | void;
}) {
  const people = useMemo(() => visitPeople(visit, names), [visit, names]);
  const [tip, setTip] = useState("");
  const [mode, setMode] = useState<TipMode>("EQUAL");
  const [oneId, setOneId] = useState("");
  const [manual, setManual] = useState<Record<string, string>>({});
  const [pay, setPay] = useState<"cash" | "mpesa_manual" | "split">("mpesa_manual");
  const [cashPart, setCashPart] = useState("");
  const [cashGiven, setCashGiven] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // One key per payment of this visit: a retry never rings it twice.
  const keyRef = useRef<string>(nextIdempotencyKey());

  const tipNumber = Math.max(0, parseMoney(tip) ?? 0);
  const manualNumbers = Object.fromEntries(Object.entries(manual).map(([id, text]) => [id, parseMoney(text) ?? 0]));
  const effectiveMode: TipMode = people.length <= 1 ? "ONE" : mode;
  const shares = allocateTip(tipNumber, people, effectiveMode, { oneId: oneId || people[0]?.staffProfileId, manual: manualNumbers });
  const left = tipLeftToAllocate(tipNumber, shares);
  const deposit = visit.depositState === "HELD" ? (visit.depositAmount ?? 0) : 0;
  const toPay = amountStillDue(visit.total, tipNumber, deposit, 0);
  const unassigned = visit.lines.filter((l) => !l.performerStaffProfileId);
  const cashNumber = parseMoney(cashPart) ?? 0;
  const given = parseMoney(cashGiven);
  const nameOf = (id: string) => people.find((p) => p.staffProfileId === id)?.name ?? earnings?.staff.find((s) => s.staffProfileId === id)?.staffName ?? "Staff";
  const tipFor = (id: string) => shares.find((s) => s.staffProfileId === id)?.amount ?? 0;

  async function take() {
    if (unassigned.length > 0) return setError(`Choose who did ${unassigned[0]!.name}`);
    if (tipNumber > 0 && Math.abs(left) >= 0.01) {
      return setError(left > 0 ? `${kes(left)} of the tip is not given to anyone yet` : `The tip shares are ${kes(-left)} more than the tip`);
    }
    if (pay === "split" && !(cashNumber > 0 && cashNumber < toPay)) return setError("Enter the cash part: more than zero, less than the total");
    if (pay === "cash" && given != null && given < toPay) return setError(`That is less than ${kes(toPay)}`);
    setError(null);
    setSaving(true);
    const ref = reference.trim() ? { reference: reference.trim().toUpperCase() } : {};
    const payments =
      toPay <= 0
        ? []
        : pay === "split"
          ? [
              { method: "mpesa_manual" as const, amount: Math.round((toPay - cashNumber) * 100) / 100, ...ref },
              { method: "cash" as const, amount: cashNumber },
            ]
          : [{ method: pay, amount: toPay, ...(pay === "mpesa_manual" ? ref : {}) }];
    try {
      const out = await payServiceTicket(
        visit.id,
        {
          payments,
          ...(shares.length > 0 ? { tips: shares.map((s) => ({ staffProfileId: s.staffProfileId, amount: s.amount })) } : {}),
          ...(pay === "cash" && given != null && given >= toPay ? { cashReceived: given } : {}),
          clientSoldAt: new Date().toISOString(),
        },
        keyRef.current,
      );
      await onPaid(
        out.ticket,
        earnings,
        shares.map((s) => ({ name: nameOf(s.staffProfileId), amount: s.amount })),
        pay === "cash" && given != null && given > toPay ? Math.round((given - toPay) * 100) / 100 : 0,
      );
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        // The visit changed under us (a price, or it was already paid): show why; nothing was charged.
        keyRef.current = nextIdempotencyKey();
        await onChanged(message(err, "This visit has changed. Check it and take payment again."));
      } else {
        setError(message(err, "The payment was not recorded. Try again."));
      }
    } finally {
      setSaving(false);
    }
  }

  if (unassigned.length > 0) {
    // Nothing to fill in yet: the money cannot be shared until every service is somebody's.
    return (
      <section className={cn(DOCKET, "content-start p-3")} aria-label="Take payment">
        <h2 className={dashboardLabelClass()}>Take payment</h2>
        <p className="mt-2 font-mono text-3xl font-semibold tabular-nums leading-none text-[var(--kiosk-text-muted,#556159)]">{kes(visit.total)}</p>
        <p className="mt-3 text-sm font-semibold">First say who is doing the {unassigned.map((l) => l.name).join(" and the ")}.</p>
        <p className={dashboardHintClass()}>Then you can take the money here, even before the work is finished.</p>
      </section>
    );
  }

  return (
    <section className={cn(DOCKET, "content-start p-3")} aria-label="Take payment">
      <h2 className={dashboardLabelClass()}>Take payment</h2>
      <dl className="mt-1 grid gap-0.5 text-sm">
        <div className="flex justify-between">
          <dt>Services</dt>
          <dd className="font-mono tabular-nums">{kes(visitServiceTotal(visit))}</dd>
        </div>
        {(visit.products ?? []).length > 0 ? (
          <div className="flex justify-between">
            <dt>Products</dt>
            <dd className="font-mono tabular-nums">{kes(Math.round((visit.total - visitServiceTotal(visit)) * 100) / 100)}</dd>
          </div>
        ) : null}
        {deposit > 0 ? (
          <div className="flex justify-between">
            <dt>Deposit already paid</dt>
            <dd className="font-mono tabular-nums">−{kes(Math.min(deposit, visit.total))}</dd>
          </div>
        ) : null}
      </dl>

      <label className="mt-2 flex items-center justify-between gap-2 text-sm">
        <span>Tip</span>
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
      <div className="mt-1 flex flex-wrap justify-end gap-1" role="group" aria-label="Quick tip">
        {[50, 100, 200].map((amount) => (
          <Button key={amount} size="sm" variant={tipNumber === amount ? "default" : "outline"} onClick={() => { setTip(String(amount)); setError(null); }}>
            +{amount}
          </Button>
        ))}
        {tipNumber > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => setTip("")}>
            No tip
          </Button>
        ) : null}
      </div>
      {tipNumber > 0 && people.length > 1 ? (
        <div className="mt-1 grid gap-1.5">
          <div className="grid grid-cols-4 gap-1" role="group" aria-label="How to share the tip">
            {(
              [
                ["EQUAL", "Equally"],
                ["BY_WORK", "By work"],
                ["ONE", "One person"],
                ["MANUAL", "Type it"],
              ] as const
            ).map(([id, label]) => (
              <Button key={id} size="sm" variant={mode === id ? "default" : "outline"} aria-pressed={mode === id} onClick={() => setMode(id)}>
                {label}
              </Button>
            ))}
          </div>
          <ul className="grid gap-1">
            {people.map((p) => (
              <li key={p.staffProfileId} className="flex items-center justify-between gap-2 text-sm">
                {mode === "ONE" ? (
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="tip-one"
                      checked={(oneId || people[0]!.staffProfileId) === p.staffProfileId}
                      onChange={() => setOneId(p.staffProfileId)}
                    />
                    {p.name}
                  </label>
                ) : (
                  <span>{p.name}</span>
                )}
                {mode === "MANUAL" ? (
                  <input
                    className={dashboardInputClass(false, "w-24 text-right font-mono")}
                    inputMode="decimal"
                    aria-label={`Tip for ${p.name}`}
                    value={manual[p.staffProfileId] ?? ""}
                    onChange={(e) => {
                      setManual((prev) => ({ ...prev, [p.staffProfileId]: cleanMoneyText(e.target.value) }));
                      setError(null);
                    }}
                  />
                ) : (
                  <span className="font-mono tabular-nums">{kes(tipFor(p.staffProfileId))}</span>
                )}
              </li>
            ))}
          </ul>
          {mode === "MANUAL" && Math.abs(left) >= 0.01 ? (
            <p className="text-sm text-red-700">{left > 0 ? `${kes(left)} still to give out` : `${kes(-left)} too much`}</p>
          ) : null}
        </div>
      ) : tipNumber > 0 && people.length === 1 ? (
        <p className={dashboardHintClass()}>All of it goes to {people[0]!.name}.</p>
      ) : tipNumber > 0 ? (
        <p className="text-sm text-red-700">Choose who did the services before taking a tip.</p>
      ) : null}

      <div className="mt-2 flex items-baseline justify-between border-y border-dashed py-2">
        <span className="text-sm font-semibold">To pay</span>
        <span className="font-mono text-3xl font-semibold tabular-nums leading-none">{kes(toPay)}</span>
      </div>

      {toPay > 0 ? (
        <div className="mt-2 grid gap-2">
          <div className="grid grid-cols-3 gap-1" role="group" aria-label="How they are paying">
            {(
              [
                ["mpesa_manual", "M-Pesa"],
                ["cash", "Cash"],
                ["split", "Both"],
              ] as const
            ).map(([id, label]) => (
              <Button key={id} className="min-h-11" variant={pay === id ? "default" : "outline"} aria-pressed={pay === id} onClick={() => setPay(id)}>
                {label}
              </Button>
            ))}
          </div>
          {pay === "cash" ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Cash received (optional)</span>
              <input className={dashboardInputClass(false, "font-mono")} inputMode="decimal" value={cashGiven} onChange={(e) => setCashGiven(cleanMoneyText(e.target.value))} />
              <span className="flex flex-wrap gap-1">
                {[...new Set([toPay, ...[100, 200, 500, 1000, 2000].filter((note) => note > toPay)])].slice(0, 4).map((amount, i) => (
                  <Button key={amount} size="sm" variant="outline" onClick={() => setCashGiven(String(amount))}>
                    {i === 0 ? "Exact" : kes(amount)}
                  </Button>
                ))}
              </span>
              {given != null && given > toPay ? (
                <span className="text-sm">
                  Change <span className="font-mono tabular-nums">{kes(given - toPay)}</span>
                </span>
              ) : null}
            </label>
          ) : null}
          {pay === "split" ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Cash part</span>
              <input className={dashboardInputClass(false, "font-mono")} inputMode="decimal" value={cashPart} onChange={(e) => setCashPart(cleanMoneyText(e.target.value))} />
              <span className={dashboardHintClass()}>
                M-Pesa part: {kes(Math.max(0, Math.round((toPay - cashNumber) * 100) / 100))}
              </span>
            </label>
          ) : null}
          {pay !== "cash" ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>M-Pesa code (optional)</span>
              <input className={dashboardInputClass(false, "font-mono uppercase")} maxLength={20} value={reference} onChange={(e) => setReference(e.target.value)} />
              <span className={dashboardHintClass()}>Check the payment on your phone before you confirm.</span>
            </label>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <Button size="lg" className="mt-2 min-h-12 w-full text-base" disabled={saving} onClick={() => void take()}>
        {saving ? "Recording…" : toPay > 0 ? `Take ${kes(toPay)}${pay === "cash" ? " cash" : pay === "mpesa_manual" ? " by M-Pesa" : ""}` : "Close the slip"}
      </Button>
      {earnings && earnings.staff.length > 0 ? (
        <div className="mt-3 border-t border-dashed pt-2">
          <h3 className={dashboardLabelClass()}>Who gets what</h3>
          <ul className="mt-1 divide-y divide-dashed text-sm">
            {earnings.staff.map((person) => {
              const tipShare = tipFor(person.staffProfileId);
              return (
                <li key={person.staffProfileId} className="flex items-baseline justify-between gap-3 py-1">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{person.staffName}</span>
                    <span className={dashboardHintClass()}>
                      {kes(person.commission)} for the work{tipShare > 0 ? ` + ${kes(tipShare)} tip` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono font-semibold tabular-nums">{kes(person.commission + tipShare)}</span>
                </li>
              );
            })}
            <li className="flex items-baseline justify-between gap-3 py-1">
              <span className="font-medium">Shop keeps</span>
              <span className="shrink-0 font-mono font-semibold tabular-nums">{kes(earnings.shopShare)}</span>
            </li>
          </ul>
          <p className={dashboardHintClass()}>
            From the services only. Tips go to the team in full; they are not the shop&apos;s income.
          </p>
        </div>
      ) : null}

    </section>
  );
}

function PaidSummary({
  paid,
  onNext,
}: {
  paid: { ticket: ServiceTicketRecord; earnings: VisitEarnings | null; tips: { name: string; amount: number }[]; change: number };
  onNext: () => void;
}) {
  const tipTotal = paid.tips.reduce((sum, t) => sum + t.amount, 0);
  return (
    <section className={cn(DOCKET, "p-3 lg:col-span-2")} aria-label="Visit paid" role="status">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <CircleCheck className="size-6 text-[var(--pos-primary,#1D4B3B)]" aria-hidden />
        Slip #{paid.ticket.ticketNumber} is paid · {kes(paid.ticket.total + tipTotal)}
      </h2>
      {paid.change > 0 ? (
        <p className="mt-2 rounded-[2px] border border-[var(--kiosk-highlight,#A55237)] p-2 text-base font-semibold">
          Give back <span className="font-mono tabular-nums">{kes(paid.change)}</span> change
        </p>
      ) : null}
      <ul className="mt-2 divide-y text-sm">
        {paid.ticket.lines.map((l) => (
          <li key={l.id} className="flex justify-between gap-3 py-1.5">
            <span>
              {l.name}
              <span className={cn("block", dashboardHintClass())}>
                {l.performerName ?? "Staff"}
                {l.resourceName ? ` · ${l.resourceName}` : ""}
              </span>
            </span>
            <span className="font-mono tabular-nums">{kes(l.lineTotal)}</span>
          </li>
        ))}
      </ul>
      {(paid.ticket.products ?? []).length > 0 ? (
        <ul className="divide-y border-t text-sm">
          {(paid.ticket.products ?? []).map((p) => (
            <li key={p.id} className="flex justify-between gap-3 py-1.5">
              <span>
                {p.name}
                <span className={cn("block", dashboardHintClass())}>
                  {p.quantity} × {kes(p.unitPrice)}
                </span>
              </span>
              <span className="font-mono tabular-nums">{kes(p.lineTotal)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="mt-2 grid gap-0.5 border-t pt-2 text-sm">
        <div className="flex justify-between">
          <dt>Services and products</dt>
          <dd className="font-mono tabular-nums">{kes(paid.ticket.total)}</dd>
        </div>
        {tipTotal > 0 ? (
          <div className="flex justify-between">
            <dt>Tips ({paid.tips.map((t) => `${t.name} ${kes(t.amount)}`).join(", ")})</dt>
            <dd className="font-mono tabular-nums">{kes(tipTotal)}</dd>
          </div>
        ) : null}
        {paid.earnings ? (
          <>
            <div className="flex justify-between">
              <dt>Commission to the team</dt>
              <dd className="font-mono tabular-nums">{kes(paid.earnings.commissionTotal)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Shop keeps</dt>
              <dd className="font-mono tabular-nums">{kes(paid.earnings.shopShare)}</dd>
            </div>
          </>
        ) : null}
      </dl>
      <Button size="lg" autoFocus className="mt-3 min-h-12 w-full text-base sm:w-auto" onClick={onNext}>
        Next customer
      </Button>
    </section>
  );
}
