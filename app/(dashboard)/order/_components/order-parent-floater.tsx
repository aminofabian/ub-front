"use client";

import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import { ChevronDown, Layers, Package, X } from "lucide-react";

import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import { cn } from "@/lib/utils";

export type OrderParentOption = {
  id: string;
  label: string;
  thumbnailUrl: string | null;
  itemCount: number;
  lowStockCount: number;
};

type OrderParentFloaterProps = {
  options: OrderParentOption[];
  activeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (parentId: string | null) => void;
};

export function OrderParentFloater({
  options,
  activeId,
  open,
  onOpenChange,
  onSelect,
}: OrderParentFloaterProps) {
  const panelId = useId();
  const trayRef = useRef<HTMLDivElement>(null);
  const families = options.filter((o) => o.id !== "all");
  const active =
    options.find((o) => o.id === (activeId ?? "all")) ?? options[0] ?? null;
  const filtered = Boolean(activeId);
  const visible = families.length >= 2;

  useEffect(() => {
    if (!open || !activeId || !trayRef.current) return;
    const node = trayRef.current.querySelector<HTMLElement>(
      `[data-parent-id="${CSS.escape(activeId)}"]`,
    );
    node?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [open, activeId]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-start p-2 sm:p-2.5">
      <div
        className={cn(
          "pointer-events-auto flex max-w-[min(100%,28rem)] flex-col overflow-hidden",
          "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)]",
          "bg-[color-mix(in_srgb,var(--card)_88%,#f4f0e8)] shadow-[0_12px_40px_-18px_rgba(28,25,21,0.55)]",
          "backdrop-blur-md transition-[width,box-shadow] duration-300",
          open ? "w-[min(100%,28rem)]" : "w-auto",
          filtered &&
            "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_55%,transparent)] shadow-[0_14px_36px_-16px_color-mix(in_srgb,var(--pos-primary,#0f766e)_55%,transparent)]",
        )}
      >
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div
              id={panelId}
              role="region"
              aria-label="Filter by product family"
              className="border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]"
            >
              <div className="flex items-center justify-between gap-2 px-2.5 pt-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--pos-primary,#0f766e)]">
                    Family dial
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {families.length} parents on this supplier shelf
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex size-7 items-center justify-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]"
                  aria-label="Collapse family dial"
                  onClick={() => onOpenChange(false)}
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>

              <div
                ref={trayRef}
                className="flex gap-1.5 overflow-x-auto px-2 pb-2.5 pt-2 [scrollbar-width:thin]"
              >
                {options.map((opt, index) => {
                  const isAll = opt.id === "all";
                  const selected = (activeId ?? "all") === opt.id;
                  const thumb = isAll
                    ? null
                    : posTileThumbUrl(opt.label, opt.thumbnailUrl);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-parent-id={opt.id}
                      onClick={() => {
                        onSelect(isAll ? null : opt.id);
                        onOpenChange(false);
                      }}
                      className={cn(
                        "group relative flex w-[4.6rem] shrink-0 flex-col overflow-hidden border transition",
                        "duration-200 ease-out",
                        selected
                          ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)]"
                          : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)]",
                      )}
                      style={{
                        transform: open
                          ? `translateY(0) rotate(${selected ? -1.5 : index % 2 === 0 ? 1.2 : -0.8}deg)`
                          : "translateY(8px)",
                        transitionDelay: open ? `${index * 28}ms` : "0ms",
                      }}
                      title={opt.label}
                    >
                      <span className="relative block aspect-square w-full border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]">
                        {isAll ? (
                          <span className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--pos-primary,#0f766e)_18%,transparent),transparent)]">
                            <Layers className="size-4 text-[var(--pos-primary,#0f766e)]" />
                            <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--pos-primary,#0f766e)]">
                              All
                            </span>
                          </span>
                        ) : thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            sizes="74px"
                            className="object-contain p-1"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Package className="size-4 opacity-40" />
                          </span>
                        )}
                        {opt.lowStockCount > 0 && !isAll ? (
                          <span className="absolute right-0 top-0 bg-amber-600 px-1 font-mono text-[8px] font-bold text-white">
                            {opt.lowStockCount}
                          </span>
                        ) : null}
                      </span>
                      <span className="line-clamp-2 px-1 py-1 text-left text-[9px] font-semibold leading-tight text-[var(--pos-ink,#1c1915)]">
                        {opt.label}
                      </span>
                      <span className="px-1 pb-1 font-mono text-[8px] tabular-nums text-muted-foreground">
                        {opt.itemCount} sku
                        {opt.itemCount === 1 ? "" : "s"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-stretch gap-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => onOpenChange(!open)}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left transition",
              "hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)]",
            )}
          >
            <span
              className={cn(
                "relative flex size-9 shrink-0 items-center justify-center overflow-hidden border",
                filtered
                  ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                  : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)]",
              )}
            >
              {(() => {
                const sealThumb =
                  active && active.id !== "all"
                    ? posTileThumbUrl(active.label, active.thumbnailUrl)
                    : null;
                if (!sealThumb) {
                  return <Layers className="size-3.5" />;
                }
                return (
                  <Image
                    src={sealThumb}
                    alt=""
                    fill
                    sizes="36px"
                    className="object-contain p-0.5"
                    unoptimized
                  />
                );
              })()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {filtered ? "Showing family" : "Browse by family"}
              </span>
              <span className="block truncate text-[12px] font-semibold text-[var(--pos-ink,#1c1915)]">
                {active?.label ?? "All products"}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform duration-300",
                open && "rotate-180",
              )}
            />
          </button>
          {filtered ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 border-l border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] hover:text-foreground"
              onClick={() => onSelect(null)}
              aria-label="Clear family filter"
            >
              <X className="size-3" />
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
