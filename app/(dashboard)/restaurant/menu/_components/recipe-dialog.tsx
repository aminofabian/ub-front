"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DashboardLoading, dashboardHintClass, dashboardInputClass, dashboardLabelClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiRequestError, fetchItems, type ItemSummaryRecord } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import type { RecipeIngredientPayload, RecipeRecord } from "@/lib/restaurant-api";

const kes = (n: number) => formatMoney(n, "KES");

type Row = {
  itemId: string;
  name: string;
  unit: string | null;
  quantity: string;
  yieldPercent: string;
  onHand: number | null;
  /** What to use instead when this has run out. */
  standIn: { itemId: string; name: string; onHand: number | null } | null;
};

function clean(raw: string): string {
  const digits = raw.replace(/[^0-9.]/g, "");
  const dot = digits.indexOf(".");
  return dot === -1 ? digits : `${digits.slice(0, dot)}.${digits.slice(dot + 1).replace(/\./g, "").slice(0, 4)}`;
}

/**
 * What a dish, or one choice on a dish, is made of. Each ingredient is a product you keep in
 * stock; when the dish is sold that much comes off the count and its cost becomes the dish's cost.
 */
export function RecipeDialog({
  title,
  description,
  load,
  save,
  onClose,
}: {
  title: string;
  description: string;
  load: () => Promise<RecipeRecord>;
  save: (ingredients: RecipeIngredientPayload[]) => Promise<RecipeRecord>;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [estimate, setEstimate] = useState<{ cost: number; known: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ItemSummaryRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The ingredient a stand-in is being chosen for; the one search box then picks the stand-in.
  const [standInFor, setStandInFor] = useState<string | null>(null);
  const choosingFor = standInFor ? (rows ?? []).find((r) => r.itemId === standInFor) ?? null : null;
  const searchSeq = useRef(0);
  const loadRef = useRef(load);

  useEffect(() => {
    void loadRef
      .current()
      .then((recipe) => {
        setRows(
          recipe.ingredients.map((i) => ({
            itemId: i.itemId,
            name: i.name,
            unit: i.unit,
            quantity: String(i.quantity),
            yieldPercent: i.yieldPercent != null ? String(i.yieldPercent) : "",
            onHand: i.onHand,
            standIn: i.substituteItemId
              ? { itemId: i.substituteItemId, name: i.substituteName ?? "Removed product", onHand: i.substituteOnHand ?? null }
              : null,
          })),
        );
        setEstimate({ cost: recipe.estimatedCost, known: recipe.costKnown });
      })
      .catch(() => {
        setRows([]);
        setError("Could not load the recipe. Check your connection.");
      });
  }, []);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    // Only the newest search may show its results; a slow earlier one must not overwrite it.
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

  function patch(itemId: string, change: Partial<Row>) {
    setRows((prev) => (prev ?? []).map((r) => (r.itemId === itemId ? { ...r, ...change } : r)));
    setEstimate(null);
  }

  async function submit() {
    setError(null);
    const ingredients: RecipeIngredientPayload[] = [];
    for (const row of rows ?? []) {
      const quantity = Number(row.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return setError(`Type how much ${row.name} goes into it`);
      const yieldPercent = row.yieldPercent.trim() === "" ? undefined : Number(row.yieldPercent);
      if (yieldPercent != null && (!Number.isFinite(yieldPercent) || yieldPercent < 1 || yieldPercent > 100)) {
        return setError(`The usable part of ${row.name} is between 1 and 100 percent`);
      }
      ingredients.push({
        itemId: row.itemId,
        quantity,
        ...(yieldPercent != null ? { yieldPercent } : {}),
        ...(row.standIn ? { substituteItemId: row.standIn.itemId } : {}),
      });
    }
    setSaving(true);
    try {
      const saved = await save(ingredients);
      setEstimate({ cost: saved.estimatedCost, known: saved.costKnown });
      toast.success("Recipe saved");
      onClose();
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not save the recipe. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {rows == null ? (
          <DashboardLoading label="Loading the recipe…" />
        ) : (
          <div className="grid gap-3">
            {rows.length === 0 ? (
              <p className={dashboardHintClass()}>
                No ingredients yet. Without a recipe nothing comes off your stock when this is sold, and it
                shows no cost.
              </p>
            ) : (
              <ul className="grid gap-2">
                {rows.map((row) => (
                  <li key={row.itemId} className="grid grid-cols-[minmax(0,1fr)_6rem_6rem_auto] items-end gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{row.name}</div>
                      <div className={dashboardHintClass()}>
                        {row.onHand != null ? `${row.onHand} in stock` : ""}
                        {row.unit ? ` · counted in ${row.unit}` : ""}
                      </div>
                      <div className="text-xs">
                        {row.standIn ? (
                          <>
                            If it runs out, use <span className="font-medium">{row.standIn.name}</span>
                            {row.standIn.onHand != null ? ` (${row.standIn.onHand} in stock)` : ""}{" "}
                            <button type="button" className="underline" onClick={() => patch(row.itemId, { standIn: null })}>
                              Remove
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="underline"
                            aria-pressed={standInFor === row.itemId}
                            onClick={() => {
                              setStandInFor(standInFor === row.itemId ? null : row.itemId);
                              setSearch("");
                            }}
                          >
                            {standInFor === row.itemId ? "Choosing a stand-in — search below" : "Use something else if it runs out"}
                          </button>
                        )}
                      </div>
                    </div>
                    <label className="grid gap-0.5">
                      <span className={dashboardLabelClass()}>Amount</span>
                      <input
                        className={dashboardInputClass(false, "text-right font-mono")}
                        inputMode="decimal"
                        aria-label={`Amount of ${row.name}`}
                        value={row.quantity}
                        onChange={(e) => patch(row.itemId, { quantity: clean(e.target.value) })}
                      />
                    </label>
                    <label className="grid gap-0.5">
                      <span className={dashboardLabelClass()}>Usable %</span>
                      <input
                        className={dashboardInputClass(false, "text-right font-mono")}
                        inputMode="decimal"
                        placeholder="100"
                        aria-label={`Usable percent of ${row.name}`}
                        value={row.yieldPercent}
                        onChange={(e) => patch(row.itemId, { yieldPercent: clean(e.target.value) })}
                      />
                    </label>
                    <button
                      type="button"
                      className="pb-2 text-sm underline"
                      onClick={() => {
                        setRows((prev) => (prev ?? []).filter((r) => r.itemId !== row.itemId));
                        if (standInFor === row.itemId) setStandInFor(null);
                        setEstimate(null);
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className={dashboardHintClass()}>
              Amount is what ends up on the plate, in the unit you count that product in. Usable % is how
              much survives trimming and cooking: at 75, 100 on the plate takes 133 from stock. A stand-in is
              used, in the same amount, only when the ingredient cannot cover a plate and the stand-in can.
            </p>

            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>
                {choosingFor ? `What to use when ${choosingFor.name} runs out` : "Add an ingredient"}
              </span>
              <input
                className={dashboardInputClass(false)}
                placeholder="Search the products you stock"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            {search.trim().length >= 2 ? (
              results.length === 0 ? (
                <span className={dashboardHintClass()}>No product found. Add it under Products first, as stocked.</span>
              ) : (
                <ul className="divide-y rounded-[2px] border">
                  {results
                    .filter((r) => (choosingFor ? r.id !== choosingFor.itemId : !rows.some((row) => row.itemId === r.id)))
                    .map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:underline"
                          onClick={() => {
                            if (choosingFor) {
                              patch(choosingFor.itemId, {
                                standIn: {
                                  itemId: r.id,
                                  name: r.variantName ? `${r.name} ${r.variantName}` : r.name,
                                  onHand: null,
                                },
                              });
                              setStandInFor(null);
                              setSearch("");
                              return;
                            }
                            setRows((prev) => [
                              ...(prev ?? []),
                              {
                                itemId: r.id,
                                name: r.variantName ? `${r.name} ${r.variantName}` : r.name,
                                unit: null,
                                quantity: "",
                                yieldPercent: "",
                                onHand: null,
                                standIn: null,
                              },
                            ]);
                            setEstimate(null);
                            setSearch("");
                          }}
                        >
                          {r.name}
                          {r.variantName ? ` · ${r.variantName}` : ""}
                        </button>
                      </li>
                    ))}
                </ul>
              )
            ) : null}

            {estimate && rows.length > 0 ? (
              <p className="text-sm">
                Costs about <span className="font-mono font-semibold tabular-nums">{kes(estimate.cost)}</span> to make
                at today&rsquo;s buying prices
                {estimate.known ? "." : " — some ingredients have no buying price, so this is short."}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || rows == null}>
            {saving ? "Saving…" : "Save recipe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
