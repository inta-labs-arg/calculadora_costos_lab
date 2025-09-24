"use client";

import { useMemo } from "react";
import type {
  LevelKey,
  SequentialPercentageLevelState
} from "@/lib/cost-calculation";
import { currencyFormatter } from "@/lib/cost-calculation";

interface SequentialPercentageLevelCardProps {
  level: SequentialPercentageLevelState;
  onChange: (updates: {
    base?: LevelKey[];
    steps?: Array<{ id: string; rate: number }>;
  }) => void;
  baseBreakdown: Array<{ id: LevelKey; name: string; subtotal: number }>;
  currentTotals: Record<LevelKey, number>;
}

export function SequentialPercentageLevelCard({
  level,
  onChange,
  baseBreakdown,
  currentTotals
}: SequentialPercentageLevelCardProps) {
  const baseValue = useMemo(
    () => level.base.reduce((acc, key) => acc + (currentTotals[key] ?? 0), 0),
    [currentTotals, level.base]
  );

  const selectedBaseBreakdown = useMemo(
    () =>
      baseBreakdown.filter((base) => level.base.includes(base.id)),
    [baseBreakdown, level.base]
  );

  const stepSummaries = useMemo(() => {
    let remaining = baseValue;

    return level.steps.map((step) => {
      const applicableBase =
        step.applyOn === "remaining" ? remaining : baseValue;
      const subtotal = (step.rate / 100) * applicableBase;

      if (step.applyOn === "remaining") {
        remaining -= subtotal;
      }

      return {
        ...step,
        applicableBase,
        subtotal
      };
    });
  }, [baseValue, level.steps]);

  const total = useMemo(
    () => stepSummaries.reduce((acc, item) => acc + item.subtotal, 0),
    [stepSummaries]
  );

  const handleToggleBase = (id: LevelKey) => {
    const set = new Set(level.base);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange({ base: Array.from(set) });
  };

  const handleRateChange = (id: string, value: string) => {
    const parsed = value === "" ? Number.NaN : Number(value);
    onChange({ steps: [{ id, rate: parsed }] });
  };

  return (
    <section className="space-y-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100 p-6 shadow-sm">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-amber-900">{level.name}</h2>
          <span className="text-lg font-bold text-inta-green">
            {currencyFormatter.format(total)}
          </span>
        </div>
        <p className="text-sm text-amber-800">{level.description}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-amber-200 bg-white/80 p-4 text-sm text-amber-800">
          <p className="mb-2 font-medium text-amber-900">Base considerada</p>
          {baseBreakdown.length === 0 ? (
            <p className="text-xs text-amber-700">
              Completa los niveles anteriores para habilitar esta distribución.
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {baseBreakdown.map((base) => {
                  const checked = level.base.includes(base.id);
                  return (
                    <li
                      key={base.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleBase(base.id)}
                          className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span>{base.name}</span>
                      </label>
                      <span className="font-medium text-amber-900">
                        {currencyFormatter.format(base.subtotal)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 border-t border-dashed border-amber-200 pt-2 text-xs text-amber-700">
                Total base seleccionado: {currencyFormatter.format(
                  selectedBaseBreakdown.reduce(
                    (acc, item) => acc + item.subtotal,
                    0
                  )
                )}
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-800">
          <p className="font-medium text-amber-900">Resumen de distribución</p>
          <dl className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <dt>Base total considerada</dt>
              <dd className="font-semibold text-amber-900">
                {currencyFormatter.format(baseValue)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Afectación total Nivel 4</dt>
              <dd className="font-semibold text-amber-900">
                {currencyFormatter.format(total)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-amber-700">
            El segundo porcentaje se aplica sobre el saldo restante luego de
            descontar el primero.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {stepSummaries.map((step) => (
          <div
            key={step.id}
            className="rounded-xl border border-amber-200 bg-white/85 p-4 text-sm text-amber-800"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-amber-900">
                {step.name}
              </h3>
              <span className="text-base font-bold text-inta-green">
                {currencyFormatter.format(step.subtotal)}
              </span>
            </div>
            <p className="text-xs text-amber-700">
              {step.applyOn === "remaining"
                ? "Aplicado sobre el saldo disponible tras la deducción previa."
                : "Aplicado sobre el total base seleccionado."}
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,_220px)_1fr] sm:items-center">
              <label className="flex flex-col space-y-1 text-xs font-medium text-amber-900">
                Porcentaje asignado
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={Number.isFinite(step.rate) ? step.rate : ""}
                  onChange={(event) =>
                    handleRateChange(step.id, event.target.value)
                  }
                  className="rounded-md border border-amber-300 px-3 py-2 text-sm text-amber-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </label>
              <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-700">
                <p>
                  Base considerada: {currencyFormatter.format(step.applicableBase)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
