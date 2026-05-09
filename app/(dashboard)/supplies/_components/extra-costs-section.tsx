"use client";

import { Button } from "@/components/ui/button";
import { dashboardLabelClass } from "@/components/dashboard-page-ui";

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
    <section className="rounded-xl border bg-muted/20 p-4">
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">
          <span>Extra costs (transport, handling, etc.)</span>
          <span className="text-xs text-muted-foreground">
            {extras.length > 0 ? extras.length + " cost(s)" : "Optional"}
          </span>
        </summary>
        <div className="mt-3 space-y-2">
          {extras.map((e) => (
            <div key={e.key} className="flex items-center gap-2">
              <select
                className="w-28 rounded border bg-background px-2 py-1.5 text-xs"
                value={e.category}
                onChange={(ev) =>
                  onChange(extras.map((x) => (x.key === e.key ? { ...x, category: ev.target.value } : x)))
                }
                disabled={busy}
              >
                <option value="">Category</option>
                <option value="transport">Transport</option>
                <option value="handling">Handling</option>
                <option value="customs">Customs</option>
                <option value="storage">Storage</option>
                <option value="other">Other</option>
              </select>
              <input
                className="w-24 rounded border bg-background px-2 py-1.5 text-xs text-right"
                placeholder="Amount"
                value={e.amount}
                onChange={(ev) =>
                  onChange(extras.map((x) => (x.key === e.key ? { ...x, amount: ev.target.value } : x)))
                }
                disabled={busy}
              />
              <input
                className="flex-1 rounded border bg-background px-2 py-1.5 text-xs"
                placeholder="Description (optional)"
                value={e.desc}
                onChange={(ev) =>
                  onChange(extras.map((x) => (x.key === e.key ? { ...x, desc: ev.target.value } : x)))
                }
                disabled={busy}
              />
              <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => onChange(extras.filter((x) => x.key !== e.key))}>
                Remove
              </Button>
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() =>
              onChange([...extras, { key: crypto.randomUUID(), category: "", amount: "", desc: "" }])
            }
            disabled={busy}
          >
            + Add extra cost
          </button>
        </div>
      </details>
    </section>
  );
}
