"use client";

import Image from "next/image";
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

const INK_BORDER =
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]";
const PAPER =
  "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)]";
const TILE = cn(
  "group relative flex h-full flex-col overflow-hidden border",
  INK_BORDER,
  "bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] text-left",
  "transition-[border-color,background-color,box-shadow] duration-150",
  "hover:z-[1] hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_32%,transparent)] hover:bg-card",
  "hover:shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
);

function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function parseQty(raw: string | undefined, fallback: number): number {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return fallback;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : fallback;
}

function ProductImage({
  name,
  hue,
}: {
  name: string;
  hue: number;
}) {
  const src = posTileThumbUrl(name, null);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src && !failed);

  return (
    <div
      className="relative aspect-[4/3] overflow-hidden"
      style={
        showImage
          ? undefined
          : {
              background: `linear-gradient(145deg, hsl(${hue} 18% 88%), hsl(${(hue + 28) % 360} 14% 78%))`,
            }
      }
    >
      {showImage ? (
        <Image
          src={src!}
          alt=""
          fill
          unoptimized
          className="object-contain p-2"
          sizes="(max-width: 640px) 50vw, 220px"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-foreground/55">
          <Package className="size-7" />
        </span>
      )}
    </div>
  );
}

function QtyControl({
  qty,
  onChange,
  disabled,
}: {
  qty: number;
  onChange: (qty: number) => void;
  disabled?: boolean;
}) {
  if (qty <= 0) {
    return (
      <button
        type="button"
        disabled={disabled}
        className="inline-flex h-8 items-center justify-center gap-1 border border-border bg-background px-2.5 text-xs font-semibold"
        onClick={() => onChange(1)}
      >
        <Plus className="size-3.5" />
        Add
      </button>
    );
  }
  return (
    <div className="inline-flex items-center border border-border bg-background">
      <button
        type="button"
        disabled={disabled}
        className="flex size-8 items-center justify-center hover:bg-muted"
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
        className="h-8 w-11 border-x border-border bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
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
        className="flex size-8 items-center justify-center hover:bg-muted"
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[5.75rem_minmax(0,1fr)_minmax(16.5rem,22rem)] md:items-stretch">
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
    <aside className={cn("flex shrink-0 flex-col border-b md:h-full md:min-h-0 md:border-b-0 md:border-r", INK_BORDER, PAPER)}>
      <div className="flex h-8 shrink-0 items-center justify-center bg-[var(--pos-primary,#0f766e)] px-1.5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--pos-primary-ink,#fff)]">
        List
      </div>
      <nav
        className="flex gap-2 overflow-x-auto p-2 md:min-h-0 md:flex-1 md:flex-col md:gap-2 md:overflow-y-auto"
        aria-label="Suppliers"
      >
        {rail.map((item) => {
          const pending = item.lines.filter((l) => l.status === "pending").length;
          const est = item.lines.reduce((sum, s) => sum + lineValue(s, qty), 0);
          const selected = item.key === selectedKey;
          const hue = hueFromId(item.key);
          return (
            <button
              key={item.key}
              type="button"
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(item.key)}
              className={cn(
                "relative flex aspect-square w-[4.75rem] shrink-0 flex-col items-center justify-center overflow-hidden border text-center text-[10px] font-semibold leading-tight touch-manipulation md:w-full",
                selected
                  ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)] shadow-[inset_0_0_0_2px_var(--pos-primary,#0f766e)]"
                  : cn(INK_BORDER, "bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] text-[var(--pos-ink,#1c1915)]"),
              )}
              style={
                selected
                  ? undefined
                  : {
                      background: `linear-gradient(160deg, hsl(${hue} 16% 92%), hsl(${(hue + 24) % 360} 12% 84%))`,
                    }
              }
            >
              <span className="line-clamp-3 px-1">{item.name}</span>
              <span className={cn("mt-0.5 tabular-nums", selected ? "opacity-80" : "opacity-70")}>
                {pending > 0 ? pending : item.lines.length}
                {est > 0 && !selected ? "" : ""}
              </span>
              {!selected && est > 0 ? (
                <span className="sr-only">{formatMoney(est, currency)}</span>
              ) : null}
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
    const id = item.kind === "po" && item.supplierId && item.supplierId !== "unassigned"
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
          contacts.find((c) => c.primaryContact && c.phone)?.phone
          ?? contacts.find((c) => c.phone)?.phone
          ?? null;
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
    () =>
      pending.filter((s) => parseQty(qty[s.id], toNum(s.suggestedQty)) > 0),
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
      {
        supplierName: item.name,
        fromName: branchName,
      },
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
        const fallback = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(fallback, "_blank", "noopener,noreferrer");
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

  return (
    <>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)]">
        <div className={cn("shrink-0 border-b px-3 py-2.5 sm:px-4", INK_BORDER, PAPER)}>
          <h2 className="truncate font-[family-name:var(--font-heading)] text-[17px] font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
            {item.name}
          </h2>
          <p className="mt-0.5 truncate text-[12px] tabular-nums text-muted-foreground">
            {item.lines.length} item{item.lines.length === 1 ? "" : "s"}
            {showDeptHint ? ` · ${showDeptHint}` : ""}
            {waDigits ? ` · WhatsApp ready` : phoneBusy ? " · looking up phone…" : ""}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
              return (
                <article
                  key={s.id}
                  className={cn(TILE, !pendingLine && "opacity-55")}
                >
                  <ProductImage name={label} hue={hueFromId(s.itemId)} />
                  <div className="flex flex-1 flex-col gap-2 p-2">
                    <RestockProductTitle
                      itemName={s.itemName}
                      variantName={s.variantName}
                      itemSku={s.itemSku}
                      struck={!pendingLine}
                      size="sm"
                    />
                    <p className="text-[10px] leading-snug text-muted-foreground">
                      {formatQty(s.onHand)} on hand · par {formatQty(s.par)}
                    </p>
                    <p className="font-mono text-[12px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
                      {s.unitCost != null
                        ? formatMoney(s.unitCost, currency)
                        : "Ask"}
                      {total != null ? (
                        <span className="ml-1 font-normal text-muted-foreground">
                          · {formatMoney(total, currency)}
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-1">
                      {pendingLine && editable ? (
                        <QtyControl
                          qty={q}
                          disabled={busyAction !== null}
                          onChange={(next) => setLineQty(s.id, next)}
                        />
                      ) : (
                        <p className="text-sm font-semibold tabular-nums">×{formatQty(q)}</p>
                      )}
                      {pendingLine && editable ? (
                        <div className="flex">
                          <button
                            type="button"
                            className="p-1.5 text-muted-foreground hover:text-foreground"
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
                            className="p-1.5 text-muted-foreground hover:text-destructive"
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
                      ) : (
                        <span className="border px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {s.status === "accepted"
                            ? s.purchaseOrderId
                              ? "PO"
                              : "Pad"
                            : s.status}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      {s.reasonCode
                        .split("+")
                        .map((r) => REASON_LABELS[r] ?? r)
                        .join(" · ")}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <aside className={cn("flex min-h-0 flex-col border-t md:border-l md:border-t-0", INK_BORDER, PAPER)}>
        <div className="flex h-8 shrink-0 items-center justify-between bg-[var(--pos-primary,#0f766e)] px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--pos-primary-ink,#fff)]">
          <span>Order list</span>
          <span className="truncate font-semibold normal-case tracking-normal opacity-90">
            {item.name}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {orderLines.length === 0 ? (
            <div className="m-3 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_22%,transparent)] px-3 py-8 text-center text-[12px] text-muted-foreground">
              Tap shelf products to build this order.
            </div>
          ) : (
            <ul>
              {orderLines.map((s) => {
                const q = parseQty(qty[s.id], toNum(s.suggestedQty));
                const total =
                  s.unitCost != null ? q * toNum(s.unitCost) : null;
                return (
                  <li
                    key={s.id}
                    className={cn(
                      "flex items-start justify-between gap-2 border-b px-2.5 py-2.5",
                      "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-snug text-[var(--pos-ink,#1c1915)]">
                        {restockProductCombinedName(s)}
                      </p>
                      {editable ? (
                        <div className="mt-1.5">
                          <QtyControl
                            qty={q}
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
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p className="font-mono text-[12px] font-semibold tabular-nums">
                        {total != null ? formatMoney(total, currency) : "Ask"}
                      </p>
                      {editable ? (
                        <button
                          type="button"
                          className="p-1 text-muted-foreground hover:text-destructive"
                          onClick={() => setLineQty(s.id, 0)}
                          aria-label={`Remove ${restockProductCombinedName(s)}`}
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

        <div className="shrink-0 space-y-2 border-t-2 border-[var(--pos-ink,#1c1915)] px-2.5 py-2.5">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="text-muted-foreground">
              {units === 0
                ? "No lines yet"
                : `${formatQty(units)} unit${units === 1 ? "" : "s"} · ${orderLines.length} line${orderLines.length === 1 ? "" : "s"}`}
            </span>
            <span className="font-mono text-[14px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
              {formatMoney(est, currency)}
            </span>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#128c4a] px-4 text-sm font-semibold text-white transition hover:bg-[#0f7a3f] disabled:pointer-events-none disabled:opacity-50"
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
          <div className="grid grid-cols-3 gap-2">
            {item.kind !== "handled" &&
            !(item.kind === "po" && (!item.supplierId || item.supplierId === "unassigned")) ? (
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center gap-1 border bg-[color-mix(in_srgb,var(--card)_90%,#faf7f1)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-ink,#1c1915)] hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] disabled:opacity-50"
                style={{ borderColor: "color-mix(in srgb, var(--pos-ink, #1c1915) 14%, transparent)" }}
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
              className="inline-flex h-9 items-center justify-center gap-1 border bg-[color-mix(in_srgb,var(--card)_90%,#faf7f1)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-ink,#1c1915)] hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] disabled:opacity-50"
              style={{ borderColor: "color-mix(in srgb, var(--pos-ink, #1c1915) 14%, transparent)" }}
              disabled={orderLines.length === 0}
              onClick={() => void copyList()}
            >
              <Copy className="size-3.5" />
              Copy
            </button>
            {canOrder ? (
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center gap-1 border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-ink,#1c1915)] hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,transparent)] disabled:opacity-50"
                disabled={busyAction !== null}
                onClick={() => onAccept(orderLines.map((l) => l.id), "po")}
              >
                <ShoppingCart className="size-3.5" />
                Order
              </button>
            ) : canPad ? (
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center gap-1 border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-ink,#1c1915)] hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,transparent)] disabled:opacity-50"
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
          <p className="text-center text-[10px] leading-snug text-muted-foreground">
            WhatsApp opens with this list. PDF is tonight&apos;s restock sheet.
            Change quantities on the shelf or in the list before you send or order.
          </p>
        </div>
      </aside>
    </>
  );
}
