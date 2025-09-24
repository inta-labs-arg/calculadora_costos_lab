"use client";

import { useMemo, useState } from "react";
import { DirectLevelCard } from "@/components/DirectLevelCard";
import { IntroPanel } from "@/components/IntroPanel";
import { PercentageLevelCard } from "@/components/PercentageLevelCard";
import { SummaryPanel } from "@/components/SummaryPanel";
import type {
  CostItem,
  LevelKey,
  LevelState,
  PercentageLevelState
} from "@/lib/cost-calculation";
import { calculateTotals } from "@/lib/cost-calculation";

const initialLevels: LevelState[] = [
  {
    id: "rrhh",
    name: "Nivel 1 · Recursos humanos",
    description:
      "Carga las horas técnicas, operativas y de apoyo necesarias para brindar el servicio, incluyendo honorarios y cargas sociales.",
    type: "direct",
    unitLabel: "Horas por servicio",
    items: []
  },
  {
    id: "insumos",
    name: "Nivel 2 · Insumos y reactivos",
    description:
      "Detalla consumibles, reactivos críticos y materiales específicos requeridos por unidad de servicio.",
    type: "direct",
    unitLabel: "Unidades por servicio",
    items: []
  },
  {
    id: "equipamiento",
    name: "Nivel 3 · Equipamiento y amortización",
    description:
      "Valúa el uso del equipamiento asignando tarifas horarias que incluyan depreciación, mantenimiento y servicios asociados.",
    type: "direct",
    unitLabel: "Horas de uso",
    items: []
  },
  {
    id: "serviciosGenerales",
    name: "Nivel 4 · Servicios generales y soporte",
    description:
      "Aplica un porcentaje para cubrir utilidades comunes: energía, agua, limpieza, bioseguridad, calibraciones transversales y soporte administrativo.",
    type: "percentage",
    rate: 12,
    base: ["rrhh", "insumos", "equipamiento"]
  },
  {
    id: "gestion",
    name: "Nivel 5 · Gestión estratégica y margen",
    description:
      "Incorpora la supervisión institucional, gestión comercial y un margen de reinversión para garantizar la sostenibilidad del servicio.",
    type: "percentage",
    rate: 8,
    base: ["rrhh", "insumos", "equipamiento", "serviciosGenerales"]
  }
];

export default function HomePage() {
  const [levels, setLevels] = useState<LevelState[]>(initialLevels);

  const { totals, orderedTotals, grandTotal } = useMemo(
    () => calculateTotals(levels),
    [levels]
  );

  const handleDirectChange = (id: LevelKey, items: CostItem[]) => {
    setLevels((prev) =>
      prev.map((level) =>
        level.id === id && level.type === "direct"
          ? {
              ...level,
              items
            }
          : level
      )
    );
  };

  const handlePercentageChange = (
    id: LevelKey,
    updates: { rate?: number; base?: LevelKey[] }
  ) => {
    setLevels((prev) =>
      prev.map((level, index) => {
        if (level.id !== id || level.type !== "percentage") {
          return level;
        }

        const allowedBase = new Set(
          prev.slice(0, index).map((candidate) => candidate.id)
        );

        return {
          ...level,
          rate:
            typeof updates.rate === "number" && !Number.isNaN(updates.rate)
              ? updates.rate
              : level.rate,
          base: updates.base
            ? updates.base.filter((key) => allowedBase.has(key))
            : level.base
        } satisfies PercentageLevelState;
      })
    );
  };

  const handleExport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      totals,
      grandTotal,
      levels: levels.map((level) => ({
        ...level,
        items: level.type === "direct" ? level.items : undefined
      }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `calculadora-inta-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 lg:flex-row">
      <div className="flex-1 space-y-6">
        <IntroPanel onExport={handleExport} />

        <div className="space-y-6">
          {levels.map((level, index) => {
            if (level.type === "direct") {
              return (
                <DirectLevelCard
                  key={level.id}
                  level={level}
                  onChange={(items) => handleDirectChange(level.id, items)}
                />
              );
            }

            const baseBreakdown = levels.slice(0, index).map((candidate) => ({
              id: candidate.id,
              name: candidate.name,
              subtotal: totals[candidate.id]
            }));

            return (
              <PercentageLevelCard
                key={level.id}
                level={level}
                onChange={(updates) => handlePercentageChange(level.id, updates)}
                baseBreakdown={baseBreakdown}
                currentTotals={totals}
              />
            );
          })}
        </div>
      </div>

      <div className="lg:w-80 lg:flex-shrink-0">
        <SummaryPanel orderedTotals={orderedTotals} grandTotal={grandTotal} />
      </div>
    </div>
  );
}
