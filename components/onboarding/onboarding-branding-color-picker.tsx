"use client";

import { CircleHelp, Palette } from "lucide-react";
import { useMemo, useState } from "react";

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
import { cn } from "@/lib/utils";

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;
const ONBOARDING_DIALOG_Z = "z-[650]";

export const onboardingBrandingTileClass = cn(
  "group flex min-h-[5.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-3.5 text-center shadow-sm transition",
  "border-[#0D9488]/35 bg-gradient-to-b from-[#F0FDFA] to-white",
  "hover:border-[#0D9488] hover:from-[#CCFBF1] hover:to-[#F0FDFA] hover:shadow-md",
  "active:scale-[0.98]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2",
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
          className="text-xs font-medium text-[#6B7280]"
          htmlFor={htmlId}
          title={hint}
        >
          {label}
        </label>
        <span
          className="inline-flex cursor-help text-[#9CA3AF] hover:text-[#6B7280]"
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
          className="h-10 w-14 cursor-pointer rounded-lg border border-[#E5E7EB] bg-white shadow-sm"
          title={hint}
        />
        <input
          aria-label={`${label} hex value`}
          className="h-10 w-32 max-w-full rounded-lg border border-[#E5E7EB] bg-white px-3 font-mono text-sm uppercase text-[#1F2937] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20"
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
        "flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition",
        selected
          ? "border-[#0D9488] bg-[#F0FDFA] ring-1 ring-[#0D9488]/30"
          : "border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#FAFAFA]",
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
      <span className="min-w-0 truncate text-xs font-medium text-[#374151]">
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
      <span className="min-w-0 truncate text-sm font-medium text-[#374151]">
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
  const safePresets = useMemo(() => getContrastSafeBrandingPresets(), []);

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
        <span className="flex size-10 items-center justify-center rounded-full bg-[#0D9488]/15 text-[#0D9488] transition group-hover:bg-[#0D9488]/25">
          <Palette className="size-5" aria-hidden />
        </span>
        <span className="text-sm font-semibold text-[#134E4A]">Pick colours</span>
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
        <span className="max-w-full truncate px-1 text-[10px] font-medium text-[#6B7280]">
          {summaryLabel}
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-left transition sm:flex-row sm:items-center",
          "hover:border-[#0D9488]/40 hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/30",
        )}
      >
        <span className="flex min-w-0 flex-1 items-start gap-3">
          <Palette className="mt-0.5 size-5 shrink-0 text-[#0D9488]" aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-[#1F2937]">
              Let&apos;s help you select your colours
            </span>
            <span className="mt-0.5 block text-xs text-[#9CA3AF]">
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
        <p className="text-xs font-medium text-[#6B7280]">Brand colours</p>
      ) : null}

      {trigger}

      {showContrastHint && !contrastOk ? (
        <p className="text-xs text-amber-700" role="status">
          Colours need more contrast — open the picker to adjust.
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn("max-h-[min(90vh,720px)] max-w-lg gap-0 overflow-hidden p-0", ONBOARDING_DIALOG_Z)}
          overlayClassName={ONBOARDING_DIALOG_Z}
        >
          <div className="flex max-h-[min(90vh,720px)] flex-col">
            <DialogHeader className="border-b border-[#F3F4F6] px-5 pb-4 pt-5">
              <DialogTitle className="text-[#1F2937]">
                Pick your brand colours
              </DialogTitle>
              <DialogDescription className="text-[#6B7280]">
                Choose a ready-made theme below, or set a custom primary and
                secondary. We only show combinations with readable contrast.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
                  Themes
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
                      onSelect={() => applyPreset(preset)}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#FAFAFA] p-4">
                <p className="mb-3 text-xs font-medium text-[#6B7280]">
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

            <DialogFooter className="border-t border-[#F3F4F6] px-5 py-4 sm:justify-stretch">
              <Button
                type="button"
                className="h-11 w-full rounded-xl bg-[#0D9488] text-white hover:bg-[#0F766E]"
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
