"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";

const appliedRateFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4
});
const arsCurrencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS"
});

const BNA_STORAGE_KEY = "bna-cotizacion";

interface BnaQuotePayload {
  source: string;
  date: string;
  displayDate: string;
  moneda: string;
  compra: number | null;
  venta: number;
  horaActualizacion: string | null;
  fetchedAt: string;
}

export function ConfigurationPanel() {
  const {
    state,
    manualState,
    updateManualState,
    applyManualState,
    fetchMonedapiRate,
    isFetching
  } = useExchangeRate();
  const isAutomatic = state.source !== "manual";
  const [toast, setToast] = useState<string | null>(null);
  const [bnaQuote, setBnaQuote] = useState<BnaQuotePayload | null>(null);
  const [isFetchingBna, setIsFetchingBna] = useState(false);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(BNA_STORAGE_KEY);
      if (!storedValue) {
        return;
      }

      const parsed = JSON.parse(storedValue) as {
        quote?: BnaQuotePayload;
        storedAt?: string;
      };

      if (parsed?.quote) {
        setBnaQuote(parsed.quote);
      }
    } catch (error) {
      console.error(
        "No fue posible leer la cotización de BNA desde localStorage",
        error
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !bnaQuote) {
      return;
    }

    try {
      window.localStorage.setItem(
        BNA_STORAGE_KEY,
        JSON.stringify({ quote: bnaQuote, storedAt: new Date().toISOString() })
      );
    } catch (error) {
      console.error(
        "No fue posible almacenar la cotización de BNA en localStorage",
        error
      );
    }
  }, [bnaQuote]);

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
        await fetchMonedapiRate();
      } catch (error) {
        console.error(error);
        const fallback =
          "No fue posible obtener el tipo de cambio oficial desde Monedapi.";
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

  const handleFetchBnaQuote = async () => {
    setIsFetchingBna(true);
    try {
      const response = await fetch("/api/cotizacion/bna", {
        headers: { Accept: "application/json" }
      });
      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok) {
        let message =
          "No se pudo obtener la cotización de BNA. Intentá nuevamente o cargá el valor manualmente.";
        if (contentType.includes("application/json")) {
          try {
            const payload = (await response.json()) as { message?: string };
            if (payload?.message) {
              message = payload.message;
            }
          } catch (error) {
            console.error(
              "No se pudo parsear la respuesta de error del endpoint /api/cotizacion/bna",
              error
            );
          }
        }
        throw new Error(message);
      }

      if (!contentType.includes("application/json")) {
        throw new Error(
          "La respuesta del endpoint /api/cotizacion/bna no es JSON. Intentá nuevamente o cargá el valor manualmente."
        );
      }

      const payload = (await response.json()) as BnaQuotePayload;
      if (typeof payload?.venta !== "number" || Number.isNaN(payload.venta)) {
        throw new Error(
          "La respuesta del endpoint /api/cotizacion/bna no incluye un valor de venta válido."
        );
      }

      setBnaQuote(payload);
    } catch (error) {
      console.error("No fue posible obtener la cotización de BNA", error);
      const fallbackMessage =
        "No se pudo obtener la cotización de BNA. Intentá nuevamente o cargá el valor manualmente.";
      const errorMessage =
        error instanceof Error && typeof error.message === "string"
          ? error.message.trim()
          : fallbackMessage;
      const normalizedMessage = errorMessage.endsWith(".")
        ? errorMessage
        : `${errorMessage}.`;
      setToast(normalizedMessage);
    } finally {
      setIsFetchingBna(false);
    }
  };

  const appliedRateLabel = useMemo(
    () => `${appliedRateFormatter.format(state.rate)} ARS/USD`,
    [state.rate]
  );

  const manualRateValue = useMemo(
    () => manualState.rate.toString(),
    [manualState.rate]
  );

  const noteValue = manualState.note ?? "";

  const sourceLabel =
    state.source === "monedapi"
      ? "Monedapi.ar"
      : state.source === "cache"
        ? "Cache local"
        : "Manual";

  const sourceTooltip =
    state.source === "monedapi"
      ? undefined
      : "Se usó cache/valor manual por indisponibilidad de Monedapi";

  return (
    <section className="relative rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-md">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <header className="max-w-xl space-y-1 lg:w-80 lg:flex-none">
          <h2 className="text-lg font-semibold text-slate-900">Configuración</h2>
          <p className="text-sm text-slate-600">
            Define el tipo de cambio de referencia y las observaciones
            complementarias para normalizar los insumos en pesos argentinos.
          </p>
        </header>

        <div className="flex-1 space-y-6">
          <div className="grid gap-4 text-sm text-slate-700 md:grid-cols-2">
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

            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="font-medium text-slate-800">Observaciones</span>
              <textarea
                rows={3}
                value={noteValue}
                onChange={handleNoteChange}
                className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                placeholder="Ej. Fuente interna o fecha de actualización específica"
              />
            </label>
          </div>

          <p className="text-xs text-slate-500">
            Los valores manuales quedan guardados como respaldo si la consulta a
            Monedapi no está disponible.
          </p>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700">
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block font-medium text-slate-800">
                  Obtener TC desde Monedapi
                </span>
                <span className="block text-xs text-slate-500">
                  Actualiza automáticamente con el último tipo de cambio oficial
                  minorista informado por Monedapi.
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
              <p className="text-xs text-slate-500">Consultando a Monedapi…</p>
            ) : null}
            <p className="text-xs text-slate-500">
              TC aplicado (USD → ARS): <span className="font-medium text-slate-700">{appliedRateLabel}</span> — Fuente:{" "}
              <span className="font-medium text-slate-700" title={sourceTooltip ?? undefined}>
                {sourceLabel}
              </span>
              {" "}— Fecha: <span className="font-medium text-slate-700">{state.dateISO}</span>
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-inta-blue/30 bg-white/70 p-4 text-sm text-slate-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-800">Cotización oficial BNA</p>
                <p className="text-xs text-slate-500">
                  Obtiene la cotización minorista publicada por Banco Nación para usarla como referencia.
                </p>
              </div>
              <button
                type="button"
                onClick={handleFetchBnaQuote}
                disabled={isFetchingBna}
                className="inline-flex items-center justify-center rounded-lg bg-inta-blue px-3 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isFetchingBna ? "Consultando…" : "Obtener cotización (BNA)"}
              </button>
            </div>

            {isFetchingBna ? (
              <p className="text-xs text-slate-500">Consultando Banco Nación…</p>
            ) : null}

            {bnaQuote ? (
              <dl className="space-y-2 rounded-lg border border-slate-200 bg-white/60 p-3 text-xs text-slate-600">
                <div>
                  <dt className="font-medium text-slate-700">Fecha de referencia</dt>
                  <dd>
                    {bnaQuote.displayDate}
                    {bnaQuote.horaActualizacion
                      ? ` · Hora actualización: ${bnaQuote.horaActualizacion}`
                      : null}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Dólar BNA (Venta)</dt>
                  <dd className="text-base font-semibold text-slate-900">
                    {arsCurrencyFormatter.format(bnaQuote.venta)}
                  </dd>
                </div>
                {typeof bnaQuote.compra === "number" ? (
                  <div>
                    <dt className="font-medium text-slate-700">Compra</dt>
                    <dd>{arsCurrencyFormatter.format(bnaQuote.compra)}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-xs text-slate-500">
                Consultá la cotización diaria del Banco Nación para registrar un valor manual de referencia.
              </p>
            )}
          </div>
        </div>
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
