"use client";

import { Check, Download, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { fileFromImageBase64, logoPromptChips } from "@/lib/ai-logo";
import { fetchAiStatus, generateBrandingLogo } from "@/lib/api";
import { prepareAppIconFile, prepareFaviconFile } from "@/lib/branding-asset-prepare";
import {
  darkStorefrontThemeNames,
  type BrandingLogoSurface,
} from "@/lib/branding-themed-logo";
import { downloadFile, downloadFilesAsZip } from "@/lib/download-zip";
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
  const [kit, setKit] = useState<GeneratedBrandKit | null>(null);
  const [previews, setPreviews] = useState<PreviewKit | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<PreviewKit | null>(null);
  const chips = logoPromptChips(shopType);
  const onboarding = variant === "onboarding";
  const blocked = busy || applying || disabled;
  const hasResult = Boolean(kit && previews && !busy);
  const darkThemeLabel = useMemo(
    () => darkStorefrontThemeNames().join(", "),
    [],
  );
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

  const resetPanel = (discardDraft: boolean) => {
    setOpen(false);
    setError("");
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

  const run = async () => {
    if (blocked) {
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    setError("");
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
    } catch (e) {
      setError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not generate the kit. Try again.",
      );
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  const useKit = async () => {
    if (!kit || blocked) {
      return;
    }
    setApplying(true);
    onBusyChange?.(true);
    setError("");
    try {
      await onGenerated(kit);
      resetPanel(false);
    } catch (e) {
      setError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not save the kit. Try again.",
      );
    } finally {
      setApplying(false);
      onBusyChange?.(false);
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

  const logoCard = (
    surface: BrandingLogoSurface,
    src: string,
    file: File,
    uses: string,
  ) => {
    const dark = surface === "dark";
    const frame = onboarding
      ? cn(
          "flex aspect-square items-center justify-center overflow-hidden rounded-2xl border sm:rounded-xl",
          dark ? "border-[#1F2937] bg-[#111827]" : "border-[#E5E7EB] bg-white",
        )
      : cn(
          "flex aspect-square items-center justify-center overflow-hidden rounded-none border",
          dark ? "border-neutral-800 bg-neutral-950" : "border-border bg-background",
        );
    return (
      <div className="min-w-0 space-y-2 text-left">
        <p className={fieldLabel}>
          {dark ? "On the hero" : "On white"}
        </p>
        <div className={frame}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={dark ? "Dark theme shop logo" : "Light theme shop logo"}
            className="max-h-full max-w-full object-contain p-3"
          />
        </div>
        <p className={hintClass}>{uses}</p>
        <button
          type="button"
          onClick={() => downloadFile(file, src)}
          className={cn(secondaryLinkClass, "inline-flex items-center gap-1")}
        >
          <Download className="size-3.5" aria-hidden />
          Download
        </button>
      </div>
    );
  };

  const webCard = (
    kind: "favicon" | "appIcon" | "og",
    src: string,
    file: File,
    uses: string,
  ) => {
    const favicon = kind === "favicon";
    const appIcon = kind === "appIcon";
    const frame = onboarding
      ? "overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] sm:rounded-xl"
      : "overflow-hidden rounded-none border border-border bg-muted/40";
    const title = favicon ? "Favicon" : appIcon ? "Home screen" : "Share image";
    return (
      <div className={cn("min-w-0 space-y-2 text-left", kind === "og" && "col-span-2")}>
        <p className={fieldLabel}>{title}</p>
        <div
          className={cn(
            frame,
            "flex items-center justify-center",
            kind === "og" ? "aspect-[2/1]" : "aspect-square",
          )}
        >
          {favicon ? (
            <div className="flex w-[min(100%,11rem)] flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-black/8 bg-[#F3F4F6] px-2 py-1.5">
                <span className="size-2 rounded-full bg-[#F87171]" />
                <span className="size-2 rounded-full bg-[#FBBF24]" />
                <span className="size-2 rounded-full bg-[#34D399]" />
                <span className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white px-1.5 py-0.5 ring-1 ring-black/8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="size-3.5 object-contain" />
                  <span className="truncate text-[9px] text-[#6B7280]">
                    {shopName.trim() || "yourshop"}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-center bg-[#111827] py-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt="Favicon"
                  className="size-14 rounded-[14px] object-contain shadow-md"
                />
              </div>
            </div>
          ) : appIcon ? (
            <div className="flex w-[min(100%,11rem)] flex-col items-center gap-2 bg-[#171c19] px-4 py-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Home-screen app icon"
                className="size-16 rounded-[22%] object-cover shadow-md"
              />
              <p className="max-w-full truncate text-[10px] font-medium text-white/80">
                {shopName.trim() || "Your shop"}
              </p>
            </div>
          ) : (
            <div className="w-[min(100%,22rem)] overflow-hidden rounded-lg bg-[#0F172A] shadow-sm ring-1 ring-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Social share image"
                className="aspect-square w-full max-h-40 object-cover sm:max-h-48"
              />
              <div className="space-y-0.5 px-2.5 py-2">
                <p className="truncate text-[10px] font-semibold text-white">
                  {shopName.trim() || "Your shop"}
                </p>
                <p className="text-[9px] text-white/50">whatsapp · facebook</p>
              </div>
            </div>
          )}
        </div>
        <p className={hintClass}>{uses}</p>
        <button
          type="button"
          onClick={() => downloadFile(file, src)}
          className={cn(secondaryLinkClass, "inline-flex items-center gap-1")}
        >
          <Download className="size-3.5" aria-hidden />
          Download
        </button>
      </div>
    );
  };

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
                One mark. Tab, home screen, and share images follow.
              </span>
            </span>
          </button>
        )
      ) : (
        <div ref={panelRef} className="space-y-3 scroll-mb-32">
          {hasResult && kit && previews ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {logoCard(
                  "light",
                  previews.light,
                  kit.light,
                  "Dashboard, receipts, emails, and light headers.",
                )}
                {logoCard(
                  "dark",
                  previews.dark,
                  kit.dark,
                  `Same mark, light ink. Hero and dark storefronts: ${darkThemeLabel}.`,
                )}
                {webCard(
                  "favicon",
                  previews.favicon,
                  kit.favicon,
                  "Browser tab. Same glyph, stamped on a brand tile.",
                )}
                {webCard(
                  "appIcon",
                  previews.appIcon,
                  kit.appIcon,
                  "Home screen and installed shop app.",
                )}
                {webCard(
                  "og",
                  previews.og,
                  kit.og,
                  "Link preview when someone shares your shop.",
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                {onboarding ? (
                  <>
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() => void useKit()}
                      className={primaryBtnClass}
                    >
                      {applying ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Saving
                        </>
                      ) : (
                        <>
                          <Check className="size-4" aria-hidden />
                          Use this kit
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={blocked || downloading}
                      onClick={() => void downloadZip()}
                      className={cn(secondaryLinkClass, "inline-flex items-center gap-1")}
                    >
                      {downloading ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Download className="size-3.5" aria-hidden />
                      )}
                      Download all
                    </button>
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() => {
                        setError("");
                        showKit(null);
                      }}
                      className={secondaryLinkClass}
                    >
                      Generate another
                    </button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      disabled={blocked}
                      onClick={() => void useKit()}
                    >
                      {applying ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Saving
                        </>
                      ) : (
                        <>
                          <Check className="size-4" aria-hidden />
                          Save and use
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={blocked || downloading}
                      onClick={() => void downloadZip()}
                    >
                      {downloading ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Download className="size-4" aria-hidden />
                      )}
                      Download all
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={blocked}
                      onClick={() => {
                        setError("");
                        showKit(null);
                      }}
                    >
                      Generate another
                    </Button>
                  </>
                )}
              </div>
              <p className={hintClass}>
                Same logo in two inks, then a tab icon, home-screen icon,
                and share image — all stamped from that mark.
              </p>
            </div>
          ) : (
            <>
              <label className="block">
                <span className={fieldLabel}>Describe the mark</span>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={blocked}
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
                    disabled={blocked}
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
                      disabled={blocked}
                      onClick={() => void run()}
                      className={primaryBtnClass}
                    >
                      {busy ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Generating
                        </>
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
                      disabled={blocked}
                      onClick={() => void run()}
                    >
                      {busy ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Generating
                        </>
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
    </div>
  );
}
