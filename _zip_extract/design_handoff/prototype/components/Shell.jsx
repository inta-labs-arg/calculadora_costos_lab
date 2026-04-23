// ── SHELL: StickyHeader + StepNav + Layout ────────────────────────────────────

const STEPS = [
  { id: 'dashboard', label: 'Inicio',   short: '●' },
  { id: 'nivel1',    label: 'Directos', short: '1' },
  { id: 'nivel2',    label: 'Indirectos', short: '2' },
  { id: 'nivel3',    label: 'Acreditación', short: '3' },
  { id: 'resumen',   label: 'Resumen',  short: '✓' },
];

function StickyHeader({ state, totals, onNav }) {
  const pct = (() => {
    const filled = [
      state.nivel1.insumos.length > 0 || state.nivel1.manoObra.some(m => m.quantity > 0) || state.nivel1.equipamiento.length > 0,
      Object.values(state.nivel2).some(arr => arr.some(i => i.monthlyCost > 0 || i.purchasePrice > 0)),
      Object.values(state.nivel3).some(arr => arr.length > 0),
    ].filter(Boolean).length;
    return Math.round((filled / 3) * 100);
  })();

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'white',
      borderBottom: '1px solid var(--gray-200)',
      boxShadow: '0 2px 8px rgba(0,84,143,.08)',
    }}>
      {/* top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--blue) 0%, #0070BE 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', lineHeight: 1 }}>LAB INTA</div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', lineHeight: 1.3 }}>Calculadora de Costos</div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', lineHeight: 1 }}>Costo unitario estimado</div>
          <div style={{
            fontSize: 20, fontWeight: 700, color: totals.grandTotal > 0 ? 'var(--green)' : 'var(--gray-400)',
            lineHeight: 1.2, letterSpacing: '-0.5px',
          }}>
            {fmtARS(totals.grandTotal)}
          </div>
          {totals.grandTotal > 0 && state.exchangeRate > 0 && (
            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
              ≈ {fmtUSD(totals.grandTotal / state.exchangeRate)}
            </div>
          )}
        </div>
      </div>

      {/* progress bar */}
      <div style={{ height: 3, background: 'var(--gray-100)', position: 'relative' }}>
        <div style={{
          height: '100%', width: pct + '%',
          background: 'linear-gradient(90deg, var(--blue), var(--green))',
          transition: 'width .4s ease',
        }} />
      </div>

      {/* step nav */}
      <nav style={{
        display: 'flex', overflowX: 'auto', gap: 0,
        padding: '0 4px',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {STEPS.map((step, i) => {
          const active = state.screen === step.id;
          const done = (() => {
            if (step.id === 'nivel1') return state.nivel1.insumos.length > 0 || state.nivel1.manoObra.some(m => m.quantity > 0) || state.nivel1.equipamiento.length > 0;
            if (step.id === 'nivel2') return Object.values(state.nivel2).some(arr => arr.some(item => (item.monthlyCost || 0) > 0 || (item.purchasePrice || 0) > 0));
            if (step.id === 'nivel3') return Object.values(state.nivel3).some(arr => arr.length > 0);
            return false;
          })();
          return (
            <button key={step.id} onClick={() => onNav(step.id)} style={{
              flex: '1 0 auto', minWidth: 64,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '8px 4px 9px',
              borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
              color: active ? 'var(--blue)' : done ? 'var(--green)' : 'var(--gray-400)',
              fontWeight: active ? 600 : 400,
              fontSize: 11,
              transition: 'color .15s',
              whiteSpace: 'nowrap',
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                border: `1.5px solid ${active ? 'var(--blue)' : done ? 'var(--green)' : 'var(--gray-300)'}`,
                background: active ? 'var(--blue)' : done ? 'var(--green)' : 'white',
                color: (active || done) ? 'white' : 'var(--gray-400)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
                transition: 'all .15s',
              }}>{done && !active ? '✓' : i}</span>
              {step.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

// ── REUSABLE UI COMPONENTS ────────────────────────────────────────────────────

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-200)',
      overflow: 'hidden', ...style
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, total, accent = 'var(--blue)', icon }) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          {icon && (
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: accent + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
            }}>
              {icon}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--gray-800)', lineHeight: 1.3 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2, textWrap: 'pretty' }}>{subtitle}</div>}
          </div>
        </div>
        {total !== undefined && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Subtotal</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: total > 0 ? 'var(--green)' : 'var(--gray-400)' }}>{fmtARS(total)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', overflowX: 'auto', gap: 0,
      borderBottom: '1px solid var(--gray-200)',
      background: 'var(--gray-50)',
      scrollbarWidth: 'none',
    }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{
          flex: '0 0 auto', padding: '10px 16px',
          fontSize: 13, fontWeight: active === tab.id ? 600 : 400,
          color: active === tab.id ? 'var(--blue)' : 'var(--gray-500)',
          borderBottom: `2px solid ${active === tab.id ? 'var(--blue)' : 'transparent'}`,
          whiteSpace: 'nowrap',
          transition: 'all .15s',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {tab.label}
          {tab.count > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 20,
              background: active === tab.id ? 'var(--blue)' : 'var(--gray-200)',
              color: active === tab.id ? 'white' : 'var(--gray-600)',
            }}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', disabled, style: s = {}, size = 'md' }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 'var(--radius)', fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all .15s', opacity: disabled ? 0.5 : 1,
    padding: size === 'sm' ? '8px 14px' : '12px 20px',
    fontSize: size === 'sm' ? 13 : 14,
    border: '1px solid transparent',
  };
  const variants = {
    primary:  { background: 'var(--blue)',  color: 'white', borderColor: 'var(--blue)' },
    outline:  { background: 'white',        color: 'var(--blue)', borderColor: 'var(--blue-mid)' },
    ghost:    { background: 'transparent',  color: 'var(--gray-600)', borderColor: 'transparent' },
    danger:   { background: 'var(--red-light)', color: 'var(--red)', borderColor: 'var(--red-light)' },
    success:  { background: 'var(--green-light)', color: 'var(--green)', borderColor: 'var(--green-light)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...s }}>
      {children}
    </button>
  );
}

function InputField({ label, hint, error, type = 'text', value, onChange, placeholder, min, step, disabled, suffix }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-700)' }}>{label}</span>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          min={min} step={step} disabled={disabled}
          style={{
            width: '100%', minHeight: 44, padding: '10px 12px',
            paddingRight: suffix ? 48 : 12,
            border: `1px solid ${error ? 'var(--red)' : 'var(--gray-300)'}`,
            borderRadius: 'var(--radius-sm)', fontSize: 14,
            background: disabled ? 'var(--gray-50)' : 'white',
            color: 'var(--gray-800)',
            outline: 'none',
            transition: 'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--blue)'}
          onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : 'var(--gray-300)'}
        />
        {suffix && (
          <span style={{
            position: 'absolute', right: 10,
            fontSize: 12, fontWeight: 500, color: 'var(--gray-400)',
            pointerEvents: 'none',
          }}>{suffix}</span>
        )}
      </div>
      {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
      {!error && hint && <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{hint}</span>}
    </label>
  );
}

function SelectField({ label, hint, value, onChange, options }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-700)' }}>{label}</span>
      <select value={value} onChange={onChange} style={{
        minHeight: 44, padding: '10px 12px',
        border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)',
        fontSize: 14, color: 'var(--gray-800)', background: 'white',
        appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23868E96' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
        paddingRight: 32,
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{hint}</span>}
    </label>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{
      padding: '32px 20px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'var(--gray-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
      }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-700)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--gray-400)', maxWidth: 240 }}>{subtitle}</div>}
    </div>
  );
}

function ItemRow({ children, style = {} }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 20px',
      borderBottom: '1px solid var(--gray-100)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Tag({ children, color = 'var(--blue)' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      background: color + '18', color,
      fontSize: 11, fontWeight: 600,
    }}>{children}</span>
  );
}

function NavFooter({ onBack, onNext, backLabel = '← Anterior', nextLabel = 'Siguiente →', nextDisabled }) {
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '16px 16px 24px',
      justifyContent: 'space-between',
    }}>
      {onBack ? <Btn onClick={onBack} variant="outline">{backLabel}</Btn> : <div />}
      {onNext && <Btn onClick={onNext} disabled={nextDisabled}>{nextLabel}</Btn>}
    </div>
  );
}

Object.assign(window, { StickyHeader, Card, CardHeader, Tabs, Btn, InputField, SelectField, EmptyState, ItemRow, Tag, NavFooter, STEPS });
