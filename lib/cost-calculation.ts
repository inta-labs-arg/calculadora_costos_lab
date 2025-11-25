import { round2 } from "./money";

export type LevelKey =
  | "nivel1"
  | "serviciosGenerales"
  | "acreditacion"
  | "afectacionInstitucional";

export type SublevelKey =
  | "insumosDirectos"
  | "manoDeObraDirecta"
  | "equipamientoEspecifico";

export type IndirectSublevelKey =
  | "materialesNoDescartables"
  | "equipamientoMenor"
  | "mantenimientoEquipamiento"
  | "infraestructura"
  | "acreditacionTercerasPartes"
  | "monitoreoRegulatorio"
  | "ensayosInterlaboratorio";

export interface CostItem {
  id: string;
  concept: string;
  quantity: number;
  unitCost: number;
  unitLabel: string;
  notes?: string;
}

export interface DirectLevelState {
  id: LevelKey;
  name: string;
  description: string;
  type: "direct";
  unitLabel: string;
  items: CostItem[];
}

export type CurrencyCode = "ARS" | "USD";

export interface SupplyCostItem {
  id: string;
  item: string;
  unitOfMeasure: string;
  presentationFormat: string;
  presentationQuantity: number;
  presentationPrice: number;
  determinationQuantity: number;
}

export type LaborRole =
  | "professional"
  | "technician"
  | "support";

export interface LaborCostItem {
  id: string;
  role: LaborRole;
  label: string;
  quantity: number;
  totalHours: number;
  monthlySalary: number;
}

export const LABOR_MONTHLY_HOURS = 22 * 8;

export interface EquipmentCostItem {
  id: string;
  descripcion: string;
  costoAdquisicion: number;
  valorResidual: number;
  vidaUtilAnios: number;
}

export interface SupplySublevelState {
  id: "insumosDirectos";
  name: string;
  description: string;
  type: "insumos";
  items: SupplyCostItem[];
}

export interface LaborSublevelState {
  id: "manoDeObraDirecta";
  name: string;
  description: string;
  type: "manoObra";
  items: LaborCostItem[];
}

export interface EquipmentSublevelState {
  id: "equipamientoEspecifico";
  name: string;
  description: string;
  type: "equipamiento";
  items: EquipmentCostItem[];
}

export type SublevelState =
  | SupplySublevelState
  | LaborSublevelState
  | EquipmentSublevelState;

export interface SharedResourceCostItem {
  id: string;
  concept: string;
  monthlyCost: number;
  determinations: number;
  isCustomDeterminations?: boolean;
  isFixed?: boolean;
  allowConceptEdit?: boolean;
  maintenanceDetails?: {
    ctm: number;
    cam: number;
    months: number;
    detMes: number;
    period: {
      start: string;
      end: string;
    };
    ipd: number;
  };
  accreditationDetails?: {
    organismo: string;
    cta: number;
    months: number;
    monthlyCost: number;
    annualCost: number;
    detMes: number;
    shortPeriod: boolean;
    period: {
      start: string;
      end: string;
    };
  };
  interlaboratoryDetails?: {
    contraparte: string;
    tipoCanon: "anual" | "totalPeriodo";
    canon: number;
    moneda: CurrencyCode;
    anios: number;
    detMensuales: number;
  };
}

export interface SharedResourceSublevelState {
  id:
    | "materialesNoDescartables"
    | "mantenimientoEquipamiento"
    | "infraestructura"
    | "acreditacionTercerasPartes"
    | "monitoreoRegulatorio"
    | "ensayosInterlaboratorio";
  name: string;
  description: string;
  type: "shared-resource";
  items: SharedResourceCostItem[];
}

const infrastructureBaseItems = [
  { id: "energia", concept: "Energía", allowConceptEdit: false },
  { id: "gas", concept: "Gas", allowConceptEdit: false },
  { id: "agua", concept: "Agua", allowConceptEdit: false },
  { id: "limpieza", concept: "Limpieza", allowConceptEdit: false },
  {
    id: "administracion",
    concept: "Administración",
    allowConceptEdit: false
  },
  {
    id: "comunicaciones",
    concept: "Comunicaciones",
    allowConceptEdit: false
  },
  {
    id: "otro",
    concept: "Otro (especificar)",
    allowConceptEdit: true
  }
] as const;

export function createInfrastructureDefaultItems(
  determinations: number
): SharedResourceCostItem[] {
  const normalizedDeterminations = determinations > 0 ? determinations : 0;

  return infrastructureBaseItems.map((item) => ({
    id: item.id,
    concept: item.concept,
    monthlyCost: 0,
    determinations: normalizedDeterminations,
    isCustomDeterminations: normalizedDeterminations > 0 ? false : undefined,
    isFixed: true,
    allowConceptEdit: item.allowConceptEdit
  }));
}

export interface IndirectEquipmentItem {
  id: string;
  name: string;
  purchasePrice: number;
  usefulLifeMonths: number;
  determinations: number;
  isCustomDeterminations?: boolean;
}

export interface IndirectEquipmentSublevelState {
  id: "equipamientoMenor";
  name: string;
  description: string;
  type: "indirect-equipment";
  items: IndirectEquipmentItem[];
}

export type IndirectSublevelState =
  | SharedResourceSublevelState
  | IndirectEquipmentSublevelState;

export interface IndirectLevelGroupState {
  id: LevelKey;
  name: string;
  description: string;
  type: "indirect-group";
  sublevels: IndirectSublevelState[];
}

export interface DirectLevelGroupState {
  id: LevelKey;
  name: string;
  description: string;
  type: "direct-group";
  sublevels: SublevelState[];
}

export interface PercentageLevelState {
  id: LevelKey;
  name: string;
  description: string;
  type: "percentage";
  rate: number; // expressed as percentage e.g. 12 => 12%
  base: LevelKey[]; // levels that form the base for percentage calculation
}

export interface SequentialPercentageStepState {
  id: string;
  name: string;
  rate: number;
  applyOn: "base" | "remaining";
}

export interface SequentialPercentageLevelState {
  id: LevelKey;
  name: string;
  description: string;
  type: "sequential-percentage";
  base: LevelKey[];
  steps: SequentialPercentageStepState[];
}

export type LevelState =
  | DirectLevelState
  | DirectLevelGroupState
  | PercentageLevelState
  | IndirectLevelGroupState
  | SequentialPercentageLevelState;

export interface LevelTotal {
  id: LevelKey;
  name: string;
  subtotal: number;
  rate?: number;
  breakdown?: Array<
    {
      id: SublevelKey | IndirectSublevelKey | string;
      name: string;
      subtotal: number;
      rate?: number;
    } & {
      breakdown?: {
        id: string;
        name: string;
        subtotal: number;
      }[];
    }
  >;
}

export interface CalculationOptions {
  exchangeRate?: number;
}

export const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2
});

export function calculateDirectLevel(level: DirectLevelState): number {
  return level.items.reduce((acc, item) => acc + item.quantity * item.unitCost, 0);
}

export function calculateSupplyItemUnitPrice(item: SupplyCostItem): number {
  if (item.presentationQuantity <= 0) {
    return 0;
  }

  return item.presentationPrice / item.presentationQuantity;
}

export function calculateSupplyItemCost(
  item: SupplyCostItem,
  _options?: CalculationOptions
): number {
  const unitPrice = calculateSupplyItemUnitPrice(item);
  return unitPrice * item.determinationQuantity;
}

export function calculateLaborItemCost(item: LaborCostItem): number {
  if (
    item.quantity <= 0 ||
    item.totalHours <= 0 ||
    item.monthlySalary <= 0
  ) {
    return 0;
  }

  const hourlyValue = item.monthlySalary / LABOR_MONTHLY_HOURS;
  const cost = hourlyValue * item.totalHours * item.quantity;

  return round2(cost);
}

export function calculateEquipmentItemDepreciation(
  item: EquipmentCostItem
): number {
  if (item.vidaUtilAnios <= 0) {
    return 0;
  }

  const depreciableAmount = item.costoAdquisicion - item.valorResidual;

  if (depreciableAmount <= 0) {
    return 0;
  }

  return round2(depreciableAmount / item.vidaUtilAnios);
}

export function calculateEquipmentItemMonthlyDepreciation(
  item: EquipmentCostItem
): number {
  const annual = calculateEquipmentItemDepreciation(item);

  if (annual <= 0) {
    return 0;
  }

  return round2(annual / 12);
}

export function calculateEquipmentSublevelTotals(
  sublevel: EquipmentSublevelState
): {
  annual: number;
  monthly: number;
  total: number;
} {
  const annual = sublevel.items.reduce(
    (acc, item) => acc + calculateEquipmentItemDepreciation(item),
    0
  );
  const monthly = sublevel.items.reduce(
    (acc, item) => acc + calculateEquipmentItemMonthlyDepreciation(item),
    0
  );

  return {
    annual: round2(annual),
    monthly: round2(monthly),
    total: round2(monthly)
  };
}

export function calculateSharedResourceItemCost(
  item: SharedResourceCostItem
): number {
  if (item.determinations <= 0) {
    return 0;
  }

  return item.monthlyCost / item.determinations;
}

export function calculateIndirectEquipmentItemCost(
  item: IndirectEquipmentItem
): number {
  if (item.usefulLifeMonths <= 0 || item.determinations <= 0) {
    return 0;
  }

  const monthlyDepreciation = item.purchasePrice / item.usefulLifeMonths;
  return monthlyDepreciation / item.determinations;
}

export function calculateSublevelSubtotal(
  sublevel: SublevelState,
  options?: CalculationOptions
): number {
  switch (sublevel.type) {
    case "insumos":
      return sublevel.items.reduce(
        (acc, item) => acc + calculateSupplyItemCost(item, options),
        0
      );
    case "manoObra":
      return sublevel.items.reduce(
        (acc, item) => acc + calculateLaborItemCost(item),
        0
      );
    case "equipamiento":
      return calculateEquipmentSublevelTotals(sublevel).total;
    default: {
      const exhaustiveCheck: never = sublevel;
      return exhaustiveCheck;
    }
  }
}

export function calculateIndirectSublevelSubtotal(
  sublevel: IndirectSublevelState
): number {
  switch (sublevel.type) {
    case "shared-resource":
      return sublevel.items.reduce(
        (acc, item) => acc + calculateSharedResourceItemCost(item),
        0
      );
    case "indirect-equipment":
      return sublevel.items.reduce(
        (acc, item) => acc + calculateIndirectEquipmentItemCost(item),
        0
      );
    default: {
      const exhaustiveCheck: never = sublevel;
      return exhaustiveCheck;
    }
  }
}

export function calculateDirectGroupLevel(
  level: DirectLevelGroupState,
  options?: CalculationOptions
): {
  subtotal: number;
  breakdown: NonNullable<LevelTotal["breakdown"]>;
} {
  const breakdown = level.sublevels.map((sublevel) => {
    if (sublevel.type === "equipamiento") {
      const { annual, monthly, total } =
        calculateEquipmentSublevelTotals(sublevel);

      return {
        id: sublevel.id,
        name: sublevel.name,
        subtotal: total,
        breakdown: [
          {
            id: `${sublevel.id}-depreciacion-anual`,
            name: "Depreciación anual (ARS)",
            subtotal: annual
          },
          {
            id: `${sublevel.id}-depreciacion-mensual`,
            name: "Depreciación mensual (ARS)",
            subtotal: monthly
          }
        ]
      };
    }

    return {
      id: sublevel.id,
      name: sublevel.name,
      subtotal: calculateSublevelSubtotal(sublevel, options)
    };
  });

  const subtotal = breakdown.reduce((acc, item) => acc + item.subtotal, 0);

  return { subtotal, breakdown };
}

export function calculateIndirectGroupLevel(level: IndirectLevelGroupState): {
  subtotal: number;
  breakdown: Array<
    {
      id: IndirectSublevelKey;
      name: string;
      subtotal: number;
    } & {
      breakdown?: { id: string; name: string; subtotal: number }[];
    }
  >;
} {
  const breakdown = level.sublevels.map((sublevel) => {
    if (sublevel.id === "infraestructura" && sublevel.type === "shared-resource") {
      const itemBreakdown = sublevel.items.map((item) => ({
        id: item.id,
        name: item.concept,
        subtotal: calculateSharedResourceItemCost(item)
      }));
      const subtotal = itemBreakdown.reduce((acc, item) => acc + item.subtotal, 0);

      return {
        id: sublevel.id,
        name: sublevel.name,
        subtotal,
        breakdown: itemBreakdown
      };
    }

    return {
      id: sublevel.id,
      name: sublevel.name,
      subtotal: calculateIndirectSublevelSubtotal(sublevel)
    };
  });

  const subtotal = breakdown.reduce((acc, item) => acc + item.subtotal, 0);

  return { subtotal, breakdown };
}

export function calculatePercentageLevel(
  level: PercentageLevelState,
  totals: Record<LevelKey, number>
): number {
  const baseValue = level.base.reduce((acc, key) => acc + (totals[key] ?? 0), 0);
  return (level.rate / 100) * baseValue;
}

export function calculateSequentialPercentageLevel(
  level: SequentialPercentageLevelState,
  totals: Record<LevelKey, number>
): { subtotal: number; breakdown: { id: string; name: string; subtotal: number; rate: number }[] } {
  const baseValue = level.base.reduce((acc, key) => acc + (totals[key] ?? 0), 0);
  let remaining = baseValue;

  const breakdown = level.steps.map((step) => {
    const applicableBase = step.applyOn === "remaining" ? remaining : baseValue;
    const subtotal = (step.rate / 100) * applicableBase;

    if (step.applyOn === "remaining") {
      remaining -= subtotal;
    }

    return {
      id: step.id,
      name: step.name,
      subtotal,
      rate: step.rate
    };
  });

  const subtotal = breakdown.reduce((acc, item) => acc + item.subtotal, 0);

  return { subtotal, breakdown };
}

export function calculateTotals(
  levels: LevelState[],
  options?: CalculationOptions
): {
  totals: Record<LevelKey, number>;
  orderedTotals: LevelTotal[];
  grandTotal: number;
} {
  const totals: Record<LevelKey, number> = {
    nivel1: 0,
    serviciosGenerales: 0,
    acreditacion: 0,
    afectacionInstitucional: 0
  };
  const orderedTotals: LevelTotal[] = [];

  for (const level of levels) {
    if (level.type === "direct") {
      const subtotal = calculateDirectLevel(level);
      totals[level.id] = subtotal;
      orderedTotals.push({ id: level.id, name: level.name, subtotal });
    } else if (level.type === "direct-group") {
      const { subtotal, breakdown } = calculateDirectGroupLevel(level, options);
      totals[level.id] = subtotal;
      orderedTotals.push({
        id: level.id,
        name: level.name,
        subtotal,
        breakdown
      });
    } else if (level.type === "indirect-group") {
      const { subtotal, breakdown } = calculateIndirectGroupLevel(level);
      totals[level.id] = subtotal;
      orderedTotals.push({
        id: level.id,
        name: level.name,
        subtotal,
        breakdown
      });
    } else if (level.type === "sequential-percentage") {
      const { subtotal, breakdown } = calculateSequentialPercentageLevel(
        level,
        totals
      );
      totals[level.id] = subtotal;
      orderedTotals.push({
        id: level.id,
        name: level.name,
        subtotal,
        breakdown
      });
    } else {
      const subtotal = calculatePercentageLevel(level, totals);
      totals[level.id] = subtotal;
      orderedTotals.push({
        id: level.id,
        name: level.name,
        subtotal,
        rate: level.rate
      });
    }
  }

  const grandTotal = orderedTotals.reduce((acc, { subtotal }) => acc + subtotal, 0);

  return { totals, orderedTotals, grandTotal };
}

export function createEmptyItem(unitLabel: string): CostItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    concept: "",
    quantity: 0,
    unitCost: 0,
    unitLabel
  };
}
