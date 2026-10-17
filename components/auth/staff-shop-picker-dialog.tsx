"use client";

import { ChevronRight, Loader2, Search, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { monogramInitials } from "@/components/brand/tenant-monogram";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  PHONE_BOTTOM_SHEET,
} from "@/components/ui/dialog";
import type { PublicSignInDestination } from "@/lib/api";
import { filterStaffShopChoices } from "@/lib/staff-shop-choice";
import { staffDestinationHost } from "@/lib/staff-tenant-resolve";
import { cn } from "@/lib/utils";

const SHOP_INK = "#1f7a3a";
const SHOP_WASH = "#e8f2ea";
const SEARCH_MIN_SHOPS = 5;

type StaffShopPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinations: PublicSignInDestination[];
  email: string;
  busy?: boolean;
  onPick: (destination: PublicSignInDestination) => void;
};

function choiceKey(row: PublicSignInDestination): string {
  return `${row.slug ?? ""}:${row.name}`;
}

function ShopMark({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string | null;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = logoUrl?.trim() ?? "";
  const initials = monogramInitials(name);

  if (logo && !logoFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tenant CDN asset
      <img
        src={logo}
        alt=""
        onError={() => setLogoFailed(true)}
        className="size-11 shrink-0 rounded-xl border border-black/[0.06] bg-white object-cover dark:border-white/10"
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl font-heading font-semibold tracking-[-0.03em]",
        initials.length > 1 ? "text-[13px]" : "text-[15px]",
      )}
      style={{ backgroundColor: SHOP_WASH, color: SHOP_INK }}
    >
      {initials}
    </span>
  );
}

function ShopSearchField({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const fieldId = useId();

  return (
    <div className="relative mt-4">
      <label className="sr-only" htmlFor={fieldId}>
        Find a shop
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2"
        style={{ color: SHOP_INK }}
      />
      <input
        id={fieldId}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Name or address"
        autoComplete="off"
        autoFocus
        className="h-11 w-full rounded-xl border border-black/[0.1] bg-white pl-10 pr-10 text-[15px] text-foreground outline-none placeholder:text-[#3d4a40]/55 focus-visible:border-[#1f7a3a] focus-visible:ring-2 focus-visible:ring-[#1f7a3a]/25 dark:border-white/12 dark:bg-white/[0.04]"
      />
      {query ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onQueryChange("")}
          className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-[#3d4a40] hover:bg-[#e8f2ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a3a]/30"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

const choiceButtonClass =
  "group flex min-h-14 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-[background-color,transform] duration-150 ease-out hover:bg-[#e8f2ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a3a]/30 active:scale-[0.99] disabled:active:scale-100 dark:hover:bg-white/[0.06]";

function ShopChoiceButton({
  row,
  pending,
  dimmed,
  onPick,
}: {
  row: PublicSignInDestination;
  pending: boolean;
  dimmed: boolean;
  onPick: (row: PublicSignInDestination) => void;
}) {
  const host = staffDestinationHost(row);
  const label = host ? `Sign in to ${row.name}, ${host}` : `Sign in to ${row.name}`;

  return (
    <button
      type="button"
      disabled={dimmed || pending}
      aria-busy={pending}
      aria-label={label}
      onClick={() => onPick(row)}
      className={cn(
        choiceButtonClass,
        pending && "bg-[#e8f2ea]",
        dimmed && "pointer-events-none opacity-45",
      )}
    >
      <ShopMark name={row.name} logoUrl={row.logoUrl} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-heading text-[17px] font-semibold leading-none tracking-[-0.02em] text-foreground">
          {row.name}
        </span>
        {host ? (
          <span className="mt-1 block truncate text-[13px] leading-none text-[#3d4a40] dark:text-[#c9d7cc]">
            {host}
          </span>
        ) : null}
      </span>
      {pending ? (
        <Loader2 aria-hidden className="size-4 shrink-0 animate-spin" style={{ color: SHOP_INK }} />
      ) : (
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-[#1f7a3a]/70 transition-transform duration-150 group-hover:translate-x-0.5"
        />
      )}
    </button>
  );
}

function ShopChoiceList({
  matches,
  query,
  busy,
  pendingKey,
  onPick,
}: {
  matches: PublicSignInDestination[];
  query: string;
  busy: boolean;
  pendingKey: string | null;
  onPick: (row: PublicSignInDestination) => void;
}) {
  if (matches.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="font-heading text-xl font-semibold tracking-[-0.02em] text-foreground">
          No shop matches
        </p>
        <p className="mx-auto mt-2 max-w-[28ch] text-sm leading-relaxed text-[#3d4a40] dark:text-[#c9d7cc]">
          Nothing for “{query.trim()}”. Try the shop address instead.
        </p>
      </div>
    );
  }

  return (
    <ul className="max-h-[min(58dvh,420px)] space-y-0.5 overflow-y-auto px-2 py-2 [scrollbar-color:#c5d9cb_transparent] [scrollbar-width:thin]">
      {matches.map((row) => {
        const key = choiceKey(row);
        return (
          <li key={key}>
            <ShopChoiceButton
              row={row}
              pending={pendingKey === key && busy}
              dimmed={busy && pendingKey !== key}
              onPick={onPick}
            />
          </li>
        );
      })}
    </ul>
  );
}

const dialogClass = cn(
  "max-w-[26.5rem] gap-0 overflow-hidden p-0",
  PHONE_BOTTOM_SHEET,
);

function ShopPickerHeader({
  email,
  count,
  showSearch,
  query,
  onQueryChange,
}: {
  email: string;
  count: number;
  showSearch: boolean;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const shopsLabel = count === 1 ? "shop" : "shops";

  return (
    <div className="border-b border-black/[0.06] px-5 pb-4 pt-5 dark:border-white/10">
      <DialogHeader className="space-y-1.5 text-left">
        <DialogTitle className="font-heading text-[1.65rem] font-semibold leading-none tracking-[-0.03em]">
          Choose your shop
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-[#3d4a40] dark:text-[#c9d7cc]">
          <span className="font-medium text-foreground">{email}</span>
          {` is on ${count} ${shopsLabel}.`}
        </DialogDescription>
      </DialogHeader>
      {showSearch ? (
        <ShopSearchField query={query} onQueryChange={onQueryChange} />
      ) : null}
    </div>
  );
}

export function StaffShopPickerDialog({
  open,
  onOpenChange,
  destinations,
  email,
  busy = false,
  onPick,
}: StaffShopPickerDialogProps) {
  const [query, setQuery] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const showSearch = destinations.length >= SEARCH_MIN_SHOPS;
  const matches = filterStaffShopChoices(destinations, showSearch ? query : "");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setPendingKey(null);
    }
  }, [open]);

  useEffect(() => {
    if (!busy) setPendingKey(null);
  }, [busy]);

  const pickShop = (row: PublicSignInDestination) => {
    setPendingKey(choiceKey(row));
    onPick(row);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="center" className={dialogClass}>
        <ShopPickerHeader
          email={email}
          count={destinations.length}
          showSearch={showSearch}
          query={query}
          onQueryChange={setQuery}
        />

        <ShopChoiceList
          matches={matches}
          query={query}
          busy={busy}
          pendingKey={pendingKey}
          onPick={pickShop}
        />
      </DialogContent>
    </Dialog>
  );
}
