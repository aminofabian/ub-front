"use client";

import type { ReactNode } from "react";

import { SuperAdminHubNav } from "@/components/super-admin/super-admin-hub-nav";
import { cn } from "@/lib/utils";

export const SA_CONSOLE_VARS = {
  ["--sa-ink" as string]: "#0f172a",
  ["--sa-accent" as string]: "#6366f1",
  ["--sa-shelf" as string]: "#f1f5f9",
  ["--sa-slip" as string]: "#ffffff",
} as const;

export const SA_SURFACE =
  "overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--sa-ink,#0f172a)_10%,transparent)] bg-white shadow-[0_1px_0_color-mix(in_srgb,var(--sa-ink,#0f172a)_6%,transparent),0_12px_40px_-24px_color-mix(in_srgb,var(--sa-ink,#0f172a)_18%,transparent)]";

export function SuperAdminPageLayout({
  children,
  headerActions,
  headerExtra,
  eyebrow = "Console",
  title,
  description,
  showNav = true,
  className,
}: {
  children: ReactNode;
  headerActions?: ReactNode;
  headerExtra?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  showNav?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative space-y-4 sm:space-y-5", className)} style={SA_CONSOLE_VARS}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 h-52 bg-[radial-gradient(120%_100%_at_10%_-20%,color-mix(in_srgb,var(--sa-accent)_14%,transparent),transparent_58%),linear-gradient(180deg,color-mix(in_srgb,var(--sa-shelf)_88%,#fff),transparent)]"
      />

      <div className="relative space-y-4 sm:space-y-5">
        {showNav ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--sa-ink)_8%,transparent)] bg-[color-mix(in_srgb,var(--sa-slip)_92%,transparent)] p-1 shadow-[0_1px_0_color-mix(in_srgb,var(--sa-ink)_6%,transparent),0_12px_40px_-24px_color-mix(in_srgb,var(--sa-ink)_18%,transparent)] backdrop-blur-sm">
            <SuperAdminHubNav />
          </div>
        ) : null}

        <header className="space-y-2 px-0.5 sm:px-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--sa-ink)_42%,transparent)]">
                {eyebrow}
              </p>
              <h1 className="mt-1 font-heading text-2xl font-semibold tracking-[-0.03em] text-[var(--sa-ink)] sm:text-[1.75rem]">
                {title}
              </h1>
              {description ? (
                <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--sa-ink)_58%,transparent)] sm:text-sm">
                  {description}
                </p>
              ) : null}
            </div>
            {headerActions ? (
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {headerActions}
              </div>
            ) : null}
          </div>
          {headerExtra}
        </header>

        {children}
      </div>
    </div>
  );
}
