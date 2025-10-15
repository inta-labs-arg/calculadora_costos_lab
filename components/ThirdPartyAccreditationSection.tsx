"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  addMonths,
  differenceInDays,
  differenceInMonths,
  getDaysInMonth
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
  SharedResourceCostItem,
  SharedResourceSublevelState,
  calculateIndirectSublevelSubtotal,
  currencyFormatter
} from "@/lib/cost-calculation";
import { PlusIcon } from "./icons";

type SublevelAppearance = {
  container: string;
  header: string;
  description: string;
  tableHead: string;
  form: string;
  badge: string;
};

interface ThirdPartyAccreditationSectionProps {
  sublevel: SharedResourceSublevelState;
  onChange: (updated: SharedResourceSublevelState) => void;
  appearance: SublevelAppearance;
  globalDeterminations: number;
}

const accreditationItemSchema = z
  .object({
    formId: z.string().optional(),
    organismo: z
      .string({ required_error: "Ingresá el organismo acreditador" })
      .min(1, "Ingresá el organismo acreditador"),
    cta: z.preprocess(
      (value) => {
        if (typeof value === "number") {
          return Number.isNaN(value) ? undefined : value;
        }

        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed === "") {
            return undefined;
          }

          const parsed = Number(trimmed);
          return Number.isNaN(parsed) ? undefined : parsed;
        }

        return undefined;
      },
      z
        .number({
          required_error: "Ingresá el costo total de acreditación (CTA)",
          invalid_type_error: "Ingresá el costo total de acreditación (CTA)"
        })
        .gt(0, "El CTA debe ser mayor a cero")
    ),
    fechaInicio: z.preprocess(
      (value) => {
        if (value instanceof Date) {
          return Number.isNaN(value.getTime()) ? undefined : value;
        }

        if (typeof value === "string") {
          if (value.trim() === "") {
            return undefined;
          }

          const parsed = new Date(value);
          return Number.isNaN(parsed.getTime()) ? undefined : parsed;
        }

        return undefined;
      },
      z.date({ required_error: "Ingresá la fecha de inicio" })
    ),
    fechaFin: z.preprocess(
      (value) => {
        if (value instanceof Date) {
          return Number.isNaN(value.getTime()) ? undefined : value;
        }

        if (typeof value === "string") {
          if (value.trim() === "") {
            return undefined;
          }

          const parsed = new Date(value);
          return Number.isNaN(parsed.getTime()) ? undefined : parsed;
        }

        return undefined;
      },
      z.date({ required_error: "Ingresá la fecha de fin" })
    )
  })
  .refine(
    (data) => data.fechaFin > data.fechaInicio,
    {
      message: "La fecha fin debe ser posterior a la fecha inicio",
      path: ["fechaFin"]
    }
  );

const accreditationFormSchema = z.object({
  accreditations: z.array(accreditationItemSchema)
});

type AccreditationFormValues = {
  accreditations: Array<{
    formId?: string;
    organismo?: string;
    cta?: string | number;
    fechaInicio?: string | Date;
    fechaFin?: string | Date;
  }>;
};

type AccreditationDraftValues = {
  organismo?: string;
  cta?: string | number;
  fechaInicio?: string | Date;
  fechaFin?: string | Date;
};

type AccreditationComputation = {
  index: number;
  formId?: string;
  organismo: string;
  cta?: number;
  fechaInicio?: Date;
  fechaFin?: Date;
  months?: number;
  monthlyCost?: number;
  annualCost?: number;
  shortPeriod?: boolean;
  isValid: boolean;
};

type ValidAccreditationComputation = AccreditationComputation & {
  cta: number;
  fechaInicio: Date;
  fechaFin: Date;
  months: number;
  monthlyCost: number;
  annualCost: number;
  shortPeriod: boolean;
  isValid: true;
};

const monthsFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4
});

const numberFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function createItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseStoredDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDateInputValue(date: Date | null) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function isValidAccreditation(
  item: AccreditationComputation
): item is ValidAccreditationComputation {
  return item.isValid;
}

function calculateExactMonths(start: Date, end: Date) {
  // Calcula M como meses exactos utilizando la estrategia solicitada: meses completos
  // (differenceInMonths) más la fracción proporcional de días restantes sobre el mes base.
  const fullMonths = differenceInMonths(end, start);
  const monthAnchor = addMonths(start, fullMonths);
  const remainingDays = differenceInDays(end, monthAnchor);
  const baseMonthDays = getDaysInMonth(monthAnchor);
  const fractionalMonths = baseMonthDays > 0 ? remainingDays / baseMonthDays : 0;
  const boundedFraction = Math.min(Math.max(fractionalMonths, 0), 0.99999);
  const months = fullMonths + boundedFraction;

  return {
    months,
    shortPeriod: months < 0.1
  };
}

export function ThirdPartyAccreditationSection({
  sublevel,
  onChange,
  appearance,
  globalDeterminations
}: ThirdPartyAccreditationSectionProps) {
  const subtotal = useMemo(
    () => calculateIndirectSublevelSubtotal(sublevel),
    [sublevel]
  );

  const defaultValues = useMemo<AccreditationFormValues>(
    () => ({
      accreditations: sublevel.items.map((item) => {
        const details = item.accreditationDetails;
        const startDate = details ? parseStoredDate(details.period.start) : null;
        const endDate = details ? parseStoredDate(details.period.end) : null;

        return {
          formId: item.id,
          organismo: details?.organismo ?? item.concept ?? "",
          cta:
            details && Number.isFinite(details.cta)
              ? details.cta.toString()
              : item.monthlyCost && details?.months
              ? (item.monthlyCost * details.months).toString()
              : "",
          fechaInicio: formatDateInputValue(startDate),
          fechaFin: formatDateInputValue(endDate)
        };
      })
    }),
    [sublevel]
  );

  const {
    control,
    register,
    watch,
    reset,
    formState: { errors }
  } = useForm<AccreditationFormValues>({
    resolver: zodResolver(accreditationFormSchema),
    mode: "onChange",
    defaultValues
  });

  const { fields, remove } = useFieldArray({
    control,
    name: "accreditations"
  });

  const {
    register: registerDraft,
    handleSubmit: handleSubmitDraft,
    watch: watchDraft,
    reset: resetDraft,
    formState: { errors: draftErrors, isValid: isDraftValid }
  } = useForm<AccreditationDraftValues>({
    resolver: zodResolver(accreditationItemSchema),
    mode: "onChange",
    defaultValues: {
      organismo: "",
      cta: "",
      fechaInicio: "",
      fechaFin: ""
    }
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const [detMesOverride, setDetMesOverride] = useState("");

  const watchedAccreditations = watch("accreditations");
  const draftValues = watchDraft();

  const computations = useMemo<AccreditationComputation[]>(() => {
    return watchedAccreditations.map((item, index) => {
      const parsed = accreditationItemSchema.safeParse(item);

      if (!parsed.success) {
        return {
          index,
          formId: typeof item.formId === "string" ? item.formId : undefined,
          organismo: typeof item.organismo === "string" ? item.organismo : "",
          isValid: false
        };
      }

      const data = parsed.data;
      const monthsResult = calculateExactMonths(data.fechaInicio, data.fechaFin);
      const months = monthsResult.months;
      const monthlyCost = months > 0 ? data.cta / months : 0;
      const annualCost = monthlyCost * 12;

      return {
        index,
        formId: data.formId,
        organismo: data.organismo,
        cta: data.cta,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        months,
        monthlyCost,
        annualCost,
        shortPeriod: monthsResult.shortPeriod,
        isValid: true
      } satisfies AccreditationComputation;
    });
  }, [watchedAccreditations]);

  const draftComputation = useMemo(() => {
    const parsed = accreditationItemSchema.safeParse(draftValues);

    if (!parsed.success) {
      return null;
    }

    const data = parsed.data;
    const monthsResult = calculateExactMonths(data.fechaInicio, data.fechaFin);
    const months = monthsResult.months;
    const monthlyCost = months > 0 ? data.cta / months : 0;
    const annualCost = monthlyCost * 12;

    return {
      months,
      monthlyCost,
      annualCost,
      shortPeriod: monthsResult.shortPeriod
    } as const;
  }, [draftValues]);

  const draftMonthsDisplay = draftComputation
    ? monthsFormatter.format(draftComputation.months)
    : "—";
  const draftMonthlyCostDisplay = draftComputation
    ? currencyFormatter.format(draftComputation.monthlyCost)
    : "—";
  const draftAnnualCostDisplay = draftComputation
    ? currencyFormatter.format(draftComputation.annualCost)
    : "—";
  const draftOrganismoError = draftErrors.organismo;
  const draftCtaError = draftErrors.cta;
  const draftFechaInicioError = draftErrors.fechaInicio;
  const draftFechaFinError = draftErrors.fechaFin;

  const detMesFromLevelTwo = globalDeterminations;
  const detMesOverrideNumber = Number(detMesOverride);
  const detMesOverrideValid = !Number.isNaN(detMesOverrideNumber)
    ? detMesOverrideNumber
    : 0;
  const detMesEffective =
    detMesFromLevelTwo > 0 ? detMesFromLevelTwo : detMesOverrideValid;

  const detMesOverrideError =
    detMesFromLevelTwo <= 0 && detMesOverride.trim() !== "" && detMesEffective <= 0;

  const validComputations = useMemo(
    () => computations.filter(isValidAccreditation),
    [computations]
  );

  const totalMonthly = useMemo(
    () =>
      validComputations.reduce((acc, item) => acc + (item.monthlyCost ?? 0), 0),
    [validComputations]
  );

  const totalAnnual = totalMonthly * 12;
  const ipd = detMesEffective > 0 ? totalMonthly / detMesEffective : null;

  useEffect(() => {
    const determinationsValue = detMesEffective > 0 ? detMesEffective : 0;

    const items: SharedResourceCostItem[] = validComputations.map((item) => {
      const id = item.formId ?? createItemId();

      return {
        id,
        concept: item.organismo,
        monthlyCost: item.monthlyCost,
        determinations: determinationsValue,
        accreditationDetails: {
          organismo: item.organismo,
          cta: item.cta,
          months: item.months,
          monthlyCost: item.monthlyCost,
          annualCost: item.annualCost,
          detMes: determinationsValue,
          shortPeriod: item.shortPeriod,
          period: {
            start: item.fechaInicio.toISOString(),
            end: item.fechaFin.toISOString()
          }
        }
      };
    });

    const shouldUpdate =
      items.length !== sublevel.items.length ||
      items.some((nextItem, index) => {
        const current = sublevel.items[index];

        if (!current) {
          return true;
        }

        const currentDetails = current.accreditationDetails;
        const nextDetails = nextItem.accreditationDetails;

        if (
          current.id !== nextItem.id ||
          current.concept !== nextItem.concept ||
          Math.abs(current.monthlyCost - nextItem.monthlyCost) > 1e-6 ||
          current.determinations !== nextItem.determinations
        ) {
          return true;
        }

        if (!currentDetails && nextDetails) {
          return true;
        }

        if (!nextDetails) {
          return false;
        }

        if (!currentDetails) {
          return true;
        }

        return (
          currentDetails.organismo !== nextDetails.organismo ||
          Math.abs(currentDetails.cta - nextDetails.cta) > 1e-6 ||
          Math.abs(currentDetails.months - nextDetails.months) > 1e-6 ||
          Math.abs(currentDetails.monthlyCost - nextDetails.monthlyCost) > 1e-6 ||
          Math.abs(currentDetails.annualCost - nextDetails.annualCost) > 1e-6 ||
          currentDetails.detMes !== nextDetails.detMes ||
          currentDetails.shortPeriod !== nextDetails.shortPeriod ||
          currentDetails.period.start !== nextDetails.period.start ||
          currentDetails.period.end !== nextDetails.period.end
        );
      });

    if (shouldUpdate) {
      onChange({ ...sublevel, items });
    }
  }, [detMesEffective, onChange, sublevel, validComputations]);

  const handleAddAccreditation = handleSubmitDraft((rawData) => {
    const data = accreditationItemSchema.parse(rawData);
    const monthsResult = calculateExactMonths(data.fechaInicio, data.fechaFin);
    const months = monthsResult.months;
    const monthlyCost = months > 0 ? data.cta / months : 0;
    const annualCost = monthlyCost * 12;
    const determinationsValue = detMesEffective > 0 ? detMesEffective : 0;

    const newItem: SharedResourceCostItem = {
      id: createItemId(),
      concept: data.organismo,
      monthlyCost,
      determinations: determinationsValue,
      accreditationDetails: {
        organismo: data.organismo,
        cta: data.cta,
        months,
        monthlyCost,
        annualCost,
        detMes: determinationsValue,
        shortPeriod: monthsResult.shortPeriod,
        period: {
          start: data.fechaInicio.toISOString(),
          end: data.fechaFin.toISOString()
        }
      }
    };

    onChange({ ...sublevel, items: [...sublevel.items, newItem] });
    resetDraft({
      organismo: "",
      cta: "",
      fechaInicio: "",
      fechaFin: ""
    });
  });

  return (
    <section
      className={`space-y-4 rounded-xl border p-4 shadow-sm ${appearance.container}`}
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={`text-lg font-semibold ${appearance.header}`}>
            {sublevel.name}
          </h3>
          <span className="text-base font-semibold text-inta-green">
            {currencyFormatter.format(subtotal)}
          </span>
        </div>
        <p className={`text-sm leading-relaxed ${appearance.description}`}>
          {sublevel.description}
        </p>
        <p className="text-xs text-emerald-700">
          detMes proviene del Nivel 2 (Costos Indirectos Unitarios) y se utiliza
          para calcular la incidencia por determinación de estas acreditaciones.
        </p>
      </header>

      {detMesFromLevelTwo > 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-white/80 p-3 text-sm text-emerald-900">
          <p className="font-medium">Determinaciones mensuales promedio (detMes)</p>
          <p>
            {numberFormatter.format(detMesFromLevelTwo)}
            <span className="ml-1 text-xs text-emerald-700">
              (dato sincronizado desde el Nivel 2)
            </span>
          </p>
        </div>
      ) : (
        <label className="flex flex-col gap-1 rounded-lg border border-emerald-200 bg-white/80 p-3 text-sm text-emerald-900">
          <span className="font-medium">
            detMes (registrado en el Nivel 2)
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={detMesOverride}
            onChange={(event) => setDetMesOverride(event.target.value)}
            className="rounded-md border border-emerald-300 px-3 py-2 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
            placeholder="Ingresá un valor temporal"
          />
          {detMesOverrideError ? (
            <span className="text-xs text-rose-600">
              Ingresá un detMes mayor a cero para habilitar la incidencia por
              determinación.
            </span>
          ) : (
            <span className="text-xs text-emerald-700">
              Si aún no definiste detMes en el Nivel 2, podés cargarlo de forma
              provisoria para este cálculo.
            </span>
          )}
        </label>
      )}

      <div className="space-y-3">
        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-emerald-200 bg-white/70 p-4 text-sm text-emerald-800">
            Aún no agregaste costos de acreditación. Usá el formulario inferior
            para cargar el primero.
          </p>
        ) : null}

        {fields.map((field, index) => {
          const computation = computations[index];
          const fieldErrors = errors.accreditations?.[index];
          const defaultOrganismo =
            typeof field.organismo === "string" ? field.organismo : "";
          const defaultCta =
            typeof field.cta === "string" || typeof field.cta === "number"
              ? String(field.cta)
              : "";
          const defaultFechaInicio =
            typeof field.fechaInicio === "string" ? field.fechaInicio : "";
          const defaultFechaFin =
            typeof field.fechaFin === "string" ? field.fechaFin : "";
          const monthsDisplay =
            computation && computation.months !== undefined
              ? monthsFormatter.format(computation.months)
              : "—";
          const monthlyCostDisplay =
            computation && computation.monthlyCost !== undefined
              ? currencyFormatter.format(computation.monthlyCost)
              : "—";
          const annualCostDisplay =
            computation && computation.annualCost !== undefined
              ? currencyFormatter.format(computation.annualCost)
              : "—";

          return (
            <div
              key={field.id}
              className={`space-y-3 rounded-lg border p-4 ${appearance.form}`}
            >
              <input
                type="hidden"
                defaultValue={field.formId ?? ""}
                {...register(`accreditations.${index}.formId` as const)}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className={`text-base font-semibold ${appearance.header}`}>
                  Costo de acreditación #{index + 1}
                </h4>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-sm font-medium text-rose-600 transition hover:text-rose-500"
                >
                  Eliminar
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-emerald-900">
                    Organismo acreditador
                  </span>
                  <input
                    type="text"
                    defaultValue={defaultOrganismo}
                    {...register(`accreditations.${index}.organismo` as const)}
                    className="rounded-md border border-emerald-300 px-3 py-2 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                  {fieldErrors?.organismo ? (
                    <span className="text-xs text-rose-600">
                      {fieldErrors.organismo.message}
                    </span>
                  ) : null}
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-emerald-900">CTA (ARS)</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={defaultCta}
                    {...register(`accreditations.${index}.cta` as const)}
                    className="rounded-md border border-emerald-300 px-3 py-2 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                  {fieldErrors?.cta ? (
                    <span className="text-xs text-rose-600">
                      {fieldErrors.cta.message}
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-700">
                      Componé este valor con el costo de la acreditación más el
                      costo estimado de al menos la última visita de auditoría
                      (viáticos por 1–3 días si corresponde).
                    </span>
                  )}
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-emerald-900">
                    Fecha de inicio
                  </span>
                  <input
                    type="date"
                    defaultValue={defaultFechaInicio}
                    {...register(`accreditations.${index}.fechaInicio` as const)}
                    className="rounded-md border border-emerald-300 px-3 py-2 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                  {fieldErrors?.fechaInicio ? (
                    <span className="text-xs text-rose-600">
                      {fieldErrors.fechaInicio.message}
                    </span>
                  ) : null}
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-emerald-900">Fecha de fin</span>
                  <input
                    type="date"
                    defaultValue={defaultFechaFin}
                    {...register(`accreditations.${index}.fechaFin` as const)}
                    className="rounded-md border border-emerald-300 px-3 py-2 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
                  />
                  {fieldErrors?.fechaFin ? (
                    <span className="text-xs text-rose-600">
                      {fieldErrors.fechaFin.message}
                    </span>
                  ) : null}
                </label>
              </div>

              <dl className="grid gap-2 rounded-md bg-white/80 p-3 text-sm text-emerald-900 md:grid-cols-3">
                <div className="flex flex-col gap-0.5">
                  <dt className="font-medium">Meses exactos de vigencia (M)</dt>
                  <dd>{monthsDisplay}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="font-medium">Costo mensual individual (CMi)</dt>
                  <dd>{monthlyCostDisplay}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="font-medium">Costo anual individual (CAi)</dt>
                  <dd>{annualCostDisplay}</dd>
                </div>
              </dl>

              {computation?.shortPeriod ? (
                <p className="text-sm text-amber-700">
                  Período demasiado corto, verificá las fechas.
                </p>
              ) : null}
            </div>
          );
        })}

        <form
          onSubmit={handleAddAccreditation}
          className={`space-y-3 rounded-lg border p-4 ${appearance.form}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className={`text-base font-semibold ${appearance.header}`}>
              Nuevo costo de acreditación
            </h4>
            <span className="text-xs text-emerald-700">
              Los campos se limpian al guardar
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-emerald-900">
                Organismo acreditador
              </span>
              <input
                type="text"
                {...registerDraft("organismo")}
                className="rounded-md border border-emerald-300 px-3 py-2 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              />
              {draftOrganismoError ? (
                <span className="text-xs text-rose-600">
                  {draftOrganismoError.message}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-emerald-900">CTA (ARS)</span>
              <input
                type="number"
                step="0.01"
                min={0}
                {...registerDraft("cta")}
                className="rounded-md border border-emerald-300 px-3 py-2 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              />
              {draftCtaError ? (
                <span className="text-xs text-rose-600">
                  {draftCtaError.message}
                </span>
              ) : (
                <span className="text-xs text-emerald-700">
                  Componé este valor con el costo de la acreditación más el
                  costo estimado de al menos la última visita de auditoría
                  (viáticos por 1–3 días si corresponde).
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-emerald-900">
                Fecha de inicio
              </span>
              <input
                type="date"
                {...registerDraft("fechaInicio")}
                className="rounded-md border border-emerald-300 px-3 py-2 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              />
              {draftFechaInicioError ? (
                <span className="text-xs text-rose-600">
                  {draftFechaInicioError.message}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-emerald-900">Fecha de fin</span>
              <input
                type="date"
                {...registerDraft("fechaFin")}
                className="rounded-md border border-emerald-300 px-3 py-2 text-sm focus:border-inta-blue focus:outline-none focus:ring-1 focus:ring-inta-blue"
              />
              {draftFechaFinError ? (
                <span className="text-xs text-rose-600">
                  {draftFechaFinError.message}
                </span>
              ) : null}
            </label>
          </div>

          <dl className="grid gap-2 rounded-md bg-white/80 p-3 text-sm text-emerald-900 md:grid-cols-3">
            <div className="flex flex-col gap-0.5">
              <dt className="font-medium">Meses exactos de vigencia (M)</dt>
              <dd>{draftMonthsDisplay}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="font-medium">Costo mensual individual (CMi)</dt>
              <dd>{draftMonthlyCostDisplay}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="font-medium">Costo anual individual (CAi)</dt>
              <dd>{draftAnnualCostDisplay}</dd>
            </div>
          </dl>

          {draftComputation?.shortPeriod ? (
            <p className="text-sm text-amber-700">
              Período demasiado corto, verificá las fechas.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!isDraftValid}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-emerald-300 bg-white/80 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Agregar costo de acreditación
          </button>
        </form>
      </div>

      <aside className="space-y-2 rounded-lg border border-emerald-200 bg-white/85 p-4 text-sm text-emerald-900">
        <h4 className="text-base font-semibold text-emerald-900">
          Resultados del subnivel
        </h4>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">Costo mensual total (CMT)</span>
            <span>{currencyFormatter.format(totalMonthly)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">Costo anual total (CAT)</span>
            <span>{currencyFormatter.format(totalAnnual)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">detMes aplicado</span>
            <span>
              {detMesEffective > 0
                ? numberFormatter.format(detMesEffective)
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">Incidencia por determinación (IPD)</span>
            <span>
              {ipd !== null
                ? currencyFormatter.format(ipd)
                : "—"}
            </span>
          </div>
        </div>
        {detMesEffective <= 0 ? (
          <p className="text-sm text-amber-700">
            Ingresá las determinaciones mensuales promedio (se declaran en el
            Nivel 2).
          </p>
        ) : null}
        <p className="text-xs text-emerald-700">
          detMes se obtiene del Nivel 2. Si no está disponible, ingresalo para
          este cálculo.
        </p>
      </aside>
    </section>
  );
}

