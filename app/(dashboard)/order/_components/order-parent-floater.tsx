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
  className?: string;
};

export function OrderParentFloater({
  options,
  activeId,
  open,
  onOpenChange,
  onSelect,
  className,
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

  const sealThumb =
    active && active.id !== "all"
      ? posTileThumbUrl(active.label, active.thumbnailUrl)
      : null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 z-20 flex justify-start p-2",
        "bottom-0",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex w-auto max-w-[min(100%,22rem)] flex-col overflow-hidden",
          "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
          "bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] shadow-sm",
          open && "w-[min(100%,22rem)]",
          filtered && "border-[var(--pos-primary,#0f766e)]",
        )}
      >
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-250 ease-out",
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
              <div
                ref={trayRef}
                className="flex gap-1 overflow-x-auto px-1.5 py-1.5 [scrollbar-width:thin]"
              >
                {options.map((opt) => {
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
                        "flex w-[4.25rem] shrink-0 flex-col overflow-hidden border",
                        selected
                          ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)]"
                          : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-transparent",
                      )}
                      title={opt.label}
                    >
                      <span className="relative block aspect-square w-full bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_50%,transparent)]">
                        {isAll ? (
                          <span className="flex h-full w-full items-center justify-center">
                            <Layers className="size-4 text-[var(--pos-primary,#0f766e)]" />
                          </span>
                        ) : thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            sizes="68px"
                            className="object-contain p-1"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Package className="size-3.5 opacity-35" />
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-2 px-1 py-1 text-left text-[9px] font-medium leading-tight">
                        {isAll ? "All" : opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-stretch">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => onOpenChange(!open)}
            className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
          >
            <span
              className={cn(
                "relative flex size-8 shrink-0 items-center justify-center overflow-hidden border",
                filtered
                  ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                  : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
              )}
            >
              {sealThumb ? (
                <Image
                  src={sealThumb}
                  alt=""
                  fill
                  sizes="32px"
                  className="object-contain p-0.5"
                  unoptimized
                />
              ) : (
                <Layers className="size-3.5" />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
              {filtered ? active?.label : "Families"}
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
          {filtered ? (
            <button
              type="button"
              className="inline-flex items-center border-l border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2.5 text-muted-foreground"
              onClick={() => onSelect(null)}
              aria-label="Clear family filter"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
