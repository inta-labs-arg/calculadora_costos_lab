import { describe, expect, it } from "vitest";
import {
  calculateLaborItemCost,
  calculateSupplyItemCost,
  type LaborCostItem,
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

describe("calculateLaborItemCost", () => {
  it("multiplica las horas por la tarifa aplicable", () => {
    const item: LaborCostItem = {
      id: "lab-1",
      role: "professional",
      label: "Profesional investigador",
      hours: 2.5,
      rate: 12000,
      profileCode: "professional",
      isManualRate: false
    };

    expect(calculateLaborItemCost(item)).toBe(30000);
  });
});
