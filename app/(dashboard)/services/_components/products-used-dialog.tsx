"use client";

import { useEffect, useRef, useState } from "react";

import { dashboardHintClass, dashboardInputClass, dashboardLabelClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchItems, type ItemSummaryRecord } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { fetchServiceConsumables, setServiceConsumables, type ServiceRecord } from "@/lib/service-business-api";

const kes = (n: number) => formatMoney(n, "KES");
const MAX_ROWS = 20;

type Row = { itemId: string; itemName: string; quantity: string; unitCost: number | null };

/**
 * What a service uses up each time (dye, gloves, a blade), so the report can show what a visit
 * really leaves. It is a cost figure only: stock is still taken out of the store room by hand.
 */
export function ProductsUsedDialog({ service, onClose }: { service: ServiceRecord; onClose: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<ItemSummaryRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const latestSearch = useRef(0);

  useEffect(() => {
    void fetchServiceConsumables(service.id)
      .then((data) =>
        setRows(
          data.items.map((i) => ({
            itemId: i.itemId,
            itemName: i.itemName,
            quantity: String(i.quantity),
            unitCost: i.unitCost,
          })),
        ),
      )
      .catch(() => setLoadFailed(true));
  }, [service.id]);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setFound([]);
      return;
    }
    // Only the newest search may show its results; a slow earlier one must not overwrite it.
    const ticket = latestSearch.current + 1;
    latestSearch.current = ticket;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void fetchItems(term, { size: 8 })
        .then((items) => (latestSearch.current === ticket ? setFound(items) : undefined))
        .catch(() => (latestSearch.current === ticket ? setFound([]) : undefined))
        .finally(() => (latestSearch.current === ticket ? setSearching(false) : undefined));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const total = (rows ?? []).reduce((sum, row) => {
    const qty = Number(row.quantity);
    return row.unitCost != null && qty > 0 ? sum + row.unitCost * qty : sum;
  }, 0);

  function add(item: ItemSummaryRecord) {
    setError(null);
    setRows((prev) => {
      const list = prev ?? [];
      if (list.some((r) => r.itemId === item.id)) return list;
      if (list.length >= MAX_ROWS) {
        setError(`A service can list up to ${MAX_ROWS} products`);
        return list;
      }
      return [...list, { itemId: item.id, itemName: item.name, quantity: "1", unitCost: null }];
    });
    setSearch("");
    setFound([]);
  }

  async function save() {
    const list = rows ?? [];
    const items: { itemId: string; quantity: number }[] = [];
    for (const row of list) {
      const qty = Number(row.quantity);
      if (!(qty > 0)) return setError(`Enter how much ${row.itemName} is used`);
      items.push({ itemId: row.itemId, quantity: qty });
    }
    setError(null);
    setSaving(true);
    try {
      await setServiceConsumables(service.id, items);
      onClose();
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Products used for {service.name}</DialogTitle>
          <DialogDescription>
            What one visit uses up. It is counted as a cost in the services report. It does not take anything out of
            stock.
          </DialogDescription>
        </DialogHeader>
        {loadFailed ? (
          <p className="text-sm">Could not load the list. Close this and try again.</p>
        ) : rows === null ? (
          <p className="text-sm">Loading…</p>
        ) : (
          <div className="grid gap-3">
            {rows.length === 0 ? (
              <p className={dashboardHintClass()}>Nothing listed yet. Search for a product below.</p>
            ) : (
              <ul className="grid gap-2">
                {rows.map((row) => (
                  <li key={row.itemId} className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] items-center gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{row.itemName}</span>
                      <span className={dashboardHintClass()}>
                        {row.unitCost != null ? `${kes(row.unitCost)} each at the last delivery` : "No delivery cost yet"}
                      </span>
                    </span>
                    <input
                      className={dashboardInputClass(false, "text-right font-mono")}
                      inputMode="decimal"
                      aria-label={`How much ${row.itemName} one visit uses`}
                      value={row.quantity}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, "");
                        setError(null);
                        setRows((prev) => (prev ?? []).map((r) => (r.itemId === row.itemId ? { ...r, quantity: value } : r)));
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRows((prev) => (prev ?? []).filter((r) => r.itemId !== row.itemId))}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {rows.length > 0 ? (
              <p className="flex justify-between text-sm font-semibold">
                <span>Products for one visit</span>
                <span className="font-mono tabular-nums">{kes(Math.round(total * 100) / 100)}</span>
              </p>
            ) : null}
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Add a product</span>
              <input
                className={dashboardInputClass(false)}
                placeholder="Search your products"
                autoComplete="off"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            {search.trim().length >= 2 ? (
              searching ? (
                <p className={dashboardHintClass()}>Searching…</p>
              ) : found.length === 0 ? (
                <p className={dashboardHintClass()}>No product matches. Add it under Products first.</p>
              ) : (
                <ul className="grid gap-1">
                  {found.map((item) => (
                    <li key={item.id}>
                      <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => add(item)}>
                        <span className="truncate">{item.name}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving || rows === null} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
