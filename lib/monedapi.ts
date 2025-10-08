const MONEDAPI_BASE_URL = "https://monedapi.ar/api/" as const;

export type MonedapiRate = {
  rate: number;
  dateISO: string;
  source: "monedapi" | "cache" | "manual";
};

export class MonedapiUnavailableError extends Error {
  constructor(message = "Monedapi unavailable") {
    super(message);
    this.name = "MonedapiUnavailableError";
  }
}

const CACHE_MAX_ENTRIES = 32;
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes
const CACHE_BACKSTOP_MS = 24 * 60 * 60 * 1000; // 24 hours

const RETRY_DELAYS_MS = [0, 250, 500];

interface CacheEntry {
  value: MonedapiRate;
  expiresAt: number;
  fetchedAt: number;
}

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
}

const cache = new LruCache();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const sanitized = value.trim();
    if (!sanitized) return null;
    const parsed = Number.parseFloat(sanitized.replace(/,/g, "."));
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 10_000_000_000) {
      // Interpret large numbers as milliseconds
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    } else if (value > 10_000_000) {
      // Interpret as seconds since epoch
      const date = new Date(value * 1000);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  if (isPlainObject(value)) {
    const seconds = normalizeNumber(value.seconds ?? value.epoch ?? value.unix);
    if (seconds && seconds > 10_000_000) {
      const millis = seconds > 10_000_000_000 ? seconds : seconds * 1000;
      const date = new Date(millis);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }

    const isoCandidate = normalizeDate(value.iso ?? value.iso8601 ?? value.value);
    if (isoCandidate) {
      return isoCandidate;
    }
  }

  return null;
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

type NumberCandidate = {
  value: number;
  priority: number;
  depth: number;
};

type DateCandidate = {
  value: string;
  priority: number;
  depth: number;
};

const NUMBER_KEYWORD_PRIORITY: Array<{ keywords: string[]; priority: number }> = [
  { keywords: ["venta", "sell", "ask"], priority: 0 },
  { keywords: ["oficial", "official"], priority: 1 },
  { keywords: ["promedio", "avg", "average"], priority: 2 },
  { keywords: ["value", "price", "cotizacion", "rate", "last"], priority: 3 }
];

const DATE_KEYWORD_PRIORITY: Array<{ keywords: string[]; priority: number }> = [
  { keywords: ["fecha", "date"], priority: 0 },
  { keywords: ["updated", "actualizado", "vigencia"], priority: 1 },
  { keywords: ["time", "timestamp"], priority: 2 }
];

function collectNumberCandidates(
  value: unknown,
  depth: number,
  parentKey: string | null,
  candidates: NumberCandidate[]
) {
  const numericValue = normalizeNumber(value);
  if (numericValue && numericValue > 0) {
    const lowerKey = parentKey ? parentKey.toLowerCase() : "";
    let priority = NUMBER_KEYWORD_PRIORITY.length + depth;
    for (const { keywords, priority: assigned } of NUMBER_KEYWORD_PRIORITY) {
      if (keywords.some((keyword) => lowerKey.includes(keyword))) {
        priority = assigned + depth;
        break;
      }
    }
    candidates.push({ value: numericValue, priority, depth });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectNumberCandidates(item, depth + 1, parentKey, candidates));
    return;
  }

  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectNumberCandidates(child, depth + 1, key, candidates);
    }
  }
}

function collectDateCandidates(
  value: unknown,
  depth: number,
  parentKey: string | null,
  candidates: DateCandidate[]
) {
  const normalized = normalizeDate(value);
  if (normalized) {
    const lowerKey = parentKey ? parentKey.toLowerCase() : "";
    let priority = DATE_KEYWORD_PRIORITY.length + depth;
    for (const { keywords, priority: assigned } of DATE_KEYWORD_PRIORITY) {
      if (keywords.some((keyword) => lowerKey.includes(keyword))) {
        priority = assigned + depth;
        break;
      }
    }
    candidates.push({ value: normalized, priority, depth });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectDateCandidates(item, depth + 1, parentKey, candidates));
    return;
  }

  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectDateCandidates(child, depth + 1, key, candidates);
    }
  }
}

function extractUsdFromResponse(body: unknown): { rate: number; dateISO: string } {
  const numberCandidates: NumberCandidate[] = [];
  collectNumberCandidates(body, 0, null, numberCandidates);

  if (numberCandidates.length === 0) {
    throw new Error("Monedapi devolvió una cotización inválida para USD");
  }

  numberCandidates.sort((a, b) => a.priority - b.priority || a.depth - b.depth);
  const rate = numberCandidates[0]?.value;
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Monedapi devolvió una cotización inválida para USD");
  }

  const dateCandidates: DateCandidate[] = [];
  collectDateCandidates(body, 0, null, dateCandidates);
  dateCandidates.sort((a, b) => a.priority - b.priority || a.depth - b.depth);
  const dateISO = dateCandidates[0]?.value ?? getTodayInBuenosAires();

  return { rate, dateISO };
}

function storeCache(key: string, value: MonedapiRate) {
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

async function fetchWithRetry(url: string, signal?: AbortSignal): Promise<Response> {
  let lastError: unknown;

  for (const delay of RETRY_DELAYS_MS) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      const response = await fetch(url, {
        signal,
        headers: { accept: "application/json" }
      });
      return response;
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError ?? new Error("Network error while contacting Monedapi");
}

async function requestUsdQuote(signal?: AbortSignal) {
  const url = new URL("usd/bna", MONEDAPI_BASE_URL);

  const response = await fetchWithRetry(url.toString(), signal);
  const statusCode = response.status;
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    let detail = `Monedapi devolvió estado HTTP ${statusCode}`;
    if (contentType.includes("application/json")) {
      try {
        const payload = (await response.json()) as { message?: unknown; error?: unknown };
        const message = [payload.message, payload.error]
          .flat()
          .map((item) =>
            typeof item === "string"
              ? item
              : typeof item === "number"
                ? item.toString()
                : ""
          )
          .find((item) => item.trim().length > 0);
        if (message) {
          detail = message.trim();
        }
      } catch (error) {
        // ignore parse errors
      }
    }
    throw new Error(detail);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`Respuesta inesperada de Monedapi (${statusCode})`);
  }

  const body = await response.json();
  return body;
}

export async function fetchUsdArsFromMonedapi(
  _dateISO?: string,
  signal?: AbortSignal
): Promise<MonedapiRate> {
  const cacheKey = "monedapi:usd:latest";
  const cached = getFreshCache(cacheKey);
  if (cached) {
    return cached.value;
  }

  try {
    const payload = await requestUsdQuote(signal);
    const { rate, dateISO } = extractUsdFromResponse(payload);
    const result: MonedapiRate = { rate, dateISO, source: "monedapi" };
    storeCache(cacheKey, result);
    return result;
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw error;
    }

    const stale = getStaleCache(cacheKey);
    if (stale) {
      console.warn("Monedapi no disponible, usando valor en cache", {
        cachedDate: stale.value.dateISO
      });
      return { ...stale.value, source: "cache" };
    }

    throw new MonedapiUnavailableError(
      (error as Error)?.message || "No fue posible obtener cotizaciones desde Monedapi"
    );
  }
}
