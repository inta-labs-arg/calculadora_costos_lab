"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

// El tipo de cambio se carga manualmente. La app no consulta servicios externos:
// funciona 100% en el cliente, lo que la hace apta para hosting estático.
type ExchangeRateSource = "manual";

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
}

const ExchangeRateContext = createContext<ExchangeRateContextValue | undefined>(
  undefined
);

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

  const value = useMemo(
    () => ({
      state,
      manualState,
      updateManualState,
      applyManualState
    }),
    [state, manualState, updateManualState, applyManualState]
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
