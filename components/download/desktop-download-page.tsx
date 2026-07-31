"use client";

import { ArrowLeft, Download, Monitor } from "lucide-react";
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

type LoadState =
  | { status: "loading" }
  | { status: "ready"; manifest: DesktopAppManifest }
  | { status: "unavailable" };

export function DesktopDownloadPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [os, setOs] = useState<DesktopAppOs>("unknown");

  useEffect(() => {
    setOs(detectDesktopAppOs());
    let cancelled = false;
    fetchDesktopAppManifest().then((manifest) => {
      if (cancelled) return;
      setState(manifest ? { status: "ready", manifest } : { status: "unavailable" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const manifest = state.status === "ready" ? state.manifest : null;
  const matches = manifest ? desktopAppPlatformsForOs(manifest, os) : [];

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
        <p className={sectionLabelPillClass}>Kiosk Desktop</p>

        <h1 className="mt-5 font-heading text-[clamp(1.9rem,6vw,3.2rem)] leading-[1.08] tracking-[-0.03em]">
          Run Kiosk on this computer
        </h1>

        <p className="mt-4 max-w-[36rem] text-[15px] leading-[1.7] text-[var(--kiosk-text-muted)] sm:text-[17px]">
          The desktop app is the full Kiosk POS installed on your till PC — it
          bundles its own database and keeps selling even with no internet.
          Download it, install it, and you&apos;re at the counter in minutes.
        </p>

        <section className="mt-8">
          {state.status === "loading" ? (
            <div className={`${ghostCtaClass} pointer-events-none opacity-60`}>
              Checking downloads…
            </div>
          ) : state.status === "unavailable" ? (
            <div className="border border-[var(--kiosk-border)] bg-[var(--kiosk-card-bg)] p-5 text-sm leading-relaxed text-[var(--kiosk-text-muted)]">
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
            <PrimaryDownloads manifest={manifest!} platforms={matches} />
          ) : (
            <div className="border border-[var(--kiosk-border)] bg-[var(--kiosk-card-bg)] p-5 text-sm leading-relaxed text-[var(--kiosk-text-muted)]">
              Kiosk Desktop isn&apos;t available for {desktopAppOsLabel(os)}{" "}
              yet — it&apos;s coming soon. You can grab an installer for another
              platform below.
            </div>
          )}
        </section>

        {manifest ? (
          <section className="mt-12">
            <h2 className="font-heading text-xl tracking-[-0.02em]">
              All platforms
            </h2>
            <ul className="mt-4 divide-y divide-[var(--kiosk-border-soft)] border border-[var(--kiosk-border)]">
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
          </section>
        ) : null}

        <section className="mt-12 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="font-heading text-xl tracking-[-0.02em]">
              How to install
            </h2>
            <ol className="mt-4 flex flex-col gap-3">
              {installSteps(os).map((step, i) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed text-[var(--kiosk-text-muted)]">
                  <span className="font-mono text-[11px] tabular-nums text-[var(--kiosk-gold)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="font-heading text-xl tracking-[-0.02em]">
              Why the desktop app
            </h2>
            <ul className="mt-4 flex flex-col gap-4">
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
        </section>
      </main>
    </div>
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
