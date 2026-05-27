"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side router for the desktop SKU's root URL
 * (see {@code DESKTOP_INSTALLATION.md} §9).
 *
 * <p>The Tauri shell opens the webview at {@code http://127.0.0.1:<port>/},
 * which on the cloud build renders the {@code TenantConsolePage} subdomain-picker.
 * On desktop that screen is misleading — there is only one tenant — so this
 * component runs in its place: it asks the backend whether the install has
 * already been seeded, then redirects to either {@code /setup} (first run) or
 * {@code /login} (returning user).
 *
 * <p>If the status probe fails (backend not up yet, network blip on LAN tills)
 * we surface a small retry UI rather than redirecting to a broken page.
 */
type Status = "loading" | "needs-setup" | "ready" | "error";

export function DesktopRootRedirect() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const ac = new AbortController();

    async function probe() {
      try {
        const res = await fetch("/api/v1/desktop/setup/status", {
          signal: ac.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Setup status check failed (${res.status})`);
        }
        const body = (await res.json()) as { setupRequired?: boolean };
        if (body.setupRequired) {
          setStatus("needs-setup");
          router.replace("/setup");
        } else {
          setStatus("ready");
          router.replace("/login");
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "Could not reach the backend";
        setStatus("error");
        setErrorMessage(message);
      }
    }

    void probe();
    return () => ac.abort();
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
      <div className="max-w-sm space-y-4">
        {status === "loading" || status === "needs-setup" || status === "ready" ? (
          <>
            <div
              className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">
              {status === "needs-setup"
                ? "Opening first-run setup…"
                : status === "ready"
                  ? "Loading sign-in…"
                  : "Checking install status…"}
            </p>
          </>
        ) : (
          <>
            <p className="text-base font-semibold">
              Could not reach the local backend
            </p>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </>
        )}
      </div>
    </main>
  );
}
