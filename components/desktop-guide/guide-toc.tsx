"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type TocItem = {
  id: string;
  label: string;
  /** Sub-items (h3s) rendered as an indented level. */
  children?: { id: string; label: string }[];
};

/**
 * Scroll-spy table of contents for the desktop guide. Tracks the section
 * currently in view and highlights its entry; clicking scrolls smoothly.
 */
export function GuideToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const sections = items
      .flatMap((item) => [item.id, ...(item.children ?? []).map((c) => c.id)])
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        // The topmost section whose top has crossed the header wins.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: 0 },
    );
    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="On this page" className="text-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--kiosk-border-soft)] bg-[var(--kiosk-panel)] px-3 py-2 font-medium text-[var(--kiosk-text)] lg:hidden"
      >
        On this page
        <span aria-hidden className="text-[var(--kiosk-text-faint)]">
          {expanded ? "−" : "+"}
        </span>
      </button>

      <ol
        className={cn(
          "space-y-0.5 border-l border-[var(--kiosk-border)] pl-3",
          expanded ? "mt-2 block" : "hidden lg:block",
        )}
      >
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={() => setExpanded(false)}
                className={cn(
                  "block rounded-md py-1.5 pr-2 leading-snug transition-colors",
                  isActive
                    ? "-ml-px border-l-2 border-[var(--kiosk-gold)] pl-2 text-[var(--kiosk-text)]"
                    : "pl-3 text-[var(--kiosk-text-faint)] hover:text-[var(--kiosk-text)]",
                )}
              >
                {item.label}
              </a>
              {item.children && item.children.length > 0 ? (
                <ul className="mt-0.5 space-y-0.5 pl-4">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <a
                        href={`#${child.id}`}
                        onClick={() => setExpanded(false)}
                        className={cn(
                          "block rounded py-1 pr-1 text-[13px] leading-snug transition-colors",
                          active === child.id
                            ? "-ml-px border-l-2 border-[var(--kiosk-gold)] pl-2 text-[var(--kiosk-text)]"
                            : "pl-3 text-[var(--kiosk-text-faint)] hover:text-[var(--kiosk-text)]",
                        )}
                      >
                        {child.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
