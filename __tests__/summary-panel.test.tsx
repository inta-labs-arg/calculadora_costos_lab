import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SummaryPanel } from "@/components/SummaryPanel";
import type { LevelTotal } from "@/lib/cost-calculation";
import { currencyFormatter } from "@/lib/cost-calculation";
import { formatARS } from "@/lib/money";

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
      source: "monedapi" as const,
      dateISO: "2024-04-15",
      note: "Cotización cierre"
    };

    const pricing = {
      precioARS: 120000,
      porcentajeEEA: 10,
      porcentajeCentro: 5,
      afectacionEEA: 12000,
      afectacionCentro: 6000,
      precioNeto: 102000
    };

    render(
      <SummaryPanel
        orderedTotals={orderedTotals}
        grandTotal={1200}
        exchangeRate={exchangeRate}
        serviceName="Servicio de ensayo"
        laboratoryName="Laboratorio INTa"
        quoteDateISO="2024-05-20"
        pricing={pricing}
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
    expect(screen.getByText(/Fuente: Monedapi\.ar/i)).toBeInTheDocument();
    expect(screen.getByText(/Fecha 2024-04-15/i)).toBeInTheDocument();
    expect(screen.getByText(/Observaciones: Cotización cierre/i)).toBeInTheDocument();
    expect(
      screen.getByText("Precio y afectación institucional")
    ).toBeInTheDocument();
    expect(screen.getByText(formatARS(pricing.precioARS))).toBeInTheDocument();
    expect(screen.getByText(formatARS(pricing.precioNeto))).toBeInTheDocument();
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
                id: "equipamientoEspecifico-depreciacion-anual",
                name: "Depreciación anual (ARS)",
                subtotal: 4200
              },
              {
                id: "equipamientoEspecifico-depreciacion-mensual",
                name: "Depreciación mensual (ARS)",
                subtotal: 500
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

    const pricing = {
      precioARS: 150000,
      porcentajeEEA: 12,
      porcentajeCentro: 7,
      afectacionEEA: 18000,
      afectacionCentro: 10500,
      precioNeto: 121500
    };

    const { container } = render(
      <SummaryPanel
        orderedTotals={orderedTotals}
        grandTotal={grandTotal}
        exchangeRate={exchangeRate}
        serviceName="Servicio de ensayo"
        laboratoryName="Laboratorio INTa"
        quoteDateISO="2024-05-20"
        pricing={pricing}
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
