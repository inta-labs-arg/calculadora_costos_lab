"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  LevelKey,
  LevelState,
  SublevelState,
  IndirectSublevelState,
  SupplyCostItem,
  LaborCostItem,
  EquipmentCostItem,
  SharedResourceCostItem,
  IndirectEquipmentItem,
} from "@/lib/cost-calculation";
import {
  calculateTotals,
  createInfrastructureDefaultItems,
} from "@/lib/cost-calculation";
import {
  ExchangeRateProvider,
  useExchangeRate,
} from "@/contexts/ExchangeRateContext";
import { HourlyRatesProvider } from "@/contexts/HourlyRatesContext";
import { round2 } from "@/lib/money";
import { StickyHeader } from "@/components/layout/StickyHeader";
import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { Level1Screen } from "@/components/screens/Level1Screen";
import { Level2Screen } from "@/components/screens/Level2Screen";
import { Level3Screen } from "@/components/screens/Level3Screen";
import { SummaryScreen } from "@/components/screens/SummaryScreen";

// ── Exported types ────────────────────────────────────────────────────────────

export type Screen = "dashboard" | "nivel1" | "nivel2" | "nivel3" | "resumen";

export type ScreenTotals = {
  nivel1: number;
  n1insumos: number;
  n1labor: number;
  n1equip: number;
  nivel2: number;
  n2mat: number;
  n2equip: number;
  n2mant: number;
  n2calib: number;
  n2infra: number;
  nivel3: number;
  n3acred: number;
  n3monit: number;
  n3inter: number;
  grandTotal: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_GLOBAL_DETERMINATIONS = 100;

const LEVEL_TWO_SUBLEVEL_IDS = new Set<IndirectSublevelState["id"]>([
  "materialesNoDescartables",
  "equipamientoMenor",
  "mantenimientoEquipamiento",
  "calibracionEquipamiento",
  "infraestructura",
]);

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_INSUMOS: SupplyCostItem[] = [
  { id: "i1", item: "Agar Plate Count", presentationFormat: "Frasco 500g", presentationQuantity: 500, unitOfMeasure: "g", presentationPrice: 18500, determinationQuantity: 2.5 },
  { id: "i2", item: "Agua destilada estéril", presentationFormat: "Botella 1L", presentationQuantity: 1000, unitOfMeasure: "mL", presentationPrice: 3200, determinationQuantity: 50 },
  { id: "i3", item: "Tubos Falcon 50mL", presentationFormat: "Pack 50 u", presentationQuantity: 50, unitOfMeasure: "unidad", presentationPrice: 7800, determinationQuantity: 3 },
];

const DEMO_MANO_OBRA: LaborCostItem[] = [
  { id: "professional", role: "professional", label: "Profesionales", quantity: 1, totalHours: 1.5, monthlySalary: 850000 },
  { id: "technician",   role: "technician",   label: "Técnicos",      quantity: 1, totalHours: 2.0, monthlySalary: 620000 },
  { id: "support",      role: "support",      label: "Apoyo",         quantity: 0, totalHours: 0,   monthlySalary: 0 },
];

const DEMO_EQUIPAMIENTO: EquipmentCostItem[] = [
  { id: "eq1", descripcion: "Autoclave 50L",             costoAdquisicion: 1800000, valorResidual: 180000, vidaUtilAnios: 10 },
  { id: "eq2", descripcion: "Incubadora bacteriológica", costoAdquisicion: 950000,  valorResidual: 95000,  vidaUtilAnios: 8 },
];

const DEMO_DET = 120;

function makeDemoShared(items: Omit<SharedResourceCostItem, "determinations">[]): SharedResourceCostItem[] {
  return items.map(i => ({ ...i, determinations: DEMO_DET }));
}

const DEMO_MAT_NO_DESCARTABLES: SharedResourceCostItem[] = makeDemoShared([
  { id: "mn1", concept: "Jeringas de vidrio 10mL", monthlyCost: 4500 },
  { id: "mn2", concept: "Pinzas y espátulas",       monthlyCost: 2200 },
]);

const DEMO_EQUIP_MENOR: IndirectEquipmentItem[] = [
  { id: "em1", name: "Balanza analítica",  purchasePrice: 420000, usefulLifeMonths: 120, determinations: DEMO_DET },
  { id: "em2", name: "Vortex mixer",       purchasePrice: 85000,  usefulLifeMonths: 84,  determinations: DEMO_DET },
];

const DEMO_MANTENIMIENTO: SharedResourceCostItem[] = makeDemoShared([
  { id: "mt1", concept: "Mantenimiento autoclave", monthlyCost: 12000 },
]);

const DEMO_CALIBRACION: SharedResourceCostItem[] = makeDemoShared([
  { id: "cal1", concept: "Calibración balanza analítica", monthlyCost: 8500 },
]);

const DEMO_INFRAESTRUCTURA: SharedResourceCostItem[] = [
  { id: "energia",        concept: "Energía",        monthlyCost: 45000, determinations: DEMO_DET, isFixed: true },
  { id: "gas",            concept: "Gas",             monthlyCost: 12000, determinations: DEMO_DET, isFixed: true },
  { id: "agua",           concept: "Agua",            monthlyCost: 8000,  determinations: DEMO_DET, isFixed: true },
  { id: "limpieza",       concept: "Limpieza",        monthlyCost: 18000, determinations: DEMO_DET, isFixed: true },
  { id: "administracion", concept: "Administración",  monthlyCost: 22000, determinations: DEMO_DET, isFixed: true },
  { id: "comunicaciones", concept: "Comunicaciones",  monthlyCost: 5500,  determinations: DEMO_DET, isFixed: true },
];

const DEMO_ACRED: SharedResourceCostItem[] = [
  { id: "ac1", concept: "Arancel OAA – ISO/IEC 17025", monthlyCost: 25000, determinations: DEMO_DET },
];

const DEMO_MONITOREO: SharedResourceCostItem[] = [
  { id: "mr1", concept: "Tasa habilitación SENASA", monthlyCost: 8333, determinations: DEMO_DET },
];

const DEMO_INTERLABORATORIO: SharedResourceCostItem[] = [
  { id: "el1", concept: "Ensayo ENAC – Microbiología", monthlyCost: 6250, determinations: DEMO_DET },
];

// ── Level factory ─────────────────────────────────────────────────────────────

function createInitialLevels(globalDeterminations: number): LevelState[] {
  return [
    {
      id: "nivel1",
      name: "Nivel 1 · Costos Directos Unitarios",
      description: "Integra los costos específicos que se consumen en cada determinación.",
      type: "direct-group",
      sublevels: [
        {
          id: "insumosDirectos",
          name: "b.1) Insumos Directos",
          description: "Materiales, reactivos y consumibles específicos.",
          type: "insumos",
          items: [],
        },
        {
          id: "manoDeObraDirecta",
          name: "b.2) Mano de obra Directa",
          description: "Horas y salarios del personal que interviene en la práctica.",
          type: "manoObra",
          items: [
            { id: "professional", role: "professional", label: "Profesionales", quantity: 0, totalHours: 0, monthlySalary: 0 },
            { id: "technician",   role: "technician",   label: "Técnicos",      quantity: 0, totalHours: 0, monthlySalary: 0 },
            { id: "support",      role: "support",      label: "Apoyo",         quantity: 0, totalHours: 0, monthlySalary: 0 },
          ],
        },
        {
          id: "equipamientoEspecifico",
          name: "b.3) Equipamiento específico",
          description: "Depreciación lineal del equipamiento específico.",
          type: "equipamiento",
          items: [],
        },
      ],
    },
    {
      id: "serviciosGenerales",
      name: "Nivel 2 · Costos Indirectos Unitarios",
      description: "Recursos transversales prorrateados según determinaciones.",
      type: "indirect-group",
      sublevels: [
        { id: "materialesNoDescartables", name: "c.1) Materiales no descartables",      description: "Materiales reutilizables y su costo de reposición.", type: "shared-resource",     items: [] },
        { id: "equipamientoMenor",        name: "c.2) Depreciación equipamiento menor", description: "Equipos menores de uso transversal.",                type: "indirect-equipment",   items: [] },
        { id: "mantenimientoEquipamiento",name: "c.3.1) Mantenimiento de equipos",      description: "Mantenimiento periódico de equipos.",                type: "shared-resource",     items: [] },
        { id: "calibracionEquipamiento",  name: "c.3.2) Calibración de equipos",        description: "Calibración interna o externa de equipos.",          type: "shared-resource",     items: [] },
        {
          id: "infraestructura",
          name: "c.4) Costos de Infraestructura",
          description: "Energía, gas, agua, limpieza, administración y comunicaciones.",
          type: "shared-resource",
          items: createInfrastructureDefaultItems(globalDeterminations),
        },
      ],
    },
    {
      id: "acreditacion",
      name: "Nivel 3 · Acreditación y monitoreo",
      description: "Certificaciones, controles regulatorios y ensayos comparativos.",
      type: "indirect-group",
      sublevels: [
        { id: "acreditacionTercerasPartes", name: "d.1) Acreditación de Terceras Partes",        description: "Aranceles y auditorías OAA bajo ISO/IEC 17025.", type: "shared-resource", items: [] },
        { id: "monitoreoRegulatorio",       name: "d.2) Monitoreo de Organismos Regulatorios",   description: "Inspecciones, tasas y auditorías SENASA/ANMAT.", type: "shared-resource", items: [] },
        { id: "ensayosInterlaboratorio",    name: "d.3) Participación Ensayos Interlaboratorio",  description: "Comparaciones de desempeño obligatorias.",       type: "shared-resource", items: [] },
      ],
    },
  ];
}

function createDemoLevels(): LevelState[] {
  return [
    {
      id: "nivel1",
      name: "Nivel 1 · Costos Directos Unitarios",
      description: "Integra los costos específicos que se consumen en cada determinación.",
      type: "direct-group",
      sublevels: [
        { id: "insumosDirectos",       name: "b.1) Insumos Directos",         description: "", type: "insumos",      items: DEMO_INSUMOS },
        { id: "manoDeObraDirecta",     name: "b.2) Mano de obra Directa",     description: "", type: "manoObra",     items: DEMO_MANO_OBRA },
        { id: "equipamientoEspecifico",name: "b.3) Equipamiento específico",  description: "", type: "equipamiento", items: DEMO_EQUIPAMIENTO },
      ],
    },
    {
      id: "serviciosGenerales",
      name: "Nivel 2 · Costos Indirectos Unitarios",
      description: "Recursos transversales prorrateados según determinaciones.",
      type: "indirect-group",
      sublevels: [
        { id: "materialesNoDescartables", name: "c.1) Materiales no descartables",      description: "", type: "shared-resource",   items: DEMO_MAT_NO_DESCARTABLES },
        { id: "equipamientoMenor",        name: "c.2) Depreciación equipamiento menor", description: "", type: "indirect-equipment", items: DEMO_EQUIP_MENOR },
        { id: "mantenimientoEquipamiento",name: "c.3.1) Mantenimiento de equipos",      description: "", type: "shared-resource",   items: DEMO_MANTENIMIENTO },
        { id: "calibracionEquipamiento",  name: "c.3.2) Calibración de equipos",        description: "", type: "shared-resource",   items: DEMO_CALIBRACION },
        { id: "infraestructura",          name: "c.4) Costos de Infraestructura",        description: "", type: "shared-resource",   items: DEMO_INFRAESTRUCTURA },
      ],
    },
    {
      id: "acreditacion",
      name: "Nivel 3 · Acreditación y monitoreo",
      description: "Certificaciones, controles regulatorios y ensayos comparativos.",
      type: "indirect-group",
      sublevels: [
        { id: "acreditacionTercerasPartes", name: "d.1) Acreditación de Terceras Partes",       description: "", type: "shared-resource", items: DEMO_ACRED },
        { id: "monitoreoRegulatorio",       name: "d.2) Monitoreo de Organismos Regulatorios",  description: "", type: "shared-resource", items: DEMO_MONITOREO },
        { id: "ensayosInterlaboratorio",    name: "d.3) Participación Ensayos Interlaboratorio", description: "", type: "shared-resource", items: DEMO_INTERLABORATORIO },
      ],
    },
  ];
}

// ── Totals derivation ─────────────────────────────────────────────────────────

function deriveScreenTotals(
  orderedTotals: ReturnType<typeof calculateTotals>["orderedTotals"],
  grandTotal: number,
): ScreenTotals {
  const findSub = (levelId: string, subId: string) => {
    const level = orderedTotals.find(l => l.id === levelId);
    return level?.breakdown?.find(b => b.id === subId)?.subtotal ?? 0;
  };

  const nivel1 = orderedTotals.find(l => l.id === "nivel1")?.subtotal ?? 0;
  const nivel2 = orderedTotals.find(l => l.id === "serviciosGenerales")?.subtotal ?? 0;
  const nivel3 = orderedTotals.find(l => l.id === "acreditacion")?.subtotal ?? 0;

  return {
    nivel1,
    n1insumos: findSub("nivel1", "insumosDirectos"),
    n1labor:   findSub("nivel1", "manoDeObraDirecta"),
    n1equip:   findSub("nivel1", "equipamientoEspecifico"),
    nivel2,
    n2mat:   findSub("serviciosGenerales", "materialesNoDescartables"),
    n2equip: findSub("serviciosGenerales", "equipamientoMenor"),
    n2mant:  findSub("serviciosGenerales", "mantenimientoEquipamiento"),
    n2calib: findSub("serviciosGenerales", "calibracionEquipamiento"),
    n2infra: findSub("serviciosGenerales", "infraestructura"),
    nivel3,
    n3acred: findSub("acreditacion", "acreditacionTercerasPartes"),
    n3monit: findSub("acreditacion", "monitoreoRegulatorio"),
    n3inter: findSub("acreditacion", "ensayosInterlaboratorio"),
    grandTotal,
  };
}

// ── App content ───────────────────────────────────────────────────────────────

function HomePageContent() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [globalDeterminations, setGlobalDeterminations] = useState(DEFAULT_GLOBAL_DETERMINATIONS);
  const [levels, setLevels] = useState<LevelState[]>(() => createInitialLevels(DEFAULT_GLOBAL_DETERMINATIONS));
  const [priceARS, setPriceARS] = useState(0);
  const [percentageEEA, setPercentageEEA] = useState(10);
  const [percentageCentro, setPercentageCentro] = useState(5);
  const [serviceName, setServiceName] = useState("");
  const [laboratoryName, setLaboratoryName] = useState("");
  const { state: exchangeRateState } = useExchangeRate();
  const [quoteDateISO] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  });

  const { totals: _totals, orderedTotals, grandTotal } = useMemo(
    () => calculateTotals(levels, { exchangeRate: exchangeRateState.rate }),
    [levels, exchangeRateState.rate],
  );

  const screenTotals = useMemo(
    () => deriveScreenTotals(orderedTotals, grandTotal),
    [orderedTotals, grandTotal],
  );

  const afectacionEEA   = useMemo(() => round2(priceARS * (percentageEEA / 100)),   [priceARS, percentageEEA]);
  const afectacionCentro = useMemo(() => round2(priceARS * (percentageCentro / 100)), [priceARS, percentageCentro]);
  const precioNeto       = useMemo(() => round2(priceARS + afectacionEEA + afectacionCentro), [priceARS, afectacionEEA, afectacionCentro]);

  const navigate = (s: Screen) => {
    setScreen(s);
    window.scrollTo({ top: 0 });
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSublevelChange = (id: LevelKey, updatedSublevel: SublevelState) => {
    setLevels(prev => prev.map(level => {
      if (level.id !== id || level.type !== "direct-group") return level;
      return { ...level, sublevels: level.sublevels.map(s => s.id === updatedSublevel.id ? updatedSublevel : s) };
    }));
  };

  const handleIndirectSublevelChange = (id: LevelKey, updatedSublevel: IndirectSublevelState) => {
    setLevels(prev => prev.map(level => {
      if (level.id !== id || level.type !== "indirect-group") return level;
      return { ...level, sublevels: level.sublevels.map(s => s.id === updatedSublevel.id ? updatedSublevel : s) };
    }));
  };

  const handleGlobalDeterminationsChange = (value: number) => {
    setGlobalDeterminations(value);
    setLevels(prev => prev.map(level => {
      if (level.id !== "serviciosGenerales" || level.type !== "indirect-group") return level;
      return {
        ...level,
        sublevels: level.sublevels.map(sublevel => {
          if (!LEVEL_TWO_SUBLEVEL_IDS.has(sublevel.id)) return sublevel;
          return {
            ...sublevel,
            items: (sublevel.items as Array<{ determinations: number; isCustomDeterminations?: boolean }>).map(item => ({
              ...item,
              determinations: value,
              isCustomDeterminations: value > 0 ? false : undefined,
            })),
          } as IndirectSublevelState;
        }),
      } satisfies typeof level;
    }));
  };

  const handleLoadDemo = () => {
    setServiceName("Análisis microbiológico de alimentos");
    setLaboratoryName("Laboratorio de Calidad Agroalimentaria – INTA Castelar");
    setGlobalDeterminations(DEMO_DET);
    setLevels(createDemoLevels());
    setPriceARS(0);
    setPercentageEEA(10);
    setPercentageCentro(5);
    navigate("dashboard");
  };

  // ── Done flags ───────────────────────────────────────────────────────────────

  const nivel1Level = levels.find(l => l.id === "nivel1");
  const nivel2Level = levels.find(l => l.id === "serviciosGenerales");
  const nivel3Level = levels.find(l => l.id === "acreditacion");

  const nivel1Done = nivel1Level?.type === "direct-group" && (
    nivel1Level.sublevels.some(s => s.type === "insumos" && s.items.length > 0) ||
    nivel1Level.sublevels.some(s => s.type === "manoObra" && s.items.some(i => i.quantity > 0)) ||
    nivel1Level.sublevels.some(s => s.type === "equipamiento" && s.items.length > 0)
  );

  const nivel2Done = nivel2Level?.type === "indirect-group" && nivel2Level.sublevels.some(s => {
    if (s.type === "shared-resource") return s.items.some(i => i.monthlyCost > 0);
    if (s.type === "indirect-equipment") return s.items.some(i => i.purchasePrice > 0);
    return false;
  });

  const nivel3Done = nivel3Level?.type === "indirect-group" && nivel3Level.sublevels.some(s =>
    s.type === "shared-resource" && s.items.length > 0
  );

  const doneScreens = useMemo(() => {
    const set = new Set<Screen>();
    if (nivel1Done) set.add("nivel1");
    if (nivel2Done) set.add("nivel2");
    if (nivel3Done) set.add("nivel3");
    return set;
  }, [nivel1Done, nivel2Done, nivel3Done]);

  const progressPercent = Math.round(([nivel1Done, nivel2Done, nivel3Done].filter(Boolean).length / 3) * 100);

  return (
    <div className="flex flex-col min-h-screen bg-inta-gray-100">
      <StickyHeader
        screen={screen}
        onNavigate={navigate}
        grandTotal={grandTotal}
        exchangeRate={exchangeRateState.rate}
        progressPercent={progressPercent}
        doneScreens={doneScreens}
      />

      <main className="flex-1 w-full max-w-[640px] mx-auto">
        {screen === "dashboard" && (
          <DashboardScreen
            serviceName={serviceName}
            laboratoryName={laboratoryName}
            globalDeterminations={globalDeterminations}
            onServiceNameChange={setServiceName}
            onLaboratoryNameChange={setLaboratoryName}
            onGlobalDeterminationsChange={handleGlobalDeterminationsChange}
            onLoadDemo={handleLoadDemo}
            onNavigate={navigate}
            totals={screenTotals}
            nivel1Done={!!nivel1Done}
            nivel2Done={!!nivel2Done}
            nivel3Done={!!nivel3Done}
          />
        )}

        {screen === "nivel1" && nivel1Level?.type === "direct-group" && (
          <Level1Screen
            level={nivel1Level}
            onSublevelChange={(s) => handleSublevelChange("nivel1", s)}
            onNavigate={navigate}
            totals={screenTotals}
          />
        )}

        {screen === "nivel2" && nivel2Level?.type === "indirect-group" && (
          <Level2Screen
            level={nivel2Level}
            onSublevelChange={(s) => handleIndirectSublevelChange("serviciosGenerales", s)}
            globalDeterminations={globalDeterminations}
            onNavigate={navigate}
            totals={screenTotals}
          />
        )}

        {screen === "nivel3" && nivel3Level?.type === "indirect-group" && (
          <Level3Screen
            level={nivel3Level}
            onSublevelChange={(s) => handleIndirectSublevelChange("acreditacion", s)}
            globalDeterminations={globalDeterminations}
            onNavigate={navigate}
            totals={screenTotals}
          />
        )}

        {screen === "resumen" && (
          <SummaryScreen
            orderedTotals={orderedTotals}
            grandTotal={grandTotal}
            exchangeRate={exchangeRateState}
            serviceName={serviceName}
            laboratoryName={laboratoryName}
            quoteDateISO={quoteDateISO}
            pricing={{
              precioARS: priceARS,
              porcentajeEEA: percentageEEA,
              porcentajeCentro: percentageCentro,
              afectacionEEA,
              afectacionCentro,
              precioNeto,
            }}
            onPriceChange={setPriceARS}
            onPercentageEEAChange={setPercentageEEA}
            onPercentageCentroChange={setPercentageCentro}
            onNavigate={navigate}
            totals={screenTotals}
          />
        )}
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <HourlyRatesProvider>
      <ExchangeRateProvider>
        <HomePageContent />
      </ExchangeRateProvider>
    </HourlyRatesProvider>
  );
}
