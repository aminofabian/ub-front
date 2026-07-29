"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Copy, Loader2, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  fetchSupplierPortalAiRouteGuide,
  fetchSupplierPortalAiStatus,
  sendSupplierPortalAiChat,
  sendSupplierPortalAiFeedback,
  type SupplierPortalAiStatus,
} from "@/lib/marketplace-api";
import { inferSokoMindSkill, surfaceFromPathname } from "@/lib/sokomind";
import { cn } from "@/lib/utils";

type ThreadItem = {
  role: "user" | "assistant";
  content: string;
  requestId?: string;
  feedback?: "up" | "down";
  draftBody?: string | null;
  usedLiveData?: boolean;
  toolsUsed?: string[];
};

export function SupplierPortalSokoMindGuide() {
  const pathname = usePathname() || "/supplier-portal";
  const [status, setStatus] = useState<SupplierPortalAiStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const surface = useMemo(() => surfaceFromPathname(pathname), [pathname]);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await fetchSupplierPortalAiStatus());
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        if (!status?.guideEnabled) return;
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status?.guideEnabled]);

  useEffect(() => {
    setThread([]);
    setSuggestions([]);
    setError("");
    setInput("");
    if (!status?.guideEnabled) return;
    void fetchSupplierPortalAiRouteGuide(pathname, surface)
      .then((g) => setSuggestions(g.suggestions ?? []))
      .catch(() => setSuggestions([]));
  }, [pathname, surface, status?.guideEnabled]);

  const ask = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    setThread((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    try {
      const history = thread.map(({ role, content }) => ({ role, content }));
      const res = await sendSupplierPortalAiChat({
        message: trimmed,
        skill: inferSokoMindSkill(trimmed),
        context: {
          surface,
          route: pathname,
          locale: status?.defaultLocale ?? "en-KE",
        },
        history,
      });
      setThread((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          requestId: res.requestId,
          draftBody: res.draftBody,
          usedLiveData: res.usedLiveData,
          toolsUsed: res.toolsUsed,
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

  if (!status?.guideEnabled) {
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
          "fixed right-4 z-40 flex size-12 items-center justify-center rounded-full",
          "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-5",
          "bg-[var(--pos-ink,#1c1915)] text-[#faf8f4] shadow-lg transition hover:scale-105 active:scale-95",
          open && "pointer-events-none opacity-0",
        )}
      >
        <Sparkles className="size-5" aria-hidden />
      </button>

      {open ? (
        <div
          className={cn(
            "fixed inset-x-3 z-50 flex h-[min(72dvh,34rem)] flex-col sm:inset-x-auto sm:right-4 sm:w-[min(100vw-2rem,22rem)]",
            "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-5",
            "overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
            "bg-[#faf8f4] shadow-2xl",
          )}
        >
          <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="size-3.5 shrink-0" aria-hidden />
                SokoMind Guide
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Supplier portal · {surface}
                {!status.providerConfigured ? " · key missing" : ""}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {thread.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Ask about shops you supply, balances, or draft a message. Uses your portal data
                  only.
                </p>
                {(suggestions.length
                  ? suggestions
                  : [
                      "Which shops owe me the most?",
                      "Give me a morning briefing",
                      "Draft a polite payment follow-up",
                    ]
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy || !status.providerConfigured}
                    onClick={() => void ask(s)}
                    className="block w-full rounded-lg border border-dashed px-2.5 py-2 text-left text-xs hover:bg-white/70 disabled:opacity-50"
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
                    m.role === "user"
                      ? "ml-6 bg-[var(--pos-ink,#1c1915)] text-[#faf8f4]"
                      : "mr-2 bg-white/80",
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === "assistant" && m.usedLiveData ? (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Live data
                      {m.toolsUsed?.length ? ` · ${m.toolsUsed.join(", ")}` : ""}
                    </p>
                  ) : null}
                  {m.role === "assistant" && m.draftBody ? (
                    <div className="mt-2 rounded-md border border-dashed bg-[#faf8f4] p-2">
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Draft
                      </p>
                      <p className="whitespace-pre-wrap text-xs">{m.draftBody}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 gap-1 text-xs"
                        onClick={async () => {
                          if (!m.requestId || !m.draftBody) return;
                          try {
                            await navigator.clipboard.writeText(m.draftBody);
                            setCopiedId(m.requestId);
                          } catch {
                            setError("Could not copy.");
                          }
                        }}
                      >
                        <Copy className="size-3" />
                        {copiedId === m.requestId ? "Copied" : "Copy draft"}
                      </Button>
                    </div>
                  ) : null}
                  {m.role === "assistant" && m.requestId ? (
                    <div className="mt-1.5 flex gap-1">
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-[#faf8f4]"
                        aria-label="Helpful"
                        onClick={() =>
                          void sendSupplierPortalAiFeedback(m.requestId!, "up").then(() =>
                            setThread((prev) =>
                              prev.map((x) =>
                                x.requestId === m.requestId ? { ...x, feedback: "up" } : x,
                              ),
                            ),
                          )
                        }
                      >
                        <ThumbsUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-[#faf8f4]"
                        aria-label="Not helpful"
                        onClick={() =>
                          void sendSupplierPortalAiFeedback(m.requestId!, "down").then(() =>
                            setThread((prev) =>
                              prev.map((x) =>
                                x.requestId === m.requestId ? { ...x, feedback: "down" } : x,
                              ),
                            ),
                          )
                        }
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
                <Loader2 className="size-3.5 animate-spin" /> Thinking…
              </p>
            ) : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
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
                placeholder="Ask or draft…"
                disabled={busy || !status.providerConfigured}
                className="h-9 flex-1 rounded-md border bg-white px-2.5 text-sm outline-none disabled:opacity-50"
              />
              <Button type="submit" size="sm" disabled={busy || !input.trim() || !status.providerConfigured}>
                Ask
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
