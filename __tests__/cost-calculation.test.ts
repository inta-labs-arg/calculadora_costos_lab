import { describe, expect, it } from "vitest";
import {
  calculateDirectGroupLevel,
  calculateEquipmentItemCalibration,
  calculateEquipmentItemCost,
  calculateEquipmentItemDepreciation,
  calculateEquipmentSublevelTotals,
  calculateLaborItemCost,
  calculateSharedResourceItemCost,
  calculateSupplyItemCost,
  type DirectLevelGroupState,
  type EquipmentCostItem,
  type EquipmentSublevelState,
  type LaborCostItem,
  type SharedResourceCostItem,
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

describe("calculateSharedResourceItemCost", () => {
  it("prorratea el costo mensual usando las determinaciones mensuales", () => {
    const item: SharedResourceCostItem = {
      id: "sr-1",
      concept: "Servicio de limpieza",
      monthlyCost: 50000,
      determinations: 125,
      isCustomDeterminations: false
    };

    expect(calculateSharedResourceItemCost(item)).toBeCloseTo(400);
  });
});

describe("equipamiento específico", () => {
  const baseItem: EquipmentCostItem = {
    id: "eq-1",
    name: "Equipo A",
    model: "Modelo X",
    usefulLifeDeterminations: 1000,
    purchasePrice: 500000,
    calibrationCost: 120000,
    calibrationPeriodDeterminations: 600
  };

  it("descompone el costo por determinación en depreciación y calibración", () => {
    const depreciation = calculateEquipmentItemDepreciation(baseItem);
    const calibration = calculateEquipmentItemCalibration(baseItem);
    const total = calculateEquipmentItemCost(baseItem);

    expect(depreciation).toBeCloseTo(500);
    expect(calibration).toBeCloseTo(200);
    expect(total).toBeCloseTo(depreciation + calibration);
  });

  it("agrega subtotales específicos en el subnivel", () => {
    const sublevel: EquipmentSublevelState = {
      id: "equipamientoEspecifico",
      name: "Subnivel 1.3 · Equipamiento específico",
      description: "",
      type: "equipamiento",
      items: [
        baseItem,
        {
          ...baseItem,
          id: "eq-2",
          purchasePrice: 250000,
          usefulLifeDeterminations: 500,
          calibrationCost: 60000,
          calibrationPeriodDeterminations: 300
        }
      ]
    };

    const totals = calculateEquipmentSublevelTotals(sublevel);

    expect(totals.depreciation).toBeCloseTo(1000);
    expect(totals.calibration).toBeCloseTo(400);
    expect(totals.total).toBeCloseTo(1400);
  });

  it("mantiene el subtotal del nivel directo e incluye la desagregación", () => {
    const level: DirectLevelGroupState = {
      id: "nivel1",
      name: "Nivel 1",
      description: "",
      type: "direct-group",
      sublevels: [
        {
          id: "insumosDirectos",
          name: "Insumos",
          description: "",
          type: "insumos",
          items: []
        },
        {
          id: "equipamientoEspecifico",
          name: "Equipamiento",
          description: "",
          type: "equipamiento",
          items: [baseItem]
        }
      ]
    };

    const result = calculateDirectGroupLevel(level);

    expect(result.subtotal).toBeCloseTo(calculateEquipmentItemCost(baseItem));
    expect(result.breakdown).toMatchSnapshot();
  });
});
