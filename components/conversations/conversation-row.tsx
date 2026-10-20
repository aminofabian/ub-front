"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";

import { Avatar } from "@/components/support/support-chat-ui";
import { cn } from "@/lib/utils";

/**
 * One row in a conversation list. Shared by the storefront buyer inbox and the
 * super-admin queue so previews, timestamps, unread badges and resolved state
 * read the same way everywhere.
 */
export function ConversationRow({
  active,
  name,
  seed,
  preview,
  time,
  unread = 0,
  resolved = false,
  phone,
  online,
  onClick,
}: {
  active: boolean;
  name: string;
  seed: string;
  preview: string | null;
  time: string;
  unread?: number;
  resolved?: boolean;
  phone?: string | null;
  online?: boolean | null;
  onClick: () => void;
}) {
  const unreadLabel = unread > 9 ? "9+" : String(unread);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
        active
          ? "bg-primary/[0.07] ring-1 ring-inset ring-primary/15"
          : "hover:bg-muted/45",
        unread > 0 && !active && "bg-primary/[0.035]",
      )}
    >
      <div className="relative shrink-0">
        <Avatar name={name} seed={seed} className="size-11" />
        {online && !resolved ? (
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-emerald-500" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[14px] leading-tight",
            resolved
              ? "text-muted-foreground"
              : unread > 0
                ? "font-semibold text-foreground"
                : "font-medium text-foreground",
          )}
        >
          {name}
        </p>
        <p
          className={cn(
            "mt-1 line-clamp-1 text-[12px] leading-[1.35]",
            unread > 0 ? "font-medium text-foreground/85" : "text-muted-foreground/85",
          )}
        >
          {preview || phone || "No messages yet"}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={cn(
            "text-[10.5px] tabular-nums",
            unread > 0 ? "font-semibold text-primary" : "text-muted-foreground/80",
          )}
        >
          {time}
        </span>
        {unread > 0 ? (
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {unreadLabel}
          </span>
        ) : resolved ? (
          <CheckCircle2 className="size-3.5 text-emerald-500" aria-label="Resolved" />
        ) : null}
        {unread > 0 ? <span className="sr-only">{unreadLabel} unread</span> : null}
      </div>
    </button>
  );
}

/** Placeholder rows that preserve the list's rhythm while the first page loads. */
export function ConversationListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1 p-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl px-3 py-2.5">
          <div className="size-11 shrink-0 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <div className="flex items-center justify-between gap-3">
              <div className="h-3 w-28 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
              <div className="h-2.5 w-8 animate-pulse rounded-full bg-muted/70 motion-reduce:animate-none" />
            </div>
            <div className="h-2.5 w-full max-w-[12rem] animate-pulse rounded-full bg-muted/70 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
