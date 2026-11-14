"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";

import {
  CAMPAIGN_STATUS_LABEL,
  Chip,
  Panel,
  REACH_COLOR,
  REACH_LABEL,
  SMS_ACCENT_TEXT,
  SMS_INK,
  SMS_MUTED,
  SMS_ROW,
  SMS_ROW_HOVER,
  SMS_RULE,
  SMS_WARN_TEXT,
  campaignTone,
  formatNumber,
  formatWhen,
  plural,
  reasonLabel,
} from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import type { SmsCreditBalanceRecord } from "@/lib/api";
import {
  fetchSmsCampaigns,
  fetchSmsMessages,
  type SmsAutomations,
  type SmsCampaignSummary,
  type SmsHubSummary,
  type SmsMessageRow,
  type SmsReach,
} from "@/lib/sms-hub-api";
import { cn } from "@/lib/utils";

const REACH_ORDER: SmsReach[] = ["CAN_TEXT", "RECEIPTS_ONLY", "OPTED_OUT", "NO_NUMBER"];

type Props = {
  summary: SmsHubSummary | null;
  automations: SmsAutomations | null;
  balance: SmsCreditBalanceRecord | null;
  canManage: boolean;
  onOpenContacts: (reach: SmsReach | null) => void;
  onOpenAutomations: () => void;
  onOpenCampaigns: () => void;
  onOpenCampaign: (id: string) => void;
  onOpenActivity: () => void;
  onNewCampaign: () => void;
};

export function SmsHubOverview({
  summary,
  automations,
  balance,
  canManage,
  onOpenContacts,
  onOpenAutomations,
  onOpenCampaigns,
  onOpenCampaign,
  onOpenActivity,
  onNewCampaign,
}: Props) {
  const [campaigns, setCampaigns] = useState<SmsCampaignSummary[] | null>(null);
  const [messages, setMessages] = useState<SmsMessageRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSmsCampaigns({ size: 4 })
      .then((page) => {
        if (!cancelled) setCampaigns(page.content ?? []);
      })
      .catch(() => {
        if (!cancelled) setCampaigns([]);
      });
    fetchSmsMessages({ size: 6 })
      .then((page) => {
        if (!cancelled) setMessages(page.content ?? []);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = summary?.contacts ?? null;
  const reachValue = (reach: SmsReach): number => {
    if (!counts) return 0;
    switch (reach) {
      case "CAN_TEXT":
        return counts.canText;
      case "RECEIPTS_ONLY":
        return counts.receiptsOnly;
      case "OPTED_OUT":
        return counts.optedOut;
      default:
        return counts.noNumber;
    }
  };
  const total = counts?.total ?? 0;

  const noticesOn = automations
    ? Object.values(automations.orderNotices).filter((n) => n.enabled).length
    : 0;
  const noticesTotal = automations ? Object.keys(automations.orderNotices).length : 5;

  const steps = [
    {
      done: Boolean(summary?.smsConfigured),
      title: "SMS is switched on for this shop",
      body: summary?.smsConfigured
        ? "Texts can be sent."
        : "Nothing can be sent until SMS is set up for this shop.",
      action: null as null | { label: string; run: () => void },
    },
    {
      done: (counts?.canText ?? 0) > 0,
      title: "Record who agreed to offers",
      body:
        (counts?.canText ?? 0) > 0
          ? `${plural(counts?.canText ?? 0, "customer")} can get offers.`
          : "Offers only go to customers who said yes. Ask at the till, then tick them.",
      action: { label: "Open contacts", run: () => onOpenContacts("RECEIPTS_ONLY") },
    },
    {
      done: Boolean(automations && (automations.thankYouEnabled || automations.winbackEnabled)),
      title: "Choose what sends itself",
      body: "Order updates are already on. Thank-you and we-miss-you texts are yours to switch on.",
      action: { label: "Automatic texts", run: onOpenAutomations },
    },
    {
      done: (campaigns?.length ?? 0) > 0,
      title: "Send your first campaign",
      body: "One text to a group: everyone who agreed, or customers who have gone quiet.",
      action: canManage ? { label: "New campaign", run: onNewCampaign } : null,
    },
  ];
  const stepsLeft = steps.filter((s) => !s.done).length;

  return (
    <div className="flex flex-col gap-3">
      {stepsLeft > 0 ? (
        <Panel title={`${plural(stepsLeft, "step")} left before texts can go out`} flush>
          <ol>
            {steps.map((step) => (
              <li key={step.title} className={cn("flex items-start gap-3 px-4 py-3", SMS_ROW)}>
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
                    step.done ? "border-[#1D4B3B] bg-[#1D4B3B] text-white" : "border-[#B8B2A4] text-transparent",
                  )}
                >
                  <Check className="size-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", step.done ? SMS_MUTED : SMS_INK)}>
                    {step.title}
                    <span className="sr-only">{step.done ? " (done)" : " (to do)"}</span>
                  </p>
                  <p className={cn("mt-0.5 text-[13px] leading-snug", SMS_MUTED)}>{step.body}</p>
                </div>
                {!step.done && step.action ? (
                  <button
                    type="button"
                    onClick={step.action.run}
                    className="shrink-0 text-[13px] font-medium text-[var(--op-accent,#1d4b3b)] underline decoration-[var(--op-rule)] underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]"
                  >
                    {step.action.label}
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        </Panel>
      ) : null}

      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <p className={cn("max-w-[46ch] text-[15px] leading-snug", SMS_INK)}>
            {counts ? (
              total === 0 ? (
                "No customers yet. Offers go only to people who have agreed."
              ) : (
                <>
                  Offers can go to{" "}
                  <span className="font-mono font-medium tabular-nums">{formatNumber(counts.canText)}</span> of{" "}
                  <span className="font-mono font-medium tabular-nums">{formatNumber(total)}</span>{" "}
                  {total === 1 ? "customer" : "customers"}.
                </>
              )
            ) : (
              "Counting your customers…"
            )}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenContacts(null)}>
            Open contacts
            <ChevronRight className="size-3.5" aria-hidden />
          </Button>
        </div>

        <div
          className="mt-4 flex h-3 w-full overflow-hidden rounded-[2px] bg-[color-mix(in_srgb,var(--op-ink,#121a16)_7%,transparent)]"
          role="img"
          aria-label={
            counts
              ? REACH_ORDER.map((r) => `${REACH_LABEL[r]}: ${reachValue(r)}`).join(", ")
              : "Loading customer reach"
          }
        >
          {total > 0
            ? REACH_ORDER.map((reach) => {
                const value = reachValue(reach);
                if (value === 0) return null;
                return (
                  <div
                    key={reach}
                    style={{ width: `${(value / total) * 100}%`, backgroundColor: REACH_COLOR[reach] }}
                    className="h-full min-w-[3px] border-r border-[var(--op-surface,#FCFAF5)] last:border-0"
                  />
                );
              })
            : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {REACH_ORDER.map((reach) => (
            <button
              key={reach}
              type="button"
              onClick={() => onOpenContacts(reach)}
              className={cn(
                "group -mx-1 rounded-[2px] px-1 py-1 text-left",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]",
              )}
            >
              <span className={cn("flex items-center gap-1.5 text-[12.5px]", SMS_MUTED)}>
                <span
                  aria-hidden
                  className="size-2 rounded-[1px]"
                  style={{ backgroundColor: REACH_COLOR[reach] }}
                />
                {REACH_LABEL[reach]}
              </span>
              <span
                className={cn(
                  "mt-0.5 block font-mono text-[20px] font-medium leading-tight tabular-nums group-hover:underline",
                  SMS_INK,
                )}
              >
                {counts ? formatNumber(reachValue(reach)) : "…"}
              </span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Panel
          title="Sending on their own"
          aside={
            <Button type="button" size="sm" variant="ghost" onClick={onOpenAutomations}>
              Manage
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          }
          flush
        >
          <ul>
            <RuleRow
              title="Order updates"
              detail={
                automations
                  ? `${noticesOn} of ${noticesTotal} on. Sent to anyone who gave a number.`
                  : "Loading…"
              }
              on={noticesOn > 0}
            />
            <RuleRow
              title="Thank you after a first purchase"
              detail="Sent once, to customers who agreed to offers."
              on={Boolean(automations?.thankYouEnabled)}
            />
            <RuleRow
              title="We miss you"
              detail={
                automations
                  ? `After ${automations.winbackDays} days without a purchase.`
                  : "After a quiet spell."
              }
              on={Boolean(automations?.winbackEnabled)}
            />
            <li className={cn("px-4 py-3 text-[13px]", SMS_MUTED)}>
              Offers go out {summary?.sendWindow ?? "8:00 am to 6:00 pm"}, at most{" "}
              {automations ? plural(automations.promoWeeklyCap, "offer") : "one offer"} per customer a
              week.
            </li>
          </ul>
        </Panel>
        <div className="flex flex-col gap-3">
          <CreditsPanel summary={summary} balance={balance} />
          <ActivityChart summary={summary} onOpenActivity={onOpenActivity} />
        </div>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Panel
          title="Campaigns"
          aside={
            <Button type="button" size="sm" variant="ghost" onClick={onOpenCampaigns}>
              All campaigns
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          }
          flush
        >
          {campaigns && campaigns.length === 0 ? (
            <p className={cn("px-4 py-3 text-[13.5px] leading-snug", SMS_MUTED)}>
              No campaigns yet. One text, sent to customers who agreed to offers.
              {canManage ? (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={onNewCampaign}
                    className="font-medium text-[var(--op-accent,#1d4b3b)] underline decoration-[var(--op-rule)] underline-offset-2"
                  >
                    Write one
                  </button>
                </>
              ) : null}
            </p>
          ) : (
            <ul>
              {(campaigns ?? []).map((c) => (
                <li key={c.id} className={SMS_ROW}>
                  <button
                    type="button"
                    onClick={() => onOpenCampaign(c.id)}
                    className={cn("flex w-full items-center gap-3 px-4 py-3 text-left", SMS_ROW_HOVER)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm font-medium", SMS_INK)}>{c.name}</span>
                      <span className={cn("mt-0.5 block truncate text-[13px]", SMS_MUTED)}>{c.body}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <Chip tone={campaignTone(c.status)}>{CAMPAIGN_STATUS_LABEL[c.status]}</Chip>
                      <span className={cn("mt-0.5 block font-mono text-[12px] tabular-nums", SMS_MUTED)}>
                        {c.recipientsSent} / {c.recipientsTargeted}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Latest messages"
          aside={
            <Button type="button" size="sm" variant="ghost" onClick={onOpenActivity}>
              All messages
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          }
          flush
        >
          {messages && messages.length === 0 ? (
            <p className={cn("px-4 py-3 text-[13.5px] leading-snug", SMS_MUTED)}>
              Nothing sent yet. Each text will show here with its cost and whether it arrived.
            </p>
          ) : (
            <ul>
              {(messages ?? []).map((m) => (
                <li key={m.id} className={cn("flex items-start gap-3 px-4 py-3", SMS_ROW)}>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[13.5px]", SMS_INK)}>{m.body}</span>
                    <span className={cn("mt-0.5 block text-[12px]", SMS_MUTED)}>
                      {reasonLabel(m.reason)}, <span className="font-mono">{formatWhen(m.createdAt)}</span>
                    </span>
                  </span>
                  <Chip
                    tone={
                      m.status === "DELIVERED" ? "good" : m.status === "SENT" ? "live" : "warn"
                    }
                  >
                    {m.status === "DELIVERED"
                      ? "Delivered"
                      : m.status === "SENT"
                        ? "Sent"
                        : m.status === "BLOCKED"
                          ? "No credits"
                          : "Failed"}
                  </Chip>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function RuleRow({ title, detail, on }: { title: string; detail: string; on: boolean }) {
  return (
    <li className={cn("flex items-center gap-3 px-4 py-3", SMS_ROW)}>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", SMS_INK)}>{title}</p>
        <p className={cn("mt-0.5 text-[13px] leading-snug", SMS_MUTED)}>{detail}</p>
      </div>
      <Chip tone={on ? "good" : "quiet"}>{on ? "On" : "Off"}</Chip>
    </li>
  );
}

function ActivityChart({
  summary,
  onOpenActivity,
}: {
  summary: SmsHubSummary | null;
  onOpenActivity: () => void;
}) {
  const daily = summary?.daily ?? [];
  const peak = daily.reduce((m, d) => Math.max(m, d.messages), 0);
  const statuses = summary?.statuses;
  const dayLabel = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("en-KE", { day: "numeric", month: "short" });

  return (
    <Panel
      title="Last 30 days"
      description={
        summary
          ? `${plural(summary.messagesLast30Days, "text")} sent, ${plural(summary.creditsLast30Days, "credit")} used`
          : "Loading…"
      }
      aside={
        <Button type="button" size="sm" variant="ghost" onClick={onOpenActivity}>
          Sent messages
          <ChevronRight className="size-3.5" aria-hidden />
        </Button>
      }
    >
      {daily.length > 0 && peak > 0 ? (
        <>
          <div
            className="flex h-32 items-end gap-[3px]"
            role="img"
            aria-label={`Texts sent per day for the last 30 days. Busiest day: ${peak}.`}
          >
            {daily.map((d) => (
              <div
                key={d.date}
                title={`${dayLabel(d.date)}: ${plural(d.messages, "text")}`}
                className="flex h-full flex-1 items-end"
              >
                <div
                  className={cn(
                    "w-full rounded-t-[1px]",
                    d.messages > 0
                      ? "bg-[#1D4B3B]"
                      : "bg-[color-mix(in_srgb,var(--op-ink,#121a16)_10%,transparent)]",
                  )}
                  style={{ height: d.messages > 0 ? `${Math.max(6, (d.messages / peak) * 100)}%` : "2px" }}
                />
              </div>
            ))}
          </div>
          <div className={cn("mt-1.5 flex justify-between font-mono text-[11px]", SMS_MUTED)}>
            <span>{dayLabel(daily[0].date)}</span>
            <span>busiest day {peak}</span>
            <span>{dayLabel(daily[daily.length - 1].date)}</span>
          </div>
        </>
      ) : (
        <p className={cn("text-[13.5px]", SMS_MUTED)}>
          {summary ? "No texts in the last 30 days." : "Loading…"}
        </p>
      )}
      {statuses && (statuses.delivered > 0 || statuses.sent > 0 || statuses.failed > 0 || statuses.blocked > 0) ? (
        <dl className={cn("mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t pt-3 sm:grid-cols-4", SMS_RULE)}>
          <Outcome label="Delivered" value={statuses.delivered} />
          <Outcome label="Sent, no report yet" value={statuses.sent} />
          <Outcome label="Failed" value={statuses.failed} warn={statuses.failed > 0} />
          <Outcome label="Stopped: no credits" value={statuses.blocked} warn={statuses.blocked > 0} />
        </dl>
      ) : null}
    </Panel>
  );
}

function Outcome({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <dt className={cn("text-[12px]", SMS_MUTED)}>{label}</dt>
      <dd className={cn("font-mono text-[16px] font-medium tabular-nums", warn ? SMS_WARN_TEXT : SMS_INK)}>
        {formatNumber(value)}
      </dd>
    </div>
  );
}

function CreditsPanel({
  summary,
  balance,
}: {
  summary: SmsHubSummary | null;
  balance: SmsCreditBalanceRecord | null;
}) {
  const reasons = [...(summary?.byReason ?? [])].sort((a, b) => b.credits - a.credits).slice(0, 5);
  const top = reasons.reduce((m, r) => Math.max(m, r.credits), 0);
  const metered = Boolean(balance?.meteringEnabled);

  return (
    <Panel title="Credits">
      {metered && balance ? (
        <p className={cn("text-[13.5px] leading-snug", balance.lowBalance ? SMS_WARN_TEXT : SMS_MUTED)}>
          <span className={cn("font-mono font-medium tabular-nums", balance.lowBalance ? SMS_WARN_TEXT : SMS_INK)}>
            {formatNumber(balance.includedRemaining)}
          </span>{" "}
          left in this month&rsquo;s plan
          {balance.purchasedBalance > 0 ? (
            <>
              ,{" "}
              <span className="font-mono font-medium tabular-nums text-[var(--op-ink,#121a16)]">
                {formatNumber(balance.purchasedBalance)}
              </span>{" "}
              bought
            </>
          ) : null}
          . {balance.lowBalance ? "Running low. " : ""}
          Top up from the balance at the top of the page.
        </p>
      ) : (
        <p className={cn("text-[13.5px]", SMS_MUTED)}>
          {balance ? "SMS is not metered on this shop." : "Loading balance…"}
        </p>
      )}

      <div className={cn("mt-3 border-t pt-3", SMS_RULE)}>
        <p className={cn("text-[12px]", SMS_MUTED)}>Where credits went, 30 days</p>
        {reasons.length === 0 ? (
          <p className={cn("mt-2 text-[13.5px]", SMS_MUTED)}>Nothing spent yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {reasons.map((r) => (
              <li key={r.reason}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className={SMS_INK}>{reasonLabel(r.reason)}</span>
                  <span className={cn("font-mono tabular-nums", SMS_ACCENT_TEXT)}>
                    {formatNumber(r.credits)}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full bg-[color-mix(in_srgb,var(--op-ink,#121a16)_8%,transparent)]">
                  <div
                    className="h-full bg-[#1D4B3B]"
                    style={{ width: `${top > 0 ? Math.max(3, (r.credits / top) * 100) : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

