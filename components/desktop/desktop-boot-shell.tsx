"use client";

import type { ReactNode } from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { cn } from "@/lib/utils";

type DesktopBootShellProps = {
  message: string;
  title?: string;
  /** When omitted or idle, no progress dots (form-ready state). */
  status?: "loading" | "error" | "success" | "idle";
  children?: ReactNode;
  className?: string;
  /** Wider panel for multi-step setup wizards. */
  wide?: boolean;
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
  wide = false,
}: DesktopBootShellProps) {
  return (
    <main
      className={cn(
        "premium-portal relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10 sm:px-8",
        className,
      )}
      style={{
        background:
          "radial-gradient(120% 80% at 8% 0%, color-mix(in srgb, var(--op-accent) 7%, transparent) 0%, transparent 52%), radial-gradient(90% 70% at 100% 100%, color-mix(in srgb, var(--op-highlight, #a55237) 5%, transparent) 0%, transparent 48%), linear-gradient(165deg, #f7f4ed 0%, #f4f1ea 48%, #f7f4ed 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")",
          backgroundSize: "180px 180px",
        }}
      />

      <div
        className={cn(
          "relative z-[1] flex w-full flex-col items-center gap-5 text-center",
          wide ? "max-w-lg" : "max-w-sm",
        )}
      >
        <KioskLogo
          size="lg"
          variant="auth"
          plain
          showTagline
          tagline="Point of sale"
          layout="inline"
          markClassName={cn(
            "saturate-50",
            status === "loading" && "animate-pulse",
          )}
        />

        <div className="space-y-1.5 px-1">
          {title ? (
            <h1
              className="text-[1.6rem] font-normal tracking-[-0.02em] text-[var(--op-ink)] sm:text-[2rem]"
              style={{
                fontFamily:
                  'var(--font-cormorant), Georgia, "Times New Roman", serif',
              }}
            >
              {title}
            </h1>
          ) : null}
          <p
            className="mx-auto max-w-[38ch] text-[13.5px] leading-[1.7] text-[var(--op-muted)]"
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
                className="h-1.5 w-1.5 rounded-full bg-[var(--op-accent)] animate-pulse"
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
