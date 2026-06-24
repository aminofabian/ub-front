/**
 * Client-side mirror of {@code DesktopLicenseReadOnlyFilter} — fast feedback
 * before a mutating request leaves the browser.
 */

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const WRITE_WHITELIST_PREFIXES = [
  "/api/v1/auth/",
  "/api/v1/license",
  "/api/v1/desktop/backups/now",
];

let readOnly = false;

export function setDesktopLicenseReadOnly(value: boolean) {
  readOnly = value;
}

export function getDesktopLicenseReadOnly(): boolean {
  return readOnly;
}

export function isDesktopLicenseWriteBlocked(
  method: string,
  path: string,
): boolean {
  if (process.env.NEXT_PUBLIC_RUNTIME !== "desktop") {
    return false;
  }
  if (!readOnly) {
    return false;
  }
  if (!WRITE_METHODS.has(method)) {
    return false;
  }
  const normalized = path.split("?")[0] ?? path;
  return !WRITE_WHITELIST_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
}

export const DESKTOP_LICENSE_READ_ONLY_TYPE = "urn:problem:license-read-only";
