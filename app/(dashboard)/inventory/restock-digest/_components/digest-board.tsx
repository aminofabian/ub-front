"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Copy,
  FileDown,
  Loader2,
  MessageCircle,
  Minus,
  Moon,
  Package,
  PackageSearch,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { fetchSupplierContacts, type RestockSuggestionRecord } from "@/lib/api";
import { kioskPlaceholderWashClass } from "@/components/cashier/kiosk-listing-styles";
import {
  buildMarketplaceOrderText,
  buildWhatsAppOrderUrl,
  normalizeWhatsAppPhone,
} from "@/app/marketplace/_lib/marketplace-order-pdf";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { cn } from "@/lib/utils";

import {
  formatMoney,
  formatQty,
  lineValue,
  REASON_LABELS,
  slug,
  toNum,
} from "../_lib/digest-format";
import type { SupplierRailItem } from "../_lib/group-suppliers";
import {
  RestockProductTitle,
  restockProductCombinedName,
} from "./restock-product-title";

export type PdfOpts = {
  key: string;
  filename: string;
  departmentId?: string;
  supplierId?: string;
  pad?: boolean;
};

const INK =
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]";
const PAPER =
  "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_72%,transparent)]";
const GHOST = cn(
  "inline-flex h-9 items-center justify-center gap-1 border text-[10px] font-semibold uppercase tracking-[0.08em]",
  INK,
  "bg-[color-mix(in_srgb,var(--card)_92%,#faf7f1)] text-[var(--pos-ink,#1c1915)]",
  "hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]",
  "disabled:pointer-events-none disabled:opacity-50",
);
const PRIMARY = cn(
  "inline-flex h-9 items-center justify-center gap-1 border text-[10px] font-semibold uppercase tracking-[0.08em]",
  "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)]",
  "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)] text-[var(--pos-ink,#1c1915)]",
  "hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_16%,transparent)]",
  "disabled:pointer-events-none disabled:opacity-50",
);

function parseQty(raw: string | undefined, fallback: number): number {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return fallback;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : fallback;
}

function ProductImage({
  name,
  thumbnailUrl,
  compact,
  square,
}: {
  name: string;
  thumbnailUrl?: string | null;
  compact?: boolean;
  square?: boolean;
}) {
  const src = posTileThumbUrl(name, thumbnailUrl);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src && !failed);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,white)]",
        compact ? "size-11 shrink-0" : square ? "aspect-square w-full" : "aspect-[5/4] w-full",
        !showImage && `bg-gradient-to-br ${kioskPlaceholderWashClass(name)}`,
      )}
    >
      {showImage ? (
        <img
          src={src!}
          alt=""
          className={cn("h-full w-full object-contain", compact ? "p-0.5" : "p-2")}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[var(--pos-ink,#1c1915)]/35">
          <Package className={compact ? "size-4" : "size-7"} />
        </span>
      )}
    </div>
  );
}

function QtyControl({
  qty,
  onChange,
  disabled,
  fill,
}: {
  qty: number;
  onChange: (qty: number) => void;
  disabled?: boolean;
  fill?: boolean;
}) {
  if (qty <= 0) {
    return (
      <button
        type="button"
        disabled={disabled}
        className={cn(
          GHOST,
          "h-8 gap-1 px-2.5 normal-case tracking-normal",
          fill && "w-full",
        )}
        onClick={() => onChange(1)}
      >
        <Plus className="size-3.5" />
        Add
      </button>
    );
  }
  return (
    <div
      className={cn(
        "inline-flex h-8 items-stretch border bg-[color-mix(in_srgb,var(--card)_96%,white)]",
        INK,
        fill && "w-full",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        className="flex w-8 items-center justify-center hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)]"
        onClick={() => onChange(Math.max(0, qty - 1))}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" />
      </button>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        disabled={disabled}
        className="min-w-0 flex-1 border-x bg-transparent text-center text-[13px] font-semibold tabular-nums outline-none"
        style={{ borderColor: "color-mix(in srgb, var(--pos-ink, #1c1915) 12%, transparent)" }}
        value={Number.isInteger(qty) ? String(qty) : String(Math.round(qty * 100) / 100)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (e.target.value === "") onChange(0);
          else if (Number.isFinite(n) && n >= 0) onChange(n);
        }}
        aria-label="Quantity"
      />
      <button
        type="button"
        disabled={disabled}
        className="flex w-8 items-center justify-center hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)]"
        onClick={() => onChange(qty + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function DigestBoard({
  rail,
  selectedKey,
  onSelect,
  departmentId,
  departmentName,
  currency,
  pdfDate,
  branchName,
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
  branchName: string;
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[6.75rem_minmax(0,1fr)_19.5rem] lg:items-stretch">
      <SupplierRail
        rail={rail}
        selectedKey={selected?.key ?? null}
        onSelect={onSelect}
        currency={currency}
        qty={qty}
      />
      {selected ? (
        <SupplierStall
          item={selected}
          departmentId={departmentId}
          departmentName={departmentName}
          currency={currency}
          pdfDate={pdfDate}
          branchName={branchName}
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
        <div className={cn("flex min-h-[50vh] items-center justify-center px-6 text-center", PAPER)}>
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
    <aside className={cn("flex shrink-0 flex-col border-b lg:h-full lg:min-h-0 lg:border-b-0 lg:border-r", INK, PAPER)}>
      <div className="flex h-9 shrink-0 items-center justify-center bg-[var(--pos-primary,#0f766e)] px-1 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--pos-primary-ink,#fff)]">
        Aisle
      </div>
      <nav
        className="flex gap-2 overflow-x-auto p-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-2 lg:overflow-y-auto"
        aria-label="Suppliers"
      >
        {rail.map((item) => {
          const pending = item.lines.filter((l) => l.status === "pending").length;
          const est = item.lines.reduce((sum, s) => sum + lineValue(s, qty), 0);
          const selected = item.key === selectedKey;
          const thumb = item.lines.find((l) => l.thumbnailUrl)?.thumbnailUrl;
          const label = item.lines[0] ? restockProductCombinedName(item.lines[0]) : item.name;
          return (
            <button
              key={item.key}
              type="button"
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(item.key)}
              className={cn(
                "flex w-[4.85rem] shrink-0 flex-col overflow-hidden border text-left touch-manipulation lg:w-full",
                INK,
                selected
                  ? "border-[var(--pos-primary,#0f766e)] ring-2 ring-[var(--pos-primary,#0f766e)] ring-offset-0"
                  : "bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)]",
              )}
            >
              <ProductImage name={label} thumbnailUrl={thumb} square />
              <span
                className={cn(
                  "flex min-h-[2.75rem] flex-col justify-center px-1.5 py-1.5",
                  selected
                    ? "bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]"
                    : "text-[var(--pos-ink,#1c1915)]",
                )}
              >
                <span className="line-clamp-2 text-[10px] font-semibold leading-tight">
                  {item.name}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-[10px] tabular-nums",
                    selected ? "opacity-80" : "text-muted-foreground",
                  )}
                >
                  {pending > 0 ? pending : item.lines.length}
                  {est > 0 ? ` · ${formatMoney(est, currency)}` : ""}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function SupplierStall({
  item,
  departmentId,
  departmentName,
  currency,
  pdfDate,
  branchName,
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
  branchName: string;
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
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [waBusy, setWaBusy] = useState(false);

  useEffect(() => {
    const id =
      item.kind === "po" && item.supplierId && item.supplierId !== "unassigned"
        ? item.supplierId
        : null;
    if (!id) {
      setPhone(null);
      return;
    }
    let cancelled = false;
    setPhoneBusy(true);
    void fetchSupplierContacts(id)
      .then((contacts) => {
        if (cancelled) return;
        const primary =
          contacts.find((c) => c.primaryContact && c.phone)?.phone ??
          contacts.find((c) => c.phone)?.phone ??
          null;
        setPhone(primary);
      })
      .catch(() => {
        if (!cancelled) setPhone(null);
      })
      .finally(() => {
        if (!cancelled) setPhoneBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item.kind, item.supplierId]);

  const pending = item.lines.filter((s) => s.status === "pending");
  const orderLines = useMemo(
    () => pending.filter((s) => parseQty(qty[s.id], toNum(s.suggestedQty)) > 0),
    [pending, qty],
  );
  const est = orderLines.reduce((sum, s) => sum + lineValue(s, qty), 0);
  const units = orderLines.reduce(
    (sum, s) => sum + parseQty(qty[s.id], toNum(s.suggestedQty)),
    0,
  );
  const nameSlug = slug(item.name);
  const pdfKey = item.key;
  const showDeptHint =
    !departmentName && item.deptNames.length > 0
      ? item.deptNames.join(" · ")
      : departmentName;
  const canOrder =
    item.kind === "po" && canWritePo && runActive && orderLines.length > 0;
  const canPad =
    item.kind === "pad" && canWritePad && runActive && orderLines.length > 0;
  const waDigits = normalizeWhatsAppPhone(phone);
  const editable = runActive && item.kind !== "handled";

  function setLineQty(id: string, next: number) {
    setQty((prev) => ({ ...prev, [id]: next <= 0 ? "0" : String(next) }));
  }

  async function copyList() {
    const text = buildMarketplaceOrderText(
      orderLines.map((s) => ({
        name: restockProductCombinedName(s),
        sku: s.itemSku,
        qty: parseQty(qty[s.id], toNum(s.suggestedQty)),
        unitPrice: s.unitCost != null ? toNum(s.unitCost) : null,
        currency,
      })),
      { supplierName: item.name, fromName: branchName },
    );
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Order list copied");
    } catch {
      toast.error("Could not copy the list");
    }
  }

  function sendWhatsApp() {
    if (orderLines.length === 0) return;
    setWaBusy(true);
    const lines = orderLines.map((s) => ({
      name: restockProductCombinedName(s),
      sku: s.itemSku,
      qty: parseQty(qty[s.id], toNum(s.suggestedQty)),
      unitPrice: s.unitCost != null ? toNum(s.unitCost) : null,
      currency,
    }));
    const text = buildMarketplaceOrderText(lines, {
      supplierName: item.name,
      fromName: branchName,
    });
    const url = buildWhatsAppOrderUrl({
      phone,
      supplierName: item.name,
      lines,
      fromName: branchName,
    });
    try {
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        toast.success("WhatsApp opened with your order list.");
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
        toast.message("No phone on this supplier — pick a WhatsApp chat to send.");
      }
    } finally {
      setWaBusy(false);
    }
  }

  function downloadPdf() {
    onPdf({
      key: pdfKey,
      filename: `restock-${pdfDate}-${nameSlug}.pdf`,
      departmentId,
      supplierId:
        item.kind === "po" && item.supplierId !== "unassigned"
          ? (item.supplierId ?? undefined)
          : undefined,
      pad: item.kind === "pad",
    });
  }

  const showPdf =
    item.kind !== "handled" &&
    !(item.kind === "po" && (!item.supplierId || item.supplierId === "unassigned"));

  return (
    <>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[color-mix(in_srgb,var(--card)_94%,#f4efe6)]">
        <div className={cn("flex shrink-0 items-end justify-between gap-3 border-b px-4 py-3", INK, PAPER)}>
          <div className="min-w-0">
            <h2 className="truncate font-[family-name:var(--font-heading)] text-[1.35rem] font-semibold leading-none tracking-[-0.03em] text-[var(--pos-ink,#1c1915)]">
              {item.name}
            </h2>
            <p className="mt-1.5 truncate text-[12px] tabular-nums text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_62%,transparent)]">
              {item.lines.length} on the shelf
              {showDeptHint ? ` · ${showDeptHint}` : ""}
              {waDigits ? " · WhatsApp" : phoneBusy ? " · looking up phone" : ""}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {item.lines.map((s) => {
              const pendingLine = s.status === "pending";
              const q = pendingLine
                ? parseQty(qty[s.id], toNum(s.suggestedQty))
                : toNum(s.acceptedQty ?? s.suggestedQty);
              const label = restockProductCombinedName(s);
              const total =
                s.unitCost != null && q > 0 ? q * toNum(s.unitCost) : null;
              const busy =
                busyAction === `dismiss:${s.id}` || busyAction === `snooze:${s.id}`;
              const reason = s.reasonCode
                .split("+")
                .map((r) => REASON_LABELS[r] ?? r)
                .join(" · ");
              return (
                <article
                  key={s.id}
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden border",
                    INK,
                    "bg-[color-mix(in_srgb,var(--card)_90%,#f7f3eb)]",
                    "transition-[border-color,box-shadow] duration-150",
                    "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)]",
                    "hover:shadow-[2px_3px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]",
                    !pendingLine && "opacity-50",
                  )}
                >
                  <div className="relative">
                    <ProductImage name={label} thumbnailUrl={s.thumbnailUrl} />
                    {pendingLine && editable ? (
                      <div className="absolute right-1 top-1 flex opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <button
                          type="button"
                          className="flex size-7 items-center justify-center border bg-[color-mix(in_srgb,var(--card)_92%,white)] text-[var(--pos-ink,#1c1915)]/70 hover:text-[var(--pos-ink,#1c1915)]"
                          style={{ borderColor: "color-mix(in srgb, var(--pos-ink, #1c1915) 14%, transparent)" }}
                          disabled={busyAction !== null}
                          onClick={() => onSnooze(s.id)}
                          aria-label={`Snooze ${label}`}
                        >
                          {busy && busyAction === `snooze:${s.id}` ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Moon className="size-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="flex size-7 items-center justify-center border-y border-r bg-[color-mix(in_srgb,var(--card)_92%,white)] text-[var(--pos-ink,#1c1915)]/70 hover:text-destructive"
                          style={{ borderColor: "color-mix(in srgb, var(--pos-ink, #1c1915) 14%, transparent)" }}
                          disabled={busyAction !== null}
                          onClick={() => onDismiss(s.id)}
                          aria-label={`Dismiss ${label}`}
                        >
                          {busy && busyAction === `dismiss:${s.id}` ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <X className="size-3.5" />
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-2">
                    <RestockProductTitle
                      itemName={s.itemName}
                      variantName={s.variantName}
                      itemSku={s.itemSku}
                      struck={!pendingLine}
                      size="sm"
                      className="line-clamp-2 min-h-[2.25rem] text-[12px]"
                    />
                    <div className="flex items-baseline justify-between gap-1">
                      <p className="text-[13px] font-semibold tabular-nums tracking-tight text-[var(--pos-ink,#1c1915)]">
                        {s.unitCost != null ? formatMoney(s.unitCost, currency) : "Ask"}
                      </p>
                      <p className="text-[10px] tabular-nums text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_55%,transparent)]">
                        {formatQty(s.onHand)} / {formatQty(s.par)}
                      </p>
                    </div>
                    {total != null && q > 0 ? (
                      <p className="text-[10px] tabular-nums text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_55%,transparent)]">
                        Line {formatMoney(total, currency)}
                      </p>
                    ) : (
                      <p className="truncate text-[10px] text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_45%,transparent)]">
                        {reason}
                      </p>
                    )}
                    <div className="mt-auto pt-0.5">
                      {pendingLine && editable ? (
                        <QtyControl
                          qty={q}
                          fill
                          disabled={busyAction !== null}
                          onChange={(next) => setLineQty(s.id, next)}
                        />
                      ) : (
                        <p className="h-8 text-center text-[13px] font-semibold tabular-nums leading-8">
                          ×{formatQty(q)}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <aside className={cn("flex min-h-0 flex-col border-t lg:border-l lg:border-t-0", INK, PAPER)}>
        <div className="flex h-9 shrink-0 items-center justify-between gap-2 bg-[var(--pos-primary,#0f766e)] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--pos-primary-ink,#fff)]">
          <span>Ticket</span>
          <span className="min-w-0 truncate font-semibold normal-case tracking-normal opacity-90">
            {item.name}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {orderLines.length === 0 ? (
            <div className="m-4 border border-dashed px-3 py-10 text-center text-[12px] leading-relaxed text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_55%,transparent)]"
              style={{ borderColor: "color-mix(in srgb, var(--pos-ink, #1c1915) 20%, transparent)" }}
            >
              Add packs from the shelf. This ticket is what you send or order.
            </div>
          ) : (
            <ul>
              {orderLines.map((s) => {
                const q = parseQty(qty[s.id], toNum(s.suggestedQty));
                const total = s.unitCost != null ? q * toNum(s.unitCost) : null;
                const label = restockProductCombinedName(s);
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-2.5 border-b px-3 py-2.5"
                    style={{ borderColor: "color-mix(in srgb, var(--pos-ink, #1c1915) 8%, transparent)" }}
                  >
                    <ProductImage name={label} thumbnailUrl={s.thumbnailUrl} compact />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[12px] font-medium leading-snug text-[var(--pos-ink,#1c1915)]">
                        {label}
                      </p>
                      {editable ? (
                        <div className="mt-1.5 max-w-[9.5rem]">
                          <QtyControl
                            qty={q}
                            fill
                            disabled={busyAction !== null}
                            onChange={(next) => setLineQty(s.id, next)}
                          />
                        </div>
                      ) : (
                        <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                          ×{formatQty(q)}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 self-stretch">
                      <p className="text-[13px] font-semibold tabular-nums tracking-tight text-[var(--pos-ink,#1c1915)]">
                        {total != null ? formatMoney(total, currency) : "Ask"}
                      </p>
                      {editable ? (
                        <button
                          type="button"
                          className="mt-auto p-1 text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_45%,transparent)] hover:text-destructive"
                          onClick={() => setLineQty(s.id, 0)}
                          aria-label={`Remove ${label}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 space-y-2.5 border-t-2 border-[var(--pos-ink,#1c1915)] px-3 py-3">
          <div className="flex items-end justify-between gap-2">
            <p className="text-[12px] leading-snug text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_58%,transparent)]">
              {units === 0
                ? "Empty ticket"
                : `${formatQty(units)} packs · ${orderLines.length} lines`}
            </p>
            <p className="text-[1.15rem] font-semibold tabular-nums leading-none tracking-tight text-[var(--pos-ink,#1c1915)]">
              {formatMoney(est, currency)}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#128c4a] text-sm font-semibold text-white transition hover:bg-[#0f7a3f] disabled:pointer-events-none disabled:opacity-50"
            disabled={waBusy || orderLines.length === 0}
            onClick={sendWhatsApp}
          >
            {waBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageCircle className="size-4" />
            )}
            Send on WhatsApp
          </button>
          <div className="grid grid-cols-3 gap-1.5">
            {showPdf ? (
              <button
                type="button"
                className={GHOST}
                disabled={busyAction !== null || pdfBusy === pdfKey}
                onClick={downloadPdf}
              >
                {pdfBusy === pdfKey ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FileDown className="size-3.5" />
                )}
                PDF
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              className={GHOST}
              disabled={orderLines.length === 0}
              onClick={() => void copyList()}
            >
              <Copy className="size-3.5" />
              Copy
            </button>
            {canOrder ? (
              <button
                type="button"
                className={PRIMARY}
                disabled={busyAction !== null}
                onClick={() => onAccept(orderLines.map((l) => l.id), "po")}
              >
                <ShoppingCart className="size-3.5" />
                Order
              </button>
            ) : canPad ? (
              <button
                type="button"
                className={PRIMARY}
                disabled={busyAction !== null}
                onClick={() => onAccept(orderLines.map((l) => l.id), "pad")}
              >
                <PackageSearch className="size-3.5" />
                Pad
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
