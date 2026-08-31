"use client";

import type { ReactNode } from "react";

import { WaitingBoxes } from "@/components/auth/waiting-boxes";

type SessionWaitScreenProps = {
  title: string;
  message: string;
  footer?: ReactNode;
};

export function SessionWaitScreen({
  title,
  message,
  footer,
}: SessionWaitScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-6 py-10">
      <div className="w-full max-w-md text-center">
        <WaitingBoxes />
        <h1 className="font-heading mt-8 text-[1.65rem] font-semibold leading-tight tracking-[-0.03em] text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  );
}
