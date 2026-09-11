"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Download, Loader2, Plus, Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PwaInstallKind>(initialKind);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "installed" | "dismissed">(
    "idle",
  );

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
    if (installed || kind === "ios") return;
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

  let cta = `Add ${name}`;
  if (installed) cta = `${name} is on this phone`;
  else if (kind === "ios") cta = "Use Share → Add to Home Screen";
  else if (busy) cta = "Installing…";

  return (
    <>
      <div
        className={styles.chip}
        style={{ ["--pwa-primary" as string]: primary }}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2.5 bg-transparent p-0 text-inherit"
          onClick={() => setOpen(true)}
          aria-label={`Add ${name} to your home screen`}
        >
          <span className={styles.glyph} aria-hidden>
            <ShopMark src={iconSrc} name={name} />
          </span>
          <span className={styles.copy}>
            <span className={styles.label}>{name}</span>
            <span className={styles.hint}>Add to home screen</span>
          </span>
        </button>
        <button
          type="button"
          className={styles.dismiss}
          aria-label="Hide install"
          onClick={(event) => {
            event.stopPropagation();
            hideForGood("dismissed");
          }}
        >
          <X className="size-3.5" strokeWidth={2.4} aria-hidden />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          side="bottom"
          showCloseButton={false}
          className={cn(
            styles.sheet,
            "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:right-auto sm:max-w-[22.5rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
          )}
          style={{ ["--pwa-primary" as string]: primary }}
        >
          <div className={styles.hero}>
            <button
              type="button"
              className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" aria-hidden />
            </button>
            <div className={styles.mark} aria-hidden>
              <ShopMark src={shopperPwaIconPath(slug, 512)} name={name} />
            </div>
            <DialogTitle className={styles.title}>{name}</DialogTitle>
            <DialogDescription className={styles.lede}>
              Keep this shop on your phone. Cart, orders, and M-Pesa — like any
              other app.
            </DialogDescription>
          </div>

          <div className={styles.body}>
            {kind === "ios" && !installed ? (
              <ol className={styles.guide}>
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
            ) : (
              <Button
                type="button"
                size="lg"
                className={cn(styles.cta, "gap-2 text-[0.95rem]")}
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
              <p className={styles.note}>
                If Chrome doesn’t open a sheet, use the three-dot menu → Install
                app.
              </p>
            ) : null}

            {phase === "dismissed" && !installed ? (
              <p className={styles.note}>
                Install was cancelled. Tap Add {name} when you’re ready.
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
