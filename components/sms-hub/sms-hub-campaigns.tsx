"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Megaphone, Plus } from "lucide-react";

import {
  DashboardFeedback,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { useSmsCreditBalance } from "@/components/messaging/sms-credits-header";
import { SmsHubActivity } from "@/components/sms-hub/sms-hub-activity";
import {
  CAMPAIGN_STATUS_LABEL,
  Chip,
  EmptyState,
  Figure,
  Panel,
  SMS_INK,
  SMS_MUTED,
  SMS_ROW,
  SMS_ROW_HOVER,
  SMS_RULE,
  SMS_TD,
  SMS_TH,
  SMS_WARN_TEXT,
  SegmentRuler,
  campaignTone,
  customerLabel,
  errorText,
  formatNumber,
  formatWhen,
  plural,
} from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import type { CustomerEmailAudienceFilter } from "@/lib/api";
import {
  cancelSmsCampaign,
  createSmsCampaign,
  fetchSmsCampaign,
  fetchSmsCampaigns,
  previewSmsAudience,
  scheduleSmsCampaign,
  sendSmsCampaign,
  type SmsAudiencePreview,
  type SmsCampaignDetail,
  type SmsCampaignSummary,
  type SmsRecipientMethod,
} from "@/lib/sms-hub-api";
import { smsSize } from "@/lib/sms-segments";
import { cn } from "@/lib/utils";

/** What another part of the SMS page asks this tab to show. */
export type CampaignRequest =
  | { kind: "new" }
  | { kind: "selected"; customerIds: string[] }
  | { kind: "open"; id: string };

type View =
  | { kind: "list" }
  | { kind: "compose"; customerIds: string[] | null }
  | { kind: "detail"; id: string };

type Props = {
  canManage: boolean;
  sendWindow: string;
  optOutFooter: string;
  request: CampaignRequest | null;
  onRequestConsumed: () => void;
};

export function SmsHubCampaigns({
  canManage,
  sendWindow,
  optOutFooter,
  request,
  onRequestConsumed,
}: Props) {
  const [view, setView] = useState<View>({ kind: "list" });

  useEffect(() => {
    if (!request) return;
    if (request.kind === "new") setView({ kind: "compose", customerIds: null });
    else if (request.kind === "selected") setView({ kind: "compose", customerIds: request.customerIds });
    else setView({ kind: "detail", id: request.id });
    onRequestConsumed();
  }, [request, onRequestConsumed]);

  if (view.kind === "compose") {
    return (
      <CampaignComposer
        customerIds={view.customerIds}
        optOutFooter={optOutFooter}
        onBack={() => setView({ kind: "list" })}
        onCreated={(id) => setView({ kind: "detail", id })}
      />
    );
  }
  if (view.kind === "detail") {
    return (
      <CampaignDetail
        id={view.id}
        canManage={canManage}
        sendWindow={sendWindow}
        onBack={() => setView({ kind: "list" })}
      />
    );
  }
  return (
    <CampaignList
      canManage={canManage}
      onNew={() => setView({ kind: "compose", customerIds: null })}
      onOpen={(id) => setView({ kind: "detail", id })}
    />
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <Button type="button" size="sm" variant="ghost" onClick={onBack}>
        <ArrowLeft className="size-3.5" aria-hidden />
        All campaigns
      </Button>
    </div>
  );
}

function CampaignList({
  canManage,
  onNew,
  onOpen,
}: {
  canManage: boolean;
  onNew: () => void;
  onOpen: (id: string) => void;
}) {
  const [rows, setRows] = useState<SmsCampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSmsCampaigns({ size: 50 })
      .then((page) => {
        if (!cancelled) setRows(page.content ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err, "Could not load campaigns."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      <Panel
        title="Campaigns"
        description={loading ? "Loading…" : plural(rows.length, "campaign")}
        flush
      >
        {!loading && rows.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Send your first campaign"
            body="A campaign is one text to a group of customers who agreed to offers: a weekend price, new stock, a reminder that you are open."
            action={
              canManage ? (
                <Button type="button" variant="outline" onClick={onNew}>
                  <Plus className="size-4" aria-hidden />
                  New campaign
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem]">
              <thead>
                <tr className={SMS_ROW}>
                  <th className={SMS_TH}>Campaign</th>
                  <th className={SMS_TH}>Status</th>
                  <th className={cn(SMS_TH, "text-right")}>Sent</th>
                  <th className={cn(SMS_TH, "text-right")}>Credits</th>
                  <th className={SMS_TH}>When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    className={cn(SMS_ROW, SMS_ROW_HOVER, "cursor-pointer")}
                    onClick={() => onOpen(c.id)}
                  >
                    <td className={SMS_TD}>
                      <button
                        type="button"
                        className={cn("text-left font-medium hover:underline", SMS_INK)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(c.id);
                        }}
                      >
                        {c.name}
                      </button>
                      <span className={cn("mt-0.5 block max-w-[30rem] truncate text-[13px]", SMS_MUTED)}>
                        {c.body}
                      </span>
                    </td>
                    <td className={SMS_TD}>
                      <Chip tone={campaignTone(c.status)}>{CAMPAIGN_STATUS_LABEL[c.status]}</Chip>
                    </td>
                    <td className={cn(SMS_TD, "text-right font-mono tabular-nums")}>
                      {c.recipientsSent} / {c.recipientsTargeted}
                    </td>
                    <td className={cn(SMS_TD, "text-right font-mono tabular-nums")}>{c.creditsUsed}</td>
                    <td className={cn(SMS_TD, "whitespace-nowrap font-mono text-[12.5px]", SMS_MUTED)}>
                      {formatWhen(c.completedAt ?? c.scheduledAt ?? c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

type GroupKey = "recent" | "lapsed" | "spent" | "frequent" | "wholesale";

const GROUPS: Array<{ key: GroupKey; label: string; unit?: string; initial?: number }> = [
  { key: "recent", label: "Bought in the last … days", unit: "Days", initial: 30 },
  { key: "lapsed", label: "Has not bought for … days", unit: "Days", initial: 60 },
  { key: "spent", label: "Spent more than KES …", unit: "KES", initial: 5000 },
  { key: "frequent", label: "Bought more than … times", unit: "Times", initial: 5 },
  { key: "wholesale", label: "Wholesale buyers" },
];

/** ISO date `days` ago in Africa/Nairobi (UTC+3, no daylight saving). */
function nairobiDateDaysAgo(days: number): string {
  const ms = Date.now() + 3 * 3_600_000 - days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function groupFilter(key: GroupKey, n: number): CustomerEmailAudienceFilter {
  const one = (condition: NonNullable<CustomerEmailAudienceFilter["conditions"]>[number]) => ({
    matchMode: "ALL" as const,
    conditions: [condition],
  });
  switch (key) {
    case "recent":
      return one({ field: "last_purchase_date", op: "last_x_days", days: n });
    case "lapsed":
      return one({ field: "last_purchase_date", op: "before", value: nairobiDateDaysAgo(n) });
    case "spent":
      return one({ field: "total_purchase_amount", op: "gt", value: String(n) });
    case "frequent":
      return one({ field: "number_of_purchases", op: "gt", value: String(n) });
    default:
      return one({ field: "wholesale", op: "eq", value: "true" });
  }
}

function fillSample(body: string, shop: string): string {
  return body
    .trim()
    .split("{first_name}")
    .join("Wanjiku")
    .split("{name}")
    .join("Wanjiku Kamau")
    .split("{shop}")
    .join(shop);
}

/** The text as it lands on a customer's phone. */
function PhonePreview({ sender, text }: { sender: string; text: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[280px] rounded-[22px] border bg-[#EFEBE2] p-3",
        SMS_RULE,
      )}
      aria-label="Preview of the text on a phone"
    >
      <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[color-mix(in_srgb,var(--op-ink,#121a16)_18%,transparent)]" />
      <p className={cn("text-center text-[12px] font-medium", SMS_INK)}>{sender}</p>
      <p className={cn("mb-3 text-center font-mono text-[10.5px]", SMS_MUTED)}>Text message, now</p>
      <div className="min-h-[9rem]">
        <p
          className={cn(
            "max-w-[92%] whitespace-pre-wrap break-words rounded-[14px] rounded-bl-[3px] bg-[var(--op-surface,#FCFAF5)] px-3 py-2 text-[13.5px] leading-snug",
            SMS_INK,
          )}
        >
          {text || "Your message appears here."}
        </p>
      </div>
    </div>
  );
}

function CampaignComposer({
  customerIds,
  optOutFooter,
  onBack,
  onCreated,
}: {
  customerIds: string[] | null;
  optOutFooter: string;
  onBack: () => void;
  onCreated: (id: string) => void;
}) {
  const { business } = useDashboard();
  const shopName = business?.name?.trim() || "your shop";
  const hasSelection = customerIds !== null && customerIds.length > 0;
  const [name, setName] = useState("");
  const [body, setBody] = useState("Hi {first_name}, ");
  const [method, setMethod] = useState<SmsRecipientMethod>(hasSelection ? "specific" : "all_eligible");
  const [group, setGroup] = useState<GroupKey>("lapsed");
  const [groupValue, setGroupValue] = useState("60");
  const [preview, setPreview] = useState<SmsAudiencePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const { balance } = useSmsCreditBalance();

  const groupDef = GROUPS.find((g) => g.key === group) ?? GROUPS[0];
  const groupNumber = Math.max(1, Math.floor(Number(groupValue) || 0));

  const audience = useMemo(() => {
    if (method === "specific") return { recipientMethod: method, customerIds: customerIds ?? [] };
    if (method === "filtered") {
      return { recipientMethod: method, filter: groupFilter(group, groupNumber) };
    }
    return { recipientMethod: method };
  }, [method, customerIds, group, groupNumber]);

  useEffect(() => {
    let cancelled = false;
    setPreviewing(true);
    const t = window.setTimeout(() => {
      previewSmsAudience(audience)
        .then((res) => {
          if (!cancelled) {
            setPreview(res);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setPreview(null);
            setError(errorText(err, "Could not check this audience."));
          }
        })
        .finally(() => {
          if (!cancelled) setPreviewing(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [audience]);

  // Sized with a sample name: the real text swaps each customer's name in.
  const filled = fillSample(body, shopName);
  const sample = filled ? `${filled} ${optOutFooter}`.trim() : "";
  const size = smsSize(sample);
  const recipients = preview?.finalRecipients ?? 0;
  const credits = recipients * size.parts;
  const metered = Boolean(balance?.meteringEnabled);
  const short = metered && balance !== null && recipients > 0 && balance.available < credits;

  const insert = (token: string) => {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + token + body.slice(end));
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const nameMissing = name.trim().length === 0;
  const bodyMissing = body.trim().length === 0;

  const save = async () => {
    setTried(true);
    if (nameMissing || bodyMissing) return;
    if (recipients === 0) {
      setError("Nobody in this audience can be texted yet. Pick another group, or record who agreed to offers.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createSmsCampaign({
        name: name.trim(),
        body: body.trim(),
        ...audience,
      });
      onCreated(created.id);
    } catch (err) {
      setError(errorText(err, "Could not save this campaign."));
      setSaving(false);
    }
  };

  const audienceOptions: Array<{ value: SmsRecipientMethod; label: string; hint: string }> = [
    ...(hasSelection
      ? [
          {
            value: "specific" as const,
            label: `The ${plural(customerIds?.length ?? 0, "customer")} you selected`,
            hint: "Picked on the Contacts tab.",
          },
        ]
      : []),
    {
      value: "all_eligible",
      label: "Everyone who agreed to offers",
      hint: "Your whole opted-in list.",
    },
    { value: "filtered", label: "A group", hint: "By how they shop with you." },
  ];

  return (
    <div className="flex flex-col gap-3">
      <BackLink onBack={onBack} />
      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Panel title="Who gets it">
            <fieldset>
              <legend className="sr-only">Audience</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {audienceOptions.map((option) => {
                  const active = method === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-[2px] border px-3 py-2.5 transition-colors",
                        active
                          ? "border-[var(--op-accent,#1d4b3b)] bg-[color-mix(in_srgb,var(--op-accent,#1d4b3b)_5%,transparent)]"
                          : cn(SMS_RULE, "hover:border-[color-mix(in_srgb,var(--op-ink,#121a16)_28%,transparent)]"),
                      )}
                    >
                      <input
                        type="radio"
                        name="sms-audience"
                        className="mt-1 accent-[#1D4B3B]"
                        checked={active}
                        onChange={() => setMethod(option.value)}
                      />
                      <span>
                        <span className={cn("block text-sm font-medium", SMS_INK)}>{option.label}</span>
                        <span className={cn("block text-[12.5px]", SMS_MUTED)}>{option.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {method === "filtered" ? (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[14rem] flex-1 flex-col gap-1">
                    <span className={dashboardLabelClass()}>Group</span>
                    <select
                      className={dashboardSelectClass()}
                      value={group}
                      onChange={(e) => {
                        const next = e.target.value as GroupKey;
                        setGroup(next);
                        const def = GROUPS.find((g) => g.key === next);
                        if (def?.initial) setGroupValue(String(def.initial));
                      }}
                    >
                      {GROUPS.map((g) => (
                        <option key={g.key} value={g.key}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {groupDef.unit ? (
                    <label className="flex w-28 flex-col gap-1">
                      <span className={dashboardLabelClass()}>{groupDef.unit}</span>
                      <input
                        className={dashboardInputClass()}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={groupValue}
                        onChange={(e) => setGroupValue(e.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
            </fieldset>

            <div className={cn("mt-4 border-t pt-3 text-sm", SMS_RULE)} aria-live="polite">
              {previewing ? (
                <span className={cn("flex items-center gap-2", SMS_MUTED)}>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden /> Checking who this reaches…
                </span>
              ) : preview ? (
                <>
                  <p className={SMS_INK}>
                    <span className="font-mono font-medium tabular-nums">
                      {formatNumber(preview.finalRecipients)}
                    </span>{" "}
                    {preview.finalRecipients === 1 ? "customer" : "customers"} will get this text
                    {preview.automaticallyExcluded > 0 ? (
                      <span className={SMS_MUTED}>
                        ; {formatNumber(preview.automaticallyExcluded)} more match but will be left out
                      </span>
                    ) : null}
                    .
                  </p>
                  {preview.excludedSample.length > 0 ? (
                    <details className="mt-1.5">
                      <summary className={cn("cursor-pointer text-[13px]", SMS_MUTED)}>
                        Who is left out, and why
                      </summary>
                      <ul className={cn("mt-1.5 flex flex-col gap-0.5 text-[13px]", SMS_MUTED)}>
                        {preview.excludedSample.slice(0, 12).map((p) => (
                          <li key={p.customerId}>
                            {customerLabel(p.name).label}: {p.skipReason}
                          </li>
                        ))}
                        {preview.automaticallyExcluded > 12 ? (
                          <li>and {preview.automaticallyExcluded - 12} more</li>
                        ) : null}
                      </ul>
                    </details>
                  ) : null}
                </>
              ) : null}
            </div>
          </Panel>

          <Panel title="What it says">
            <label className="flex max-w-md flex-col gap-1">
              <span className={dashboardLabelClass()}>Campaign name</span>
              <input
                className={dashboardInputClass()}
                value={name}
                maxLength={255}
                placeholder="November bread offer"
                aria-invalid={tried && nameMissing}
                onChange={(e) => setName(e.target.value)}
              />
              {tried && nameMissing ? (
                <span className={cn("text-[13px]", SMS_WARN_TEXT)}>
                  Give the campaign a name so you can find it later.
                </span>
              ) : (
                <span className={cn("text-[12.5px]", SMS_MUTED)}>Only you see this.</span>
              )}
            </label>

            <label className="mt-4 flex flex-col gap-1">
              <span className={dashboardLabelClass()}>Message</span>
              <textarea
                ref={bodyRef}
                className={dashboardTextareaClass()}
                rows={4}
                maxLength={600}
                value={body}
                aria-invalid={tried && bodyMissing}
                onChange={(e) => setBody(e.target.value)}
              />
              {tried && bodyMissing ? (
                <span className={cn("text-[13px]", SMS_WARN_TEXT)}>Write the message first.</span>
              ) : null}
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={cn("text-[12.5px]", SMS_MUTED)}>Add the customer&rsquo;s</span>
              <Button type="button" size="xs" variant="outline" onClick={() => insert("{first_name}")}>
                first name
              </Button>
              <Button type="button" size="xs" variant="outline" onClick={() => insert("{name}")}>
                full name
              </Button>
              <span className={cn("text-[12.5px]", SMS_MUTED)}>or your</span>
              <Button type="button" size="xs" variant="outline" onClick={() => insert("{shop}")}>
                shop name
              </Button>
            </div>
            <div className="mt-4">
              <SegmentRuler units={size.units} parts={size.parts} encoding={size.encoding} />
              {size.encoding === "UNICODE" ? (
                <p className={cn("mt-1 text-[12.5px]", SMS_WARN_TEXT)}>
                  This text has emoji or special letters, so each credit holds 70 characters instead of
                  160.
                </p>
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-3">
          <Panel title="On their phone">
            <PhonePreview sender={shopName} text={sample} />
            <p className={cn("mt-3 text-[12.5px] leading-snug", SMS_MUTED)}>
              Shown for a customer called Wanjiku. &ldquo;{optOutFooter}&rdquo; is added to every offer.
            </p>
          </Panel>

          <Panel title="Cost">
            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className={SMS_MUTED}>Customers</dt>
                <dd className={cn("font-mono tabular-nums", SMS_INK)}>{formatNumber(recipients)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className={SMS_MUTED}>Credits each</dt>
                <dd className={cn("font-mono tabular-nums", SMS_INK)}>{size.parts}</dd>
              </div>
              <div className={cn("flex items-baseline justify-between gap-3 border-t pt-1.5", SMS_RULE)}>
                <dt className={cn("font-medium", SMS_INK)}>Total, about</dt>
                <dd className={cn("font-mono text-[18px] font-medium tabular-nums", short ? SMS_WARN_TEXT : SMS_INK)}>
                  {formatNumber(credits)}
                </dd>
              </div>
              {metered && balance ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className={SMS_MUTED}>You have</dt>
                  <dd className={cn("font-mono tabular-nums", SMS_MUTED)}>{formatNumber(balance.available)}</dd>
                </div>
              ) : null}
            </dl>
            {short ? (
              <p className={cn("mt-2 text-[13px] leading-snug", SMS_WARN_TEXT)}>
                Not enough credits for this audience. Top up from the SMS balance at the top of the page,
                or pick a smaller group.
              </p>
            ) : null}
            <Button
              type="button"
              className="mt-4 w-full rounded-[2px]"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Save and review
            </Button>
            <p className={cn("mt-2 text-center text-[12.5px]", SMS_MUTED)}>
              Nothing is sent yet. You choose when next.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function CampaignDetail({
  id,
  canManage,
  sendWindow,
  onBack,
}: {
  id: string;
  canManage: boolean;
  sendWindow: string;
  onBack: () => void;
}) {
  const { business } = useDashboard();
  const [campaign, setCampaign] = useState<SmsCampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [when, setWhen] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = useCallback(async () => {
    try {
      setCampaign(await fetchSmsCampaign(id));
    } catch (err) {
      setError(errorText(err, "Could not load this campaign."));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const live = campaign?.status === "QUEUED" || campaign?.status === "RUNNING";
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(t);
  }, [live, load]);

  const act = async (fn: () => Promise<SmsCampaignDetail>) => {
    setBusy(true);
    setError(null);
    try {
      setCampaign(await fn());
      setConfirmCancel(false);
    } catch (err) {
      setError(errorText(err, "That did not work. Try again."));
    } finally {
      setBusy(false);
    }
  };

  if (!campaign) {
    return (
      <div className="flex flex-col gap-3">
        <BackLink onBack={onBack} />
        {error ? (
          <DashboardFeedback kind="error" text={error} />
        ) : (
          <p className={cn("flex items-center gap-2 px-1 py-6 text-sm", SMS_MUTED)}>
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading campaign…
          </p>
        )}
      </div>
    );
  }

  const needsPhrase = campaign.recipientMethod === "all_eligible";
  const phraseOk = !needsPhrase || confirm.trim() === "SEND";
  const isDraft = campaign.status === "DRAFT";
  const waiting = isDraft || campaign.status === "SCHEDULED";
  const canCancel = waiting || campaign.status === "QUEUED" || campaign.status === "RUNNING";
  const started = !waiting && campaign.status !== "CANCELLED";
  const reachable = campaign.recipientsSent + campaign.recipientsPending + campaign.recipientsFailed;
  const progress = reachable > 0 ? Math.round((campaign.recipientsSent / reachable) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <BackLink onBack={onBack} />
      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Panel
            title={campaign.name}
            description={
              campaign.status === "SCHEDULED" && campaign.scheduledAt
                ? `Goes out ${formatWhen(campaign.scheduledAt)}`
                : campaign.completedAt
                  ? `Finished ${formatWhen(campaign.completedAt)}`
                  : `Created ${formatWhen(campaign.createdAt)}`
            }
            aside={<Chip tone={campaignTone(campaign.status)}>{CAMPAIGN_STATUS_LABEL[campaign.status]}</Chip>}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Figure
                label={waiting ? "Will get it" : "Still to send"}
                value={formatNumber(campaign.recipientsPending)}
              />
              <Figure label="Sent" value={formatNumber(campaign.recipientsSent)} />
              <Figure label="Left out" value={formatNumber(campaign.recipientsSkipped)} />
              <Figure
                label="Failed"
                value={formatNumber(campaign.recipientsFailed)}
                tone={campaign.recipientsFailed > 0 ? "warn" : undefined}
              />
            </div>
            {started ? (
              <div className="mt-4">
                <div
                  className="h-1.5 w-full overflow-hidden rounded-[1px] bg-[color-mix(in_srgb,var(--op-ink,#121a16)_9%,transparent)]"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  aria-label="Share of this campaign sent"
                >
                  <div className="h-full bg-[#1D4B3B] transition-[width] duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className={cn("mt-1.5 text-[12.5px]", SMS_MUTED)}>
                  <span className="font-mono tabular-nums">{progress}%</span> sent,{" "}
                  <span className="font-mono tabular-nums">{formatNumber(campaign.creditsUsed)}</span> credits
                  used
                  {campaign.boughtWithin48Hours !== null
                    ? `. ${plural(campaign.boughtWithin48Hours, "customer")} bought within 48 hours.`
                    : "."}
                </p>
              </div>
            ) : (
              <p className={cn("mt-4 text-[13px]", SMS_MUTED)}>
                Needs about{" "}
                <span className={cn("font-mono tabular-nums", SMS_INK)}>
                  {formatNumber(campaign.estimatedCredits)}
                </span>{" "}
                credits.
              </p>
            )}
          </Panel>

          {canManage && isDraft ? (
            <Panel title="Send" description={`Offers go out ${sendWindow}. A later time moves to the next morning.`}>
              {needsPhrase ? (
                <label className="mb-4 flex max-w-sm flex-col gap-1">
                  <span className={dashboardLabelClass()}>
                    This goes to everyone who agreed to offers. Type SEND to confirm.
                  </span>
                  <input
                    className={dashboardInputClass()}
                    value={confirm}
                    autoComplete="off"
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>
              ) : null}
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <Button
                  type="button"
                  className="rounded-[2px]"
                  disabled={busy || !phraseOk || campaign.recipientsPending === 0}
                  onClick={() => void act(() => sendSmsCampaign(campaign.id, confirm.trim() || undefined))}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  Send now to {plural(campaign.recipientsPending, "customer")}
                </Button>
                <div className="flex items-end gap-2">
                  <label className="flex flex-col gap-1">
                    <span className={dashboardLabelClass()}>Or send later</span>
                    <input
                      className={dashboardInputClass()}
                      type="datetime-local"
                      value={when}
                      onChange={(e) => setWhen(e.target.value)}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || !phraseOk || !when || campaign.recipientsPending === 0}
                    onClick={() => {
                      const at = new Date(when);
                      if (Number.isNaN(at.getTime())) {
                        setError("Choose a date and time.");
                        return;
                      }
                      void act(() => scheduleSmsCampaign(campaign.id, at.toISOString(), confirm.trim() || undefined));
                    }}
                  >
                    Schedule
                  </Button>
                </div>
              </div>
              {campaign.recipientsPending === 0 ? (
                <p className={cn("mt-3 text-[13px]", SMS_WARN_TEXT)}>
                  Nobody in this campaign can be texted. Record who agreed to offers on the Contacts tab,
                  then start a new campaign.
                </p>
              ) : null}
            </Panel>
          ) : null}

          <Panel
            title="Customers"
            description={
              campaign.recipientsTargeted > campaign.recipients.length
                ? `First ${campaign.recipients.length} of ${campaign.recipientsTargeted}`
                : plural(campaign.recipients.length, "customer")
            }
            flush
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem]">
                <thead>
                  <tr className={SMS_ROW}>
                    <th className={SMS_TH}>Customer</th>
                    <th className={SMS_TH}>Number</th>
                    <th className={SMS_TH}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.recipients.map((r) => (
                    <tr key={r.id} className={SMS_ROW}>
                      <td className={SMS_TD}>{customerLabel(r.customerName).label}</td>
                      <td className={cn(SMS_TD, "font-mono text-[13px] tabular-nums")}>
                        {r.phone ? `+${r.phone}` : "—"}
                      </td>
                      <td className={SMS_TD}>
                        {r.status === "SENT" ? (
                          <Chip tone="good">Sent {formatWhen(r.sentAt)}</Chip>
                        ) : r.status === "SKIPPED" ? (
                          <Chip tone="quiet">Left out: {r.skipReason ?? "not eligible"}</Chip>
                        ) : r.status === "FAILED" ? (
                          <Chip tone="warn">Failed: {r.error ?? "could not send"}</Chip>
                        ) : r.status === "SENDING" ? (
                          <Chip tone="live">Sending</Chip>
                        ) : (
                          <Chip tone="quiet">Waiting</Chip>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {started ? <SmsHubActivity campaignId={campaign.id} /> : null}
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-3">
          <Panel title="On their phone">
            <PhonePreview sender={business?.name?.trim() || "Your shop"} text={campaign.text} />
            <p className={cn("mt-3 text-[12.5px]", SMS_MUTED)}>
              Shown with a sample name. {plural(campaign.partsPerMessage, "credit")} per customer.
            </p>
          </Panel>
          {canManage && canCancel ? (
            <Panel>
              {confirmCancel ? (
                <div className="flex flex-col gap-2">
                  <p className={cn("text-sm", SMS_INK)}>
                    {campaign.status === "RUNNING"
                      ? "Stop sending? Texts already sent cannot be recalled."
                      : "Cancel this campaign? Nothing will be sent."}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => void act(() => cancelSmsCampaign(campaign.id))}
                    >
                      Cancel campaign
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setConfirmCancel(false)}
                    >
                      Keep it
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  disabled={busy}
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancel campaign
                </Button>
              )}
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
