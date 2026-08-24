"use client";

import * as React from "react";
import { Check, CheckCheck, Send, Smile, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Shared support-chat primitives ────────────────────────────────────────
// Used by both the tenant chat page and the super-admin inbox so the two sides
// of the conversation speak the same visual language.

export type ChatSenderType = "TENANT" | "SUPER_ADMIN";

export type ChatMessageShape = {
  id: string;
  conversationId: string;
  senderType: ChatSenderType;
  senderUserId: string;
  senderName: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
  /** Optimistic, not yet confirmed by the server. */
  pending?: boolean;
  /** The POST failed; show a retry affordance. */
  failed?: boolean;
};

const AVATAR_HUES = [
  "bg-emerald-600",
  "bg-teal-600",
  "bg-cyan-600",
  "bg-sky-600",
  "bg-indigo-600",
  "bg-violet-600",
  "bg-fuchsia-600",
  "bg-rose-600",
  "bg-orange-600",
  "bg-amber-600",
];

function hueFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_HUES[hash % AVATAR_HUES.length];
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
        "inline-flex shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold text-white",
        hueFor(seed),
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
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-primary font-bold text-primary-foreground",
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

export function DayDivider({ iso }: { iso: string }) {
  return (
    <div className="my-3 flex justify-center">
      <span className="rounded-full bg-muted/90 px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
        {chatDayLabel(iso)}
      </span>
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────

export function MessageBubble({
  message,
  mine,
  showAvatar,
}: {
  message: ChatMessageShape;
  mine: boolean;
  showAvatar: boolean;
}) {
  const isFailed = message.failed === true;
  const isPending = message.pending === true;

  return (
    <div className={cn("flex w-full items-end gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && showAvatar ? (
        <Avatar name={message.senderName} seed={message.senderUserId} className="mb-4 size-7" />
      ) : !mine ? (
        <span className="mb-4 size-7 shrink-0" aria-hidden />
      ) : null}
      <div
        className={cn(
          "relative max-w-[min(82%,22rem)] px-3.5 py-2 text-sm leading-relaxed",
          mine
            ? "rounded-[1.15rem] rounded-br-md bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            : "rounded-[1.15rem] rounded-bl-md border border-border/70 bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
          (isPending || isFailed) && "opacity-80",
        )}
      >
        {!mine && message.senderName ? (
          <p className="mb-0.5 text-[11px] font-semibold text-primary">{message.senderName}</p>
        ) : null}
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.body}</p>
        <span
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px] leading-none",
            mine ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          <span>{chatTime(message.createdAt)}</span>
          {mine ? (
            isFailed ? (
              <span className="text-destructive">Failed</span>
            ) : message.readAt ? (
              <CheckCheck className="size-3.5 opacity-90" aria-label="Read" />
            ) : (
              <Check className="size-3.5" aria-label="Sent" />
            )
          ) : null}
        </span>
      </div>
    </div>
  );
}

// ─── Typing indicator ──────────────────────────────────────────────────────

export function TypingBubble({ label }: { label: string }) {
  return (
    <div className="flex w-full items-end gap-2">
      <div className="rounded-2xl rounded-bl-md border border-border/70 bg-card px-4 py-3 shadow-sm">
        <span className="flex items-center gap-1" aria-label={label}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-pulse rounded-full bg-muted-foreground/70"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
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
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  disabledHint?: string;
  sending?: boolean;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
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
    if (!emojiOpen) return;
    const onDown = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [emojiOpen]);

  const canSend = value.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim());
    onChange("");
    setEmojiOpen(false);
  };

  return (
    <div className="shrink-0 border-t border-border/60 bg-background px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      <div
        className={cn(
          "flex items-end gap-1.5 rounded-[1.75rem] border border-border/80 bg-muted/30 py-1.5 pl-1.5 pr-1.5 transition-colors focus-within:border-ring/50 focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/15",
          disabled && "opacity-60",
        )}
      >
        <div className="relative" ref={emojiRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mb-0.5 size-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Add emoji"
            onClick={() => setEmojiOpen((v) => !v)}
            disabled={disabled}
          >
            <Smile className="size-4" />
          </Button>
          {emojiOpen ? (
            <div className="absolute bottom-12 left-0 z-20 w-60 rounded-2xl border border-border/70 bg-card p-2 shadow-lg">
              <div className="grid grid-cols-5 gap-1">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="rounded-lg p-1.5 text-lg transition-colors hover:bg-muted"
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
          placeholder={disabled ? (disabledHint ?? "This conversation is closed") : "Type a message…"}
          className="max-h-[120px] min-h-[2.25rem] flex-1 resize-none bg-transparent px-1 py-1.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />

        <Button
          type="button"
          size="icon"
          className="mb-0.5 size-9 shrink-0 rounded-full"
          onClick={submit}
          disabled={!canSend || sending}
          aria-label="Send message"
        >
          <Send className="size-4" />
        </Button>
      </div>
      <p className="mt-2 px-1 text-center text-[10px] text-muted-foreground/70">
        Enter to send · Shift+Enter for a new line
      </p>
    </div>
  );
}

// ─── Live status pill ──────────────────────────────────────────────────────

export function LiveStatusPill({
  state,
  className,
}: {
  state: "connected" | "connecting" | "reconnecting" | "disconnected";
  className?: string;
}) {
  const cfg = {
    connected: {
      label: "Live",
      dot: "bg-emerald-500",
      pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    connecting: {
      label: "Connecting…",
      dot: "bg-amber-500",
      pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    reconnecting: {
      label: "Reconnecting…",
      dot: "bg-amber-500",
      pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    disconnected: {
      label: "Offline",
      dot: "bg-muted-foreground/50",
      pill: "bg-muted text-muted-foreground",
    },
  }[state];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        cfg.pill,
        className,
      )}
      title="Realtime connection status"
    >
      <span className="relative flex size-1.5">
        <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", cfg.dot)} />
        <span className={cn("relative inline-flex size-1.5 rounded-full", cfg.dot)} />
      </span>
      {cfg.label}
    </span>
  );
}

// ─── Resolved banner ───────────────────────────────────────────────────────

export function ResolvedBanner({
  onReopen,
  onResolve,
  resolved,
  busy,
}: {
  resolved: boolean;
  onReopen?: () => void;
  onResolve?: () => void;
  busy?: boolean;
}) {
  if (!resolved) {
    return onResolve ? (
      <button
        type="button"
        disabled={busy}
        onClick={onResolve}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
      >
        <Check className="size-3" />
        Mark resolved
      </button>
    ) : null;
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Check className="size-3.5 text-emerald-500" aria-hidden />
        This conversation is resolved.
      </span>
      {onReopen ? (
        <button
          type="button"
          disabled={busy}
          onClick={onReopen}
          className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
        >
          Reopen it
        </button>
      ) : null}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────

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
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-card shadow-sm">
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{body}</p>
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
