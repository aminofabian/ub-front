"use client";

import { Eye } from "lucide-react";
import { useState } from "react";

import { onboardingBrandingTileClass } from "@/components/onboarding/onboarding-branding-color-picker";
import { OnboardingBrandingPreview } from "@/components/onboarding/onboarding-branding-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ONBOARDING_DIALOG_Z = "z-[650]";

type Props = {
  displayName: string;
  primaryColor: string;
  accentColor: string;
  logoPreviewUrl?: string | null;
  layout?: "full" | "tile";
};

export function OnboardingBrandingPreviewModal({
  displayName,
  primaryColor,
  accentColor,
  logoPreviewUrl,
  layout = "full",
}: Props) {
  const [open, setOpen] = useState(false);

  const trigger =
    layout === "tile" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={onboardingBrandingTileClass}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-[#0D9488]/15 text-[#0D9488] transition group-hover:bg-[#0D9488]/25">
          <Eye className="size-5" aria-hidden />
        </span>
        <span className="text-sm font-semibold text-[#134E4A]">Preview site</span>
        <span className="px-1 text-[10px] leading-snug text-[#6B7280]">
          Header &amp; buttons
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-left transition",
          "hover:border-[#0D9488]/40 hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/30",
        )}
      >
        <Eye className="size-5 shrink-0 text-[#0D9488]" aria-hidden />
        <span>
          <span className="block text-sm font-medium text-[#1F2937]">
            This is how it will look on your site
          </span>
          <span className="mt-0.5 block text-xs text-[#9CA3AF]">
            Preview your header, receipt, and shop buttons
          </span>
        </span>
      </button>
    );

  return (
    <>
      {trigger}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn("max-w-md gap-0 overflow-hidden p-0", ONBOARDING_DIALOG_Z)}
          overlayClassName={ONBOARDING_DIALOG_Z}
        >
          <DialogHeader className="border-b border-[#F3F4F6] px-5 pb-4 pt-5">
            <DialogTitle className="text-[#1F2937]">
              Site preview
            </DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              A rough idea of how {displayName.trim() || "your shop"} will
              appear online and on receipts with your current branding.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4">
            <OnboardingBrandingPreview
              displayName={displayName}
              primaryColor={primaryColor}
              accentColor={accentColor}
              logoPreviewUrl={logoPreviewUrl}
              showHeading={false}
            />
          </div>

          <DialogFooter className="border-t border-[#F3F4F6] px-5 py-4 sm:justify-stretch">
            <Button
              type="button"
              className="h-11 w-full rounded-xl bg-[#0D9488] text-white hover:bg-[#0F766E]"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
