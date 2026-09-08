"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Package, Pencil, Plus, Search, Trash2, Warehouse } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
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
import {
  ApiRequestError,
  createStoreItem,
  deleteStoreItem,
  fetchStoreItems,
  updateStoreItem,
  type StoreItemRecord,
} from "@/lib/api";
import { formatMoney, resolveCurrencyCode } from "@/lib/money";
import { DEFAULT_PROBLEM_TITLE } from "@/lib/problem";
import { cn } from "@/lib/utils";

function mutationError(error: unknown, fallback = DEFAULT_PROBLEM_TITLE): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

type Feedback = { kind: "success" | "error"; text: string } | null;

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

export function StoreWorkspace({ canWrite }: { canWrite: boolean }) {
  const { business } = useDashboard();
  const currency = resolveCurrencyCode(business?.currency);

  const [rows, setRows] = useState<StoreItemRecord[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [query, setQuery] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<Draft>(EMPTY_DRAFT);
  const [createBusy, setCreateBusy] = useState(false);

  const [editRow, setEditRow] = useState<StoreItemRecord | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editBusy, setEditBusy] = useState(false);

  const [deleteRow, setDeleteRow] = useState<StoreItemRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchStoreItems()
      .then((list) => {
        setRows(list);
        setLoadFailed(false);
      })
      .catch(() => {
        setLoadFailed(true);
        setRows([]);
        setFeedback({ kind: "error", text: "Failed to load store items." });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const name = row.name.toLowerCase();
      const barcode = (row.barcode ?? "").toLowerCase();
      return name.includes(q) || barcode.includes(q);
    });
  }, [rows, query]);

  const openCreate = () => {
    setCreateDraft(EMPTY_DRAFT);
    setCreateOpen(true);
    setFeedback(null);
  };

  const openEdit = (row: StoreItemRecord) => {
    setEditRow(row);
    setEditDraft(draftFromRow(row));
    setFeedback(null);
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
      setFeedback({ kind: "error", text: "Quantity must be a whole number ≥ 0." });
      return;
    }
    if (buyingPrice === undefined) {
      setFeedback({ kind: "error", text: "Buying price must be a number ≥ 0." });
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
    const quantity = parseQuantity(editDraft.quantity);
    const buyingPrice = parseBuyingPrice(editDraft.buyingPrice);
    if (!name) {
      setFeedback({ kind: "error", text: "Name is required." });
      return;
    }
    if (quantity == null) {
      setFeedback({ kind: "error", text: "Quantity must be a whole number ≥ 0." });
      return;
    }
    if (buyingPrice === undefined) {
      setFeedback({ kind: "error", text: "Buying price must be a number ≥ 0." });
      return;
    }
    setEditBusy(true);
    setFeedback(null);
    try {
      const updated = await updateStoreItem(editRow.id, {
        name,
        barcode: editDraft.barcode.trim(),
        quantity,
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

  if (loading && rows.length === 0 && !loadFailed) {
    return <DashboardLoading label="Loading store room…" />;
  }

  if (loadFailed && rows.length === 0) {
    return (
      <DashboardLoadError
        title="Store room"
        message="Could not load store items."
        onRetry={load}
      />
    );
  }

  return (
    <div className={cn("mx-auto space-y-6", DASHBOARD_MAX_WIDE)}>
      <DashboardPageHero
        icon={Warehouse}
        eyebrow="Products"
        title="Store room"
        description="A simple list of items in the store — name, barcode, count, optional expiry and buy price. Separate from sellable inventory."
      >
        {canWrite ? (
          <Button type="button" className="gap-2 shadow-sm" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            Add item
          </Button>
        ) : null}
      </DashboardPageHero>

      {feedback ? (
        <DashboardFeedback kind={feedback.kind} text={feedback.text} />
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
            placeholder="Search by name or barcode…"
            aria-label="Search store items"
          />
        </label>
        <p className={cn(dashboardHintClass(), "tabular-nums")}>
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          {query.trim() ? ` · of ${rows.length}` : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <div
          className={cn(
            DASHBOARD_SECTION_SURFACE,
            "border-dashed bg-muted/15 py-12 text-center",
          )}
        >
          <Package
            className="mx-auto size-10 text-muted-foreground/60"
            aria-hidden
          />
          <h2 className="mt-4 text-base font-semibold tracking-tight text-foreground">
            No store items yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Record what’s in the store room without touching product inventory.
          </p>
          {canWrite ? (
            <Button
              type="button"
              className="mt-6 gap-2 shadow-sm"
              onClick={openCreate}
            >
              <Plus className="size-4" aria-hidden />
              Add item
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
            No items match “{query.trim()}”.
          </p>
        </div>
      ) : (
        <div className={DASHBOARD_TABLE_SURFACE}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/50 bg-muted/25">
              <tr>
                <th
                  scope="col"
                  className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                >
                  Barcode
                </th>
                <th
                  scope="col"
                  className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                >
                  Number
                </th>
                <th
                  scope="col"
                  className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                >
                  Expiry
                </th>
                <th
                  scope="col"
                  className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                >
                  Buy price
                </th>
                {canWrite ? (
                  <th
                    scope="col"
                    className="px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                  >
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-5 py-4 font-medium text-foreground sm:px-6">
                    {row.name}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-muted-foreground sm:px-6">
                    {row.barcode || "—"}
                  </td>
                  <td className="px-5 py-4 tabular-nums text-foreground sm:px-6">
                    {row.quantity}
                  </td>
                  <td className="px-5 py-4 tabular-nums text-muted-foreground sm:px-6">
                    {row.expiryDate || "—"}
                  </td>
                  <td className="px-5 py-4 tabular-nums text-muted-foreground sm:px-6">
                    {row.buyingPrice == null || row.buyingPrice === ""
                      ? "—"
                      : formatMoney(row.buyingPrice, currency)}
                  </td>
                  {canWrite ? (
                    <td className="px-5 py-4 text-right sm:px-6">
                      <div className="flex items-center justify-end gap-1">
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

      <StoreItemFormDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add store item"
        description="Name and count are required. Barcode, expiry, and buy price are optional."
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
        description="Update the store-room record. This does not change inventory stock."
        draft={editDraft}
        onDraftChange={setEditDraft}
        busy={editBusy}
        submitLabel="Save changes"
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
  onSubmit: () => void;
}) {
  const set =
    (key: keyof Draft) =>
    (value: string) =>
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
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
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
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Number
          </span>
          <input
            className={dashboardInputClass()}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={draft.quantity}
            onChange={(e) => set("quantity")(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
