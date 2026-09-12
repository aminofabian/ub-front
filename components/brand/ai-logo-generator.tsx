"use client";

import { Check, Download, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SmsCreditsBuyDialog } from "@/components/messaging/sms-credits-header";
import { Button } from "@/components/ui/button";
import { fileFromImageBase64, logoPromptChips } from "@/lib/ai-logo";
import {
  fetchAiLogoQuota,
  fetchAiStatus,
  fetchMe,
  fetchSmsCreditBalance,
  generateBrandingLogo,
  type AiLogoQuotaRecord,
  type SmsCreditBalanceRecord,
} from "@/lib/api";
import { prepareAppIconFile, prepareFaviconFile } from "@/lib/branding-asset-prepare";
import { downloadFilesAsZip } from "@/lib/download-zip";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export type GeneratedLogoPair = {
  light: File;
  dark: File;
};

export type GeneratedBrandKit = GeneratedLogoPair & {
  favicon: File;
  appIcon: File;
  og: File;
};

type Props = {
  variant: "onboarding" | "dashboard";
  shopName: string;
  shopType?: string;
  primaryColor?: string;
  accentColor?: string;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onDraftPair?: (kit: GeneratedBrandKit | null) => void;
  onGenerated: (kit: GeneratedBrandKit) => void | Promise<void>;
};

const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const MAX_FAVICON_BYTES = 512 * 1024;
const MAX_APP_ICON_BYTES = 1024 * 1024;

type PreviewKit = {
  light: string;
  dark: string;
  favicon: string;
  appIcon: string;
  og: string;
};

/**
 * Prompt + generate a brand kit: one mark, then dark ink, tab icon,
 * home-screen icon, and share image stamped from that file.
 */
export function AiLogoGenerator({
  variant,
  shopName,
  shopType,
  primaryColor,
  accentColor,
  disabled,
  onBusyChange,
  onDraftPair,
  onGenerated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState(true);
  const [quota, setQuota] = useState<AiLogoQuotaRecord | null>(null);
  const [smsBalance, setSmsBalance] = useState<SmsCreditBalanceRecord | null>(
    null,
  );
  const [buyOpen, setBuyOpen] = useState(false);
  const [canBuyCredits, setCanBuyCredits] = useState(false);
  const [defaultPhone, setDefaultPhone] = useState<string | null>(null);
  const [kit, setKit] = useState<GeneratedBrandKit | null>(null);
  const [previews, setPreviews] = useState<PreviewKit | null>(null);
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<PreviewKit | null>(null);
  const chips = logoPromptChips(shopType);
  const onboarding = variant === "onboarding";
  const blocked = busy || applying || disabled;
  const hasResult = Boolean(kit && previews && !busy);
  const zipName = useMemo(() => {
    const slug = shopName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    return `${slug || "shop"}-brand-kit.zip`;
  }, [shopName]);

  const revokePreviewUrls = (urls: PreviewKit | null) => {
    if (!urls) {
      return;
    }
    URL.revokeObjectURL(urls.light);
    URL.revokeObjectURL(urls.dark);
    URL.revokeObjectURL(urls.favicon);
    URL.revokeObjectURL(urls.appIcon);
    URL.revokeObjectURL(urls.og);
  };

  const revokePreviews = () => {
    revokePreviewUrls(previewRef.current);
    previewRef.current = null;
    setPreviews(null);
  };

  const showKit = (next: GeneratedBrandKit | null) => {
    revokePreviews();
    setKit(next);
    setSaved(false);
    if (!next) {
      onDraftPair?.(null);
      return;
    }
    const urls: PreviewKit = {
      light: URL.createObjectURL(next.light),
      dark: URL.createObjectURL(next.dark),
      favicon: URL.createObjectURL(next.favicon),
      appIcon: URL.createObjectURL(next.appIcon),
      og: URL.createObjectURL(next.og),
    };
    previewRef.current = urls;
    setPreviews(urls);
    onDraftPair?.(next);
  };

  useEffect(() => {
    return () => {
      revokePreviewUrls(previewRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    panelRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [open, hasResult]);

  useEffect(() => {
    let cancelled = false;
    void fetchAiStatus().then((status) => {
      if (cancelled || !status) {
        return;
      }
      if (status.imageGenerationAvailable === false) {
        setAvailable(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshQuota = useCallback(async () => {
    const [nextQuota, nextBalance] = await Promise.all([
      fetchAiLogoQuota(),
      fetchSmsCreditBalance().catch(() => null),
    ]);
    setQuota(nextQuota);
    setSmsBalance(nextBalance);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) {
          return;
        }
        setCanBuyCredits(
          hasPermission(me.permissions, Permission.SmsCreditsPurchase),
        );
        setDefaultPhone(me.phone ?? null);
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        await refreshQuota();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshQuota]);

  const canAfford = quota?.canGenerate !== false;
  const generateBlocked = blocked || !canAfford;

  const resetPanel = (discardDraft: boolean) => {
    setOpen(false);
    setError("");
    setSaved(false);
    if (discardDraft) {
      showKit(null);
    } else {
      revokePreviews();
      setKit(null);
    }
  };

  const fileFromResult = (
    mimeType: string,
    imageBase64: string,
    filename: string,
  ) => {
    const ext = mimeType.includes("jpeg")
      ? "jpg"
      : mimeType.includes("webp")
        ? "webp"
        : "png";
    return fileFromImageBase64(imageBase64, mimeType, `${filename}.${ext}`);
  };

  const saveKit = async (next: GeneratedBrandKit) => {
    setApplying(true);
    onBusyChange?.(true);
    setError("");
    try {
      await onGenerated(next);
      setSaved(true);
      onDraftPair?.(null);
    } catch (e) {
      setSaved(false);
      setError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not save the logo. Tap Save to try again.",
      );
      throw e;
    } finally {
      setApplying(false);
      onBusyChange?.(false);
    }
  };

  const run = async () => {
    if (generateBlocked) {
      if (quota && !quota.canGenerate) {
        setError(
          `You've used your free AI logo. Buy ${quota.creditCost} credits to generate another.`,
        );
        setBuyOpen(true);
      }
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    setSaved(false);
    showKit(null);
    try {
      const result = await generateBrandingLogo({
        prompt: prompt.trim(),
        shopName: shopName.trim(),
        shopType: shopType?.trim() || undefined,
        primaryColor,
        accentColor,
      });
      const lightDto = result.logos.find((logo) => logo.theme === "light");
      const darkDto = result.logos.find((logo) => logo.theme === "dark");
      const faviconDto = result.logos.find((logo) => logo.theme === "favicon");
      const appIconDto = result.logos.find((logo) => logo.theme === "appIcon");
      const ogDto = result.logos.find((logo) => logo.theme === "og");
      if (!lightDto || !darkDto || !faviconDto || !appIconDto || !ogDto) {
        setError("The kit did not come back complete. Try again.");
        return;
      }
      const faviconRaw = fileFromResult(
        faviconDto.mimeType,
        faviconDto.imageBase64,
        "favicon",
      );
      const appIconRaw = fileFromResult(
        appIconDto.mimeType,
        appIconDto.imageBase64,
        "app-icon",
      );
      let favicon = faviconRaw;
      let appIcon = appIconRaw;
      try {
        favicon = await prepareFaviconFile(faviconRaw);
      } catch {
        favicon = faviconRaw;
      }
      try {
        appIcon = await prepareAppIconFile(appIconRaw);
      } catch {
        appIcon = appIconRaw;
      }
      const next: GeneratedBrandKit = {
        light: fileFromResult(lightDto.mimeType, lightDto.imageBase64, "logo-light"),
        dark: fileFromResult(darkDto.mimeType, darkDto.imageBase64, "logo-dark"),
        favicon,
        appIcon,
        og: fileFromResult(ogDto.mimeType, ogDto.imageBase64, "og-image"),
      };
      if (
        next.light.size > MAX_LOGO_BYTES ||
        next.dark.size > MAX_LOGO_BYTES ||
        next.og.size > MAX_LOGO_BYTES
      ) {
        setError("An asset is too large to save. Try a simpler description.");
        return;
      }
      if (next.favicon.size > MAX_FAVICON_BYTES) {
        setError("The favicon is too large to save. Try again.");
        return;
      }
      if (next.appIcon.size > MAX_APP_ICON_BYTES) {
        setError("The home-screen icon is too large to save. Try again.");
        return;
      }
      showKit(next);
      setBusy(false);
      try {
        await saveKit(next);
        void refreshQuota();
      } catch {
        void refreshQuota();
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not generate the kit. Try again.",
      );
      void refreshQuota();
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  const useKit = async () => {
    if (!kit || blocked) {
      return;
    }
    try {
      await saveKit(kit);
    } catch {
      /* error already set */
    }
  };

  const downloadZip = async () => {
    if (!kit || downloading) {
      return;
    }
    setDownloading(true);
    setError("");
    try {
      await downloadFilesAsZip(
        [kit.light, kit.dark, kit.favicon, kit.appIcon, kit.og],
        zipName,
      );
    } catch {
      setError("Could not build the zip. Download each file instead.");
    } finally {
      setDownloading(false);
    }
  };

  if (!available) {
    return null;
  }

  const fieldLabel = onboarding
    ? "mb-1.5 block text-xs font-medium text-[#6B7280]"
    : "mb-1.5 block text-sm font-medium text-foreground";
  const textareaClass = onboarding
    ? "w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-base text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 disabled:opacity-60 sm:rounded-xl sm:text-[15px]"
    : "w-full resize-none rounded-none border border-input bg-background px-3 py-2.5 text-sm shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60";
  const chipClass = onboarding
    ? "h-8 rounded-full border border-[#E5E7EB] bg-white px-2.5 text-[11px] font-medium text-[#374151] transition active:scale-[0.98] hover:bg-[#F9FAFB] disabled:opacity-50"
    : "h-8 rounded-full border border-input bg-background px-2.5 text-[11px] font-medium text-foreground transition hover:bg-muted disabled:opacity-50";
  const hintClass = onboarding
    ? "text-xs text-[#9CA3AF]"
    : "text-xs leading-relaxed text-muted-foreground";
  const primaryBtnClass =
    "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0D9488] px-4 text-sm font-medium text-white transition active:scale-[0.98] hover:bg-[#0F766E] disabled:opacity-60 sm:h-10 sm:rounded-xl";
  const secondaryLinkClass = "min-h-10 text-xs text-[#6B7280] active:opacity-70";

  return (
    <div className={cn("w-full", onboarding ? "text-center sm:text-left" : "")}>
      {!open ? (
        onboarding ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => {
              setError("");
              setOpen(true);
            }}
            className="h-11 w-full rounded-2xl border border-[#0D9488]/30 bg-[#F0FDFA] px-3 text-sm font-medium text-[#0F766E] transition active:scale-[0.98] hover:bg-[#CCFBF1] disabled:opacity-50 sm:h-auto sm:rounded-xl sm:py-2"
          >
            Generate with AI
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => {
              setError("");
              setOpen(true);
            }}
            className={cn(
              "flex w-full items-start gap-3 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-3 text-left",
              "transition-colors hover:border-[#0f766e] hover:bg-[color-mix(in_srgb,#0f766e_4%,white)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Sparkles className="mt-0.5 size-4 shrink-0 text-[#0f766e]" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-[#141414]">
                Generate a kit
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-[#7A7A7A]">
                {quota?.nextGenerationIsFree
                  ? "First kit is free. Tab, home screen, and share images included."
                  : `One mark for ${quota?.creditCost ?? 50} credits. Tab, home screen, and share images follow.`}
              </span>
            </span>
          </button>
        )
      ) : (
        <div ref={panelRef} className="space-y-3 scroll-mb-32">
          {hasResult && kit && previews ? (
            <div className="space-y-3">
              <div
                className={cn(
                  onboarding
                    ? "rounded-2xl border border-[#CCFBF1] bg-[#F0FDFA] p-3 text-left sm:rounded-xl"
                    : "border border-[color-mix(in_srgb,#0f766e_28%,transparent)] bg-[color-mix(in_srgb,#0f766e_6%,white)] p-3",
                )}
              >
                {saved ? (
                  <div className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 size-5 shrink-0 text-[#0f766e]"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#141414]">
                        {onboarding ? "Logo added to your setup" : "Logo saved to your shop"}
                      </p>
                      <p className={cn(hintClass, "mt-0.5 text-left")}>
                        Light and dark marks, tab icon, home screen, and share
                        image are ready.
                      </p>
                    </div>
                  </div>
                ) : applying ? (
                  <div className="flex items-center gap-2">
                    <Loader2
                      className="size-5 shrink-0 animate-spin text-[#0f766e]"
                      aria-hidden
                    />
                    <p className="text-sm font-medium text-[#141414]">
                      Saving your logo…
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-[#141414]">
                        Your logo is ready
                      </p>
                      <p className={cn(hintClass, "mt-0.5 text-left")}>
                        Save it to use on the shop, receipts, and share links.
                      </p>
                    </div>
                    {onboarding ? (
                      <button
                        type="button"
                        disabled={blocked}
                        onClick={() => void useKit()}
                        className={cn(primaryBtnClass, "w-full sm:w-auto")}
                      >
                        <Check className="size-4" aria-hidden />
                        Save logo
                      </button>
                    ) : (
                      <Button
                        type="button"
                        disabled={blocked}
                        className="h-11 w-full gap-2 sm:w-auto"
                        onClick={() => void useKit()}
                      >
                        <Check className="size-4" aria-hidden />
                        Save logo to shop
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div
                className={cn(
                  "flex items-center justify-center border bg-white p-4",
                  onboarding ? "rounded-2xl border-[#E5E7EB] sm:rounded-xl" : "rounded-none",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previews.light}
                  alt="Shop logo"
                  className="max-h-28 max-w-full object-contain"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ["dark", previews.dark, "#111827"],
                    ["favicon", previews.favicon, "#F9FAFB"],
                    ["appIcon", previews.appIcon, "#111827"],
                    ["og", previews.og, "#0F172A"],
                  ] as const
                ).map(([key, src, bg]) => (
                  <div
                    key={key}
                    className={cn(
                      "flex aspect-square items-center justify-center overflow-hidden border",
                      onboarding ? "rounded-xl" : "rounded-none",
                    )}
                    style={{ backgroundColor: bg }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="max-h-full max-w-full object-contain p-1.5"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                  type="button"
                  disabled={blocked || downloading || applying}
                  onClick={() => void downloadZip()}
                  className={cn(
                    secondaryLinkClass,
                    "inline-flex items-center gap-1",
                  )}
                >
                  {downloading ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Download className="size-3.5" aria-hidden />
                  )}
                  Download files
                </button>
                <button
                  type="button"
                  disabled={blocked || applying}
                  onClick={() => {
                    setError("");
                    setSaved(false);
                    showKit(null);
                  }}
                  className={secondaryLinkClass}
                >
                  {saved ? "Generate another" : "Try a different look"}
                </button>
                {saved ? (
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => resetPanel(false)}
                    className={cn(secondaryLinkClass, "font-medium text-[#0f766e]")}
                  >
                    Done
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              {quota ? (
                <div
                  className={cn(
                    onboarding
                      ? "rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-left sm:rounded-xl"
                      : "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 py-2",
                  )}
                >
                  {quota.nextGenerationIsFree ? (
                    <p className={cn(hintClass, "text-left")}>
                      {quota.freeRemaining === 1
                        ? "Your first AI logo kit is free."
                        : `${quota.freeRemaining} free AI logo kits left.`}
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={cn(hintClass, "text-left")}>
                        Next kit costs {quota.creditCost} credits. You have{" "}
                        {quota.purchasedCredits}.
                      </p>
                      {canBuyCredits ? (
                        <button
                          type="button"
                          onClick={() => setBuyOpen(true)}
                          className={cn(
                            secondaryLinkClass,
                            "shrink-0 font-medium text-[#0f766e]",
                          )}
                        >
                          Buy credits
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
              <label className="block">
                <span className={fieldLabel}>Describe the mark</span>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={generateBlocked && !busy}
                  rows={2}
                  maxLength={600}
                  placeholder="Optional. Leave blank for a full brand kit"
                  className={textareaClass}
                />
              </label>
              <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                {chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={generateBlocked}
                    onClick={() => setPrompt(chip)}
                    className={chipClass}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {onboarding ? (
                  <>
                    <button
                      type="button"
                      disabled={generateBlocked}
                      onClick={() => void run()}
                      className={primaryBtnClass}
                    >
                      {busy ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Generating
                        </>
                      ) : quota && !quota.canGenerate ? (
                        "Need credits"
                      ) : (
                        "Generate kit"
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={busy || applying}
                      onClick={() => resetPanel(true)}
                      className={secondaryLinkClass}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      disabled={generateBlocked}
                      onClick={() => void run()}
                    >
                      {busy ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Generating
                        </>
                      ) : quota && !quota.canGenerate ? (
                        "Need credits"
                      ) : (
                        "Generate kit"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy || applying}
                      onClick={() => resetPanel(true)}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
              <p className={hintClass}>
                One mark in two inks, plus tab, home screen, and share
                images. Dark ink on white, light ink on navy. About a minute.
                {quota && !quota.nextGenerationIsFree
                  ? ` Each kit after the free one costs ${quota.creditCost} credits.`
                  : ""}
              </p>
            </>
          )}
          {error ? (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}
      <SmsCreditsBuyDialog
        open={buyOpen}
        onOpenChange={setBuyOpen}
        balance={smsBalance}
        canBuy={canBuyCredits}
        defaultPhone={defaultPhone}
        onPaid={() => void refreshQuota()}
      />
    </div>
  );
}
