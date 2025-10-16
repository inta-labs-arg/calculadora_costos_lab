"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LevelTotal } from "@/lib/cost-calculation";
import type { ExchangeRateState } from "@/contexts/ExchangeRateContext";
import { useHourlyRates } from "@/contexts/HourlyRatesContext";

interface SummaryPanelProps {
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
}

const exchangeRateFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4
});

const usdCurrencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

type ResumenServicioItem = {
  categoria: string;
  subcategoria?: string;
  descripcion: string;
  cantidad?: number;
  unidad?: string;
  costoMensual: number;
  costoAnual?: number | null;
  costoPorDeterminacion?: number | null;
};

type ResumenServicioNivelDetalle = {
  id: string;
  nombre: string;
  subtotal: number;
  porcentaje?: number | null;
  detalles?: Array<{
    id: string;
    nombre: string;
    subtotal: number;
  }>;
};

type ResumenServicioNivel = {
  id: string;
  nombre: string;
  subtotal: number;
  porcentaje?: number | null;
  desglose?: ResumenServicioNivelDetalle[];
};

type ResumenServicio = {
  fechaGeneracionISO: string;
  moneda: "ARS";
  servicio: {
    nombre: string;
    nombreOriginal: string;
    laboratorio: string;
    laboratorioOriginal: string;
    fechaCotizacionISO: string;
    fechaCotizacion: string;
  };
  exchangeRate: {
    tasa: number;
    etiqueta: string;
    fuente: ExchangeRateState["source"];
    fuenteEtiqueta: string;
    fuenteTooltip: string | null;
    fechaISO: string | null;
    nota: string | null;
  };
  hourlyRate: {
    etiqueta: string;
    lastSyncISO: string | null;
    lastSyncType: string | null;
  };
  parametros: Record<string, string | number | null>;
  niveles: ResumenServicioNivel[];
  items: ResumenServicioItem[];
  totales: {
    costoMensualTotal: number;
    costoAnualTotal?: number | null;
    costoPorDeterminacionTotal?: number | null;
  };
  pricing: {
    precioARS: number;
    porcentajeEEA: number;
    porcentajeCentro: number;
    afectacionEEA: number;
    afectacionCentro: number;
    precioNeto: number;
    labels: {
      afectacionEEA: string;
      afectacionCentro: string;
    };
  };
};

type ExportFormat = "pdf" | "json" | "csv";

type CsvRow = {
  Seccion: string;
  Campo: string;
  Valor: string | number | null;
  Categoria: string;
  Subcategoria: string;
  Descripcion: string;
  CostoMensual: number | null;
  CostoAnual: number | null;
  CostoPorDeterminacion: number | null;
};

export function SummaryPanel({
  orderedTotals,
  grandTotal,
  exchangeRate,
  serviceName,
  laboratoryName,
  quoteDateISO,
  pricing
}: SummaryPanelProps) {
  const { state: hourlyRateState } = useHourlyRates();
  const { lastSyncISO, lastSyncType } = hourlyRateState;
  const resumenRef = useRef<HTMLElement | null>(null);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  const buildResumenServicio = useCallback((): ResumenServicio => {
    const sourceLabel =
      exchangeRate.source === "monedapi"
        ? "Monedapi.ar"
        : exchangeRate.source === "cache"
          ? "Cache local"
          : "Manual";
    const sourceTooltip =
      exchangeRate.source === "monedapi"
        ? null
        : "Se usó cache/valor manual por indisponibilidad de Monedapi";
    const rateLabel = `${exchangeRateFormatter.format(exchangeRate.rate)} ARS/USD`;
    const hourlySyncLabel = lastSyncISO
      ? `Tabla local (${lastSyncISO} · ${lastSyncType === "import" ? "importación" : "exportación"})`
      : "Tabla local (sin exportación/importación)";
    const quoteDate = new Date(quoteDateISO).toLocaleDateString("es-AR");
    const trimmedServiceName = serviceName.trim();
    const trimmedLaboratoryName = laboratoryName.trim();

    const niveles: ResumenServicioNivel[] = orderedTotals.map((level) => ({
      id: level.id,
      nombre: level.name,
      subtotal: level.subtotal,
      porcentaje: typeof level.rate === "number" ? level.rate : null,
      desglose:
        level.breakdown?.map((item) => ({
          id: item.id,
          nombre: item.name,
          subtotal: item.subtotal,
          porcentaje: typeof item.rate === "number" ? item.rate : null,
          detalles: item.breakdown?.map((detail) => ({
            id: detail.id,
            nombre: detail.name,
            subtotal: detail.subtotal
          }))
        })) ?? []
    }));

    const flattenedItems: ResumenServicioItem[] = [];

    niveles.forEach((nivel) => {
      flattenedItems.push({
        categoria: nivel.nombre,
        descripcion: nivel.nombre,
        costoMensual: nivel.subtotal,
        costoAnual: null,
        costoPorDeterminacion: null
      });

      nivel.desglose?.forEach((subnivel) => {
        flattenedItems.push({
          categoria: nivel.nombre,
          subcategoria: subnivel.nombre,
          descripcion: subnivel.nombre,
          costoMensual: subnivel.subtotal,
          costoAnual: null,
          costoPorDeterminacion: null
        });

        subnivel.detalles?.forEach((detalle) => {
          flattenedItems.push({
            categoria: nivel.nombre,
            subcategoria: subnivel.nombre,
            descripcion: detalle.nombre,
            costoMensual: detalle.subtotal,
            costoAnual: null,
            costoPorDeterminacion: null
          });
        });
      });
    });

    const afectacionEeaLabel = "Afectación EEA o Instituto de Investigación";
    const afectacionCentroLabel = "Afectación Centro Regional / Centro de Investigación";

    return {
      fechaGeneracionISO: new Date().toISOString(),
      moneda: "ARS",
      servicio: {
        nombre: trimmedServiceName,
        nombreOriginal: serviceName,
        laboratorio: trimmedLaboratoryName,
        laboratorioOriginal: laboratoryName,
        fechaCotizacionISO: quoteDateISO,
        fechaCotizacion: quoteDate
      },
      exchangeRate: {
        tasa: exchangeRate.rate,
        etiqueta: rateLabel,
        fuente: exchangeRate.source,
        fuenteEtiqueta: sourceLabel,
        fuenteTooltip: sourceTooltip,
        fechaISO: exchangeRate.dateISO ?? null,
        nota: exchangeRate.note ?? null
      },
      hourlyRate: {
        etiqueta: hourlySyncLabel,
        lastSyncISO: lastSyncISO ?? null,
        lastSyncType: lastSyncType ?? null
      },
      parametros: {
        etiquetaTipoCambio: rateLabel,
        fuenteTipoCambio: sourceLabel,
        fechaTipoCambioISO: exchangeRate.dateISO ?? null,
        notaTipoCambio: exchangeRate.note ?? null,
        fuenteValorHora: hourlySyncLabel
      },
      niveles,
      items: flattenedItems,
      totales: {
        costoMensualTotal: grandTotal,
        costoAnualTotal: null,
        costoPorDeterminacionTotal: null
      },
      pricing: {
        precioARS: pricing.precioARS,
        porcentajeEEA: pricing.porcentajeEEA,
        porcentajeCentro: pricing.porcentajeCentro,
        afectacionEEA: pricing.afectacionEEA,
        afectacionCentro: pricing.afectacionCentro,
        precioNeto: pricing.precioNeto,
        labels: {
          afectacionEEA: afectacionEeaLabel,
          afectacionCentro: afectacionCentroLabel
        }
      }
    };
  }, [
    exchangeRate.dateISO,
    exchangeRate.note,
    exchangeRate.rate,
    exchangeRate.source,
    grandTotal,
    lastSyncISO,
    lastSyncType,
    laboratoryName,
    orderedTotals,
    pricing.afectacionCentro,
    pricing.afectacionEEA,
    pricing.porcentajeCentro,
    pricing.porcentajeEEA,
    pricing.precioARS,
    pricing.precioNeto,
    quoteDateISO,
    serviceName
  ]);

  const [resumenServicio, setResumenServicio] = useState<ResumenServicio>(buildResumenServicio);

  useEffect(() => {
    setResumenServicio(buildResumenServicio());
  }, [buildResumenServicio]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: resumenServicio.moneda
      }),
    [resumenServicio.moneda]
  );

  const formattedQuoteDate = resumenServicio.servicio.fechaCotizacion;
  const isExporting = exportingFormat !== null;

  const handleExportJson = useCallback(() => {
    setExportingFormat("json");
    try {
      const blob = new Blob([JSON.stringify(resumenServicio, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "resumen-servicio.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingFormat(null);
    }
  }, [resumenServicio]);

  const handleExportCsv = useCallback(async () => {
    setExportingFormat("csv");
    try {
      const Papa = (await import("papaparse")).default;
      const rows: CsvRow[] = [];

      const pushGeneralRow = (campo: string, valor: string | number | null) => {
        rows.push({
          Seccion: "Datos generales",
          Campo: campo,
          Valor: valor,
          Categoria: "",
          Subcategoria: "",
          Descripcion: "",
          CostoMensual: null,
          CostoAnual: null,
          CostoPorDeterminacion: null
        });
      };

      pushGeneralRow(
        "Servicio",
        resumenServicio.servicio.nombre || "(Sin definir)"
      );
      pushGeneralRow(
        "Laboratorio",
        resumenServicio.servicio.laboratorio || "(Sin definir)"
      );
      pushGeneralRow("Fecha de cotización", formattedQuoteDate);
      pushGeneralRow("Tipo de cambio aplicado", resumenServicio.exchangeRate.etiqueta);
      pushGeneralRow("Fuente TC", resumenServicio.exchangeRate.fuenteEtiqueta);
      pushGeneralRow("Fecha TC", resumenServicio.exchangeRate.fechaISO);
      pushGeneralRow("Observaciones TC", resumenServicio.exchangeRate.nota);
      pushGeneralRow("Fuente valor hora", resumenServicio.hourlyRate.etiqueta);

      resumenServicio.items.forEach((item) => {
        rows.push({
          Seccion: "Detalle de costos",
          Campo: item.categoria,
          Valor: item.descripcion,
          Categoria: item.categoria,
          Subcategoria: item.subcategoria ?? "",
          Descripcion: item.descripcion,
          CostoMensual: item.costoMensual,
          CostoAnual: item.costoAnual ?? null,
          CostoPorDeterminacion: item.costoPorDeterminacion ?? null
        });
      });

      rows.push({
        Seccion: "Totales",
        Campo: "Costo mensual total",
        Valor: resumenServicio.totales.costoMensualTotal,
        Categoria: "",
        Subcategoria: "",
        Descripcion: "",
        CostoMensual: resumenServicio.totales.costoMensualTotal,
        CostoAnual: resumenServicio.totales.costoAnualTotal ?? null,
        CostoPorDeterminacion: resumenServicio.totales.costoPorDeterminacionTotal ?? null
      });

      rows.push({
        Seccion: "Precio",
        Campo: "Precio (ARS)",
        Valor: resumenServicio.pricing.precioARS,
        Categoria: "",
        Subcategoria: "",
        Descripcion: "",
        CostoMensual: resumenServicio.pricing.precioARS,
        CostoAnual: null,
        CostoPorDeterminacion: null
      });

      rows.push({
        Seccion: "Precio",
        Campo: `${resumenServicio.pricing.labels.afectacionEEA} (${resumenServicio.pricing.porcentajeEEA}%)`,
        Valor: resumenServicio.pricing.afectacionEEA,
        Categoria: "",
        Subcategoria: "",
        Descripcion: "",
        CostoMensual: resumenServicio.pricing.afectacionEEA,
        CostoAnual: null,
        CostoPorDeterminacion: null
      });

      rows.push({
        Seccion: "Precio",
        Campo: `${resumenServicio.pricing.labels.afectacionCentro} (${resumenServicio.pricing.porcentajeCentro}%)`,
        Valor: resumenServicio.pricing.afectacionCentro,
        Categoria: "",
        Subcategoria: "",
        Descripcion: "",
        CostoMensual: resumenServicio.pricing.afectacionCentro,
        CostoAnual: null,
        CostoPorDeterminacion: null
      });

      rows.push({
        Seccion: "Precio",
        Campo: "Precio neto",
        Valor: resumenServicio.pricing.precioNeto,
        Categoria: "",
        Subcategoria: "",
        Descripcion: "",
        CostoMensual: resumenServicio.pricing.precioNeto,
        CostoAnual: null,
        CostoPorDeterminacion: null
      });

      const csv = Papa.unparse(rows, { delimiter: "," });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "resumen-servicio.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingFormat(null);
    }
  }, [formattedQuoteDate, resumenServicio]);

  const handleExportPdf = useCallback(async () => {
    if (!resumenRef.current) {
      return;
    }

    setExportingFormat("pdf");
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 10,
          filename: "resumen-servicio.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        })
        .from(resumenRef.current)
        .save();
    } catch (error) {
      console.error("Error al exportar el resumen a PDF", error);
    } finally {
      setExportingFormat(null);
    }
  }, [resumenRef]);

  return (
    <section
      ref={resumenRef}
      className="rounded-3xl border border-inta-blue bg-white/90 p-6 shadow-md"
    >
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="space-y-4 xl:w-80 xl:flex-none">
          <div>
            <h2 className="text-xl font-semibold text-inta-blue">Resumen del servicio</h2>
            <p className="text-sm text-slate-600">
              Visualiza el aporte parcial de cada nivel y el costo unitario del servicio rutinario.
            </p>
          </div>

          <div className="space-y-2 rounded-lg bg-inta-blue/5 p-3 text-xs text-slate-700">
            <p>
              Servicio: {" "}
              <span className="font-medium text-slate-900">
                {resumenServicio.servicio.nombre || "(Sin definir)"}
              </span>
            </p>
            <p>
              Laboratorio: {" "}
              <span className="font-medium text-slate-900">
                {resumenServicio.servicio.laboratorio || "(Sin definir)"}
              </span>
            </p>
            <p>
              Fecha de cotización: {" "}
              <span className="font-medium text-slate-900">{formattedQuoteDate}</span>
            </p>
          </div>

          <div className="space-y-1 rounded-lg bg-slate-50/80 p-3 text-xs text-slate-600">
            <p>
              TC aplicado: <span className="font-medium text-slate-800">{resumenServicio.exchangeRate.etiqueta}</span>{" "}— Fuente:{" "}
              <span
                className="font-medium text-slate-800"
                title={resumenServicio.exchangeRate.fuenteTooltip ?? undefined}
              >
                {resumenServicio.exchangeRate.fuenteEtiqueta}
              </span>
              {" "}— Fecha {resumenServicio.exchangeRate.fechaISO ?? "-"}
            </p>
            {resumenServicio.exchangeRate.nota ? (
              <p className="text-slate-500">Observaciones: {resumenServicio.exchangeRate.nota}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 pt-2 text-xs text-slate-600">
            <span className="font-medium text-slate-700">Exportar resumen:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExporting}
                className="flex items-center gap-2 rounded-lg border border-inta-blue bg-white px-3 py-1.5 font-medium text-inta-blue transition hover:bg-inta-blue/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingFormat === "pdf" ? (
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                    />
                    Generando PDF…
                  </span>
                ) : (
                  "Exportar PDF"
                )}
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                disabled={isExporting}
                className="rounded-lg border border-inta-blue bg-white px-3 py-1.5 font-medium text-inta-blue transition hover:bg-inta-blue/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Exportar JSON
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isExporting}
                className="rounded-lg border border-inta-blue bg-white px-3 py-1.5 font-medium text-inta-blue transition hover:bg-inta-blue/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Exportar CSV
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <ul className="space-y-3 text-sm text-slate-600">
            {resumenServicio.niveles.map((nivel) => (
              <li
                key={nivel.id}
                className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                style={{ breakInside: "avoid" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">{nivel.nombre}</p>
                    {typeof nivel.porcentaje === "number" ? (
                      <p className="text-xs text-slate-500">{nivel.porcentaje}% aplicado</p>
                    ) : null}
                  </div>
                  <span className="font-semibold text-slate-900">
                    {currencyFormatter.format(nivel.subtotal)}
                  </span>
                </div>
                {nivel.desglose && nivel.desglose.length > 0 ? (
                  <ul className="space-y-2 rounded-lg bg-white/80 p-3 text-xs text-slate-500">
                    {nivel.desglose.map((item) => (
                      <li key={item.id} className="space-y-1" style={{ breakInside: "avoid" }}>
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {item.nombre}
                            {typeof item.porcentaje === "number" ? ` · ${item.porcentaje}%` : ""}
                          </span>
                          <span className="font-medium text-slate-700">
                            {currencyFormatter.format(item.subtotal)}
                          </span>
                        </div>
                        {item.detalles && item.detalles.length > 0 ? (
                          <ul className="space-y-1 rounded-md bg-slate-50/70 p-2 text-[11px] text-slate-500">
                            {item.detalles.map((detail) => (
                              <li
                                key={detail.id}
                                className="flex items-center justify-between gap-2"
                                style={{ breakInside: "avoid" }}
                              >
                                <span>{detail.nombre}</span>
                                <span className="font-medium text-slate-600">
                                  {currencyFormatter.format(detail.subtotal)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>

          <div
            className="flex flex-col gap-2 rounded-2xl border border-inta-blue bg-inta-blue/10 p-4 text-slate-800"
            style={{ breakInside: "avoid" }}
          >
            <p className="text-lg font-semibold text-inta-blue">Costo Unitario del Servicio Rutinario</p>
            <p className="text-2xl font-bold text-inta-blue">
              {currencyFormatter.format(resumenServicio.totales.costoMensualTotal)}
            </p>
            {resumenServicio.exchangeRate.tasa > 0 ? (
              <p className="text-sm text-inta-blue/80">
                ≈ {usdCurrencyFormatter.format(resumenServicio.totales.costoMensualTotal / resumenServicio.exchangeRate.tasa)}
              </p>
            ) : null}
          </div>

          <div
            className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900"
            style={{ breakInside: "avoid" }}
          >
            <p className="text-lg font-semibold text-amber-900">Precio y afectación institucional</p>
            <dl className="space-y-2 text-amber-800">
              <div className="flex items-center justify-between gap-2">
                <dt>Precio (ARS)</dt>
                <dd className="font-semibold text-amber-900">
                  {currencyFormatter.format(resumenServicio.pricing.precioARS)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt>
                  {resumenServicio.pricing.labels.afectacionEEA}{" "}
                  <span className="text-xs text-amber-700">({resumenServicio.pricing.porcentajeEEA}%)</span>
                </dt>
                <dd className="font-semibold text-amber-900">
                  {currencyFormatter.format(resumenServicio.pricing.afectacionEEA)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt>
                  {resumenServicio.pricing.labels.afectacionCentro}{" "}
                  <span className="text-xs text-amber-700">({resumenServicio.pricing.porcentajeCentro}%)</span>
                </dt>
                <dd className="font-semibold text-amber-900">
                  {currencyFormatter.format(resumenServicio.pricing.afectacionCentro)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-dashed border-amber-200 pt-2">
                <dt>Precio neto</dt>
                <dd className="text-lg font-bold text-inta-green">
                  {currencyFormatter.format(resumenServicio.pricing.precioNeto)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
