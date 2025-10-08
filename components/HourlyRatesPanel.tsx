"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  HourlyRateRecord,
  HourlyRatesSnapshot,
  isoDateSchema
} from "@/lib/hourlyRates";
import { useHourlyRates } from "@/contexts/HourlyRatesContext";
import { DownloadIcon, PlusIcon } from "./icons";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
  }).format(value);
}

interface ImportState {
  snapshot: HourlyRatesSnapshot | null;
  error: string | null;
}

export function HourlyRatesPanel() {
  const {
    items,
    syncLabel,
    addRow,
    duplicateRow,
    updateRow,
    deleteRow,
    exportCsv,
    exportJson,
    beginImport,
    confirmImport
  } = useHourlyRates();

  const [importState, setImportState] = useState<ImportState>({
    snapshot: null,
    error: null
  });
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const stickyScrollRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [scrollContentWidth, setScrollContentWidth] = useState(0);

  const handleFile = async (file: File) => {
    try {
      const snapshot = await beginImport(file);
      setImportState({ snapshot, error: null });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo leer el archivo";
      setImportState({ snapshot: null, error: message });
    }
  };

  const handleInputChange = (
    id: string,
    field: keyof HourlyRateRecord,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (field === "hourlyRateARS") {
      const numericValue = Number(event.target.value);
      updateRow(id, {
        hourlyRateARS: Number.isFinite(numericValue) ? numericValue : 0
      });
      return;
    }

    if (field === "vigenciaDesdeISO" || field === "vigenciaHastaISO") {
      const value = event.target.value;
      if (value === "") {
        updateRow(id, { [field]: null } as Partial<HourlyRateRecord>);
        return;
      }

      const validation = isoDateSchema.safeParse(value);
      if (!validation.success) {
        return;
      }

      updateRow(id, {
        [field]: value
      } as Partial<HourlyRateRecord>);
      return;
    }

    updateRow(id, { [field]: event.target.value } as Partial<HourlyRateRecord>);
  };

  const handleAddRow = () => {
    addRow();
  };

  const handleDuplicate = (id: string) => {
    duplicateRow(id);
  };

  const handleDelete = (id: string) => {
    deleteRow(id);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFile(file);
      event.target.value = "";
    }
  };

  const handleConfirmImport = () => {
    if (!importState.snapshot) {
      return;
    }

    confirmImport(importState.snapshot);
    setImportState({ snapshot: null, error: null });
  };

  const handleCancelImport = () => {
    setImportState({ snapshot: null, error: null });
  };

  const pendingItems = importState.snapshot?.items ?? [];

  const importSummary = useMemo(() => {
    if (!importState.snapshot) {
      return null;
    }

    const total = importState.snapshot.items.length;
    const active = importState.snapshot.items.filter(
      (item) => !item.vigenciaHastaISO
    ).length;
    return { total, active };
  }, [importState.snapshot]);

  useEffect(() => {
    const scrollContainer = tableScrollRef.current;
    if (!scrollContainer) {
      setIsOverflowing(false);
      return;
    }

    const updateMeasurements = () => {
      const container = tableScrollRef.current;
      if (!container) {
        return;
      }
      const hasOverflow = container.scrollWidth > container.clientWidth + 1;
      setIsOverflowing(hasOverflow);
      setScrollContentWidth(
        hasOverflow ? container.scrollWidth : container.clientWidth
      );
      if (!hasOverflow && stickyScrollRef.current) {
        stickyScrollRef.current.scrollLeft = 0;
      }
    };

    updateMeasurements();

    window.addEventListener("resize", updateMeasurements);
    if (typeof MutationObserver === "undefined") {
      return () => {
        window.removeEventListener("resize", updateMeasurements);
      };
    }

    const observer = new MutationObserver(updateMeasurements);
    observer.observe(scrollContainer, {
      attributes: true,
      childList: true,
      subtree: true
    });

    return () => {
      window.removeEventListener("resize", updateMeasurements);
      observer.disconnect();
    };
  }, [items.length]);

  useEffect(() => {
    if (!isOverflowing) {
      return;
    }

    const scrollContainer = tableScrollRef.current;
    const stickyContainer = stickyScrollRef.current;

    if (!scrollContainer || !stickyContainer) {
      return;
    }

    const handleTableScroll = () => {
      if (!stickyScrollRef.current) {
        return;
      }
      stickyScrollRef.current.scrollLeft = scrollContainer.scrollLeft;
    };

    const handleStickyScroll = () => {
      if (!tableScrollRef.current) {
        return;
      }
      tableScrollRef.current.scrollLeft = stickyContainer.scrollLeft;
    };

    scrollContainer.addEventListener("scroll", handleTableScroll);
    stickyContainer.addEventListener("scroll", handleStickyScroll);

    return () => {
      scrollContainer.removeEventListener("scroll", handleTableScroll);
      stickyContainer.removeEventListener("scroll", handleStickyScroll);
    };
  }, [isOverflowing]);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-md">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">
          Valores hora INTA
        </h2>
        <p className="text-sm text-slate-600">
          Gestioná los perfiles y tarifas hora vigentes. Los datos se guardan en
          este navegador y podés exportarlos para compartirlos.
        </p>
        <p className="text-xs font-medium text-slate-500">{syncLabel}</p>
      </header>

      <div className="relative">
        <div ref={tableScrollRef} className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Nombre del perfil</th>
                <th className="px-3 py-2">Valor hora (ARS)</th>
                <th className="px-3 py-2">Vigencia desde</th>
                <th className="px-3 py-2">Vigencia hasta</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-sm text-slate-500"
                  >
                    No hay perfiles cargados. Agregá uno nuevo.
                  </td>
                </tr>
              ) : null}
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.profileName}
                    onChange={(event) =>
                      handleInputChange(item.id, "profileName", event)
                    }
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.hourlyRateARS}
                    onChange={(event) =>
                      handleInputChange(item.id, "hourlyRateARS", event)
                    }
                    className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {formatCurrency(item.hourlyRateARS)}
                  </p>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="date"
                    value={item.vigenciaDesdeISO}
                    onChange={(event) =>
                      handleInputChange(item.id, "vigenciaDesdeISO", event)
                    }
                    className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="date"
                    value={item.vigenciaHastaISO ?? ""}
                    onChange={(event) =>
                      handleInputChange(item.id, "vigenciaHastaISO", event)
                    }
                    className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDuplicate(item.id)}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
                      >
                        Duplicar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isOverflowing ? (
          <div className="pointer-events-none sticky bottom-6 left-0 right-0 z-20">
            <div
              ref={stickyScrollRef}
              className="pointer-events-auto mx-auto h-4 w-full max-w-full overflow-x-auto rounded-full border border-slate-200 bg-white/90 shadow-md"
            >
              <div
                aria-hidden
                className="h-full"
                style={{ width: `${scrollContentWidth}px` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex items-center gap-2 rounded-lg bg-inta-blue px-3 py-2 text-sm font-medium text-white transition hover:bg-inta-blue/90"
        >
          <PlusIcon className="h-4 w-4" /> Agregar perfil
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportJson}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            <DownloadIcon className="h-4 w-4" /> Exportar JSON
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            <DownloadIcon className="h-4 w-4" /> Exportar CSV
          </button>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm text-slate-600">
        <header className="space-y-1">
          <h3 className="text-base font-semibold text-slate-800">Importar</h3>
          <p className="text-xs text-slate-500">
            Arrastrá un archivo JSON o CSV exportado desde esta herramienta o
            seleccionálo para previsualizarlo antes de reemplazar la tabla local.
          </p>
        </header>

        <label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white/70 px-4 py-6 text-center text-sm text-slate-500 transition hover:border-inta-blue hover:text-inta-blue"
        >
          <input type="file" accept=".json,.csv" onChange={handleFileChange} className="hidden" />
          <span className="font-medium text-slate-700">
            Arrastrá o hacé clic para seleccionar
          </span>
          <span className="text-xs text-slate-500">
            Se generará una vista previa antes de confirmar
          </span>
        </label>

        {importState.error ? (
          <p className="text-sm text-red-600">{importState.error}</p>
        ) : null}

        {importState.snapshot ? (
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              handleConfirmImport();
            }}
            className="space-y-3 rounded-lg border border-slate-200 bg-white/90 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <p>
                Fecha de exportación declarada:{" "}
                <span className="font-medium text-slate-700">
                  {importState.snapshot.exportedAtISO}
                </span>
              </p>
              {importSummary ? (
                <p>
                  {importSummary.total} perfiles — {importSummary.active} activos
                </p>
              ) : null}
            </div>
            <div className="max-h-48 overflow-auto rounded border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-100 text-left">
                  <tr>
                    <th className="px-2 py-1">Perfil</th>
                    <th className="px-2 py-1">Tarifa</th>
                    <th className="px-2 py-1">Desde</th>
                    <th className="px-2 py-1">Hasta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pendingItems.map((item) => (
                    <tr key={`${item.profileCode}-${item.vigenciaDesdeISO}`}>
                      <td className="px-2 py-1">{item.profileName}</td>
                      <td className="px-2 py-1">{formatCurrency(item.hourlyRateARS)}</td>
                      <td className="px-2 py-1">{item.vigenciaDesdeISO}</td>
                      <td className="px-2 py-1">{item.vigenciaHastaISO ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelImport}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-inta-blue px-3 py-2 text-xs font-semibold text-white transition hover:bg-inta-blue/90"
              >
                Confirmar importación
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </section>
  );
}
