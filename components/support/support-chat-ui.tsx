"use client";

import * as React from "react";
import { Check, CheckCheck, Send, Smile, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Shared support-chat primitives ────────────────────────────────────────
// Used by guest, tenant, and super-admin surfaces so every side of the
// conversation speaks the same visual language: calm, exact, readable.

export type ChatSenderType = "TENANT" | "SUPER_ADMIN" | "GUEST";

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
  "bg-emerald-700",
  "bg-teal-700",
  "bg-cyan-700",
  "bg-sky-700",
  "bg-indigo-700",
  "bg-violet-700",
  "bg-fuchsia-700",
  "bg-rose-700",
  "bg-orange-700",
  "bg-amber-700",
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
        "inline-flex shrink-0 select-none items-center justify-center rounded-full text-[11px] font-semibold tracking-wide text-white ring-2 ring-background",
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
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-[0_2px_8px_-2px_rgba(40,167,69,0.45)] ring-2 ring-background",
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
    <div className="my-4 flex items-center gap-3 px-1" role="separator" aria-label={chatDayLabel(iso)}>
      <span className="h-px flex-1 bg-border/70" />
      <span className="shrink-0 text-[11px] font-medium tracking-wide text-muted-foreground">
        {chatDayLabel(iso)}
      </span>
      <span className="h-px flex-1 bg-border/70" />
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────

export function MessageBubble({
  message,
  mine,
  showAvatar,
  onRetry,
}: {
  message: ChatMessageShape;
  mine: boolean;
  showAvatar: boolean;
  onRetry?: () => void;
}) {
  const isFailed = message.failed === true;
  const isPending = message.pending === true;

  return (
    <div
      className={cn(
        "group flex w-full items-end gap-2",
        mine ? "justify-end" : "justify-start",
        "animate-in fade-in slide-in-from-bottom-1 duration-200",
      )}
    >
      {!mine && showAvatar ? (
        <Avatar name={message.senderName} seed={message.senderUserId} className="mb-5 size-7" />
      ) : !mine ? (
        <span className="mb-5 size-7 shrink-0" aria-hidden />
      ) : null}
      <div className={cn("flex max-w-[min(84%,22.5rem)] flex-col", mine ? "items-end" : "items-start")}>
        <div
          className={cn(
            "relative px-3.5 py-2.5 text-[13.5px] leading-[1.45]",
            mine
              ? "rounded-[1.2rem] rounded-br-md bg-primary text-primary-foreground shadow-[0_2px_10px_-4px_rgba(40,167,69,0.55)]"
              : "rounded-[1.2rem] rounded-bl-md border border-border/60 bg-card text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.06)]",
            isPending && "opacity-70",
            isFailed && "border-destructive/40 bg-destructive/5 text-foreground opacity-100 shadow-none",
          )}
        >
          {!mine && message.senderName ? (
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-primary/90">
              {message.senderName}
            </p>
          ) : null}
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.body}</p>
          <span
            className={cn(
              "mt-1.5 flex items-center justify-end gap-1 text-[10px] leading-none tabular-nums",
              mine && !isFailed ? "text-primary-foreground/75" : "text-muted-foreground",
            )}
          >
            <span>{chatTime(message.createdAt)}</span>
            {mine ? (
              isFailed ? (
                <span className="font-medium text-destructive">Failed</span>
              ) : message.readAt ? (
                <CheckCheck className="size-3.5 opacity-95" aria-label="Read" />
              ) : (
                <Check className="size-3.5 opacity-90" aria-label="Sent" />
              )
            ) : null}
          </span>
        </div>
        {isFailed && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 px-1 text-[11px] font-medium text-destructive underline-offset-2 hover:underline"
          >
            Tap to retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Typing indicator ──────────────────────────────────────────────────────

export function TypingBubble({ label }: { label: string }) {
  return (
    <div className="flex w-full items-end gap-2 animate-in fade-in duration-200">
      <span className="mb-1 size-7 shrink-0" aria-hidden />
      <div className="rounded-[1.2rem] rounded-bl-md border border-border/60 bg-card px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
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
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  disabledHint?: string;
  sending?: boolean;
  /** Optional brand colour for the send button (storefront). */
  accentHex?: string | null;
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
    <div className="shrink-0 bg-gradient-to-t from-background via-background to-background/80 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div
        className={cn(
          "flex items-end gap-1 rounded-[1.35rem] border border-border/70 bg-muted/25 py-1.5 pl-1.5 pr-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-primary/35 focus-within:bg-background focus-within:shadow-[0_0_0_3px_rgba(40,167,69,0.12)]",
          disabled && "opacity-60",
        )}
      >
        <div className="relative" ref={emojiRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mb-0.5 size-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Add emoji"
            aria-expanded={emojiOpen}
            onClick={() => setEmojiOpen((v) => !v)}
            disabled={disabled}
          >
            <Smile className="size-4" />
          </Button>
          {emojiOpen ? (
            <div className="absolute bottom-12 left-0 z-20 w-60 origin-bottom-left animate-in fade-in zoom-in-95 duration-150 rounded-2xl border border-border/70 bg-card p-2 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.35)]">
              <div className="grid grid-cols-5 gap-0.5">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="rounded-xl p-1.5 text-lg transition-colors hover:bg-muted"
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
          className="max-h-[120px] min-h-[2.25rem] flex-1 resize-none bg-transparent px-1 py-1.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/80 focus:outline-none disabled:cursor-not-allowed"
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
          className={cn(
            "mb-0.5 size-9 shrink-0 rounded-full transition-transform duration-150",
            canSend && !sending && "hover:scale-105 active:scale-95",
          )}
          style={
            accentHex && canSend
              ? { backgroundColor: accentHex, color: "#fff" }
              : undefined
          }
          onClick={submit}
          disabled={!canSend || sending}
          aria-label="Send message"
        >
          <Send className={cn("size-3.5 transition-transform", canSend && "-translate-x-px translate-y-px")} />
        </Button>
      </div>
      <p className="mt-2 px-1 text-center text-[10px] tracking-wide text-muted-foreground/65">
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
      pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    connecting: {
      label: "Connecting…",
      dot: "bg-amber-500",
      pill: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    reconnecting: {
      label: "Reconnecting…",
      dot: "bg-amber-500",
      pill: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
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
        {state === "connected" ? (
          <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-50", cfg.dot)} />
        ) : null}
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
        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
      >
        <Check className="size-3" />
        Mark resolved
      </button>
    ) : null;
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-b border-border/50 bg-emerald-500/[0.06] px-4 py-2.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
        <Check className="size-3.5 text-emerald-600" aria-hidden />
        Conversation resolved
      </span>
      {onReopen ? (
        <button
          type="button"
          disabled={busy}
          onClick={onReopen}
          className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
        >
          Reopen
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
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-card text-muted-foreground shadow-[0_8px_24px_-16px_rgba(15,23,42,0.35)]">
        {icon}
      </div>
      <p className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-foreground">
        {title}
      </p>
      <p className="mt-1.5 max-w-[18rem] text-sm leading-relaxed text-muted-foreground">{body}</p>
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
    <div
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden",
        "bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(40,167,69,0.07),transparent_55%)] bg-muted/25",
        className,
      )}
    >
      {children}
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
