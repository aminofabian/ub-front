"use client";

import { useState } from "react";
import { Send } from "lucide-react";

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
  fetchWhatsAppDiagnostics,
  testWhatsAppMessage,
  type CreditSaleReminderTestResult,
  type WhatsAppDiagnosticsResult,
} from "@/lib/api";

type Props = {
  canSend: boolean;
};

export function WhatsAppTestPanel({ canSend }: Props) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<CreditSaleReminderTestResult | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnostics, setDiagnostics] =
    useState<WhatsAppDiagnosticsResult | null>(null);
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
        text: messagingTestHeadline(res, "whatsapp"),
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

  const onDiagnose = async () => {
    if (diagnosing) return;
    setDiagnosing(true);
    setFeedback(null);
    try {
      setDiagnostics(await fetchWhatsAppDiagnostics());
    } catch (err) {
      setFeedback({
        text: err instanceof Error ? err.message : "Could not read Meta setup.",
        kind: "error",
      });
    } finally {
      setDiagnosing(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/80 bg-gradient-to-b from-emerald-500/[0.04] to-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <Send className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Test Meta WhatsApp
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tries the approved Meta payment_reminder template first (required for cold
            numbers). If WhatsApp fails, falls back to free-form (24h window) then SMS.
            Optional message is only a short name hint.
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

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={sending || !phone.trim()}
            onClick={() => void onSend()}
          >
            {sending ? "Sending…" : "Send test WhatsApp"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={diagnosing}
            onClick={() => void onDiagnose()}
          >
            {diagnosing ? "Checking…" : "Why do cold numbers fail?"}
          </Button>
        </div>

        {result ? (
          <MessagingTestResultCard
            result={result}
            variant="whatsapp"
            showRemindersToggle={false}
          />
        ) : null}

        {diagnostics ? <DiagnosticsCard data={diagnostics} /> : null}
      </div>
    </section>
  );
}

function DiagnosticsCard({ data }: { data: WhatsAppDiagnosticsResult }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20 text-sm">
      <div className="border-b border-border/60 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Cold (business-initiated) sends:{" "}
        {data.coldSendReady ? "ready" : "blocked"}
      </div>

      <div className="divide-y divide-border/50">
        <section className="space-y-1 px-3 py-2.5 text-muted-foreground">
          <p>
            Number:{" "}
            <span className="text-foreground">
              {data.displayPhoneNumber ?? data.phoneNumberId ?? "unknown"}
            </span>
            {data.verifiedName ? ` · ${data.verifiedName}` : ""}
          </p>
          <p>
            Quality:{" "}
            <span className="text-foreground">
              {data.qualityRating ?? "unknown"}
            </span>
            {data.messagingLimitTier ? (
              <>
                {" · limit "}
                <span className="text-foreground">
                  {data.messagingLimitTier}
                </span>
              </>
            ) : null}
          </p>
          {data.phoneError ? (
            <p className="break-words font-mono text-[11px] text-foreground/85">
              {data.phoneError}
            </p>
          ) : null}
        </section>

        <section className="space-y-1.5 px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">Templates</p>
          {data.templates.length ? (
            data.templates.map((t) => (
              <p
                key={`${t.name}-${t.language}`}
                className="text-muted-foreground"
              >
                <span className="font-mono text-[11px] text-foreground">
                  {t.name} ({t.language})
                </span>{" "}
                — <span className="text-foreground">{t.status}</span>
                {t.rejectedReason ? ` · ${t.rejectedReason}` : ""}
              </p>
            ))
          ) : (
            <p className="text-muted-foreground">
              {data.templatesError ?? "No matching templates found."}
            </p>
          )}
        </section>

        {data.findings.length ? (
          <section className="space-y-1.5 px-3 py-2.5">
            <p className="text-xs font-semibold text-foreground">Diagnosis</p>
            {data.findings.map((f) => (
              <p
                key={f}
                className="text-xs leading-relaxed text-amber-800 dark:text-amber-200"
              >
                {f}
              </p>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
