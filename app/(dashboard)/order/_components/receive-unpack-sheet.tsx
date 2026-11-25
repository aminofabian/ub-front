"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ARRIVAL_AS_ORDERED,
  ARRIVAL_DAMAGED,
  ARRIVAL_MISSING,
  ARRIVAL_SHORT,
  PUT_AWAY_STOCK,
  PUT_AWAY_STORE,
  arrivalStatusLabel,
  type ArrivalDecision,
  type PutAwayDestination,
} from "@/app/(dashboard)/order/_lib/receive-arrival";

const MOVES: readonly ArrivalDecision[] = [ARRIVAL_AS_ORDERED, ARRIVAL_SHORT];
const HELD: readonly ArrivalDecision[] = [ARRIVAL_MISSING, ARRIVAL_DAMAGED];

export type UnpackSheetLine = {
  id: string;
  name: string;
  decision: ArrivalDecision;
  qty: number;
  ordered: number;
  packLabel: string | null;
};

type ReceiveUnpackSheetProps = {
  open: boolean;
  busy: boolean;
  lines: UnpackSheetLine[];
  onClose: () => void;
  onPutAway: (destByLine: Record<string, PutAwayDestination>) => void;
};

const DESTINATIONS: { id: PutAwayDestination; title: string; detail: string }[] = [
  { id: PUT_AWAY_STOCK, title: "Sellable stock", detail: "Ready to sell. The till rises." },
  { id: PUT_AWAY_STORE, title: "Store room", detail: "Back room. The till does not rise." },
];

function destLabel(dest: PutAwayDestination): string {
  return dest === PUT_AWAY_STORE ? "Store room" : "Sellable stock";
}

export function ReceiveUnpackSheet({
  open,
  busy,
  lines,
  onClose,
  onPutAway,
}: ReceiveUnpackSheetProps) {
  const titleId = useId();
  const putAwayRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [fallback, setFallback] = useState<PutAwayDestination>(PUT_AWAY_STOCK);
  const [override, setOverride] = useState<Record<string, PutAwayDestination>>({});

  useEffect(() => {
    if (!open) return;
    setFallback(PUT_AWAY_STOCK);
    setOverride({});
    putAwayRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const moving = lines.filter((line) => MOVES.includes(line.decision) && line.qty > 0);
  const held = lines.filter((line) => HELD.includes(line.decision) || line.qty <= 0);
  const destFor = (id: string) => override[id] ?? fallback;

  const flipLine = (id: string) => {
    setOverride((prev) => {
      const current = prev[id] ?? fallback;
      const flipped = current === PUT_AWAY_STOCK ? PUT_AWAY_STORE : PUT_AWAY_STOCK;
      if (flipped === fallback) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: flipped };
    });
  };

  const submit = () => {
    const destByLine: Record<string, PutAwayDestination> = {};
    for (const line of moving) destByLine[line.id] = destFor(line.id);
    onPutAway(destByLine);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)] p-2 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close put away" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col rounded-2xl bg-white shadow-[0_16px_40px_-20px_rgba(21,35,31,0.5)]"
      >
        <div className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-4 py-3">
          <h2 id={titleId} className="font-heading text-[18px] font-semibold tracking-[-0.03em]">
            Where does this delivery go?
          </h2>
          <p className="mt-1 text-[13px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
            {moving.length} to put away
            {held.length > 0 ? ` · ${held.length} staying off the shelf` : ""}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {DESTINATIONS.map((dest) => {
              const selected = fallback === dest.id;
              return (
                <button
                  key={dest.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={busy}
                  onClick={() => setFallback(dest.id)}
                  className={cn(
                    "flex min-h-11 flex-col items-start rounded-xl border px-3 py-2 text-left",
                    selected
                      ? "border-[#0f766e] bg-[#f0f9f7]"
                      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white",
                  )}
                >
                  <span className="text-[14px] font-semibold">{dest.title}</span>
                  <span className="mt-0.5 text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
                    {dest.detail}
                  </span>
                </button>
              );
            })}
          </div>

          <ul className="mt-3 divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
            {moving.map((line) => (
              <li key={line.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{line.name}</p>
                  <p className="text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
                    {arrivalStatusLabel(line.decision, line.qty, line.ordered)}
                    {line.packLabel ? ` · ${line.packLabel}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => flipLine(line.id)}
                  className="inline-flex h-11 shrink-0 items-center rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 text-[12px] font-semibold"
                >
                  {destLabel(destFor(line.id))}
                </button>
              </li>
            ))}
          </ul>

          {held.length > 0 ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                Staying off the shelf
              </p>
              <ul className="mt-1">
                {held.map((line) => (
                  <li key={line.id} className="py-1 text-[13px]">
                    <span className="font-medium">{line.name}</span>
                    <span className="text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
                      {" "}
                      · {arrivalStatusLabel(line.decision, line.qty, line.ordered)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-4 py-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[14px] font-semibold"
          >
            Back
          </button>
          <button
            ref={putAwayRef}
            type="button"
            disabled={busy || moving.length === 0}
            onClick={submit}
            className="inline-flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-xl bg-[#0f766e] text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Put away
          </button>
        </div>
      </div>
    </div>
  );
}
