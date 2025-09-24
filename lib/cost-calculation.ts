export type LevelKey = "nivel1" | "serviciosGenerales" | "gestion";

export type SublevelKey =
  | "insumosDirectos"
  | "manoDeObraDirecta"
  | "equipamientoEspecifico";

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

export interface SupplyCostItem {
  id: string;
  item: string;
  unitOfMeasure: string;
  quantity: number;
  unitCost: number;
  currency: string;
}

export type LaborRole =
  | "professional"
  | "technician"
  | "support"
  | "intern";

export interface LaborCostItem {
  id: string;
  role: LaborRole;
  label: string;
  hours: number;
  rate: number;
}

export interface EquipmentCostItem {
  id: string;
  name: string;
  model: string;
  usefulLifeDeterminations: number;
  purchasePrice: number;
  calibrationCost: number;
  calibrationPeriodDeterminations: number;
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

export type LevelState =
  | DirectLevelState
  | DirectLevelGroupState
  | PercentageLevelState;

export interface LevelTotal {
  id: LevelKey;
  name: string;
  subtotal: number;
  rate?: number;
  breakdown?: { id: SublevelKey; name: string; subtotal: number }[];
}

export const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2
});

export function calculateDirectLevel(level: DirectLevelState): number {
  return level.items.reduce((acc, item) => acc + item.quantity * item.unitCost, 0);
}

export function calculateSupplyItemCost(item: SupplyCostItem): number {
  return item.quantity * item.unitCost;
}

export function calculateLaborItemCost(item: LaborCostItem): number {
  return item.hours * item.rate;
}

export function calculateEquipmentItemCost(item: EquipmentCostItem): number {
  const depreciation =
    item.usefulLifeDeterminations > 0
      ? item.purchasePrice / item.usefulLifeDeterminations
      : 0;
  const calibrationAllocation =
    item.calibrationPeriodDeterminations > 0
      ? item.calibrationCost / item.calibrationPeriodDeterminations
      : 0;
  return depreciation + calibrationAllocation;
}

export function calculateSublevelSubtotal(sublevel: SublevelState): number {
  switch (sublevel.type) {
    case "insumos":
      return sublevel.items.reduce(
        (acc, item) => acc + calculateSupplyItemCost(item),
        0
      );
    case "manoObra":
      return sublevel.items.reduce(
        (acc, item) => acc + calculateLaborItemCost(item),
        0
      );
    case "equipamiento":
      return sublevel.items.reduce(
        (acc, item) => acc + calculateEquipmentItemCost(item),
        0
      );
    default: {
      const exhaustiveCheck: never = sublevel;
      return exhaustiveCheck;
    }
  }
}

export function calculateDirectGroupLevel(level: DirectLevelGroupState): {
  subtotal: number;
  breakdown: { id: SublevelKey; name: string; subtotal: number }[];
} {
  const breakdown = level.sublevels.map((sublevel) => ({
    id: sublevel.id,
    name: sublevel.name,
    subtotal: calculateSublevelSubtotal(sublevel)
  }));

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

export function calculateTotals(levels: LevelState[]): {
  totals: Record<LevelKey, number>;
  orderedTotals: LevelTotal[];
  grandTotal: number;
} {
  const totals: Record<LevelKey, number> = {
    nivel1: 0,
    serviciosGenerales: 0,
    gestion: 0
  };
  const orderedTotals: LevelTotal[] = [];

  for (const level of levels) {
    if (level.type === "direct") {
      const subtotal = calculateDirectLevel(level);
      totals[level.id] = subtotal;
      orderedTotals.push({ id: level.id, name: level.name, subtotal });
    } else if (level.type === "direct-group") {
      const { subtotal, breakdown } = calculateDirectGroupLevel(level);
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
