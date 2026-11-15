"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "@/lib/api";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  askRequisition,
  cancelRequisition,
  fetchRequisitions,
  issueRequisition,
  refuseRequisition,
  searchRequisitionProducts,
  type RequisitionListRecord,
  type RequisitionProductRecord,
  type RequisitionRecord,
} from "@/lib/restaurant-api";
import { useRestaurantLive } from "@/lib/use-restaurant-live";

import { ReasonDialog, type ReasonRequest } from "./reason-dialog";

type AskRow = { itemId: string; name: string; quantity: string };

function amount(raw: string): string {
  const digits = raw.replace(/[^0-9.]/g, "");
  const dot = digits.indexOf(".");
  return dot === -1 ? digits.slice(0, 6) : `${digits.slice(0, dot).slice(0, 6)}.${digits.slice(dot + 1).replace(/\./g, "").slice(0, 3)}`;
}

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-KE", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
}

function message(e: unknown, fallback: string): string {
  return e instanceof ApiRequestError && e.message ? e.message : fallback;
}

const STATUS_WORDS: Record<RequisitionRecord["status"], string> = {
  REQUESTED: "Waiting",
  ISSUED: "Given out",
  REFUSED: "Refused",
  CANCELLED: "Withdrawn",
};

/**
 * The kitchen asks the store for ingredients; whoever keeps the store gives them out or refuses.
 *
 * It is a record of who asked for what and what they were given. It does not change the stock
 * count: a branch has one count, and an ingredient leaves it when the dish is sold. Someone who
 * works the kitchen can ask and withdraw; someone who may change stock or runs the menu decides.
 */
export function KitchenRequests({ embedded = false }: { embedded?: boolean }) {
  const { branchId, me } = useDashboard();
  const canDecide =
    hasPermission(me?.permissions, Permission.InventoryWrite) ||
    hasPermission(me?.permissions, Permission.RestaurantMenuManage);
  const canAsk = canDecide || hasPermission(me?.permissions, Permission.RestaurantKitchenUpdate);

  const [list, setList] = useState<RequisitionListRecord | null>(null);
  const [failed, setFailed] = useState(false);
  const [rows, setRows] = useState<AskRow[]>([]);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<RequisitionProductRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The request being given out, with the quantities typed for each of its lines.
  const [giving, setGiving] = useState<{ id: string; quantities: Record<string, string> } | null>(null);
  const [asking, setAsking] = useState<ReasonRequest | null>(null);
  // One key per request typed: sending it again after a dropped connection asks once.
  const askKey = useRef(nextIdempotencyKey());
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setList(await fetchRequisitions(branchId));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);
  useRestaurantLive(() => void load(), 15000, Boolean(branchId) && canAsk);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const mine = ++seq.current;
    const timer = window.setTimeout(() => {
      void searchRequisitionProducts(term)
        .then((found) => {
          if (mine === seq.current) setResults(found);
        })
        .catch(() => {
          if (mine === seq.current) setResults([]);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  async function run(action: () => Promise<unknown>, fallback: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      return true;
    } catch (e) {
      setError(message(e, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function ask() {
    if (!branchId) return;
    const lines: { itemId: string; quantity: number }[] = [];
    for (const row of rows) {
      const quantity = Number(row.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return setError(`Type how much ${row.name} you need`);
      lines.push({ itemId: row.itemId, quantity });
    }
    if (lines.length === 0) return setError("Add what you need first");
    const sent = await run(
      () => askRequisition({ branchId, clientKey: askKey.current, lines, ...(note.trim() ? { note: note.trim() } : {}) }),
      "The request was not sent. Try again.",
    );
    if (sent) {
      askKey.current = nextIdempotencyKey();
      setRows([]);
      setNote("");
      toast.success("Sent to the store");
    }
  }

  async function giveOut(request: RequisitionRecord) {
    if (!giving) return;
    const lines: { lineId: string; quantity: number }[] = [];
    for (const line of request.lines) {
      const raw = giving.quantities[line.id] ?? "";
      const quantity = raw.trim() === "" ? 0 : Number(raw);
      if (!Number.isFinite(quantity) || quantity < 0) return setError(`Type how much ${line.name} is being given`);
      lines.push({ lineId: line.id, quantity });
    }
    if (lines.every((l) => l.quantity === 0)) return setError("Nothing is being given. Refuse the request instead.");
    if (await run(() => issueRequisition(request.id, { lines }), "It was not recorded. Try again.")) setGiving(null);
  }

  if (!canAsk) return null;
  if (!branchId) return null;

  return (
    <section className={embedded ? "grid gap-3" : DASHBOARD_SECTION_SURFACE} aria-label="Requests to the store">
      {asking ? <ReasonDialog request={asking} onClose={() => setAsking(null)} /> : null}
      {embedded ? null : (
        <h2 className="font-serif text-[1.25rem] leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]">
          Requests to the store
        </h2>
      )}
      <p className={dashboardHintClass()}>
        The kitchen asks for what it needs; whoever keeps the store gives it out. This is a record of who took
        what. It does not change your stock count, which goes down when the dish is sold.
      </p>
      {failed ? (
        <p role="alert" className="text-sm text-red-700">
          Could not load the requests. They will be tried again shortly.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-2 grid gap-2">
        <label className="grid gap-1">
          <span className={dashboardLabelClass()}>Ask for</span>
          <input
            className={dashboardInputClass(false)}
            placeholder="Search the products you stock"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {search.trim().length >= 2 ? (
          results.filter((r) => !rows.some((row) => row.itemId === r.id)).length === 0 ? (
            <span className={dashboardHintClass()}>No product found. Add it under Products first, as stocked.</span>
          ) : (
            <ul className="divide-y rounded-[2px] border">
              {results
                .filter((r) => !rows.some((row) => row.itemId === r.id))
                .map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="min-h-11 w-full px-3 py-2 text-left text-sm hover:underline"
                      onClick={() => {
                        setRows((prev) => [
                          ...prev,
                          { itemId: r.id, name: r.name, quantity: "" },
                        ]);
                        setSearch("");
                        setError(null);
                      }}
                    >
                      {r.name}
                    </button>
                  </li>
                ))}
            </ul>
          )
        ) : null}
        {rows.length > 0 ? (
          <>
            <ul className="grid gap-2">
              {rows.map((row) => (
                <li key={row.itemId} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
                  <input
                    className={dashboardInputClass(false, "w-24 text-right font-mono")}
                    inputMode="decimal"
                    placeholder="How much"
                    aria-label={`How much ${row.name}`}
                    value={row.quantity}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) => (r.itemId === row.itemId ? { ...r, quantity: amount(e.target.value) } : r)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="text-sm underline"
                    onClick={() => setRows((prev) => prev.filter((r) => r.itemId !== row.itemId))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Note for the store (optional)</span>
              <input className={dashboardInputClass(false)} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
            </label>
            <Button className="h-11 justify-self-start" disabled={busy} onClick={() => void ask()}>
              {busy ? "Sending…" : "Ask the store"}
            </Button>
          </>
        ) : null}
      </div>

      <div className="mt-3">
        <h3 className={dashboardLabelClass()}>Waiting</h3>
        {list == null ? (
          <p className={dashboardHintClass()}>Loading…</p>
        ) : list.waiting.length === 0 ? (
          <p className={dashboardHintClass()}>Nothing is waiting on the store.</p>
        ) : (
          <ul className="mt-1 divide-y">
            {list.waiting.map((request) => {
              const open = giving?.id === request.id;
              return (
                <li key={request.id} className="py-2">
                  <div className="text-sm font-medium">
                    Request <span className="font-mono tabular-nums">{request.number}</span>
                    {request.stationName ? ` · ${request.stationName}` : ""}
                    <span className={`ml-2 font-normal ${dashboardHintClass()}`}>
                      {request.requestedByName ?? "Someone"} · {when(request.requestedAt)}
                    </span>
                  </div>
                  {request.note ? <div className="text-xs italic">{request.note}</div> : null}
                  <ul className="mt-1 grid gap-1">
                    {request.lines.map((line) => (
                      <li key={line.id} className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="font-mono tabular-nums">{line.quantityRequested}</span>
                          {line.unit ? ` ${line.unit}` : " ×"} {line.name}
                          {canDecide && line.onHand != null ? (
                            <span className={`ml-2 ${dashboardHintClass()}`}>{line.onHand} in stock</span>
                          ) : null}
                        </span>
                        {open ? (
                          <input
                            className={dashboardInputClass(false, "w-24 text-right font-mono")}
                            inputMode="decimal"
                            aria-label={`How much ${line.name} is given`}
                            value={giving.quantities[line.id] ?? ""}
                            onChange={(e) =>
                              setGiving((prev) =>
                                prev ? { ...prev, quantities: { ...prev.quantities, [line.id]: amount(e.target.value) } } : prev,
                              )
                            }
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {canDecide && open ? (
                      <>
                        <Button size="sm" disabled={busy} onClick={() => void giveOut(request)}>
                          Record what was given
                        </Button>
                        <Button variant="outline" size="sm" disabled={busy} onClick={() => setGiving(null)}>
                          Go back
                        </Button>
                      </>
                    ) : canDecide ? (
                      <>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            setError(null);
                            setGiving({
                              id: request.id,
                              quantities: Object.fromEntries(request.lines.map((l) => [l.id, String(l.quantityRequested)])),
                            });
                          }}
                        >
                          Give out
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            setAsking({
                              title: `Refuse request ${request.number}?`,
                              hint: "Nothing is given. The kitchen sees the reason.",
                              confirm: "Refuse it",
                              required: true,
                              run: (reason) => void run(() => refuseRequisition(request.id, reason), "It was not refused. Try again."),
                            })
                          }
                        >
                          Refuse
                        </Button>
                      </>
                    ) : null}
                    {!open ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => void run(() => cancelRequisition(request.id), "It was not withdrawn. Try again.")}
                      >
                        Withdraw
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {list != null && list.recent.length > 0 ? (
        <div className="mt-3">
          <h3 className={dashboardLabelClass()}>Last seven days</h3>
          <ul className="mt-1 divide-y">
            {list.recent.slice(0, 10).map((request) => (
              <li key={request.id} className="py-2 text-sm">
                <div>
                  Request <span className="font-mono tabular-nums">{request.number}</span> ·{" "}
                  <span className="font-medium">{STATUS_WORDS[request.status]}</span>
                  <span className={`ml-2 ${dashboardHintClass()}`}>
                    asked by {request.requestedByName ?? "someone"}
                    {request.decidedByName && request.status !== "CANCELLED"
                      ? ` · ${request.status === "ISSUED" ? "given out" : "refused"} by ${request.decidedByName}`
                      : ""}
                    {request.decidedAt ? ` · ${when(request.decidedAt)}` : ""}
                  </span>
                </div>
                <div className={dashboardHintClass()}>
                  {request.lines
                    .map((l) =>
                      request.status === "ISSUED"
                        ? `${l.name}: ${l.quantityIssued ?? 0} of ${l.quantityRequested}${l.unit ? ` ${l.unit}` : ""}`
                        : `${l.name}: ${l.quantityRequested}${l.unit ? ` ${l.unit}` : ""}`,
                    )
                    .join(" · ")}
                </div>
                {request.decisionNote ? <div className="text-xs italic">{request.decisionNote}</div> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
