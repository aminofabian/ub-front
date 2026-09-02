"use client";

import { useEffect, useState } from "react";

import {
  DashboardFeedback,
  DashboardLoading,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import type {
  ContactMessageDetail,
  ContactMessageListItem,
  ContactReplyChannel,
} from "@/lib/contact-messages";
import { cn } from "@/lib/utils";

type ContactMessagesInboxProps = {
  canReply: boolean;
  listMessages: (opts?: {
    status?: "UNREAD" | "READ";
  }) => Promise<{ content: ContactMessageListItem[]; totalElements: number }>;
  getMessage: (id: string) => Promise<ContactMessageDetail>;
  replyMessage: (
    id: string,
    body: { channel: ContactReplyChannel; body: string },
  ) => Promise<unknown>;
  onOpenTicket?: (contactMessageId: string) => Promise<void> | void;
};

export function ContactMessagesInbox({
  canReply,
  listMessages,
  getMessage,
  replyMessage,
  onOpenTicket,
}: ContactMessagesInboxProps) {
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [rows, setRows] = useState<ContactMessageListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactMessageDetail | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [channel, setChannel] = useState<ContactReplyChannel>("EMAIL");
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    kind: "error" | "success";
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setListLoading(true);
      setMessage(null);
      try {
        const page = await listMessages({
          status: filter === "ALL" ? undefined : filter,
        });
        if (!cancelled) {
          setRows(page.content);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({
            text:
              error instanceof Error
                ? error.message
                : "Failed to load messages.",
            kind: "error",
          });
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [filter, listMessages, refreshKey]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setDetailLoading(true);
      setMessage(null);
      try {
        const next = await getMessage(selectedId);
        if (!cancelled) {
          setDetail(next);
          setRows((prev) =>
            prev.map((row) =>
              row.id === next.id
                ? { ...row, status: next.status, readAt: next.readAt }
                : row,
            ),
          );
          if (next.email) setChannel("EMAIL");
          else if (next.phone) setChannel("WHATSAPP");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({
            text:
              error instanceof Error
                ? error.message
                : "Failed to load message.",
            kind: "error",
          });
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedId, getMessage]);

  const onSendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail || !canReply) return;
    const body = replyBody.trim();
    if (!body) {
      setMessage({ text: "Reply body is required.", kind: "error" });
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      const response = await replyMessage(detail.id, { channel, body });
      const outcome = (response as { outcome?: string } | null)?.outcome;
      setReplyBody("");
      setMessage({
        text:
          outcome === "queued"
            ? "Reply queued — sends when the till is online."
            : "Reply sent.",
        kind: "success",
      });
      const refreshed = await getMessage(detail.id);
      setDetail(refreshed);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Reply failed.",
        kind: "error",
      });
    } finally {
      setSending(false);
    }
  };

  const emailDisabled = !detail?.email;
  const phoneDisabled = !detail?.phone;

  return (
    <div className="space-y-4">
      {message ? (
        <DashboardFeedback kind={message.kind} text={message.text} />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(["ALL", "UNREAD", "READ"] as const).map((id) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={filter === id ? "default" : "outline"}
            onClick={() => setFilter(id)}
          >
            {id === "ALL" ? "All" : id === "UNREAD" ? "Unread" : "Read"}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div className="min-h-[20rem] overflow-hidden rounded-xl border border-border/70">
          {listLoading ? (
            <div className="p-4">
              <DashboardLoading label="Loading messages…" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 px-3 py-3 text-left transition hover:bg-muted/50",
                      selectedId === row.id && "bg-muted/70",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {row.name}
                      </span>
                      {row.status === "UNREAD" ? (
                        <span className="size-2 shrink-0 rounded-full bg-primary" />
                      ) : null}
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      {row.preview}
                    </span>
                    <span className="text-[11px] text-muted-foreground/80">
                      {formatWhen(row.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-h-[20rem] rounded-xl border border-border/70 p-4">
          {!selectedId ? (
            <p className="text-sm text-muted-foreground">
              Select a message to read and reply.
            </p>
          ) : detailLoading || !detail ? (
            <DashboardLoading label="Loading…" />
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {detail.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {detail.email}
                  {detail.phone ? ` · ${detail.phone}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatWhen(detail.createdAt)}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {detail.body}
              </p>
              {onOpenTicket ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void onOpenTicket(detail.id)}
                >
                  Open serving ticket
                </Button>
              ) : null}

              {detail.replies.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Replies</h3>
                  <ul className="space-y-2">
                    {detail.replies.map((reply) => (
                      <li
                        key={reply.id}
                        className="rounded-lg border border-border/60 px-3 py-2 text-sm"
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{reply.channel}</span>
                          <span>·</span>
                          {reply.outcome === "failed" ? (
                            <span className="font-medium text-destructive">Failed</span>
                          ) : reply.outcome === "queued" ? (
                            <span>Queued — sends when online</span>
                          ) : reply.outcome === "sent" || reply.outcome === "stub" ? (
                            <span>Sent</span>
                          ) : (
                            <span>{reply.outcome}</span>
                          )}
                          <span>·</span>
                          <span>{formatWhen(reply.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{reply.body}</p>
                        {reply.outcome === "failed" && reply.detail ? (
                          <p className="mt-1 text-xs text-destructive/80">
                            {reply.detail}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {canReply ? (
                <form className="space-y-3 border-t border-border/60 pt-4" onSubmit={(e) => void onSendReply(e)}>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["EMAIL", "Email", emailDisabled],
                        ["WHATSAPP", "WhatsApp", phoneDisabled],
                        ["SMS", "Message", phoneDisabled],
                      ] as const
                    ).map(([id, label, disabled]) => (
                      <Button
                        key={id}
                        type="button"
                        size="sm"
                        variant={channel === id ? "default" : "outline"}
                        disabled={disabled}
                        onClick={() => setChannel(id)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={4}
                    placeholder="Write your reply…"
                    className={cn(dashboardInputClass, "min-h-[6rem] resize-y")}
                  />
                  <Button type="submit" disabled={sending || (channel === "EMAIL" ? emailDisabled : phoneDisabled)}>
                    {sending ? "Sending…" : "Send reply"}
                  </Button>
                </form>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
