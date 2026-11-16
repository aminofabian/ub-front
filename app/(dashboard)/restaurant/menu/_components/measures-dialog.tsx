"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { dashboardHintClass, dashboardInputClass, dashboardLabelClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiRequestError, fetchItems, type ItemSummaryRecord } from "@/lib/api";
import { generateMeasures, type MeasurePourPayload } from "@/lib/restaurant-api";

function clean(raw: string, maxDecimals = 2): string {
  const digits = raw.replace(/[^0-9.]/g, "");
  const dot = digits.indexOf(".");
  return dot === -1 ? digits : `${digits.slice(0, dot)}.${digits.slice(dot + 1).replace(/\./g, "").slice(0, maxDecimals)}`;
}

type PourRow = { label: string; pourMl: string; priceDelta: string };

const COMMON_POURS: { label: string; ml: number }[] = [
  { label: "Single", ml: 25 },
  { label: "Double", ml: 50 },
  { label: "Glass", ml: 125 },
];

/**
 * Sets up a bottle's pour measures. Pick the bottle, say how big it is, and list the pours (a tot,
 * a single, a double, a glass). The server builds a "choose one" group whose options each take their
 * fraction of the bottle off the stock count when sold — so a double depletes the bottle, and the
 * owner never works out 30/750. The group is hung on this drink.
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
  const [pours, setPours] = useState<PourRow[]>([{ label: "Single", pourMl: "25", priceDelta: "" }]);
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

  async function submit() {
    setError(null);
    if (!bottle) return setError("Choose the bottle these pours come out of");
    const sizeMl = Number(bottleMl);
    if (!Number.isFinite(sizeMl) || sizeMl <= 0) return setError("Type the bottle's size");
    const payloadPours: MeasurePourPayload[] = [];
    for (const p of pours) {
      if (!p.label.trim()) return setError("Name each pour");
      const ml = Number(p.pourMl);
      if (!Number.isFinite(ml) || ml <= 0) return setError(`How much is a ${p.label || "pour"}?`);
      if (ml > sizeMl) return setError(`A ${p.label} pours more than the whole bottle`);
      const delta = p.priceDelta.trim() === "" ? undefined : Number(p.priceDelta);
      if (delta != null && (!Number.isFinite(delta) || delta < 0)) return setError(`Check the price for a ${p.label}`);
      payloadPours.push({ label: p.label.trim(), pourMl: ml, ...(delta != null ? { priceDelta: delta } : {}) });
    }
    setSaving(true);
    try {
      await generateMeasures({ bottleItemId: bottle.id, bottleMl: sizeMl, dishMenuItemId: dishId, pours: payloadPours });
      toast.success(`Measures set for ${dishName}`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not set up the measures. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const sizeMl = Number(bottleMl);
  const fractionLabel = (ml: string) => {
    const pour = Number(ml);
    if (!Number.isFinite(pour) || pour <= 0 || !Number.isFinite(sizeMl) || sizeMl <= 0) return "";
    const perBottle = Math.round(sizeMl / pour);
    return `≈ ${perBottle} per bottle`;
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Measures: {dishName}</DialogTitle>
          <DialogDescription>
            Pick the bottle and list the pours. Selling a pour takes its share of the bottle off your stock.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* The bottle */}
          <div className="grid gap-1">
            <span className={dashboardLabelClass()}>Bottle</span>
            {bottle ? (
              <div className="flex items-center justify-between gap-2 rounded-[2px] border px-3 py-2 text-sm">
                <span className="font-medium">{bottle.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setBottle(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <input
                  className={dashboardInputClass(false)}
                  placeholder="Search your stock for the bottle…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {results.length > 0 ? (
                  <ul className="mt-1 grid max-h-44 gap-1 overflow-y-auto">
                    {results.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 rounded-[2px] border px-3 py-2 text-left text-sm hover:border-[var(--pos-primary,#1D4B3B)]"
                          onClick={() => {
                            setBottle({ id: r.id, name: r.name });
                            setResults([]);
                            setSearch("");
                          }}
                        >
                          <span>{r.name}</span>
                          <span className={dashboardHintClass()}>{r.stockQty != null ? `${r.stockQty} in stock` : ""}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>

          {/* The bottle size */}
          <label className="grid max-w-[14rem] gap-1">
            <span className={dashboardLabelClass()}>Bottle size (ml)</span>
            <input
              className={dashboardInputClass(false, "font-mono")}
              inputMode="decimal"
              value={bottleMl}
              onChange={(e) => setBottleMl(clean(e.target.value))}
            />
          </label>

          {/* The pours */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className={dashboardLabelClass()}>Pours</span>
              <span className="flex gap-1">
                {COMMON_POURS.map((c) => (
                  <Button
                    key={c.label}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (pours.some((p) => p.label.trim().toLowerCase() === c.label.toLowerCase())) return;
                      setPours((prev) => [...prev, { label: c.label, pourMl: String(c.ml), priceDelta: "" }]);
                    }}
                  >
                    + {c.label}
                  </Button>
                ))}
              </span>
            </div>
            <ul className="grid gap-2">
              {pours.map((p, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_5.5rem_6.5rem_auto] items-end gap-2">
                  <label className="grid gap-1">
                    <span className={dashboardHintClass()}>Name</span>
                    <input className={dashboardInputClass(false)} value={p.label} maxLength={120} onChange={(e) => setPour(i, { label: e.target.value })} />
                  </label>
                  <label className="grid gap-1">
                    <span className={dashboardHintClass()}>ml</span>
                    <input className={dashboardInputClass(false, "font-mono")} inputMode="decimal" value={p.pourMl} onChange={(e) => setPour(i, { pourMl: clean(e.target.value) })} />
                  </label>
                  <label className="grid gap-1">
                    <span className={dashboardHintClass()}>Price +</span>
                    <input className={dashboardInputClass(false, "font-mono")} inputMode="decimal" placeholder="0" value={p.priceDelta} onChange={(e) => setPour(i, { priceDelta: clean(e.target.value) })} />
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-0.5"
                    disabled={pours.length === 1}
                    onClick={() => setPours((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </Button>
                  <span className={`col-span-4 -mt-1 ${dashboardHintClass()}`}>{fractionLabel(p.pourMl)}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() => setPours((prev) => [...prev, { label: "", pourMl: "", priceDelta: "" }])}
            >
              Add a pour
            </Button>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : "Set measures"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
