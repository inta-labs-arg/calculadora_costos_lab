"use client";

import type { LevelTotal } from "@/lib/cost-calculation";
import { currencyFormatter } from "@/lib/cost-calculation";
import type { ExchangeRateState } from "@/contexts/ExchangeRateContext";
import { useHourlyRates } from "@/contexts/HourlyRatesContext";

interface SummaryPanelProps {
  orderedTotals: LevelTotal[];
  grandTotal: number;
  exchangeRate: ExchangeRateState;
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

export function SummaryPanel({
  orderedTotals,
  grandTotal,
  exchangeRate
}: SummaryPanelProps) {
  const { state: hourlyRateState } = useHourlyRates();
  const sourceLabel =
    exchangeRate.source === "bcra"
      ? "BCRA"
      : exchangeRate.source === "cache"
        ? "Cache local"
        : "Manual";
  const sourceTooltip =
    exchangeRate.source === "bcra"
      ? undefined
      : "Se usó cache/valor manual por indisponibilidad del BCRA";
  const rateLabel = `${exchangeRateFormatter.format(exchangeRate.rate)} ARS/USD`;
  const hourlySyncLabel = hourlyRateState.lastSyncISO
    ? `Tabla local (${hourlyRateState.lastSyncISO} · ${
        hourlyRateState.lastSyncType === "import" ? "importación" : "exportación"
      })`
    : "Tabla local (sin exportación/importación)";

  return (
    <section className="rounded-3xl border border-inta-blue bg-white/90 p-6 shadow-md">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="space-y-4 xl:w-80 xl:flex-none">
          <div>
            <h2 className="text-xl font-semibold text-inta-blue">Resumen del servicio</h2>
            <p className="text-sm text-slate-600">
              Visualiza el aporte parcial de cada nivel y el costo total estimado del
              servicio.
            </p>
          </div>

          <div className="space-y-1 rounded-lg bg-slate-50/80 p-3 text-xs text-slate-600">
            <p>
              TC aplicado: <span className="font-medium text-slate-800">{rateLabel}</span>{" "}— Fuente:{" "}
              <span className="font-medium text-slate-800" title={sourceTooltip ?? undefined}>
                {sourceLabel}
              </span>
              {" "}— Fecha {exchangeRate.dateISO}
            </p>
            {exchangeRate.note ? (
              <p className="text-slate-500">Observaciones: {exchangeRate.note}</p>
            ) : null}
            <p>
              Fuente de valor hora: {" "}
              <span className="font-medium text-slate-800">{hourlySyncLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <ul className="space-y-3 text-sm text-slate-600">
            {orderedTotals.map((level) => (
              <li key={level.id} className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">{level.name}</p>
                    {typeof level.rate === "number" ? (
                      <p className="text-xs text-slate-500">{level.rate}% aplicado</p>
                    ) : null}
                  </div>
                  <span className="font-semibold text-slate-900">
                    {currencyFormatter.format(level.subtotal)}
                  </span>
                </div>
                {level.breakdown && level.breakdown.length > 0 ? (
                  <ul className="space-y-2 rounded-lg bg-white/80 p-3 text-xs text-slate-500">
                    {level.breakdown.map((item) => (
                      <li key={item.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {item.name}
                            {typeof item.rate === "number" ? ` · ${item.rate}%` : ""}
                          </span>
                          <span className="font-medium text-slate-700">
                            {currencyFormatter.format(item.subtotal)}
                          </span>
                        </div>
                        {item.breakdown && item.breakdown.length > 0 ? (
                          <ul className="space-y-1 rounded-md bg-slate-50/70 p-2 text-[11px] text-slate-500">
                            {item.breakdown.map((detail) => (
                              <li key={detail.id} className="flex items-center justify-between gap-2">
                                <span>{detail.name}</span>
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

          <div className="flex flex-col gap-2 rounded-2xl border border-inta-blue bg-inta-blue/10 p-4 text-slate-800">
            <p className="text-lg font-semibold text-inta-blue">Costo total estimado</p>
            <p className="text-2xl font-bold text-inta-blue">
              {currencyFormatter.format(grandTotal)}
            </p>
            {exchangeRate.rate > 0 ? (
              <p className="text-sm text-inta-blue/80">
                ≈ {usdCurrencyFormatter.format(grandTotal / exchangeRate.rate)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
