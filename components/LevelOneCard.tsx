"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import {
  DirectLevelGroupState,
  EquipmentCostItem,
  EquipmentSublevelState,
  LaborCostItem,
  LaborSublevelState,
  SupplyCostItem,
  SupplySublevelState,
  SublevelState,
  calculateEquipmentItemCost,
  calculateSublevelSubtotal,
  calculateSupplyItemCost,
  calculateLaborItemCost,
  currencyFormatter
} from "@/lib/cost-calculation";
import { PlusIcon } from "./icons";

interface LevelOneCardProps {
  level: DirectLevelGroupState;
  onSublevelChange: (sublevel: SublevelState) => void;
}

const supplySchema = z.object({
  item: z.string().min(1, "Ingresa el nombre del insumo"),
  unitOfMeasure: z.string().min(1, "Indica la unidad de medida"),
  quantity: z
    .number({ invalid_type_error: "Indica la cantidad utilizada" })
    .nonnegative("La cantidad debe ser mayor o igual a cero"),
  unitCost: z
    .number({ invalid_type_error: "Indica el costo unitario" })
    .nonnegative("El costo debe ser mayor o igual a cero"),
  currency: z.string().min(1, "Indica la moneda de referencia")
});

const equipmentSchema = z.object({
  name: z.string().min(1, "Identifica el equipamiento"),
  model: z.string().min(1, "Detalla el modelo o referencia"),
  usefulLifeDeterminations: z
    .number({
      invalid_type_error: "Ingresa la cantidad de determinaciones de vida útil"
    })
    .gt(0, "La vida útil debe ser mayor a cero"),
  purchasePrice: z
    .number({ invalid_type_error: "Indica el precio de compra" })
    .nonnegative("El precio debe ser mayor o igual a cero"),
  calibrationCost: z
    .number({ invalid_type_error: "Indica el costo de calibración" })
    .nonnegative("El costo debe ser mayor o igual a cero"),
  calibrationPeriodDeterminations: z
    .number({
      invalid_type_error:
        "Indica la cantidad de determinaciones en el período de calibración"
    })
    .gt(0, "Las determinaciones del período deben ser mayores a cero")
});

export function LevelOneCard({ level, onSublevelChange }: LevelOneCardProps) {
  const breakdown = useMemo(
    () =>
      level.sublevels.map((sublevel) => ({
        id: sublevel.id,
        name: sublevel.name,
        subtotal: calculateSublevelSubtotal(sublevel)
      })),
    [level]
  );

  const total = useMemo(
    () => breakdown.reduce((acc, item) => acc + item.subtotal, 0),
    [breakdown]
  );

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-inta-blue">
            {level.name}
          </h2>
          <span className="text-lg font-bold text-inta-green">
            {currencyFormatter.format(total)}
          </span>
        </div>
        <p className="text-sm text-slate-600">{level.description}</p>
        <ul className="flex flex-wrap gap-3 text-xs text-slate-500">
          {breakdown.map((item) => (
            <li key={item.id} className="flex items-center gap-1">
              <span className="font-medium text-slate-700">{item.name}:</span>
              <span>{currencyFormatter.format(item.subtotal)}</span>
            </li>
          ))}
        </ul>
      </header>

      <div className="space-y-8">
        {level.sublevels.map((sublevel) => {
          if (sublevel.type === "insumos") {
            return (
              <SupplySublevelSection
                key={sublevel.id}
                sublevel={sublevel}
                onChange={onSublevelChange}
              />
            );
          }

          if (sublevel.type === "manoObra") {
            return (
              <LaborSublevelSection
                key={sublevel.id}
                sublevel={sublevel}
                onChange={onSublevelChange}
              />
            );
          }

          return (
            <EquipmentSublevelSection
              key={sublevel.id}
              sublevel={sublevel}
              onChange={onSublevelChange}
            />
          );
        })}
      </div>
    </section>
  );
}

interface SublevelSectionProps<T extends SublevelState> {
  sublevel: T;
  onChange: (updated: T) => void;
}

function SupplySublevelSection({
  sublevel,
  onChange
}: SublevelSectionProps<SupplySublevelState>) {
  const subtotal = useMemo(
    () => calculateSublevelSubtotal(sublevel),
    [sublevel]
  );
  const [draft, setDraft] = useState({
    item: "",
    unitOfMeasure: "",
    quantity: "",
    unitCost: "",
    currency: "ARS"
  });
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    setError(null);

    if (draft.quantity === "" || draft.unitCost === "") {
      setError("Completa la cantidad y el costo unitario");
      return;
    }

    const parsed = supplySchema.safeParse({
      item: draft.item.trim(),
      unitOfMeasure: draft.unitOfMeasure.trim(),
      quantity: Number(draft.quantity),
      unitCost: Number(draft.unitCost),
      currency: draft.currency.trim().toUpperCase()
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    const newItem: SupplyCostItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...parsed.data
    };

    onChange({ ...sublevel, items: [...sublevel.items, newItem] });
    setDraft({ item: "", unitOfMeasure: "", quantity: "", unitCost: "", currency: "ARS" });
  };

  const handleItemChange = <K extends keyof SupplyCostItem>(
    id: string,
    field: K,
    value: string
  ) => {
    const updatedItems = sublevel.items.map((item) => {
      if (item.id !== id) {
        return item;
      }

      if (field === "quantity" || field === "unitCost") {
        const numericValue = Number(value);
        return {
          ...item,
          [field]: Number.isNaN(numericValue) ? 0 : numericValue
        };
      }

      return {
        ...item,
        [field]: field === "currency" ? value.toUpperCase() : value
      };
    });

    onChange({ ...sublevel, items: updatedItems });
  };

  const handleDelete = (id: string) => {
    onChange({ ...sublevel, items: sublevel.items.filter((item) => item.id !== id) });
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            {sublevel.name}
          </h3>
          <p className="text-sm text-slate-600">{sublevel.description}</p>
        </div>
        <span className="text-base font-semibold text-inta-green">
          {currencyFormatter.format(subtotal)}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-slate-700">Ítem</th>
              <th className="px-3 py-2 font-medium text-slate-700">Unidad de medida</th>
              <th className="px-3 py-2 font-medium text-slate-700">
                Cantidad por determinación
              </th>
              <th className="px-3 py-2 font-medium text-slate-700">Costo unitario</th>
              <th className="px-3 py-2 font-medium text-slate-700">Costo por muestra</th>
              <th className="px-3 py-2 font-medium text-slate-700">Moneda</th>
              <th className="px-3 py-2 font-medium text-slate-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sublevel.items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-sm text-slate-500"
                >
                  Detalla cada insumo consumido por muestra para proyectar el costo.
                </td>
              </tr>
            ) : null}
            {sublevel.items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.item}
                    onChange={(event) =>
                      handleItemChange(item.id, "item", event.target.value)
                    }
                    className="w-52 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.unitOfMeasure}
                    onChange={(event) =>
                      handleItemChange(
                        item.id,
                        "unitOfMeasure",
                        event.target.value
                      )
                    }
                    className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.001"
                    value={item.quantity}
                    onChange={(event) =>
                      handleItemChange(item.id, "quantity", event.target.value)
                    }
                    className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitCost}
                    onChange={(event) =>
                      handleItemChange(item.id, "unitCost", event.target.value)
                    }
                    className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {currencyFormatter.format(calculateSupplyItemCost(item))}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.currency}
                    onChange={(event) =>
                      handleItemChange(item.id, "currency", event.target.value)
                    }
                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm uppercase focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
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
        <h4 className="text-sm font-semibold text-slate-700">
          Agregar un nuevo insumo directo
        </h4>
        <div className="grid gap-3 md:grid-cols-5">
          <label className="flex flex-col text-sm text-slate-600">
            Ítem
            <input
              type="text"
              value={draft.item}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, item: event.target.value }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Ej. Reactivo, filtro, vial"
            />
          </label>
          <label className="flex flex-col text-sm text-slate-600">
            Unidad de medida
            <input
              type="text"
              value={draft.unitOfMeasure}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, unitOfMeasure: event.target.value }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Litros, gramos, unidades"
            />
          </label>
          <label className="flex flex-col text-sm text-slate-600">
            Cantidad por determinación
            <input
              type="number"
              min={0}
              step="0.001"
              value={draft.quantity}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, quantity: event.target.value }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Ej. 0,25"
            />
          </label>
          <label className="flex flex-col text-sm text-slate-600">
            Costo unitario (ARS)
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.unitCost}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, unitCost: event.target.value }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Valor de referencia"
            />
          </label>
          <label className="flex flex-col text-sm text-slate-600">
            Moneda
            <input
              type="text"
              value={draft.currency}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, currency: event.target.value }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 uppercase focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="ARS, USD"
            />
          </label>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-inta-blue px-3 py-2 text-sm font-medium text-white transition hover:bg-inta-blue/90"
          >
            <PlusIcon className="h-4 w-4" /> Agregar insumo
          </button>
        </div>
      </div>
    </section>
  );
}

function LaborSublevelSection({
  sublevel,
  onChange
}: SublevelSectionProps<LaborSublevelState>) {
  const subtotal = useMemo(
    () => calculateSublevelSubtotal(sublevel),
    [sublevel]
  );

  const handleItemChange = (
    id: string,
    field: keyof Pick<LaborCostItem, "hours" | "rate">,
    value: string
  ) => {
    const numericValue = Number(value);
    const updatedItems = sublevel.items.map((item) =>
      item.id === id
        ? {
            ...item,
            [field]: Number.isNaN(numericValue) ? 0 : numericValue
          }
        : item
    );
    onChange({ ...sublevel, items: updatedItems });
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            {sublevel.name}
          </h3>
          <p className="text-sm text-slate-600">{sublevel.description}</p>
        </div>
        <span className="text-base font-semibold text-inta-green">
          {currencyFormatter.format(subtotal)}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-slate-700">Perfil</th>
              <th className="px-3 py-2 font-medium text-slate-700">
                Horas por determinación
              </th>
              <th className="px-3 py-2 font-medium text-slate-700">
                Valor por hora/día
              </th>
              <th className="px-3 py-2 font-medium text-slate-700">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sublevel.items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2 font-medium text-slate-700">
                  {item.label}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.25"
                    value={item.hours}
                    onChange={(event) =>
                      handleItemChange(item.id, "hours", event.target.value)
                    }
                    className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.rate}
                    onChange={(event) =>
                      handleItemChange(item.id, "rate", event.target.value)
                    }
                    className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {currencyFormatter.format(calculateLaborItemCost(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Considera el tiempo efectivo dedicado a la práctica por cada perfil.
        Si alguno de los roles no participa, deja el valor en cero.
      </p>
    </section>
  );
}

function EquipmentSublevelSection({
  sublevel,
  onChange
}: SublevelSectionProps<EquipmentSublevelState>) {
  const subtotal = useMemo(
    () => calculateSublevelSubtotal(sublevel),
    [sublevel]
  );
  const [draft, setDraft] = useState({
    name: "",
    model: "",
    usefulLifeDeterminations: "",
    purchasePrice: "",
    calibrationCost: "",
    calibrationPeriodDeterminations: ""
  });
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    setError(null);

    if (
      draft.usefulLifeDeterminations === "" ||
      draft.purchasePrice === "" ||
      draft.calibrationPeriodDeterminations === ""
    ) {
      setError("Completa los datos principales del equipamiento");
      return;
    }

    const parsed = equipmentSchema.safeParse({
      name: draft.name.trim(),
      model: draft.model.trim(),
      usefulLifeDeterminations: Number(draft.usefulLifeDeterminations),
      purchasePrice: Number(draft.purchasePrice),
      calibrationCost: draft.calibrationCost === "" ? 0 : Number(draft.calibrationCost),
      calibrationPeriodDeterminations: Number(
        draft.calibrationPeriodDeterminations
      )
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    const newItem: EquipmentCostItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...parsed.data
    };

    onChange({ ...sublevel, items: [...sublevel.items, newItem] });
    setDraft({
      name: "",
      model: "",
      usefulLifeDeterminations: "",
      purchasePrice: "",
      calibrationCost: "",
      calibrationPeriodDeterminations: ""
    });
  };

  const handleItemChange = <K extends keyof EquipmentCostItem>(
    id: string,
    field: K,
    value: string
  ) => {
    const updatedItems = sublevel.items.map((item) => {
      if (item.id !== id) {
        return item;
      }

      if (
        field === "usefulLifeDeterminations" ||
        field === "purchasePrice" ||
        field === "calibrationCost" ||
        field === "calibrationPeriodDeterminations"
      ) {
        const numericValue = Number(value);
        return {
          ...item,
          [field]: Number.isNaN(numericValue) ? 0 : numericValue
        };
      }

      return { ...item, [field]: value };
    });

    onChange({ ...sublevel, items: updatedItems });
  };

  const handleDelete = (id: string) => {
    onChange({ ...sublevel, items: sublevel.items.filter((item) => item.id !== id) });
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            {sublevel.name}
          </h3>
          <p className="text-sm text-slate-600">{sublevel.description}</p>
        </div>
        <span className="text-base font-semibold text-inta-green">
          {currencyFormatter.format(subtotal)}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-slate-700">Equipo</th>
              <th className="px-3 py-2 font-medium text-slate-700">Modelo / referencia</th>
              <th className="px-3 py-2 font-medium text-slate-700">
                Vida útil (determinaciones)
              </th>
              <th className="px-3 py-2 font-medium text-slate-700">Precio de compra</th>
              <th className="px-3 py-2 font-medium text-slate-700">Costo de calibración</th>
              <th className="px-3 py-2 font-medium text-slate-700">
                Determinaciones por período de calibración
              </th>
              <th className="px-3 py-2 font-medium text-slate-700">
                Costo por determinación
              </th>
              <th className="px-3 py-2 font-medium text-slate-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sublevel.items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-sm text-slate-500"
                >
                  Carga cada equipo utilizado para distribuir su depreciación y calibración en el análisis.
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
                      handleItemChange(item.id, "name", event.target.value)
                    }
                    className="w-48 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.model}
                    onChange={(event) =>
                      handleItemChange(item.id, "model", event.target.value)
                    }
                    className="w-44 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={item.usefulLifeDeterminations}
                    onChange={(event) =>
                      handleItemChange(
                        item.id,
                        "usefulLifeDeterminations",
                        event.target.value
                      )
                    }
                    className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.purchasePrice}
                    onChange={(event) =>
                      handleItemChange(item.id, "purchasePrice", event.target.value)
                    }
                    className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.calibrationCost}
                    onChange={(event) =>
                      handleItemChange(item.id, "calibrationCost", event.target.value)
                    }
                    className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={item.calibrationPeriodDeterminations}
                    onChange={(event) =>
                      handleItemChange(
                        item.id,
                        "calibrationPeriodDeterminations",
                        event.target.value
                      )
                    }
                    className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {currencyFormatter.format(calculateEquipmentItemCost(item))}
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
        <h4 className="text-sm font-semibold text-slate-700">
          Agregar equipamiento específico
        </h4>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col text-sm text-slate-600">
            Equipo
            <input
              type="text"
              value={draft.name}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, name: event.target.value }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Ej. Cromatógrafo"
            />
          </label>
          <label className="flex flex-col text-sm text-slate-600">
            Modelo / referencia
            <input
              type="text"
              value={draft.model}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, model: event.target.value }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Detalle identificatorio"
            />
          </label>
          <label className="flex flex-col text-sm text-slate-600">
            Vida útil (determinaciones)
            <input
              type="number"
              min={1}
              step="1"
              value={draft.usefulLifeDeterminations}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  usefulLifeDeterminations: event.target.value
                }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Ej. 10000"
            />
          </label>
          <label className="flex flex-col text-sm text-slate-600">
            Precio de compra (ARS)
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.purchasePrice}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, purchasePrice: event.target.value }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Valor actualizado"
            />
          </label>
          <label className="flex flex-col text-sm text-slate-600">
            Costo de calibración (ARS)
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.calibrationCost}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, calibrationCost: event.target.value }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Si no aplica, deja en 0"
            />
          </label>
          <label className="flex flex-col text-sm text-slate-600">
            Determinaciones por período de calibración
            <input
              type="number"
              min={1}
              step="1"
              value={draft.calibrationPeriodDeterminations}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  calibrationPeriodDeterminations: event.target.value
                }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Estimación según frecuencia"
            />
          </label>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-inta-blue px-3 py-2 text-sm font-medium text-white transition hover:bg-inta-blue/90"
          >
            <PlusIcon className="h-4 w-4" /> Agregar equipamiento
          </button>
        </div>
      </div>
    </section>
  );
}
