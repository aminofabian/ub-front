"use client";

import { Bell } from "lucide-react";

import { getNotificationPresentation } from "@/lib/notification-display";
import { cn } from "@/lib/utils";

export function ShopperPreview({
  notificationType,
  title,
  body,
  actionUrl,
}: {
  notificationType: string;
  title: string;
  body: string;
  actionUrl: string;
}) {
  const preview = getNotificationPresentation({
    notificationType,
    type: notificationType,
    title: title.trim(),
    body: body.trim(),
    payload: { title: title.trim(), body: body.trim(), actionUrl },
  });

  if (!title.trim() && !body.trim()) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border border-border/50 bg-card shadow-sm">
          <Bell className="size-6 text-muted-foreground/50" aria-hidden />
        </span>
        <p className="mt-3 text-sm font-medium text-foreground">Preview your alert</p>
        <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-muted-foreground">
          Add a headline and message to see how shoppers will see this in their account.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[268px]">
      <div className="rounded-[1.65rem] border-[3px] border-foreground/10 bg-muted/25 p-2 shadow-lg ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <div className="rounded-[1.25rem] bg-background px-3 pb-4 pt-5">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Shop account
          </p>
          <div
            className={cn(
              "mt-3 rounded-xl px-3 py-3 shadow-sm",
              "bg-[color-mix(in_srgb,var(--auth-primary)_10%,transparent)]",
              "ring-1 ring-[color-mix(in_srgb,var(--auth-primary)_18%,transparent)]",
            )}
          >
            <div className="flex items-start gap-2">
              <Bell
                className="mt-0.5 size-4 shrink-0 text-[color:var(--auth-primary)]"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-snug text-foreground">
                  {preview.title}
                </p>
                {preview.body ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {preview.body}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">Preview only</p>
        </div>
      </div>
    </div>
  );
}
