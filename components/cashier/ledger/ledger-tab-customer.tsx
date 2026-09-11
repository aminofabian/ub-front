"use client";

import type { CustomerRecord } from "@/lib/api";
import {
  customerPhoneValidationMessage,
  isValidCustomerPhone,
} from "@/lib/customer-phone";
import { customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
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
  customerSearchBusy: boolean;
  customerRegisterBusy: boolean;
  phoneVerificationSent: boolean;
  phoneVerificationCode: string;
  setPhoneVerificationCode: (s: string) => void;
  phoneVerificationCooldownUntil: number;
  requirePhoneVerificationForNewTabCustomers?: boolean;
  allowSearchCustomersByName?: boolean;
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
  customerSearchBusy,
  customerRegisterBusy,
  phoneVerificationSent,
  phoneVerificationCode,
  setPhoneVerificationCode,
  phoneVerificationCooldownUntil,
  requirePhoneVerificationForNewTabCustomers = true,
  allowSearchCustomersByName = false,
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
  const registerNeedsOtp = requirePhoneVerificationForNewTabCustomers;
  const query = customerPhoneQuery.trim();
  const phoneInvalid =
    query.length > 0 &&
    !allowSearchCustomersByName &&
    !isValidCustomerPhone(customerPhoneQuery);
  const showRegister =
    isValidCustomerPhone(customerPhoneQuery) &&
    customerNoPhoneMatch &&
    !selectedCustomer &&
    query.length > 0;
  const findDisabled =
    !online ||
    customerSearchBusy ||
    !query ||
    (!allowSearchCustomersByName && !isValidCustomerPhone(customerPhoneQuery));

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-zinc-600">Customer</p>
      <div className="flex gap-1">
        <input
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
          aria-label="Find customer for tab"
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
      allowSearchCustomersByName ? (
        <p className="text-[11px] text-zinc-500">
          No match — try a phone number to register.
        </p>
      ) : null}
      {showRegister ? (
        <div className="space-y-1.5 rounded-md border border-zinc-200 bg-zinc-50 p-2">
          <p className="text-[11px] font-semibold text-zinc-800">
            Register new number
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
              onClick={() => setSelectedCustomer(null)}
              className="shrink-0 text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
            >
              Clear
            </button>
          </div>
          {suspended ? (
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
        </div>
      ) : (
        <p className="text-[11px] text-zinc-500">
          Find a customer to put this sale on a tab.
        </p>
      )}
    </div>
  );
}
