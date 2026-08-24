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
  | "tagline";

type Defaults = {
  announcement: string;
  promoTitle: string;
  promoSubtitle: string;
  promoCoupon: string;
  headline: string;
  subheadline: string;
  tagline: string;
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
  defaults: Defaults;
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
            <div className="space-y-1.5">
              <Label htmlFor="sf-edit-headline">Headline</Label>
              <Input
                id="sf-edit-headline"
                value={headline}
                maxLength={120}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Quality essentials, delivered."
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sf-edit-subheadline">Subheadline</Label>
              <Input
                id="sf-edit-subheadline"
                value={subheadline}
                maxLength={120}
                onChange={(e) => setSubheadline(e.target.value)}
                placeholder="Right to your door."
              />
            </div>
          </div>
        ) : activeField === "promo" ? (
          <div className="flex flex-col gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sf-edit-promo-title">Title</Label>
              <Input
                id="sf-edit-promo-title"
                value={promoTitle}
                maxLength={120}
                onChange={(e) => setPromoTitle(e.target.value)}
                placeholder="20% OFF this week"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sf-edit-promo-subtitle">Subtitle</Label>
              <Input
                id="sf-edit-promo-subtitle"
                value={promoSubtitle}
                maxLength={200}
                onChange={(e) => setPromoSubtitle(e.target.value)}
                placeholder="On selected essentials"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sf-edit-promo-coupon">Coupon (optional)</Label>
              <Input
                id="sf-edit-promo-coupon"
                value={promoCoupon}
                maxLength={40}
                onChange={(e) => setPromoCoupon(e.target.value)}
                placeholder="WELCOME10"
              />
            </div>
          </div>
        ) : activeField === "announcement" ? (
          <div className="space-y-1.5">
            <Label htmlFor="sf-edit-announcement">Message</Label>
            <Textarea
              id="sf-edit-announcement"
              value={text}
              maxLength={200}
              rows={3}
              onChange={(e) => setText(e.target.value)}
              placeholder="Free delivery today · Open till 8pm"
              autoFocus
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="sf-edit-tagline">Tagline</Label>
            <Input
              id="sf-edit-tagline"
              value={text}
              maxLength={160}
              onChange={(e) => setText(e.target.value)}
              placeholder="Everyday essentials on the shelf."
              autoFocus
            />
          </div>
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
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
