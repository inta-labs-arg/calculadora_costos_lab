"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";

const appliedRateFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4
});

interface ConfigurationPanelProps {
  globalDeterminations: number;
  onGlobalDeterminationsChange: (value: number) => void;
}

export function ConfigurationPanel({
  globalDeterminations,
  onGlobalDeterminationsChange
}: ConfigurationPanelProps) {
  const {
    state,
    manualState,
    updateManualState,
    applyManualState,
    fetchBcraRate,
    isFetching
  } = useExchangeRate();
  const isAutomatic = state.source !== "manual";
  const [toast, setToast] = useState<string | null>(null);
  const [determinationsInput, setDeterminationsInput] = useState(
    globalDeterminations.toString()
  );
  const [determinationsError, setDeterminationsError] = useState<string | null>(
    null
  );

  useEffect(() => {
    setDeterminationsInput(globalDeterminations.toString());
  }, [globalDeterminations]);

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
        const fallback = "No fue posible obtener el tipo de cambio oficial del BCRA.";
        const errorMessage =
          error instanceof Error && typeof error.message === "string"
            ? error.message.trim()
            : "";
        const displayMessage = errorMessage ? errorMessage : fallback;
        const normalizedMessage = displayMessage.endsWith(".")
          ? displayMessage
          : `${displayMessage}.`;
        setToast(`${normalizedMessage} Se mantiene el valor manual.`);
        event.target.checked = false;
      }
    } else {
      applyManualState();
    }
  };

  const handleDeterminationsChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const nextValue = event.target.value;
    setDeterminationsInput(nextValue);

    if (nextValue.trim() === "") {
      setDeterminationsError("Ingresa las determinaciones mensuales");
      return;
    }

    const numericValue = Number(nextValue);

    if (Number.isNaN(numericValue) || !Number.isInteger(numericValue)) {
      setDeterminationsError("Debe ser un número entero");
      return;
    }

    if (numericValue <= 0) {
      setDeterminationsError("Debe ser mayor a cero");
      return;
    }

    setDeterminationsError(null);
    onGlobalDeterminationsChange(numericValue);
  };

  const appliedRateLabel = useMemo(
    () => `${appliedRateFormatter.format(state.rate)} ARS/USD`,
    [state.rate]
  );

  const manualRateValue = useMemo(() => manualState.rate.toString(), [manualState.rate]);

  const noteValue = manualState.note ?? "";

  const sourceLabel =
    state.source === "bcra" ? "BCRA" : state.source === "cache" ? "Cache local" : "Manual";

  const sourceTooltip =
    state.source === "bcra"
      ? undefined
      : "Se usó cache/valor manual por indisponibilidad del BCRA";

  return (
    <section className="relative space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-md">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">Configuración</h2>
        <p className="text-sm text-slate-600">
          Define la base global de prorrateo y el tipo de cambio de referencia
          para normalizar los insumos en pesos argentinos.
        </p>
      </header>

      <div className="space-y-3 text-sm text-slate-700">
        <label className="flex flex-col gap-1">
          <span className="font-medium text-slate-800">
            Determinaciones mensuales del laboratorio (DM)
          </span>
          <input
            type="number"
            min={1}
            step={1}
            value={determinationsInput}
            onChange={handleDeterminationsChange}
            className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
          />
          {determinationsError ? (
            <span className="text-xs text-rose-600">{determinationsError}</span>
          ) : (
            <span className="text-xs text-slate-500">
              Base global de prorrateo para los subniveles 2.1 a 2.4.
            </span>
          )}
        </label>

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
            checked={isAutomatic}
            onChange={handleToggle}
            disabled={isFetching}
          />
        </label>
        {isFetching ? (
          <p className="text-xs text-slate-500">Consultando al BCRA…</p>
        ) : null}
        <p className="text-xs text-slate-500">
          TC aplicado (USD → ARS): <span className="font-medium text-slate-700">{appliedRateLabel}</span> — Fuente:
          {" "}
          <span className="font-medium text-slate-700" title={sourceTooltip ?? undefined}>
            {sourceLabel}
          </span>
          {" "}— Fecha: <span className="font-medium text-slate-700">{state.dateISO}</span>
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
