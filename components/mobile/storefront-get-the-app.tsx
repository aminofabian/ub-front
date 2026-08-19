"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Download,
  Loader2,
  MoreHorizontal,
  Plus,
  Share,
  Smartphone,
} from "lucide-react";

import { DesktopLanQr } from "@/components/desktop/desktop-lan-qr";
import styles from "@/components/mobile/pwa-install-stage.module.css";
import { Button } from "@/components/ui/button";
import { formatInstallerSize } from "@/lib/desktop-app-download";
import {
  detectMobileDeviceOs,
  mobileAppInstallerUrl,
  type MobileAppEntry,
} from "@/lib/mobile-app-download";
import {
  detectPwaInstallKind,
  hasDeferredPwaPrompt,
  promptStorefrontPwaInstall,
  registerStorefrontServiceWorker,
  subscribePwaInstall,
  type PwaInstallKind,
} from "@/lib/pwa-install";
import type { PublicMobileConfig } from "@/lib/public-mobile-config";
import { cn } from "@/lib/utils";

type Lane = "instant" | "android";

type Props = {
  config: PublicMobileConfig;
  apk?: MobileAppEntry;
  className?: string;
};

function initialKind(): PwaInstallKind {
  return detectPwaInstallKind(
    typeof navigator === "undefined" ? "" : navigator.userAgent,
    false,
    false,
  );
}

function letterMark(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : "S";
}

export function StorefrontGetTheApp({ config, apk, className }: Props) {
  const shopName = config.displayName.trim() || "this shop";
  const logo = config.branding.logoUrl?.trim() || null;
  const accent =
    config.branding.primaryColor?.trim() &&
    /^#[0-9a-fA-F]{6}$/.test(config.branding.primaryColor.trim())
      ? config.branding.primaryColor.trim()
      : "#28A745";
  const [device, setDevice] = useState<"android" | "ios" | "other">("other");
  const [kind, setKind] = useState<PwaInstallKind>(initialKind);
  const [lane, setLane] = useState<Lane>("instant");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "installed" | "dismissed">(
    "idle",
  );

  useEffect(() => {
    setDevice(detectMobileDeviceOs());
    const sync = () => setKind(detectPwaInstallKind());
    sync();
    return subscribePwaInstall(sync);
  }, []);

  const onInstant = useCallback(async () => {
    setLane("instant");
    if (kind === "standalone" || phase === "installed") return;
    if (kind === "ios") return;
    setBusy(true);
    await registerStorefrontServiceWorker();
    const started = Date.now();
    while (!hasDeferredPwaPrompt() && Date.now() - started < 2000) {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }
    const result = await promptStorefrontPwaInstall();
    setBusy(false);
    if (result === "accepted") setPhase("installed");
    if (result === "dismissed") setPhase("dismissed");
    setKind(detectPwaInstallKind());
  }, [kind, phase]);

  const showAndroid = device !== "ios";
  const installed = kind === "standalone" || phase === "installed";
  const deepLink = config.deepLinks.universalShop || config.deepLinks.shopper;

  const cta = useMemo(() => {
    if (lane === "android") {
      if (!apk) {
        return {
          label: "Android installer is not on this site yet",
          disabled: true,
          href: undefined as string | undefined,
        };
      }
      return {
        label: `Download Android app · v${apk.version}`,
        disabled: false,
        href: mobileAppInstallerUrl(apk),
      };
    }
    if (installed) {
      return { label: `Open ${shopName} from your home screen`, disabled: true };
    }
    if (kind === "prompt") {
      return { label: `Add ${shopName} to home screen`, disabled: busy };
    }
    if (kind === "ios") {
      return { label: "Use Share → Add to Home Screen", disabled: true };
    }
    if (kind === "android-manual") {
      return { label: busy ? "Preparing install…" : `Install ${shopName}`, disabled: busy };
    }
    return {
      label: busy ? "Preparing install…" : `Install ${shopName}`,
      disabled: busy,
    };
  }, [apk, busy, installed, kind, lane, shopName]);

  return (
    <div className={cn("space-y-5", className)}>
      <div
        className={styles.phone}
        style={{ ["--pwa-accent-soft" as string]: `${accent}55` }}
      >
        <div className={styles.notch} aria-hidden />
        <div className={styles.wallpaper}>
          <div className={styles.grid} data-single={showAndroid ? "false" : "true"}>
            <button
              type="button"
              className={styles.iconBtn}
              data-selected={lane === "instant" ? "true" : "false"}
              data-installed={lane === "instant" && installed ? "true" : "false"}
              onClick={() => void onInstant()}
              aria-pressed={lane === "instant"}
              aria-label={`Instant app — ${shopName}`}
            >
              <span
                className={styles.glyph}
                style={{ backgroundColor: accent }}
              >
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" />
                ) : (
                  <span className={styles.letter}>{letterMark(shopName)}</span>
                )}
              </span>
              <span className={styles.label}>Instant</span>
            </button>
            {showAndroid ? (
              <button
                type="button"
                className={styles.iconBtn}
                data-selected={lane === "android" ? "true" : "false"}
                onClick={() => setLane("android")}
                aria-pressed={lane === "android"}
                aria-label="Android app installer"
              >
                <span className={styles.glyph} style={{ backgroundColor: "#1f3d2a" }}>
                  <Smartphone className="size-6 text-white" aria-hidden />
                </span>
                <span className={styles.label}>Android</span>
              </button>
            ) : null}
          </div>
          <div className={styles.dock} aria-hidden>
            <span className={styles.dockDot} data-on={lane === "instant" ? "true" : "false"} />
            <span className={styles.dockDot} data-on={installed ? "true" : "false"} />
            <span className={styles.dockDot} data-on={lane === "android" ? "true" : "false"} />
          </div>
        </div>
        <div className={styles.homebar} aria-hidden />
      </div>

      <div className="space-y-2">
        <h3 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground">
          {lane === "android"
            ? "Install the Android app"
            : installed
              ? `${shopName} is on this phone`
              : `Add ${shopName} like an app`}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {lane === "android"
            ? apk
              ? `Saves the installer (${formatInstallerSize(apk.sizeBytes)}). Open the file, then scan below to jump into this store.`
              : "The native installer is not published on this site yet. Use Instant to add the shop to your home screen now."
            : installed
              ? "Look for the icon on your home screen. It opens this shop full-screen, no browser chrome."
              : kind === "ios"
                ? "Safari cannot auto-install. Tap Share at the bottom of the browser, then Add to Home Screen."
                : kind === "prompt"
                  ? "One tap opens the system install sheet. No Play Store, no APK — it lands on your home screen in seconds."
                  : kind === "android-manual"
                    ? "Chrome hid the install sheet. Open the three-dot menu and choose Install app / Add to Home screen."
                    : "On a computer, scan the code with your phone, then tap Instant. Chrome and Edge can also install it here."}
        </p>
      </div>

      {lane === "instant" && kind === "ios" ? (
        <ol className="grid gap-2">
          <GuideStep n={1} icon={Share} title="Tap Share" body="The square with the arrow, in Safari’s toolbar." />
          <GuideStep n={2} icon={Plus} title="Add to Home Screen" body="Scroll the sheet if you don’t see it at first." />
          <GuideStep n={3} icon={Check} title={`Open ${shopName}`} body="The icon appears on your home screen like any other app." />
        </ol>
      ) : null}

      {lane === "instant" && kind === "android-manual" ? (
        <ol className="grid gap-2">
          <GuideStep n={1} icon={MoreHorizontal} title="Open Chrome’s menu" body="The three dots at the top-right of the browser." />
          <GuideStep n={2} icon={Download} title="Install app" body="Choose Install app or Add to Home screen." />
          <GuideStep n={3} icon={Check} title={`Open ${shopName}`} body="Confirm, then look for the new icon on your home screen." />
        </ol>
      ) : null}

      {lane === "android" && apk ? (
        <Button asChild size="lg" className="h-11 w-full gap-2 text-sm">
          <a href={cta.href} download={apk.url ? undefined : apk.file}>
            <Download className="size-4" aria-hidden />
            {cta.label}
          </a>
        </Button>
      ) : kind === "ios" && lane === "instant" && !installed ? null : (
        <Button
          type="button"
          size="lg"
          className="h-11 w-full gap-2 text-sm"
          disabled={cta.disabled}
          onClick={() => void onInstant()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : installed ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          {busy ? "Installing…" : cta.label}
        </Button>
      )}

      {phase === "dismissed" && lane === "instant" ? (
        <p className="text-center text-xs text-muted-foreground">
          Install was cancelled. Tap Instant again when you’re ready.
        </p>
      ) : null}

      {device === "other" ? (
        <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/30 p-3">
          <div className="shrink-0 rounded-lg border border-border/60 bg-white p-1.5">
            <DesktopLanQr url={typeof window === "undefined" ? deepLink : window.location.href} size={96} />
          </div>
          <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
            On a computer? Scan to open this page on your phone, then tap Instant.
          </p>
        </div>
      ) : null}

      {device === "ios" && config.platformStoreLinks.ios ? (
        <p className="text-center text-xs text-muted-foreground">
          Prefer the App Store?{" "}
          <a
            href={config.platformStoreLinks.ios}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Open listing
          </a>
        </p>
      ) : null}
    </div>
  );
}

function GuideStep({
  n,
  icon: Icon,
  title,
  body,
}: {
  n: number;
  icon: typeof Share;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Icon className="size-3.5 text-muted-foreground" aria-hidden />
          {title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}
