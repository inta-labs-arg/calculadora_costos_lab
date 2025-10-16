"use client";

import {
  ChangeEvent,
  FocusEvent,
  FormEvent,
  useEffect,
  useId,
  useMemo,
  useState
} from "react";
import { formatARS, round2 } from "@/lib/money";

interface InstitutionalPricingPanelProps {
  baseCost: number;
  priceARS: number;
  percentageEEA: number;
  percentageCentro: number;
  onPriceChange: (value: number) => void;
  onPercentageEEAChange: (value: number) => void;
  onPercentageCentroChange: (value: number) => void;
  tolerance?: number;
}

const DEFAULT_TOLERANCE = 0.01;

function clampPercentage(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function parseCurrencyInput(value: string): number {
  if (!value.trim()) {
    return 0;
  }

  const normalized = value
    .replace(/[\s\u00A0]/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");

  const parsed = Number.parseFloat(normalized);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

export function InstitutionalPricingPanel({
  baseCost,
  priceARS,
  percentageEEA,
  percentageCentro,
  onPriceChange,
  onPercentageEEAChange,
  onPercentageCentroChange,
  tolerance = DEFAULT_TOLERANCE
}: InstitutionalPricingPanelProps) {
  const priceInputId = useId();
  const eeaInputId = useId();
  const centroInputId = useId();
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceFieldValue, setPriceFieldValue] = useState<string>(() =>
    formatARS(round2(priceARS))
  );

  useEffect(() => {
    if (isEditingPrice) {
      return;
    }

    setPriceFieldValue(formatARS(round2(priceARS)));
  }, [isEditingPrice, priceARS]);

  const afectacionEEA = useMemo(
    () => round2(priceARS * (percentageEEA / 100)),
    [priceARS, percentageEEA]
  );
  const afectacionCentro = useMemo(
    () => round2(priceARS * (percentageCentro / 100)),
    [priceARS, percentageCentro]
  );
  const precioNeto = useMemo(
    () => round2(priceARS + afectacionEEA + afectacionCentro),
    [afectacionCentro, afectacionEEA, priceARS]
  );

  const relativeDifference = useMemo(() => {
    if (baseCost <= 0) {
      return 0;
    }

    return Math.abs(priceARS - baseCost) / baseCost;
  }, [baseCost, priceARS]);

  const toleranceStatus = useMemo(() => {
    if (baseCost <= 0 && priceARS <= 0) {
      return {
        tone: "info" as const,
        message:
          "Ingresá un precio cuando los niveles anteriores definan un costo base."
      };
    }

    if (baseCost <= 0) {
      return {
        tone: "info" as const,
        message:
          "Los niveles 1, 2 y 3 aún no tienen un costo base. El precio se tomará como referencia inicial."
      };
    }

    if (relativeDifference <= tolerance) {
      return {
        tone: "info" as const,
        message:
          "El precio ingresado se encuentra dentro del margen del costo calculado."
      };
    }

    if (priceARS < baseCost * (1 - tolerance)) {
      return {
        tone: "warning" as const,
        message: `Estarás cobrando el servicio ${formatARS(
          round2(baseCost - priceARS)
        )} por debajo del costo.`
      };
    }

    if (priceARS > baseCost * (1 + tolerance)) {
      return {
        tone: "info" as const,
        message: `Estarás cobrando el servicio ${formatARS(
          round2(priceARS - baseCost)
        )} por encima del costo.`
      };
    }

    return {
      tone: "info" as const,
      message:
        "El precio ingresado se encuentra dentro del margen del costo calculado."
    };
  }, [baseCost, priceARS, relativeDifference, tolerance]);

  const handlePriceFocus = () => {
    setIsEditingPrice(true);
    setPriceFieldValue(priceARS ? String(priceARS) : "");
  };

  const handlePriceChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPriceFieldValue(event.target.value);
  };

  const applyPriceChange = () => {
    const parsed = round2(parseCurrencyInput(priceFieldValue));
    onPriceChange(parsed);
    setIsEditingPrice(false);
    setPriceFieldValue(formatARS(parsed));
  };

  const handlePriceBlur = (event: FocusEvent<HTMLInputElement>) => {
    const nextElement = event.relatedTarget as HTMLElement | null;

    if (nextElement?.dataset?.action === "apply-price") {
      return;
    }

    applyPriceChange();
  };

  const handlePriceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyPriceChange();
  };

  const handleEEAChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = clampPercentage(Number(event.target.value));
    onPercentageEEAChange(parsed);
  };

  const handleCentroChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = clampPercentage(Number(event.target.value));
    onPercentageCentroChange(parsed);
  };

  const messageClasses =
    toleranceStatus.tone === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <section className="space-y-6 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100 p-6 shadow-sm">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-amber-900">
          Punto 4 · Precio y afectación institucional
        </h2>
        <p className="text-sm text-amber-800">
          Determiná el precio final del servicio, aplicá la afectación para la
          EEA o Instituto de Investigación y el Centro Regional / Centro de
          Investigación y observá la diferencia respecto del costo calculado.
        </p>
      </header>

      <div className="rounded-xl border-l-4 border-inta-blue/60 bg-inta-blue/5 p-4 text-sm text-inta-blue">
        <p className="font-semibold text-inta-blue">
          Costo mensual calculado (Base considerada)
        </p>
        <p className="mt-1 text-lg font-bold text-inta-blue">
          {formatARS(round2(baseCost))}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_360px)_1fr]">
        <form className="space-y-3" onSubmit={handlePriceSubmit}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label
              className="flex flex-col gap-1 text-sm text-amber-800 sm:flex-1"
              htmlFor={priceInputId}
            >
              <span className="font-medium text-amber-900">Precio (ARS)</span>
              <input
                id={priceInputId}
                type="text"
                inputMode="decimal"
                value={priceFieldValue}
                onChange={handlePriceChange}
                onFocus={handlePriceFocus}
                onBlur={handlePriceBlur}
                placeholder="Ej.: 120000"
                className="rounded-lg border border-amber-300 px-3 py-2 text-base text-amber-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60"
              />
            </label>
            <button
              type="submit"
              data-action="apply-price"
              className="inline-flex items-center justify-center rounded-lg bg-inta-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-inta-blue/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inta-blue"
            >
              Ingresar precio
            </button>
          </div>
          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg border px-3 py-2 text-sm ${messageClasses}`}
          >
            {toleranceStatus.message}
          </div>
        </form>

        <div className="space-y-4 rounded-xl border border-amber-200 bg-white/85 p-4 text-sm text-amber-800">
          <p className="font-semibold text-amber-900">
            Parámetros de afectación institucional
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-amber-700">
                % EEA o Instituto de Investigación
              </span>
              <input
                id={eeaInputId}
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={Number.isFinite(percentageEEA) ? percentageEEA : ""}
                onChange={handleEEAChange}
                className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-amber-700">
                % Centro Regional / Centro de Investigación
              </span>
              <input
                id={centroInputId}
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={Number.isFinite(percentageCentro) ? percentageCentro : ""}
                onChange={handleCentroChange}
                className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60"
              />
            </label>
          </div>

          <dl className="grid gap-3 rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt>Precio (ARS)</dt>
              <dd className="font-semibold text-amber-900">
                {formatARS(round2(priceARS))}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Afectación EEA o Instituto de Investigación</dt>
              <dd className="font-semibold text-amber-900">
                {formatARS(afectacionEEA)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Afectación Centro Regional / Centro de Investigación</dt>
              <dd className="font-semibold text-amber-900">
                {formatARS(afectacionCentro)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-dashed border-amber-200 pt-2">
              <dt>Precio neto</dt>
              <dd className="text-lg font-bold text-inta-green">
                {formatARS(precioNeto)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
