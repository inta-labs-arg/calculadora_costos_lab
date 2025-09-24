export type LevelKey =
  | "rrhh"
  | "insumos"
  | "equipamiento"
  | "serviciosGenerales"
  | "gestion";

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

export interface PercentageLevelState {
  id: LevelKey;
  name: string;
  description: string;
  type: "percentage";
  rate: number; // expressed as percentage e.g. 12 => 12%
  base: LevelKey[]; // levels that form the base for percentage calculation
}

export type LevelState = DirectLevelState | PercentageLevelState;

export interface LevelTotal {
  id: LevelKey;
  name: string;
  subtotal: number;
  rate?: number;
}

export const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2
});

export function calculateDirectLevel(level: DirectLevelState): number {
  return level.items.reduce((acc, item) => acc + item.quantity * item.unitCost, 0);
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
    rrhh: 0,
    insumos: 0,
    equipamiento: 0,
    serviciosGenerales: 0,
    gestion: 0
  };
  const orderedTotals: LevelTotal[] = [];

  for (const level of levels) {
    if (level.type === "direct") {
      const subtotal = calculateDirectLevel(level);
      totals[level.id] = subtotal;
      orderedTotals.push({ id: level.id, name: level.name, subtotal });
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
