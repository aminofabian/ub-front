"use client";

import { useState } from "react";

import { ShopAddressCoach } from "@/components/onboarding/shop-address-coach";
import {
  keepTypedShopAddress,
  suggestShopHandle,
} from "@/lib/shop-lookup";

type ShopAddressFieldProps = {
  id: string;
  businessName: string;
  value: string;
  onChange: (value: string) => void;
  inputClassName: string;
  labelClassName: string;
  disabled?: boolean;
};

/** Address row for the auth signup forms, which share one input style. */
export function ShopAddressField({
  id,
  businessName,
  value,
  onChange,
  inputClassName,
  labelClassName,
  disabled,
}: ShopAddressFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        Shop address
      </label>
      <input
        id={id}
        className={inputClassName}
        value={value}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        placeholder="yourshop"
        onChange={(event) => onChange(keepTypedShopAddress(event.target.value))}
        aria-describedby={`${id}-help`}
      />
      <ShopAddressCoach
        id={`${id}-help`}
        className="mt-1.5"
        businessName={businessName}
        shopSlug={value}
        onPick={onChange}
        showHost
        messageClassName="text-muted-foreground"
        chipClassName="border-black/10 bg-transparent text-foreground hover:border-[var(--auth-accent)] dark:border-white/15"
      />
    </div>
  );
}

/**
 * Suggested address until the owner edits it. Editing, including a tapped
 * shorter name, keeps their choice while the business name changes.
 */
export function useShopAddress() {
  const [override, setOverride] = useState<string | null>(null);
  return {
    slugFor(businessName: string) {
      return override ?? suggestShopHandle(businessName);
    },
    editShopSlug(next: string) {
      setOverride(keepTypedShopAddress(next));
    },
  };
}
