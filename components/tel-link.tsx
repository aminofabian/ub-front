"use client";

import type { MouseEvent, ReactNode } from "react";

import { showOpenPhoneToast } from "@/components/super-admin/themed-confirm-toast";
import { cn } from "@/lib/utils";

type TelLinkProps = {
  phone: string;
  className?: string;
  children?: ReactNode;
};

/** Phone number control that confirms via toast instead of a bare `tel:` navigation. */
export function TelLink({ phone, className, children }: TelLinkProps) {
  const display = phone.trim();
  if (!display) return null;

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    showOpenPhoneToast(display);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer appearance-none border-0 bg-transparent p-0 text-left text-primary underline-offset-2 hover:underline",
        className,
      )}
    >
      {children ?? display}
    </button>
  );
}
