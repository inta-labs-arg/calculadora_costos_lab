import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calculadora de Costos INTA",
  description:
    "Herramienta para estimar los costos de servicios de laboratorio de INTA en cinco niveles de aportación."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900">
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">
            {children}
          </main>
          <footer className="bg-slate-900 text-slate-100">
            <div className="mx-auto max-w-6xl space-y-3 px-4 py-6 text-sm leading-relaxed">
              <p>
                Pinotti, M. H. (2024). <span className="italic">Guía de referencia para la estimación de costos de servicios de
                laboratorio</span> [PDF]. Instituto Nacional de Tecnología Agropecuaria.
              </p>
              <p>
                Desarrollo del software en base a la guía de referencia por Mauro H. Pinotti — Gerencia de Integración
                Estratégica de la Investigación y Desarrollo.
              </p>
              <p className="text-slate-300">
                Esta aplicación es un prototipo funcional: si accedés a la herramienta, verificá los resultados y aplicá las
                validaciones necesarias antes de adoptarla en producción; continuamos iterando para lograr la mejor versión
                posible.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
