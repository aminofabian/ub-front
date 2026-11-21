"use client";

import { useEffect, useState } from "react";

import { RX_INK, RX_INPUT, RX_MUTED, RX_RULE } from "@/components/pharmacy/pharmacy-ui";
import { fetchItems, type ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Finds one of the shop's products by name. Used for the prescription, a medicine given here and the bill. */
export function ClinicItemSearch({
  label,
  placeholder,
  onPick,
  allowFreeText,
}: {
  label: string;
  placeholder?: string;
  onPick: (item: { id: string | null; name: string }) => void;
  /** Offer "not one of our products": the typed name is used as written (a prescription line only). */
  allowFreeText?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ItemSummaryRecord[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setResults(null);
      setFailed(false);
      return;
    }
    let alive = true;
    const timer = setTimeout(() => {
      fetchItems(text, { size: 12 })
        .then((list) => {
          if (alive) {
            setResults(list);
            setFailed(false);
          }
        })
        .catch(() => {
          if (alive) {
            setResults(null);
            setFailed(true);
          }
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);

  const pick = (item: { id: string | null; name: string }) => {
    onPick(item);
    setQ("");
    setResults(null);
  };

  return (
    <div className="space-y-1.5">
      <label className="block space-y-1.5 text-sm">
        <span className={cn("font-medium", RX_INK)}>{label}</span>
        <input
          className={RX_INPUT}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder ?? "Type a name"}
          autoComplete="off"
        />
      </label>
      {failed ? (
        <p role="alert" className="text-[13px] text-destructive">
          Could not search just now. Check the connection.
        </p>
      ) : null}
      {results ? (
        <ul className={cn("max-h-56 overflow-y-auto rounded-[2px] border", RX_RULE)}>
          {results.map((item) => (
            <li key={item.id} className={cn("border-b last:border-0", RX_RULE)}>
              <button
                type="button"
                onClick={() => pick({ id: item.id, name: item.variantName ? `${item.name} ${item.variantName}` : item.name })}
                className="flex min-h-11 w-full items-center px-3 py-2 text-left text-sm hover:bg-[var(--op-hover,rgba(18,26,22,0.04))] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]"
              >
                <span className={RX_INK}>
                  {item.name}
                  {item.variantName ? <span className={RX_MUTED}> {item.variantName}</span> : null}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && !allowFreeText ? (
            <li className={cn("px-3 py-2 text-[13px]", RX_MUTED)}>No product by that name.</li>
          ) : null}
          {allowFreeText ? (
            <li>
              <button
                type="button"
                onClick={() => pick({ id: null, name: q.trim() })}
                className="flex min-h-11 w-full items-center px-3 py-2 text-left text-sm hover:bg-[var(--op-hover,rgba(18,26,22,0.04))] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]"
              >
                <span className={RX_MUTED}>
                  Not one of our products: write <span className={cn("font-medium", RX_INK)}>{q.trim()}</span> on the
                  prescription only
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
