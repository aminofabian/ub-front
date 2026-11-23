"use client";

import { useEffect, useRef } from "react";

import { orderRolesForPicker, roleGuide, type GuidedRole } from "@/lib/role-guide";
import { isDepartmentHeadRole } from "@/lib/department-counter";
import { cn } from "@/lib/utils";

type Business = Parameters<typeof roleGuide>[1];

const SCROLLBAR =
  "[scrollbar-width:thin] [scrollbar-color:rgba(18,26,22,0.28)_transparent]";

/**
 * "What will this person do?" Names stay one row so the list can sit beside the
 * account fields. The chosen role's job, the work it touches, and any caution
 * stay pinned under the list.
 */
export function RolePicker({
  roles,
  business,
  value,
  onChange,
  disabled = false,
}: {
  roles: readonly GuidedRole[];
  business: Business;
  value: string;
  onChange: (roleId: string) => void;
  disabled?: boolean;
}) {
  const ordered = orderRolesForPicker(roles);
  if (ordered.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading the roles…</p>;
  }

  const chosenRole = ordered.find((role) => role.id === value) ?? null;
  const chosenGuide = chosenRole ? roleGuide(chosenRole, business) : null;
  const chosenName = chosenRole ? roleLabel(chosenRole) : null;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const chosen = list?.querySelector<HTMLElement>("[data-chosen='true']");
    if (!list || !chosen) return;
    const listRect = list.getBoundingClientRect();
    const chosenRect = chosen.getBoundingClientRect();
    if (chosenRect.top < listRect.top) {
      list.scrollTop -= listRect.top - chosenRect.top;
    } else if (chosenRect.bottom > listRect.bottom) {
      list.scrollTop += chosenRect.bottom - listRect.bottom;
    }
  }, [value]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        role="radiogroup"
        aria-label="What will this person do?"
        className={cn("min-h-0 shrink overflow-y-auto overscroll-contain", SCROLLBAR)}
      >
        {ordered.map((role) => (
          <RoleOption
            key={role.id}
            role={role}
            business={business}
            chosen={role.id === value}
            disabled={disabled}
            onChange={onChange}
          />
        ))}
      </div>
      <div
        aria-live="polite"
        className={cn(
          "max-h-48 shrink-0 overflow-y-auto border-t border-[var(--op-rule)] bg-[var(--op-bg,#F4F1EA)] px-4 py-3",
          SCROLLBAR,
        )}
      >
        <ChosenRoleNote name={chosenName} guide={chosenGuide} />
      </div>
    </div>
  );
}

function roleLabel(role: GuidedRole): string {
  return isDepartmentHeadRole(role.key) ? "Department Head" : role.name;
}

function RoleOption({
  role,
  business,
  chosen,
  disabled,
  onChange,
}: {
  role: GuidedRole;
  business: Business;
  chosen: boolean;
  disabled: boolean;
  onChange: (roleId: string) => void;
}) {
  const name = roleLabel(role);
  const job = roleGuide(role, business).job;

  return (
    <label
      data-chosen={chosen ? "true" : undefined}
      title={job || undefined}
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2.5 border-b border-[var(--op-rule)] px-4",
        "transition-colors duration-200",
        chosen
          ? "bg-[color-mix(in_srgb,var(--kiosk-gold,#1D4B3B)_8%,var(--op-surface,#FCFAF5))]"
          : "hover:bg-foreground/[0.03]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="radio"
        name="new-user-role"
        className="size-4 shrink-0 accent-[#1D4B3B]"
        checked={chosen}
        disabled={disabled}
        onChange={() => onChange(role.id)}
      />
      <span className="min-w-0 truncate text-[13px] font-semibold text-foreground">{name}</span>
    </label>
  );
}

function ChosenRoleNote({
  name,
  guide,
}: {
  name: string | null;
  guide: ReturnType<typeof roleGuide> | null;
}) {
  if (!name || !guide) {
    return (
      <p className="text-[12px] leading-snug text-muted-foreground">
        Pick the job. It decides which pages they see. You can change it later.
      </p>
    );
  }

  const areas = guide.areas.length > 0 ? guide.areas.join(", ") : null;

  return (
    <div className="space-y-1">
      <p className="text-[13px] font-semibold leading-snug text-foreground">{name}</p>
      {guide.job ? (
        <p className="text-[12px] leading-snug text-foreground/80">{guide.job}</p>
      ) : null}
      {areas ? (
        <p className="text-[12px] leading-snug text-muted-foreground">Works on: {areas}</p>
      ) : null}
      {guide.caution ? (
        <p className="text-[12px] font-medium leading-snug text-[#A55237]">{guide.caution}</p>
      ) : null}
    </div>
  );
}
