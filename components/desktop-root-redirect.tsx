"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { DesktopBootShell } from "@/components/desktop/desktop-boot-shell";
import { APP_ROUTES } from "@/lib/config";

/**
 * Client-side router for the desktop SKU's root URL
 * (see {@code DESKTOP_INSTALLATION.md} §9).
 *
 * <p>The Tauri shell opens the webview at {@code http://127.0.0.1:<port>/},
 * which on the cloud build renders the {@code TenantConsolePage} subdomain-picker.
 * On desktop that screen is misleading — there is only one tenant — so this
 * component runs in its place: it asks the backend whether the install has
 * already been seeded, then redirects to either {@code /setup} (first run) or
 * {@code /login/staff} (returning user).
 *
 * <p>MariaDB + JVM startup can take tens of seconds on first launch, so failed
 * probes retry with backoff instead of surfacing an error immediately.
 */
type Status = "loading" | "needs-setup" | "ready" | "error";

const MAX_ATTEMPTS = 40;
const INITIAL_DELAY_MS = 400;
const MAX_DELAY_MS = 2500;

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function loadingMessage(attempt: number): string {
  if (attempt <= 1) return "Starting Kiosk on this PC…";
  if (attempt <= 4) return "Starting local database and services…";
  if (attempt <= 10) return "Almost ready — first launch can take a minute.";
  return "Still starting — check that Kiosk is allowed to run locally.";
}

export function DesktopRootRedirect() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState(loadingMessage(0));
  const [errorMessage, setErrorMessage] = useState("");
  const attemptRef = useRef(0);

  const probe = useCallback(
    async (signal: AbortSignal) => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        if (signal.aborted) return;
        attemptRef.current = attempt;
        setMessage(loadingMessage(attempt));

        try {
          const res = await fetch("/api/v1/desktop/setup/status", {
            signal,
            headers: { Accept: "application/json" },
            cache: "no-store",
          });
          if (!res.ok) {
            throw new Error(`Setup status check failed (${res.status})`);
          }
          const body = (await res.json()) as { setupRequired?: boolean };
          if (body.setupRequired) {
            setStatus("needs-setup");
            setMessage("Opening first-run setup…");
            router.replace("/setup");
          } else {
            setStatus("ready");
            setMessage("Loading sign-in…");
            router.replace(APP_ROUTES.staffLogin);
          }
          return;
        } catch (err) {
          if (signal.aborted) return;
          const isLast = attempt >= MAX_ATTEMPTS - 1;
          if (!isLast) {
            const backoff = Math.min(
              INITIAL_DELAY_MS * 1.35 ** attempt,
              MAX_DELAY_MS,
            );
            await delay(backoff, signal);
            continue;
          }
          const detail =
            err instanceof Error ? err.message : "Could not reach the backend";
          setStatus("error");
          setErrorMessage(detail);
        }
      }
    },
    [router],
  );

  useEffect(() => {
    const ac = new AbortController();
    void probe(ac.signal);
    return () => ac.abort();
  }, [probe]);

  const retry = useCallback(() => {
    setStatus("loading");
    setErrorMessage("");
    setMessage(loadingMessage(0));
    attemptRef.current = 0;
    const ac = new AbortController();
    void probe(ac.signal);
  }, [probe]);

  if (status === "error") {
    return (
      <DesktopBootShell
        title="Could not reach the local backend"
        message={errorMessage}
        status="error"
      >
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          onClick={retry}
        >
          Retry
        </button>
      </DesktopBootShell>
    );
  }

  return <DesktopBootShell message={message} status="loading" />;
}
