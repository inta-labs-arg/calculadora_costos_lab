"use client";

import { Fragment, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Btn } from "@/components/ui/Btn";
import { InputField } from "@/components/ui/InputField";
import type { Screen, ScreenTotals } from "@/app/page";
import type { LevelTotal } from "@/lib/cost-calculation";
import type { ExchangeRateState } from "@/contexts/ExchangeRateContext";
import { useHourlyRates } from "@/contexts/HourlyRatesContext";
import { round2 } from "@/lib/money";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Paleta del documento PDF (colores sólidos, amigables con html2canvas/impresión).
const PDF = {
  blue: "#00548F",
  blueDark: "#003F6B",
  green: "#2F9E44",
  text: "#343A40",
  muted: "#868E96",
  line: "#DEE2E6",
  bg: "#F8F9FA",
  noteBg: "#FFF8E1",
  noteBorder: "#FFE082",
  noteText: "#7A5C00",
  white: "#FFFFFF",
} as const;

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
  const [pdfStatus, setPdfStatus] = useState<ExportStatus>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ nivel1: true, serviciosGenerales: false, acreditacion: false });
  const pdfRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    setPdfStatus("loading");
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const slug = (serviceName.trim() || "servicio")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
      await html2pdf()
        .set({
          // El documento ya tiene el ancho exacto de A4 (794px @96dpi) con su
          // propio padding interno, por eso el margen del PDF es 0: mapea 1:1
          // sin escalar ni desbordar.
          margin: 0,
          filename: `resumen-costos-${slug || "lab"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 794 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(pdfRef.current)
        .save();
      setPdfStatus("done");
      setTimeout(() => setPdfStatus(null), 2500);
    } catch {
      setPdfStatus(null);
    }
  };

  const nowLabel = new Date().toLocaleString("es-AR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  // Ancho exacto de una A4 vertical a 96dpi. El header es full-bleed; el cuerpo
  // usa padding interno como márgenes. Se genera con html2pdf margin:0.
  const pdfDocStyle: React.CSSProperties = {
    width: "794px",
    background: PDF.white,
    color: PDF.text,
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "12px",
    lineHeight: 1.45,
  };

  const pdfInner = (
    <>
      {/* Encabezado (full-bleed) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: PDF.blue,
          color: PDF.white,
          padding: "16px 40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${BASE_PATH}/img/INTA_300x300.jpg`}
            alt="Logo INTA"
            width={46}
            height={46}
            style={{ width: "46px", height: "46px", borderRadius: "8px", objectFit: "contain", background: PDF.white }}
          />
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.2 }}>
              Calculadora de Costos de Servicios Rutinarios de Laboratorio
            </div>
            <div style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", opacity: 0.85 }}>
              INTA Labs · Prototipos
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "11px", opacity: 0.9, minWidth: "110px" }}>
          <div style={{ fontWeight: 700 }}>Resumen de costeo</div>
          <div>{date}</div>
        </div>
      </div>
      <div style={{ height: "3px", background: PDF.green }} />

      <div style={{ padding: "16px 40px 18px" }}>
        {/* Datos del servicio */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "3px 0", width: "50%", verticalAlign: "top" }}>
                <span style={{ color: PDF.muted }}>Servicio: </span>
                <strong>{serviceName.trim() || "—"}</strong>
              </td>
              <td style={{ padding: "3px 0", width: "50%", verticalAlign: "top" }}>
                <span style={{ color: PDF.muted }}>Laboratorio: </span>
                <strong>{laboratoryName.trim() || "—"}</strong>
              </td>
            </tr>
            <tr>
              <td style={{ padding: "3px 0" }}>
                <span style={{ color: PDF.muted }}>Fecha de cotización: </span>
                <strong>{date}</strong>
              </td>
              <td style={{ padding: "3px 0" }}>
                <span style={{ color: PDF.muted }}>Tipo de cambio: </span>
                <strong>{fmtER(exchangeRate.rate)} ARS/USD</strong>{" "}
                <span style={{ color: PDF.muted }}>(carga manual)</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Costo unitario destacado */}
        <div
          style={{
            background: PDF.bg,
            border: `1px solid ${PDF.line}`,
            borderLeft: `4px solid ${PDF.blue}`,
            borderRadius: "6px",
            padding: "11px 18px",
            marginBottom: "12px",
            breakInside: "avoid",
          }}
        >
          <div style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: PDF.muted }}>
            Costo unitario del servicio rutinario
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: PDF.blueDark, lineHeight: 1.1 }}>
            {fmtARS(grandTotal)}
          </div>
          {grandTotal > 0 && exchangeRate.rate > 0 && (
            <div style={{ fontSize: "12px", color: PDF.muted }}>
              ≈ {fmtUSD(grandTotal / exchangeRate.rate)}
            </div>
          )}
        </div>

        {/* Desglose por niveles */}
        <div style={{ fontSize: "13px", fontWeight: 700, color: PDF.blueDark, marginBottom: "6px" }}>
          Desglose por niveles
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "11.5px" }}>
          <thead>
            <tr style={{ background: PDF.blue, color: PDF.white }}>
              <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Concepto</th>
              <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 600, width: "160px" }}>Importe (ARS)</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((lv) => (
              <Fragment key={lv.id}>
                <tr style={{ background: "#EDF3F8" }}>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: PDF.blueDark, borderTop: `1px solid ${PDF.line}` }}>
                    {lv.label}
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: PDF.blueDark, borderTop: `1px solid ${PDF.line}` }}>
                    {fmtARS(lv.total)}
                  </td>
                </tr>
                {lv.breakdown.map((br) => (
                  <tr key={`${lv.id}-${br.label}`}>
                    <td style={{ padding: "4px 10px 4px 24px", color: PDF.text, borderTop: `1px solid ${PDF.line}` }}>
                      {br.label}
                    </td>
                    <td style={{ padding: "4px 10px", textAlign: "right", color: br.value > 0 ? PDF.text : PDF.muted, borderTop: `1px solid ${PDF.line}` }}>
                      {fmtARS(br.value)}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            <tr style={{ background: PDF.blueDark, color: PDF.white }}>
              <td style={{ padding: "8px 10px", fontWeight: 800 }}>Costo Unitario Total</td>
              <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 800 }}>{fmtARS(grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        {/* Precio y afectación institucional */}
        <div style={{ fontSize: "13px", fontWeight: 700, color: PDF.blueDark, marginBottom: "6px" }}>
          Precio y afectación institucional
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "11.5px", breakInside: "avoid" }}>
          <tbody>
            {[
              { label: "Precio base", val: basePrice },
              { label: `Afectación EEA (${pricing.porcentajeEEA}%)`, val: afEEA },
              { label: `Afectación Centro (${pricing.porcentajeCentro}%)`, val: afCentro },
            ].map((row) => (
              <tr key={row.label}>
                <td style={{ padding: "5px 10px", borderTop: `1px solid ${PDF.line}` }}>{row.label}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", borderTop: `1px solid ${PDF.line}` }}>{fmtARS(row.val)}</td>
              </tr>
            ))}
            <tr style={{ background: "#EBF7EF" }}>
              <td style={{ padding: "8px 10px", fontWeight: 800, color: PDF.green, borderTop: `1px solid ${PDF.line}` }}>Precio neto</td>
              <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 800, color: PDF.green, borderTop: `1px solid ${PDF.line}` }}>{fmtARS(precioNeto)}</td>
            </tr>
          </tbody>
        </table>

        {/* Descargo / carácter provisorio */}
        <div
          style={{
            background: PDF.noteBg,
            border: `1px solid ${PDF.noteBorder}`,
            borderRadius: "6px",
            padding: "12px 16px",
            fontSize: "10.5px",
            color: PDF.noteText,
            lineHeight: 1.5,
            breakInside: "avoid",
          }}
        >
          <strong>Cálculo provisorio y orientativo.</strong> Los valores de este resumen surgen
          exclusivamente de la información cargada manualmente por la persona usuaria (precios,
          cantidades, tarifas horarias y tipo de cambio). No constituye una determinación oficial,
          una tarifa homologada ni un precio institucional del INTA. Es el resultado de una
          herramienta <strong>no oficial</strong>, de carácter experimental (prototipo), que
          interpreta la Guía metodológica para el costeo de servicios rutinarios en laboratorios de
          INTA. La responsabilidad sobre los datos y sobre cualquier decisión tomada a partir de
          ellos recae en quien utiliza la herramienta.
        </div>

        {/* Pie */}
        <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: `1px solid ${PDF.line}`, fontSize: "9.5px", color: PDF.muted, display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <span>Generado con la Calculadora de Costos · INTA Labs (prototipo no oficial)</span>
          <span style={{ whiteSpace: "nowrap" }}>{nowLabel}</span>
        </div>
      </div>
    </>
  );

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
            <div className="text-xs text-inta-gray-400 mt-0.5">
              Descargá un informe en PDF listo para compartir, o los datos en JSON.
            </div>
          </div>
          <div className="px-5 py-4 flex flex-col gap-2.5">
            <Btn
              onClick={() => setShowPdfPreview(true)}
              variant="primary"
              className="w-full"
            >
              Previsualizar y exportar PDF
            </Btn>
            <Btn
              onClick={handleExportJSON}
              variant={exportStatus === "done" ? "success" : "outline"}
              className="w-full"
              disabled={exportStatus === "loading"}
            >
              {exportStatus === "loading" ? "Generando…" : exportStatus === "done" ? "✓ JSON descargado" : "Exportar JSON (datos)"}
            </Btn>
            <p className="text-[11px] text-inta-gray-400 text-center pt-1 leading-relaxed">
              El PDF es un cálculo provisorio y orientativo, basado en los datos que cargaste
              manualmente. No es un documento oficial.
            </p>
          </div>
        </Card>

        <Btn onClick={() => onNavigate("dashboard")} variant="ghost" className="w-full">
          ← Volver al inicio
        </Btn>

        <div className="h-4" />
      </div>

      {/* Nodo oculto usado por html2pdf para capturar el documento */}
      <div aria-hidden style={{ position: "fixed", left: "-10000px", top: 0, width: "794px" }}>
        <div ref={pdfRef} style={pdfDocStyle}>
          {pdfInner}
        </div>
      </div>

      {/* Previsualizador en pantalla */}
      {showPdfPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa del PDF"
          className="fixed inset-0 z-[110] flex flex-col bg-black/60"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-inta-gray-800">Vista previa del PDF</div>
              <div className="text-[11px] text-inta-gray-400 truncate">
                Así se verá el informe. Cálculo provisorio y orientativo.
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Btn
                onClick={handleDownloadPDF}
                variant={pdfStatus === "done" ? "success" : "primary"}
                size="sm"
                disabled={pdfStatus === "loading"}
              >
                {pdfStatus === "loading" ? "Generando…" : pdfStatus === "done" ? "✓ Descargado" : "Descargar PDF"}
              </Btn>
              <Btn onClick={() => setShowPdfPreview(false)} variant="outline" size="sm">
                Cerrar
              </Btn>
            </div>
          </div>

          {/* Lienzo scrolleable con la hoja centrada */}
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="mx-auto w-fit shadow-2xl">
              <div style={pdfDocStyle}>{pdfInner}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
