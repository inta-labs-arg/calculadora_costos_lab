import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  ExchangeRateProvider,
  useExchangeRate
} from "@/contexts/ExchangeRateContext";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("ExchangeRateProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-05T12:00:00Z"));
  });

  it("actualiza el estado con el valor de Monedapi cuando el endpoint responde", async () => {
    const { result } = renderHook(() => useExchangeRate(), {
      wrapper: ExchangeRateProvider
    });

    const payload = {
      rate: 987.65,
      dateISO: "2024-06-05",
      source: "bcra"
    } satisfies Record<string, unknown>;

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await act(async () => {
      await result.current.fetchMonedapiRate();
    });

    expect(result.current.state.source).toBe("monedapi");
    expect(result.current.state.rate).toBeCloseTo(987.65);
    expect(result.current.state.dateISO).toBe("2024-06-05");
  });

  it("marca la fuente como cache cuando el endpoint responde con datos en cache", async () => {
    const { result } = renderHook(() => useExchangeRate(), {
      wrapper: ExchangeRateProvider
    });

    const payload = {
      rate: 990.1,
      dateISO: "2024-06-04",
      source: "cache"
    } satisfies Record<string, unknown>;

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await act(async () => {
      await result.current.fetchMonedapiRate();
    });

    expect(result.current.state.source).toBe("cache");
    expect(result.current.state.dateISO).toBe("2024-06-04");
  });

  it("falls back to manual values when the Monedapi API is unavailable", async () => {
    const manualRate = 955.75;
    const manualDate = "2024-03-15";

    const { result } = renderHook(() => useExchangeRate(), {
      wrapper: ExchangeRateProvider
    });

    act(() => {
      result.current.updateManualState({
        rate: manualRate,
        dateISO: manualDate
      });
    });

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network down"));

    await act(async () => {
      await expect(result.current.fetchMonedapiRate()).rejects.toThrow("Network down");
    });

    expect(result.current.state.source).toBe("manual");
    expect(result.current.state.rate).toBe(manualRate);
    expect(result.current.state.dateISO).toBe(manualDate);
  });
});
