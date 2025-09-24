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
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
