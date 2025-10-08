const BCRA_BASE_URL = "https://api.bcra.gob.ar/estadisticascambiarias/v1.0" as const;
const BCRA_CATALOG_URL =
  "https://www.bcra.gob.ar/Catalogo/Content/files/json/estadisticascambiarias-v1.json" as const;

export type BcraRate = {
  rate: number;
  dateISO: string;
  source: "bcra" | "cache" | "manual";
};

export class BcraUnavailableError extends Error {
  constructor(message = "BCRA unavailable") {
    super(message);
    this.name = "BcraUnavailableError";
  }
}

interface BcraCotizacionesSuccess {
  status: 200;
  results: {
    fecha: string | null;
    detalle: {
      codigoMoneda: string;
      descripcion: string;
      tipoPase: number;
      tipoCotizacion: number;
    }[];
  };
}

interface BcraCotizacionesError {
  status: 400;
  errorMessages: string[];
}

type BcraCotizacionesResponse = BcraCotizacionesSuccess | BcraCotizacionesError;

interface CacheEntry {
  value: BcraRate;
  expiresAt: number;
  fetchedAt: number;
}

const CACHE_MAX_ENTRIES = 32;
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes
const CACHE_BACKSTOP_MS = 24 * 60 * 60 * 1000; // 24 hours

class LruCache {
  #map = new Map<string, CacheEntry>();

  get(key: string): CacheEntry | undefined {
    const value = this.#map.get(key);
    if (!value) return undefined;
    this.#map.delete(key);
    this.#map.set(key, value);
    return value;
  }

  set(key: string, value: CacheEntry) {
    if (this.#map.has(key)) {
      this.#map.delete(key);
    }

    this.#map.set(key, value);
    if (this.#map.size > CACHE_MAX_ENTRIES) {
      const oldestKey = this.#map.keys().next().value;
      if (typeof oldestKey === "string") {
        this.#map.delete(oldestKey);
      }
    }
  }

  clear() {
    this.#map.clear();
  }
}

const cache = new LruCache();

export function __resetBcraCacheForTests() {
  if (process.env.NODE_ENV !== "production") {
    cache.clear();
  }
}

function assertDateISO(dateISO: string): asserts dateISO is string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    throw new Error(`Invalid ISO date: ${dateISO}`);
  }
}

function parseISODate(dateISO: string): Date {
  assertDateISO(dateISO);
  const [year, month, day] = dateISO.split("-").map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateISO: string, deltaDays: number): string {
  const date = parseISODate(dateISO);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return formatISODate(date);
}

function getTodayInBuenosAires(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(new Date());
}

function normalizeDateInput(dateISO: string | undefined): string {
  const today = getTodayInBuenosAires();
  if (!dateISO) {
    return today;
  }

  assertDateISO(dateISO);
  if (dateISO > today) {
    return today;
  }

  return dateISO;
}

const RETRY_DELAYS_MS = [0, 250, 500];

async function fetchWithRetry(url: string, signal?: AbortSignal): Promise<Response> {
  let lastError: unknown;

  for (const delay of RETRY_DELAYS_MS) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      const response = await fetch(url, { signal, headers: { accept: "application/json" } });
      return response;
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError ?? new Error("Network error while contacting BCRA");
}

async function requestCotizaciones(dateISO: string | undefined, signal?: AbortSignal) {
  try {
    return await requestLegacyCotizaciones(dateISO, signal);
  } catch (legacyError) {
    if ((legacyError as { name?: string }).name === "AbortError") {
      throw legacyError;
    }

    try {
      return await requestCatalogCotizaciones(dateISO, signal);
    } catch (catalogError) {
      if ((catalogError as { name?: string }).name === "AbortError") {
        throw catalogError;
      }

      throw legacyError;
    }
  }
}

async function requestLegacyCotizaciones(dateISO: string | undefined, signal?: AbortSignal) {
  const url = new URL("/Cotizaciones", BCRA_BASE_URL);
  if (dateISO) {
    url.searchParams.set("fecha", dateISO);
  }

  const response = await fetchWithRetry(url.toString(), signal);
  const statusCode = response.status;
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok && statusCode !== 400) {
    throw new Error(`BCRA devolvió estado HTTP ${statusCode}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`Respuesta inesperada del BCRA (${statusCode})`);
  }

  const data = (await response.json()) as BcraCotizacionesResponse;
  return { httpStatus: statusCode, body: data };
}

type CatalogEntry = {
  code: string;
  description?: string;
  rate: number;
  dateISO?: string;
};

type CatalogContext = {
  code?: string;
  description?: string;
  dateISO?: string;
};

function normalizeString(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9,.-]+/g, "").replace(/,/g, ".");
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function parseDateString(value: string): string | null {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    return trimmed.replaceAll("/", "-");
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split("/");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function parseDate(value: unknown): string | null {
  if (typeof value === "string") {
    return parseDateString(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Interpret as Unix timestamp (seconds or milliseconds)
    const date =
      value > 10_000_000_000 ? new Date(value) : new Date(value * 1000);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  return null;
}

function identifyUsd(value: string): boolean {
  const normalized = normalizeString(value);
  if (normalized.includes("USD")) {
    return true;
  }
  if (normalized.includes("DOLAR")) {
    return (
      normalized.includes("ESTADOUNID") ||
      normalized.includes("U.S.A") ||
      normalized.includes("USA") ||
      normalized.includes("EEUU") ||
      normalized.includes("OFICIAL")
    );
  }
  return false;
}

function enrichCatalogContext(
  obj: Record<string, unknown>,
  base: CatalogContext
): CatalogContext {
  const context: CatalogContext = { ...base };

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    const lowerKey = key.toLowerCase();

    if (typeof value === "string") {
      if (
        !context.code &&
        (lowerKey.includes("moneda") ||
          lowerKey.includes("codigo") ||
          lowerKey.includes("divisa") ||
          lowerKey.includes("identificador") ||
          lowerKey.includes("nombre") ||
          lowerKey.includes("descripcion")) &&
        identifyUsd(value)
      ) {
        context.code = "USD";
        if (!context.description) {
          context.description = value;
        }
      }

      if (
        !context.dateISO &&
        (lowerKey.includes("fecha") ||
          lowerKey.includes("vigencia") ||
          lowerKey.includes("actualizacion"))
      ) {
        const maybeDate = parseDate(value);
        if (maybeDate) {
          context.dateISO = maybeDate;
        }
      }
    }

    if (typeof value === "number") {
      if (
        !context.dateISO &&
        (lowerKey.includes("fecha") || lowerKey.includes("vigencia"))
      ) {
        const maybeDate = parseDate(value);
        if (maybeDate) {
          context.dateISO = maybeDate;
        }
      }
    }
  }

  return context;
}

type RateCandidate = { value: number; weight: number; date?: string };

function extractRateCandidate(
  obj: Record<string, unknown>
): RateCandidate | null {
  let best: RateCandidate | null = null;

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    const lowerKey = key.toLowerCase();

    const candidate = parseNumber(value);
    if (candidate === null || candidate <= 0) {
      continue;
    }

    if (
      lowerKey.includes("pase") ||
      lowerKey.includes("compra") ||
      lowerKey.includes("cantidad") ||
      lowerKey.includes("fecha") ||
      lowerKey.includes("dia") ||
      lowerKey.includes("mes") ||
      lowerKey.includes("anio")
    ) {
      continue;
    }

    let weight = 1;
    if (lowerKey.includes("venta") || lowerKey.includes("vendedor")) {
      weight = 5;
    } else if (lowerKey.includes("oficial")) {
      weight = 4;
    } else if (
      lowerKey.includes("cotizacion") ||
      lowerKey.includes("cierre") ||
      lowerKey.includes("tipo")
    ) {
      weight = 3;
    } else if (lowerKey.includes("valor") || lowerKey.includes("precio")) {
      weight = 2;
    }

    const candidateDate =
      typeof value === "string" || typeof value === "number"
        ? parseDate(value)
        : null;

    if (!best || weight >= best.weight) {
      best = { value: candidate, weight, date: candidateDate ?? best?.date };
    }
  }

  return best;
}

function collectCatalogEntries(root: unknown): {
  entries: CatalogEntry[];
  dates: Set<string>;
} {
  const entries: CatalogEntry[] = [];
  const dates = new Set<string>();
  const visited = new Set<object>();

  const visit = (value: unknown, context: CatalogContext) => {
    if (!value || typeof value !== "object") {
      return;
    }

    if (visited.has(value)) {
      return;
    }
    visited.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, { ...context });
      }
      return;
    }

    const obj = value as Record<string, unknown>;
    let nextContext = enrichCatalogContext(obj, context);

    if (!nextContext.code) {
      for (const [key, child] of Object.entries(obj)) {
        if (!child || typeof child !== "object") {
          continue;
        }
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes("moneda") || lowerKey.includes("divisa")) {
          nextContext = {
            ...nextContext,
            ...enrichCatalogContext(child as Record<string, unknown>, nextContext)
          };
          if (nextContext.code) {
            break;
          }
        }
      }
    }

    if (nextContext.dateISO) {
      dates.add(nextContext.dateISO);
    }

    if (nextContext.code) {
      const rateCandidate = extractRateCandidate(obj);
      if (rateCandidate) {
        const entry: CatalogEntry = {
          code: nextContext.code,
          description: nextContext.description,
          rate: rateCandidate.value,
          dateISO: rateCandidate.date ?? nextContext.dateISO
        };
        entries.push(entry);
        if (entry.dateISO) {
          dates.add(entry.dateISO);
        }
      }
    }

    for (const child of Object.values(obj)) {
      if (typeof child === "string") {
        const maybeDate = parseDate(child);
        if (maybeDate) {
          dates.add(maybeDate);
        }
      }
      visit(child, { ...nextContext });
    }
  };

  visit(root, {});
  return { entries, dates };
}

function normalizeCatalogResponse(
  raw: unknown,
  preferredDate: string | undefined
): BcraCotizacionesSuccess {
  const { entries, dates } = collectCatalogEntries(raw);
  const usdEntries = entries.filter((entry) => entry.code === "USD");

  let chosen: CatalogEntry | undefined;
  if (preferredDate) {
    chosen = usdEntries.find((entry) => entry.dateISO === preferredDate);
  }

  if (!chosen) {
    const datedEntries = usdEntries
      .filter((entry) => entry.dateISO)
      .sort((a, b) => (a.dateISO! < b.dateISO! ? 1 : -1));
    chosen = datedEntries[0] ?? usdEntries[0];
  }

  const fecha =
    chosen?.dateISO ?? preferredDate ?? Array.from(dates).sort().pop() ?? null;

  const detalle = chosen
    ? [
        {
          codigoMoneda: "USD",
          descripcion: chosen.description ?? "Dólar estadounidense",
          tipoPase: 0,
          tipoCotizacion: chosen.rate
        }
      ]
    : [];

  return {
    status: 200,
    results: {
      fecha,
      detalle
    }
  };
}

async function requestCatalogCotizaciones(
  dateISO: string | undefined,
  signal?: AbortSignal
) {
  const response = await fetchWithRetry(BCRA_CATALOG_URL, signal);
  const statusCode = response.status;
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    throw new Error(`Catálogo del BCRA devolvió estado HTTP ${statusCode}`);
  }

  if (!contentType.toLowerCase().includes("json")) {
    throw new Error(`Respuesta inesperada del catálogo del BCRA (${statusCode})`);
  }

  const raw = await response.json();
  const normalized = normalizeCatalogResponse(raw, dateISO);
  return { httpStatus: 200, body: normalized };
}

function normalizeResultDate(raw: string | null | undefined): string {
  if (!raw) {
    throw new Error("La respuesta del BCRA no incluye fecha válida");
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("La respuesta del BCRA no incluye fecha válida");
  }

  return parsed.toISOString().slice(0, 10);
}

function extractUsdFromResponse(body: BcraCotizacionesResponse): { rate: number; dateISO: string } | null {
  if (body.status !== 200) {
    return null;
  }

  const detalle = Array.isArray(body.results?.detalle) ? body.results.detalle : [];
  if (detalle.length === 0) {
    return null;
  }

  const usdEntry = detalle.find((item) => item.codigoMoneda === "USD");
  if (!usdEntry) {
    return null;
  }

  const rate = Number(usdEntry.tipoCotizacion);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Cotización inválida para USD");
  }

  const resultDate = normalizeResultDate(body.results?.fecha ?? null);

  return { rate, dateISO: resultDate };
}

function storeCache(key: string, value: BcraRate) {
  const now = Date.now();
  cache.set(key, {
    value,
    fetchedAt: now,
    expiresAt: now + CACHE_TTL_MS
  });
}

function getFreshCache(key: string): CacheEntry | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    return undefined;
  }
  return entry;
}

function getStaleCache(key: string): CacheEntry | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.fetchedAt > CACHE_BACKSTOP_MS) {
    return undefined;
  }
  return entry;
}

async function attemptFetchForDate(dateISO: string, signal?: AbortSignal): Promise<BcraRate | null> {
  const { httpStatus, body } = await requestCotizaciones(dateISO, signal);

  if (httpStatus === 400 || body.status === 400) {
    const errorMessages = body.status === 400 ? body.errorMessages : [];
    const futureDateError = errorMessages.some((message) =>
      message.toLowerCase().includes("mayor a la fecha actual")
    );
    if (futureDateError) {
      return null;
    }
    throw new Error(`BCRA devolvió error 400: ${errorMessages.join(", ")}`);
  }

  const usd = extractUsdFromResponse(body);
  if (!usd) {
    return null;
  }

  const normalized = {
    rate: usd.rate,
    dateISO: usd.dateISO,
    source: "bcra" as const
  } satisfies BcraRate;
  const requestKey = `bcra:usd:${dateISO}`;
  storeCache(requestKey, normalized);
  if (usd.dateISO !== dateISO) {
    storeCache(`bcra:usd:${usd.dateISO}`, normalized);
  }
  return normalized;
}

async function fetchLatestAvailable(signal?: AbortSignal): Promise<BcraRate> {
  const { httpStatus, body } = await requestCotizaciones(undefined, signal);
  if (httpStatus !== 200 || body.status !== 200) {
    throw new Error("El BCRA no devolvió información disponible");
  }

  const usd = extractUsdFromResponse(body);
  if (!usd) {
    throw new Error("El BCRA no incluyó USD en la última cotización disponible");
  }

  const result: BcraRate = { rate: usd.rate, dateISO: usd.dateISO, source: "bcra" };
  storeCache(`bcra:usd:${usd.dateISO}`, result);
  return result;
}

export async function fetchUsdArsFromBcra(
  dateISO?: string,
  signal?: AbortSignal
): Promise<BcraRate> {
  const normalizedStartDate = normalizeDateInput(dateISO);
  const cacheKey = `bcra:usd:${normalizedStartDate}`;
  const cached = getFreshCache(cacheKey);
  if (cached) {
    return cached.value;
  }

  const today = getTodayInBuenosAires();
  const attemptedDates = new Set<string>();

  let currentDate = normalizedStartDate;
  for (let i = 0; i < 3; i += 1) {
    if (attemptedDates.has(currentDate)) {
      break;
    }
    attemptedDates.add(currentDate);

    try {
      const result = await attemptFetchForDate(currentDate, signal);
      if (result) {
        return result;
      }
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") {
        throw error;
      }
      // For future date adjustments, continue with today
      const message = String((error as Error).message ?? "");
      if (message.includes("400")) {
        break;
      }
    }

    if (currentDate === today) {
      currentDate = addDays(currentDate, -1);
    } else {
      currentDate = addDays(currentDate, -1);
      if (currentDate > today) {
        currentDate = today;
      }
    }
  }

  try {
    return await fetchLatestAvailable(signal);
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw error;
    }
    const datesToCheck = Array.from(attemptedDates);
    if (!datesToCheck.includes(normalizedStartDate)) {
      datesToCheck.unshift(normalizedStartDate);
    }
    for (const attempted of datesToCheck) {
      const stale = getStaleCache(`bcra:usd:${attempted}`);
      if (stale) {
        console.warn("BCRA no disponible, usando valor en cache", {
          requestedDate: normalizedStartDate,
          fallbackDate: attempted,
          cachedDate: stale.value.dateISO
        });
        return { ...stale.value, source: "cache" };
      }
    }
    throw new BcraUnavailableError(
      (error as Error)?.message || "No fue posible obtener cotizaciones del BCRA"
    );
  }
}

