"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  desktopAppInstallerUrl,
  desktopAppPlatformsForOs,
  detectDesktopAppOs,
  fetchDesktopAppManifest,
} from "@/lib/desktop-app-download";

const linkClass =
  "group inline-flex items-center gap-2 text-[13px] text-[var(--kiosk-text-dim)] transition-colors duration-200 hover:text-[var(--kiosk-gold)] sm:text-sm";

/**
 * "Download the desktop app" link for the landing hero.
 *
 * When exactly one published installer matches the visitor's OS the link
 * downloads it directly (one click → installer on disk); otherwise it goes
 * to /download where every platform is listed.
 */
export function LandingDesktopDownloadLink() {
  const [direct, setDirect] = useState<{ href: string; label: string } | null>(
    null,
  );

  useEffect(() => {
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

  const inner = (
    <>
      <Download
        className="h-3.5 w-3.5 text-[var(--kiosk-gold)]"
        strokeWidth={2}
        aria-hidden
      />
      <span className="underline decoration-[var(--kiosk-border-strong)] underline-offset-4 transition-colors group-hover:decoration-[var(--kiosk-gold)]">
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
