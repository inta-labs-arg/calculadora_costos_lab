"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Btn } from "@/components/ui/Btn";
import { InputField } from "@/components/ui/InputField";
import type { Screen, ScreenTotals } from "@/app/page";
import type { LevelTotal } from "@/lib/cost-calculation";
import type { ExchangeRateState } from "@/contexts/ExchangeRateContext";
import { useHourlyRates } from "@/contexts/HourlyRatesContext";
import { round2 } from "@/lib/money";

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);
const fmtUSD = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const fmtER = (n: number) =>
  new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);

interface SummaryScreenProps {
  orderedTotals: LevelTotal[];
  grandTotal: number;
  exchangeRate: ExchangeRateState;
  serviceName: string;
  laboratoryName: string;
  quoteDateISO: string;
  pricing: {
    precioARS: number;
    porcentajeEEA: number;
    porcentajeCentro: number;
    afectacionEEA: number;
    afectacionCentro: number;
    precioNeto: number;
  };
  onPriceChange: (v: number) => void;
  onPercentageEEAChange: (v: number) => void;
  onPercentageCentroChange: (v: number) => void;
  onNavigate: (s: Screen) => void;
  totals: ScreenTotals;
}

type ExportStatus = null | "loading" | "done";

export function SummaryScreen({
  orderedTotals,
  grandTotal,
  exchangeRate,
  serviceName,
  laboratoryName,
  quoteDateISO,
  pricing,
  onPriceChange,
  onPercentageEEAChange,
  onPercentageCentroChange,
  onNavigate,
  totals,
}: SummaryScreenProps) {
  const { state: hourlyRateState } = useHourlyRates();
  const [pricingMode, setPricingMode] = useState<"auto" | "manual">("auto");
  const [exportStatus, setExportStatus] = useState<ExportStatus>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ nivel1: true, serviciosGenerales: false, acreditacion: false });

  const date = new Date(quoteDateISO).toLocaleDateString("es-AR");
  const basePrice = pricingMode === "auto" ? grandTotal : (pricing.precioARS || grandTotal);
  const afEEA = round2(basePrice * (pricing.porcentajeEEA / 100));
  const afCentro = round2(basePrice * (pricing.porcentajeCentro / 100));
  const precioNeto = round2(basePrice + afEEA + afCentro);

  const levels = [
    {
      id: "nivel1",
      label: "Nivel 1 · Costos Directos",
      total: totals.nivel1,
      breakdown: [
        { label: "b.1) Insumos Directos",       value: totals.n1insumos },
        { label: "b.2) Mano de Obra Directa",    value: totals.n1labor },
        { label: "b.3) Equipamiento específico", value: totals.n1equip },
      ],
    },
    {
      id: "serviciosGenerales",
      label: "Nivel 2 · Costos Indirectos",
      total: totals.nivel2,
      breakdown: [
        { label: "c.1) Mat. no descartables",  value: totals.n2mat   },
        { label: "c.2) Equip. menor (dep.)",   value: totals.n2equip },
        { label: "c.3.1) Mantenimiento",       value: totals.n2mant  },
        { label: "c.3.2) Calibración",         value: totals.n2calib },
        { label: "c.4) Infraestructura",       value: totals.n2infra },
      ],
    },
    {
      id: "acreditacion",
      label: "Nivel 3 · Acreditación",
      total: totals.nivel3,
      breakdown: [
        { label: "d.1) Acreditación OAA",            value: totals.n3acred },
        { label: "d.2) Monitoreo regulatorio",        value: totals.n3monit },
        { label: "d.3) Ensayos interlaboratorio",     value: totals.n3inter },
      ],
    },
  ];

  const buildJSON = useCallback(() => {
    const sourceLabel = "Manual";
    const { lastSyncISO, lastSyncType } = hourlyRateState;
    const hourlySyncLabel = lastSyncISO
      ? `Tabla local (${lastSyncISO} · ${lastSyncType === "import" ? "importación" : "exportación"})`
      : "Tabla local (sin exportación/importación)";

    const nivelesJSON = orderedTotals.map(level => ({
      id: level.id,
      nombre: level.name,
      subtotal: level.subtotal,
      porcentaje: typeof level.rate === "number" ? level.rate : null,
      desglose: level.breakdown?.map(item => ({
        id: item.id,
        nombre: item.name,
        subtotal: item.subtotal,
        porcentaje: typeof item.rate === "number" ? item.rate : null,
        detalles: item.breakdown?.map(d => ({ id: d.id, nombre: d.name, subtotal: d.subtotal })),
      })) ?? [],
    }));

    return {
      fechaGeneracionISO: new Date().toISOString(),
      moneda: "ARS",
      servicio: {
        nombre: serviceName.trim(),
        laboratorio: laboratoryName.trim(),
        fechaCotizacionISO: quoteDateISO,
        fechaCotizacion: date,
      },
      exchangeRate: {
        tasa: exchangeRate.rate,
        etiqueta: `${fmtER(exchangeRate.rate)} ARS/USD`,
        fuente: exchangeRate.source,
        fuenteEtiqueta: sourceLabel,
        fechaISO: exchangeRate.dateISO ?? null,
        nota: exchangeRate.note ?? null,
      },
      hourlyRate: { etiqueta: hourlySyncLabel, lastSyncISO: lastSyncISO ?? null },
      niveles: nivelesJSON,
      costoUnitario: grandTotal,
      precioInstitucional: {
        base: basePrice,
        afectacionEEA: afEEA,
        porcentajeEEA: pricing.porcentajeEEA,
        afectacionCentro: afCentro,
        porcentajeCentro: pricing.porcentajeCentro,
        precioNeto,
      },
    };
  }, [orderedTotals, serviceName, laboratoryName, quoteDateISO, date, exchangeRate, hourlyRateState, grandTotal, basePrice, afEEA, afCentro, precioNeto, pricing]);

  const handleExportJSON = () => {
    setExportStatus("loading");
    try {
      const data = buildJSON();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resumen-costos-lab-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus("done");
      setTimeout(() => setExportStatus(null), 2500);
    } catch {
      setExportStatus(null);
    }
  };

  return (
    <div className="screen-enter flex flex-col">
      {/* Hero */}
      <div
        className="px-5 pt-7 pb-6 text-white"
        style={{
          background: grandTotal > 0
            ? "linear-gradient(135deg, #003F6B 0%, #00548F 100%)"
            : "linear-gradient(135deg, #495057 0%, #868E96 100%)",
        }}
      >
        <div className="text-[11px] uppercase tracking-widest opacity-70 mb-1">Costo Unitario del Servicio Rutinario</div>
        <div className="text-[40px] font-extrabold tracking-tight leading-none">{fmtARS(grandTotal)}</div>
        {grandTotal > 0 && exchangeRate.rate > 0 && (
          <div className="text-[15px] opacity-75 mt-1.5">≈ {fmtUSD(grandTotal / exchangeRate.rate)}</div>
        )}
        <div className="mt-5 px-4 py-3.5 rounded-xl bg-white/10 backdrop-blur-sm">
          <div className="text-xs opacity-75 mb-1.5">
            {serviceName || "Servicio sin nombre"} · {laboratoryName || "—"} · {date}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: "Nivel 1", total: totals.nivel1 },
              { label: "Nivel 2", total: totals.nivel2 },
              { label: "Nivel 3", total: totals.nivel3 },
            ].map(lv => {
              const pct = grandTotal > 0 ? (lv.total / grandTotal * 100) : 0;
              return (
                <div key={lv.label}>
                  <div className="text-[10px] opacity-65 mb-0.5">{lv.label}</div>
                  <div className="font-bold text-sm">{fmtARS(lv.total)}</div>
                  <div className="h-[3px] bg-white/20 rounded-full mt-1">
                    <div className="h-full bg-inta-green rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">
        {/* Desglose acordeón */}
        <Card>
          <div className="px-5 py-3.5 border-b border-inta-gray-100">
            <div className="font-semibold text-sm text-inta-gray-700">Desglose por niveles</div>
          </div>
          {levels.map(lv => (
            <div key={lv.id} className="border-b border-inta-gray-100 last:border-b-0">
              <button
                onClick={() => setExpanded(p => ({ ...p, [lv.id]: !p[lv.id] }))}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-white hover:bg-inta-gray-50 transition-colors"
              >
                <span className="font-semibold text-sm text-inta-gray-800">{lv.label}</span>
                <div className="flex items-center gap-2.5">
                  <span className={`font-bold text-[15px] ${lv.total > 0 ? "text-inta-green" : "text-inta-gray-300"}`}>
                    {fmtARS(lv.total)}
                  </span>
                  <span
                    className="text-xs text-inta-gray-400 transition-transform duration-200 inline-block"
                    style={{ transform: expanded[lv.id] ? "rotate(180deg)" : "none" }}
                  >▾</span>
                </div>
              </button>
              {expanded[lv.id] && (
                <div className="bg-inta-gray-50 border-t border-inta-gray-100">
                  {lv.breakdown.map(br => (
                    <div
                      key={br.label}
                      className="flex justify-between items-center py-2.5 pl-8 pr-5 border-b border-inta-gray-100 last:border-b-0"
                    >
                      <span className="text-[13px] text-inta-gray-600">{br.label}</span>
                      <span className={`text-[13px] font-semibold ${br.value > 0 ? "text-inta-gray-700" : "text-inta-gray-300"}`}>
                        {fmtARS(br.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="px-5 py-3.5 flex justify-between items-center bg-inta-blue-light">
            <span className="font-bold text-sm text-inta-blue">Costo Unitario Total</span>
            <span className="font-extrabold text-lg text-inta-blue">{fmtARS(grandTotal)}</span>
          </div>
        </Card>

        {/* Precio institucional */}
        <Card>
          <div className="px-5 py-3.5 border-b border-inta-gray-100">
            <div className="font-semibold text-sm text-inta-gray-700">Precio y afectación institucional</div>
            <div className="text-xs text-inta-gray-400 mt-0.5">Aplicá los porcentajes de afectación sobre el precio de venta.</div>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3.5">
            {pricingMode === "manual" && (
              <InputField
                label="Precio (ARS)"
                type="number" min="0" step="100"
                value={pricing.precioARS || ""}
                onChange={e => onPriceChange(parseFloat(e.target.value) || 0)}
                hint="Si dejás en 0, se usa el costo unitario calculado"
                suffix="$"
              />
            )}
            <div className="flex justify-between items-center px-3.5 py-2.5 rounded-lg bg-inta-gray-50 text-[13px] text-inta-gray-600">
              <span>Base de cálculo: <strong className="text-inta-gray-800">{fmtARS(basePrice)}</strong></span>
              <button
                onClick={() => setPricingMode(m => m === "auto" ? "manual" : "auto")}
                className="text-xs text-inta-blue underline"
              >
                {pricingMode === "auto" ? "Ingresar precio manual" : "Usar costo calculado"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="% Afectación EEA" type="number" min="0" max="100" step="0.5" suffix="%"
                value={pricing.porcentajeEEA}
                onChange={e => onPercentageEEAChange(parseFloat(e.target.value) || 0)} />
              <InputField label="% Afectación Centro" type="number" min="0" max="100" step="0.5" suffix="%"
                value={pricing.porcentajeCentro}
                onChange={e => onPercentageCentroChange(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="border-t border-dashed border-inta-gray-200 pt-3.5">
              {[
                { label: "Precio base",                                val: basePrice,  bold: false },
                { label: `Afectación EEA (${pricing.porcentajeEEA}%)`, val: afEEA,      bold: false },
                { label: `Afectación Centro (${pricing.porcentajeCentro}%)`, val: afCentro, bold: false },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-1.5 border-b border-inta-gray-100 last:border-b-0">
                  <span className="text-[13px] text-inta-gray-600">{row.label}</span>
                  <span className="text-[13px] font-semibold text-inta-gray-700">{fmtARS(row.val)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 pb-1">
                <span className="text-[15px] font-bold text-inta-gray-800">Precio neto</span>
                <span className="text-lg font-extrabold text-inta-green">{fmtARS(precioNeto)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Exportar */}
        <Card>
          <div className="px-5 py-3.5 border-b border-inta-gray-100">
            <div className="font-semibold text-sm text-inta-gray-700">Exportar resumen</div>
          </div>
          <div className="px-5 py-4 flex flex-col gap-2.5">
            <Btn
              onClick={handleExportJSON}
              variant={exportStatus === "done" ? "success" : "primary"}
              className="w-full"
            >
              {exportStatus === "loading" ? "Generando…" : exportStatus === "done" ? "✓ JSON descargado" : "Exportar JSON"}
            </Btn>
            <Btn onClick={() => window.print()} variant="outline" className="w-full">
              Imprimir / Guardar PDF
            </Btn>
            <p className="text-[11px] text-inta-gray-400 text-center pt-1">
              Copia de pantalla disponible con Imprimir (Ctrl+P)
            </p>
          </div>
        </Card>

        <Btn onClick={() => onNavigate("dashboard")} variant="ghost" className="w-full">
          ← Volver al inicio
        </Btn>

        <div className="h-4" />
      </div>
    </div>
  );
}
