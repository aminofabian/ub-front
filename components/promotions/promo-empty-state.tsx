"use client";

import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { promoEmptyIcon, promoEmptyShell } from "./promotions-ui-tokens";

export function PromoEmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(promoEmptyShell, className)}>
      <div className={promoEmptyIcon}>
        <Icon className="size-7" aria-hidden />
      </div>
      <div className="max-w-md space-y-2">
        <p className="font-heading text-base font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-col items-center gap-2 sm:flex-row">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export function PromoEmptyCreateButton({
  onClick,
  label = "Create promotion",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button type="button" className="h-10 gap-2 px-5 font-semibold shadow-sm" onClick={onClick}>
      {label}
    </Button>
  );
}
