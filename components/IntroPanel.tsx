"use client";

import { useState } from "react";
import { DownloadIcon, InfoIcon } from "./icons";

interface IntroPanelProps {
  onExport: () => void;
}

export function IntroPanel({ onExport }: IntroPanelProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <section className="space-y-4 rounded-3xl bg-gradient-to-r from-inta-blue to-inta-green p-8 text-white shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm uppercase tracking-wide text-white/80">
            Instituto Nacional de Tecnología Agropecuaria
          </p>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            Calculadora de Costos de Servicios de Laboratorio
          </h1>
          <p className="text-base text-white/80">
            Construye escenarios económicos robustos combinando los cinco niveles
            definidos por INTA: recursos humanos, insumos estratégicos, uso de
            equipamiento, servicios generales y gestión institucional.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-inta-blue shadow-sm transition hover:bg-slate-100"
          >
            <DownloadIcon className="h-4 w-4" /> Exportar como JSON
          </button>
          <button
            type="button"
            onClick={() => setShowHelp((value) => !value)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
          >
            <InfoIcon className="h-4 w-4" /> {showHelp ? "Ocultar guía" : "Ver guía rápida"}
          </button>
        </div>
      </div>

      {showHelp ? (
        <div className="grid gap-4 rounded-2xl bg-white/15 p-6 text-sm md:grid-cols-3 lg:grid-cols-5">
          <div>
            <h3 className="font-semibold uppercase tracking-wide text-white/70">1. Recursos humanos</h3>
            <p className="text-white/80">
              Estima las horas técnicas y operativas necesarias para el servicio,
              incluyendo cargas sociales o pluses salariales.
            </p>
          </div>
          <div>
            <h3 className="font-semibold uppercase tracking-wide text-white/70">2. Insumos y reactivos</h3>
            <p className="text-white/80">
              Considera consumibles, reactivos críticos y materiales descartables
              por unidad de servicio.
            </p>
          </div>
          <div>
            <h3 className="font-semibold uppercase tracking-wide text-white/70">3. Equipamiento</h3>
            <p className="text-white/80">
              Calcula depreciaciones y costos horarios de cada equipo, incluyendo
              mantenimiento preventivo y correctivo.
            </p>
          </div>
          <div>
            <h3 className="font-semibold uppercase tracking-wide text-white/70">4. Servicios generales</h3>
            <p className="text-white/80">
              Contempla energía, agua, bioseguridad y otras utilidades que se
              distribuyen mediante coeficientes porcentuales.
            </p>
          </div>
          <div>
            <h3 className="font-semibold uppercase tracking-wide text-white/70">5. Gestión y margen</h3>
            <p className="text-white/80">
              Incorpora planificación, control de calidad, articulación con
              usuarios y un margen de sostenibilidad.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
