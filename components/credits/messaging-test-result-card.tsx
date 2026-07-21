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
  if (d === "whatsapp_only_test" || d === "sms_only_test" || d === "direct_send") {
    return null;
  }
  if (d.startsWith("http_")) {
    return "RapidAPI rejected or could not complete the lookup request. Check host, URL, phone field, and API key.";
  }
  if (d.includes("not configured") || d === "rapidapi key not configured") {
    return "No RapidAPI key resolved (tenant, platform, or env).";
  }
  if (d === "unrecognized_response") {
    return "API responded, but the body shape was not recognized — WhatsApp send was still attempted.";
  }
  if (d === "error" || d === "parse_error" || d === "empty_body") {
    return "Lookup failed before a clear yes/no answer.";
  }
  return null;
}

function stripPrefix(detail: string): string {
  return detail
    .replace(/^whatsapp_failed:/i, "")
    .replace(/^whatsapp_skipped:/i, "")
    .replace(/^sms_failed:/i, "")
    .replace(/^sms:/i, "")
    .trim();
}

/** Split combined delivery detail: "whatsapp_failed:…; sms:…" */
function splitDeliveryDetail(detail: string): {
  whatsapp: string | null;
  sms: string | null;
} {
  if (!detail) {
    return { whatsapp: null, sms: null };
  }
  const smsIdx = detail.search(/;\s*sms:/i);
  if (smsIdx >= 0) {
    return {
      whatsapp: stripPrefix(detail.slice(0, smsIdx)),
      sms: stripPrefix(detail.slice(smsIdx + 1).replace(/^sms:/i, "")),
    };
  }
  if (/^whatsapp_/i.test(detail) || /graph|oauth|meta/i.test(detail)) {
    return { whatsapp: stripPrefix(detail), sms: null };
  }
  if (/^not_on_whatsapp:/i.test(detail)) {
    const parts = detail.split(";");
    return {
      whatsapp: parts[0] ?? detail,
      sms: parts.length > 1 ? stripPrefix(parts.slice(1).join(";")) : null,
    };
  }
  return { whatsapp: null, sms: stripPrefix(detail) };
}

function explainMetaDetail(detail: string): string | null {
  const d = detail.toLowerCase();
  if (/object with id|does not exist|missing permissions/i.test(detail)) {
    return "Meta phone number ID is wrong for this token, or the app lacks WhatsApp permissions. Fix Meta phone number ID / access token — this is not a RapidAPI or SMS issue.";
  }
  if (/http_401|http_403|oauth|access token/i.test(d)) {
    return "Meta rejected the access token. Paste a fresh permanent token from Meta Business Manager.";
  }
  if (/http_400/i.test(d) && /graph/i.test(d)) {
    return "Meta Graph API rejected the send request (credentials or payload).";
  }
  return null;
}

function explainSmsDetail(detail: string, channel: string): string | null {
  const d = detail.toLowerCase();
  if (/not configured/i.test(detail)) {
    return "Set TextSMS, Sozuri, or Africa's Talking in Super Admin → Platform integrations or Credit tab reminders.";
  }
  if (d.startsWith("http_") || d.startsWith("code_")) {
    if (channel === "sozuri") {
      return "Sozuri rejected the request. Check project name, API key, sender ID, and message type.";
    }
    if (channel === "textsms") {
      return "TextSMS rejected the request. Check partner ID, API key, and shortcode / sender ID.";
    }
    return "SMS provider rejected the request. Check credentials.";
  }
  if (d === "error") {
    return "SMS send failed before a provider response.";
  }
  return null;
}

export type MessagingTestVariant = "full" | "whatsapp" | "sms";

type Props = {
  result: CreditSaleReminderTestResult;
  variant?: MessagingTestVariant;
  /** When false, hides the reminders-enabled row. */
  showRemindersToggle?: boolean;
  className?: string;
};

export function MessagingTestResultCard({
  result: r,
  variant = "full",
  showRemindersToggle = true,
  className,
}: Props) {
  const ok = r.outcome === "sent";
  const showRapid = variant === "full";
  const showMeta = variant === "full" || variant === "whatsapp";
  const showSms = variant === "full" || variant === "sms";
  const lookupHint = showRapid ? explainLookupDetail(r.lookupDetail) : null;
  const parts = splitDeliveryDetail(r.detail);
  const deliveryDetail = stripPrefix(r.detail);
  const metaDetail = variant === "whatsapp" ? deliveryDetail : parts.whatsapp;
  const smsDetail = variant === "sms" ? deliveryDetail : parts.sms;
  const whatsappFailed =
    /whatsapp_failed|whatsapp_skipped/i.test(r.detail) ||
    (r.channel === "whatsapp" && r.outcome !== "sent");
  const smsUsed =
    r.channel === "sms" ||
    r.channel === "sozuri" ||
    r.channel === "textsms" ||
    r.channel === "africas_talking" ||
    r.channel === "sms_stub" ||
    r.outcome === "stub" ||
    Boolean(parts.sms);
  const metaHint = showMeta && metaDetail ? explainMetaDetail(metaDetail) : null;
  const smsHint =
    showSms && (smsDetail || r.detail)
      ? explainSmsDetail(smsDetail || r.detail, r.channel)
      : null;

  const title =
    variant === "sms"
      ? "SMS test"
      : variant === "whatsapp"
        ? "Meta WhatsApp test"
        : "Reminder delivery test";

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
        {title}: {r.outcome}
        {r.channel ? ` via ${r.channel}` : ""}
      </div>

      <div className="divide-y divide-border/50">
        {showRemindersToggle && variant === "full" ? (
          <section className="space-y-1 px-3 py-2.5">
            <p className="text-xs font-semibold text-foreground">Reminders</p>
            <p className="text-muted-foreground">
              Enabled: <span className="text-foreground">{yesNo(r.remindersEnabled)}</span>
            </p>
          </section>
        ) : null}

        {showRapid ? (
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
        ) : null}

        {showMeta ? (
          <section className="space-y-1.5 px-3 py-2.5">
            <p className="text-xs font-semibold text-foreground">
              {variant === "full" ? "2. Meta WhatsApp send" : "Meta WhatsApp send"}
            </p>
            <p className="text-muted-foreground">
              Configured:{" "}
              <span className="text-foreground">{yesNo(r.metaWhatsAppConfigured)}</span>
            </p>
            <p className="text-muted-foreground">
              Result:{" "}
              <span className="text-foreground">
                {variant === "full"
                  ? r.channel === "whatsapp" && r.outcome === "sent"
                    ? "sent"
                    : whatsappFailed
                      ? "failed"
                      : r.outcome
                  : r.outcome}
              </span>
            </p>
            {metaDetail ? (
              <p className="break-words font-mono text-[11px] leading-relaxed text-foreground/85">
                {metaDetail}
              </p>
            ) : null}
            {metaHint ? (
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                {metaHint}
              </p>
            ) : null}
            {variant === "full" && smsUsed && whatsappFailed ? (
              <p className="text-xs text-muted-foreground">Falling back to SMS…</p>
            ) : null}
          </section>
        ) : null}

        {showSms ? (
          <section className="space-y-1.5 px-3 py-2.5">
            <p className="text-xs font-semibold text-foreground">
              {variant === "full" ? "3. SMS fallback" : "SMS send"}
            </p>
            <p className="text-muted-foreground">
              Configured:{" "}
              <span className="text-foreground">{yesNo(r.smsConfigured)}</span>
            </p>
            {variant === "sms" || smsUsed ? (
              <>
                <p className="text-muted-foreground">
                  Result: <span className="text-foreground">{r.outcome}</span>
                  {r.channel && r.channel !== "whatsapp" ? (
                    <>
                      {" "}
                      via <span className="text-foreground">{r.channel}</span>
                    </>
                  ) : null}
                </p>
                {smsDetail ? (
                  <p className="break-words font-mono text-[11px] leading-relaxed text-foreground/85">
                    {smsDetail}
                  </p>
                ) : null}
                {smsHint ? (
                  <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                    {smsHint}
                  </p>
                ) : null}
                {r.outcome === "stub" ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    SMS provider is “none”: nothing is sent to the phone (server log
                    only).
                  </p>
                ) : null}
              </>
            ) : variant === "full" &&
              r.channel === "whatsapp" &&
              r.outcome === "sent" ? (
              <p className="text-muted-foreground">Not used (WhatsApp delivered).</p>
            ) : variant === "full" && !r.smsConfigured ? (
              <p className="text-muted-foreground">
                Not configured — enable TextSMS, Sozuri, or Africa&apos;s Talking to fall back when
                WhatsApp fails.
              </p>
            ) : (
              <p className="text-muted-foreground">Not used.</p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function messagingTestHeadline(
  r: CreditSaleReminderTestResult,
  variant: MessagingTestVariant = "full",
): string {
  if (r.outcome === "sent") {
    if (variant === "sms") {
      return `SMS sent via ${r.channel}. Check the recipient’s phone.`;
    }
    if (variant === "whatsapp") {
      return "WhatsApp sent. Check the recipient’s phone.";
    }
    if (
      (r.channel === "sozuri" ||
        r.channel === "textsms" ||
        r.channel === "africas_talking" ||
        r.channel === "sms") &&
      /whatsapp_failed/i.test(r.detail)
    ) {
      return `WhatsApp failed; sent via SMS (${r.channel}). Check the recipient’s phone.`;
    }
    return `Sent via ${r.channel}. Check the recipient’s phone.`;
  }
  if (variant === "sms") {
    return `SMS ${r.outcome}. See details below.`;
  }
  if (variant === "whatsapp") {
    if (/object with id|does not exist/i.test(r.detail)) {
      return "Meta WhatsApp send failed (phone number ID / permissions). See details below.";
    }
    return `WhatsApp ${r.outcome}. See details below.`;
  }
  if (/whatsapp_failed/i.test(r.detail) && !r.smsConfigured) {
    return "WhatsApp failed and SMS fallback is not configured. See details below.";
  }
  if (r.channel === "whatsapp" && /object with id|does not exist/i.test(r.detail)) {
    return "Meta WhatsApp send failed (phone number ID / permissions). See details below.";
  }
  if (r.whatsAppLookupSkipped && /^http_/i.test(r.lookupDetail)) {
    return "RapidAPI lookup failed; delivery also did not succeed. See separated details below.";
  }
  return `Send ${r.outcome} via ${r.channel || "none"}. See details below.`;
}
