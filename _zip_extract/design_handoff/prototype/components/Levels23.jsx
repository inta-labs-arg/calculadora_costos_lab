// ── SHARED RESOURCE SECTION (for Nivel 2 & 3) ────────────────────────────────

function SharedResourceSection({ title, desc, items, onAdd, onDelete, onUpdate, globalDet, showDet = false }) {
  const [form, setForm] = React.useState({ concept: '', monthlyCost: '', determinations: globalDet?.toString() || '' });
  const [err, setErr] = React.useState('');
  const subtotal = items.reduce((s, i) => s + (i.determinations > 0 ? i.monthlyCost / i.determinations : 0), 0);

  const unitCost = (form.monthlyCost > 0 && (showDet ? form.determinations > 0 : globalDet > 0))
    ? r2(parseFloat(form.monthlyCost) / (showDet ? parseFloat(form.determinations) : globalDet)) : null;

  const handleAdd = () => {
    setErr('');
    if (!form.concept.trim()) return setErr('Ingresá el concepto');
    if (!form.monthlyCost || parseFloat(form.monthlyCost) < 0) return setErr('Ingresá el costo mensual');
    const det = showDet ? parseFloat(form.determinations) : globalDet;
    if (!det || det <= 0) return setErr(showDet ? 'Ingresá las determinaciones' : 'Definí el DM global en el Inicio');
    const item = {
      id: Date.now() + '-' + Math.random().toString(16).slice(2),
      concept: form.concept.trim(),
      monthlyCost: parseFloat(form.monthlyCost),
      determinations: det,
    };
    onAdd(item);
    setForm({ concept: '', monthlyCost: '', determinations: globalDet?.toString() || '' });
  };

  return (
    <div>
      <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--gray-100)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-800)' }}>{title}</div>
            {desc && <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2, textWrap: 'pretty' }}>{desc}</div>}
          </div>
          {subtotal > 0 && <Tag color="var(--green)">{fmtARS(r2(subtotal))}</Tag>}
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--gray-400)' }}>Sin registros aún.</div>
      ) : (
        <div>
          {items.map((item, i) => {
            const uc = item.determinations > 0 ? r2(item.monthlyCost / item.determinations) : 0;
            return (
              <ItemRow key={item.id} style={{ background: i % 2 === 0 ? 'white' : 'var(--gray-50)' }}>
                <div style={{ flex: 1 }}>
                  {item.isFixed ? (
                    <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--gray-700)' }}>{item.concept}</span>
                  ) : (
                    <input value={item.concept}
                      onChange={e => onUpdate(item.id, 'concept', e.target.value)}
                      style={{ border: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: 'var(--gray-700)', width: '100%', outline: 'none' }} />
                  )}
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                    Mensual: {fmtARS(item.monthlyCost)} · DM: {item.determinations}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <input type="number" min="0" step="0.01" value={item.monthlyCost || ''}
                    onChange={e => onUpdate(item.id, 'monthlyCost', e.target.value)}
                    style={{
                      width: 96, textAlign: 'right', padding: '5px 8px',
                      border: '1px solid var(--gray-200)', borderRadius: 6, fontSize: 13,
                      fontWeight: 600, color: 'var(--gray-700)',
                    }} />
                  {uc > 0 && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>{fmtARS(uc)}/det</div>}
                </div>
                {!item.isFixed && (
                  <button onClick={() => onDelete(item.id)}
                    style={{ color: 'var(--gray-300)', fontSize: 18, lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}>×</button>
                )}
              </ItemRow>
            );
          })}
        </div>
      )}

      {/* add row */}
      <div style={{ padding: '12px 20px', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-100)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: showDet ? '2fr 1fr 1fr' : '2fr 1fr', gap: 8, alignItems: 'end' }}>
          <InputField label="Concepto" placeholder="Descripción..." value={form.concept} onChange={e => setForm(p => ({ ...p, concept: e.target.value }))} />
          <InputField label="Costo mensual" type="number" min="0" step="0.01" value={form.monthlyCost} onChange={e => setForm(p => ({ ...p, monthlyCost: e.target.value }))} suffix="$" />
          {showDet && (
            <InputField label="Determinaciones" type="number" min="1" step="1" value={form.determinations} onChange={e => setForm(p => ({ ...p, determinations: e.target.value }))} hint="Cantidad/mes" />
          )}
        </div>
        {unitCost !== null && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Costo unitario: {fmtARS(unitCost)}/det</div>
        )}
        {err && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{err}</div>}
        <Btn onClick={handleAdd} size="sm" style={{ marginTop: 10 }}>+ Agregar</Btn>
      </div>
    </div>
  );
}

function IndirectEquipmentSection({ title, desc, items, onAdd, onDelete, globalDet }) {
  const [form, setForm] = React.useState({ name: '', purchasePrice: '', usefulLifeMonths: '', determinations: globalDet?.toString() || '' });
  const [err, setErr] = React.useState('');
  const subtotal = items.reduce((s, i) => s + (i.usefulLifeMonths > 0 && i.determinations > 0 ? (i.purchasePrice / i.usefulLifeMonths) / i.determinations : 0), 0);

  const monthlyDep = (form.purchasePrice > 0 && form.usefulLifeMonths > 0)
    ? r2(parseFloat(form.purchasePrice) / parseFloat(form.usefulLifeMonths)) : null;
  const unitCost = monthlyDep && (parseFloat(form.determinations) || globalDet) > 0
    ? r2(monthlyDep / (parseFloat(form.determinations) || globalDet)) : null;

  const handleAdd = () => {
    setErr('');
    if (!form.name.trim()) return setErr('Ingresá el nombre del equipo');
    if (!form.purchasePrice || parseFloat(form.purchasePrice) <= 0) return setErr('Ingresá el precio de compra');
    if (!form.usefulLifeMonths || parseFloat(form.usefulLifeMonths) <= 0) return setErr('Ingresá la vida útil en meses');
    const det = parseFloat(form.determinations) || globalDet;
    if (!det || det <= 0) return setErr('Ingresá las determinaciones mensuales');
    onAdd({
      id: Date.now() + '-' + Math.random().toString(16).slice(2),
      name: form.name.trim(),
      purchasePrice: parseFloat(form.purchasePrice),
      usefulLifeMonths: parseFloat(form.usefulLifeMonths),
      determinations: det,
    });
    setForm({ name: '', purchasePrice: '', usefulLifeMonths: '', determinations: globalDet?.toString() || '' });
  };

  return (
    <div>
      <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--gray-100)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-800)' }}>{title}</div>
            {desc && <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2, textWrap: 'pretty' }}>{desc}</div>}
          </div>
          {subtotal > 0 && <Tag color="var(--green)">{fmtARS(r2(subtotal))}</Tag>}
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--gray-400)' }}>Sin equipos cargados.</div>
      ) : (
        items.map((item, i) => {
          const dep = item.usefulLifeMonths > 0 ? r2(item.purchasePrice / item.usefulLifeMonths) : 0;
          const uc = dep > 0 && item.determinations > 0 ? r2(dep / item.determinations) : 0;
          return (
            <ItemRow key={item.id} style={{ background: i % 2 === 0 ? 'white' : 'var(--gray-50)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--gray-700)' }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{item.usefulLifeMonths} meses · {fmtARS(dep)}/mes</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--green)' }}>{fmtARS(uc)}/det</div>
              </div>
              <button onClick={() => onDelete(item.id)} style={{ color: 'var(--gray-300)', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>×</button>
            </ItemRow>
          );
        })
      )}

      <div style={{ padding: '12px 20px', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-100)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, alignItems: 'end' }}>
          <InputField label="Nombre del equipo" placeholder="Balanza analítica..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <InputField label="Precio compra" type="number" min="0" step="1000" value={form.purchasePrice} onChange={e => setForm(p => ({ ...p, purchasePrice: e.target.value }))} suffix="$" />
          <InputField label="Vida útil" type="number" min="1" step="1" value={form.usefulLifeMonths} onChange={e => setForm(p => ({ ...p, usefulLifeMonths: e.target.value }))} suffix="meses" />
        </div>
        {unitCost !== null && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Costo unitario: {fmtARS(unitCost)}/det</div>
        )}
        {err && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{err}</div>}
        <Btn onClick={handleAdd} size="sm" style={{ marginTop: 10 }}>+ Agregar equipo</Btn>
      </div>
    </div>
  );
}

// ── NIVEL 2 SCREEN ────────────────────────────────────────────────────────────

function Level2Screen({ state, dispatch, totals }) {
  const [tab, setTab] = React.useState('materialesNoDescartables');
  const n2 = state.nivel2;
  const gd = state.globalDeterminations;

  const tabs = [
    { id: 'materialesNoDescartables', label: 'Mat. No Descartables', count: n2.materialesNoDescartables.length },
    { id: 'equipamientoMenor', label: 'Equip. Menor', count: n2.equipamientoMenor.length },
    { id: 'mantenimientoEquipamiento', label: 'Mantenimiento', count: n2.mantenimientoEquipamiento.length },
    { id: 'calibracionEquipamiento', label: 'Calibración', count: n2.calibracionEquipamiento.length },
    { id: 'infraestructura', label: 'Infraestructura', count: n2.infraestructura.filter(i => i.monthlyCost > 0).length },
  ];

  const upd = (key, item) => dispatch({ type: 'SET_N2_ITEM', payload: { key, item } });
  const add = (key, item) => dispatch({ type: 'ADD_N2_ITEM', payload: { key, item } });
  const del = (key, id) => dispatch({ type: 'DEL_N2_ITEM', payload: { key, id } });

  const sectionConfigs = {
    materialesNoDescartables: {
      title: 'c.1) Materiales no descartables',
      desc: 'Materiales reutilizables: jeringas de vidrio, tubos, frascos. Costo mensual de reposición prorrateado.',
    },
    mantenimientoEquipamiento: {
      title: 'c.3.1) Mantenimiento de equipos',
      desc: 'Honorarios, repuestos y servicios de mantenimiento periódico prorrateados por actividad mensual.',
    },
    calibracionEquipamiento: {
      title: 'c.3.2) Calibración de equipos',
      desc: 'Servicios de calibración interna o externa para trazabilidad metrológica.',
    },
    infraestructura: {
      title: 'c.4) Costos de Infraestructura',
      desc: 'Energía, gas, agua, limpieza, administración y comunicaciones del laboratorio.',
    },
  };

  return (
    <div className="screen-enter">
      <div style={{ padding: '16px 20px 0', background: 'white', borderBottom: '1px solid var(--gray-100)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0070BE', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Nivel 2</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--gray-800)' }}>Costos Indirectos Unitarios</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Subtotal</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: totals.nivel2 > 0 ? 'var(--green)' : 'var(--gray-300)' }}>{fmtARS(totals.nivel2)}</div>
          </div>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: 7, background: 'var(--blue-light)', fontSize: 12, color: 'var(--blue)', marginBottom: 10 }}>
          DM global: <strong>{gd} determinaciones/mes</strong> — ajustable desde Inicio
        </div>
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      <Card style={{ margin: 16 }}>
        {tab === 'equipamientoMenor' ? (
          <IndirectEquipmentSection
            title="c.2) Depreciación de equipamiento menor"
            desc="Equipos menores de uso transversal: balanzas, heladeras, campanas. Depreciación lineal prorrateada."
            items={n2.equipamientoMenor}
            onAdd={item => add('equipamientoMenor', item)}
            onDelete={id => del('equipamientoMenor', id)}
            globalDet={gd}
          />
        ) : (
          <SharedResourceSection
            title={sectionConfigs[tab]?.title || tab}
            desc={sectionConfigs[tab]?.desc}
            items={n2[tab] || []}
            globalDet={gd}
            showDet={tab === 'infraestructura' ? false : false}
            onAdd={item => add(tab, { ...item, determinations: gd })}
            onDelete={id => del(tab, id)}
            onUpdate={(id, field, val) => upd(tab, { id, field, val })}
          />
        )}
      </Card>

      <NavFooter
        onBack={() => dispatch({ type: 'NAV', payload: 'nivel1' })}
        onNext={() => dispatch({ type: 'NAV', payload: 'nivel3' })}
        nextLabel="Nivel 3 →"
      />
    </div>
  );
}

// ── NIVEL 3 SCREEN ────────────────────────────────────────────────────────────

function Level3Screen({ state, dispatch, totals }) {
  const [tab, setTab] = React.useState('acreditacionTercerasPartes');
  const n3 = state.nivel3;
  const gd = state.globalDeterminations;

  const tabs = [
    { id: 'acreditacionTercerasPartes', label: 'Acreditación OAA', count: n3.acreditacionTercerasPartes.length },
    { id: 'monitoreoRegulatorio', label: 'Monitoreo Regulatorio', count: n3.monitoreoRegulatorio.length },
    { id: 'ensayosInterlaboratorio', label: 'Ensayos Interlaboratorio', count: n3.ensayosInterlaboratorio.length },
  ];

  const sectionDescs = {
    acreditacionTercerasPartes: 'Aranceles y auditorías OAA bajo ISO/IEC 17025 para garantizar la competencia técnica del laboratorio.',
    monitoreoRegulatorio: 'Inspecciones, tasas y auditorías de SENASA y ANMAT que habilitan las determinaciones oficiales.',
    ensayosInterlaboratorio: 'Inscripciones y envíos para comparaciones de desempeño obligatorias que respaldan la calidad analítica.',
  };

  const add = (key, item) => dispatch({ type: 'ADD_N3_ITEM', payload: { key, item } });
  const del = (key, id) => dispatch({ type: 'DEL_N3_ITEM', payload: { key, id } });
  const upd = (key, item) => dispatch({ type: 'SET_N3_ITEM', payload: { key, item } });

  return (
    <div className="screen-enter">
      <div style={{ padding: '16px 20px 0', background: 'white', borderBottom: '1px solid var(--gray-100)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Nivel 3</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--gray-800)' }}>Acreditación y monitoreo</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Subtotal</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: totals.nivel3 > 0 ? 'var(--green)' : 'var(--gray-300)' }}>{fmtARS(totals.nivel3)}</div>
          </div>
        </div>
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      <Card style={{ margin: 16 }}>
        <SharedResourceSection
          title={tabs.find(t => t.id === tab)?.label}
          desc={sectionDescs[tab]}
          items={n3[tab] || []}
          globalDet={gd}
          showDet={true}
          onAdd={item => add(tab, item)}
          onDelete={id => del(tab, id)}
          onUpdate={(id, field, val) => upd(tab, { id, field, val })}
        />
      </Card>

      <NavFooter
        onBack={() => dispatch({ type: 'NAV', payload: 'nivel2' })}
        onNext={() => dispatch({ type: 'NAV', payload: 'resumen' })}
        nextLabel="Ver Resumen →"
      />
    </div>
  );
}

Object.assign(window, { Level2Screen, Level3Screen });
