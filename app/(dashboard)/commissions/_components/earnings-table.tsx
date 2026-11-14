"use client";

import { useState } from "react";

import {
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  dashboardHintClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import type { CommissionStatementRow } from "@/lib/service-business-api";
import { cn } from "@/lib/utils";

import { StaffHistory } from "./staff-history";

const kes = (n: number) => formatMoney(n, "KES");

const HEAD = "whitespace-nowrap px-2.5 py-1.5 text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted)]";
const MONEY = "whitespace-nowrap px-2.5 py-1.5 text-right font-mono text-[12.5px] tabular-nums tracking-[-0.02em]";
const COUNT = "whitespace-nowrap px-2.5 py-1.5 text-right font-mono text-[12.5px] tabular-nums";
const ACTION = "h-11 rounded-[2px] px-2 text-[12px] shadow-none sm:h-7";

function balanceNote(row: CommissionStatementRow): string | null {
  const parts = [
    row.opening !== 0 ? `Brought forward ${kes(row.opening)}` : null,
    row.reversals !== 0 ? `Taken back ${kes(row.reversals)}` : null,
    row.adjustments !== 0 ? `Adjusted ${kes(row.adjustments)}` : null,
  ].filter((part): part is string => part != null);
  return parts.length > 0 ? `${parts.join(". ")}.` : null;
}

export function EarningsTable({
  rows,
  reconciled,
  from,
  to,
  canPay,
  canAdjust,
  onPay,
  onAdjust,
}: {
  rows: CommissionStatementRow[];
  reconciled: boolean;
  /** The period on screen; a person's history is read for the same days. */
  from: string;
  to: string;
  canPay: boolean;
  canAdjust: boolean;
  onPay: (row: CommissionStatementRow) => void;
  onAdjust: (row: CommissionStatementRow) => void;
}) {

  return (
    <section className={DASHBOARD_TABLE_SURFACE} aria-labelledby="commission-earnings-heading">
      <div className={DASHBOARD_TABLE_HEAD}>
        <h2 id="commission-earnings-heading" className="text-[13px] font-semibold tracking-[-0.02em]">
          Earnings
        </h2>
      </div>
      {rows.length === 0 ? (
        <EmptyEarnings />
      ) : (
        <EarningsRows
          rows={rows}
          reconciled={reconciled}
          from={from}
          to={to}
          canPay={canPay}
          canAdjust={canAdjust}
          onPay={onPay}
          onAdjust={onAdjust}
        />
      )}
    </section>
  );
}

function EmptyEarnings() {
  return (
    <div className="px-3 py-4">
      <p className="font-heading text-[1.15rem] font-semibold tracking-[-0.02em]">No one to pay yet</p>
      <p className={cn("mt-1 max-w-[42ch]", dashboardHintClass())}>
        Add the people who serve customers. Each service rung against them shows up here.
      </p>
    </div>
  );
}

function EarningsRows({
  rows,
  reconciled,
  from,
  to,
  canPay,
  canAdjust,
  onPay,
  onAdjust,
}: {
  rows: CommissionStatementRow[];
  reconciled: boolean;
  from: string;
  to: string;
  canPay: boolean;
  canAdjust: boolean;
  onPay: (row: CommissionStatementRow) => void;
  onAdjust: (row: CommissionStatementRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--op-rule)] bg-[var(--op-bg)]">
            <th className={cn(HEAD, "text-left")}>Staff</th>
            <th className={cn(HEAD, "text-right")}>Services</th>
            <th className={cn(HEAD, "text-right")}>Brought in</th>
            <th className={cn(HEAD, "text-right")}>Commission</th>
            <th className={cn(HEAD, "text-right")}>Tips</th>
            <th className={cn(HEAD, "text-right")}>Paid</th>
            <th className={cn(HEAD, "text-right")}>Owed</th>
            <th className={cn(HEAD, "text-right")}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <EarningsRow
              key={row.staffProfileId}
              row={row}
              reconciled={reconciled}
              from={from}
              to={to}
              canPay={canPay}
              canAdjust={canAdjust}
              onPay={onPay}
              onAdjust={onAdjust}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EarningsRow({
  row,
  reconciled,
  from,
  to,
  canPay,
  canAdjust,
  onPay,
  onAdjust,
}: {
  row: CommissionStatementRow;
  reconciled: boolean;
  from: string;
  to: string;
  canPay: boolean;
  canAdjust: boolean;
  onPay: (row: CommissionStatementRow) => void;
  onAdjust: (row: CommissionStatementRow) => void;
}) {
  const note = balanceNote(row);
  const [open, setOpen] = useState(false);

  return (
    <>
            <tr className="border-b border-[var(--op-rule)] last:border-b-0 hover:bg-[color-mix(in_srgb,var(--op-accent)_4%,transparent)]">
      <td className="max-w-[14rem] px-2.5 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium" title={row.displayName}>
            {row.displayName}
          </span>
          {!row.current ? <LeftChip /> : null}
        </div>
        {note ? <p className={cn("mt-0.5 max-w-[22rem]", dashboardHintClass())}>{note}</p> : null}
      </td>
      <td className={COUNT}>{row.servicesDone}</td>
      <td className={MONEY}>{kes(row.serviceRevenue)}</td>
      <td className={MONEY}>{kes(row.commission)}</td>
      <td className={MONEY}>{kes(row.tips)}</td>
      <td className={MONEY}>{kes(row.paid)}</td>
      <td className={cn(MONEY, "text-[13px] font-semibold", row.closing < 0 && "text-[var(--op-highlight)]")}>
        {kes(row.closing)}
      </td>
      <td className="px-2.5 py-1">
        <div className="flex justify-end gap-1">
          {canPay ? (
            <Button size="sm" variant="outline" className={ACTION} disabled={!reconciled} onClick={() => onPay(row)}>
              Pay out
            </Button>
          ) : null}
          {canAdjust ? (
            <Button size="sm" variant="ghost" className={ACTION} onClick={() => onAdjust(row)}>
              Adjust
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className={ACTION}
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Show"} ${row.displayName}'s history`}
            onClick={() => setOpen((was) => !was)}
          >
            {open ? "Hide history" : "History"}
          </Button>
        </div>
      </td>
    </tr>
      {open ? (
        <tr className="border-b border-[var(--op-rule)] bg-[var(--op-bg)] last:border-b-0">
          <td colSpan={8} className="p-0">
            <StaffHistory staffProfileId={row.staffProfileId} name={row.displayName} from={from} to={to} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function LeftChip() {
  return (
    <span className="inline-flex h-4 shrink-0 items-center rounded-full border border-[var(--op-rule)] px-1.5 text-[10px] font-medium leading-none text-[var(--op-muted)]">
      Left
    </span>
  );
}
