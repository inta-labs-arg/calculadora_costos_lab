export const appConfig = {
  guides: {
    equipmentDepreciationMethod:
      "https://inta.gob.ar/documentos/metodo-depreciacion-por-servicios"
  }
} as const;

export type AppConfig = typeof appConfig;
