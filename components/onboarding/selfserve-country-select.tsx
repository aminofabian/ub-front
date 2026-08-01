"use client";

import { useMemo, useState } from "react";

import {
  DEFAULT_SELFSERVE_COUNTRY_CODE,
  findSelfServeCountry,
  type SelfServeCountry,
} from "@/lib/selfserve-countries";

type SelfServeCountrySelectProps = {
  id?: string;
  value: string;
  onChange: (countryCode: string) => void;
  countries: readonly SelfServeCountry[];
  disabled?: boolean;
  className?: string;
};

export function SelfServeCountrySelect({
  id = "selfserve-country",
  value,
  onChange,
  countries,
  disabled,
  className,
}: SelfServeCountrySelectProps) {
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

  const showSearch = countries.length > 12;
  const options = useMemo(() => {
    if (!selected) return filtered;
    if (filtered.some((c) => c.countryCode === selected.countryCode)) {
      return filtered;
    }
    return [selected, ...filtered];
  }, [filtered, selected]);

  return (
    <div className="space-y-1.5">
      {showSearch ? (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search country or currency…"
          disabled={disabled || countries.length === 0}
          className={className}
          autoComplete="off"
          aria-label="Search countries"
        />
      ) : null}
      <select
        id={id}
        className={className}
        value={selected?.countryCode ?? DEFAULT_SELFSERVE_COUNTRY_CODE}
        disabled={disabled || countries.length === 0}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setQuery("");
        }}
        required
      >
        {options.map((c) => (
          <option key={c.countryCode} value={c.countryCode}>
            {c.label} ({c.currency})
          </option>
        ))}
      </select>
      {selected ? (
        <p className="text-xs text-muted-foreground">
          Currency {selected.currency} · {selected.timezone}
          {selected.paymentHint ? ` · ${selected.paymentHint}` : ""}
        </p>
      ) : null}
    </div>
  );
}
