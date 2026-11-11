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
import {
  reportBtn,
  reportHairline,
  reportMono,
  reportMuted,
  reportOverlay,
  reportPaper,
} from "./report-ui";

/**
 * Shows a short report summary (headline figures + text) and, optionally, sends it to
 * the owner's verified alert phone by WhatsApp or SMS. Every action is opt-in.
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
      toast.success(`Sent via ${r.channel} to ${r.phoneMasked ?? "your phone"}.`);
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
        className={reportBtn}
        aria-expanded={open}
      >
        <Sparkles className="size-3.5" aria-hidden />
        Summary
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div
            className={cn(
              "absolute right-0 z-30 mt-1 w-[21rem] max-w-[86vw] overflow-hidden",
              reportOverlay,
            )}
          >
            {loading ? (
              <p className={cn("px-4 py-5 text-[12px]", reportMuted)}>
                Building summary…
              </p>
            ) : summary ? (
              <>
                <div className={cn("border-b px-4 pb-3 pt-3.5", reportHairline)}>
                  <div className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--order-ink,#15231f)]">
                    {summary.title}
                  </div>
                  {summary.metaLines.length > 0 ? (
                    <div className={cn("mt-0.5 text-[11px]", reportMuted)}>
                      {summary.metaLines.join(" · ")}
                    </div>
                  ) : null}
                </div>

                {summary.highlights.length > 0 ? (
                  <div className={cn("space-y-2 border-b px-4 py-3", reportHairline)}>
                    {summary.highlights.slice(0, 3).map((h) => (
                      <div
                        key={h.label}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span
                          className={cn(
                            "shrink-0 text-[10px] font-semibold uppercase tracking-[0.04em]",
                            reportMono,
                            reportMuted,
                          )}
                        >
                          {h.label}
                        </span>
                        <span
                          className={cn(
                            "truncate text-[13px] font-semibold text-[var(--order-ink,#15231f)]",
                            reportMono,
                          )}
                        >
                          {h.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-3 p-4">
                  <pre
                    className={cn(
                      "max-h-32 overflow-auto whitespace-pre-wrap break-words px-3 py-2.5 text-[11px] leading-relaxed text-[var(--order-ink,#15231f)]",
                      reportPaper,
                    )}
                  >
                    {summary.text}
                  </pre>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void send("whatsapp")}
                      disabled={sending !== null}
                      className={reportBtn}
                    >
                      <MessageCircle className="size-3.5" aria-hidden />
                      {sending === "whatsapp" ? "Sending" : "WhatsApp"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void send("sms")}
                      disabled={sending !== null}
                      className={reportBtn}
                    >
                      <Send className="size-3.5" aria-hidden />
                      {sending === "sms" ? "Sending" : "SMS"}
                    </button>
                    <button type="button" onClick={() => void copy()} className={reportBtn}>
                      <Copy className="size-3.5" aria-hidden />
                      Copy
                    </button>
                  </div>
                  <p className={cn("text-[10px]", reportMuted)}>
                    Sends to your verified alert phone (Ops alert settings).
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
