"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";

const appliedRateFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4
});

export function ConfigurationPanel() {
  const {
    state,
    manualState,
    updateManualState,
    applyManualState,
    fetchBcraRate,
    isFetching
  } = useExchangeRate();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleRateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const numericValue = Number(event.target.value);
    updateManualState({ rate: numericValue });
  };

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateManualState({ dateISO: event.target.value });
  };

  const handleNoteChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    updateManualState({ note: event.target.value });
  };

  const handleToggle = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      try {
        await fetchBcraRate();
      } catch (error) {
        console.error(error);
        setToast(
          "No fue posible obtener el tipo de cambio oficial del BCRA. Se mantiene el valor manual."
        );
        event.target.checked = false;
      }
    } else {
      applyManualState();
    }
  };

  const appliedRateLabel = useMemo(
    () => `${appliedRateFormatter.format(state.rate)} ARS/USD`,
    [state.rate]
  );

  const manualRateValue = useMemo(() => manualState.rate.toString(), [manualState.rate]);

  const noteValue = manualState.note ?? "";

  return (
    <section className="relative space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-md">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">Configuración</h2>
        <p className="text-sm text-slate-600">
          Define el tipo de cambio de referencia para normalizar los insumos en
          pesos argentinos.
        </p>
      </header>

      <div className="space-y-3 text-sm text-slate-700">
        <label className="flex flex-col gap-1">
          <span className="font-medium text-slate-800">
            Tipo de cambio (USD → ARS)
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={manualRateValue}
            onChange={handleRateChange}
            className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium text-slate-800">Fecha de referencia</span>
          <input
            type="date"
            value={manualState.dateISO}
            onChange={handleDateChange}
            className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium text-slate-800">Observaciones</span>
          <textarea
            rows={3}
            value={noteValue}
            onChange={handleNoteChange}
            className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
            placeholder="Ej. Fuente interna o fecha de actualización específica"
          />
        </label>

        <p className="text-xs text-slate-500">
          Los valores manuales quedan guardados como respaldo si la consulta al
          BCRA no está disponible.
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700">
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block font-medium text-slate-800">
              Obtener TC del BCRA
            </span>
            <span className="block text-xs text-slate-500">
              Actualiza automáticamente con el último tipo de cambio oficial
              minorista.
            </span>
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-inta-blue"
            checked={state.source === "bcra"}
            onChange={handleToggle}
            disabled={isFetching}
          />
        </label>
        {isFetching ? (
          <p className="text-xs text-slate-500">Consultando al BCRA…</p>
        ) : null}
        <p className="text-xs text-slate-500">
          Fuente actual: <span className="font-medium text-slate-700">{state.source === "bcra" ? "BCRA" : "Manual"}</span>
          {" "}· Fecha {state.dateISO}
        </p>
        <p className="text-xs text-slate-500">
          Tipo de cambio aplicado: <span className="font-medium text-slate-700">{appliedRateLabel}</span>
        </p>
      </div>

      {toast ? (
        <div
          role="alert"
          className="pointer-events-none fixed bottom-6 right-6 max-w-xs rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </section>
  );
}
