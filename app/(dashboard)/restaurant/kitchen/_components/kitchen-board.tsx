"use client";

import { ChefHat } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  acknowledgeVoidTicket,
  claimKitchenPrintJob,
  fetchKitchenBoard,
  fetchKitchenPrintJobs,
  fetchMenu,
  markKitchenJobPrinted,
  setKitchenLineStage,
  setKitchenTicketStage,
  setMenuItemAvailable,
  type KitchenLineRecord,
  type KitchenStationRecord,
  type KitchenTicketRecord,
  type MenuItemRecord,
} from "@/lib/restaurant-api";
import { allDayCounts, elapsedLabel, ticketUrgency, type TicketUrgency } from "@/lib/restaurant-cart";
import {
  buildKitchenTicketEscPos,
  jobPrinterTarget,
  kitchenWhere,
  localPrinter,
  printKitchenJob,
  printOnThisDevice,
} from "@/lib/restaurant-print";
import { useRestaurantLive } from "@/lib/use-restaurant-live";
import { cn } from "@/lib/utils";
import { NoBranch } from "../../_components/no-branch";
import { KitchenRequests } from "../../_components/kitchen-requests";

const STATION_KEY = "kiosk:restaurant:kitchen-station:v1";
const AUTO_PRINT_KEY = "kiosk:restaurant:kitchen-autoprint:v1";
const CHIME_KEY = "kiosk:restaurant:kitchen-chime:v1";

/**
 * A short two-note chime when a ticket arrives, so a cook not looking at the screen still hears
 * it. Built on the Web Audio API, so it needs no asset and no dependency; a browser that blocks
 * it before a tap simply stays silent, and the board works as before.
 */
let audio: AudioContext | null = null;
function chime(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audio ??= new Ctor();
    if (audio.state === "suspended") void audio.resume();
    const at = audio.currentTime;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    gain.connect(audio.destination);
    for (const [offset, frequency] of [[0, 880], [0.14, 1180]] as const) {
      const note = audio.createOscillator();
      note.type = "sine";
      note.frequency.setValueAtTime(frequency, at + offset);
      note.connect(gain);
      note.start(at + offset);
      note.stop(at + offset + 0.35);
    }
  } catch {
    // Sound is a courtesy; failing to make it must never break the board.
  }
}

type WakeSentinel = { release: () => Promise<void> };
type WakeNavigator = Navigator & { wakeLock?: { request: (kind: "screen") => Promise<WakeSentinel> } };

const ALL = "";
const NONE = "none";

const CHIP =
  "min-h-11 shrink-0 rounded-[2px] border px-4 py-2 text-sm font-semibold " +
  "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]";
const CHIP_ON = "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)]";

function timeOfDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
}

/**
 * What a station has to make now, oldest first. Built to be read from across a kitchen on a
 * cheap tablet: large order numbers, no hover, one tap per plate or per ticket. It polls, and
 * says so plainly when it cannot reach the server, because a board that looks current and is
 * not is worse than one that admits it.
 */
const LANE_TITLE = "font-serif text-[1.45rem] italic leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]";
const LANE_RULE = "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]";

// Age-based urgency on a ticket (see ticketUrgency): a faint whole-card wash and a colour on the
// waiting time, both in the system's terracotta attention hue (--kiosk-highlight) — not a fourth
// red/amber hue, and distinct from the hard danger-red that a cancelled ticket keeps for itself.
// "late" also gets a word in the label, so it never reads by colour alone; the waiting time is the
// primary signal and the wash is a quiet background, deepening as the ticket ages.
// Static class strings (Tailwind's JIT only sees literals — no interpolation).
const TICKET_URGENCY_CARD: Record<TicketUrgency, string> = {
  ok: "",
  slow: "bg-[color-mix(in_srgb,var(--kiosk-highlight,#A55237)_5%,transparent)]",
  late: "bg-[color-mix(in_srgb,var(--kiosk-highlight,#A55237)_12%,transparent)]",
};
const TICKET_URGENCY_TIME: Record<TicketUrgency, string> = {
  ok: "",
  slow: "text-[color-mix(in_srgb,var(--kiosk-highlight,#A55237)_82%,var(--order-ink,#121A16))]",
  late: "font-semibold text-[var(--kiosk-highlight,#A55237)]",
};
const TICKET_URGENCY_WORD: Record<TicketUrgency, string> = {
  ok: "",
  slow: "behind",
  late: "late",
};

export function KitchenBoard({ canWork }: { canWork: boolean }) {
  const { branchId } = useDashboard();
  const [tickets, setTickets] = useState<KitchenTicketRecord[] | null>(null);
  const [stations, setStations] = useState<KitchenStationRecord[]>([]);
  const [station, setStation] = useState<string>(ALL);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [sound, setSound] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [runOutOpen, setRunOutOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [printProblem, setPrintProblem] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const printing = useRef(false);
  const stationRef = useRef(station);
  stationRef.current = station;
  // A set of ids, not one "busy" flag: two cooks on one tablet must not swallow each other's taps,
  // and a tap on one plate must not freeze every other ticket on the board.
  const busyRef = useRef<Set<string>>(new Set());
  const seenTickets = useRef<Set<string> | null>(null);
  const isBusy = (id: string) => busyIds.has(id);

  // The station a screen shows is a fact about that device, so it is remembered on it.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STATION_KEY);
      if (saved != null) setStation(saved);
    } catch {
      // private mode: the screen starts on every station
    }
  }, []);

  const load = useCallback(async () => {
    if (!branchId) return;
    const wanted = stationRef.current;
    try {
      // Every station's tickets, not only this screen's: the chips carry each station's count, and
      // a cook pinned to Grill must be able to see that the bar is piling up.
      const board = await fetchKitchenBoard(branchId, null);
      if (stationRef.current !== wanted) return; // the station was changed while this was in flight
      setTickets(board.tickets);
      setLastUpdated(board.asOf);
      setDisconnected(false);
    } catch {
      setDisconnected(true);
      setTickets((current) => current ?? []);
    }
    setNow(Date.now());
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load, station]);

  useEffect(() => {
    void fetchMenu()
      .then((menu) => setStations(menu.stations.filter((s) => s.active)))
      .catch(() => setStations([]));
  }, []);

  useRestaurantLive(() => void load(), 5000, Boolean(branchId));

  useEffect(() => {
    try {
      setAutoPrint(window.localStorage.getItem(AUTO_PRINT_KEY) === "1");
      setSound(window.localStorage.getItem(CHIME_KEY) !== "0");
    } catch {
      // private mode: printing stays manual, the chime stays on
    }
  }, []);

  // A chime when a ticket this screen shows has not been seen before. The first load fills the set
  // silently, so opening the board at the start of a shift does not ring for everything already up.
  useEffect(() => {
    if (tickets == null) return;
    const here = tickets.filter((t) =>
      station === ALL ? true : station === NONE ? !t.stationId : t.stationId === station,
    );
    // A cancellation is as urgent as a new ticket — the kitchen must stop making something.
    const ids = new Set(here.filter((t) => t.ticketType === "NEW" || t.ticketType === "VOID").map((t) => t.id));
    if (seenTickets.current == null) {
      seenTickets.current = ids;
      return;
    }
    const fresh = [...ids].some((id) => !seenTickets.current!.has(id));
    seenTickets.current = ids;
    if (fresh && sound) chime();
  }, [tickets, station, sound]);

  // A kitchen tablet that sleeps stops showing tickets. Ask the browser to keep the screen on while
  // the board is open (unsupported browsers simply carry on as before).
  useEffect(() => {
    const nav = navigator as WakeNavigator;
    if (!nav.wakeLock) return;
    let sentinel: WakeSentinel | null = null;
    let stopped = false;
    const acquire = async () => {
      if (stopped) return;
      try {
        sentinel = await nav.wakeLock!.request("screen");
      } catch {
        sentinel = null;
      }
    };
    void acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible" && sentinel == null) void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, []);

  const stationLabel = useCallback(
    (ticket: KitchenTicketRecord) => (ticket.stationId ? (stations.find((s) => s.id === ticket.stationId)?.name ?? null) : null),
    [stations],
  );

  async function printTicket(ticket: KitchenTicketRecord): Promise<boolean> {
    try {
      await printOnThisDevice(buildKitchenTicketEscPos(ticket, stationLabel(ticket)));
      setPrintProblem(null);
      return true;
    } catch (e) {
      setPrintProblem(e instanceof Error && e.message ? e.message : "The ticket did not print.");
      return false;
    }
  }

  // With "print new tickets" on, this device prints the branch's queued kitchen tickets for its
  // station. Each job is claimed on the server first, so exactly one device prints a ticket even
  // when several screens are on — the one that wins the claim prints it; the rest leave it. A job
  // goes to the station's own printer if it named one, otherwise this device's. It stops at the
  // first printer failure so a printer that is off does not swallow tickets; the counter is warned
  // about anything still unprinted. Claimed one at a time, oldest first.
  useEffect(() => {
    if (!autoPrint || !branchId || printing.current) return;
    printing.current = true;
    void (async () => {
      try {
        const jobs = await fetchKitchenPrintJobs(branchId, stationRef.current || null);
        for (const job of jobs) {
          if (!jobPrinterTarget(job)) continue; // no printer this device can use for it; leave it to another
          let claimed;
          try {
            claimed = await claimKitchenPrintJob(job.id);
          } catch {
            continue; // another device took it first
          }
          try {
            await printKitchenJob(claimed);
            await markKitchenJobPrinted(claimed.id);
            setPrintProblem(null);
          } catch (e) {
            setPrintProblem(
              `${e instanceof Error && e.message ? e.message : "The printer did not answer."} The counter is told this ticket did not print.`,
            );
            break; // claimed but unprinted: the counter's "not printed" warning covers it
          }
        }
      } catch {
        // could not reach the queue; the next poll tries again
      } finally {
        printing.current = false;
      }
    })();
  }, [autoPrint, tickets, branchId]);

  function toggleAutoPrint() {
    const next = !autoPrint;
    // A ticket can print on the station's own printer or this device's. Only block turning it on
    // when neither could ever apply: no station has a printer and this device has none either.
    if (next && !localPrinter() && !stations.some((s) => s.printerName || s.printerHost)) {
      setPrintProblem(
        "No printer for the kitchen. Give a station a printer in the menu, or set one up on this device.",
      );
      return;
    }
    setAutoPrint(next);
    try {
      window.localStorage.setItem(AUTO_PRINT_KEY, next ? "1" : "0");
    } catch {
      // not remembered across reloads
    }
  }

  function fullScreen() {
    const el = boardRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  }

  function chooseStation(next: string) {
    setStation(next);
    setTickets(null);
    try {
      window.localStorage.setItem(STATION_KEY, next);
    } catch {
      // not remembered; nothing else changes
    }
  }

  function replaceTicket(updated: KitchenTicketRecord) {
    setTickets((prev) =>
      (prev ?? [])
        // A ticket with nothing left to make leaves the board.
        .map((t) => (t.id === updated.id ? updated : t))
        .filter((t) => t.status === "OPEN" || t.ticketType === "VOID"),
    );
  }

  async function act(id: string, run: () => Promise<KitchenTicketRecord | void>) {
    if (busyRef.current.has(id)) return;
    busyRef.current.add(id);
    setBusyIds(new Set(busyRef.current));
    setProblem(null);
    try {
      const updated = await run();
      if (updated) replaceTicket(updated);
    } catch {
      setProblem("That did not go through. Check the connection and tap again.");
    } finally {
      busyRef.current.delete(id);
      setBusyIds(new Set(busyRef.current));
      void load();
    }
  }

  const stationName = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stations) map.set(s.id, s.name);
    return map;
  }, [stations]);

  if (!branchId) {
    return (
      <div className={DASHBOARD_MAX_WIDE}>
        <NoBranch message="Choose a branch at the top of the page to see its kitchen." />
      </div>
    );
  }

  const renderTicket = (ticket: KitchenTicketRecord) => {
            const isVoid = ticket.ticketType === "VOID";
            const left = ticket.lines.filter((l) => l.stage === "NEW" || l.stage === "PREPARING").length;
            // A void ticket already shouts in red; only colour by age when it is a live ticket.
            const urgency = isVoid ? "ok" : ticketUrgency(ticket.sentAt, now);
            const urgencyWord = TICKET_URGENCY_WORD[urgency];
            return (
              <li
                key={ticket.id}
                className={cn(
                  "grid content-start gap-2 rounded-[2px] border bg-[#FFFEFA] p-3",
                  isVoid ? "border-2 border-red-700" : LANE_RULE,
                  TICKET_URGENCY_CARD[urgency],
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-4xl font-semibold tabular-nums">{ticket.orderNumber}</span>
                  <span className="text-right text-sm">
                    <span className={cn("block font-mono tabular-nums", TICKET_URGENCY_TIME[urgency])}>
                      {elapsedLabel(ticket.sentAt, now)}
                      {urgencyWord ? <span className="font-sans font-semibold"> · {urgencyWord}</span> : null}
                    </span>
                    {ticket.stationId && station === ALL ? (
                      <span className={dashboardHintClass()}>{stationName.get(ticket.stationId) ?? "Station"}</span>
                    ) : null}
                  </span>
                </div>
                {kitchenWhere(ticket) ? (
                  <p className="text-base font-semibold">{kitchenWhere(ticket)}</p>
                ) : null}
                {isVoid ? (
                  <p className="text-base font-bold uppercase text-red-700">Cancelled — stop making this</p>
                ) : null}
                <ul className="divide-y">
                  {ticket.lines.map((line) => (
                    <TicketLine
                      key={line.id}
                      line={line}
                      isVoid={isVoid}
                      canWork={canWork}
                      busy={isBusy(line.id)}
                      onStart={() => void act(line.id, () => setKitchenLineStage(line.id, "PREPARING"))}
                      onReady={() => void act(line.id, () => setKitchenLineStage(line.id, "READY"))}
                      onUndo={() => void act(line.id, () => setKitchenLineStage(line.id, "PREPARING"))}
                    />
                  ))}
                </ul>
                {canWork && isVoid ? (
                  <Button
                    className="h-12 text-base"
                    variant="outline"
                    disabled={isBusy(ticket.id)}
                    onClick={() =>
                      void act(ticket.id, async () => {
                        await acknowledgeVoidTicket(ticket.id);
                        setTickets((prev) => (prev ?? []).filter((t) => t.id !== ticket.id));
                      })
                    }
                  >
                    Seen
                  </Button>
                ) : null}
                <button type="button" className="justify-self-start text-sm underline" onClick={() => void printTicket(ticket)}>
                  Print
                </button>
                {canWork && !isVoid && ticket.lines.some((l) => l.stage === "NEW") ? (
                  <Button
                    variant="outline"
                    className="h-12 text-base"
                    disabled={isBusy(ticket.id)}
                    onClick={() => void act(ticket.id, () => setKitchenTicketStage(ticket.id, "PREPARING"))}
                  >
                    Start all
                  </Button>
                ) : null}
                {canWork && !isVoid && left > 1 ? (
                  <Button
                    className="h-12 text-base"
                    disabled={isBusy(ticket.id)}
                    onClick={() => void act(ticket.id, () => setKitchenTicketStage(ticket.id, "READY"))}
                  >
                    All ready
                  </Button>
                ) : null}
              </li>
            );
  };

  /*
   * The board in lanes, left to right in the order a cook should look: what must stop, what has
   * not been touched, what is part-way out. Within a lane the oldest ticket is on top.
   */
  const all = (tickets ?? []).filter((t) =>
    station === ALL ? true : station === NONE ? !t.stationId : t.stationId === station,
  );
  // How much work each station still has. A screen pinned to Grill must be able to see the bar piling
  // up without switching tabs, so the count comes from every station's tickets, not the filtered list.
  const workLeft = (t: KitchenTicketRecord) => t.lines.some((l) => l.stage === "NEW" || l.stage === "PREPARING");
  const openCounts = new Map<string, number>();
  for (const t of tickets ?? []) {
    if (t.ticketType === "VOID" || !workLeft(t)) continue;
    const key = t.stationId ?? NONE;
    openCounts.set(key, (openCounts.get(key) ?? 0) + 1);
  }
  const totalOpen = (tickets ?? []).filter((t) => t.ticketType !== "VOID" && workLeft(t)).length;
  const stop = all.filter((t) => t.ticketType === "VOID");
  const live = all.filter((t) => t.ticketType !== "VOID");
  const started = live.filter((t) => t.lines.some((l) => l.stage === "READY" || l.stage === "SERVED"));
  const fresh = live.filter((t) => !started.includes(t));
  const lanes = [
    ...(stop.length > 0
      ? [{ key: "stop", title: "Stop making", hint: "Cancelled after it reached you. Tap Seen once you have stopped.", empty: "", tickets: stop }]
      : []),
    { key: "fresh", title: "To make", hint: "Nothing on these is ready yet. Oldest on top.", empty: "Nothing new to make.", tickets: fresh },
    { key: "started", title: "Part ready", hint: "Some plates are out; finish the rest.", empty: "Nothing is part-way.", tickets: started },
  ];

  // "All day": how many of each dish the station still has to make across every open ticket. It is
  // the pass's running total, read off the tickets already on the board — no extra request.
  const allDay = allDayCounts(all);

  return (
    <div ref={boardRef} className={cn(DASHBOARD_MAX_WIDE, "bg-[var(--op-ground,#F6F1E7)]")}>
      <DashboardPageHero icon={ChefHat} title="Kitchen" description="Oldest first. Tap a plate when it is ready.">
        {canWork ? (
          <Button variant="outline" size="sm" onClick={() => setRunOutOpen(true)}>
            Something ran out
          </Button>
        ) : null}
        {canWork ? (
          <Button variant="outline" size="sm" onClick={() => setStoreOpen(true)}>
            Ask the store
          </Button>
        ) : null}
        <Button variant="outline" size="sm" aria-pressed={autoPrint} onClick={toggleAutoPrint}>
          {autoPrint ? "Printing new tickets" : "Print new tickets"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={sound}
          onClick={() => {
            const next = !sound;
            setSound(next);
            try {
              window.localStorage.setItem(CHIME_KEY, next ? "1" : "0");
            } catch {
              // private mode: the choice lasts for this visit
            }
            if (next) chime();
          }}
        >
          {sound ? "Chime on" : "Chime off"}
        </Button>
        <Button variant="outline" size="sm" onClick={fullScreen}>
          Full screen
        </Button>
      </DashboardPageHero>
      {printProblem ? (
        <p role="alert" className={cn(DASHBOARD_SECTION_SURFACE, "mb-2 text-sm font-semibold text-red-700")}>
          {printProblem}
        </p>
      ) : null}

      {stations.length > 0 ? (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Kitchen station">
          {[{ id: ALL, name: "Every station" }, ...stations, { id: NONE, name: "No station" }].map((s) => {
            const count = s.id === ALL ? totalOpen : (openCounts.get(s.id) ?? 0);
            return (
              <button
                key={s.id || "all"}
                type="button"
                role="tab"
                aria-selected={station === s.id}
                className={cn(CHIP, station === s.id && CHIP_ON)}
                onClick={() => chooseStation(s.id)}
              >
                {s.name}
                {count > 0 ? (
                  <span className="ml-1.5 font-mono tabular-nums opacity-80" aria-label={`${count} to make`}>
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {allDay.length > 0 ? (
        <div
          aria-label="All day"
          className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[2px] border bg-[#FFFEFA] px-3 py-2"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--order-ink,#121A16)_55%,transparent)]">
            All day
          </span>
          {allDay.map(([name, quantity]) => (
            <span key={name} className="whitespace-nowrap text-sm text-[var(--op-ink,#121A16)]">
              <span className="font-mono font-semibold tabular-nums">{quantity}</span> {name}
            </span>
          ))}
        </div>
      ) : null}

      {disconnected ? (
        <p role="alert" className={cn(DASHBOARD_SECTION_SURFACE, "mb-2 text-base font-semibold text-red-700")}>
          Not connected{lastUpdated ? ` — last updated ${timeOfDay(lastUpdated)}` : ""}. New orders will not show
          here until the connection is back; ask the counter.
        </p>
      ) : null}
      {problem ? (
        <p role="alert" className="mb-2 text-sm text-red-700">
          {problem}
        </p>
      ) : null}

      {tickets == null ? (
        <DashboardLoading label="Loading tickets…" />
      ) : all.length === 0 ? (
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-base font-semibold">Nothing to make here</p>
          <p className={dashboardHintClass()}>
            {totalOpen > 0
              ? `${totalOpen} ${totalOpen === 1 ? "ticket is" : "tickets are"} waiting at another station.`
              : "New orders appear here as soon as they are sent to the kitchen" +
                (lastUpdated && !disconnected ? `. Checked at ${timeOfDay(lastUpdated)}.` : ".")}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            DASHBOARD_TABLE_SURFACE,
            "grid",
            lanes.length === 3 ? "md:grid-cols-2 xl:grid-cols-3" : lanes.length === 2 ? "md:grid-cols-2" : "",
          )}
        >
          {lanes.map((lane, index) => (
            <section
              key={lane.key}
              aria-label={lane.title}
              className={cn(
                "p-3 sm:p-4",
                index > 0 && "border-t md:border-l md:border-t-0",
                // Three lanes on a two-column screen: the third wraps under the first.
                lanes.length === 3 && index === 2 && "md:col-span-2 md:border-l-0 md:border-t xl:col-span-1 xl:border-l xl:border-t-0",
                LANE_RULE,
                lane.key === "stop" && "bg-[color-mix(in_srgb,#b91c1c_5%,transparent)]",
              )}
            >
              <header className="flex items-baseline justify-between gap-3">
                <h2 className={cn(LANE_TITLE, lane.key === "stop" && "text-red-700")}>{lane.title}</h2>
                <span className="font-mono text-sm tabular-nums text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">
                  {lane.tickets.length}
                </span>
              </header>
              <span aria-hidden className={cn("mt-2.5 block h-px w-7", lane.key === "stop" ? "bg-red-700" : "bg-[#1D4B3B]")} />
              <p className={cn("mt-2", dashboardHintClass())}>{lane.hint}</p>
              {lane.tickets.length === 0 ? (
                <p className="mt-4 text-sm text-[color-mix(in_srgb,var(--op-ink,#121A16)_60%,transparent)]">{lane.empty}</p>
              ) : (
                <ul
                  className={cn(
                    "mt-3 grid gap-3",
                    // With two lanes there is room for tickets side by side on a wide screen.
                    lanes.length < 3 && "2xl:grid-cols-2",
                    lanes.length === 1 && "sm:grid-cols-2 xl:grid-cols-3",
                  )}
                >
                  {lane.tickets.map(renderTicket)}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {runOutOpen ? <RunOutDialog onClose={() => setRunOutOpen(false)} /> : null}
      {storeOpen ? (
        <Dialog open onOpenChange={(o) => (o ? undefined : setStoreOpen(false))}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Ask the store</DialogTitle>
              <DialogDescription>What the kitchen needs from the store, and what it has been given.</DialogDescription>
            </DialogHeader>
            <KitchenRequests embedded />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function TicketLine({
  line,
  isVoid,
  canWork,
  busy,
  onStart,
  onReady,
  onUndo,
}: {
  line: KitchenLineRecord;
  isVoid: boolean;
  canWork: boolean;
  busy: boolean;
  onStart: () => void;
  onReady: () => void;
  onUndo: () => void;
}) {
  const made = line.stage === "READY" || line.stage === "SERVED";
  const cancelled = line.stage === "VOIDED";
  const making = line.stage === "PREPARING";
  return (
    <li className="flex items-start gap-3 py-2">
      <div className={cn("min-w-0 flex-1", (made || cancelled) && "opacity-60")}>
        <div className={cn("text-lg font-semibold leading-tight", cancelled && "line-through")}>
          {line.seatNo ? <span className="mr-1 font-mono text-sm tabular-nums">S{line.seatNo}</span> : null}
          <span className="font-mono tabular-nums">{line.quantity} ×</span> {line.name}
        </div>
        {line.modifiers.length > 0 ? (
          <div className="text-base">{line.modifiers.map((m) => m.option).join(", ")}</div>
        ) : null}
        {line.note ? <div className="text-base font-semibold italic">“{line.note}”</div> : null}
        {cancelled && !isVoid ? <div className="text-sm font-semibold text-red-700">Cancelled</div> : null}
      </div>
      {canWork && !isVoid && !cancelled ? (
        made ? (
          line.stage === "READY" ? (
            <button type="button" className="px-2 py-3 text-sm underline" disabled={busy} onClick={onUndo}>
              Not ready
            </button>
          ) : null
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            {making ? (
              <span className="py-3 text-sm font-semibold text-[var(--op-muted,#556159)]">Making</span>
            ) : (
              <Button variant="outline" className="h-12" disabled={busy} onClick={onStart}>
                Start
              </Button>
            )}
            <Button className="h-12 min-w-[5.5rem] text-base" disabled={busy} onClick={onReady}>
              Ready
            </Button>
          </div>
        )
      ) : made ? (
        <span className="py-3 text-sm font-semibold">Ready</span>
      ) : null}
    </li>
  );
}

/** Mark a dish as run out, or back on, from the kitchen. Every order screen stops offering it. */
function RunOutDialog({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<MenuItemRecord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void fetchMenu()
      .then((menu) => setItems(menu.items.filter((i) => i.active && i.kind === "DISH")))
      .catch(() => setFailed(true));
  }, []);

  async function toggle(item: MenuItemRecord) {
    setBusyId(item.id);
    try {
      const updated = await setMenuItemAvailable(item.id, !item.available);
      setItems((prev) => (prev ?? []).map((i) => (i.id === item.id ? { ...i, available: updated.available } : i)));
    } catch {
      setFailed(true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Something ran out</DialogTitle>
          <DialogDescription>A dish marked as run out cannot be ordered until it is switched back on.</DialogDescription>
        </DialogHeader>
        {failed ? (
          <p role="alert" className="text-sm text-red-700">
            That did not go through. Check the connection and try again.
          </p>
        ) : null}
        {items == null && !failed ? (
          <DashboardLoading label="Loading dishes…" />
        ) : (items ?? []).length === 0 ? (
          <p className={dashboardHintClass()}>There are no dishes on the menu yet.</p>
        ) : (
          <ul className="divide-y">
            {(items ?? []).map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2">
                <span className={cn("min-w-0 flex-1 text-base", !item.available && "line-through opacity-60")}>
                  {item.name}
                </span>
                <Button
                  variant={item.available ? "outline" : "default"}
                  className="h-11"
                  disabled={busyId === item.id}
                  onClick={() => void toggle(item)}
                >
                  {item.available ? "Run out" : "Back on"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
