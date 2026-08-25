"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Copy, MessageSquarePlus, Send, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildSokoMindContext,
  fetchSokoMindRouteGuide,
  fetchSokoMindStatus,
  inferSokoMindSkill,
  isSokoMindGuideHiddenRoute,
  sendSokoMindChat,
  sendSokoMindFeedback,
  type SokoMindChatMessage,
  type SokoMindStatus,
} from "@/lib/sokomind";

type ThreadItem = SokoMindChatMessage & {
  requestId?: string;
  feedback?: "up" | "down";
  draftBody?: string | null;
  usedLiveData?: boolean;
  toolsUsed?: string[];
  skill?: string;
  /** Epoch ms the message was appended — used for the chat timestamp. */
  at?: number;
};

const THREAD_STORAGE_VERSION = 1;
const MAX_STORED_MESSAGES = 60;

/** Whitelist-restore a persisted thread — never trust raw localStorage contents. */
function sanitizeThread(raw: unknown): ThreadItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ThreadItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    if (m.role !== "user" && m.role !== "assistant") continue;
    if (typeof m.content !== "string" || !m.content.trim()) continue;
    const msg: ThreadItem = { role: m.role, content: m.content };
    if (typeof m.requestId === "string") msg.requestId = m.requestId;
    if (m.feedback === "up" || m.feedback === "down") msg.feedback = m.feedback;
    if (typeof m.draftBody === "string") msg.draftBody = m.draftBody;
    if (typeof m.usedLiveData === "boolean") msg.usedLiveData = m.usedLiveData;
    if (Array.isArray(m.toolsUsed) && m.toolsUsed.every((t) => typeof t === "string")) {
      msg.toolsUsed = m.toolsUsed as string[];
    }
    if (typeof m.skill === "string") msg.skill = m.skill;
    if (typeof m.at === "number" && Number.isFinite(m.at)) msg.at = m.at;
    out.push(msg);
  }
  return out.slice(-MAX_STORED_MESSAGES);
}

/** Floating launch button — lives above the tablet bottom nav until 2xl. */
const FAB_POSITION =
  "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 sm:right-6 2xl:bottom-6 2xl:right-6";

function AssistantAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary",
        className,
      )}
    >
      <Sparkles className="size-3.5" aria-hidden />
    </span>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1" aria-label="Kiosk Guide is typing" role="status">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-pulse rounded-full bg-muted-foreground/70"
          style={{ animationDelay: `${i * 160}ms`, animationDuration: "1.15s" }}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function SokoMindGuide() {
  const pathname = usePathname() || "/";
  const hidden = isSokoMindGuideHiddenRoute(pathname);
  const { branchId, business, me } = useDashboard();

  const [status, setStatus] = useState<SokoMindStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const hydratedKeyRef = useRef<string | null>(null);

  // One saved conversation per business + user — safe on shared shop devices.
  const storageKey =
    business?.id && me?.id
      ? `kiosk.guide.thread.v${THREAD_STORAGE_VERSION}.${business.id}.${me.id}`
      : null;
  const [hydrated, setHydrated] = useState(false);

  // Restore the persisted conversation once per storage scope.
  useEffect(() => {
    if (!storageKey) return;
    let cancelled = false;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { v?: unknown; thread?: unknown };
        if (parsed && parsed.v === THREAD_STORAGE_VERSION && Array.isArray(parsed.thread)) {
          const restored = sanitizeThread(parsed.thread);
          if (!cancelled && restored.length > 0) {
            setThread(restored);
          }
        }
      }
    } catch {
      // Corrupt or unavailable storage — start fresh.
    }
    hydratedKeyRef.current = storageKey;
    if (!cancelled) setHydrated(true);
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  // Persist the conversation so it survives reloads (best-effort).
  useEffect(() => {
    if (!hydrated || !storageKey || storageKey !== hydratedKeyRef.current) return;
    try {
      const keep = thread.slice(-MAX_STORED_MESSAGES);
      if (keep.length === 0) {
        window.localStorage.removeItem(storageKey);
      } else {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ v: THREAD_STORAGE_VERSION, thread: keep }),
        );
      }
    } catch {
      // Quota or private mode — persistence is best-effort.
    }
  }, [thread, hydrated, storageKey]);

  const loadStatus = useCallback(async () => {
    try {
      const next = await fetchSokoMindStatus();
      setStatus(next);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    if (hidden) return;
    void loadStatus();
  }, [hidden, loadStatus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        if (hidden || !status?.guideEnabled) return;
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hidden, open, status?.guideEnabled]);

  // Focus the composer the moment the panel opens.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [open]);

  // Stay pinned to the newest message as the thread grows.
  useEffect(() => {
    const el = threadEndRef.current;
    if (el) {
      el.scrollIntoView({ behavior: open ? "smooth" : "auto", block: "end" });
    }
  }, [thread, busy, open]);

  const context = buildSokoMindContext(pathname, {
    locale: status?.defaultLocale ?? "en-KE",
    entities: {
      ...(branchId ? { branchId } : {}),
      ...(business?.name ? { shopName: business.name } : {}),
    },
  });

  useEffect(() => {
    setSuggestions([]);
    setError("");
    setInput("");
    if (hidden || !status?.guideEnabled) return;
    void fetchSokoMindRouteGuide(pathname, context.surface)
      .then((g) => setSuggestions(g.suggestions ?? []))
      .catch(() => setSuggestions([]));
  }, [pathname, hidden, status?.guideEnabled, context.surface]);

  const ask = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    setThread((prev) => [...prev, { role: "user", content: trimmed, at: Date.now() }]);
    setInput("");
    const started = Date.now();
    try {
      const history = thread.map(({ role, content }) => ({ role, content }));
      const skill = inferSokoMindSkill(trimmed);
      const res = await sendSokoMindChat({
        message: trimmed,
        skill,
        context,
        history,
      });
      // Keep the typing bubble up long enough to read as a real reply.
      const composeWait = Math.max(0, 700 - (Date.now() - started));
      if (composeWait > 0) {
        await new Promise((r) => setTimeout(r, composeWait));
      }
      setThread((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          requestId: res.requestId,
          draftBody: res.draftBody,
          usedLiveData: res.usedLiveData,
          toolsUsed: res.toolsUsed,
          skill: res.skill,
          at: Date.now(),
        },
      ]);
      setSuggestions(res.suggestions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Guide could not answer.");
      setThread((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setBusy(false);
    }
  };

  const onFeedback = async (requestId: string, feedback: "up" | "down") => {
    try {
      await sendSokoMindFeedback(requestId, feedback);
      setThread((prev) =>
        prev.map((m) => (m.requestId === requestId ? { ...m, feedback } : m)),
      );
    } catch {
      // ignore — non-blocking
    }
  };

  const copyDraft = async (requestId: string, draft: string) => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopiedId(requestId);
      window.setTimeout(() => setCopiedId((id) => (id === requestId ? null : id)), 1500);
    } catch {
      setError("Could not copy draft.");
    }
  };

  const formatTime = (epochMs?: number) =>
    epochMs
      ? new Date(epochMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

  const clearThread = () => {
    setThread([]);
    setSuggestions([]);
    setError("");
    if (storageKey) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore — best-effort
      }
    }
  };

  if (hidden || !status?.guideEnabled) {
    return null;
  }

  const providerMissing = !status.providerConfigured;

  return (
    <>
      {!open ? (
        <span
          aria-hidden
          className={cn(
            "fixed z-30 size-12 animate-ping rounded-full bg-primary/35 motion-reduce:hidden",
            FAB_POSITION,
          )}
          style={{ animationDuration: "2.8s" }}
        />
      ) : null}
      <button
        type="button"
        aria-label="Open Kiosk Guide chat"
        aria-expanded={open}
        aria-controls="kiosk-guide-panel"
        title="Ask Kiosk Guide (⌘J)"
        onClick={() => setOpen(true)}
        className={cn(
          "group fixed z-40 flex h-12 items-center gap-2 rounded-full",
          FAB_POSITION,
          "bg-primary pl-3.5 pr-4 text-white",
          "shadow-[0_14px_34px_-12px_rgba(22,101,52,0.7)] ring-1 ring-white/20",
          "transition-all duration-200 ease-out",
          "hover:bg-[var(--primary-hover)] hover:shadow-[0_18px_40px_-12px_rgba(22,101,52,0.75)] hover:scale-[1.04]",
          "active:scale-95",
          open && "pointer-events-none scale-90 opacity-0",
        )}
      >
        <Sparkles className="size-4.5" aria-hidden />
        <span className="text-sm font-semibold tracking-tight">Ask Guide</span>
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-emerald-400 ring-2 ring-background"
        />
      </button>

      <div
        id="kiosk-guide-panel"
        role="dialog"
        aria-modal="false"
        aria-label="Kiosk Guide chat"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-background",
          FAB_POSITION,
          "w-[min(100vw-2rem,23rem)] sm:w-96",
          "h-[min(72dvh,34rem)] max-h-[calc(100dvh-7rem)]",
          "shadow-[0_28px_64px_-20px_rgba(0,0,0,0.4)]",
          "transition-all duration-200 ease-out",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0",
        )}
      >
        <header className="flex items-center gap-2.5 bg-[var(--tablet-header-leaf,#1a3d30)] px-3.5 py-3 text-white">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight">Kiosk Guide</p>
            <p className="flex items-center gap-1.5 text-[11px] text-white/75">
              <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
              Online · replies instantly
            </p>
          </div>
          {thread.length > 0 ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-8 shrink-0 bg-white/15 text-white hover:bg-white/25 hover:text-white"
              onClick={clearThread}
              aria-label="Start a new chat"
              title="Start a new chat"
            >
              <MessageSquarePlus className="size-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="size-8 shrink-0 bg-white/15 text-white hover:bg-white/25 hover:text-white"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            title="Close chat"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div
          className="flex-1 space-y-4 overflow-y-auto px-3.5 py-4"
          aria-live="polite"
        >
          {thread.length === 0 ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <AssistantAvatar className="mt-0.5 size-7" />
                <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border/60 bg-muted/50 px-3.5 py-2.5 text-[13px] leading-relaxed">
                  <p>
                    Hi, I&apos;m Kiosk Guide — your shop assistant. Ask me about this page,
                    request a morning briefing, or draft a message. I use your live shop data
                    when it&apos;s relevant, and I won&apos;t invent balances.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-9">
                {(suggestions.length
                  ? suggestions
                  : [
                      "Give me a morning briefing",
                      "What can I do on this page?",
                      "Draft a polite payment reminder SMS",
                    ]
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy || providerMissing}
                    onClick={() => void ask(s)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            thread.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={cn(
                  "flex gap-2",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {m.role === "assistant" ? <AssistantAvatar className="mt-0.5 size-7" /> : null}
                <div
                  className={cn(
                    "flex max-w-[85%] flex-col",
                    m.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                      m.role === "user"
                        ? "rounded-br-md bg-primary text-white"
                        : "rounded-bl-md border border-border/60 bg-muted/50",
                      m.role === "user"
                        ? "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
                        : "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.role === "assistant" && m.usedLiveData ? (
                      <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                        <span className="size-1 rounded-full bg-emerald-500" aria-hidden />
                        Live data{m.toolsUsed?.length ? ` · ${m.toolsUsed.join(", ")}` : ""}
                      </p>
                    ) : null}
                    {m.role === "assistant" && m.draftBody ? (
                      <div className="mt-2 rounded-xl border border-dashed border-border bg-background/70 p-2.5">
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Draft (review before send)
                        </p>
                        <p className="whitespace-pre-wrap text-xs">{m.draftBody}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 gap-1 text-xs"
                          onClick={() =>
                            m.requestId ? void copyDraft(m.requestId, m.draftBody!) : undefined
                          }
                        >
                          <Copy className="size-3" aria-hidden />
                          {copiedId === m.requestId ? "Copied" : "Copy draft"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  {m.role === "assistant" && m.requestId ? (
                    <div className="mt-1 flex items-center gap-0.5">
                      <button
                        type="button"
                        className={cn(
                          "rounded p-1 text-muted-foreground transition hover:bg-muted",
                          m.feedback === "up" && "text-primary",
                        )}
                        aria-label="Helpful"
                        onClick={() => void onFeedback(m.requestId!, "up")}
                      >
                        <ThumbsUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "rounded p-1 text-muted-foreground transition hover:bg-muted",
                          m.feedback === "down" && "text-destructive",
                        )}
                        aria-label="Not helpful"
                        onClick={() => void onFeedback(m.requestId!, "down")}
                      >
                        <ThumbsDown className="size-3.5" />
                      </button>
                      <span className="pl-1 text-[10px] tabular-nums text-muted-foreground">
                        {formatTime(m.at)}
                      </span>
                    </div>
                  ) : null}
                  {m.role === "user" ? (
                    <span className="mt-1 pr-1 text-[10px] tabular-nums text-muted-foreground">
                      {formatTime(m.at)}
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
          {busy ? (
            <div className="flex gap-2">
              <AssistantAvatar className="mt-0.5 size-7" />
              <div className="rounded-2xl rounded-bl-md border border-border/60 bg-muted/50 px-4 py-3">
                <TypingDots />
              </div>
            </div>
          ) : null}
          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
          {providerMissing ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Add an API key in Super Admin → Platform → SokoMind to enable answers.
            </p>
          ) : null}
          <div ref={threadEndRef} aria-hidden />
        </div>

        <form
          className="border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Kiosk Guide…"
              disabled={busy || providerMissing}
              aria-label="Message Kiosk Guide"
              className="h-10 flex-1 rounded-full border border-input bg-muted/40 px-4 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={busy || !input.trim() || providerMissing}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-[var(--primary-hover)] active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            >
              <Send className="size-4" aria-hidden />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Chat saved on this device · ⌘J to toggle
          </p>
        </form>
      </div>
    </>
  );
}
