"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pill } from "lucide-react";

import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import { APP_ROUTES } from "@/lib/config";
import { fetchPharmacyDashboard, type PharmacyDashboard } from "@/lib/pharmacy-api";
import { pharmacyAttention, sentenceFromList } from "@/lib/pharmacy-attention";
import { cn } from "@/lib/utils";

/**
 * On the business hub of a pharmacy: says what in the Pharmacy workspace needs someone, most
 * urgent first, and takes them there. Renders nothing when all is in order or it cannot load.
 */
export function PharmacyHubNotice({
  branchId,
  canReadStock,
  className,
}: {
  branchId: string | null;
  canReadStock: boolean;
  className?: string;
}) {
  const [dashboard, setDashboard] = useState<PharmacyDashboard | null>(null);

  useEffect(() => {
    let alive = true;
    fetchPharmacyDashboard(branchId)
      .then((d) => {
        if (alive) setDashboard(d);
      })
      .catch(() => {
        if (alive) setDashboard(null);
      });
    return () => {
      alive = false;
    };
  }, [branchId]);

  const { urgent, routine } = pharmacyAttention(dashboard, { canReadStock });
  if (urgent.length === 0 && routine.length === 0) return null;

  const isUrgent = urgent.length > 0;
  const shown = (isUrgent ? urgent : routine).slice(0, 3);
  const more = urgent.length + routine.length - shown.length;

  return (
    <section className={cn(HUB_SURFACE, "overflow-hidden bg-[#ffffff]", className)} aria-label="Pharmacy">
      <div className="flex flex-col gap-3 px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center",
              isUrgent ? "bg-[#8a4129]/10 text-[#8a4129]" : "bg-[#0f766e]/10 text-[#0f766e]",
            )}
            aria-hidden
          >
            <Pill className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#141414]">
              {isUrgent ? "The pharmacy needs you" : "In the pharmacy"}
            </p>
            <p className={cn("mt-0.5 text-[12px] leading-snug", HUB_MUTED)}>
              {sentenceFromList(shown)}
              {more > 0 ? ` ${more} more in Pharmacy.` : ""}
            </p>
          </div>
        </div>
        <Link
          href={APP_ROUTES.pharmacy}
          className="inline-flex h-9 w-full shrink-0 items-center justify-center border border-[#14211C]/20 px-3 text-sm font-semibold text-[#14211C] hover:bg-[#14211C]/[0.04] sm:h-8 sm:w-auto sm:text-xs sm:font-medium"
        >
          Open Pharmacy
        </Link>
      </div>
    </section>
  );
}
