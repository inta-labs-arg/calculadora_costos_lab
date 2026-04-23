"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Btn } from "@/components/ui/Btn";
import { InputField } from "@/components/ui/InputField";
import { Tabs } from "@/components/ui/Tabs";
import { Tag } from "@/components/ui/Tag";
import { ItemRow } from "@/components/ui/ItemRow";
import { NavFooter } from "@/components/ui/NavFooter";
import type { Screen, ScreenTotals } from "@/app/page";
import type {
  IndirectLevelGroupState,
  IndirectSublevelState,
  SharedResourceCostItem,
  IndirectEquipmentItem,
} from "@/lib/cost-calculation";

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);
const r2 = (n: number) => Math.round(n * 100) / 100;

// ── SharedResource Section ───────────────────────────────────────────────────

interface SharedResourceSectionProps {
  title: string;
  desc?: string;
  items: SharedResourceCostItem[];
  globalDet: number;
  showDet?: boolean;
  onAdd: (item: SharedResourceCostItem) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, field: string, val: string) => void;
}

function SharedResourceSection({ title, desc, items, globalDet, showDet = false, onAdd, onDelete, onUpdate }: SharedResourceSectionProps) {
  const [form, setForm] = useState({ concept: "", monthlyCost: "", determinations: globalDet.toString() });
  const [err, setErr] = useState("");

  const subtotal = items.reduce((s, i) => s + (i.determinations > 0 ? i.monthlyCost / i.determinations : 0), 0);
  const mc = parseFloat(form.monthlyCost);
  const det = showDet ? parseFloat(form.determinations) : globalDet;
  const unitCost = mc > 0 && det > 0 ? r2(mc / det) : null;

  const handleAdd = () => {
    setErr("");
    if (!form.concept.trim()) return setErr("Ingresá el concepto");
    if (isNaN(mc) || mc < 0) return setErr("Ingresá el costo mensual");
    if (!det || det <= 0) return setErr(showDet ? "Ingresá las determinaciones" : "Definí el DM global en el Inicio");
    onAdd({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      concept: form.concept.trim(),
      monthlyCost: mc,
      determinations: det,
    });
    setForm({ concept: "", monthlyCost: "", determinations: globalDet.toString() });
  };

  return (
    <div>
      <div className="px-5 py-3.5 border-b border-inta-gray-100">
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="font-semibold text-sm text-inta-gray-800">{title}</div>
            {desc && <div className="text-xs text-inta-gray-400 mt-0.5 leading-relaxed">{desc}</div>}
          </div>
          {subtotal > 0 && <Tag color="green">{fmtARS(r2(subtotal))}</Tag>}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-5 text-center text-[13px] text-inta-gray-400">Sin registros aún.</div>
      ) : (
        items.map((item, i) => {
          const uc = item.determinations > 0 ? r2(item.monthlyCost / item.determinations) : 0;
          return (
            <ItemRow key={item.id} index={i}>
              <div className="flex-1 min-w-0">
                {item.isFixed ? (
                  <span className="font-medium text-sm text-inta-gray-700">{item.concept}</span>
                ) : (
                  <input
                    value={item.concept}
                    onChange={e => onUpdate(item.id, "concept", e.target.value)}
                    className="border-none bg-transparent text-sm font-medium text-inta-gray-700 w-full outline-none"
                  />
                )}
                <div className="text-xs text-inta-gray-400">
                  Mensual: {fmtARS(item.monthlyCost)} · DM: {item.determinations}
                </div>
              </div>
              <div className="text-right shrink-0">
                <input
                  type="number" min="0" step="0.01"
                  value={item.monthlyCost || ""}
                  onChange={e => onUpdate(item.id, "monthlyCost", e.target.value)}
                  className="w-24 text-right px-2 py-1.5 border border-inta-gray-200 rounded-md text-[13px] font-semibold text-inta-gray-700 outline-none focus:border-inta-blue"
                />
                {uc > 0 && <div className="text-[11px] text-inta-green mt-0.5">{fmtARS(uc)}/det</div>}
              </div>
              {!item.isFixed && (
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-inta-gray-300 text-lg leading-none px-1 shrink-0 hover:text-inta-red"
                >×</button>
              )}
            </ItemRow>
          );
        })
      )}

      <div className="px-5 py-3 bg-inta-gray-50 border-t border-inta-gray-100">
        <div className={`grid gap-2 ${showDet ? "grid-cols-[2fr_1fr_1fr]" : "grid-cols-[2fr_1fr]"} items-end`}>
          <InputField label="Concepto" placeholder="Descripción..."
            value={form.concept} onChange={e => setForm(p => ({ ...p, concept: e.target.value }))} />
          <InputField label="Costo mensual" type="number" min="0" step="0.01" suffix="$"
            value={form.monthlyCost} onChange={e => setForm(p => ({ ...p, monthlyCost: e.target.value }))} />
          {showDet && (
            <InputField label="Determinaciones" type="number" min="1" step="1" hint="Cantidad/mes"
              value={form.determinations} onChange={e => setForm(p => ({ ...p, determinations: e.target.value }))} />
          )}
        </div>
        {unitCost !== null && (
          <div className="mt-2 text-xs text-inta-green font-semibold">Costo unitario: {fmtARS(unitCost)}/det</div>
        )}
        {err && <div className="mt-1.5 text-xs text-inta-red">{err}</div>}
        <Btn onClick={handleAdd} size="sm" className="mt-2.5">+ Agregar</Btn>
      </div>
    </div>
  );
}

// ── IndirectEquipment Section ─────────────────────────────────────────────────

interface IndirectEquipmentSectionProps {
  title: string;
  desc?: string;
  items: IndirectEquipmentItem[];
  globalDet: number;
  onAdd: (item: IndirectEquipmentItem) => void;
  onDelete: (id: string) => void;
}

function IndirectEquipmentSection({ title, desc, items, globalDet, onAdd, onDelete }: IndirectEquipmentSectionProps) {
  const [form, setForm] = useState({ name: "", purchasePrice: "", usefulLifeMonths: "" });
  const [err, setErr] = useState("");

  const subtotal = items.reduce((s, i) => s + (i.usefulLifeMonths > 0 && i.determinations > 0 ? (i.purchasePrice / i.usefulLifeMonths) / i.determinations : 0), 0);
  const pp = parseFloat(form.purchasePrice);
  const ulm = parseFloat(form.usefulLifeMonths);
  const monthlyDep = pp > 0 && ulm > 0 ? r2(pp / ulm) : null;
  const unitCost = monthlyDep && globalDet > 0 ? r2(monthlyDep / globalDet) : null;

  const handleAdd = () => {
    setErr("");
    if (!form.name.trim()) return setErr("Ingresá el nombre del equipo");
    if (!pp || pp <= 0) return setErr("Ingresá el precio de compra");
    if (!ulm || ulm <= 0) return setErr("Ingresá la vida útil en meses");
    if (!globalDet || globalDet <= 0) return setErr("Definí el DM global en el Inicio");
    onAdd({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: form.name.trim(),
      purchasePrice: pp,
      usefulLifeMonths: ulm,
      determinations: globalDet,
    });
    setForm({ name: "", purchasePrice: "", usefulLifeMonths: "" });
  };

  return (
    <div>
      <div className="px-5 py-3.5 border-b border-inta-gray-100">
        <div className="flex justify-between items-start gap-2">
          <div>
            <div className="font-semibold text-sm text-inta-gray-800">{title}</div>
            {desc && <div className="text-xs text-inta-gray-400 mt-0.5 leading-relaxed">{desc}</div>}
          </div>
          {subtotal > 0 && <Tag color="green">{fmtARS(r2(subtotal))}</Tag>}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-5 text-center text-[13px] text-inta-gray-400">Sin equipos cargados.</div>
      ) : (
        items.map((item, i) => {
          const dep = item.usefulLifeMonths > 0 ? r2(item.purchasePrice / item.usefulLifeMonths) : 0;
          const uc = dep > 0 && item.determinations > 0 ? r2(dep / item.determinations) : 0;
          return (
            <ItemRow key={item.id} index={i}>
              <div className="flex-1">
                <div className="font-medium text-sm text-inta-gray-700">{item.name}</div>
                <div className="text-xs text-inta-gray-400">{item.usefulLifeMonths} meses · {fmtARS(dep)}/mes</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold text-sm text-inta-green">{fmtARS(uc)}/det</div>
              </div>
              <button onClick={() => onDelete(item.id)} className="text-inta-gray-300 text-lg leading-none px-1 hover:text-inta-red">×</button>
            </ItemRow>
          );
        })
      )}

      <div className="px-5 py-3 bg-inta-gray-50 border-t border-inta-gray-100">
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 items-end">
          <InputField label="Nombre del equipo" placeholder="Balanza analítica..."
            value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <InputField label="Precio compra" type="number" min="0" step="1000" suffix="$"
            value={form.purchasePrice} onChange={e => setForm(p => ({ ...p, purchasePrice: e.target.value }))} />
          <InputField label="Vida útil" type="number" min="1" step="1" suffix="meses"
            value={form.usefulLifeMonths} onChange={e => setForm(p => ({ ...p, usefulLifeMonths: e.target.value }))} />
        </div>
        {unitCost !== null && (
          <div className="mt-2 text-xs text-inta-green font-semibold">Costo unitario: {fmtARS(unitCost)}/det</div>
        )}
        {err && <div className="mt-1.5 text-xs text-inta-red">{err}</div>}
        <Btn onClick={handleAdd} size="sm" className="mt-2.5">+ Agregar equipo</Btn>
      </div>
    </div>
  );
}

// ── Level2Screen ──────────────────────────────────────────────────────────────

type TabId = "materialesNoDescartables" | "equipamientoMenor" | "mantenimientoEquipamiento" | "calibracionEquipamiento" | "infraestructura";

const SECTION_META: Record<string, { title: string; desc: string }> = {
  materialesNoDescartables: {
    title: "c.1) Materiales no descartables",
    desc:  "Materiales reutilizables: jeringas de vidrio, tubos, frascos. Costo mensual de reposición prorrateado.",
  },
  mantenimientoEquipamiento: {
    title: "c.3.1) Mantenimiento de equipos",
    desc:  "Honorarios, repuestos y servicios de mantenimiento periódico prorrateados por actividad mensual.",
  },
  calibracionEquipamiento: {
    title: "c.3.2) Calibración de equipos",
    desc:  "Servicios de calibración interna o externa para trazabilidad metrológica.",
  },
  infraestructura: {
    title: "c.4) Costos de Infraestructura",
    desc:  "Energía, gas, agua, limpieza, administración y comunicaciones del laboratorio.",
  },
};

interface Level2ScreenProps {
  level: IndirectLevelGroupState;
  onSublevelChange: (s: IndirectSublevelState) => void;
  globalDeterminations: number;
  onNavigate: (s: Screen) => void;
  totals: ScreenTotals;
}

export function Level2Screen({ level, onSublevelChange, globalDeterminations, onNavigate, totals }: Level2ScreenProps) {
  const [tab, setTab] = useState<TabId>("materialesNoDescartables");

  const getSublevel = (id: string) => level.sublevels.find(s => s.id === id);

  const tabs = [
    { id: "materialesNoDescartables",    label: "Mat. No Descartables", count: (getSublevel("materialesNoDescartables") as {items?: unknown[]})?.items?.length ?? 0 },
    { id: "equipamientoMenor",           label: "Equip. Menor",         count: (getSublevel("equipamientoMenor") as {items?: unknown[]})?.items?.length ?? 0 },
    { id: "mantenimientoEquipamiento",   label: "Mantenimiento",        count: (getSublevel("mantenimientoEquipamiento") as {items?: unknown[]})?.items?.length ?? 0 },
    { id: "calibracionEquipamiento",     label: "Calibración",          count: (getSublevel("calibracionEquipamiento") as {items?: unknown[]})?.items?.length ?? 0 },
    { id: "infraestructura",             label: "Infraestructura",      count: ((getSublevel("infraestructura") as {items?: SharedResourceCostItem[]})?.items ?? []).filter(i => i.monthlyCost > 0).length },
  ];

  const updateShared = (subId: string, id: string, field: string, val: string) => {
    const sub = getSublevel(subId);
    if (!sub || sub.type !== "shared-resource") return;
    const num = parseFloat(val);
    onSublevelChange({
      ...sub,
      items: sub.items.map(i =>
        i.id === id ? { ...i, [field]: field === "concept" ? val : (isNaN(num) || num < 0 ? i[field as keyof SharedResourceCostItem] : num) } : i
      ) as SharedResourceCostItem[],
    });
  };

  const addShared = (subId: string, item: SharedResourceCostItem) => {
    const sub = getSublevel(subId);
    if (!sub || sub.type !== "shared-resource") return;
    onSublevelChange({ ...sub, items: [...sub.items, { ...item, determinations: globalDeterminations }] });
  };

  const delShared = (subId: string, id: string) => {
    const sub = getSublevel(subId);
    if (!sub || sub.type !== "shared-resource") return;
    onSublevelChange({ ...sub, items: sub.items.filter(i => i.id !== id) });
  };

  const addEquip = (item: IndirectEquipmentItem) => {
    const sub = getSublevel("equipamientoMenor");
    if (!sub || sub.type !== "indirect-equipment") return;
    onSublevelChange({ ...sub, items: [...sub.items, item] });
  };

  const delEquip = (id: string) => {
    const sub = getSublevel("equipamientoMenor");
    if (!sub || sub.type !== "indirect-equipment") return;
    onSublevelChange({ ...sub, items: sub.items.filter(i => i.id !== id) });
  };

  const renderTab = () => {
    if (tab === "equipamientoMenor") {
      const sub = getSublevel("equipamientoMenor");
      if (!sub || sub.type !== "indirect-equipment") return null;
      return (
        <IndirectEquipmentSection
          title="c.2) Depreciación de equipamiento menor"
          desc="Equipos menores de uso transversal: balanzas, heladeras, campanas. Depreciación lineal prorrateada."
          items={sub.items}
          globalDet={globalDeterminations}
          onAdd={addEquip}
          onDelete={delEquip}
        />
      );
    }
    const sub = getSublevel(tab);
    if (!sub || sub.type !== "shared-resource") return null;
    const meta = SECTION_META[tab];
    return (
      <SharedResourceSection
        title={meta?.title ?? tab}
        desc={meta?.desc}
        items={sub.items}
        globalDet={globalDeterminations}
        showDet={false}
        onAdd={item => addShared(tab, item)}
        onDelete={id => delShared(tab, id)}
        onUpdate={(id, field, val) => updateShared(tab, id, field, val)}
      />
    );
  };

  return (
    <div className="screen-enter flex flex-col">
      <div className="px-5 pt-4 pb-0 bg-white border-b border-inta-gray-100">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <div className="text-[11px] font-bold text-[#0070BE] uppercase tracking-[0.5px] mb-0.5">Nivel 2</div>
            <div className="font-bold text-lg text-inta-gray-800">Costos Indirectos Unitarios</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-inta-gray-400">Subtotal</div>
            <div className={`font-bold text-xl ${totals.nivel2 > 0 ? "text-inta-green" : "text-inta-gray-300"}`}>
              {fmtARS(totals.nivel2)}
            </div>
          </div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-inta-blue-light text-xs text-inta-blue mb-2.5">
          DM global: <strong>{globalDeterminations} determinaciones/mes</strong> — ajustable desde Inicio
        </div>
        <Tabs tabs={tabs} active={tab} onChange={id => setTab(id as TabId)} />
      </div>

      <Card className="mx-4 my-4">{renderTab()}</Card>

      <NavFooter
        onBack={() => onNavigate("nivel1")}
        onNext={() => onNavigate("nivel3")}
        nextLabel="Nivel 3 →"
      />
    </div>
  );
}
