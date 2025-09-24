"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import type { CostItem, DirectLevelState } from "@/lib/cost-calculation";
import { currencyFormatter } from "@/lib/cost-calculation";
import { PlusIcon } from "./icons";

const itemSchema = z.object({
  concept: z.string().min(1, "Ingresa un concepto"),
  quantity: z
    .number({ invalid_type_error: "Ingresa la cantidad" })
    .nonnegative("La cantidad debe ser positiva"),
  unitCost: z
    .number({ invalid_type_error: "Ingresa el costo unitario" })
    .nonnegative("El costo debe ser positivo")
});

interface DirectLevelCardProps {
  level: DirectLevelState;
  onChange: (items: CostItem[]) => void;
}

export function DirectLevelCard({ level, onChange }: DirectLevelCardProps) {
  const [draft, setDraft] = useState({
    concept: "",
    quantity: "",
    unitCost: ""
  });
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(() => {
    return level.items.reduce(
      (acc, item) => acc + item.quantity * item.unitCost,
      0
    );
  }, [level.items]);

  const handleAddItem = () => {
    setError(null);

    if (draft.quantity === "" || draft.unitCost === "") {
      setError("Completa la cantidad y el costo unitario");
      return;
    }

    const quantity = Number(draft.quantity);
    const unitCost = Number(draft.unitCost);

    if (Number.isNaN(quantity) || Number.isNaN(unitCost)) {
      setError("Utiliza valores numéricos válidos");
      return;
    }

    const parsed = itemSchema.safeParse({
      concept: draft.concept.trim(),
      quantity,
      unitCost
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Datos inválidos";
      setError(message);
      return;
    }

    const newItem: CostItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      concept: parsed.data.concept,
      quantity: parsed.data.quantity,
      unitCost: parsed.data.unitCost,
      unitLabel: level.unitLabel
    };

    onChange([...level.items, newItem]);
    setDraft({ concept: "", quantity: "", unitCost: "" });
  };

  const handleFieldChange = (id: string, field: keyof CostItem, value: string) => {
    const updated = level.items.map((item) =>
      item.id === id
        ? {
            ...item,
            [field]: field === "concept" ? value : Number(value)
          }
        : item
    );
    onChange(updated);
  };

  const handleDelete = (id: string) => {
    onChange(level.items.filter((item) => item.id !== id));
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

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-slate-700">Concepto</th>
              <th className="px-3 py-2 font-medium text-slate-700">Cantidad</th>
              <th className="px-3 py-2 font-medium text-slate-700">Costo unitario</th>
              <th className="px-3 py-2 font-medium text-slate-700">Subtotal</th>
              <th className="px-3 py-2 font-medium text-slate-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {level.items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-slate-500"
                >
                  Aún no hay registros. Completa el formulario inferior para sumar
                  conceptos a este nivel.
                </td>
              </tr>
            ) : null}
            {level.items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.concept}
                    onChange={(event) =>
                      handleFieldChange(item.id, "concept", event.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={item.quantity}
                    min={0}
                    step="0.01"
                    onChange={(event) =>
                      handleFieldChange(item.id, "quantity", event.target.value)
                    }
                    className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                  <p className="mt-1 text-xs text-slate-500">{item.unitLabel}</p>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={item.unitCost}
                    min={0}
                    step="0.01"
                    onChange={(event) =>
                      handleFieldChange(item.id, "unitCost", event.target.value)
                    }
                    className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {currencyFormatter.format(item.quantity * item.unitCost)}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-4">
        <h3 className="text-sm font-semibold text-slate-700">
          Agregar un nuevo concepto
        </h3>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="flex flex-col text-sm text-slate-600">
            Concepto
            <input
              type="text"
              value={draft.concept}
              onChange={(event) => setDraft((d) => ({ ...d, concept: event.target.value }))}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Ej. Bioquímico, Reactivo X"
            />
          </label>
          <label className="flex flex-col text-sm text-slate-600">
            Cantidad
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.quantity}
              onChange={(event) => setDraft((d) => ({ ...d, quantity: event.target.value }))}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Horas, unidades"
            />
            <span className="mt-1 text-xs text-slate-500">{level.unitLabel}</span>
          </label>
          <label className="flex flex-col text-sm text-slate-600">
            Costo unitario (ARS)
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.unitCost}
              onChange={(event) => setDraft((d) => ({ ...d, unitCost: event.target.value }))}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Valor en ARS"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-inta-blue px-3 py-2 text-sm font-medium text-white transition hover:bg-inta-blue/90"
            >
              <PlusIcon className="h-4 w-4" /> Agregar
            </button>
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </section>
  );
}
