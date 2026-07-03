import { describe, expect, it } from "vitest";

import { APP_ROUTES } from "@/lib/config";
import { resolveActiveNavSectionId } from "@/lib/nav-active-section";

function itemIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return (
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    pathname.startsWith(`${href}?`)
  );
}

const sections = [
  {
    id: "overview",
    items: [{ href: APP_ROUTES.business }],
  },
  {
    id: "org",
    items: [
      { href: APP_ROUTES.business },
      { href: APP_ROUTES.businessSettings },
      { href: APP_ROUTES.users },
    ],
  },
  {
    id: "catalog",
    items: [{ href: APP_ROUTES.products }],
  },
] as const;

describe("resolveActiveNavSectionId", () => {
  it("prefers Organization over Home when both include /business", () => {
    expect(
      resolveActiveNavSectionId(sections, APP_ROUTES.business, itemIsActive),
    ).toBe("org");
  });

  it("resolves business settings to Organization", () => {
    expect(
      resolveActiveNavSectionId(
        sections,
        APP_ROUTES.businessSettings,
        itemIsActive,
      ),
    ).toBe("org");
  });

  it("resolves unrelated routes to the matching section", () => {
    expect(
      resolveActiveNavSectionId(sections, APP_ROUTES.products, itemIsActive),
    ).toBe("catalog");
  });

  it("returns null when no section matches", () => {
    expect(
      resolveActiveNavSectionId(sections, APP_ROUTES.analytics, itemIsActive),
    ).toBeNull();
  });
});
