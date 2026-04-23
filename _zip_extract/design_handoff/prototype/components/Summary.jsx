// ── SUMMARY SCREEN ────────────────────────────────────────────────────────────

function SummaryScreen({ state, dispatch, totals }) {
  const [exportStatus, setExportStatus] = React.useState(null);
  const [pricingMode, setPricingMode] = React.useState(totals.grandTotal > 0 ? 'auto' : 'manual');
  const p = state.pricing;
  const basePrice = pricingMode === 'auto' ? totals.grandTotal : (p.precioARS || totals.grandTotal);
  const afEEA = r2(basePrice * (p.percentageEEA / 100));
  const afCentro = r2(basePrice * (p.percentageCentro / 100));
  const precioNeto = r2(basePrice + afEEA + afCentro);

  const date = new Date().toLocaleDateString('es-AR');

  const levels = [
    {
      id: 'nivel1', label: 'Nivel 1 · Costos Directos', total: totals.nivel1,
      breakdown: [
        { label: 'b.1) Insumos Directos', value: totals.n1insumos },
        { label: 'b.2) Mano de Obra Directa', value: totals.n1labor },
        { label: 'b.3) Equipamiento específico', value: totals.n1equip },
      ]
    },
    {
      id: 'nivel2', label: 'Nivel 2 · Costos Indirectos', total: totals.nivel2,
      breakdown: [
        { label: 'c.1) Mat. no descartables', value: totals.n2mat },
        { label: 'c.2) Equip. menor (dep.)', value: totals.n2equip },
        { label: 'c.3.1) Mantenimiento', value: totals.n2mant },
        { label: 'c.3.2) Calibración', value: totals.n2calib },
        { label: 'c.4) Infraestructura', value: totals.n2infra },
      ]
    },
    {
      id: 'nivel3', label: 'Nivel 3 · Acreditación', total: totals.nivel3,
      breakdown: [
        { label: 'd.1) Acreditación OAA', value: totals.n3acred },
        { label: 'd.2) Monitoreo regulatorio', value: totals.n3monit },
        { label: 'd.3) Ensayos interlaboratorio', value: totals.n3inter },
      ]
    },
  ];

  const [expanded, setExpanded] = React.useState({ nivel1: true, nivel2: false, nivel3: false });

  const handleExportJSON = () => {
    setExportStatus('loading');
    try {
      const data = {
        fechaGeneracion: new Date().toISOString(),
        servicio: { nombre: state.serviceName, laboratorio: state.laboratoryName, fecha: date },
        tipoDeCambio: { tasa: state.exchangeRate, moneda: 'ARS/USD' },
        costos: {
          nivel1: { total: totals.nivel1, insumos: totals.n1insumos, manoObra: totals.n1labor, equipamiento: totals.n1equip },
          nivel2: { total: totals.nivel2 }, nivel3: { total: totals.nivel3 },
          costoUnitario: totals.grandTotal,
        },
        precioInstitucional: { base: basePrice, afectacionEEA: afEEA, afectacionCentro: afCentro, precioNeto },
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'resumen-costos-lab.json'; a.click();
      URL.revokeObjectURL(url);
      setExportStatus('done');
      setTimeout(() => setExportStatus(null), 2500);
    } catch { setExportStatus(null); }
  };

  return (
    <div className="screen-enter" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Hero result */}
      <div style={{
        background: totals.grandTotal > 0
          ? 'linear-gradient(135deg, var(--blue-dark) 0%, var(--blue) 100%)'
          : 'linear-gradient(135deg, var(--gray-600) 0%, var(--gray-500) 100%)',
        padding: '28px 20px 24px', color: 'white',
      }}>
        <div style={{ fontSize: 12, opacity: .7, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>Costo Unitario del Servicio Rutinario</div>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1 }}>{fmtARS(totals.grandTotal)}</div>
        {totals.grandTotal > 0 && state.exchangeRate > 0 && (
          <div style={{ fontSize: 15, opacity: .75, marginTop: 6 }}>≈ {fmtUSD(totals.grandTotal / state.exchangeRate)}</div>
        )}

        <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(4px)' }}>
          <div style={{ fontSize: 12, opacity: .75, marginBottom: 6 }}>
            {state.serviceName || 'Servicio sin nombre'} · {state.laboratoryName || '—'} · {date}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {levels.map(lv => {
              const pct = totals.grandTotal > 0 ? (lv.total / totals.grandTotal * 100) : 0;
              return (
                <div key={lv.id}>
                  <div style={{ fontSize: 10, opacity: .65, marginBottom: 2 }}>{lv.label.split('·')[0].trim()}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{fmtARS(lv.total)}</div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,.2)', borderRadius: 2, marginTop: 4 }}>
                    <div style={{ height: '100%', width: pct + '%', background: 'var(--green)', borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Detailed breakdown */}
        <Card>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-700)' }}>Desglose por niveles</div>
          </div>
          {levels.map(lv => (
            <div key={lv.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
              <button
                onClick={() => setExpanded(p => ({ ...p, [lv.id]: !p[lv.id] }))}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '13px 20px', textAlign: 'left',
                  background: 'white', cursor: 'pointer',
                }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-800)' }}>{lv.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: lv.total > 0 ? 'var(--green)' : 'var(--gray-300)' }}>{fmtARS(lv.total)}</span>
                  <span style={{ fontSize: 12, color: 'var(--gray-400)', transition: 'transform .2s', display: 'inline-block', transform: expanded[lv.id] ? 'rotate(180deg)' : 'none' }}>▾</span>
                </div>
              </button>
              {expanded[lv.id] && (
                <div style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--gray-100)' }}>
                  {lv.breakdown.map(br => (
                    <div key={br.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 20px 9px 32px',
                      borderBottom: '1px solid var(--gray-100)',
                    }}>
                      <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>{br.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: br.value > 0 ? 'var(--gray-700)' : 'var(--gray-300)' }}>{fmtARS(br.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--blue-light)' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--blue)' }}>Costo Unitario Total</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--blue)' }}>{fmtARS(totals.grandTotal)}</span>
          </div>
        </Card>

        {/* Institutional pricing */}
        <Card>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-700)' }}>Precio y afectación institucional</div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>Aplicá los porcentajes de afectación sobre el precio de venta.</div>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pricingMode === 'manual' && (
              <InputField label="Precio (ARS)" type="number" min="0" step="100"
                value={p.precioARS || ''}
                onChange={e => dispatch({ type: 'SET_PRICING', payload: { precioARS: parseFloat(e.target.value) || 0 } })}
                hint="Si dejás en 0, se usa el costo unitario calculado"
                suffix="$" />
            )}
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--gray-50)', fontSize: 13, color: 'var(--gray-600)' }}>
              Base de cálculo: <strong style={{ color: 'var(--gray-800)' }}>{fmtARS(basePrice)}</strong>
              <button onClick={() => setPricingMode(m => m === 'auto' ? 'manual' : 'auto')}
                style={{ marginLeft: 8, fontSize: 11, color: 'var(--blue)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none' }}>
                {pricingMode === 'auto' ? 'Ingresar precio manual' : 'Usar costo calculado'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InputField label="% Afectación EEA" type="number" min="0" max="100" step="0.5"
                value={p.percentageEEA} suffix="%"
                onChange={e => dispatch({ type: 'SET_PRICING', payload: { percentageEEA: parseFloat(e.target.value) || 0 } })} />
              <InputField label="% Afectación Centro" type="number" min="0" max="100" step="0.5"
                value={p.percentageCentro} suffix="%"
                onChange={e => dispatch({ type: 'SET_PRICING', payload: { percentageCentro: parseFloat(e.target.value) || 0 } })} />
            </div>
            <div style={{ borderTop: '1px dashed var(--gray-200)', paddingTop: 14 }}>
              {[
                { label: 'Precio base', val: basePrice, bold: false },
                { label: `Afectación EEA (${p.percentageEEA}%)`, val: afEEA, bold: false },
                { label: `Afectación Centro (${p.percentageCentro}%)`, val: afCentro, bold: false },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>{fmtARS(row.val)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-800)' }}>Precio neto</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>{fmtARS(precioNeto)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Export actions */}
        <Card>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-700)' }}>Exportar resumen</div>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Btn onClick={handleExportJSON} variant={exportStatus === 'done' ? 'success' : 'primary'}>
              {exportStatus === 'loading' ? 'Generando…' : exportStatus === 'done' ? '✓ JSON descargado' : 'Exportar JSON'}
            </Btn>
            <Btn onClick={() => window.print()} variant="outline">
              Imprimir / Guardar PDF
            </Btn>
            <div style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'center', paddingTop: 4 }}>
              Copia de pantalla disponible con Imprimir (Ctrl+P)
            </div>
          </div>
        </Card>

        <Btn onClick={() => dispatch({ type: 'NAV', payload: 'dashboard' })} variant="ghost">
          ← Volver al inicio
        </Btn>

        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

Object.assign(window, { SummaryScreen });
