import { z } from "zod";

export const HOURLY_RATES_STORAGE_KEY = "lab_hourly_rates_v1";

export const isoDateSchema = z
  .string()
  .min(1, "Ingresa una fecha en formato ISO (YYYY-MM-DD)")
  .refine((value) => {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return false;
    }
    const normalized = new Date(timestamp).toISOString().slice(0, 10);
    return normalized === value;
  }, "Utiliza una fecha válida en formato ISO (YYYY-MM-DD)");

export const hourlyRateSchema = z.object({
  id: z.string().min(1, "Identificador inválido"),
  profileCode: z
    .string()
    .min(1, "Ingresa un código de perfil")
    .regex(/^[a-zA-Z0-9_.-]+$/, {
      message:
        "El código solo puede incluir letras, números, guiones medios, bajos o puntos"
    }),
  profileName: z.string().min(1, "Ingresa el nombre del perfil"),
  hourlyRateARS: z
    .number({ invalid_type_error: "Ingresa un valor numérico" })
    .nonnegative("El valor hora debe ser mayor o igual a cero"),
  vigenciaDesdeISO: isoDateSchema,
  vigenciaHastaISO: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value))
    .pipe(z.nullable(isoDateSchema))
});

export type HourlyRateRecord = z.infer<typeof hourlyRateSchema>;

export const hourlyRatesStateSchema = z.object({
  items: z.array(hourlyRateSchema),
  lastSyncISO: z.string().nullable().default(null),
  lastSyncType: z
    .enum(["import", "export"])
    .nullable()
    .default(null)
});

export type HourlyRatesState = z.infer<typeof hourlyRatesStateSchema>;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

export function getDefaultHourlyRates(): HourlyRateRecord[] {
  return [
    {
      id: "profile-professional",
      profileCode: "professional",
      profileName: "Profesional investigador",
      hourlyRateARS: 0,
      vigenciaDesdeISO: "2024-01-01",
      vigenciaHastaISO: null
    },
    {
      id: "profile-technician",
      profileCode: "technician",
      profileName: "Técnico",
      hourlyRateARS: 0,
      vigenciaDesdeISO: "2024-01-01",
      vigenciaHastaISO: null
    },
    {
      id: "profile-support",
      profileCode: "support",
      profileName: "Personal de apoyo",
      hourlyRateARS: 0,
      vigenciaDesdeISO: "2024-01-01",
      vigenciaHastaISO: null
    },
    {
      id: "profile-intern",
      profileCode: "intern",
      profileName: "Becario",
      hourlyRateARS: 0,
      vigenciaDesdeISO: "2024-01-01",
      vigenciaHastaISO: null
    }
  ];
}

export function createInitialState(): HourlyRatesState {
  return {
    items: getDefaultHourlyRates(),
    lastSyncISO: null,
    lastSyncType: null
  };
}

export function readFromStorage(
  storage: StorageLike | null = getBrowserStorage()
): HourlyRatesState {
  if (!storage) {
    return createInitialState();
  }

  const raw = storage.getItem(HOURLY_RATES_STORAGE_KEY);
  if (!raw) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(raw);
    const state = hourlyRatesStateSchema.parse(parsed);
    return {
      ...state,
      items:
        state.items.length > 0 ? state.items : getDefaultHourlyRates()
    } satisfies HourlyRatesState;
  } catch (error) {
    console.error("No se pudo leer la configuración de valores hora", error);
    return createInitialState();
  }
}

export function writeToStorage(
  state: HourlyRatesState,
  storage: StorageLike | null = getBrowserStorage()
): void {
  if (!storage) {
    return;
  }

  const payload = JSON.stringify(state);
  storage.setItem(HOURLY_RATES_STORAGE_KEY, payload);
}

function assertSnapshotItems(items: HourlyRateRecord[]): HourlyRateRecord[] {
  return z.array(hourlyRateSchema).parse(items);
}

export const hourlyRatesSnapshotSchema = z.object({
  version: z.literal(1),
  exportedAtISO: isoDateSchema,
  items: z.array(hourlyRateSchema)
});

export type HourlyRatesSnapshot = z.infer<typeof hourlyRatesSnapshotSchema>;

export function createSnapshot(
  items: HourlyRateRecord[],
  exportedAtISO: string = new Date().toISOString().slice(0, 10)
): HourlyRatesSnapshot {
  const parsedItems = assertSnapshotItems(items);
  return {
    version: 1,
    exportedAtISO,
    items: parsedItems
  };
}

export function serializeSnapshotToJson(snapshot: HourlyRatesSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

function escapeCsvValue(value: string | number | null): string {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  const stringValue = String(value);
  if (/[";,\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function serializeSnapshotToCsv(snapshot: HourlyRatesSnapshot): string {
  const header = [
    "profileCode",
    "profileName",
    "hourlyRateARS",
    "vigenciaDesdeISO",
    "vigenciaHastaISO",
    "exportedAtISO"
  ];

  const rows = snapshot.items.map((item) =>
    [
      escapeCsvValue(item.profileCode),
      escapeCsvValue(item.profileName),
      escapeCsvValue(item.hourlyRateARS),
      escapeCsvValue(item.vigenciaDesdeISO),
      escapeCsvValue(item.vigenciaHastaISO ?? ""),
      escapeCsvValue(snapshot.exportedAtISO)
    ].join(",")
  );

  return [header.join(","), ...rows].join("\n");
}

export function parseJsonSnapshot(content: string): HourlyRatesSnapshot {
  const parsed = JSON.parse(content);
  return hourlyRatesSnapshotSchema.parse(parsed);
}

export function parseCsvSnapshot(content: string): HourlyRatesSnapshot {
  const [headerLine, ...lines] = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!headerLine) {
    throw new Error("El archivo CSV está vacío");
  }

  const headers = headerLine.split(",").map((item) => item.trim());
  const expectedHeaders = [
    "profileCode",
    "profileName",
    "hourlyRateARS",
    "vigenciaDesdeISO",
    "vigenciaHastaISO",
    "exportedAtISO"
  ];

  const headerMismatch = expectedHeaders.some(
    (header, index) => headers[index] !== header
  );

  if (headerMismatch) {
    throw new Error(
      "Las columnas del CSV no coinciden con el formato esperado"
    );
  }

  if (lines.length === 0) {
    throw new Error("No se encontraron filas en el CSV");
  }

  const items: HourlyRateRecord[] = [];
  let exportedAtISO: string | null = null;

  for (const line of lines) {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    cells.push(current);

    if (cells.length !== expectedHeaders.length) {
      throw new Error("La fila del CSV no tiene la cantidad correcta de columnas");
    }

    const [profileCode, profileName, rateRaw, vigenciaDesde, vigenciaHasta, exportedAt] =
      cells.map((cell) => cell.trim());

    const rate = Number(rateRaw);
    if (!Number.isFinite(rate)) {
      throw new Error("El valor hora debe ser un número válido");
    }

    if (exportedAtISO && exportedAtISO !== exportedAt) {
      throw new Error(
        "Todas las filas deben compartir la misma fecha de exportación"
      );
    }

    exportedAtISO = exportedAt;

    const record: HourlyRateRecord = hourlyRateSchema.parse({
      id: `${profileCode}-${vigenciaDesde}`,
      profileCode,
      profileName,
      hourlyRateARS: rate,
      vigenciaDesdeISO: vigenciaDesde,
      vigenciaHastaISO: vigenciaHasta ? vigenciaHasta : null
    });

    items.push(record);
  }

  if (!exportedAtISO) {
    throw new Error("No se encontró la fecha de exportación en el CSV");
  }

  return createSnapshot(items, exportedAtISO);
}

export function parseSnapshot(content: string, fileName?: string): HourlyRatesSnapshot {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("El archivo está vacío");
  }

  const looksLikeJson = trimmed.startsWith("{") || fileName?.endsWith(".json");

  try {
    if (looksLikeJson) {
      return parseJsonSnapshot(trimmed);
    }

    return parseCsvSnapshot(trimmed);
  } catch (error) {
    if (looksLikeJson) {
      throw error;
    }

    try {
      return parseJsonSnapshot(trimmed);
    } catch {
      throw error;
    }
  }
}

export function updateStateItems(
  state: HourlyRatesState,
  items: HourlyRateRecord[]
): HourlyRatesState {
  const parsedItems = assertSnapshotItems(items);
  return {
    ...state,
    items: parsedItems
  };
}

export function withSyncMetadata(
  state: HourlyRatesState,
  metadata: { iso: string; type: "import" | "export" }
): HourlyRatesState {
  return {
    ...state,
    lastSyncISO: metadata.iso,
    lastSyncType: metadata.type
  };
}

export function formatSyncLabel(state: HourlyRatesState): string {
  if (!state.lastSyncISO) {
    return "Tabla local";
  }

  return `Tabla local (${state.lastSyncISO})`;
}

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyRecord(): HourlyRateRecord {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: generateId(),
    profileCode: "",
    profileName: "",
    hourlyRateARS: 0,
    vigenciaDesdeISO: today,
    vigenciaHastaISO: null
  };
}
