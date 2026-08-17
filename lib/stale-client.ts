import { CLIENT_BUILD_ID, IS_DESKTOP } from "@/lib/runtime";

export const STALE_CLIENT_USER_MESSAGE =
  "This till needs a refresh. A new version of the app is ready.";

export class StaleClientError extends Error {
  constructor() {
    super(STALE_CLIENT_USER_MESSAGE);
    this.name = "StaleClientError";
  }
}

const listeners = new Set<() => void>();
let flagged = false;

export function isStaleClientFlagged(): boolean {
  return flagged;
}

export function subscribeStaleClient(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyStaleClient(): void {
  if (flagged) {
    return;
  }
  flagged = true;
  for (const listener of listeners) {
    listener();
  }
}

export function isStaleClientError(error: unknown): boolean {
  if (error instanceof StaleClientError) return true;
  if (error instanceof Error && error.name === "StaleClientError") return true;
  return false;
}

/** Next.js / webpack chunk misses after a new deploy. */
export function isStaleAssetError(error: unknown): boolean {
  if (!error) return false;
  const name =
    error instanceof Error ? error.name : typeof error === "object" && error && "name" in error
      ? String((error as { name?: unknown }).name ?? "")
      : "";
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof error === "object" && error && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";
  if (name === "ChunkLoadError") return true;
  return (
    /Loading chunk [\d]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /CSS chunk load error/i.test(message) ||
    /\/_next\/static\//i.test(message)
  );
}

const HTML_PREFIX = /^\s*<(!doctype|html|head|body|pre|div)/i;

export function isHtmlLikeApiBody(
  contentType: string | null,
  bodyText: string,
): boolean {
  const type = (contentType ?? "").toLowerCase();
  if (type.includes("text/html") || type.includes("application/xhtml")) {
    return true;
  }
  const snippet = bodyText.slice(0, 256);
  if (HTML_PREFIX.test(snippet)) return true;
  if (/DEPLOYMENT_NOT_FOUND|NO_DEPLOYMENT_FOUND|APPLICATION_ERROR/i.test(snippet)) {
    return true;
  }
  return false;
}

export function parseClientVersionPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const id = (payload as { buildId?: unknown }).buildId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export function isNewerClientBuild(remoteBuildId: string | null): boolean {
  if (!remoteBuildId || remoteBuildId === "dev") return false;
  if (!CLIENT_BUILD_ID || CLIENT_BUILD_ID === "dev") return false;
  return remoteBuildId !== CLIENT_BUILD_ID;
}

export async function hardReloadTill(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* still reload */
  }
  window.location.reload();
}

const VERSION_PATH = "/api/client-version";
const POLL_MS = 30_000;

export async function checkRemoteClientBuild(): Promise<boolean> {
  if (IS_DESKTOP || typeof window === "undefined") {
    return false;
  }
  try {
    const response = await fetch(VERSION_PATH, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (isHtmlLikeApiBody(response.headers.get("content-type"), text)) {
        notifyStaleClient();
        return true;
      }
      return false;
    }
    const payload = (await response.json()) as unknown;
    if (isNewerClientBuild(parseClientVersionPayload(payload))) {
      notifyStaleClient();
      return true;
    }
  } catch {
    /* network blip — do not force reload */
  }
  return false;
}

export function startStaleClientWatch(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onError = (event: ErrorEvent) => {
    if (isStaleAssetError(event.error) || isStaleAssetError(event.message)) {
      event.preventDefault();
      notifyStaleClient();
    }
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    if (isStaleAssetError(event.reason)) {
      event.preventDefault();
      notifyStaleClient();
    }
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  let timer: number | null = null;
  const poll = () => {
    void checkRemoteClientBuild();
  };
  const schedule = () => {
    if (timer != null) window.clearInterval(timer);
    if (document.visibilityState === "hidden") {
      timer = null;
      return;
    }
    poll();
    timer = window.setInterval(poll, POLL_MS);
  };

  const onVisibility = () => {
    schedule();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", poll);
  schedule();

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", poll);
    if (timer != null) window.clearInterval(timer);
  };
}
