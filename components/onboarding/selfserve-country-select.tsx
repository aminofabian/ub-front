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
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-[rgba(20,20,18,0.14)] bg-white shadow-[0_16px_40px_-20px_rgba(20,20,18,0.45)]">
            {countries.length > 8 ? (
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter countries…"
                autoComplete="off"
                autoFocus
                className="w-full border-b border-[rgba(20,20,18,0.08)] bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-[#8A8782]"
                aria-label="Filter countries"
              />
            ) : null}
            <ul
              id={listId}
              role="listbox"
              aria-label="Country"
              className="max-h-56 overflow-y-auto py-1"
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
                          "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#F6F5F2]",
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
