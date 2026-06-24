"use client";

import { useEffect, useState } from "react";

import { TenantMonogramLockup } from "@/components/brand/tenant-monogram";
import { pickReadableTextColor } from "@/lib/branding-color-presets";

type Props = {
  displayName: string;
  primaryColor: string;
  accentColor: string;
  logoPreviewUrl?: string | null;
  showHeading?: boolean;
};

export function OnboardingBrandingPreview({
  displayName,
  primaryColor,
  accentColor,
  logoPreviewUrl,
  showHeading = true,
}: Props) {
  const brand = displayName.trim() || "Your shop";
  const primary = primaryColor.trim() || "#0D9488";
  const accent = accentColor.trim() || primary;
  const onPrimary = pickReadableTextColor(primary);
  const onAccent = pickReadableTextColor(accent);
  const headerTone = onPrimary === "#FFFFFF" ? "dark" : "light";

  return (
    <div className="space-y-3">
      {showHeading ? (
        <p className="text-xs font-medium text-[#6B7280]">Preview</p>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm ring-1 ring-black/[0.04]">
        <div
          className="relative px-4 py-4"
          style={{
            background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 55%, ${accent}99 100%)`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-black/10"
            aria-hidden
          />
          <div className="relative flex min-w-0 items-center gap-3">
            {logoPreviewUrl ? (
              <>
                <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreviewUrl}
                    alt=""
                    className="max-h-9 max-w-9 object-contain"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <p
                    className="truncate font-heading text-base font-semibold tracking-tight"
                    style={{ color: onPrimary }}
                  >
                    {brand}
                  </p>
                  <p
                    className="mt-0.5 truncate text-[11px] font-medium"
                    style={{ color: onPrimary, opacity: 0.85 }}
                  >
                    Online shop
                  </p>
                </span>
              </>
            ) : (
              <TenantMonogramLockup
                brand={brand}
                primaryColor={primary}
                size="sm"
                tone={headerTone}
                showTagline={false}
              />
            )}
          </div>
        </div>

        <div className="space-y-3 bg-[#FAFAFA] p-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">
              Receipt
            </p>
            <div className="mt-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-center shadow-sm">
              <p className="text-sm font-semibold" style={{ color: primary }}>
                {brand}
              </p>
              <p className="mt-0.5 text-[10px] text-[#9CA3AF]">
                Sale #1042 · Today
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">
              Call to action
            </p>
            <button
              type="button"
              tabIndex={-1}
              className="mt-1.5 h-9 w-full rounded-lg text-sm font-semibold shadow-sm"
              style={{ backgroundColor: accent, color: onAccent }}
            >
              View catalog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Object URL preview for a picked logo file; revokes on unmount/change. */
export function useLogoObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url;
}
