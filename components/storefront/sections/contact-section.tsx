"use client";

import {
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
} from "lucide-react";
import Link from "next/link";

import {
  sectionCardClass,
  sectionContainerClass,
  whatsappHref,
} from "@/components/storefront/sections/shared";
import { StorefrontQuickEditTarget, useStorefrontStaffEditOptional } from "@/components/storefront/storefront-staff-edit";
import {
  formatBusinessHours,
  type StorefrontContactSectionSettings,
  type StorefrontDesignBusiness,
  type StorefrontDesignButtons,
} from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

function googleMapsUrl(location: StorefrontDesignBusiness["location"]): string | null {
  if (location?.mapUrl?.trim()) {
    return location.mapUrl.trim();
  }
  const query = [location?.address?.trim(), location?.town?.trim()]
    .filter(Boolean)
    .join(", ");
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

function HoursBlock({ hoursText }: { hoursText: string }) {
  const staff = useStorefrontStaffEditOptional();
  const editable = Boolean(staff?.editMode);

  const body = (
    <>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Clock className="size-4 text-primary" aria-hidden />
        Opening hours
      </div>
      <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
        {hoursText}
      </p>
    </>
  );

  if (!editable || !staff) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="rounded-xl border border-amber-600/30 bg-muted/30 p-3.5 text-left ring-1 ring-amber-500/20 transition hover:bg-amber-50/40"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        staff.openQuickEdit("hours");
      }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label="Edit opening hours"
    >
      {body}
    </button>
  );
}

/** Address, opening hours, phone / WhatsApp / email — all from the business profile. */
export function ContactSection({
  settings,
  business,
  buttons = "solid",
}: {
  settings: StorefrontContactSectionSettings;
  business: StorefrontDesignBusiness | null | undefined;
  buttons?: StorefrontDesignButtons;
}) {
  const location = business?.location;
  const address = [location?.address?.trim(), location?.town?.trim()]
    .filter(Boolean)
    .join(", ");
  const hoursText = settings.showHours
    ? formatBusinessHours(business?.hours ?? null)
    : null;
  const mapsUrl = settings.showMap ? googleMapsUrl(location) : null;
  const phone = business?.contact?.phone?.trim();
  const email = business?.contact?.email?.trim();
  const waHref = whatsappHref(
    business?.contact?.whatsapp,
    "Hi! I'd like to place an order.",
  );

  if (!address && !hoursText && !mapsUrl && !phone && !email && !waHref) {
    return null;
  }
  const heading = settings.heading.trim() || "Visit us";

  return (
    <StorefrontQuickEditTarget field="contact" label="contact section">
      <section className={sectionContainerClass("py-3")} aria-label={heading}>
        <div className={sectionCardClass("px-5 py-6 sm:px-7 sm:py-7")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="font-heading text-lg font-bold tracking-[-0.02em] text-foreground sm:text-xl">
              {heading}
            </h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {address ? (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="size-4 text-primary" aria-hidden />
                  Find us
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {address}
                </p>
                {mapsUrl ? (
                  <Link
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-[length:var(--sf-button-radius,0.375rem)] px-3 text-[12px] font-semibold transition-[filter,transform,background-color,border-color] duration-200 active:scale-[0.98]",
                      buttons === "outline"
                        ? "border-2 border-primary bg-transparent text-primary hover:bg-primary/10"
                        : "bg-primary text-primary-foreground hover:brightness-105",
                    )}
                  >
                    <Navigation className="size-3.5" aria-hidden />
                    Get directions
                  </Link>
                ) : null}
              </div>
            ) : null}

            {hoursText ? (
              <HoursBlock
                hoursText={hoursText}
              />
            ) : null}

            {phone || email ? (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Phone className="size-4 text-primary" aria-hidden />
                  Call or write
                </div>
                <div className="mt-1.5 space-y-1 text-[13px] leading-relaxed">
                  {phone ? (
                    <a
                      href={`tel:${phone.replace(/\s/g, "")}`}
                      className="block text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {phone}
                    </a>
                  ) : null}
                  {email ? (
                    <a
                      href={`mailto:${email}`}
                      className="block truncate text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {email}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {waHref ? (
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageCircle className="size-4 text-primary" aria-hidden />
                  WhatsApp
                </div>
                <Link
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex h-9 items-center justify-center gap-1.5 rounded-[length:var(--sf-button-radius,0.375rem)] px-3 text-[13px] font-semibold transition-[filter,transform,background-color,border-color] duration-200 active:scale-[0.98]",
                    buttons === "outline"
                      ? "border-2 border-primary bg-transparent text-primary hover:bg-primary/10"
                      : "bg-primary text-primary-foreground hover:brightness-105",
                  )}
                >
                  Message us
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </StorefrontQuickEditTarget>
  );
}
