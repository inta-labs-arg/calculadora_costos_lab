import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { TermsAndConditions } from "@/components/legal/TermsAndConditions";

export const metadata: Metadata = {
  // Ajustar a la URL pública real del despliegue (p. ej. GitHub Pages).
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "Calculadora de Costos INTA",
  description:
    "Prototipo no oficial para estimar los costos de servicios rutinarios de laboratorio en cinco niveles acumulativos, interpretando la Guía metodológica de INTA.",
  authors: [
    { name: "Mauro H. Pinotti" },
    { name: "Mercedes Goizueta" },
    { name: "Andrés Castellano" }
  ],
  keywords: ["INTA", "costeo", "laboratorio", "calculadora de costos"],
  icons: { icon: "/img/INTA_300x300.jpg" },
  openGraph: {
    title: "Calculadora de Costos de Servicios de Laboratorio",
    description:
      "Prototipo no oficial que interpreta la Guía metodológica de costeo de laboratorios de INTA.",
    locale: "es_AR",
    type: "website",
    images: [{ url: "/img/INTA_300x300.jpg" }]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-inta-gray-100 text-inta-gray-800">
        {children}
        <footer className="border-t border-inta-gray-200 bg-white px-4 py-6 text-center text-xs leading-relaxed text-inta-gray-600">
          <p className="mx-auto max-w-4xl">
            Herramienta desarrollada por Mauro H. Pinotti (Gerencia de Gestión
            Estratégica de la Investigación y Desarrollo), en base al trabajo de
            Mercedes Goizueta y Andrés Castellano (INTA EEA Marcos Juárez),
            autores de la <em>Guía metodológica para el costeo de servicios
            rutinarios en laboratorios de INTA</em>, publicada en{" "}
            <a
              href="https://www.argentina.gob.ar/inta/cr-cordoba/guia-metodologica-para-el-costeo-de-servicios-rutinarios-en-laboratorios-de-inta"
              target="_blank"
              rel="noopener noreferrer"
              className="text-inta-blue underline underline-offset-2 hover:text-inta-blue-dark"
            >
              Argentina.gob.ar
            </a>
            .
          </p>
          <p className="mx-auto mt-2 max-w-4xl text-inta-gray-500">
            Herramienta no oficial. Prototipo independiente desarrollado por
            personal de INTA; no representa una posición ni un producto oficial
            del organismo.
          </p>
          <p className="mx-auto mt-3 flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link
              href="/manual"
              className="text-inta-blue underline underline-offset-2 hover:text-inta-blue-dark"
            >
              Manual de usuario
            </Link>
            <span aria-hidden className="text-inta-gray-300">
              ·
            </span>
            <TermsAndConditions />
          </p>
        </footer>
      </body>
    </html>
  );
}
