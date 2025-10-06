"use client";

import type { LevelTotal } from "@/lib/cost-calculation";
import { currencyFormatter } from "@/lib/cost-calculation";
import type { ExchangeRateState } from "@/contexts/ExchangeRateContext";

interface SummaryPanelProps {
  orderedTotals: LevelTotal[];
  grandTotal: number;
  exchangeRate: ExchangeRateState;
}

const exchangeRateFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4
});

export function SummaryPanel({
  orderedTotals,
  grandTotal,
  exchangeRate
}: SummaryPanelProps) {
  const sourceLabel = exchangeRate.source === "bcra" ? "BCRA" : "Manual";
  const rateLabel = `${exchangeRateFormatter.format(exchangeRate.rate)} ARS/USD`;

  return (
    <aside className="space-y-4 rounded-2xl border border-inta-blue bg-white/90 p-6 shadow-md">
      <div>
        <h2 className="text-xl font-semibold text-inta-blue">Resumen del servicio</h2>
        <p className="text-sm text-slate-600">
          Visualiza el aporte parcial de cada nivel y el costo total estimado del
          servicio.
        </p>
      </div>

      <div className="space-y-1 rounded-lg bg-slate-50/80 p-3 text-xs text-slate-600">
        <p>
          TC aplicado: <span className="font-medium text-slate-800">{rateLabel}</span>
          {" "}— Fuente: <span className="font-medium text-slate-800">{sourceLabel}</span>
          {" "}— Fecha {exchangeRate.dateISO}
        </p>
        {exchangeRate.note ? (
          <p className="text-slate-500">Observaciones: {exchangeRate.note}</p>
        ) : null}
      </div>

      <ul className="space-y-3 text-sm text-slate-600">
        {orderedTotals.map((level) => (
          <li key={level.id} className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-slate-800">{level.name}</p>
                {typeof level.rate === "number" ? (
                  <p className="text-xs text-slate-500">
                    {level.rate}% aplicado
                  </p>
                ) : null}
              </div>
              <span className="font-semibold text-slate-900">
                {currencyFormatter.format(level.subtotal)}
              </span>
            </div>
            {level.breakdown && level.breakdown.length > 0 ? (
              <ul className="space-y-1 rounded-lg bg-slate-50/80 p-3 text-xs text-slate-500">
                {level.breakdown.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>
                      {item.name}
                      {typeof item.rate === "number"
                        ? ` · ${item.rate}%`
                        : ""}
                    </span>
                    <span className="font-medium text-slate-700">
                      {currencyFormatter.format(item.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-xl bg-inta-blue px-4 py-3 text-white">
        <p className="text-lg font-semibold">Costo total estimado</p>
        <p className="text-2xl font-bold">
          {currencyFormatter.format(grandTotal)}
        </p>
      </div>
    </aside>
  );
}
