"use client";

import { SupportChat } from "@/components/support/support-chat";

export default function SupportPage() {
  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Support</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            A direct line to the Kiosk team — replies land here live.
          </p>
        </div>
      </div>
      <div className="h-[calc(100dvh-13.25rem)] min-h-[440px]">
        <SupportChat />
      </div>
    </div>
  );
}
