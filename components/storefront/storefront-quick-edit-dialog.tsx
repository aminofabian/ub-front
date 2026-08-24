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
  | "hero"
  | "tagline";

type Defaults = {
  announcement: string;
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
  }, [open, field, defaults]);

  if (!field) return null;
  const activeField = field;
  const meta = FIELD_META[activeField];

  async function handleSave() {
    if (activeField === "announcement") {
      await onSave(activeField, { text });
    } else if (activeField === "hero") {
      await onSave(activeField, { headline, subheadline });
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
