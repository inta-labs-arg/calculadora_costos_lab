import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SummaryPanel } from "@/components/SummaryPanel";
import type { LevelTotal } from "@/lib/cost-calculation";

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
});
