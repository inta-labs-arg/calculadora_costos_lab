"use client";

import { useState } from "react";
import { InfoIcon } from "./icons";

export function IntroPanel() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <section className="space-y-4 rounded-3xl bg-gradient-to-r from-inta-blue to-inta-green p-8 text-white shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-4">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-wide text-white/80">
              Instituto Nacional de Tecnología Agropecuaria
            </p>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">
              Calculadora de Costos de Servicios de Laboratorio
            </h1>
            <p className="text-base text-white/80">
              Construí escenarios económicos robustos integrando los niveles de
              costos definidos por INTA y distribuyendo recursos directos,
              indirectos y porcentuales en un mismo flujo de trabajo.
            </p>
          </div>

          <nav
            aria-label="Atajos principales"
            className="flex flex-wrap gap-2 text-sm font-medium text-white/90"
          >
            <a
              className="rounded-full bg-white/10 px-4 py-2 transition hover:bg-white/20 hover:text-white"
              href="#niveles"
            >
              Niveles de cálculo
            </a>
            <a
              className="rounded-full bg-white/10 px-4 py-2 transition hover:bg-white/20 hover:text-white"
              href="#configuracion"
            >
              Determinación de tipo de cambio
            </a>
            <a
              className="rounded-full bg-white/10 px-4 py-2 transition hover:bg-white/20 hover:text-white"
              href="#resumen"
            >
              Resumen económico
            </a>
            <a
              className="rounded-full bg-white/10 px-4 py-2 transition hover:bg-white/20 hover:text-white"
              href="https://www.argentina.gob.ar/inta/cr-cordoba/guia-metodologica-para-el-costeo-de-servicios-rutinarios-en-laboratorios-de-inta"
              target="_blank"
              rel="noreferrer"
            >
              Guía metodológica INTA
            </a>
          </nav>
        </div>
        <div className="flex flex-col gap-3 text-sm">
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
        <div className="space-y-4 rounded-2xl bg-white/15 p-6 text-sm">
          <h3 className="text-base font-semibold uppercase tracking-wide text-white/80">
            Guía rápida de uso
          </h3>
          <ol className="grid list-decimal gap-4 pl-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            <li className="space-y-2 text-white/80">
              <p className="font-semibold text-white">
                Configurá la base de trabajo
              </p>
              <p>
                Ajustá las determinaciones mensuales y el tipo de cambio en el panel de
                configuración. Estos parámetros prorratean automáticamente los costos
                indirectos y normalizan los montos en ARS.
              </p>
            </li>
            <li className="space-y-2 text-white/80">
              <p className="font-semibold text-white">
                Cargá los costos directos
              </p>
              <p>
                Incorporá insumos, mano de obra y equipamiento específico en los subniveles
                del Nivel 1. La calculadora totaliza cada renglón según cantidad, tarifa y
                horas declaradas.
              </p>
            </li>
            <li className="space-y-2 text-white/80">
              <p className="font-semibold text-white">
                Registrá los recursos indirectos
              </p>
              <p>
                Utilizá los subniveles del Nivel 2 para distribuir materiales compartidos,
                depreciaciones, mantenimiento e infraestructura a partir de la base DM.
              </p>
            </li>
            <li className="space-y-2 text-white/80">
              <p className="font-semibold text-white">
                Documentá acreditaciones y monitoreo
              </p>
              <p>
                En el Nivel 3 agrupá aranceles, auditorías y ensayos externos. Podés duplicar
                partidas y registrar vigencias según los requisitos de calidad.
              </p>
            </li>
            <li className="space-y-2 text-white/80">
              <p className="font-semibold text-white">
                Definí el precio y la afectación institucional
              </p>
              <p>
                Ingresá el precio del servicio, configurá los porcentajes para la EEA o
                Instituto de Investigación y el Centro Regional / Centro de Investigación
                y verificá si el valor queda por encima, igual o por debajo del costo base
                calculado.
              </p>
            </li>
            <li className="space-y-2 text-white/80">
              <p className="font-semibold text-white">
                Revisá, exportá y consultá la metodología
              </p>
              <p>
                El resumen económico consolida subtotales y el total general. Podés exportar
                los datos en JSON y validar criterios con la
                {" "}
                <a
                  className="font-semibold underline decoration-white/60 underline-offset-4 hover:text-white"
                  href="https://www.argentina.gob.ar/inta/cr-cordoba/guia-metodologica-para-el-costeo-de-servicios-rutinarios-en-laboratorios-de-inta"
                  target="_blank"
                  rel="noreferrer"
                >
                  guía metodológica de INTA
                </a>
                .
              </p>
            </li>
          </ol>
        </div>
      ) : null}
    </section>
  );
}
