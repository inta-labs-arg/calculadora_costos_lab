import { describe, expect, it } from "vitest";
import {
  HourlyRateRecord,
  createSnapshot,
  parseCsvSnapshot,
  parseJsonSnapshot,
  parseSnapshot,
  serializeSnapshotToCsv,
  serializeSnapshotToJson
} from "@/lib/hourlyRates";

const sampleItems: HourlyRateRecord[] = [
  {
    id: "professional-2024-01-01",
    profileCode: "professional",
    profileName: "Profesional investigador",
    hourlyRateARS: 12000,
    vigenciaDesdeISO: "2024-01-01",
    vigenciaHastaISO: null
  },
  {
    id: "technician-2024-03-01",
    profileCode: "technician",
    profileName: "Técnico de laboratorio",
    hourlyRateARS: 8500.5,
    vigenciaDesdeISO: "2024-03-01",
    vigenciaHastaISO: "2024-12-31"
  }
];

describe("hourlyRates serialization", () => {
  it("serializa y deserializa snapshots en JSON", () => {
    const snapshot = createSnapshot(sampleItems, "2024-05-15");
    const json = serializeSnapshotToJson(snapshot);
    const parsed = parseJsonSnapshot(json);

    expect(parsed).toEqual(snapshot);
  });

  it("serializa y deserializa snapshots en CSV", () => {
    const snapshot = createSnapshot(sampleItems, "2024-05-15");
    const csv = serializeSnapshotToCsv(snapshot);
    const parsed = parseCsvSnapshot(csv);

    expect(parsed.exportedAtISO).toBe(snapshot.exportedAtISO);
    expect(parsed.items).toEqual(snapshot.items);
  });
});

describe("hourlyRates validation", () => {
  it("rechaza tasas negativas al importar", () => {
    const invalidCsv = [
      "profileCode,profileName,hourlyRateARS,vigenciaDesdeISO,vigenciaHastaISO,exportedAtISO",
      "professional,Profesional,-10,2024-01-01,,2024-05-10"
    ].join("\n");

    expect(() => parseSnapshot(invalidCsv, "valores.csv")).toThrow(
      /mayor o igual a cero/
    );
  });

  it("requiere fechas en formato ISO válido", () => {
    const invalidJson = JSON.stringify({
      version: 1,
      exportedAtISO: "2024-05-10",
      items: [
        {
          id: "tech-1",
          profileCode: "tech",
          profileName: "Técnico",
          hourlyRateARS: 5000,
          vigenciaDesdeISO: "10/05/2024",
          vigenciaHastaISO: null
        }
      ]
    });

    expect(() => parseSnapshot(invalidJson, "valores.json")).toThrow(
      /formato ISO/
    );
  });
});
