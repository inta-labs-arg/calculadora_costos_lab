import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IndirectLevelCard } from "@/components/IndirectLevelCard";
import type {
  IndirectLevelGroupState,
  IndirectSublevelState,
  SharedResourceSublevelState
} from "@/lib/cost-calculation";

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

  it("permite actualizar la DM global desde el nivel 2 y refleja el valor en los subniveles", () => {
    const handleChange = vi.fn<(sublevel: IndirectSublevelState) => void>();
    const handleGlobalDeterminationsChange = vi.fn<(value: number) => void>();

    render(
      <IndirectLevelCard
        level={baseLevel}
        onSublevelChange={handleChange}
        globalDeterminations={100}
        onGlobalDeterminationsChange={handleGlobalDeterminationsChange}
      />
    );

    const determinationsInput = screen.getByLabelText(
      "Cantidad de determinaciones mensuales"
    );
    fireEvent.change(determinationsInput, { target: { value: "150" } });

    expect(handleGlobalDeterminationsChange).toHaveBeenCalledWith(150);

    const row = screen.getByText("Servicio de limpieza").closest("tr");
    if (!row) {
      throw new Error("Row not found");
    }

    expect(within(row).queryByDisplayValue("100")).not.toBeInTheDocument();
    expect(within(row).getByText("100 DM")).toBeInTheDocument();
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

  it("precarga los rubros fijos de infraestructura utilizando la DM global", () => {
    const infrastructureLevel: IndirectLevelGroupState = {
      id: "serviciosGenerales",
      name: "Nivel 2 · Costos Indirectos Unitarios",
      description: "",
      type: "indirect-group",
      sublevels: [
        {
          id: "infraestructura",
          name: "Subnivel 2.4 · Costos de infraestructura",
          description: "",
          type: "shared-resource",
          items: []
        }
      ]
    };

    const handleChange = vi.fn<(sublevel: IndirectSublevelState) => void>();
    const { rerender } = render(
      <IndirectLevelCard
        level={infrastructureLevel}
        onSublevelChange={handleChange}
        globalDeterminations={80}
      />
    );

    expect(handleChange).toHaveBeenCalledTimes(1);
    const updatedSublevel = handleChange.mock.calls[0][0] as SharedResourceSublevelState;
    expect(updatedSublevel.id).toBe("infraestructura");
    expect(updatedSublevel.items).toHaveLength(7);
    expect(updatedSublevel.items.map((item) => item.id)).toEqual([
      "energia",
      "gas",
      "agua",
      "limpieza",
      "administracion",
      "comunicaciones",
      "otro"
    ]);
    expect(
      updatedSublevel.items.every((item) => item.determinations === 80)
    ).toBe(true);

    rerender(
      <IndirectLevelCard
        level={{ ...infrastructureLevel, sublevels: [updatedSublevel] }}
        onSublevelChange={handleChange}
        globalDeterminations={80}
      />
    );

    const fixedInput = screen.getByDisplayValue("Energía");
    expect(fixedInput).toBeDisabled();
    const editableInput = screen.getByDisplayValue("Otro (especificar)");
    expect(editableInput).not.toBeDisabled();
  });

  it("advierte cuando la base global de prorrateo es cero en infraestructura", () => {
    const infrastructureLevel: IndirectLevelGroupState = {
      id: "serviciosGenerales",
      name: "Nivel 2 · Costos Indirectos Unitarios",
      description: "",
      type: "indirect-group",
      sublevels: [
        {
          id: "infraestructura",
          name: "Subnivel 2.4 · Costos de infraestructura",
          description: "",
          type: "shared-resource",
          items: []
        }
      ]
    };

    render(
      <IndirectLevelCard
        level={infrastructureLevel}
        onSublevelChange={vi.fn()}
        globalDeterminations={0}
      />
    );

    expect(
      screen.getByText(
        /Definí la base global de prorrateo \(DM\) para calcular los costos unitarios de infraestructura/
      )
    ).toBeInTheDocument();
  });
});
