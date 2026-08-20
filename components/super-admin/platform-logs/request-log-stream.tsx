"use client";

import { ChevronRight, Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlatformRequestLogCategory, PlatformRequestLogRow } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  CATEGORY_BADGE,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatTime,
  shortId,
  statusTone,
} from "./platform-logs-shared";

export type StreamOutcome = "all" | "success" | "failed";

export function RequestLogStream({
  rows,
  loading,
  error,
  category,
  onCategoryChange,
  outcome,
  onOutcomeChange,
  ipDraft,
  onIpDraftChange,
  ip,
  onApplyIp,
  onClearIp,
  searchQuery,
  onSearchQueryChange,
  onRowClick,
}: {
  rows: PlatformRequestLogRow[];
  loading: boolean;
  error: string;
  category: "all" | PlatformRequestLogCategory;
  onCategoryChange: (category: "all" | PlatformRequestLogCategory) => void;
  outcome: StreamOutcome;
  onOutcomeChange: (outcome: StreamOutcome) => void;
  ipDraft: string;
  onIpDraftChange: (value: string) => void;
  ip: string;
  onApplyIp: () => void;
  onClearIp: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onRowClick: (row: PlatformRequestLogRow) => void;
}) {
  const query = searchQuery.trim().toLowerCase();
  const visible = query
    ? rows.filter((row) => {
        const tenant = row.businessName ?? row.businessId ?? "";
        return tenant.toLowerCase().includes(query) || row.path.toLowerCase().includes(query);
      })
    : rows;

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-52">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search tenant or path"
            className="h-8 pl-8"
            aria-label="Search requests by tenant or path"
          />
        </div>
        <IpFilter
          ipDraft={ipDraft}
          onIpDraftChange={onIpDraftChange}
          ip={ip}
          onApplyIp={onApplyIp}
          onClearIp={onClearIp}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {(["all", ...CATEGORY_ORDER] as const).map((key) => (
          <Chip
            key={key}
            label={key === "all" ? "All" : CATEGORY_LABELS[key]}
            active={category === key}
            onClick={() => onCategoryChange(key)}
          />
        ))}
        <span className="mx-1 hidden h-4 w-px bg-border/70 sm:block" aria-hidden />
        {(
          [
            { key: "all", label: "All outcomes" },
            { key: "success", label: "Successful" },
            { key: "failed", label: "Failed" },
          ] as const
        ).map((opt) => (
          <Chip
            key={opt.key}
            label={opt.label}
            active={outcome === opt.key}
            onClick={() => onOutcomeChange(opt.key)}
          />
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-3 min-w-0 overflow-hidden rounded-xl border border-border/70">
        {loading && rows.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading request log…
          </p>
        ) : visible.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No matching requests</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {rows.length === 0
                ? "Nothing in this window yet. Requests appear here the moment they hit the API — try a wider window."
                : "Your filters don't match any of the requests in the current window. Try clearing the search or widening the window."}
            </p>
          </div>
        ) : (
          <div className="max-h-135 overflow-auto overscroll-contain">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_0_var(--border)]">
                <tr className="text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
                  <th scope="col" className="px-3 py-2.5 font-medium">Time</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Category</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Method</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Path</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Tenant</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">IP</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Status</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Duration</th>
                  <th scope="col" className="w-8 px-2 py-2.5" aria-label="Details" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${row.method} ${row.path}`}
                    onClick={() => onRowClick(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }}
                    className={cn(
                      "cursor-pointer outline-none transition-colors focus-visible:bg-muted/50 group",
                      row.success
                        ? "hover:bg-muted/40 focus-visible:bg-muted/40"
                        : "bg-red-500/4 hover:bg-red-500/7 focus-visible:bg-red-500/7",
                    )}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                      {formatTime(row.loggedAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn("border-transparent", CATEGORY_BADGE[row.category])}
                      >
                        {CATEGORY_LABELS[row.category]}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">{row.method}</td>
                    <td
                      className="max-w-xs truncate px-3 py-2.5 font-mono text-xs lg:max-w-md"
                      title={row.path}
                    >
                      {row.path}
                    </td>
                    <td
                      className="max-w-40 truncate whitespace-nowrap px-3 py-2.5 text-xs"
                      title={row.businessId ?? undefined}
                    >
                      {row.businessName ?? shortId(row.businessId)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {row.ip ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <span
                        className={cn(
                          "font-mono text-xs font-medium tabular-nums",
                          statusTone(row.status, row.success),
                        )}
                      >
                        {row.status} {row.success ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs tabular-nums text-muted-foreground">
                      {row.durationMs} ms
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <ChevronRight
                        className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Showing {visible.length.toLocaleString()} of {rows.length.toLocaleString()} loaded requests ·
        click a row for full details.
      </p>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/70 text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function IpFilter({
  ipDraft,
  onIpDraftChange,
  ip,
  onApplyIp,
  onClearIp,
}: {
  ipDraft: string;
  onIpDraftChange: (value: string) => void;
  ip: string;
  onApplyIp: () => void;
  onClearIp: () => void;
}) {
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onApplyIp();
      }}
    >
      <Input
        value={ipDraft}
        onChange={(e) => onIpDraftChange(e.target.value)}
        placeholder="Filter by IP"
        className="h-8 w-36 font-mono text-xs"
        aria-label="Filter by IP"
      />
      <Button type="submit" size="sm" variant="outline" className="h-8">
        Filter
      </Button>
      {ip ? (
        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={onClearIp}>
          Clear
        </Button>
      ) : null}
    </form>
  );
}
