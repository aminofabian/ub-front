"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Download, Loader2, Plus, Share } from "lucide-react";

import { DesktopLanQr } from "@/components/desktop/desktop-lan-qr";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  detectPwaInstallKind,
  hasDeferredPwaPrompt,
  promptStorefrontPwaInstall,
  registerStorefrontServiceWorker,
  subscribePwaInstall,
  type PwaInstallKind,
} from "@/lib/pwa-install";
import { shopperPwaIconPath } from "@/lib/shopper-pwa";
import { cn } from "@/lib/utils";

import styles from "./shopper-pwa-install.module.css";

type Props = {
  slug: string;
  name: string;
  primary: string;
  description?: string | null;
};

function initialKind(): PwaInstallKind {
  return detectPwaInstallKind(
    typeof navigator === "undefined" ? "" : navigator.userAgent,
    false,
    false,
  );
}

export function ShopperPwaInstall({
  slug,
  name,
  primary,
  description,
}: Props) {
  const iconSrc = shopperPwaIconPath(slug, 512);
  const [kind, setKind] = useState<PwaInstallKind>(initialKind);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "installed" | "dismissed">(
    "idle",
  );
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const sync = () => setKind(detectPwaInstallKind());
    sync();
    setDesktop(!/Mobi|Android/i.test(navigator.userAgent));
    return subscribePwaInstall(sync);
  }, []);

  const installed = kind === "standalone" || phase === "installed";

  const onInstall = useCallback(async () => {
    if (installed || kind === "ios") return;
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
  }, [installed, kind]);

  const lede = installed
    ? "It’s on this phone. Open it from the home screen — full screen, no browser chrome."
    : description?.trim() ||
      "Keep this shop on your phone. Cart, orders, and M-Pesa — like any other app.";

  let cta = `Add ${name}`;
  if (installed) cta = `${name} is on this phone`;
  else if (kind === "ios") cta = "Use Share → Add to Home Screen";
  else if (busy) cta = "Installing…";

  return (
    <div
      className={styles.page}
      style={{ ["--pwa-primary" as string]: primary }}
    >
      <Link href={APP_ROUTES.shop} className={styles.back}>
        <ArrowLeft className="size-4" aria-hidden />
        Back to {name}
      </Link>

      <main className={styles.main}>
        <div className={styles.mark} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconSrc} alt="" />
        </div>

        <h1 className={styles.title}>{name}</h1>
        <p className={styles.lede}>{lede}</p>

        {kind === "ios" && !installed ? (
          <ol className={styles.guide}>
            <li className={styles.step}>
              <span className={styles.stepIndex}>1</span>
              <div>
                <p className={styles.stepTitle}>
                  <Share className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
                  Tap Share
                </p>
                <p className={styles.stepBody}>
                  The square with the arrow, in Safari’s toolbar.
                </p>
              </div>
            </li>
            <li className={styles.step}>
              <span className={styles.stepIndex}>2</span>
              <div>
                <p className={styles.stepTitle}>
                  <Plus className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
                  Add to Home Screen
                </p>
                <p className={styles.stepBody}>
                  Scroll the sheet if you don’t see it at first.
                </p>
              </div>
            </li>
            <li className={styles.step}>
              <span className={styles.stepIndex}>3</span>
              <div>
                <p className={styles.stepTitle}>
                  <Check className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
                  Open {name}
                </p>
                <p className={styles.stepBody}>
                  The icon lands on your home screen as {name} — not Kiosk.
                </p>
              </div>
            </li>
          </ol>
        ) : (
          <Button
            type="button"
            size="lg"
            className={cn(styles.cta, "h-12 w-full max-w-xs gap-2 text-[0.95rem]")}
            disabled={installed || busy}
            onClick={() => void onInstall()}
            style={
              installed
                ? undefined
                : { backgroundColor: primary, borderColor: primary }
            }
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : installed ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            {cta}
          </Button>
        )}

        {kind === "android-manual" && !installed ? (
          <ol className={styles.guide}>
            <li className={styles.step}>
              <span className={styles.stepIndex}>1</span>
              <div>
                <p className={styles.stepTitle}>Open Chrome’s menu</p>
                <p className={styles.stepBody}>The three dots at the top-right.</p>
              </div>
            </li>
            <li className={styles.step}>
              <span className={styles.stepIndex}>2</span>
              <div>
                <p className={styles.stepTitle}>Install app</p>
                <p className={styles.stepBody}>
                  Choose Install app or Add to Home screen.
                </p>
              </div>
            </li>
          </ol>
        ) : null}

        {phase === "dismissed" && !installed ? (
          <p className={styles.dismissed}>
            Install was cancelled. Tap Add {name} when you’re ready.
          </p>
        ) : null}

        {desktop && !installed ? (
          <div className={styles.qr}>
            <div className={styles.qrBox}>
              <DesktopLanQr
                url={typeof window === "undefined" ? "" : window.location.href}
                size={104}
              />
            </div>
            <p>
              On a computer? Scan with your phone, then add {name} from there.
            </p>
          </div>
        ) : null}

        <p className={styles.note}>
          This is {name}’s app. It opens this shop only — not the Kiosk till.
        </p>
      </main>
    </div>
  );
}
