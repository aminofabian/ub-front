"use client";

import { Download, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  desktopAppInstallerUrl,
  desktopAppPlatformsForOs,
  detectDesktopAppOs,
  fetchDesktopAppManifest,
} from "@/lib/desktop-app-download";
import { detectMobileDeviceOs } from "@/lib/mobile-app-download";

const linkClass =
  "group inline-flex items-center gap-2 text-[13px] text-[var(--kiosk-text-dim)] transition-colors duration-200 hover:text-[var(--kiosk-gold)] sm:text-sm";

const iconClass = "h-3.5 w-3.5 text-[var(--kiosk-gold)]";

const labelClass =
  "underline decoration-[var(--kiosk-border-strong)] underline-offset-4 transition-colors group-hover:decoration-[var(--kiosk-gold)]";

/**
 * "Download the app" link for the landing hero.
 *
 * Phones/tablets get "Get the mobile app" → /download#mobile. On desktop,
 * when exactly one published installer matches the visitor's OS the link
 * downloads it directly (one click → installer on disk); otherwise it goes
 * to /download where every platform is listed.
 */
export function LandingDesktopDownloadLink() {
  const [onPhone, setOnPhone] = useState(false);
  const [direct, setDirect] = useState<{ href: string; label: string } | null>(
    null,
  );

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
          label: `Download the desktop app · ${matches[0].label}`,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (onPhone) {
    return (
      <Link href="/download#mobile" className={linkClass}>
        <Smartphone className={iconClass} strokeWidth={2} aria-hidden />
        <span className={labelClass}>Get the mobile app</span>
      </Link>
    );
  }

  const inner = (
    <>
      <Download className={iconClass} strokeWidth={2} aria-hidden />
      <span className={labelClass}>
        {direct ? direct.label : "Download the desktop app"}
      </span>
    </>
  );

  return direct ? (
    <a href={direct.href} download className={linkClass}>
      {inner}
    </a>
  ) : (
    <Link href="/download" className={linkClass}>
      {inner}
    </Link>
  );
}
