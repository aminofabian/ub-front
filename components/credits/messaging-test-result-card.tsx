"use client";

import type { CreditSaleReminderTestResult } from "@/lib/api";
import { cn } from "@/lib/utils";

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function lookupStatusLabel(r: CreditSaleReminderTestResult): string {
  if (r.whatsAppLookupSkipped) {
    return "inconclusive / skipped";
  }
  return r.onWhatsApp ? "number is on WhatsApp" : "number is not on WhatsApp";
}

function explainLookupDetail(detail: string): string | null {
  const d = detail.trim().toLowerCase();
  if (!d) return null;
  if (d.startsWith("http_")) {
    return "RapidAPI rejected or could not complete the lookup request. Check host, URL, phone field, and API key.";
  }
  if (d.includes("not configured") || d === "rapidapi key not configured") {
    return "No RapidAPI key resolved (tenant, platform, or env).";
  }
  if (d === "unrecognized_response") {
    return "API responded, but the body shape was not recognized — WhatsApp send was still attempted.";
  }
  if (d === "direct_send") {
    return "Lookup was bypassed for this test.";
  }
  if (d === "error" || d === "parse_error" || d === "empty_body") {
    return "Lookup failed before a clear yes/no answer.";
  }
  return null;
}

function stripWhatsAppPrefix(detail: string): string {
  return detail
    .replace(/^whatsapp_failed:/i, "")
    .replace(/^sms_failed:/i, "")
    .trim();
}

function explainMetaDetail(detail: string): string | null {
  const d = detail.toLowerCase();
  if (/object with id|does not exist|missing permissions/i.test(detail)) {
    return "Meta phone number ID is wrong for this token, or the app lacks WhatsApp permissions. Fix Meta phone number ID / access token — this is not a RapidAPI issue.";
  }
  if (/http_401|http_403|oauth|access token/i.test(d)) {
    return "Meta rejected the access token. Paste a fresh permanent token from Meta Business Manager.";
  }
  if (/http_400/i.test(d) && /graph/i.test(d)) {
    return "Meta Graph API rejected the send request (credentials or payload).";
  }
  return null;
}

type Props = {
  result: CreditSaleReminderTestResult;
  /** When false, hides the reminders-enabled row (WhatsApp-only test panel). */
  showRemindersToggle?: boolean;
  className?: string;
};

export function MessagingTestResultCard({
  result: r,
  showRemindersToggle = true,
  className,
}: Props) {
  const ok = r.outcome === "sent";
  const lookupHint = explainLookupDetail(r.lookupDetail);
  const deliveryDetail = stripWhatsAppPrefix(r.detail);
  const metaHint =
    r.channel === "whatsapp" || /whatsapp/i.test(r.detail)
      ? explainMetaDetail(r.detail)
      : null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border text-sm",
        ok
          ? "border-emerald-500/25 bg-emerald-500/[0.04]"
          : "border-border/70 bg-muted/20",
        className,
      )}
    >
      <div
        className={cn(
          "border-b px-3 py-2 text-xs font-medium uppercase tracking-wide",
          ok
            ? "border-emerald-500/20 text-emerald-800 dark:text-emerald-200"
            : "border-border/60 text-muted-foreground",
        )}
      >
        Overall: {r.outcome}
        {r.channel ? ` via ${r.channel}` : ""}
      </div>

      <div className="divide-y divide-border/50">
        {showRemindersToggle ? (
          <section className="space-y-1 px-3 py-2.5">
            <p className="text-xs font-semibold text-foreground">Reminders</p>
            <p className="text-muted-foreground">
              Enabled: <span className="text-foreground">{yesNo(r.remindersEnabled)}</span>
              {" · "}
              SMS fallback:{" "}
              <span className="text-foreground">{yesNo(r.smsConfigured)}</span>
            </p>
          </section>
        ) : (
          <section className="space-y-1 px-3 py-2.5">
            <p className="text-xs font-semibold text-foreground">Fallbacks</p>
            <p className="text-muted-foreground">
              SMS: <span className="text-foreground">{yesNo(r.smsConfigured)}</span>
            </p>
          </section>
        )}

        <section className="space-y-1.5 px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">
            1. RapidAPI lookup
          </p>
          <p className="text-muted-foreground">
            Configured:{" "}
            <span className="text-foreground">{yesNo(r.rapidApiConfigured)}</span>
          </p>
          <p className="text-muted-foreground">
            Result:{" "}
            <span className="text-foreground">{lookupStatusLabel(r)}</span>
            {r.lookupDetail ? (
              <>
                {" "}
                <span className="font-mono text-[11px] text-foreground/80">
                  ({r.lookupDetail})
                </span>
              </>
            ) : null}
          </p>
          {lookupHint ? (
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
              {lookupHint}
            </p>
          ) : null}
        </section>

        <section className="space-y-1.5 px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">
            2. Meta WhatsApp send
          </p>
          <p className="text-muted-foreground">
            Configured:{" "}
            <span className="text-foreground">{yesNo(r.metaWhatsAppConfigured)}</span>
          </p>
          {r.channel === "whatsapp" || /whatsapp/i.test(r.detail) ? (
            <>
              <p className="text-muted-foreground">
                Result:{" "}
                <span className="text-foreground">
                  {r.channel === "whatsapp" ? r.outcome : "not used"}
                </span>
              </p>
              {deliveryDetail ? (
                <p className="break-words font-mono text-[11px] leading-relaxed text-foreground/85">
                  {deliveryDetail}
                </p>
              ) : null}
              {metaHint ? (
                <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                  {metaHint}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">
              Not attempted
              {r.channel === "sms"
                ? " (fell through to SMS)"
                : r.channel === "none" || r.channel === "stub"
                  ? " (no WhatsApp send)"
                  : ""}
              .
            </p>
          )}
        </section>

        {r.channel === "sms" || r.outcome === "stub" ? (
          <section className="space-y-1.5 px-3 py-2.5">
            <p className="text-xs font-semibold text-foreground">3. SMS</p>
            <p className="text-muted-foreground">
              Result: <span className="text-foreground">{r.outcome}</span>
            </p>
            {r.detail && r.channel === "sms" ? (
              <p className="break-words font-mono text-[11px] leading-relaxed text-foreground/85">
                {stripWhatsAppPrefix(r.detail)}
              </p>
            ) : null}
            {r.outcome === "stub" ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                SMS provider is “none”: nothing is sent to the phone (server log
                only).
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** Short one-line status for toast-style feedback. */
export function messagingTestHeadline(r: CreditSaleReminderTestResult): string {
  if (r.outcome === "sent") {
    return `Sent via ${r.channel}. Check the recipient’s phone.`;
  }
  if (r.channel === "whatsapp" && /object with id|does not exist/i.test(r.detail)) {
    return "Meta WhatsApp send failed (phone number ID / permissions). See details below — RapidAPI is separate.";
  }
  if (r.whatsAppLookupSkipped && /^http_/i.test(r.lookupDetail)) {
    return "RapidAPI lookup failed; Meta send also did not succeed. See separated details below.";
  }
  return `Send ${r.outcome} via ${r.channel || "none"}. See details below.`;
}
