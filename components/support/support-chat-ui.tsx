"use client";

import * as React from "react";
import {
  Check,
  CheckCheck,
  Clock,
  Copy,
  CornerUpLeft,
  FileText,
  Paperclip,
  Send,
  ShoppingBag,
  Smile,
  X,
} from "lucide-react";

import { MessageBody } from "@/components/conversations/message-body";
import { Button } from "@/components/ui/button";
import { readableInkOn } from "@/lib/color-contrast";
import { APP_ROUTES } from "@/lib/config";
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  formatAttachmentBytes,
  isSupportImageContentType,
  validateSupportAttachmentFile,
  type SupportAttachmentPayload,
} from "@/lib/support-attachments";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Shared support-chat primitives ────────────────────────────────────────
// Used by guest, tenant, and super-admin surfaces so every side of the
// conversation speaks the same visual language: calm, exact, readable.

export type ChatSenderType = "TENANT" | "SUPER_ADMIN" | "GUEST";

export type ChatAttachmentShape = {
  url: string;
  publicId?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  bytes?: number | null;
};

export type ChatOrderCardShape = {
  orderId: string;
  orderCode: string;
  status: string;
  currency: string | null;
  grandTotal: number | string | null;
  customerName: string | null;
  customerPhone: string | null;
  branchName: string | null;
  channel: string | null;
  lines: Array<{
    itemName: string;
    variantName?: string | null;
    quantity: number | string;
    lineTotal: number | string;
  }>;
  lineCount: number;
};

export type ChatWelcomeCardShape = {
  recipientName: string | null;
  businessName: string | null;
  supportPhone: string | null;
  supportEmail: string | null;
  helpItems: string[];
};

export type ChatReplyShape = {
  messageId: string;
  senderType: ChatSenderType;
  senderName: string | null;
  body: string;
  messageKind?: "TEXT" | "ORDER_CARD" | "WELCOME_CARD" | string | null;
};

export type ChatMessageShape = {
  id: string;
  conversationId: string;
  senderType: ChatSenderType;
  senderUserId: string;
  senderName: string | null;
  body: string;
  messageKind?: "TEXT" | "ORDER_CARD" | "WELCOME_CARD" | string | null;
  orderCard?: ChatOrderCardShape | null;
  welcomeCard?: ChatWelcomeCardShape | null;
  attachment?: ChatAttachmentShape | null;
  replyTo?: ChatReplyShape | null;
  readAt: string | null;
  createdAt: string;
  /** Optimistic, not yet confirmed by the server. */
  pending?: boolean;
  /** The POST failed; show a retry affordance. */
  failed?: boolean;
  /**
   * Local-only file kept on a failed optimistic row so "Retry" can re-upload
   * it. Never serialized to the server.
   */
  localFile?: File | null;
  /** Stable idempotency key reused when a failed send is retried. */
  clientMessageId?: string | null;
};

export type ComposerReplyTarget = {
  messageId: string;
  senderName: string | null;
  senderType: ChatSenderType;
  body: string;
  messageKind?: string | null;
};

export type ComposerSendPayload = {
  body: string;
  attachment?: SupportAttachmentPayload | null;
  /** Local file still uploading when send is pressed — parent uploads then sends. */
  file?: File | null;
  replyToMessageId?: string | null;
  /** Stable id reused on retry so the server does not create a duplicate. */
  clientMessageId?: string | null;
};

function avatarTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const tones = [
    "bg-[#1D4B3B] text-[#F2EDE1]",
    "bg-[#E7E0D3] text-[#3E4A44]",
    "bg-[#DCE5DE] text-[#2C4A3B]",
    "bg-[#EFE3DC] text-[#6B3B2B]",
  ];
  return tones[hash % tones.length];
}

export function initialsOf(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  seed,
  className,
}: {
  name: string | null | undefined;
  seed: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full text-[11px] font-semibold tracking-wide",
        avatarTone(seed),
        className ?? "size-9",
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Kiosk platform avatar — the friendly "team" face on the tenant side. */
export function PlatformAvatar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full support-accent-bg font-bold support-accent-ink",
        className ?? "size-9",
      )}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 3.5 21 8v8l-9 4.5L3 16V8l9-4.5Z" strokeLinejoin="round" />
        <path d="M12 12.5 21 8M12 12.5 3 8M12 12.5V21" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// ─── Time helpers ──────────────────────────────────────────────────────────

export function chatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function chatDayLabel(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function listTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return chatTime(iso);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function NewMessagesDivider({ count }: { count?: number }) {
  const label =
    count && count > 1 ? `${count} new messages` : "New messages";
  return (
    <div
      role="separator"
      aria-label={label}
      className="my-4 flex items-center gap-3 px-1"
    >
      <span className="h-px flex-1 bg-border/50" />
      <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
        {label}
      </span>
      <span className="h-px flex-1 bg-border/50" />
    </div>
  );
}

export function DayDivider({ iso }: { iso: string }) {
  return (
    <div className="my-5 flex items-center gap-3 px-1" role="separator" aria-label={chatDayLabel(iso)}>
      <span className="h-px flex-1 bg-border/50" />
      <span className="shrink-0 rounded-full border support-rule support-panel px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] support-muted">
        {chatDayLabel(iso)}
      </span>
      <span className="h-px flex-1 bg-border/50" />
    </div>
  );
}

/** Messages from the same sender within 2 minutes form a visual cluster. */
export const CLUSTER_GAP_MS = 2 * 60 * 1000;

export type ClusterPosition = "single" | "first" | "middle" | "last";

export function getMessageCluster(
  messages: ChatMessageShape[],
  index: number,
  isMine: (message: ChatMessageShape) => boolean,
): { showAvatar: boolean; clusterPosition: ClusterPosition; gapClass: string; mine: boolean } {
  const message = messages[index];
  const mine = isMine(message);
  const prev = messages[index - 1];
  const next = messages[index + 1];

  const sameSender = (a: ChatMessageShape, b: ChatMessageShape) =>
    a.senderUserId === b.senderUserId && a.senderType === b.senderType;

  const withinCluster = (a: ChatMessageShape, b: ChatMessageShape) =>
    sameSender(a, b) &&
    Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) < CLUSTER_GAP_MS &&
    chatDayLabel(a.createdAt) === chatDayLabel(b.createdAt);

  const prevInCluster = prev ? withinCluster(message, prev) : false;
  const nextInCluster = next ? withinCluster(message, next) : false;

  let clusterPosition: ClusterPosition;
  if (!prevInCluster && !nextInCluster) clusterPosition = "single";
  else if (!prevInCluster && nextInCluster) clusterPosition = "first";
  else if (prevInCluster && nextInCluster) clusterPosition = "middle";
  else clusterPosition = "last";

  const showAvatar = !mine && !nextInCluster;
  const gapClass = prevInCluster ? "mt-1" : "mt-4";

  return { showAvatar, clusterPosition, gapClass, mine };
}

function replyAuthorLabel(reply: ChatReplyShape, mine: boolean): string {
  if (reply.senderName?.trim()) return reply.senderName.trim();
  if (reply.senderType === "SUPER_ADMIN") return "Kiosk Support";
  if (reply.senderType === "GUEST") return "Customer";
  return mine ? "You" : "Support";
}

function ReplyQuote({
  reply,
  mine,
  onJump,
}: {
  reply: ChatReplyShape;
  mine: boolean;
  onJump?: () => void;
}) {
  const label = replyAuthorLabel(reply, mine);
  const preview =
    reply.messageKind === "ORDER_CARD"
      ? "Online order"
      : reply.messageKind === "WELCOME_CARD"
        ? "Welcome message"
        : reply.body?.trim() || "Message";

  return (
    <button
      type="button"
      onClick={onJump}
      className={cn(
        "mb-2 flex w-full max-w-full items-stretch gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors",
        mine ? "support-reply-quote--out" : "support-reply-quote--in",
        onJump && "cursor-pointer hover:brightness-[1.03]",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-semibold">{label}</span>
        <span className="support-reply-quote-body mt-0.5 block truncate text-[12px] leading-snug">
          {preview}
        </span>
      </span>
    </button>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────

export function MessageBubble({
  message,
  mine,
  showAvatar,
  clusterPosition = "single",
  onRetry,
  onReply,
  onScrollToMessage,
  highlighted = false,
  staffActions = true,
}: {
  message: ChatMessageShape;
  mine: boolean;
  showAvatar: boolean;
  clusterPosition?: ClusterPosition;
  onRetry?: () => void;
  onReply?: (message: ChatMessageShape) => void;
  onScrollToMessage?: (messageId: string) => void;
  highlighted?: boolean;
  /** When false, hide tenant-only CTAs (e.g. Open order in guest chat). */
  staffActions?: boolean;
}) {
  const isFailed = message.failed === true;
  const isPending = message.pending === true;
  const isOrderCard =
    message.messageKind === "ORDER_CARD" && message.orderCard != null;
  const isWelcomeCard =
    message.messageKind === "WELCOME_CARD" && message.welcomeCard != null;
  const [copied, setCopied] = React.useState(false);

  if (isWelcomeCard) {
    return (
      <div
        className="group flex w-full items-end gap-2 justify-start"
      >
        {showAvatar ? (
          <PlatformAvatar className="mb-5 size-7" />
        ) : (
          <span className="mb-5 size-7 shrink-0" aria-hidden />
        )}
        <div className="flex max-w-[min(88%,22.5rem)] flex-col items-start">
          {message.senderName ? (
            <p className="mb-1 px-0.5 text-[12px] font-medium support-muted">
              {message.senderName}
            </p>
          ) : null}
          <WelcomeCardBubble
            card={message.welcomeCard!}
            createdAt={message.createdAt}
            pending={isPending}
            readAt={message.readAt}
          />
        </div>
      </div>
    );
  }

  if (isOrderCard) {
    return (
      <div
        className={cn(
          "group flex w-full items-end gap-2",
          mine ? "justify-end" : "justify-start",
        )}
      >
        {!mine && showAvatar ? (
          <Avatar name={message.senderName} seed={message.senderUserId} className="mb-5 size-7" />
        ) : !mine ? (
          <span className="mb-5 size-7 shrink-0" aria-hidden />
        ) : null}
        <div className={cn("flex max-w-[min(92%,24rem)] flex-col", mine ? "items-end" : "items-start")}>
          {!mine && message.senderName ? (
            <p className="mb-1 px-0.5 text-[12px] font-medium support-muted">
              {message.senderName}
            </p>
          ) : null}
          <OrderCardBubble
            card={message.orderCard!}
            createdAt={message.createdAt}
            pending={isPending}
            staffActions={staffActions}
          />
        </div>
      </div>
    );
  }

  const showMeta = clusterPosition === "single" || clusterPosition === "last";

  const copyMessage = async () => {
    const text = message.body?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older/insecure contexts: fall back to the hidden-textarea path.
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
      } finally {
        area.remove();
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "group/msg relative flex w-full items-end gap-2",
        mine ? "justify-end" : "justify-start",
        highlighted && "support-message-highlight",
      )}
    >
      {!mine && showAvatar ? (
        <Avatar name={message.senderName} seed={message.senderUserId ?? message.id} className="mb-1 size-7" />
      ) : !mine ? (
        <span className="mb-1 size-7 shrink-0" aria-hidden />
      ) : null}
      <div className={cn("flex min-w-0 max-w-[min(32rem,82%)] flex-col", mine ? "items-end" : "items-start")}>
        {!mine && message.senderName && (clusterPosition === "single" || clusterPosition === "first") ? (
          <p className="mb-1 px-0.5 text-[12px] font-medium support-muted">
            {message.senderName}
          </p>
        ) : null}
        <div className={cn("flex max-w-full items-end gap-1.5", mine && "flex-row-reverse")}>
          <div
            title={chatTime(message.createdAt)}
            className={cn(
              "support-bubble max-w-full",
              mine ? "support-bubble--out" : "support-bubble--in",
              `support-bubble--${clusterPosition}`,
              isPending && "opacity-70",
              isFailed && "border-destructive/40 !bg-destructive/10 !text-foreground opacity-100",
            )}
          >
            {message.replyTo ? (
              <ReplyQuote
                reply={message.replyTo}
                mine={mine}
                onJump={
                  onScrollToMessage
                    ? () => onScrollToMessage(message.replyTo!.messageId)
                    : undefined
                }
              />
            ) : null}
            {message.attachment?.url ? (
              <AttachmentBlock attachment={message.attachment} mine={mine} />
            ) : null}
            {message.body?.trim() ? <MessageBody text={message.body} /> : null}
            {showMeta || isFailed || isPending ? (
              <span className="support-bubble-time mt-1 flex items-center justify-end gap-1 text-[10px] leading-none tabular-nums">
                {showMeta ? <span>{chatTime(message.createdAt)}</span> : null}
                {mine ? (
                  isFailed ? (
                    <span className="font-medium text-destructive">Failed</span>
                  ) : isPending ? (
                    <Clock className="size-3 opacity-80" aria-label="Sending" />
                  ) : message.readAt ? (
                    <CheckCheck className="size-3 opacity-90" aria-label="Read" />
                  ) : (
                    <Check className="size-3 opacity-80" aria-label="Sent" />
                  )
                ) : null}
              </span>
            ) : null}
          </div>
          <div className="mb-0.5 hidden shrink-0 flex-col gap-1 sm:flex">
            {onReply ? (
              <button
                type="button"
                onClick={() => onReply(message)}
                aria-label="Reply to this message"
                title="Reply"
                className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/msg:opacity-100"
              >
                <CornerUpLeft className="size-3.5" />
              </button>
            ) : null}
            {message.body?.trim() ? (
              <button
                type="button"
                onClick={() => void copyMessage()}
                aria-label={copied ? "Copied" : "Copy message"}
                title={copied ? "Copied" : "Copy"}
                className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/msg:opacity-100"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </button>
            ) : null}
          </div>
        </div>
        {isFailed && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 px-1 text-[11px] font-medium text-destructive underline-offset-2 hover:underline"
          >
            Retry
          </button>
        ) : null}
        {(onReply || message.body?.trim()) &&
        (clusterPosition === "single" || clusterPosition === "last") ? (
          <div className="mt-1 flex items-center gap-3 px-1 sm:hidden">
            {onReply ? (
              <button
                type="button"
                onClick={() => onReply(message)}
                aria-label="Reply to this message"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
              >
                <CornerUpLeft className="size-3" aria-hidden />
                Reply
              </button>
            ) : null}
            {message.body?.trim() ? (
              <button
                type="button"
                onClick={() => void copyMessage()}
                aria-label={copied ? "Copied" : "Copy message"}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
              >
                {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </button>
            ) : null}
          </div>
        ) : null}
        <span className="sr-only" role="status">
          {copied ? "Message copied" : ""}
        </span>
      </div>
    </div>
  );
}

function WelcomeCardBubble({
  card,
  createdAt,
  pending,
  readAt,
}: {
  card: ChatWelcomeCardShape;
  createdAt: string;
  pending?: boolean;
  readAt?: string | null;
}) {
  const name = (card.recipientName ?? "").trim() || "there";
  const business = (card.businessName ?? "").trim() || "your shop";
  const helpItems = (card.helpItems ?? []).filter((item) => item.trim().length > 0).slice(0, 6);
  const phone = (card.supportPhone ?? "").trim();
  const email = (card.supportEmail ?? "").trim();
  const phoneHref = phone.replace(/\s+/g, "");

  return (
    <div
      className={cn(
        "relative rounded-[0.9rem] border support-rule support-panel px-4 py-3 text-[13px] leading-[1.55] support-ink",
        pending && "opacity-70",
      )}
    >
      <p className="text-[13.5px] font-semibold text-foreground">
        Hi {name} — welcome to Kiosk.
      </p>
      <p className="mt-1.5 text-foreground/85">
        A real person is here for {business} — setup, your domain, M-Pesa, and
        anything else, with no ticket queue.
      </p>

      {helpItems.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Common asks
          </p>
          <ul className="mt-1.5 space-y-1">
            {helpItems.slice(0, 4).map((item) => (
              <li
                key={item}
                className="flex items-baseline gap-2 text-[12.5px] text-foreground/85"
              >
                <span className="select-none text-primary/60" aria-hidden>
                  —
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-3 text-[12.5px] text-foreground/80">
        Reply here anytime
        {phone ? (
          <>
            , call{" "}
            <a
              href={`tel:${phoneHref}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {phone}
            </a>
          </>
        ) : null}
        {email ? (
          <>
            {phone ? " or" : ", or"} email{" "}
            <a
              href={`mailto:${email}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {email}
            </a>
          </>
        ) : null}
        .
      </p>

      <span className="mt-2 flex items-center justify-end gap-1 text-[10px] leading-none tabular-nums text-muted-foreground">
        <span>{chatTime(createdAt)}</span>
        {readAt ? (
          <CheckCheck className="size-3.5 opacity-90" aria-label="Read" />
        ) : null}
      </span>
    </div>
  );
}

function formatMoney(currency: string | null | undefined, amount: number | string | null | undefined): string {
  if (amount == null || amount === "") return "—";
  const n = typeof amount === "number" ? amount : Number(amount);
  const cur = (currency ?? "").trim() || "KES";
  if (!Number.isFinite(n)) return `${cur} ${String(amount)}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur.length === 3 ? cur : "KES",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${cur} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
}

function qtyLabel(qty: number | string): string {
  const n = typeof qty === "number" ? qty : Number(qty);
  if (!Number.isFinite(n)) return String(qty);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

function OrderCardBubble({
  card,
  createdAt,
  pending,
  staffActions,
}: {
  card: ChatOrderCardShape;
  createdAt: string;
  pending?: boolean;
  staffActions?: boolean;
}) {
  const lines = card.lines ?? [];
  const shown = lines.slice(0, 4);
  const more = Math.max(0, (card.lineCount || lines.length) - shown.length);
  const status = (card.status ?? "").replace(/_/g, " ").toLowerCase();

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border support-rule support-panel",
        pending && "opacity-70",
      )}
    >
      <div className="flex items-start gap-2.5 border-b support-rule px-3.5 py-3">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full support-accent-bg support-accent-ink">
          <ShoppingBag className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
              {card.orderCode}
            </p>
            {status ? (
              <span className="rounded-full border support-rule px-2 py-0.5 text-[9.5px] font-medium capitalize support-muted">
                {status}
              </span>
            ) : null}
          </div>
          {card.branchName ? (
            <p className="text-[11px] text-muted-foreground">{card.branchName}</p>
          ) : null}
        </div>
        <span className="support-bubble-time shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {chatTime(createdAt)}
        </span>
      </div>

      <div className="space-y-1.5 px-3.5 py-3">
        {shown.map((line, i) => (
          <div key={`${line.itemName}-${i}`} className="flex items-baseline justify-between gap-3 text-[13px]">
            <p className="min-w-0 flex-1 truncate text-foreground/90">
              <span className="font-medium tabular-nums text-muted-foreground">
                {qtyLabel(line.quantity)}×
              </span>{" "}
              {line.itemName}
              {line.variantName ? (
                <span className="text-muted-foreground"> · {line.variantName}</span>
              ) : null}
            </p>
            <span className="shrink-0 tabular-nums text-foreground/80">
              {formatMoney(card.currency, line.lineTotal)}
            </span>
          </div>
        ))}
        {more > 0 ? (
          <p className="text-[11px] text-muted-foreground">+{more} more item{more === 1 ? "" : "s"}</p>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-3 border-t support-rule px-3.5 py-3">
        <div className="min-w-0">
          {card.customerPhone ? (
            <p className="truncate text-[11px] text-muted-foreground">{card.customerPhone}</p>
          ) : null}
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
            Total
          </p>
          <p className="text-[16px] font-semibold tabular-nums tracking-[-0.01em] text-foreground">
            {formatMoney(card.currency, card.grandTotal)}
          </p>
        </div>
        {staffActions ? (
          <Link
            href={`${APP_ROUTES.storefrontWebOrders}?q=${encodeURIComponent(card.orderCode)}`}
            className="inline-flex shrink-0 items-center rounded-full support-accent-bg px-3 py-1.5 text-[11px] font-semibold support-accent-ink transition-opacity hover:opacity-90"
          >
            Open order
          </Link>
        ) : null}
      </div>
    </div>
  );
}

// ─── Typing indicator ──────────────────────────────────────────────────────

export function TypingBubble({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex w-full items-end gap-2"
    >
      <span className="mb-1 size-7 shrink-0" aria-hidden />
      <div className="support-bubble support-bubble--in px-3.5 py-2.5">
        <span className="flex items-center gap-1.5" aria-label={label}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="support-typing-dot size-1.5 rounded-full bg-muted-foreground/55"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

// ─── Attachments ───────────────────────────────────────────────────────────

function AttachmentBlock({
  attachment,
  mine,
}: {
  attachment: ChatAttachmentShape;
  mine: boolean;
}) {
  const name = attachment.fileName?.trim() || "Attachment";
  const sizeLabel = formatAttachmentBytes(attachment.bytes);
  const isImage = isSupportImageContentType(attachment.contentType)
    || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(attachment.url);

  if (isImage) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-2 block overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={name}
          className="max-h-56 w-full object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mb-2 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors",
        mine
          ? "bg-primary-foreground/12 hover:bg-primary-foreground/18"
          : "bg-muted/70 hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
          mine ? "bg-primary-foreground/15 text-primary-foreground" : "bg-background text-foreground",
        )}
      >
        <FileText className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium leading-tight">{name}</span>
        {sizeLabel ? (
          <span
            className={cn(
              "mt-0.5 block text-[10px] tabular-nums",
              mine ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {sizeLabel}
          </span>
        ) : null}
      </span>
    </a>
  );
}

// ─── Composer ──────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ["🙂", "😄", "😂", "👍", "❤️", "🙏", "🎉", "🤔", "😅", "😎"];

export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  disabledHint,
  sending,
  accentHex,
  attachmentsEnabled = true,
  replyTo,
  onClearReply,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: (payload: ComposerSendPayload) => void;
  disabled?: boolean;
  disabledHint?: string;
  sending?: boolean;
  /** Optional brand colour for the send button (storefront). */
  accentHex?: string | null;
  attachmentsEnabled?: boolean;
  replyTo?: ComposerReplyTarget | null;
  onClearReply?: () => void;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const emojiRef = React.useRef<HTMLDivElement>(null);

  const autosize = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, []);

  React.useEffect(() => {
    autosize();
  }, [value, autosize]);

  React.useEffect(() => {
    if (!file || !isSupportImageContentType(file.type)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  React.useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [emojiOpen]);

  React.useEffect(() => {
    if (!replyTo) return;
    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [replyTo]);

  const canSend = (value.trim().length > 0 || file != null) && !disabled;

  const clearFile = () => {
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = () => {
    if (!canSend) return;
    onSend({
      body: value.trim(),
      file,
      replyToMessageId: replyTo?.messageId ?? null,
    });
    onChange("");
    clearFile();
    setEmojiOpen(false);
    onClearReply?.();
  };

  const replyPreview =
    replyTo?.messageKind === "ORDER_CARD"
      ? "Online order"
      : replyTo?.messageKind === "WELCOME_CARD"
        ? "Welcome message"
        : replyTo?.body?.trim() || "Message";

  return (
    <div className="mx-auto w-full min-w-0 max-w-[40rem] shrink-0 overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-4">
      {replyTo ? (
        <div className="mb-2 flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-[2px] border support-rule support-panel px-2.5 py-2">
          <span className="w-px shrink-0 self-stretch support-accent-bg" aria-hidden />
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-[11px] font-semibold text-primary">
              Replying to{" "}
              {replyTo.senderName?.trim() ||
                (replyTo.senderType === "SUPER_ADMIN"
                  ? "Kiosk Support"
                  : replyTo.senderType === "GUEST"
                    ? "Customer"
                    : "You")}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{replyPreview}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Cancel reply"
            onClick={onClearReply}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : null}
      {file ? (
        <div className="mb-2 flex items-center gap-2 rounded-xl border support-rule support-panel px-2.5 py-2">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="size-10 rounded-lg object-cover" />
          ) : (
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText className="size-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{file.name}</p>
            <p className="text-[10px] tabular-nums text-muted-foreground">
              {formatAttachmentBytes(file.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-8 rounded-full"
            aria-label="Remove attachment"
            onClick={clearFile}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : null}
      {fileError ? (
        <p className="mb-2 px-1 text-[11px] text-destructive">{fileError}</p>
      ) : null}
      <div
        className={cn(
          "flex w-full min-w-0 max-w-full items-end gap-1 overflow-hidden rounded-[1.35rem] border support-rule support-panel py-1 pl-1 pr-1 transition-[border-color,box-shadow,background-color] duration-150 focus-within:border-[var(--conversation-accent,#1d4b3b)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--conversation-accent,#1d4b3b)_14%,transparent)]",
          disabled && "opacity-60",
        )}
      >
        {attachmentsEnabled ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={SUPPORT_ATTACHMENT_ACCEPT}
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                if (!next) {
                  clearFile();
                  return;
                }
                const err = validateSupportAttachmentFile(next);
                if (err) {
                  setFile(null);
                  setFileError(err);
                  e.target.value = "";
                  return;
                }
                setFileError(null);
                setFile(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mb-0.5 size-9 shrink-0 rounded-full text-muted-foreground hover:bg-[color-mix(in_srgb,var(--conversation-ink,#121a16)_6%,transparent)] hover:text-foreground"
              aria-label="Attach file"
              disabled={disabled || sending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>
          </>
        ) : null}

        <div className="relative" ref={emojiRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mb-0.5 size-9 shrink-0 rounded-full text-muted-foreground hover:bg-[color-mix(in_srgb,var(--conversation-ink,#121a16)_6%,transparent)] hover:text-foreground"
            aria-label="Add emoji"
            aria-expanded={emojiOpen}
            onClick={() => setEmojiOpen((v) => !v)}
            disabled={disabled}
          >
            <Smile className="size-4" />
          </Button>
          {emojiOpen ? (
            <div className="absolute bottom-12 left-0 z-20 w-60 origin-bottom-left rounded-2xl border support-rule support-panel p-1.5 shadow-[0_16px_40px_-24px_rgba(18,26,22,0.45)]">
              <div className="grid grid-cols-5 gap-0.5">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="rounded-xl p-1.5 text-lg transition-colors hover:bg-[color-mix(in_srgb,var(--conversation-ink,#121a16)_6%,transparent)]"
                    onClick={() => {
                      onChange(`${value}${emoji}`);
                      textareaRef.current?.focus();
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={disabled ? (disabledHint ?? "This conversation is closed") : "Write a message…"}
          aria-label={disabled ? (disabledHint ?? "This conversation is closed") : "Write a message"}
          className="max-h-[140px] min-h-[2.5rem] min-w-0 flex-1 basis-0 resize-none bg-transparent px-1.5 py-2 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            const coarse =
              typeof window !== "undefined" &&
              window.matchMedia("(pointer: coarse)").matches;
            if (e.key === "Enter" && !e.shiftKey && !coarse) {
              e.preventDefault();
              submit();
            }
          }}
        />

        <Button
          type="button"
          size="icon"
          className={cn(
            "mb-0.5 size-9 shrink-0 rounded-full transition-transform duration-100 active:scale-[0.96]",
            !canSend && "opacity-40",
          )}
          style={{
            backgroundColor: accentHex || "var(--conversation-accent, var(--primary))",
            color: accentHex
              ? readableInkOn(accentHex)
              : "var(--conversation-accent-ink, var(--primary-foreground))",
          }}
          onClick={submit}
          disabled={!canSend || sending}
          aria-label="Send message"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Resolved banner ───────────────────────────────────────────────────────

export function ResolvedBanner({
  onReopen,
  resolved,
  busy,
}: {
  resolved: boolean;
  onReopen?: () => void;
  busy?: boolean;
}) {
  if (!resolved) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-b support-rule bg-muted/25 px-4 py-2 text-[12px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <Check className="size-3.5 support-accent-text" aria-hidden />
        Conversation resolved
      </span>
      {onReopen ? (
        <button
          type="button"
          disabled={busy}
          onClick={onReopen}
          className="inline-flex h-7 items-center rounded-full border support-rule bg-background px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          Reopen
        </button>
      ) : null}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────

/** Bubble-shaped placeholders so opening a thread does not flash a spinner. */
export function ChatThreadSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[40rem] flex-col gap-2.5 px-1 py-2" aria-hidden>
      <div className="mx-auto mb-2 h-6 w-24 animate-pulse rounded-full bg-muted/70 motion-reduce:animate-none" />
      {[64, 46, 72, 38, 56].map((width, i) => (
        <div
          key={i}
          className={cn(
            "h-10 animate-pulse rounded-[16px] bg-muted/70 motion-reduce:animate-none",
            i % 2 === 1 ? "ml-auto" : "",
          )}
          style={{ width: `${width}%` }}
        />
      ))}
      <span className="sr-only">Loading messages…</span>
    </div>
  );
}

export function ChatEmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
        {icon}
      </div>
      <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
        {title}
      </p>
      <p className="mt-1.5 max-w-[18rem] text-[13px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

/**
 * Soft message-plane background used across guest, tenant, and SA threads.
 * Keeps the conversation area from feeling like an empty white box.
 */
export function ChatThreadSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("support-chat-wallpaper relative min-h-0 flex-1 overflow-hidden", className)}>
      <div className="absolute inset-0 z-[1]">{children}</div>
    </div>
  );
}

/**
 * Merge server-fresh messages into local state without disturbing optimistic
 * (pending/failed) rows — used by silent background sync.
 */
export function mergeByTimestamp(
  local: ChatMessageShape[],
  server: ChatMessageShape[],
): ChatMessageShape[] {
  const serverIds = new Set(server.map((m) => m.id));
  const localsKept = local.filter(
    (m) => m.pending === true || m.failed === true || !serverIds.has(m.id),
  );
  const merged = [...localsKept, ...server].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const seen = new Set<string>();
  return merged.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

export function CloseIcon() {
  return <X className="size-4" />;
}

export function toReplyTarget(message: ChatMessageShape): ComposerReplyTarget {
  return {
    messageId: message.id,
    senderName: message.senderName,
    senderType: message.senderType,
    body: message.body,
    messageKind: message.messageKind ?? "TEXT",
  };
}

export function replyFromRealtime(data: Record<string, unknown>): ChatReplyShape | null {
  const raw = data.replyTo;
  if (!raw || typeof raw !== "object") return null;
  const reply = raw as Record<string, unknown>;
  const messageId = typeof reply.messageId === "string" ? reply.messageId : "";
  if (!messageId) return null;
  return {
    messageId,
    senderType: String(reply.senderType ?? "TENANT") as ChatSenderType,
    senderName: typeof reply.senderName === "string" ? reply.senderName : null,
    body: typeof reply.body === "string" ? reply.body : "",
    messageKind: typeof reply.messageKind === "string" ? reply.messageKind : "TEXT",
  };
}
