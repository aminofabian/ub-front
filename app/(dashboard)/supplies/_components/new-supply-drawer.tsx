"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  PackagePlus,
  Plus,
  Trash2,
  Truck,
} from "lucide-react";

import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  addItemSupplierLink,
  addPathBLine,
  addSupplyBatchExpense,
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
import { isBranchLockedRole } from "@/lib/branch-access";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import { useScopeChangeGuard } from "@/hooks/use-scope-change-guard";
import { hasPermission, Permission } from "@/lib/permissions";
import { canAdminEditOnHandStock } from "@/lib/set-on-hand-stock";
import { cn } from "@/lib/utils";
import { YmdDateInput } from "@/components/ymd-date-input";

import { supBtnPrimary } from "../../suppliers/_components/supplier-ui-tokens";
import { DeliverySetupSection } from "./delivery-setup-section";
import {
  LinkSupplierProductModal,
  type LinkSupplierProductDraft,
} from "./add-supply-line-modal";
import {
  nsdAlert,
  nsdTableCell,
  nsdTableHead,
  nsdTableRow,
  nsdTableRowReady,
  nsdTableTh,
  SupplyDrawerSection,
  SupplyEmptyState,
  SupplyLinesToolbar,
  SupplyLoadingInline,
  SupplyTableSkeleton,
  SupplyWorkflowRail,
} from "./new-supply-drawer-ui";
import { ProductPickCell } from "./product-pick-cell";
import { SupplyDraftLineCard } from "./supply-draft-line-card";
import {
  linkReorderLevel,
  rowReferenceCost,
  SupplyCostCell,
  SupplyQtyCell,
  SupplyStockCell,
} from "./supply-line-metric-cells";
import {
  SupplyShelfPriceCell,
  type ShelfPriceHint,
} from "./supply-shelf-price-cell";
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

type RowPricingHint = ShelfPriceHint;

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

/** Prefer last/default link cost, then catalog buying price; treat 0 / blank as unset. */
function positiveMoneyStr(raw: number | string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") {
    return "";
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return "";
  }
  return n.toFixed(2);
}

function linkSeedUnitCost(link: SupplierItemLinkRecord): string {
  return (
    positiveMoneyStr(link.lastCostPrice) ||
    positiveMoneyStr(link.defaultCostPrice) ||
    positiveMoneyStr(link.catalogBuyingPrice)
  );
}

function linkSeedShelfPrice(link: SupplierItemLinkRecord): string {
  return positiveMoneyStr(link.catalogShelfPrice);
}

function unitCostMissing(unitStr: string): boolean {
  const n = parseNonNeg(unitStr);
  return n == null || n <= 0;
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

function rowLineSearchHaystack(row: SupplyDraftRow): string {
  const parts = [
    rowLabel(row),
    rowSku(row),
    rowBarcode(row),
    rowItemId(row),
    row.source === "linked" ? row.link?.supplierSku : null,
  ];
  return parts
    .filter((p): p is string => Boolean(p && p !== "—"))
    .join(" ")
    .toLowerCase();
}

function rowMatchesLineSearch(row: SupplyDraftRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return rowLineSearchHaystack(row).includes(q);
}

function rowStock(row: SupplyDraftRow): number | null {
  if (row.source === "linked" && row.link?.currentStock != null) {
    const n = Number(row.link.currentStock);
    return Number.isFinite(n) ? n : null;
  }
  if (row.item?.stockQty != null && String(row.item.stockQty).trim() !== "") {
    const n = Number(row.item.stockQty);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function applyOnHandToRows(
  prev: SupplyDraftRow[],
  itemId: string,
  nextStock: number,
): SupplyDraftRow[] {
  return prev.map((r) => {
    if (rowItemId(r) !== itemId) {
      return r;
    }
    if (r.source === "linked" && r.link) {
      return { ...r, link: { ...r.link, currentStock: nextStock } };
    }
    if (r.item) {
      return {
        ...r,
        item: { ...r.item, stockQty: nextStock },
      };
    }
    return r;
  });
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
  /** Pre-select a vendor when opening from the suppliers page. */
  initialSupplier?: SupplierRecord | null;
};

export function NewSupplyDrawer({
  open,
  onOpenChange,
  onPosted,
  initialSupplier = null,
}: NewSupplyDrawerProps) {
  const { branches, branchId, setBranchId, branchesLoading, me } =
    useDashboard();
  const canSetSellPrice = hasPermission(
    me?.permissions,
    Permission.PricingSellPriceSet,
  );
  const canLinkProducts = hasPermission(
    me?.permissions,
    Permission.CatalogItemsLinkSuppliers,
  );
  const canEditOnHandStock = canAdminEditOnHandStock(me);
  const branchLocked = isBranchLockedRole(me?.role?.key);

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
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [linkModalSupplierId, setLinkModalSupplierId] = useState<string | null>(
    null,
  );
  const [lineSearchQuery, setLineSearchQuery] = useState("");
  const [lineFocus, setLineFocus] = useState<"all" | "fill" | "ready">("fill");
  const [deliveryExpanded, setDeliveryExpanded] = useState(true);
  const pricingGenRef = useRef(0);
  const linesSectionRef = useRef<HTMLDivElement | null>(null);
  const addLineOpenRef = useRef(false);

  useEffect(() => {
    addLineOpenRef.current = addLineOpen;
  }, [addLineOpen]);

  const handleDrawerOpenChange = useCallback(
    (next: boolean) => {
      if (!next && addLineOpenRef.current) {
        return;
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

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
          unitStr: linkSeedUnitCost(link),
          sellPriceStr: linkSeedShelfPrice(link),
          sellPriceTouched: false,
          expiry: "",
        })),
      );
      if (active.length === 0) {
        setError(
          "No catalog products are linked to this supplier yet. Use Link product or link SKUs on the supplier profile.",
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
      setLineSearchQuery("");
      setLineFocus("fill");
      setDeliveryExpanded(true);
      setAddLineOpen(false);
      setLinkModalSupplierId(null);
      return;
    }
    if (initialSupplier) {
      setSupplier(initialSupplier);
      setSupplierQuery("");
      setSupplierHits([]);
      setDeliveryExpanded(false);
    }
     
  }, [open, defaultReceived, initialSupplier]);

  useEffect(() => {
     
    if (supplier) {
      void loadLinks(supplier.id);
    } else {
      setRows([]);
    }
     
  }, [supplier, loadLinks]);

  useEffect(() => {
    setLineSearchQuery("");
  }, [supplier?.id]);

  /** Only wipe draft shelf prices when the branch actually changes while open. */
  const pricingBranchRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      pricingBranchRef.current = null;
      return;
    }
    if (pricingBranchRef.current === null) {
      pricingBranchRef.current = branchId;
      return;
    }
    if (pricingBranchRef.current === branchId) {
      return;
    }
    pricingBranchRef.current = branchId;
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
    const gen = ++pricingGenRef.current;
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
          if (cancelled || pricingGenRef.current !== gen) {
            return;
          }
          const cur = parseMoneyApi(rec.currentSellPrice);
          const sug = parseMoneyApi(rec.suggestedSellPrice);
          const latestCost = parseMoneyApi(rec.latestUnitCost);
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
              if (rowItemId(r) !== itemId) {
                return r;
              }
              let next = r;
              if (
                unitCostMissing(r.unitStr) &&
                latestCost != null &&
                latestCost > 0
              ) {
                next = { ...next, unitStr: latestCost.toFixed(2) };
              }
              // Prefer live current/suggested shelf over catalog seed when available.
              if (!r.sellPriceTouched) {
                const shelf = cur ?? sug;
                if (shelf != null) {
                  next = { ...next, sellPriceStr: shelf.toFixed(2) };
                }
              }
              return next;
            }),
          );
        } catch {
          if (cancelled || pricingGenRef.current !== gen) {
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
      pricingGenRef.current += 1;
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

  const hasSupplyDraft = useMemo(() => {
    if (!open) return false;
    if (lineStats.valid > 0 || lineStats.withQty > 0) return true;
    if (supplier) return true;
    if (notes.trim() || docRef.trim()) return true;
    if (extras.some((e) => e.amount.trim())) return true;
    return false;
  }, [open, lineStats, supplier, notes, docRef, extras]);

  useScopeChangeGuard(
    "new-supply-drawer",
    hasSupplyDraft,
    "A supply receipt draft is open with lines or delivery details.",
  );

  const needsCount = useMemo(
    () => rows.filter((row) => parsePositiveQty(row.qtyStr) == null).length,
    [rows],
  );

  const visibleRows = useMemo(() => {
    let list = rows;
    if (lineFocus === "fill") {
      list = list.filter((row) => parsePositiveQty(row.qtyStr) == null);
    } else if (lineFocus === "ready") {
      list = list.filter((row) => linePayload(row) != null);
    }
    const q = lineSearchQuery.trim();
    if (!q) {
      return list;
    }
    return list.filter((row) => rowMatchesLineSearch(row, q));
  }, [rows, lineSearchQuery, lineFocus]);

  const focusNextEmptyQty = useCallback((afterKey: string) => {
    const keys = rows.map((r) => r.key);
    const start = keys.indexOf(afterKey);
    if (start < 0) return;
    for (let i = 1; i <= keys.length; i++) {
      const row = rows[(start + i) % keys.length];
      if (!row || parsePositiveQty(row.qtyStr) != null) continue;
      window.requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-nsd-row="${row.key}"] [data-nsd-qty]`,
        ) as HTMLInputElement | null;
        el?.focus();
        el?.select();
      });
      return;
    }
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

  const openLinkModal = () => {
    const sid = supplier?.id?.trim();
    if (!sid) {
      return;
    }
    setLinkModalSupplierId(sid);
    // Defer so the opening click is not treated as an outside dismiss on the nested dialog.
    window.setTimeout(() => setAddLineOpen(true), 0);
  };

  const linkProductFromModal = async (draft: LinkSupplierProductDraft) => {
    const supplierId = draft.supplierId.trim();
    if (!supplierId) {
      throw new Error("Select a supplier first.");
    }
    if (!canLinkProducts) {
      throw new Error("You do not have permission to link products to suppliers.");
    }

    await addItemSupplierLink(draft.item.id, {
      supplierId,
      supplierSku: draft.supplierSku,
      defaultCostPrice: draft.defaultCostPrice,
    });

    const links = await fetchSupplierItemLinks(supplierId);
    const link = links.find(
      (l) => l.itemId === draft.item.id && l.active,
    );
    if (!link) {
      throw new Error("Product linked but catalog row could not be loaded.");
    }

    const seeded = linkSeedUnitCost(link);
    const draftCost =
      draft.defaultCostPrice != null && draft.defaultCostPrice > 0
        ? String(draft.defaultCostPrice)
        : "";
    const defaultUnit = seeded || draftCost;

    setRows((prev) => {
      const idx = prev.findIndex((row) => rowItemId(row) === draft.item.id);
      const catalogShelf = linkSeedShelfPrice(link);
      const preserved =
        idx >= 0
          ? {
              qtyStr: prev[idx].qtyStr,
              sellPriceStr: prev[idx].sellPriceStr.trim() || catalogShelf,
              sellPriceTouched: prev[idx].sellPriceTouched,
              expiry: prev[idx].expiry,
            }
          : {
              qtyStr: "",
              sellPriceStr: catalogShelf,
              sellPriceTouched: false,
              expiry: "",
            };

      const linkedRow: SupplyDraftRow = {
        key: idx >= 0 ? prev[idx].key : newRowKey(),
        source: "linked",
        link,
        item: null,
        unitStr: defaultUnit,
        ...preserved,
      };

      if (idx >= 0) {
        return prev.map((row, i) => (i === idx ? linkedRow : row));
      }
      return [...prev, linkedRow];
    });

    window.requestAnimationFrame(() => {
      linesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
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
    <>
    <FormDrawer
      open={open}
      onboardingTarget={ONBOARDING_TARGETS.suppliesDrawer}
      onOpenChange={handleDrawerOpenChange}
      title="New supply"
      width="full"
      appearance="sharp"
      headerDensity="compact"
      icon={<PackagePlus className="size-3.5 text-primary" aria-hidden />}
      contextLabel="Purchasing"
      banner={error ? <FormDrawerMessageBanner text={error} sharp /> : undefined}
      footer={
        <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex min-w-0 items-center justify-between gap-3 sm:flex-row sm:items-baseline sm:justify-start sm:gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Payable
              </span>
              <p className="font-mono text-xl font-bold tabular-nums text-foreground sm:text-base">
                {estimatedProfit.cost.toFixed(2)}
              </p>
            </div>
            <p className="truncate text-[11px] text-muted-foreground sm:text-[10px]">
              {lineStats.valid}/{lineStats.totalRows} ready
              {supplier ? ` · ${supplier.name}` : ""}
              {canPost ? (
                <span className="ml-1 font-semibold text-primary">· Ready</span>
              ) : null}
            </p>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-2 sm:flex sm:shrink-0 sm:items-center sm:gap-1.5">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-4 text-sm touch-manipulation sm:h-7 sm:rounded-sm sm:px-2.5 sm:text-xs"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="new-supply-form"
              className={cn(
                supBtnPrimary,
                "h-12 rounded-xl px-4 text-[15px] font-semibold touch-manipulation sm:h-7 sm:rounded-sm sm:px-2.5 sm:text-xs sm:font-medium",
              )}
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
        className="flex flex-col gap-2 pb-0"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
        <SupplyWorkflowRail steps={workflowSteps} />

        <div className="grid min-h-0 gap-2 lg:grid-cols-[minmax(0,1fr)_min(13rem,20%)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-2">
            <SupplyDrawerSection
              step={1}
              title="Delivery"
              hint={
                deliveryExpanded || !supplier
                  ? "Pick vendor & receipt time — then fill lines."
                  : undefined
              }
              done={
                supplier != null &&
                Boolean(branchId.trim() && receivedAtLocal)
              }
              className="relative z-30 overflow-visible lg:z-20"
              bodyClassName="overflow-visible p-2 sm:p-2.5"
            >
              <DeliverySetupSection
                busy={busy}
                supplier={supplier}
                supplierQuery={supplierQuery}
                supplierHits={supplierHits}
                supplierLoading={supplierLoading}
                onSupplierQueryChange={setSupplierQuery}
                onSelectSupplier={(s) => {
                  setSupplier(s);
                  setSupplierQuery("");
                  setSupplierHits([]);
                  setDeliveryExpanded(false);
                }}
                onClearSupplier={() => {
                  setSupplier(null);
                  setSupplierQuery("");
                  setDeliveryExpanded(true);
                }}
                branchId={branchId}
                branches={branches}
                branchesLoading={branchesLoading}
                branchLocked={branchLocked}
                selectedBranchName={selectedBranchName}
                onBranchChange={setBranchId}
                receivedAtLocal={receivedAtLocal}
                onReceivedAtChange={setReceivedAtLocal}
                docRef={docRef}
                onDocRefChange={setDocRef}
                notes={notes}
                onNotesChange={setNotes}
                extras={extras}
                onExtrasChange={setExtras}
                showExtras={supplier != null && deliveryExpanded}
                collapsed={!deliveryExpanded && supplier != null}
                onToggleCollapsed={() =>
                  setDeliveryExpanded((open) => !open)
                }
              />
            </SupplyDrawerSection>

            <div ref={linesSectionRef}>
            <SupplyDrawerSection
              step={2}
              title="Receive"
              hint="Tab through qty → cost → shelf. Enter jumps to next empty qty."
              done={lineStats.valid > 0 && duplicateIds.length === 0}
              className="overflow-visible"
              action={
                canLinkProducts ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1 rounded-sm px-2.5 text-xs touch-manipulation sm:h-7 sm:gap-0.5 sm:px-2 sm:text-[10px]"
                  onClick={openLinkModal}
                  disabled={busy || !supplier}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Link
                </Button>
                ) : null
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
                  description="Link SKUs on the supplier profile, or use Link product to add catalog items."
                  action={
                    canLinkProducts ? (
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1 rounded-lg"
                      onClick={openLinkModal}
                      disabled={busy || !supplier}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Link product
                    </Button>
                    ) : null
                  }
                />
              ) : (
                <>
                  {duplicateIds.length > 0 ? (
                    <div className={cn(nsdAlert, "m-2")}>
                      Duplicate products in the grid — keep one row per SKU.
                    </div>
                  ) : null}

                  <SupplyLinesToolbar
                    searchQuery={lineSearchQuery}
                    onSearchChange={setLineSearchQuery}
                    visibleCount={visibleRows.length}
                    totalCount={rows.length}
                    readyCount={lineStats.valid}
                    needsCount={needsCount}
                    lineFocus={lineFocus}
                    onLineFocusChange={setLineFocus}
                    disabled={busy}
                  />

                  {visibleRows.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        {lineSearchQuery.trim()
                          ? `No lines match “${lineSearchQuery.trim()}”.`
                          : lineFocus === "fill"
                            ? "All quantities entered — switch to All to finish cost & shelf."
                            : lineFocus === "ready"
                              ? "No ready lines yet — enter qty & cost."
                              : "No lines to show."}
                      </p>
                      {lineFocus !== "all" && !lineSearchQuery.trim() ? (
                        <button
                          type="button"
                          className="mt-2 text-xs font-semibold text-primary underline-offset-2 hover:underline"
                          onClick={() => setLineFocus("all")}
                        >
                          Show all lines
                        </button>
                      ) : null}
                    </div>
                  ) : (
                  <>
                  <div className="space-y-1.5 p-2 lg:hidden">
                    {visibleRows.map((row) => {
                      const p = linePayload(row);
                      const stock = rowStock(row);
                      const qty = parsePositiveQty(row.qtyStr);
                      const stockAfter =
                        stock != null && qty != null ? stock + qty : null;
                      const iid = rowItemId(row);
                      const hint = iid ? rowPricing[iid] : undefined;
                      const unitCost = parseNonNeg(row.unitStr);
                      const referenceCost =
                        row.source === "linked" ? rowReferenceCost(row.link) : null;
                      const reorderLevel =
                        row.source === "linked" ? linkReorderLevel(row.link) : null;
                      return (
                        <div key={row.key} data-nsd-row={row.key}>
                        <SupplyDraftLineCard
                          row={row}
                          label={rowLabel(row)}
                          barcode={rowBarcode(row)}
                          busy={busy}
                          canSetSellPrice={canSetSellPrice}
                          isReady={p != null}
                          stock={stock}
                          stockAfter={stockAfter}
                          lineTotal={p?.amountMoney ?? null}
                          qty={qty}
                          unitCost={unitCost}
                          referenceCost={referenceCost}
                          reorderLevel={reorderLevel}
                          pricingHint={hint}
                          hasItemId={Boolean(iid)}
                          branchId={branchId}
                          canEditStock={canEditOnHandStock && Boolean(iid)}
                          itemId={iid}
                          onStockChange={(next) => {
                            if (!iid) return;
                            setRows((prev) => applyOnHandToRows(prev, iid, next));
                          }}
                          onQtyChange={(value) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.key === row.key ? { ...r, qtyStr: value } : r,
                              ),
                            )
                          }
                          onUnitChange={(value) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.key === row.key ? { ...r, unitStr: value } : r,
                              ),
                            )
                          }
                          onSellPriceChange={(value) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.key === row.key
                                  ? {
                                      ...r,
                                      sellPriceStr: value,
                                      sellPriceTouched: true,
                                    }
                                  : r,
                              ),
                            )
                          }
                          onExpiryChange={(value) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.key === row.key ? { ...r, expiry: value } : r,
                              ),
                            )
                          }
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
                          onRemove={() => removeRow(row.key)}
                          onQtyEnterNext={() => focusNextEmptyQty(row.key)}
                        />
                        </div>
                      );
                    })}
                  </div>

                  <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead className={nsdTableHead}>
              <tr>
                <th className={cn(nsdTableTh, "min-w-[8rem] py-1")}>Product</th>
                <th className={cn(nsdTableTh, "min-w-[3.5rem] py-1 text-right")}>
                  Stock
                </th>
                <th className={cn(nsdTableTh, "min-w-[3.75rem] py-1 text-right")}>
                  Qty
                </th>
                <th className={cn(nsdTableTh, "min-w-[4rem] py-1 text-right")}>
                  Cost
                </th>
                <th className={cn(nsdTableTh, "min-w-[4.5rem] py-1 text-right")}>
                  Shelf
                </th>
                <th className={cn(nsdTableTh, "w-[6rem] py-1")}>Expiry</th>
                <th className={cn(nsdTableTh, "w-7 py-1")} />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const p = linePayload(row);
                const stock = rowStock(row);
                const qty = parsePositiveQty(row.qtyStr);
                const stockAfter =
                  stock != null && qty != null ? stock + qty : null;
                const iid = rowItemId(row);
                const hint = iid ? rowPricing[iid] : undefined;
                const isReady = p != null;
                const unitCost = parseNonNeg(row.unitStr);
                const referenceCost =
                  row.source === "linked" ? rowReferenceCost(row.link) : null;
                const reorderLevel =
                  row.source === "linked" ? linkReorderLevel(row.link) : null;
                return (
                  <tr
                    key={row.key}
                    data-nsd-row={row.key}
                    className={cn(
                      nsdTableRow,
                      isReady && nsdTableRowReady,
                    )}
                  >
                    <td className={cn(nsdTableCell, "py-0.5")}>
                      <div className="min-w-0">
                        {row.source === "adhoc" ? (
                          <ProductPickCell
                            sharp
                            branchId={branchId}
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
                          <div
                            className="max-w-[12rem] truncate text-[13px] font-medium leading-snug"
                            title={rowLabel(row)}
                          >
                            {rowLabel(row)}
                          </div>
                        )}
                        {rowBarcode(row) !== "—" ? (
                          <p className="mt-0.5 break-all font-mono text-[9px] leading-snug text-muted-foreground">
                            {rowBarcode(row)}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className={cn(nsdTableCell, "min-w-[3.5rem] py-0.5 align-top")}>
                      <SupplyStockCell
                        compact
                        stock={stock}
                        reorderLevel={reorderLevel}
                        canEdit={canEditOnHandStock && Boolean(iid)}
                        itemId={iid}
                        branchId={branchId}
                        unitCostHint={unitCost ?? referenceCost}
                        disabled={busy}
                        onStockChange={(next) => {
                          if (!iid) return;
                          setRows((prev) => applyOnHandToRows(prev, iid, next));
                        }}
                      />
                    </td>
                    <td className={cn(nsdTableCell, "min-w-[3.75rem] py-0.5 align-top")}>
                      <SupplyQtyCell
                        compact
                        value={row.qtyStr}
                        stockAfter={stockAfter}
                        onChange={(value) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key ? { ...r, qtyStr: value } : r,
                            ),
                          )
                        }
                        onEnterNext={() => focusNextEmptyQty(row.key)}
                        disabled={busy}
                        isReady={isReady}
                      />
                    </td>
                    <td className={cn(nsdTableCell, "min-w-[4rem] py-0.5 align-top")}>
                      <SupplyCostCell
                        compact
                        value={row.unitStr}
                        lineTotal={p?.amountMoney ?? null}
                        onChange={(value) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key ? { ...r, unitStr: value } : r,
                            ),
                          )
                        }
                        disabled={busy}
                        referenceCost={referenceCost}
                      />
                    </td>
                    <td className={cn(nsdTableCell, "min-w-[4.5rem] py-0.5 align-top")}>
                      <SupplyShelfPriceCell
                        compact
                        value={row.sellPriceStr}
                        onChange={(value) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key
                                ? {
                                    ...r,
                                    sellPriceStr: value,
                                    sellPriceTouched: true,
                                  }
                                : r,
                            ),
                          )
                        }
                        disabled={busy || !iid}
                        canSetSellPrice={canSetSellPrice}
                        hint={hint}
                        unitStr={row.unitStr}
                        sellPriceTouched={row.sellPriceTouched}
                      />
                    </td>
                    <td className={cn(nsdTableCell, "py-0.5")}>
                      <YmdDateInput
                        value={row.expiry}
                        onValueChange={(value) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key ? { ...r, expiry: value } : r,
                            ),
                          )
                        }
                        disabled={busy}
                        compact
                        placeholder="Exp"
                        aria-label="Expiry date"
                      />
                    </td>
                    <td className={cn(nsdTableCell, "py-0.5")}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 text-destructive hover:bg-destructive/10"
                        disabled={busy}
                        aria-label="Remove row"
                        onClick={() => removeRow(row.key)}
                      >
                        <Trash2 className="size-3.5" />
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
                </>
              )}
            </SupplyDrawerSection>
            </div>
          </div>

          <SupplyDrawerSummaryPanel
            className="hidden lg:flex lg:sticky lg:top-0"
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

    <LinkSupplierProductModal
      open={addLineOpen}
      onOpenChange={(next) => {
        setAddLineOpen(next);
        if (!next) {
          setLinkModalSupplierId(null);
        }
      }}
      branchId={branchId}
      supplierId={linkModalSupplierId ?? supplier?.id ?? null}
      supplierName={supplier?.name ?? null}
      busy={busy}
      onLink={linkProductFromModal}
    />
    </>
  );
}
