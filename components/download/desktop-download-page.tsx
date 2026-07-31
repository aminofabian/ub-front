"use client";

import { ArrowLeft, Download, Monitor, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import {
  desktopAppInstallerUrl,
  desktopAppOsLabel,
  desktopAppPlatformsForOs,
  detectDesktopAppOs,
  fetchDesktopAppManifest,
  formatInstallerSize,
  type DesktopAppManifest,
  type DesktopAppOs,
  type DesktopAppPlatform,
} from "@/lib/desktop-app-download";
import {
  detectMobileDeviceOs,
  fetchMobileAppManifest,
  mobileAppInstallerUrl,
  MOBILE_APP_DESCRIPTIONS,
  type MobileAppManifest,
  type MobileDeviceOs,
} from "@/lib/mobile-app-download";
import {
  ghostCtaClass,
  goldCtaClass,
  landingRootStyle,
  sectionLabelPillClass,
} from "@/components/tenant-console/landing/landing-styles";

const ALL_OSES = ["macos", "windows", "linux"] as const;

const WHY_DESKTOP = [
  {
    title: "Works fully offline",
    detail:
      "Sales, stock, and receipts keep working with no internet at all — the app bundles its own database on the till PC.",
  },
  {
    title: "Everything included",
    detail:
      "One installer ships the POS, database, and runtime. No servers to set up, nothing else to install.",
  },
  {
    title: "Fast at the counter",
    detail:
      "Runs on the machine in front of you, so scanning and checkout never wait on a connection.",
  },
] as const;

const MACOS_STEPS = [
  "Open the downloaded .dmg file.",
  "Drag Kiosk into your Applications folder.",
  "First launch: right-click the Kiosk app and choose Open, then confirm.",
] as const;

const WINDOWS_STEPS = [
  "Run the downloaded installer.",
  "If Windows SmartScreen appears, choose “More info” → “Run anyway”.",
  "Launch Kiosk from the Start menu.",
] as const;

const LINUX_STEPS = [
  "Make the AppImage executable (or install the .deb package).",
  "Launch Kiosk from your applications menu or the file itself.",
] as const;

function installSteps(os: DesktopAppOs): readonly string[] {
  if (os === "windows") return WINDOWS_STEPS;
  if (os === "linux") return LINUX_STEPS;
  return MACOS_STEPS;
}

type Loadable<T> = { status: "loading" } | { status: "done"; data: T | null };

const sectionHeadingClass =
  "flex items-center gap-2.5 font-heading text-2xl tracking-[-0.02em]";

const noticeClass =
  "border border-[var(--kiosk-border)] bg-[var(--kiosk-card-bg)] p-5 text-sm leading-relaxed text-[var(--kiosk-text-muted)]";

export function DesktopDownloadPage() {
  const [desktop, setDesktop] = useState<Loadable<DesktopAppManifest>>({
    status: "loading",
  });
  const [mobile, setMobile] = useState<Loadable<MobileAppManifest>>({
    status: "loading",
  });
  const [os, setOs] = useState<DesktopAppOs>("unknown");
  const [deviceOs, setDeviceOs] = useState<MobileDeviceOs>("other");

  useEffect(() => {
    setOs(detectDesktopAppOs());
    setDeviceOs(detectMobileDeviceOs());
    let cancelled = false;
    fetchDesktopAppManifest().then((data) => {
      if (!cancelled) setDesktop({ status: "done", data });
    });
    fetchMobileAppManifest().then((data) => {
      if (!cancelled) setMobile({ status: "done", data });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Phone/tablet visitors can't install the desktop app — lead with mobile.
  const onPhone = deviceOs !== "other";

  const desktopSection = (
    <DesktopSection key="desktop" state={desktop} os={os} muted={onPhone} />
  );
  const mobileSection = (
    <MobileSection key="mobile" state={mobile} deviceOs={deviceOs} />
  );

  return (
    <div
      className="flex min-h-svh flex-col bg-[var(--kiosk-bg)] text-[var(--kiosk-text)]"
      style={landingRootStyle()}
    >
      <header className="flex items-center justify-between border-b border-[var(--kiosk-border-soft)] px-4 py-4 sm:px-10">
        <KioskLogo href="/" size="md" variant="landing" plain />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--kiosk-text-dim)] transition-colors hover:text-[var(--kiosk-text)]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
          Back to home
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-20 pt-10 sm:px-10 sm:pt-16">
        <p className={sectionLabelPillClass}>Get Kiosk</p>

        <h1 className="mt-5 font-heading text-[clamp(1.9rem,6vw,3.2rem)] leading-[1.08] tracking-[-0.03em]">
          Kiosk on every counter — and in every pocket
        </h1>

        <p className="mt-4 max-w-[36rem] text-[15px] leading-[1.7] text-[var(--kiosk-text-muted)] sm:text-[17px]">
          Install the desktop app on your till PC for fully offline selling, or
          put the mobile apps on your phone to run the shop from anywhere.
        </p>

        {onPhone ? [mobileSection, desktopSection] : [desktopSection, mobileSection]}
      </main>
    </div>
  );
}

/* ── Desktop ── */

function DesktopSection({
  state,
  os,
  muted,
}: {
  state: Loadable<DesktopAppManifest>;
  os: DesktopAppOs;
  muted: boolean;
}) {
  const manifest = state.status === "done" ? state.data : null;
  const matches = manifest ? desktopAppPlatformsForOs(manifest, os) : [];

  return (
    <section id="desktop" className="mt-12 scroll-mt-24">
      <h2 className={sectionHeadingClass}>
        <Monitor className="h-5 w-5 text-[var(--kiosk-gold)]" strokeWidth={1.75} aria-hidden />
        Desktop app
      </h2>
      <p className="mt-2 max-w-[34rem] text-sm leading-relaxed text-[var(--kiosk-text-muted)]">
        The full POS installed on the till computer — bundles its own database
        and keeps selling with no internet.
        {muted ? " Open this page on your PC to install it there." : ""}
      </p>

      <div className="mt-6">
        {state.status === "loading" ? (
          <div className={`${ghostCtaClass} pointer-events-none opacity-60`}>
            Checking downloads…
          </div>
        ) : !manifest ? (
          <div className={noticeClass}>
            Desktop installers aren&apos;t published on this server yet.{" "}
            <Link
              href="/help"
              className="text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
            >
              Contact support
            </Link>{" "}
            and we&apos;ll get you a copy.
          </div>
        ) : matches.length > 0 ? (
          <PrimaryDownloads manifest={manifest} platforms={matches} />
        ) : os !== "unknown" ? (
          <div className={noticeClass}>
            Kiosk Desktop isn&apos;t available for {desktopAppOsLabel(os)} yet —
            it&apos;s coming soon. You can grab an installer for another
            platform below.
          </div>
        ) : null}
      </div>

      {manifest ? (
        <ul className="mt-6 divide-y divide-[var(--kiosk-border-soft)] border border-[var(--kiosk-border)]">
          {ALL_OSES.map((platformOs) => {
            const entries = desktopAppPlatformsForOs(manifest, platformOs);
            if (entries.length === 0) {
              return (
                <li
                  key={platformOs}
                  className="flex items-center justify-between gap-4 px-4 py-3.5"
                >
                  <span className="flex items-center gap-2.5 text-sm text-[var(--kiosk-text-dim)]">
                    <Monitor className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    {desktopAppOsLabel(platformOs)}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                    Coming soon
                  </span>
                </li>
              );
            }
            return entries.map((platform) => (
              <li
                key={platform.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
              >
                <span className="flex items-center gap-2.5 text-sm">
                  <Monitor className="h-4 w-4 text-[var(--kiosk-gold)]" strokeWidth={1.75} aria-hidden />
                  {platform.label}
                  <span className="font-mono text-[10px] text-[var(--kiosk-text-faint)]">
                    v{manifest.version} · {formatInstallerSize(platform.sizeBytes)}
                  </span>
                </span>
                <a
                  href={desktopAppInstallerUrl(platform)}
                  download
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--kiosk-gold)] transition-colors hover:text-[var(--kiosk-gold-hover)]"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  Download
                </a>
              </li>
            ));
          })}
        </ul>
      ) : null}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="font-heading text-lg tracking-[-0.02em]">
            How to install
          </h3>
          <ol className="mt-3 flex flex-col gap-2.5">
            {installSteps(os).map((step, i) => (
              <li
                key={step}
                className="flex gap-3 text-sm leading-relaxed text-[var(--kiosk-text-muted)]"
              >
                <span className="font-mono text-[11px] tabular-nums text-[var(--kiosk-gold)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="font-heading text-lg tracking-[-0.02em]">
            Why the desktop app
          </h3>
          <ul className="mt-3 flex flex-col gap-3">
            {WHY_DESKTOP.map((item) => (
              <li key={item.title}>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-[var(--kiosk-text-muted)]">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function PrimaryDownloads({
  manifest,
  platforms,
}: {
  manifest: DesktopAppManifest;
  platforms: DesktopAppPlatform[];
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {platforms.map((platform) => (
        <a
          key={platform.id}
          href={desktopAppInstallerUrl(platform)}
          download
          className={`${goldCtaClass} justify-center px-6 py-3.5`}
        >
          <Download className="h-4 w-4" strokeWidth={2} aria-hidden />
          Download for {platform.label}
        </a>
      ))}
      <span className="font-mono text-[11px] text-[var(--kiosk-text-faint)]">
        v{manifest.version} ·{" "}
        {platforms.map((p) => formatInstallerSize(p.sizeBytes)).join(" / ")}
      </span>
    </div>
  );
}

/* ── Mobile ── */

function MobileSection({
  state,
  deviceOs,
}: {
  state: Loadable<MobileAppManifest>;
  deviceOs: MobileDeviceOs;
}) {
  const manifest = state.status === "done" ? state.data : null;
  const apps = manifest?.apps ?? [];
  const playLink = manifest?.storeLinks.android ?? null;
  const appStoreLink = manifest?.storeLinks.ios ?? null;

  return (
    <section id="mobile" className="mt-12 scroll-mt-24">
      <h2 className={sectionHeadingClass}>
        <Smartphone className="h-5 w-5 text-[var(--kiosk-gold)]" strokeWidth={1.75} aria-hidden />
        Mobile apps
      </h2>
      <p className="mt-2 max-w-[34rem] text-sm leading-relaxed text-[var(--kiosk-text-muted)]">
        Kiosk on your phone — shop as a customer, sell as a cashier, or run the
        whole business from your pocket.
      </p>

      <div className="mt-6">
        {state.status === "loading" ? (
          <div className={`${ghostCtaClass} pointer-events-none opacity-60`}>
            Checking downloads…
          </div>
        ) : deviceOs === "ios" ? (
          appStoreLink ? (
            <a href={appStoreLink} className={`${goldCtaClass} px-6 py-3.5`}>
              <Download className="h-4 w-4" strokeWidth={2} aria-hidden />
              Get it on the App Store
            </a>
          ) : (
            <div className={noticeClass}>
              The iPhone app is coming to the App Store soon. In the meantime
              you can use Kiosk right here in your browser.
            </div>
          )
        ) : apps.length > 0 ? (
          <>
            <ul className="divide-y divide-[var(--kiosk-border-soft)] border border-[var(--kiosk-border)]">
              {apps.map((app) => (
                <li
                  key={app.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2.5 text-sm font-medium">
                      <Smartphone className="h-4 w-4 shrink-0 text-[var(--kiosk-gold)]" strokeWidth={1.75} aria-hidden />
                      {app.name}
                      <span className="font-mono text-[10px] font-normal text-[var(--kiosk-text-faint)]">
                        v{app.version} · {formatInstallerSize(app.sizeBytes)}
                      </span>
                    </span>
                    {MOBILE_APP_DESCRIPTIONS[app.id] ? (
                      <span className="mt-0.5 block pl-[26px] text-[13px] text-[var(--kiosk-text-muted)]">
                        {MOBILE_APP_DESCRIPTIONS[app.id]}
                      </span>
                    ) : null}
                  </span>
                  <a
                    href={mobileAppInstallerUrl(app)}
                    download
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--kiosk-gold)] transition-colors hover:text-[var(--kiosk-gold-hover)]"
                  >
                    <Download className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    Download APK
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--kiosk-text-faint)]">
              Android installs directly from the APK — when prompted, allow
              your browser to install apps. iPhone version is coming to the
              App Store.
            </p>
          </>
        ) : playLink ? (
          <a href={playLink} className={`${goldCtaClass} px-6 py-3.5`}>
            <Download className="h-4 w-4" strokeWidth={2} aria-hidden />
            Get it on Google Play
          </a>
        ) : (
          <div className={noticeClass}>
            The mobile apps are almost here — Android APKs and store listings
            are on the way. Check back soon, or use Kiosk in your phone&apos;s
            browser today.
          </div>
        )}
      </div>
    </section>
  );
}
