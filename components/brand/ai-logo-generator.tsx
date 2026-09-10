"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { fileFromImageBase64, logoPromptChips } from "@/lib/ai-logo";
import { fetchAiStatus, generateBrandingLogo } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  variant: "onboarding" | "dashboard";
  shopName: string;
  shopType?: string;
  primaryColor?: string;
  accentColor?: string;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onGenerated: (file: File) => void | Promise<void>;
};

/**
 * Prompt + generate for a shop logo. Hidden when the platform has no OpenAI
 * image key. The result is a File so onboarding and branding share one upload path.
 */
export function AiLogoGenerator({
  variant,
  shopName,
  shopType,
  primaryColor,
  accentColor,
  disabled,
  onBusyChange,
  onGenerated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const chips = logoPromptChips(shopType);
  const onboarding = variant === "onboarding";

  useEffect(() => {
    if (!open) {
      return;
    }
    panelRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [open]);

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

  const run = async () => {
    const text = prompt.trim();
    const name = shopName.trim();
    if (busy || disabled) {
      return;
    }
    if (!text && !name) {
      setError("Describe the mark, or fill in the shop name first.");
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      const result = await generateBrandingLogo({
        prompt: text,
        shopName: name,
        shopType: shopType?.trim() || undefined,
        primaryColor,
        accentColor,
      });
      const ext = result.mimeType.includes("jpeg")
        ? "jpg"
        : result.mimeType.includes("webp")
          ? "webp"
          : "png";
      const file = fileFromImageBase64(
        result.imageBase64,
        result.mimeType,
        `logo.${ext}`,
      );
      await onGenerated(file);
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not generate a logo. Try again.",
      );
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  if (!available) {
    return null;
  }

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
        <div ref={panelRef} className="space-y-2 scroll-mb-32">
          <label className="block">
            <span
              className={
                onboarding
                  ? "mb-1.5 block text-xs font-medium text-[#6B7280]"
                  : "mb-1.5 block text-sm font-medium text-foreground"
              }
            >
              Describe the mark
            </span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={busy || disabled}
              rows={2}
              maxLength={600}
              placeholder="A green leaf in a circle, simple, no extra text"
              className={
                onboarding
                  ? "w-full resize-none rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-base text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 disabled:opacity-60 sm:rounded-xl sm:text-[15px]"
                  : "w-full resize-none rounded-none border border-input bg-background px-3 py-2.5 text-sm shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
              }
            />
          </label>
          <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={busy || disabled}
                onClick={() => setPrompt(chip)}
                className={
                  onboarding
                    ? "h-8 rounded-full border border-[#E5E7EB] bg-white px-2.5 text-[11px] font-medium text-[#374151] transition active:scale-[0.98] hover:bg-[#F9FAFB] disabled:opacity-50"
                    : "h-8 rounded-full border border-input bg-background px-2.5 text-[11px] font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                }
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
                  disabled={busy || disabled}
                  onClick={() => void run()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0D9488] px-4 text-sm font-medium text-white transition active:scale-[0.98] hover:bg-[#0F766E] disabled:opacity-60 sm:h-10 sm:rounded-xl"
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Generating
                    </>
                  ) : (
                    "Generate logo"
                  )}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setOpen(false);
                    setError("");
                  }}
                  className="min-h-10 text-xs text-[#6B7280] active:opacity-70"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  disabled={busy || disabled}
                  onClick={() => void run()}
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Generating
                    </>
                  ) : (
                    "Generate logo"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setOpen(false);
                    setError("");
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
          <p
            className={
              onboarding
                ? "text-xs text-[#9CA3AF]"
                : "text-xs leading-relaxed text-muted-foreground"
            }
          >
            About 15 seconds. You can replace it after.
          </p>
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
