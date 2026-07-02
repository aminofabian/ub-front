"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import { useButcherTheme } from "@/components/butcher/butcher-theme-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { YmdDateInput } from "@/components/ymd-date-input";
import {
  addPathBLine,
  createPathBSession,
  deletePathBLine,
  fetchItemById,
  fetchPathAPurchaseOrder,
  fetchPathAPurchaseOrders,
  fetchPathBSession,
  fetchPathBSessions,
  fetchSupplierItemLinks,
  patchPathBLine,
  postPathAGoodsReceipt,
  postPathAGrnSupplierInvoice,
  postPathBSession,
  type ItemDetailRecord,
  type ItemSummaryRecord,
  type PathAPurchaseOrderListRowRecord,
  type PathBLineRecord,
  type PathBSessionListRowRecord,
  type SupplierItemLinkRecord,
  type SupplierRecord,
} from "@/lib/api";
import { posBrandThemeStyle } from "@/lib/brand-theme";
import {
  butcherChargeButtonClass,
  butcherInputClass,
} from "@/lib/butcher-pos-chrome";
import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import {
  buildPurchaseUnitOptions,
  computeReceiveMarginHint,
  defaultPurchaseUnit,
  linePurchaseTotal,
  parseCostMoney,
  parsePurchaseQty,
  resolveStockReceiptLine,
} from "@/lib/purchase-unit-conversion";
import { cn } from "@/lib/utils";

type ReceiptMode = "pathB" | "pathA";

type StockLineDraft = {
  key: string;
  serverLineId: string | null;
  lineStatus: string | null;
  poLineId: string | null;
  poOpenQty: number | null;
  itemId: string;
  itemName: string;
  qtyStr: string;
  unit: string;
  costPerUnitStr: string;
  itemDetail: ItemDetailRecord | null;
  variants: ItemSummaryRecord[];
  detailLoading: boolean;
  receiveSelected: boolean;
};

function newLineKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyLine(): StockLineDraft {
  return {
    key: newLineKey(),
    serverLineId: null,
    lineStatus: null,
    poLineId: null,
    poOpenQty: null,
    itemId: "",
    itemName: "",
    qtyStr: "1",
    unit: "kg",
    costPerUnitStr: "",
    itemDetail: null,
    variants: [],
    detailLoading: false,
    receiveSelected: true,
  };
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function instantToYmd(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return todayYmd();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymdToInstantIso(ymd: string): string {
  const parts = ymd.trim().split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return new Date().toISOString();
  }
  const [y, m, d] = parts;
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0).toISOString();
}

function linkCostPrice(link: SupplierItemLinkRecord | undefined): string {
  if (!link) return "";
  const last = link.lastCostPrice;
  if (last != null && String(last).trim() !== "") return String(last);
  const def = link.defaultCostPrice;
  if (def != null && String(def).trim() !== "") return String(def);
  return "";
}

function parseMoneyApi(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : 0;
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseReferenceFromNotes(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  const first = raw.split("\n")[0]?.trim() ?? "";
  const prefix = "Supplier ref:";
  if (first.toLowerCase().startsWith(prefix.toLowerCase())) {
    return first.slice(prefix.length).trim();
  }
  return "";
}

function notesWithoutReference(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  const lines = raw.split("\n");
  if (
    lines[0]?.trim().toLowerCase().startsWith("supplier ref:") &&
    lines.length > 1
  ) {
    return lines.slice(1).join("\n").trim();
  }
  if (lines[0]?.trim().toLowerCase().startsWith("supplier ref:")) {
    return "";
  }
  return raw.trim();
}

function isLinePosted(status: string | null | undefined): boolean {
  return (status ?? "").toUpperCase() === "LINE_POSTED";
}

function linePayload(row: StockLineDraft): {
  description: string;
  amountMoney: number;
  suggestedItemId: string;
} | null {
  const qty = parsePurchaseQty(row.qtyStr);
  const cost = parseCostMoney(row.costPerUnitStr);
  if (!row.itemId.trim() || qty == null || cost == null) return null;
  const amountMoney = linePurchaseTotal(qty, cost);
  if (amountMoney <= 0) return null;
  const sku = row.itemDetail?.sku?.trim() || "—";
  return {
    description: `${row.itemName} (${sku})`,
    amountMoney,
    suggestedItemId: row.itemId,
  };
}

type ButcherAddStockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: SupplierRecord[];
  initialSupplierId?: string | null;
  initialSessionId?: string | null;
  currency: string;
  onCompleted?: () => void;
};

export function ButcherAddStockDialog({
  open,
  onOpenChange,
  suppliers,
  initialSupplierId = null,
  initialSessionId = null,
  currency,
  onCompleted,
}: ButcherAddStockDialogProps) {
  const { business, branchId, canPathBWrite, canPathBRead, canPathARead, canPathAWrite } =
    useDashboard();
  const { dialogSurfaceClass } = useButcherTheme();
  const brandTheme = useMemo(
    () => posBrandThemeStyle(business?.branding ?? null),
    [business?.branding],
  );

  const [supplierId, setSupplierId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [receiptMode, setReceiptMode] = useState<ReceiptMode>("pathB");
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
  const [poNumber, setPoNumber] = useState<string | null>(null);
  const [poBranchId, setPoBranchId] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState(todayYmd);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<StockLineDraft[]>([emptyLine()]);
  const [productLinks, setProductLinks] = useState<SupplierItemLinkRecord[]>(
    [],
  );
  const [linksLoading, setLinksLoading] = useState(false);
  const [openDrafts, setOpenDrafts] = useState<PathBSessionListRowRecord[]>([]);
  const [sentPos, setSentPos] = useState<PathAPurchaseOrderListRowRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyMode, setBusyMode] = useState<"draft" | "receive" | null>(null);
  const originalServerLineIdsRef = useRef<Set<string>>(new Set());
  const resumeSessionIdRef = useRef<string | null>(null);

  const resetForm = useCallback(() => {
    setSupplierId(initialSupplierId?.trim() || "");
    setSessionId(null);
    setReceiptMode("pathB");
    setPurchaseOrderId(null);
    setPoNumber(null);
    setPoBranchId(null);
    setDeliveryDate(todayYmd());
    setReference("");
    setNotes("");
    setLines([emptyLine()]);
    originalServerLineIdsRef.current = new Set();
    resumeSessionIdRef.current = initialSessionId?.trim() || null;
  }, [initialSupplierId, initialSessionId]);

  const loadItemDetailForRow = useCallback(
    async (
      lineKey: string,
      itemId: string,
      link: SupplierItemLinkRecord | undefined,
      seed?: { qtyStr?: string; costPerUnitStr?: string; unit?: string },
    ) => {
      setLines((prev) =>
        prev.map((row) =>
          row.key === lineKey
            ? {
                ...row,
                detailLoading: true,
                itemId,
                itemName: link?.itemName ?? row.itemName,
              }
            : row,
        ),
      );
      try {
        const detail = await fetchItemById(itemId, { branchId });
        const variants = detail.variants ?? [];
        const unit = seed?.unit ?? defaultPurchaseUnit(detail, link);
        const cost =
          seed?.costPerUnitStr?.trim() ||
          linkCostPrice(link) ||
          (detail.buyingPrice != null ? String(detail.buyingPrice) : "");
        setLines((prev) =>
          prev.map((row) =>
            row.key === lineKey
              ? {
                  ...row,
                  itemId,
                  itemName: link?.itemName ?? itemCatalogDisplayTitle(detail),
                  itemDetail: detail,
                  variants,
                  unit,
                  qtyStr: seed?.qtyStr ?? row.qtyStr,
                  costPerUnitStr:
                    seed?.costPerUnitStr?.trim() || row.costPerUnitStr || cost,
                  detailLoading: false,
                }
              : row,
          ),
        );
      } catch {
        setLines((prev) =>
          prev.map((row) =>
            row.key === lineKey ? { ...row, detailLoading: false } : row,
          ),
        );
        toast.error("Could not load product details.");
      }
    },
    [branchId],
  );

  const hydrateSession = useCallback(
    async (sid: string, links: SupplierItemLinkRecord[]) => {
      setSessionLoading(true);
      try {
        const session = await fetchPathBSession(sid);
        setReceiptMode("pathB");
        setPurchaseOrderId(null);
        setPoNumber(null);
        setPoBranchId(null);
        setSessionId(session.id);
        setSupplierId(session.supplierId);
        setDeliveryDate(instantToYmd(session.receivedAt));
        setReference(parseReferenceFromNotes(session.notes));
        setNotes(notesWithoutReference(session.notes));
        originalServerLineIdsRef.current = new Set(
          (session.lines ?? []).map((l) => l.id),
        );

        const pendingOrAll = (session.lines ?? []).filter(
          (l) => !isLinePosted(l.lineStatus),
        );
        const sourceLines =
          pendingOrAll.length > 0 ? session.lines ?? [] : session.lines ?? [];

        if (sourceLines.length === 0) {
          setLines([emptyLine()]);
          return;
        }

        const draftRows: StockLineDraft[] = sourceLines.map(
          (serverLine: PathBLineRecord) => {
            const amount = parseMoneyApi(serverLine.amountMoney);
            const itemId = serverLine.suggestedItemId?.trim() ?? "";
            const link = links.find((l) => l.itemId === itemId);
            const name =
              link?.itemName ??
              serverLine.descriptionText.split(" (")[0]?.trim() ??
              "Product";
            return {
              key: newLineKey(),
              serverLineId: serverLine.id,
              lineStatus: serverLine.lineStatus,
              poLineId: null,
              poOpenQty: null,
              itemId,
              itemName: name,
              qtyStr: "1",
              unit: "kg",
              costPerUnitStr: amount > 0 ? String(amount) : "",
              itemDetail: null,
              variants: [],
              detailLoading: Boolean(itemId),
              receiveSelected: !isLinePosted(serverLine.lineStatus),
            };
          },
        );
        setLines(draftRows);

        for (const row of draftRows) {
          if (!row.itemId) continue;
          const link = links.find((l) => l.itemId === row.itemId);
          void loadItemDetailForRow(row.key, row.itemId, link, {
            qtyStr: row.qtyStr,
            costPerUnitStr: row.costPerUnitStr,
            unit: row.unit,
          });
        }
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not load draft session.",
        );
      } finally {
        setSessionLoading(false);
      }
    },
    [loadItemDetailForRow],
  );

  const hydratePurchaseOrder = useCallback(
    async (poId: string, links: SupplierItemLinkRecord[]) => {
      if (!canPathAWrite) {
        toast.error("You do not have permission to receive purchase orders.");
        return;
      }
      setSessionLoading(true);
      try {
        const po = await fetchPathAPurchaseOrder(poId);
        setReceiptMode("pathA");
        setPurchaseOrderId(po.id);
        setPoNumber(po.poNumber);
        setPoBranchId(po.branchId);
        setSessionId(null);
        setSupplierId(po.supplierId);
        setDeliveryDate(po.expectedDate?.trim() || todayYmd());
        setReference("");
        setNotes(po.notes?.trim() ?? "");
        originalServerLineIdsRef.current = new Set();

        const openLines = (po.lines ?? []).filter((pol) => {
          const open =
            parseMoneyApi(pol.qtyOrdered) - parseMoneyApi(pol.qtyReceived);
          return open > 0;
        });

        if (openLines.length === 0) {
          toast.message("PO fully received", {
            description: `PO ${po.poNumber} has no open lines.`,
          });
          setReceiptMode("pathB");
          setPurchaseOrderId(null);
          setPoNumber(null);
          setPoBranchId(null);
          setLines([emptyLine()]);
          return;
        }

        const draftRows: StockLineDraft[] = openLines.map((pol) => {
          const open =
            parseMoneyApi(pol.qtyOrdered) - parseMoneyApi(pol.qtyReceived);
          const itemId = pol.itemId.trim();
          const link = links.find((l) => l.itemId === itemId);
          const cost = String(parseMoneyApi(pol.unitEstimatedCost));
          return {
            key: newLineKey(),
            serverLineId: null,
            lineStatus: null,
            poLineId: pol.id,
            poOpenQty: open,
            itemId,
            itemName: link?.itemName ?? "Product",
            qtyStr: String(open),
            unit: "kg",
            costPerUnitStr: cost,
            itemDetail: null,
            variants: [],
            detailLoading: Boolean(itemId),
            receiveSelected: true,
          };
        });
        setLines(draftRows);

        for (const row of draftRows) {
          if (!row.itemId) continue;
          const link = links.find((l) => l.itemId === row.itemId);
          void loadItemDetailForRow(row.key, row.itemId, link, {
            qtyStr: row.qtyStr,
            costPerUnitStr: row.costPerUnitStr,
            unit: row.unit,
          });
        }
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not load purchase order.",
        );
      } finally {
        setSessionLoading(false);
      }
    },
    [canPathAWrite, loadItemDetailForRow],
  );

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!open || !supplierId.trim()) {
      setProductLinks([]);
      return;
    }
    let cancelled = false;
    setLinksLoading(true);
    void fetchSupplierItemLinks(supplierId.trim())
      .then((links) => {
        if (cancelled) return;
        const active = links.filter((l) => l.active);
        setProductLinks(active);
        const resumeId = resumeSessionIdRef.current;
        if (resumeId) {
          resumeSessionIdRef.current = null;
          void hydrateSession(resumeId, active);
        }
      })
      .catch(() => {
        if (!cancelled) setProductLinks([]);
      })
      .finally(() => {
        if (!cancelled) setLinksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, supplierId, hydrateSession]);

  useEffect(() => {
    if (!open || !supplierId.trim() || (!canPathBRead && !canPathARead)) {
      setOpenDrafts([]);
      setSentPos([]);
      return;
    }
    let cancelled = false;
    setOrdersLoading(true);
    const poFetch = canPathARead
      ? fetchPathAPurchaseOrders({
          supplierId: supplierId.trim(),
          status: "sent",
        }).catch(() => [] as PathAPurchaseOrderListRowRecord[])
      : Promise.resolve([] as PathAPurchaseOrderListRowRecord[]);
    void Promise.all([
      canPathBRead
        ? fetchPathBSessions({ supplierId: supplierId.trim(), status: "draft" })
        : Promise.resolve([] as PathBSessionListRowRecord[]),
      poFetch,
    ])
      .then(([drafts, pos]) => {
        if (cancelled) return;
        setOpenDrafts(drafts);
        setSentPos(pos);
      })
      .catch(() => {
        if (!cancelled) {
          setOpenDrafts([]);
          setSentPos([]);
        }
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, supplierId, canPathBRead, canPathARead, sessionId, purchaseOrderId]);

  const orderTotal = useMemo(() => {
    let sum = 0;
    for (const row of lines) {
      if (isLinePosted(row.lineStatus)) continue;
      const qty = parsePurchaseQty(row.qtyStr);
      const cost = parseCostMoney(row.costPerUnitStr);
      if (qty == null || cost == null) continue;
      sum += linePurchaseTotal(qty, cost);
    }
    return Math.round(sum * 100) / 100;
  }, [lines]);

  const receiveTotal = useMemo(() => {
    let sum = 0;
    for (const row of lines) {
      if (!row.receiveSelected || isLinePosted(row.lineStatus)) continue;
      const qty = parsePurchaseQty(row.qtyStr);
      const cost = parseCostMoney(row.costPerUnitStr);
      if (qty == null || cost == null) continue;
      sum += linePurchaseTotal(qty, cost);
    }
    return Math.round(sum * 100) / 100;
  }, [lines]);

  const formatMoney = (n: number) => {
    const v = n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return `${currency} ${v}`;
  };

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
  };

  const removeLine = (key: string) => {
    setLines((prev) => {
      if (prev.length <= 1) return [emptyLine()];
      return prev.filter((row) => row.key !== key);
    });
  };

  const updateLine = (key: string, patch: Partial<StockLineDraft>) => {
    setLines((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const onProductChange = (lineKey: string, itemId: string) => {
    if (!itemId) {
      updateLine(lineKey, {
        itemId: "",
        itemName: "",
        itemDetail: null,
        variants: [],
      });
      return;
    }
    const link = productLinks.find((l) => l.itemId === itemId);
    void loadItemDetailForRow(lineKey, itemId, link);
  };

  const startNewDraft = () => {
    setSessionId(null);
    setReceiptMode("pathB");
    setPurchaseOrderId(null);
    setPoNumber(null);
    setPoBranchId(null);
    setLines([emptyLine()]);
    originalServerLineIdsRef.current = new Set();
    setReference("");
    setNotes("");
    setDeliveryDate(todayYmd());
  };

  const isPathA = receiptMode === "pathA" && purchaseOrderId != null;

  const validateEditableLines = (): StockLineDraft[] | null => {
    const editable = lines.filter(
      (row) => row.itemId.trim() && !isLinePosted(row.lineStatus),
    );
    if (editable.length === 0) {
      toast.error(
        isPathA ? "No open lines on this PO." : "Add at least one product line.",
      );
      return null;
    }
    for (const row of editable) {
      if (!row.itemDetail && !row.detailLoading) {
        toast.error("Wait for product details to load.");
        return null;
      }
      const qty = parsePurchaseQty(row.qtyStr);
      const cost = parseCostMoney(row.costPerUnitStr);
      if (qty == null) {
        toast.error(`Enter a valid quantity for ${row.itemName || "a line"}.`);
        return null;
      }
      if (isPathA && row.poOpenQty != null && qty > row.poOpenQty + 1e-9) {
        toast.error(
          `Receive qty exceeds open PO qty for ${row.itemName} (max ${row.poOpenQty}).`,
        );
        return null;
      }
      if (cost == null) {
        toast.error(`Enter buy price (cost/unit) for ${row.itemName}.`);
        return null;
      }
      if (linePurchaseTotal(qty, cost) <= 0) {
        toast.error(`Line total must be greater than zero for ${row.itemName}.`);
        return null;
      }
    }
    return editable;
  };

  const validatePoReceive = (editable: StockLineDraft[]): StockLineDraft[] | null => {
    if (!reference.trim()) {
      toast.error("Enter supplier invoice number before receiving PO.");
      return null;
    }
    const selected = editable.filter((row) => row.receiveSelected);
    if (selected.length === 0) {
      toast.error("Select at least one line to receive.");
      return null;
    }
    return selected;
  };

  const syncSessionLines = async (
    sid: string,
    editable: StockLineDraft[],
  ): Promise<{ row: StockLineDraft; serverLineId: string }[]> => {
    const currentServerIds = new Set(
      lines.map((r) => r.serverLineId).filter(Boolean) as string[],
    );
    for (const removedId of originalServerLineIdsRef.current) {
      if (!currentServerIds.has(removedId)) {
        await deletePathBLine(sid, removedId);
      }
    }

    const synced: { row: StockLineDraft; serverLineId: string }[] = [];
    for (const row of editable) {
      const payload = linePayload(row);
      if (!payload) {
        throw new Error(`Invalid line for ${row.itemName || "product"}.`);
      }
      if (row.serverLineId) {
        const updated = await patchPathBLine(sid, row.serverLineId, payload);
        synced.push({ row, serverLineId: updated.id });
      } else {
        const created = await addPathBLine(sid, payload);
        synced.push({ row, serverLineId: created.id });
      }
    }

    for (const row of lines) {
      if (row.serverLineId && isLinePosted(row.lineStatus)) {
        synced.push({ row, serverLineId: row.serverLineId });
      }
    }

    originalServerLineIdsRef.current = new Set(
      synced.map((s) => s.serverLineId),
    );
    return synced;
  };

  const persistPoReceive = async (selected: StockLineDraft[]) => {
    if (!canPathAWrite) {
      toast.error("You do not have permission to receive purchase orders.");
      return;
    }
    if (!purchaseOrderId?.trim()) {
      toast.error("Purchase order not loaded.");
      return;
    }
    const effectiveBranch = poBranchId?.trim() || branchId?.trim();
    if (!effectiveBranch) {
      toast.error("Select a branch before receiving stock.");
      return;
    }

    setBusy(true);
    setBusyMode("receive");
    try {
      const grnLines = selected.map((row) => ({
        purchaseOrderLineId: row.poLineId!,
        qtyReceived: parsePurchaseQty(row.qtyStr)!,
      }));

      const grnResult = await postPathAGoodsReceipt(
        {
          purchaseOrderId: purchaseOrderId.trim(),
          branchId: effectiveBranch,
          receivedAt: ymdToInstantIso(deliveryDate),
          notes: notes.trim() || null,
          lines: grnLines,
        },
        nextIdempotencyKey(),
      );

      const invoiceLines = selected.map((row) => {
        const qty = parsePurchaseQty(row.qtyStr)!;
        const unitCost = parseCostMoney(row.costPerUnitStr)!;
        return {
          itemId: row.itemId,
          qty,
          unitCost,
          lineTotal: roundMoney2(qty * unitCost),
        };
      });

      await postPathAGrnSupplierInvoice(
        grnResult.goodsReceiptId,
        {
          invoiceNumber: reference.trim(),
          invoiceDate: deliveryDate,
          lines: invoiceLines,
        },
        nextIdempotencyKey(),
      );

      toast.success(`PO ${poNumber ?? ""} received.`.trim());
      onCompleted?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not receive purchase order.",
      );
    } finally {
      setBusy(false);
      setBusyMode(null);
    }
  };

  const persistSession = async (
    editable: StockLineDraft[],
    mode: "draft" | "receive",
  ) => {
    if (!canPathBWrite) {
      toast.error("You do not have permission to receive stock.");
      return;
    }
    if (!supplierId.trim()) {
      toast.error("Choose a supplier.");
      return;
    }
    if (!branchId?.trim()) {
      toast.error("Select a branch before receiving stock.");
      return;
    }

    setBusy(true);
    setBusyMode(mode);
    try {
      const noteParts = [
        reference.trim() ? `Supplier ref: ${reference.trim()}` : "",
        notes.trim(),
      ].filter(Boolean);

      let sid = sessionId;
      if (!sid) {
        const session = await createPathBSession({
          supplierId: supplierId.trim(),
          branchId: branchId.trim(),
          receivedAt: ymdToInstantIso(deliveryDate),
          notes: noteParts.length ? noteParts.join("\n") : null,
        });
        sid = session.id;
        setSessionId(sid);
      }

      const synced = await syncSessionLines(sid, editable);

      if (mode === "draft") {
        toast.success("Draft saved — stock not received yet.");
        onCompleted?.();
        onOpenChange(false);
        return;
      }

      const toReceive = synced.filter(
        ({ row }) => row.receiveSelected && !isLinePosted(row.lineStatus),
      );
      if (toReceive.length === 0) {
        toast.error("Select at least one line to receive.");
        return;
      }

      const conversionNotes: string[] = [];
      const postBody = {
        lines: toReceive.map(({ row, serverLineId }) => {
          const qty = parsePurchaseQty(row.qtyStr)!;
          const detail = row.itemDetail!;
          const link = productLinks.find((l) => l.itemId === row.itemId);
          const resolved = resolveStockReceiptLine(
            qty,
            row.unit,
            detail,
            row.variants,
            link,
          );
          if (resolved.conversionNote) {
            conversionNotes.push(`${row.itemName}: ${resolved.conversionNote}`);
          }
          return {
            lineId: serverLineId,
            itemId: resolved.catalogItemId,
            usableQty: resolved.usableQty,
            wastageQty: 0,
            expiryDate: null,
            purchaseQty: qty,
            purchaseUnit: row.unit,
          };
        }),
      };

      const result = await postPathBSession(sid, postBody);
      const partial =
        result.sessionStatus?.toUpperCase() === "SESSION_DRAFT";
      if (conversionNotes.length > 0) {
        toast.message(
          partial ? "Partial delivery received" : "Stock received",
          { description: conversionNotes.join(" ") },
        );
      } else if (partial) {
        toast.success(
          `Received ${result.linesPosted} line(s). Draft kept open for remaining items.`,
        );
      } else {
        toast.success("Stock received.");
      }
      onCompleted?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save stock.");
    } finally {
      setBusy(false);
      setBusyMode(null);
    }
  };

  const onSaveDraft = (e: FormEvent) => {
    e.preventDefault();
    if (isPathA) return;
    const editable = validateEditableLines();
    if (!editable) return;
    void persistSession(editable, "draft");
  };

  const onReceiveStock = (e: FormEvent) => {
    e.preventDefault();
    const editable = validateEditableLines();
    if (!editable) return;
    if (isPathA) {
      const selected = validatePoReceive(editable);
      if (!selected) return;
      void persistPoReceive(selected);
      return;
    }
    void persistSession(editable, "receive");
  };

  if (!canPathBWrite && !canPathAWrite) {
    return null;
  }

  const showReceiveHint =
    lines.some((r) => !isLinePosted(r.lineStatus)) &&
    lines.some((r) => !r.receiveSelected && !isLinePosted(r.lineStatus));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          dialogSurfaceClass,
          "max-h-[min(92vh,820px)] overflow-y-auto sm:max-w-2xl",
        )}
        style={brandTheme as CSSProperties}
      >
        <DialogHeader>
          <DialogTitle>
            {isPathA
              ? `Receive PO ${poNumber ?? ""}`.trim()
              : sessionId
                ? "Add stock — draft"
                : "Add stock"}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onReceiveStock}>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[rgb(var(--bp-fg-faint))]">Supplier</span>
            <select
              className={butcherInputClass}
              value={supplierId}
              disabled={Boolean(sessionId) || Boolean(purchaseOrderId) || sessionLoading}
              onChange={(e) => {
                setSupplierId(e.target.value);
                if (!e.target.value) startNewDraft();
              }}
              required
            >
              <option value="">Select supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {supplierId && (canPathBRead || canPathARead) ? (
            <div className="space-y-2 rounded-xl border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel)/0.4)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[rgb(var(--bp-fg-faint))]">
                  Open orders
                </p>
                {sessionId || purchaseOrderId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-[rgb(var(--bp-fg-faint))]"
                    onClick={startNewDraft}
                  >
                    New receipt
                  </Button>
                ) : null}
              </div>
              {ordersLoading ? (
                <p className="flex items-center gap-1 text-xs text-[rgb(var(--bp-fg-muted))]">
                  <Loader2 className="size-3 animate-spin" />
                  Loading…
                </p>
              ) : openDrafts.length === 0 && sentPos.length === 0 ? (
                <p className="text-xs text-[rgb(var(--bp-fg-muted))]">No open drafts or POs.</p>
              ) : (
                <ul className="space-y-1.5">
                  {openDrafts
                    .filter((d) => d.id !== sessionId)
                    .map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          className="w-full rounded-lg border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel-strong)/0.6)] px-3 py-2 text-left text-xs transition hover:border-[color-mix(in_srgb,var(--pos-primary)_40%,transparent)]"
                          onClick={() => void hydrateSession(d.id, productLinks)}
                        >
                          <span className="font-medium text-[rgb(var(--bp-fg-soft))]">
                            Draft · {instantToYmd(d.receivedAt)}
                          </span>
                          <span className="mt-0.5 block text-[rgb(var(--bp-fg-muted))]">
                            {d.lineCount} line{d.lineCount === 1 ? "" : "s"} ·{" "}
                            {formatMoney(parseMoneyApi(d.totalAmount))}
                          </span>
                        </button>
                      </li>
                    ))}
                  {sentPos.map((po) => (
                    <li key={po.id}>
                      {canPathAWrite ? (
                        <button
                          type="button"
                          className={cn(
                            "w-full rounded-lg border px-3 py-2 text-left text-xs transition",
                            purchaseOrderId === po.id
                              ? "border-[color-mix(in_srgb,var(--pos-primary)_50%,transparent)] bg-[rgb(var(--bp-panel-strong)/0.8)]"
                              : "border-dashed border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel-strong)/0.4)] hover:border-[color-mix(in_srgb,var(--pos-primary)_40%,transparent)]",
                          )}
                          onClick={() =>
                            void hydratePurchaseOrder(po.id, productLinks)
                          }
                        >
                          <span className="font-medium text-[rgb(var(--bp-fg-soft))]">
                            PO {po.poNumber}
                          </span>
                          <span className="mt-0.5 block text-[rgb(var(--bp-fg-muted))]">
                            Expected {po.expectedDate} · {po.lineCount} line
                            {po.lineCount === 1 ? "" : "s"} · tap to receive
                          </span>
                        </button>
                      ) : (
                        <div className="rounded-lg border border-dashed border-[rgb(var(--bp-border))] px-3 py-2 text-xs text-[rgb(var(--bp-fg-muted))]">
                          PO {po.poNumber} · expected {po.expectedDate} ·{" "}
                          {po.lineCount} line{po.lineCount === 1 ? "" : "s"}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[rgb(var(--bp-fg-faint))]">
                Delivery date
              </span>
              <YmdDateInput
                value={deliveryDate}
                onValueChange={setDeliveryDate}
                className={butcherInputClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[rgb(var(--bp-fg-faint))]">
                {isPathA ? "Supplier invoice no." : "Reference / invoice no."}
                {isPathA ? (
                  <span className="text-[color-mix(in_srgb,var(--pos-primary)_70%,white)]">
                    {" "}
                    *
                  </span>
                ) : null}
              </span>
              <input
                className={butcherInputClass}
                placeholder="INV-00214"
                value={reference}
                required={isPathA}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="hidden gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--bp-fg-muted))] sm:grid sm:grid-cols-[auto_minmax(0,1.2fr)_4rem_5rem_5rem_2rem]">
              <span className="w-5" />
              <span>Product</span>
              <span>Qty</span>
              <span>Unit</span>
              <span>Cost/unit</span>
              <span className="sr-only">Remove</span>
            </div>

            {lines.map((row) => {
              const posted = isLinePosted(row.lineStatus);
              const poLine = isPathA && row.poOpenQty != null;
              const unitOptions = buildPurchaseUnitOptions(
                row.itemDetail,
                row.variants,
              );
              const qty = parsePurchaseQty(row.qtyStr);
              const cost = parseCostMoney(row.costPerUnitStr);
              const lineTotal =
                qty != null && cost != null ? linePurchaseTotal(qty, cost) : null;
              const link = productLinks.find((l) => l.itemId === row.itemId);
              const marginHint =
                qty != null && cost != null && row.itemDetail
                  ? computeReceiveMarginHint(
                      qty,
                      row.unit,
                      cost,
                      row.itemDetail,
                      row.variants,
                      link,
                    )
                  : null;

              return (
                <div
                  key={row.key}
                  className={cn(
                    "grid gap-2 rounded-xl border p-2 sm:grid-cols-[auto_minmax(0,1.2fr)_4rem_5rem_5rem_2rem] sm:items-center sm:border-0 sm:p-0",
                    posted
                      ? "border-[rgb(var(--bp-border))]/60 bg-[rgb(var(--bp-panel)/0.2)] opacity-70"
                      : "border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel)/0.4)] sm:bg-transparent",
                  )}
                >
                  <label className="flex items-center justify-center sm:w-5">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-[rgb(var(--bp-border))] accent-[var(--pos-primary)]"
                      checked={posted || row.receiveSelected}
                      disabled={posted}
                      title={posted ? "Already received" : "Receive this line"}
                      onChange={(e) =>
                        updateLine(row.key, { receiveSelected: e.target.checked })
                      }
                    />
                  </label>

                  <div className="space-y-1">
                    <span className="text-[10px] font-medium uppercase text-[rgb(var(--bp-fg-muted))] sm:hidden">
                      Product
                      {posted ? " · Received" : ""}
                    </span>
                    <select
                      className={cn(butcherInputClass, "h-10 text-sm")}
                      value={row.itemId}
                      disabled={posted || !supplierId || linksLoading || isPathA}
                      onChange={(e) => onProductChange(row.key, e.target.value)}
                    >
                      <option value="">
                        {linksLoading
                          ? "Loading products…"
                          : supplierId
                            ? "Select product…"
                            : "Choose supplier first"}
                      </option>
                      {productLinks.map((link) => (
                        <option key={link.itemId} value={link.itemId}>
                          {link.itemName}
                        </option>
                      ))}
                    </select>
                    {row.detailLoading ? (
                      <p className="flex items-center gap-1 text-[10px] text-[rgb(var(--bp-fg-muted))]">
                        <Loader2 className="size-3 animate-spin" />
                        Loading…
                      </p>
                    ) : posted ? (
                      <p className="text-[10px] text-emerald-500/90">Received</p>
                    ) : poLine ? (
                      <p className="text-[10px] text-[rgb(var(--bp-fg-muted))]">
                        Open on PO: {row.poOpenQty}
                      </p>
                    ) : null}
                  </div>

                  <label className="space-y-1">
                    <span className="text-[10px] font-medium uppercase text-[rgb(var(--bp-fg-muted))] sm:hidden">
                      Qty
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      disabled={posted}
                      className={cn(butcherInputClass, "h-10 px-2 text-center tabular-nums")}
                      value={row.qtyStr}
                      onChange={(e) =>
                        updateLine(row.key, { qtyStr: e.target.value })
                      }
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] font-medium uppercase text-[rgb(var(--bp-fg-muted))] sm:hidden">
                      Unit
                    </span>
                    <select
                      className={cn(butcherInputClass, "h-10 px-2 text-sm")}
                      value={row.unit}
                      disabled={posted || isPathA}
                      onChange={(e) =>
                        updateLine(row.key, { unit: e.target.value })
                      }
                    >
                      {unitOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] font-medium uppercase text-[rgb(var(--bp-fg-muted))] sm:hidden">
                      Cost/unit
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      disabled={posted || isPathA}
                      className={cn(butcherInputClass, "h-10 px-2 tabular-nums")}
                      placeholder="0"
                      value={row.costPerUnitStr}
                      onChange={(e) =>
                        updateLine(row.key, { costPerUnitStr: e.target.value })
                      }
                    />
                    {lineTotal != null && lineTotal > 0 ? (
                      <p className="text-[10px] tabular-nums text-[rgb(var(--bp-fg-muted))] sm:hidden">
                        Line: {formatMoney(lineTotal)}
                      </p>
                    ) : null}
                    {marginHint != null ? (
                      <p
                        className={cn(
                          "text-[10px] tabular-nums leading-snug",
                          marginHint.marginPercent >= 20
                            ? "text-emerald-500/90"
                            : marginHint.marginPercent >= 0
                              ? "text-amber-500/90"
                              : "text-red-400",
                        )}
                      >
                        Margin {marginHint.marginPercent.toFixed(1)}% · shelf{" "}
                        {formatMoney(marginHint.sellPerStockUnit)}/
                        {marginHint.stockUnitLabel}
                      </p>
                    ) : null}
                  </label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={posted || isPathA}
                    className="size-10 shrink-0 text-[rgb(var(--bp-fg-muted))] hover:bg-[rgb(var(--bp-hover))] hover:text-red-400 disabled:opacity-30"
                    onClick={() => removeLine(row.key)}
                    aria-label="Remove line"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}

            {!isPathA ? (
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 rounded-xl border-[rgb(var(--bp-border))] bg-transparent text-[rgb(var(--bp-fg-soft))] hover:bg-[rgb(var(--bp-hover))]"
                onClick={addLine}
              >
                <Plus className="size-4" />
                Add line
              </Button>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel)/0.5)] px-4 py-3">
            <div>
              <span className="text-sm text-[rgb(var(--bp-fg-faint))]">Order total</span>
              {showReceiveHint ? (
                <p className="text-[10px] text-[rgb(var(--bp-fg-muted))]">
                  Receiving now: {formatMoney(receiveTotal)}
                </p>
              ) : null}
            </div>
            <span className="text-2xl font-bold tabular-nums text-[rgb(var(--bp-fg))]">
              {formatMoney(orderTotal)}
            </span>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[rgb(var(--bp-fg-faint))]">Notes</span>
            <textarea
              className={cn(
                butcherInputClass,
                "min-h-[88px] resize-y py-2.5",
              )}
              placeholder="Delivery instructions, quality checks…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <DialogFooter className="gap-2 sm:gap-2">
            {canPathBWrite && !isPathA ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-[rgb(var(--bp-border))] bg-transparent text-[rgb(var(--bp-fg-soft))] hover:bg-[rgb(var(--bp-hover))]"
                disabled={busy || sessionLoading}
                onClick={(e) => onSaveDraft(e)}
              >
                {busyMode === "draft" ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save as draft"
                )}
              </Button>
            ) : null}
            <Button
              type="submit"
              className={cn(
                butcherChargeButtonClass,
                "sm:min-w-[9rem]",
              )}
              disabled={busy || sessionLoading}
              style={{
                backgroundColor: "var(--pos-primary)",
                color: "var(--pos-primary-ink)",
              }}
            >
              {busyMode === "receive" ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Receiving…
                </>
              ) : isPathA ? (
                "Receive PO"
              ) : (
                "Receive stock"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
