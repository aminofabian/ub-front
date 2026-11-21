"use client";

import { useState } from "react";

import { parseMarkupPct } from "./buying-price-share";

/** Edits the department or category markup. Blank means no default. */
export function ShelfBuyingShareInput({
  name,
  value,
  disabled,
  onSave,
}: {
  name: string;
  value: number | string | null | undefined;
  disabled?: boolean;
  onSave: (pct: number | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const stored = value == null || value === "" ? "" : String(value);
  const shown = draft ?? stored;

  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step={1}
      value={shown}
      disabled={disabled}
      placeholder="—"
      aria-label={`Markup percent for ${name}`}
      title="Markup on cost. 25 means the selling price is 125% of the buying price. Blank means no default."
      className="h-8 w-16 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white px-1.5 text-right text-[13px] tabular-nums text-[var(--order-ink,#15231f)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/35 disabled:opacity-50"
      onFocus={() => setDraft(stored)}
      onBlur={() => setDraft(null)}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        if (!raw.trim()) {
          void onSave(null).catch(() => setDraft(stored));
          return;
        }
        const pct = parseMarkupPct(raw);
        if (pct == null) return;
        void onSave(pct).then(() => setDraft(null)).catch(() => setDraft(stored));
      }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    />
  );
}
