// ── DASHBOARD SCREEN ─────────────────────────────────────────────────────────

function DashboardScreen({ state, dispatch, totals }) {
  const levels = [
    {
      id: 'nivel1', label: 'Nivel 1', title: 'Costos Directos', screen: 'nivel1',
      desc: 'Insumos, mano de obra y equipamiento específico por determinación.',
      total: totals.nivel1, accent: 'var(--blue)',
      done: state.nivel1.insumos.length > 0 || state.nivel1.manoObra.some(m => m.quantity > 0) || state.nivel1.equipamiento.length > 0,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      id: 'nivel2', label: 'Nivel 2', title: 'Costos Indirectos', screen: 'nivel2',
      desc: 'Recursos transversales prorrateados según determinaciones del laboratorio.',
      total: totals.nivel2, accent: '#0070BE',
      done: Object.values(state.nivel2).some(arr => arr.some(i => (i.monthlyCost||0) > 0 || (i.purchasePrice||0) > 0)),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
    },
    {
      id: 'nivel3', label: 'Nivel 3', title: 'Acreditación', screen: 'nivel3',
      desc: 'Certificaciones ISO/IEC 17025, monitoreo regulatorio y ensayos interlaboratorio.',
      total: totals.nivel3, accent: 'var(--orange)',
      done: Object.values(state.nivel3).some(arr => arr.length > 0),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="screen-enter" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Hero welcome */}
      <div style={{
        background: 'linear-gradient(135deg, var(--blue) 0%, #0070BE 60%, #0088D4 100%)',
        padding: '24px 20px 28px', color: 'white',
      }}>
        <div style={{ fontSize: 13, opacity: .75, marginBottom: 4 }}>Bienvenido/a</div>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>
          {state.serviceName || 'Nuevo servicio'}
        </div>
        {state.laboratoryName && (
          <div style={{ fontSize: 13, opacity: .75 }}>{state.laboratoryName}</div>
        )}
        <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
          <div>
            <div style={{ fontSize: 11, opacity: .7 }}>Costo unitario</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>
              {fmtARS(totals.grandTotal)}
            </div>
          </div>
          {totals.grandTotal > 0 && (
            <div style={{ paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,.25)' }}>
              <div style={{ fontSize: 11, opacity: .7 }}>En USD</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{fmtUSD(totals.grandTotal / state.exchangeRate)}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Service info */}
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-700)', marginBottom: 2 }}>Datos del servicio</div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>Esta información aparecerá en el resumen exportado.</div>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <InputField
              label="Nombre del servicio"
              placeholder="Ej.: Análisis microbiológico de alimentos"
              value={state.serviceName}
              onChange={e => dispatch({ type: 'SET_SERVICE', payload: e.target.value })}
            />
            <InputField
              label="Nombre del laboratorio"
              placeholder="Ej.: Laboratorio de Calidad Agroalimentaria"
              value={state.laboratoryName}
              onChange={e => dispatch({ type: 'SET_LAB', payload: e.target.value })}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InputField
                label="Det. mensuales (DM)"
                type="number" min="1" step="1"
                value={state.globalDeterminations}
                onChange={e => dispatch({ type: 'SET_GLOBAL_DET', payload: parseInt(e.target.value) || 100 })}
                hint="Base de prorrateo"
              />
              <InputField
                label="Tipo de cambio"
                type="number" min="1" step="0.01"
                value={state.exchangeRate}
                onChange={e => dispatch({ type: 'SET_EXCHANGE', payload: parseFloat(e.target.value) || 1265 })}
                suffix="ARS/USD"
              />
            </div>
          </div>
        </Card>

        {/* Nivel cards */}
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', paddingLeft: 4 }}>
          Niveles de costeo
        </div>
        {levels.map(lv => (
          <button key={lv.id} onClick={() => dispatch({ type: 'NAV', payload: lv.screen })}
            style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
            <Card style={{ transition: 'box-shadow .15s, transform .15s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: lv.accent + '15', color: lv.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{lv.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: lv.accent, letterSpacing: '.4px', textTransform: 'uppercase' }}>{lv.label}</span>
                      {lv.done ? (
                        <Tag color="var(--green)">Completo</Tag>
                      ) : (
                        <Tag color="var(--gray-400)">Pendiente</Tag>
                      )}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--gray-800)', marginBottom: 3 }}>{lv.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', textWrap: 'pretty' }}>{lv.desc}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 17, color: lv.total > 0 ? 'var(--green)' : 'var(--gray-300)', letterSpacing: '-0.3px' }}>
                      {fmtARS(lv.total)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--blue)', marginTop: 4, fontWeight: 500 }}>Editar →</div>
                  </div>
                </div>
              </div>
            </Card>
          </button>
        ))}

        {/* Cost breakdown mini */}
        {totals.grandTotal > 0 && (
          <Card>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)' }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-700)' }}>Distribución de costos</div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {levels.map(lv => {
                const pct = totals.grandTotal > 0 ? (lv.total / totals.grandTotal * 100) : 0;
                return (
                  <div key={lv.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>{lv.title}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-700)' }}>
                        {fmtARS(lv.total)} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--gray-100)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: pct + '%', background: lv.accent, borderRadius: 3, transition: 'width .6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={() => dispatch({ type: 'LOAD_DEMO' })} variant="outline" style={{ flex: 1 }}>
            Cargar datos demo
          </Btn>
          <Btn onClick={() => dispatch({ type: 'NAV', payload: 'resumen' })} variant="success" style={{ flex: 1 }}>
            Ver resumen
          </Btn>
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}

Object.assign(window, { DashboardScreen });
