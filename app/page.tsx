"use client";

import { useMemo, useState } from "react";
import { IntroPanel } from "@/components/IntroPanel";
import { LevelOneCard } from "@/components/LevelOneCard";
import { IndirectLevelCard } from "@/components/IndirectLevelCard";
import { PercentageLevelCard } from "@/components/PercentageLevelCard";
import { SequentialPercentageLevelCard } from "@/components/SequentialPercentageLevelCard";
import { SummaryPanel } from "@/components/SummaryPanel";
import { ConfigurationPanel } from "@/components/ConfigurationPanel";
import { HourlyRatesPanel } from "@/components/HourlyRatesPanel";
import type {
  LevelKey,
  LevelState,
  PercentageLevelState,
  SublevelState,
  IndirectSublevelState,
  SequentialPercentageLevelState
} from "@/lib/cost-calculation";
import { calculateTotals } from "@/lib/cost-calculation";
import {
  ExchangeRateProvider,
  useExchangeRate
} from "@/contexts/ExchangeRateContext";
import { HourlyRatesProvider } from "@/contexts/HourlyRatesContext";

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
        name: "Subnivel 1.1 · Insumos directos",
        description:
          "Registra los materiales, reactivos y consumibles específicos que se emplean en cada determinación. Permite consignar unidad de medida, cantidad y costo unitario para estimar el costo por muestra.",
        type: "insumos",
        items: []
      },
      {
        id: "manoDeObraDirecta",
        name: "Subnivel 1.2 · Mano de obra directa",
        description:
          "Estima las horas involucradas del personal que participa en la práctica (profesionales, técnicos, apoyos y becarios) y sus tarifas para calcular el costo laboral directo.",
        type: "manoObra",
        items: [
          {
            id: "professional",
            role: "professional",
            label: "Profesional investigador",
            hours: 0,
            rate: 0,
            profileCode: "professional",
            isManualRate: false
          },
          {
            id: "technician",
            role: "technician",
            label: "Técnico",
            hours: 0,
            rate: 0,
            profileCode: "technician",
            isManualRate: false
          },
          {
            id: "support",
            role: "support",
            label: "Personal de apoyo",
            hours: 0,
            rate: 0,
            profileCode: "support",
            isManualRate: false
          },
          {
            id: "intern",
            role: "intern",
            label: "Becario",
            hours: 0,
            rate: 0,
            profileCode: "intern",
            isManualRate: false
          }
        ]
      },
      {
        id: "equipamientoEspecifico",
        name: "Subnivel 1.3 · Equipamiento específico",
        description:
          "Permite calcular la depreciación y los servicios de calibración asociados al equipamiento utilizado en la determinación, considerando vida útil y frecuencia de calibración.",
        type: "equipamiento",
        items: []
      }
    ]
  },
  {
    id: "serviciosGenerales",
    name: "Nivel 2 · Costos Indirectos Unitarios",
    description:
      "Identifica y distribuye los recursos transversales del laboratorio que sostienen cada determinación, prorrateándolos según las prácticas realizadas.",
    type: "indirect-group",
    sublevels: [
      {
        id: "materialesNoDescartables",
        name: "Subnivel 2.1 · Materiales no descartables",
        description:
          "Registra materiales reutilizables (jeringas de vidrio, tubos, frascos, etc.) considerando su costo mensual de reposición y el prorrateo por determinación realizada.",
        type: "shared-resource",
        items: []
      },
      {
        id: "equipamientoMenor",
        name: "Subnivel 2.2 · Depreciación de equipamiento menor",
        description:
          "Calcula la depreciación lineal de los equipos menores de uso transversal (balanzas, heladeras, campanas, etc.) y asigna su costo unitario en función de las determinaciones mensuales del laboratorio.",
        type: "indirect-equipment",
        items: []
      },
      {
        id: "mantenimientoEquipamiento",
        name: "Subnivel 2.3 · Mantenimiento de equipamiento",
        description:
          "Incluye honorarios de especialistas y repuestos vinculados al mantenimiento preventivo y correctivo de los equipos, prorrateados según la actividad mensual.",
        type: "shared-resource",
        items: []
      },
      {
        id: "infraestructura",
        name: "Subnivel 2.4 · Costos de infraestructura",
        description:
          "Agrupa servicios y apoyos generales como energía, gas, agua, limpieza, administración y comunicaciones necesarios para el funcionamiento del laboratorio.",
        type: "shared-resource",
        items: []
      }
    ]
  },
  {
    id: "acreditacion",
    name: "Nivel 3 · Acreditación y monitoreo de prácticas de laboratorio",
    description:
      "Integra los costos estratégicos necesarios para asegurar la calidad, confiabilidad y trazabilidad de cada práctica mediante certificaciones, controles regulatorios y ensayos comparativos.",
    type: "indirect-group",
    sublevels: [
      {
        id: "acreditacionTercerasPartes",
        name: "Subnivel 3.1 · Acreditación de terceras partes",
        description:
          "Incluye los aranceles y auditorías requeridas por el Organismo Argentino de Acreditación (OAA) bajo la Norma ISO/IEC 17025 para garantizar la competencia técnica.",
        type: "shared-resource",
        items: []
      },
      {
        id: "monitoreoRegulatorio",
        name: "Subnivel 3.2 · Monitoreo de organismos regulatorios",
        description:
          "Considera inspecciones, tasas y auditorías asociadas al cumplimiento de normativas de SENASA y ANMAT que habilitan las determinaciones oficiales.",
        type: "shared-resource",
        items: []
      },
      {
        id: "ensayosInterlaboratorio",
        name: "Subnivel 3.3 · Participación de ensayos interlaboratorio",
        description:
          "Registra las inscripciones y envíos necesarios para participar en comparaciones de desempeño obligatorias o recomendadas que respaldan la calidad analítica.",
        type: "shared-resource",
        items: []
      }
    ]
  },
  {
    id: "afectacionInstitucional",
    name: "Nivel 4 · Afectación institucional",
    description:
      "Distribuye porcentualmente los fondos resultantes entre el Centro Regional o de Investigación y la EEA/Instituto responsable del servicio, siguiendo los acuerdos de la Fundación ArgenINTA.",
    type: "sequential-percentage",
    base: ["nivel1", "serviciosGenerales", "acreditacion"],
    steps: [
      {
        id: "centroRegional",
        name: "Centro Regional / Centro de Investigación",
        rate: 5,
        applyOn: "base"
      },
      {
        id: "eeaMarcosJuarez",
        name: "EEA o Instituto de Investigación",
        rate: 10,
        applyOn: "remaining"
      }
    ]
  }
];

function HomePageContent() {
  const [levels, setLevels] = useState<LevelState[]>(initialLevels);
  const [globalDeterminations, setGlobalDeterminations] = useState<number>(100);
  const {
    state: exchangeRateState
  } = useExchangeRate();

  const { totals, orderedTotals, grandTotal } = useMemo(
    () => calculateTotals(levels, { exchangeRate: exchangeRateState.rate }),
    [levels, exchangeRateState.rate]
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

  const handleIndirectSublevelChange = (
    id: LevelKey,
    updatedSublevel: IndirectSublevelState
  ) => {
    setLevels((prev) =>
      prev.map((level) => {
        if (level.id !== id || level.type !== "indirect-group") {
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

  const handleGlobalDeterminationsChange = (value: number) => {
    setGlobalDeterminations(value);
    setLevels((prev) =>
      prev.map((level) => {
        if (
          level.id !== "serviciosGenerales" ||
          level.type !== "indirect-group"
        ) {
          return level;
        }

        return {
          ...level,
          sublevels: level.sublevels.map((sublevel) => {
            if (
              sublevel.id !== "materialesNoDescartables" &&
              sublevel.id !== "equipamientoMenor" &&
              sublevel.id !== "mantenimientoEquipamiento" &&
              sublevel.id !== "infraestructura"
            ) {
              return sublevel;
            }

            if (sublevel.type === "shared-resource") {
              return {
                ...sublevel,
                items: sublevel.items.map((item) =>
                  item.isCustomDeterminations
                    ? item
                    : {
                        ...item,
                        determinations: value,
                        isCustomDeterminations: false
                      }
                )
              } satisfies IndirectSublevelState;
            }

            return {
              ...sublevel,
              items: sublevel.items.map((item) =>
                item.isCustomDeterminations
                  ? item
                  : {
                      ...item,
                      determinations: value,
                      isCustomDeterminations: false
                    }
              )
            } satisfies IndirectSublevelState;
          })
        } satisfies typeof level;
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

  const handleSequentialPercentageChange = (
    id: LevelKey,
    updates: {
      base?: LevelKey[];
      steps?: Array<{ id: string; rate: number }>;
    }
  ) => {
    setLevels((prev) =>
      prev.map((level, index) => {
        if (level.id !== id || level.type !== "sequential-percentage") {
          return level;
        }

        const allowedBase = new Set(
          prev.slice(0, index).map((candidate) => candidate.id)
        );

        const nextSteps = updates.steps
          ? level.steps.map((step) => {
              const updated = updates.steps?.find((item) => item.id === step.id);
              if (!updated || Number.isNaN(updated.rate)) {
                return step;
              }

              return {
                ...step,
                rate: updated.rate
              } satisfies SequentialPercentageLevelState["steps"][number];
            })
          : level.steps;

        return {
          ...level,
          base: updates.base
            ? updates.base.filter((key) => allowedBase.has(key))
            : level.base,
          steps: nextSteps
        } satisfies SequentialPercentageLevelState;
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
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
      <IntroPanel onExport={handleExport} />

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1 space-y-6">
          <div id="niveles" className="space-y-6 scroll-mt-24">
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

          if (level.type === "indirect-group") {
            return (
              <IndirectLevelCard
                key={level.id}
                level={level}
                onSublevelChange={(sublevel) =>
                  handleIndirectSublevelChange(level.id, sublevel)
                }
                globalDeterminations={globalDeterminations}
              />
            );
          }

          if (level.type === "sequential-percentage") {
            const baseBreakdown = levels.slice(0, index).map((candidate) => ({
              id: candidate.id,
              name: candidate.name,
              subtotal: totals[candidate.id]
            }));

            return (
              <SequentialPercentageLevelCard
                key={level.id}
                level={level}
                onChange={(updates) =>
                  handleSequentialPercentageChange(level.id, updates)
                }
                baseBreakdown={baseBreakdown}
                currentTotals={totals}
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

        <aside className="space-y-6 lg:w-80 lg:flex-shrink-0">
          <nav
            aria-label="Navegación rápida"
            className="rounded-2xl border border-slate-200 bg-white/95 p-5 text-sm shadow-md"
          >
            <h2 className="text-base font-semibold text-slate-900">Atajos</h2>
            <ul className="mt-3 space-y-2 text-slate-600">
              <li>
                <a
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
                  href="#niveles"
                >
                  Niveles de cálculo
                </a>
              </li>
              <li>
                <a
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
                  href="#configuracion"
                >
                  Configuración
                </a>
              </li>
              <li>
                <a
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
                  href="#resumen"
                >
                  Resumen económico
                </a>
              </li>
              <li>
                <a
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
                  href="#gestor-horas"
                >
                  Gestor de horas INTA
                </a>
              </li>
            </ul>
          </nav>

          <div id="configuracion" className="scroll-mt-24">
            <ConfigurationPanel
              globalDeterminations={globalDeterminations}
              onGlobalDeterminationsChange={handleGlobalDeterminationsChange}
            />
          </div>
          <div id="resumen" className="scroll-mt-24">
            <SummaryPanel
              orderedTotals={orderedTotals}
              grandTotal={grandTotal}
              exchangeRate={exchangeRateState}
            />
          </div>
        </aside>
      </div>

      <div id="gestor-horas" className="scroll-mt-24">
        <HourlyRatesPanel />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <HourlyRatesProvider>
      <ExchangeRateProvider>
        <HomePageContent />
      </ExchangeRateProvider>
    </HourlyRatesProvider>
  );
}
