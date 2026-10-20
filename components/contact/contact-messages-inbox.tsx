"use client";

import { useEffect, useRef, useState } from "react";

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
    page?: number;
    size?: number;
  }) => Promise<{ content: ContactMessageListItem[]; totalElements: number }>;
  fetchUnreadCount: () => Promise<number>;
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
  fetchUnreadCount,
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
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setListLoading(true);
      try {
        const pageData = await listMessages({
          status: filter === "ALL" ? undefined : filter,
          page: 0,
        });
        if (!cancelled) {
          setRows(pageData.content);
          setTotal(pageData.totalElements);
          setPage(0);
          void fetchUnreadCount()
            .then((count) => {
              if (!cancelled) setUnreadTotal(count);
            })
            .catch(() => {});
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
  }, [filter, listMessages, fetchUnreadCount, refreshKey]);

  const loadMore = async () => {
    if (listLoading || loadingMore) return;
    const requestFilter = filter;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const pageData = await listMessages({
        status: requestFilter === "ALL" ? undefined : requestFilter,
        page: nextPage,
      });
      if (filterRef.current !== requestFilter) return;
      setRows((prev) => [...prev, ...pageData.content]);
      setTotal(pageData.totalElements);
      setPage(nextPage);
    } catch (error) {
      setMessage({
        text:
          error instanceof Error ? error.message : "Failed to load messages.",
        kind: "error",
      });
    } finally {
      setLoadingMore(false);
    }
  };

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
          // The detail GET marks the message read server-side.
          void fetchUnreadCount()
            .then((count) => {
              if (!cancelled) setUnreadTotal(count);
            })
            .catch(() => {});
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
  }, [selectedId, getMessage, fetchUnreadCount]);

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

  return (
    <MessagesTheatre
      canReply={canReply}
      filter={filter}
      onFilterChange={(next) => {
        setFilter(next);
        setMessage(null);
      }}
      rows={rows}
      search={search}
      onSearchChange={setSearch}
      listLoading={listLoading}
      unreadCount={unreadTotal}
      totalCount={total}
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
      hasMore={rows.length < total}
      loadingMore={loadingMore}
      onLoadMore={() => void loadMore()}
      onOpenTicket={onOpenTicket}
      onOrganize={onOrganize}
    />
  );
}
