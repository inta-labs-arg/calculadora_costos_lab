import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  ExchangeRateProvider,
  useExchangeRate
} from "@/contexts/ExchangeRateContext";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ExchangeRateProvider", () => {
  it("falls back to manual values when the BCRA API is unavailable", async () => {
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
      await expect(result.current.fetchBcraRate()).rejects.toThrow("Network down");
    });

    expect(result.current.state.source).toBe("manual");
    expect(result.current.state.rate).toBe(manualRate);
    expect(result.current.state.dateISO).toBe(manualDate);
  });
});
