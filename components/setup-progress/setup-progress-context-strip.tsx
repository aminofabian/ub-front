"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { SetupProgressGuideDrawer } from "@/components/setup-progress/setup-progress-guide-drawer";
import { SetupProgressPhoneModal } from "@/components/setup-progress/setup-progress-phone-modal";
import { useSetupProgress } from "@/hooks/use-setup-progress";
import { setupStepMatchesPath } from "@/lib/setup-progress-routes";
import { cn } from "@/lib/utils";

type SetupProgressContextStripProps = {
  enabled?: boolean;
};

/**
 * Slim contextual nudge under the app header on routes that match the current setup step.
 * Hidden on /business (full banner lives there).
 */
export function SetupProgressContextStrip({
  enabled = true,
}: SetupProgressContextStripProps) {
  const pathname = usePathname();
  const onHub = pathname === "/business";
  const { data, reload } = useSetupProgress({ enabled: enabled && !onHub });
  const [guideOpen, setGuideOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);

  if (!enabled || onHub || !data?.visible || !data.currentStepKey) {
    return null;
  }

  if (!setupStepMatchesPath(data.currentStepKey, pathname)) {
    return null;
  }

  const current = data.steps.find((s) => s.status === "current");
  const actionUrl = current?.actionUrl ?? "/business";
  const label = current?.label ?? "Continue setup";
  const isPhoneStep = data.currentStepKey === "phone_verified";

  return (
    <>
      <div
        role="status"
        className="shrink-0 border-b border-[#B08D48]/25 bg-[#FCFAF6] text-[#141414]"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex shrink-0 items-center gap-0.5">
              {data.steps.map((step) => (
                <span
                  key={step.key}
                  className={cn(
                    "size-1.5 rounded-full",
                    step.status === "completed" && "bg-[#0D9488]",
                    step.status === "current" && "bg-[#B08D48]",
                    step.status === "pending" && "bg-[#E6E1D8]",
                  )}
                  aria-hidden
                />
              ))}
            </div>
            <p className="min-w-0 truncate text-[11px] leading-snug sm:text-xs">
              <span className="font-medium">{label}</span>
              <span className="text-[#888888]"> · {data.percentComplete}%</span>
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 text-[11px] font-medium text-[#8A6B2E] hover:underline sm:text-xs"
            onClick={() => setGuideOpen(true)}
          >
            How?
          </button>
          {isPhoneStep ? (
            <button
              type="button"
              className={cn(
                "shrink-0 text-[11px] font-semibold underline underline-offset-2 sm:text-xs",
                "decoration-[#B08D48]/50 hover:decoration-[#8A6B2E]",
              )}
              onClick={() => setPhoneOpen(true)}
            >
              Add phone →
            </button>
          ) : (
            <Link
              href={actionUrl}
              className={cn(
                "shrink-0 text-[11px] font-semibold underline underline-offset-2 sm:text-xs",
                "decoration-[#B08D48]/50 hover:decoration-[#8A6B2E]",
              )}
            >
              Continue →
            </Link>
          )}
        </div>
      </div>

      <SetupProgressGuideDrawer
        open={guideOpen}
        onOpenChange={setGuideOpen}
        stepKey={data.currentStepKey}
        recommendedSubKey={current?.recommendedSubKey}
        onDoIt={isPhoneStep ? () => setPhoneOpen(true) : undefined}
      />

      <SetupProgressPhoneModal
        open={phoneOpen}
        onOpenChange={setPhoneOpen}
        onVerified={() => {
          void reload();
        }}
      />
    </>
  );
}
