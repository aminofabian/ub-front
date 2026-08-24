"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Download, Loader2, Moon, PackageSearch, ShoppingCart, X } from "lucide-react";

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

export type SupplierGroup = {
  supplierId: string;
  supplierName: string;
  lines: RestockSuggestionRecord[];
};

export type DepartmentGroup = {
  id: string;
  name: string;
  lines: RestockSuggestionRecord[];
  supplierGroups: SupplierGroup[];
  padLines: RestockSuggestionRecord[];
  handled: RestockSuggestionRecord[];
};

type PdfOpts = {
  key: string;
  filename: string;
  departmentId?: string;
  supplierId?: string;
  pad?: boolean;
};

export function DepartmentColumn({
  dept,
  currency,
  pdfDate,
  qty,
  setQty,
  busyAction,
  pdfBusy,
  runActive,
  canWritePo,
  canWritePad,
  wide,
  onAccept,
  onDismiss,
  onSnooze,
  onPdf,
}: {
  dept: DepartmentGroup;
  currency: string;
  pdfDate: string;
  qty: Record<string, string>;
  setQty: Dispatch<SetStateAction<Record<string, string>>>;
  busyAction: string | null;
  pdfBusy: string | null;
  runActive: boolean;
  canWritePo: boolean;
  canWritePad: boolean;
  wide: boolean;
  onAccept: (ids: string[], mode: "po" | "pad" | "all") => void;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
  onPdf: (opts: PdfOpts) => void;
}) {
  const pendingIds = [
    ...dept.supplierGroups.flatMap((g) => g.lines.map((l) => l.id)),
    ...dept.padLines.map((l) => l.id),
  ];
  const est = dept.lines.reduce((sum, s) => sum + lineValue(s, qty), 0);
  const nameSlug = slug(dept.name);

  return (
    <section
      id={`dept-${dept.id}`}
      className={cn(
        "flex min-h-[70vh] snap-start flex-col border-r border-border bg-card last:border-r-0",
        wide ? "w-full max-w-xl" : "w-[min(21.5rem,88vw)] shrink-0",
      )}
    >
      <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 border-b border-border bg-[#dce6f0] px-3 py-2.5 dark:bg-muted/50">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            {dept.name}
          </h2>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {dept.lines.length} item{dept.lines.length === 1 ? "" : "s"}
            {est > 0 ? ` · ${formatMoney(est, currency)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-none px-2 text-[11px]"
            disabled={busyAction !== null || pdfBusy === `dept:${dept.id}`}
            onClick={() =>
              onPdf({
                key: `dept:${dept.id}`,
                filename: `restock-${pdfDate}-${nameSlug}.pdf`,
                departmentId: dept.id,
              })
            }
          >
            {pdfBusy === `dept:${dept.id}` ? (
              <Loader2 className="mr-1 size-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-1 size-3.5" aria-hidden />
            )}
            PDF
          </Button>
          {pendingIds.length > 0 && runActive && (canWritePo || canWritePad) ? (
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-none px-2 text-[11px]"
              disabled={busyAction !== null}
              onClick={() => onAccept(pendingIds, "all")}
            >
              Accept
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {dept.supplierGroups.map((group) => (
          <SupplierBand
            key={group.supplierId}
            title={group.supplierName}
            lines={group.lines}
            currency={currency}
            qty={qty}
            setQty={setQty}
            busyAction={busyAction}
            pdfBusy={pdfBusy}
            runActive={runActive}
            pdfKey={`po:${dept.id}:${group.supplierId}`}
            onPdf={() =>
              onPdf({
                key: `po:${dept.id}:${group.supplierId}`,
                filename: `restock-${pdfDate}-${nameSlug}-${slug(group.supplierName)}.pdf`,
                departmentId: dept.id,
                supplierId: group.supplierId === "unassigned" ? undefined : group.supplierId,
              })
            }
            action={
              canWritePo && runActive ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none px-2 text-[10px]"
                  disabled={busyAction !== null}
                  onClick={() => onAccept(group.lines.map((l) => l.id), "po")}
                >
                  <ShoppingCart className="mr-1 size-3" aria-hidden />
                  Order
                </Button>
              ) : null
            }
            onDismiss={onDismiss}
            onSnooze={onSnooze}
          />
        ))}

        {dept.padLines.length > 0 ? (
          <SupplierBand
            title="Needs a supplier"
            lines={dept.padLines}
            currency={currency}
            qty={qty}
            setQty={setQty}
            busyAction={busyAction}
            pdfBusy={pdfBusy}
            runActive={runActive}
            pdfKey={`pad:${dept.id}`}
            onPdf={() =>
              onPdf({
                key: `pad:${dept.id}`,
                filename: `restock-${pdfDate}-${nameSlug}-pad.pdf`,
                departmentId: dept.id,
                pad: true,
              })
            }
            action={
              canWritePad && runActive ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none px-2 text-[10px]"
                  disabled={busyAction !== null}
                  onClick={() => onAccept(dept.padLines.map((l) => l.id), "pad")}
                >
                  <PackageSearch className="mr-1 size-3" aria-hidden />
                  Pad
                </Button>
              ) : null
            }
            onDismiss={onDismiss}
            onSnooze={onSnooze}
          />
        ) : null}

        {dept.handled.length > 0 ? (
          <div>
            <p className="border-t border-border bg-muted/20 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
              Handled
            </p>
            {dept.handled.map((s) => (
              <LineRow
                key={s.id}
                s={s}
                currency={currency}
                qty={qty}
                setQty={setQty}
                busyAction={busyAction}
                runActive={false}
                onDismiss={onDismiss}
                onSnooze={onSnooze}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SupplierBand({
  title,
  lines,
  currency,
  qty,
  setQty,
  busyAction,
  pdfBusy,
  runActive,
  pdfKey,
  onPdf,
  action,
  onDismiss,
  onSnooze,
}: {
  title: string;
  lines: RestockSuggestionRecord[];
  currency: string;
  qty: Record<string, string>;
  setQty: Dispatch<SetStateAction<Record<string, string>>>;
  busyAction: string | null;
  pdfBusy: string | null;
  runActive: boolean;
  pdfKey: string;
  onPdf: () => void;
  action: ReactNode;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-border bg-[#f4f7fa] px-3 py-1.5 dark:bg-muted/20">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-foreground">{title}</p>
          <p className="text-[10px] tabular-nums text-muted-foreground">
            {lines.length} to order
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-none px-1.5 text-muted-foreground"
            disabled={busyAction !== null || pdfBusy === pdfKey}
            onClick={onPdf}
            aria-label={`Download PDF for ${title}`}
          >
            {pdfBusy === pdfKey ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="size-3.5" aria-hidden />
            )}
          </Button>
          {action}
        </div>
      </div>
      {lines.map((s) => (
        <LineRow
          key={s.id}
          s={s}
          currency={currency}
          qty={qty}
          setQty={setQty}
          busyAction={busyAction}
          runActive={runActive}
          onDismiss={onDismiss}
          onSnooze={onSnooze}
        />
      ))}
    </div>
  );
}

function LineRow({
  s,
  currency,
  qty,
  setQty,
  busyAction,
  runActive,
  onDismiss,
  onSnooze,
}: {
  s: RestockSuggestionRecord;
  currency: string;
  qty: Record<string, string>;
  setQty: Dispatch<SetStateAction<Record<string, string>>>;
  busyAction: string | null;
  runActive: boolean;
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

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_4.75rem] gap-x-2 border-t border-border/70 px-3 py-2",
        !pending && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            "text-[13px] font-medium leading-snug text-foreground",
            !pending && "line-through",
          )}
        >
          {s.itemName}
        </p>
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
          {formatQty(s.onHand)} on hand · par {formatQty(s.par)}
          {s.evidence ? ` · ${s.evidence}` : ""}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="border border-border bg-muted/40 px-1 py-px text-[9px] font-medium text-muted-foreground">
            {s.reasonCode
              .split("+")
              .map((r) => REASON_LABELS[r] ?? r)
              .join(" · ")}
          </span>
          {s.status === "accepted" ? (
            <span className="border border-emerald-600/30 bg-emerald-500/10 px-1 py-px text-[9px] font-medium text-emerald-800">
              {s.purchaseOrderId ? "Draft PO" : "Pad"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        {actionable ? (
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            className={cn(
              "h-8 w-full border bg-background px-1.5 text-right text-sm font-semibold tabular-nums",
              edited ? "border-primary text-primary" : "border-border text-foreground",
            )}
            value={qtyValue}
            disabled={busyAction !== null}
            onChange={(e) => setQty((prev) => ({ ...prev, [s.id]: e.target.value }))}
            aria-label={`Quantity for ${s.itemName}`}
          />
        ) : (
          <p className="text-sm font-semibold tabular-nums leading-8 text-foreground">
            ×{formatQty(s.acceptedQty ?? s.suggestedQty)}
          </p>
        )}
        <p className="text-[10px] font-medium tabular-nums text-muted-foreground">
          {total != null ? formatMoney(total, currency) : "—"}
        </p>
        {actionable ? (
          <div className="flex gap-0">
            <button
              type="button"
              className="p-1 text-muted-foreground hover:text-foreground"
              disabled={busyAction !== null}
              onClick={() => onSnooze(s.id)}
              aria-label={`Snooze ${s.itemName}`}
            >
              {busy && busyAction === `snooze:${s.id}` ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Moon className="size-3.5" aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="p-1 text-muted-foreground hover:text-destructive"
              disabled={busyAction !== null}
              onClick={() => onDismiss(s.id)}
              aria-label={`Dismiss ${s.itemName}`}
            >
              {busy && busyAction === `dismiss:${s.id}` ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <X className="size-3.5" aria-hidden />
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
