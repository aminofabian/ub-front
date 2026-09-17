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
        "relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10 sm:px-8",
        className,
      )}
      style={{
        background:
          "radial-gradient(120% 80% at 10% 0%, #e8f2ea 0%, transparent 55%), radial-gradient(90% 70% at 100% 100%, #dfe8e2 0%, transparent 50%), linear-gradient(165deg, #f7faf7 0%, #eef3ef 45%, #f4f6f4 100%)",
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
          markClassName={status === "loading" ? "animate-pulse" : undefined}
        />

        <div className="space-y-1.5 px-1">
          {title ? (
            <h1
              className="text-[1.35rem] font-semibold tracking-[-0.02em] text-foreground sm:text-2xl"
              style={{ fontFamily: "var(--font-heading), sans-serif" }}
            >
              {title}
            </h1>
          ) : null}
          <p
            className="mx-auto max-w-[36ch] text-sm leading-relaxed text-[#3d4a40]"
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
                className="h-1.5 w-1.5 rounded-full bg-[#1f7a3a]/75 animate-pulse"
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
