"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import {
  DashboardFeedback,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  testWhatsAppMessage,
  type CreditSaleReminderTestResult,
} from "@/lib/api";

type Props = {
  canSend: boolean;
};

function formatSummary(r: CreditSaleReminderTestResult): string {
  const parts = [
    `Meta WhatsApp: ${r.metaWhatsAppConfigured ? "configured" : "not configured"}`,
    `RapidAPI lookup: ${r.rapidApiConfigured ? "configured" : "not configured"}`,
    `SMS fallback: ${r.smsConfigured ? "configured" : "not configured"}`,
    `Lookup: ${
      r.whatsAppLookupSkipped
        ? "skipped"
        : r.onWhatsApp
          ? "on WhatsApp"
          : "not on WhatsApp"
    } (${r.lookupDetail})`,
    `Result: ${r.outcome} via ${r.channel} — ${r.detail}`,
  ];
  if (/http_401|http_403/i.test(r.detail)) {
    parts.push(
      "Meta rejected the access token (401/403). In Credit tab reminders, paste a fresh permanent token from Meta Business Manager → WhatsApp → API setup, confirm the phone number ID matches that app, save, then retry.",
    );
  } else if (r.outcome === "failed" && r.channel === "whatsapp") {
    parts.push(
      "WhatsApp did not deliver. Free-form text only works if the recipient messaged your business number in the last 24 hours; otherwise use an approved template.",
    );
  }
  return parts.join("\n");
}

export function WhatsAppTestPanel({ canSend }: Props) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<CreditSaleReminderTestResult | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    kind: "error" | "success";
  } | null>(null);

  if (!canSend) {
    return null;
  }

  const onSend = async () => {
    const target = phone.trim();
    if (!target || sending) return;
    setSending(true);
    setResult(null);
    setFeedback(null);
    try {
      const res = await testWhatsAppMessage(target, message);
      setResult(res);
      const ok = res.outcome === "sent";
      setFeedback({
        text: ok
          ? `Sent via ${res.channel}. Check the recipient's phone.`
          : formatSummary(res),
        kind: ok ? "success" : "error",
      });
    } catch (err) {
      setFeedback({
        text: err instanceof Error ? err.message : "Test send failed.",
        kind: "error",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/80 bg-gradient-to-b from-emerald-500/[0.04] to-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <Send className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Test WhatsApp message
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a one-off WhatsApp (or SMS fallback) to any number to confirm
            delivery works. Uses the WhatsApp credentials from Credit tab
            reminders — no need to enable reminders first.
          </p>
        </div>
      </div>

      {feedback ? (
        <div className="mt-4">
          <DashboardFeedback kind={feedback.kind} text={feedback.text} />
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        <label className="flex flex-col gap-1.5 sm:max-w-xs">
          <span className={dashboardLabelClass()}>Recipient phone</span>
          <input
            className={dashboardInputClass()}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712345678"
            disabled={sending}
            aria-label="Recipient phone number"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={dashboardLabelClass()}>Message (optional)</span>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave blank to send a default test message…"
            rows={3}
            disabled={sending}
          />
        </label>

        <Button
          type="button"
          disabled={sending || !phone.trim()}
          onClick={() => void onSend()}
        >
          {sending ? "Sending…" : "Send test WhatsApp"}
        </Button>

        {result ? (
          <pre className="max-h-40 overflow-auto rounded-lg border border-border/60 bg-muted/30 p-3 text-xs whitespace-pre-wrap">
            {formatSummary(result)}
          </pre>
        ) : null}
      </div>
    </section>
  );
}
