"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dashboardInputClass } from "@/components/dashboard-page-ui";
import { fetchItemsPage, type ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

type ProductPickCellProps = {
  item: ItemSummaryRecord | null;
  disabled?: boolean;
  onItemChange: (item: ItemSummaryRecord | null) => void;
};

export function ProductPickCell({ item, disabled, onItemChange }: ProductPickCellProps) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<ItemSummaryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

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
      void fetchItemsPage(q.trim(), { catalogScope: "SKUS_ONLY", page: 0, size: 40 })
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
  }, [q, open]);

  const onBarcodeEnter = async (raw: string) => {
    const code = raw.trim();
    if (!code || disabled) {
      return;
    }
    setLoading(true);
    try {
      const page = await fetchItemsPage(undefined, { barcode: code, page: 0, size: 10 });
      const pick = page.content.find((r) => !r.groupLabelOnly) ?? null;
      onItemChange(pick);
      setOpen(false);
      setQ("");
    } finally {
      setLoading(false);
    }
  };

  if (item && !open) {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">{item.sku}</span>
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
          className={cn(dashboardInputClass(disabled), "pl-8 text-sm")}
          placeholder="Search name / SKU…"
          disabled={disabled}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      <input
        className={cn(dashboardInputClass(disabled), "mt-1.5 font-mono text-xs")}
        placeholder="Barcode — Enter"
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            void onBarcodeEnter((e.target as HTMLInputElement).value);
          }
        }}
      />
      {open && q.trim().length > 0 ? (
        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-background shadow-md">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Searching…
            </div>
          ) : hits.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
          ) : (
            <ul className="py-1">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      onItemChange(h);
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    <span className="font-medium leading-tight">{h.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{h.sku}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
