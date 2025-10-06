import { NextResponse } from "next/server";
import { BcraUnavailableError, fetchUsdArsFromBcra } from "@/lib/bcra";

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
    if (error instanceof BcraUnavailableError || (error as { name?: string }).name === "AbortError") {
      return new NextResponse(
        JSON.stringify({
          error: "BCRA_UNAVAILABLE",
          message: "No fue posible obtener la cotización USD del BCRA."
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
