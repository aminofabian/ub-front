"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

function partOfDay(hour: number): string {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function firstNameFrom(name?: string | null): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "";
  const first = trimmed.split(/\s+/)[0] ?? "";
  if (first.includes("@")) return first.split("@")[0] ?? "";
  return first;
}

export function HubGreeting({
  name,
  subtitle,
  className,
}: {
  name?: string | null;
  subtitle?: string;
  className?: string;
}) {
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    setGreeting(`Good ${partOfDay(new Date().getHours())}`);
  }, []);

  const first = firstNameFrom(name);

  return (
    <header className={cn("min-w-0", className)}>
      <h2 className="font-heading text-[19px] font-semibold leading-tight tracking-[-0.03em] text-[#141414] sm:text-[22px]">
        {greeting}
        {first ? `, ${first}` : ""}
      </h2>
      {subtitle ? (
        <p className="mt-1 text-[12px] leading-snug text-[#6F6F6F] sm:text-[13px]">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
