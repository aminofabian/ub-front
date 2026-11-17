"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Clock,
  Inbox,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Search,
} from "lucide-react";

import { MessageBody } from "@/components/conversations/message-body";
import {
  DashboardFeedback,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useMediaLg } from "@/hooks/use-media-lg";
import type {
  ContactMessageDetail,
  ContactMessageListItem,
  ContactReplyChannel,
} from "@/lib/contact-messages";
import {
  salesHair,
  salesHairDivide,
  salesInk,
  salesMute,
  salesSurface,
  SalesPeriodChip,
  salesToolBtnClass,
} from "@/components/sales/sales-surface";
import { cn } from "@/lib/utils";

export type MessagesFilter = "ALL" | "UNREAD" | "READ";

export type MessagesTheatreProps = {
  canReply: boolean;
  filter: MessagesFilter;
  onFilterChange: (value: MessagesFilter) => void;
  rows: ContactMessageListItem[];
  search: string;
  onSearchChange: (value: string) => void;
  listLoading: boolean;
  unreadCount: number;
  totalCount: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  selectedId: string | null;
  detail: ContactMessageDetail | null;
  detailLoading: boolean;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
  mobileDetailOpen: boolean;
  channel: ContactReplyChannel;
  onChannelChange: (channel: ContactReplyChannel) => void;
  replyBody: string;
  onReplyBodyChange: (value: string) => void;
  sending: boolean;
  onSendReply: (event: React.FormEvent) => void;
  feedback: { text: string; kind: "error" | "success" } | null;
  onRefresh: () => void;
  onOpenTicket?: (contactMessageId: string) => Promise<void> | void;
  onOrganize?: (contactMessageId: string) => Promise<void> | void;
};

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 rounded-full bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function messageInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function previewSubject(text: string, max = 72): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "No subject";
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

/** A compact, calm time for a reply bubble's meta line. */
function formatReplyTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

/**
 * Per-channel identity so a reply reads at a glance as Email vs SMS vs WhatsApp.
 * Colours are channel-native tints over the conversation forest palette, kept
 * quiet enough to stay professional in light and dark.
 */
const CHANNEL_META: Record<
  string,
  { label: string; Icon: typeof Mail; tint: string; text: string; ring: string }
> = {
  EMAIL: {
    label: "Email",
    Icon: Mail,
    tint: "bg-[color-mix(in_srgb,#3b5bdb_12%,transparent)]",
    text: "text-[#3b5bdb]",
    ring: "ring-[color-mix(in_srgb,#3b5bdb_30%,transparent)]",
  },
  WHATSAPP: {
    label: "WhatsApp",
    Icon: MessageCircle,
    tint: "bg-[color-mix(in_srgb,#1d9d5e_14%,transparent)]",
    text: "text-[#157a47]",
    ring: "ring-[color-mix(in_srgb,#1d9d5e_32%,transparent)]",
  },
  SMS: {
    label: "SMS",
    Icon: MessageSquare,
    tint: "bg-[color-mix(in_srgb,#b8690f_14%,transparent)]",
    text: "text-[#9a5610]",
    ring: "ring-[color-mix(in_srgb,#b8690f_30%,transparent)]",
  },
};

function channelMeta(channel: string) {
  return CHANNEL_META[channel?.toUpperCase?.() ?? ""] ?? CHANNEL_META.SMS;
}

/** Small channel chip (icon + label) shown on each outbound reply. */
function ChannelBadge({ channel }: { channel: string }) {
  const meta = channelMeta(channel);
  const { Icon } = meta;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ring-1 ring-inset",
        meta.tint,
        meta.text,
        meta.ring,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </span>
  );
}

/** Delivery state for a reply, mirroring the chat tick language. */
function ReplyStatus({ outcome }: { outcome: string }) {
  if (outcome === "failed") {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-destructive">
        <AlertTriangle className="size-3" aria-hidden />
        Failed
      </span>
    );
  }
  if (outcome === "queued") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Clock className="size-3" aria-hidden />
        Queued
      </span>
    );
  }
  if (outcome === "sent" || outcome === "stub") {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--pos-primary,#0f766e)]">
        <CheckCheck className="size-3" aria-hidden />
        Sent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Check className="size-3" aria-hidden />
      {outcome}
    </span>
  );
}

function MessagesContextBanner({
  unreadCount,
  listLoading,
  filter,
  onFilterChange,
  canReply,
  shownCount,
  totalCount,
}: {
  unreadCount: number;
  listLoading: boolean;
  filter: MessagesFilter;
  onFilterChange: (value: MessagesFilter) => void;
  canReply: boolean;
  shownCount: number;
  totalCount: number;
}) {
  const chips: { id: MessagesFilter; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "UNREAD", label: "Unread" },
    { id: "READ", label: "Read" },
  ];

  return (
    <div
      className={cn(
        salesSurface,
        "flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-3.5",
      )}
    >
      <p
        className={cn(
          "flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]",
          salesInk,
        )}
      >
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <LiveDot />
          {listLoading
            ? "Loading messages…"
            : unreadCount > 0
              ? `${unreadCount.toLocaleString()} unread`
              : "Inbox clear"}
        </span>
        <span className={dashboardHintClass()}>
          {shownCount.toLocaleString()}
          {shownCount !== totalCount ? ` of ${totalCount.toLocaleString()}` : ""}{" "}
          shown
        </span>
        <span
          className={cn(
            dashboardHintClass(),
            canReply
              ? "text-[var(--pos-primary,#0f766e)]"
              : "text-muted-foreground",
          )}
        >
          {canReply ? "Replies enabled" : "View only"}
        </span>
      </p>

      <div
        role="group"
        aria-label="Message status filter"
        className="flex flex-wrap items-center gap-1.5"
      >
        {chips.map((chip) => (
          <SalesPeriodChip
            key={chip.id}
            active={filter === chip.id}
            onClick={() => onFilterChange(chip.id)}
            className="h-8 px-2.5 text-[11px]"
          >
            {chip.label}
          </SalesPeriodChip>
        ))}
      </div>
    </div>
  );
}

function MessagesPulse({
  unreadCount,
  totalCount,
  rows,
  onSelect,
  className,
}: {
  unreadCount: number;
  totalCount: number;
  rows: ContactMessageListItem[];
  onSelect: (id: string) => void;
  className?: string;
}) {
  const recentUnread = useMemo(
    () => rows.filter((r) => r.status === "UNREAD").slice(0, 6),
    [rows],
  );

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-6",
        className,
      )}
    >
      {/* Soft radial wash so the panel reads as a considered surface, not a void. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_55%_at_50%_38%,color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,transparent),transparent_70%)]"
      />

      <div className="relative z-[1] w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span
            aria-hidden
            className="grid size-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] text-[var(--pos-primary,#0f766e)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_22%,transparent)]"
          >
            <Inbox className="size-6" />
          </span>
          <h3
            className={cn(
              "mt-4 font-heading text-[1.4rem] font-semibold leading-tight tracking-[-0.03em]",
              salesInk,
            )}
          >
            {unreadCount > 0 ? "You have new messages" : "Inbox is clear"}
          </h3>
          <p className={cn(dashboardHintClass(), "mt-1.5 max-w-xs leading-relaxed")}>
            {totalCount === 0
              ? "Shoppers reach you from Talk to Us on your storefront — their messages land here first."
              : "Pick a message on the left to read the full thread and reply from the dock."}
          </p>
        </div>

        {/* Two-stat row — the key numbers, side by side. */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className={cn(salesSurface, "rounded-2xl px-4 py-3 text-center")}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Total
            </p>
            <p
              className={cn(
                "mt-1 font-heading text-[1.9rem] font-semibold leading-none tracking-[-0.04em] tabular-nums",
                salesInk,
              )}
            >
              {totalCount.toLocaleString()}
            </p>
          </div>
          <div className={cn(salesSurface, "rounded-2xl px-4 py-3 text-center")}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Unread
            </p>
            <p
              className={cn(
                "mt-1 font-heading text-[1.9rem] font-semibold leading-none tracking-[-0.04em] tabular-nums",
                unreadCount > 0
                  ? "text-[#9a2e16]"
                  : "text-[var(--pos-primary,#0f766e)]",
              )}
            >
              {unreadCount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Needs-a-look list — tidy, clickable rows. */}
        {recentUnread.length > 0 ? (
          <div className={cn(salesSurface, "mt-3 overflow-hidden rounded-2xl")}>
            <p className="border-b px-4 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              Needs a look
            </p>
            <ul>
              {recentUnread.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(row.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)]"
                  >
                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)] text-[10px] font-bold uppercase tracking-wide text-foreground"
                    >
                      {messageInitials(row.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold tracking-[-0.015em] text-foreground">
                        {row.name}
                      </span>
                      {row.preview ? (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {row.preview}
                        </span>
                      ) : null}
                    </span>
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full bg-[#9a2e16]"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MessagesFocus({
  detail,
  listRow,
  className,
}: {
  detail: ContactMessageDetail | null;
  listRow: ContactMessageListItem | null;
  className?: string;
}) {
  const name = detail?.name ?? listRow?.name ?? "Message";
  const email = detail?.email ?? listRow?.email ?? "";
  const phone = detail?.phone ?? listRow?.phone ?? null;
  const when = detail?.createdAt ?? listRow?.createdAt ?? "";
  const body = detail?.body ?? listRow?.preview ?? "";
  const status = detail?.status ?? listRow?.status ?? "READ";

  const replyCount = detail?.replies?.length ?? 0;
  // Distinct channels used across the reply history, in first-seen order.
  const channelsUsed = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of detail?.replies ?? []) {
      const c = r.channel?.toUpperCase?.() ?? "";
      if (c && !seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return out;
  }, [detail?.replies]);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 items-center justify-center overflow-y-auto px-6 py-8",
        className,
      )}
    >
      {/* Soft wash keeps the reading pane from feeling like a blank sheet. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(55%_50%_at_50%_30%,color-mix(in_srgb,var(--order-ink,#15231f)_5%,transparent),transparent_70%)]"
      />

      <article
        className={cn(
          salesSurface,
          "relative z-[1] w-full max-w-md rounded-3xl p-6 shadow-[0_18px_48px_color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
        )}
      >
        {/* Oversized quote mark as a quiet motif. */}
        <span
          aria-hidden
          className="font-heading text-[3.5rem] leading-[0.6] text-[color-mix(in_srgb,var(--pos-primary,#0f766e)_30%,transparent)]"
        >
          &ldquo;
        </span>

        <MessageBody
          text={body}
          className="mt-1 text-[1.05rem] leading-relaxed tracking-[-0.01em] text-foreground"
        />

        <div className="mt-6 flex items-center gap-3 border-t pt-4 border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] text-[12px] font-semibold tracking-wide text-foreground ring-1 ring-inset ring-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]"
          >
            {messageInitials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold tracking-[-0.015em] text-foreground">
              {name}
            </p>
            <p className="truncate text-[11.5px] text-muted-foreground">
              {email}
              {phone ? ` · ${phone}` : ""}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
              status === "UNREAD"
                ? "bg-[color-mix(in_srgb,#9a2e16_12%,transparent)] text-[#9a2e16]"
                : "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] text-[var(--pos-primary,#0f766e)]",
            )}
          >
            {status === "UNREAD" ? "Unread" : "Read"}
          </span>
        </div>

        {/* Context strip: when, reply count, channels used. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
          {when ? <span>{formatWhen(when)}</span> : null}
          {when ? <span aria-hidden>·</span> : null}
          <span>
            {replyCount === 0
              ? "No replies yet"
              : `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
          </span>
          {channelsUsed.length > 0 ? (
            <span className="inline-flex items-center gap-1">
              {channelsUsed.map((c) => (
                <ChannelBadge key={c} channel={c} />
              ))}
            </span>
          ) : null}
        </div>

        <p className={cn(dashboardHintClass(), "mt-4 flex items-center gap-1.5")}>
          <Mail className="size-3.5 shrink-0" aria-hidden />
          Reply from the dock on the right
        </p>
      </article>
    </div>
  );
}

function MessageDossier({
  detail,
  detailLoading,
  canReply,
  channel,
  onChannelChange,
  replyBody,
  onReplyBodyChange,
  sending,
  onSendReply,
  onOpenTicket,
  onOrganize,
  onCancel,
  className,
}: {
  detail: ContactMessageDetail | null;
  detailLoading: boolean;
  canReply: boolean;
  channel: ContactReplyChannel;
  onChannelChange: (channel: ContactReplyChannel) => void;
  replyBody: string;
  onReplyBodyChange: (value: string) => void;
  sending: boolean;
  onSendReply: (event: React.FormEvent) => void;
  onOpenTicket?: (contactMessageId: string) => Promise<void> | void;
  onOrganize?: (contactMessageId: string) => Promise<void> | void;
  onCancel?: () => void;
  className?: string;
}) {
  if (detailLoading || !detail) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center gap-2 bg-white px-4",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        <p className={dashboardHintClass()}>Loading message…</p>
      </div>
    );
  }

  const emailDisabled = !detail.email;
  const phoneDisabled = !detail.phone;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-white",
        className,
      )}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
        {/* Contact header */}
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 select-none items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] text-[12px] font-semibold tracking-wide text-foreground ring-1 ring-inset ring-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]"
          >
            {messageInitials(detail.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h3
              className="truncate text-[1.05rem] font-semibold leading-tight tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {detail.name}
            </h3>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {detail.email}
              {detail.phone ? ` · ${detail.phone}` : ""}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
              detail.status === "UNREAD"
                ? "bg-[color-mix(in_srgb,#9a2e16_12%,transparent)] text-[#9a2e16]"
                : "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] text-[var(--pos-primary,#0f766e)]",
            )}
          >
            {detail.status === "UNREAD" ? "Unread" : "Read"}
          </span>
        </div>

        {/* Conversation thread — inbound message, then outbound replies. */}
        <div className="space-y-3">
          {/* Inbound: the shopper's original message, left-aligned. */}
          <div className="flex flex-col items-start">
            <div
              className={cn(
                salesSurface,
                "max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2.5",
              )}
            >
              <MessageBody
                text={detail.body}
                className="text-[13px] leading-relaxed text-foreground"
              />
            </div>
            <span className="mt-1 px-1 text-[10.5px] text-muted-foreground">
              {formatReplyTime(detail.createdAt)}
            </span>
          </div>

          {/* Outbound: each reply, right-aligned with its channel + status. */}
          {detail.replies.map((reply) => {
            const meta = channelMeta(reply.channel);
            return (
              <div key={reply.id} className="flex flex-col items-end">
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl rounded-br-md border px-3.5 py-2.5",
                    "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,var(--order-surface,#fff))]",
                    reply.outcome === "failed"
                      ? "border-destructive/35"
                      : meta.ring.replace("ring-", "border-"),
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-end gap-2">
                    <ChannelBadge channel={reply.channel} />
                  </div>
                  <MessageBody
                    text={reply.body}
                    className="text-[13px] leading-relaxed text-foreground"
                  />
                  {reply.outcome === "failed" && reply.detail ? (
                    <p className="mt-1.5 text-[11px] text-destructive/80">
                      {reply.detail}
                    </p>
                  ) : null}
                </div>
                <span className="mt-1 flex items-center gap-1.5 px-1 text-[10.5px] text-muted-foreground">
                  <ReplyStatus outcome={reply.outcome} />
                  <span aria-hidden>·</span>
                  <span>{formatReplyTime(reply.createdAt)}</span>
                </span>
              </div>
            );
          })}
        </div>

        {onOpenTicket || onOrganize ? (
          <div className="flex flex-wrap gap-2 border-t border-dashed pt-3 border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
            {onOpenTicket ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => void onOpenTicket(detail.id)}
              >
                Open serving ticket
              </Button>
            ) : null}
            {onOrganize ? (
              <Button
                type="button"
                size="sm"
                className="rounded-xl"
                onClick={() => void onOrganize(detail.id)}
              >
                Break into 1, 2, 3…
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {canReply ? (
        <form
          className={cn(
            "shrink-0 space-y-2.5 border-t px-3 py-3 sm:px-4",
            salesHair,
          )}
          onSubmit={(e) => void onSendReply(e)}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Reply via
            </span>
            {(
              [
                ["EMAIL", "Email", emailDisabled],
                ["WHATSAPP", "WhatsApp", phoneDisabled],
                ["SMS", "SMS", phoneDisabled],
              ] as const
            ).map(([id, label, disabled]) => {
              const { Icon } = channelMeta(id);
              return (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={channel === id ? "default" : "outline"}
                  className="h-7 gap-1 rounded-full px-2.5 text-[11px]"
                  disabled={disabled}
                  onClick={() => onChannelChange(id)}
                >
                  <Icon className="size-3" aria-hidden />
                  {label}
                </Button>
              );
            })}
          </div>
          <textarea
            value={replyBody}
            onChange={(e) => onReplyBodyChange(e.target.value)}
            rows={4}
            placeholder="Write your reply…"
            className={cn(dashboardInputClass(), "min-h-[5.5rem] resize-y py-2")}
            aria-label="Reply body"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              size="sm"
              className="rounded-xl"
              disabled={
                sending || (channel === "EMAIL" ? emailDisabled : phoneDisabled)
              }
            >
              {sending ? "Sending…" : "Send reply"}
            </Button>
            {onCancel ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl lg:hidden"
                onClick={onCancel}
              >
                Close
              </Button>
            ) : null}
          </div>
        </form>
      ) : onCancel ? (
        <div
          className={cn(
            "shrink-0 border-t px-3 py-3 lg:hidden sm:px-4",
            salesHair,
          )}
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={onCancel}
          >
            Close
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function MessagesTheatre(props: MessagesTheatreProps) {
  const {
    canReply,
    filter,
    onFilterChange,
    rows,
    search,
    onSearchChange,
    listLoading,
    unreadCount,
    totalCount,
    hasMore,
    loadingMore,
    onLoadMore,
    selectedId,
    detail,
    detailLoading,
    onSelect,
    onClearSelection,
    mobileDetailOpen,
    channel,
    onChannelChange,
    replyBody,
    onReplyBodyChange,
    sending,
    onSendReply,
    feedback,
    onRefresh,
    onOpenTicket,
    onOrganize,
  } = props;

  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const drawerOpen = !!selectedId && (isLg || mobileDetailOpen);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [row.name, row.email, row.phone ?? "", row.preview]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const selectedListRow =
    rows.find((r) => r.id === selectedId) ??
    filteredRows.find((r) => r.id === selectedId) ??
    null;

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;

    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          fill ? "h-full bg-transparent" : "bg-white",
        )}
      >
        <div
          className={cn(
            "shrink-0 space-y-2 border-b px-2.5 py-2 sm:px-3",
            salesHair,
            fill ? "bg-transparent" : "sticky top-0 z-[1] bg-white",
          )}
        >
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(
                dashboardInputClass(),
                "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]",
              )}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="From, subject, preview…"
              aria-label="Search messages"
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            <p className={cn(dashboardHintClass(), "tabular-nums")}>
              {filteredRows.length}{" "}
              {filteredRows.length === 1 ? "message" : "messages"}
              {search.trim() ? " matching" : ""}
            </p>
            <button
              type="button"
              className={cn(salesToolBtnClass(), "h-7 shrink-0 gap-1 px-2 text-[11px]")}
              disabled={listLoading}
              onClick={onRefresh}
            >
              {listLoading ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3" aria-hidden />
              )}
              Refresh
            </button>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {listLoading ? (
            <p
              className={cn(
                dashboardHintClass(),
                "flex items-center justify-center gap-2 px-3 py-10",
              )}
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading…
            </p>
          ) : filteredRows.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <Inbox
                className="mx-auto size-7 text-muted-foreground/60"
                aria-hidden
              />
              <p className="mt-2 text-[14px] font-semibold text-foreground">
                {rows.length === 0
                  ? "No messages yet"
                  : "No messages match search"}
              </p>
              <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-[16rem]")}>
                {rows.length === 0
                  ? "When shoppers use Talk to Us, they appear here."
                  : "Try another name, email, or phrase."}
              </p>
            </div>
          ) : (
            <ul className={cn("divide-y", salesHairDivide)}>
              {filteredRows.map((row) => {
                const active = selectedId === row.id;
                const unread = row.status === "UNREAD";
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(row.id)}
                      className={cn(
                        "relative flex w-full items-center gap-2.5 text-left transition-colors",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                      )}
                    >
                      <span
                        className={cn(
                          "relative grid size-7 shrink-0 place-items-center rounded-xl text-[10px] font-bold uppercase tracking-wide ring-1 ring-black/[0.05]",
                          active || unread
                            ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : cn(salesMute, "bg-white"),
                        )}
                        aria-hidden
                      >
                        {messageInitials(row.name)}
                        {unread ? (
                          <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[var(--pos-primary,#0f766e)]" />
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {row.name}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {previewSubject(row.preview, 48)}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80">
                          {formatWhen(row.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {hasMore && !listLoading ? (
            <div className="flex justify-center border-t px-3 py-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={loadingMore}
                onClick={() => void onLoadMore?.()}
              >
                {loadingMore ? "Loading older…" : "Load older messages"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const room = selectedId ? (
    <MessagesFocus
      detail={detail}
      listRow={selectedListRow}
      className="h-full min-h-0"
    />
  ) : listLoading ? (
    <div className="flex h-full items-center justify-center px-6">
      <p className={cn(dashboardHintClass(), "text-center")}>
        Loading overview…
      </p>
    </div>
  ) : (
    <MessagesPulse
      unreadCount={unreadCount}
      totalCount={totalCount}
      rows={rows}
      onSelect={onSelect}
      className="h-full min-h-0"
    />
  );

  const inspect = selectedId ? null : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a message
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          The centre shows inbox health. Select a row to read the full body and
          reply from the dock.
        </p>
      </div>
      {unreadCount > 0 ? (
        <p
          className={cn(
            dashboardHintClass(),
            "flex items-center gap-1.5 text-[#9a2e16]",
          )}
        >
          <MessageSquare className="size-3.5 shrink-0" aria-hidden />
          {unreadCount} unread waiting
        </p>
      ) : (
        <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
          <Inbox className="size-3.5 shrink-0" aria-hidden />
          Inbox is clear
        </p>
      )}
    </div>
  );

  const drawerTitle = detail?.name ?? selectedListRow?.name ?? "Message";
  const drawerDescription = detail
    ? [detail.email, detail.phone].filter(Boolean).join(" · ")
    : selectedListRow
      ? [selectedListRow.email, selectedListRow.phone]
          .filter(Boolean)
          .join(" · ")
      : undefined;

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      {feedback ? (
        <DashboardFeedback kind={feedback.kind} text={feedback.text} />
      ) : null}

      <MessagesContextBanner
        unreadCount={unreadCount}
        listLoading={listLoading}
        filter={filter}
        onFilterChange={onFilterChange}
        canReply={canReply}
        shownCount={filteredRows.length}
        totalCount={totalCount}
      />

      <div
        className={cn(
          salesSurface,
          "hidden h-[min(80dvh,52rem)] overflow-hidden lg:grid",
          "bg-[#f4f7f5]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
        )}
      >
        <div
          className={cn(
            "flex h-full min-h-0 flex-col border-r bg-white/80",
            salesHair,
          )}
        >
          {roster({ fill: true, denser: true })}
        </div>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <p
            className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
            aria-hidden
          >
            {selectedId ? "Message" : "Inbox pulse"}
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className={cn(
            "relative flex h-full min-h-0 flex-col overflow-hidden border-l bg-white",
            salesHair,
          )}
        >
          {isLg && selectedId ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className={cn(salesSurface, "overflow-hidden bg-white")}>
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) onClearSelection();
        }}
        contextLabel="Message"
        title={drawerTitle}
        description={drawerDescription}
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
      >
        {selectedId ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-hidden bg-white",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            <MessageDossier
              detail={detail}
              detailLoading={detailLoading}
              canReply={canReply}
              channel={channel}
              onChannelChange={onChannelChange}
              replyBody={replyBody}
              onReplyBodyChange={onReplyBodyChange}
              sending={sending}
              onSendReply={onSendReply}
              onOpenTicket={onOpenTicket}
              onOrganize={onOrganize}
              onCancel={onClearSelection}
              className="h-full"
            />
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
