/**
 * Storefront PWA install — capture Chromium's native prompt, detect iOS
 * add-to-home-screen, and register the shopper service worker.
 *
 * The deferred prompt is stored at module scope so it survives the modal
 * opening after the event has already fired.
 */

export const STOREFRONT_SW_URL = "/sw-storefront.js";
export const STOREFRONT_MANIFEST_HREF = "/storefront-manifest.webmanifest";

export type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type PwaInstallKind =
  | "standalone"
  | "prompt"
  | "ios"
  | "android-manual"
  | "unavailable";

export type PwaInstallPhase =
  | "idle"
  | "preparing"
  | "prompting"
  | "installed"
  | "dismissed";

type Listener = () => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedThisSession = false;
let captureBound = false;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function readUserAgent(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent || "";
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  );
}

export function detectPwaInstallKind(
  ua = readUserAgent(),
  standalone = isStandaloneDisplay(),
  hasPrompt = deferredPrompt != null,
): PwaInstallKind {
  if (standalone || installedThisSession) return "standalone";
  const ios = /iPhone|iPad|iPod/i.test(ua);
  if (ios) return "ios";
  if (hasPrompt) return "prompt";
  if (/Android/i.test(ua)) return "android-manual";
  return "unavailable";
}

export function hasDeferredPwaPrompt(): boolean {
  return deferredPrompt != null;
}

export function subscribePwaInstall(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function captureStorefrontInstallPrompt(): void {
  if (typeof window === "undefined" || captureBound) return;
  captureBound = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installedThisSession = true;
    notify();
  });
}

export async function registerStorefrontServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing?.active?.scriptURL?.includes("sw-storefront.js")) {
      return true;
    }
    const registration = await navigator.serviceWorker.register(STOREFRONT_SW_URL, {
      scope: "/",
    });
    await registration.update().catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

export async function promptStorefrontPwaInstall(): Promise<
  "accepted" | "dismissed" | "unavailable"
> {
  const event = deferredPrompt;
  if (!event) return "unavailable";
  deferredPrompt = null;
  notify();
  try {
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      installedThisSession = true;
      notify();
      return "accepted";
    }
    notify();
    return "dismissed";
  } catch {
    notify();
    return "unavailable";
  }
}
