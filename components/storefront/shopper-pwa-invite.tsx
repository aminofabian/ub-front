"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Plus, Share, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  detectPwaInstallKind,
  hasDeferredPwaPrompt,
  isStandaloneDisplay,
  promptStorefrontPwaInstall,
  registerStorefrontServiceWorker,
  subscribePwaInstall,
  type PwaInstallKind,
} from "@/lib/pwa-install";
import {
  shouldShowShopperPwaInvite,
  writeShopperPwaInviteRecord,
} from "@/lib/shopper-pwa-invite";
import { shopperPwaIconPath } from "@/lib/shopper-pwa";
import { cn } from "@/lib/utils";

import styles from "./shopper-pwa-invite.module.css";

type Props = {
  slug: string;
  name: string;
  primary: string;
};

function ShopMark({
  src,
  name,
  className,
}: {
  src: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const letter = name.trim().charAt(0).toUpperCase() || "S";
  return (
    <span className={cn(styles.markFill, className)} aria-hidden>
      {failed ? (
        <span className={styles.glyphLetter}>{letter}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

function initialKind(): PwaInstallKind {
  return detectPwaInstallKind(
    typeof navigator === "undefined" ? "" : navigator.userAgent,
    false,
    false,
  );
}

export function ShopperPwaInvite({ slug, name, primary }: Props) {
  const iconSrc = shopperPwaIconPath(slug, 192);
  const listingIcon = shopperPwaIconPath(slug, 512);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PwaInstallKind>(initialKind);
  const [busy, setBusy] = useState(false);
  const [nudgeGuide, setNudgeGuide] = useState(false);
  const [phase, setPhase] = useState<"idle" | "installed" | "dismissed">(
    "idle",
  );
  const getRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sync = () => {
      const next = detectPwaInstallKind();
      setKind(next);
      if (next === "standalone") {
        writeShopperPwaInviteRecord(slug, "installed");
        setVisible(false);
        setOpen(false);
        return;
      }
      setVisible(
        shouldShowShopperPwaInvite({
          slug,
          standalone: isStandaloneDisplay(),
        }),
      );
    };
    sync();
    return subscribePwaInstall(sync);
  }, [slug]);

  useEffect(() => {
    if (!nudgeGuide) return;
    const id = window.setTimeout(() => setNudgeGuide(false), 700);
    return () => window.clearTimeout(id);
  }, [nudgeGuide]);

  const hideForGood = useCallback(
    (record: "installed" | "dismissed") => {
      writeShopperPwaInviteRecord(slug, record);
      setVisible(false);
      setOpen(false);
    },
    [slug],
  );

  const installed = kind === "standalone" || phase === "installed";

  const onInstall = useCallback(async () => {
    if (installed || kind === "ios") {
      if (kind === "ios" && !installed) setNudgeGuide(true);
      return;
    }
    setBusy(true);
    await registerStorefrontServiceWorker();
    const started = Date.now();
    while (!hasDeferredPwaPrompt() && Date.now() - started < 2000) {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }
    const result = await promptStorefrontPwaInstall();
    setBusy(false);
    if (result === "accepted") {
      setPhase("installed");
      hideForGood("installed");
      return;
    }
    if (result === "dismissed") setPhase("dismissed");
    setKind(detectPwaInstallKind());
  }, [hideForGood, installed, kind]);

  if (!visible) return null;

  let getLabel = "Get";
  if (installed) getLabel = "Open";

  const theme = { ["--pwa-primary" as string]: primary };

  return (
    <>
      {!open ? (
        <div className={styles.chip} style={theme}>
          <button
            type="button"
            className={styles.hit}
            onClick={() => setOpen(true)}
            aria-label={`Get the ${name} app`}
          >
            <span className={styles.glyph} aria-hidden>
              <span className={styles.shine} />
              <ShopMark src={iconSrc} name={name} />
            </span>
            <span className={styles.copy}>
              <span className={styles.label}>{name}</span>
              <span className={styles.hint}>Free</span>
            </span>
            <span className={styles.get} aria-hidden>
              GET
            </span>
          </button>
          <button
            type="button"
            className={styles.dismiss}
            aria-label="Hide Get the app"
            onClick={(event) => {
              event.stopPropagation();
              hideForGood("dismissed");
            }}
          >
            <X className="size-3.5" strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          side="bottom"
          showCloseButton={false}
          overlayClassName="z-[80]"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            getRef.current?.focus();
          }}
          className={cn(
            styles.sheet,
            "z-[80] sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:right-auto sm:max-w-[22.75rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
          )}
          style={theme}
        >
          <span className={styles.grabber} aria-hidden />
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" strokeWidth={2.2} aria-hidden />
          </button>

          <div className={styles.listing}>
            <div className={styles.listingMark} aria-hidden>
              <span className={styles.shine} />
              <ShopMark src={listingIcon} name={name} />
            </div>
            <div className={styles.listingCopy}>
              <DialogTitle className={styles.title}>{name}</DialogTitle>
              <p className={styles.meta}>Shopping · Free</p>
            </div>
            <button
              ref={getRef}
              type="button"
              className={styles.getBtn}
              disabled={installed || busy}
              data-busy={busy ? "true" : undefined}
              onClick={() => void onInstall()}
              aria-label={
                kind === "ios" && !installed
                  ? `Add ${name} from Share`
                  : `Get the ${name} app`
              }
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : installed ? (
                <Check className="size-3.5" aria-hidden />
              ) : null}
              {getLabel}
            </button>
          </div>

          <div className={styles.stage} aria-hidden>
            <div className={styles.stageSky} />
            <span className={styles.dockIcon}>
              <span className={styles.shine} />
              <ShopMark src={listingIcon} name={name} />
            </span>
            <span className={styles.dock} />
            <p className={styles.stageCaption}>On your home screen</p>
          </div>

          <div className={styles.body}>
            <DialogDescription className={styles.lede}>
              Your shop, on the home screen. Cart, orders, and M-Pesa — like any
              other app.
            </DialogDescription>

            {kind === "ios" && !installed ? (
              <ol
                className={styles.guide}
                data-nudge={nudgeGuide ? "true" : undefined}
              >
                <li className={styles.step}>
                  <span className={styles.stepIndex}>1</span>
                  <div>
                    <p className={styles.stepTitle}>
                      <Share
                        className="mr-1 inline size-3.5 align-[-2px]"
                        aria-hidden
                      />
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
                      <Plus
                        className="mr-1 inline size-3.5 align-[-2px]"
                        aria-hidden
                      />
                      Add to Home Screen
                    </p>
                    <p className={styles.stepBody}>
                      The name will be {name} — not Kiosk.
                    </p>
                  </div>
                </li>
              </ol>
            ) : null}

            {kind === "android-manual" && !installed ? (
              <p className={styles.note}>
                If Chrome doesn’t open a sheet, use the three-dot menu → Install
                app.
              </p>
            ) : null}

            {phase === "dismissed" && !installed ? (
              <p className={styles.note}>
                Install was cancelled. Tap GET when you’re ready.
              </p>
            ) : null}

            <p className={styles.note}>
              This is the {name} app. It opens this shop only.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
