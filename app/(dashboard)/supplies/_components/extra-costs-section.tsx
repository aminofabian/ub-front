"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  nsdInput,
  nsdSelect,
  nsdSectionHeader,
  nsdSectionShell,
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

export function ExtraCostsBody({
  extras,
  onChange,
  busy,
}: Props) {
  return (
    <>
      {extras.length === 0 ? (
        <p className="py-1 text-center text-[11px] text-muted-foreground">
          No extra costs yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {extras.map((e) => (
            <div
              key={e.key}
              className="flex flex-wrap items-center gap-1.5 rounded-sm border border-border bg-muted/20 p-1.5 sm:flex-nowrap"
            >
              <select
                className={cn(nsdSelect, "w-full min-w-[6rem] sm:w-28")}
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
                className={cn(nsdInput, "w-20 text-right font-mono tabular-nums")}
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
                className={cn(nsdInput, "min-w-0 flex-1")}
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
                className="h-8 shrink-0 rounded-sm px-2 text-xs text-destructive hover:bg-destructive/10"
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
        className="mt-2 h-8 gap-1 rounded-sm text-xs"
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
        <Plus className="size-3" aria-hidden />
        Add cost line
      </Button>
    </>
  );
}

export function ExtraCostsSection({ extras, onChange, busy }: Props) {
  const badge =
    extras.length > 0 ? `${extras.length} added` : "Optional";

  return (
    <details
      className={cn(nsdSectionShell, "group")}
      open={extras.length > 0}
    >
      <summary
        className={cn(
          nsdSectionHeader,
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-tight text-foreground">
            Extra costs
          </p>
          <p className="text-[10px] text-muted-foreground">
            Transport, handling, customs…
          </p>
        </div>
        <span className="shrink-0 rounded-sm border border-border bg-muted/40 px-1.5 py-px text-[10px] font-medium text-muted-foreground">
          {badge}
        </span>
      </summary>
      <div className="border-t border-border p-1.5">
        <ExtraCostsBody extras={extras} onChange={onChange} busy={busy} />
      </div>
    </details>
  );
}
