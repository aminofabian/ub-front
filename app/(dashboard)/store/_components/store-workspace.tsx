"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { setCatalogOnHandStock, resolveStockHolderForEdit } from "@/lib/set-on-hand-stock";
import { cn } from "@/lib/utils";

import {
  parseStoreCount,
  storeItemCount,
  storeItemCountInput,
} from "../_lib/store-item-count";
import {
  catalogDisplayToPacks,
  packsToCatalogDisplay,
  packStockEach,
  storePackCatalogFromItem,
  type StorePackCatalog,
} from "../_lib/store-item-pack";
import { StoreRoomConnectionChooser } from "./store-room-connection-chooser";
import { StoreRoomInheritOrderDrawer } from "./store-room-inherit-order-drawer";
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

function draftFromRow(
  row: StoreItemRecord,
  connected: boolean,
  displayToHolderFactor = 1,
): Draft {
  const live = storeItemCount(row, connected);
  const typed =
    connected && row.itemId != null
      ? catalogDisplayToPacks(live, null, displayToHolderFactor)
      : live;
  return {
    name: row.name,
    barcode: row.barcode ?? "",
    quantity: storeItemCountInput(typed),
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
  const [inheritOpen, setInheritOpen] = useState(false);
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
    "edit",
  );
  /** Mobile: roster vs focused item. */
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const autoFollowed = useRef(false);

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
      fetchStoreItems({ branchId }),
    ]);
    return { nextSettings, nextRows };
  }, [branchId]);

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
        setPackMode(null);
        setEditDraft((prev) => {
          const typed = parseStoreCount(prev.quantity, false) ?? 0;
          return {
            ...prev,
            quantity: storeItemCountInput(packStockEach(typed, next)),
          };
        });
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
      const nextRows = await fetchStoreItems({ branchId });
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
      autoFollowed.current = false;
      setFeedback({
        kind: "error",
        text: mutationError(err, "Could not change how this store room works."),
      });
    } finally {
      setModeBusy(false);
    }
  };

  useEffect(() => {
    if (autoFollowed.current) return;
    if (loading || loadFailed || !settings || settings.mode != null) return;
    if (!canWrite) return;
    autoFollowed.current = true;
    void chooseMode("connected");
  }, [loading, loadFailed, settings, canWrite]);

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

  const clearSelection = () => {
    setSelectedId(null);
    setEditRow(null);
    setMobileShowDetail(false);
    setMobileDetailTab("edit");
  };

  const selectRow = (row: StoreItemRecord) => {
    // Desktop: clicking the active row again returns to the room pulse.
    if (selectedId === row.id) {
      clearSelection();
      return;
    }
    setSelectedId(row.id);
    setEditRow(row);
    setEditDraft(draftFromRow(row, connected));
    setMobileShowDetail(true);
    setMobileDetailTab("edit");
    setFeedback(null);
  };

  // Drop a selection that left the filtered list; don't auto-pick the first
  // row so the middle column can show the room pulse.
  useEffect(() => {
    if (!selectedId) return;
    if (filtered.some((row) => row.id === selectedId)) return;
    clearSelection();
  }, [filtered, selectedId]);

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

  const createFromProducts = async (items: ItemSummaryRecord[]) => {
    const unique: ItemSummaryRecord[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (!item.id || seen.has(item.id) || takenItemIds.has(item.id)) continue;
      seen.add(item.id);
      unique.push(item);
    }
    if (unique.length === 0) {
      setFeedback({
        kind: "warning",
        text: "Those products are already in the store room.",
      });
      return;
    }
    setPickBusy(true);
    setFeedback(null);
    const created: StoreItemRecord[] = [];
    const failed: string[] = [];
    try {
      for (const item of unique) {
        try {
          const cost = Number(item.buyingPrice);
          const row = await createStoreItem(
            {
              name: item.name,
              quantity: 0,
              itemId: item.id,
              ...(Number.isFinite(cost) && cost >= 0
                ? { buyingPrice: cost }
                : {}),
            },
            { branchId },
          );
          created.push(row);
        } catch {
          failed.push(item.name);
        }
      }
      if (created.length > 0) {
        setRows((prev) =>
          [...prev, ...created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setPickOpen(false);
        refreshQuietly();
      }
      if (created.length > 0 && failed.length === 0) {
        setFeedback({
          kind: "success",
          text:
            created.length === 1
              ? `“${created[0]!.name}” now follows inventory.`
              : `Added ${created.length} products. They follow inventory.`,
        });
      } else if (created.length > 0) {
        setFeedback({
          kind: "warning",
          text: `Added ${created.length}. Could not add ${failed.length}: ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}.`,
        });
      } else {
        setFeedback({
          kind: "error",
          text: "Could not add those products.",
        });
      }
      if (scanAddThenTakeOut && created.length === 1) {
        setScanAddThenTakeOut(false);
        setPickerQuery(undefined);
        openMovement(created[0]!, "out");
      } else {
        setScanAddThenTakeOut(false);
        setPickerQuery(undefined);
      }
    } finally {
      setPickBusy(false);
    }
  };

  const linkProduct = async (item: ItemSummaryRecord) => {
    if (!linkRow) return;
    setPickBusy(true);
    setFeedback(null);
    try {
      const updated = await updateStoreItem(
        linkRow.id,
        { itemId: item.id },
        { branchId },
      );
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
      const updated = await updateStoreItem(
        row.id,
        { clearItemId: true },
        { branchId },
      );
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
      const created = await createStoreItem(
        {
          name,
          barcode: createDraft.barcode.trim() || null,
          quantity,
          expiryDate: createDraft.expiryDate.trim() || null,
          buyingPrice,
        },
        { branchId },
      );
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
    const quantity = parseStoreCount(editDraft.quantity, !followsInventory);
    if (!name) {
      setFeedback({ kind: "error", text: "Name is required." });
      return;
    }
    if (quantity == null) {
      setFeedback({
        kind: "error",
        text:
          followsInventory
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
      ? packsToCatalogDisplay(quantity, null, factor)
      : quantity;
    let qtyChanged = Math.abs(targetDisplay - currentLive) >= 0.0001;
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
      let stockWritten = false;
      if (followsInventory && qtyChanged && latest.itemId) {
        // Compare against branch stock (the source Save mutates), not a stale
        // list snapshot, so we neither no-op nor write a zero delta by mistake.
        const resolved = await resolveStockHolderForEdit({
          itemId: latest.itemId,
          branchId,
        });
        qtyChanged =
          Math.abs(targetDisplay - resolved.displayCurrent) >= 0.0001;
        if (qtyChanged) {
          await setCatalogOnHandStock({
            itemId: latest.itemId,
            branchId,
            targetDisplay,
            unitCost: buyingPrice ?? 0,
            notes: "Stock set from store room",
          });
          stockWritten = true;
        }
      }
      const updated = await updateStoreItem(
        editRow.id,
        {
          name,
          barcode: editDraft.barcode.trim(),
          quantity: followsInventory ? undefined : quantity,
          expiryDate: editDraft.expiryDate.trim() || null,
          clearExpiryDate: !editDraft.expiryDate.trim(),
          buyingPrice: buyingPrice ?? undefined,
          clearBuyingPrice: buyingPrice == null,
        },
        { branchId },
      );
      // Paint the count we just saved immediately. A follow-up list read can lag
      // behind the stock write, which used to snap On hand / Number back to the
      // old figure until a full page reload.
      const fresh: StoreItemRecord = followsInventory
        ? {
            ...updated,
            inventoryQuantity: targetDisplay,
          }
        : {
            ...updated,
            quantity,
          };
      setRows((prev) =>
        prev
          .map((r) => (r.id === fresh.id ? fresh : r))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditRow(fresh);
      setEditDraft(
        draftFromRow(
          fresh,
          connected,
          packCatalog?.displayToHolderFactor ?? 1,
        ),
      );
      setSelectedId(fresh.id);
      setFeedback({ kind: "success", text: `Updated “${fresh.name}”.` });
      if (stockWritten) {
        const targetEach = Math.round(targetDisplay * factor * 10000) / 10000;
        setPackCatalog((prev) =>
          prev ? { ...prev, holderEach: targetEach } : prev,
        );
        // Background reconcile — keep the optimistic count if the read is stale.
        void fetchStoreItems({ branchId })
          .then((nextRows) => {
            setRows((prev) => {
              const byId = new Map(nextRows.map((r) => [r.id, r]));
              return prev
                .map((r) => {
                  const remote = byId.get(r.id);
                  if (!remote) return r;
                  if (r.id !== fresh.id) return remote;
                  const remoteCount = storeItemCount(remote, true);
                  if (Math.abs(remoteCount - targetDisplay) < 0.0001) {
                    return remote;
                  }
                  return {
                    ...remote,
                    inventoryQuantity: targetDisplay,
                  };
                })
                .sort((a, b) => a.name.localeCompare(b.name));
            });
          })
          .catch(() => {
            // Optimistic row already shows the saved count.
          });
      }
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
    if (canWrite && (!feedback || feedback.kind !== "error")) {
      return <DashboardLoading label="Following inventory…" />;
    }
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
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5")}>
      <DashboardPageHero
        icon={Warehouse}
        title="Store room"
        description={
          connected
            ? "Pick a product, check what moved, edit the count."
            : "Back-room register — separate from till stock."
        }
      >
        {canWrite ? (
          <>
            {rows.length > 0 ? (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 shadow-none"
                onClick={() => openMovement(null, "out")}
              >
                <ArrowUpFromLine className="size-3.5" aria-hidden />
                Take out
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 shadow-none"
              onClick={() => setScannerOpen(true)}
            >
              <ScanLine className="size-3.5" aria-hidden />
              Scan
            </Button>
            {connected ? (
              <Button
                type="button"
                size="sm"
                variant={rows.length > 0 ? "outline" : "default"}
                className="h-8 gap-1.5 shadow-none"
                onClick={openPickerForCreate}
              >
                <Plus className="size-3.5" aria-hidden />
                Add product
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant={rows.length > 0 ? "outline" : "default"}
                className="h-8 gap-1.5 shadow-none"
                onClick={openCustomCreate}
              >
                <Plus className="size-3.5" aria-hidden />
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
        rows={rows}
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
        onPutIn={(row) => openMovement(row ?? null, "in")}
        onInheritOrder={() => setInheritOpen(true)}
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

      <StoreRoomInheritOrderDrawer
        open={inheritOpen}
        onOpenChange={setInheritOpen}
        connected={connected}
        branchId={branchId}
        onApplied={() => {
          setActivityToken((n) => n + 1);
          refreshQuietly();
          setFeedback({
            kind: "success",
            text: "Delivery is on the shelf.",
          });
        }}
      />

      <StoreRoomMovementDrawer
        key={movementKey}
        open={movementOpen}
        onOpenChange={setMovementOpen}
        rows={rows}
        connected={connected}
        approvalThreshold={approvalThreshold}
        branchId={branchId}
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
            : "Search, tick several products — or a supplier’s whole list — and add them in one go."
        }
        takenItemIds={takenItemIds}
        initialQuery={pickerQuery}
        busy={pickBusy}
        onPick={linkRow ? (item) => void linkProduct(item) : undefined}
        onAdd={linkRow ? undefined : (items) => void createFromProducts(items)}
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
