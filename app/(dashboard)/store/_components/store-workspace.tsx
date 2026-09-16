"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpFromLine,
  Loader2,
  Plus,
  ScanLine,
  Warehouse,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { FormDrawer } from "@/components/form-drawer";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useStoreRoomRealtime } from "@/hooks/use-store-room-realtime";
import {
  ApiRequestError,
  createStoreItem,
  deleteStoreItem,
  fetchItemById,
  fetchItemPackOptions,
  fetchStoreItems,
  fetchStoreRoomSettings,
  updateStoreItem,
  updateStoreRoomSettings,
  type ItemSummaryRecord,
  type StoreItemRecord,
  type StoreRoomDirection,
  type StoreRoomMode,
  type StoreRoomMovementRecord,
  type StoreRoomSettingsRecord,
} from "@/lib/api";
import type { SupplyPackMode } from "@/lib/supply-pack-math";
import { resolveCurrencyCode } from "@/lib/money";
import { hasPermission, Permission } from "@/lib/permissions";
import { DEFAULT_PROBLEM_TITLE } from "@/lib/problem";
import { setCatalogOnHandStock } from "@/lib/set-on-hand-stock";
import { cn } from "@/lib/utils";

import {
  parseStoreCount,
  storeItemCount,
  storeItemCountInput,
} from "../_lib/store-item-count";
import {
  catalogNativePack,
  isPacked,
  packsToCatalogDisplay,
  retargetCount,
  storePackCatalogFromItem,
  type StorePackCatalog,
} from "../_lib/store-item-pack";
import { StoreRoomConnectionChooser } from "./store-room-connection-chooser";
import { StoreRoomMovementDrawer } from "./store-room-movement-drawer";
import { StoreRoomProductPicker } from "./store-room-product-picker";
import {
  StoreModeBanner,
  StoreRoomTheatre,
} from "./store-room-theatre";

function mutationError(
  error: unknown,
  fallback = DEFAULT_PROBLEM_TITLE,
): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

type Feedback = { kind: "success" | "error" | "warning"; text: string } | null;

type Draft = {
  name: string;
  barcode: string;
  quantity: string;
  expiryDate: string;
  buyingPrice: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  barcode: "",
  quantity: "0",
  expiryDate: "",
  buyingPrice: "",
};

function draftFromRow(row: StoreItemRecord, connected: boolean): Draft {
  return {
    name: row.name,
    barcode: row.barcode ?? "",
    quantity: storeItemCountInput(storeItemCount(row, connected)),
    expiryDate: row.expiryDate ?? "",
    buyingPrice:
      row.buyingPrice == null || row.buyingPrice === ""
        ? ""
        : String(row.buyingPrice),
  };
}

function parseBuyingPrice(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

/** Inventory counts are decimals; show 12 rather than 12.00, and 12.5 as-is. */
function formatQuantity(value: number | string | null): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function StoreWorkspace({ canWrite }: { canWrite: boolean }) {
  const { business, me, branchId } = useDashboard();
  const currency = resolveCurrencyCode(business?.currency);
  // Approving a big take-out is where stock actually moves, so it needs the same key.
  const canDecide = hasPermission(me?.permissions, Permission.InventoryWrite);

  const [rows, setRows] = useState<StoreItemRecord[]>([]);
  const [settings, setSettings] = useState<StoreRoomSettingsRecord | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [query, setQuery] = useState("");
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);
  const [modeBusy, setModeBusy] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<Draft>(EMPTY_DRAFT);
  const [createBusy, setCreateBusy] = useState(false);

  const [pickOpen, setPickOpen] = useState(false);
  const [pickBusy, setPickBusy] = useState(false);
  const [linkRow, setLinkRow] = useState<StoreItemRecord | null>(null);

  const [editRow, setEditRow] = useState<StoreItemRecord | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editBusy, setEditBusy] = useState(false);
  const [packCatalog, setPackCatalog] = useState<StorePackCatalog | null>(null);
  const [packMode, setPackMode] = useState<SupplyPackMode | null>(null);

  const [deleteRow, setDeleteRow] = useState<StoreItemRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [movementOpen, setMovementOpen] = useState(false);
  // Bumped per open so the drawer remounts and re-seeds from `movementInitial`.
  const [movementKey, setMovementKey] = useState(0);
  const [movementInitial, setMovementInitial] = useState<{
    storeItemId?: string;
    direction: StoreRoomDirection;
  } | null>(null);
  const [activityToken, setActivityToken] = useState(0);

  const [scannerOpen, setScannerOpen] = useState(false);
  /** Barcode the picker should search for, when a scan found nothing tracked. */
  const [pickerQuery, setPickerQuery] = useState<string | undefined>(undefined);
  const [scanAddThenTakeOut, setScanAddThenTakeOut] = useState(false);

  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalDraft, setApprovalDraft] = useState("");
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  /** Drafted "second pair of eyes" policy, saved with the threshold. */
  const [separateDraft, setSeparateDraft] = useState(false);

  /** Theatre selection — drives history + inspect columns. */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Mobile: which pane of the detail stack is showing. */
  const [mobileDetailTab, setMobileDetailTab] = useState<"history" | "edit">(
    "history",
  );
  /** Mobile: roster vs focused item. */
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const mode = settings?.mode ?? null;
  const connected = mode === "connected";
  const configuredThreshold = settings?.approvalThreshold;
  const approvalThreshold =
    configuredThreshold == null || configuredThreshold === ""
      ? null
      : Number(configuredThreshold);

  const fetchAll = useCallback(async () => {
    const [nextSettings, nextRows] = await Promise.all([
      fetchStoreRoomSettings(),
      fetchStoreItems(),
    ]);
    return { nextSettings, nextRows };
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    fetchAll()
      .then(({ nextSettings, nextRows }) => {
        setSettings(nextSettings);
        setRows(nextRows);
        setLoadFailed(false);
      })
      .catch(() => {
        setLoadFailed(true);
        setRows([]);
        setFeedback({ kind: "error", text: "Failed to load store items." });
      })
      .finally(() => setLoading(false));
  }, [fetchAll]);

  useEffect(() => {
    load();
  }, [load]);

  // A sale moves stock, so a connected store room re-reads itself on every sale.
  const refreshQuietly = useCallback(() => {
    fetchAll()
      .then(({ nextSettings, nextRows }) => {
        setSettings(nextSettings);
        setRows(nextRows);
      })
      .catch(() => {
        // A background refresh that fails is not worth a banner — the next sale retries.
      });
  }, [fetchAll]);

  useStoreRoomRealtime({
    enabled: connected,
    onInventoryMoved: refreshQuietly,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (onlyUnlinked && row.itemId) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        (row.barcode ?? "").toLowerCase().includes(q) ||
        (row.inventoryItemName ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, onlyUnlinked]);

  const selectedRow = useMemo(
    () => filtered.find((row) => row.id === selectedId) ?? rows.find((row) => row.id === selectedId) ?? null,
    [filtered, rows, selectedId],
  );

  const linkedItemId = connected ? selectedRow?.itemId ?? null : null;

  useEffect(() => {
    if (!linkedItemId) {
      setPackCatalog(null);
      setPackMode(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetchItemById(linkedItemId, { branchId: branchId || null, toast: false }),
      fetchItemPackOptions(linkedItemId),
    ])
      .then(([detail, options]) => {
        if (cancelled) return;
        const next = storePackCatalogFromItem(linkedItemId, detail, options);
        setPackCatalog(next);
        setPackMode(catalogNativePack(next));
      })
      .catch(() => {
        if (cancelled) return;
        setPackCatalog(null);
        setPackMode(null);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, linkedItemId]);

  const applyPackMode = (next: SupplyPackMode | null) => {
    const factor = packCatalog?.displayToHolderFactor ?? 1;
    const typed = parseStoreCount(editDraft.quantity, false);
    if (typed != null) {
      setEditDraft((prev) => ({
        ...prev,
        quantity: storeItemCountInput(
          retargetCount(typed, packMode, next, factor),
        ),
      }));
    }
    setPackMode(next);
  };

  const maxCount = useMemo(() => {
    let max = 1;
    for (const row of rows) {
      const live =
        connected && row.itemId != null
          ? Number(row.inventoryQuantity ?? 0)
          : Number(row.quantity);
      if (Number.isFinite(live) && live > max) max = live;
    }
    return max;
  }, [rows, connected]);

  /** Item ids already mirrored, minus the row currently being re-linked. */
  const takenItemIds = useMemo(() => {
    const taken = new Set<string>();
    for (const row of rows) {
      if (!row.itemId) continue;
      if (linkRow && row.id === linkRow.id) continue;
      taken.add(row.itemId);
    }
    return taken;
  }, [rows, linkRow]);

  const chooseMode = async (next: StoreRoomMode) => {
    setModeBusy(true);
    setFeedback(null);
    try {
      const nextSettings = await updateStoreRoomSettings({ mode: next });
      const nextRows = await fetchStoreItems();
      setSettings(nextSettings);
      setRows(nextRows);
      setOnlyUnlinked(false);
      const focused = selectedId
        ? nextRows.find((r) => r.id === selectedId)
        : null;
      if (focused) {
        setEditRow(focused);
        setEditDraft(draftFromRow(focused, next === "connected"));
      }
      if (next === "connected") {
        setFeedback({
          kind: "success",
          text:
            nextSettings.linkedNow > 0
              ? `Following inventory. Matched ${nextSettings.linkedNow} item${
                  nextSettings.linkedNow === 1 ? "" : "s"
                } to your products by barcode.`
              : "Following inventory. Counts now move on their own as products sell.",
        });
      } else {
        setFeedback({
          kind: "success",
          text: "Back-room only. Counts are yours to type again.",
        });
      }
    } catch (err) {
      setFeedback({
        kind: "error",
        text: mutationError(err, "Could not change how this store room works."),
      });
    } finally {
      setModeBusy(false);
    }
  };

  const openCustomCreate = () => {
    setCreateDraft(EMPTY_DRAFT);
    setCreateOpen(true);
    setFeedback(null);
  };

  const openPickerForCreate = () => {
    setLinkRow(null);
    setPickerQuery(undefined);
    setScanAddThenTakeOut(false);
    setPickOpen(true);
    setFeedback(null);
  };

  const openPickerForLink = (row: StoreItemRecord) => {
    setLinkRow(row);
    setPickOpen(true);
    setFeedback(null);
  };

  const selectRow = (row: StoreItemRecord) => {
    setSelectedId(row.id);
    setEditRow(row);
    setEditDraft(draftFromRow(row, connected));
    setMobileShowDetail(true);
    setMobileDetailTab("history");
    setFeedback(null);
  };

  const clearSelection = () => {
    setSelectedId(null);
    setEditRow(null);
    setMobileShowDetail(false);
    setMobileDetailTab("history");
  };

  // Keep a focused row so history + inspect aren't empty shells on desktop.
  useEffect(() => {
    if (selectedId && filtered.some((row) => row.id === selectedId)) return;
    if (filtered.length === 0) {
      setSelectedId(null);
      setEditRow(null);
      setMobileShowDetail(false);
      return;
    }
    const first = filtered[0]!;
    setSelectedId(first.id);
    setEditRow(first);
    setEditDraft(draftFromRow(first, connected));
  }, [connected, filtered, selectedId]);

  const openMovement = (
    row: StoreItemRecord | null,
    direction: StoreRoomDirection,
  ) => {
    setMovementInitial(row ? { storeItemId: row.id, direction } : { direction });
    setMovementKey((prev) => prev + 1);
    setMovementOpen(true);
    setFeedback(null);
  };

  const handleRecorded = (movement: StoreRoomMovementRecord) => {
    setActivityToken((prev) => prev + 1);
    const amount = formatQuantity(movement.quantity);
    const pending = movement.status === "pending";
    setFeedback({
      kind: pending ? "warning" : "success",
      text: pending
        ? `${amount} is waiting for approval — stock has not moved yet.`
        : movement.direction === "out"
          ? `Recorded ${amount} out of the store room.`
          : `Recorded ${amount} back in.`,
    });
    // A movement changes stock (linked) or the local count (standalone), so re-read.
    refreshQuietly();
  };

  /**
   * A scan is only useful if it lands somewhere, so this resolves the barcode in
   * order of decreasing convenience: the row itself, then the catalogue.
   */
  const handleScan = (barcode: string) => {
    setScannerOpen(false);
    const needle = barcode.trim().toLowerCase();
    if (!needle) return;

    const row = rows.find(
      (candidate) => (candidate.barcode ?? "").trim().toLowerCase() === needle,
    );
    if (row) {
      setFeedback(null);
      openMovement(row, "out");
      return;
    }

    if (connected) {
      // Not tracked yet — but the product may exist, and the intent was to take
      // something out. Hand off to the picker, then straight into the drawer.
      setLinkRow(null);
      setPickerQuery(barcode.trim());
      setScanAddThenTakeOut(true);
      setPickOpen(true);
      setFeedback({
        kind: "warning",
        text: `Nothing tracked has barcode ${barcode.trim()}. Add the product, then record the take-out.`,
      });
      return;
    }

    setFeedback({
      kind: "error",
      text: `Nothing in the store room has barcode ${barcode.trim()}.`,
    });
  };

  const openApprovalThreshold = () => {
    setApprovalDraft(approvalThreshold == null ? "" : String(approvalThreshold));
    setSeparateDraft(settings?.requireSeparateApprover ?? false);
    setApprovalError(null);
    setApprovalOpen(true);
  };

  const saveApprovalThreshold = async (clear: boolean) => {
    setApprovalBusy(true);
    setApprovalError(null);
    try {
      if (clear) {
        setSettings(
          await updateStoreRoomSettings({
            clearApprovalThreshold: true,
            requireSeparateApprover: separateDraft,
          }),
        );
        setFeedback({
          kind: "success",
          text: "Big take-outs no longer need approval.",
        });
      } else {
        const raw = approvalDraft.trim();
        const n = Number(raw);
        if (!raw || !Number.isFinite(n) || n <= 0) {
          setApprovalError("Enter a number greater than zero.");
          return;
        }
        setSettings(
          await updateStoreRoomSettings({
            approvalThreshold: n,
            requireSeparateApprover: separateDraft,
          }),
        );
        setFeedback({
          kind: "success",
          text:
            `Take-outs of more than ${n} will wait for approval.` +
            (separateDraft
              ? " Nobody may approve a take-out they raised themselves."
              : ""),
        });
      }
      setApprovalOpen(false);
      setActivityToken((prev) => prev + 1);
    } catch (err) {
      setApprovalError(mutationError(err, "Could not save that."));
    } finally {
      setApprovalBusy(false);
    }
  };

  const createFromProduct = async (item: ItemSummaryRecord) => {
    setPickBusy(true);
    setFeedback(null);
    try {
      // No barcode sent: the server copies the product's own when it is free.
      const created = await createStoreItem({
        name: item.name,
        quantity: 0,
        itemId: item.id,
      });
      setRows((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setPickOpen(false);
      // Item counts moved, so re-read the census behind the banner.
      refreshQuietly();
      setFeedback({
        kind: "success",
        text: `“${created.name}” now follows inventory.`,
      });
      // Scanned but untracked: the operator's intent was clearly to take it out.
      if (scanAddThenTakeOut) {
        setScanAddThenTakeOut(false);
        setPickerQuery(undefined);
        openMovement(created, "out");
      }
    } catch (err) {
      setFeedback({
        kind: "error",
        text: mutationError(err, "Could not add that product."),
      });
    } finally {
      setPickBusy(false);
    }
  };

  const linkProduct = async (item: ItemSummaryRecord) => {
    if (!linkRow) return;
    setPickBusy(true);
    setFeedback(null);
    try {
      const updated = await updateStoreItem(linkRow.id, { itemId: item.id });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setLinkRow(null);
      setPickOpen(false);
      refreshQuietly();
      setFeedback({
        kind: "success",
        text: `“${updated.name}” now follows ${item.name}.`,
      });
    } catch (err) {
      setFeedback({
        kind: "error",
        text: mutationError(err, "Could not link that product."),
      });
    } finally {
      setPickBusy(false);
    }
  };

  const unlinkRow = async (row: StoreItemRecord) => {
    setRowBusyId(row.id);
    setFeedback(null);
    try {
      const updated = await updateStoreItem(row.id, { clearItemId: true });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      refreshQuietly();
      setFeedback({
        kind: "success",
        text: `“${updated.name}” is yours to count by hand again.`,
      });
    } catch (err) {
      setFeedback({
        kind: "error",
        text: mutationError(err, "Could not unlink that product."),
      });
    } finally {
      setRowBusyId(null);
    }
  };

  const handleCreate = async () => {
    const name = createDraft.name.trim();
    const quantity = parseStoreCount(createDraft.quantity, true);
    const buyingPrice = parseBuyingPrice(createDraft.buyingPrice);
    if (!name) {
      setFeedback({ kind: "error", text: "Name is required." });
      return;
    }
    if (quantity == null) {
      setFeedback({
        kind: "error",
        text: "Quantity must be a whole number ≥ 0.",
      });
      return;
    }
    if (buyingPrice === undefined) {
      setFeedback({
        kind: "error",
        text: "Buying price must be a number ≥ 0.",
      });
      return;
    }
    setCreateBusy(true);
    setFeedback(null);
    try {
      const created = await createStoreItem({
        name,
        barcode: createDraft.barcode.trim() || null,
        quantity,
        expiryDate: createDraft.expiryDate.trim() || null,
        buyingPrice,
      });
      setRows((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setCreateOpen(false);
      setCreateDraft(EMPTY_DRAFT);
      refreshQuietly();
      setFeedback({ kind: "success", text: `Added “${created.name}”.` });
    } catch (err) {
      setFeedback({
        kind: "error",
        text: mutationError(err, "Could not add store item."),
      });
    } finally {
      setCreateBusy(false);
    }
  };

  const handleEdit = async () => {
    if (!editRow) return;
    const name = editDraft.name.trim();
    const buyingPrice = parseBuyingPrice(editDraft.buyingPrice);
    const latest = rows.find((r) => r.id === editRow.id) ?? editRow;
    const followsInventory = connected && latest.itemId != null;
    const packed = followsInventory && isPacked(packMode);
    const quantity = parseStoreCount(editDraft.quantity, !followsInventory && !packed);
    if (!name) {
      setFeedback({ kind: "error", text: "Name is required." });
      return;
    }
    if (quantity == null) {
      setFeedback({
        kind: "error",
        text:
          followsInventory || packed
            ? "Quantity must be a number ≥ 0."
            : "Quantity must be a whole number ≥ 0.",
      });
      return;
    }
    if (buyingPrice === undefined) {
      setFeedback({
        kind: "error",
        text: "Buying price must be a number ≥ 0.",
      });
      return;
    }
    const currentLive = storeItemCount(latest, connected);
    const factor = packCatalog?.displayToHolderFactor ?? 1;
    const targetDisplay = followsInventory
      ? packsToCatalogDisplay(quantity, packMode, factor)
      : quantity;
    const qtyChanged = Math.abs(targetDisplay - currentLive) >= 0.0001;
    if (followsInventory && qtyChanged) {
      if (!canDecide) {
        setFeedback({
          kind: "error",
          text: "You need inventory write access to change this count.",
        });
        return;
      }
      if (!branchId.trim()) {
        setFeedback({
          kind: "error",
          text: "Select a branch to update on-hand.",
        });
        return;
      }
    }
    setEditBusy(true);
    setFeedback(null);
    try {
      if (followsInventory && qtyChanged && latest.itemId) {
        await setCatalogOnHandStock({
          itemId: latest.itemId,
          branchId,
          targetDisplay,
          unitCost: buyingPrice ?? 0,
          notes: "Stock set from store room",
        });
      }
      const updated = await updateStoreItem(editRow.id, {
        name,
        barcode: editDraft.barcode.trim(),
        quantity: followsInventory ? undefined : quantity,
        expiryDate: editDraft.expiryDate.trim() || null,
        clearExpiryDate: !editDraft.expiryDate.trim(),
        buyingPrice: buyingPrice ?? undefined,
        clearBuyingPrice: buyingPrice == null,
      });
      setRows((prev) =>
        prev
          .map((r) => (r.id === updated.id ? updated : r))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditRow(updated);
      setEditDraft(draftFromRow(updated, connected));
      setSelectedId(updated.id);
      setFeedback({ kind: "success", text: `Updated “${updated.name}”.` });
    } catch (err) {
      setFeedback({
        kind: "error",
        text: mutationError(err, "Could not update store item."),
      });
    } finally {
      setEditBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setDeleteBusy(true);
    setFeedback(null);
    try {
      await deleteStoreItem(deleteRow.id);
      setRows((prev) => prev.filter((r) => r.id !== deleteRow.id));
      if (selectedId === deleteRow.id) clearSelection();
      refreshQuietly();
      setFeedback({ kind: "success", text: `Removed “${deleteRow.name}”.` });
      setDeleteRow(null);
    } catch (err) {
      setFeedback({
        kind: "error",
        text: mutationError(err, "Could not remove store item."),
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  if (loading || !settings) {
    if (loadFailed) {
      return (
        <DashboardLoadError
          title="Store room"
          message="Could not load store items."
          onRetry={load}
        />
      );
    }
    return <DashboardLoading label="Loading store room…" />;
  }

  if (settings.mode == null) {
    return (
      <div className={cn(DASHBOARD_MAX_WIDE, "gap-3")}>
        <DashboardPageHero
          icon={Warehouse}
          eyebrow="Stock"
          title="Store room"
          description="A place to count what is in the back. First, decide whether it should follow the products you sell."
        />
        {feedback ? (
          <DashboardFeedback kind={feedback.kind} text={feedback.text} />
        ) : null}
        <StoreRoomConnectionChooser
          itemCount={settings.itemCount}
          canWrite={canWrite}
          busy={modeBusy}
          onChoose={(next) => void chooseMode(next)}
        />
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-2.5")}>
      <DashboardPageHero
        icon={Warehouse}
        eyebrow="Stock"
        title="Store room"
        description={
          connected
            ? "Pick a product — see what moved, then edit the details."
            : "Back-room register: name, barcode, count. Separate from till stock."
        }
      >
        {canWrite ? (
          <>
            {rows.length > 0 ? (
              <Button
                type="button"
                className="gap-2 shadow-none"
                onClick={() => openMovement(null, "out")}
              >
                <ArrowUpFromLine className="size-4" aria-hidden />
                Take out
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="gap-2 shadow-none"
              onClick={() => setScannerOpen(true)}
            >
              <ScanLine className="size-4" aria-hidden />
              Scan
            </Button>
            {connected ? (
              <Button
                type="button"
                variant={rows.length > 0 ? "outline" : "default"}
                className="gap-2 shadow-none"
                onClick={openPickerForCreate}
              >
                <Plus className="size-4" aria-hidden />
                Add from products
              </Button>
            ) : (
              <Button
                type="button"
                variant={rows.length > 0 ? "outline" : "default"}
                className="gap-2 shadow-none"
                onClick={openCustomCreate}
              >
                <Plus className="size-4" aria-hidden />
                Add item
              </Button>
            )}
          </>
        ) : null}
      </DashboardPageHero>

      {feedback ? (
        <DashboardFeedback kind={feedback.kind} text={feedback.text} />
      ) : null}

      <StoreRoomTheatre
        connected={connected}
        canWrite={canWrite}
        canDecide={canDecide}
        requireSeparateApprover={settings.requireSeparateApprover}
        currentUserId={me?.id ?? null}
        currency={currency}
        settingsBanner={
          <StoreModeBanner
            connected={connected}
            canWrite={canWrite}
            modeBusy={modeBusy}
            itemCount={settings.itemCount}
            linkedCount={settings.linkedCount}
            unlinkedCount={settings.unlinkedCount}
            approvalThreshold={approvalThreshold}
            requireSeparateApprover={settings.requireSeparateApprover}
            onApprovals={openApprovalThreshold}
            onStopFollowing={() => void chooseMode("standalone")}
            onFollowInventory={() => void chooseMode("connected")}
          />
        }
        query={query}
        onQueryChange={setQuery}
        onlyUnlinked={onlyUnlinked}
        onToggleUnlinked={() => setOnlyUnlinked((prev) => !prev)}
        unlinkedCount={settings.unlinkedCount}
        filtered={filtered}
        rowsTotal={rows.length}
        selectedId={selectedId}
        selectedRow={selectedRow}
        maxCount={maxCount}
        onSelect={selectRow}
        onClearSelection={clearSelection}
        mobileShowDetail={mobileShowDetail}
        mobileDetailTab={mobileDetailTab}
        onMobileDetailTab={setMobileDetailTab}
        activityToken={activityToken}
        onPutIn={() => openMovement(null, "in")}
        onRecorded={refreshQuietly}
        onTakeOut={(row) => openMovement(row, "out")}
        onLink={openPickerForLink}
        onUnlink={(row) => void unlinkRow(row)}
        rowBusyId={rowBusyId}
        draft={editDraft}
        onDraftChange={setEditDraft}
        packCatalog={packCatalog}
        packMode={packMode}
        onPackModeChange={applyPackMode}
        editBusy={editBusy}
        onSave={() => void handleEdit()}
        onDelete={setDeleteRow}
        onAddCustom={canWrite ? openCustomCreate : undefined}
      />

      <StoreRoomMovementDrawer
        key={movementKey}
        open={movementOpen}
        onOpenChange={setMovementOpen}
        rows={rows}
        connected={connected}
        approvalThreshold={approvalThreshold}
        initial={movementInitial}
        onRecorded={handleRecorded}
      />

      <StoreRoomProductPicker
        open={pickOpen}
        onOpenChange={(open) => {
          setPickOpen(open);
          if (!open) {
            setLinkRow(null);
            setPickerQuery(undefined);
            setScanAddThenTakeOut(false);
          }
        }}
        title={linkRow ? "Link this item to a product" : "Add products to follow"}
        description={
          linkRow
            ? `“${linkRow.name}” will follow the product you pick, so its count updates as that product sells.`
            : "Pick a product and this store room will track its stock from now on."
        }
        takenItemIds={takenItemIds}
        initialQuery={pickerQuery}
        busy={pickBusy}
        onPick={(item) =>
          void (linkRow ? linkProduct(item) : createFromProduct(item))
        }
        onCreateCustom={linkRow ? undefined : openCustomCreate}
      />

      <StoreItemFormDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add store item"
        description={
          connected
            ? "Something you don’t sell through the till. It counts by hand until you link it to a product."
            : "Name and count are required. Barcode, expiry, and buy price are optional."
        }
        draft={createDraft}
        onDraftChange={setCreateDraft}
        busy={createBusy}
        submitLabel="Add item"
        onSubmit={() => void handleCreate()}
      />

      <Dialog
        open={deleteRow != null}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setDeleteRow(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove store item?</DialogTitle>
            <DialogDescription>
              {deleteRow
                ? `“${deleteRow.name}” will be removed from the store room list. Inventory is not affected.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteBusy}
              onClick={() => setDeleteRow(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => void handleDelete()}
            >
              {deleteBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={approvalOpen}
        onOpenChange={(open) => {
          if (!open && !approvalBusy) setApprovalOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask before big take-outs?</DialogTitle>
            <DialogDescription>
              Anything above this number waits for approval before stock moves. Turn
              it off and every take-out applies straight away.
            </DialogDescription>
          </DialogHeader>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
              Quantity that triggers approval
            </span>
            <input
              className={dashboardInputClass()}
              type="number"
              min={1}
              step={1}
              inputMode="decimal"
              value={approvalDraft}
              onChange={(event) => setApprovalDraft(event.target.value)}
              placeholder="e.g. 10"
            />
          </label>
          <div className="flex items-start justify-between gap-3 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)] px-2.5 py-2">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold tracking-[-0.02em] text-foreground">
                Second pair of eyes
              </p>
              <p className={dashboardHintClass()}>
                Nobody can approve a take-out they raised themselves — they can
                still turn down their own. Only matters while approval is on.
              </p>
            </div>
            <Switch
              checked={separateDraft}
              onCheckedChange={setSeparateDraft}
              disabled={approvalBusy}
              aria-label="Nobody may approve a take-out they raised themselves"
              className="mt-0.5 shrink-0"
            />
          </div>
          {approvalError ? (
            <p className="border border-destructive/40 bg-destructive/5 px-2.5 py-2 text-[12px] leading-snug text-destructive">
              {approvalError}
            </p>
          ) : null}
          <DialogFooter>
            {approvalThreshold != null ? (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto"
                disabled={approvalBusy}
                onClick={() => void saveApprovalThreshold(true)}
              >
                Never ask
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={approvalBusy}
              onClick={() => setApprovalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={approvalBusy}
              onClick={() => void saveApprovalThreshold(false)}
            >
              {approvalBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {scannerOpen ? (
        <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />
      ) : null}
    </div>
  );
}

function StoreItemFormDrawer({
  open,
  onOpenChange,
  title,
  description,
  draft,
  onDraftChange,
  busy,
  submitLabel,
  quantityLocked = false,
  quantityHint,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  draft: Draft;
  onDraftChange: (draft: Draft) => void;
  busy: boolean;
  submitLabel: string;
  /** True when the count is owned by inventory and must not be typed over. */
  quantityLocked?: boolean;
  quantityHint?: string;
  onSubmit: () => void;
}) {
  const set = (key: keyof Draft) => (value: string) =>
    onDraftChange({ ...draft, [key]: value });

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      contextLabel="Store room"
      title={title}
      description={description}
      icon={<Warehouse className="size-4" aria-hidden />}
      width="default"
      appearance="sharp"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={onSubmit}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {submitLabel}
          </Button>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
            Name
          </span>
          <input
            className={dashboardInputClass()}
            value={draft.name}
            onChange={(e) => set("name")(e.target.value)}
            placeholder="Cleaning cloths"
            autoFocus
            required
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
            Barcode
          </span>
          <input
            className={dashboardInputClass()}
            value={draft.barcode}
            onChange={(e) => set("barcode")(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
            Number
          </span>
          <input
            className={dashboardInputClass(quantityLocked)}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={draft.quantity}
            onChange={(e) => set("quantity")(e.target.value)}
            disabled={quantityLocked}
            required
          />
          {quantityHint ? (
            <span className={cn(dashboardHintClass(), "block")}>
              {quantityHint}
            </span>
          ) : null}
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
            Expiry date
          </span>
          <input
            className={dashboardInputClass()}
            type="date"
            value={draft.expiryDate}
            onChange={(e) => set("expiryDate")(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
            Buying price
          </span>
          <input
            className={dashboardInputClass()}
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={draft.buyingPrice}
            onChange={(e) => set("buyingPrice")(e.target.value)}
            placeholder="Optional"
          />
        </label>
      </form>
    </FormDrawer>
  );
}
