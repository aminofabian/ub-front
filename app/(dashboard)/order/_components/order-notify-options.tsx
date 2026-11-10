"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import { fetchOpsAlertSettings, type PurchaseOrderNotifyChannel } from "@/lib/api";
import { cn } from "@/lib/utils";

export type OrderNotifyPrefs = {
  admin: boolean;
  adminChannel: PurchaseOrderNotifyChannel;
  supplier: boolean;
  supplierChannel: PurchaseOrderNotifyChannel;
};

const STORAGE_KEY = "palmart:order-notify-prefs";

/** Nothing is sent unless the person ticks it. */
const DEFAULT_PREFS: OrderNotifyPrefs = {
  admin: false,
  adminChannel: "sms",
  supplier: false,
  supplierChannel: "whatsapp",
};

function isChannel(v: unknown): v is PurchaseOrderNotifyChannel {
  return v === "whatsapp" || v === "sms" || v === "both";
}

function readPrefs(): OrderNotifyPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<OrderNotifyPrefs>;
    return {
      admin: p.admin === true,
      adminChannel: isChannel(p.adminChannel)
        ? p.adminChannel
        : DEFAULT_PREFS.adminChannel,
      supplier: p.supplier === true,
      supplierChannel: isChannel(p.supplierChannel)
        ? p.supplierChannel
        : DEFAULT_PREFS.supplierChannel,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * Remembers the last choice in this browser (a convenience only — it still works with storage
 * blocked) and checks once whether the business has a verified admin number.
 * `adminReady` is `null` while unknown (loading, or the person may not read alert settings);
 * only an explicit `false` disables the admin option.
 */
export function useOrderNotifyPrefs() {
  const [prefs, setPrefsState] = useState<OrderNotifyPrefs>(DEFAULT_PREFS);
  const [adminReady, setAdminReady] = useState<boolean | null>(null);

  useEffect(() => {
    setPrefsState(readPrefs());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchOpsAlertSettings()
      .then((s) => {
        if (!cancelled) setAdminReady(Boolean(s.phoneVerified));
      })
      .catch(() => {
        if (!cancelled) setAdminReady(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPrefs = useCallback((next: OrderNotifyPrefs) => {
    setPrefsState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked — the choice still applies for this session */
    }
  }, []);

  return { prefs, setPrefs, adminReady };
}

type Props = {
  prefs: OrderNotifyPrefs;
  onChange: (next: OrderNotifyPrefs) => void;
  supplierName: string;
  supplierPhone: string | null;
  /** Portal-connected suppliers already get their own alert when an order is sent. */
  supplierPortalLinked?: boolean;
  adminReady: boolean | null;
  disabled?: boolean;
};

const ink = "var(--order-ink,#15231f)";

function ChannelSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: PurchaseOrderNotifyChannel;
  onChange: (v: PurchaseOrderNotifyChannel) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as PurchaseOrderNotifyChannel)}
      className="h-9 shrink-0 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white px-2 text-[12px] font-medium text-[var(--order-ink,#15231f)] outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] disabled:opacity-40"
    >
      <option value="whatsapp">WhatsApp</option>
      <option value="sms">SMS</option>
      <option value="both">WhatsApp + SMS</option>
    </select>
  );
}

function Row({
  checked,
  onCheckedChange,
  disabled,
  title,
  hint,
  channel,
  onChannelChange,
  channelLabel,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled: boolean;
  title: string;
  hint: React.ReactNode;
  channel: PurchaseOrderNotifyChannel;
  onChannelChange: (v: PurchaseOrderNotifyChannel) => void;
  channelLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <label
        className={cn(
          "flex min-h-9 min-w-0 flex-1 cursor-pointer items-start gap-2",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <input
          type="checkbox"
          checked={checked && !disabled}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-1 size-4 shrink-0 accent-[var(--pos-primary,#0f766e)]"
        />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-[var(--order-ink,#15231f)]">
            {title}
          </span>
          <span className="block text-[11px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
            {hint}
          </span>
        </span>
      </label>
      <ChannelSelect
        value={channel}
        onChange={onChannelChange}
        disabled={disabled || !checked}
        label={channelLabel}
      />
    </div>
  );
}

/** Per-order, opt-in "send the order list" choices shown next to Save. */
export function OrderNotifyOptions({
  prefs,
  onChange,
  supplierName,
  supplierPhone,
  supplierPortalLinked,
  adminReady,
  disabled,
}: Props) {
  const adminBlocked = adminReady === false;
  const supplierBlocked = !supplierPhone;
  return (
    <fieldset
      disabled={disabled}
      className="mt-2 space-y-2 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white p-2.5"
      style={{ color: ink }}
    >
      <legend className="px-1 text-[10px] font-semibold uppercase tracking-wide text-[color-mix(in_srgb,var(--order-ink,#15231f)_50%,transparent)]">
        Send the order list when you save
      </legend>
      <Row
        checked={prefs.admin}
        onCheckedChange={(v) => onChange({ ...prefs, admin: v })}
        disabled={adminBlocked}
        title="Admin"
        hint={
          adminBlocked ? (
            <>
              No verified admin number.{" "}
              <Link
                href={APP_ROUTES.business}
                className="underline underline-offset-2"
              >
                Add one in WhatsApp alerts
              </Link>
            </>
          ) : (
            "Your verified owner number"
          )
        }
        channel={prefs.adminChannel}
        onChannelChange={(v) => onChange({ ...prefs, adminChannel: v })}
        channelLabel="Admin channel"
      />
      <Row
        checked={prefs.supplier}
        onCheckedChange={(v) => onChange({ ...prefs, supplier: v })}
        disabled={supplierBlocked}
        title={supplierName || "Supplier"}
        hint={
          supplierBlocked
            ? "No phone on file for this supplier"
            : supplierPortalLinked
              ? `${supplierPhone} — also gets a supplier-portal alert`
              : supplierPhone
        }
        channel={prefs.supplierChannel}
        onChannelChange={(v) => onChange({ ...prefs, supplierChannel: v })}
        channelLabel="Supplier channel"
      />
      {prefs.supplier && !supplierBlocked ? (
        <p className="text-[10px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
          “Save &amp; WhatsApp” opens WhatsApp itself, so the supplier copy is
          skipped there.
        </p>
      ) : null}
    </fieldset>
  );
}
