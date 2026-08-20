"use client";

import { Download, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  desktopAppInstallerUrl,
  desktopAppOsLabel,
  desktopAppPlatformsForOs,
  detectDesktopAppOs,
  fetchDesktopAppManifest,
  formatInstallerSize,
} from "@/lib/desktop-app-download";
import { detectMobileDeviceOs } from "@/lib/mobile-app-download";
import { ghostCtaClass } from "./landing-styles";

type DirectDownload = {
  href: string;
  label: string;
  caption: string;
};

/**
 * "Download" button for the landing hero.
 *
 * Phones/tablets get "Get the mobile app" → /download#mobile. On desktop,
 * when exactly one published installer matches the visitor's OS the button
 * downloads it directly (one click → installer on disk); otherwise it goes
 * to /download where every platform is listed. The manifest is fetched
 * client-side, so the button is a safe link until that resolves.
 */
export function LandingDesktopDownloadLink() {
  const [onPhone, setOnPhone] = useState(false);
  const [direct, setDirect] = useState<DirectDownload | null>(null);

  useEffect(() => {
    if (detectMobileDeviceOs() !== "other") {
      setOnPhone(true);
      return;
    }
    let cancelled = false;
    fetchDesktopAppManifest().then((manifest) => {
      if (cancelled || !manifest) return;
      const matches = desktopAppPlatformsForOs(manifest, detectDesktopAppOs());
      if (matches.length === 1) {
        setDirect({
          href: desktopAppInstallerUrl(matches[0]),
          label: `Download for ${desktopAppOsLabel(matches[0].os)}`,
          caption: `v${manifest.version} · ${formatInstallerSize(
            matches[0].sizeBytes,
          )} · works offline`,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const buttonClass = `${ghostCtaClass} px-6 py-3.5`;

  if (onPhone) {
    return (
      <Link href="/download#mobile" className={buttonClass}>
        <Smartphone className="h-4 w-4 text-[var(--kiosk-gold)]" strokeWidth={2} aria-hidden />
        Get the mobile app
      </Link>
    );
  }

  const icon = (
    <Download className="h-4 w-4 text-[var(--kiosk-gold)]" strokeWidth={2} aria-hidden />
  );

  if (direct) {
    return (
      <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <a href={direct.href} download className={buttonClass}>
          {icon}
          <span className="font-medium">{direct.label}</span>
        </a>
        <span className="font-mono text-[11px] text-[var(--kiosk-text-faint)]">
          {direct.caption}
        </span>
      </div>
    );
  }

  return (
    <Link href="/download" className={buttonClass}>
      {icon}
      <span className="font-medium">Download the desktop app</span>
    </Link>
  );
}
