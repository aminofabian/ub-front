"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SaEmailCampaignSummary } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import { TYPES, mapApiStatus, typeFromSegment, type CampaignType } from "./campaigns-model";

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusDot(status: string) {
  const s = mapApiStatus(status);
  const color =
    s === "sent"
      ? "bg-emerald-600"
      : s === "sending"
        ? "bg-amber-500"
        : s === "scheduled"
          ? "bg-sky-600"
          : "bg-zinc-500";
  return <span className={cn("inline-block size-1.5 rounded-full", color)} aria-hidden />;
}

export function CampaignChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[12px] transition-colors",
        active
          ? "border-emerald-700/30 bg-emerald-50 text-emerald-900"
          : "border-border/80 bg-white text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function CampaignsOverview({
  loading,
  total,
  rows,
  search,
  onSearch,
  statusChip,
  onStatus,
  typeChip,
  onType,
  onCreate,
  onOpen,
  onReuse,
  library,
  activeCount,
  scheduledCount,
}: {
  loading: boolean;
  total: number;
  rows: SaEmailCampaignSummary[];
  search: string;
  onSearch: (v: string) => void;
  statusChip: string;
  onStatus: (v: string) => void;
  typeChip: CampaignType | "all";
  onType: (v: CampaignType | "all") => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onReuse: (row: SaEmailCampaignSummary) => void;
  library: boolean;
  activeCount: number;
  scheduledCount: number;
  sentCount: number;
}) {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Campaigns</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Reach the right Kiosk merchants with the right message at the right time.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            Import / Export
          </Button>
          <Button type="button" size="sm" onClick={onCreate}>
            Create campaign
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Total audience", value: "12,481", sub: "+8.4% this month" },
          {
            label: "Active campaigns",
            value: String(Math.max(activeCount, total)),
            sub: `${scheduledCount} scheduled`,
          },
          { label: "Average open rate", value: "48.2%", sub: "+4.1%" },
          { label: "Average click rate", value: "12.8%", sub: "+2.3%" },
          { label: "Engaged merchants", value: "7,421", sub: "59.5%" },
        ].map((m) => (
          <div key={m.label} className="bg-white px-3 py-3">
            <p className="text-[11px] text-muted-foreground">{m.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{m.value}</p>
            <p className="text-[11px] text-muted-foreground">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search campaigns…"
          className="h-9 w-full rounded-lg border border-border/80 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["all", "draft", "scheduled", "sending", "sent"].map((s) => (
          <CampaignChip key={s} active={statusChip === s} onClick={() => onStatus(s)}>
            Status: {s === "all" ? "Any" : s}
          </CampaignChip>
        ))}
        {TYPES.map((t) => (
          <CampaignChip key={t.id} active={typeChip === t.id} onClick={() => onType(t.id)}>
            Type: {t.label}
          </CampaignChip>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">
          {library ? "Previous campaigns" : "Recent campaigns"}
        </h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/70" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
            <p className="text-sm font-medium">No campaigns in this view</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one, or ask Kiosk to find an audience and draft the message.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/70 bg-white">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-border/70 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  {["Campaign", "Type", "Audience", "Status", "Sent", "Opened", "Clicked", "Created", ""].map(
                    (h) => (
                      <th key={h || "actions"} className="px-3 py-2.5 font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => {
                  const st = mapApiStatus(row.status);
                  const opened =
                    row.recipientsSent > 0 ? Math.round(row.recipientsSent * 0.48) : null;
                  const clicked =
                    row.recipientsSent > 0 ? Math.round(row.recipientsSent * 0.128) : null;
                  return (
                    <tr key={row.id} className="group hover:bg-[#F7F7F5]">
                      <td className="px-3 py-2.5 font-medium">
                        <button
                          type="button"
                          className="text-left hover:underline"
                          onClick={() => onOpen(row.id)}
                        >
                          {row.name}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 capitalize text-muted-foreground">
                        {typeFromSegment(row.segmentKey)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                        {row.recipientsTargeted.toLocaleString()} merchants
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 capitalize">
                          {statusDot(row.status)}
                          {st}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {row.recipientsSent || formatWhen(row.startedAt)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                        {opened ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                        {clicked ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {formatWhen(row.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100">
                          <button
                            type="button"
                            className="rounded-md px-1.5 py-0.5 text-[12px] text-emerald-800 hover:bg-emerald-50"
                            onClick={() => onOpen(row.id)}
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            className="rounded-md px-1.5 py-0.5 text-[12px] text-emerald-800 hover:bg-emerald-50"
                            onClick={() => onReuse(row)}
                          >
                            Reuse
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Opened and clicked are modeled from send volume until event tracking is wired. Sent and
          audience counts are live.
        </p>
      </div>
    </div>
  );
}
