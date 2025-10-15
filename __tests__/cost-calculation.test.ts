import { describe, expect, it } from "vitest";
import {
  LABOR_MONTHLY_HOURS,
  calculateDirectGroupLevel,
  calculateEquipmentItemCalibration,
  calculateEquipmentItemCost,
  calculateEquipmentItemDepreciation,
  calculateEquipmentSublevelTotals,
  calculateLaborItemCost,
  calculateSharedResourceItemCost,
  calculateSupplyItemCost,
  calculateSupplyItemUnitPrice,
  type DirectLevelGroupState,
  type EquipmentCostItem,
  type EquipmentSublevelState,
  type LaborCostItem,
  type SharedResourceCostItem,
  type SupplyCostItem
} from "@/lib/cost-calculation";
import { round2 } from "@/lib/money";

describe("calculateSupplyItemCost", () => {
  it("calcula el precio unitario tomando el formato de compra", () => {
    const item: SupplyCostItem = {
      id: "alcohol",
      item: "Alcohol etílico",
      unitOfMeasure: "litro",
      presentationFormat: "Bidón",
      presentationQuantity: 5,
      presentationPrice: 18000,
      determinationQuantity: 0.25
    };

    const unitPrice = calculateSupplyItemUnitPrice(item);
    const total = calculateSupplyItemCost(item);

    expect(unitPrice).toBeCloseTo(3600);
    expect(total).toBeCloseTo(900);
  });

  it("retorna cero cuando la cantidad del formato no es válida", () => {
    const item: SupplyCostItem = {
      id: "invalid",
      item: "Reactivo X",
      unitOfMeasure: "gramo",
      presentationFormat: "Sobre",
      presentationQuantity: 0,
      presentationPrice: 2500,
      determinationQuantity: 10
    };

    expect(calculateSupplyItemUnitPrice(item)).toBe(0);
    expect(calculateSupplyItemCost(item)).toBe(0);
  });
});

describe("calculateLaborItemCost", () => {
  it("multiplica las horas por la tarifa aplicable", () => {
    const item: LaborCostItem = {
      id: "lab-1",
      role: "professional",
      label: "Profesionales",
      quantity: 2,
      totalHours: 40,
      monthlySalary: 120000
    };

    const hourlyValue = item.monthlySalary / LABOR_MONTHLY_HOURS;
    const expectedCost = round2(hourlyValue * item.totalHours * item.quantity);

    expect(calculateLaborItemCost(item)).toBe(expectedCost);
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
