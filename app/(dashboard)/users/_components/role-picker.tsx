"use client";

import { orderRolesForPicker, roleGuide, type GuidedRole } from "@/lib/role-guide";
import { isDepartmentHeadRole } from "@/lib/department-counter";

type Business = Parameters<typeof roleGuide>[1];

/**
 * "What will this person do?" Each role is one row: its name, the job in a line, and the work it can touch.
 * Nothing is chosen to start with, so nobody is made an owner by leaving a list on its first entry.
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
    return <p className="text-sm text-muted-foreground">Loading the roles…</p>;
  }
  return (
    <div role="radiogroup" aria-label="What will this person do?" className="divide-y divide-border border-y border-border">
      {ordered.map((role) => {
        const guide = roleGuide(role, business);
        const chosen = role.id === value;
        const name = isDepartmentHeadRole(role.key) ? "Department Head" : role.name;
        return (
          <label
            key={role.id}
            className={`flex cursor-pointer items-start gap-3 border-l-2 py-3 pl-3 pr-2 transition-colors duration-200 ${
              chosen
                ? "border-l-[color:var(--kiosk-gold,#1D4B3B)] bg-[color-mix(in_srgb,var(--kiosk-gold,#1D4B3B)_7%,transparent)]"
                : "border-l-transparent hover:bg-foreground/[0.03]"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="new-user-role"
              className="mt-1 size-4 shrink-0 accent-[#1D4B3B]"
              checked={chosen}
              disabled={disabled}
              onChange={() => onChange(role.id)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{name}</span>
              {guide.job ? <span className="block text-[13px] text-foreground/80">{guide.job}</span> : null}
              {guide.areas.length > 0 ? (
                <span className="mt-0.5 block text-[12px] text-muted-foreground">Works on: {guide.areas.join(", ")}</span>
              ) : null}
              {chosen && guide.caution ? (
                <span className="mt-1 block text-[12px] font-medium text-[#A55237]">{guide.caution}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
