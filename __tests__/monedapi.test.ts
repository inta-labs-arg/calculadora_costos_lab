import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUsdArsFromMonedapi } from "@/lib/monedapi";

const jsonHeaders = { "content-type": "application/json" } as const;

function createMonedapiResponse({
  sellPrice,
  updatedAt,
  extra = {}
}: {
  sellPrice: number | string;
  updatedAt: string;
  extra?: Record<string, unknown>;
}) {
  return new Response(
    JSON.stringify({
      moneda: "USD",
      origen: "BNA",
      compra: typeof sellPrice === "number" ? sellPrice - 20 : 0,
      venta: sellPrice,
      actualizado: updatedAt,
      ...extra
    }),
    { status: 200, headers: jsonHeaders }
  );
}

describe("fetchUsdArsFromMonedapi", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-05T12:00:00Z"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("obtiene la cotización USD desde Monedapi", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMonedapiResponse({ sellPrice: 965.5, updatedAt: "2024-06-05T10:00:00Z" })
    );

    const result = await fetchUsdArsFromMonedapi();
    expect(result).toEqual({ rate: 965.5, dateISO: "2024-06-05", source: "monedapi" });
  });

  it("interpreta valores numéricos contenidos en cadenas", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMonedapiResponse({
        sellPrice: "970,25",
        updatedAt: "2024-06-04",
        extra: { precio_promedio: 968.5 }
      })
    );

    const result = await fetchUsdArsFromMonedapi();
    expect(result.rate).toBeCloseTo(970.25);
    expect(result.dateISO).toBe("2024-06-04");
    expect(result.source).toBe("monedapi");
  });

  it("usa el valor en cache cuando Monedapi no responde", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    fetchMock.mockResolvedValueOnce(
      createMonedapiResponse({ sellPrice: 970, updatedAt: "2024-06-05T09:30:00Z" })
    );

    const initial = await fetchUsdArsFromMonedapi();
    expect(initial.source).toBe("monedapi");

    vi.setSystemTime(new Date("2024-06-05T15:00:00Z"));
    fetchMock.mockRejectedValue(new Error("Network down"));

    const fallback = await fetchUsdArsFromMonedapi();
    expect(fallback.source).toBe("cache");
    expect(fallback.rate).toBeCloseTo(970);

    expect(warnSpy).toHaveBeenCalled();
  });
});
