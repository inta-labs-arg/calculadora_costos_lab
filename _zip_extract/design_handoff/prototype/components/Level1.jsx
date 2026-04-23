// ── LEVEL 1: COSTOS DIRECTOS ──────────────────────────────────────────────────

const UNIT_OPTIONS = [
  { value: 'g', label: 'g (gramos)' }, { value: 'mg', label: 'mg (miligramos)' },
  { value: 'kg', label: 'kg (kilogramos)' }, { value: 'mL', label: 'mL (mililitros)' },
  { value: 'L', label: 'L (litros)' }, { value: 'unidad', label: 'unidad' },
];

function InsumosTab({ sublevel, onChange, totals }) {
  const [form, setForm] = React.useState({
    item: '', presentationFormat: '', unitOfMeasure: 'mL',
    presentationQuantity: '', presentationPrice: '',
    determinationQuantity: '',
  });
  const [err, setErr] = React.useState('');

  const unitPrice = (form.presentationQuantity > 0 && form.presentationPrice > 0)
    ? r2(parseFloat(form.presentationPrice) / parseFloat(form.presentationQuantity)) : null;
  const costoParcial = unitPrice !== null && form.determinationQuantity > 0
    ? r2(unitPrice * parseFloat(form.determinationQuantity)) : null;

  const handleAdd = () => {
    setErr('');
    if (!form.item.trim()) return setErr('Ingresá el nombre del insumo');
    if (!form.presentationPrice || parseFloat(form.presentationPrice) <= 0) return setErr('Ingresá el precio de presentación');
    if (!form.presentationQuantity || parseFloat(form.presentationQuantity) <= 0) return setErr('Ingresá la cantidad de presentación');
    if (!form.determinationQuantity || parseFloat(form.determinationQuantity) < 0) return setErr('Ingresá la cantidad por determinación');
    const newItem = {
      id: Date.now() + '-' + Math.random().toString(16).slice(2),
      item: form.item.trim(),
      presentationFormat: form.presentationFormat.trim(),
      unitOfMeasure: form.unitOfMeasure,
      presentationQuantity: parseFloat(form.presentationQuantity),
      presentationPrice: parseFloat(form.presentationPrice),
      determinationQuantity: parseFloat(form.determinationQuantity),
    };
    onChange({ ...sublevel, items: [...sublevel.items, newItem] });
    setForm({ item: '', presentationFormat: '', unitOfMeasure: 'mL', presentationQuantity: '', presentationPrice: '', determinationQuantity: '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Items list */}
      {sublevel.items.length === 0 ? (
        <EmptyState icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
          title="Sin insumos cargados" subtitle="Completá el formulario para agregar reactivos, materiales o consumibles." />
      ) : (
        <div>
          {sublevel.items.map((item, i) => {
            const up = item.presentationQuantity > 0 ? r2(item.presentationPrice / item.presentationQuantity) : 0;
            const cost = r2(up * item.determinationQuantity);
            return (
              <ItemRow key={item.id} style={{ background: i % 2 === 0 ? 'white' : 'var(--gray-50)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.item}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                    {item.presentationFormat || '—'} · {fmtNum(item.determinationQuantity)} {item.unitOfMeasure}/det
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--green)' }}>{fmtARS(cost)}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{fmtARS(up)}/{item.unitOfMeasure}</div>
                </div>
                <button onClick={() => onChange({ ...sublevel, items: sublevel.items.filter(x => x.id !== item.id) })}
                  style={{ color: 'var(--gray-300)', fontSize: 18, lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}
                  title="Eliminar">×</button>
              </ItemRow>
            );
          })}
          <div style={{ padding: '10px 20px', background: 'var(--blue-light)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>Subtotal insumos</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{fmtARS(totals.n1insumos)}</span>
          </div>
        </div>
      )}

      {/* Add form */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>+ Agregar insumo</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <InputField label="Nombre del insumo" placeholder="Ej.: Agar Plate Count" value={form.item} onChange={e => setForm(p => ({ ...p, item: e.target.value }))} />
            </div>
            <InputField label="Formato de presentación" placeholder="Frasco, kit, pote..." value={form.presentationFormat} onChange={e => setForm(p => ({ ...p, presentationFormat: e.target.value }))} />
            <SelectField label="Unidad" value={form.unitOfMeasure} onChange={e => setForm(p => ({ ...p, unitOfMeasure: e.target.value }))} options={UNIT_OPTIONS} />
            <InputField label="Cant. presentación" type="number" min="0" step="0.001" value={form.presentationQuantity} onChange={e => setForm(p => ({ ...p, presentationQuantity: e.target.value }))} placeholder="Ej.: 500" />
            <InputField label="Precio presentación" type="number" min="0" step="0.01" value={form.presentationPrice} onChange={e => setForm(p => ({ ...p, presentationPrice: e.target.value }))} placeholder="ARS" suffix="$" />
            <InputField label="Cant. por determinación" type="number" min="0" step="0.0001" value={form.determinationQuantity} onChange={e => setForm(p => ({ ...p, determinationQuantity: e.target.value }))} placeholder="0" hint={`En ${form.unitOfMeasure}`} />
          </div>
          {/* Live preview */}
          {costoParcial !== null && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--green-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--green)' }}>Costo por determinación</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>{fmtARS(costoParcial)}</span>
            </div>
          )}
          {err && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-light)', borderRadius: 6 }}>{err}</div>}
          <Btn onClick={handleAdd} disabled={!costoParcial}>Agregar insumo</Btn>
        </div>
      </div>
    </div>
  );
}

function ManoObraTab({ sublevel, onChange, totals }) {
  const updateItem = (id, field, val) => {
    const num = parseFloat(val) || 0;
    onChange({ ...sublevel, items: sublevel.items.map(item => item.id === id ? { ...item, [field]: num } : item) });
  };
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--blue-light)', fontSize: 12, color: 'var(--blue)', lineHeight: 1.5 }}>
        <strong>Referencia:</strong> Valor hora = Salario mensual ÷ {MONTHLY_HOURS} h/mes (22 días × 8 h). Para contratados, ingresá el monto mensual neto.
      </div>
      {sublevel.items.map(item => {
        const hourly = item.monthlySalary > 0 ? r2(item.monthlySalary / MONTHLY_HOURS) : 0;
        const cost = calcLaborCost([item]);
        const active = item.quantity > 0;
        return (
          <Card key={item.id} style={{ border: active ? '1px solid var(--blue-mid)' : '1px solid var(--gray-200)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: active ? 'var(--blue)' : 'var(--gray-500)' }}>{item.label}</span>
              {cost > 0 && <Tag color="var(--green)">{fmtARS(cost)}</Tag>}
            </div>
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <InputField label="Cantidad" type="number" min="0" step="1" value={item.quantity || ''} placeholder="0"
                onChange={e => updateItem(item.id, 'quantity', e.target.value)} hint="Personas" />
              <InputField label="Horas/det." type="number" min="0" step="0.25" value={item.totalHours || ''} placeholder="0.0"
                onChange={e => updateItem(item.id, 'totalHours', e.target.value)} hint="Por determinación" />
              <InputField label="Salario mensual" type="number" min="0" step="100" value={item.monthlySalary || ''} placeholder="0"
                onChange={e => updateItem(item.id, 'monthlySalary', e.target.value)} suffix="$" />
            </div>
            {hourly > 0 && (
              <div style={{ padding: '8px 16px 12px', fontSize: 12, color: 'var(--gray-400)' }}>
                Valor hora: <strong style={{ color: 'var(--gray-600)' }}>{fmtARS(hourly)}/h</strong>
              </div>
            )}
          </Card>
        );
      })}
      {totals.n1labor > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--green-light)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Subtotal mano de obra</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{fmtARS(totals.n1labor)}</span>
        </div>
      )}
    </div>
  );
}

function EquipamientoTab({ sublevel, onChange, totals }) {
  const [form, setForm] = React.useState({ descripcion: '', costoAdquisicion: '', valorResidual: '', vidaUtilAnios: '' });
  const [err, setErr] = React.useState('');
  const depAnual = (form.costoAdquisicion > 0 && form.vidaUtilAnios > 0)
    ? r2((parseFloat(form.costoAdquisicion) - (parseFloat(form.valorResidual) || 0)) / parseFloat(form.vidaUtilAnios)) : null;
  const depMensual = depAnual ? r2(depAnual / 12) : null;

  const handleAdd = () => {
    setErr('');
    if (!form.descripcion.trim()) return setErr('Ingresá la descripción del equipo');
    if (!form.costoAdquisicion || parseFloat(form.costoAdquisicion) <= 0) return setErr('Ingresá el costo de adquisición');
    if (!form.vidaUtilAnios || parseFloat(form.vidaUtilAnios) <= 0) return setErr('Ingresá la vida útil en años');
    onChange({ ...sublevel, items: [...sublevel.items, {
      id: Date.now() + '-' + Math.random().toString(16).slice(2),
      descripcion: form.descripcion.trim(),
      costoAdquisicion: parseFloat(form.costoAdquisicion),
      valorResidual: parseFloat(form.valorResidual) || 0,
      vidaUtilAnios: parseFloat(form.vidaUtilAnios),
    }] });
    setForm({ descripcion: '', costoAdquisicion: '', valorResidual: '', vidaUtilAnios: '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {sublevel.items.length === 0 ? (
        <EmptyState icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
          title="Sin equipos cargados" subtitle="Registrá los equipos específicos y su depreciación lineal." />
      ) : (
        <div>
          {sublevel.items.map((item, i) => {
            const dep = item.vidaUtilAnios > 0 ? r2((item.costoAdquisicion - item.valorResidual) / item.vidaUtilAnios / 12) : 0;
            return (
              <ItemRow key={item.id} style={{ background: i % 2 === 0 ? 'white' : 'var(--gray-50)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{item.descripcion}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{item.vidaUtilAnios} años · VR: {fmtARS(item.valorResidual)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--green)' }}>{fmtARS(dep)}/mes</div>
                </div>
                <button onClick={() => onChange({ ...sublevel, items: sublevel.items.filter(x => x.id !== item.id) })}
                  style={{ color: 'var(--gray-300)', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>×</button>
              </ItemRow>
            );
          })}
          <div style={{ padding: '10px 20px', background: 'var(--blue-light)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>Subtotal equipamiento</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{fmtARS(totals.n1equip)}</span>
          </div>
        </div>
      )}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 14 }}>+ Agregar equipo</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InputField label="Descripción del equipo" placeholder="Ej.: Autoclave 50L" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="Costo adquisición" type="number" min="0" step="1000" value={form.costoAdquisicion} onChange={e => setForm(p => ({ ...p, costoAdquisicion: e.target.value }))} suffix="$" />
            <InputField label="Valor residual" type="number" min="0" step="1000" value={form.valorResidual} onChange={e => setForm(p => ({ ...p, valorResidual: e.target.value }))} suffix="$" hint="Opcional" />
            <InputField label="Vida útil" type="number" min="1" step="1" value={form.vidaUtilAnios} onChange={e => setForm(p => ({ ...p, vidaUtilAnios: e.target.value }))} suffix="años" />
          </div>
          {depMensual !== null && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--green-light)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--green)' }}>Depreciación mensual</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>{fmtARS(depMensual)}</span>
            </div>
          )}
          {err && <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-light)', borderRadius: 6 }}>{err}</div>}
          <Btn onClick={handleAdd} disabled={!depMensual}>Agregar equipo</Btn>
        </div>
      </div>
    </div>
  );
}

function Level1Screen({ state, dispatch, totals }) {
  const [tab, setTab] = React.useState('insumos');
  const nivel1 = state.nivel1;
  const tabs = [
    { id: 'insumos', label: 'Insumos Directos', count: nivel1.insumos.length },
    { id: 'manoObra', label: 'Mano de Obra', count: nivel1.manoObra.filter(m => m.quantity > 0).length },
    { id: 'equipamiento', label: 'Equipamiento', count: nivel1.equipamiento.length },
  ];

  const updateSublevel = (sublevel) => dispatch({ type: 'SET_N1_SUBLEVEL', payload: sublevel });

  const insumosSub = { id: 'insumosDirectos', type: 'insumos', items: nivel1.insumos };
  const laborSub = { id: 'manoDeObraDirecta', type: 'manoObra', items: nivel1.manoObra };
  const equipSub = { id: 'equipamientoEspecifico', type: 'equipamiento', items: nivel1.equipamiento };

  return (
    <div className="screen-enter" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ padding: '16px 20px 0', background: 'white', borderBottom: '1px solid var(--gray-100)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Nivel 1</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--gray-800)', lineHeight: 1.2 }}>Costos Directos Unitarios</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Subtotal</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: totals.nivel1 > 0 ? 'var(--green)' : 'var(--gray-300)' }}>{fmtARS(totals.nivel1)}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12, textWrap: 'pretty', lineHeight: 1.5 }}>
          Costos específicos que se consumen en cada determinación: insumos directos, mano de obra especializada y equipamiento asociado.
        </div>
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      <Card style={{ margin: '16px', border: '1px solid var(--gray-200)' }}>
        {tab === 'insumos' && (
          <InsumosTab sublevel={insumosSub} onChange={updateSublevel} totals={totals} />
        )}
        {tab === 'manoObra' && (
          <ManoObraTab sublevel={laborSub} onChange={updateSublevel} totals={totals} />
        )}
        {tab === 'equipamiento' && (
          <EquipamientoTab sublevel={equipSub} onChange={updateSublevel} totals={totals} />
        )}
      </Card>

      {totals.nivel1 > 0 && (
        <div style={{ margin: '0 16px', padding: '14px 16px', borderRadius: 10, background: 'linear-gradient(90deg, var(--blue), #0070BE)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, opacity: .75 }}>Subtotal Nivel 1</div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{fmtARS(totals.nivel1)}</div>
          </div>
          <div style={{ fontSize: 12, opacity: .8, textAlign: 'right', lineHeight: 1.6 }}>
            Insumos: {fmtARS(totals.n1insumos)}<br/>
            M. de obra: {fmtARS(totals.n1labor)}<br/>
            Equip.: {fmtARS(totals.n1equip)}
          </div>
        </div>
      )}

      <NavFooter
        onBack={() => dispatch({ type: 'NAV', payload: 'dashboard' })}
        onNext={() => dispatch({ type: 'NAV', payload: 'nivel2' })}
        nextLabel="Nivel 2 →"
      />
    </div>
  );
}

Object.assign(window, { Level1Screen });
