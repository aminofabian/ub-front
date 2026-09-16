"use client";

import { useMemo, useState } from "react";
import {
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
} from "lucide-react";

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
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
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
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
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
        className="flex flex-wrap gap-0.5 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-0.5"
        role="group"
        aria-label="Message status filter"
      >
        {chips.map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onFilterChange(chip.id)}
              className={cn(
                "inline-flex h-7 items-center justify-center px-2 text-[10px] font-semibold transition-colors",
                active
                  ? "bg-[var(--pos-primary,#0f766e)] text-white"
                  : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground",
              )}
            >
              {chip.label}
            </button>
          );
        })}
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
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  const recentUnread = useMemo(
    () => rows.filter((r) => r.status === "UNREAD").slice(0, 5),
    [rows],
  );

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M14 42 C 34 26, 58 22, 84 36"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M18 62 C 40 74, 62 68, 82 58"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <article className={cn(card, "left-[8%] top-[16%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Inbox
        </p>
        <p
          className="mt-2 text-[2.15rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {totalCount.toLocaleString()}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Talk to Us messages from your storefront
        </p>
      </article>

      <article className={cn(card, "right-[6%] top-[34%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Unread
        </p>
        <p
          className={cn(
            "mt-2 text-[1.85rem] font-semibold leading-none tracking-[-0.04em] tabular-nums",
            unreadCount > 0
              ? "text-[#9a2e16]"
              : "text-[var(--pos-primary,#0f766e)]",
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {unreadCount.toLocaleString()}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {unreadCount > 0
            ? "Select a message to mark it read"
            : "Nothing waiting — check back later"}
        </p>
      </article>

      {recentUnread.length > 0 ? (
        <article className={cn(card, "left-[10%] bottom-[10%]")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Needs a look
          </p>
          <ul className="mt-2 space-y-1.5">
            {recentUnread.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect(row.id)}
                  className="text-left text-[12px] font-semibold tracking-[-0.015em] text-foreground underline-offset-2 hover:underline"
                >
                  {row.name}
                </button>
              </li>
            ))}
          </ul>
        </article>
      ) : totalCount === 0 ? (
        <article className={cn(card, "left-[10%] bottom-[12%]")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tip
          </p>
          <p className={cn(dashboardHintClass(), "mt-2 max-w-[14rem]")}>
            Shoppers send messages from Talk to Us on your storefront. They land
            here first.
          </p>
        </article>
      ) : null}
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
  const subject = previewSubject(
    detail?.body ?? listRow?.preview ?? "",
  );
  const summary = previewSubject(
    detail?.body ?? listRow?.preview ?? "",
    160,
  );

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-6",
        className,
      )}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <circle
          cx="50"
          cy="46"
          r="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          strokeDasharray="1.2 1.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="relative z-[1] flex max-w-md flex-col items-center text-center">
        <span
          className="grid size-16 place-items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white text-[1.1rem] font-bold tracking-wide text-foreground shadow-[0_10px_28px_color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]"
          aria-hidden
        >
          {messageInitials(name)}
        </span>
        <h3
          className="mt-4 text-[1.45rem] font-semibold leading-tight tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {subject}
        </h3>
        <p className="mt-2 text-[12px] text-muted-foreground">
          From {name}
          {email ? ` · ${email}` : ""}
          {phone ? ` · ${phone}` : ""}
        </p>
        {when ? (
          <p className={cn(dashboardHintClass(), "mt-1")}>{formatWhen(when)}</p>
        ) : null}
        <p className={cn(dashboardHintClass(), "mt-5 max-w-sm leading-relaxed")}>
          {summary}
        </p>
        <p className={cn(dashboardHintClass(), "mt-4 flex items-center gap-1.5")}>
          <Mail className="size-3.5 shrink-0" aria-hidden />
          Full thread and reply live in the dock
        </p>
      </div>
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
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            From
          </p>
          <h3
            className="mt-1 text-[1.15rem] font-semibold leading-tight tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {detail.name}
          </h3>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {detail.email}
            {detail.phone ? ` · ${detail.phone}` : ""}
          </p>
          <p className={cn(dashboardHintClass(), "mt-1")}>
            {formatWhen(detail.createdAt)}
            {detail.status === "UNREAD" ? " · Unread" : " · Read"}
          </p>
        </div>

        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
          {detail.body}
        </p>

        {onOpenTicket || onOrganize ? (
          <div className="flex flex-wrap gap-2">
            {onOpenTicket ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-none"
                onClick={() => void onOpenTicket(detail.id)}
              >
                Open serving ticket
              </Button>
            ) : null}
            {onOrganize ? (
              <Button
                type="button"
                size="sm"
                className="rounded-none"
                onClick={() => void onOrganize(detail.id)}
              >
                Break into 1, 2, 3…
              </Button>
            ) : null}
          </div>
        ) : null}

        {detail.replies.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-[12px] font-semibold tracking-[-0.01em]">
              Replies
            </h4>
            <ul className="space-y-2">
              {detail.replies.map((reply) => (
                <li
                  key={reply.id}
                  className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 py-2 text-[13px]"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
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
                    <p className="mt-1 text-[11px] text-destructive/80">
                      {reply.detail}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {canReply ? (
        <form
          className="shrink-0 space-y-2.5 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 py-3 sm:px-4"
          onSubmit={(e) => void onSendReply(e)}
        >
          <div className="flex flex-wrap gap-1.5">
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
                className="h-7 rounded-none px-2 text-[11px]"
                disabled={disabled}
                onClick={() => onChannelChange(id)}
              >
                {label}
              </Button>
            ))}
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
              className="rounded-none"
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
                className="rounded-none lg:hidden"
                onClick={onCancel}
              >
                Close
              </Button>
            ) : null}
          </div>
        </form>
      ) : onCancel ? (
        <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 py-3 lg:hidden sm:px-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-none"
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
            "shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3",
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1 rounded-none px-2 text-[11px]"
              disabled={listLoading}
              onClick={onRefresh}
            >
              {listLoading ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3" aria-hidden />
              )}
              Refresh
            </Button>
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
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
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
                          "relative grid size-7 shrink-0 place-items-center border text-[10px] font-bold uppercase tracking-wide",
                          active || unread
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {messageInitials(row.name)}
                        {unread ? (
                          <span className="absolute -right-0.5 -top-0.5 size-1.5 bg-[var(--pos-primary,#0f766e)]" />
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
      totalCount={rows.length}
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
        totalCount={rows.length}
      />

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] lg:grid",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]">
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
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && selectedId ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
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
