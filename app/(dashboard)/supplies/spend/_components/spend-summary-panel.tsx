"use client";

import type { ReactNode } from "react";
import { Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

import { formatSupplyMoney } from "../../_components/supplies-shared";
import {
  type SpendSourceItem,
  type SpendStatusMix,
  type SpendSummary,
} from "../_lib/spend-periods";
import { SpendPanel } from "./spend-panel";

function Row({
  label,
  value,
  hint,
  tone = "default",
  strong = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "muted" | "attention";
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt
        className={cn(
          "min-w-0 text-[11px] leading-snug",
          tone === "muted" ? "text-[var(--op-faint)]" : "text-[var(--op-muted)]",
        )}
      >
        {label}
        {hint ? (
          <span className="ml-1 text-[10px] text-[var(--op-faint)]">
            {hint}
          </span>
        ) : null}
      </dt>
      <dd
        className={cn(
          "shrink-0 text-right tabular-nums tracking-[-0.01em]",
          strong
            ? "text-[14px] font-semibold text-[var(--op-ink)]"
            : "text-[12px] font-medium text-[var(--op-ink)]",
          tone === "attention" && "text-[var(--op-highlight)]",
          tone === "muted" && "text-[var(--op-muted)]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function SpendSummaryPanel({
  summary,
  mix,
  sources,
  currency,
  rangeLabel,
}: {
  summary: SpendSummary;
  mix: SpendStatusMix;
  sources: SpendSourceItem[];
  currency: string;
  rangeLabel: string;
}) {
  const statusTotal = mix.total > 0 ? mix.total : 1;
  const paidWidth = (mix.paid / statusTotal) * 100;
  const partialWidth = (mix.partial / statusTotal) * 100;
  const sourceTotal = sources.reduce((sum, item) => sum + item.value, 0);

  return (
    <SpendPanel
      title="This period"
      hint={rangeLabel}
      icon={Wallet}
      bodyClassName="p-0"
    >
      <dl className="divide-y divide-[var(--op-rule-soft)] px-3.5">
        <Row
          label="Billed"
          value={formatSupplyMoney(summary.total, currency)}
          strong
        />
        <Row
          label="Paid on these bills"
          value={formatSupplyMoney(summary.paid, currency)}
        />
        <Row
          label="Still owed"
          value={
            summary.count === 0
              ? "No bills"
              : summary.open > 0.009
                ? formatSupplyMoney(summary.open, currency)
                : "Fully paid"
          }
          tone={
            summary.count === 0 || summary.open <= 0.009
              ? "muted"
              : "attention"
          }
        />
        <Row
          label="Bills"
          value={summary.count.toLocaleString("en-KE")}
          tone="muted"
        />
        <Row
          label="Suppliers"
          value={summary.supplierCount.toLocaleString("en-KE")}
          tone="muted"
        />
        {summary.count > 0 ? (
          <Row
            label="Average bill"
            value={formatSupplyMoney(summary.total / summary.count, currency)}
            tone="muted"
          />
        ) : null}
      </dl>

      <div className="border-t border-[var(--op-rule)] px-3.5 py-3">
        <p className="text-[10.5px] font-semibold text-[var(--op-faint)]">
          Payment status
        </p>
        <div
          className="mt-2 flex h-1.5 overflow-hidden bg-[var(--op-rule-soft)]"
          role="img"
          aria-label={`Paid ${formatSupplyMoney(mix.paid, currency)}, partly paid ${formatSupplyMoney(mix.partial, currency)}, unpaid ${formatSupplyMoney(mix.unpaid, currency)}`}
        >
          <span
            className="h-full bg-[var(--op-accent)]"
            style={{ width: `${paidWidth}%` }}
          />
          <span
            className="h-full bg-[color-mix(in_srgb,var(--op-highlight)_70%,var(--op-surface))]"
            style={{ width: `${partialWidth}%` }}
          />
          <span
            className="h-full bg-[color-mix(in_srgb,var(--op-ink)_18%,var(--op-surface))]"
            style={{ width: `${Math.max(100 - paidWidth - partialWidth, 0)}%` }}
          />
        </div>
        <ul className="mt-2 space-y-1.5">
          {[
            {
              id: "paid",
              label: "Paid",
              value: mix.paid,
              count: mix.paidCount,
              className: "bg-[var(--op-accent)]",
            },
            {
              id: "partial",
              label: "Part paid",
              value: mix.partial,
              count: mix.partialCount,
              className:
                "bg-[color-mix(in_srgb,var(--op-highlight)_70%,var(--op-surface))]",
            },
            {
              id: "unpaid",
              label: "Unpaid",
              value: mix.unpaid,
              count: mix.unpaidCount,
              className:
                "bg-[color-mix(in_srgb,var(--op-ink)_18%,var(--op-surface))]",
            },
          ].map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 text-[10.5px]"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-[var(--op-muted)]">
                <span
                  aria-hidden
                  className={cn("size-1.5 shrink-0", item.className)}
                />
                <span className="truncate">
                  {item.label}{" "}
                  <span className="tabular-nums text-[var(--op-faint)]">
                    ({item.count})
                  </span>
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-[var(--op-ink)]">
                {formatSupplyMoney(item.value, currency)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {sources.length > 0 ? (
        <div className="border-t border-[var(--op-rule)] px-3.5 py-3">
          <p className="text-[10.5px] font-semibold text-[var(--op-faint)]">
            Received as
          </p>
          <ul className="mt-2 space-y-2">
            {sources.map((source, index) => {
              const share =
                sourceTotal > 0 ? (source.value / sourceTotal) * 100 : 0;
              return (
                <li key={source.id}>
                  <div className="flex items-baseline justify-between gap-2 text-[10.5px]">
                    <span className="min-w-0 truncate text-[var(--op-muted)]">
                      {source.label}{" "}
                      <span className="tabular-nums text-[var(--op-faint)]">
                        ({source.count})
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[var(--op-ink)]">
                      {formatSupplyMoney(source.value, currency)}
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden bg-[var(--op-rule-soft)]">
                    <div
                      className={cn(
                        "h-full",
                        index === 0
                          ? "bg-[var(--op-accent)]"
                          : "bg-[color-mix(in_srgb,var(--op-accent)_32%,var(--op-surface))]",
                      )}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </SpendPanel>
  );
}
