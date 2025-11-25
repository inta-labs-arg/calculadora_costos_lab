"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import convert from "convert-units";
import {
  DirectLevelGroupState,
  EquipmentCostItem,
  EquipmentSublevelState,
  LaborCostItem,
  LaborSublevelState,
  SupplyCostItem,
  SupplySublevelState,
  SublevelState,
  calculateEquipmentSublevelTotals,
  calculateSublevelSubtotal,
  calculateLaborItemCost,
  calculateSupplyItemCost,
  calculateSupplyItemUnitPrice,
  currencyFormatter,
  calculateEquipmentItemDepreciation,
  calculateEquipmentItemMonthlyDepreciation,
  LABOR_MONTHLY_HOURS
} from "@/lib/cost-calculation";
import { PlusIcon } from "./icons";
import { formatARS, round2 } from "@/lib/money";

interface LevelOneCardProps {
  level: DirectLevelGroupState;
  onSublevelChange: (sublevel: SublevelState) => void;
}

const supplyUnitOptions = ["g", "mg", "kg", "mL", "L", "unidad"] as const;

const supplyUnitEnum = z.enum(supplyUnitOptions);

const supplyCalculatorSchema = z.object({
  insumo: z.string().min(1, "Ingresa el nombre del insumo"),
  uomBase: supplyUnitEnum,
  formatoPresentacion: z
    .string()
    .min(1, "Describe el formato de presentación (pote, frasco, etc.)"),
  cantidadPresentacion: z
    .number({
      invalid_type_error: "Indica la cantidad del formato de presentación"
    })
    .finite("Ingresa un número válido")
    .gt(0, "La cantidad del formato debe ser mayor a cero"),
  precioPresentacion: z
    .number({
      invalid_type_error: "Indica el precio del formato de compra"
    })
    .finite("Ingresa un número válido")
    .gt(0, "El precio debe ser mayor a cero"),
  uomUso: supplyUnitEnum,
  cantidadUsada: z
    .number({
      invalid_type_error: "Indica la cantidad utilizada en la determinación"
    })
    .finite("Ingresa un número válido")
    .min(0, "La cantidad debe ser mayor o igual a cero")
});

type SupplyCalculatorFormValues = z.infer<typeof supplyCalculatorSchema>;

type SupplyUnit = (typeof supplyUnitOptions)[number];

const MASS_UNITS = new Set<SupplyUnit>(["mg", "g", "kg"]);
const VOLUME_UNITS = new Set<SupplyUnit>(["mL", "L"]);
const unitConversionCode: Record<SupplyUnit, string | null> = {
  g: "g",
  mg: "mg",
  kg: "kg",
  mL: "ml",
  L: "l",
  unidad: null
};
const unitLabels: Record<SupplyUnit, string> = {
  g: "g (gramos)",
  mg: "mg (miligramos)",
  kg: "kg (kilogramos)",
  mL: "mL (mililitros)",
  L: "L (litros)",
  unidad: "unidad"
};

const getUnitGroup = (unit: SupplyUnit) => {
  if (MASS_UNITS.has(unit)) {
    return "mass" as const;
  }
  if (VOLUME_UNITS.has(unit)) {
    return "volume" as const;
  }
  return "unit" as const;
};

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
          const { annual, monthly, total } =
            calculateEquipmentSublevelTotals(sublevel);

          return {
            id: sublevel.id,
            name: sublevel.name,
            subtotal: total,
            breakdown: [
              {
                id: `${sublevel.id}-depreciacion-anual`,
                name: "Depreciación anual (ARS)",
                subtotal: annual
              },
              {
                id: `${sublevel.id}-depreciacion-mensual`,
                name: "Depreciación mensual (ARS)",
                subtotal: monthly
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
  onChange: _onChange,
  appearance
}: SublevelSectionProps<SupplySublevelState>) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, dirtyFields }
  } = useForm<SupplyCalculatorFormValues>({
    resolver: zodResolver(supplyCalculatorSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      insumo: "",
      uomBase: "g",
      formatoPresentacion: "",
      cantidadPresentacion: 0,
      precioPresentacion: 0,
      uomUso: "g",
      cantidadUsada: 0
    }
  });

  const uomBase = watch("uomBase");
  const cantidadPresentacion = watch("cantidadPresentacion");
  const precioPresentacion = watch("precioPresentacion");
  const uomUso = watch("uomUso");
  const cantidadUsada = watch("cantidadUsada");

  useEffect(() => {
    if (!dirtyFields.uomUso && uomUso !== uomBase) {
      setValue("uomUso", uomBase, { shouldDirty: false, shouldValidate: true });
    }
  }, [dirtyFields.uomUso, setValue, uomBase, uomUso]);

  const [addStatus, setAddStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );

  useEffect(() => {
    if (addStatus === "idle") {
      return;
    }
    const timeout = window.setTimeout(() => setAddStatus("idle"), 3000);
    return () => window.clearTimeout(timeout);
  }, [addStatus]);

  const subtotal = useMemo(
    () => calculateSublevelSubtotal(sublevel),
    [sublevel]
  );

  const calculation = useMemo(() => {
    if (!isValid) {
      return {
        precioUnitario: null,
        cantidadEfectiva: null,
        cantidadEfectivaBase: null,
        costoParcial: null,
        warning: null
      } as const;
    }

    const precioUnitario = new Decimal(precioPresentacion).div(
      new Decimal(cantidadPresentacion)
    );
    const cantidadEfectiva = new Decimal(cantidadUsada);

    let warning: string | null = null;
    let cantidadEfectivaBase: Decimal | null = cantidadEfectiva;

    if (uomUso !== uomBase) {
      const fromGroup = getUnitGroup(uomUso);
      const toGroup = getUnitGroup(uomBase);
      const fromCode = unitConversionCode[uomUso];
      const toCode = unitConversionCode[uomBase];

      if (
        uomUso === "unidad" ||
        uomBase === "unidad" ||
        fromGroup !== toGroup ||
        !fromCode ||
        !toCode
      ) {
        warning = "UoM no convertibles (masa↔volumen)";
        cantidadEfectivaBase = null;
      } else {
        try {
          const converted = convert(cantidadEfectiva.toNumber())
            .from(fromCode)
            .to(toCode);
          cantidadEfectivaBase = new Decimal(converted);
        } catch {
          warning = "UoM no convertibles (masa↔volumen)";
          cantidadEfectivaBase = null;
        }
      }
    }

    const costoParcial =
      cantidadEfectivaBase === null
        ? null
        : precioUnitario.mul(cantidadEfectivaBase);

    return {
      precioUnitario,
      cantidadEfectiva,
      cantidadEfectivaBase,
    costoParcial,
    warning
  } as const;
  }, [
    cantidadPresentacion,
    cantidadUsada,
    isValid,
    precioPresentacion,
    uomBase,
    uomUso
  ]);

  const canExport =
    isValid && calculation.costoParcial !== null && !calculation.warning;

  const formatDecimal = (value: Decimal) =>
    value.toFixed(2, Decimal.ROUND_HALF_UP);

  const formatCurrencyDecimal = (value: Decimal) =>
    currencyFormatter.format(
      Number(value.toFixed(2, Decimal.ROUND_HALF_UP))
    );

  const handleAddItem = handleSubmit((values) => {
    if (
      !canExport ||
      !calculation.precioUnitario ||
      !calculation.costoParcial ||
      !calculation.cantidadEfectivaBase
    ) {
      setAddStatus("error");
      return;
    }

    const determinationQuantity = Number(
      calculation.cantidadEfectivaBase.toFixed(4, Decimal.ROUND_HALF_UP)
    );

    const newItem: SupplyCostItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      item: values.insumo.trim(),
      unitOfMeasure: values.uomBase,
      presentationFormat: values.formatoPresentacion.trim(),
      presentationQuantity: Number(
        new Decimal(values.cantidadPresentacion).toFixed(
          4,
          Decimal.ROUND_HALF_UP
        )
      ),
      presentationPrice: Number(
        new Decimal(values.precioPresentacion).toFixed(
          2,
          Decimal.ROUND_HALF_UP
        )
      ),
      determinationQuantity
    };

    const updatedItems = [...sublevel.items, newItem];
    _onChange({ ...sublevel, items: updatedItems });
    setAddStatus("success");
  });

  const handleDeleteItem = (id: string) => {
    _onChange({
      ...sublevel,
      items: sublevel.items.filter((item) => item.id !== id)
    });
  };

  return (
    <section
      className={`space-y-6 rounded-xl border p-4 ${appearance.container}`}
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
                Insumo
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Presentación
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Precio unitario
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Cantidad por determinación
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
                  colSpan={6}
                  className="px-3 py-6 text-center text-sm text-slate-500"
                >
                  Agregá cada insumo para conformar el subtotal del análisis.
                </td>
              </tr>
            ) : null}
            {sublevel.items.map((item) => {
              const unitPrice = calculateSupplyItemUnitPrice(item);
              const cost = calculateSupplyItemCost(item);

              return (
                <tr key={item.id}>
                  <td className="px-3 py-2">
                    <p className="text-sm font-medium text-slate-700">
                      {item.item}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.presentationFormat}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{`${formatDecimal(new Decimal(item.presentationQuantity))} ${item.unitOfMeasure}`}</p>
                    <p className="text-xs text-slate-500">
                      {currencyFormatter.format(item.presentationPrice)}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {currencyFormatter.format(unitPrice)}
                  </td>
                  <td className="px-3 py-2">
                    {`${formatDecimal(new Decimal(item.determinationQuantity))} ${item.unitOfMeasure}`}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-slate-700">
                    {currencyFormatter.format(cost)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-sm font-medium text-red-600 transition hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-white/70">
            <tr>
              <th
                scope="row"
                colSpan={4}
                className="px-3 py-2 text-left text-sm font-semibold text-slate-700"
              >
                Subtotal insumos directos
              </th>
              <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">
                {currencyFormatter.format(subtotal)}
              </td>
              <td className="px-3 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>

      <form onSubmit={handleAddItem} className="space-y-6">
        <div
          className={`space-y-4 rounded-xl border border-dashed p-4 ${appearance.form}`}
        >
          <fieldset className="space-y-4">
            <legend
              className={`text-sm font-semibold uppercase tracking-wide ${appearance.header}`}
            >
              Referencia del insumo
            </legend>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={`flex flex-col text-sm ${appearance.description}`}>
                Insumo
                <input
                  type="text"
                  {...register("insumo")}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  placeholder="Reactivo, filtro, vial"
                />
                {errors.insumo ? (
                  <span className="mt-1 text-xs text-red-600">
                    {errors.insumo.message}
                  </span>
                ) : (
                  <span className="mt-1 text-xs text-slate-500">
                    Nombre del material o reactivo.
                  </span>
                )}
              </label>
              <label className={`flex flex-col text-sm ${appearance.description}`}>
                Formato de presentación
                <input
                  type="text"
                  {...register("formatoPresentacion")}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  placeholder="Pote, frasco, bolsa, kit"
                />
                {errors.formatoPresentacion ? (
                  <span className="mt-1 text-xs text-red-600">
                    {errors.formatoPresentacion.message}
                  </span>
                ) : (
                  <span className="mt-1 text-xs text-slate-500">
                    Describe el contenedor o formato de compra.
                  </span>
                )}
              </label>
              <label className={`flex flex-col text-sm ${appearance.description}`}>
                Unidad base
                <select
                  {...register("uomBase")}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                >
                  {supplyUnitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unitLabels[unit]}
                    </option>
                  ))}
                </select>
                <span className="mt-1 text-xs text-slate-500">
                  Unidad en la que se compra el insumo.
                </span>
              </label>
              <label className={`flex flex-col text-sm ${appearance.description}`}>
                Cantidad según presentación
                <input
                  type="number"
                  step="0.0001"
                  min={0}
                  {...register("cantidadPresentacion", { valueAsNumber: true })}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  placeholder="Ej. 0,5"
                />
                {errors.cantidadPresentacion ? (
                  <span className="mt-1 text-xs text-red-600">
                    {errors.cantidadPresentacion.message}
                  </span>
                ) : (
                  <span className="mt-1 text-xs text-slate-500">
                    En la misma unidad base declarada.
                  </span>
                )}
              </label>
              <label className={`flex flex-col text-sm ${appearance.description}`}>
                Precio de presentación (ARS)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("precioPresentacion", { valueAsNumber: true })}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  placeholder="Precio de reposición vigente"
                />
                {errors.precioPresentacion ? (
                  <span className="mt-1 text-xs text-red-600">
                    {errors.precioPresentacion.message}
                  </span>
                ) : (
                  <span className="mt-1 text-xs text-slate-500">
                    Utiliza el precio de reposición del trimestre.
                  </span>
                )}
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend
              className={`text-sm font-semibold uppercase tracking-wide ${appearance.header}`}
            >
              Cantidad por determinación
            </legend>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={`flex flex-col text-sm ${appearance.description}`}>
                Unidad de uso
                <select
                  {...register("uomUso")}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                >
                  {supplyUnitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unitLabels[unit]}
                    </option>
                  ))}
                </select>
                <span className="mt-1 text-xs text-slate-500">
                  Unidad con la que dosificas el insumo en la práctica.
                </span>
              </label>
              <label className={`flex flex-col text-sm ${appearance.description}`}>
                Cantidad utilizada
                <input
                  type="number"
                  step="0.0001"
                  min={0}
                  {...register("cantidadUsada", { valueAsNumber: true })}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  placeholder="Ej. 0,4"
                />
                {errors.cantidadUsada ? (
                  <span className="mt-1 text-xs text-red-600">
                    {errors.cantidadUsada.message}
                  </span>
                ) : (
                  <span className="mt-1 text-xs text-slate-500">
                    Expresada en la unidad de uso.
                  </span>
                )}
              </label>
            </div>
          </fieldset>
        </div>

        {calculation.warning ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {calculation.warning}
          </div>
        ) : null}

        <div className="space-y-2 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <h4 className={`text-sm font-semibold ${appearance.header}`}>
            Resultados del cálculo
          </h4>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div className="flex items-center justify-between gap-4">
              <dt className="font-medium text-slate-600">Precio unitario</dt>
              <dd className="text-base font-semibold text-slate-900">
                {calculation.precioUnitario
                  ? `${formatCurrencyDecimal(calculation.precioUnitario)} / ${uomBase}`
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-medium text-slate-600">Costo parcial</dt>
              <dd
                className={`text-base font-semibold ${
                  calculation.costoParcial ? "text-inta-green" : "text-slate-500"
                }`}
              >
                {calculation.costoParcial
                  ? formatCurrencyDecimal(calculation.costoParcial)
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-slate-600">
            Cantidad efectiva:{" "}
            {calculation.cantidadEfectiva
              ? `${formatDecimal(calculation.cantidadEfectiva)} ${uomUso}`
              : "—"}
            {uomUso !== uomBase && calculation.cantidadEfectivaBase
              ? ` (equiv. ${formatDecimal(calculation.cantidadEfectivaBase)} ${uomBase})`
              : ""}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {addStatus === "success" ? (
            <p className="text-sm text-inta-green">
              Insumo agregado a la lista de resultados.
            </p>
          ) : null}
          {addStatus === "error" ? (
            <p className="text-sm text-red-600">
              No fue posible agregar el insumo.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canExport}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                canExport ? "bg-inta-blue hover:bg-inta-blue/90" : "bg-slate-400"
              }`}
            >
              Agregar insumo
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

type LaborEditableField = "quantity" | "totalHours" | "monthlySalary";

type LaborTouchedState = Record<
  string,
  Record<LaborEditableField, boolean>
>;

const createTouchedState = (items: LaborCostItem[]): LaborTouchedState => {
  return items.reduce<LaborTouchedState>((acc, item) => {
    acc[item.id] = {
      quantity: false,
      totalHours: false,
      monthlySalary: false
    };
    return acc;
  }, {});
};

function LaborSublevelSection({
  sublevel,
  onChange,
  appearance
}: SublevelSectionProps<LaborSublevelState>) {
  const subtotal = useMemo(
    () => calculateSublevelSubtotal(sublevel),
    [sublevel]
  );

  const [touched, setTouched] = useState<LaborTouchedState>(() =>
    createTouchedState(sublevel.items)
  );

  useEffect(() => {
    setTouched((prev) => {
      const next: LaborTouchedState = { ...prev };
      let changed = false;
      const currentIds = new Set(sublevel.items.map((item) => item.id));

      sublevel.items.forEach((item) => {
        if (!next[item.id]) {
          next[item.id] = {
            quantity: false,
            totalHours: false,
            monthlySalary: false
          };
          changed = true;
        }
      });

      Object.keys(next).forEach((id) => {
        if (!currentIds.has(id)) {
          delete next[id];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [sublevel.items]);

  const updateItem = (id: string, updates: Partial<LaborCostItem>) => {
    const nextItems = sublevel.items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    onChange({ ...sublevel, items: nextItems });
  };

  const handleNumberChange = <K extends LaborEditableField>(
    id: string,
    field: K,
    value: string
  ) => {
    const numericValue = Number(value);
    const normalizedValue =
      value === "" || Number.isNaN(numericValue) ? 0 : numericValue;
    const sanitizedValue =
      field === "quantity"
        ? Math.floor(Math.max(normalizedValue, 0))
        : Math.max(normalizedValue, 0);

    updateItem(id, { [field]: sanitizedValue } as Pick<LaborCostItem, K>);
  };

  const handleBlur = (id: string, field: LaborEditableField) => {
    setTouched((prev) => {
      const current = prev[id] ?? {
        quantity: false,
        totalHours: false,
        monthlySalary: false
      };
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: true
        }
      };
    });
  };

  const errors = useMemo(() => {
    return sublevel.items.map((item) => ({
      id: item.id,
      quantity: item.quantity > 0 ? null : "Debe ser mayor que 0",
      totalHours: item.totalHours > 0 ? null : "Debe ser mayor que 0",
      monthlySalary:
        item.monthlySalary > 0 ? null : "Debe ser mayor que 0"
    }));
  }, [sublevel.items]);

  const errorsById = useMemo(() => {
    return new Map(errors.map((error) => [error.id, error]));
  }, [errors]);

  const hasBlockingErrors = errors.some((error) =>
    Boolean(error.quantity || error.totalHours || error.monthlySalary)
  );

  const calculations = useMemo(() => {
    return new Map(
      sublevel.items.map((item) => {
        const hourlyValue =
          item.monthlySalary > 0
            ? round2(item.monthlySalary / LABOR_MONTHLY_HOURS)
            : 0;
        const cost = calculateLaborItemCost(item);
        return [item.id, { hourlyValue, cost }] as const;
      })
    );
  }, [sublevel.items]);

  const showGlobalError = hasBlockingErrors &&
    sublevel.items.some((item) => {
      const touch = touched[item.id];
      return Boolean(
        touch?.quantity || touch?.totalHours || touch?.monthlySalary
      );
    });

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
          {formatARS(subtotal)}
        </span>
      </header>

      <div className="rounded-lg border-l-4 border-sky-300 bg-sky-50/80 p-4 text-sm text-sky-900">
        <p>
          <strong>Nota:</strong> El valor hora se estima dividiendo el salario
          mensual por {LABOR_MONTHLY_HOURS} horas/mes (22 días × 8 h). Para
          contratados, ingrese el monto mensual neto del contrato como salario
          de referencia. (Esta es una aproximación operativa basada en jornada
          legal de 8 h/diarias y 48 h/semanales.)
        </p>
      </div>

      <div className="space-y-4">
        {sublevel.items.map((item) => {
          const rowErrors = errorsById.get(item.id);
          const rowTouched = touched[item.id];
          const calculation = calculations.get(item.id);
          const hourlyValue = calculation?.hourlyValue ?? 0;
          const cost = calculation?.cost ?? 0;

          return (
            <div
              key={item.id}
              className="space-y-3 rounded-xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200"
            >
              <h4 className="text-base font-semibold text-slate-800">
                {item.label}
              </h4>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Cantidad de personas
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={item.quantity > 0 ? item.quantity : ""}
                    onChange={(event) =>
                      handleNumberChange(item.id, "quantity", event.target.value)
                    }
                    onBlur={() => handleBlur(item.id, "quantity")}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                  {rowErrors?.quantity && rowTouched?.quantity ? (
                    <p className="mt-1 text-xs text-red-600">
                      {rowErrors.quantity}
                    </p>
                  ) : null}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Horas totales
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    inputMode="decimal"
                    value={item.totalHours > 0 ? item.totalHours : ""}
                    onChange={(event) =>
                      handleNumberChange(item.id, "totalHours", event.target.value)
                    }
                    onBlur={() => handleBlur(item.id, "totalHours")}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                  {rowErrors?.totalHours && rowTouched?.totalHours ? (
                    <p className="mt-1 text-xs text-red-600">
                      {rowErrors.totalHours}
                    </p>
                  ) : null}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Salario mensual (ARS)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1000}
                    inputMode="decimal"
                    value={item.monthlySalary > 0 ? item.monthlySalary : ""}
                    onChange={(event) =>
                      handleNumberChange(
                        item.id,
                        "monthlySalary",
                        event.target.value
                      )
                    }
                    onBlur={() => handleBlur(item.id, "monthlySalary")}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                  {rowErrors?.monthlySalary && rowTouched?.monthlySalary ? (
                    <p className="mt-1 text-xs text-red-600">
                      {rowErrors.monthlySalary}
                    </p>
                  ) : null}
                </div>

                <div className="md:col-span-1">
                  <span className="block text-sm font-medium text-slate-700">
                    Valor hora (ARS)
                  </span>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {formatARS(hourlyValue)}
                  </p>
                </div>

                <div className="md:col-span-1">
                  <span className="block text-sm font-medium text-slate-700">
                    Costo del tipo (ARS)
                  </span>
                  <p className="mt-2 text-base font-semibold text-inta-green">
                    {formatARS(cost)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-white/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className={`text-base font-semibold ${appearance.header}`}>
            Subtotal Mano de Obra Directa (Nivel 1 · b.2)
          </h4>
          <span className="text-base font-semibold text-inta-green">
            {formatARS(subtotal)}
          </span>
        </div>
        {showGlobalError ? (
          <p className="text-sm text-red-600">
            Revisá los campos con error para continuar.
          </p>
        ) : null}
      </div>
    </section>
  );
}

type EquipmentEditableField =
  | "descripcion"
  | "costoAdquisicion"
  | "valorResidual"
  | "vidaUtilAnios";

type EquipmentTouchedState = Record<
  string,
  Record<EquipmentEditableField, boolean>
>;

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
  const [touched, setTouched] = useState<EquipmentTouchedState>({});

  useEffect(() => {
    setTouched((prev) => {
      const next: EquipmentTouchedState = { ...prev };
      let changed = false;
      const currentIds = new Set(sublevel.items.map((item) => item.id));

      sublevel.items.forEach((item) => {
        if (!next[item.id]) {
          next[item.id] = {
            descripcion: false,
            costoAdquisicion: false,
            valorResidual: false,
            vidaUtilAnios: false
          };
          changed = true;
        }
      });

      Object.keys(next).forEach((id) => {
        if (!currentIds.has(id)) {
          delete next[id];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [sublevel.items]);

  const updateItem = (id: string, updates: Partial<EquipmentCostItem>) => {
    const nextItems = sublevel.items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    onChange({ ...sublevel, items: nextItems });
  };

  const handleDescriptionChange = (id: string, value: string) => {
    updateItem(id, { descripcion: value });
  };

  const handleNumberChange = (
    id: string,
    field: Exclude<EquipmentEditableField, "descripcion">,
    value: string
  ) => {
    const numericValue = Number(value);
    const normalizedValue =
      value === "" || Number.isNaN(numericValue) ? 0 : numericValue;
    const sanitizedValue =
      field === "vidaUtilAnios"
        ? Math.max(Math.floor(normalizedValue), 0)
        : Math.max(normalizedValue, 0);

    updateItem(id, { [field]: sanitizedValue } as Pick<
      EquipmentCostItem,
      typeof field
    >);
  };

  const handleBlur = (id: string, field: EquipmentEditableField) => {
    setTouched((prev) => {
      const current = prev[id] ?? {
        descripcion: false,
        costoAdquisicion: false,
        valorResidual: false,
        vidaUtilAnios: false
      };
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: true
        }
      };
    });
  };

  const handleAdd = () => {
    const newItem: EquipmentCostItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      descripcion: "",
      costoAdquisicion: 0,
      valorResidual: 0,
      vidaUtilAnios: 0
    };

    onChange({ ...sublevel, items: [...sublevel.items, newItem] });
  };

  const handleDelete = (id: string) => {
    onChange({
      ...sublevel,
      items: sublevel.items.filter((item) => item.id !== id)
    });
  };

  const errors = useMemo(() => {
    return sublevel.items.map((item) => {
      const descripcion =
        item.descripcion.trim().length > 0
          ? null
          : "Ingresa una descripción";
      const costoAdquisicion =
        item.costoAdquisicion > 0 ? null : "Debe ser mayor que 0";

      let valorResidual: string | null = null;
      if (item.valorResidual < 0) {
        valorResidual = "No puede ser negativo";
      } else if (
        item.costoAdquisicion > 0 &&
        item.valorResidual > item.costoAdquisicion
      ) {
        valorResidual = "No puede superar el costo de adquisición";
      }

      const vidaUtilAnios =
        item.vidaUtilAnios >= 1 ? null : "Debe ser mayor o igual a 1";

      return {
        id: item.id,
        descripcion,
        costoAdquisicion,
        valorResidual,
        vidaUtilAnios
      };
    });
  }, [sublevel.items]);

  const errorsById = useMemo(() => {
    return new Map(errors.map((entry) => [entry.id, entry]));
  }, [errors]);

  const calculations = useMemo(() => {
    return new Map(
      sublevel.items.map((item) => {
        const entry = errorsById.get(item.id);
        const hasBlockingError = Boolean(
          entry?.descripcion ||
            entry?.costoAdquisicion ||
            entry?.valorResidual ||
            entry?.vidaUtilAnios
        );

        if (hasBlockingError) {
          return [item.id, { annual: 0, monthly: 0 }] as const;
        }

        const annual = calculateEquipmentItemDepreciation(item);
        const monthly = calculateEquipmentItemMonthlyDepreciation(item);

        return [item.id, { annual, monthly }] as const;
      })
    );
  }, [sublevel.items, errorsById]);

  const hasBlockingErrors = errors.some((error) =>
    Boolean(
      error.descripcion ||
        error.costoAdquisicion ||
        error.valorResidual ||
        error.vidaUtilAnios
    )
  );

  const showGlobalError = hasBlockingErrors &&
    sublevel.items.some((item) => {
      const touch = touched[item.id];
      return Boolean(
        touch?.descripcion ||
          touch?.costoAdquisicion ||
          touch?.valorResidual ||
          touch?.vidaUtilAnios
      );
    });

  return (
    <section
      className={`space-y-4 rounded-xl border p-4 ${appearance.container}`}
    >
      <header className="flex items-center justify-between gap-4">
        <div>
          <h3 className={`text-lg font-semibold ${appearance.header}`}>
            {sublevel.name}
          </h3>
          <p className={`text-sm ${appearance.description}`}>
            {sublevel.description}
          </p>
          <p className="mt-3 rounded-lg border border-cyan-100 bg-cyan-50/80 p-3 text-xs text-cyan-900">
            Nota: La depreciación se calcula por línea recta: (costo − valor
            residual) / vida útil (años). Se muestra el cargo anual y su
            equivalente mensual. Este criterio es el más simple y ampliamente
            aceptado para asignar sistemáticamente el costo de un activo a lo
            largo de su vida útil.
          </p>
        </div>
        <span className="text-base font-semibold text-inta-green">
          {formatARS(subtotal)}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className={`${appearance.tableHead} text-left`}>
            <tr>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Descripción
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Costo de adquisición (ARS)
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Valor residual (ARS)
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Vida útil (años)
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Depreciación anual (ARS)
              </th>
              <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                Depreciación mensual (ARS)
              </th>
              <th className="px-3 py-2 text-center font-medium text-slate-700">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white/80">
            {sublevel.items.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-6 text-center text-sm text-slate-500"
                  colSpan={7}
                >
                  Agregá el equipamiento específico para calcular su depreciación.
                </td>
              </tr>
            ) : (
              sublevel.items.map((item) => {
                const rowErrors = errorsById.get(item.id);
                const rowTouched = touched[item.id];
                const calculation = calculations.get(item.id) ?? {
                  annual: 0,
                  monthly: 0
                };

                const descriptionHasError =
                  rowErrors?.descripcion && rowTouched?.descripcion;
                const costHasError =
                  rowErrors?.costoAdquisicion && rowTouched?.costoAdquisicion;
                const residualHasError =
                  rowErrors?.valorResidual && rowTouched?.valorResidual;
                const lifeHasError =
                  rowErrors?.vidaUtilAnios && rowTouched?.vidaUtilAnios;

                return (
                  <tr key={item.id}>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="text"
                        value={item.descripcion}
                        onChange={(event) =>
                          handleDescriptionChange(item.id, event.target.value)
                        }
                        onBlur={() => handleBlur(item.id, "descripcion")}
                        placeholder="Ej. Cromatógrafo gaseoso"
                        className={`w-full rounded-md border px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue ${descriptionHasError ? "border-red-500" : "border-slate-300"}`}
                      />
                      {descriptionHasError ? (
                        <p className="mt-1 text-xs text-red-600">
                          {rowErrors?.descripcion}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={
                          item.costoAdquisicion > 0 ? item.costoAdquisicion : ""
                        }
                        onChange={(event) =>
                          handleNumberChange(
                            item.id,
                            "costoAdquisicion",
                            event.target.value
                          )
                        }
                        onBlur={() => handleBlur(item.id, "costoAdquisicion")}
                        placeholder="0,00"
                        className={`w-full rounded-md border px-3 py-2 text-right focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue ${costHasError ? "border-red-500" : "border-slate-300"}`}
                      />
                      {costHasError ? (
                        <p className="mt-1 text-xs text-red-600">
                          {rowErrors?.costoAdquisicion}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.valorResidual}
                        onChange={(event) =>
                          handleNumberChange(
                            item.id,
                            "valorResidual",
                            event.target.value
                          )
                        }
                        onBlur={() => handleBlur(item.id, "valorResidual")}
                        placeholder="0,00"
                        className={`w-full rounded-md border px-3 py-2 text-right focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue ${residualHasError ? "border-red-500" : "border-slate-300"}`}
                      />
                      {residualHasError ? (
                        <p className="mt-1 text-xs text-red-600">
                          {rowErrors?.valorResidual}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={
                          item.vidaUtilAnios > 0 ? item.vidaUtilAnios : ""
                        }
                        onChange={(event) =>
                          handleNumberChange(
                            item.id,
                            "vidaUtilAnios",
                            event.target.value
                          )
                        }
                        onBlur={() => handleBlur(item.id, "vidaUtilAnios")}
                        placeholder="Años"
                        className={`w-full rounded-md border px-3 py-2 text-right focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue ${lifeHasError ? "border-red-500" : "border-slate-300"}`}
                      />
                      {lifeHasError ? (
                        <p className="mt-1 text-xs text-red-600">
                          {rowErrors?.vidaUtilAnios}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top text-right font-medium text-slate-900">
                      {formatARS(calculation.annual)}
                    </td>
                    <td className="px-3 py-2 align-top text-right font-semibold text-inta-green">
                      {formatARS(calculation.monthly)}
                    </td>
                    <td className="px-3 py-2 align-top text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="text-sm font-medium text-red-600 transition hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-inta-blue px-3 py-2 text-sm font-medium text-white transition hover:bg-inta-blue/90"
        >
          <PlusIcon className="h-4 w-4" /> Agregar equipo
        </button>
        <div className="text-sm text-slate-600">
          La depreciación se suma automáticamente al subtotal mensual.
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-white/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className={`text-base font-semibold ${appearance.header}`}>
            Subtotal depreciación (Nivel 1 · b.3)
          </h4>
          <span className="text-base font-semibold text-inta-green">
            {formatARS(subtotal)}
          </span>
        </div>
        {showGlobalError ? (
          <p className="text-sm text-red-600">
            Revisá los campos con error para continuar.
          </p>
        ) : null}
      </div>
    </section>
  );
}
