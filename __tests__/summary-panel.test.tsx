import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SummaryPanel } from "@/components/SummaryPanel";
import type { LevelTotal } from "@/lib/cost-calculation";
import { currencyFormatter } from "@/lib/cost-calculation";

vi.mock("@/contexts/HourlyRatesContext", () => ({
  useHourlyRates: () => ({
    state: {
      items: [],
      lastSyncISO: "2024-01-01",
      lastSyncType: "import"
    },
    items: [],
    syncLabel: "Tabla local (2024-01-01 · importación)",
    addRow: vi.fn(),
    duplicateRow: vi.fn(),
    updateRow: vi.fn(),
    deleteRow: vi.fn(),
    exportJson: vi.fn(),
    exportCsv: vi.fn(),
    beginImport: vi.fn(),
    confirmImport: vi.fn(),
    resetSync: vi.fn()
  })
}));

describe("SummaryPanel", () => {
  it("renders the applied exchange rate information", () => {
    const orderedTotals: LevelTotal[] = [
      {
        id: "nivel1",
        name: "Nivel 1",
        subtotal: 1200
      }
    ];

    const exchangeRate = {
      rate: 750.5,
      source: "bcra" as const,
      dateISO: "2024-04-15",
      note: "Cotización cierre"
    };

    render(
      <SummaryPanel
        orderedTotals={orderedTotals}
        grandTotal={1200}
        exchangeRate={exchangeRate}
      />
    );

    const formatter = new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
    const formattedRate = formatter.format(exchangeRate.rate);

    expect(
      screen.getByText((content) =>
        content.includes(`TC aplicado: ${formattedRate} ARS/USD`)
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Fuente: BCRA/i)).toBeInTheDocument();
    expect(screen.getByText(/Fecha 2024-04-15/i)).toBeInTheDocument();
    expect(screen.getByText(/Observaciones: Cotización cierre/i)).toBeInTheDocument();
  });

  it("presenta la desagregación del equipamiento manteniendo el subtotal", () => {
    const grandTotal = 1700;

    const orderedTotals: LevelTotal[] = [
      {
        id: "nivel1",
        name: "Nivel 1 · Costos Directos Unitarios",
        subtotal: grandTotal,
        breakdown: [
          {
            id: "insumosDirectos",
            name: "Subnivel 1.1 · Insumos directos",
            subtotal: 1200
          },
          {
            id: "equipamientoEspecifico",
            name: "Subnivel 1.3 · Equipamiento específico",
            subtotal: 500,
            breakdown: [
              {
                id: "equipamientoEspecifico-depreciacion",
                name: "Depreciación por determinación (ARS)",
                subtotal: 350
              },
              {
                id: "equipamientoEspecifico-calibracion",
                name: "Calibración por determinación (ARS)",
                subtotal: 150
              }
            ]
          }
        ]
      }
    ];

    const exchangeRate = {
      rate: 800,
      source: "manual" as const,
      dateISO: "2024-05-01",
      note: undefined
    };

    const { container } = render(
      <SummaryPanel
        orderedTotals={orderedTotals}
        grandTotal={grandTotal}
        exchangeRate={exchangeRate}
      />
    );

    expect(
      screen.getByText(currencyFormatter.format(grandTotal))
    ).toBeInTheDocument();

    const usdFormatter = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    });

    expect(
      screen.getByText(
        `≈ ${usdFormatter.format(grandTotal / exchangeRate.rate)}`
      )
    ).toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });
});
