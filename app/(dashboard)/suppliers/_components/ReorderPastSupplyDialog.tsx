"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  RotateCcw,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchPathBSupplyInvoiceDetail,
  type PathBSupplyInvoiceDetailRecord,
} from "@/lib/api";
import {
  buildSupplyInvoiceReorderTicket,
  tenantOrderTicketPath,
} from "@/lib/order-ticket";
import { cn, formatMoney } from "@/lib/utils";

function formatShortDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

function n(v: number | string | null | undefined): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function ReorderPastSupplyDialog({
  open,
  onOpenChange,
  detail: detailProp,
  invoiceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail?: PathBSupplyInvoiceDetailRecord | null;
  /** When detail is not already loaded, fetch by id. */
  invoiceId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<PathBSupplyInvoiceDetailRecord | null>(
    detailProp ?? null,
  );
  const [includeCosts, setIncludeCosts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setIncludeCosts(true);
    setError(null);
    if (detailProp) {
      setDetail(detailProp);
      return;
    }
    const id = invoiceId?.trim();
    if (!id) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchPathBSupplyInvoiceDetail(id)
      .then((row) => {
        if (!cancelled) setDetail(row);
      })
      .catch((e) => {
        if (!cancelled) {
          setDetail(null);
          setError(
            e instanceof Error ? e.message : "Could not load that invoice.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, detailProp, invoiceId]);

  const plan = useMemo(() => {
    if (!detail) return null;
    return buildSupplyInvoiceReorderTicket(detail, { includeCosts });
  }, [detail, includeCosts]);

  const onConfirm = () => {
    if (!detail || !plan || plan.reusable === 0) {
      toast.error("No linked products on this bill to reorder.");
      return;
    }
    const href = tenantOrderTicketPath({
      ticket: plan.ticket,
      supplierId: detail.supplierId,
    });
    toast.success(`Replaying ${detail.invoiceNumber}`, {
      description: `${plan.reusable} line${plan.reusable === 1 ? "" : "s"} ready on Order`,
    });
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md gap-0 overflow-hidden rounded-none border-[color-mix(in_srgb,#15231f_14%,transparent)] p-0 sm:rounded-none"
        style={{ ["--pos-primary" as string]: "#0f766e" }}
      >
        <div className="relative border-b border-[color-mix(in_srgb,#15231f_10%,transparent)] bg-[radial-gradient(90%_120%_at_0%_0%,color-mix(in_srgb,#0f766e_14%,#f7f4ef),#f4f1ea)] px-4 pb-4 pt-5">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary,#0f766e)]"
          />
          <DialogHeader className="space-y-1 pl-2 text-left">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              <Sparkles className="size-3 text-[var(--pos-primary,#0f766e)]" />
              Replay bill
            </p>
            <DialogTitle className="font-heading text-xl font-semibold tracking-[-0.03em] text-[#15231f]">
              Order this again
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Copy the same shelf into a fresh purchase order — tweak qty or
              prices on Order before you send.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading bill…
            </div>
          ) : error ? (
            <p className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
              {error}
            </p>
          ) : detail && plan ? (
            <>
              <div className="border border-[color-mix(in_srgb,#15231f_12%,transparent)] bg-[color-mix(in_srgb,#f7f4ef_55%,white)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[13px] font-semibold text-[#15231f]">
                      {detail.invoiceNumber}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {detail.supplierName} ·{" "}
                      {formatShortDate(detail.invoiceDate)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[12px] font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
                    {formatMoney(n(detail.grandTotal), "KES")}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[color-mix(in_srgb,#15231f_8%,transparent)] pt-2.5">
                  <div className="text-center">
                    <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      Lines
                    </dt>
                    <dd className="font-mono text-[15px] font-semibold tabular-nums text-[#15231f]">
                      {plan.reusable}
                    </dd>
                  </div>
                  <div className="text-center">
                    <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      Skipped
                    </dt>
                    <dd className="font-mono text-[15px] font-semibold tabular-nums text-[#15231f]">
                      {plan.skipped}
                    </dd>
                  </div>
                  <div className="text-center">
                    <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      Est.
                    </dt>
                    <dd className="font-mono text-[15px] font-semibold tabular-nums text-[#15231f]">
                      {includeCosts && plan.estimatedTotal > 0
                        ? formatMoney(plan.estimatedTotal, "KES")
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              {plan.preview.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    What comes back
                  </p>
                  <ul className="divide-y divide-[color-mix(in_srgb,#15231f_8%,transparent)] border border-[color-mix(in_srgb,#15231f_10%,transparent)]">
                    {plan.preview.map((row, i) => (
                      <li
                        key={`${row.name}-${i}`}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[12px]"
                      >
                        <span className="min-w-0 truncate font-medium text-[#15231f]">
                          {row.name}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                          ×{row.qty}
                          {row.lineTotal != null
                            ? ` · ${formatMoney(row.lineTotal, "KES")}`
                            : ""}
                        </span>
                      </li>
                    ))}
                    {plan.reusable > plan.preview.length ? (
                      <li className="px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        +{plan.reusable - plan.preview.length} more on the new
                        order
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : (
                <p className="border border-dashed border-[color-mix(in_srgb,#15231f_14%,transparent)] px-3 py-4 text-center text-[12px] text-muted-foreground">
                  This bill has no linked catalogue products to replay.
                </p>
              )}

              <label className="flex cursor-pointer items-start gap-2.5 border border-[color-mix(in_srgb,#15231f_10%,transparent)] px-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 size-3.5 accent-[var(--pos-primary,#0f766e)]"
                  checked={includeCosts}
                  onChange={(e) => setIncludeCosts(e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-[#15231f]">
                    Carry last unit costs
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    Seed Order estimates from this bill. Turn off to start blank
                    and renegotiate.
                  </span>
                </span>
              </label>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-none"
                  onClick={() => onOpenChange(false)}
                >
                  Not now
                </Button>
                <Button
                  type="button"
                  className="h-10 gap-2 rounded-none bg-[var(--pos-primary,#0f766e)] hover:bg-[color-mix(in_srgb,#0f766e_88%,#000)]"
                  disabled={plan.reusable === 0}
                  onClick={onConfirm}
                >
                  <ShoppingCart className="size-3.5" aria-hidden />
                  Open in Order
                  <ArrowRight className="size-3.5" aria-hidden />
                </Button>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Pick an invoice to replay.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReorderPastSupplyButton({
  detail,
  invoiceId,
  invoiceNumber,
  className,
  size = "sm",
  variant = "default",
  label = "Order again",
}: {
  detail?: PathBSupplyInvoiceDetailRecord | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  className?: string;
  size?: "sm" | "icon";
  variant?: "default" | "outline" | "ghost";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = detail?.supplierInvoiceId ?? invoiceId ?? null;

  if (!id) return null;

  return (
    <>
      <Button
        type="button"
        size={size === "icon" ? "icon" : "sm"}
        variant={variant}
        className={cn(
          size === "icon"
            ? "size-7 rounded-none"
            : "h-7 gap-1 rounded-none text-xs",
          variant === "default" &&
            "bg-[var(--pos-primary,#0f766e)] hover:bg-[color-mix(in_srgb,#0f766e_88%,#000)]",
          className,
        )}
        title={
          invoiceNumber
            ? `Order ${invoiceNumber} again`
            : "Order this bill again"
        }
        aria-label={
          invoiceNumber
            ? `Order ${invoiceNumber} again`
            : "Order this bill again"
        }
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <RotateCcw className="size-3" aria-hidden />
        {size === "icon" ? null : label}
      </Button>
      <ReorderPastSupplyDialog
        open={open}
        onOpenChange={setOpen}
        detail={detail}
        invoiceId={id}
      />
    </>
  );
}
