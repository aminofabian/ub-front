"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import {
  Chip,
  SMS_ROW,
  SMS_TD,
  SMS_TH,
  errorText,
  formatWhen,
  plural,
  reasonLabel,
} from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { fetchSmsMessages, type SmsMessageRow } from "@/lib/sms-hub-api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

const STATUS_LABEL: Record<SmsMessageRow["status"], string> = {
  SENT: "Sent",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  BLOCKED: "Not sent: out of credits",
};

function statusTone(status: SmsMessageRow["status"]): string {
  switch (status) {
    case "DELIVERED":
      return "bg-emerald-500/10 text-emerald-900 ring-emerald-600/20";
    case "SENT":
      return "bg-sky-500/10 text-sky-900 ring-sky-600/20";
    default:
      return "bg-red-500/10 text-red-900 ring-red-600/20";
  }
}

type Props = {
  /** Show one campaign's messages only. */
  campaignId?: string;
};

export function SmsHubActivity({ campaignId }: Props) {
  const [rows, setRows] = useState<SmsMessageRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSmsMessages({ campaignId, page, size: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setRows(res.content ?? []);
        setTotalPages(res.totalPages ?? 0);
        setTotal(res.totalElements ?? 0);
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err, "Could not load messages."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, page]);

  return (
    <div className="flex flex-col gap-1">
      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      <section className={DASHBOARD_TABLE_SURFACE}>
        <div className={cn(DASHBOARD_TABLE_HEAD, "flex items-center justify-between gap-2")}>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {loading ? "Loading…" : plural(total, "message")}
          </p>
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Newer
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Older
              </Button>
            </div>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem]">
            <thead>
              <tr className={SMS_ROW}>
                <th className={SMS_TH}>When</th>
                <th className={SMS_TH}>To</th>
                <th className={SMS_TH}>Message</th>
                <th className={SMS_TH}>Type</th>
                <th className={cn(SMS_TH, "text-right")}>Credits</th>
                <th className={SMS_TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className={SMS_ROW}>
                  <td className={cn(SMS_TD, "whitespace-nowrap text-muted-foreground")}>
                    {formatWhen(m.createdAt)}
                  </td>
                  <td className={cn(SMS_TD, "whitespace-nowrap font-mono tabular-nums")}>
                    {m.customerId ? (
                      <Link className="text-primary hover:underline" href={APP_ROUTES.customer(m.customerId)}>
                        +{m.phone}
                      </Link>
                    ) : (
                      <>+{m.phone}</>
                    )}
                  </td>
                  <td className={cn(SMS_TD, "max-w-[26rem] break-words")}>{m.body}</td>
                  <td className={cn(SMS_TD, "whitespace-nowrap")}>{reasonLabel(m.reason)}</td>
                  <td className={cn(SMS_TD, "text-right tabular-nums")}>{m.credits}</td>
                  <td className={SMS_TD}>
                    <Chip className={statusTone(m.status)}>{STATUS_LABEL[m.status] ?? m.status}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No messages yet. Every SMS the shop sends from now on is listed here. Texts that carry
            a code (sign-in, approvals) are listed without their wording.
          </p>
        ) : null}
      </section>
    </div>
  );
}
