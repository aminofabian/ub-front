"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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

type ShopCopy = {
  title: string;
  /** One line, always visible: the current state of the shop rail. */
  status: string;
  /** Expandable: why the shop rail is reviewed, and what it does not change. */
  detail: string;
  checked: boolean;
};

const WHY_REVIEWED =
  "We review every request because online payment fraud is the main way shops lose money on delivery orders: a shopper can claim a payment they never made, and the goods are already gone.";

const WHY_TILL_UNCHANGED =
  "Your till keeps taking M-Pesa meanwhile, and cash stays the default tender there.";

function shopCopy(
  status: string | null | undefined,
  active: boolean,
): ShopCopy {
  const offered = `Planning to sell online? Turn this on and Kiosk enables M-Pesa on your shop once we approve it. ${WHY_REVIEWED} ${WHY_TILL_UNCHANGED}`;

  if (!active) {
    return {
      title: "M-Pesa on your online shop",
      status: "Activate M-Pesa at the till first.",
      detail: offered,
      checked: false,
    };
  }

  switch ((status ?? "OFF").toUpperCase()) {
    case "PENDING":
      return {
        title: "M-Pesa on your online shop",
        status: "Waiting for Kiosk — shoppers can’t pay online yet.",
        detail: `Turning this off cancels the request. ${WHY_REVIEWED} ${WHY_TILL_UNCHANGED}`,
        checked: true,
      };
    case "APPROVED":
      return {
        title: "M-Pesa on your online shop",
        status: "On — shoppers can pay with M-Pesa on your shop.",
        detail:
          "Turn this off to pull M-Pesa from your shop. Nothing changes at the till: it keeps taking M-Pesa, with cash as the default.",
        checked: true,
      };
    case "REJECTED":
      return {
        title: "M-Pesa on your online shop",
        status: "Not approved. Turn on to ask again.",
        detail: offered,
        checked: false,
      };
    default:
      return {
        title: "M-Pesa on your online shop",
        status: "Off. Turn on to let Kiosk enable it.",
        detail: offered,
        checked: false,
      };
  }
}

/**
 * Shop rail switch for Daraja.
 *
 * Deliberately one control: a switch with a one-line state. The reason online
 * M-Pesa is reviewed (fraud) sits behind a disclosure so the card stays a
 * button, not an essay — and clicking anywhere on the label opens it.
 */
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
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="text-balance text-[13px] font-semibold leading-snug tracking-[-0.015em] text-foreground">
                {copy.title}
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            </span>
            <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
              {copy.status}
            </span>
          </span>
        </button>

        <Switch
          checked={copy.checked}
          disabled={disabled}
          onCheckedChange={(next) => onChange(next === true)}
          aria-label="Allow M-Pesa on the online shop"
        />
      </div>

      {open ? (
        <div
          id={panelId}
          className="border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3.5 py-2.5 text-[12px] leading-relaxed text-muted-foreground"
        >
          {copy.detail}
        </div>
      ) : null}
    </div>
  );
}
