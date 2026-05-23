"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  nsdCardInset,
  nsdInput,
  nsdSelect,
  SupplyDrawerSection,
} from "./new-supply-drawer-ui";

export type ExtraRow = {
  key: string;
  category: string;
  amount: string;
  desc: string;
};

interface Props {
  extras: ExtraRow[];
  onChange: (extras: ExtraRow[]) => void;
  busy: boolean;
}

export function ExtraCostsSection({ extras, onChange, busy }: Props) {
  return (
    <SupplyDrawerSection
      title="Extra costs"
      hint="Transport, handling, customs — allocated to the supply batch after posting."
      action={
        <span className="rounded-none border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {extras.length > 0 ? `${extras.length} added` : "Optional"}
        </span>
      }
      bodyClassName="p-4 sm:p-5"
    >
      {extras.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          No extra costs yet.
        </p>
      ) : (
        <div className="space-y-2">
          {extras.map((e) => (
            <div
              key={e.key}
              className={cn(
                nsdCardInset,
                "flex flex-wrap items-center gap-2 p-2.5 sm:flex-nowrap",
              )}
            >
              <select
                className={cn(nsdSelect, "h-9 w-full min-w-[7rem] text-xs sm:w-32")}
                value={e.category}
                onChange={(ev) =>
                  onChange(
                    extras.map((x) =>
                      x.key === e.key ? { ...x, category: ev.target.value } : x,
                    ),
                  )
                }
                disabled={busy}
                aria-label="Cost category"
              >
                <option value="">Category</option>
                <option value="transport">Transport</option>
                <option value="handling">Handling</option>
                <option value="customs">Customs</option>
                <option value="storage">Storage</option>
                <option value="other">Other</option>
              </select>
              <input
                className={cn(nsdInput, "h-9 w-24 text-right font-mono text-xs tabular-nums")}
                placeholder="0.00"
                value={e.amount}
                onChange={(ev) =>
                  onChange(
                    extras.map((x) =>
                      x.key === e.key ? { ...x, amount: ev.target.value } : x,
                    ),
                  )
                }
                disabled={busy}
                aria-label="Amount"
              />
              <input
                className={cn(nsdInput, "h-9 min-w-0 flex-1 text-xs")}
                placeholder="Description (optional)"
                value={e.desc}
                onChange={(ev) =>
                  onChange(
                    extras.map((x) =>
                      x.key === e.key ? { ...x, desc: ev.target.value } : x,
                    ),
                  )
                }
                disabled={busy}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 rounded-lg px-2 text-xs text-destructive hover:bg-destructive/10"
                disabled={busy}
                onClick={() => onChange(extras.filter((x) => x.key !== e.key))}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 h-8 gap-1 rounded-lg text-xs"
        disabled={busy}
        onClick={() =>
          onChange([
            ...extras,
            {
              key:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `x-${Date.now()}`,
              category: "",
              amount: "",
              desc: "",
            },
          ])
        }
      >
        <Plus className="size-3.5" aria-hidden />
        Add cost line
      </Button>
    </SupplyDrawerSection>
  );
}
