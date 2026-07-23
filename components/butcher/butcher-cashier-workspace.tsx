"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import { Loader2, Minus, Pause, Plus, RotateCcw, Scale, Search, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { ButcherProductTile } from "@/components/butcher/butcher-product-tile";
import { useButcherTheme } from "@/components/butcher/butcher-theme-provider";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { useFeatureFlag } from "@/components/providers/tenant-provider";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useScopeChangeGuard } from "@/hooks/use-scope-change-guard";
import { useButcherSerialScale } from "@/hooks/use-butcher-serial-scale";
import {
  fetchCurrentShift,
  fetchItems,
  fetchVariableWeightBarcode,
  itemListThumbnailUrl,
  tryPostSaleWithRetries,
  type ItemSummaryRecord,
  type SalePaymentMethod,
} from "@/lib/api";
import { posBrandThemeStyle } from "@/lib/brand-theme";
import {
  BUTCHER_QUICK_WEIGHTS_KG,
  resolveButcherSellBy,
  type ButcherSellBy,
} from "@/lib/butcher-pos";
import { formatKg } from "@/lib/butcher-scale";
import {
  butcherCategoryHeaderClass,
  butcherCategoryRailClass,
  butcherChargeButtonClass,
  butcherInputClass,
  butcherPayChipClass,
  butcherPillClass,
} from "@/lib/butcher-pos-chrome";
import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
import {
  POS_DRAFT_FLAGS,
  createPosDraft,
  fetchPosDraft,
  listPosDrafts,
  patchPosDraftLines,
  tryCompletePosDraftWithRetries,
  type CompletePosDraftRequest,
  type PosDraftSummaryResponse,
} from "@/lib/pos-draft-api";
import { Permission, hasPermission } from "@/lib/permissions";
import { fetchPosShelfPrice } from "@/lib/pos-shelf-price";
import { cn } from "@/lib/utils";

type ButcherCartLine = {
  key: string;
  itemId: string;
  label: string;
  sellBy: ButcherSellBy;
  quantity: number;
  unitPrice: number;
};

type ButcherHeldOrder = {
  id: string;
  label: string;
  lines: ButcherCartLine[];
};

type PayMethod = "cash" | "mpesa" | "card";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseMoney(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return round2(n);
}

function lineTotal(line: ButcherCartLine): number {
  return round2(line.quantity * line.unitPrice);
}

function salePaymentMethod(method: PayMethod): SalePaymentMethod {
  if (method === "mpesa") return "mpesa_manual";
  if (method === "card") return "card";
  return "cash";
}

function looksLikeVariableWeightBarcode(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 13 && digits.startsWith("2");
}

function numField(v: number | string): number {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function shelfPriceAmount(
  record: Awaited<ReturnType<typeof fetchPosShelfPrice>>,
): number | null {
  if (!record || record.price == null) return null;
  const n =
    typeof record.price === "string" ? Number(record.price) : record.price;
  return Number.isFinite(n) ? n : null;
}

export function ButcherCashierWorkspace() {
  const online = useOnlineStatus();
  const {
    me,
    branchId,
    branches,
    business,
    itemTypes,
    itemTypesLoading,
    canQuickSale,
  } = useDashboard();
  const { dialogSurfaceClass } = useButcherTheme();

  const currency = business?.currency?.trim() || "KES";
  const bid = branchId?.trim() ?? "";
  const posDraftsEnabled = useFeatureFlag(POS_DRAFT_FLAGS.enabled);
  const posDraftsShadow = useFeatureFlag(POS_DRAFT_FLAGS.shadowWrites);
  const posDraftsUi = useFeatureFlag(POS_DRAFT_FLAGS.uiVisible);
  // Butcher does not implement offline mirror/queueing; it only gates display.
  const posDraftPersistence = posDraftsEnabled || posDraftsShadow;
  const posDraftUiVisible = posDraftsUi || posDraftsEnabled;
  const canPosDraftRead = hasPermission(me?.permissions, Permission.PosDraftsRead);
  const canPosDraftWrite = hasPermission(
    me?.permissions,
    Permission.PosDraftsWrite,
  );
  const showPosDraftPanel =
    posDraftPersistence && posDraftUiVisible && canPosDraftRead;
  const brandTheme = useMemo(
    () => posBrandThemeStyle(business?.branding ?? null),
    [business?.branding],
  );

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemSummaryRecord[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [lines, setLines] = useState<ButcherCartLine[]>([]);
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [splitPay, setSplitPay] = useState(false);
  const [cashTenderStr, setCashTenderStr] = useState("");
  const [cashSplitStr, setCashSplitStr] = useState("");
  const [mpesaSplitStr, setMpesaSplitStr] = useState("");
  const [splitMpesaRef, setSplitMpesaRef] = useState("");
  const [mpesaRef, setMpesaRef] = useState("");
  const [heldOrders, setHeldOrders] = useState<ButcherHeldOrder[]>([]);
  const [posDraftSummaries, setPosDraftSummaries] = useState<
    PosDraftSummaryResponse[]
  >([]);
  const [activePosDraft, setActivePosDraft] = useState<{
    draftId: string;
    version: number;
  } | null>(null);
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const [weightItem, setWeightItem] = useState<ItemSummaryRecord | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightKg, setWeightKg] = useState("0.5");
  const [weightPrice, setWeightPrice] = useState("");
  const [weightKgManual, setWeightKgManual] = useState(false);

  const scale = useButcherSerialScale();
  const scaleConnected = scale.snapshot.status === "connected";

  const scannedVwRef = useRef<Set<string>>(new Set());

  const grandTotal = useMemo(
    () => round2(lines.reduce((sum, l) => sum + lineTotal(l), 0)),
    [lines],
  );

  const orderQty = useMemo(
    () => round2(lines.reduce((sum, l) => sum + l.quantity, 0)),
    [lines],
  );

  const cartScopeBranchIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (lines.length === 0) {
      cartScopeBranchIdRef.current = null;
      return;
    }
    if (!cartScopeBranchIdRef.current && bid) {
      cartScopeBranchIdRef.current = bid;
    }
  }, [lines.length, bid]);

  useScopeChangeGuard(
    "butcher-cart",
    lines.length > 0,
    "This order has items that were added for the current branch.",
  );

  const refreshPosDraftList = useCallback(async () => {
    if (!bid || !showPosDraftPanel) {
      setPosDraftSummaries([]);
      return;
    }
    try {
      const res = await listPosDrafts({
        branchId: bid,
        status: "pending",
      });
      setPosDraftSummaries(res.drafts);
    } catch {
      setPosDraftSummaries([]);
    }
  }, [bid, showPosDraftPanel]);

  useEffect(() => {
    void refreshPosDraftList();
  }, [refreshPosDraftList]);

  const cashChange = useMemo(() => {
    if (splitPay || payMethod !== "cash" || grandTotal <= 0) return null;
    const tender = parseMoney(cashTenderStr);
    if (tender == null || tender < grandTotal) return null;
    return round2(tender - grandTotal);
  }, [cashTenderStr, grandTotal, payMethod, splitPay]);

  const cartQtyByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of lines) {
      map.set(line.itemId, (map.get(line.itemId) ?? 0) + line.quantity);
    }
    return map;
  }, [lines]);

  const loadCatalog = useCallback(async () => {
    if (!bid) {
      setItems([]);
      return;
    }
    setCatalogLoading(true);
    try {
      const rows = await fetchItems(search.trim() || undefined, {
        branchId: bid,
        catalogScope: "SKUS_ONLY",
        itemTypeId: categoryId ?? undefined,
        softAuth: true,
      });
      const sellable = rows.filter((r) => r.groupLabelOnly !== true);
      setItems(sellable);
      if (!online) {
        return;
      }
      const nextPrices: Record<string, number> = {};
      await Promise.all(
        sellable.slice(0, 60).map(async (row) => {
          try {
            const p = await fetchPosShelfPrice(row.id, bid);
            const amount = shelfPriceAmount(p);
            if (amount != null) {
              nextPrices[row.id] = amount;
            }
          } catch {
            /* optional */
          }
        }),
      );
      setPrices((prev) => ({ ...prev, ...nextPrices }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load cuts.");
    } finally {
      setCatalogLoading(false);
    }
  }, [bid, categoryId, online, search]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadCatalog();
    }, search.trim() ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [loadCatalog, search]);

  const addVariableWeightLine = useCallback(
    (resolved: Awaited<ReturnType<typeof fetchVariableWeightBarcode>>) => {
      const quantity = round2(numField(resolved.quantity));
      const unitPrice = round2(numField(resolved.unitPrice));
      if (quantity <= 0 || unitPrice < 0) {
        toast.error("Could not read weight or price from label.");
        return;
      }
      setLines((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          itemId: resolved.itemId,
          label: resolved.itemName,
          sellBy: "kg" as const,
          quantity,
          unitPrice,
        },
      ]);
      setPrices((p) => ({ ...p, [resolved.itemId]: unitPrice }));
      setSearch("");
      setError("");
      toast.success(`Added ${resolved.itemName} (${quantity} kg)`);
    },
    [],
  );

  const tryResolveVariableWeightScan = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!looksLikeVariableWeightBarcode(code) || !bid || !online) return false;
      if (scannedVwRef.current.has(code)) return true;
      try {
        const resolved = await fetchVariableWeightBarcode(code, bid);
        scannedVwRef.current.add(code);
        addVariableWeightLine(resolved);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown scale label.";
        if (/unknown plu|not a variable-weight|not a weighed/i.test(msg)) {
          setError(msg);
          toast.error(msg);
          return true;
        }
        return false;
      }
    },
    [addVariableWeightLine, bid, online],
  );

  useEffect(() => {
    const q = search.trim();
    if (!q || !looksLikeVariableWeightBarcode(q)) return;
    let cancelled = false;
    void (async () => {
      const handled = await tryResolveVariableWeightScan(q);
      if (!cancelled && handled) {
        setSearch("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search, tryResolveVariableWeightScan]);

  const openWeightSheet = useCallback(
    async (item: ItemSummaryRecord) => {
      setWeightItem(item);
      setWeightKg("0.5");
      setWeightKgManual(false);
      const cached = prices[item.id];
      if (cached != null) {
        setWeightPrice(String(cached));
      } else if (bid && online) {
        try {
          const p = await fetchPosShelfPrice(item.id, bid);
          const amount = shelfPriceAmount(p);
          if (amount != null) {
            setWeightPrice(String(amount));
            setPrices((prev) => ({ ...prev, [item.id]: amount }));
          } else {
            setWeightPrice("");
          }
        } catch {
          setWeightPrice("");
        }
      } else {
        setWeightPrice("");
      }
      setWeightOpen(true);
    },
    [bid, online, prices],
  );

  useEffect(() => {
    if (!weightOpen || weightKgManual) return;
    if (!scaleConnected) return;
    const net = scale.snapshot.netKg;
    if (net == null || net <= 0) return;
    if (scale.config.requireStableToAdd && !scale.snapshot.stable) return;
    setWeightKg(formatKg(net));
  }, [
    weightOpen,
    weightKgManual,
    scaleConnected,
    scale.snapshot.netKg,
    scale.snapshot.stable,
    scale.config.requireStableToAdd,
  ]);

  const addPieceLine = useCallback(
    (item: ItemSummaryRecord) => {
      const unitPrice = prices[item.id];
      if (unitPrice == null || !Number.isFinite(unitPrice)) {
        toast.error("Set a shelf price for this item first.");
        return;
      }
      setLines((prev) => {
        const idx = prev.findIndex(
          (l) => l.itemId === item.id && l.sellBy === "piece",
        );
        if (idx >= 0) {
          return prev.map((l, i) =>
            i === idx ? { ...l, quantity: l.quantity + 1 } : l,
          );
        }
        return [
          ...prev,
          {
            key: crypto.randomUUID(),
            itemId: item.id,
            label: cashierItemPrimaryLabel(item),
            sellBy: "piece",
            quantity: 1,
            unitPrice,
          },
        ];
      });
    },
    [prices],
  );

  const onTileClick = useCallback(
    (item: ItemSummaryRecord) => {
      if (resolveButcherSellBy(item) === "kg") {
        void openWeightSheet(item);
        return;
      }
      addPieceLine(item);
    },
    [addPieceLine, openWeightSheet],
  );

  const confirmWeightLine = useCallback(() => {
    if (!weightItem) return;
    if (
      scaleConnected &&
      scale.config.requireStableToAdd &&
      !scale.snapshot.stable
    ) {
      toast.error("Wait for a stable weight from the scale.");
      return;
    }
    const qty = Number(weightKg.replace(",", "."));
    const unitPrice = Number(weightPrice.replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid weight.");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error("Enter a valid price per kg.");
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        itemId: weightItem.id,
        label: cashierItemPrimaryLabel(weightItem),
        sellBy: "kg",
        quantity: qty,
        unitPrice,
      },
    ]);
    setWeightOpen(false);
    setWeightItem(null);
  }, [scale.config.requireStableToAdd, scale.snapshot.stable, scaleConnected, weightItem, weightKg, weightPrice]);

  const updateLineQty = useCallback((key: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.key !== key) return l;
          const next =
            l.sellBy === "piece"
              ? Math.max(1, l.quantity + delta)
              : Math.max(0.001, round2(l.quantity + delta * 0.1));
          return { ...l, quantity: next };
        })
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const resetTenderFields = useCallback(() => {
    setCashTenderStr("");
    setCashSplitStr("");
    setMpesaSplitStr("");
    setSplitMpesaRef("");
    setMpesaRef("");
  }, []);

  const onHoldOrder = useCallback(() => {
    void (async () => {
      setError("");
      if (lines.length === 0) {
        setError("Nothing to hold.");
        return;
      }

      if (showPosDraftPanel && canPosDraftWrite && online && bid) {
        try {
          await createPosDraft({
            branchId: bid,
            clientDraftId: crypto.randomUUID(),
            lines: lines.map((l) => ({
              itemId: l.itemId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
            })),
          });
          setLines([]);
          setHeldOrders([]);
          setActivePosDraft(null);
          resetTenderFields();
          await refreshPosDraftList();
          toast.success("Order held (pending ticket created).");
          return;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Could not hold order.";
          toast.error(msg);
          // Fall back to session-local hold so the counter remains usable.
        }
      }

      setHeldOrders((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          label: `Held ${prev.length + 1}`,
          lines: lines.map((l) => ({ ...l })),
        },
      ]);
      setLines([]);
      setActivePosDraft(null);
      resetTenderFields();
      toast.success("Order held.");
    })();
  }, [
    bid,
    canPosDraftWrite,
    lines,
    online,
    showPosDraftPanel,
    refreshPosDraftList,
    resetTenderFields,
  ]);

  const onRecallHeld = useCallback((heldId: string) => {
    setError("");
    const held = heldOrders.find((h) => h.id === heldId);
    if (!held) return;
    setHeldOrders((prev) => prev.filter((h) => h.id !== heldId));
    setLines(held.lines.map((l) => ({ ...l })));
    resetTenderFields();
    toast.success(`${held.label} recalled.`);
  }, [heldOrders, resetTenderFields]);

  const onRecallPosDraft = useCallback(
    async (draftId: string) => {
      setError("");
      try {
        const draft = await fetchPosDraft(draftId);
        setActivePosDraft({ draftId: draft.id, version: draft.version });
        setHeldOrders([]);
        setSplitPay(false);
        setPayMethod("cash");
        setLines(
          draft.lines.map((l) => {
            const isWhole = Math.abs(l.quantity - Math.round(l.quantity)) < 1e-6;
            const sellBy: ButcherSellBy = isWhole ? "piece" : "kg";
            return {
              key: crypto.randomUUID(),
              itemId: l.itemId,
              label: l.itemName,
              sellBy,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
            };
          }),
        );
        setPrices((prev) => {
          const next = { ...prev };
          for (const l of draft.lines) next[l.itemId] = l.unitPrice;
          return next;
        });
        resetTenderFields();
        toast.success(`Recalled ticket #${draft.ticketNumber}.`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not recall draft.";
        setError(msg);
        toast.error(msg);
      }
    },
    [resetTenderFields],
  );

  const onCharge = useCallback(async () => {
    setError("");
    if (!bid) {
      setError("Choose a branch.");
      return;
    }
    const scopeBranch = cartScopeBranchIdRef.current;
    if (scopeBranch && scopeBranch !== bid) {
      const scopeName =
        branches.find((b) => b.id === scopeBranch)?.name?.trim() ?? scopeBranch;
      const currentName =
        branches.find((b) => b.id === bid)?.name?.trim() ?? bid;
      if (
        !window.confirm(
          `This order was started at ${scopeName} but the current branch is ${currentName}. Complete the sale at ${currentName} anyway?`,
        )
      ) {
        return;
      }
    }
    if (!canQuickSale) {
      setError("You do not have permission to complete sales.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one cut.");
      return;
    }
    let validatedCashAmount: number | null = null;
    let validatedMpesaAmount: number | null = null;
    if (splitPay) {
      const cashAmount = parseMoney(cashSplitStr);
      const mpesaAmount = parseMoney(mpesaSplitStr);
      if (cashAmount == null || mpesaAmount == null || cashAmount <= 0 || mpesaAmount <= 0) {
        setError("Split tender needs positive cash and M-Pesa amounts.");
        return;
      }
      const sum = round2(cashAmount + mpesaAmount);
      if (Math.abs(sum - grandTotal) > 0.001) {
        setError(
          `Split amounts (${sum.toFixed(2)}) must equal total (${grandTotal.toFixed(2)}).`,
        );
        return;
      }
      validatedCashAmount = cashAmount;
      validatedMpesaAmount = mpesaAmount;
    } else if (payMethod === "cash") {
      const tender = parseMoney(cashTenderStr.trim());
      if (tender == null) {
        setError("Enter the amount received from the customer.");
        return;
      }
      if (tender < grandTotal) {
        setError(
          `Amount received (${tender.toFixed(2)}) is less than total (${grandTotal.toFixed(2)}).`,
        );
        return;
      }
    }
    setCharging(true);
    try {
      await fetchCurrentShift(bid);
    } catch (e) {
      setCharging(false);
      const msg = e instanceof Error ? e.message : "No open shift.";
      setError(
        /not\s*found|404|no open shift/i.test(msg)
          ? "Open a shift for this branch before charging."
          : msg,
      );
      return;
    }

    const payments = splitPay
      ? [
          { method: "cash" as const, amount: validatedCashAmount! },
          {
            method: "mpesa_manual" as const,
            amount: validatedMpesaAmount!,
            reference: splitMpesaRef.trim() || null,
          },
        ]
      : [
          {
            method: salePaymentMethod(payMethod),
            amount: grandTotal,
            reference:
              payMethod === "mpesa" ? mpesaRef.trim() || null : null,
          },
        ];

    if (activePosDraft && posDraftPersistence && online) {
      try {
        const patched = await patchPosDraftLines(activePosDraft.draftId, {
          expectedVersion: activePosDraft.version,
          lines: lines.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
        });

        const completeBody: CompletePosDraftRequest = {
          payments,
          clientSoldAt: new Date().toISOString(),
          expectedVersion: patched.version,
        };

        const completeResult = await tryCompletePosDraftWithRetries(
          activePosDraft.draftId,
          completeBody,
          crypto.randomUUID(),
        );

        setCharging(false);
        if (!completeResult.ok) {
          setError(completeResult.message);
          return;
        }

        toast.success("Order charged.");
        setLines([]);
        setActivePosDraft(null);
        resetTenderFields();
        await refreshPosDraftList();
        return;
      } catch (e) {
        setCharging(false);
        const msg = e instanceof Error ? e.message : "Could not complete draft.";
        setError(msg);
        return;
      }
    }

    const result = await tryPostSaleWithRetries(
      {
        branchId: bid,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        payments,
        clientSoldAt: new Date().toISOString(),
      },
      crypto.randomUUID(),
    );
    setCharging(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    toast.success("Order charged.");
    setLines([]);
    setActivePosDraft(null);
    resetTenderFields();
    await refreshPosDraftList();
  }, [
    bid,
    branches,
    canQuickSale,
    cashSplitStr,
    cashTenderStr,
    grandTotal,
    lines,
    mpesaRef,
    mpesaSplitStr,
    payMethod,
    resetTenderFields,
    activePosDraft,
    online,
    posDraftPersistence,
    refreshPosDraftList,
    splitMpesaRef,
    splitPay,
  ]);

  const categories = useMemo(() => {
    const all = { id: null as string | null, label: "All" };
    const types = itemTypes.map((t) => ({ id: t.id, label: t.label }));
    return [all, ...types];
  }, [itemTypes]);

  const weightThumb = weightItem ? itemListThumbnailUrl(weightItem) : null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      {/* Catalog */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col border-[rgb(var(--bp-border))] lg:border-r">
        <div className="relative shrink-0 border-b border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-surface))]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[rgb(var(--bp-fg-muted))]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cuts or scan barcode…"
            className={cn(
              butcherInputClass,
              "h-12 border-0 bg-transparent pl-10 pr-12 focus:ring-0",
            )}
          />
          <button
            type="button"
            className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-none text-[rgb(var(--bp-fg-faint))] transition hover:bg-[rgb(var(--bp-hover))] hover:text-[var(--pos-primary)]"
            aria-label="Scan barcode"
            onClick={() => setShowScanner(true)}
          >
            <ScanLine className="size-4" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel))] p-1.5 scrollbar-none lg:hidden">
          {categories.map((cat) => (
            <button
              key={cat.id ?? "all"}
              type="button"
              onClick={() => setCategoryId(cat.id)}
              className={cn(
                butcherCategoryRailClass(categoryId === cat.id),
                "size-[4.25rem] shrink-0",
              )}
            >
              {cat.label}
            </button>
          ))}
          {itemTypesLoading ? (
            <span className="self-center px-2 text-xs text-[rgb(var(--bp-fg-muted))]">
              Loading…
            </span>
          ) : null}
        </div>

        <div className="min-h-[14rem] flex-1 overflow-y-auto bg-[rgb(var(--bp-bg))] p-2 sm:p-3">
          {catalogLoading ? (
            <div className="flex items-center justify-center py-20 text-[rgb(var(--bp-fg-muted))]">
              <Loader2 className="size-7 animate-spin text-[var(--pos-primary)]" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-20 text-center text-sm text-[rgb(var(--bp-fg-muted))]">
              {bid ? "No cuts found." : "Select a branch to load the catalog."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((item) => (
                <ButcherProductTile
                  key={item.id}
                  item={item}
                  currency={currency}
                  unitPrice={prices[item.id]}
                  cartQty={cartQtyByItem.get(item.id) ?? 0}
                  onPick={() => onTileClick(item)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Category rail — desktop */}
      <aside className="hidden min-h-0 w-[7rem] shrink-0 flex-col border-r border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel))] xl:w-[8rem] lg:flex">
        <div className={butcherCategoryHeaderClass}>Category</div>
        <nav
          aria-label="Product categories"
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-1"
        >
          {categories.map((cat) => (
            <button
              key={cat.id ?? "all"}
              type="button"
              onClick={() => setCategoryId(cat.id)}
              className={butcherCategoryRailClass(categoryId === cat.id)}
            >
              {cat.label}
            </button>
          ))}
          {itemTypesLoading ? (
            <span className="px-1 py-2 text-xs text-[rgb(var(--bp-fg-muted))]">
              Loading…
            </span>
          ) : null}
        </nav>
      </aside>

      {/* Order panel */}
      <aside className="flex min-h-0 w-full shrink-0 flex-col border-t border-[rgb(var(--bp-border))] max-h-[min(44dvh,28rem)] bg-[rgb(var(--bp-surface))] lg:max-h-none lg:h-full lg:w-[min(100%,21rem)] lg:border-t-0 xl:w-[23rem]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel))] px-3 py-2.5">
            <h2 className="text-sm font-bold text-[rgb(var(--bp-fg))]">
              Current order
            </h2>
            <button
              type="button"
              disabled={lines.length === 0 || activePosDraft != null}
              onClick={onHoldOrder}
              className="inline-flex items-center gap-1 rounded-none border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-surface))] px-2 py-1 text-[11px] font-medium text-[rgb(var(--bp-fg-faint))] transition hover:border-[var(--pos-primary)] hover:text-[var(--pos-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Pause className="size-3" />
              Hold
            </button>
          </div>

          {showPosDraftPanel ? (
            posDraftSummaries.filter((d) => d.id !== activePosDraft?.draftId)
              .length > 0 ? (
              <div className="flex shrink-0 flex-wrap gap-1 border-b border-[rgb(var(--bp-border))] px-2 py-2">
                {posDraftSummaries
                  .filter((d) => d.id !== activePosDraft?.draftId)
                  .map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => void onRecallPosDraft(d.id)}
                      className="inline-flex items-center gap-1 rounded-none border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel))] px-2 py-0.5 text-[11px] text-[rgb(var(--bp-fg-soft))] transition hover:border-[var(--pos-primary)] hover:text-[var(--pos-primary)]"
                    >
                      <RotateCcw className="size-3" />
                      #{d.ticketNumber} ({d.lineCount})
                    </button>
                  ))}
              </div>
            ) : null
          ) : heldOrders.length > 0 ? (
            <div className="flex shrink-0 flex-wrap gap-1 border-b border-[rgb(var(--bp-border))] px-2 py-2">
              {heldOrders.map((held) => (
                <button
                  key={held.id}
                  type="button"
                  onClick={() => onRecallHeld(held.id)}
                  className="inline-flex items-center gap-1 rounded-none border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel))] px-2 py-0.5 text-[11px] text-[rgb(var(--bp-fg-soft))] transition hover:border-[var(--pos-primary)] hover:text-[var(--pos-primary)]"
                >
                  <RotateCcw className="size-3" />
                  {held.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {lines.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm leading-relaxed text-[rgb(var(--bp-fg-muted))]">
                No items yet. Tap a cut to add it.
              </p>
            ) : (
              lines.map((line) => (
                <div
                  key={line.key}
                  className="border-b border-[rgb(var(--bp-border))] px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[rgb(var(--bp-fg))]">
                        {line.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[rgb(var(--bp-fg-muted))]">
                        {line.sellBy === "kg"
                          ? `${line.quantity} kg × ${currency} ${line.unitPrice.toFixed(2)}`
                          : `${line.quantity} × ${currency} ${line.unitPrice.toFixed(2)}`}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-[var(--pos-primary)]">
                      {currency} {lineTotal(line).toFixed(2)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-0">
                      <button
                        type="button"
                        className="flex size-8 items-center justify-center rounded-none border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel))] text-[rgb(var(--bp-fg))] hover:border-[var(--pos-primary)] hover:text-[var(--pos-primary)]"
                        aria-label="Decrease"
                        onClick={() => updateLineQty(line.key, -1)}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="flex h-8 min-w-[3.5rem] items-center justify-center border-y border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-surface))] px-2 text-xs font-semibold tabular-nums text-[rgb(var(--bp-fg))]">
                        {line.sellBy === "kg"
                          ? `${line.quantity} kg`
                          : line.quantity}
                      </span>
                      <button
                        type="button"
                        className="flex size-8 items-center justify-center rounded-none border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel))] text-[rgb(var(--bp-fg))] hover:border-[var(--pos-primary)] hover:text-[var(--pos-primary)]"
                        aria-label="Increase"
                        onClick={() => updateLineQty(line.key, 1)}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-medium text-[rgb(var(--bp-fg-muted))] hover:text-red-500"
                      onClick={() => removeLine(line.key)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="shrink-0 border-t border-[rgb(var(--bp-border))]">
            <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel))] px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--bp-fg-muted))]">
                Qty
              </span>
              <span className="text-sm font-bold tabular-nums text-[rgb(var(--bp-fg))]">
                {orderQty.toFixed(3)}
              </span>
            </div>

            <div className="space-y-2.5 p-3">
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ["cash", "Cash"],
                    ["mpesa", "M-Pesa"],
                    ["card", "Card"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    disabled={splitPay}
                    onClick={() => setPayMethod(id)}
                    className={cn(
                      butcherPayChipClass(payMethod === id && !splitPay),
                      splitPay && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSplitPay((v) => !v)}
                className={cn(butcherPillClass(splitPay), "w-full")}
              >
                Split pay (cash + M-Pesa)
              </button>

              {splitPay ? (
                <div className="space-y-2 border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel))] p-2.5">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-[rgb(var(--bp-fg-muted))]">
                      Cash amount ({currency})
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={cashSplitStr}
                      onChange={(e) => setCashSplitStr(e.target.value)}
                      className={butcherInputClass}
                      placeholder="0.00"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-[rgb(var(--bp-fg-muted))]">
                      M-Pesa amount ({currency})
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={mpesaSplitStr}
                      onChange={(e) => setMpesaSplitStr(e.target.value)}
                      className={butcherInputClass}
                      placeholder="0.00"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-[rgb(var(--bp-fg-muted))]">
                      M-Pesa reference (optional)
                    </span>
                    <input
                      type="text"
                      value={splitMpesaRef}
                      onChange={(e) => setSplitMpesaRef(e.target.value)}
                      className={butcherInputClass}
                      placeholder="e.g. QHK7X2"
                    />
                  </label>
                </div>
              ) : payMethod === "cash" ? (
                <div className="space-y-2 border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel))] p-2.5">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-[rgb(var(--bp-fg-muted))]">
                      Amount received ({currency})
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={cashTenderStr}
                      onChange={(e) => setCashTenderStr(e.target.value)}
                      className={butcherInputClass}
                      placeholder={
                        grandTotal > 0 ? grandTotal.toFixed(2) : "0.00"
                      }
                    />
                  </label>
                  {cashChange != null ? (
                    <p className="text-sm text-[rgb(var(--bp-fg-faint))]">
                      Change due:{" "}
                      <span className="font-semibold text-[var(--pos-primary)]">
                        {currency} {cashChange.toFixed(2)}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : payMethod === "mpesa" ? (
                <label className="block space-y-1 border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel))] p-2.5">
                  <span className="text-[11px] font-medium text-[rgb(var(--bp-fg-muted))]">
                    M-Pesa reference (optional)
                  </span>
                  <input
                    type="text"
                    value={mpesaRef}
                    onChange={(e) => setMpesaRef(e.target.value)}
                    className={butcherInputClass}
                    placeholder="e.g. QHK7X2"
                  />
                </label>
              ) : (
                <p className="border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel))] px-2.5 py-2 text-[11px] leading-relaxed text-[rgb(var(--bp-fg-muted))]">
                  Charge the card terminal for{" "}
                  <span className="font-semibold text-[rgb(var(--bp-fg-soft))]">
                    {currency} {grandTotal.toFixed(2)}
                  </span>
                  . No change due.
                </p>
              )}

              {error ? (
                <p className="rounded-none border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
                  {error}
                </p>
              ) : null}
            </div>

            <Button
              type="button"
              disabled={charging || lines.length === 0}
              className={butcherChargeButtonClass}
              style={{
                backgroundColor: "var(--pos-primary)",
                color: "var(--pos-primary-ink)",
              }}
              onClick={() => void onCharge()}
            >
              {charging ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Charging…
                </>
              ) : (
                <span className="flex w-full items-center justify-between px-1">
                  <span>
                    {currency} {grandTotal.toFixed(2)}
                  </span>
                  <span>Pay</span>
                </span>
              )}
            </Button>
          </div>
        </div>
      </aside>

      <Dialog open={weightOpen} onOpenChange={setWeightOpen}>
        <DialogContent
          className={cn(dialogSurfaceClass, "sm:max-w-md")}
          style={brandTheme as CSSProperties}
        >
          <DialogHeader>
            <DialogTitle className="text-[rgb(var(--bp-fg))]">
              {weightItem ? cashierItemPrimaryLabel(weightItem) : "Weight"}
            </DialogTitle>
          </DialogHeader>

          {weightItem && weightThumb ? (
            <div className="relative -mt-1 aspect-[2/1] overflow-hidden rounded-none border border-[rgb(var(--bp-border))]">
              <Image
                src={weightThumb}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--bp-overlay)/0.7)] to-transparent" />
            </div>
          ) : null}

          <div className="space-y-4">
            {scale.supported ? (
              <div className="space-y-2 rounded-none border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel)/0.5)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {scaleConnected ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-[rgb(var(--bp-border))] bg-transparent text-xs text-[rgb(var(--bp-fg-soft))]"
                      onClick={() => void scale.disconnect()}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 border-[rgb(var(--bp-border))] bg-transparent text-xs text-[rgb(var(--bp-fg-soft))]"
                      disabled={scale.snapshot.status === "connecting"}
                      onClick={() => void scale.connect()}
                    >
                      {scale.snapshot.status === "connecting" ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Scale className="size-3" />
                      )}
                      Connect scale
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-[rgb(var(--bp-fg-faint))]"
                    disabled={!scaleConnected || scale.snapshot.grossKg == null}
                    onClick={scale.tare}
                  >
                    Tare
                  </Button>
                  {scale.snapshot.tareKg > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-[rgb(var(--bp-fg-muted))]"
                      onClick={scale.clearTare}
                    >
                      Clear tare
                    </Button>
                  ) : null}
                </div>
                {scaleConnected ? (
                  <p className="text-sm tabular-nums text-[rgb(var(--bp-fg-soft))]">
                    Live:{" "}
                    <span className="font-semibold text-[rgb(var(--bp-fg))]">
                      {scale.snapshot.netKg != null
                        ? `${formatKg(scale.snapshot.netKg)} kg`
                        : "—"}
                    </span>
                    <span
                      className={cn(
                        "ml-2 text-xs font-medium",
                        scale.snapshot.stable
                          ? "text-emerald-500"
                          : "text-amber-500",
                      )}
                    >
                      {scale.snapshot.stable ? "Stable" : "Settling…"}
                    </span>
                    {scale.snapshot.tareKg > 0 ? (
                      <span className="ml-2 text-xs text-[rgb(var(--bp-fg-muted))]">
                        (tare {formatKg(scale.snapshot.tareKg)} kg)
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <p className="text-xs text-[rgb(var(--bp-fg-muted))]">
                    USB scale via Web Serial (Chrome / Edge). Manual entry still
                    works.
                  </p>
                )}
                {scale.snapshot.error ? (
                  <p className="text-xs text-red-400">{scale.snapshot.error}</p>
                ) : null}
              </div>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[rgb(var(--bp-fg-faint))]">
                Weight (kg)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={weightKg}
                onChange={(e) => {
                  setWeightKgManual(true);
                  setWeightKg(e.target.value);
                }}
                className={cn(butcherInputClass, "text-lg")}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {BUTCHER_QUICK_WEIGHTS_KG.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeightKg(String(w))}
                  className={butcherPillClass(weightKg === String(w))}
                >
                  {w} kg
                </button>
              ))}
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[rgb(var(--bp-fg-faint))]">
                Price per kg ({currency})
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={weightPrice}
                onChange={(e) => setWeightPrice(e.target.value)}
                className={butcherInputClass}
              />
            </label>
            {weightKg && weightPrice ? (
              <p className="text-sm text-[rgb(var(--bp-fg-faint))]">
                Line total:{" "}
                <span className="font-semibold text-[var(--pos-primary)]">
                  {currency}{" "}
                  {round2(
                    Number(weightKg.replace(",", ".")) *
                      Number(weightPrice.replace(",", ".")),
                  ).toFixed(2)}
                </span>
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="text-[rgb(var(--bp-fg-faint))] hover:bg-[rgb(var(--bp-hover))] hover:text-[rgb(var(--bp-fg))]"
              onClick={() => setWeightOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="border-0 hover:brightness-110"
              style={{
                backgroundColor: "var(--pos-primary)",
                color: "var(--pos-primary-ink)",
              }}
              disabled={
                scaleConnected &&
                scale.config.requireStableToAdd &&
                !scale.snapshot.stable
              }
              onClick={confirmWeightLine}
            >
              Add to order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showScanner ? (
        <BarcodeScanner
          onScan={(code) => {
            void (async () => {
              const handled = await tryResolveVariableWeightScan(code);
              if (!handled) {
                setSearch(code);
              }
              setShowScanner(false);
            })();
          }}
          onClose={() => setShowScanner(false)}
        />
      ) : null}
    </div>
  );
}
