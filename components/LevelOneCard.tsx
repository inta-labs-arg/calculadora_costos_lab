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
  calculateEquipmentItemCost,
  calculateEquipmentSublevelTotals,
  calculateSublevelSubtotal,
  calculateLaborItemCost,
  calculateSupplyItemCost,
  calculateSupplyItemUnitPrice,
  currencyFormatter,
  LABOR_MONTHLY_HOURS
} from "@/lib/cost-calculation";
import { PlusIcon } from "./icons";
import { appConfig } from "@/lib/app-config";
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
    .min(0, "La cantidad debe ser mayor o igual a cero"),
  mermaFactor: z
    .preprocess((value) => {
      if (
        value === "" ||
        value === null ||
        typeof value === "undefined" ||
        (typeof value === "number" && Number.isNaN(value))
      ) {
        return undefined;
      }
      return value;
    },
    z
      .number({ invalid_type_error: "Ingresa un valor entre 0 y 1" })
      .finite("Ingresa un valor entre 0 y 1")
      .min(0, "La merma no puede ser negativa")
      .max(1, "La merma no puede superar 1")
    )
    .optional()
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
      cantidadUsada: 0,
      mermaFactor: 0
    }
  });

  const uomBase = watch("uomBase");
  const cantidadPresentacion = watch("cantidadPresentacion");
  const precioPresentacion = watch("precioPresentacion");
  const uomUso = watch("uomUso");
  const cantidadUsada = watch("cantidadUsada");
  const mermaFactor = watch("mermaFactor");

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

    const mermaDecimal = new Decimal(mermaFactor ?? 0);
    const precioUnitario = new Decimal(precioPresentacion).div(
      new Decimal(cantidadPresentacion)
    );
    const cantidadEfectiva = new Decimal(cantidadUsada).mul(
      mermaDecimal.plus(1)
    );

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
    mermaFactor,
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
              <label className={`flex flex-col text-sm ${appearance.description}`}>
                Merma (factor opcional)
                <input
                  type="number"
                  step="0.001"
                  min={0}
                  max={1}
                  {...register("mermaFactor", { valueAsNumber: true })}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  placeholder="Ej. 0,02"
                />
                {errors.mermaFactor ? (
                  <span className="mt-1 text-xs text-red-600">
                    {errors.mermaFactor.message}
                  </span>
                ) : (
                  <span className="mt-1 text-xs text-slate-500">
                    Entre 0 y 1. Ej.: 0,02 = 2% adicional.
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
