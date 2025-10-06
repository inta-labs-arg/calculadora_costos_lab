"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

export const BCRA_EXRATE_URL =
  "https://api.bcra.gob.ar/estadisticas/v2/principalesvariables/7926";

type ExchangeRateSource = "manual" | "bcra";

export interface ExchangeRateState {
  rate: number;
  source: ExchangeRateSource;
  dateISO: string;
  note?: string;
}

interface ManualExchangeRateState {
  rate: number;
  dateISO: string;
  note?: string;
}

interface ExchangeRateContextValue {
  state: ExchangeRateState;
  manualState: ManualExchangeRateState;
  updateManualState: (updates: Partial<ManualExchangeRateState>) => void;
  applyManualState: () => void;
  fetchBcraRate: () => Promise<void>;
  isFetching: boolean;
}

const ExchangeRateContext = createContext<ExchangeRateContextValue | undefined>(
  undefined
);

function normalizeRateValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const sanitized = value.replace(/,/g, ".");
    const parsed = Number.parseFloat(sanitized);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return Number.NaN;
}

function extractLatestBcraEntry(data: unknown): { rate: number; dateISO: string } {
  const maybeArray = Array.isArray(data)
    ? data
    : Array.isArray((data as { results?: unknown[] })?.results)
      ? (data as { results?: unknown[] }).results
      : Array.isArray((data as { Results?: unknown[] })?.Results)
        ? (data as { Results?: unknown[] }).Results
        : [];

  if (!Array.isArray(maybeArray) || maybeArray.length === 0) {
    throw new Error("La respuesta del BCRA no contiene datos disponibles.");
  }

  const normalized = maybeArray
    .map((entry) => {
      const rawDate =
        (entry as { fecha?: string; Fecha?: string; date?: string; d?: string })
          ?.fecha ??
        (entry as { fecha?: string; Fecha?: string; date?: string; d?: string })
          ?.Fecha ??
        (entry as { fecha?: string; Fecha?: string; date?: string; d?: string })
          ?.date ??
        (entry as { fecha?: string; Fecha?: string; date?: string; d?: string })
          ?.d;

      const rawValue =
        (entry as { valor?: unknown; Valor?: unknown; value?: unknown; v?: unknown })
          ?.valor ??
        (entry as { valor?: unknown; Valor?: unknown; value?: unknown; v?: unknown })
          ?.Valor ??
        (entry as { valor?: unknown; Valor?: unknown; value?: unknown; v?: unknown })
          ?.value ??
        (entry as { valor?: unknown; Valor?: unknown; value?: unknown; v?: unknown })
          ?.v;

      const parsedRate = normalizeRateValue(rawValue);
      const parsedDate = rawDate ? new Date(rawDate) : undefined;

      if (!parsedDate || Number.isNaN(parsedRate)) {
        return null;
      }

      return {
        rate: parsedRate,
        dateISO: parsedDate.toISOString().slice(0, 10)
      };
    })
    .filter((entry): entry is { rate: number; dateISO: string } => Boolean(entry));

  if (normalized.length === 0) {
    throw new Error("No se pudo interpretar el tipo de cambio del BCRA.");
  }

  normalized.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));

  return normalized[0];
}

const todayISO = new Date().toISOString().slice(0, 10);

export function ExchangeRateProvider({ children }: { children: ReactNode }) {
  const [manualState, setManualState] = useState<ManualExchangeRateState>({
    rate: 1,
    dateISO: todayISO,
    note: ""
  });
  const [state, setState] = useState<ExchangeRateState>({
    rate: manualState.rate,
    source: "manual",
    dateISO: manualState.dateISO,
    note: manualState.note
  });
  const [isFetching, setIsFetching] = useState(false);

  const updateManualState = useCallback(
    (updates: Partial<ManualExchangeRateState>) => {
      setManualState((prev) => {
        const next: ManualExchangeRateState = {
          ...prev,
          ...updates,
          rate:
            typeof updates.rate === "number" && !Number.isNaN(updates.rate)
              ? updates.rate
              : prev.rate,
          dateISO: updates.dateISO ?? prev.dateISO,
          note: updates.note ?? prev.note
        };

        setState((current) => {
          if (current.source === "manual") {
            return {
              rate: next.rate,
              source: "manual",
              dateISO: next.dateISO,
              note: next.note
            } satisfies ExchangeRateState;
          }

          if (typeof updates.note !== "undefined") {
            return {
              ...current,
              note: next.note
            } satisfies ExchangeRateState;
          }

          return current;
        });

        return next;
      });
    },
    []
  );

  const applyManualState = useCallback(() => {
    setState({
      rate: manualState.rate,
      source: "manual",
      dateISO: manualState.dateISO,
      note: manualState.note
    });
  }, [manualState]);

  const fetchBcraRate = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await fetch(BCRA_EXRATE_URL);
      if (!response.ok) {
        throw new Error(
          `Respuesta inesperada del BCRA: ${response.status} ${response.statusText}`
        );
      }

      const payload = await response.json();
      const { rate, dateISO } = extractLatestBcraEntry(payload);

      setState({
        rate,
        source: "bcra",
        dateISO,
        note: manualState.note
      });
    } catch (error) {
      setState({
        rate: manualState.rate,
        source: "manual",
        dateISO: manualState.dateISO,
        note: manualState.note
      });
      throw error;
    } finally {
      setIsFetching(false);
    }
  }, [manualState]);

  const value = useMemo(
    () => ({
      state,
      manualState,
      updateManualState,
      applyManualState,
      fetchBcraRate,
      isFetching
    }),
    [state, manualState, updateManualState, applyManualState, fetchBcraRate, isFetching]
  );

  return (
    <ExchangeRateContext.Provider value={value}>
      {children}
    </ExchangeRateContext.Provider>
  );
}

export function useExchangeRate(): ExchangeRateContextValue {
  const context = useContext(ExchangeRateContext);
  if (!context) {
    throw new Error(
      "useExchangeRate debe utilizarse dentro de un ExchangeRateProvider"
    );
  }
  return context;
}
