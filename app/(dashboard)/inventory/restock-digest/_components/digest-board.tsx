"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  Download,
  Loader2,
  Moon,
  PackageSearch,
  ShoppingCart,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RestockSuggestionRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  formatMoney,
  formatQty,
  lineValue,
  REASON_LABELS,
  slug,
} from "../_lib/digest-format";
import type { SupplierRailItem } from "../_lib/group-suppliers";
import {
  RestockProductTitle,
  restockProductCombinedName,
  restockProductSkuHint,
} from "./restock-product-title";

export type PdfOpts = {
  key: string;
  filename: string;
  departmentId?: string;
  supplierId?: string;
  pad?: boolean;
};

export function DigestBoard({
  rail,
  selectedKey,
  onSelect,
  departmentId,
  departmentName,
  currency,
  pdfDate,
  qty,
  setQty,
  busyAction,
  pdfBusy,
  runActive,
  canWritePo,
  canWritePad,
  onAccept,
  onDismiss,
  onSnooze,
  onPdf,
}: {
  rail: SupplierRailItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  departmentId?: string;
  departmentName?: string;
  currency: string;
  pdfDate: string;
  qty: Record<string, string>;
  setQty: Dispatch<SetStateAction<Record<string, string>>>;
  busyAction: string | null;
  pdfBusy: string | null;
  runActive: boolean;
  canWritePo: boolean;
  canWritePad: boolean;
  onAccept: (ids: string[], mode: "po" | "pad" | "all") => void;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
  onPdf: (opts: PdfOpts) => void;
}) {
  const selected = rail.find((item) => item.key === selectedKey) ?? rail[0] ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[minmax(16.5rem,32%)_minmax(0,1fr)] md:items-stretch">
      <SupplierRail
        rail={rail}
        selectedKey={selected?.key ?? null}
        onSelect={onSelect}
        currency={currency}
        qty={qty}
      />
      {selected ? (
        <SupplierSheet
          item={selected}
          departmentId={departmentId}
          departmentName={departmentName}
          currency={currency}
          pdfDate={pdfDate}
          qty={qty}
          setQty={setQty}
          busyAction={busyAction}
          pdfBusy={pdfBusy}
          runActive={runActive}
          canWritePo={canWritePo}
          canWritePad={canWritePad}
          onAccept={onAccept}
          onDismiss={onDismiss}
          onSnooze={onSnooze}
          onPdf={onPdf}
        />
      ) : (
        <div className="flex min-h-[50vh] items-center justify-center bg-card px-6 text-center">
          <p className="text-sm text-muted-foreground">Pick a supplier to review their list.</p>
        </div>
      )}
    </div>
  );
}

function SupplierRail({
  rail,
  selectedKey,
  onSelect,
  currency,
  qty,
}: {
  rail: SupplierRailItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  currency: string;
  qty: Record<string, string>;
}) {
  return (
    <aside className="flex shrink-0 flex-col border-b border-border bg-[#dce6f0] md:h-full md:min-h-0 md:border-b-0 md:border-r dark:bg-muted/40">
      <div className="flex h-11 items-end px-4 pb-2 pt-3">
        <h2 className="text-[13px] font-semibold tracking-tight text-foreground">Suppliers</h2>
      </div>
      <nav
        className="flex gap-2 overflow-x-auto px-3 pb-3 md:min-h-0 md:flex-1 md:flex-col md:gap-0 md:overflow-y-auto md:px-0 md:pb-0"
        aria-label="Suppliers"
      >
        {rail.map((item) => {
          const pending = item.lines.filter((l) => l.status === "pending").length;
          const est = item.lines.reduce((sum, s) => sum + lineValue(s, qty), 0);
          const selected = item.key === selectedKey;
          return (
            <button
              key={item.key}
              type="button"
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(item.key)}
              className={cn(
                "flex min-w-[11.5rem] shrink-0 flex-col items-start gap-0.5 border border-border px-3 py-2.5 text-left transition-colors md:min-w-0 md:w-full md:rounded-none md:border-x-0 md:border-t-0 md:border-b",
                selected
                  ? "bg-[#16202a] text-white dark:bg-foreground dark:text-background"
                  : "bg-card text-foreground hover:bg-background md:bg-transparent",
              )}
            >
              <span className="flex w-full items-baseline justify-between gap-3">
                <span className="truncate text-[13px] font-semibold tracking-tight">
                  {item.name}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[11px] tabular-nums",
                    selected ? "text-white/70" : "text-muted-foreground",
                  )}
                >
                  {pending > 0 ? pending : item.lines.length}
                </span>
              </span>
              <span
                className={cn(
                  "w-full truncate text-[11px] tabular-nums",
                  selected ? "text-white/65" : "text-muted-foreground",
                )}
              >
                {item.kind === "handled"
                  ? "Already accepted"
                  : est > 0
                    ? formatMoney(est, currency)
                    : pending === 1
                      ? "1 to order"
                      : `${pending} to order`}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function SupplierSheet({
  item,
  departmentId,
  departmentName,
  currency,
  pdfDate,
  qty,
  setQty,
  busyAction,
  pdfBusy,
  runActive,
  canWritePo,
  canWritePad,
  onAccept,
  onDismiss,
  onSnooze,
  onPdf,
}: {
  item: SupplierRailItem;
  departmentId?: string;
  departmentName?: string;
  currency: string;
  pdfDate: string;
  qty: Record<string, string>;
  setQty: Dispatch<SetStateAction<Record<string, string>>>;
  busyAction: string | null;
  pdfBusy: string | null;
  runActive: boolean;
  canWritePo: boolean;
  canWritePad: boolean;
  onAccept: (ids: string[], mode: "po" | "pad" | "all") => void;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
  onPdf: (opts: PdfOpts) => void;
}) {
  const pending = item.lines.filter((s) => s.status === "pending");
  const est = item.lines.reduce((sum, s) => sum + lineValue(s, qty), 0);
  const nameSlug = slug(item.name);
  const pdfKey = item.key;
  const showDeptHint =
    !departmentName && item.deptNames.length > 0
      ? item.deptNames.join(" · ")
      : departmentName;
  const canOrder =
    item.kind === "po" && canWritePo && runActive && pending.length > 0;
  const canPad =
    item.kind === "pad" && canWritePad && runActive && pending.length > 0;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card">
      <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold tracking-tight text-foreground">
            {item.name}
          </h2>
          <p className="mt-0.5 truncate text-[12px] tabular-nums text-muted-foreground">
            {item.lines.length} item{item.lines.length === 1 ? "" : "s"}
            {showDeptHint ? ` · ${showDeptHint}` : ""}
            {est > 0 ? ` · ${formatMoney(est, currency)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {item.kind !== "handled" &&
          !(item.kind === "po" && (!item.supplierId || item.supplierId === "unassigned")) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-none px-2.5 text-[11px]"
              disabled={busyAction !== null || pdfBusy === pdfKey}
              onClick={() =>
                onPdf({
                  key: pdfKey,
                  filename: `restock-${pdfDate}-${nameSlug}.pdf`,
                  departmentId,
                  supplierId:
                    item.kind === "po" && item.supplierId !== "unassigned"
                      ? (item.supplierId ?? undefined)
                      : undefined,
                  pad: item.kind === "pad",
                })
              }
            >
              {pdfBusy === pdfKey ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" aria-hidden />
              ) : (
                <Download className="mr-1 size-3.5" aria-hidden />
              )}
              PDF
            </Button>
          ) : null}
          {canOrder ? (
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-none px-2.5 text-[11px]"
              disabled={busyAction !== null}
              onClick={() => onAccept(pending.map((l) => l.id), "po")}
            >
              <ShoppingCart className="mr-1 size-3.5" aria-hidden />
              Order
            </Button>
          ) : null}
          {canPad ? (
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-none px-2.5 text-[11px]"
              disabled={busyAction !== null}
              onClick={() => onAccept(pending.map((l) => l.id), "pad")}
            >
              <PackageSearch className="mr-1 size-3.5" aria-hidden />
              Pad
            </Button>
          ) : null}
        </div>
      </div>

      <div className="hidden grid-cols-[minmax(0,1fr)_5.25rem_5.25rem_6.25rem_7rem] gap-3 border-b border-border bg-[#f4f7fa] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground sm:grid sm:px-5 dark:bg-muted/20">
        <span>Product</span>
        <span className="text-right">On hand</span>
        <span className="text-right">Par</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Amount</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {item.lines.map((s) => (
          <LineRow
            key={s.id}
            s={s}
            currency={currency}
            qty={qty}
            setQty={setQty}
            busyAction={busyAction}
            runActive={runActive && item.kind !== "handled"}
            showDept={!departmentId}
            onDismiss={onDismiss}
            onSnooze={onSnooze}
          />
        ))}
      </div>
    </section>
  );
}

function LineRow({
  s,
  currency,
  qty,
  setQty,
  busyAction,
  runActive,
  showDept,
  onDismiss,
  onSnooze,
}: {
  s: RestockSuggestionRecord;
  currency: string;
  qty: Record<string, string>;
  setQty: Dispatch<SetStateAction<Record<string, string>>>;
  busyAction: string | null;
  runActive: boolean;
  showDept: boolean;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
}) {
  const pending = s.status === "pending";
  const actionable = pending && runActive;
  const qtyValue = (qty[s.id] ?? formatQty(s.suggestedQty)).trim();
  const parsedQty = qtyValue === "" ? Number.NaN : Number(qtyValue);
  const edited = Number.isFinite(parsedQty) && parsedQty !== Number(s.suggestedQty);
  const total =
    Number.isFinite(parsedQty) && s.unitCost != null ? parsedQty * Number(s.unitCost) : null;
  const busy = busyAction === `dismiss:${s.id}` || busyAction === `snooze:${s.id}`;
  const dept = s.itemTypeName?.trim();
  const label = restockProductCombinedName(s);
  const skuHint = restockProductSkuHint(s);

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-t border-border/70 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_5.25rem_5.25rem_6.25rem_7rem] sm:items-start sm:px-5",
        !pending && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <RestockProductTitle
          itemName={s.itemName}
          variantName={s.variantName}
          itemSku={s.itemSku}
          struck={!pending}
        />
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {skuHint ? `${skuHint} · ` : ""}
          {showDept && dept ? `${dept} · ` : ""}
          {s.evidence || `${formatQty(s.onHand)} on hand · par ${formatQty(s.par)}`}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="border border-border bg-muted/40 px-1 py-px text-[10px] font-medium text-muted-foreground">
            {s.reasonCode
              .split("+")
              .map((r) => REASON_LABELS[r] ?? r)
              .join(" · ")}
          </span>
          {s.status === "accepted" ? (
            <span className="border border-emerald-600/30 bg-emerald-500/10 px-1 py-px text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
              {s.purchaseOrderId ? "Draft PO" : "Pad"}
            </span>
          ) : null}
          {actionable ? (
            <span className="ml-auto flex sm:hidden">
              <LineActions
                busy={busy}
                busyAction={busyAction}
                id={s.id}
                name={label}
                onDismiss={onDismiss}
                onSnooze={onSnooze}
              />
            </span>
          ) : null}
        </div>
      </div>

      <p className="hidden self-center text-right text-[13px] tabular-nums text-muted-foreground sm:block">
        {formatQty(s.onHand)}
      </p>
      <p className="hidden self-center text-right text-[13px] tabular-nums text-muted-foreground sm:block">
        {formatQty(s.par)}
      </p>

      <div className="flex flex-col items-end gap-1 sm:self-start">
        {actionable ? (
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            className={cn(
              "h-9 w-[4.75rem] border bg-background px-2 text-right text-[15px] font-semibold tabular-nums sm:w-full",
              edited ? "border-primary text-primary" : "border-border text-foreground",
            )}
            value={qtyValue}
            disabled={busyAction !== null}
            onChange={(e) => setQty((prev) => ({ ...prev, [s.id]: e.target.value }))}
            aria-label={`Quantity for ${label}`}
          />
        ) : (
          <p className="h-9 text-right text-[15px] font-semibold tabular-nums leading-9 text-foreground">
            ×{formatQty(s.acceptedQty ?? s.suggestedQty)}
          </p>
        )}
        <p className="text-[11px] font-medium tabular-nums text-muted-foreground sm:hidden">
          {total != null ? formatMoney(total, currency) : "—"}
        </p>
      </div>

      <div className="hidden flex-col items-end gap-1 sm:flex">
        <p className="h-9 text-right text-[13px] font-semibold tabular-nums leading-9 text-foreground">
          {total != null ? formatMoney(total, currency) : "—"}
        </p>
        {actionable ? (
          <LineActions
            busy={busy}
            busyAction={busyAction}
            id={s.id}
            name={label}
            onDismiss={onDismiss}
            onSnooze={onSnooze}
          />
        ) : null}
      </div>
    </div>
  );
}

function LineActions({
  busy,
  busyAction,
  id,
  name,
  onDismiss,
  onSnooze,
}: {
  busy: boolean;
  busyAction: string | null;
  id: string;
  name: string;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
}) {
  return (
    <div className="flex">
      <button
        type="button"
        className="p-1.5 text-muted-foreground hover:text-foreground"
        disabled={busyAction !== null}
        onClick={() => onSnooze(id)}
        aria-label={`Snooze ${name}`}
      >
        {busy && busyAction === `snooze:${id}` ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Moon className="size-3.5" aria-hidden />
        )}
      </button>
      <button
        type="button"
        className="p-1.5 text-muted-foreground hover:text-destructive"
        disabled={busyAction !== null}
        onClick={() => onDismiss(id)}
        aria-label={`Dismiss ${name}`}
      >
        {busy && busyAction === `dismiss:${id}` ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <X className="size-3.5" aria-hidden />
        )}
      </button>
    </div>
  );
}
