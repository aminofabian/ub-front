import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { sectionLabelPillClass } from "./landing-styles";

type LandingSectionHeaderProps = {
  index: string;
  label: string;
  title: ReactNode;
  description?: string;
  className?: string;
  titleClassName?: string;
};

export function LandingSectionHeader({
  index,
  label,
  title,
  description,
  className,
  titleClassName,
}: LandingSectionHeaderProps) {
  return (
    <header className={cn("landing-section-header", className)}>
      <div className="landing-section-header-meta mb-5 flex flex-wrap items-center gap-3 sm:mb-6">
        <span className="landing-section-index">{index}</span>
        <span className={sectionLabelPillClass}>{label}</span>
      </div>
      <h2
        className={cn(
          "font-heading text-[clamp(26px,6vw,54px)] leading-[1.1] tracking-[-0.02em] text-[var(--kiosk-text)]",
          titleClassName,
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-[34rem] text-sm leading-[1.65] text-[var(--kiosk-text-soft)] sm:mt-5 sm:text-base">
          {description}
        </p>
      ) : null}
      <div className="landing-section-rule mt-6 sm:mt-10" aria-hidden />
    </header>
  );
}
