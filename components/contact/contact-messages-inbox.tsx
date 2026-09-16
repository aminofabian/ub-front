"use client";

import { useEffect, useState } from "react";

import { MessagesTheatre } from "@/app/(dashboard)/messages/_components/messages-theatre";
import type {
  ContactMessageDetail,
  ContactMessageListItem,
  ContactReplyChannel,
} from "@/lib/contact-messages";

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
  onOrganize?: (contactMessageId: string) => Promise<void> | void;
};

export function ContactMessagesInbox({
  canReply,
  listMessages,
  getMessage,
  replyMessage,
  onOpenTicket,
  onOrganize,
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
  const [search, setSearch] = useState("");
  /** Last known unread total when the list isn’t filtered to Read. */
  const [unreadKnown, setUnreadKnown] = useState(0);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

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
          if (filter === "UNREAD") {
            setUnreadKnown(page.content.length);
          } else if (filter === "ALL") {
            setUnreadKnown(
              page.content.filter((row) => row.status === "UNREAD").length,
            );
          }
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

  useEffect(() => {
    if (filter === "READ") return;
    setUnreadKnown(rows.filter((row) => row.status === "UNREAD").length);
  }, [rows, filter]);

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

  const onSelect = (id: string) => {
    setSelectedId(id);
    setMobileDetailOpen(true);
    setReplyBody("");
  };

  const onClearSelection = () => {
    setSelectedId(null);
    setMobileDetailOpen(false);
    setDetail(null);
    setReplyBody("");
  };

  const unreadCount =
    filter === "READ"
      ? unreadKnown
      : rows.filter((row) => row.status === "UNREAD").length;

  return (
    <MessagesTheatre
      canReply={canReply}
      filter={filter}
      onFilterChange={setFilter}
      rows={rows}
      search={search}
      onSearchChange={setSearch}
      listLoading={listLoading}
      unreadCount={unreadCount}
      selectedId={selectedId}
      detail={detail}
      detailLoading={detailLoading}
      onSelect={onSelect}
      onClearSelection={onClearSelection}
      mobileDetailOpen={mobileDetailOpen}
      channel={channel}
      onChannelChange={setChannel}
      replyBody={replyBody}
      onReplyBodyChange={setReplyBody}
      sending={sending}
      onSendReply={(e) => void onSendReply(e)}
      feedback={message}
      onRefresh={() => setRefreshKey((k) => k + 1)}
      onOpenTicket={onOpenTicket}
      onOrganize={onOrganize}
    />
  );
}
