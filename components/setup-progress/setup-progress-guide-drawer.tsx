"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  resolveSetupGuide,
  splitGuideCaption,
  type SetupGuide,
} from "@/lib/setup-progress-guides";
import { cn } from "@/lib/utils";

type SetupProgressGuideDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepKey: string | null;
  recommendedSubKey?: string | null;
  /** When set, last-step "Do it" runs this instead of navigating. */
  onDoIt?: () => void;
};

export function SetupProgressGuideDrawer({
  open,
  onOpenChange,
  stepKey,
  recommendedSubKey,
  onDoIt,
}: SetupProgressGuideDrawerProps) {
  const guide: SetupGuide | null = stepKey
    ? resolveSetupGuide(stepKey, recommendedSubKey)
    : null;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setIndex(0);
    }
  }, [open, stepKey, recommendedSubKey]);

  if (!guide) {
    return null;
  }

  const shot = guide.shots[index];
  const last = index >= guide.shots.length - 1;

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={guide.title}
      description={`Step ${index + 1} of ${guide.shots.length}`}
      icon={<BookOpen className="size-4" aria-hidden />}
      width="default"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="mr-1 size-3.5" aria-hidden />
            Back
          </Button>
          <div className="flex items-center gap-1.5">
            {guide.shots.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  i === index ? "bg-[#B08D48]" : "bg-[#E6E1D8]",
                )}
                aria-hidden
              />
            ))}
          </div>
          {last ? (
            onDoIt ? (
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={() => {
                  onOpenChange(false);
                  onDoIt();
                }}
              >
                Do it
                <ArrowRight className="ml-1 size-3.5" aria-hidden />
              </Button>
            ) : (
              <Button type="button" size="sm" className="h-8" asChild>
                <Link href={guide.doItUrl} onClick={() => onOpenChange(false)}>
                  Do it
                  <ArrowRight className="ml-1 size-3.5" aria-hidden />
                </Link>
              </Button>
            )
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={() => setIndex((i) => Math.min(guide.shots.length - 1, i + 1))}
            >
              Next
              <ChevronRight className="ml-1 size-3.5" aria-hidden />
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="overflow-hidden border border-[#E6E1D8] bg-[#FCFAF6]">
          <div className="relative aspect-[4/3] w-full">
            <Image
              src={shot.src}
              alt={shot.alt}
              fill
              className="object-contain object-top p-2"
              sizes="(max-width: 768px) 100vw, 420px"
              unoptimized
            />
          </div>
        </div>
        <p className="text-sm leading-relaxed text-[#141414]">
          {splitGuideCaption(shot.caption).map((part, i) =>
            typeof part === "string" ? (
              <span key={i}>{part}</span>
            ) : (
              <strong key={i} className="font-semibold">
                {part.bold}
              </strong>
            ),
          )}
        </p>
      </div>
    </FormDrawer>
  );
}
