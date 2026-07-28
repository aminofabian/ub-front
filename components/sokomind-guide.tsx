"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildSokoMindContext,
  fetchSokoMindRouteGuide,
  fetchSokoMindStatus,
  isSokoMindGuideHiddenRoute,
  sendSokoMindChat,
  sendSokoMindFeedback,
  type SokoMindChatMessage,
  type SokoMindStatus,
} from "@/lib/sokomind";

type ThreadItem = SokoMindChatMessage & { requestId?: string; feedback?: "up" | "down" };

export function SokoMindGuide() {
  const pathname = usePathname() || "/";
  const hidden = isSokoMindGuideHiddenRoute(pathname);

  const [status, setStatus] = useState<SokoMindStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        if (hidden || !status?.guideEnabled) return;
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hidden, status?.guideEnabled]);

  useEffect(() => {
    setThread([]);
    setSuggestions([]);
    setError("");
    setInput("");
    if (hidden || !status?.guideEnabled) return;
    void fetchSokoMindRouteGuide(pathname, context.surface)
      .then((g) => setSuggestions(g.suggestions ?? []))
      .catch(() => setSuggestions([]));
  }, [pathname, hidden, status?.guideEnabled, context.surface]);

  const context = useMemo(
    () => buildSokoMindContext(pathname, { locale: status?.defaultLocale ?? "en-KE" }),
    [pathname, status?.defaultLocale],
  );

  const ask = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    setThread((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    try {
      const history = thread.map(({ role, content }) => ({ role, content }));
      const res = await sendSokoMindChat({
        message: trimmed,
        skill: "explain_page",
        context,
        history,
      });
      setThread((prev) => [
        ...prev,
        { role: "assistant", content: res.reply, requestId: res.requestId },
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

  if (hidden || !status?.guideEnabled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open SokoMind Guide"
        title="SokoMind Guide (⌘J)"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 z-40 flex size-12 items-center justify-center rounded-full",
          "bg-foreground text-background shadow-lg transition hover:scale-105",
          "md:bottom-6 md:right-6",
          open && "pointer-events-none opacity-0",
        )}
      >
        <Sparkles className="size-5" aria-hidden />
      </button>

      {open ? (
        <div
          className={cn(
            "fixed bottom-20 right-4 z-50 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden",
            "rounded-2xl border border-border/80 bg-background shadow-2xl",
            "md:bottom-6 md:right-6",
            "h-[min(70vh,32rem)]",
          )}
        >
          <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="size-3.5 shrink-0" aria-hidden />
                SokoMind Guide
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {context.surface} · {pathname}
                {!status.providerConfigured ? " · key missing" : ""}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              onClick={() => setOpen(false)}
              aria-label="Close Guide"
            >
              <X className="size-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {thread.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Ask about this page. Guide uses page facts only — it will not invent balances
                  or stock numbers.
                </p>
                {(suggestions.length
                  ? suggestions
                  : [
                      "What can I do on this page?",
                      "Where should I go next?",
                      "Explain the main actions here",
                    ]
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy || !status.providerConfigured}
                    onClick={() => void ask(s)}
                    className="block w-full rounded-lg border border-dashed px-2.5 py-2 text-left text-xs hover:bg-muted/50 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              thread.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={cn(
                    "rounded-lg px-2.5 py-2 text-sm leading-relaxed",
                    m.role === "user" ? "ml-6 bg-foreground text-background" : "mr-2 bg-muted/60",
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === "assistant" && m.requestId ? (
                    <div className="mt-1.5 flex gap-1">
                      <button
                        type="button"
                        className={cn(
                          "rounded p-1 text-muted-foreground hover:bg-background",
                          m.feedback === "up" && "text-foreground",
                        )}
                        aria-label="Helpful"
                        onClick={() => void onFeedback(m.requestId!, "up")}
                      >
                        <ThumbsUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "rounded p-1 text-muted-foreground hover:bg-background",
                          m.feedback === "down" && "text-foreground",
                        )}
                        aria-label="Not helpful"
                        onClick={() => void onFeedback(m.requestId!, "down")}
                      >
                        <ThumbsDown className="size-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
            {busy ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Thinking…
              </p>
            ) : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            {!status.providerConfigured ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Add an API key in Super Admin → Platform → SokoMind to enable answers.
              </p>
            ) : null}
          </div>

          <form
            className="border-t p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <div className="flex gap-1.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this page…"
                disabled={busy || !status.providerConfigured}
                className="h-9 flex-1 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />
              <Button
                type="submit"
                size="sm"
                disabled={busy || !input.trim() || !status.providerConfigured}
              >
                Ask
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
