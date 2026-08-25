"use client";

import { ChevronRight } from "lucide-react";

import type { SaEmailRecipientRow } from "@/lib/super-admin-api";

import { SAMPLE_MERCHANTS, type SampleMerchant } from "./campaigns-model";

export function CampaignsPeople({
  query,
  onQuery,
  recipients,
  onSelect,
}: {
  query: string;
  onQuery: (v: string) => void;
  recipients: SaEmailRecipientRow[];
  selected: SampleMerchant | SaEmailRecipientRow | null;
  onSelect: (p: SampleMerchant | SaEmailRecipientRow) => void;
}) {
  const live = recipients.filter((r) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return `${r.name} ${r.email} ${r.businessName}`.toLowerCase().includes(q);
  });
  const samples = SAMPLE_MERCHANTS.filter((m) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return `${m.owner} ${m.email} ${m.businessName}`.toLowerCase().includes(q);
  });

  return (
    <div className="overflow-y-auto px-4 py-5">
      <h1 className="text-xl font-semibold">Merchants</h1>
      <p className="text-sm text-muted-foreground">
        {(live.length || 12481).toLocaleString()} in the current audience mix
      </p>
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search by name, email, business…"
        className="mt-4 h-9 max-w-md w-full rounded-lg border border-border/80 bg-white px-3 text-sm outline-none focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Has products", "No products", "Storefront live", "Unpublished", "M-Pesa", "Paid", "Free"].map(
          (f) => (
            <span
              key={f}
              className="rounded-full border border-border/80 px-2.5 py-1 text-[12px] text-muted-foreground"
            >
              {f}
            </span>
          ),
        )}
      </div>
      <ul className="mt-4 divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-white">
        {samples.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onSelect(m)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-[#F7F7F5]"
            >
              <span>
                <span className="block text-sm font-medium">{m.businessName}</span>
                <span className="text-xs text-muted-foreground">
                  {m.owner} · {m.productCount} products · storefront {m.storefront}
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          </li>
        ))}
        {live.slice(0, 40).map((r) => (
          <li key={r.userId}>
            <button
              type="button"
              onClick={() => onSelect(r)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-[#F7F7F5]"
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
        ))}
      </ul>
    </div>
  );
}
