"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type StorefrontQuickEditField =
  | "announcement"
  | "promo"
  | "hero"
  | "tagline"
  | "about"
  | "contact"
  | "hours"
  | "social";

export type StorefrontQuickEditDefaults = {
  announcement: string;
  promoTitle: string;
  promoSubtitle: string;
  promoCoupon: string;
  headline: string;
  subheadline: string;
  tagline: string;
  aboutHeading: string;
  aboutText: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  town: string;
  weekdayOpen: string;
  weekdayClose: string;
  saturdayOpen: string;
  saturdayClose: string;
  saturdayClosed: boolean;
  sundayOpen: string;
  sundayClose: string;
  sundayClosed: boolean;
  hoursNote: string;
  socialHeading: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  x: string;
  youtube: string;
};

const FIELD_META: Record<
  StorefrontQuickEditField,
  { title: string; description: string }
> = {
  announcement: {
    title: "Announcement",
    description: "Slim notice at the top of the shop — deliveries, hours, new stock.",
  },
  promo: {
    title: "Offer banner",
    description: "Flash sale title, subtitle, and optional coupon code.",
  },
  hero: {
    title: "Hero headline",
    description: "The big welcome line shoppers see first.",
  },
  tagline: {
    title: "Tagline",
    description: "Short line under your shop name. Used as a fallback in the hero too.",
  },
  about: {
    title: "About the shop",
    description: "Your story on the storefront — heading and a short paragraph.",
  },
  contact: {
    title: "Contact & place",
    description: "Phone, WhatsApp, email, and where shoppers find you.",
  },
  hours: {
    title: "Opening hours",
    description: "Weekday and weekend times shoppers see on the contact block.",
  },
  social: {
    title: "Social links",
    description: "Handles or full URLs for Instagram, Facebook, TikTok, X, and YouTube.",
  },
};

export function StorefrontQuickEditDialog({
  field,
  open,
  onOpenChange,
  defaults,
  saving,
  onSave,
}: {
  field: StorefrontQuickEditField | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: StorefrontQuickEditDefaults;
  saving: boolean;
  onSave: (
    field: StorefrontQuickEditField,
    values: Record<string, string>,
  ) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [promoTitle, setPromoTitle] = useState("");
  const [promoSubtitle, setPromoSubtitle] = useState("");
  const [promoCoupon, setPromoCoupon] = useState("");
  const [aboutHeading, setAboutHeading] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [town, setTown] = useState("");
  const [weekdayOpen, setWeekdayOpen] = useState("08:00");
  const [weekdayClose, setWeekdayClose] = useState("19:00");
  const [saturdayOpen, setSaturdayOpen] = useState("08:00");
  const [saturdayClose, setSaturdayClose] = useState("19:00");
  const [saturdayClosed, setSaturdayClosed] = useState(false);
  const [sundayOpen, setSundayOpen] = useState("08:00");
  const [sundayClose, setSundayClose] = useState("19:00");
  const [sundayClosed, setSundayClosed] = useState(true);
  const [hoursNote, setHoursNote] = useState("");
  const [socialHeading, setSocialHeading] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [youtube, setYoutube] = useState("");

  useEffect(() => {
    if (!open || !field) return;
    setText(
      field === "announcement"
        ? defaults.announcement
        : field === "tagline"
          ? defaults.tagline
          : "",
    );
    setHeadline(defaults.headline);
    setSubheadline(defaults.subheadline);
    setPromoTitle(defaults.promoTitle);
    setPromoSubtitle(defaults.promoSubtitle);
    setPromoCoupon(defaults.promoCoupon);
    setAboutHeading(defaults.aboutHeading);
    setAboutText(defaults.aboutText);
    setPhone(defaults.phone);
    setWhatsapp(defaults.whatsapp);
    setEmail(defaults.email);
    setAddress(defaults.address);
    setTown(defaults.town);
    setWeekdayOpen(defaults.weekdayOpen || "08:00");
    setWeekdayClose(defaults.weekdayClose || "19:00");
    setSaturdayOpen(defaults.saturdayOpen || "08:00");
    setSaturdayClose(defaults.saturdayClose || "19:00");
    setSaturdayClosed(defaults.saturdayClosed);
    setSundayOpen(defaults.sundayOpen || "08:00");
    setSundayClose(defaults.sundayClose || "19:00");
    setSundayClosed(defaults.sundayClosed);
    setHoursNote(defaults.hoursNote);
    setSocialHeading(defaults.socialHeading);
    setInstagram(defaults.instagram);
    setFacebook(defaults.facebook);
    setTiktok(defaults.tiktok);
    setXHandle(defaults.x);
    setYoutube(defaults.youtube);
  }, [open, field, defaults]);

  if (!field) return null;
  const activeField = field;
  const meta = FIELD_META[activeField];

  async function handleSave() {
    if (activeField === "announcement") {
      await onSave(activeField, { text });
    } else if (activeField === "hero") {
      await onSave(activeField, { headline, subheadline });
    } else if (activeField === "promo") {
      await onSave(activeField, {
        title: promoTitle,
        subtitle: promoSubtitle,
        coupon: promoCoupon,
      });
    } else if (activeField === "about") {
      await onSave(activeField, { heading: aboutHeading, text: aboutText });
    } else if (activeField === "contact") {
      await onSave(activeField, { phone, whatsapp, email, address, town });
    } else if (activeField === "hours") {
      await onSave(activeField, {
        weekdayOpen,
        weekdayClose,
        saturdayOpen,
        saturdayClose,
        saturdayClosed: saturdayClosed ? "1" : "0",
        sundayOpen,
        sundayClose,
        sundayClosed: sundayClosed ? "1" : "0",
        note: hoursNote,
      });
    } else if (activeField === "social") {
      await onSave(activeField, {
        heading: socialHeading,
        instagram,
        facebook,
        tiktok,
        x: xHandle,
        youtube,
      });
    } else {
      await onSave(activeField, { tagline: text });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="bottom" className="gap-4 p-5 sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        {activeField === "hero" ? (
          <div className="flex flex-col gap-3">
            <Field label="Headline" htmlFor="sf-edit-headline">
              <Input
                id="sf-edit-headline"
                value={headline}
                maxLength={120}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Quality essentials, delivered."
                autoFocus
              />
            </Field>
            <Field label="Subheadline" htmlFor="sf-edit-subheadline">
              <Input
                id="sf-edit-subheadline"
                value={subheadline}
                maxLength={120}
                onChange={(e) => setSubheadline(e.target.value)}
                placeholder="Right to your door."
              />
            </Field>
          </div>
        ) : activeField === "promo" ? (
          <div className="flex flex-col gap-3">
            <Field label="Title" htmlFor="sf-edit-promo-title">
              <Input
                id="sf-edit-promo-title"
                value={promoTitle}
                maxLength={120}
                onChange={(e) => setPromoTitle(e.target.value)}
                placeholder="20% OFF this week"
                autoFocus
              />
            </Field>
            <Field label="Subtitle" htmlFor="sf-edit-promo-subtitle">
              <Input
                id="sf-edit-promo-subtitle"
                value={promoSubtitle}
                maxLength={200}
                onChange={(e) => setPromoSubtitle(e.target.value)}
                placeholder="On selected essentials"
              />
            </Field>
            <Field label="Coupon (optional)" htmlFor="sf-edit-promo-coupon">
              <Input
                id="sf-edit-promo-coupon"
                value={promoCoupon}
                maxLength={40}
                onChange={(e) => setPromoCoupon(e.target.value)}
                placeholder="WELCOME10"
              />
            </Field>
          </div>
        ) : activeField === "about" ? (
          <div className="flex flex-col gap-3">
            <Field label="Heading" htmlFor="sf-edit-about-heading">
              <Input
                id="sf-edit-about-heading"
                value={aboutHeading}
                maxLength={80}
                onChange={(e) => setAboutHeading(e.target.value)}
                placeholder="About our shop"
                autoFocus
              />
            </Field>
            <Field label="Story" htmlFor="sf-edit-about-text">
              <Textarea
                id="sf-edit-about-text"
                value={aboutText}
                maxLength={1200}
                rows={5}
                onChange={(e) => setAboutText(e.target.value)}
                placeholder="A short story about who you are and what you sell."
              />
            </Field>
          </div>
        ) : activeField === "contact" ? (
          <div className="flex flex-col gap-3">
            <Field label="Phone" htmlFor="sf-edit-phone">
              <Input
                id="sf-edit-phone"
                value={phone}
                maxLength={32}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                autoFocus
              />
            </Field>
            <Field label="WhatsApp" htmlFor="sf-edit-whatsapp">
              <Input
                id="sf-edit-whatsapp"
                value={whatsapp}
                maxLength={32}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="2547XXXXXXXX"
              />
            </Field>
            <Field label="Email" htmlFor="sf-edit-email">
              <Input
                id="sf-edit-email"
                type="email"
                value={email}
                maxLength={120}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@shop.co.ke"
              />
            </Field>
            <Field label="Street / area" htmlFor="sf-edit-address">
              <Input
                id="sf-edit-address"
                value={address}
                maxLength={160}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Moi Avenue"
              />
            </Field>
            <Field label="Town" htmlFor="sf-edit-town">
              <Input
                id="sf-edit-town"
                value={town}
                maxLength={80}
                onChange={(e) => setTown(e.target.value)}
                placeholder="Nairobi"
              />
            </Field>
          </div>
        ) : activeField === "hours" ? (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Weekdays share one open/close time; saving replaces the shop&apos;s
              current per-day hours with these.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weekdays open" htmlFor="sf-edit-wd-open">
                <Input
                  id="sf-edit-wd-open"
                  type="time"
                  value={weekdayOpen}
                  onChange={(e) => setWeekdayOpen(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Weekdays close" htmlFor="sf-edit-wd-close">
                <Input
                  id="sf-edit-wd-close"
                  type="time"
                  value={weekdayClose}
                  onChange={(e) => setWeekdayClose(e.target.value)}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={saturdayClosed}
                onChange={(e) => setSaturdayClosed(e.target.checked)}
                className="size-4 rounded border"
              />
              Saturday closed
            </label>
            {!saturdayClosed ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Saturday open" htmlFor="sf-edit-sat-open">
                  <Input
                    id="sf-edit-sat-open"
                    type="time"
                    value={saturdayOpen}
                    onChange={(e) => setSaturdayOpen(e.target.value)}
                  />
                </Field>
                <Field label="Saturday close" htmlFor="sf-edit-sat-close">
                  <Input
                    id="sf-edit-sat-close"
                    type="time"
                    value={saturdayClose}
                    onChange={(e) => setSaturdayClose(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sundayClosed}
                onChange={(e) => setSundayClosed(e.target.checked)}
                className="size-4 rounded border"
              />
              Sunday closed
            </label>
            {!sundayClosed ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sunday open" htmlFor="sf-edit-sun-open">
                  <Input
                    id="sf-edit-sun-open"
                    type="time"
                    value={sundayOpen}
                    onChange={(e) => setSundayOpen(e.target.value)}
                  />
                </Field>
                <Field label="Sunday close" htmlFor="sf-edit-sun-close">
                  <Input
                    id="sf-edit-sun-close"
                    type="time"
                    value={sundayClose}
                    onChange={(e) => setSundayClose(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}
            <Field label="Note (optional)" htmlFor="sf-edit-hours-note">
              <Input
                id="sf-edit-hours-note"
                value={hoursNote}
                maxLength={200}
                onChange={(e) => setHoursNote(e.target.value)}
                placeholder="Open on public holidays"
              />
            </Field>
          </div>
        ) : activeField === "social" ? (
          <div className="flex max-h-[min(55vh,28rem)] flex-col gap-3 overflow-y-auto">
            <Field label="Heading" htmlFor="sf-edit-social-heading">
              <Input
                id="sf-edit-social-heading"
                value={socialHeading}
                maxLength={80}
                onChange={(e) => setSocialHeading(e.target.value)}
                placeholder="Follow us"
                autoFocus
              />
            </Field>
            <Field label="Instagram" htmlFor="sf-edit-instagram">
              <Input
                id="sf-edit-instagram"
                value={instagram}
                maxLength={160}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@yourshop or full URL"
              />
            </Field>
            <Field label="Facebook" htmlFor="sf-edit-facebook">
              <Input
                id="sf-edit-facebook"
                value={facebook}
                maxLength={160}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="page name or URL"
              />
            </Field>
            <Field label="TikTok" htmlFor="sf-edit-tiktok">
              <Input
                id="sf-edit-tiktok"
                value={tiktok}
                maxLength={160}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="@yourshop"
              />
            </Field>
            <Field label="X" htmlFor="sf-edit-x">
              <Input
                id="sf-edit-x"
                value={xHandle}
                maxLength={160}
                onChange={(e) => setXHandle(e.target.value)}
                placeholder="@yourshop"
              />
            </Field>
            <Field label="YouTube" htmlFor="sf-edit-youtube">
              <Input
                id="sf-edit-youtube"
                value={youtube}
                maxLength={160}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="@yourshop or channel URL"
              />
            </Field>
          </div>
        ) : activeField === "announcement" ? (
          <Field label="Message" htmlFor="sf-edit-announcement">
            <Textarea
              id="sf-edit-announcement"
              value={text}
              maxLength={200}
              rows={3}
              onChange={(e) => setText(e.target.value)}
              placeholder="Free delivery today · Open till 8pm"
              autoFocus
            />
          </Field>
        ) : (
          <Field label="Tagline" htmlFor="sf-edit-tagline">
            <Input
              id="sf-edit-tagline"
              value={text}
              maxLength={120}
              onChange={(e) => setText(e.target.value)}
              placeholder="Everyday essentials on the shelf."
              autoFocus
            />
          </Field>
        )}

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Add to draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
