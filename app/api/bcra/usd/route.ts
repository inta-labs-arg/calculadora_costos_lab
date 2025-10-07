import { NextResponse } from "next/server";
import { BcraUnavailableError, fetchUsdArsFromBcra } from "@/lib/bcra";

const GENERIC_BCRA_ERROR = "No fue posible obtener la cotización USD del BCRA.";

function normalizeErrorMessage(error: unknown): {
  message: string;
  details?: string;
} {
  if ((error as { name?: string }).name === "AbortError") {
    const detail = "Se agotó el tiempo de espera consultando al BCRA";
    return {
      message: `${GENERIC_BCRA_ERROR} Motivo: ${detail}.`,
      details: detail
    };
  }

  const rawMessage =
    error instanceof Error && typeof error.message === "string"
      ? error.message.trim()
      : "";

  if (!rawMessage) {
    return { message: `${GENERIC_BCRA_ERROR} Motivo: desconocido.` };
  }

  const sanitized = rawMessage.replace(/\.+$/, "");
  const normalizedDetail = sanitized || rawMessage;
  const lowerDetail = normalizedDetail.toLowerCase();
  const lowerGeneric = GENERIC_BCRA_ERROR.toLowerCase();

  if (lowerDetail.startsWith(lowerGeneric)) {
    const finalMessage = normalizedDetail.endsWith(".")
      ? normalizedDetail
      : `${normalizedDetail}.`;
    return { message: finalMessage, details: normalizedDetail };
  }

  return {
    message: `${GENERIC_BCRA_ERROR} Motivo: ${normalizedDetail}.`,
    details: normalizedDetail
  };
}

export const runtime = "edge";

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const result = await fetchUsdArsFromBcra(undefined, controller.signal);
    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=300"
      }
    });
  } catch (error) {
    if (
      error instanceof BcraUnavailableError ||
      (error as { name?: string }).name === "AbortError"
    ) {
      const { message, details } = normalizeErrorMessage(error);
      return new NextResponse(
        JSON.stringify({
          error: "BCRA_UNAVAILABLE",
          message,
          ...(details ? { details } : {})
        }),
        {
          status: 503,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "retry-after": "300"
          }
        }
      );
    }

    return new NextResponse(
      JSON.stringify({
        error: "UNEXPECTED_ERROR",
        message: "Ocurrió un error inesperado obteniendo la cotización USD."
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json; charset=utf-8"
        }
      }
    );
  } finally {
    clearTimeout(timeout);
  }
}
