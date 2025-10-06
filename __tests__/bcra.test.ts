import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUsdArsFromBcra } from "@/lib/bcra";

const jsonHeaders = { "content-type": "application/json" } as const;

function createCotizacionResponse({
  fecha,
  detalle
}: {
  fecha: string;
  detalle: Array<{
    codigoMoneda: string;
    descripcion?: string;
    tipoCotizacion?: number;
    tipoPase?: number;
  }>;
}) {
  return new Response(
    JSON.stringify({
      status: 200,
      results: {
        fecha,
        detalle: detalle.map((entry) => ({
          descripcion: "",
          tipoPase: 0,
          tipoCotizacion: entry.tipoCotizacion ?? 0,
          ...entry
        }))
      }
    }),
    { status: 200, headers: jsonHeaders }
  );
}

describe("fetchUsdArsFromBcra", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-05T12:00:00Z"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("obtiene la cotización USD del día", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createCotizacionResponse({
        fecha: "2024-06-05",
        detalle: [
          { codigoMoneda: "USD", tipoCotizacion: 965.5 },
          { codigoMoneda: "EUR", tipoCotizacion: 1050 }
        ]
      })
    );

    const result = await fetchUsdArsFromBcra();
    expect(result).toEqual({ rate: 965.5, dateISO: "2024-06-05", source: "bcra" });
  });

  it("retrocede un día si la respuesta del día no tiene USD disponible", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    fetchMock
      .mockResolvedValueOnce(
        createCotizacionResponse({ fecha: "2024-06-05", detalle: [] })
      )
      .mockResolvedValueOnce(
        createCotizacionResponse({
          fecha: "2024-06-04",
          detalle: [{ codigoMoneda: "USD", tipoCotizacion: 955.25 }]
        })
      );

    const result = await fetchUsdArsFromBcra();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("fecha=2024-06-05");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("fecha=2024-06-04");
    expect(result).toEqual({ rate: 955.25, dateISO: "2024-06-04", source: "bcra" });
  });

  it("usa el valor en cache cuando el BCRA no responde", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    fetchMock.mockResolvedValueOnce(
      createCotizacionResponse({
        fecha: "2024-06-05",
        detalle: [{ codigoMoneda: "USD", tipoCotizacion: 970 }]
      })
    );

    const initial = await fetchUsdArsFromBcra();
    expect(initial.source).toBe("bcra");

    vi.setSystemTime(new Date("2024-06-05T15:00:00Z"));
    fetchMock.mockRejectedValue(new Error("Network down"));

    const fallback = await fetchUsdArsFromBcra();
    expect(fallback.source).toBe("cache");
    expect(fallback.rate).toBeCloseTo(970);

    expect(warnSpy).toHaveBeenCalled();
  });
});
