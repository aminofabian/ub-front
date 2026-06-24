"use client";

import type { ReactNode } from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { cn } from "@/lib/utils";

type DesktopBootShellProps = {
  message: string;
  title?: string;
  /** When omitted, no progress indicator is shown (e.g. setup form idle). */
  status?: "loading" | "error" | "success";
  children?: ReactNode;
  className?: string;
};

/**
 * Branded splash for desktop first-run flows — setup wizard, backend boot,
 * and install-status probe. Matches the platform logomark used in the dock
 * icon and PWA manifest.
 */
export function DesktopBootShell({
  message,
  title,
  status = "loading",
  children,
  className,
}: DesktopBootShellProps) {
  return (
    <main
      className={cn(
        "flex min-h-dvh items-center justify-center px-6 py-10",
        "bg-[linear-gradient(145deg,#fafafa_0%,#eef3ef_48%,#f5f7f5_100%)]",
        "dark:bg-[linear-gradient(145deg,#0f1410_0%,#1a221c_48%,#0d120e_100%)]",
        className,
      )}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <KioskLogo
          size="lg"
          variant="auth"
          plain
          showTagline
          tagline="Point of sale"
          layout="inline"
          markClassName={status === "loading" ? "animate-pulse" : undefined}
        />

        <div className="space-y-1.5">
          {title ? (
            <p className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </p>
          ) : null}
          <p
            className="text-sm text-muted-foreground"
            role={status === "loading" ? "status" : undefined}
            aria-live="polite"
          >
            {message}
          </p>
        </div>

        {status === "loading" ? (
          <div className="flex items-center gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary/75 animate-pulse"
                style={{ animationDelay: `${i * 180}ms` }}
              />
            ))}
          </div>
        ) : null}

        {children}
      </div>
    </main>
  );
}
