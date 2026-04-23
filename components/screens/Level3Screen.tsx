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
} from "@/lib/cost-calculation";

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);
const r2 = (n: number) => Math.round(n * 100) / 100;

type TabId = "acreditacionTercerasPartes" | "monitoreoRegulatorio" | "ensayosInterlaboratorio";

const SECTION_META: Record<TabId, { label: string; title: string; desc: string }> = {
  acreditacionTercerasPartes: {
    label: "Acreditación OAA",
    title: "d.1) Acreditación de Terceras Partes",
    desc:  "Aranceles y auditorías OAA bajo ISO/IEC 17025 para garantizar la competencia técnica del laboratorio.",
  },
  monitoreoRegulatorio: {
    label: "Monitoreo Regulatorio",
    title: "d.2) Monitoreo de Organismos Regulatorios",
    desc:  "Inspecciones, tasas y auditorías de SENASA y ANMAT que habilitan las determinaciones oficiales.",
  },
  ensayosInterlaboratorio: {
    label: "Ensayos Interlaboratorio",
    title: "d.3) Participación de Ensayos Interlaboratorio",
    desc:  "Inscripciones y envíos para comparaciones de desempeño que respaldan la calidad analítica.",
  },
};

// ── SharedResource con DM editable por ítem ──────────────────────────────────

interface SharedResourceSectionProps {
  tabId: TabId;
  items: SharedResourceCostItem[];
  globalDet: number;
  onAdd: (item: SharedResourceCostItem) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, field: string, val: string) => void;
}

function SharedResourceSection({ tabId, items, globalDet, onAdd, onDelete, onUpdate }: SharedResourceSectionProps) {
  const meta = SECTION_META[tabId];
  const [form, setForm] = useState({ concept: "", monthlyCost: "", determinations: globalDet.toString() });
  const [err, setErr] = useState("");

  const subtotal = items.reduce((s, i) => s + (i.determinations > 0 ? i.monthlyCost / i.determinations : 0), 0);
  const mc = parseFloat(form.monthlyCost);
  const det = parseFloat(form.determinations) || globalDet;
  const unitCost = mc > 0 && det > 0 ? r2(mc / det) : null;

  const handleAdd = () => {
    setErr("");
    if (!form.concept.trim()) return setErr("Ingresá el concepto");
    if (isNaN(mc) || mc < 0) return setErr("Ingresá el costo mensual");
    if (!det || det <= 0) return setErr("Ingresá las determinaciones");
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
            <div className="font-semibold text-sm text-inta-gray-800">{meta.title}</div>
            <div className="text-xs text-inta-gray-400 mt-0.5 leading-relaxed">{meta.desc}</div>
          </div>
          {subtotal > 0 && <Tag color="orange">{fmtARS(r2(subtotal))}</Tag>}
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
                <input
                  value={item.concept}
                  onChange={e => onUpdate(item.id, "concept", e.target.value)}
                  className="border-none bg-transparent text-sm font-medium text-inta-gray-700 w-full outline-none"
                />
                <div className="text-xs text-inta-gray-400">
                  Mensual: {fmtARS(item.monthlyCost)} · DM: {item.determinations}
                </div>
              </div>
              <div className="text-right shrink-0">
                <input
                  type="number" min="0" step="0.01"
                  value={item.monthlyCost || ""}
                  onChange={e => onUpdate(item.id, "monthlyCost", e.target.value)}
                  className="w-24 text-right px-2 py-1.5 border border-inta-gray-200 rounded-md text-[13px] font-semibold text-inta-gray-700 outline-none focus:border-inta-orange"
                />
                {uc > 0 && <div className="text-[11px] text-inta-green mt-0.5">{fmtARS(uc)}/det</div>}
              </div>
              <button onClick={() => onDelete(item.id)} className="text-inta-gray-300 text-lg leading-none px-1 shrink-0 hover:text-inta-red">×</button>
            </ItemRow>
          );
        })
      )}

      <div className="px-5 py-3 bg-inta-gray-50 border-t border-inta-gray-100">
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 items-end">
          <InputField label="Concepto" placeholder="Descripción..."
            value={form.concept} onChange={e => setForm(p => ({ ...p, concept: e.target.value }))} />
          <InputField label="Costo mensual" type="number" min="0" step="0.01" suffix="$"
            value={form.monthlyCost} onChange={e => setForm(p => ({ ...p, monthlyCost: e.target.value }))} />
          <InputField label="Determinaciones" type="number" min="1" step="1" hint="Cantidad/mes"
            value={form.determinations} onChange={e => setForm(p => ({ ...p, determinations: e.target.value }))} />
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

// ── Level3Screen ──────────────────────────────────────────────────────────────

interface Level3ScreenProps {
  level: IndirectLevelGroupState;
  onSublevelChange: (s: IndirectSublevelState) => void;
  globalDeterminations: number;
  onNavigate: (s: Screen) => void;
  totals: ScreenTotals;
}

export function Level3Screen({ level, onSublevelChange, globalDeterminations, onNavigate, totals }: Level3ScreenProps) {
  const [tab, setTab] = useState<TabId>("acreditacionTercerasPartes");

  const getSublevel = (id: string) => level.sublevels.find(s => s.id === id);

  const tabs = (Object.keys(SECTION_META) as TabId[]).map(id => ({
    id,
    label: SECTION_META[id].label,
    count: (getSublevel(id) as { items?: unknown[] } | undefined)?.items?.length ?? 0,
  }));

  const updateItem = (subId: string, id: string, field: string, val: string) => {
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

  const addItem = (subId: string, item: SharedResourceCostItem) => {
    const sub = getSublevel(subId);
    if (!sub || sub.type !== "shared-resource") return;
    onSublevelChange({ ...sub, items: [...sub.items, item] });
  };

  const delItem = (subId: string, id: string) => {
    const sub = getSublevel(subId);
    if (!sub || sub.type !== "shared-resource") return;
    onSublevelChange({ ...sub, items: sub.items.filter(i => i.id !== id) });
  };

  const currentSub = getSublevel(tab);
  const items: SharedResourceCostItem[] = currentSub?.type === "shared-resource" ? currentSub.items : [];

  return (
    <div className="screen-enter flex flex-col">
      <div className="px-5 pt-4 pb-0 bg-white border-b border-inta-gray-100">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <div className="text-[11px] font-bold text-inta-orange uppercase tracking-[0.5px] mb-0.5">Nivel 3</div>
            <div className="font-bold text-lg text-inta-gray-800">Acreditación y monitoreo</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-inta-gray-400">Subtotal</div>
            <div className={`font-bold text-xl ${totals.nivel3 > 0 ? "text-inta-green" : "text-inta-gray-300"}`}>
              {fmtARS(totals.nivel3)}
            </div>
          </div>
        </div>
        <Tabs tabs={tabs} active={tab} onChange={id => setTab(id as TabId)} />
      </div>

      <Card className="mx-4 my-4">
        <SharedResourceSection
          tabId={tab}
          items={items}
          globalDet={globalDeterminations}
          onAdd={item => addItem(tab, item)}
          onDelete={id => delItem(tab, id)}
          onUpdate={(id, field, val) => updateItem(tab, id, field, val)}
        />
      </Card>

      <NavFooter
        onBack={() => onNavigate("nivel2")}
        onNext={() => onNavigate("resumen")}
        nextLabel="Ver Resumen →"
      />
    </div>
  );
}
