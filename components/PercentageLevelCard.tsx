"use client";

import { useMemo } from "react";
import type { LevelKey, PercentageLevelState } from "@/lib/cost-calculation";
import { currencyFormatter } from "@/lib/cost-calculation";

interface PercentageLevelCardProps {
  level: PercentageLevelState;
  onChange: (data: { rate?: number; base?: LevelKey[] }) => void;
  baseBreakdown: Array<{ id: LevelKey; name: string; subtotal: number }>;
  currentTotals: Record<LevelKey, number>;
}

export function PercentageLevelCard({
  level,
  onChange,
  baseBreakdown,
  currentTotals
}: PercentageLevelCardProps) {
  const subtotal = useMemo(() => currentTotals[level.id] ?? 0, [currentTotals, level.id]);

  const handleRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    onChange({ rate: value });
  };

  const handleToggleBase = (id: LevelKey) => {
    const set = new Set(level.base);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange({ base: Array.from(set) });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-inta-blue">{level.name}</h2>
          <span className="text-lg font-bold text-inta-green">
            {currencyFormatter.format(subtotal)}
          </span>
        </div>
        <p className="text-sm text-slate-600">{level.description}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col space-y-2 text-sm text-slate-600">
          Porcentaje aplicado
          <input
            type="number"
            min={0}
            step="0.1"
            value={Number.isFinite(level.rate) ? level.rate : ""}
            onChange={handleRateChange}
            className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
          />
          <span className="text-xs text-slate-500">
            Define el porcentaje que se aplica sobre los niveles seleccionados.
          </span>
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
          <p className="mb-2 font-medium">Base considerada</p>
          {baseBreakdown.length === 0 ? (
            <p className="text-xs text-slate-500">
              Completa los niveles anteriores para habilitar esta distribución.
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {baseBreakdown.map((base) => {
                  const checked = level.base.includes(base.id);
                  return (
                    <li key={base.id} className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleBase(base.id)}
                          className="h-4 w-4 rounded border-slate-300 text-inta-blue focus:ring-inta-blue"
                        />
                        <span>{base.name}</span>
                      </label>
                      <span className="font-medium text-slate-700">
                        {currencyFormatter.format(base.subtotal)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 border-t border-dashed border-slate-300 pt-2 text-xs text-slate-500">
                Total base: {currencyFormatter.format(
                  baseBreakdown
                    .filter((base) => level.base.includes(base.id))
                    .reduce((acc, base) => acc + base.subtotal, 0)
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
