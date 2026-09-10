"use client";

import { Eye } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const trigger =
    layout === "tile" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={onboardingBrandingTileClass}
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#0D9488]/15 text-[#0D9488] transition group-hover:bg-[#0D9488]/25">
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
          "flex w-full items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-3 py-3 text-left transition sm:rounded-xl",
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
          side={desktop ? "center" : "bottom"}
          className={cn(
            "gap-0 overflow-hidden p-0",
            desktop && "max-w-md",
            ONBOARDING_DIALOG_Z,
          )}
          overlayClassName={ONBOARDING_DIALOG_Z}
        >
          <div className="mx-auto mb-1 mt-2 h-1 w-10 rounded-full bg-[#D1D5DB] sm:hidden" aria-hidden />
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
