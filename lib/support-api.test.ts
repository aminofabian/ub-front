import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

type CapturedCall = {
  path: string;
  init: { method?: string; body?: unknown };
};

const calls: CapturedCall[] = [];

// `apiRequest` serializes its `body` once. These ticket endpoints previously
// pre-stringified it, producing a JSON string literal on the wire. Keep the
// contract pinned: callers pass a plain object.
mock.module("@/lib/api", () => ({
  apiRequest: async (path: string, init?: CapturedCall["init"]) => {
    calls.push({ path, init: init ?? {} });
    return { id: "00000000-0000-0000-0000-000000000001" };
  },
}));

const { createTenantServingTicket, replyTenantServingTicket } = await import(
  "@/lib/support-api"
);

describe("tenant serving-ticket requests", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  afterAll(() => {
    mock.restore();
  });

  it("sends a ticket create body as an object, not a JSON string", async () => {
    await createTenantServingTicket({
      subject: "Cash drawer will not open",
      body: "It clicks but does not open.",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.path).toContain("/support/tickets");
    expect(calls[0]!.init.method).toBe("POST");
    expect(typeof calls[0]!.init.body).toBe("object");
    expect(calls[0]!.init.body).toEqual({
      subject: "Cash drawer will not open",
      body: "It clicks but does not open.",
    });
  });

  it("sends a ticket reply body as an object, not a JSON string", async () => {
    await replyTenantServingTicket("ticket-1", "We restarted the printer.");

    expect(calls).toHaveLength(1);
    expect(calls[0]!.path).toContain("/support/tickets/ticket-1/messages");
    expect(calls[0]!.init.method).toBe("POST");
    expect(typeof calls[0]!.init.body).toBe("object");
    expect(calls[0]!.init.body).toEqual({ body: "We restarted the printer." });
  });
});
