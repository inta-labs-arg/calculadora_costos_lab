import { describe, expect, it } from "vitest";
import {
  LABOR_MONTHLY_HOURS,
  calculateDirectGroupLevel,
  calculateEquipmentItemDepreciation,
  calculateEquipmentItemMonthlyDepreciation,
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
    descripcion: "Equipo A",
    costoAdquisicion: 500000,
    valorResidual: 50000,
    vidaUtilAnios: 10
  };

  it("calcula la depreciación anual y mensual por equipo", () => {
    const annual = calculateEquipmentItemDepreciation(baseItem);
    const monthly = calculateEquipmentItemMonthlyDepreciation(baseItem);

    expect(annual).toBeCloseTo(45000);
    expect(monthly).toBeCloseTo(round2(annual / 12));
  });

  it("agrega subtotales anuales y mensuales en el subnivel", () => {
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
          descripcion: "Equipo B",
          costoAdquisicion: 240000,
          valorResidual: 0,
          vidaUtilAnios: 8
        }
      ]
    };

    const totals = calculateEquipmentSublevelTotals(sublevel);

    expect(totals.annual).toBeCloseTo(45000 + 30000);
    expect(totals.monthly).toBeCloseTo(round2((45000 + 30000) / 12));
    expect(totals.total).toBeCloseTo(totals.monthly);
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

    expect(result.subtotal).toBeCloseTo(
      calculateEquipmentItemMonthlyDepreciation(baseItem)
    );
    expect(result.breakdown).toMatchSnapshot();
  });
});
