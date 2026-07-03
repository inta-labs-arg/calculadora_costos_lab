import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Manual de usuario · Calculadora de Costos INTA",
  description:
    "Guía funcional de la Calculadora de Costos de Servicios de Laboratorio: qué representa cada nivel y cómo se calcula cada valor."
};

const GUIA_URL =
  "https://www.argentina.gob.ar/inta/cr-cordoba/guia-metodologica-para-el-costeo-de-servicios-rutinarios-en-laboratorios-de-inta";

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-inta-gray-100 px-4 py-3 text-[13px] text-inta-gray-800">
      <code>{children}</code>
    </pre>
  );
}

function Section({
  id,
  title,
  children
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <h2 className="text-xl font-bold text-inta-blue">{title}</h2>
      {children}
    </section>
  );
}

export default function ManualPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Encabezado */}
      <div className="mb-6 flex items-center gap-3">
        <Image
          src="/img/INTA_300x300.jpg"
          alt="Logo INTA"
          width={44}
          height={44}
          className="h-11 w-11 rounded-lg object-contain"
        />
        <div>
          <h1 className="text-2xl font-bold text-inta-gray-800">
            Manual de usuario
          </h1>
          <p className="text-sm text-inta-gray-500">
            Calculadora de Costos de Servicios de Laboratorio
          </p>
        </div>
      </div>

      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 text-sm text-inta-blue underline underline-offset-2 hover:text-inta-blue-dark"
      >
        ← Volver a la calculadora
      </Link>

      <div className="mb-8 rounded-xl border border-inta-gray-200 bg-inta-blue-light/40 px-4 py-3 text-sm text-inta-gray-700">
        Recordatorio: herramienta <strong>no oficial</strong> que interpreta la{" "}
        <a
          href={GUIA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-inta-blue underline underline-offset-2"
        >
          Guía metodológica de INTA
        </a>{" "}
        (Goizueta &amp; Castellano). Ante cualquier divergencia, la referencia es
        la Guía, no esta aplicación.
      </div>

      <div className="space-y-10 text-[15px] leading-relaxed text-inta-gray-700">
        <Section id="idea-general" title="Idea general">
          <p>
            El costo unitario de un ensayo se construye por{" "}
            <strong>acumulación de cinco niveles</strong>. Cada nivel suma su
            aporte sobre la base acumulada de los anteriores, de modo que cada
            peso del costo final sea <strong>trazable</strong> hasta su origen.
            Toda la aritmética usa precisión decimal (Decimal.js) con redondeo
            monetario a 2 decimales.
          </p>
        </Section>

        <Section id="configuracion" title="Configuración base">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Determinaciones mensuales (DM):</strong> cantidad de
              ensayos que el laboratorio procesa por mes. Es el divisor que
              prorratea los costos compartidos (niveles 2 y 3).
            </li>
            <li>
              <strong>Tipo de cambio USD → ARS:</strong> se carga de forma
              manual (ver más abajo).
            </li>
            <li>
              <strong>Nombre del servicio / laboratorio:</strong> rótulos que
              aparecen en el resumen exportado.
            </li>
          </ul>
        </Section>

        <Section id="nivel-1" title="Nivel 1 — Costos Directos">
          <p>Costos imputables directamente a la determinación. Tres subniveles:</p>
          <p className="font-semibold text-inta-gray-800">a) Insumos y reactivos</p>
          <Formula>costo = (precioFormato / cantidadFormato) × cantidadUsada</Formula>
          <p>
            Soporta conversión de unidades (g↔kg, mL↔L). Los insumos pueden
            cargarse en distintas monedas y se normalizan a ARS con el tipo de
            cambio.
          </p>
          <p className="font-semibold text-inta-gray-800">b) Mano de obra</p>
          <Formula>{`costoHora = salarioMensual / 176   (176 = 22 días × 8 h)
costo     = costoHora × horas × cantidadPersonas`}</Formula>
          <p>
            Las tarifas horarias se administran por perfil y se guardan en el
            navegador (<code>localStorage</code>).
          </p>
          <p className="font-semibold text-inta-gray-800">
            c) Equipamiento específico (depreciación lineal)
          </p>
          <Formula>{`depreciaciónAnual   = (costoAdquisición − valorResidual) / vidaÚtilAnios
depreciaciónMensual = depreciaciónAnual / 12`}</Formula>
        </Section>

        <Section id="nivel-2" title="Nivel 2 — Costos Indirectos">
          <p>
            Costos compartidos por todo el laboratorio (materiales comunes,
            mantenimiento, infraestructura). No se imputan a una determinación
            puntual, sino que se prorratean:
          </p>
          <Formula>aportePorDeterminación = costoMensual / determinacionesMensuales</Formula>
          <p>
            Cada ítem puede tener sus propias determinaciones o heredar la DM
            global.
          </p>
        </Section>

        <Section id="nivel-3" title="Nivel 3 — Acreditación y Monitoreo">
          <p>
            Misma mecánica de prorrateo que el Nivel 2, agrupando costos de
            calidad: aranceles de acreditación (OAA, SENASA), auditorías y
            participación en ensayos interlaboratorio.
          </p>
        </Section>

        <Section id="nivel-4" title="Nivel 4 — Afectación Institucional">
          <p>
            Aplica porcentajes secuenciales sobre la base acumulada (niveles
            1–3): afectación de la EEA / Instituto y del Centro Regional / Centro
            de Investigación. Cada porcentaje se aplica de forma acumulativa.
          </p>
        </Section>

        <Section id="nivel-5" title="Nivel 5 — Gestión Estratégica y Margen">
          <p>
            Porcentajes secuenciales sobre la base ya afectada por el Nivel 4:
            gestión estratégica y margen institucional, para llegar al
            costo/precio final sugerido.
          </p>
        </Section>

        <Section id="resumen" title="Resumen económico y exportación">
          <p>
            El resumen consolida los subtotales de cada nivel y el total general
            (costo unitario estimado), en ARS y su equivalente en USD. Se puede{" "}
            <strong>exportar a JSON</strong> (todos los supuestos) y{" "}
            <strong>a PDF</strong> (el resumen del servicio).
          </p>
        </Section>

        <Section id="tipo-de-cambio" title="Tipo de cambio">
          <p>
            El tipo de cambio USD → ARS se ingresa <strong>manualmente</strong>.
            La aplicación no consulta servicios externos: funciona íntegramente
            en tu navegador. Consultá el valor del día (por ejemplo, el dólar
            vendedor del Banco de la Nación Argentina) y cargalo en el campo
            correspondiente del panel de inicio.
          </p>
        </Section>

        <Section id="faq" title="Preguntas frecuentes">
          <p className="font-semibold text-inta-gray-800">
            ¿Los datos se guardan en algún servidor?
          </p>
          <p>
            No. Todo el cálculo ocurre en tu navegador; sólo las tarifas horarias
            quedan en <code>localStorage</code>. Para conservar un escenario
            completo, exportá el JSON.
          </p>
          <p className="font-semibold text-inta-gray-800">
            ¿Dónde reporto un error o propongo una mejora?
          </p>
          <p>En los Issues del repositorio.</p>
          <p className="font-semibold text-inta-gray-800">
            ¿Y las dudas sobre la metodología de costeo?
          </p>
          <p>
            Corresponden a las/los autoras/es de la Guía metodológica, no a este
            software.
          </p>
        </Section>
      </div>

      <div className="mt-10 border-t border-inta-gray-200 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-inta-blue underline underline-offset-2 hover:text-inta-blue-dark"
        >
          ← Volver a la calculadora
        </Link>
      </div>
    </main>
  );
}
