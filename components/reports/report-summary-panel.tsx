"use client";

import { useState } from "react";
import { Copy, MessageCircle, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  fetchReportSummary,
  sendReportSummary,
  type ReportExportInput,
  type ReportKey,
  type ReportSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Shows a short report summary (headline figures + text) and, optionally, sends it to
 * the owner's verified alert phone by WhatsApp or SMS. All actions are opt-in — nothing
 * is sent unless the owner taps a channel.
 */
export function ReportSummaryPanel({
  reportKey,
  input,
  className,
}: {
  reportKey: ReportKey;
  input: () => Omit<ReportExportInput, "format"> | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [sending, setSending] = useState<"whatsapp" | "sms" | null>(null);

  const btn =
    "inline-flex h-9 items-center gap-1 rounded-xl border bg-white px-2.5 text-[12px] font-semibold disabled:opacity-40";
  const chip =
    "inline-flex h-8 items-center gap-1 rounded-lg border bg-white px-2 text-[11px] font-semibold disabled:opacity-40";

  const loadSummary = async () => {
    const current = input();
    if (!current) {
      toast.error("Choose a period first.");
      return;
    }
    setOpen(true);
    setLoading(true);
    setSummary(null);
    try {
      setSummary(await fetchReportSummary(reportKey, current));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not build the summary.",
      );
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const send = async (channel: "whatsapp" | "sms") => {
    const current = input();
    if (!current) return;
    setSending(channel);
    try {
      const r = await sendReportSummary(reportKey, current, channel);
      toast.success(
        `Sent via ${r.channel} to ${r.phoneMasked ?? "your phone"}.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(null);
    }
  };

  const copy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.text);
      toast.success("Summary copied.");
    } catch {
      toast.error("Copy is not available here.");
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : void loadSummary())}
        className={btn}
        aria-expanded={open}
      >
        <Sparkles className="size-3.5" aria-hidden />
        Summary
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-80 max-w-[85vw] rounded-xl border bg-white p-3 shadow-lg">
          {loading ? (
            <p className="text-xs text-muted-foreground">Building summary…</p>
          ) : summary ? (
            <div className="space-y-2">
              {summary.highlights.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {summary.highlights.map((h) => (
                    <div
                      key={h.label}
                      className="rounded-lg border bg-muted/40 px-2 py-1"
                    >
                      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {h.label}
                      </div>
                      <div className="text-[13px] font-bold tabular-nums">
                        {h.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-2 text-[11px] leading-snug">
                {summary.text}
              </pre>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void send("whatsapp")}
                  disabled={sending !== null}
                  className={chip}
                >
                  <MessageCircle className="size-3.5" aria-hidden />
                  {sending === "whatsapp" ? "Sending…" : "WhatsApp"}
                </button>
                <button
                  type="button"
                  onClick={() => void send("sms")}
                  disabled={sending !== null}
                  className={chip}
                >
                  <Send className="size-3.5" aria-hidden />
                  {sending === "sms" ? "Sending…" : "SMS"}
                </button>
                <button type="button" onClick={() => void copy()} className={chip}>
                  <Copy className="size-3.5" aria-hidden />
                  Copy
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Sends to your verified alert phone (set it in Ops alert settings).
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
