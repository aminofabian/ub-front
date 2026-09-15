"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
import { HUB_BTN } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export type OpenWorkColumn = {
  id: string;
  label: string;
  meta?: string;
  panel: ReactNode;
  /** Optional grid span class for desktop (e.g. sm:col-span-2). */
  className?: string;
};

/**
 * Phone: one column at a time behind a segmented control.
 * Tablet+: all columns side by side.
 */
export function OpenWorkBoard({ columns }: { columns: OpenWorkColumn[] }) {
  const visible = useMemo(
    () => columns.filter((column) => Boolean(column.panel)),
    [columns],
  );
  const [activeId, setActiveId] = useState(visible[0]?.id ?? "");

  useEffect(() => {
    if (visible.length === 0) return;
    if (!visible.some((column) => column.id === activeId)) {
      setActiveId(visible[0]!.id);
    }
  }, [visible, activeId]);

  const active = visible.find((column) => column.id === activeId) ?? visible[0];

  if (visible.length === 0) return null;

  return (
    <section className="space-y-1.5">
      <HubSectionLabel
        title="Open work"
        className="px-0.5"
        meta={
          visible.length > 1
            ? `${visible.length} boards`
            : (active?.meta ?? undefined)
        }
      />

      {visible.length > 1 ? (
        <div
          className="flex gap-px border border-[color-mix(in_srgb,#141414_10%,transparent)] bg-[color-mix(in_srgb,#141414_10%,transparent)] p-px sm:hidden"
          role="tablist"
          aria-label="Open work boards"
        >
          {visible.map((column) => {
            const selected = column.id === active?.id;
            return (
              <button
                key={column.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveId(column.id)}
                className={cn(
                  HUB_BTN,
                  "min-h-9 min-w-0 flex-1 bg-white px-2 py-1.5 text-center",
                  selected
                    ? "bg-[#0f766e] text-white"
                    : "text-[#5C5C5C] hover:text-[#0f766e]",
                )}
              >
                <span className="block truncate text-[12px] font-semibold leading-none tracking-[-0.015em]">
                  {column.label}
                </span>
                {column.meta ? (
                  <span
                    className={cn(
                      "mt-1 block truncate text-[10px] font-medium leading-none",
                      selected ? "text-white/80" : "text-[#8A8A8A]",
                    )}
                  >
                    {column.meta}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="sm:hidden">{active?.panel}</div>

      <div
        className={cn(
          "hidden gap-2 sm:grid",
          visible.length === 1 && "sm:grid-cols-1",
          visible.length === 2 && "sm:grid-cols-2",
          visible.length >= 3 && "sm:grid-cols-2 xl:grid-cols-3",
        )}
      >
        {visible.map((column) => (
          <div key={column.id} className={cn("min-w-0", column.className)}>
            {column.panel}
          </div>
        ))}
      </div>
    </section>
  );
}
