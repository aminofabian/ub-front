"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  GitBranch,
  Loader2,
  Package,
  Store,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { APP_ROUTES } from "@/lib/config";
import {
  attachMarketplaceSupplier,
  type MarketplaceAttachResult,
  type MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";
import { cn, formatMoney } from "@/lib/utils";

type Phase = "preview" | "working" | "done" | "error";

const STEPS = [
  { id: "vendor", label: "Create vendor on your books" },
  { id: "catalogue", label: "Pull every active product" },
  { id: "costs", label: "Link pack sizes & costs" },
] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

export function InheritSupplierDialog({
  open,
  onOpenChange,
  detail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: MarketplaceSupplierDetail | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("preview");
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<MarketplaceAttachResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPhase("preview");
      setStepIndex(0);
      setResult(null);
      setError(null);
    }
  }, [open]);

  const previewProducts = useMemo(
    () => (detail?.products ?? []).slice(0, 8),
    [detail],
  );
  const productCount = detail?.products.length ?? 0;
  const hue = detail ? hueFromId(detail.id) : 0;

  async function runInherit() {
    if (!detail) return;
    setPhase("working");
    setError(null);
    setStepIndex(0);

    const tick = window.setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 520);

    try {
      const attached = await attachMarketplaceSupplier(detail.id);
      window.clearInterval(tick);
      setStepIndex(STEPS.length - 1);
      setResult(attached);
      setPhase("done");
      toast.success(`Inherited ${attached.supplierName}`, {
        description: [
          attached.createdItems > 0
            ? `${attached.createdItems} new products`
            : null,
          attached.linkedExisting > 0
            ? `${attached.linkedExisting} matched existing`
            : null,
          attached.alreadyLinked > 0
            ? `${attached.alreadyLinked} already linked`
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Supplier is on your books.",
      });
    } catch (e) {
      window.clearInterval(tick);
      setPhase("error");
      setError(
        e instanceof Error ? e.message : "Could not inherit this supplier.",
      );
    }
  }

  if (!detail) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg gap-0 overflow-hidden rounded-none border-[color-mix(in_srgb,#1c1915_14%,transparent)] p-0 sm:rounded-none"
        style={{ ["--pos-primary" as string]: "#0f766e" }}
      >
        <div className="relative border-b border-[color-mix(in_srgb,#1c1915_10%,transparent)] bg-[radial-gradient(90%_120%_at_0%_0%,color-mix(in_srgb,#0f766e_16%,#f7f4ef),#f3efe8)] px-4 pb-4 pt-5">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary,#0f766e)]"
          />
          <DialogHeader className="space-y-1 pl-2 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Inherit shelf
            </p>
            <DialogTitle className="font-heading text-xl font-semibold tracking-[-0.03em] text-[#1c1915]">
              Bring this supplier into your shop
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              One tap copies the vendor onto your books and imports their full
              active catalogue — products, pack sizes, and costs — so you can
              order without retyping.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="flex items-start gap-3 border border-[color-mix(in_srgb,#1c1915_12%,transparent)] bg-[color-mix(in_srgb,#f7f4ef_55%,white)] p-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center border border-[color-mix(in_srgb,#1c1915_12%,transparent)] text-[12px] font-bold"
              style={{
                background: `linear-gradient(145deg, hsl(${hue} 18% 88%), hsl(${(hue + 28) % 360} 14% 78%))`,
              }}
            >
              {initials(detail.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-[#1c1915]">
                {detail.name}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {[detail.location, detail.locations?.[0], detail.listedBy]
                  .filter(Boolean)
                  .filter((v, i, arr) => arr.indexOf(v) === i)
                  .slice(0, 2)
                  .join(" · ") || "Marketplace supplier"}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
                <Package className="size-3.5" aria-hidden />
                {productCount} product{productCount === 1 ? "" : "s"} on shelf
              </p>
            </div>
          </div>

          {phase === "preview" || phase === "error" ? (
            <>
              <ol className="space-y-2">
                {STEPS.map((step) => (
                  <li
                    key={step.id}
                    className="flex items-center gap-2.5 text-[13px] text-[#1c1915]"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center border border-[color-mix(in_srgb,#0f766e_35%,transparent)] bg-[color-mix(in_srgb,#0f766e_8%,transparent)] text-[10px] font-bold text-[var(--pos-primary,#0f766e)]">
                      <GitBranch className="size-3" aria-hidden />
                    </span>
                    {step.label}
                  </li>
                ))}
              </ol>

              {previewProducts.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Sample from their shelf
                  </p>
                  <ul className="divide-y divide-[color-mix(in_srgb,#1c1915_8%,transparent)] border border-[color-mix(in_srgb,#1c1915_10%,transparent)]">
                    {previewProducts.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[12px]"
                      >
                        <span className="min-w-0 truncate font-medium text-[#1c1915]">
                          {p.name}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                          {p.unitPrice != null
                            ? formatMoney(p.unitPrice, p.currency ?? "KES")
                            : "Ask"}
                        </span>
                      </li>
                    ))}
                    {productCount > previewProducts.length ? (
                      <li className="px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        +{productCount - previewProducts.length} more will
                        inherit with them
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              {error ? (
                <p className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-1.5 border border-[color-mix(in_srgb,#1c1915_14%,transparent)] px-3 text-[12px] font-semibold text-muted-foreground hover:bg-[color-mix(in_srgb,#1c1915_4%,transparent)]"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="size-3.5" aria-hidden />
                  Not now
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-2 bg-[var(--pos-primary,#0f766e)] px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-[color-mix(in_srgb,#0f766e_88%,#000)]"
                  onClick={() => void runInherit()}
                >
                  <Store className="size-3.5" aria-hidden />
                  Inherit supplier &amp; products
                </button>
              </div>
            </>
          ) : null}

          {phase === "working" ? (
            <div className="space-y-3 py-2">
              {STEPS.map((step, i) => {
                const done = i < stepIndex;
                const active = i === stepIndex;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-3 border px-3 py-2.5 text-[13px] transition",
                      active
                        ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,#0f766e_8%,transparent)] font-semibold text-[#1c1915]"
                        : done
                          ? "border-[color-mix(in_srgb,#0f766e_25%,transparent)] text-[#1c1915]"
                          : "border-[color-mix(in_srgb,#1c1915_8%,transparent)] text-muted-foreground",
                    )}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center">
                      {done ? (
                        <Check
                          className="size-4 text-[var(--pos-primary,#0f766e)]"
                          aria-hidden
                        />
                      ) : active ? (
                        <Loader2
                          className="size-4 animate-spin text-[var(--pos-primary,#0f766e)]"
                          aria-hidden
                        />
                      ) : (
                        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                      )}
                    </span>
                    {step.label}
                  </div>
                );
              })}
            </div>
          ) : null}

          {phase === "done" && result ? (
            <div className="space-y-4">
              <div className="border border-[color-mix(in_srgb,#0f766e_30%,transparent)] bg-[color-mix(in_srgb,#0f766e_6%,transparent)] px-3 py-3">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-[#1c1915]">
                  <Check
                    className="size-4 text-[var(--pos-primary,#0f766e)]"
                    aria-hidden
                  />
                  {result.supplierName} is on your books
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["Created", result.createdItems],
                      ["Matched", result.linkedExisting],
                      ["Already", result.alreadyLinked],
                      ["Skipped", result.skipped],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="border border-[color-mix(in_srgb,#1c1915_8%,transparent)] bg-white/70 px-2 py-1.5 text-center"
                    >
                      <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="font-mono text-[16px] font-semibold tabular-nums text-[#1c1915]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-1.5 border border-[color-mix(in_srgb,#1c1915_14%,transparent)] px-3 text-[12px] font-semibold hover:bg-[color-mix(in_srgb,#1c1915_4%,transparent)]"
                  onClick={() => {
                    onOpenChange(false);
                    router.push(
                      `${APP_ROUTES.suppliers}?selected=${encodeURIComponent(result.localSupplierId)}`,
                    );
                  }}
                >
                  Open supplier
                  <ArrowRight className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-2 bg-[var(--pos-primary,#0f766e)] px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-[color-mix(in_srgb,#0f766e_88%,#000)]"
                  onClick={() => {
                    onOpenChange(false);
                    router.push(
                      `${APP_ROUTES.order}?msid=${encodeURIComponent(result.marketplaceSupplierId)}`,
                    );
                  }}
                >
                  Start ordering
                  <ArrowRight className="size-3.5" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
