"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquarePlus, Search } from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import {
  Chip,
  REACH_HINT,
  REACH_LABEL,
  SMS_ROW,
  SMS_TD,
  SMS_TH,
  errorText,
  formatDay,
  plural,
  reachTone,
} from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSmsContacts,
  updateSmsConsent,
  type SmsConsentStatus,
  type SmsContactCounts,
  type SmsContactRow,
  type SmsReach,
} from "@/lib/sms-hub-api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

const FILTERS: Array<{ reach: SmsReach | null; label: string; count: (c: SmsContactCounts) => number }> = [
  { reach: null, label: "Everyone", count: (c) => c.total },
  { reach: "CAN_TEXT", label: REACH_LABEL.CAN_TEXT, count: (c) => c.canText },
  { reach: "RECEIPTS_ONLY", label: REACH_LABEL.RECEIPTS_ONLY, count: (c) => c.receiptsOnly },
  { reach: "OPTED_OUT", label: REACH_LABEL.OPTED_OUT, count: (c) => c.optedOut },
  { reach: "NO_NUMBER", label: REACH_LABEL.NO_NUMBER, count: (c) => c.noNumber },
];

type Props = {
  canManage: boolean;
  /** Start a campaign for the ticked customers. */
  onTextSelected: (customerIds: string[]) => void;
  /** Called after consent changes so the page header counts refresh. */
  onChanged: () => void;
};

export function SmsHubContacts({ canManage, onTextSelected, onChanged }: Props) {
  const [reach, setReach] = useState<SmsReach | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<SmsContactRow[]>([]);
  const [counts, setCounts] = useState<SmsContactCounts | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(query);
      setPage(0);
    }, 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSmsContacts({ reach, q: debounced, page, size: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setRows(res.rows ?? []);
        setCounts(res.counts);
        setTotalRows(res.totalRows);
        setTotalPages(res.totalPages);
      })
      .catch((err) => {
        if (!cancelled) {
          setFeedback({ kind: "error", text: errorText(err, "Could not load contacts.") });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reach, debounced, page, reloadKey]);

  const selectableOnPage = useMemo(
    () => rows.filter((r) => r.reach !== "NO_NUMBER").map((r) => r.customerId),
    [rows],
  );
  const allOnPageSelected =
    selectableOnPage.length > 0 && selectableOnPage.every((id) => selected.has(id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) selectableOnPage.forEach((id) => next.delete(id));
      else selectableOnPage.forEach((id) => next.add(id));
      return next;
    });
  };

  const applyConsent = useCallback(
    async (status: SmsConsentStatus) => {
      const ids = Array.from(selected);
      if (ids.length === 0) return;
      setSaving(true);
      setFeedback(null);
      try {
        const res = await updateSmsConsent({
          customerIds: ids,
          status,
          customerAgreed: status === "OPTED_IN" ? agreed : undefined,
        });
        setFeedback({
          kind: "success",
          text:
            res.changed === 0
              ? "Nothing changed. These customers already had that setting."
              : `${plural(res.changed, "customer")} updated.`,
        });
        setSelected(new Set());
        setAgreed(false);
        setReloadKey((k) => k + 1);
        onChanged();
      } catch (err) {
        setFeedback({ kind: "error", text: errorText(err, "Could not update these customers.") });
      } finally {
        setSaving(false);
      }
    },
    [selected, agreed, onChanged],
  );

  const selectedCount = selected.size;

  return (
    <div className="flex flex-col gap-1">
      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter contacts">
          {FILTERS.map((f) => {
            const active = reach === f.reach;
            return (
              <button
                key={f.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setReach(f.reach);
                  setPage(0);
                }}
                className={cn(
                  "rounded-[2px] border px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "border-[var(--pos-primary,#1D4B3B)] bg-[var(--pos-primary,#1D4B3B)] text-white"
                    : "border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                {f.label}
                <span className={cn("ml-1.5 tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>
                  {counts ? f.count(counts).toLocaleString("en-KE") : "…"}
                </span>
              </button>
            );
          })}
        </div>
        {reach ? (
          <p className="mt-2 text-sm text-muted-foreground">{REACH_HINT[reach]}</p>
        ) : null}
        {reach === "NO_NUMBER" ? (
          <p className="mt-1 text-sm text-muted-foreground">
            M-Pesa hides part of some payers&rsquo; numbers. Ask for the full number at the till
            next time they pay, then add it on the customer&rsquo;s page.
          </p>
        ) : null}
        <label className="mt-3 flex max-w-sm items-center gap-2">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            className={dashboardInputClass()}
            placeholder="Search by name or number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search contacts by name or number"
          />
        </label>
      </section>

      {feedback ? <DashboardFeedback kind={feedback.kind} text={feedback.text} /> : null}

      {canManage && selectedCount > 0 ? (
        <section
          className={cn(DASHBOARD_SECTION_SURFACE, "flex flex-col gap-2")}
          aria-label="Actions for selected customers"
        >
          <p className="text-sm font-medium">{plural(selectedCount, "customer")} selected</p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              These customers told us they want offers by SMS. Tick this before marking them
              as agreed.
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={saving || !agreed}
              onClick={() => void applyConsent("OPTED_IN")}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Mark as agreed to offers
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => void applyConsent("OPTED_OUT")}
            >
              Mark as opted out
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => onTextSelected(Array.from(selected))}
            >
              <MessageSquarePlus className="size-3.5" />
              Text selected
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </section>
      ) : null}

      <section className={DASHBOARD_TABLE_SURFACE}>
        <div className={cn(DASHBOARD_TABLE_HEAD, "flex items-center justify-between gap-2")}>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {loading ? "Loading…" : plural(totalRows, "contact")}
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
                Previous
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
                Next
              </Button>
            </div>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem]">
            <thead>
              <tr className={SMS_ROW}>
                {canManage ? (
                  <th className={cn(SMS_TH, "w-10")}>
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={allOnPageSelected}
                      onChange={togglePage}
                      disabled={selectableOnPage.length === 0}
                      aria-label="Select everyone on this page who has a number"
                    />
                  </th>
                ) : null}
                <th className={SMS_TH}>Customer</th>
                <th className={SMS_TH}>Number</th>
                <th className={SMS_TH}>SMS</th>
                <th className={SMS_TH}>Last bought</th>
                <th className={cn(SMS_TH, "text-right")}>Purchases</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.customerId} className={SMS_ROW}>
                  {canManage ? (
                    <td className={SMS_TD}>
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={selected.has(row.customerId)}
                        disabled={row.reach === "NO_NUMBER"}
                        onChange={() => toggle(row.customerId)}
                        aria-label={`Select ${row.name}`}
                      />
                    </td>
                  ) : null}
                  <td className={SMS_TD}>
                    <Link
                      className="font-medium text-primary hover:underline"
                      href={APP_ROUTES.customer(row.customerId)}
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className={cn(SMS_TD, "font-mono tabular-nums")}>
                    {row.phone ?? (
                      <span className="text-muted-foreground" title="M-Pesa hides part of this number">
                        {row.maskedNumber ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className={SMS_TD}>
                    <Chip className={reachTone(row.reach)}>{REACH_LABEL[row.reach]}</Chip>
                    {row.consentUpdatedAt ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {row.consentSource === "SMS_KEYWORD" ? "By SMS reply" : "Recorded by staff"},{" "}
                        {formatDay(row.consentUpdatedAt)}
                      </span>
                    ) : null}
                  </td>
                  <td className={cn(SMS_TD, "text-muted-foreground")}>{formatDay(row.lastPurchaseAt)}</td>
                  <td className={cn(SMS_TD, "text-right tabular-nums")}>{row.purchaseCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {debounced.trim() || reach
              ? "No contacts match."
              : "No customers yet. They appear here when you add a customer at checkout, when someone pays by M-Pesa, or when they order from your online shop."}
          </p>
        ) : null}
      </section>
    </div>
  );
}
