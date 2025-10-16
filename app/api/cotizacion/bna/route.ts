import { NextResponse } from "next/server";

const BNA_PRIMARY_URL = "https://www.bna.com.ar/Personas";
const BNA_FALLBACK_URL = "https://www.bna.com.ar/Cotizador/MonedasHistorico";
const USER_AGENT_HEADER =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 6000;
const TARGET_LABEL = "dolar u.s.a";

interface ExtractionResult {
  dateISO: string;
  displayDate: string;
  compra?: number;
  venta: number;
  horaActualizacion?: string | null;
}

function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNumber(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }
  const sanitized = raw
    .replace(/[\s\u00A0]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.+-]/g, "");
  if (!sanitized) {
    return undefined;
  }
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractDateContext(context: string): {
  displayDate: string;
  dateISO: string;
} | null {
  const fechaMatch = context.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (!fechaMatch) {
    return null;
  }
  const displayDate = fechaMatch[1];
  const [day, month, year] = displayDate.split("/").map((segment) => Number.parseInt(segment, 10));
  if (!day || !month || !year) {
    return null;
  }
  const dateObject = new Date(year, month - 1, day);
  if (Number.isNaN(dateObject.getTime())) {
    return null;
  }
  const dateISO = dateObject.toISOString().slice(0, 10);
  return { displayDate, dateISO };
}

function extractHourContext(context: string): string | null {
  const hourMatch = context.match(/hora\s*(?:de\s*)?actualizaci[oó]n:?\s*(\d{1,2}:\d{2})/i);
  return hourMatch ? hourMatch[1] : null;
}

function extractTableSection(html: string, anchor: number): string | null {
  if (anchor < 0) {
    return null;
  }
  const tableStart = html.indexOf("<table", anchor);
  if (tableStart === -1) {
    return null;
  }
  const tableEnd = html.indexOf("</table>", tableStart);
  if (tableEnd === -1) {
    return null;
  }
  return html.slice(tableStart, tableEnd + "</table>".length);
}

function findRowValues(tableHtml: string, target: string): string[] | null {
  const rows = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi);
  if (!rows) {
    return null;
  }
  for (const rawRow of rows) {
    const columns = Array.from(
      rawRow.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi),
      (match) => stripHtml(match[1])
    );
    if (!columns.length) {
      continue;
    }
    const label = columns[0].toLowerCase();
    if (label.includes(target)) {
      return columns;
    }
  }
  return null;
}

function extractFromCotizacionDivisas(html: string): ExtractionResult | null {
  const lowerHtml = html.toLowerCase();
  const anchor = lowerHtml.indexOf("cotización divisas");
  if (anchor === -1) {
    return null;
  }
  const tableHtml = extractTableSection(html, anchor);
  if (!tableHtml) {
    return null;
  }
  const rowValues = findRowValues(tableHtml, TARGET_LABEL);
  if (!rowValues || rowValues.length < 3) {
    return null;
  }

  const context = html.slice(Math.max(0, anchor - 200), Math.min(html.length, anchor + tableHtml.length + 200));
  const dateInfo = extractDateContext(context);
  if (!dateInfo) {
    return null;
  }

  const horaActualizacion = extractHourContext(context);
  const compra = normalizeNumber(rowValues[1]);
  const venta = normalizeNumber(rowValues[2]);
  if (typeof venta === "undefined") {
    return null;
  }

  return {
    dateISO: dateInfo.dateISO,
    displayDate: dateInfo.displayDate,
    compra,
    venta,
    horaActualizacion
  };
}

function extractFromHistorico(html: string): ExtractionResult | null {
  const tableHtml = extractTableSection(html, 0);
  if (!tableHtml) {
    return null;
  }
  const rowValues = findRowValues(tableHtml, TARGET_LABEL);
  if (!rowValues || rowValues.length < 3) {
    return null;
  }

  const context = tableHtml;
  const dateInfo = extractDateContext(html) ?? extractDateContext(context);
  const horaActualizacion = extractHourContext(html) ?? extractHourContext(context);
  const compra = normalizeNumber(rowValues[1]);
  const venta = normalizeNumber(rowValues[2]);
  if (typeof venta === "undefined") {
    return null;
  }

  return {
    dateISO: dateInfo?.dateISO ?? new Date().toISOString().slice(0, 10),
    displayDate: dateInfo?.displayDate ?? new Date().toLocaleDateString("es-AR"),
    compra,
    venta,
    horaActualizacion
  };
}

async function fetchHtml(url: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT_HEADER
    },
    cache: "no-store",
    signal
  });

  if (!response.ok) {
    throw new Error(`Respuesta inesperada (${response.status}) al consultar ${url}`);
  }

  return response.text();
}

function buildPayload(extraction: ExtractionResult) {
  return {
    source: "BNA",
    date: extraction.dateISO,
    displayDate: extraction.displayDate,
    moneda: "Dolar U.S.A",
    compra: typeof extraction.compra === "number" ? extraction.compra : null,
    venta: extraction.venta,
    horaActualizacion: extraction.horaActualizacion ?? null,
    fetchedAt: new Date().toISOString()
  };
}

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    try {
      const primaryHtml = await fetchHtml(BNA_PRIMARY_URL, controller.signal);
      const primaryExtraction = extractFromCotizacionDivisas(primaryHtml);
      if (primaryExtraction) {
        return NextResponse.json(buildPayload(primaryExtraction), {
          status: 200,
          headers: {
            "cache-control": "no-store"
          }
        });
      }
    } catch (error) {
      console.error("No se pudo obtener la cotización desde la página Personas del BNA", error);
    }

    try {
      const fallbackHtml = await fetchHtml(BNA_FALLBACK_URL, controller.signal);
      const fallbackExtraction = extractFromHistorico(fallbackHtml);
      if (fallbackExtraction) {
        return NextResponse.json(buildPayload(fallbackExtraction), {
          status: 200,
          headers: {
            "cache-control": "no-store"
          }
        });
      }
    } catch (error) {
      console.error("No se pudo obtener la cotización desde el histórico de BNA", error);
    }

    return NextResponse.json(
      {
        error: "BNA_UNAVAILABLE",
        message: "No se pudo obtener la cotización de BNA."
      },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      return NextResponse.json(
        {
          error: "BNA_TIMEOUT",
          message: "No se pudo obtener la cotización de BNA."
        },
        { status: 504, headers: { "cache-control": "no-store" } }
      );
    }

    console.error("Error inesperado consultando la cotización de BNA", error);
    return NextResponse.json(
      {
        error: "BNA_ERROR",
        message: "No se pudo obtener la cotización de BNA."
      },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  } finally {
    clearTimeout(timeout);
  }
}
