"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { dashboardHintClass, dashboardInputClass, dashboardLabelClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiRequestError, fetchItems, type ItemSummaryRecord } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { generateMeasures, type MeasurePourPayload } from "@/lib/restaurant-api";

const kes = (n: number) => formatMoney(n, "KES");

function clean(raw: string, maxDecimals = 2): string {
  const digits = raw.replace(/[^0-9.]/g, "");
  const dot = digits.indexOf(".");
  return dot === -1 ? digits : `${digits.slice(0, dot)}.${digits.slice(dot + 1).replace(/\./g, "").slice(0, maxDecimals)}`;
}

type PourRow = { label: string; pourMl: string; price: string };

/** Pours a bar reaches for first, with a typical measure. */
const COMMON_POURS: { label: string; ml: number }[] = [
  { label: "Single", ml: 25 },
  { label: "Double", ml: 50 },
  { label: "Glass", ml: 125 },
];

/**
 * Sets up a bottle's pour measures. Pick the bottle, say how big it is, and list the pours (a single,
 * a double, a glass) with the price a customer pays for each. Selling a pour takes its share of the
 * bottle off the stock count — the owner never works out 30/750, and never sees a surcharge: each
 * pour's price is the whole price.
 */
export function MeasuresDialog({
  dishId,
  dishName,
  onClose,
  onSaved,
}: {
  dishId: string;
  dishName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bottle, setBottle] = useState<{ id: string; name: string } | null>(null);
  const [bottleMl, setBottleMl] = useState("750");
  const [pours, setPours] = useState<PourRow[]>([{ label: "Single", pourMl: "25", price: "" }]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ItemSummaryRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchSeq = useRef(0);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const seq = ++searchSeq.current;
    const timer = window.setTimeout(() => {
      void fetchItems(term, { size: 8 })
        .then((found) => {
          if (seq === searchSeq.current) setResults(found);
        })
        .catch(() => {
          if (seq === searchSeq.current) setResults([]);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  function setPour(i: number, change: Partial<PourRow>) {
    setPours((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...change } : p)));
  }

  function addPour(label: string, ml: number | null) {
    if (label && pours.some((p) => p.label.trim().toLowerCase() === label.toLowerCase())) return;
    setPours((prev) => [...prev, { label, pourMl: ml == null ? "" : String(ml), price: "" }]);
  }

  async function submit() {
    setError(null);
    if (!bottle) return setError("Choose the bottle these pours come out of.");
    const sizeMl = Number(bottleMl);
    if (!Number.isFinite(sizeMl) || sizeMl <= 0) return setError("Type how big the bottle is.");
    const payloadPours: MeasurePourPayload[] = [];
    const seen = new Set<string>();
    for (const p of pours) {
      const label = p.label.trim();
      if (!label) return setError("Give every pour a name — Single, Double, Glass.");
      if (seen.has(label.toLowerCase())) return setError(`You have two pours called “${label}”. Give each a different name.`);
      seen.add(label.toLowerCase());
      const ml = Number(p.pourMl);
      if (!Number.isFinite(ml) || ml <= 0) return setError(`How many ml is a ${label}?`);
      if (ml > sizeMl) return setError(`A ${label} (${ml} ml) is bigger than the whole bottle (${sizeMl} ml).`);
      const price = Number(p.price);
      if (!Number.isFinite(price) || price <= 0) return setError(`What does a ${label} cost the customer?`);
      payloadPours.push({ label, pourMl: ml, price });
    }
    setSaving(true);
    try {
      await generateMeasures({ bottleItemId: bottle.id, bottleMl: sizeMl, dishMenuItemId: dishId, pours: payloadPours });
      toast.success(`${dishName} is ready to pour`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not set up the measures. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const sizeMl = Number(bottleMl);
  function perBottle(ml: string): number | null {
    const pour = Number(ml);
    if (!Number.isFinite(pour) || pour <= 0 || !Number.isFinite(sizeMl) || sizeMl <= 0) return null;
    return Math.floor(sizeMl / pour);
  }

  const unusedCommon = COMMON_POURS.filter(
    (c) => !pours.some((p) => p.label.trim().toLowerCase() === c.label.toLowerCase()),
  );

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Pour measures · {dishName}</DialogTitle>
          <DialogDescription>
            Choose the bottle, then list the pours and what each costs. Every pour comes out of the one bottle, so
            selling it takes the right amount off your stock.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          {/* 1 · The bottle */}
          <section className="grid gap-1.5">
            <span className={dashboardLabelClass()}>1 · Which bottle?</span>
            {bottle ? (
              <div className="flex items-center justify-between gap-2 rounded-[2px] border bg-[#FBFAF6] px-3 py-2.5 text-sm">
                <span className="font-medium">{bottle.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setBottle(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <input
                  className={dashboardInputClass(false, "h-11")}
                  placeholder="Search your stock — e.g. Gilbey's, house red…"
                  value={search}
                  autoFocus
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search.trim().length >= 2 && results.length === 0 ? (
                  <p className={dashboardHintClass()}>
                    No stock matches “{search.trim()}”. Add the bottle to your stock first, then set its measures.
                  </p>
                ) : null}
                {results.length > 0 ? (
                  <ul className="mt-1 grid max-h-48 gap-1 overflow-y-auto">
                    {results.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[2px] border bg-white px-3 py-2 text-left text-sm transition-colors hover:border-[var(--pos-primary,#1D4B3B)]"
                          onClick={() => {
                            setBottle({ id: r.id, name: r.name });
                            setResults([]);
                            setSearch("");
                          }}
                        >
                          <span className="font-medium">{r.name}</span>
                          <span className={dashboardHintClass()}>{r.stockQty != null ? `${r.stockQty} in stock` : ""}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </section>

          {/* 2 · The bottle size */}
          <section className="grid gap-1.5">
            <span className={dashboardLabelClass()}>2 · How big is the bottle?</span>
            <div className="flex items-center gap-2">
              <input
                className={dashboardInputClass(false, "h-11 w-28 font-mono text-right")}
                inputMode="decimal"
                value={bottleMl}
                onChange={(e) => setBottleMl(clean(e.target.value))}
              />
              <span className="text-sm text-muted-foreground">ml &nbsp;·&nbsp; a wine bottle is 750, a spirit often 700 or 750</span>
            </div>
          </section>

          {/* 3 · The pours */}
          <section className="grid gap-2">
            <span className={dashboardLabelClass()}>3 · The pours and their prices</span>
            <ul className="grid gap-2">
              {pours.map((p, i) => {
                const per = perBottle(p.pourMl);
                return (
                  <li key={i} className="rounded-[2px] border bg-white p-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_auto] sm:items-end">
                      <label className="col-span-2 grid gap-1 sm:col-span-1">
                        <span className={dashboardHintClass()}>Name</span>
                        <input
                          className={dashboardInputClass(false, "h-11")}
                          value={p.label}
                          maxLength={120}
                          placeholder="Single"
                          onChange={(e) => setPour(i, { label: e.target.value })}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className={dashboardHintClass()}>Measure (ml)</span>
                        <input
                          className={dashboardInputClass(false, "h-11 font-mono text-right")}
                          inputMode="decimal"
                          value={p.pourMl}
                          placeholder="25"
                          onChange={(e) => setPour(i, { pourMl: clean(e.target.value) })}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className={dashboardHintClass()}>Price (KSh)</span>
                        <input
                          className={dashboardInputClass(false, "h-11 font-mono text-right")}
                          inputMode="decimal"
                          value={p.price}
                          placeholder="150"
                          onChange={(e) => setPour(i, { price: clean(e.target.value) })}
                        />
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 justify-self-end text-muted-foreground hover:text-red-700"
                        aria-label={`Remove ${p.label || "pour"}`}
                        disabled={pours.length === 1}
                        onClick={() => setPours((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                    {per != null ? (
                      <p className={`mt-2 ${dashboardHintClass()}`}>
                        About <strong className="text-foreground">{per}</strong>{" "}
                        {p.label.trim() ? p.label.trim().toLowerCase() : "pours"} per bottle
                        {p.price.trim() ? (
                          <>
                            {" "}· rings at <strong className="text-foreground">{kes(Number(p.price) || 0)}</strong>
                          </>
                        ) : null}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center gap-2">
              {unusedCommon.map((c) => (
                <Button key={c.label} variant="outline" size="sm" className="h-9" onClick={() => addPour(c.label, c.ml)}>
                  + {c.label}
                </Button>
              ))}
              <Button variant="ghost" size="sm" className="h-9" onClick={() => addPour("", null)}>
                + Another pour
              </Button>
            </div>
          </section>

          {error ? (
            <p role="alert" className="rounded-[2px] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : "Save measures"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
