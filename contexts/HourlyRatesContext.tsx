"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  HourlyRateRecord,
  HourlyRatesSnapshot,
  HourlyRatesState,
  createEmptyRecord,
  createInitialState,
  createSnapshot,
  formatSyncLabel,
  generateId,
  parseSnapshot,
  readFromStorage,
  serializeSnapshotToCsv,
  serializeSnapshotToJson,
  updateStateItems,
  withSyncMetadata,
  writeToStorage
} from "@/lib/hourlyRates";

interface HourlyRatesContextValue {
  state: HourlyRatesState;
  items: HourlyRateRecord[];
  syncLabel: string;
  addRow: () => void;
  duplicateRow: (id: string) => void;
  updateRow: (id: string, updates: Partial<HourlyRateRecord>) => void;
  deleteRow: (id: string) => void;
  exportJson: () => void;
  exportCsv: () => void;
  beginImport: (file: File) => Promise<HourlyRatesSnapshot>;
  confirmImport: (snapshot: HourlyRatesSnapshot) => void;
  resetSync: () => void;
}

const HourlyRatesContext = createContext<HourlyRatesContextValue | null>(null);

export function HourlyRatesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HourlyRatesState>(() => createInitialState());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = readFromStorage();
    setState(stored);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    writeToStorage(state);
  }, [isHydrated, state]);

  const syncLabel = useMemo(() => formatSyncLabel(state), [state]);

  const addRow = useCallback(() => {
    setState((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyRecord()]
    }));
  }, []);

  const duplicateRow = useCallback((id: string) => {
    setState((prev) => {
      const record = prev.items.find((item) => item.id === id);
      if (!record) {
        return prev;
      }

      const copy: HourlyRateRecord = {
        ...record,
        id: generateId()
      };

      return {
        ...prev,
        items: [...prev.items, copy]
      };
    });
  }, []);

  const updateRow = useCallback(
    (id: string, updates: Partial<HourlyRateRecord>) => {
      setState((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === id
            ? {
                ...item,
                ...updates
              }
            : item
        )
      }));
    },
    []
  );

  const deleteRow = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id)
    }));
  }, []);

  const exportJson = useCallback(() => {
    setState((prev) => {
      const next = withSyncMetadata(prev, {
        iso: new Date().toISOString().slice(0, 10),
        type: "export"
      });
      const snapshot = createSnapshot(next.items, next.lastSyncISO ?? undefined);
      const blob = new Blob([serializeSnapshotToJson(snapshot)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `valores-hora-${snapshot.exportedAtISO}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      return next;
    });
  }, []);

  const exportCsv = useCallback(() => {
    setState((prev) => {
      const next = withSyncMetadata(prev, {
        iso: new Date().toISOString().slice(0, 10),
        type: "export"
      });
      const snapshot = createSnapshot(next.items, next.lastSyncISO ?? undefined);
      const blob = new Blob([serializeSnapshotToCsv(snapshot)], {
        type: "text/csv"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `valores-hora-${snapshot.exportedAtISO}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      return next;
    });
  }, []);

  const beginImport = useCallback(async (file: File) => {
    const content = await file.text();
    return parseSnapshot(content, file.name);
  }, []);

  const confirmImport = useCallback((snapshot: HourlyRatesSnapshot) => {
    setState((prev) =>
      withSyncMetadata(updateStateItems(prev, snapshot.items), {
        iso: snapshot.exportedAtISO,
        type: "import"
      })
    );
  }, []);

  const resetSync = useCallback(() => {
    setState((prev) => ({
      ...prev,
      lastSyncISO: null,
      lastSyncType: null
    }));
  }, []);

  const value = useMemo<HourlyRatesContextValue>(
    () => ({
      state,
      items: state.items,
      syncLabel,
      addRow,
      duplicateRow,
      updateRow,
      deleteRow,
      exportJson,
      exportCsv,
      beginImport,
      confirmImport,
      resetSync
    }),
    [
      state,
      syncLabel,
      addRow,
      duplicateRow,
      updateRow,
      deleteRow,
      exportJson,
      exportCsv,
      beginImport,
      confirmImport,
      resetSync
    ]
  );

  return (
    <HourlyRatesContext.Provider value={value}>
      {children}
    </HourlyRatesContext.Provider>
  );
}

export function useHourlyRates() {
  const context = useContext(HourlyRatesContext);
  if (!context) {
    throw new Error("useHourlyRates debe utilizarse dentro de HourlyRatesProvider");
  }
  return context;
}
