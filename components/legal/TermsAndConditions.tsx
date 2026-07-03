"use client";

import { useEffect, useState } from "react";
import { Btn } from "@/components/ui/Btn";

const ACCEPTED_KEY = "lab_terms_accepted_v1";
const GUIA_URL =
  "https://www.argentina.gob.ar/inta/cr-cordoba/guia-metodologica-para-el-costeo-de-servicios-rutinarios-en-laboratorios-de-inta";

export function TermsAndConditions() {
  // "closed" | "gate" (aceptación de primera visita) | "review" (lectura posterior)
  const [mode, setMode] = useState<"closed" | "gate" | "review">("closed");

  useEffect(() => {
    try {
      if (window.localStorage.getItem(ACCEPTED_KEY) !== "1") {
        setMode("gate");
      }
    } catch {
      // Si localStorage no está disponible, no bloqueamos la app.
    }
  }, []);

  const accept = () => {
    try {
      window.localStorage.setItem(ACCEPTED_KEY, "1");
    } catch {
      /* noop */
    }
    setMode("closed");
  };

  const open = mode !== "closed";

  return (
    <>
      <button
        type="button"
        onClick={() => setMode("review")}
        className="text-inta-blue underline underline-offset-2 hover:text-inta-blue-dark"
      >
        Términos y condiciones
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Términos y condiciones de uso"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white text-left shadow-2xl">
            <div className="border-b border-inta-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-inta-blue">
                Términos y condiciones de uso
              </h2>
              <p className="mt-0.5 text-xs text-inta-gray-500">
                Prototipo funcional · Herramienta no oficial y no vinculante
              </p>
            </div>

            <div className="space-y-4 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-inta-gray-700">
              <section className="space-y-1">
                <h3 className="font-semibold text-inta-gray-800">
                  1. Naturaleza de la herramienta
                </h3>
                <p>
                  Esta es una calculadora de carácter <strong>prototipo,
                  funcional y experimental</strong>. Es una iniciativa
                  independiente desarrollada por personal del INTA y{" "}
                  <strong>no constituye una herramienta oficial ni vinculante
                  institucionalmente</strong>: no representa una posición, un
                  aval, un mandato ni un producto formal del Instituto Nacional
                  de Tecnología Agropecuaria.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="font-semibold text-inta-gray-800">
                  2. Origen metodológico
                </h3>
                <p>
                  La aplicación es una <strong>interpretación de software</strong>{" "}
                  de la{" "}
                  <a
                    href={GUIA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-inta-blue underline underline-offset-2"
                  >
                    <em>Guía metodológica para el costeo de servicios rutinarios
                    en laboratorios de INTA</em>
                  </a>{" "}
                  (M. Goizueta y A. Castellano). Dicha Guía propone{" "}
                  <strong>&laquo;buenas prácticas&raquo; y lineamientos de
                  carácter orientativo</strong> para la identificación,
                  categorización e imputación de costos; no establece
                  obligaciones. Esta aplicación puede diferir en detalles de la
                  formulación original de la Guía.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="font-semibold text-inta-gray-800">
                  3. Carácter orientativo de los resultados
                </h3>
                <p>
                  Los valores que produce esta calculadora son{" "}
                  <strong>estimaciones referenciales</strong>, no
                  determinaciones oficiales, tarifas homologadas ni cifras de
                  cumplimiento obligatorio. La responsabilidad sobre la carga de
                  datos, la validación de los supuestos y cualquier decisión
                  tomada a partir de los resultados{" "}
                  <strong>recae exclusivamente en la persona usuaria</strong>.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="font-semibold text-inta-gray-800">
                  4. Ausencia de garantías
                </h3>
                <p>
                  El software se ofrece &laquo;tal cual&raquo; (<em>as-is</em>),
                  bajo licencia MIT, sin garantía de exactitud, disponibilidad ni
                  aptitud para un fin determinado. El tipo de cambio se carga de
                  forma manual y es responsabilidad de la persona usuaria
                  mantenerlo actualizado.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="font-semibold text-inta-gray-800">
                  5. Tratamiento de datos
                </h3>
                <p>
                  El cálculo se realiza íntegramente en tu navegador. La
                  aplicación <strong>no envía tus datos a ningún servidor</strong>{" "}
                  ni consulta servicios externos. La información que cargás no se
                  almacena de forma remota (sólo las tarifas horarias quedan en el
                  navegador).
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="font-semibold text-inta-gray-800">
                  6. Propiedad intelectual y contacto
                </h3>
                <p>
                  La idea y la metodología pertenecen a sus autoras/es. Para
                  consultas sobre la <strong>metodología</strong>, referirse a la
                  Guía y a sus autores. Para consultas sobre el{" "}
                  <strong>software</strong>, utilizar el repositorio del
                  proyecto.
                </p>
              </section>

              <p className="rounded-lg bg-inta-blue-light/60 px-3 py-2 text-[13px] text-inta-blue-dark">
                Al utilizar esta herramienta, declarás haber leído y comprendido
                estos términos y aceptás su carácter no oficial y orientativo.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-inta-gray-200 px-6 py-4">
              {mode === "gate" ? (
                <Btn variant="primary" size="sm" onClick={accept}>
                  Entiendo y acepto
                </Btn>
              ) : (
                <Btn variant="outline" size="sm" onClick={() => setMode("closed")}>
                  Cerrar
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
