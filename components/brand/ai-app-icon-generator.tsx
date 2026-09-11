"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { fileFromImageBase64 } from "@/lib/ai-logo";
import { fetchAiStatus, generateBrandingAppIcon } from "@/lib/api";
import { prepareAppIconFile } from "@/lib/branding-asset-prepare";
import { cn } from "@/lib/utils";

const MAX_APP_ICON_BYTES = 1024 * 1024;

type Props = {
  shopName: string;
  shopType?: string;
  primaryColor?: string;
  accentColor?: string;
  hasLogo: boolean;
  disabled?: boolean;
  onGenerated: (file: File) => void | Promise<void>;
};

/**
 * Rebuild the saved shop logo as an opaque home-screen icon, then save.
 */
export function AiAppIconGenerator({
  shopName,
  shopType,
  primaryColor,
  accentColor,
  hasLogo,
  disabled,
  onGenerated,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const blocked = busy || applying || disabled || !hasLogo;

  useEffect(() => {
    let cancelled = false;
    void fetchAiStatus().then((status) => {
      if (!cancelled) {
        setAvailable(status?.imageGenerationAvailable !== false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const showPreview = (next: File | null) => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setFile(next);
    if (!next) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(next);
    previewRef.current = url;
    setPreview(url);
  };

  const generate = async () => {
    if (blocked) return;
    setBusy(true);
    setError("");
    showPreview(null);
    try {
      const result = await generateBrandingAppIcon({
        shopName,
        shopType,
        primaryColor,
        accentColor,
      });
      const raw = fileFromImageBase64(
        result.imageBase64,
        result.mimeType,
        "app-icon",
      );
      let prepared = raw;
      try {
        prepared = await prepareAppIconFile(raw);
      } catch {
        prepared = raw;
      }
      if (prepared.size > MAX_APP_ICON_BYTES) {
        setError("The icon is too large to save. Try again.");
        return;
      }
      showPreview(prepared);
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : "Could not generate an app icon. Try again.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!file) return;
    setApplying(true);
    setError("");
    try {
      await onGenerated(file);
      showPreview(null);
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : "Could not save the app icon.";
      setError(message);
    } finally {
      setApplying(false);
    }
  };

  if (!available) {
    return (
      <p className="text-xs leading-relaxed text-[#7A7A7A]">
        App-icon generation is off. Upload a square PNG instead.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {preview && file ? (
        <div className="flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Generated home-screen icon"
            className="size-16 rounded-[22%] bg-[#171c19] object-cover"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={applying}
              onClick={() => void save()}
            >
              {applying ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
              Save icon
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={applying || busy}
              onClick={() => void generate()}
            >
              Generate another
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={blocked}
          onClick={() => void generate()}
          className={cn(
            "flex w-full items-start gap-3 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-3 text-left",
            "transition-colors hover:border-[#0f766e] hover:bg-[color-mix(in_srgb,#0f766e_4%,white)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {busy ? (
            <Loader2
              className="mt-0.5 size-4 shrink-0 animate-spin text-[#0f766e]"
              aria-hidden
            />
          ) : (
            <Sparkles
              className="mt-0.5 size-4 shrink-0 text-[#0f766e]"
              aria-hidden
            />
          )}
          <span className="min-w-0">
            <span className="block text-sm font-medium text-[#141414]">
              {busy ? "Drawing the icon…" : "Make an icon from the logo"}
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-[#7A7A7A]">
              {hasLogo
                ? "Remake from the saved logo. Generate a kit to stamp tab, home screen, and share images together."
                : "Save a logo first, then generate a matching home-screen icon."}
            </span>
          </span>
        </button>
      )}
      {error ? (
        <p className="text-xs leading-relaxed text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
