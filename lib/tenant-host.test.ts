import { describe, expect, it } from "vitest";

import {
  cookieDomainForHost,
  stripLeadingWww,
  tenantHostsMatch,
} from "@/lib/tenant-host";

describe("tenant-host", () => {
  it("stripLeadingWww removes www prefix", () => {
    expect(stripLeadingWww("www.palmart.co.ke")).toBe("palmart.co.ke");
    expect(stripLeadingWww("palmart.co.ke")).toBe("palmart.co.ke");
  });

  it("tenantHostsMatch ignores www", () => {
    expect(tenantHostsMatch("www.palmart.co.ke", "palmart.co.ke")).toBe(true);
  });

  it("cookieDomainForHost returns parent domain for ccTLD hosts", () => {
    expect(cookieDomainForHost("www.palmart.co.ke")).toBe(".palmart.co.ke");
    expect(cookieDomainForHost("palmart.co.ke")).toBe(".palmart.co.ke");
    expect(cookieDomainForHost("localhost")).toBe("");
  });
});
