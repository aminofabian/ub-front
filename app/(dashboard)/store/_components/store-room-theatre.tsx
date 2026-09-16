"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpFromLine,
  ChevronRight,
  Link2,
  Link2Off,
  Loader2,
  Package,
  PackageSearch,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/components/form-drawer";
import { APP_ROUTES } from "@/lib/config";
import { formatMoney, resolveCurrencyCode } from "@/lib/money";
import type { StoreItemRecord } from "@/lib/api";
import type { SupplyPackMode } from "@/lib/supply-pack-math";
import { cn } from "@/lib/utils";

import { storeItemCount } from "../_lib/store-item-count";
import {
  catalogNativePack,
  isPacked,
  packBreakdownLabel,
  packStockEach,
  type StorePackCatalog,
} from "../_lib/store-item-pack";
import { StorePackCountField } from "./store-pack-count-field";
import { StoreRoomActivity } from "./store-room-activity";
import { StoreRoomPulse } from "./store-room-pulse";

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 rounded-full bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function formatQuantity(value: number | string | null): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export type StoreInspectDraft = {
  name: string;
  barcode: string;
  quantity: string;
  expiryDate: string;
  buyingPrice: string;
};

export function StoreRoomTheatre({
  connected,
  canWrite,
  canDecide,
  requireSeparateApprover,
  currentUserId,
  currency,
  settingsBanner,
  query,
  onQueryChange,
  onlyUnlinked,
  onToggleUnlinked,
  unlinkedCount,
  filtered,
  rows,
  rowsTotal,
  selectedId,
  selectedRow,
  maxCount,
  onSelect,
  onClearSelection,
  mobileShowDetail,
  mobileDetailTab,
  onMobileDetailTab,
  activityToken,
  onPutIn,
  onRecorded,
  onTakeOut,
  onLink,
  onUnlink,
  rowBusyId,
  draft,
  onDraftChange,
  packCatalog,
  packMode,
  onPackModeChange,
  editBusy,
  onSave,
  onDelete,
  onAddCustom,
}: {
  connected: boolean;
  canWrite: boolean;
  canDecide: boolean;
  /** Nobody may approve a take-out they raised themselves. */
  requireSeparateApprover: boolean;
  /** The signed-in user, so the history can tell "mine" from someone else's. */
  currentUserId: string | null;
  currency: string;
  settingsBanner: ReactNode;
  query: string;
  onQueryChange: (value: string) => void;
  onlyUnlinked: boolean;
  onToggleUnlinked: () => void;
  unlinkedCount: number;
  filtered: StoreItemRecord[];
  /** Full room register — used for the pulse board when nothing is selected. */
  rows: StoreItemRecord[];
  rowsTotal: number;
  selectedId: string | null;
  selectedRow: StoreItemRecord | null;
  maxCount: number;
  onSelect: (row: StoreItemRecord) => void;
  onClearSelection: () => void;
  mobileShowDetail: boolean;
  mobileDetailTab: "history" | "edit";
  onMobileDetailTab: (tab: "history" | "edit") => void;
  activityToken: number;
  onPutIn: () => void;
  onRecorded: () => void;
  onTakeOut: (row: StoreItemRecord) => void;
  onLink: (row: StoreItemRecord) => void;
  onUnlink: (row: StoreItemRecord) => void;
  rowBusyId: string | null;
  draft: StoreInspectDraft;
  onDraftChange: (draft: StoreInspectDraft) => void;
  packCatalog: StorePackCatalog | null;
  packMode: SupplyPackMode | null;
  onPackModeChange: (next: SupplyPackMode | null) => void;
  editBusy: boolean;
  onSave: () => void;
  onDelete: (row: StoreItemRecord) => void;
  onAddCustom?: () => void;
}) {
  const mobileDetailOpen = mobileShowDetail && !!selectedRow;

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;
    return (
    <div
      className={cn(
        "flex min-h-0 flex-col bg-white",
        fill && "h-full",
      )}
    >
      <div
        className={cn(
          "shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white px-2.5 py-2 sm:px-3",
          !fill && "sticky top-0 z-[1]",
        )}
      >
        <div className="flex items-center gap-1.5">
          <label className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(dashboardInputClass(), "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]")}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search name or barcode…"
              aria-label="Search store items"
            />
          </label>
          {connected && unlinkedCount > 0 ? (
            <button
              type="button"
              onClick={onToggleUnlinked}
              aria-pressed={onlyUnlinked}
              title="Show unlinked only"
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1 border px-2 text-[11px] font-semibold lg:h-8 lg:px-1.5",
                onlyUnlinked
                  ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] text-[var(--pos-primary,#0f766e)]"
                  : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
              )}
            >
              <Link2Off className="size-3.5" aria-hidden />
              {unlinkedCount}
            </button>
          ) : null}
        </div>
        <p className={cn(dashboardHintClass(), "mt-1 tabular-nums")}>
          {filtered.length}
          {query.trim() || onlyUnlinked ? ` of ${rowsTotal}` : ""} item
          {filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div
        className={cn(
          "min-h-0",
          fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
        )}
      >
        {rowsTotal === 0 ? (
          <div className="px-3 py-10 text-center">
            {connected ? (
              <PackageSearch
                className="mx-auto size-7 text-muted-foreground/60"
                aria-hidden
              />
            ) : (
              <Package
                className="mx-auto size-7 text-muted-foreground/60"
                aria-hidden
              />
            )}
            <p className="mt-2 text-[14px] font-semibold text-foreground">
              {connected ? "Nothing to follow yet" : "No store items yet"}
            </p>
            <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-[16rem]")}>
              {connected
                ? "Add products to watch — counts follow stock."
                : "Add what’s in the back without touching inventory."}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
            {onlyUnlinked
              ? "Everything on the list is linked."
              : `No items match “${query.trim()}”.`}
          </p>
        ) : (
          <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
            {filtered.map((row) => {
              const count = storeItemCount(row, connected);
              const active = selectedId === row.id;
              const fillBar = Math.min(100, Math.round((count / maxCount) * 100));
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(row)}
                    className={cn(
                      "relative flex w-full items-center gap-2.5 text-left transition-colors",
                      denser
                        ? "px-2.5 py-2 sm:px-3"
                        : "min-h-[3.25rem] px-3 py-3",
                      active
                        ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)]"
                        : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                    )}
                  >
                    {active ? (
                      <span
                        className="absolute inset-y-0 left-0 w-0.5 bg-[var(--pos-primary,#0f766e)]"
                        aria-hidden
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate font-semibold tracking-[-0.015em] text-foreground",
                          denser ? "text-[12.5px]" : "text-[14px]",
                        )}
                      >
                        {row.name}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                        {row.barcode || "No barcode"}
                        {connected && row.itemId
                          ? ` · ${row.inventoryItemName ?? "Linked"}`
                          : connected
                            ? " · Unlinked"
                            : ""}
                      </p>
                      <div className="mt-1.5 h-0.5 w-full bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
                        <div
                          className={cn(
                            "h-full",
                            connected && row.itemId
                              ? "bg-[var(--pos-primary,#0f766e)]"
                              : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_30%,transparent)]",
                          )}
                          style={{ width: `${fillBar}%` }}
                        />
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 tabular-nums">
                      {connected && row.itemId ? <LiveDot /> : null}
                      <span
                        className={cn(
                          "font-semibold leading-none tracking-[-0.03em] text-foreground",
                          denser ? "text-[14px]" : "text-[16px]",
                        )}
                      >
                        {formatQuantity(count)}
                      </span>
                      {!denser ? (
                        <ChevronRight
                          className="size-4 text-muted-foreground/70"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {connected && canWrite && onAddCustom ? (
        <button
          type="button"
          className={cn(
            dashboardHintClass(),
            "shrink-0 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-2.5 text-left underline-offset-4 hover:text-foreground hover:underline sm:px-3",
          )}
          onClick={onAddCustom}
        >
          Add a back-room line
        </button>
      ) : null}
    </div>
    );
  };

  const history = selectedRow ? (
    <StoreRoomActivity
      reloadToken={activityToken}
      canWrite={canWrite}
      canDecide={canDecide}
      requireSeparateApprover={requireSeparateApprover}
      currentUserId={currentUserId}
      onPutIn={undefined}
      onRecorded={onRecorded}
      focusStoreItemId={selectedRow.id}
      focusLabel={selectedRow.name}
      variant="theatre"
      className="h-full min-h-0"
    />
  ) : (
    <StoreRoomPulse
      rows={rows}
      connected={connected}
      reloadToken={activityToken}
      onPutIn={canWrite ? onPutIn : undefined}
      onSelect={onSelect}
      onShowUnlinked={
        connected && unlinkedCount > 0
          ? () => {
              if (!onlyUnlinked) onToggleUnlinked();
            }
          : undefined
      }
      className="h-full min-h-0"
    />
  );

  const inspect =
    selectedRow && canWrite ? (
      <InspectPanel
        row={selectedRow}
        connected={connected}
        currency={currency}
        maxCount={maxCount}
        draft={draft}
        onDraftChange={onDraftChange}
        packCatalog={packCatalog}
        packMode={packMode}
        onPackModeChange={onPackModeChange}
        busy={editBusy}
        rowBusyId={rowBusyId}
        onSave={onSave}
        onTakeOut={() => onTakeOut(selectedRow)}
        onLink={() => onLink(selectedRow)}
        onUnlink={() => onUnlink(selectedRow)}
        onDelete={() => onDelete(selectedRow)}
      />
    ) : selectedRow ? (
      <div className="flex h-full flex-col bg-white px-4 py-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Details
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight">
          {selectedRow.name}
        </h3>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          You can view this row, but you need write access to edit it.
        </p>
      </div>
    ) : (
      <div className="flex h-full flex-col items-center justify-center bg-white px-6 py-10 text-center">
        <Package className="size-8 text-muted-foreground/50" aria-hidden />
        <p className="mt-3 text-[14px] font-semibold text-foreground">
          Pick an item
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 max-w-[14rem]")}>
          Select from the list to see history and edit its details.
        </p>
      </div>
    );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      {settingsBanner}

      {/* Desktop theatre */}
      <div
        className={cn(
          "hidden h-[min(72dvh,44rem)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white lg:grid",
          "lg:grid-cols-[minmax(15rem,18rem)_minmax(12.5rem,15rem)_minmax(17rem,1fr)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
          {roster({ fill: true, denser: true })}
        </div>
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]">
          {history}
        </div>
        <div className="flex h-full min-h-0 flex-col bg-white">{inspect}</div>
      </div>

      {/* Mobile: full item list on the page; tap opens an edit sheet. */}
      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={mobileDetailOpen}
        onOpenChange={(open) => {
          if (!open) onClearSelection();
        }}
        contextLabel="Store item"
        title={selectedRow?.name ?? "Item"}
        description={
          selectedRow
            ? [
                selectedRow.barcode || null,
                `${formatQuantity(storeItemCount(selectedRow, connected))} on hand`,
              ]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        headerDensity="compact"
        bodyLayout="fill"
      >
        {selectedRow ? (
          <div className="flex h-[min(82dvh,42rem)] min-h-0 flex-col overflow-hidden bg-white sm:h-auto sm:min-h-0 sm:flex-1">
            <div className="flex shrink-0 gap-px border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2 py-2">
              {(
                [
                  { id: "edit" as const, label: "Edit" },
                  { id: "history" as const, label: "History" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onMobileDetailTab(tab.id)}
                  className={cn(
                    "h-9 flex-1 text-[13px] font-semibold transition-colors",
                    mobileDetailTab === tab.id
                      ? "bg-[var(--pos-primary,#0f766e)] text-white"
                      : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] text-muted-foreground active:bg-muted",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {mobileDetailTab === "history" ? history : inspect}
            </div>
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}

function InspectPanel({
  row,
  connected,
  currency,
  maxCount,
  draft,
  onDraftChange,
  packCatalog,
  packMode,
  onPackModeChange,
  busy,
  rowBusyId,
  onSave,
  onTakeOut,
  onLink,
  onUnlink,
  onDelete,
}: {
  row: StoreItemRecord;
  connected: boolean;
  currency: string;
  maxCount: number;
  draft: StoreInspectDraft;
  onDraftChange: (draft: StoreInspectDraft) => void;
  packCatalog: StorePackCatalog | null;
  packMode: SupplyPackMode | null;
  onPackModeChange: (next: SupplyPackMode | null) => void;
  busy: boolean;
  rowBusyId: string | null;
  onSave: () => void;
  onTakeOut: () => void;
  onLink: () => void;
  onUnlink: () => void;
  onDelete: () => void;
}) {
  const count = storeItemCount(row, connected);
  const fill = Math.min(100, Math.round((count / maxCount) * 100));
  const followsInventory = connected && row.itemId != null;
  const set = (key: keyof StoreInspectDraft) => (value: string) =>
    onDraftChange({ ...draft, [key]: value });
  const breakdownPack = isPacked(packMode)
    ? packMode
    : catalogNativePack(packCatalog);
  const onHandEach = packStockEach(count, packCatalog);
  const onHandBreakdown = packBreakdownLabel(onHandEach, breakdownPack);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold tracking-tight text-foreground">
              {row.name}
            </h3>
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              {[
                row.barcode || null,
                row.expiryDate || null,
                row.buyingPrice == null || row.buyingPrice === ""
                  ? null
                  : formatMoney(
                      row.buyingPrice,
                      resolveCurrencyCode(currency),
                    ),
              ]
                .filter(Boolean)
                .join(" · ") || "No barcode · no expiry"}
            </p>
          </div>
          <span className="inline-flex shrink-0 flex-col items-end gap-0.5 tabular-nums">
            <span className="inline-flex items-baseline gap-1">
              {connected && row.itemId ? <LiveDot /> : null}
              <span className="text-[1.35rem] font-semibold leading-none tracking-[-0.03em] text-foreground">
                {onHandBreakdown
                  ? formatQuantity(onHandEach)
                  : formatQuantity(count)}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                {onHandBreakdown
                  ? "each"
                  : packCatalog && packCatalog.displayToHolderFactor > 1
                    ? packCatalog.catalogPackUnit
                    : null}
              </span>
            </span>
            {onHandBreakdown ? (
              <span className="max-w-[11rem] text-right text-[10px] font-medium leading-tight text-muted-foreground">
                {onHandBreakdown}
              </span>
            ) : null}
          </span>
        </div>
        <div className="mt-1.5 h-0.5 w-full bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
          <div
            className="h-full bg-[var(--pos-primary,#0f766e)] transition-[width] duration-200"
            style={{ width: `${fill}%` }}
          />
        </div>
      </div>

      <form
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-2.5 py-2.5 sm:px-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <label className="block space-y-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Name
          </span>
          <input
            className={cn(dashboardInputClass(), "h-8 text-[13px]")}
            value={draft.name}
            onChange={(e) => set("name")(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Barcode
          </span>
          <input
            className={cn(dashboardInputClass(), "h-8 text-[13px]")}
            value={draft.barcode}
            onChange={(e) => set("barcode")(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <StorePackCountField
          value={draft.quantity}
          onChange={set("quantity")}
          packMode={packMode}
          onPackModeChange={onPackModeChange}
          catalog={packCatalog}
          followsInventory={followsInventory}
          onHandEach={followsInventory ? onHandEach : null}
          disabled={busy}
        />
        <div className="grid grid-cols-2 gap-1.5">
          <label className="block space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              Expiry
            </span>
            <input
              className={cn(dashboardInputClass(), "h-8 text-[13px]")}
              type="date"
              value={draft.expiryDate}
              onChange={(e) => set("expiryDate")(e.target.value)}
            />
          </label>
          <label className="block space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              Buy price
            </span>
            <input
              className={cn(dashboardInputClass(), "h-8 text-[13px]")}
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={draft.buyingPrice}
              onChange={(e) => set("buyingPrice")(e.target.value)}
              placeholder="Optional"
            />
          </label>
        </div>
      </form>

      <div className="shrink-0 space-y-1 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] p-2.5 sm:p-3">
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 shadow-none"
            onClick={onTakeOut}
          >
            <ArrowUpFromLine className="size-3.5" aria-hidden />
            Take out
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shadow-none"
            disabled={busy}
            onClick={onSave}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : null}
            Save
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-0.5">
          {connected ? (
            row.itemId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-1.5 text-[11px]"
                disabled={rowBusyId === row.id}
                onClick={onUnlink}
              >
                {rowBusyId === row.id ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
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
                className="h-7 gap-1 px-1.5 text-[11px]"
                onClick={onLink}
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
            className="h-7 gap-1 px-1.5 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Remove
          </Button>
          {connected ? (
            <Link
              href={APP_ROUTES.inventoryStock}
              className="ml-auto inline-flex h-7 items-center px-1.5 text-[11px] font-medium text-[var(--pos-primary,#0f766e)] underline-offset-4 hover:underline"
            >
              Stock levels
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function StoreModeBanner({
  connected,
  canWrite,
  modeBusy,
  itemCount,
  linkedCount,
  unlinkedCount,
  approvalThreshold,
  requireSeparateApprover = false,
  onApprovals,
  onStopFollowing,
  onFollowInventory,
}: {
  connected: boolean;
  canWrite: boolean;
  modeBusy: boolean;
  itemCount: number;
  linkedCount: number;
  unlinkedCount: number;
  approvalThreshold: number | null;
  /** Nobody may approve a take-out they raised themselves. */
  requireSeparateApprover?: boolean;
  onApprovals: () => void;
  onStopFollowing: () => void;
  onFollowInventory: () => void;
}) {
  if (connected) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
          "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
        )}
      >
        <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <LiveDot />
            Following inventory
          </span>
          <span className={dashboardHintClass()}>
            {itemCount === 0
              ? "Add a product to start tracking stock."
              : `${linkedCount}/${itemCount} linked${
                  unlinkedCount > 0 ? ` · ${unlinkedCount} open` : ""
                }`}
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          {canWrite ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-1.5 text-[11px]"
              onClick={onApprovals}
              title={
                requireSeparateApprover
                  ? "Take-outs above the limit need somebody else's approval"
                  : undefined
              }
            >
              {requireSeparateApprover ? (
                <ShieldCheck
                  className="size-3.5 text-[var(--pos-primary,#0f766e)]"
                  aria-hidden
                />
              ) : null}
              {approvalThreshold == null
                ? "Approvals off"
                : `Approvals > ${approvalThreshold}`}
            </Button>
          ) : null}
          {canWrite ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-[11px]"
              disabled={modeBusy}
              onClick={onStopFollowing}
            >
              {modeBusy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              Stop
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
        <span className="font-semibold text-foreground">Back-room only</span>
        <span className={dashboardHintClass()}>
          Counts stay as you type them.
        </span>
      </p>
      {canWrite ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px]"
          disabled={modeBusy}
          onClick={onFollowInventory}
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
  );
}
