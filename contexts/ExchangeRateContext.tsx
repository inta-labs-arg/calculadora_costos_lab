"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

export const BCRA_EXRATE_URL = "/api/bcra/usd";

type ExchangeRateSource = "manual" | "bcra" | "cache";

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
      const response = await fetch(BCRA_EXRATE_URL, {
        headers: { Accept: "application/json" }
      });
      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok) {
        let errorMessage = `Respuesta inesperada del BCRA: ${response.status} ${response.statusText}`;
        if (contentType.includes("application/json")) {
          try {
            const { message } = (await response.json()) as { message?: string };
            if (message) {
              errorMessage = message;
            }
          } catch (error) {
            console.error("No fue posible parsear el error del endpoint /api/bcra/usd", error);
          }
        }
        throw new Error(errorMessage);
      }

      if (!contentType.includes("application/json")) {
        throw new Error("La respuesta del endpoint /api/bcra/usd no es JSON");
      }

      const payload = (await response.json()) as {
        rate?: number;
        dateISO?: string;
        source?: ExchangeRateSource;
      };

      const normalizedRate = normalizeRateValue(payload.rate);
      if (Number.isNaN(normalizedRate)) {
        throw new Error("El endpoint /api/bcra/usd devolvió un tipo de cambio inválido");
      }

      const resolvedDate = payload.dateISO ? new Date(payload.dateISO) : null;
      if (!resolvedDate || Number.isNaN(resolvedDate.getTime())) {
        throw new Error("El endpoint /api/bcra/usd devolvió una fecha inválida");
      }

      const source: ExchangeRateSource =
        payload.source === "cache"
          ? "cache"
          : payload.source === "manual"
            ? "manual"
            : "bcra";

      setState({
        rate: normalizedRate,
        source,
        dateISO: resolvedDate.toISOString().slice(0, 10),
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
