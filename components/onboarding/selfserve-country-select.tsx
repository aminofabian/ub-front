"use client";

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
  const selected =
    findSelfServeCountry(countries, value) ??
    findSelfServeCountry(countries, DEFAULT_SELFSERVE_COUNTRY_CODE) ??
    countries[0];

  return (
    <div className="space-y-1.5">
      <select
        id={id}
        className={className}
        value={selected?.countryCode ?? DEFAULT_SELFSERVE_COUNTRY_CODE}
        disabled={disabled || countries.length === 0}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        required
      >
        {countries.map((c) => (
          <option key={c.countryCode} value={c.countryCode}>
            {c.label}
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
