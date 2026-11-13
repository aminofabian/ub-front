import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SmsCampaignStatus, SmsReach } from "@/lib/sms-hub-api";
import { cn } from "@/lib/utils";

/**
 * SMS Hub look (DESIGN.md → Operator shell): ivory ground, paper surfaces, 2px
 * corners, hairline rules, one forest accent, terracotta only for attention.
 * Figures and timestamps are set in the mono face; everything else in the body sans.
 */
export const SMS_INK = "text-[var(--op-ink,#121a16)]";
export const SMS_MUTED = "text-[var(--op-muted,#556159)]";
export const SMS_RULE = "border-[var(--op-rule,rgba(18,26,22,0.1))]";
export const SMS_SURFACE = "bg-[var(--op-surface,#FCFAF5)]";
export const SMS_ACCENT_TEXT = "text-[var(--op-accent,#1d4b3b)]";
export const SMS_WARN_TEXT = "text-[#A55237]";

export const SMS_TH = cn(
  "px-3 py-2 text-left text-[12px] font-medium sm:px-4",
  SMS_MUTED,
);
export const SMS_TD = "px-3 py-3 align-middle text-sm sm:px-4";
export const SMS_ROW = cn("border-b last:border-0", SMS_RULE);
export const SMS_ROW_HOVER =
  "transition-colors hover:bg-[color-mix(in_srgb,var(--op-accent,#1d4b3b)_4%,transparent)]";

/** One colour per reach state, used by the reach bar, its legend and row chips. */
export const REACH_COLOR: Record<SmsReach, string> = {
  CAN_TEXT: "#1D4B3B",
  RECEIPTS_ONLY: "#B9D0C0",
  OPTED_OUT: "#A55237",
  NO_NUMBER: "#DDD7C9",
};

export const REACH_LABEL: Record<SmsReach, string> = {
  CAN_TEXT: "Can get offers",
  RECEIPTS_ONLY: "Order updates only",
  OPTED_OUT: "Opted out",
  NO_NUMBER: "No number",
};

export const REACH_HINT: Record<SmsReach, string> = {
  CAN_TEXT: "Agreed to offers. Gets order updates and promotions.",
  RECEIPTS_ONLY: "Has not agreed to offers yet. Gets order updates only.",
  OPTED_OUT: "Asked not to get offers. Still gets order updates.",
  NO_NUMBER: "No number we can text, or only an M-Pesa masked number.",
};

export const CAMPAIGN_STATUS_LABEL: Record<SmsCampaignStatus, string> = {
  DRAFT: "Draft",
  QUEUED: "Sending soon",
  SCHEDULED: "Scheduled",
  RUNNING: "Sending",
  COMPLETED: "Sent",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export type Tone = "good" | "live" | "quiet" | "warn";

export function campaignTone(status: SmsCampaignStatus): Tone {
  switch (status) {
    case "COMPLETED":
      return "good";
    case "RUNNING":
    case "QUEUED":
    case "SCHEDULED":
      return "live";
    case "FAILED":
      return "warn";
    default:
      return "quiet";
  }
}

export function reachTone(reach: SmsReach): Tone {
  switch (reach) {
    case "CAN_TEXT":
      return "good";
    case "OPTED_OUT":
      return "warn";
    case "NO_NUMBER":
      return "quiet";
    default:
      return "live";
  }
}

const TONE_DOT: Record<Tone, string> = {
  good: "bg-[#1D4B3B]",
  live: "bg-[#7FA08C]",
  quiet: "bg-[#B8B2A4]",
  warn: "bg-[#A55237]",
};

const TONE_TEXT: Record<Tone, string> = {
  good: "text-[#1D4B3B]",
  live: "text-[#3F5C4C]",
  quiet: "text-[var(--op-muted,#556159)]",
  warn: "text-[#8A4129]",
};

/** Small status marker: a dot and a word. Colour is never the only signal. */
export function Chip({
  tone = "quiet",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium",
        TONE_TEXT[tone],
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />
      {children}
    </span>
  );
}

/** Paper surface with an optional title row. `flush` removes body padding for tables. */
export function Panel({
  title,
  description,
  aside,
  flush = false,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-[2px] border", SMS_RULE, SMS_SURFACE, className)}>
      {title ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3",
            SMS_RULE,
          )}
        >
          <div className="min-w-0">
            <h2 className={cn("text-[15px] font-semibold tracking-[-0.01em]", SMS_INK)}>{title}</h2>
            {description ? (
              <p className={cn("mt-0.5 text-[13px] leading-snug", SMS_MUTED)}>{description}</p>
            ) : null}
          </div>
          {aside ? <div className="flex shrink-0 items-center gap-2">{aside}</div> : null}
        </div>
      ) : null}
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

/** A figure with its label, for the header strip and detail screens. */
export function Figure({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "warn";
}) {
  return (
    <div className="min-w-0">
      <p className={cn("text-[12px]", SMS_MUTED)}>{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-[22px] font-medium leading-none tabular-nums tracking-[-0.02em]",
          tone === "warn" ? SMS_WARN_TEXT : SMS_INK,
        )}
      >
        {value}
      </p>
      {hint ? <p className={cn("mt-1 text-[12px]", SMS_MUTED)}>{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-[2px] border",
          SMS_RULE,
          SMS_ACCENT_TEXT,
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <p className={cn("mt-3 text-[15px] font-semibold", SMS_INK)}>{title}</p>
      <p className={cn("mt-1 max-w-sm text-[13.5px] leading-relaxed", SMS_MUTED)}>{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Pager({
  page,
  totalPages,
  disabled,
  onPage,
  previousLabel = "Previous",
  nextLabel = "Next",
}: {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onPage: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || page === 0}
        onClick={() => onPage(Math.max(0, page - 1))}
      >
        {previousLabel}
      </Button>
      <span className={cn("font-mono text-[12px] tabular-nums", SMS_MUTED)}>
        {page + 1} / {totalPages}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || page + 1 >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        {nextLabel}
      </Button>
    </div>
  );
}

/**
 * A till M-Pesa prompt to a new number saves the number as the customer's name. A
 * "name" with no letter in it is that placeholder, so show it as missing.
 */
export function customerLabel(name: string | null | undefined): {
  label: string;
  missing: boolean;
} {
  const trimmed = (name ?? "").trim();
  if (!trimmed || !/[A-Za-z\u00C0-\u024F]/.test(trimmed)) return { label: "No name yet", missing: true };
  return { label: trimmed, missing: false };
}

export function Avatar({ name }: { name: string | null | undefined }) {
  const { label, missing } = customerLabel(name);
  const initials = missing
    ? "?"
    : label
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
        missing
          ? "border border-dashed border-[#B8B2A4] text-[#8A8577]"
          : "bg-[color-mix(in_srgb,var(--op-accent,#1d4b3b)_10%,transparent)] text-[var(--op-accent,#1d4b3b)]",
      )}
    >
      {initials}
    </span>
  );
}

/**
 * The SMS-specific measure: one box per part, filled as the text grows, so the
 * moment a message tips into a second credit is visible before it is sent.
 */
export function SegmentRuler({
  units,
  parts,
  encoding,
}: {
  units: number;
  parts: number;
  encoding: "GSM" | "UNICODE";
}) {
  const single = encoding === "GSM" ? 160 : 70;
  const multi = encoding === "GSM" ? 153 : 67;
  const perPart = parts === 1 ? single : multi;
  const boxes = Math.min(parts, 6);
  return (
    <div>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: boxes }, (_, i) => {
          const filled = Math.max(0, Math.min(1, (units - i * perPart) / perPart));
          return (
            <div
              key={i}
              className="h-2 flex-1 overflow-hidden rounded-[1px] bg-[color-mix(in_srgb,var(--op-ink,#121a16)_9%,transparent)]"
            >
              <div
                className={cn("h-full", i === 0 ? "bg-[#1D4B3B]" : "bg-[#A55237]")}
                style={{ width: `${Math.round(filled * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <p className={cn("mt-1.5 flex items-baseline justify-between text-[12.5px]", SMS_MUTED)}>
        <span>
          <span className={cn("font-mono tabular-nums", SMS_INK)}>{units}</span> characters
        </span>
        <span>
          <span className={cn("font-mono tabular-nums", parts > 1 ? SMS_WARN_TEXT : SMS_INK)}>
            {parts}
          </span>{" "}
          {parts === 1 ? "credit" : "credits"} per customer
        </span>
      </p>
    </div>
  );
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-KE", { dateStyle: "medium" });
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-KE");
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-KE")} ${n === 1 ? one : many}`;
}

export function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** What a message was for, in shop language. Keys are backend ledger reason codes. */
export const REASON_LABEL: Record<string, string> = {
  campaign: "Campaign",
  automation: "Automatic offer",
  notification: "Order update",
  credit_reminder: "Tab reminder",
  ops_alert: "Owner alert",
  payroll: "Staff message",
  otp: "Sign-in code",
  sms: "Other",
  ai_logo: "Other",
};

export function reasonLabel(reason: string | null | undefined): string {
  if (!reason) return "Other";
  return REASON_LABEL[reason] ?? "Other";
}
