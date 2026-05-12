"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Loader2, PackagePlus, Plus, Trash2 } from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  addSupplyBatchExpense,
  addPathBLine,
  createPathBSession,
  fetchSellPriceSuggestion,
  fetchSupplierItemLinks,
  fetchSuppliersPage,
  postPathBSession,
  postSellingPrice,
  type ItemSummaryRecord,
  type SupplierItemLinkRecord,
  type SupplierRecord,
} from "@/lib/api";
import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { ProductPickCell } from "./product-pick-cell";
import { ExtraCostsSection } from "./extra-costs-section";

export type SupplyDraftRow = {
  key: string;
  source: "linked" | "adhoc";
  link?: SupplierItemLinkRecord;
  item: ItemSummaryRecord | null;
  qtyStr: string;
  unitStr: string;
  sellPriceStr: string;
  sellPriceTouched: boolean;
  expiry: string;
};

function newRowKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parsePositiveQty(raw: string): number | null {
  const t = raw.trim();
  if (!t) {
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

function parseNonNeg(raw: string): number | null {
  const t = raw.trim();
  if (!t) {
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}

function parseRetailPrice(raw: string): number | null {
  const t = raw.trim();
  if (!t) {
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0.01) {
    return null;
  }
  return roundMoney2(n);
}

function parseMoneyApi(v: number | string | null | undefined): number | null {
  if (v == null) {
    return null;
  }
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function localDateYmdFromDatetimeLocal(isoLocal: string): string {
  const d = new Date(isoLocal);
  if (!Number.isFinite(d.getTime())) {
    const fallback = new Date();
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, "0");
    const day = String(fallback.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type RowPricingHint = {
  loading: boolean;
  error?: string;
  currentSellPrice: number | null;
  suggestedSellPrice: number | null;
  note: string | null;
};

/** Parses `rowPricingDepsKey` segment `itemId:unitStr` for this item. */
function draftBuyingUnitFromPricingKey(
  depsKey: string,
  itemId: string,
): number | null {
  if (!depsKey) {
    return null;
  }
  const prefix = `${itemId}:`;
  for (const segment of depsKey.split(";")) {
    if (segment.startsWith(prefix)) {
      const raw = segment.slice(prefix.length);
      const u = parseNonNeg(raw);
      if (u != null && u > 0) {
        return u;
      }
      return null;
    }
  }
  return null;
}

function rowItemId(row: SupplyDraftRow): string | null {
  if (row.source === "linked" && row.link) {
    return row.link.itemId;
  }
  return row.item?.id ?? null;
}

function rowLabel(row: SupplyDraftRow): string {
  if (row.source === "linked" && row.link) {
    return row.link.itemName;
  }
  return row.item ? itemCatalogDisplayTitle(row.item) : "—";
}

function rowSku(row: SupplyDraftRow): string {
  if (row.source === "linked" && row.link) {
    return row.link.sku;
  }
  return row.item?.sku ?? "—";
}

function rowBarcode(row: SupplyDraftRow): string {
  if (row.source === "linked" && row.link) {
    return row.link.barcode?.trim() || "—";
  }
  return row.item?.barcode?.trim() || "—";
}

function rowStock(row: SupplyDraftRow): number | null {
  if (row.source === "linked" && row.link?.currentStock != null) {
    const n = Number(row.link.currentStock);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function linePayload(row: SupplyDraftRow): {
  description: string;
  amountMoney: number;
  suggestedItemId: string;
} | null {
  const itemId = rowItemId(row);
  if (!itemId) {
    return null;
  }
  const qty = parsePositiveQty(row.qtyStr);
  const unit = parseNonNeg(row.unitStr);
  if (qty == null || unit == null) {
    return null;
  }
  const amountMoney = roundMoney2(qty * unit);
  if (amountMoney <= 0) {
    return null;
  }
  const sku = rowSku(row);
  return {
    description: `${rowLabel(row)} (${sku})`,
    amountMoney,
    suggestedItemId: itemId,
  };
}

type NewSupplyDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted: () => void;
};

export function NewSupplyDrawer({
  open,
  onOpenChange,
  onPosted,
}: NewSupplyDrawerProps) {
  const { branches, branchId, setBranchId, branchesLoading, me } =
    useDashboard();
  const canSetSellPrice = hasPermission(
    me?.permissions,
    Permission.PricingSellPriceSet,
  );

  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierHits, setSupplierHits] = useState<SupplierRecord[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplier, setSupplier] = useState<SupplierRecord | null>(null);

  const [linksLoading, setLinksLoading] = useState(false);
  const [rows, setRows] = useState<SupplyDraftRow[]>([]);

  const defaultReceived = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);
  const [receivedAtLocal, setReceivedAtLocal] = useState(defaultReceived);
  const [notes, setNotes] = useState("");
  const [docRef, setDocRef] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rowPricing, setRowPricing] = useState<Record<string, RowPricingHint>>(
    {},
  );

  const [showExtras, setShowExtras] = useState(false);
  const [extras, setExtras] = useState<
    { key: string; category: string; amount: string; desc: string }[]
  >([]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const q = supplierQuery.trim();
      if (q.length < 1) {
        setSupplierHits([]);
        return;
      }
      setSupplierLoading(true);
      void fetchSuppliersPage({ search: q, page: 0, size: 25 })
        .then((p) => setSupplierHits(p.content))
        .catch(() => setSupplierHits([]))
        .finally(() => setSupplierLoading(false));
    }, 260);
    return () => window.clearTimeout(id);
  }, [supplierQuery]);

  const loadLinks = useCallback(async (sid: string) => {
    setLinksLoading(true);
    setError(null);
    try {
      const list = await fetchSupplierItemLinks(sid);
      const active = list.filter((l) => l.active);
      setRows(
        active.map((link) => ({
          key: newRowKey(),
          source: "linked",
          link,
          item: null,
          qtyStr: "",
          unitStr:
            link.lastCostPrice != null &&
            String(link.lastCostPrice).trim() !== ""
              ? String(link.lastCostPrice)
              : link.defaultCostPrice != null &&
                  String(link.defaultCostPrice).trim() !== ""
                ? String(link.defaultCostPrice)
                : "",
          sellPriceStr: "",
          sellPriceTouched: false,
          expiry: "",
        })),
      );
      if (active.length === 0) {
        setError(
          "No catalog products are linked to this supplier yet. Link SKUs on the supplier or products screens, or add rows with “Add product”.",
        );
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load supplier catalog.",
      );
      setRows([]);
    } finally {
      setLinksLoading(false);
    }
  }, []);

  useEffect(() => {
     
    if (!open) {
      setSupplier(null);
      setSupplierQuery("");
      setSupplierHits([]);
      setRows([]);
      setNotes("");
      setDocRef("");
      setError(null);
      setReceivedAtLocal(defaultReceived);
      setRowPricing({});
    }
     
  }, [open, defaultReceived]);

  useEffect(() => {
     
    if (supplier) {
      void loadLinks(supplier.id);
    } else {
      setRows([]);
    }
     
  }, [supplier, loadLinks]);

  useEffect(() => {
     
    if (!open) {
      return;
    }
    setRows((prev) =>
      prev.map((r) => ({ ...r, sellPriceStr: "", sellPriceTouched: false })),
    );
     
  }, [branchId, open]);

  const rowItemIdsKey = useMemo(() => {
    const ids = new Set<string>();
    for (const r of rows) {
      const id = rowItemId(r);
      if (id) {
        ids.add(id);
      }
    }
    return [...ids].sort().join(",");
  }, [rows]);

  const rowPricingDepsKey = useMemo(() => {
    const parts: string[] = [];
    for (const r of rows) {
      const id = rowItemId(r);
      if (id) {
        parts.push(`${id}:${r.unitStr.trim()}`);
      }
    }
    return parts.sort().join(";");
  }, [rows]);

  useEffect(() => {
     
    if (!open || !supplier?.id || !branchId.trim()) {
      return;
    }
    const ids = rowItemIdsKey.split(",").filter(Boolean);
    if (ids.length === 0) {
      setRowPricing({});
      return;
    }
    let cancelled = false;
    const initial: Record<string, RowPricingHint> = {};
    for (const id of ids) {
      initial[id] = {
        loading: true,
        currentSellPrice: null,
        suggestedSellPrice: null,
        note: null,
      };
    }
    setRowPricing(initial);

    void Promise.all(
      ids.map(async (itemId) => {
        try {
          const draftUnit = draftBuyingUnitFromPricingKey(
            rowPricingDepsKey,
            itemId,
          );
          const rec = await fetchSellPriceSuggestion(
            itemId,
            supplier.id,
            branchId,
            draftUnit,
          );
          if (cancelled) {
            return;
          }
          const cur = parseMoneyApi(rec.currentSellPrice);
          const sug = parseMoneyApi(rec.suggestedSellPrice);
          setRowPricing((m) => ({
            ...m,
            [itemId]: {
              loading: false,
              currentSellPrice: cur,
              suggestedSellPrice: sug,
              note: rec.note ?? null,
            },
          }));
          setRows((prev) =>
            prev.map((r) => {
              if (rowItemId(r) !== itemId || r.sellPriceTouched) {
                return r;
              }
              if (r.sellPriceStr.trim() !== "") {
                return r;
              }
              const v = cur ?? sug;
              if (v == null) {
                return r;
              }
              return { ...r, sellPriceStr: v.toFixed(2) };
            }),
          );
        } catch {
          if (cancelled) {
            return;
          }
          setRowPricing((m) => ({
            ...m,
            [itemId]: {
              loading: false,
              error: "unavailable",
              currentSellPrice: null,
              suggestedSellPrice: null,
              note: null,
            },
          }));
        }
      }),
    );

    return () => {
      cancelled = true;
    };
     
  }, [open, supplier?.id, branchId, rowItemIdsKey, rowPricingDepsKey]);

  const grandTotal = useMemo(() => {
    let sum = 0;
    for (const row of rows) {
      const p = linePayload(row);
      if (p) {
        sum += p.amountMoney;
      }
    }
    return roundMoney2(sum);
  }, [rows]);

  const estimatedProfit = useMemo(() => {
    let cost = 0;
    let revenue = 0;
    for (const row of rows) {
      const qty = parsePositiveQty(row.qtyStr);
      const unit = parseNonNeg(row.unitStr);
      const sell = parseRetailPrice(row.sellPriceStr);
      if (qty != null && unit != null) cost += qty * unit;
      if (qty != null && sell != null) revenue += qty * sell;
    }
    return {
      cost: roundMoney2(cost),
      revenue: roundMoney2(revenue),
      profit: roundMoney2(revenue - cost),
    };
  }, [rows]);

  const extrasTotal = useMemo(() => {
    let sum = 0;
    for (const e of extras) {
      const n = parseNonNeg(e.amount);
      if (n != null) sum += n;
    }
    return roundMoney2(sum);
  }, [extras]);

  const duplicateIds = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of rows) {
      const id = rowItemId(row);
      if (!id) {
        continue;
      }
      if (parsePositiveQty(row.qtyStr) == null) {
        continue;
      }
      m.set(id, (m.get(id) ?? 0) + 1);
    }
    return [...m.entries()].filter(([, c]) => c > 1).map(([id]) => id);
  }, [rows]);

  const addAdhocRow = () => {
    setRows((r) => [
      ...r,
      {
        key: newRowKey(),
        source: "adhoc",
        item: null,
        qtyStr: "1",
        unitStr: "",
        sellPriceStr: "",
        sellPriceTouched: false,
        expiry: "",
      },
    ]);
  };

  const removeRow = (key: string) => {
    setRows((r) => r.filter((row) => row.key !== key));
  };

  const persistLine = async (
    sessionId: string,
    row: SupplyDraftRow,
  ): Promise<{ row: SupplyDraftRow; serverLineId: string }> => {
    const payload = linePayload(row);
    if (!payload) {
      throw new Error("Invalid line");
    }
    const created = await addPathBLine(sessionId, {
      description: payload.description,
      amountMoney: payload.amountMoney,
      suggestedItemId: payload.suggestedItemId,
    });
    return { row, serverLineId: created.id };
  };

  const onSubmit = async () => {
    setError(null);
    if (!supplier) {
      setError("Choose a supplier.");
      return;
    }
    if (!branchId.trim()) {
      setError("Choose a receiving branch.");
      return;
    }
    const activeRows = rows.filter(
      (r) => parsePositiveQty(r.qtyStr) != null && linePayload(r),
    );
    if (activeRows.length === 0) {
      setError("Enter quantity and cost for at least one line.");
      return;
    }
    if (duplicateIds.length > 0) {
      setError(
        "Each product can appear only once — adjust quantities on a single row.",
      );
      return;
    }
    setBusy(true);
    try {
      const noteParts = [
        docRef.trim() ? `Supplier document ref: ${docRef.trim()}` : "",
        notes.trim(),
      ].filter(Boolean);
      const session = await createPathBSession({
        supplierId: supplier.id,
        branchId: branchId.trim(),
        receivedAt: new Date(receivedAtLocal).toISOString(),
        notes: noteParts.length ? noteParts.join("\n") : null,
      });
      const sessionId = session.id;
      const synced: { row: SupplyDraftRow; serverLineId: string }[] = [];
      for (const row of rows) {
        if (parsePositiveQty(row.qtyStr) == null || !linePayload(row)) {
          continue;
        }
        // Sequential: server line order matches UI order.
        synced.push(await persistLine(sessionId, row));
      }
      const postBody = {
        lines: synced.map(({ row, serverLineId }) => {
          const qty = parsePositiveQty(row.qtyStr) ?? 0;
          const exp = row.expiry.trim();
          return {
            lineId: serverLineId,
            itemId: rowItemId(row) as string,
            usableQty: qty,
            wastageQty: 0,
            expiryDate: exp.length >= 8 ? exp : null,
          };
        }),
      };
      const postResult = await postPathBSession(sessionId, postBody);

      // Save extras/expenses to the new supply batch
      const sbId = postResult.supplyBatchId;
      if (sbId && extras.length > 0) {
        for (const e of extras) {
          const amount = parseNonNeg(e.amount);
          if (amount == null || amount <= 0 || !e.category?.trim()) continue;
          try {
            await addSupplyBatchExpense(sbId, {
              category: e.category.trim(),
              amount,
              description: e.desc?.trim() || null,
            });
          } catch {
            /* non-critical */
          }
        }
      }
      const eff = localDateYmdFromDatetimeLocal(receivedAtLocal);
      const priceErrors: string[] = [];
      if (canSetSellPrice) {
        for (const row of activeRows) {
          const iid = rowItemId(row) as string;
          const parsed = parseRetailPrice(row.sellPriceStr);
          if (parsed == null) {
            continue;
          }
          const hint = rowPricing[iid];
          const cur = hint?.currentSellPrice ?? null;
          if (cur != null && Math.abs(cur - parsed) < 0.005) {
            continue;
          }
          try {
            await postSellingPrice({
              itemId: iid,
              branchId: branchId.trim(),
              price: parsed,
              effectiveFrom: eff,
              notes: supplier ? `Retail after supply (${supplier.name})` : null,
            });
          } catch (pe) {
            const msg = pe instanceof Error ? pe.message : "";
            if (
              !msg.toLowerCase().includes("conflict") &&
              !msg.toLowerCase().includes("already starts")
            ) {
              priceErrors.push(
                `${rowLabel(row)}: ${msg || "price update failed"}`,
              );
            }
          }
        }
      }
      onPosted();
      if (priceErrors.length > 0) {
        setError(
          `Supply posted, but shelf price could not be updated for: ${priceErrors.join("; ")}`,
        );
        return;
      }
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post supply.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="New supply"
      description="Receiving branch stock increases by the quantity on each line. Totals use buying price × quantity. Shelf prices can be updated for this branch after posting (when permitted)."
      width="extraWide"
      icon={<PackagePlus className="size-5 text-primary" aria-hidden />}
      banner={error ? <FormDrawerMessageBanner text={error} /> : undefined}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className={cn(dashboardHintClass(), "max-w-md")}>
            Totals use buying price × quantity. Shelf price applies to the
            selected branch after post.{" "}
            <Link
              className="text-primary underline"
              href={APP_ROUTES.suppliers}
            >
              Manage supplier links
            </Link>
            .
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onSubmit()}
              disabled={busy || !supplier}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Post supply
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 px-1 pb-4">

        <section className="rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Building2 className="size-4 text-muted-foreground" />
            Supplier
          </div>
          <div className="relative">
            <input
              className={dashboardInputClass(false)}
              placeholder="Search supplier name or code…"
              value={supplier ? supplier.name : supplierQuery}
              onChange={(e) => {
                setSupplier(null);
                setSupplierQuery(e.target.value);
              }}
              disabled={busy}
            />
            {!supplier && supplierQuery.trim().length > 0 ? (
              <div className="absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded-lg border bg-background shadow-md">
                {supplierLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Searching…
                  </div>
                ) : supplierHits.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    No match
                  </div>
                ) : (
                  <ul>
                    {supplierHits.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            setSupplier(s);
                            setSupplierQuery("");
                            setSupplierHits([]);
                          }}
                        >
                          <span className="font-medium">{s.name}</span>
                          {s.code ? (
                            <span className="text-[11px] text-muted-foreground">
                              {s.code}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
          {supplier ? (
            <p className={cn(dashboardHintClass(), "mt-2")}>
              Selected: <strong>{supplier.name}</strong>
            </p>
          ) : null}
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={dashboardLabelClass()}>Receiving branch</span>
            <select
              className={dashboardSelectClass(busy)}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={busy || branchesLoading || branches.length === 0}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={dashboardLabelClass()}>Received at</span>
            <input
              type="datetime-local"
              className={dashboardInputClass(busy)}
              value={receivedAtLocal}
              onChange={(e) => setReceivedAtLocal(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={dashboardLabelClass()}>
              Supplier document / DN ref (optional)
            </span>
            <input
              className={dashboardInputClass(busy)}
              value={docRef}
              onChange={(e) => setDocRef(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={dashboardLabelClass()}>Notes (optional)</span>
            <textarea
              className={dashboardTextareaClass(busy)}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
            />
          </label>
        </div>

        {supplier ? (
          <ExtraCostsSection extras={extras} onChange={setExtras} busy={busy} />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Receiving lines
          </h3>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1"
            onClick={addAdhocRow}
            disabled={busy || !supplier}
          >
            <Plus className="size-3.5" />
            Add product
          </Button>
        </div>

        {linksLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading supplier catalog…
          </div>
        ) : null}

        {duplicateIds.length > 0 ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
            Duplicate products in the grid — keep one row per SKU.
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
            <thead className="bg-muted/90 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Barcode</th>
                <th className="px-3 py-2 text-right">Stock now</th>
                <th className="px-3 py-2 text-right">Qty in</th>
                <th className="px-3 py-2 text-right">After</th>
                <th className="px-3 py-2 text-right">Buying price</th>
                <th className="px-3 py-2 text-right">Line total</th>
                <th className="px-3 py-2 min-w-[7.5rem] text-right">
                  Shelf price
                </th>
                <th className="px-3 py-2">Expiry</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const p = linePayload(row);
                const stock = rowStock(row);
                const qty = parsePositiveQty(row.qtyStr);
                const stockAfter =
                  stock != null && qty != null ? stock + qty : null;
                const iid = rowItemId(row);
                const hint = iid ? rowPricing[iid] : undefined;
                return (
                  <tr key={row.key} className="border-t align-top">
                    <td className="px-3 py-2">
                      {row.source === "adhoc" ? (
                        <ProductPickCell
                          item={row.item}
                          disabled={busy}
                          onItemChange={(item) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.key === row.key
                                  ? {
                                      ...r,
                                      item,
                                      sellPriceStr: "",
                                      sellPriceTouched: false,
                                    }
                                  : r,
                              ),
                            )
                          }
                        />
                      ) : (
                        <div className="text-sm font-medium leading-snug">
                          {rowLabel(row)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {rowSku(row)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {rowBarcode(row)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                      {stock != null ? stock.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={cn(
                          dashboardInputClass(busy),
                          "w-16 text-right font-mono text-sm",
                        )}
                        value={row.qtyStr}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key
                                ? { ...r, qtyStr: e.target.value }
                                : r,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {stockAfter != null ? stockAfter.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={cn(
                          dashboardInputClass(busy),
                          "w-24 text-right font-mono text-sm",
                        )}
                        value={row.unitStr}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key
                                ? { ...r, unitStr: e.target.value }
                                : r,
                            ),
                          )
                        }
                        aria-label="Buying price per unit"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">
                      {p ? p.amountMoney.toFixed(2) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex min-w-[6.5rem] flex-col gap-0.5">
                        {canSetSellPrice ? (
                          <input
                            className={cn(
                              dashboardInputClass(busy),
                              "text-right font-mono text-sm",
                              (() => {
                                const retail = parseRetailPrice(row.sellPriceStr);
                                const unit = parseNonNeg(row.unitStr);
                                return retail != null && unit != null && retail < unit
                                  ? "text-red-600"
                                  : "";
                              })(),
                            )}
                            value={row.sellPriceStr}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.key === row.key
                                    ? {
                                        ...r,
                                        sellPriceStr: e.target.value,
                                        sellPriceTouched: true,
                                      }
                                    : r,
                                ),
                              )
                            }
                            disabled={busy || !iid}
                            aria-label="Shelf retail price"
                          />
                        ) : (
                          <span className="block py-1.5 text-right font-mono text-sm tabular-nums">
                            {row.sellPriceStr.trim() ? row.sellPriceStr : "—"}
                          </span>
                        )}
                        {hint?.loading ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Loader2 className="size-3 animate-spin" />
                            Pricing…
                          </span>
                        ) : hint?.error ? (
                          <span className="text-[10px] text-muted-foreground">
                            Pricing unavailable
                          </span>
                        ) : (
                          <span className="text-[10px] leading-snug text-muted-foreground">
                            {!canSetSellPrice
                              ? "View only — no shelf-price permission. "
                              : null}
                            {[
                              hint?.currentSellPrice != null
                                ? `Current ${hint.currentSellPrice.toFixed(2)}`
                                : null,
                              hint?.suggestedSellPrice != null
                                ? `Suggested ${hint.suggestedSellPrice.toFixed(2)}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || hint?.note}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        className={cn(
                          dashboardInputClass(busy),
                          "min-w-[8.5rem] text-xs",
                        )}
                        value={row.expiry}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key
                                ? { ...r, expiry: e.target.value }
                                : r,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:bg-destructive/10"
                        disabled={busy}
                        aria-label="Remove row"
                        onClick={() => removeRow(row.key)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {supplier ? (
          <ExtraCostsSection extras={extras} onChange={setExtras} busy={busy} />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Cost
              </p>
              <p className="text-xl font-bold tabular-nums">
                {estimatedProfit.cost.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Revenue
              </p>
              <p className="text-xl font-bold tabular-nums text-emerald-600">
                {estimatedProfit.revenue.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Extras
              </p>
              <p className="text-xl font-bold tabular-nums text-muted-foreground">
                {extrasTotal.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Net profit
              </p>
              <p
                className={cn(
                  "text-xl font-bold tabular-nums",
                  estimatedProfit.profit - extrasTotal >= 0
                    ? "text-emerald-600"
                    : "text-red-600",
                )}
              >
                {(estimatedProfit.profit - extrasTotal).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Margin
              </p>
              <p className="text-xl font-bold tabular-nums">
                {estimatedProfit.revenue > 0
                  ? Math.round(
                      ((estimatedProfit.profit - extrasTotal) /
                        estimatedProfit.revenue) *
                        100,
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
          <p className={cn(dashboardHintClass(), "max-w-sm text-right")}>
            Stock and payables post when you submit. “After” is current stock
            plus qty in (this branch).
          </p>
        </div>
      </div>
    </FormDrawer>
  );
}
