"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  Truck,
} from "lucide-react";

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
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { supBtnPrimary } from "../../suppliers/_components/supplier-ui-tokens";
import { ExtraCostsSection } from "./extra-costs-section";
import {
  nsdAlert,
  nsdCardInset,
  nsdDropdown,
  nsdFieldLabel,
  nsdInput,
  nsdSelect,
  nsdTableHead,
  nsdTableRow,
  nsdTableRowReady,
  nsdTextarea,
  nsdTotalsPanel,
  nsdVendorChip,
  SupplyDrawerSection,
  SupplyEmptyState,
  SupplyLoadingInline,
  SupplyTableSkeleton,
  SupplyWorkflowRail,
} from "./new-supply-drawer-ui";
import { ProductPickCell } from "./product-pick-cell";
import { SupplyDrawerSummaryPanel } from "./supply-drawer-summary";

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

function sellPricesMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

function formatRowPricingHint(
  hint: RowPricingHint | undefined,
  canSetSellPrice: boolean,
): string {
  const prefix = !canSetSellPrice ? "View only — no shelf-price permission. " : "";
  const cur = hint?.currentSellPrice;
  const sug = hint?.suggestedSellPrice;
  if (cur != null && sug != null && sellPricesMatch(cur, sug)) {
    return `${prefix}Current ${cur.toFixed(2)}`;
  }
  const parts: string[] = [];
  if (cur != null) {
    parts.push(`Current ${cur.toFixed(2)}`);
  }
  if (sug != null) {
    parts.push(`Suggested ${sug.toFixed(2)}`);
  }
  if (parts.length > 0) {
    return `${prefix}${parts.join(" · ")}`;
  }
  return hint?.note?.trim() ? `${prefix}${hint.note}` : prefix.trim() || "—";
}

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

  const selectedBranchName =
    branches.find((b) => b.id === branchId)?.name ?? "";

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

  const lineStats = useMemo(() => {
    let withQty = 0;
    let valid = 0;
    for (const row of rows) {
      if (parsePositiveQty(row.qtyStr) != null) {
        withQty += 1;
      }
      if (linePayload(row)) {
        valid += 1;
      }
    }
    return { totalRows: rows.length, withQty, valid };
  }, [rows]);

  const workflowSteps = useMemo(
    () => [
      { id: "supplier", label: "Supplier", done: supplier != null },
      {
        id: "receipt",
        label: "Receipt",
        done: Boolean(branchId.trim() && receivedAtLocal),
      },
      {
        id: "lines",
        label: "Lines",
        done: lineStats.valid > 0 && duplicateIds.length === 0,
      },
    ],
    [supplier, branchId, receivedAtLocal, lineStats.valid, duplicateIds.length],
  );

  const canPost =
    supplier != null && lineStats.valid > 0 && duplicateIds.length === 0;

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
      onboardingTarget={ONBOARDING_TARGETS.suppliesDrawer}
      onOpenChange={onOpenChange}
      title="New supply"
      description="Record stock received from a vendor. Follow the steps — supplier, receipt, then line quantities."
      width="half"
      appearance="sharp"
      icon={<PackagePlus className="size-5 text-primary" aria-hidden />}
      contextLabel="Purchasing"
      banner={error ? <FormDrawerMessageBanner text={error} sharp /> : undefined}
      footer={
        <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-end gap-4 sm:gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Payable total
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {estimatedProfit.cost.toFixed(2)}
              </p>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              {lineStats.valid} line{lineStats.valid === 1 ? "" : "s"} ready to post
              {supplier ? ` · ${supplier.name}` : ""}.{" "}
              <Link
                className="font-medium text-primary underline-offset-2 hover:underline"
                href={APP_ROUTES.suppliers}
              >
                Supplier links
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-lg px-4"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="new-supply-form"
              className={supBtnPrimary}
              disabled={busy || !canPost}
            >
              {busy ? "Posting…" : "Post supply"}
            </Button>
          </div>
        </div>
      }
    >
      <form
        id="new-supply-form"
        className="flex flex-col gap-6 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
        <SupplyWorkflowRail steps={workflowSteps} />

        <div className="grid gap-6">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <SupplyDrawerSection
                step={1}
                title="Supplier"
                hint="Search by name, code, or linked product."
                className="relative z-30 overflow-visible lg:z-20"
                bodyClassName="overflow-visible p-4 sm:p-5"
              >
                <div className="relative isolate">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    className={cn(nsdInput, "pl-9")}
                    placeholder="Search supplier name, code, or product…"
                    value={supplier ? supplier.name : supplierQuery}
                    onChange={(e) => {
                      setSupplier(null);
                      setSupplierQuery(e.target.value);
                    }}
                    disabled={busy}
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={!supplier && supplierQuery.trim().length > 0}
                  />
            {!supplier && supplierQuery.trim().length > 0 ? (
              <ul className={nsdDropdown} role="listbox">
                {supplierLoading ? (
                  <li
                    className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
                    role="presentation"
                  >
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Searching…
                  </li>
                ) : supplierHits.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-muted-foreground" role="presentation">
                    No match
                  </li>
                ) : (
                  supplierHits.map((s) => (
                    <li key={s.id} role="option">
                      <button
                        type="button"
                        className="flex w-full flex-col items-start px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
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
                  ))
                )}
              </ul>
            ) : null}
          </div>
                {supplier ? (
                  <div className={nsdVendorChip}>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                        Selected vendor
                      </p>
                      <p className="truncate font-semibold text-foreground">
                        {supplier.name}
                      </p>
                      {supplier.code ? (
                        <p className="text-[11px] text-muted-foreground">{supplier.code}</p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 rounded-lg text-xs"
                      disabled={busy}
                      onClick={() => {
                        setSupplier(null);
                        setSupplierQuery("");
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : null}
              </SupplyDrawerSection>

              <SupplyDrawerSection
                step={2}
                title="Receipt details"
                hint="Branch, delivery time, and optional references."
                bodyClassName="p-4 sm:p-5"
              >
                <div className={cn(nsdCardInset, "grid gap-4 p-4 sm:grid-cols-2")}>
          <label className="flex flex-col gap-1.5">
            <span className={nsdFieldLabel}>Receiving branch</span>
            <select
              className={nsdSelect}
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
            <span className={nsdFieldLabel}>Received at</span>
            <input
              type="datetime-local"
              className={nsdInput}
              value={receivedAtLocal}
              onChange={(e) => setReceivedAtLocal(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={nsdFieldLabel}>
              Supplier document / DN ref (optional)
            </span>
            <input
              className={nsdInput}
              value={docRef}
              onChange={(e) => setDocRef(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={nsdFieldLabel}>Notes (optional)</span>
            <textarea
              className={nsdTextarea}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
            />
          </label>
                </div>
              </SupplyDrawerSection>
            </div>

            {supplier ? (
              <ExtraCostsSection extras={extras} onChange={setExtras} busy={busy} />
            ) : null}

            <SupplyDrawerSection
              step={3}
              title="Receiving lines"
              hint="Buying price × quantity drives payables. Scroll horizontally on small screens."
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 rounded-lg text-xs"
                  onClick={addAdhocRow}
                  disabled={busy || !supplier}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add product
                </Button>
              }
              bodyClassName="p-0"
            >
              {!supplier ? (
                <SupplyEmptyState
                  icon={Truck}
                  title="Choose a supplier first"
                  description="Search for your vendor above. Linked catalog products load automatically — or add lines manually."
                />
              ) : linksLoading ? (
                <>
                  <SupplyLoadingInline label="Loading supplier catalog…" />
                  <SupplyTableSkeleton />
                </>
              ) : rows.length === 0 ? (
                <SupplyEmptyState
                  icon={PackagePlus}
                  title="No linked products"
                  description="Link SKUs on the supplier profile, or add products row by row."
                  action={
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1 rounded-lg"
                      onClick={addAdhocRow}
                      disabled={busy}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Add product
                    </Button>
                  }
                />
              ) : (
                <>
                  {duplicateIds.length > 0 ? (
                    <div className={cn(nsdAlert, "m-4 sm:m-5")}>
                      Duplicate products in the grid — keep one row per SKU.
                    </div>
                  ) : null}

                  <p className="border-b border-border bg-muted/25 px-4 py-2 text-[11px] text-muted-foreground sm:px-5">
                    {lineStats.valid} of {lineStats.totalRows} lines ready · highlighted rows
                    have qty and cost
                  </p>

                  <div className="overflow-x-auto">
          <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
            <thead className={nsdTableHead}>
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
                const isReady = p != null;
                return (
                  <tr
                    key={row.key}
                    className={cn(
                      nsdTableRow,
                      "align-top",
                      isReady && nsdTableRowReady,
                    )}
                  >
                    <td className="px-3 py-2">
                      {row.source === "adhoc" ? (
                        <ProductPickCell
                          sharp
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
                        className={cn(nsdInput, "w-16 text-right font-mono text-sm")}
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
                          nsdInput,
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
                              nsdInput,
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
                            {formatRowPricingHint(hint, canSetSellPrice)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        className={cn(
                          nsdInput,
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
                </>
              )}
            </SupplyDrawerSection>

            <div className={nsdTotalsPanel}>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Totals snapshot
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Payable", value: estimatedProfit.cost.toFixed(2) },
                  {
                    label: "Retail",
                    value: estimatedProfit.revenue.toFixed(2),
                    className: "text-emerald-700 dark:text-emerald-300",
                  },
                  { label: "Extras", value: extrasTotal.toFixed(2) },
                  {
                    label: "Net",
                    value: (estimatedProfit.profit - extrasTotal).toFixed(2),
                    className:
                      estimatedProfit.profit - extrasTotal >= 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-600",
                  },
                ].map(({ label, value, className }) => (
                  <div key={label} className="rounded-sm border border-border bg-background px-3 py-2">
                    <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
                      {label}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block font-mono text-sm font-bold tabular-nums",
                        className,
                      )}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <SupplyDrawerSummaryPanel
            supplierName={supplier?.name ?? null}
            branchName={selectedBranchName}
            lineStats={lineStats}
            estimatedProfit={estimatedProfit}
            extrasTotal={extrasTotal}
            canPost={canPost}
          />
        </div>
      </form>
    </FormDrawer>
  );
}
