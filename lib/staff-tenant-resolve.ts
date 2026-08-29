import {
  fetchSignInDestinationsByEmail,
  fetchTenantIdForHost,
  type PublicSignInDestination,
} from "@/lib/api";
import { buildApexForwardUrl } from "@/lib/apex-forward";
import { APP_ROUTES, PLATFORM_DOMAIN } from "@/lib/config";

export function staffDestinationHost(
  row: PublicSignInDestination,
): string | null {
  const primary = row.primaryHost?.trim().toLowerCase();
  if (primary) return primary;
  const slug = row.slug?.trim().toLowerCase();
  if (slug) return `${slug}.${PLATFORM_DOMAIN}`;
  return null;
}

export async function resolveTenantIdForStaffDestination(
  row: PublicSignInDestination,
): Promise<string | null> {
  const host = staffDestinationHost(row);
  if (!host) return null;
  return fetchTenantIdForHost(host);
}

export function buildStaffDestinationLoginUrl(
  row: PublicSignInDestination,
  email: string,
  next?: string | null,
): string {
  const params = new URLSearchParams();
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail) params.set("email", normalizedEmail);
  const normalizedNext = next?.trim();
  if (normalizedNext) params.set("next", normalizedNext);
  const qs = params.toString();
  const path = `${APP_ROUTES.staffLogin}${qs ? `?${qs}` : ""}`;
  if (!row.slug?.trim()) return "";
  return buildApexForwardUrl(
    {
      slug: row.slug.trim(),
      name: row.name,
      logoUrl: row.logoUrl,
      primaryHost: row.primaryHost,
    },
    path,
  );
}

export async function fetchStaffSignInDestinationsByEmail(
  email: string,
): Promise<PublicSignInDestination[]> {
  const rows = await fetchSignInDestinationsByEmail(email);
  return rows.filter((row) => row.door === "STAFF" && row.slug?.trim());
}

export type ApexStaffTenantResolution =
  | { kind: "none" }
  | { kind: "single"; destination: PublicSignInDestination; tenantId: string }
  | { kind: "multiple"; destinations: PublicSignInDestination[] };

/** Resolves staff shops for an email on the platform apex (no host tenant). */
export async function resolveApexStaffTenant(
  email: string,
): Promise<ApexStaffTenantResolution> {
  const destinations = await fetchStaffSignInDestinationsByEmail(email);
  if (destinations.length === 0) {
    return { kind: "none" };
  }
  if (destinations.length === 1) {
    const tenantId = await resolveTenantIdForStaffDestination(destinations[0]!);
    if (!tenantId) {
      return { kind: "none" };
    }
    return { kind: "single", destination: destinations[0]!, tenantId };
  }
  return { kind: "multiple", destinations };
}
