"use client";

import { ChevronRight } from "lucide-react";

import type { SaEmailRecipientRow } from "@/lib/super-admin-api";

export function CampaignsPeople({
  query,
  onQuery,
  recipients,
  liveAudience,
  selected,
  onSelect,
}: {
  query: string;
  onQuery: (v: string) => void;
  recipients: SaEmailRecipientRow[];
  liveAudience: number | null;
  selected: SaEmailRecipientRow | null;
  onSelect: (p: SaEmailRecipientRow) => void;
}) {
  const live = recipients.filter((r) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return `${r.name} ${r.email} ${r.businessName}`.toLowerCase().includes(q);
  });
  const count = liveAudience ?? live.length;

  return (
    <div className="overflow-y-auto px-4 py-5">
      <h1 className="text-xl font-semibold">Merchants</h1>
      <p className="text-sm text-muted-foreground">
        {count.toLocaleString()} in the current live audience
      </p>
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search by name, email, business…"
        className="mt-4 h-9 max-w-md w-full rounded-lg border border-border/80 bg-white px-3 text-sm outline-none focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
      />
      <ul className="mt-4 divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-white">
        {live.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-muted-foreground">
            No recipients in this segment yet.
          </li>
        ) : (
          live.map((r) => (
            <li key={r.userId}>
              <button
                type="button"
                onClick={() => onSelect(r)}
                className={
                  selected?.userId === r.userId
                    ? "flex w-full items-center justify-between bg-muted/50 px-3 py-2.5 text-left"
                    : "flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-muted/40"
                }
              >
                <span>
                  <span className="block text-sm font-medium">{r.businessName}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.name} · {r.email || "no email"}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
