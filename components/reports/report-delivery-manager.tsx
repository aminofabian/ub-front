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
  X,
} from "lucide-react";
import { toast } from "sonner";

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

function reportLabel(key: string) {
  return REPORTS.find((r) => r.key === key)?.label ?? key;
}

function cadence(s: ReportSubscription) {
  if (s.frequency === "daily") return `Daily at ${s.sendTime}`;
  if (s.frequency === "weekly")
    return `Weekly on ${WEEKDAYS[(s.dayOfWeek ?? 1) - 1]} at ${s.sendTime}`;
  return `Monthly on day ${s.dayOfMonth ?? 1} at ${s.sendTime}`;
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
  }, [open, load]);

  const toggleChannel = (c: ReportChannel) => {
    setDraft((d) => {
      if (!d) return d;
      const has = d.channels.includes(c);
      const channels = has
        ? d.channels.filter((x) => x !== c)
        : [...d.channels, c];
      return { ...d, channels };
    });
  };

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
      if (r.sent.length > 0)
        toast.success(`Sent now via ${r.sent.join(", ")}.`);
      else toast.error(r.failed.join("; ") || "Nothing sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setBusyId(null);
    }
  };

  const chip =
    "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-semibold transition-colors";

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border bg-white px-3 text-[12px] font-semibold"
      >
        <CalendarClock className="size-3.5" aria-hidden />
        Schedule delivery
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-[#1E3B26] to-[#2F5233] px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4" aria-hidden />
                <div>
                  <div className="text-sm font-bold leading-tight">Report delivery</div>
                  <div className="text-[11px] text-white/70">
                    Auto-send a summary by WhatsApp, SMS or email
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setDraft(null);
                }}
                className="rounded-lg p-1 hover:bg-white/10"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {draft ? (
                <DeliveryForm
                  draft={draft}
                  setDraft={setDraft}
                  saving={saving}
                  onSave={save}
                  onCancel={() => setDraft(null)}
                  toggleChannel={toggleChannel}
                  chip={chip}
                />
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...BLANK })}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#2F5233]/40 bg-[#F4F6F2] py-2.5 text-[13px] font-semibold text-[#2F5233] hover:bg-[#EDF1E9]"
                  >
                    <Plus className="size-4" aria-hidden />
                    New delivery
                  </button>

                  {loading ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
                  ) : subs.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      No scheduled deliveries yet. Create one above.
                    </p>
                  ) : (
                    subs.map((s) => (
                      <div
                        key={s.id}
                        className={cn(
                          "rounded-xl border p-3",
                          s.active ? "bg-white" : "bg-muted/30 opacity-70",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-bold">
                              {reportLabel(s.reportKey)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {cadence(s)}
                            </div>
                          </div>
                          <label className="flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={s.active}
                              disabled={busyId === s.id}
                              onChange={() => void toggleActive(s)}
                            />
                            {s.active ? "On" : "Off"}
                          </label>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {s.channels.map((c) => {
                            const meta = CHANNELS.find((x) => x.id === c);
                            if (!meta) return null;
                            const Icon = meta.Icon;
                            return (
                              <span
                                key={c}
                                className="inline-flex items-center gap-1 rounded-full bg-[#EDF1E9] px-2 py-0.5 text-[10px] font-semibold text-[#2F5233]"
                              >
                                <Icon className="size-3" aria-hidden />
                                {meta.label}
                              </span>
                            );
                          })}
                          {s.recipientEmail ? (
                            <span className="text-[10px] text-muted-foreground">
                              {s.recipientEmail}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2.5 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void sendNow(s)}
                            disabled={busyId === s.id}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border bg-white px-2 text-[11px] font-semibold disabled:opacity-40"
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
                            className="inline-flex h-7 items-center gap-1 rounded-lg border bg-white px-2 text-[11px] font-semibold"
                          >
                            <Pencil className="size-3" aria-hidden /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(s)}
                            disabled={busyId === s.id}
                            className="ml-auto inline-flex h-7 items-center gap-1 rounded-lg border border-red-200 bg-white px-2 text-[11px] font-semibold text-red-600 disabled:opacity-40"
                          >
                            <Trash2 className="size-3" aria-hidden /> Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  <p className="pt-1 text-[10px] text-muted-foreground">
                    WhatsApp/SMS go to your verified alert phone (Ops alert settings). Deliveries
                    send a summary; set it up once and it runs on schedule.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DeliveryForm({
  draft,
  setDraft,
  saving,
  onSave,
  onCancel,
  toggleChannel,
  chip,
}: {
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft | null>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  toggleChannel: (c: ReportChannel) => void;
  chip: string;
}) {
  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const label = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <div className="space-y-4">
      <div>
        <div className={label}>Report</div>
        <select
          value={draft.reportKey}
          onChange={(e) => set({ reportKey: e.target.value as ReportKey })}
          className="mt-1 h-9 w-full rounded-xl border bg-white px-2 text-[13px]"
        >
          {REPORTS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className={label}>How often</div>
        <div className="mt-1 inline-flex rounded-xl border p-0.5">
          {(["daily", "weekly", "monthly"] as ReportFrequency[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => set({ frequency: f })}
              className={cn(
                "h-8 rounded-lg px-3 text-[12px] font-semibold capitalize",
                draft.frequency === f
                  ? "bg-[#2F5233] text-white"
                  : "text-muted-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {draft.frequency === "weekly" ? (
        <div>
          <div className={label}>Day of week</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {WEEKDAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => set({ dayOfWeek: i + 1 })}
                className={cn(
                  chip,
                  draft.dayOfWeek === i + 1
                    ? "border-[#2F5233] bg-[#2F5233] text-white"
                    : "bg-white text-muted-foreground",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {draft.frequency === "monthly" ? (
        <div>
          <div className={label}>Day of month</div>
          <input
            type="number"
            min={1}
            max={28}
            value={draft.dayOfMonth ?? 1}
            onChange={(e) =>
              set({ dayOfMonth: Math.min(28, Math.max(1, Number(e.target.value) || 1)) })
            }
            className="mt-1 h-9 w-24 rounded-xl border bg-white px-2 text-[13px]"
          />
          <span className="ml-2 text-[11px] text-muted-foreground">1–28</span>
        </div>
      ) : null}

      <div>
        <div className={label}>Send time</div>
        <input
          type="time"
          value={draft.sendTime ?? "07:00"}
          onChange={(e) => set({ sendTime: e.target.value || "07:00" })}
          className="mt-1 h-9 w-32 rounded-xl border bg-white px-2 text-[13px]"
        />
      </div>

      <div>
        <div className={label}>Channels</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {CHANNELS.map(({ id, label: cl, Icon }) => {
            const on = draft.channels.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleChannel(id)}
                className={cn(
                  chip,
                  on
                    ? "border-[#2F5233] bg-[#EDF1E9] text-[#2F5233]"
                    : "bg-white text-muted-foreground",
                )}
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
        <div>
          <div className={label}>Recipient email</div>
          <input
            type="email"
            value={draft.recipientEmail ?? ""}
            onChange={(e) => set({ recipientEmail: e.target.value })}
            placeholder="owner@example.com"
            className="mt-1 h-9 w-full rounded-xl border bg-white px-2 text-[13px]"
          />
        </div>
      ) : null}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex h-9 items-center gap-1 rounded-xl bg-[#2F5233] px-4 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          <Check className="size-4" aria-hidden />
          {saving ? "Saving…" : draft.id ? "Update" : "Schedule"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-xl border bg-white px-4 text-[13px] font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
