"use client";

import { useEffect, useRef, useState } from "react";

import type { CustomerRecord } from "@/lib/api";
import {
  customerPhoneValidationMessage,
  isValidCustomerPhone,
} from "@/lib/customer-phone";
import { customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import { TillLastBasketHint } from "@/components/cashier/till-last-basket-hint";
import { cn } from "@/lib/utils";

type LedgerTabCustomerProps = {
  online: boolean;
  currency: string;
  payableTotal: number;
  canManageCustomers: boolean;
  customerPhoneQuery: string;
  setCustomerPhoneQuery: (s: string) => void;
  customerHits: CustomerRecord[];
  customerNoPhoneMatch: boolean;
  customerRegisterName: string;
  setCustomerRegisterName: (s: string) => void;
  customerRegisterPhone?: string;
  setCustomerRegisterPhone?: (s: string) => void;
  customerSearchBusy: boolean;
  customerRegisterBusy: boolean;
  phoneVerificationSent: boolean;
  phoneVerificationCode: string;
  setPhoneVerificationCode: (s: string) => void;
  phoneVerificationCooldownUntil: number;
  requirePhoneVerificationForNewTabCustomers?: boolean;
  allowSearchCustomersByName?: boolean;
  /**
   * Cash / M-Pesa history capture — skippable, no OTP, never blocks Complete.
   * Tab checkout stays required and uses the existing credit copy.
   */
  optional?: boolean;
  onSearchCustomers: () => void;
  onSendPhoneVerification: () => void;
  onRegisterCustomer: () => void;
  selectedCustomer: CustomerRecord | null;
  setSelectedCustomer: (c: CustomerRecord | null) => void;
};

export function LedgerTabCustomer({
  online,
  currency,
  payableTotal,
  canManageCustomers,
  customerPhoneQuery,
  setCustomerPhoneQuery,
  customerHits,
  customerNoPhoneMatch,
  customerRegisterName,
  setCustomerRegisterName,
  customerRegisterPhone = "",
  setCustomerRegisterPhone,
  customerSearchBusy,
  customerRegisterBusy,
  phoneVerificationSent,
  phoneVerificationCode,
  setPhoneVerificationCode,
  phoneVerificationCooldownUntil,
  requirePhoneVerificationForNewTabCustomers = true,
  allowSearchCustomersByName = false,
  optional = false,
  onSearchCustomers,
  onSendPhoneVerification,
  onRegisterCustomer,
  selectedCustomer,
  setSelectedCustomer,
}: LedgerTabCustomerProps) {
  const selectedPhone = selectedCustomer
    ? customerPrimaryPhone(selectedCustomer.phones)
    : null;
  const owed = selectedCustomer
    ? Number(selectedCustomer.credit.balanceOwed)
    : 0;
  const suspended = Boolean(selectedCustomer?.credit.creditSuspended);
  const registerNeedsOtp =
    !optional && requirePhoneVerificationForNewTabCustomers;
  const query = customerPhoneQuery.trim();
  const phoneInvalid =
    query.length > 0 &&
    !allowSearchCustomersByName &&
    !optional &&
    !isValidCustomerPhone(customerPhoneQuery);
  const showRegister =
    customerNoPhoneMatch &&
    !selectedCustomer &&
    query.length > 0 &&
    (optional || isValidCustomerPhone(customerPhoneQuery));
  const findDisabled =
    !online ||
    customerSearchBusy ||
    !query ||
    (!optional &&
      !allowSearchCustomersByName &&
      !isValidCustomerPhone(customerPhoneQuery));
  const registerPhoneInvalid =
    optional &&
    customerRegisterPhone.trim().length > 0 &&
    !isValidCustomerPhone(customerRegisterPhone);
  const [finderOpen, setFinderOpen] = useState(!optional);
  const findInputRef = useRef<HTMLInputElement>(null);
  const busyOptional =
    optional &&
    (Boolean(selectedCustomer) ||
      query.length > 0 ||
      customerHits.length > 0 ||
      showRegister);

  useEffect(() => {
    if (busyOptional) setFinderOpen(true);
  }, [busyOptional]);

  useEffect(() => {
    if (optional && finderOpen && !selectedCustomer) {
      findInputRef.current?.focus();
    }
  }, [optional, finderOpen, selectedCustomer]);

  if (optional && !finderOpen && !selectedCustomer) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          disabled={!online}
          onClick={() => setFinderOpen(true)}
          className="flex h-8 w-full items-center justify-between rounded-md border border-dashed border-zinc-300 px-2.5 text-left text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
        >
          <span>Link customer</span>
          <span className="font-normal text-zinc-400">Optional</span>
        </button>
        <p className="text-[11px] text-zinc-500">
          Walk-ins stay quick. Repeat sales build who-buys-what history.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-zinc-600">
        {optional ? "Customer (optional)" : "Customer"}
      </p>
      <div className="flex gap-1">
        <input
          ref={findInputRef}
          value={customerPhoneQuery}
          onChange={(e) => setCustomerPhoneQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!findDisabled) onSearchCustomers();
            }
          }}
          placeholder={
            allowSearchCustomersByName ? "Name or phone…" : "Phone 07… or 7…"
          }
          disabled={!online}
          aria-label={
            optional ? "Find customer for this sale" : "Find customer for tab"
          }
          className="h-8 min-w-0 flex-1 rounded-md border border-zinc-300 px-2 text-xs outline-none focus:ring-2 focus:ring-[var(--pos-primary)] disabled:opacity-40"
        />
        <button
          type="button"
          disabled={findDisabled}
          onClick={onSearchCustomers}
          className="h-8 shrink-0 rounded-md border border-zinc-200 px-2.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40"
        >
          {customerSearchBusy ? "…" : "Find"}
        </button>
        {optional && !selectedCustomer ? (
          <button
            type="button"
            onClick={() => {
              setCustomerPhoneQuery("");
              setFinderOpen(false);
            }}
            className="h-8 shrink-0 px-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
          >
            Skip
          </button>
        ) : null}
      </div>
      {phoneInvalid ? (
        <p className="text-[11px] text-red-700">
          {customerPhoneValidationMessage(customerPhoneQuery) ??
            "Enter a valid phone number."}
        </p>
      ) : null}
      {customerHits.length > 0 ? (
        <ul className="max-h-24 space-y-0.5 overflow-y-auto rounded-md border border-zinc-200">
          {customerHits.map((c) => {
            const hitPhone = customerPrimaryPhone(c.phones);
            const active = selectedCustomer?.id === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(c)}
                  className={cn(
                    "w-full px-2 py-1.5 text-left text-[12px]",
                    active
                      ? "bg-[color-mix(in_srgb,var(--pos-primary)_14%,white)] font-semibold"
                      : "hover:bg-zinc-50",
                  )}
                >
                  {c.name}
                  {hitPhone ? (
                    <span className="ml-1 font-normal text-zinc-500">
                      {hitPhone}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {customerNoPhoneMatch &&
      !selectedCustomer &&
      query &&
      !isValidCustomerPhone(customerPhoneQuery) &&
      !optional &&
      allowSearchCustomersByName ? (
        <p className="text-[11px] text-zinc-500">
          No match — try a phone number to register.
        </p>
      ) : null}
      {showRegister ? (
        <div className="space-y-1.5 rounded-md border border-zinc-200 bg-zinc-50 p-2">
          <p className="text-[11px] font-semibold text-zinc-800">
            {optional ? "Add new customer" : "Register new number"}
          </p>
          {canManageCustomers ? (
            <>
              <input
                value={customerRegisterName}
                onChange={(e) => setCustomerRegisterName(e.target.value)}
                placeholder="Full name"
                disabled={
                  !online ||
                  customerRegisterBusy ||
                  (registerNeedsOtp && phoneVerificationSent)
                }
                className="h-8 w-full rounded-md border border-zinc-300 px-2 text-xs outline-none focus:ring-2 focus:ring-[var(--pos-primary)] disabled:opacity-40"
              />
              {optional &&
              setCustomerRegisterPhone &&
              !isValidCustomerPhone(customerPhoneQuery) ? (
                <input
                  value={customerRegisterPhone}
                  onChange={(e) => setCustomerRegisterPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="Phone (optional)"
                  disabled={!online || customerRegisterBusy}
                  className="h-8 w-full rounded-md border border-zinc-300 px-2 text-xs outline-none focus:ring-2 focus:ring-[var(--pos-primary)] disabled:opacity-40"
                />
              ) : null}
              {registerPhoneInvalid ? (
                <p className="text-[11px] text-red-700">
                  {customerPhoneValidationMessage(customerRegisterPhone) ??
                    "Enter a valid phone number."}
                </p>
              ) : null}
              {registerNeedsOtp && phoneVerificationSent ? (
                <input
                  value={phoneVerificationCode}
                  onChange={(e) =>
                    setPhoneVerificationCode(
                      e.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                  inputMode="numeric"
                  placeholder="••••"
                  aria-label="4-digit verification code"
                  disabled={!online || customerRegisterBusy}
                  className="h-8 w-full rounded-md border border-zinc-300 px-2 text-center text-sm font-semibold tracking-[0.3em] outline-none focus:ring-2 focus:ring-[var(--pos-primary)] disabled:opacity-40"
                />
              ) : null}
              <button
                type="button"
                disabled={
                  !online ||
                  customerRegisterBusy ||
                  !customerRegisterName.trim() ||
                  registerPhoneInvalid ||
                  (registerNeedsOtp &&
                    phoneVerificationSent &&
                    phoneVerificationCode.length !== 4) ||
                  (registerNeedsOtp &&
                    !phoneVerificationSent &&
                    Date.now() < phoneVerificationCooldownUntil)
                }
                onClick={
                  registerNeedsOtp && !phoneVerificationSent
                    ? onSendPhoneVerification
                    : onRegisterCustomer
                }
                className="h-8 w-full rounded-md border border-zinc-200 bg-white text-xs font-medium hover:bg-zinc-50 disabled:opacity-40"
              >
                {customerRegisterBusy
                  ? "Working…"
                  : registerNeedsOtp && !phoneVerificationSent
                    ? "Send code"
                    : optional
                      ? "Add customer"
                      : "Register"}
              </button>
            </>
          ) : (
            <p className="text-[11px] text-zinc-500">
              No permission to register customers.
            </p>
          )}
        </div>
      ) : null}
      {selectedCustomer ? (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-[12px] font-semibold text-zinc-900">
              {selectedCustomer.name}
              {selectedPhone ? (
                <span className="font-normal text-zinc-500">
                  {" "}
                  {selectedPhone}
                </span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCustomer(null);
                if (optional) setFinderOpen(false);
              }}
              className="shrink-0 text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
            >
              Clear
            </button>
          </div>
          {optional ? (
            <p className="mt-0.5 text-[11px] text-zinc-600">
              Linked for purchase history
              {Number.isFinite(owed) && owed > 0.001
                ? ` · tab owes ${owed.toFixed(2)}`
                : ""}
            </p>
          ) : suspended ? (
            <p className="mt-0.5 text-[11px] font-medium text-red-700">
              Tab suspended — they cannot take more credit.
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-zinc-600">
              {currency} {payableTotal.toFixed(2)} on tab
              {Number.isFinite(owed) && owed > 0.001
                ? ` · owes ${owed.toFixed(2)}`
                : ""}
            </p>
          )}
          <TillLastBasketHint customerId={selectedCustomer.id} />
        </div>
      ) : (
        <p className="text-[11px] text-zinc-500">
          {optional
            ? "Find a regular to attach this sale. Leave empty for a walk-in."
            : "Find a customer to put this sale on a tab."}
        </p>
      )}
    </div>
  );
}
