"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpFromLine,
  Link2,
  Link2Off,
  Loader2,
  Package,
  PackageSearch,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { formatMoney, resolveCurrencyCode } from "@/lib/money";
import type { StoreItemRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { StoreRoomActivity } from "./store-room-activity";

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

function displayCount(row: StoreItemRecord, connected: boolean): number {
  if (connected && row.itemId != null) {
    const n = Number(row.inventoryQuantity ?? 0);
    return Number.isFinite(n) ? n : 0;
  }
  return row.quantity;
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
  editBusy: boolean;
  onSave: () => void;
  onDelete: (row: StoreItemRecord) => void;
  onAddCustom?: () => void;
}) {
  const roster = (
    <div className="flex min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-2.5 sm:px-3.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]">
          In the room
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(dashboardInputClass(), "h-9 pl-8 text-[13px]")}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Name or barcode…"
              aria-label="Search store items"
            />
          </label>
          {connected && unlinkedCount > 0 ? (
            <button
              type="button"
              onClick={onToggleUnlinked}
              aria-pressed={onlyUnlinked}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1 border px-2 text-[11px] font-semibold",
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
        <p className={cn(dashboardHintClass(), "mt-1.5 tabular-nums")}>
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          {query.trim() || onlyUnlinked ? ` · of ${rowsTotal}` : ""}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {rowsTotal === 0 ? (
          <div className="px-4 py-10 text-center">
            {connected ? (
              <PackageSearch
                className="mx-auto size-9 text-muted-foreground/60"
                aria-hidden
              />
            ) : (
              <Package
                className="mx-auto size-9 text-muted-foreground/60"
                aria-hidden
              />
            )}
            <p className="mt-3 text-[14px] font-semibold text-foreground">
              {connected ? "Nothing to follow yet" : "No store items yet"}
            </p>
            <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-[16rem]")}>
              {connected
                ? "Pick products to watch — counts follow stock."
                : "Add what’s in the back without touching inventory."}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className={cn(dashboardHintClass(), "px-4 py-8 text-center")}>
            {onlyUnlinked
              ? "Everything on the list is linked."
              : `No items match “${query.trim()}”.`}
          </p>
        ) : (
          <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
            {filtered.map((row) => {
              const count = displayCount(row, connected);
              const active = selectedId === row.id;
              const fill = Math.min(100, Math.round((count / maxCount) * 100));
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(row)}
                    className={cn(
                      "relative flex w-full flex-col gap-1.5 px-3 py-3 text-left transition-colors sm:px-3.5",
                      active
                        ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                        : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_5%,white)]",
                    )}
                  >
                    {active ? (
                      <span
                        className="absolute inset-y-0 left-0 w-0.5 bg-[var(--pos-primary,#0f766e)]"
                        aria-hidden
                      />
                    ) : null}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold tracking-[-0.015em] text-foreground">
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
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
                        {connected && row.itemId ? <LiveDot /> : null}
                        <span className="text-[15px] font-semibold leading-none tracking-[-0.03em] text-foreground">
                          {formatQuantity(count)}
                        </span>
                      </span>
                    </div>
                    <div className="h-1 w-full bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
                      <div
                        className={cn(
                          "h-full",
                          connected && row.itemId
                            ? "bg-[var(--pos-primary,#0f766e)]"
                            : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_35%,transparent)]",
                        )}
                        style={{ width: `${fill}%` }}
                      />
                    </div>
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
            "shrink-0 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-2.5 text-left underline-offset-4 hover:text-foreground hover:underline sm:px-3.5",
          )}
          onClick={onAddCustom}
        >
          Can&apos;t find it? Add a back-room line.
        </button>
      ) : null}
    </div>
  );

  const history = (
    <StoreRoomActivity
      reloadToken={activityToken}
      canWrite={canWrite}
      canDecide={canDecide}
      requireSeparateApprover={requireSeparateApprover}
      currentUserId={currentUserId}
      onPutIn={selectedRow ? undefined : onPutIn}
      onRecorded={onRecorded}
      focusStoreItemId={selectedRow?.id ?? null}
      focusLabel={selectedRow?.name ?? null}
      variant="theatre"
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
    <div className="flex min-h-0 flex-col gap-2.5">
      {settingsBanner}

      {/* Desktop theatre */}
      <div
        className={cn(
          "hidden min-h-[min(70dvh,42rem)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,#f7f5f1)] lg:grid",
          "lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1.15fr)_minmax(18rem,24rem)]",
        )}
      >
        <div className="min-h-0 border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
          {roster}
        </div>
        <div className="min-h-0 border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
          {history}
        </div>
        <div className="min-h-0">{inspect}</div>
      </div>

      {/* Mobile / tablet */}
      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        {!mobileShowDetail || !selectedRow ? (
          <div
            className={cn(
              DASHBOARD_SECTION_SURFACE,
              "max-h-[min(70dvh,36rem)] overflow-hidden p-0",
            )}
          >
            {roster}
          </div>
        ) : (
          <div className="flex min-h-0 flex-col overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
            <div className="flex items-center gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2 py-2">
              <button
                type="button"
                onClick={onClearSelection}
                className="inline-flex size-9 items-center justify-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-muted-foreground"
                aria-label="Back to list"
              >
                <ArrowLeft className="size-4" aria-hidden />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold tracking-tight">
                  {selectedRow.name}
                </p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">
                  {selectedRow.barcode || "No barcode"} ·{" "}
                  {formatQuantity(displayCount(selectedRow, connected))}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] p-px">
              {(
                [
                  { id: "history" as const, label: "History" },
                  { id: "edit" as const, label: "Edit" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onMobileDetailTab(tab.id)}
                  className={cn(
                    "h-9 bg-white text-[12px] font-semibold",
                    mobileDetailTab === tab.id
                      ? "bg-[var(--pos-primary,#0f766e)] text-white"
                      : "text-muted-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="min-h-[min(55dvh,28rem)]">
              {mobileDetailTab === "history" ? history : inspect}
            </div>
          </div>
        )}
      </div>
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
  busy: boolean;
  rowBusyId: string | null;
  onSave: () => void;
  onTakeOut: () => void;
  onLink: () => void;
  onUnlink: () => void;
  onDelete: () => void;
}) {
  const count = displayCount(row, connected);
  const fill = Math.min(100, Math.round((count / maxCount) * 100));
  const quantityLocked = connected && row.itemId != null;
  const set = (key: keyof StoreInspectDraft) => (value: string) =>
    onDraftChange({ ...draft, [key]: value });

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-2.5 sm:px-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]">
          Inspect
        </p>
        <h3 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-foreground">
          {row.name}
        </h3>
        <div className="mt-2.5">
          <div className="flex items-end justify-between gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              On hand
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              {connected && row.itemId ? <LiveDot /> : null}
              <span
                className="text-[1.65rem] font-semibold leading-none tracking-[-0.04em]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {formatQuantity(count)}
              </span>
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
            <div
              className="h-full bg-[var(--pos-primary,#0f766e)] transition-[width] duration-300"
              style={{ width: `${fill}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-px overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
            {(
              [
                ["Barcode", row.barcode || "—"],
                ["Expiry", row.expiryDate || "—"],
                [
                  "Buy",
                  row.buyingPrice == null || row.buyingPrice === ""
                    ? "—"
                    : formatMoney(row.buyingPrice, resolveCurrencyCode(currency)),
                ],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="bg-white px-2 py-1.5">
                <p className="text-[9px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] font-semibold tabular-nums text-foreground">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <form
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <label className="block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Name
          </span>
          <input
            className={dashboardInputClass()}
            value={draft.name}
            onChange={(e) => set("name")(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Barcode
          </span>
          <input
            className={dashboardInputClass()}
            value={draft.barcode}
            onChange={(e) => set("barcode")(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
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
          {quantityLocked ? (
            <span className={cn(dashboardHintClass(), "block")}>
              Count comes from inventory while linked.
            </span>
          ) : null}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Expiry
            </span>
            <input
              className={dashboardInputClass()}
              type="date"
              value={draft.expiryDate}
              onChange={(e) => set("expiryDate")(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Buy price
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
        </div>
      </form>

      <div className="shrink-0 space-y-1.5 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] p-3 sm:p-3.5">
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            className="h-9 gap-1.5 shadow-none"
            onClick={onTakeOut}
          >
            <ArrowUpFromLine className="size-3.5" aria-hidden />
            Take out
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 shadow-none"
            disabled={busy}
            onClick={onSave}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : null}
            Save
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {connected ? (
            row.itemId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs"
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
                className="h-8 gap-1 px-2 text-xs"
                onClick={onLink}
              >
                <Link2 className="size-3.5" aria-hidden />
                Link product
              </Button>
            )
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Remove
          </Button>
          {connected ? (
            <Link
              href={APP_ROUTES.inventoryStock}
              className="ml-auto inline-flex h-8 items-center px-2 text-[11px] font-medium text-[var(--pos-primary,#0f766e)] underline-offset-4 hover:underline"
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
              {itemCount === 0
                ? "No products followed yet — add one to start tracking its stock."
                : `${linkedCount} of ${itemCount} item${
                    itemCount === 1 ? "" : "s"
                  } track a product${
                    unlinkedCount > 0 ? ` · ${unlinkedCount} still to link` : ""
                  }.`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canWrite ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs"
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
              className="h-8 px-2 text-xs"
              disabled={modeBusy}
              onClick={onStopFollowing}
            >
              {modeBusy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              Stop following
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
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
            Counts stay exactly as you type them.
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
