"use client";

import { useEffect, useMemo, useState } from "react";
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
  calculateEquipmentSublevelTotals,
  calculateSublevelSubtotal,
  calculateSupplyItemCost,
  calculateSupplyItemUnitPrice,
  calculateLaborItemCost,
  currencyFormatter
} from "@/lib/cost-calculation";
import { ManualOverrideIcon, PlusIcon } from "./icons";
import { useHourlyRates } from "@/contexts/HourlyRatesContext";
import { appConfig } from "@/lib/app-config";

interface LevelOneCardProps {
  level: DirectLevelGroupState;
  onSublevelChange: (sublevel: SublevelState) => void;
}

const supplySchema = z.object({
  item: z.string().min(1, "Ingresa el nombre del insumo"),
  unitOfMeasure: z.string().min(1, "Indica la unidad de medida"),
  presentationFormat: z.string().min(1, "Describe el formato de presentación"),
  presentationQuantity: z
    .number({
      invalid_type_error:
        "Indica la cantidad que trae el formato de presentación"
    })
    .gt(0, "La cantidad del formato debe ser mayor a cero"),
  presentationPrice: z
    .number({
      invalid_type_error: "Indica el precio del formato de compra"
    })
    .nonnegative("El precio debe ser mayor o igual a cero"),
  determinationQuantity: z
    .number({
      invalid_type_error: "Indica la cantidad utilizada en la determinación"
    })
    .nonnegative("La cantidad debe ser mayor o igual a cero")
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

type SublevelAppearance = {
  container: string;
  header: string;
  description: string;
  tableHead: string;
  form: string;
  badge: string;
};

const directSublevelAppearances: SublevelAppearance[] = [
  {
    container: "border-sky-200 bg-sky-50/90",
    header: "text-sky-900",
    description: "text-sky-700",
    tableHead: "bg-sky-100/80 text-sky-900",
    form: "border-sky-200 bg-white/85 text-sky-800",
    badge: "bg-sky-100 text-sky-700 hover:bg-sky-200"
  },
  {
    container: "border-indigo-200 bg-indigo-50/90",
    header: "text-indigo-900",
    description: "text-indigo-700",
    tableHead: "bg-indigo-100/80 text-indigo-900",
    form: "border-indigo-200 bg-white/85 text-indigo-800",
    badge: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
  },
  {
    container: "border-cyan-200 bg-cyan-50/90",
    header: "text-cyan-900",
    description: "text-cyan-700",
    tableHead: "bg-cyan-100/80 text-cyan-900",
    form: "border-cyan-200 bg-white/85 text-cyan-800",
    badge: "bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
  }
];

export function LevelOneCard({ level, onSublevelChange }: LevelOneCardProps) {
  const breakdown = useMemo(
    () =>
      level.sublevels.map((sublevel) => {
        if (sublevel.type === "equipamiento") {
          const { depreciation, calibration, total } =
            calculateEquipmentSublevelTotals(sublevel);

          return {
            id: sublevel.id,
            name: sublevel.name,
            subtotal: total,
            breakdown: [
              {
                id: `${sublevel.id}-depreciacion`,
                name: "Depreciación por determinación (ARS)",
                subtotal: depreciation
              },
              {
                id: `${sublevel.id}-calibracion`,
                name: "Calibración por determinación (ARS)",
                subtotal: calibration
              }
            ]
          };
        }

        return {
          id: sublevel.id,
          name: sublevel.name,
          subtotal: calculateSublevelSubtotal(sublevel)
        };
      }),
    [level]
  );

  const total = useMemo(
    () => breakdown.reduce((acc, item) => acc + item.subtotal, 0),
    [breakdown]
  );

  return (
    <section className="space-y-6 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-100 p-6 shadow-sm">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-sky-900">
            {level.name}
          </h2>
          <span className="text-lg font-bold text-inta-green">
            {currencyFormatter.format(total)}
          </span>
        </div>
        <p className="text-sm text-sky-800">{level.description}</p>
        <ul className="flex flex-wrap gap-3 text-xs text-sky-700">
          {breakdown.map((item) => (
            <li key={item.id} className="flex items-center gap-1">
              <span className="font-medium text-sky-800">{item.name}:</span>
              <span>{currencyFormatter.format(item.subtotal)}</span>
            </li>
          ))}
        </ul>
      </header>

      <div className="space-y-8">
        {level.sublevels.map((sublevel, index) => {
          const appearance =
            directSublevelAppearances[index % directSublevelAppearances.length];

          if (sublevel.type === "insumos") {
            return (
              <SupplySublevelSection
                key={sublevel.id}
                sublevel={sublevel}
                onChange={onSublevelChange}
                appearance={appearance}
              />
            );
          }

          if (sublevel.type === "manoObra") {
            return (
              <LaborSublevelSection
                key={sublevel.id}
                sublevel={sublevel}
                onChange={onSublevelChange}
                appearance={appearance}
              />
            );
          }

          return (
            <EquipmentSublevelSection
              key={sublevel.id}
              sublevel={sublevel}
              onChange={onSublevelChange}
              appearance={appearance}
            />
          );
        })}

        <section className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/80 p-4">
          <header className="flex flex-wrap items-center justify-between gap-2 text-sky-900">
            <h3 className="text-lg font-semibold">
              Subtotal de Nivel 1 Costos Directos Unitarios
            </h3>
            <span className="text-base font-semibold text-inta-green">
              {currencyFormatter.format(total)}
            </span>
          </header>

          <dl className="grid gap-2 text-sm text-sky-800 sm:grid-cols-2">
            {breakdown.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-sky-900">{item.name}</dt>
                  <dd>{currencyFormatter.format(item.subtotal)}</dd>
                </div>
                {item.breakdown && item.breakdown.length > 0 ? (
                  <ul className="space-y-1 rounded-lg bg-white/60 p-2 text-xs text-sky-600">
                    {item.breakdown.map((detail) => (
                      <li
                        key={detail.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <span>{detail.name}</span>
                        <span className="font-medium text-sky-700">
                          {currencyFormatter.format(detail.subtotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </dl>
        </section>
      </div>
    </section>
  );
}

interface SublevelSectionProps<T extends SublevelState> {
  sublevel: T;
  onChange: (updated: T) => void;
  appearance: SublevelAppearance;
}

function SupplySublevelSection({
  sublevel,
  onChange,
  appearance
}: SublevelSectionProps<SupplySublevelState>) {
  const subtotal = useMemo(
    () => calculateSublevelSubtotal(sublevel),
    [sublevel]
  );
  const [draft, setDraft] = useState({
    item: "",
    unitOfMeasure: "",
    presentationFormat: "",
    presentationQuantity: "",
    presentationPrice: "",
    determinationQuantity: ""
  });
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    setError(null);

    if (
      draft.presentationQuantity === "" ||
      draft.presentationPrice === "" ||
      draft.determinationQuantity === ""
    ) {
      setError("Completa las cantidades y el precio de referencia");
      return;
    }

    const parsed = supplySchema.safeParse({
      item: draft.item.trim(),
      unitOfMeasure: draft.unitOfMeasure.trim(),
      presentationFormat: draft.presentationFormat.trim(),
      presentationQuantity: Number(draft.presentationQuantity),
      presentationPrice: Number(draft.presentationPrice),
      determinationQuantity: Number(draft.determinationQuantity)
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
    setDraft({
      item: "",
      unitOfMeasure: "",
      presentationFormat: "",
      presentationQuantity: "",
      presentationPrice: "",
      determinationQuantity: ""
    });
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

      if (
        field === "presentationQuantity" ||
        field === "presentationPrice" ||
        field === "determinationQuantity"
      ) {
        const numericValue = Number(value);
        return {
          ...item,
          [field]: Number.isNaN(numericValue) ? 0 : numericValue
        };
      }

      return {
        ...item,
        [field]: value
      };
    });

    onChange({ ...sublevel, items: updatedItems });
  };

  const handleDelete = (id: string) => {
    onChange({ ...sublevel, items: sublevel.items.filter((item) => item.id !== id) });
  };

  return (
    <section
      className={`space-y-4 rounded-xl border p-4 ${appearance.container}`}
    >
      <header className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${appearance.header}`}>
            {sublevel.name}
          </h3>
          <p className={`text-sm ${appearance.description}`}>
            {sublevel.description}
          </p>
        </div>
        <span className="text-base font-semibold text-inta-green">
          {currencyFormatter.format(subtotal)}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className={`${appearance.tableHead} text-left`}>
            <tr>
              <th
                colSpan={5}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${appearance.header}`}
              >
                Referencia del insumo
              </th>
              <th
                colSpan={1}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${appearance.header}`}
              >
                Cantidad por determinación
              </th>
              <th
                colSpan={2}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${appearance.header}`}
              >
                Costo por determinación
              </th>
              <th
                rowSpan={2}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${appearance.header}`}
              >
                Acciones
              </th>
            </tr>
            <tr>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Insumo
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Unidad de medida
                <span className="block text-xs font-normal text-slate-600">
                  Es la unidad de medida en la que se distribuye el insumo.
                </span>
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Formato de presentación
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Cantidad según formato de presentación
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Precio actualizado de formato de compra
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Cantidad utilizada en la determinación
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Precio unitario según unidad de medida
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Costo de insumo en la determinación
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sublevel.items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-6 text-center text-sm text-slate-500"
                >
                  Detalla cada insumo consumido por muestra para proyectar el
                  costo.
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
                    className="w-56 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
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
                  <p className="mt-1 text-xs text-slate-500">
                    Es la unidad de medida en la que se distribuye el insumo.
                  </p>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.presentationFormat}
                    onChange={(event) =>
                      handleItemChange(
                        item.id,
                        "presentationFormat",
                        event.target.value
                      )
                    }
                    className="w-48 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.001"
                    value={item.presentationQuantity}
                    onChange={(event) =>
                      handleItemChange(
                        item.id,
                        "presentationQuantity",
                        event.target.value
                      )
                    }
                    className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Expresado en {item.unitOfMeasure || "la misma unidad"}.
                  </p>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.presentationPrice}
                    onChange={(event) =>
                      handleItemChange(
                        item.id,
                        "presentationPrice",
                        event.target.value
                      )
                    }
                    className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.001"
                    value={item.determinationQuantity}
                    onChange={(event) =>
                      handleItemChange(
                        item.id,
                        "determinationQuantity",
                        event.target.value
                      )
                    }
                    className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Utiliza la misma unidad declarada anteriormente.
                  </p>
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {currencyFormatter.format(
                    calculateSupplyItemUnitPrice(item)
                  )}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-inta-green">
                  {currencyFormatter.format(calculateSupplyItemCost(item))}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${appearance.badge}`}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className={`space-y-3 rounded-xl border border-dashed p-4 ${appearance.form}`}
      >
        <h4 className={`text-sm font-semibold ${appearance.header}`}>
          Agregar un nuevo insumo directo
        </h4>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <label className={`flex flex-col text-sm ${appearance.description}`}>
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
          <label className={`flex flex-col text-sm ${appearance.description}`}>
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
            <span className="mt-1 text-xs text-slate-500">
              Es la unidad de medida en la que se distribuye el insumo.
            </span>
          </label>
          <label className={`flex flex-col text-sm ${appearance.description}`}>
            Formato de presentación
            <input
              type="text"
              value={draft.presentationFormat}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  presentationFormat: event.target.value
                }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Ej. Pote, frasco, bolsa"
            />
          </label>
          <label className={`flex flex-col text-sm ${appearance.description}`}>
            Cantidad según formato de presentación
            <input
              type="number"
              min={0}
              step="0.001"
              value={draft.presentationQuantity}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  presentationQuantity: event.target.value
                }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Ej. 0,5"
            />
            <span className="mt-1 text-xs text-slate-500">
              Utiliza la misma unidad declarada anteriormente.
            </span>
          </label>
          <label className={`flex flex-col text-sm ${appearance.description}`}>
            Precio actualizado de formato de compra
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.presentationPrice}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  presentationPrice: event.target.value
                }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Valor de referencia"
            />
          </label>
          <label className={`flex flex-col text-sm ${appearance.description}`}>
            Cantidad utilizada en la determinación
            <input
              type="number"
              min={0}
              step="0.001"
              value={draft.determinationQuantity}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  determinationQuantity: event.target.value
                }))
              }
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              placeholder="Ej. 0,25"
            />
            <span className="mt-1 text-xs text-slate-500">
              Expresa la cantidad en la misma unidad de medida.
            </span>
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
  onChange,
  appearance
}: SublevelSectionProps<LaborSublevelState>) {
  const { items: hourlyRates } = useHourlyRates();
  const subtotal = useMemo(
    () => calculateSublevelSubtotal(sublevel),
    [sublevel]
  );

  const profilesByCode = useMemo(() => {
    return new Map(hourlyRates.map((profile) => [profile.profileCode, profile]));
  }, [hourlyRates]);

  useEffect(() => {
    const updated = sublevel.items.map((item) => {
      if (!item.profileCode) {
        return item;
      }
      const profile = profilesByCode.get(item.profileCode);
      if (!profile || item.isManualRate) {
        return item;
      }

      if (item.rate !== profile.hourlyRateARS) {
        return {
          ...item,
          rate: profile.hourlyRateARS
        } satisfies LaborCostItem;
      }

      return item;
    });

    const hasChanges = updated.some(
      (item, index) => item !== sublevel.items[index]
    );

    if (hasChanges) {
      onChange({ ...sublevel, items: updated });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilesByCode]);

  const updateItem = (
    id: string,
    updater: (item: LaborCostItem) => LaborCostItem
  ) => {
    const nextItems = sublevel.items.map((item) =>
      item.id === id ? updater(item) : item
    );
    onChange({ ...sublevel, items: nextItems });
  };

  const handleHoursChange = (id: string, value: string) => {
    const numericValue = Number(value);
    updateItem(id, (item) => ({
      ...item,
      hours: Number.isFinite(numericValue) ? numericValue : 0
    }));
  };

  const handleRateChange = (id: string, value: string) => {
    const numericValue = Number(value);
    updateItem(id, (item) => ({
      ...item,
      rate: Number.isFinite(numericValue) ? numericValue : 0,
      isManualRate: true
    }));
  };

  const handleProfileChange = (id: string, value: string) => {
    const code = value || null;
    updateItem(id, (item) => {
      if (!code) {
        return {
          ...item,
          profileCode: null,
          isManualRate: true
        } satisfies LaborCostItem;
      }

      const profile = profilesByCode.get(code);
      if (!profile) {
        return {
          ...item,
          profileCode: code,
          isManualRate: true
        } satisfies LaborCostItem;
      }

      return {
        ...item,
        profileCode: profile.profileCode,
        rate: profile.hourlyRateARS,
        isManualRate: false
      } satisfies LaborCostItem;
    });
  };

  const handleResetRate = (id: string) => {
    updateItem(id, (item) => {
      if (!item.profileCode) {
        return { ...item, isManualRate: false };
      }
      const profile = profilesByCode.get(item.profileCode);
      if (!profile) {
        return { ...item, isManualRate: false };
      }

      return {
        ...item,
        rate: profile.hourlyRateARS,
        isManualRate: false
      } satisfies LaborCostItem;
    });
  };

  const profileOptions = useMemo(
    () =>
      hourlyRates
        .slice()
        .sort((a, b) => a.profileName.localeCompare(b.profileName))
        .map((profile) => ({
          code: profile.profileCode,
          name: profile.profileName,
          rate: profile.hourlyRateARS,
          from: profile.vigenciaDesdeISO,
          to: profile.vigenciaHastaISO
        })),
    [hourlyRates]
  );

  return (
    <section
      className={`space-y-4 rounded-xl border p-4 ${appearance.container}`}
    >
      <header className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${appearance.header}`}>
            {sublevel.name}
          </h3>
          <p className={`text-sm ${appearance.description}`}>
            {sublevel.description}
          </p>
        </div>
        <span className="text-base font-semibold text-inta-green">
          {currencyFormatter.format(subtotal)}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className={`${appearance.tableHead} text-left`}>
            <tr>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Perfil
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Horas por determinación
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Valor por hora/día
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sublevel.items.map((item) => {
              const selectedProfile = item.profileCode
                ? profilesByCode.get(item.profileCode)
                : null;
              const isManual = item.isManualRate ?? false;

              return (
                <tr key={item.id}>
                  <td className="px-3 py-2">
                    <p className="text-sm font-medium text-slate-700">
                      {item.label}
                    </p>
                    <select
                      value={item.profileCode ?? ""}
                      onChange={(event) =>
                        handleProfileChange(item.id, event.target.value)
                      }
                      className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                    >
                      <option value="">Seleccioná un perfil</option>
                      {profileOptions.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.name} · {currencyFormatter.format(option.rate)}
                        </option>
                      ))}
                    </select>
                    {selectedProfile ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Vigente desde {selectedProfile.vigenciaDesdeISO}
                        {selectedProfile.vigenciaHastaISO
                          ? ` hasta ${selectedProfile.vigenciaHastaISO}`
                          : ""}
                      </p>
                    ) : null}
                    {profileOptions.length === 0 ? (
                      <p className="mt-1 text-xs text-red-600">
                        Cargá perfiles en la tabla de Valores hora para
                        habilitar esta selección.
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.25"
                      value={item.hours}
                      onChange={(event) =>
                        handleHoursChange(item.id, event.target.value)
                      }
                      className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.rate}
                        onChange={(event) =>
                          handleRateChange(item.id, event.target.value)
                        }
                        className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                      />
                      {isManual ? (
                        <span
                          title="Valor ajustado manualmente para este ensayo"
                          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"
                        >
                          <ManualOverrideIcon className="h-3.5 w-3.5" /> Manual
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {!isManual && selectedProfile ? (
                        <span>
                          Valor de tabla: {currencyFormatter.format(selectedProfile.hourlyRateARS)}
                        </span>
                      ) : null}
                      {isManual && selectedProfile ? (
                        <button
                          type="button"
                          onClick={() => handleResetRate(item.id)}
                          className="rounded border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
                        >
                          Usar valor de tabla
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {currencyFormatter.format(calculateLaborItemCost(item))}
                  </td>
                </tr>
              );
            })}
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
  onChange,
  appearance
}: SublevelSectionProps<EquipmentSublevelState>) {
  const totals = useMemo(
    () => calculateEquipmentSublevelTotals(sublevel),
    [sublevel]
  );
  const subtotal = totals.total;
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

  const methodTooltip =
    "Depreciación por determinación = (Costo de adquisición − Valor residual + Costos de instalación) / Vida útil (determinaciones).\nCalibración por determinación = Costo de calibración del período / Determinaciones del período.";

  return (
    <section
      className={`space-y-4 rounded-xl border p-4 ${appearance.container}`}
    >
      <header className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${appearance.header}`}>
            {sublevel.name}
          </h3>
          <p className={`text-sm ${appearance.description}`}>
            {sublevel.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center rounded-full border border-white/60 bg-white/80 px-3 py-1 font-medium ${appearance.header}`}
              title={methodTooltip}
            >
              Método: Depreciación por servicios (unidades de análisis)
            </span>
            <a
              href={appConfig.guides.equipmentDepreciationMethod}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1 font-medium underline decoration-dotted underline-offset-4 transition ${appearance.header} hover:opacity-80`}
            >
              Ver guía
            </a>
          </div>
        </div>
        <span className="text-base font-semibold text-inta-green">
          {currencyFormatter.format(subtotal)}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className={`${appearance.tableHead} text-left`}>
            <tr>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Equipo
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Modelo / referencia
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Vida útil (determinaciones)
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Precio de compra
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Costo de calibración
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Determinaciones por período de calibración
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Costo por determinación
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
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${appearance.badge}`}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className={`space-y-2 rounded-lg bg-white/70 p-4 text-sm ${appearance.description}`}
      >
        <p className={`font-semibold ${appearance.header}`}>
          Detalle por determinación
        </p>
        <dl className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <dt>Depreciación por determinación (ARS)</dt>
            <dd className="font-semibold text-slate-900">
              {currencyFormatter.format(totals.depreciation)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Calibración por determinación (ARS)</dt>
            <dd className="font-semibold text-slate-900">
              {currencyFormatter.format(totals.calibration)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Total equipo por determinación (ARS)</dt>
            <dd className="font-semibold text-slate-900">
              {currencyFormatter.format(subtotal)}
            </dd>
          </div>
        </dl>
      </div>

      <div
        className={`space-y-3 rounded-xl border border-dashed p-4 ${appearance.form}`}
      >
        <h4 className={`text-sm font-semibold ${appearance.header}`}>
          Agregar equipamiento específico
        </h4>
        <div className="grid gap-3 md:grid-cols-3">
          <label className={`flex flex-col text-sm ${appearance.description}`}>
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
          <label className={`flex flex-col text-sm ${appearance.description}`}>
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
          <label className={`flex flex-col text-sm ${appearance.description}`}>
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
          <label className={`flex flex-col text-sm ${appearance.description}`}>
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
          <label className={`flex flex-col text-sm ${appearance.description}`}>
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
          <label className={`flex flex-col text-sm ${appearance.description}`}>
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
