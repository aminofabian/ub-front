"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dashboardInputClass } from "@/components/dashboard-page-ui";
import { fetchItemsPage, type ItemSummaryRecord } from "@/lib/api";
import { itemCatalogDisplayTitle } from "@/lib/cashier-item-display";
import { cn } from "@/lib/utils";

import { nsdDropdownPanel, nsdInput } from "./new-supply-drawer-ui";

type ProductPickCellProps = {
  item: ItemSummaryRecord | null;
  disabled?: boolean;
  sharp?: boolean;
  branchId?: string;
  /** Inline list for modals; portal for tables and overflow containers. */
  resultsPlacement?: "inline" | "portal";
  autoFocus?: boolean;
  /** When set, omits items already linked to this supplier (catalog link picker). */
  excludeLinkedSupplierId?: string;
  onItemChange: (item: ItemSummaryRecord | null) => void;
};

type DropdownPos = {
  top: number;
  left: number;
  width: number;
};

function ProductSearchResults({
  loading,
  hits,
  onPick,
}: {
  loading: boolean;
  hits: ItemSummaryRecord[];
  onPick: (item: ItemSummaryRecord) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Searching…
      </div>
    );
  }
  if (hits.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
    );
  }
  return (
    <ul className="py-1" role="listbox">
      {hits.map((h) => (
        <li key={h.id} role="option">
          <button
            type="button"
            className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(h)}
          >
            <span className="font-medium leading-tight">
              {itemCatalogDisplayTitle(h)}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {h.sku}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ProductPickCell({
  item,
  disabled,
  sharp,
  branchId,
  resultsPlacement = "portal",
  autoFocus,
  excludeLinkedSupplierId,
  onItemChange,
}: ProductPickCellProps) {
  const inlineResults = resultsPlacement === "inline";
  const inputClass = sharp
    ? cn(nsdInput, "text-sm", disabled && "opacity-50")
    : cn(dashboardInputClass(disabled), "text-sm");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<ItemSummaryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const pickItem = (h: ItemSummaryRecord) => {
    onItemChange(h);
    setOpen(false);
    setQ("");
  };

  const updateDropdownPos = () => {
    const el = searchInputRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 220),
    });
  };

  useEffect(() => {
    if (!autoFocus || item) {
      return;
    }
    const id = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [autoFocus, item]);

  useLayoutEffect(() => {
    if (inlineResults || !open || q.trim().length < 1) {
      setDropdownPos(null);
      return;
    }
    updateDropdownPos();
    const onLayout = () => updateDropdownPos();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [inlineResults, open, q]);

  useEffect(() => {
    if (inlineResults) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [inlineResults]);

  useEffect(() => {
    let cancelled = false;
    if (!open || q.trim().length < 1) {
      const clearId = window.setTimeout(() => {
        if (!cancelled) {
          setHits([]);
        }
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(clearId);
      };
    }
    const id = window.setTimeout(() => {
      setLoading(true);
      const bid = branchId?.trim();
      const exSup = excludeLinkedSupplierId?.trim();
      void fetchItemsPage(q.trim(), {
        catalogScope: "SKUS_ONLY",
        page: 0,
        size: 40,
        ...(bid ? { branchId: bid } : {}),
        ...(exSup ? { excludeLinkedSupplierId: exSup } : {}),
      })
        .then((page) => {
          if (!cancelled) {
            setHits(page.content.filter((r) => !r.groupLabelOnly));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setHits([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 240);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [q, open, branchId, excludeLinkedSupplierId]);

  const onBarcodeEnter = async (raw: string) => {
    const code = raw.trim();
    if (!code || disabled) {
      return;
    }
    setLoading(true);
    try {
      const bid = branchId?.trim();
      const exSup = excludeLinkedSupplierId?.trim();
      const page = await fetchItemsPage(undefined, {
        barcode: code,
        page: 0,
        size: 10,
        ...(bid ? { branchId: bid } : {}),
        ...(exSup ? { excludeLinkedSupplierId: exSup } : {}),
      });
      const pick = page.content.find((r) => !r.groupLabelOnly) ?? null;
      onItemChange(pick);
      setOpen(false);
      setQ("");
    } finally {
      setLoading(false);
    }
  };

  const showResults = open && q.trim().length > 0;

  const resultsPanel = showResults ? (
    <ProductSearchResults loading={loading} hits={hits} onPick={pickItem} />
  ) : null;

  const portaledDropdown =
    !inlineResults &&
    showResults &&
    dropdownPos &&
    typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            className={cn(
              "fixed z-[400] rounded-sm",
              nsdDropdownPanel,
              !sharp && "rounded-lg shadow-lg",
            )}
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }}
            role="listbox"
          >
            {resultsPanel}
          </div>,
          document.body,
        )
      : null;

  if (item && !open) {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-foreground">
          {itemCatalogDisplayTitle(item)}
        </span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {item.sku}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-fit px-2 text-[11px]"
          disabled={disabled}
          onClick={() => {
            onItemChange(null);
            setQ("");
            setOpen(true);
          }}
        >
          Change product
        </Button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative min-w-[10rem]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchInputRef}
          className={cn(inputClass, "pl-8")}
          placeholder="Search name / SKU…"
          disabled={disabled}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          role="combobox"
          aria-expanded={showResults}
          aria-autocomplete="list"
        />
      </div>

      {inlineResults && showResults ? (
        <div
          className={cn(
            "mt-1 max-h-44 overflow-auto rounded-sm border border-border bg-popover shadow-md",
          )}
        >
          {resultsPanel}
        </div>
      ) : null}

      <input
        className={cn(inputClass, "mt-1.5 font-mono text-xs")}
        placeholder="Barcode — Enter"
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            void onBarcodeEnter((e.target as HTMLInputElement).value);
          }
        }}
      />
      {portaledDropdown}
    </div>
  );
}
