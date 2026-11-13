"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, MessageSquarePlus, Search, UserPlus } from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardTextareaClass,
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
import { contactsToCsv, downloadCsv, parseContactLines } from "@/lib/sms-contact-file";
import {
  SMS_CONTACT_IMPORT_BATCH,
  exportSmsContacts,
  fetchSmsContacts,
  importSmsContacts,
  updateSmsConsent,
  type SmsContactImportResult,
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
  /** Filter the list opens on. The parent remounts this panel when it changes. */
  initialReach?: SmsReach | null;
  /** Start a campaign for the ticked customers. */
  onTextSelected: (customerIds: string[]) => void;
  /** Called after consent changes so the page header counts refresh. */
  onChanged: () => void;
};

export function SmsHubContacts({
  canManage,
  initialReach = null,
  onTextSelected,
  onChanged,
}: Props) {
  const [reach, setReach] = useState<SmsReach | null>(initialReach);
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
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);

  const download = async () => {
    setExporting(true);
    setFeedback(null);
    try {
      const res = await exportSmsContacts({ reach, q: debounced });
      const list = res.rows ?? [];
      if (list.length === 0) {
        setFeedback({ kind: "error", text: "There are no contacts to download." });
        return;
      }
      downloadCsv(`sms-contacts-${new Date().toISOString().slice(0, 10)}.csv`, contactsToCsv(list));
    } catch (err) {
      setFeedback({ kind: "error", text: errorText(err, "Could not download the list.") });
    } finally {
      setExporting(false);
    }
  };

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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <label className="flex min-w-[14rem] max-w-sm flex-1 items-center gap-2">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              className={dashboardInputClass()}
              placeholder="Search by name or number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search contacts by name or number"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button
                type="button"
                size="sm"
                variant={adding ? "secondary" : "outline"}
                aria-expanded={adding}
                onClick={() => setAdding((open) => !open)}
              >
                <UserPlus className="size-3.5" aria-hidden />
                Add numbers
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={exporting || totalRows === 0}
              onClick={() => void download()}
            >
              {exporting ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Download className="size-3.5" aria-hidden />
              )}
              Download list
            </Button>
          </div>
        </div>
      </section>

      {canManage && adding ? (
        <AddNumbers
          onClose={() => setAdding(false)}
          onDone={() => {
            setPage(0);
            setReloadKey((k) => k + 1);
            onChanged();
          }}
        />
      ) : null}

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

function importSummary(total: SmsContactImportResult): string {
  const parts: string[] = [];
  parts.push(total.added === 0 ? "No new numbers added" : `${plural(total.added, "number")} added`);
  if (total.alreadyThere > 0) parts.push(`${total.alreadyThere} already on your list`);
  if (total.renamed > 0) parts.push(`${plural(total.renamed, "name")} filled in`);
  if (total.markedAgreed > 0) parts.push(`${total.markedAgreed} marked as agreed to offers`);
  if (total.keptOptedOut > 0) parts.push(`${total.keptOptedOut} opted out earlier and stay opted out`);
  let text = `${parts.join(", ")}.`;
  if (total.invalid > 0) {
    const shown = total.invalidSamples.slice(0, 5).join(", ");
    text += ` ${plural(total.invalid, "line")} could not be read as a Kenyan mobile number${
      shown ? ` (${shown}${total.invalid > 5 ? ", …" : ""})` : ""
    }.`;
  }
  if (total.failed > 0) {
    text += ` ${plural(total.failed, "number")} could not be saved this time. Add the same list again to retry; nothing is added twice.`;
  }
  return text;
}

/** Type, paste or upload phone numbers. Each number becomes a customer. */
function AddNumbers({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseContactLines(text), [text]);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setResult(null);
    if (file.size > 2_000_000) {
      setResult({ kind: "error", text: "That file is too large. Split it into files under 2 MB." });
      return;
    }
    try {
      const content = await file.text();
      setText((current) => (current.trim() ? `${current.trim()}\n${content}` : content));
    } catch {
      setResult({ kind: "error", text: "Could not read that file. Save it as CSV and try again." });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    if (parsed.length === 0) return;
    setBusy(true);
    setResult(null);
    const total: SmsContactImportResult = {
      added: 0,
      alreadyThere: 0,
      markedAgreed: 0,
      keptOptedOut: 0,
      renamed: 0,
      invalid: 0,
      failed: 0,
      invalidSamples: [],
    };
    let done = 0;
    try {
      for (let from = 0; from < parsed.length; from += SMS_CONTACT_IMPORT_BATCH) {
        const batch = parsed.slice(from, from + SMS_CONTACT_IMPORT_BATCH);
        if (parsed.length > SMS_CONTACT_IMPORT_BATCH) {
          setProgress(`Adding ${Math.min(parsed.length, from + batch.length)} of ${parsed.length}…`);
        }
        const res = await importSmsContacts({ rows: batch, customerAgreed: agreed });
        total.added += res.added;
        total.alreadyThere += res.alreadyThere;
        total.markedAgreed += res.markedAgreed;
        total.keptOptedOut += res.keptOptedOut;
        total.renamed += res.renamed;
        total.invalid += res.invalid;
        total.failed += res.failed ?? 0;
        total.invalidSamples = total.invalidSamples.concat(res.invalidSamples ?? []);
        done += batch.length;
      }
      setResult({ kind: "success", text: importSummary(total) });
      setText("");
      setAgreed(false);
    } catch (err) {
      setResult({
        kind: "error",
        text:
          done > 0
            ? `${errorText(err, "Something went wrong.")} The first ${done} lines were saved; add again to finish, nothing is added twice.`
            : errorText(err, "Could not add these numbers."),
      });
    } finally {
      setBusy(false);
      setProgress(null);
      onDone();
    }
  };

  return (
    <section className={cn(DASHBOARD_SECTION_SURFACE, "flex flex-col gap-3")} aria-label="Add phone numbers">
      <label className="flex flex-col gap-1">
        <span className={dashboardLabelClass()}>Phone numbers, one per line</span>
        <textarea
          className={cn(dashboardTextareaClass(), "font-mono")}
          rows={5}
          value={text}
          placeholder={"0712345678\n0733222000, Wanjiku Kamau"}
          onChange={(e) => setText(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">
          Add a name after a comma if you have it. Without a name, the customer&rsquo;s M-Pesa name
          is filled in the next time they pay.
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="sr-only"
          aria-label="Choose a CSV or text file of phone numbers"
          onChange={(e) => void readFile(e.target.files?.[0])}
        />
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          Choose a CSV file
        </Button>
        <span className="text-sm text-muted-foreground">
          A column of numbers, with or without a name column. Save Excel sheets as CSV first.
        </span>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>
          These people told us they want offers by SMS. Leave this unticked and they are added for
          receipts and order updates only.
        </span>
      </label>
      {result ? <DashboardFeedback kind={result.kind} text={result.text} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={busy || parsed.length === 0} onClick={() => void submit()}>
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          {parsed.length === 0 ? "Add numbers" : `Add ${plural(parsed.length, "number")}`}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onClose}>
          Close
        </Button>
        {progress ? (
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {progress}
          </span>
        ) : null}
      </div>
    </section>
  );
}
