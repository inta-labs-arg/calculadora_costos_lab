"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, differenceInDays, differenceInMonths, getDaysInMonth } from "date-fns";
import Decimal from "decimal.js";
import { useForm } from "react-hook-form";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
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
  currencyFormatter,
  createInfrastructureDefaultItems
} from "@/lib/cost-calculation";
import { InfoIcon, PlusIcon } from "./icons";
import { InterlaboratoryParticipationSection } from "./InterlaboratoryParticipationSection";
import { ThirdPartyAccreditationSection } from "./ThirdPartyAccreditationSection";

interface IndirectLevelCardProps {
  level: IndirectLevelGroupState;
  onSublevelChange: (sublevel: IndirectSublevelState) => void;
  globalDeterminations: number;
  onGlobalDeterminationsChange?: (value: number) => void;
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

const sanitizeNaN = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value === "number" && Number.isNaN(value)) {
      return undefined;
    }

    return value;
  }, schema);

const maintenanceFormSchema = z
  .object({
    equipmentName: z
      .string({ required_error: "Ingresá el equipo a mantener" })
      .min(1, "Ingresá el equipo a mantener"),
    ctm: sanitizeNaN(
      z
        .number({
          invalid_type_error: "Ingresá el costo total de mantenimiento (CTM)"
        })
        .gt(0, "El CTM debe ser mayor a cero")
    ),
    fechaInicio: z.preprocess(
      (value) =>
        value instanceof Date && !Number.isNaN(value.getTime())
          ? value
          : undefined,
      z.date({ required_error: "Ingresá la fecha de inicio" })
    ),
    fechaFin: z.preprocess(
      (value) =>
        value instanceof Date && !Number.isNaN(value.getTime())
          ? value
          : undefined,
      z.date({ required_error: "Ingresá la fecha de fin" })
    ),
    detMes: sanitizeNaN(
      z
        .number({
          invalid_type_error:
            "Ingresá las determinaciones mensuales promedio (detMes)"
        })
        .gt(0, "Las determinaciones deben ser mayores a cero")
    )
  })
  .refine(
    (data) =>
      data.fechaInicio && data.fechaFin && data.fechaFin > data.fechaInicio,
    {
      message: "La fecha fin debe ser posterior a la fecha inicio",
      path: ["fechaFin"]
    }
  );

type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

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
  globalDeterminations,
  onGlobalDeterminationsChange
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

  const isLevelTwoGroup = level.id === "serviciosGenerales";
  const [determinationsInput, setDeterminationsInput] = useState(
    globalDeterminations.toString()
  );
  const [determinationsError, setDeterminationsError] = useState<string | null>(
    null
  );

  useEffect(() => {
    setDeterminationsInput(globalDeterminations.toString());
  }, [globalDeterminations]);

  const handleDeterminationsChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const nextValue = event.target.value;
    setDeterminationsInput(nextValue);

    if (!isLevelTwoGroup || !onGlobalDeterminationsChange) {
      return;
    }

    if (nextValue.trim() === "") {
      setDeterminationsError("Ingresa las determinaciones mensuales");
      return;
    }

    const numericValue = Number(nextValue);

    if (Number.isNaN(numericValue) || !Number.isInteger(numericValue)) {
      setDeterminationsError("Debe ser un número entero");
      return;
    }

    if (numericValue <= 0) {
      setDeterminationsError("Debe ser mayor a cero");
      return;
    }

    setDeterminationsError(null);
    onGlobalDeterminationsChange(numericValue);
  };

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

      {isLevelTwoGroup ? (
        <section className="space-y-3 rounded-2xl border border-emerald-200 bg-white/85 p-4">
          <header className="space-y-1">
            <h3 className="text-base font-semibold text-emerald-900">
              Determinaciones mensuales del laboratorio (DM)
            </h3>
            <p className="text-sm text-emerald-800">
              Este valor funciona como base de prorrateo para los subniveles 2.1
              a 2.4 y se utiliza para calcular los costos unitarios indirectos.
            </p>
          </header>
          <label className="flex flex-col gap-1 sm:max-w-xs">
            <span className="text-sm font-medium text-emerald-900">
              Cantidad de determinaciones mensuales
            </span>
            <input
              type="number"
              min={1}
              step={1}
              value={determinationsInput}
              onChange={handleDeterminationsChange}
              className="rounded-md border border-emerald-200 px-3 py-2 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
            />
            {determinationsError ? (
              <span className="text-xs text-rose-600">
                {determinationsError}
              </span>
            ) : (
              <span className="text-xs text-emerald-700">
                Ingresá un número entero positivo de determinaciones mensuales.
              </span>
            )}
          </label>
        </section>
      ) : null}

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
            if (sublevel.id === maintenanceSublevelId) {
              return (
                <MaintenanceEquipmentSection
                  key={sublevel.id}
                  sublevel={sublevel}
                  onChange={onSublevelChange}
                  appearance={appearance}
                  globalDeterminations={globalDeterminations}
                  useGlobalDeterminations={useGlobalDeterminations}
                />
              );
            }

            if (sublevel.id === thirdPartyAccreditationSublevelId) {
              return (
                <ThirdPartyAccreditationSection
                  key={sublevel.id}
                  sublevel={sublevel}
                  onChange={onSublevelChange}
                  appearance={appearance}
                  globalDeterminations={globalDeterminations}
                />
              );
            }

            if (sublevel.id === interlaboratoryParticipationSublevelId) {
              return (
                <InterlaboratoryParticipationSection
                  key={sublevel.id}
                  sublevel={sublevel}
                  onChange={onSublevelChange}
                  appearance={appearance}
                  globalDeterminations={globalDeterminations}
                />
              );
            }

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

interface MaintenanceEquipmentSectionProps
  extends SharedResourceSublevelSectionProps {}

const maintenanceSublevelId = "mantenimientoEquipamiento";
const thirdPartyAccreditationSublevelId = "acreditacionTercerasPartes";
const interlaboratoryParticipationSublevelId = "ensayosInterlaboratorio";
const infrastructureSublevelId = "infraestructura";
const numberFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 4
});
const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium"
});

const sublevelTooltips: Partial<
  Record<IndirectSublevelState["id"], { title: string; ariaLabel?: string }>
> = {
  equipamientoMenor: {
    title:
      "Método lineal prorrateado entre las determinaciones mensuales del laboratorio (criterio guía INTA)."
  },
  infraestructura: {
    title:
      "Incluye costos fijos mensuales: Energía, Gas, Agua, Limpieza, Administración y Comunicaciones. Se prorratean por determinaciones mensuales."
  }
};

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
  const isInfrastructureSublevel = sublevel.id === infrastructureSublevelId;
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

  useEffect(() => {
    if (!isInfrastructureSublevel || sublevel.items.length > 0) {
      return;
    }

    onChange({
      ...sublevel,
      items: createInfrastructureDefaultItems(globalDeterminations)
    });
  }, [
    globalDeterminations,
    isInfrastructureSublevel,
    onChange,
    sublevel
  ]);

  useEffect(() => {
    if (!isInfrastructureSublevel || sublevel.items.length === 0) {
      return;
    }

    const normalizedDeterminations =
      globalDeterminations > 0 ? globalDeterminations : 0;

    const shouldUpdate = sublevel.items.some(
      (item) => item.determinations !== normalizedDeterminations
    );

    if (!shouldUpdate) {
      return;
    }

    const updatedItems = sublevel.items.map((item) => ({
      ...item,
      determinations: normalizedDeterminations,
      isCustomDeterminations:
        normalizedDeterminations > 0 ? false : undefined
    }));

    onChange({ ...sublevel, items: updatedItems });
  }, [
    globalDeterminations,
    isInfrastructureSublevel,
    onChange,
    sublevel
  ]);

  const handleAdd = () => {
    setError(null);

    if (draft.monthlyCost === "") {
      setError(
        useGlobalDeterminations
          ? "Completa el costo mensual para agregar el concepto"
          : "Completa el costo mensual y las determinaciones"
      );
      return;
    }

    if (!useGlobalDeterminations && draft.determinations === "") {
      setError("Completa el costo mensual y las determinaciones");
      return;
    }

    const determinationsValue = useGlobalDeterminations
      ? globalDeterminations
      : Number(draft.determinations);

    if (useGlobalDeterminations && determinationsValue <= 0) {
      setError(
        "Definí la base global de prorrateo (DM) antes de cargar conceptos"
      );
      return;
    }

    const parsed = sharedResourceSchema.safeParse({
      concept: draft.concept.trim(),
      monthlyCost: Number(draft.monthlyCost),
      determinations: determinationsValue
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    const newItem: SharedResourceCostItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...parsed.data
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
    field: "concept" | "monthlyCost" | "determinations",
    value: string
  ) => {
    const updated = sublevel.items.map((item) => {
      if (item.id !== id) {
        return item;
      }

      if (field === "concept") {
        if (item.isFixed && !item.allowConceptEdit) {
          return item;
        }

        return { ...item, concept: value };
      }

      const numericValue = Number(value);

      if (Number.isNaN(numericValue) || numericValue <= 0) {
        return item;
      }

      if (field === "determinations") {
        if (useGlobalDeterminations) {
          return item;
        }

        return {
          ...item,
          determinations: numericValue
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
    const target = sublevel.items.find((item) => item.id === id);

    if (target?.isFixed) {
      return;
    }

    onChange({
      ...sublevel,
      items: sublevel.items.filter((item) => item.id !== id)
    });
  };

  const isMaintenanceSublevel = sublevel.id === maintenanceSublevelId;
  const tooltip = sublevelTooltips[sublevel.id];

  const showGlobalDeterminationsWarning =
    useGlobalDeterminations && globalDeterminations <= 0;

  return (
    <section
      className={`space-y-3 rounded-xl border p-4 ${appearance.container}`}
    >
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className={`text-lg font-semibold ${appearance.header}`}>
              {sublevel.name}
            </h3>
            {tooltip ? (
              <InfoIcon
                className={`h-4 w-4 ${appearance.header}`}
                aria-label={tooltip.ariaLabel ?? tooltip.title}
                title={tooltip.title}
              />
            ) : null}
          </div>
          <span className="text-base font-semibold text-inta-green">
            {currencyFormatter.format(subtotal)}
          </span>
        </div>
        <p className={`text-sm ${appearance.description}`}>
          {sublevel.description}
        </p>
        {isMaintenanceSublevel ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
            <InfoIcon
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              aria-label="Referencia de mantenimiento y calibración"
              title="Considerá contratos de mantenimiento, calibraciones periódicas y ajustes requeridos para asegurar la aptitud del equipo."
            />
            <p className="leading-snug">
              Este subnivel contempla gastos de mantenimiento y calibración periódica de equipos conforme a prácticas ISO/IEC 17025/GLP.
            </p>
          </div>
        ) : null}
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
                {useGlobalDeterminations
                  ? "Determinaciones mensuales (DM global)"
                  : "Determinaciones mensuales"}
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
                    disabled={item.isFixed && !item.allowConceptEdit}
                    onChange={(event) =>
                      handleFieldChange(item.id, "concept", event.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
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
                  {useGlobalDeterminations ? (
                    <span className="inline-flex min-w-[6rem] items-center justify-center rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                      {globalDeterminations > 0
                        ? `${globalDeterminations} DM`
                        : "Definir DM"}
                    </span>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      step={1}
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
                  )}
                </td>
                <td className="px-3 py-2 font-medium text-slate-700">
                  {currencyFormatter.format(
                    calculateSharedResourceItemCost(item)
                  )}
                </td>
                <td className="px-3 py-2">
                  {item.isFixed ? (
                    <span className="text-xs font-medium text-slate-400">
                      Fijo
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="text-sm font-medium text-rose-600 hover:text-rose-500"
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showGlobalDeterminationsWarning ? (
        <p className="text-sm text-amber-700">
          Definí la base global de prorrateo (DM) para calcular los costos
          unitarios de infraestructura.
        </p>
      ) : null}

      <form
        className={`grid gap-3 rounded-lg border border-dashed p-4 text-sm ${appearance.form} ${
          useGlobalDeterminations ? "md:grid-cols-3" : "md:grid-cols-4"
        }`}
        onSubmit={(event) => {
          event.preventDefault();
          handleAdd();
        }}
      >
        {isMaintenanceSublevel ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-amber-900 md:col-span-4">
            <InfoIcon
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              aria-label="Referencia de mantenimiento y calibración"
              title="Considerá contratos de mantenimiento, calibraciones periódicas y ajustes requeridos para asegurar la aptitud del equipo."
            />
            <p className="text-sm leading-snug">
              Este subnivel contempla gastos de mantenimiento y calibración periódica de equipos conforme a prácticas ISO/IEC 17025/GLP.
            </p>
          </div>
        ) : null}
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
        {useGlobalDeterminations ? null : (
          <label className="flex flex-col space-y-1">
            <span>Determinaciones mensuales</span>
            <input
              type="number"
              min={1}
              step={1}
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
        )}

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

type MaintenanceCalculationResult = {
  ready: boolean;
  months: Decimal | null;
  shortPeriod: boolean;
  ctm: Decimal | null;
  cmm: Decimal | null;
  cam: Decimal | null;
  effectiveDeterminations: Decimal | null;
  ipd: Decimal | null;
  detWarning: boolean;
  monthsInteger: number;
  daysRemainder: number;
  baseMonthDays: number;
};

function MaintenanceEquipmentSection({
  sublevel,
  onChange,
  appearance,
  globalDeterminations,
  useGlobalDeterminations
}: MaintenanceEquipmentSectionProps) {
  const subtotal = useMemo(
    () => calculateIndirectSublevelSubtotal(sublevel),
    [sublevel]
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    resetField,
    formState: { errors, isValid }
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    mode: "onChange",
    defaultValues: {
      equipmentName: "",
      detMes:
        useGlobalDeterminations && globalDeterminations > 0
          ? globalDeterminations
          : undefined
    }
  });

  useEffect(() => {
    if (!useGlobalDeterminations) {
      return;
    }

    if (globalDeterminations > 0) {
      setValue("detMes", globalDeterminations, {
        shouldDirty: false,
        shouldValidate: true
      });
    } else {
      resetField("detMes", { defaultValue: undefined });
    }
  }, [globalDeterminations, resetField, setValue, useGlobalDeterminations]);

  const ctm = watch("ctm");
  const fechaInicio = watch("fechaInicio");
  const fechaFin = watch("fechaFin");
  const detMes = watch("detMes");

  const results = useMemo<MaintenanceCalculationResult>(() => {
    const baseResult: MaintenanceCalculationResult = {
      ready: false,
      months: null,
      shortPeriod: false,
      ctm: null,
      cmm: null,
      cam: null,
      effectiveDeterminations: null,
      ipd: null,
      detWarning: false,
      monthsInteger: 0,
      daysRemainder: 0,
      baseMonthDays: 0
    };

    const isValidNumber = (value: unknown): value is number =>
      typeof value === "number" && Number.isFinite(value);
    const isValidDate = (value: unknown): value is Date =>
      value instanceof Date && !Number.isNaN(value.getTime());

    if (
      !isValidNumber(ctm) ||
      !isValidDate(fechaInicio) ||
      !isValidDate(fechaFin) ||
      !isValidNumber(detMes)
    ) {
      return baseResult;
    }

    if (fechaFin <= fechaInicio) {
      return baseResult;
    }

    const monthsInteger = differenceInMonths(fechaFin, fechaInicio);
    const anchorDate = addMonths(fechaInicio, monthsInteger);
    const daysRemainder = differenceInDays(fechaFin, anchorDate);
    const baseMonthDays = getDaysInMonth(anchorDate);
    const fractionRaw =
      baseMonthDays === 0 ? 0 : daysRemainder / baseMonthDays;
    const fraction = Math.min(Math.max(fractionRaw, 0), 0.99999);
    const months = new Decimal(monthsInteger).plus(fraction);

    if (months.lte(0)) {
      return baseResult;
    }

    const shortPeriod = months.lt(0.1);
    const ctmDecimal = new Decimal(ctm);
    const cmm = ctmDecimal.dividedBy(months);
    const cam = cmm.times(12);

    const detMesDecimal = new Decimal(detMes);
    const effectiveDeterminations = detMesDecimal;
    const detWarning = detMesDecimal.lte(0);

    const ipd =
      detWarning || effectiveDeterminations.lte(0)
        ? null
        : cmm.dividedBy(effectiveDeterminations);

    return {
      ready: true,
      months,
      shortPeriod,
      ctm: ctmDecimal,
      cmm,
      cam,
      effectiveDeterminations,
      ipd,
      detWarning,
      monthsInteger,
      daysRemainder,
      baseMonthDays
    };
  }, [ctm, fechaInicio, fechaFin, detMes]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setSubmitError(null);
  }, [ctm, fechaInicio, fechaFin, detMes]);

  const handleAddMaintenance = handleSubmit((data) => {
    if (
      !results.ready ||
      !results.cmm ||
      !results.effectiveDeterminations ||
      results.ipd === null ||
      !results.ctm ||
      !results.months
    ) {
      setSubmitError(
        "Completá los campos obligatorios para calcular el mantenimiento antes de agregarlo."
      );
      return;
    }

    const monthsValue = results.months
      .toDecimalPlaces(6, Decimal.ROUND_HALF_UP)
      .toNumber();
    const cmmValue = results.cmm
      .toDecimalPlaces(6, Decimal.ROUND_HALF_UP)
      .toNumber();
    const determinationsValue = results.effectiveDeterminations
      .toDecimalPlaces(6, Decimal.ROUND_HALF_UP)
      .toNumber();
    const ctmValue = results.ctm
      .toDecimalPlaces(6, Decimal.ROUND_HALF_UP)
      .toNumber();
    const camValue = results.cam
      ? results.cam.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toNumber()
      : cmmValue * 12;
    const ipdValue = results.ipd
      ? results.ipd.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toNumber()
      : 0;

    const newItem: SharedResourceCostItem = {
      id: `maintenance-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,
      concept: data.equipmentName.trim(),
      monthlyCost: cmmValue,
      determinations: determinationsValue,
      isFixed: true,
      maintenanceDetails: {
        ctm: ctmValue,
        cam: camValue,
        months: monthsValue,
        detMes: data.detMes,
        period: {
          start: data.fechaInicio.toISOString(),
          end: data.fechaFin.toISOString()
        },
        ipd: ipdValue
      }
    };

    onChange({ ...sublevel, items: [...sublevel.items, newItem] });
    setSubmitError(null);

    setValue("equipmentName", "", {
      shouldDirty: false,
      shouldValidate: false
    });
    resetField("ctm");
    resetField("fechaInicio");
    resetField("fechaFin");
  });

  const monthsDisplay =
    results.ready && results.months
      ? numberFormatter.format(
          results.months
            .toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
            .toNumber()
        )
      : "—";
  const effectiveDeterminationsDisplay =
    results.ready && results.effectiveDeterminations
      ? numberFormatter.format(
          results.effectiveDeterminations
            .toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
            .toNumber()
        )
      : "—";
  const ctmDisplay =
    results.ready && results.ctm
      ? currencyFormatter.format(results.ctm.toNumber())
      : "—";
  const cmmDisplay =
    results.ready && results.cmm
      ? currencyFormatter.format(results.cmm.toNumber())
      : "—";
  const camDisplay =
    results.ready && results.cam
      ? currencyFormatter.format(results.cam.toNumber())
      : "—";
  const ipdDisplay =
    results.ready && results.ipd
      ? currencyFormatter.format(results.ipd.toNumber())
      : "—";
  const ipdDisabled =
    !results.ready || results.ipd === null || !results.effectiveDeterminations;
  const ipdTooltip = results.detWarning
    ? "Ingresá un detMes mayor a cero para habilitar la incidencia por determinación."
    : "Completá los campos obligatorios para obtener la incidencia por determinación.";

  const showGlobalDeterminationsWarning =
    useGlobalDeterminations && globalDeterminations <= 0;
  const maintenanceItems = sublevel.items;
  const maintenanceTableEmpty = maintenanceItems.length === 0;

  const handleDeleteMaintenance = (id: string) => {
    onChange({
      ...sublevel,
      items: sublevel.items.filter((item) => item.id !== id)
    });
  };

  return (
    <section
      className={`space-y-4 rounded-xl border p-4 ${appearance.container}`}
    >
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className={`text-lg font-semibold ${appearance.header}`}>
              {sublevel.name}
            </h3>
            <InfoIcon
              className={`h-4 w-4 ${appearance.header}`}
              aria-label="Ejemplos de mantenimiento"
              title="Ejemplos: limpieza, ajustes, repuestos"
            />
          </div>
          <span className="text-base font-semibold text-inta-green">
            {currencyFormatter.format(subtotal)}
          </span>
        </div>
        <p className={`text-sm ${appearance.description}`}>
          {sublevel.description}
        </p>
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
          <InfoIcon
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <p className="leading-snug">
            Este subnivel contempla gastos de mantenimiento y calibración periódica de equipos conforme a prácticas ISO/IEC 17025/GLP.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className={`space-y-4 rounded-lg border p-4 ${appearance.form}`}
          onSubmit={handleAddMaintenance}
        >
          <label className="flex flex-col space-y-1">
            <span>Equipo a mantener</span>
            <input
              type="text"
              placeholder="Centrífuga refrigerada"
              className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              {...register("equipmentName")}
            />
            {errors.equipmentName ? (
              <span className="text-xs text-rose-600">
                {errors.equipmentName.message}
              </span>
            ) : (
              <span className="text-xs text-emerald-700">
                Identificá el equipo o contrato de mantenimiento que estás cargando.
              </span>
            )}
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col space-y-1">
              <span>CTM (ARS)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="24000"
                className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                {...register("ctm", { valueAsNumber: true })}
              />
              {errors.ctm ? (
                <span className="text-xs text-rose-600">
                  {errors.ctm.message}
                </span>
              ) : (
                <span className="text-xs text-emerald-700">
                  Costo total de mantenimiento para el período analizado.
                </span>
              )}
            </label>
            <label className="flex flex-col space-y-1">
              <span>
                Determinaciones mensuales promedio (detMes)
                {useGlobalDeterminations ? " (DM global)" : null}
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                readOnly={useGlobalDeterminations && globalDeterminations > 0}
                className={`rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue ${
                  useGlobalDeterminations && globalDeterminations > 0
                    ? "bg-slate-100"
                    : ""
                }`}
                placeholder="300"
                {...register("detMes", { valueAsNumber: true })}
              />
              {errors.detMes ? (
                <span className="text-xs text-rose-600">
                  {errors.detMes.message}
                </span>
              ) : useGlobalDeterminations ? (
                <span className="text-xs text-emerald-700">
                  Se utiliza el valor global de determinaciones mensuales para el prorrateo.
                </span>
              ) : (
                <span className="text-xs text-emerald-700">
                  Promedio mensual de determinaciones soportadas por el equipo.
                </span>
              )}
              {showGlobalDeterminationsWarning ? (
                <span className="text-xs text-amber-700">
                  Definí la base global de prorrateo en la cabecera de Nivel 2 para precargar este campo.
                </span>
              ) : null}
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col space-y-1">
              <span>Fecha de inicio</span>
              <input
                type="date"
                className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                {...register("fechaInicio", { valueAsDate: true })}
              />
              {errors.fechaInicio ? (
                <span className="text-xs text-rose-600">
                  {errors.fechaInicio.message}
                </span>
              ) : (
                <span className="text-xs text-emerald-700">
                  Día desde el cual aplica el contrato o servicio.
                </span>
              )}
            </label>
            <label className="flex flex-col space-y-1">
              <span>Fecha de fin</span>
              <input
                type="date"
                className="rounded-md border border-slate-300 px-3 py-2 focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                {...register("fechaFin", { valueAsDate: true })}
              />
              {errors.fechaFin ? (
                <span className="text-xs text-rose-600">
                  {errors.fechaFin.message}
                </span>
              ) : (
                <span className="text-xs text-emerald-700">
                  Día de finalización del servicio o contrato.
                </span>
              )}
            </label>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              type="submit"
              className="rounded-md bg-inta-blue px-3 py-2 text-sm font-medium text-white transition hover:bg-inta-blue/90 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={
                !isValid ||
                !results.ready ||
                !results.cmm ||
                !results.effectiveDeterminations ||
                results.ipd === null
              }
            >
              Agregar mantenimiento de equipo
            </button>
            {submitError ? (
              <span className="text-xs text-rose-600">{submitError}</span>
            ) : null}
          </div>
        </form>

        <aside className={`space-y-4 rounded-lg border p-4 ${appearance.form}`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span
                className="font-medium text-emerald-900"
                title="Meses completos más fracción proporcional según los días restantes entre las fechas ingresadas."
              >
                Meses prorrateados exactos (M)
              </span>
              <span className="font-semibold text-emerald-800">
                {monthsDisplay}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span
                className="font-medium text-emerald-900"
                title="CTM declarado para el período considerado."
              >
                CTM (ARS)
              </span>
              <span className="font-semibold text-emerald-800">
                {ctmDisplay}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span
                className="font-medium text-emerald-900"
                title="CMM = CTM ÷ meses prorrateados (M)."
              >
                Costo mensual de mantenimiento (CMM)
              </span>
              <span className="font-semibold text-emerald-800">
                {cmmDisplay}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span
                className="font-medium text-emerald-900"
                title="CAM = CMM × 12."
              >
                Costo anual de mantenimiento (CAM)
              </span>
              <span className="font-semibold text-emerald-800">
                {camDisplay}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span
                className="font-medium text-emerald-900"
                title="Determinaciones mensuales promedio informadas (detMes)."
              >
                Determinaciones mensuales (detMes)
              </span>
              <span className="font-semibold text-emerald-800">
                {effectiveDeterminationsDisplay}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span
                className="font-medium text-emerald-900"
                title="IPD = CMM ÷ determinaciones mensuales (detMes)."
              >
                Incidencia por determinación (IPD)
              </span>
              <span
                className={`font-semibold ${
                  ipdDisabled ? "text-slate-500" : "text-emerald-800"
                }`}
                title={ipdDisabled ? ipdTooltip : undefined}
              >
                {ipdDisplay}
              </span>
            </div>
          </div>

          {results.shortPeriod ? (
            <p className="text-sm text-amber-700">
              Período demasiado corto, verifique fechas (M &lt; 0,1 meses).
            </p>
          ) : null}

          {results.detWarning ? (
            <p className="text-sm text-amber-700">
              Ingresá un detMes mayor a cero para obtener la incidencia por
              determinación.
            </p>
          ) : null}
        </aside>
      </div>

      <section className={`space-y-3 rounded-lg border p-4 ${appearance.form}`}>
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h4 className={`text-base font-semibold ${appearance.header}`}>
            Equipos cargados
          </h4>
          <span className="text-xs text-emerald-700">
            Cada fila se suma al subtotal del subnivel.
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
                  Período analizado
                </th>
                <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                  CTM (ARS)
                </th>
                <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                  Meses prorrateados (M)
                </th>
                <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                  CMM (ARS/mes)
                </th>
                <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                  Determinaciones mensuales (detMes)
                </th>
                <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                  IPD (ARS/det)
                </th>
                <th className={`px-3 py-2 font-medium ${appearance.header}`}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {maintenanceTableEmpty ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-sm text-slate-500"
                  >
                    Aún no se cargaron mantenimientos. Utilizá el formulario para
                    agregar equipos.
                  </td>
                </tr>
              ) : null}
              {maintenanceItems.map((item) => {
                const details = item.maintenanceDetails;
                let periodLabel = "—";
                let periodTitle: string | undefined;

                if (details) {
                  const startDate = new Date(details.period.start);
                  const endDate = new Date(details.period.end);
                  const startValid = !Number.isNaN(startDate.getTime());
                  const endValid = !Number.isNaN(endDate.getTime());

                  if (startValid && endValid) {
                    const startLabel = dateFormatter.format(startDate);
                    const endLabel = dateFormatter.format(endDate);
                    periodLabel = `${startLabel} → ${endLabel}`;
                    const detMesLabel = numberFormatter.format(details.detMes);
                    periodTitle = `Período analizado: ${startLabel} al ${endLabel}. detMes promedio: ${detMesLabel}.`;
                  }
                }

                const ctmCell =
                  details && Number.isFinite(details.ctm)
                    ? currencyFormatter.format(details.ctm)
                    : "—";
                const monthsCell =
                  details && Number.isFinite(details.months)
                    ? numberFormatter.format(details.months)
                    : "—";
                const cmmCell = Number.isFinite(item.monthlyCost)
                  ? currencyFormatter.format(item.monthlyCost)
                  : "—";
                const determinationsCell = Number.isFinite(item.determinations)
                  ? numberFormatter.format(item.determinations)
                  : "—";
                const ipdFromItem =
                  item.determinations > 0
                    ? item.monthlyCost / item.determinations
                    : 0;
                const ipdCell =
                  details && Number.isFinite(details.ipd)
                    ? currencyFormatter.format(details.ipd)
                    : currencyFormatter.format(ipdFromItem);

                return (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-medium text-slate-700">
                      {item.concept}
                    </td>
                    <td className="px-3 py-2" title={periodTitle}>
                      {periodLabel}
                    </td>
                    <td className="px-3 py-2" title="CTM declarado">
                      {ctmCell}
                    </td>
                    <td
                      className="px-3 py-2"
                      title="Meses prorrateados exactos (M)."
                    >
                      {monthsCell}
                    </td>
                    <td
                      className="px-3 py-2"
                      title="CMM = CTM ÷ meses prorrateados (M)."
                    >
                      {cmmCell}
                    </td>
                    <td
                      className="px-3 py-2"
                      title="Determinaciones mensuales promedio (detMes)."
                    >
                      {determinationsCell}
                    </td>
                    <td
                      className="px-3 py-2"
                      title="IPD = CMM ÷ determinaciones mensuales (detMes)."
                    >
                      {ipdCell}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteMaintenance(item.id)}
                        className="text-sm font-medium text-rose-600 hover:text-rose-500"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
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
  const tooltip = sublevelTooltips[sublevel.id];
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

    if (draft.purchasePrice === "" || draft.usefulLifeMonths === "") {
      setError(
        useGlobalDeterminations
          ? "Completa el precio y la vida útil para agregar el equipo"
          : "Completa el precio, la vida útil y las determinaciones"
      );
      return;
    }

    if (!useGlobalDeterminations && draft.determinations === "") {
      setError("Completa el precio, la vida útil y las determinaciones");
      return;
    }

    const determinationsValue = useGlobalDeterminations
      ? globalDeterminations
      : Number(draft.determinations);

    if (useGlobalDeterminations && determinationsValue <= 0) {
      setError(
        "Definí la base global de prorrateo (DM) antes de cargar equipos"
      );
      return;
    }

    const parsed = indirectEquipmentSchema.safeParse({
      name: draft.name.trim(),
      purchasePrice: Number(draft.purchasePrice),
      usefulLifeMonths: Number(draft.usefulLifeMonths),
      determinations: determinationsValue
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    const newItem: IndirectEquipmentItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...parsed.data
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
        if (useGlobalDeterminations) {
          return item;
        }

        return {
          ...item,
          determinations: numericValue
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
          <div className="flex items-center gap-2">
            <h3 className={`text-lg font-semibold ${appearance.header}`}>
              {sublevel.name}
            </h3>
            {tooltip ? (
              <InfoIcon
                className={`h-4 w-4 ${appearance.header}`}
                aria-label={tooltip.ariaLabel ?? tooltip.title}
                title={tooltip.title}
              />
            ) : null}
          </div>
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
                {useGlobalDeterminations
                  ? "Determinaciones mensuales (DM global)"
                  : "Determinaciones mensuales"}
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
                  {useGlobalDeterminations ? (
                    <span className="inline-flex min-w-[6rem] items-center justify-center rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                      {globalDeterminations > 0
                        ? `${globalDeterminations} DM`
                        : "Definir DM"}
                    </span>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      step={1}
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
                  )}
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
        className={`grid gap-3 rounded-lg border border-dashed p-4 text-sm ${appearance.form} ${
          useGlobalDeterminations ? "md:grid-cols-4" : "md:grid-cols-5"
        }`}
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
