"use client";

import { useMemo, useState } from "react";
import { IntroPanel } from "@/components/IntroPanel";
import { LevelOneCard } from "@/components/LevelOneCard";
import { PercentageLevelCard } from "@/components/PercentageLevelCard";
import { SummaryPanel } from "@/components/SummaryPanel";
import type {
  LevelKey,
  LevelState,
  PercentageLevelState,
  SublevelState
} from "@/lib/cost-calculation";
import { calculateTotals } from "@/lib/cost-calculation";

const initialLevels: LevelState[] = [
  {
    id: "nivel1",
    name: "Nivel 1 · Costos Directos Unitarios",
    description:
      "Integra los costos específicos que se consumen en cada determinación: insumos directos, mano de obra especializada y equipamiento asociado.",
    type: "direct-group",
    sublevels: [
      {
        id: "insumosDirectos",
        name: "Subnivel 1 · Insumos directos",
        description:
          "Registra los materiales, reactivos y consumibles específicos que se emplean en cada determinación. Permite consignar unidad de medida, cantidad y costo unitario para estimar el costo por muestra.",
        type: "insumos",
        items: []
      },
      {
        id: "manoDeObraDirecta",
        name: "Subnivel 2 · Mano de obra directa",
        description:
          "Estima las horas involucradas del personal que participa en la práctica (profesionales, técnicos, apoyos y becarios) y sus tarifas para calcular el costo laboral directo.",
        type: "manoObra",
        items: [
          {
            id: "professional",
            role: "professional",
            label: "Profesional investigador",
            hours: 0,
            rate: 0
          },
          {
            id: "technician",
            role: "technician",
            label: "Técnico",
            hours: 0,
            rate: 0
          },
          {
            id: "support",
            role: "support",
            label: "Personal de apoyo",
            hours: 0,
            rate: 0
          },
          {
            id: "intern",
            role: "intern",
            label: "Becario",
            hours: 0,
            rate: 0
          }
        ]
      },
      {
        id: "equipamientoEspecifico",
        name: "Subnivel 3 · Equipamiento específico",
        description:
          "Permite calcular la depreciación y los servicios de calibración asociados al equipamiento utilizado en la determinación, considerando vida útil y frecuencia de calibración.",
        type: "equipamiento",
        items: []
      }
    ]
  },
  {
    id: "serviciosGenerales",
    name: "Nivel 2 · Servicios generales y soporte",
    description:
      "Aplica un porcentaje para cubrir utilidades comunes: energía, agua, limpieza, bioseguridad, calibraciones transversales y soporte administrativo.",
    type: "percentage",
    rate: 12,
    base: ["nivel1"]
  },
  {
    id: "gestion",
    name: "Nivel 3 · Gestión estratégica y margen",
    description:
      "Incorpora la supervisión institucional, gestión comercial y un margen de reinversión para garantizar la sostenibilidad del servicio.",
    type: "percentage",
    rate: 8,
    base: ["nivel1", "serviciosGenerales"]
  }
];

export default function HomePage() {
  const [levels, setLevels] = useState<LevelState[]>(initialLevels);

  const { totals, orderedTotals, grandTotal } = useMemo(
    () => calculateTotals(levels),
    [levels]
  );

  const handleSublevelChange = (
    id: LevelKey,
    updatedSublevel: SublevelState
  ) => {
    setLevels((prev) =>
      prev.map((level) => {
        if (level.id !== id || level.type !== "direct-group") {
          return level;
        }

        return {
          ...level,
          sublevels: level.sublevels.map((sublevel) =>
            sublevel.id === updatedSublevel.id ? updatedSublevel : sublevel
          )
        };
      })
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
      levels
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
            if (level.type === "direct-group") {
              return (
                <LevelOneCard
                  key={level.id}
                  level={level}
                  onSublevelChange={(sublevel) =>
                    handleSublevelChange(level.id, sublevel)
                  }
                />
              );
            }

            if (level.type !== "percentage") {
              return null;
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
