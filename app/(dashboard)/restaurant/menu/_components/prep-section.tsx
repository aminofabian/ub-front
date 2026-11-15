"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { ApiRequestError, fetchItems, type ItemSummaryRecord } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { fetchBatchRecipe, makePrepBatch, saveBatchRecipe } from "@/lib/restaurant-api";

import { RecipeDialog } from "./recipe-dialog";

/**
 * Things made ahead in bulk — a pot of soup, marinated chicken. Making a batch takes its
 * ingredients off the stock count and adds the batch to it, valued at what the ingredients cost;
 * dishes then use the batch like any other ingredient.
 */
export function PrepSection({ canManage }: { canManage: boolean }) {
  const { branchId } = useDashboard();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ItemSummaryRecord[]>([]);
  const [item, setItem] = useState<{ id: string; name: string } | null>(null);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const mine = ++seq.current;
    const timer = window.setTimeout(() => {
      void fetchItems(term, { size: 8 })
        .then((found) => {
          if (mine === seq.current) setResults(found);
        })
        .catch(() => {
          if (mine === seq.current) setResults([]);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  async function make() {
    if (!item) return;
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) return setError("Type how much was made");
    if (!branchId) return setError("Choose a branch at the top of the page first");
    if (!window.confirm(`Record a batch of ${amount} ${item.name}? Its ingredients come off your stock.`)) return;
    setBusy(true);
    setError(null);
    try {
      const made = await makePrepBatch(item.id, branchId, amount);
      toast.success(`Batch recorded. It cost ${formatMoney(made.cost, "KES")} in ingredients.`);
      setQuantity("");
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "The batch was not recorded. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={DASHBOARD_SECTION_SURFACE} aria-label="Made ahead in batches">
      <h2 className="font-serif text-[1.25rem] leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]">
        Made ahead in batches
      </h2>
      <p className={dashboardHintClass()}>
        Soup, sauces, marinated meat. Add the thing you make as a stocked product first, say what goes into one
        unit of it, then record each batch as you make it.
      </p>
      {item ? (
        <div className="mt-2 grid gap-2">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{item.name}</span>
            <button type="button" className="underline" onClick={() => setItem(null)}>
              Choose another
            </button>
            {canManage ? (
              <Button variant="outline" size="sm" onClick={() => setRecipeOpen(true)}>
                What goes into it
              </Button>
            ) : null}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>How much was made</span>
              <input
                className={dashboardInputClass(false, "w-32 font-mono")}
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </label>
            <Button size="sm" disabled={busy} onClick={() => void make()}>
              {busy ? "Recording…" : "Record batch"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 grid gap-1">
          <input
            className={dashboardInputClass(false)}
            aria-label="Search for the product you make"
            placeholder="Search for the product you make"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search.trim().length >= 2 && results.length > 0 ? (
            <ul className="divide-y rounded-[2px] border">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:underline"
                    onClick={() => {
                      setItem({ id: r.id, name: r.variantName ? `${r.name} ${r.variantName}` : r.name });
                      setSearch("");
                      setError(null);
                    }}
                  >
                    {r.name}
                    {r.variantName ? ` · ${r.variantName}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {recipeOpen && item ? (
        <RecipeDialog
          key={item.id}
          title={`What goes into ${item.name}`}
          description="The ingredients of one unit of it — one litre, one kilogram, whatever you count it in."
          load={() => fetchBatchRecipe(item.id)}
          save={(ingredients) => saveBatchRecipe(item.id, ingredients)}
          onClose={() => setRecipeOpen(false)}
        />
      ) : null}
    </section>
  );
}
