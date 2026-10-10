"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";

import {
  createCrmBroadcast,
  fetchCrmBroadcast,
  fetchCrmBroadcasts,
  type CrmBroadcastDetail,
  type CrmBroadcastInput,
  type CrmBroadcastRow,
} from "@/lib/crm";
import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  sent: "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]",
  sending: "text-amber-600",
  failed: "text-red-600",
  draft: "text-muted-foreground",
};

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toLocaleString() : "";
}

export function BroadcastsWorkspace() {
  const { me } = useDashboard();
  const canSend = hasPermission(me?.permissions, Permission.CrmBroadcastSend);

  const [rows, setRows] = useState<CrmBroadcastRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CrmBroadcastDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [name, setName] = useState("");
  const [mode, setMode] = useState("free_form");
  const [body, setBody] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("en_US");
  const [audienceType, setAudienceType] = useState("all");
  const [audienceTag, setAudienceTag] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const page = await fetchCrmBroadcasts();
      setRows(page.items);
      setListError(null);
    } catch (err) {
      setListError(messageFor(err, "Could not load broadcasts."));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      setDetail(await fetchCrmBroadcast(id));
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const onSend = useCallback(async () => {
    if (!canSend) return;
    if (!name.trim()) {
      setNotice("Give the broadcast a name.");
      return;
    }
    if (mode === "free_form" && !body.trim()) {
      setNotice("Write a message.");
      return;
    }
    if (mode === "template" && !templateName.trim()) {
      setNotice("Enter the approved template name.");
      return;
    }
    const input: CrmBroadcastInput = {
      name: name.trim(),
      mode,
      body: mode === "free_form" ? body : undefined,
      templateName: mode === "template" ? templateName.trim() : undefined,
      templateLanguage: mode === "template" ? templateLanguage.trim() : undefined,
      audience: {
        type: audienceType,
        tag: audienceType === "tag" ? audienceTag.trim() : null,
      },
    };
    setSending(true);
    setNotice(null);
    try {
      const created = await createCrmBroadcast(input);
      setName("");
      setBody("");
      setTemplateName("");
      setNotice("Broadcast queued.");
      await loadList();
      setDetail(created);
      setSelectedId(created.broadcast.id);
    } catch (err) {
      setNotice(messageFor(err, "Could not send the broadcast."));
    } finally {
      setSending(false);
    }
  }, [
    canSend,
    name,
    mode,
    body,
    templateName,
    templateLanguage,
    audienceType,
    audienceTag,
    loadList,
  ]);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* List */}
      <aside className="flex flex-col rounded-none border bg-white">
        <div className="flex items-center gap-1 border-b p-2 text-[12px] font-semibold">
          <Send className="size-3.5" /> Broadcasts
        </div>
        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="flex items-center justify-center py-10 text-[13px] text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
            </div>
          ) : listError ? (
            <p className="p-3 text-[13px] text-red-600">{listError}</p>
          ) : rows.length === 0 ? (
            <p className="p-3 text-[13px] text-muted-foreground">
              No broadcasts yet.
            </p>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => void loadDetail(row.id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b px-3 py-2 text-left",
                  row.id === selectedId
                    ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                    : "hover:bg-neutral-50",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium">
                    {row.name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-none border px-1.5 text-[10px]",
                      STATUS_TONE[row.status] ?? "text-muted-foreground",
                    )}
                  >
                    {row.status}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {row.mode.replace("_", "-")} · {row.totalCount} recipients ·{" "}
                  {formatWhen(row.createdAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="flex flex-col gap-3">
        {/* Composer */}
        {canSend ? (
          <div className={DASHBOARD_SECTION_SURFACE}>
            <h2 className="mb-2 text-[13px] font-semibold">New broadcast</h2>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={dashboardLabelClass()}>Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={sending}
                    placeholder="e.g. Weekend offer"
                    className={cn(dashboardInputClass(sending), "mt-1")}
                  />
                </div>
                <div>
                  <label className={dashboardLabelClass()}>Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    disabled={sending}
                    className={cn(dashboardSelectClass(sending), "mt-1")}
                  >
                    <option value="free_form">Free-form (open window)</option>
                    <option value="template">Template (any contact)</option>
                  </select>
                </div>
              </div>

              {mode === "free_form" ? (
                <div>
                  <label className={dashboardLabelClass()}>Message</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={sending}
                    rows={3}
                    placeholder="Write the message…"
                    className={cn(dashboardTextareaClass(sending), "mt-1")}
                  />
                  <p className={cn(dashboardHintClass(), "mt-1")}>
                    Only reaches contacts inside the 24h window (those who messaged
                    you recently). Others are marked skipped.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={dashboardLabelClass()}>Template name</label>
                    <input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      disabled={sending}
                      placeholder="e.g. weekend_offer"
                      className={cn(dashboardInputClass(sending), "mt-1")}
                    />
                  </div>
                  <div>
                    <label className={dashboardLabelClass()}>Language</label>
                    <input
                      value={templateLanguage}
                      onChange={(e) => setTemplateLanguage(e.target.value)}
                      disabled={sending}
                      placeholder="en_US"
                      className={cn(dashboardInputClass(sending), "mt-1")}
                    />
                  </div>
                  <p className={cn(dashboardHintClass(), "sm:col-span-2")}>
                    Must be an approved template on the platform WABA. Can reach
                    cold contacts.
                  </p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={dashboardLabelClass()}>Audience</label>
                  <select
                    value={audienceType}
                    onChange={(e) => setAudienceType(e.target.value)}
                    disabled={sending}
                    className={cn(dashboardSelectClass(sending), "mt-1")}
                  >
                    <option value="all">All contacts</option>
                    <option value="tag">By tag</option>
                  </select>
                </div>
                {audienceType === "tag" ? (
                  <div>
                    <label className={dashboardLabelClass()}>Tag</label>
                    <input
                      value={audienceTag}
                      onChange={(e) => setAudienceTag(e.target.value)}
                      disabled={sending}
                      placeholder="e.g. vip"
                      className={cn(dashboardInputClass(sending), "mt-1")}
                    />
                  </div>
                ) : null}
              </div>

              {notice ? (
                <p className="text-[12px] text-muted-foreground">{notice}</p>
              ) : null}

              <button
                type="button"
                onClick={() => void onSend()}
                disabled={sending}
                className="inline-flex items-center gap-1 rounded-none border bg-[var(--pos-primary,#0f766e)] px-3 py-1.5 text-[13px] text-white disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Send broadcast
              </button>
            </div>
          </div>
        ) : null}

        {/* Detail */}
        <div className={DASHBOARD_SECTION_SURFACE}>
          <h2 className="mb-2 text-[13px] font-semibold">
            {detail ? detail.broadcast.name : "Progress"}
          </h2>
          {detailLoading ? (
            <div className="flex items-center justify-center py-6 text-[13px] text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
            </div>
          ) : !detail ? (
            <p className="text-[13px] text-muted-foreground">
              Select a broadcast to see its progress.
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2 text-[12px]">
                <Count label="Pending" value={detail.pendingCount} />
                <Count label="Sent" value={detail.sentCount} />
                <Count label="Delivered" value={detail.deliveredCount} />
                <Count label="Read" value={detail.readCount} />
                <Count label="Failed" value={detail.failedCount} />
                <Count label="Skipped" value={detail.skippedCount} />
              </div>
              <ul className="max-h-[40vh] space-y-1 overflow-y-auto">
                {detail.recipients.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-none border px-2 py-1 text-[12px]"
                  >
                    <span className="truncate">{r.phoneE164}</span>
                    <span className="flex items-center gap-2">
                      {r.errorMessage ? (
                        <span className="text-[11px] text-muted-foreground">
                          {r.errorMessage}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "rounded-none border px-1.5 text-[10px]",
                          STATUS_TONE[r.status] ?? "text-muted-foreground",
                        )}
                      >
                        {r.status}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-none border px-2 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
