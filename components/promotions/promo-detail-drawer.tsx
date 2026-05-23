"use client";

import {
  BarChart3,
  CalendarClock,
  Copy,
  Megaphone,
  Pause,
  Send,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";

import { SupSection } from "@/app/(dashboard)/suppliers/_components/supplier-layout-primitives";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import type { NotificationCampaign } from "@/lib/api";
import {
  campaignStatusMeta,
  campaignTypeLabel,
  campaignWhenLabel,
  deliveryRate,
} from "@/lib/promotions-campaign-utils";
import { cn } from "@/lib/utils";

import {
  promoStatusChipClass,
  promoStatusDotClass,
  promoTypeAccent,
  supStatTile,
} from "./promotions-ui-tokens";

function DetailMetric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={supStatTile}>
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40 text-muted-foreground">
          <Icon className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PromoDetailDrawer({
  row,
  open,
  onOpenChange,
  scopeLabel,
  busy,
  onSendNow,
  onCancelSchedule,
  onDuplicateEdit,
}: {
  row: NotificationCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scopeLabel: string;
  busy: boolean;
  onSendNow: (id: string) => void;
  onCancelSchedule: (id: string) => void;
  onDuplicateEdit: (row: NotificationCampaign) => void;
}) {
  if (!row) {
    return null;
  }

  const meta = campaignStatusMeta(row.status);
  const rate = deliveryRate(row);
  const isFlash = row.campaignType === "FLASH_SALE";
  const accent = promoTypeAccent(row.campaignType);
  const TypeIcon = isFlash ? Zap : Sparkles;
  const canSend = row.status === "DRAFT" || row.status === "SCHEDULED";
  const canPause = row.status === "SCHEDULED";
  const isDraft = row.status === "DRAFT";
  const isRunning = row.status === "RUNNING";

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      width="wide"
      contextLabel="Promotion details"
      title={row.title}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
              promoStatusChipClass(row.status),
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                promoStatusDotClass(row.status),
                isRunning && "motion-safe:animate-pulse",
              )}
              aria-hidden
            />
            {meta.label}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-foreground/90">{row.name}</span>
        </span>
      }
      icon={
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg ring-1",
            accent.iconWrap,
          )}
        >
          <TypeIcon className="size-4" aria-hidden />
        </span>
      }
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {canPause ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 px-4"
              disabled={busy}
              onClick={() => onCancelSchedule(row.id)}
            >
              <Pause className="size-4" aria-hidden />
              Pause schedule
            </Button>
          ) : null}
          {isDraft ? (
            <Button
              type="button"
              variant="secondary"
              className="h-10 gap-2 px-4"
              disabled={busy}
              onClick={() => onDuplicateEdit(row)}
            >
              <Copy className="size-4" aria-hidden />
              Edit draft
            </Button>
          ) : null}
          {canSend ? (
            <Button
              type="button"
              className="h-10 gap-2 px-5 font-semibold shadow-sm"
              disabled={busy}
              onClick={() => onSendNow(row.id)}
            >
              <Send className="size-4" aria-hidden />
              {row.status === "SCHEDULED" ? "Send now instead" : "Send now"}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5 pb-2">
        <div
          className={cn(
            "h-1 w-full rounded-full",
            isFlash
              ? "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500"
              : "bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500",
          )}
          aria-hidden
        />

        <SupSection title="Message" hint={campaignTypeLabel(row.campaignType)}>
          <p className="rounded-lg bg-muted/20 px-3 py-3 text-sm leading-relaxed text-foreground ring-1 ring-inset ring-border/35">
            {row.body}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5 shrink-0" aria-hidden />
            {scopeLabel}
          </p>
        </SupSection>

        <SupSection title="Performance" hint="Reach and delivery for this promotion.">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailMetric
              icon={Target}
              label="Reach"
              value={row.recipientsTargeted.toLocaleString()}
              hint="shoppers targeted"
            />
            <DetailMetric
              icon={Send}
              label="Usage"
              value={row.recipientsSent.toLocaleString()}
              hint={rate != null ? `${rate}% delivery rate` : "Not sent yet"}
            />
          </div>

          {rate != null && row.recipientsTargeted > 0 ? (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-medium text-muted-foreground">Delivery progress</span>
                <span className="font-semibold tabular-nums">{rate}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/60 ring-1 ring-inset ring-border/40">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isFlash
                      ? "bg-gradient-to-r from-amber-400 to-orange-500"
                      : "bg-gradient-to-r from-sky-400 to-indigo-500",
                  )}
                  style={{ width: `${Math.min(100, rate)}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className={cn(supStatTile, "mt-4 flex gap-3")}>
            <BarChart3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-xs font-semibold text-foreground">Revenue impact</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Compare orders after sends in Analytics — per-promotion attribution is
                coming soon. For now, note the send date and check sales the same week.
              </p>
            </div>
          </div>
        </SupSection>

        <SupSection title="Timing" hint="When this promotion runs or ran.">
          <div className="flex items-start gap-3 rounded-lg border border-border/45 bg-muted/15 px-3 py-3">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">{campaignWhenLabel(row)}</p>
              {row.status === "SCHEDULED" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Use &ldquo;Pause schedule&rdquo; to stop the automatic send without deleting
                  your message.
                </p>
              ) : null}
            </div>
          </div>
        </SupSection>

        {isDraft ? (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-primary/25 bg-primary/[0.04] px-4 py-3">
            <Megaphone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p className="text-xs leading-relaxed text-muted-foreground">
              This promotion is saved as a draft. Edit the copy, then send immediately or
              schedule for a quieter time.
            </p>
          </div>
        ) : null}
      </div>
    </FormDrawer>
  );
}
