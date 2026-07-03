"use client";

import { Card } from "@/components/ui/Card";
import { Btn } from "@/components/ui/Btn";
import { InputField } from "@/components/ui/InputField";
import { Tag } from "@/components/ui/Tag";
import type { Screen, ScreenTotals } from "@/app/page";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);
const fmtUSD = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

interface DashboardLevel {
  id: Screen;
  label: string;
  title: string;
  desc: string;
  total: number;
  accent: string;
  done: boolean;
  icon: React.ReactNode;
}

interface DashboardScreenProps {
  serviceName: string;
  laboratoryName: string;
  globalDeterminations: number;
  onServiceNameChange: (v: string) => void;
  onLaboratoryNameChange: (v: string) => void;
  onGlobalDeterminationsChange: (v: number) => void;
  onLoadDemo: () => void;
  onNavigate: (s: Screen) => void;
  totals: ScreenTotals;
  nivel1Done: boolean;
  nivel2Done: boolean;
  nivel3Done: boolean;
}

export function DashboardScreen({
  serviceName,
  laboratoryName,
  globalDeterminations,
  onServiceNameChange,
  onLaboratoryNameChange,
  onGlobalDeterminationsChange,
  onLoadDemo,
  onNavigate,
  totals,
  nivel1Done,
  nivel2Done,
  nivel3Done,
}: DashboardScreenProps) {
  const { state: er, manualState, updateManualState, applyManualState } = useExchangeRate();

  const levels: DashboardLevel[] = [
    {
      id: "nivel1",
      label: "Nivel 1",
      title: "Costos Directos",
      desc: "Insumos, mano de obra y equipamiento específico por determinación.",
      total: totals.nivel1,
      accent: "#00548F",
      done: nivel1Done,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      id: "nivel2",
      label: "Nivel 2",
      title: "Costos Indirectos",
      desc: "Recursos transversales prorrateados según determinaciones del laboratorio.",
      total: totals.nivel2,
      accent: "#0070BE",
      done: nivel2Done,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
    },
    {
      id: "nivel3",
      label: "Nivel 3",
      title: "Acreditación",
      desc: "Certificaciones ISO/IEC 17025, monitoreo regulatorio y ensayos interlaboratorio.",
      total: totals.nivel3,
      accent: "#F39200",
      done: nivel3Done,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="screen-enter flex flex-col">
      {/* Hero */}
      <div className="bg-gradient-to-br from-inta-blue via-[#0070BE] to-[#0088D4] px-5 py-6 text-white">
        <div className="text-[13px] opacity-75 mb-1">Bienvenido/a</div>
        <div className="text-[22px] font-bold leading-tight mb-1">
          {serviceName || "Nuevo servicio"}
        </div>
        {laboratoryName && <div className="text-[13px] opacity-75">{laboratoryName}</div>}
        <div className="flex gap-4 mt-5">
          <div>
            <div className="text-[11px] opacity-70">Costo unitario</div>
            <div className="text-[26px] font-bold tracking-tight">{fmtARS(totals.grandTotal)}</div>
          </div>
          {totals.grandTotal > 0 && er.rate > 0 && (
            <div className="pl-4 border-l border-white/25">
              <div className="text-[11px] opacity-70">En USD</div>
              <div className="text-lg font-semibold">{fmtUSD(totals.grandTotal / er.rate)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">
        {/* Datos del servicio */}
        <Card>
          <div className="px-5 py-4 border-b border-inta-gray-100">
            <div className="font-semibold text-sm text-inta-gray-700">Datos del servicio</div>
            <div className="text-xs text-inta-gray-400 mt-0.5">Esta información aparecerá en el resumen exportado.</div>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3.5">
            <InputField
              label="Nombre del servicio"
              placeholder="Ej.: Análisis microbiológico de alimentos"
              value={serviceName}
              onChange={e => onServiceNameChange(e.target.value)}
            />
            <InputField
              label="Nombre del laboratorio"
              placeholder="Ej.: Laboratorio de Calidad Agroalimentaria"
              value={laboratoryName}
              onChange={e => onLaboratoryNameChange(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Det. mensuales (DM)"
                type="number"
                min="1"
                step="1"
                value={globalDeterminations}
                onChange={e => onGlobalDeterminationsChange(parseInt(e.target.value) || 100)}
                hint="Base de prorrateo"
              />
              <div className="flex flex-col gap-1">
                <InputField
                  label="Tipo de cambio"
                  type="number"
                  min="1"
                  step="0.01"
                  value={manualState.rate}
                  onChange={e => updateManualState({ rate: parseFloat(e.target.value) || 0 })}
                  onBlur={() => applyManualState()}
                  suffix="ARS/USD"
                />
                <span className="text-[11px] text-inta-gray-400">
                  Carga manual. Consultá el dólar del día (ej.: BNA vendedor).
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Niveles de costeo */}
        <div className="text-[13px] font-semibold text-inta-gray-600 pl-1">Niveles de costeo</div>
        {levels.map(lv => (
          <button
            key={lv.id}
            onClick={() => onNavigate(lv.id)}
            className="w-full text-left group"
          >
            <Card className="transition-all duration-150 group-hover:shadow-lg group-hover:-translate-y-px">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ background: lv.accent + "22", color: lv.accent }}
                  >
                    {lv.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-[0.4px]" style={{ color: lv.accent }}>
                        {lv.label}
                      </span>
                      <Tag color={lv.done ? "green" : "gray"}>
                        {lv.done ? "Completo" : "Pendiente"}
                      </Tag>
                    </div>
                    <div className="font-semibold text-[15px] text-inta-gray-800 mb-0.5">{lv.title}</div>
                    <div className="text-xs text-inta-gray-400 leading-relaxed">{lv.desc}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-bold text-[17px] tracking-tight ${lv.total > 0 ? "text-inta-green" : "text-inta-gray-300"}`}>
                      {fmtARS(lv.total)}
                    </div>
                    <div className="text-xs text-inta-blue font-medium mt-1">Editar →</div>
                  </div>
                </div>
              </div>
            </Card>
          </button>
        ))}

        {/* Distribución de costos */}
        {totals.grandTotal > 0 && (
          <Card>
            <div className="px-5 py-3.5 border-b border-inta-gray-100">
              <div className="font-semibold text-sm text-inta-gray-700">Distribución de costos</div>
            </div>
            <div className="px-5 py-4 flex flex-col gap-2.5">
              {levels.map(lv => {
                const pct = totals.grandTotal > 0 ? (lv.total / totals.grandTotal * 100) : 0;
                return (
                  <div key={lv.id}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-inta-gray-600">{lv.title}</span>
                      <span className="text-xs font-semibold text-inta-gray-700">
                        {fmtARS(lv.total)}{" "}
                        <span className="text-inta-gray-400 font-normal">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-inta-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-[width] duration-700"
                        style={{ width: `${pct}%`, background: lv.accent }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Acciones */}
        <div className="flex gap-2.5">
          <Btn onClick={onLoadDemo} variant="outline" className="flex-1">
            Cargar datos demo
          </Btn>
          <Btn onClick={() => onNavigate("resumen")} variant="success" className="flex-1">
            Ver resumen
          </Btn>
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}
