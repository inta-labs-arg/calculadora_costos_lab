// ── REDUCER ───────────────────────────────────────────────────────────────────

function appReducer(state, action) {
  switch (action.type) {

    case 'NAV':
      return { ...state, screen: action.payload };

    case 'SET_SERVICE':
      return { ...state, serviceName: action.payload };

    case 'SET_LAB':
      return { ...state, laboratoryName: action.payload };

    case 'SET_GLOBAL_DET': {
      const det = Math.max(1, action.payload || 1);
      return {
        ...state,
        globalDeterminations: det,
        nivel2: {
          ...state.nivel2,
          infraestructura: state.nivel2.infraestructura.map(i => ({ ...i, determinations: det })),
          materialesNoDescartables: state.nivel2.materialesNoDescartables.map(i => ({ ...i, determinations: det })),
          mantenimientoEquipamiento: state.nivel2.mantenimientoEquipamiento.map(i => ({ ...i, determinations: det })),
          calibracionEquipamiento: state.nivel2.calibracionEquipamiento.map(i => ({ ...i, determinations: det })),
        }
      };
    }

    case 'SET_EXCHANGE':
      return { ...state, exchangeRate: action.payload };

    case 'SET_N1_SUBLEVEL': {
      const sub = action.payload;
      const n1 = state.nivel1;
      if (sub.type === 'insumos') return { ...state, nivel1: { ...n1, insumos: sub.items } };
      if (sub.type === 'manoObra') return { ...state, nivel1: { ...n1, manoObra: sub.items } };
      if (sub.type === 'equipamiento') return { ...state, nivel1: { ...n1, equipamiento: sub.items } };
      return state;
    }

    case 'ADD_N2_ITEM': {
      const { key, item } = action.payload;
      return { ...state, nivel2: { ...state.nivel2, [key]: [...(state.nivel2[key] || []), item] } };
    }

    case 'DEL_N2_ITEM': {
      const { key, id } = action.payload;
      return { ...state, nivel2: { ...state.nivel2, [key]: (state.nivel2[key] || []).filter(i => i.id !== id) } };
    }

    case 'SET_N2_ITEM': {
      const { key, item: { id, field, val } } = action.payload;
      const num = parseFloat(val);
      return {
        ...state,
        nivel2: {
          ...state.nivel2,
          [key]: (state.nivel2[key] || []).map(i =>
            i.id === id ? { ...i, [field]: (field === 'concept' ? val : (isNaN(num) || num < 0 ? i[field] : num)) } : i
          )
        }
      };
    }

    case 'ADD_N3_ITEM': {
      const { key, item } = action.payload;
      return { ...state, nivel3: { ...state.nivel3, [key]: [...(state.nivel3[key] || []), item] } };
    }

    case 'DEL_N3_ITEM': {
      const { key, id } = action.payload;
      return { ...state, nivel3: { ...state.nivel3, [key]: (state.nivel3[key] || []).filter(i => i.id !== id) } };
    }

    case 'SET_N3_ITEM': {
      const { key, item: { id, field, val } } = action.payload;
      const num = parseFloat(val);
      return {
        ...state,
        nivel3: {
          ...state.nivel3,
          [key]: (state.nivel3[key] || []).map(i =>
            i.id === id ? { ...i, [field]: (field === 'concept' ? val : (isNaN(num) || num < 0 ? i[field] : num)) } : i
          )
        }
      };
    }

    case 'SET_PRICING':
      return { ...state, pricing: { ...state.pricing, ...action.payload } };

    case 'LOAD_DEMO': {
      return {
        ...INITIAL_STATE,
        screen: 'dashboard',
        serviceName: DEMO_DATA.serviceName,
        laboratoryName: DEMO_DATA.laboratoryName,
        globalDeterminations: DEMO_DATA.globalDeterminations,
        nivel1: { ...DEMO_DATA.nivel1 },
        nivel2: { ...DEMO_DATA.nivel2 },
        nivel3: { ...DEMO_DATA.nivel3 },
        pricing: { ...DEMO_DATA.pricing },
        exchangeRate: DEMO_DATA.exchangeRate,
      };
    }

    case 'RESET':
      return { ...INITIAL_STATE };

    default:
      return state;
  }
}

// ── TWEAKS ────────────────────────────────────────────────────────────────────

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#00548F",
  "greenColor": "#7BB342",
  "compactMode": false,
  "showUSD": true
}/*EDITMODE-END*/;

function TweaksPanel({ tweaks, setTweaks, visible }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 16, zIndex: 999,
      background: 'white', borderRadius: 14, boxShadow: 'var(--shadow-lg)',
      border: '1px solid var(--gray-200)', padding: '16px 18px',
      width: 240, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-800)' }}>Tweaks</div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-600)' }}>Color primario</span>
        <input type="color" value={tweaks.accentColor}
          onChange={e => { const v = e.target.value; setTweaks(t => ({ ...t, accentColor: v })); document.documentElement.style.setProperty('--blue', v); window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { accentColor: v } }, '*'); }}
          style={{ width: 44, height: 32, border: 'none', cursor: 'pointer', borderRadius: 6 }} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-600)' }}>Color de éxito</span>
        <input type="color" value={tweaks.greenColor}
          onChange={e => { const v = e.target.value; setTweaks(t => ({ ...t, greenColor: v })); document.documentElement.style.setProperty('--green', v); window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { greenColor: v } }, '*'); }}
          style={{ width: 44, height: 32, border: 'none', cursor: 'pointer', borderRadius: 6 }} />
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={tweaks.showUSD}
          onChange={e => { const v = e.target.checked; setTweaks(t => ({ ...t, showUSD: v })); window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { showUSD: v } }, '*'); }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-600)' }}>Mostrar equivalente USD</span>
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={tweaks.compactMode}
          onChange={e => { const v = e.target.checked; setTweaks(t => ({ ...t, compactMode: v })); document.documentElement.style.setProperty('--compact', v ? '1' : '0'); window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { compactMode: v } }, '*'); }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-600)' }}>Modo compacto</span>
      </label>

      <Btn size="sm" variant="ghost" onClick={() => {
        setTweaks({ ...TWEAK_DEFAULTS });
        document.documentElement.style.setProperty('--blue', TWEAK_DEFAULTS.accentColor);
        document.documentElement.style.setProperty('--green', TWEAK_DEFAULTS.greenColor);
      }}>Restablecer</Btn>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────

function App() {
  const [state, dispatch] = React.useReducer(appReducer, INITIAL_STATE);
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);
  const [tweaksVisible, setTweaksVisible] = React.useState(false);

  // Apply initial tweaks to CSS vars
  React.useEffect(() => {
    document.documentElement.style.setProperty('--blue', tweaks.accentColor);
    document.documentElement.style.setProperty('--green', tweaks.greenColor);
  }, []);

  // Tweaks toggle from parent
  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode')   setTweaksVisible(true);
      if (e.data?.type === '__deactivate_edit_mode')  setTweaksVisible(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const totals = React.useMemo(() => calcAllTotals(state), [state]);

  const screenProps = { state, dispatch, totals };

  return (
    <React.Fragment>
      <StickyHeader state={state} totals={totals} onNav={(s) => dispatch({ type: 'NAV', payload: s })} />
      <main style={{ flex: 1, maxWidth: 640, width: '100%', margin: '0 auto' }}>
        {state.screen === 'dashboard' && <DashboardScreen {...screenProps} />}
        {state.screen === 'nivel1'    && <Level1Screen    {...screenProps} />}
        {state.screen === 'nivel2'    && <Level2Screen    {...screenProps} />}
        {state.screen === 'nivel3'    && <Level3Screen    {...screenProps} />}
        {state.screen === 'resumen'   && <SummaryScreen   {...screenProps} />}
      </main>
      <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} visible={tweaksVisible} />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
