import { describe, expect, test } from "bun:test";

import {
  inSupplierStage,
  supplierAnswerAction,
  supplierOrderStatus,
  supplierOrderSteps,
  supplierTurnLabel,
} from "./supplier-order-status";

describe("a trade order as the supplier sees it", () => {
  test("a placed order is the supplier's to answer", () => {
    const status = supplierOrderStatus("placed");
    expect(status.label).toBe("To answer");
    expect(supplierTurnLabel(status.turn)).toBe("Your turn");
    expect(inSupplierStage("placed", "to_answer")).toBe(true);
  });

  test("accepted in full or in part both wait to be dispatched", () => {
    expect(supplierOrderStatus("accepted").stage).toBe("to_dispatch");
    expect(supplierOrderStatus("part_accepted").stage).toBe("to_dispatch");
  });

  test("after dispatch it is the buyer's turn", () => {
    expect(supplierTurnLabel(supplierOrderStatus("dispatched").turn)).toBe("Buyer's turn");
  });

  test("a finished order is nobody's turn", () => {
    expect(supplierTurnLabel(supplierOrderStatus("cancelled").turn)).toBe("");
    expect(supplierOrderStatus("rejected").label).toBe("Declined");
    expect(inSupplierStage("rejected", "closed")).toBe(true);
  });

  test("an unknown status is shown in words, not dropped", () => {
    expect(supplierOrderStatus("on_hold").label).toBe("on hold");
  });

  test("the steps show what is behind the order and what it waits on", () => {
    expect(supplierOrderSteps("placed").map((s) => s.state)).toEqual(["done", "now", "later", "later"]);
    expect(supplierOrderSteps("accepted").map((s) => s.state)).toEqual(["done", "done", "now", "later"]);
    expect(supplierOrderSteps("dispatched").map((s) => s.state)).toEqual(["done", "done", "done", "now"]);
    expect(supplierOrderSteps("dispatched", true).map((s) => s.state)).toEqual(["done", "done", "done", "done"]);
    expect(supplierOrderSteps("cancelled")).toEqual([]);
  });

  test("the answer button names the answer", () => {
    expect(supplierAnswerAction([{ asked: 12, supply: 12 }]).label).toBe("Accept the whole order");
    expect(supplierAnswerAction([{ asked: 12, supply: 6 }]).label).toBe("Accept in part");
    expect(supplierAnswerAction([{ asked: 12, supply: 12 }, { asked: 4, supply: 0 }]).label).toBe("Accept in part");
    expect(supplierAnswerAction([{ asked: 12, supply: 0 }]).label).toBe("Decline the order");
  });
});
