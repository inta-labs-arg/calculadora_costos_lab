"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Btn } from "@/components/ui/Btn";
import { InputField } from "@/components/ui/InputField";
import { SelectField } from "@/components/ui/SelectField";
import { Tabs } from "@/components/ui/Tabs";
import { Tag } from "@/components/ui/Tag";
import { EmptyState } from "@/components/ui/EmptyState";
import { ItemRow } from "@/components/ui/ItemRow";
import { NavFooter } from "@/components/ui/NavFooter";
import type { Screen, ScreenTotals } from "@/app/page";
import type {
  DirectLevelGroupState,
  SublevelState,
  SupplyCostItem,
  LaborCostItem,
  EquipmentCostItem,
} from "@/lib/cost-calculation";
import { LABOR_MONTHLY_HOURS } from "@/lib/cost-calculation";

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);
const fmtNum = (n: number, dec = 4) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: dec, minimumFractionDigits: dec }).format(n);
const r2 = (n: number) => Math.round(n * 100) / 100;

const UNIT_OPTIONS = [
  { value: "g",      label: "g (gramos)" },
  { value: "mg",     label: "mg (miligramos)" },
  { value: "kg",     label: "kg (kilogramos)" },
  { value: "mL",     label: "mL (mililitros)" },
  { value: "L",      label: "L (litros)" },
  { value: "unidad", label: "unidad" },
];

// ── Insumos Tab ───────────────────────────────────────────────────────────────

interface InsumosTabProps {
  items: SupplyCostItem[];
  onChange: (items: SupplyCostItem[]) => void;
  subtotal: number;
}

function InsumosTab({ items, onChange, subtotal }: InsumosTabProps) {
  const [form, setForm] = useState({
    item: "", presentationFormat: "", unitOfMeasure: "mL",
    presentationQuantity: "", presentationPrice: "", determinationQuantity: "",
  });
  const [err, setErr] = useState("");

  const pq = parseFloat(form.presentationQuantity);
  const pp = parseFloat(form.presentationPrice);
  const dq = parseFloat(form.determinationQuantity);
  const unitPrice = pq > 0 && pp > 0 ? r2(pp / pq) : null;
  const costoParcial = unitPrice !== null && dq >= 0 ? r2(unitPrice * dq) : null;

  const handleAdd = () => {
    setErr("");
    if (!form.item.trim()) return setErr("Ingresá el nombre del insumo");
    if (!pp || pp <= 0) return setErr("Ingresá el precio de presentación");
    if (!pq || pq <= 0) return setErr("Ingresá la cantidad de presentación");
    if (isNaN(dq) || dq < 0) return setErr("Ingresá la cantidad por determinación");
    const newItem: SupplyCostItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      item: form.item.trim(),
      presentationFormat: form.presentationFormat.trim(),
      unitOfMeasure: form.unitOfMeasure,
      presentationQuantity: pq,
      presentationPrice: pp,
      determinationQuantity: dq,
    };
    onChange([...items, newItem]);
    setForm({ item: "", presentationFormat: "", unitOfMeasure: "mL", presentationQuantity: "", presentationPrice: "", determinationQuantity: "" });
  };

  return (
    <div className="flex flex-col">
      {items.length === 0 ? (
        <EmptyState
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ADB5BD" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
          title="Sin insumos cargados"
          subtitle="Completá el formulario para agregar reactivos, materiales o consumibles."
        />
      ) : (
        <div>
          {items.map((item, i) => {
            const up = item.presentationQuantity > 0 ? r2(item.presentationPrice / item.presentationQuantity) : 0;
            const cost = r2(up * item.determinationQuantity);
            return (
              <ItemRow key={item.id} index={i}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-inta-gray-800 truncate">{item.item}</div>
                  <div className="text-xs text-inta-gray-400">
                    {item.presentationFormat || "—"} · {fmtNum(item.determinationQuantity)} {item.unitOfMeasure}/det
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-sm text-inta-green">{fmtARS(cost)}</div>
                  <div className="text-[11px] text-inta-gray-400">{fmtARS(up)}/{item.unitOfMeasure}</div>
                </div>
                <button
                  onClick={() => onChange(items.filter(x => x.id !== item.id))}
                  className="text-inta-gray-300 text-lg leading-none px-1 shrink-0 hover:text-inta-red"
                  title="Eliminar"
                >×</button>
              </ItemRow>
            );
          })}
          <div className="px-5 py-2.5 bg-inta-blue-light flex justify-between">
            <span className="text-[13px] font-semibold text-inta-blue">Subtotal insumos</span>
            <span className="text-[13px] font-bold text-inta-green">{fmtARS(subtotal)}</span>
          </div>
        </div>
      )}

      <div className="px-5 py-4 border-t border-inta-gray-100 bg-inta-gray-50">
        <div className="text-[11px] font-semibold text-inta-gray-600 uppercase tracking-[0.5px] mb-3">+ Agregar insumo</div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <InputField label="Nombre del insumo" placeholder="Ej.: Agar Plate Count"
                value={form.item} onChange={e => setForm(p => ({ ...p, item: e.target.value }))} />
            </div>
            <InputField label="Formato de presentación" placeholder="Frasco, kit..."
              value={form.presentationFormat} onChange={e => setForm(p => ({ ...p, presentationFormat: e.target.value }))} />
            <SelectField label="Unidad" value={form.unitOfMeasure}
              onChange={e => setForm(p => ({ ...p, unitOfMeasure: e.target.value }))} options={UNIT_OPTIONS} />
            <InputField label="Cant. presentación" type="number" min="0" step="0.001" placeholder="Ej.: 500"
              value={form.presentationQuantity} onChange={e => setForm(p => ({ ...p, presentationQuantity: e.target.value }))} />
            <InputField label="Precio presentación" type="number" min="0" step="0.01" placeholder="ARS" suffix="$"
              value={form.presentationPrice} onChange={e => setForm(p => ({ ...p, presentationPrice: e.target.value }))} />
            <InputField label="Cant. por determinación" type="number" min="0" step="0.0001" placeholder="0"
              hint={`En ${form.unitOfMeasure}`}
              value={form.determinationQuantity} onChange={e => setForm(p => ({ ...p, determinationQuantity: e.target.value }))} />
          </div>
          {costoParcial !== null && (
            <div className="flex justify-between items-center px-3.5 py-2.5 rounded-lg bg-inta-green-light">
              <span className="text-sm text-inta-green">Costo por determinación</span>
              <span className="font-bold text-base text-inta-green">{fmtARS(costoParcial)}</span>
            </div>
          )}
          {err && <div className="text-xs text-inta-red px-3 py-2 bg-inta-red-light rounded-md">{err}</div>}
          <Btn onClick={handleAdd} disabled={costoParcial === null}>Agregar insumo</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Mano de Obra Tab ─────────────────────────────────────────────────────────

interface ManoObraTabProps {
  items: LaborCostItem[];
  onChange: (items: LaborCostItem[]) => void;
  subtotal: number;
}

function ManoObraTab({ items, onChange, subtotal }: ManoObraTabProps) {
  const updateItem = (id: string, field: keyof LaborCostItem, val: string) => {
    const num = parseFloat(val) || 0;
    onChange(items.map(item => item.id === id ? { ...item, [field]: num } : item));
  };

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      <div className="px-3 py-2.5 rounded-lg bg-inta-blue-light text-xs text-inta-blue leading-relaxed">
        <strong>Referencia:</strong> Valor hora = Salario mensual ÷ {LABOR_MONTHLY_HOURS} h/mes (22 días × 8 h).
      </div>
      {items.map(item => {
        const hourly = item.monthlySalary > 0 ? r2(item.monthlySalary / LABOR_MONTHLY_HOURS) : 0;
        const cost = item.quantity > 0 && item.totalHours > 0 && item.monthlySalary > 0
          ? r2(hourly * item.totalHours * item.quantity) : 0;
        const active = item.quantity > 0;
        return (
          <Card key={item.id} className={active ? "!border-inta-blue-mid" : ""}>
            <div className="px-4 py-3 border-b border-inta-gray-100 flex items-center justify-between">
              <span className={`font-semibold text-sm ${active ? "text-inta-blue" : "text-inta-gray-500"}`}>{item.label}</span>
              {cost > 0 && <Tag color="green">{fmtARS(cost)}</Tag>}
            </div>
            <div className="px-4 py-3 grid grid-cols-3 gap-3">
              <InputField label="Cantidad" type="number" min="0" step="1" placeholder="0" hint="Personas"
                value={item.quantity || ""} onChange={e => updateItem(item.id, "quantity", e.target.value)} />
              <InputField label="Horas/det." type="number" min="0" step="0.25" placeholder="0.0" hint="Por determinación"
                value={item.totalHours || ""} onChange={e => updateItem(item.id, "totalHours", e.target.value)} />
              <InputField label="Salario mensual" type="number" min="0" step="100" placeholder="0" suffix="$"
                value={item.monthlySalary || ""} onChange={e => updateItem(item.id, "monthlySalary", e.target.value)} />
            </div>
            {hourly > 0 && (
              <div className="px-4 pb-3 text-xs text-inta-gray-400">
                Valor hora: <strong className="text-inta-gray-600">{fmtARS(hourly)}/h</strong>
              </div>
            )}
          </Card>
        );
      })}
      {subtotal > 0 && (
        <div className="flex justify-between items-center px-3.5 py-2.5 rounded-lg bg-inta-green-light">
          <span className="text-[13px] font-semibold text-inta-green">Subtotal mano de obra</span>
          <span className="text-[13px] font-bold text-inta-green">{fmtARS(subtotal)}</span>
        </div>
      )}
    </div>
  );
}

// ── Equipamiento Tab ─────────────────────────────────────────────────────────

interface EquipamientoTabProps {
  items: EquipmentCostItem[];
  onChange: (items: EquipmentCostItem[]) => void;
  subtotal: number;
}

function EquipamientoTab({ items, onChange, subtotal }: EquipamientoTabProps) {
  const [form, setForm] = useState({ descripcion: "", costoAdquisicion: "", valorResidual: "", vidaUtilAnios: "" });
  const [err, setErr] = useState("");

  const ca = parseFloat(form.costoAdquisicion);
  const vr = parseFloat(form.valorResidual) || 0;
  const va = parseFloat(form.vidaUtilAnios);
  const depAnual = ca > 0 && va > 0 ? r2((ca - vr) / va) : null;
  const depMensual = depAnual ? r2(depAnual / 12) : null;

  const handleAdd = () => {
    setErr("");
    if (!form.descripcion.trim()) return setErr("Ingresá la descripción del equipo");
    if (!ca || ca <= 0) return setErr("Ingresá el costo de adquisición");
    if (!va || va <= 0) return setErr("Ingresá la vida útil en años");
    onChange([...items, {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      descripcion: form.descripcion.trim(),
      costoAdquisicion: ca,
      valorResidual: vr,
      vidaUtilAnios: va,
    }]);
    setForm({ descripcion: "", costoAdquisicion: "", valorResidual: "", vidaUtilAnios: "" });
  };

  return (
    <div className="flex flex-col">
      {items.length === 0 ? (
        <EmptyState
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ADB5BD" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
          title="Sin equipos cargados"
          subtitle="Registrá los equipos específicos y su depreciación lineal."
        />
      ) : (
        <div>
          {items.map((item, i) => {
            const dep = item.vidaUtilAnios > 0 ? r2((item.costoAdquisicion - item.valorResidual) / item.vidaUtilAnios / 12) : 0;
            return (
              <ItemRow key={item.id} index={i}>
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.descripcion}</div>
                  <div className="text-xs text-inta-gray-400">{item.vidaUtilAnios} años · VR: {fmtARS(item.valorResidual)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-sm text-inta-green">{fmtARS(dep)}/mes</div>
                </div>
                <button
                  onClick={() => onChange(items.filter(x => x.id !== item.id))}
                  className="text-inta-gray-300 text-lg leading-none px-1 hover:text-inta-red"
                >×</button>
              </ItemRow>
            );
          })}
          <div className="px-5 py-2.5 bg-inta-blue-light flex justify-between">
            <span className="text-[13px] font-semibold text-inta-blue">Subtotal equipamiento</span>
            <span className="text-[13px] font-bold text-inta-green">{fmtARS(subtotal)}</span>
          </div>
        </div>
      )}

      <div className="px-5 py-4 border-t border-inta-gray-100 bg-inta-gray-50">
        <div className="text-[11px] font-semibold text-inta-gray-600 uppercase tracking-[0.5px] mb-3">+ Agregar equipo</div>
        <div className="flex flex-col gap-3">
          <InputField label="Descripción del equipo" placeholder="Ej.: Autoclave 50L"
            value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2.5">
            <InputField label="Costo adquisición" type="number" min="0" step="1000" suffix="$"
              value={form.costoAdquisicion} onChange={e => setForm(p => ({ ...p, costoAdquisicion: e.target.value }))} />
            <InputField label="Valor residual" type="number" min="0" step="1000" suffix="$" hint="Opcional"
              value={form.valorResidual} onChange={e => setForm(p => ({ ...p, valorResidual: e.target.value }))} />
            <InputField label="Vida útil" type="number" min="1" step="1" suffix="años"
              value={form.vidaUtilAnios} onChange={e => setForm(p => ({ ...p, vidaUtilAnios: e.target.value }))} />
          </div>
          {depMensual !== null && (
            <div className="flex justify-between items-center px-3.5 py-2.5 rounded-lg bg-inta-green-light">
              <span className="text-sm text-inta-green">Depreciación mensual</span>
              <span className="font-bold text-base text-inta-green">{fmtARS(depMensual)}</span>
            </div>
          )}
          {err && <div className="text-xs text-inta-red px-3 py-2 bg-inta-red-light rounded-md">{err}</div>}
          <Btn onClick={handleAdd} disabled={depMensual === null}>Agregar equipo</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Level1Screen ─────────────────────────────────────────────────────────────

interface Level1ScreenProps {
  level: DirectLevelGroupState;
  onSublevelChange: (s: SublevelState) => void;
  onNavigate: (s: Screen) => void;
  totals: ScreenTotals;
}

export function Level1Screen({ level, onSublevelChange, onNavigate, totals }: Level1ScreenProps) {
  const [tab, setTab] = useState<"insumos" | "manoObra" | "equipamiento">("insumos");

  const insumosSub = level.sublevels.find(s => s.id === "insumosDirectos");
  const laborSub   = level.sublevels.find(s => s.id === "manoDeObraDirecta");
  const equipSub   = level.sublevels.find(s => s.id === "equipamientoEspecifico");

  if (!insumosSub || insumosSub.type !== "insumos") return null;
  if (!laborSub   || laborSub.type   !== "manoObra") return null;
  if (!equipSub   || equipSub.type   !== "equipamiento") return null;

  const tabs = [
    { id: "insumos",       label: "Insumos Directos", count: insumosSub.items.length },
    { id: "manoObra",      label: "Mano de Obra",     count: laborSub.items.filter(m => m.quantity > 0).length },
    { id: "equipamiento",  label: "Equipamiento",     count: equipSub.items.length },
  ];

  return (
    <div className="screen-enter flex flex-col">
      <div className="px-5 pt-4 pb-0 bg-white border-b border-inta-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] font-bold text-inta-blue uppercase tracking-[0.5px] mb-0.5">Nivel 1</div>
            <div className="font-bold text-lg text-inta-gray-800 leading-tight">Costos Directos Unitarios</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-inta-gray-400">Subtotal</div>
            <div className={`font-bold text-xl ${totals.nivel1 > 0 ? "text-inta-green" : "text-inta-gray-300"}`}>
              {fmtARS(totals.nivel1)}
            </div>
          </div>
        </div>
        <p className="text-xs text-inta-gray-500 mb-3 leading-relaxed">
          Costos específicos que se consumen en cada determinación: insumos directos, mano de obra especializada y equipamiento asociado.
        </p>
        <Tabs tabs={tabs} active={tab} onChange={id => setTab(id as typeof tab)} />
      </div>

      <Card className="mx-4 my-4">
        {tab === "insumos" && (
          <InsumosTab
            items={insumosSub.items}
            onChange={items => onSublevelChange({ ...insumosSub, items })}
            subtotal={totals.n1insumos}
          />
        )}
        {tab === "manoObra" && (
          <ManoObraTab
            items={laborSub.items}
            onChange={items => onSublevelChange({ ...laborSub, items })}
            subtotal={totals.n1labor}
          />
        )}
        {tab === "equipamiento" && (
          <EquipamientoTab
            items={equipSub.items}
            onChange={items => onSublevelChange({ ...equipSub, items })}
            subtotal={totals.n1equip}
          />
        )}
      </Card>

      {totals.nivel1 > 0 && (
        <div className="mx-4 px-4 py-3.5 rounded-xl bg-gradient-to-r from-inta-blue to-[#0070BE] text-white flex justify-between items-center">
          <div>
            <div className="text-[11px] opacity-75">Subtotal Nivel 1</div>
            <div className="font-bold text-xl">{fmtARS(totals.nivel1)}</div>
          </div>
          <div className="text-xs opacity-80 text-right leading-relaxed">
            Insumos: {fmtARS(totals.n1insumos)}<br />
            M. de obra: {fmtARS(totals.n1labor)}<br />
            Equip.: {fmtARS(totals.n1equip)}
          </div>
        </div>
      )}

      <NavFooter
        onBack={() => onNavigate("dashboard")}
        onNext={() => onNavigate("nivel2")}
        nextLabel="Nivel 2 →"
      />
    </div>
  );
}
