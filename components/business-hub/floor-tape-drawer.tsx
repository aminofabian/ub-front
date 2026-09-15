"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Receipt } from "lucide-react";

import { RecentTicksRail } from "@/components/business-hub/recent-ticks-rail";
import { HUB_BTN, HUB_SURFACE } from "@/lib/business-hub/constants";
import type { HubDrawout } from "@/lib/business-hub/drawouts-for-hub";
import type { RecentTick } from "@/lib/business-hub/ticks-from-transactions";
import { cn } from "@/lib/utils";

type FloorTapeLane = {
  key: string;
  title: string;
  subtitle: string;
  ticks: RecentTick[];
  drawouts: HubDrawout[];
  showCashier: boolean;
  accent: "teal" | "ink";
};

/**
 * Phone entry for floor tape: compact summary that opens a full-height drawer
 * so the pulse board stays scannable instead of burying Summary under a long rail.
 */
export function FloorTapeDrawer({
  lanes,
  currency,
  justUpdated = false,
  dualLanes = false,
}: {
  lanes: FloorTapeLane[];
  currency?: string | null;
  justUpdated?: boolean;
  dualLanes?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(lanes[0]?.key ?? "");

  useEffect(() => {
    if (lanes.length === 0) return;
    if (!lanes.some((lane) => lane.key === activeKey)) {
      setActiveKey(lanes[0]!.key);
    }
  }, [lanes, activeKey]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (lanes.length === 0) return null;

  const primary = lanes[0]!;
  const tickCount = lanes.reduce((sum, lane) => sum + lane.ticks.length, 0);
  const drawoutCount = lanes.reduce(
    (sum, lane) => sum + lane.drawouts.length,
    0,
  );
  const active =
    lanes.find((lane) => lane.key === activeKey) ?? lanes[0]!;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          HUB_SURFACE,
          HUB_BTN,
          "flex w-full items-center gap-3 px-3.5 py-3 text-left xl:hidden",
          justUpdated && "hub-scan-sweep ring-1 ring-[#0f766e]/35",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center border border-[color-mix(in_srgb,#141414_12%,transparent)] bg-white text-[#0f766e]">
          <Receipt className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold tracking-[-0.015em] text-[#141414]">
            {lanes.length > 1 ? "Till lanes" : primary.title}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-[#7A7A7A]">
            {tickCount > 0
              ? `${tickCount} recent · ${primary.subtitle}`
              : drawoutCount > 0
                ? `${drawoutCount} drawouts · ${primary.subtitle}`
                : primary.subtitle}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-[#C8C2B6]" aria-hidden />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#141414]/40 xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Floor tape"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close floor tape"
            onClick={() => setOpen(false)}
          />

          <div
            className={cn(
              "relative z-10 mt-auto flex max-h-[92dvh] w-full flex-col bg-white",
              "animate-in fade-in slide-in-from-bottom duration-300",
            )}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[color-mix(in_srgb,#141414_10%,transparent)] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#0f766e]">
                  Floor tape
                </p>
                <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-[#141414]">
                  {lanes.length > 1 ? "Till lanes" : primary.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn(
                  HUB_BTN,
                  "inline-flex h-9 items-center border border-[color-mix(in_srgb,#141414_12%,transparent)] px-3 text-[12px] font-medium text-[#141414]",
                )}
              >
                Done
              </button>
            </header>

            {lanes.length > 1 ? (
              <div
                className="flex shrink-0 gap-1 overflow-x-auto border-b border-[color-mix(in_srgb,#141414_8%,transparent)] px-3 py-2"
                role="tablist"
                aria-label="Till lanes"
              >
                {lanes.map((lane) => {
                  const selected = lane.key === active.key;
                  return (
                    <button
                      key={lane.key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveKey(lane.key)}
                      className={cn(
                        HUB_BTN,
                        "inline-flex h-8 shrink-0 items-center px-3 text-[12px] font-medium",
                        selected
                          ? "border border-[#0f766e] bg-white text-[#0f766e]"
                          : "bg-white text-[#5A5A5A] ring-1 ring-[color-mix(in_srgb,#141414_12%,transparent)]",
                      )}
                    >
                      {lane.title}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div
                className={cn(
                  "grid gap-2",
                  dualLanes && lanes.length === 2 && "sm:grid-cols-2",
                )}
              >
                {(lanes.length > 1 ? [active] : lanes).map((lane, index) => (
                  <RecentTicksRail
                    key={lane.key}
                    ticks={lane.ticks}
                    drawouts={lane.drawouts}
                    currency={currency}
                    justUpdated={justUpdated && index === 0}
                    title={lane.title}
                    subtitle={lane.subtitle}
                    showCashier={lane.showCashier}
                    accent={lane.accent}
                    laneIndex={dualLanes ? index : undefined}
                    fillViewport={false}
                    className="max-h-none border-0 shadow-none"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
