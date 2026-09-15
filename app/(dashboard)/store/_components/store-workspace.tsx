"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpFromLine,
  Link2,
  Link2Off,
  Loader2,
  Package,
  PackageSearch,
  Pencil,
  Plus,
  RefreshCcw,
  ScanLine,
  Search,
  Trash2,
  Warehouse,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
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
import { useStoreRoomRealtime } from "@/hooks/use-store-room-realtime";
import {
  ApiRequestError,
  createStoreItem,
  deleteStoreItem,
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
import { APP_ROUTES } from "@/lib/config";
import { formatMoney, resolveCurrencyCode } from "@/lib/money";
import { hasPermission, Permission } from "@/lib/permissions";
import { DEFAULT_PROBLEM_TITLE } from "@/lib/problem";
import { cn } from "@/lib/utils";

import { StoreRoomActivity } from "./store-room-activity";
import { StoreRoomConnectionChooser } from "./store-room-connection-chooser";
import { StoreRoomMovementDrawer } from "./store-room-movement-drawer";
import { StoreRoomProductPicker } from "./store-room-product-picker";

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

function draftFromRow(row: StoreItemRecord): Draft {
  return {
    name: row.name,
    barcode: row.barcode ?? "",
    quantity: String(row.quantity),
    expiryDate: row.expiryDate ?? "",
    buyingPrice:
      row.buyingPrice == null || row.buyingPrice === ""
        ? ""
        : String(row.buyingPrice),
  };
}

function parseQuantity(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
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

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 rounded-full bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

export function StoreWorkspace({ canWrite }: { canWrite: boolean }) {
  const { business, me } = useDashboard();
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
      setSettings(nextSettings);
      setRows(await fetchStoreItems());
      setOnlyUnlinked(false);
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

  const openEdit = (row: StoreItemRecord) => {
    setEditRow(row);
    setEditDraft(draftFromRow(row));
    setFeedback(null);
  };

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
    setApprovalError(null);
    setApprovalOpen(true);
  };

  const saveApprovalThreshold = async (clear: boolean) => {
    setApprovalBusy(true);
    setApprovalError(null);
    try {
      if (clear) {
        setSettings(await updateStoreRoomSettings({ clearApprovalThreshold: true }));
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
        setSettings(await updateStoreRoomSettings({ approvalThreshold: n }));
        setFeedback({
          kind: "success",
          text: `Take-outs of more than ${n} will wait for approval.`,
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
    const quantity = parseQuantity(createDraft.quantity);
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
    // A linked count belongs to inventory, so don't send a manual one for it.
    const countLocked = connected && editRow.itemId != null;
    const quantity = countLocked
      ? editRow.quantity
      : parseQuantity(editDraft.quantity);
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
    setEditBusy(true);
    setFeedback(null);
    try {
      const updated = await updateStoreItem(editRow.id, {
        name,
        barcode: editDraft.barcode.trim(),
        quantity: countLocked ? undefined : quantity,
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
      setEditRow(null);
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
    <div className={DASHBOARD_MAX_WIDE}>
      <DashboardPageHero
        icon={Warehouse}
        eyebrow="Stock"
        title="Store room"
        description={
          connected
            ? "Mirrors the products you sell. Counts come from stock and move on their own as products sell."
            : "A simple list of items in the store — name, barcode, count, optional expiry and buy price. Separate from sellable inventory."
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

      {connected ? (
        <div
          className={cn(
            DASHBOARD_SECTION_SURFACE,
            "flex flex-wrap items-start justify-between gap-3",
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] text-[var(--pos-primary,#0f766e)]">
              <RefreshCcw className="size-3.5" aria-hidden />
            </span>
            <div>
              <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                Following inventory
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--pos-primary,#0f766e)]">
                  <LiveDot />
                  Live
                </span>
              </p>
              <p className={dashboardHintClass()}>
                {settings.itemCount === 0
                  ? "No products followed yet — add one to start tracking its stock."
                  : `${settings.linkedCount} of ${settings.itemCount} item${
                      settings.itemCount === 1 ? "" : "s"
                    } track a product${
                      settings.unlinkedCount > 0
                        ? ` · ${settings.unlinkedCount} still to link`
                        : ""
                    }. Counts refresh as sales come in.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canWrite ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={openApprovalThreshold}
              >
                {approvalThreshold == null
                  ? "Approvals off"
                  : `Approvals > ${approvalThreshold}`}
              </Button>
            ) : null}
            <Link
              href={APP_ROUTES.inventoryStock}
              className={cn(
                "inline-flex h-8 items-center px-2.5 text-xs font-medium text-[var(--pos-primary,#0f766e)] underline-offset-4 hover:underline",
              )}
            >
              See stock levels
            </Link>
            {canWrite ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={modeBusy}
                onClick={() => void chooseMode("standalone")}
              >
                {modeBusy ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : null}
                Stop following
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            DASHBOARD_SECTION_SURFACE,
            "flex flex-wrap items-start justify-between gap-3",
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center border text-muted-foreground">
              <Package className="size-3.5" aria-hidden />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                Back-room only
              </p>
              <p className={dashboardHintClass()}>
                Counts stay exactly as you type them. Follow inventory and this
                list will move on its own as products sell.
              </p>
            </div>
          </div>
          {canWrite ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              disabled={modeBusy}
              onClick={() => void chooseMode("connected")}
            >
              {modeBusy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Link2 className="size-3.5" aria-hidden />
              )}
              Follow inventory
            </Button>
          ) : null}
        </div>
      )}

      {rows.length > 0 ? (
        <StoreRoomActivity
          reloadToken={activityToken}
          canWrite={canWrite}
          canDecide={canDecide}
          onPutIn={() => openMovement(null, "in")}
          onRecorded={refreshQuietly}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative block min-w-[min(100%,18rem)] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            className={cn(dashboardInputClass(), "pl-9")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, barcode, or product…"
            aria-label="Search store items"
          />
        </label>
        <div className="flex items-center gap-3">
          {connected && settings.unlinkedCount > 0 ? (
            <button
              type="button"
              onClick={() => setOnlyUnlinked((prev) => !prev)}
              aria-pressed={onlyUnlinked}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 border px-2.5 text-xs font-medium transition-colors",
                onlyUnlinked
                  ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)] text-[var(--pos-primary,#0f766e)]"
                  : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_15%,transparent)] text-muted-foreground hover:text-foreground",
              )}
            >
              <Link2Off className="size-3.5" aria-hidden />
              Needs linking ({settings.unlinkedCount})
            </button>
          ) : null}
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            {query.trim() || onlyUnlinked ? ` · of ${rows.length}` : ""}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          className={cn(
            DASHBOARD_SECTION_SURFACE,
            "border-dashed bg-muted/15 py-12 text-center",
          )}
        >
          {connected ? (
            <PackageSearch
              className="mx-auto size-10 text-muted-foreground/60"
              aria-hidden
            />
          ) : (
            <Package
              className="mx-auto size-10 text-muted-foreground/60"
              aria-hidden
            />
          )}
          <h2 className="mt-4 text-base font-semibold tracking-tight text-foreground">
            {connected ? "Nothing to follow yet" : "No store items yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {connected
              ? "Pick the products you want this store room to keep an eye on. Their counts come straight from stock."
              : "Record what’s in the store room without touching product inventory."}
          </p>
          {canWrite ? (
            <Button
              type="button"
              className="mt-6 gap-2 shadow-none"
              onClick={connected ? openPickerForCreate : openCustomCreate}
            >
              <Plus className="size-4" aria-hidden />
              {connected ? "Add from products" : "Add item"}
            </Button>
          ) : null}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className={cn(
            DASHBOARD_SECTION_SURFACE,
            "border-dashed bg-muted/15 py-10 text-center",
          )}
        >
          <p className="text-sm text-muted-foreground">
            {onlyUnlinked
              ? "Everything on the list is linked to a product."
              : `No items match “${query.trim()}”.`}
          </p>
        </div>
      ) : (
        <div className={DASHBOARD_TABLE_SURFACE}>
          <table className="w-full text-left text-sm">
            <thead className={DASHBOARD_TABLE_HEAD}>
              <tr>
                <th
                  scope="col"
                  className="px-3 py-1.5 font-sans text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground sm:px-3.5"
                >
                  Name
                </th>
                {connected ? (
                  <th
                    scope="col"
                    className="px-3 py-1.5 font-sans text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground sm:px-3.5"
                  >
                    Product
                  </th>
                ) : null}
                <th
                  scope="col"
                  className="px-3 py-1.5 font-sans text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground sm:px-3.5"
                >
                  Barcode
                </th>
                <th
                  scope="col"
                  className="px-3 py-1.5 font-sans text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground sm:px-3.5"
                >
                  Count
                </th>
                <th
                  scope="col"
                  className="px-3 py-1.5 font-sans text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground sm:px-3.5"
                >
                  Expiry
                </th>
                <th
                  scope="col"
                  className="px-3 py-1.5 font-sans text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground sm:px-3.5"
                >
                  Buy price
                </th>
                {canWrite ? (
                  <th
                    scope="col"
                    className="px-3 py-1.5 text-right font-sans text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground sm:px-3.5"
                  >
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-3 py-2 font-medium text-foreground sm:px-3.5">
                    {row.name}
                  </td>
                  {connected ? (
                    <td className="px-3 py-2 text-muted-foreground sm:px-3.5">
                      {row.itemId ? (
                        row.inventoryItemName ?? "Linked product"
                      ) : (
                        <span className="text-muted-foreground/70">
                          Not linked
                        </span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground sm:px-3.5">
                    {row.barcode || "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-foreground sm:px-3.5">
                    {connected && row.itemId ? (
                      <span
                        className="inline-flex items-center gap-1.5"
                        title="Live from inventory"
                      >
                        <LiveDot />
                        <span className="font-medium">
                          {formatQuantity(row.inventoryQuantity)}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-medium">{row.quantity}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          manual
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground sm:px-3.5">
                    {row.expiryDate || "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground sm:px-3.5">
                    {row.buyingPrice == null || row.buyingPrice === ""
                      ? "—"
                      : formatMoney(row.buyingPrice, currency)}
                  </td>
                  {canWrite ? (
                    <td className="px-3 py-2 text-right sm:px-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {connected ? (
                          row.itemId ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 px-2 text-xs hover:bg-muted"
                              disabled={rowBusyId === row.id}
                              onClick={() => void unlinkRow(row)}
                            >
                              {rowBusyId === row.id ? (
                                <Loader2
                                  className="size-3.5 animate-spin"
                                  aria-hidden
                                />
                              ) : (
                                <Link2Off className="size-3.5" aria-hidden />
                              )}
                              Unlink
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 px-2 text-xs hover:bg-muted"
                              onClick={() => openPickerForLink(row)}
                            >
                              <Link2 className="size-3.5" aria-hidden />
                              Link
                            </Button>
                          )
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2 text-xs hover:bg-muted"
                          onClick={() => openMovement(row, "out")}
                        >
                          <ArrowUpFromLine className="size-3.5" aria-hidden />
                          Take out
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2 text-xs hover:bg-muted"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteRow(row)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          Remove
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {connected && canWrite ? (
        <button
          type="button"
          className={cn(
            dashboardHintClass(),
            "self-start text-left underline-offset-4 hover:text-foreground hover:underline",
          )}
          onClick={openCustomCreate}
        >
          Can&apos;t find it in your products? Add a back-room line instead.
        </button>
      ) : null}

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

      <StoreItemFormDrawer
        open={editRow != null}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
        title="Edit store item"
        description={
          connected && editRow?.itemId
            ? "Rename it, restock notes, or unlink it to count by hand again."
            : connected
              ? "Update the back-room record. Link it to a product to have its count follow stock."
              : "Update the store-room record. This does not change inventory stock."
        }
        draft={editDraft}
        onDraftChange={setEditDraft}
        busy={editBusy}
        submitLabel="Save changes"
        quantityLocked={connected && editRow?.itemId != null}
        quantityHint={
          connected && editRow?.itemId
            ? "Count comes from inventory while this is linked."
            : undefined
        }
        onSubmit={() => void handleEdit()}
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
