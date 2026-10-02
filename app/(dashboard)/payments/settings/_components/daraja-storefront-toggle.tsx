"use client";

import { Switch } from "@/components/ui/switch";

export function darajaShopGated(
  gatewayType: string,
  custodyProvider: string | null | undefined,
) {
  if (gatewayType === "DARAJA") return true;
  return gatewayType === "CUSTODY_MPESA" && custodyProvider === "DARAJA";
}

export function shopApprovalBadge(status: string | null | undefined) {
  switch ((status ?? "OFF").toUpperCase()) {
    case "PENDING":
      return "Shop pending";
    case "APPROVED":
      return "On the shop";
    case "REJECTED":
      return "Shop declined";
    default:
      return "Till only";
  }
}

function shopCopy(status: string | null | undefined, active: boolean) {
  if (!active) {
    return {
      title: "Online shop",
      body: "Activate this method first. The till takes it immediately, and cash stays the default tender. The shop stays off until you request it and we approve.",
      checked: false,
    };
  }
  switch ((status ?? "OFF").toUpperCase()) {
    case "PENDING":
      return {
        title: "Online shop — waiting for approval",
        body: "The till already takes Daraja. Cash stays the default tender. The shop stays off until we approve this request. Turn it off to cancel.",
        checked: true,
      };
    case "APPROVED":
      return {
        title: "Online shop — on",
        body: "Shoppers can pay with Daraja. Turn this off to pull it from the shop. The till is unchanged, and cash stays the default there.",
        checked: true,
      };
    case "REJECTED":
      return {
        title: "Online shop — not approved",
        body: "The till still takes it, with cash as the default. Turn this on to ask again.",
        checked: false,
      };
    default:
      return {
        title: "Online shop — off",
        body: "The till takes Daraja now. Cash stays the default tender. Turn this on to ask us to allow it on the shop — it will not appear there until we approve.",
        checked: false,
      };
  }
}

export function DarajaStorefrontToggle({
  status,
  active,
  canWrite,
  busy,
  onChange,
}: {
  status: string | null | undefined;
  active: boolean;
  canWrite: boolean;
  busy: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const copy = shopCopy(status, active);
  const disabled = busy || !canWrite || !active;

  return (
    <div className="flex items-start justify-between gap-3 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold tracking-[-0.015em] text-foreground">
          {copy.title}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          {copy.body}
        </p>
      </div>
      <Switch
        checked={copy.checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange(next === true)}
        aria-label="Enable Daraja on the online shop"
      />
    </div>
  );
}
