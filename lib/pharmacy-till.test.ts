import { describe, expect, mock, test } from "bun:test";

type Body = { itemIds: string[]; branchId?: string };
const calls: Array<{ url: string; body?: Body }> = [];
let fail = false;

mock.module("@/lib/api", () => ({
  apiRequest: async (url: string, init?: { body?: Body }) => {
    calls.push({ url, body: init?.body });
    if (fail) throw new Error("offline");
    if (url.includes("/till/medicines")) {
      const ids: string[] = init?.body?.itemIds ?? [];
      return {
        mayDispense: true,
        medicines: ids
          .filter((id) => id.startsWith("med"))
          .map((id) => ({
            itemId: id,
            dispensingClass: id === "med-x" ? "UNCLASSIFIED" : "OTC",
            status: id === "med-x" ? "unclassified" : "ok",
            genericName: "Paracetamol",
            strength: "500 mg",
            dosageForm: "Tablet",
            nextLot: `LOT-${init?.body?.branchId ?? "none"}`,
            nextExpiry: "2027-03-31",
            shortDated: false,
          })),
      };
    }
    if (url.includes("/till/generic")) {
      return [
        { itemId: "med-1", name: "Panadol", sku: "PAN", barcode: null, genericName: "Paracetamol" },
        { itemId: "med-2", name: "Hedex", sku: "HDX", barcode: null, genericName: "Paracetamol" },
      ];
    }
    return [];
  },
  fetchItems: async (q: string) => [{ id: q === "HDX" ? "med-2" : "someone-else", name: q }],
}));

const {
  PharmacyTillStore,
  NO_PHARMACY_TILL,
  fetchGenericHits,
  formatTillExpiry,
  tillGenericLine,
  tillMedicineBlocked,
  offlineDispensingCheck,
} = await import("./pharmacy-till");

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("till medicine display", () => {
  test("expiry is shown by month", () => {
    expect(formatTillExpiry("2027-03-31")).toBe("Mar 2027");
    expect(formatTillExpiry(null)).toBeNull();
    expect(formatTillExpiry("nonsense")).toBeNull();
  });

  test("generic line joins what is recorded", () => {
    const base = { itemId: "a", dispensingClass: "OTC", status: "ok", nextLot: null, nextExpiry: null, shortDated: false } as const;
    expect(tillGenericLine({ ...base, genericName: "Amoxicillin", strength: "500 mg", dosageForm: "Capsule" })).toBe(
      "Amoxicillin 500 mg capsule",
    );
    expect(tillGenericLine({ ...base, genericName: null, strength: " ", dosageForm: null })).toBeNull();
  });

  test("only unclassified and blocked controlled medicines are kept out of a sale", () => {
    expect(tillMedicineBlocked(null)).toBe(false);
    const base = { itemId: "a", dispensingClass: "OTC", genericName: null, strength: null, dosageForm: null, nextLot: null, nextExpiry: null, shortDated: false } as const;
    expect(tillMedicineBlocked({ ...base, status: "needs_record" })).toBe(false);
    expect(tillMedicineBlocked({ ...base, status: "unclassified" })).toBe(true);
    expect(tillMedicineBlocked({ ...base, status: "controlled_blocked" })).toBe(true);
  });
});

describe("till medicine store", () => {
  test("gathers the rows' asks into one request and remembers non-medicines", async () => {
    calls.length = 0;
    const store = new PharmacyTillStore(true);
    store.setBranch("b1");
    let notified = 0;
    store.subscribe(() => notified++);
    store.request("med-1");
    store.request("bread");
    store.request("med-x");
    store.request("med-1");
    await wait(200);
    const asked = calls.filter((c) => c.url.includes("/till/medicines"));
    expect(asked.length).toBe(1);
    expect([...(asked[0]!.body?.itemIds ?? [])].sort()).toEqual(["bread", "med-1", "med-x"]);
    expect(store.get("med-1")?.nextLot).toBe("LOT-b1");
    expect(store.get("bread")).toBeNull();
    expect(tillMedicineBlocked(store.get("med-x"))).toBe(true);
    expect(store.mayDispense()).toBe(true);
    expect(notified).toBeGreaterThan(0);
    store.request("bread");
    store.request("med-1");
    await wait(200);
    expect(calls.filter((c) => c.url.includes("/till/medicines")).length).toBe(1);
  });

  test("a branch change drops the lots and asks again", async () => {
    calls.length = 0;
    const store = new PharmacyTillStore(true);
    store.setBranch("b1");
    store.request("med-1");
    await wait(200);
    store.setBranch("b2");
    expect(store.get("med-1")).toBeNull();
    await wait(200);
    expect(store.get("med-1")?.nextLot).toBe("LOT-b2");
  });

  test("offline shows nothing rather than failing", async () => {
    fail = true;
    const store = new PharmacyTillStore(true);
    store.request("med-1");
    await wait(200);
    expect(store.get("med-1")).toBeNull();
    fail = false;
  });

  test("outside a pharmacy nothing is fetched", async () => {
    calls.length = 0;
    NO_PHARMACY_TILL.request("med-1");
    await wait(200);
    expect(calls.length).toBe(0);
    expect(NO_PHARMACY_TILL.get("med-1")).toBeNull();
  });

  test("the patient is held for the sale and cleared on request", () => {
    const store = new PharmacyTillStore(true);
    store.setPatient({ id: "p1", name: "Grace", phone: null, allergies: "penicillin" });
    expect(store.patient()?.allergies).toBe("penicillin");
    store.setPatient(null);
    expect(store.patient()).toBeNull();
  });

  test("a patient belongs to the cart, so switching carts does not carry them over", () => {
    const store = new PharmacyTillStore(true);
    store.setActiveCart("cart-a");
    store.setPatient({ id: "p1", name: "Grace", phone: null, allergies: "penicillin" });
    store.setActiveCart("cart-b");
    expect(store.patient()).toBeNull();
    store.setActiveCart("cart-a");
    expect(store.patient()?.name).toBe("Grace");
    store.retainCarts(["cart-b"]);
    expect(store.patient()).toBeNull();
  });
});

describe("generic-name search", () => {
  test("adds the brands the search missed, and only rows that really are that item", async () => {
    const hits = await fetchGenericHits("paracetamol", new Set(["med-1"]), { branchId: "b1" });
    expect(hits.map((h) => h.id)).toEqual(["med-2"]);
  });

  test("barcodes and short text do not trigger it", async () => {
    calls.length = 0;
    expect(await fetchGenericHits("6001234567890", new Set(), {})).toEqual([]);
    expect(await fetchGenericHits("pa", new Set(), {})).toEqual([]);
    expect(calls.length).toBe(0);
  });
});

describe("offlineDispensingCheck", () => {
  const med = (status: "ok" | "needs_record" | "unclassified" | "controlled_blocked") => ({
    itemId: "x",
    dispensingClass: status === "ok" ? ("OTC" as const) : ("PRESCRIPTION_ONLY" as const),
    status,
    genericName: null,
    strength: null,
    dosageForm: null,
    nextLot: null,
    nextExpiry: null,
    shortDated: false,
  });
  const known: Record<string, ReturnType<typeof med>> = {
    amox: med("needs_record"),
    para: med("ok"),
    unk: med("unclassified"),
  };
  const get = (id: string) => known[id] ?? null;
  const cart = [
    { itemId: "amox", name: "Amoxicillin" },
    { itemId: "para", name: "Paracetamol" },
    { itemId: "bread", name: "Bread" },
    { itemId: "amox", name: "Amoxicillin" },
  ];

  test("a pharmacist gets the medicines the till knows, each once, and ordinary goods are left out", () => {
    const check = offlineDispensingCheck(cart, get, true);
    expect(check?.lines.map((l) => l.itemId)).toEqual(["amox", "para"]);
    expect(check?.needsRecord).toBe(true);
    expect(check?.blocked).toBe(false);
    expect(check?.userMayDispense).toBe(true);
  });

  test("someone who may not dispense is never let through offline", () => {
    expect(offlineDispensingCheck(cart, get, false)).toBeNull();
  });

  test("a cart whose prescription medicine the till never learned about is not opened", () => {
    expect(offlineDispensingCheck([{ itemId: "mystery", name: "?" }], get, true)).toBeNull();
    expect(offlineDispensingCheck([{ itemId: "para", name: "Paracetamol" }], get, true)).toBeNull();
  });

  test("an unclassified medicine in the cart is reported as blocking", () => {
    const check = offlineDispensingCheck([...cart, { itemId: "unk", name: "New thing" }], get, true);
    expect(check?.blocked).toBe(true);
  });
});

