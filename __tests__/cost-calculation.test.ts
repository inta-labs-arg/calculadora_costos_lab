import { describe, expect, it } from "vitest";
import {
  calculateSupplyItemCost,
  type SupplyCostItem
} from "@/lib/cost-calculation";

describe("calculateSupplyItemCost", () => {
  it("converts USD amounts using the configured exchange rate", () => {
    const item: SupplyCostItem = {
      id: "usd-item",
      item: "Reactivo importado",
      unitOfMeasure: "unidad",
      quantity: 2,
      unitCost: 10,
      currency: "USD"
    };

    const total = calculateSupplyItemCost(item, { exchangeRate: 820.5 });

    expect(total).toBeCloseTo(2 * 10 * 820.5);
  });

  it("keeps ARS amounts unchanged", () => {
    const item: SupplyCostItem = {
      id: "ars-item",
      item: "Reactivo local",
      unitOfMeasure: "unidad",
      quantity: 3,
      unitCost: 150,
      currency: "ARS"
    };

    const total = calculateSupplyItemCost(item, { exchangeRate: 800 });

    expect(total).toBe(450);
  });
});
