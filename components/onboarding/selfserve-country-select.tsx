"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  DEFAULT_SELFSERVE_COUNTRY_CODE,
  findSelfServeCountry,
  type SelfServeCountry,
} from "@/lib/selfserve-countries";
import { cn } from "@/lib/utils";

type SelfServeCountrySelectProps = {
  id?: string;
  value: string;
  onChange: (countryCode: string) => void;
  countries: readonly SelfServeCountry[];
  disabled?: boolean;
  className?: string;
};

export function SelfServeCountrySelect({
  id,
  value,
  onChange,
  countries,
  disabled,
  className,
}: SelfServeCountrySelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected =
    findSelfServeCountry(countries, value) ??
    findSelfServeCountry(countries, DEFAULT_SELFSERVE_COUNTRY_CODE) ??
    countries[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.countryCode.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q),
    );
  }, [countries, query]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (code: string) => {
    onChange(code.toUpperCase());
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="space-y-1.5">
      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled || countries.length === 0}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label="Country"
          onClick={() => {
            setOpen((next) => !next);
            setQuery("");
          }}
          className={cn(
            className,
            "flex items-center justify-between gap-3 text-left",
          )}
        >
          <span className="min-w-0 truncate">
            {selected
              ? `${selected.label} · ${selected.currency}`
              : "Choose a country"}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-[#8A8782] transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {open ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/40 sm:hidden"
              aria-label="Close country list"
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
            />
            <div className="fixed inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-2xl border border-[#E5E7EB] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_48px_-20px_rgba(20,20,18,0.45)] sm:absolute sm:inset-auto sm:bottom-auto sm:z-30 sm:mt-2 sm:rounded-xl sm:border-[rgba(20,20,18,0.14)] sm:pb-0 sm:shadow-[0_16px_40px_-20px_rgba(20,20,18,0.45)]">
              <div className="mx-auto mb-1 mt-2 h-1 w-10 rounded-full bg-[#D1D5DB] sm:hidden" aria-hidden />
              {countries.length > 8 ? (
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter countries…"
                  autoComplete="off"
                  autoFocus
                  className="w-full border-b border-[rgba(20,20,18,0.08)] bg-transparent px-4 py-3 text-base outline-none placeholder:text-[#8A8782] sm:py-2.5 sm:text-sm"
                  aria-label="Filter countries"
                />
              ) : null}
              <ul
                id={listId}
                role="listbox"
                aria-label="Country"
                className="max-h-[min(60dvh,24rem)] overflow-y-auto py-1 sm:max-h-56"
              >
                {filtered.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-[#8A8782]">
                    No match for “{query.trim()}”
                  </li>
                ) : (
                  filtered.map((c) => {
                    const isSelected = c.countryCode === selected?.countryCode;
                    return (
                      <li key={c.countryCode} role="option" aria-selected={isSelected}>
                        <button
                          type="button"
                          className={cn(
                            "flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-[15px] transition-colors hover:bg-[#F6F5F2] sm:min-h-0 sm:py-2.5 sm:text-sm",
                            isSelected && "bg-[rgba(40,167,69,0.08)]",
                          )}
                          onClick={() => pick(c.countryCode)}
                        >
                          <span>
                            {c.label}
                            <span className="ml-2 text-[#8A8782]">{c.currency}</span>
                          </span>
                          {isSelected ? (
                            <Check className="h-4 w-4 text-[#20863B]" aria-hidden />
                          ) : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </>
        ) : null}
      </div>
      {selected ? (
        <p className="text-xs text-[#8A8782]">
          {selected.timezone.replace("_", " ")}
          {selected.paymentHint ? ` · ${selected.paymentHint}` : ""}
        </p>
      ) : null}
    </div>
  );
}
