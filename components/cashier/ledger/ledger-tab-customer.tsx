"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import type { CustomerRecord } from "@/lib/api";
import {
  customerFindLooksLikeName,
  customerFindQueryKind,
  customerPhoneValidationMessage,
  isValidCustomerPhone,
} from "@/lib/customer-phone";
import { customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import { TillLastBasketHint } from "@/components/cashier/till-last-basket-hint";

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
  const queryKind = customerFindQueryKind(customerPhoneQuery);
  const nameLike = customerFindLooksLikeName(customerPhoneQuery);
  const phoneInvalid =
    query.length > 0 &&
    !allowSearchCustomersByName &&
    !optional &&
    !isValidCustomerPhone(customerPhoneQuery);
  const needsRegisterPhone =
    !isValidCustomerPhone(customerPhoneQuery) &&
    Boolean(setCustomerRegisterPhone);
  const showRegister =
    customerNoPhoneMatch &&
    !selectedCustomer &&
    query.length > 0 &&
    (optional ||
      isValidCustomerPhone(customerPhoneQuery) ||
      (allowSearchCustomersByName && nameLike));
  const findDisabled =
    !online ||
    customerSearchBusy ||
    !query ||
    (!optional &&
      !allowSearchCustomersByName &&
      !isValidCustomerPhone(customerPhoneQuery));
  const registerPhoneInvalid =
    needsRegisterPhone &&
    customerRegisterPhone.trim().length > 0 &&
    !isValidCustomerPhone(customerRegisterPhone);
  const registerPhoneMissing =
    !optional &&
    needsRegisterPhone &&
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
          className="flex h-8 w-full items-center justify-between rounded-none border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] px-2.5 text-left text-[11px] font-medium text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] disabled:opacity-40"
        >
          <span>Link customer</span>
          <span className="font-normal text-muted-foreground/70">Optional</span>
        </button>
        <p className="text-[11px] text-muted-foreground">
          Walk-ins stay quick. Repeat sales build who-buys-what history.
        </p>
      </div>
    );
  }

  const modeHint =
    queryKind === "phone"
      ? "Matching phone…"
      : queryKind === "name"
        ? "Matching name…"
        : queryKind === "mixed"
          ? "Matching name & phone…"
          : allowSearchCustomersByName
            ? "Type a name or phone — matches appear as you type"
            : "Enter a phone number";

  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {optional ? "Customer (optional)" : "Customer"}
      </p>
      <div className="flex gap-1">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70"
            aria-hidden
          />
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
              allowSearchCustomersByName
                ? "Name or phone…"
                : "Phone 07… or 7…"
            }
            disabled={!online}
            aria-label={
              optional
                ? "Find customer for this sale"
                : "Find customer for tab"
            }
            className="h-8 w-full rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] py-0 pl-7 pr-2 text-xs outline-none focus:ring-2 focus:ring-[var(--pos-primary)] disabled:opacity-40"
          />
        </div>
        <button
          type="button"
          disabled={findDisabled}
          onClick={onSearchCustomers}
          className="h-8 shrink-0 rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2.5 text-xs font-medium hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] disabled:opacity-40"
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
            className="h-8 shrink-0 px-1.5 text-[11px] font-medium text-muted-foreground hover:text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)]"
          >
            Skip
          </button>
        ) : null}
      </div>
      {!selectedCustomer && !phoneInvalid ? (
        <p className="text-[10px] text-muted-foreground">
          {customerSearchBusy ? "Searching…" : modeHint}
        </p>
      ) : null}
      {phoneInvalid ? (
        <p className="text-[11px] text-red-700">
          {customerPhoneValidationMessage(customerPhoneQuery) ??
            "Enter a valid phone number."}
        </p>
      ) : null}
      {customerHits.length > 0 && !selectedCustomer ? (
        <ul className="pos-scroll max-h-28 space-y-0.5 overflow-y-auto border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] dark:border-border/40">
          {customerHits.map((c) => {
            const hitPhone = customerPrimaryPhone(c.phones);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(c)}
                  className="w-full px-2 py-1.5 text-left text-[12px] hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]"
                >
                  <span className="font-medium">{c.name}</span>
                  {hitPhone ? (
                    <span className="mt-0.5 block font-normal text-muted-foreground">
                      {hitPhone}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {showRegister ? (
        <div className="space-y-1.5 rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] p-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {optional ? "Add new customer" : "Register for tab"}
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
                className="h-8 w-full rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] px-2 text-xs outline-none focus:ring-2 focus:ring-[var(--pos-primary)] disabled:opacity-40"
              />
              {needsRegisterPhone ? (
                <input
                  value={customerRegisterPhone}
                  onChange={(e) => setCustomerRegisterPhone?.(e.target.value)}
                  inputMode="tel"
                  placeholder={optional ? "Phone (optional)" : "Phone 07…"}
                  disabled={!online || customerRegisterBusy}
                  className="h-8 w-full rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] px-2 text-xs outline-none focus:ring-2 focus:ring-[var(--pos-primary)] disabled:opacity-40"
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
                  className="h-8 w-full rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] px-2 text-center text-sm font-semibold tracking-[0.3em] outline-none focus:ring-2 focus:ring-[var(--pos-primary)] disabled:opacity-40"
                />
              ) : null}
              <button
                type="button"
                disabled={
                  !online ||
                  customerRegisterBusy ||
                  !customerRegisterName.trim() ||
                  registerPhoneInvalid ||
                  registerPhoneMissing ||
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
                className="h-8 w-full rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-card text-xs font-medium hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] disabled:opacity-40"
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
            <p className="text-[11px] text-muted-foreground">
              No permission to register customers.
            </p>
          )}
        </div>
      ) : null}
      {selectedCustomer ? (
        <div className="rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] px-2 py-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-[12px] font-semibold text-[var(--pos-ink,#1c1915)]">
              {selectedCustomer.name}
              {selectedPhone ? (
                <span className="font-normal text-muted-foreground">
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
              className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)]"
            >
              Clear
            </button>
          </div>
          {optional ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
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
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {currency} {payableTotal.toFixed(2)} on tab
              {Number.isFinite(owed) && owed > 0.001
                ? ` · owes ${owed.toFixed(2)}`
                : ""}
            </p>
          )}
          <TillLastBasketHint customerId={selectedCustomer.id} />
        </div>
      ) : !showRegister && customerHits.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {optional
            ? "Find a regular to attach this sale. Leave empty for a walk-in."
            : "Find a customer to put this sale on a tab."}
        </p>
      ) : null}
    </div>
  );
}
