"use client";

import { useEffect, useState } from "react";

import { dashboardHintClass } from "@/components/dashboard-page-ui";
import { formatMoney } from "@/lib/money";
import { ApiRequestError } from "@/lib/api";
import {
  fetchStaffLedgerEntries,
  moveServicePerformer,
  type StaffLedgerEntryRecord,
} from "@/lib/service-business-api";
import { cn } from "@/lib/utils";

import { canMoveEntry, describeLedgerEntry, newestFirst } from "./commission-history";

const kes = (n: number) => formatMoney(n, "KES");

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));

/**
 * Everything that changed what one person is owed in the period, newest first: each commission
 * and how it was worked out, each tip, each payout, each adjustment and anything taken back.
 */
export function StaffHistory({
  staffProfileId,
  name,
  from,
  to,
  people = [],
  onMoved,
}: {
  staffProfileId: string;
  name: string;
  from: string;
  to: string;
  /** The rest of the team, when the viewer may move a service to whoever really did it. */
  people?: readonly { staffProfileId: string; displayName: string }[];
  onMoved?: () => void | Promise<void>;
}) {
  const [entries, setEntries] = useState<StaffLedgerEntryRecord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const others = people.filter((p) => p.staffProfileId !== staffProfileId);

  useEffect(() => {
    let live = true;
    setEntries(null);
    setFailed(false);
    fetchStaffLedgerEntries(staffProfileId, from, to)
      .then((found) => {
        if (live) setEntries(newestFirst(found));
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [staffProfileId, from, to, version]);

  if (failed) {
    return <p className={cn("px-2.5 py-2", dashboardHintClass())}>Could not load {name}&apos;s history. Close it and open it again.</p>;
  }
  if (entries == null) {
    return <p className={cn("px-2.5 py-2", dashboardHintClass())} aria-busy="true">Loading {name}&apos;s history…</p>;
  }
  if (entries.length === 0) {
    return (
      <p className={cn("px-2.5 py-2", dashboardHintClass())}>
        Nothing for {name} in this period. Choose an earlier From date to look further back.
      </p>
    );
  }

  return (
    <ol aria-label={`${name}'s history`} className="max-h-[22rem] overflow-y-auto">
      {entries.map((entry) => {
        const { what, detail } = describeLedgerEntry(entry);
        return (
          <li
            key={entry.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-t border-[var(--op-rule)] px-2.5 py-1.5 first:border-t-0 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto]"
          >
            <span className="col-span-2 font-mono text-[11.5px] tabular-nums text-[var(--op-muted)] sm:col-span-1 sm:pt-px">
              {when(entry.occurredAt)}
            </span>
            <span className="min-w-0 text-[13px]">
              <span className="font-medium text-[var(--op-ink)]">{what}</span>
              {detail ? <span className="text-[var(--op-muted)]"> · {detail}</span> : null}
              {onMoved && others.length > 0 && canMoveEntry(entry, entries) && movingId !== entry.id ? (
                <button
                  type="button"
                  onClick={() => setMovingId(entry.id)}
                  className="ml-2 rounded-[2px] text-[12px] font-medium text-[var(--op-muted)] underline decoration-[var(--op-rule)] underline-offset-2 hover:text-[var(--op-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)]"
                >
                  Wrong person?
                </button>
              ) : null}
              {movingId === entry.id && entry.saleId && entry.saleItemId ? (
                <MoveService
                  from={name}
                  saleId={entry.saleId}
                  saleItemId={entry.saleItemId}
                  people={others}
                  onCancel={() => setMovingId(null)}
                  onDone={async () => {
                    setMovingId(null);
                    setVersion((v) => v + 1);
                    await onMoved?.();
                  }}
                />
              ) : null}
            </span>
            <span
              className={cn(
                "whitespace-nowrap text-right font-mono text-[12.5px] tabular-nums tracking-[-0.02em]",
                entry.amount < 0 ? "text-[var(--op-highlight)]" : "text-[var(--op-ink)]",
              )}
            >
              {entry.amount > 0 ? "+" : ""}
              {kes(entry.amount)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Names who really did a paid service. Their earnings follow; the customer's receipt total does not change. */
function MoveService({
  from,
  saleId,
  saleItemId,
  people,
  onCancel,
  onDone,
}: {
  from: string;
  saleId: string;
  saleItemId: string;
  people: readonly { staffProfileId: string; displayName: string }[];
  onCancel: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const move = async () => {
    if (!to || busy) return;
    setBusy(true);
    setError(null);
    try {
      await moveServicePerformer(saleId, saleItemId, to, `Moved from ${from}`);
      await onDone();
    } catch (e) {
      const detail = e instanceof ApiRequestError ? (e.payload as { detail?: unknown } | null)?.detail : null;
      setError(
        typeof detail === "string" && detail.trim() ? detail : "Could not move it. Check your connection and try again.",
      );
      setBusy(false);
    }
  };

  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <label className="sr-only" htmlFor={`move-${saleItemId}`}>
        Who did this service
      </label>
      <select
        id={`move-${saleItemId}`}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        disabled={busy}
        className="h-11 min-w-[9rem] rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] px-2 text-[13px] text-[var(--op-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)] sm:h-7"
      >
        <option value="">Who did it?</option>
        {people.map((p) => (
          <option key={p.staffProfileId} value={p.staffProfileId}>
            {p.displayName}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => void move()}
        disabled={!to || busy}
        className="h-11 rounded-[2px] bg-[var(--op-ink)] px-2.5 text-[12px] font-medium text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)] sm:h-7"
      >
        {busy ? "Moving…" : "Move it to them"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="h-11 rounded-[2px] px-2 text-[12px] text-[var(--op-muted)] hover:text-[var(--op-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)] sm:h-7"
      >
        Cancel
      </button>
      <span className="basis-full text-[12px] text-[var(--op-muted)]" role={error ? "alert" : undefined}>
        {error ?? `${from} gives back what they earned on it and the other person earns by their own rate. Tips stay where they are.`}
      </span>
    </span>
  );
}
