"use client";

import { Check, Download, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { fileFromImageBase64, logoPromptChips } from "@/lib/ai-logo";
import { fetchAiStatus, generateBrandingLogo } from "@/lib/api";
import {
  darkStorefrontThemeNames,
  type BrandingLogoSurface,
} from "@/lib/branding-themed-logo";
import { cn } from "@/lib/utils";

export type GeneratedLogoPair = {
  light: File;
  dark: File;
};

type Props = {
  variant: "onboarding" | "dashboard";
  shopName: string;
  shopType?: string;
  primaryColor?: string;
  accentColor?: string;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onDraftPair?: (pair: GeneratedLogoPair | null) => void;
  onGenerated: (pair: GeneratedLogoPair) => void | Promise<void>;
};

const MAX_LOGO_BYTES = 4 * 1024 * 1024;

type PreviewPair = {
  light: string;
  dark: string;
};

/**
 * Prompt + generate light and dark shop marks. After a result, the merchant
 * previews both and saves the pair — each theme then picks the matching file.
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
  const [error, setError] = useState("");
  const [available, setAvailable] = useState(true);
  const [pair, setPair] = useState<GeneratedLogoPair | null>(null);
  const [previews, setPreviews] = useState<PreviewPair | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<PreviewPair | null>(null);
  const chips = logoPromptChips(shopType);
  const onboarding = variant === "onboarding";
  const blocked = busy || applying || disabled;
  const hasResult = Boolean(pair && previews && !busy);
  const darkThemeLabel = useMemo(
    () => darkStorefrontThemeNames().join(", "),
    [],
  );

  const revokePreviews = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current.light);
      URL.revokeObjectURL(previewRef.current.dark);
      previewRef.current = null;
    }
    setPreviews(null);
  };

  const showPair = (next: GeneratedLogoPair | null) => {
    revokePreviews();
    setPair(next);
    if (!next) {
      onDraftPair?.(null);
      return;
    }
    const urls = {
      light: URL.createObjectURL(next.light),
      dark: URL.createObjectURL(next.dark),
    };
    previewRef.current = urls;
    setPreviews(urls);
    onDraftPair?.(next);
  };

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current.light);
        URL.revokeObjectURL(previewRef.current.dark);
      }
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
      showPair(null);
    } else {
      revokePreviews();
      setPair(null);
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
    showPair(null);
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
      if (!lightDto || !darkDto) {
        setError("The pair did not come back complete. Try again.");
        return;
      }
      const next: GeneratedLogoPair = {
        light: fileFromResult(lightDto.mimeType, lightDto.imageBase64, "logo-light"),
        dark: fileFromResult(darkDto.mimeType, darkDto.imageBase64, "logo-dark"),
      };
      if (next.light.size > MAX_LOGO_BYTES || next.dark.size > MAX_LOGO_BYTES) {
        setError("That logo is too large to save. Try a simpler description.");
        return;
      }
      showPair(next);
    } catch (e) {
      setError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not generate logos. Try again.",
      );
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  const usePair = async () => {
    if (!pair || blocked) {
      return;
    }
    setApplying(true);
    onBusyChange?.(true);
    setError("");
    try {
      await onGenerated(pair);
      resetPanel(false);
    } catch (e) {
      setError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not save the logos. Try again.",
      );
    } finally {
      setApplying(false);
      onBusyChange?.(false);
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

  const variantCard = (
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
          {dark ? "Dark theme" : "Light theme"}
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
        <a
          href={src}
          download={file.name}
          className={cn(
            secondaryLinkClass,
            "inline-flex items-center gap-1",
          )}
        >
          <Download className="size-3.5" aria-hidden />
          Download
        </a>
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
          <Button
            type="button"
            variant="outline"
            disabled={disabled || busy}
            onClick={() => {
              setError("");
              setOpen(true);
            }}
          >
            <Sparkles className="size-4" aria-hidden />
            Generate with AI
          </Button>
        )
      ) : (
        <div ref={panelRef} className="space-y-3 scroll-mb-32">
          {hasResult && pair && previews ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {variantCard(
                  "light",
                  previews.light,
                  pair.light,
                  "Dashboard, receipts, emails, and light storefronts like Mart aisles.",
                )}
                {variantCard(
                  "dark",
                  previews.dark,
                  pair.dark,
                  `Dark storefronts: ${darkThemeLabel}. Chem lab follows night/day.`,
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                {onboarding ? (
                  <>
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() => void usePair()}
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
                          Use these logos
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() => {
                        setError("");
                        showPair(null);
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
                      onClick={() => void usePair()}
                    >
                      {applying ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Saving
                        </>
                      ) : (
                        <>
                          <Check className="size-4" aria-hidden />
                          Save and use both
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={blocked}
                      onClick={() => {
                        setError("");
                        showPair(null);
                      }}
                    >
                      Generate another
                    </Button>
                  </>
                )}
              </div>
              <p className={hintClass}>
                Each theme picks the matching mark automatically. You can
                replace them later.
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
                  placeholder="Optional — leave blank for a light and dark pair"
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
                        "Generate logos"
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
                        "Generate logos"
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
                Two logos — light for the dashboard and bright themes, dark
                for {darkThemeLabel}. About 20 seconds.
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
