"use client";

import * as React from "react";

import { parseMessageText } from "@/lib/message-text";
import { cn } from "@/lib/utils";

/**
 * The one renderer for message text. Links, emails and Kenyan phone numbers
 * become tappable; everything else keeps its exact whitespace.
 */
export function MessageBody({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const segments = React.useMemo(() => parseMessageText(text), [text]);

  return (
    <p
      className={cn(
        "whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
        className,
      )}
    >
      {segments.map((segment, index) => {
        if (!segment.href) {
          return <React.Fragment key={index}>{segment.value}</React.Fragment>;
        }
        const external = segment.type === "url";
        return (
          <a
            key={index}
            href={segment.href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="underline decoration-current/35 underline-offset-2 transition-colors hover:decoration-current"
          >
            {segment.value}
          </a>
        );
      })}
    </p>
  );
}
