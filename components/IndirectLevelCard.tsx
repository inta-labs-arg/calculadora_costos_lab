"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  IndirectLevelGroupState,
  IndirectSublevelState,
  IndirectEquipmentItem,
  IndirectEquipmentSublevelState,
  SharedResourceCostItem,
  SharedResourceSublevelState,
  calculateIndirectSublevelSubtotal,
  calculateIndirectEquipmentItemCost,
  calculateSharedResourceItemCost,
  currencyFormatter
} from "@/lib/cost-calculation";
import { ManualOverrideIcon, PlusIcon } from "./icons";

interface IndirectLevelCardProps {
  level: IndirectLevelGroupState;
  onSublevelChange: (sublevel: IndirectSublevelState) => void;
  globalDeterminations: number;
}

const sharedResourceSchema = z.object({
  concept: z.string().min(1, "Ingresa un concepto"),
  monthlyCost: z
    .number({ invalid_type_error: "Ingresa el costo mensual" })
    .nonnegative("El costo mensual debe ser mayor o igual a cero"),
  determinations: z
    .number({
      invalid_type_error: "Ingresa la cantidad de determinaciones"
    })
    .gt(0, "Las determinaciones deben ser mayores a cero")
});

const indirectEquipmentSchema = z.object({
  name: z.string().min(1, "Ingresa el nombre del equipo"),
  purchasePrice: z
    .number({ invalid_type_error: "Ingresa el precio de compra" })
    .nonnegative("El precio debe ser mayor o igual a cero"),
  usefulLifeMonths: z
    .number({
      invalid_type_error: "Ingresa la vida útil en meses"
    })
    .gt(0, "La vida útil debe ser mayor a cero"),
  determinations: z
    .number({ invalid_type_error: "Ingresa las determinaciones mensuales" })
    .gt(0, "Las determinaciones deben ser mayores a cero")
});

type SublevelAppearance = {
  container: string;
  header: string;
  description: string;
  tableHead: string;
  form: string;
  badge: string;
};

const indirectSublevelAppearances: SublevelAppearance[] = [
  {
    container: "border-emerald-200 bg-emerald-50/90",
    header: "text-emerald-900",
    description: "text-emerald-700",
    tableHead: "bg-emerald-100/80 text-emerald-900",
    form: "border-emerald-200 bg-white/85 text-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
  },
  {
    container: "border-teal-200 bg-teal-50/90",
    header: "text-teal-900",
    description: "text-teal-700",
    tableHead: "bg-teal-100/80 text-teal-900",
    form: "border-teal-200 bg-white/85 text-teal-800",
    badge: "bg-teal-100 text-teal-700 hover:bg-teal-200"
  },
  {
    container: "border-lime-200 bg-lime-50/90",
    header: "text-lime-900",
    description: "text-lime-700",
    tableHead: "bg-lime-100/80 text-lime-900",
    form: "border-lime-200 bg-white/85 text-lime-800",
    badge: "bg-lime-100 text-lime-700 hover:bg-lime-200"
  },
  {
    container: "border-amber-200 bg-amber-50/90",
    header: "text-amber-900",
    description: "text-amber-700",
    tableHead: "bg-amber-100/80 text-amber-900",
    form: "border-amber-200 bg-white/85 text-amber-800",
    badge: "bg-amber-100 text-amber-700 hover:bg-amber-200"
  }
];

const levelTwoSublevels = new Set<IndirectSublevelState["id"]>([
  "materialesNoDescartables",
  "equipamientoMenor",
  "mantenimientoEquipamiento",
  "infraestructura"
]);

export function IndirectLevelCard({
  level,
  onSublevelChange,
  globalDeterminations
}: IndirectLevelCardProps) {
  const breakdown = useMemo(
    () =>
      level.sublevels.map((sublevel) => ({
        id: sublevel.id,
        name: sublevel.name,
        subtotal: calculateIndirectSublevelSubtotal(sublevel)
      })),
    [level]
  );

  const total = useMemo(
    () => breakdown.reduce((acc, item) => acc + item.subtotal, 0),
    [breakdown]
  );

  return (
    <section className="space-y-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-100 p-6 shadow-sm">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-emerald-900">{level.name}</h2>
          <span className="text-lg font-bold text-inta-green">
            {currencyFormatter.format(total)}
          </span>
        </div>
        <p className="text-sm text-emerald-800">{level.description}</p>
        <ul className="flex flex-wrap gap-3 text-xs text-emerald-700">
          {breakdown.map((item) => (
            <li key={item.id} className="flex items-center gap-1">
              <span className="font-medium text-emerald-800">{item.name}:</span>
              <span>{currencyFormatter.format(item.subtotal)}</span>
            </li>
          ))}
        </ul>
      </header>

      <div className="space-y-8">
        {level.sublevels.map((sublevel, index) => {
          const appearance =
            indirectSublevelAppearances[
              index % indirectSublevelAppearances.length
            ];

          const useGlobalDeterminations =
            level.id === "serviciosGenerales" &&
            levelTwoSublevels.has(sublevel.id);

          if (sublevel.type === "shared-resource") {
            return (
              <SharedResourceSublevelSection
                key={sublevel.id}
                sublevel={sublevel}
                onChange={onSublevelChange}
                appearance={appearance}
                globalDeterminations={globalDeterminations}
                useGlobalDeterminations={useGlobalDeterminations}
              />
            );
          }

          return (
            <IndirectEquipmentSublevelSection
              key={sublevel.id}
              sublevel={sublevel}
              onChange={onSublevelChange}
              appearance={appearance}
              globalDeterminations={globalDeterminations}
              useGlobalDeterminations={useGlobalDeterminations}
            />
          );
        })}

        <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
          <header className="flex flex-wrap items-center justify-between gap-2 text-emerald-900">
            <h3 className="text-lg font-semibold">
              Subtotal de {level.name}
            </h3>
            <span className="text-base font-semibold text-inta-green">
              {currencyFormatter.format(total)}
            </span>
          </header>

          {level.id === "serviciosGenerales" ? (
            <p className="text-sm text-emerald-800">
              Base global de prorrateo (DM): {globalDeterminations}
              {" "}
              determinaciones/mes
            </p>
          ) : null}

          <dl className="grid gap-2 text-sm text-emerald-800 sm:grid-cols-2">
            {breakdown.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4">
                <dt className="font-medium text-emerald-900">{item.name}</dt>
                <dd>{currencyFormatter.format(item.subtotal)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </section>
  );
}

interface SharedResourceSublevelSectionProps {
  sublevel: SharedResourceSublevelState;
  onChange: (updated: SharedResourceSublevelState) => void;
  appearance: SublevelAppearance;
  globalDeterminations: number;
  useGlobalDeterminations: boolean;
}

function SharedResourceSublevelSection({
  sublevel,
  onChange,
  appearance,
  globalDeterminations,
  useGlobalDeterminations
}: SharedResourceSublevelSectionProps) {
  const subtotal = useMemo(
    () => calculateIndirectSublevelSubtotal(sublevel),
    [sublevel]
  );
  const [draft, setDraft] = useState({
    concept: "",
    monthlyCost: "",
    determinations: useGlobalDeterminations
      ? globalDeterminations.toString()
      : ""
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!useGlobalDeterminations) {
      return;
    }

    setDraft((prev) => ({
      ...prev,
      determinations: globalDeterminations.toString()
    }));
  }, [globalDeterminations, useGlobalDeterminations]);

  const handleAdd = () => {
    setError(null);

    if (draft.monthlyCost === "" || draft.determinations === "") {
      setError("Completa el costo mensual y las determinaciones");
      return;
    }

    const parsed = sharedResourceSchema.safeParse({
      concept: draft.concept.trim(),
      monthlyCost: Number(draft.monthlyCost),
      determinations: Number(draft.determinations)
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    const newItem: SharedResourceCostItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...parsed.data,
      isCustomDeterminations: useGlobalDeterminations
        ? parsed.data.determinations !== globalDeterminations
        : undefined
    };

    onChange({ ...sublevel, items: [...sublevel.items, newItem] });
    setDraft({
      concept: "",
      monthlyCost: "",
      determinations: useGlobalDeterminations
        ? globalDeterminations.toString()
        : ""
    });
  };

  const handleFieldChange = (
    id: string,
    field: keyof SharedResourceCostItem,
    value: string
  ) => {
    const updated = sublevel.items.map((item) => {
      if (item.id !== id) {
        return item;
      }

      if (field === "concept") {
        return { ...item, concept: value };
      }

      const numericValue = Number(value);

      if (Number.isNaN(numericValue) || numericValue <= 0) {
        return item;
      }

      if (field === "determinations") {
        return {
          ...item,
          determinations: numericValue,
          isCustomDeterminations: useGlobalDeterminations
            ? numericValue !== globalDeterminations
            : undefined
        };
      }

      return {
        ...item,
        [field]: numericValue
      };
    });
    onChange({ ...sublevel, items: updated });
  };

  const handleDelete = (id: string) => {
    onChange({
      ...sublevel,
      items: sublevel.items.filter((item) => item.id !== id)
    });
  };

  return (
    <section
      className={`space-y-3 rounded-xl border p-4 ${appearance.container}`}
    >
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${appearance.header}`}>
            {sublevel.name}
          </h3>
          <span className="text-base font-semibold text-inta-green">
            {currencyFormatter.format(subtotal)}
          </span>
        </div>
        <p className={`text-sm ${appearance.description}`}>
          {sublevel.description}
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className={`${appearance.tableHead} text-left`}>
            <tr>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Concepto
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Costo mensual (ARS)
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Determinaciones mensuales
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Costo unitario
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sublevel.items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm text-slate-500"
                >
                  Aún no hay registros. Completa el formulario inferior para sumar
                  conceptos a este subnivel.
                </td>
              </tr>
            ) : null}
            {sublevel.items.map((item) => (
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
                    min={0}
                    step="0.01"
                    value={item.monthlyCost}
                    onChange={(event) =>
                      handleFieldChange(item.id, "monthlyCost", event.target.value)
                    }
                    className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={item.determinations}
                      onChange={(event) =>
                        handleFieldChange(
                          item.id,
                          "determinations",
                          event.target.value
                        )
                      }
                      className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                    />
                    {useGlobalDeterminations && item.isCustomDeterminations ? (
                      <ManualOverrideIcon
                        className="h-4 w-4 text-amber-500"
                        aria-label="Valor personalizado"
                        title="Valor personalizado"
                      />
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-slate-700">
                  {currencyFormatter.format(
                    calculateSharedResourceItemCost(item)
                  )}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-sm font-medium text-rose-600 hover:text-rose-500"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className={`grid gap-3 rounded-lg border border-dashed p-4 text-sm md:grid-cols-4 ${appearance.form}`}
        onSubmit={(event) => {
          event.preventDefault();
          handleAdd();
        }}
      >
        <label className="flex flex-col space-y-1 md:col-span-2">
          <span>Concepto</span>
          <input
            type="text"
            value={draft.concept}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, concept: event.target.value }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
          />
        </label>
        <label className="flex flex-col space-y-1">
          <span>Costo mensual (ARS)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={draft.monthlyCost}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, monthlyCost: event.target.value }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
          />
        </label>
        <label className="flex flex-col space-y-1">
          <span>Determinaciones mensuales</span>
          <input
            type="number"
            min={1}
            step="1"
            value={draft.determinations}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                determinations: event.target.value
              }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
          />
        </label>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-md bg-inta-blue px-3 py-2 text-sm font-medium text-white transition hover:bg-inta-blue/90"
        >
          <PlusIcon className="h-4 w-4" />
          Agregar
        </button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}

interface IndirectEquipmentSectionProps {
  sublevel: IndirectEquipmentSublevelState;
  onChange: (updated: IndirectEquipmentSublevelState) => void;
  appearance: SublevelAppearance;
  globalDeterminations: number;
  useGlobalDeterminations: boolean;
}

function IndirectEquipmentSublevelSection({
  sublevel,
  onChange,
  appearance,
  globalDeterminations,
  useGlobalDeterminations
}: IndirectEquipmentSectionProps) {
  const subtotal = useMemo(
    () => calculateIndirectSublevelSubtotal(sublevel),
    [sublevel]
  );
  const [draft, setDraft] = useState({
    name: "",
    purchasePrice: "",
    usefulLifeMonths: "",
    determinations: useGlobalDeterminations
      ? globalDeterminations.toString()
      : ""
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!useGlobalDeterminations) {
      return;
    }

    setDraft((prev) => ({
      ...prev,
      determinations: globalDeterminations.toString()
    }));
  }, [globalDeterminations, useGlobalDeterminations]);

  const handleAdd = () => {
    setError(null);

    if (
      draft.purchasePrice === "" ||
      draft.usefulLifeMonths === "" ||
      draft.determinations === ""
    ) {
      setError("Completa el precio, la vida útil y las determinaciones");
      return;
    }

    const parsed = indirectEquipmentSchema.safeParse({
      name: draft.name.trim(),
      purchasePrice: Number(draft.purchasePrice),
      usefulLifeMonths: Number(draft.usefulLifeMonths),
      determinations: Number(draft.determinations)
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    const newItem: IndirectEquipmentItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...parsed.data,
      isCustomDeterminations: useGlobalDeterminations
        ? parsed.data.determinations !== globalDeterminations
        : undefined
    };

    onChange({ ...sublevel, items: [...sublevel.items, newItem] });
    setDraft({
      name: "",
      purchasePrice: "",
      usefulLifeMonths: "",
      determinations: useGlobalDeterminations
        ? globalDeterminations.toString()
        : ""
    });
  };

  const handleFieldChange = (
    id: string,
    field: keyof IndirectEquipmentItem,
    value: string
  ) => {
    const updated = sublevel.items.map((item) => {
      if (item.id !== id) {
        return item;
      }

      if (field === "name") {
        return { ...item, name: value };
      }

      const numericValue = Number(value);

      if (Number.isNaN(numericValue) || numericValue <= 0) {
        return item;
      }

      if (field === "determinations") {
        return {
          ...item,
          determinations: numericValue,
          isCustomDeterminations: useGlobalDeterminations
            ? numericValue !== globalDeterminations
            : undefined
        };
      }

      return {
        ...item,
        [field]: numericValue
      };
    });
    onChange({ ...sublevel, items: updated });
  };

  const handleDelete = (id: string) => {
    onChange({
      ...sublevel,
      items: sublevel.items.filter((item) => item.id !== id)
    });
  };

  return (
    <section
      className={`space-y-3 rounded-xl border p-4 ${appearance.container}`}
    >
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${appearance.header}`}>
            {sublevel.name}
          </h3>
          <span className="text-base font-semibold text-inta-green">
            {currencyFormatter.format(subtotal)}
          </span>
        </div>
        <p className={`text-sm ${appearance.description}`}>
          {sublevel.description}
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className={`${appearance.tableHead} text-left`}>
            <tr>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Equipamiento menor
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Precio de compra (ARS)
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Vida útil (meses)
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Determinaciones mensuales
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Costo unitario
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sublevel.items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-sm text-slate-500"
                >
                  Aún no hay registros. Completa el formulario inferior para sumar
                  equipos menores.
                </td>
              </tr>
            ) : null}
            {sublevel.items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(event) =>
                      handleFieldChange(item.id, "name", event.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.purchasePrice}
                    onChange={(event) =>
                      handleFieldChange(
                        item.id,
                        "purchasePrice",
                        event.target.value
                      )
                    }
                    className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={item.usefulLifeMonths}
                    onChange={(event) =>
                      handleFieldChange(
                        item.id,
                        "usefulLifeMonths",
                        event.target.value
                      )
                    }
                    className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={item.determinations}
                      onChange={(event) =>
                        handleFieldChange(
                          item.id,
                          "determinations",
                          event.target.value
                        )
                      }
                      className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                    />
                    {useGlobalDeterminations && item.isCustomDeterminations ? (
                      <ManualOverrideIcon
                        className="h-4 w-4 text-amber-500"
                        aria-label="Valor personalizado"
                        title="Valor personalizado"
                      />
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-slate-700">
                  {currencyFormatter.format(
                    calculateIndirectEquipmentItemCost(item)
                  )}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-sm font-medium text-rose-600 hover:text-rose-500"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className={`grid gap-3 rounded-lg border border-dashed p-4 text-sm md:grid-cols-5 ${appearance.form}`}
        onSubmit={(event) => {
          event.preventDefault();
          handleAdd();
        }}
      >
        <label className="flex flex-col space-y-1 md:col-span-2">
          <span>Equipamiento menor</span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, name: event.target.value }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
          />
        </label>
        <label className="flex flex-col space-y-1">
          <span>Precio de compra (ARS)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={draft.purchasePrice}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                purchasePrice: event.target.value
              }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
          />
        </label>
        <label className="flex flex-col space-y-1">
          <span>Vida útil (meses)</span>
          <input
            type="number"
            min={0}
            step="1"
            value={draft.usefulLifeMonths}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                usefulLifeMonths: event.target.value
              }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
          />
        </label>
        <label className="flex flex-col space-y-1">
          <span>Determinaciones mensuales</span>
          <input
            type="number"
            min={1}
            step="1"
            value={draft.determinations}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                determinations: event.target.value
              }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
          />
        </label>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-md bg-inta-blue px-3 py-2 text-sm font-medium text-white transition hover:bg-inta-blue/90"
        >
          <PlusIcon className="h-4 w-4" />
          Agregar
        </button>
      </form>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}
