"use client";

import { CircleHelp, Palette } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BRANDING_ACCENT_TOOLTIP,
  BRANDING_PRIMARY_TOOLTIP,
  brandingPresetMatches,
  getContrastSafeBrandingPresets,
  meetsBrandingContrast,
  normalizeHexColor,
  type BrandingColorPreset,
} from "@/lib/branding-color-presets";
import { hapticTap } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;
const ONBOARDING_DIALOG_Z = "z-[650]";

export const onboardingBrandingTileClass = cn(
  "group flex min-h-[5.75rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-2 py-3.5 text-center shadow-sm transition sm:rounded-xl",
  "border-[#1D4B3B]/35 bg-gradient-to-b from-[#EFEBE2] to-white",
  "hover:border-[#1D4B3B] hover:from-[#E3EBE5] hover:to-[#EFEBE2] hover:shadow-md",
  "active:scale-[0.98]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4B3B] focus-visible:ring-offset-2",
);

type Props = {
  primaryColor: string;
  accentColor: string;
  onPrimaryChange: (hex: string) => void;
  onAccentChange: (hex: string) => void;
  layout?: "full" | "tile";
  showContrastHint?: boolean;
};

function ColorFieldWithHint({
  label,
  hint,
  htmlId,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  htmlId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = HEX_REGEX.test(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <label
          className="text-xs font-medium text-[#556159]"
          htmlFor={htmlId}
          title={hint}
        >
          {label}
        </label>
        <span
          className="inline-flex cursor-help text-[#626D66] hover:text-[#556159]"
          title={hint}
        >
          <CircleHelp className="size-3.5" aria-hidden />
          <span className="sr-only">{hint}</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={htmlId}
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-11 w-14 cursor-pointer rounded-xl border border-[#DDD8CC] bg-white shadow-sm"
          title={hint}
        />
        <input
          aria-label={`${label} hex value`}
          className="h-11 w-32 max-w-full rounded-xl border border-[#DDD8CC] bg-white px-3 font-mono text-sm uppercase text-[#121A16] outline-none focus:border-[#1D4B3B] focus:ring-2 focus:ring-[#1D4B3B]/20"
          value={value}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
        {!valid ? (
          <span className="text-xs font-medium text-red-600">Use #RRGGBB</span>
        ) : null}
      </div>
    </div>
  );
}

function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: BrandingColorPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-h-12 items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition",
        selected
          ? "border-[#1D4B3B] bg-[#EFEBE2] ring-1 ring-[#1D4B3B]/30"
          : "border-[#DDD8CC] hover:border-[#C9C3B5] hover:bg-[#FCFAF5]",
      )}
      aria-pressed={selected}
    >
      <span className="flex shrink-0 overflow-hidden rounded-md border border-black/5">
        <span
          className="size-6"
          style={{ backgroundColor: preset.primary }}
          aria-hidden
        />
        <span
          className="size-6"
          style={{ backgroundColor: preset.accent }}
          aria-hidden
        />
      </span>
      <span className="min-w-0 truncate text-xs font-medium text-[#2A332E]">
        {preset.name}
      </span>
    </button>
  );
}

function ColorSwatchSummary({
  primaryColor,
  accentColor,
  label,
}: {
  primaryColor: string;
  accentColor: string;
  label: string;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <span className="flex shrink-0 gap-0.5 overflow-hidden rounded-md border border-black/10">
        <span
          className="size-6"
          style={{ backgroundColor: primaryColor }}
          aria-hidden
        />
        <span
          className="size-6"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        />
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-[#2A332E]">
        {label}
      </span>
    </span>
  );
}

export function OnboardingBrandingColorPicker({
  primaryColor,
  accentColor,
  onPrimaryChange,
  onAccentChange,
  layout = "full",
  showContrastHint = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const safePresets = useMemo(() => getContrastSafeBrandingPresets(), []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const activePreset = safePresets.find((preset) =>
    brandingPresetMatches(preset, primaryColor, accentColor),
  );

  const contrastOk = meetsBrandingContrast(primaryColor, accentColor);
  const summaryLabel = activePreset?.name ?? "Custom colours";

  const applyPreset = (preset: BrandingColorPreset) => {
    onPrimaryChange(normalizeHexColor(preset.primary) ?? preset.primary);
    onAccentChange(normalizeHexColor(preset.accent) ?? preset.accent);
  };

  const trigger =
    layout === "tile" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={onboardingBrandingTileClass}
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#1D4B3B]/15 text-[#1D4B3B] transition group-hover:bg-[#1D4B3B]/25">
          <Palette className="size-5" aria-hidden />
        </span>
        <span className="text-sm font-semibold text-[#121A16]">Pick colours</span>
        <span className="flex gap-0.5 overflow-hidden rounded border border-black/10">
          <span
            className="size-4"
            style={{ backgroundColor: primaryColor }}
            aria-hidden
          />
          <span
            className="size-4"
            style={{ backgroundColor: accentColor }}
            aria-hidden
          />
        </span>
        <span className="max-w-full truncate px-1 text-[10px] font-medium text-[#556159]">
          {summaryLabel}
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full flex-col gap-3 rounded-2xl border border-[#DDD8CC] bg-white px-3 py-3 text-left transition sm:flex-row sm:items-center sm:rounded-xl",
          "hover:border-[#1D4B3B]/40 hover:bg-[#FCFAF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4B3B]/30",
        )}
      >
        <span className="flex min-w-0 flex-1 items-start gap-3">
          <Palette className="mt-0.5 size-5 shrink-0 text-[#1D4B3B]" aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-[#121A16]">
              Let&apos;s help you select your colours
            </span>
            <span className="mt-0.5 block text-xs text-[#626D66]">
              Choose from here — themes or custom primary &amp; secondary
            </span>
          </span>
        </span>
        <ColorSwatchSummary
          primaryColor={primaryColor}
          accentColor={accentColor}
          label={summaryLabel}
        />
      </button>
    );

  return (
    <div className={layout === "tile" ? "" : "space-y-2"}>
      {layout === "full" ? (
        <p className="text-xs font-medium text-[#556159]">Brand colours</p>
      ) : null}

      {trigger}

      {showContrastHint && !contrastOk ? (
        <p className="text-xs text-amber-700" role="status">
          Colours need more contrast — open the picker to adjust.
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          side={desktop ? "center" : "bottom"}
          className={cn(
            "max-h-[min(92dvh,720px)] gap-0 overflow-hidden p-0",
            desktop && "max-w-lg",
            ONBOARDING_DIALOG_Z,
          )}
          overlayClassName={ONBOARDING_DIALOG_Z}
        >
          <div className="mx-auto mb-1 mt-2 h-1 w-10 rounded-full bg-[#C9C3B5] sm:hidden" aria-hidden />
          <div className="flex max-h-[min(90dvh,720px)] flex-col">
            <DialogHeader className="border-b border-[#EFEBE2] px-5 pb-4 pt-5">
              <DialogTitle className="text-[#121A16]">
                Pick your brand colours
              </DialogTitle>
              <DialogDescription className="text-[#556159]">
                Choose a ready-made theme below, or set a custom primary and
                secondary. We only show combinations with readable contrast.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div>
                <p className="mb-2 text-xs font-medium text-[#556159]">
                  Ready-made looks
                </p>
                <div
                  className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                  role="listbox"
                  aria-label="Branding color themes"
                >
                  {safePresets.map((preset) => (
                    <PresetCard
                      key={preset.name}
                      preset={preset}
                      selected={brandingPresetMatches(
                        preset,
                        primaryColor,
                        accentColor,
                      )}
                      onSelect={() => {
                        hapticTap(8);
                        applyPreset(preset);
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-[#C9C3B5] bg-[#FCFAF5] p-4">
                <p className="mb-3 text-xs font-medium text-[#556159]">
                  Or use custom colours
                </p>
                <div className="space-y-4">
                  <ColorFieldWithHint
                    label="Primary"
                    hint={BRANDING_PRIMARY_TOOLTIP}
                    htmlId="onboarding-primary-color"
                    value={primaryColor}
                    onChange={onPrimaryChange}
                  />
                  <ColorFieldWithHint
                    label="Secondary (accent)"
                    hint={BRANDING_ACCENT_TOOLTIP}
                    htmlId="onboarding-accent-color"
                    value={accentColor}
                    onChange={onAccentChange}
                  />
                </div>
              </div>

              {!contrastOk ? (
                <p className="text-xs text-amber-700" role="status">
                  These colours need more contrast. Try a theme or adjust until
                  primary and secondary work with light or dark text.
                </p>
              ) : null}
            </div>

            <DialogFooter className="border-t border-[#EFEBE2] px-5 py-4 sm:justify-stretch">
              <Button
                type="button"
                className="h-11 w-full rounded-xl bg-[#1D4B3B] text-white hover:bg-[#163B2E]"
                disabled={!contrastOk}
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
