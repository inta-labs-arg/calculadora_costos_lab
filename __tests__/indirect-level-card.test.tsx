import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IndirectLevelCard } from "@/components/IndirectLevelCard";
import type { IndirectLevelGroupState, IndirectSublevelState } from "@/lib/cost-calculation";

describe("IndirectLevelCard", () => {
  const baseLevel: IndirectLevelGroupState = {
    id: "serviciosGenerales",
    name: "Nivel 2 · Costos Indirectos Unitarios",
    description: "",
    type: "indirect-group",
    sublevels: [
      {
        id: "materialesNoDescartables",
        name: "Subnivel 2.1 · Materiales no descartables",
        description: "",
        type: "shared-resource",
        items: [
          {
            id: "item-1",
            concept: "Servicio de limpieza",
            monthlyCost: 25000,
            determinations: 100,
            isCustomDeterminations: false
          }
        ]
      }
    ]
  };

  it("permite personalizar las determinaciones mensuales y marca el override", () => {
    const handleChange = vi.fn<(sublevel: IndirectSublevelState) => void>();
    const { rerender } = render(
      <IndirectLevelCard
        level={baseLevel}
        onSublevelChange={handleChange}
        globalDeterminations={100}
      />
    );

    const row = screen.getByText("Servicio de limpieza").closest("tr");
    if (!row) {
      throw new Error("Row not found");
    }

    const determinationsInput = within(row).getByDisplayValue("100");
    fireEvent.change(determinationsInput, { target: { value: "140" } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    const updatedSublevel = handleChange.mock.calls[0][0];
    expect(updatedSublevel.items[0].determinations).toBe(140);
    expect(updatedSublevel.items[0].isCustomDeterminations).toBe(true);

    rerender(
      <IndirectLevelCard
        level={{ ...baseLevel, sublevels: [updatedSublevel] }}
        onSublevelChange={handleChange}
        globalDeterminations={100}
      />
    );

    expect(
      screen.getByLabelText("Valor personalizado")
    ).toBeInTheDocument();
  });

  it("muestra la base global de prorrateo en el resumen del nivel", () => {
    render(
      <IndirectLevelCard
        level={baseLevel}
        onSublevelChange={vi.fn()}
        globalDeterminations={120}
      />
    );

    expect(
      screen.getByText(
        /Base global de prorrateo \(DM\): 120 determinaciones\/mes/
      )
    ).toBeInTheDocument();
  });
});
