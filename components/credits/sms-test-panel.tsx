"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";

import {
  DashboardFeedback,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import {
  MessagingTestResultCard,
  messagingTestHeadline,
} from "@/components/credits/messaging-test-result-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  testSmsMessage,
  type CreditSaleReminderTestResult,
} from "@/lib/api";

type Props = {
  canSend: boolean;
};

export function SmsTestPanel({ canSend }: Props) {
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
      const res = await testSmsMessage(target, message);
      setResult(res);
      const ok = res.outcome === "sent";
      setFeedback({
        text: messagingTestHeadline(res, "sms"),
        kind: ok ? "success" : "error",
      });
    } catch (err) {
      setFeedback({
        text: err instanceof Error ? err.message : "SMS test failed.",
        kind: "error",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/80 bg-gradient-to-b from-sky-500/[0.04] to-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <MessageSquare className="mt-0.5 size-5 shrink-0 text-sky-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">Test SMS</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a one-off SMS via Sozuri or Africa&apos;s Talking only. Does not call
            RapidAPI or Meta WhatsApp.
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
            aria-label="Recipient phone number for SMS test"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={dashboardLabelClass()}>Message (optional)</span>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave blank to send a default SMS test message…"
            rows={3}
            disabled={sending}
          />
        </label>

        <Button
          type="button"
          disabled={sending || !phone.trim()}
          onClick={() => void onSend()}
        >
          {sending ? "Sending…" : "Send test SMS"}
        </Button>

        {result ? (
          <MessagingTestResultCard
            result={result}
            variant="sms"
            showRemindersToggle={false}
          />
        ) : null}
      </div>
    </section>
  );
}
