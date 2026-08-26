"use client";

import { Check, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLATFORM_DOMAIN } from "@/lib/config";
import type { SaEmailPreview, SaEmailRecipientRow } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import { CampaignChip } from "./campaigns-overview";
import {
  FILTERS,
  INTENTS,
  VARIABLES,
  type IntentId,
  estimateAudience,
  personalize,
} from "./campaigns-model";

const fieldClass =
  "w-full rounded-lg border border-border/80 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15";

export function CampaignsComposer({
  pickingIntent,
  onPickIntent,
  name,
  onName,
  copiedFrom,
  subject,
  onSubject,
  previewText,
  onPreviewText,
  body,
  onBody,
  cta,
  onCta,
  filters,
  onToggleFilter,
  liveAudience,
  recipients,
  directoryRecipients,
  selectedUserIds: selectedUserIdsProp,
  onToggleUser,
  personQuery = "",
  onPersonQuery,
  tab,
  onTab,
  device,
  onDevice,
  merchantId,
  onMerchant,
  preview,
  onPreview,
  onSend,
  busy,
  sendMode,
  onSendMode,
  scheduleAt,
  onScheduleAt,
  ab,
  onAb,
}: {
  pickingIntent: boolean;
  onPickIntent: (id: IntentId) => void;
  name: string;
  onName: (v: string) => void;
  copiedFrom: string | null;
  subject: string;
  onSubject: (v: string) => void;
  previewText: string;
  onPreviewText: (v: string) => void;
  body: string;
  onBody: (v: string) => void;
  cta: string;
  onCta: (v: string) => void;
  filters: string[];
  onToggleFilter: (id: string) => void;
  liveAudience: number | null;
  recipients: SaEmailRecipientRow[];
  /** Searchable pool for individual audience mode. */
  directoryRecipients?: SaEmailRecipientRow[];
  selectedUserIds?: string[];
  onToggleUser?: (userId: string) => void;
  personQuery?: string;
  onPersonQuery?: (v: string) => void;
  tab: "write" | "design" | "preview";
  onTab: (t: "write" | "design" | "preview") => void;
  device: "desktop" | "mobile";
  onDevice: (d: "desktop" | "mobile") => void;
  merchantId: string;
  onMerchant: (id: string) => void;
  preview: SaEmailPreview | null;
  onPreview: () => void;
  onSend: () => void;
  busy: boolean;
  sendMode: "now" | "schedule" | "smart";
  onSendMode: (m: "now" | "schedule" | "smart") => void;
  scheduleAt: string;
  onScheduleAt: (v: string) => void;
  ab: { on: boolean; a: string; b: string };
  onAb: (v: { on: boolean; a: string; b: string }) => void;
}) {
  if (pickingIntent) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <h1 className="text-xl font-semibold tracking-tight">What are you trying to achieve?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick an outcome. Kiosk will suggest the audience and a first draft.
        </p>
        <div className="mt-6 divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-white">
          {INTENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPickIntent(item.id)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-[#F7F7F5]"
            >
              <span>
                <span className="block text-sm font-medium">{item.title}</span>
                <span className="text-sm text-muted-foreground">{item.body}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const audience = estimateAudience(liveAudience);
  const activeFilter = FILTERS.find((f) => filters.includes(f.id)) ?? null;
  const isIndividual = activeFilter?.id === "individual";
  const selectedUserIds = selectedUserIdsProp ?? [];
  const directory = directoryRecipients ?? recipients;
  const selectedPeople = directory.filter((r) =>
    selectedUserIds.includes(r.userId),
  );
  const merchant =
    (isIndividual
      ? selectedPeople.find((r) => r.userId === merchantId) ??
        selectedPeople[0]
      : recipients.find((r) => r.userId === merchantId) ?? recipients[0]) ??
    null;
  const rendered = personalize(body, merchant);
  const fromLabel = `Kiosk · hello@${PLATFORM_DOMAIN}`;

  return (
    <div className="mx-auto max-w-[860px] space-y-6 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            className="w-full bg-transparent text-lg font-semibold tracking-tight outline-none"
          />
          {copiedFrom ? (
            <p className="text-xs text-muted-foreground">Copied from: {copiedFrom}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onPreview}>
            Preview
          </Button>
          <Button type="button" size="sm" disabled={busy} onClick={onSend}>
            {busy ? "Working…" : "Send"}
          </Button>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold">Who should receive this?</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pick one audience. Live counts come from the recipient API.
        </p>
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Audience
          </p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Campaign audience">
            {FILTERS.map((f) => (
              <CampaignChip
                key={f.id}
                active={filters.includes(f.id)}
                onClick={() => onToggleFilter(f.id)}
              >
                {f.label}
              </CampaignChip>
            ))}
          </div>
          {activeFilter ? (
            <p className="mt-2 text-xs text-muted-foreground">{activeFilter.hint}</p>
          ) : null}
        </div>

        {isIndividual ? (
          <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-[#F7F7F5] p-3">
            <p className="text-xs font-medium text-foreground">
              Select recipients
            </p>
            <input
              value={personQuery}
              onChange={(e) => onPersonQuery?.(e.target.value)}
              placeholder="Search name, email, or business…"
              className={fieldClass}
              aria-label="Search people to include"
            />
            <ul className="max-h-48 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border/70 bg-white">
              {directory.length === 0 ? (
                <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No matching people. Try another search.
                </li>
              ) : (
                directory.slice(0, 40).map((r) => {
                  const on = selectedUserIds.includes(r.userId);
                  return (
                    <li key={r.userId}>
                      <button
                        type="button"
                        onClick={() => onToggleUser?.(r.userId)}
                        className={cn(
                          "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40",
                          on && "bg-emerald-50/80",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                            on
                              ? "border-emerald-700 bg-emerald-700 text-white"
                              : "border-border",
                          )}
                          aria-hidden
                        >
                          {on ? <Check className="size-3" /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {r.businessName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {r.name} · {r.email || "no email"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            {selectedUserIds.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {selectedUserIds.length.toLocaleString()} selected
                {selectedUserIds.length === 1 && selectedPeople[0]
                  ? ` · ${selectedPeople[0].name || selectedPeople[0].email}`
                  : ""}
              </p>
            ) : (
              <p className="text-xs text-amber-800">
                Select at least one person before preview or send.
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2">
          <MiniStat
            label="Audience"
            value={
              isIndividual
                ? selectedUserIds.length.toLocaleString()
                : audience.merchants.toLocaleString()
            }
            hint={
              isIndividual
                ? "Selected people"
                : audience.modeled
                  ? "Loading live count…"
                  : "Live"
            }
          />
          <MiniStat
            label="Loaded rows"
            value={(isIndividual ? selectedPeople.length || directory.length : recipients.length).toLocaleString()}
          />
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-3">
          Save audience
        </Button>
        {!isIndividual && recipients.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Live sample: {recipients[0]?.businessName} · {recipients[0]?.email}
            {recipients.length > 1 ? ` · +${recipients.length - 1} loaded` : ""}
          </p>
        ) : null}
      </section>

      <section>
        <div className="flex items-center gap-1 border-b border-border/70">
          {(["write", "design", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTab(t)}
              className={cn(
                "px-3 py-2 text-sm capitalize",
                tab === t
                  ? "border-b-2 border-emerald-700 font-medium"
                  : "text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "write" ? (
          <div className="mt-4 space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Subject</span>
              <input value={subject} onChange={(e) => onSubject(e.target.value)} className={fieldClass} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Preview text</span>
              <input
                value={previewText}
                onChange={(e) => onPreviewText(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Button</span>
              <input value={cta} onChange={(e) => onCta(e.target.value)} className={fieldClass} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium">Email</span>
              <textarea
                value={body}
                onChange={(e) => onBody(e.target.value)}
                rows={12}
                className={cn(fieldClass, "font-mono text-[13px] leading-relaxed")}
              />
            </label>
            <div className="flex flex-wrap gap-1">
              {VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="rounded-md border border-border/80 px-1.5 py-0.5 font-mono text-[11px] hover:bg-muted"
                  onClick={() => onBody(`${body}{{${v}}}`)}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={ab.on}
                onChange={(e) => onAb({ ...ab, on: e.target.checked })}
                className="mt-0.5"
              />
              A/B test subject lines — winner goes to the remaining audience.
            </label>
            {ab.on ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={ab.a}
                  onChange={(e) => onAb({ ...ab, a: e.target.value })}
                  className={fieldClass}
                  aria-label="Subject A"
                />
                <input
                  value={ab.b}
                  onChange={(e) => onAb({ ...ab, b: e.target.value })}
                  className={fieldClass}
                  aria-label="Subject B"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "design" ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              "Heading",
              "Paragraph",
              "Button",
              "Image",
              "Divider",
              "Feature list",
              "Product",
              "Announcement",
              "Testimonial",
              "Footer",
            ].map((b) => (
              <button
                key={b}
                type="button"
                className="rounded-lg border border-border/80 px-3 py-2 text-left text-sm hover:bg-[#F7F7F5]"
                onClick={() => onBody(`${body}\n\n[${b}]`)}
              >
                {b}
              </button>
            ))}
          </div>
        ) : null}

        {tab === "preview" ? (
          <PreviewBlock
            device={device}
            onDevice={onDevice}
            merchant={merchant}
            recipients={recipients}
            merchantId={merchant?.userId ?? ""}
            onMerchant={onMerchant}
            previewText={previewText}
            subject={subject}
            rendered={rendered}
            extra=""
            cta={cta}
            preview={preview}
          />
        ) : null}
      </section>

      <section className="rounded-xl border border-border/70 bg-white p-4">
        <h2 className="text-sm font-semibold">Send campaign</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Audience</dt>
            <dd className="font-medium">
              {isIndividual
                ? `${selectedUserIds.length.toLocaleString()} ${selectedUserIds.length === 1 ? "person" : "people"}`
                : `${audience.merchants.toLocaleString()} merchants`}
              {activeFilter ? ` · ${activeFilter.label}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">From</dt>
            <dd className="font-medium">{fromLabel}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Subject</dt>
            <dd className="font-medium">{subject}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <CampaignChip active={sendMode === "now"} onClick={() => onSendMode("now")}>
            Send now
          </CampaignChip>
          <CampaignChip active={sendMode === "schedule"} onClick={() => onSendMode("schedule")}>
            Schedule
          </CampaignChip>
          <CampaignChip active={sendMode === "smart"} onClick={() => onSendMode("smart")}>
            Smart send
          </CampaignChip>
        </div>
        {sendMode === "smart" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Sends immediately through the campaign API. Schedule a time if you need a later send.
          </p>
        ) : null}
        {sendMode === "schedule" ? (
          <input
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => onScheduleAt(e.target.value)}
            className={cn(fieldClass, "mt-2 max-w-xs")}
          />
        ) : null}
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {[
            subject.trim() ? "Subject added" : "Add a subject",
            `${audience.merchants.toLocaleString()} live recipients`,
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="size-3.5 text-emerald-700" />
              {item}
            </li>
          ))}
        </ul>
        <Button type="button" className="mt-4" disabled={busy} onClick={onSend}>
          Ready to send · {audience.merchants.toLocaleString()} emails
        </Button>
      </section>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-white px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function PreviewBlock({
  device,
  onDevice,
  merchant,
  recipients,
  merchantId,
  onMerchant,
  previewText,
  subject,
  rendered,
  extra,
  cta,
  preview,
}: {
  device: "desktop" | "mobile";
  onDevice: (d: "desktop" | "mobile") => void;
  merchant: SaEmailRecipientRow | null;
  recipients: SaEmailRecipientRow[];
  merchantId: string;
  onMerchant: (id: string) => void;
  previewText: string;
  subject: string;
  rendered: string;
  extra: string;
  cta: string;
  preview: SaEmailPreview | null;
}) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <CampaignChip active={device === "desktop"} onClick={() => onDevice("desktop")}>
          Desktop
        </CampaignChip>
        <CampaignChip active={device === "mobile"} onClick={() => onDevice("mobile")}>
          Mobile
        </CampaignChip>
        <label className="ml-auto text-xs text-muted-foreground">
          Preview as{" "}
          <select
            value={merchantId}
            onChange={(e) => onMerchant(e.target.value)}
            className="ml-1 rounded-md border border-border bg-white px-2 py-1 text-foreground"
          >
            {recipients.length === 0 ? (
              <option value="">No live recipients</option>
            ) : (
              recipients.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name || m.email} — {m.businessName}
                </option>
              ))
            )}
          </select>
        </label>
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border/80 bg-white p-5 shadow-sm",
          device === "mobile" && "mx-auto max-w-[360px]",
        )}
      >
        <p className="text-xs text-muted-foreground">{previewText}</p>
        <h3 className="mt-2 text-base font-semibold">{personalize(subject, merchant)}</h3>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
          {rendered}
          {extra ? `\n${extra}` : ""}
        </pre>
        <div className="mt-4">
          <span className="inline-flex rounded-md bg-emerald-700 px-3 py-1.5 text-sm text-white">
            {cta}
          </span>
        </div>
      </div>
      {preview ? (
        <iframe title="Rendered email" className="h-[420px] w-full rounded-xl border" srcDoc={preview.html} />
      ) : null}
    </div>
  );
}
