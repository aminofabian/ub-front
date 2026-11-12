"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchDesktopSyncSummary, type DesktopSyncSummary } from "@/lib/desktop-api";
import { IS_DESKTOP } from "@/lib/runtime";
import { cn } from "@/lib/utils";

const POLL_MS = 20_000;

type Tone = "ok" | "waiting" | "offline" | "attention";

function describe(
  s: DesktopSyncSummary,
  online: boolean,
): { tone: Tone; label: string; title: string } {
  const n = s.pendingSales;
  const waiting = n === 1 ? "1 sale waiting" : `${n} sales waiting`;
  if (s.sessionExpired) {
    return {
      tone: "attention",
      label: "Reconnect needed",
      title:
        "The online shop sign-in has expired. Sales are safe on this PC. Open Settings to reconnect.",
    };
  }
  if (!online) {
    return {
      tone: "offline",
      label: n > 0 ? `Offline · ${waiting}` : "Offline",
      title: "No internet. You can keep selling; sales upload when the connection is back.",
    };
  }
  if (n > 0) {
    return {
      tone: "waiting",
      label: waiting,
      title: "These sales are saved on this PC and will upload shortly.",
    };
  }
  return { tone: "ok", label: "In sync", title: "Everything is uploaded to the online shop." };
}

const DOT: Record<Tone, string> = {
  ok: "bg-emerald-500",
  waiting: "bg-amber-500",
  offline: "bg-zinc-400",
  attention: "bg-red-500",
};

/**
 * Desktop only: one glance at whether this till is in step with the online
 * shop. Hidden on tills that are not connected to one. Seen all day, so the
 * only motion is a colour change on the dot when the state changes.
 */
export function DesktopSyncPill({ className }: { className?: string }) {
  const [summary, setSummary] = useState<DesktopSyncSummary | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (!IS_DESKTOP) return;
    let cancelled = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const s = await fetchDesktopSyncSummary();
        if (!cancelled) setSummary(s);
      } catch {
        // Backend restarting — keep the last known state.
      }
    };
    const onNet = () => {
      setOnline(navigator.onLine);
      void load();
    };
    setOnline(navigator.onLine);
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    window.addEventListener("online", onNet);
    window.addEventListener("offline", onNet);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("online", onNet);
      window.removeEventListener("offline", onNet);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  if (!IS_DESKTOP || !summary?.connected) return null;
  const { tone, label, title } = describe(summary, online);

  return (
    <Link
      href="/settings/desktop"
      title={title}
      aria-label={`Sync: ${label}. ${title}`}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-[11px] font-medium text-foreground",
        "transition-colors duration-150 hover:bg-muted",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full transition-colors duration-200", DOT[tone])}
      />
      <span className="tabular-nums">{label}</span>
    </Link>
  );
}

/**
 * Desktop only: a persistent bar when the online sign-in has expired — the
 * one sync state a shop must not miss, because nothing uploads until someone
 * reconnects.
 */
export function DesktopSyncExpiredBanner() {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!IS_DESKTOP) return;
    let cancelled = false;
    const load = async () => {
      try {
        const s = await fetchDesktopSyncSummary();
        if (!cancelled) setExpired(Boolean(s.connected && s.sessionExpired));
      } catch {
        // ignore
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!IS_DESKTOP || !expired) return null;
  return (
    <div
      role="status"
      className="desktop-banner-in flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-[13px] text-amber-950"
    >
      <span>
        The online shop sign-in has expired. Sales are safe on this PC but are not uploading.
      </span>
      <Link href="/settings/desktop" className="font-semibold underline underline-offset-2">
        Reconnect
      </Link>
    </div>
  );
}
