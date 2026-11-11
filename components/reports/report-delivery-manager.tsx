"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  CalendarClock,
  Check,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  Smartphone,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { FormDrawer } from "@/components/form-drawer";
import {
  createReportSubscription,
  deleteReportSubscription,
  fetchReportSubscriptions,
  sendReportSubscriptionNow,
  updateReportSubscription,
  type ReportChannel,
  type ReportFrequency,
  type ReportKey,
  type ReportSubscription,
  type ReportSubscriptionInput,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  reportBtn,
  reportBtnGhost,
  reportBtnPrimary,
  reportChip,
  reportDivide,
  reportFaint,
  reportHairline,
  reportMono,
  reportMuted,
} from "./report-ui";

const REPORTS: { key: ReportKey; label: string }[] = [
  { key: "sales_by_category", label: "Sales by category" },
  { key: "supplier_spend", label: "Supplier spend" },
  { key: "inventory_valuation", label: "Inventory valuation" },
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CHANNELS: { id: ReportChannel; label: string; Icon: typeof Mail }[] = [
  { id: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { id: "sms", label: "SMS", Icon: Smartphone },
  { id: "email", label: "Email", Icon: Mail },
];
const ACCENT = "var(--hub-accent,#1D4B3B)";

type Draft = ReportSubscriptionInput & { id?: string };

const BLANK: Draft = {
  reportKey: "sales_by_category",
  frequency: "weekly",
  sendTime: "07:00",
  dayOfWeek: 1,
  dayOfMonth: 1,
  channels: ["whatsapp"],
  recipientEmail: "",
  active: true,
};

const reportLabel = (key: string) =>
  REPORTS.find((r) => r.key === key)?.label ?? key;

function cadence(s: ReportSubscription) {
  if (s.frequency === "daily") return `Daily · ${s.sendTime}`;
  if (s.frequency === "weekly")
    return `Weekly · ${WEEKDAYS[(s.dayOfWeek ?? 1) - 1]} · ${s.sendTime}`;
  return `Monthly · day ${s.dayOfMonth ?? 1} · ${s.sendTime}`;
}

export function ReportDeliveryManager({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<ReportSubscription[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSubs(await fetchReportSubscriptions());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load deliveries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
    if (!open) setDraft(null);
  }, [open, load]);

  const toggleChannel = (c: ReportChannel) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            channels: d.channels.includes(c)
              ? d.channels.filter((x) => x !== c)
              : [...d.channels, c],
          }
        : d,
    );

  const save = async () => {
    if (!draft) return;
    if (draft.channels.length === 0) {
      toast.error("Pick at least one channel.");
      return;
    }
    if (draft.channels.includes("email") && !draft.recipientEmail?.trim()) {
      toast.error("Add a recipient email for the Email channel.");
      return;
    }
    setSaving(true);
    try {
      const payload: ReportSubscriptionInput = {
        reportKey: draft.reportKey,
        frequency: draft.frequency,
        sendTime: draft.sendTime,
        dayOfWeek: draft.frequency === "weekly" ? draft.dayOfWeek ?? 1 : null,
        dayOfMonth: draft.frequency === "monthly" ? draft.dayOfMonth ?? 1 : null,
        channels: draft.channels,
        recipientEmail: draft.recipientEmail?.trim() || null,
        active: draft.active ?? true,
      };
      if (draft.id) await updateReportSubscription(draft.id, payload);
      else await createReportSubscription(payload);
      toast.success(draft.id ? "Delivery updated." : "Delivery scheduled.");
      setDraft(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: ReportSubscription) => {
    setBusyId(s.id);
    try {
      await deleteReportSubscription(s.id);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (s: ReportSubscription) => {
    setBusyId(s.id);
    try {
      await updateReportSubscription(s.id, {
        reportKey: s.reportKey,
        frequency: s.frequency,
        sendTime: s.sendTime,
        dayOfWeek: s.dayOfWeek,
        dayOfMonth: s.dayOfMonth,
        channels: s.channels,
        recipientEmail: s.recipientEmail,
        active: !s.active,
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusyId(null);
    }
  };

  const sendNow = async (s: ReportSubscription) => {
    setBusyId(s.id);
    try {
      const r = await sendReportSubscriptionNow(s.id);
      if (r.sent.length > 0) toast.success(`Sent via ${r.sent.join(", ")}.`);
      else toast.error(r.failed.join("; ") || "Nothing sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setBusyId(null);
    }
  };

  const footer = draft ? (
    <div className="flex items-center justify-end gap-2">
      <button type="button" onClick={() => setDraft(null)} className={reportBtnGhost}>
        Cancel
      </button>
      <button type="button" onClick={() => void save()} disabled={saving} className={reportBtnPrimary}>
        <Check className="size-4" aria-hidden />
        {saving ? "Saving" : draft.id ? "Update delivery" : "Schedule delivery"}
      </button>
    </div>
  ) : (
    <button type="button" onClick={() => setDraft({ ...BLANK })} className={cn(reportBtnPrimary, "w-full")}>
      <Plus className="size-4" aria-hidden />
      New delivery
    </button>
  );

  return (
    <div className={className}>
      <button type="button" onClick={() => setOpen(true)} className={reportBtnGhost}>
        <CalendarClock className="size-3.5" aria-hidden />
        Schedule delivery
      </button>

      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="Report delivery"
        description="Send a report summary on a schedule — WhatsApp, SMS or email."
        icon={<CalendarClock className="size-4" aria-hidden />}
        appearance="sharp"
        footer={footer}
      >
        {draft ? (
          <DeliveryForm draft={draft} setDraft={setDraft} toggleChannel={toggleChannel} />
        ) : loading ? (
          <p className={cn("py-6 text-center text-[12px]", reportMuted)}>Loading…</p>
        ) : subs.length === 0 ? (
          <div className={cn("border px-5 py-10 text-center", reportHairline)}>
            <CalendarClock
              className={cn("mx-auto size-6", reportFaint)}
              aria-hidden
            />
            <p className="mt-3 text-[13px] font-semibold text-[var(--order-ink,#15231f)]">
              No scheduled deliveries
            </p>
            <p className={cn("mt-1 text-[12px]", reportMuted)}>
              Set one up and a summary arrives on your schedule.
            </p>
          </div>
        ) : (
          <ul className={cn("divide-y", reportDivide)}>
            {subs.map((s) => (
              <li key={s.id} className="py-3.5 first:pt-0">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--order-ink,#15231f)]">
                        {reportLabel(s.reportKey)}
                      </span>
                      {!s.active ? (
                        <span className={cn(reportChip, reportMuted)}>Paused</span>
                      ) : null}
                    </div>
                    <div className={cn("mt-0.5 text-[11px]", reportMono, reportMuted)}>
                      {cadence(s)}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {s.channels.map((c) => {
                        const meta = CHANNELS.find((x) => x.id === c);
                        if (!meta) return null;
                        const Icon = meta.Icon;
                        return (
                          <span
                            key={c}
                            className={cn(reportChip)}
                            style={{
                              color: ACCENT,
                              backgroundColor:
                                "color-mix(in srgb, var(--hub-accent,#1D4B3B) 8%, white)",
                            }}
                          >
                            <Icon className="size-3" aria-hidden />
                            {meta.label}
                          </span>
                        );
                      })}
                      {s.recipientEmail ? (
                        <span className={cn("text-[10px]", reportFaint)}>
                          {s.recipientEmail}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Switch
                    checked={s.active}
                    disabled={busyId === s.id}
                    onChange={() => void toggleActive(s)}
                  />
                </div>
                <div className="mt-2.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void sendNow(s)}
                    disabled={busyId === s.id}
                    className={reportBtn}
                  >
                    <Send className="size-3" aria-hidden /> Send now
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        id: s.id,
                        reportKey: s.reportKey,
                        frequency: s.frequency,
                        sendTime: s.sendTime,
                        dayOfWeek: s.dayOfWeek ?? 1,
                        dayOfMonth: s.dayOfMonth ?? 1,
                        channels: s.channels,
                        recipientEmail: s.recipientEmail ?? "",
                        active: s.active,
                      })
                    }
                    className={reportBtn}
                  >
                    <Pencil className="size-3" aria-hidden /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(s)}
                    disabled={busyId === s.id}
                    className={cn(
                      reportBtn,
                      "ml-auto border-[color-mix(in_srgb,#A55237_35%,transparent)] text-[#A55237] hover:border-[#A55237] hover:text-[#A55237]",
                    )}
                  >
                    <Trash2 className="size-3" aria-hidden /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </FormDrawer>
    </div>
  );
}

function Switch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "On" : "Off"}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50",
        checked
          ? "border-[var(--hub-accent,#1D4B3B)] bg-[var(--hub-accent,#1D4B3B)]"
          : cn("bg-white", reportHairline),
      )}
    >
      <span
        className={cn(
          "inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

function DeliveryForm({
  draft,
  setDraft,
  toggleChannel,
}: {
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft | null>>;
  toggleChannel: (c: ReportChannel) => void;
}) {
  const set = (patch: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));
  const label = cn(
    "text-[10px] font-semibold uppercase tracking-[0.06em]",
    reportMono,
    reportMuted,
  );
  const field =
    "h-9 w-full rounded-[2px] border bg-white px-2.5 text-[13px] text-[var(--order-ink,#15231f)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]";
  const seg = (on: boolean) =>
    cn(
      "h-8 rounded-[2px] px-3 text-[12px] font-semibold capitalize transition-colors",
      on
        ? "bg-[var(--hub-accent,#1D4B3B)] text-white"
        : cn("text-[var(--order-ink,#15231f)]", reportMuted),
    );
  const pill = (on: boolean) =>
    cn(
      "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-semibold transition-colors",
      on
        ? "border-[var(--hub-accent,#1D4B3B)] bg-[color-mix(in_srgb,var(--hub-accent,#1D4B3B)_10%,white)] text-[var(--hub-accent,#1D4B3B)]"
        : cn("bg-white text-[var(--order-ink,#15231f)]", reportHairline, reportMuted),
    );

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className={label}>Report</div>
        <select
          value={draft.reportKey}
          onChange={(e) => set({ reportKey: e.target.value as ReportKey })}
          className={cn(field, reportHairline)}
        >
          {REPORTS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <div className={label}>How often</div>
        <div className={cn("inline-flex rounded-[2px] border p-0.5", reportHairline)}>
          {(["daily", "weekly", "monthly"] as ReportFrequency[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => set({ frequency: f })}
              className={seg(draft.frequency === f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {draft.frequency === "weekly" ? (
        <div className="space-y-1.5">
          <div className={label}>Day of week</div>
          <div className="flex flex-wrap gap-1">
            {WEEKDAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => set({ dayOfWeek: i + 1 })}
                className={pill(draft.dayOfWeek === i + 1)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {draft.frequency === "monthly" ? (
        <div className="space-y-1.5">
          <div className={label}>Day of month</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={28}
              value={draft.dayOfMonth ?? 1}
              onChange={(e) =>
                set({
                  dayOfMonth: Math.min(28, Math.max(1, Number(e.target.value) || 1)),
                })
              }
              className={cn(field, reportHairline, reportMono, "w-24")}
            />
            <span className={cn("text-[11px]", reportMuted)}>1–28</span>
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <div className={label}>Send time</div>
        <input
          type="time"
          value={draft.sendTime ?? "07:00"}
          onChange={(e) => set({ sendTime: e.target.value || "07:00" })}
          className={cn(field, reportHairline, reportMono, "w-32")}
        />
      </div>

      <div className="space-y-1.5">
        <div className={label}>Channels</div>
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map(({ id, label: cl, Icon }) => {
            const on = draft.channels.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleChannel(id)}
                className={pill(on)}
              >
                <Icon className="size-3.5" aria-hidden />
                {cl}
                {on ? <Check className="size-3" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {draft.channels.includes("email") ? (
        <div className="space-y-1.5">
          <div className={label}>Recipient email</div>
          <input
            type="email"
            value={draft.recipientEmail ?? ""}
            onChange={(e) => set({ recipientEmail: e.target.value })}
            placeholder="owner@example.com"
            className={cn(field, reportHairline)}
          />
        </div>
      ) : null}
    </div>
  );
}
