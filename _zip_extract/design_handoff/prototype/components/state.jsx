// ── SHARED STATE & UTILITIES ──────────────────────────────────────────────────

const DEMO_DATA = {
  serviceName: 'Análisis microbiológico de alimentos',
  laboratoryName: 'Laboratorio de Calidad Agroalimentaria – INTA Castelar',
  globalDeterminations: 120,
  nivel1: {
    insumos: [
      { id: 'i1', item: 'Agar Plate Count', presentationFormat: 'Frasco 500g', presentationQuantity: 500, unitOfMeasure: 'g', presentationPrice: 18500, determinationQuantity: 2.5 },
      { id: 'i2', item: 'Agua destilada estéril', presentationFormat: 'Botella 1L', presentationQuantity: 1000, unitOfMeasure: 'mL', presentationPrice: 3200, determinationQuantity: 50 },
      { id: 'i3', item: 'Tubos Falcon 50mL', presentationFormat: 'Pack 50 u', presentationQuantity: 50, unitOfMeasure: 'unidad', presentationPrice: 7800, determinationQuantity: 3 },
    ],
    manoObra: [
      { id: 'mo1', role: 'professional', label: 'Profesionales', quantity: 1, totalHours: 1.5, monthlySalary: 850000 },
      { id: 'mo2', role: 'technician', label: 'Técnicos', quantity: 1, totalHours: 2.0, monthlySalary: 620000 },
      { id: 'mo3', role: 'support', label: 'Apoyo', quantity: 0, totalHours: 0, monthlySalary: 0 },
    ],
    equipamiento: [
      { id: 'eq1', descripcion: 'Autoclave 50L', costoAdquisicion: 1800000, valorResidual: 180000, vidaUtilAnios: 10 },
      { id: 'eq2', descripcion: 'Incubadora bacteriológica', costoAdquisicion: 950000, valorResidual: 95000, vidaUtilAnios: 8 },
    ]
  },
  nivel2: {
    materialesNoDescartables: [
      { id: 'mn1', concept: 'Jeringas de vidrio 10mL', monthlyCost: 4500, determinations: 120 },
      { id: 'mn2', concept: 'Pinzas y espátulas', monthlyCost: 2200, determinations: 120 },
    ],
    equipamientoMenor: [
      { id: 'em1', name: 'Balanza analítica', purchasePrice: 420000, usefulLifeMonths: 120, determinations: 120 },
      { id: 'em2', name: 'Vortex mixer', purchasePrice: 85000, usefulLifeMonths: 84, determinations: 120 },
    ],
    mantenimientoEquipamiento: [
      { id: 'mt1', concept: 'Mantenimiento autoclave', monthlyCost: 12000, determinations: 120 },
    ],
    calibracionEquipamiento: [
      { id: 'cal1', concept: 'Calibración balanza analítica', monthlyCost: 8500, determinations: 120 },
    ],
    infraestructura: [
      { id: 'energia', concept: 'Energía', monthlyCost: 45000, determinations: 120, isFixed: true },
      { id: 'gas', concept: 'Gas', monthlyCost: 12000, determinations: 120, isFixed: true },
      { id: 'agua', concept: 'Agua', monthlyCost: 8000, determinations: 120, isFixed: true },
      { id: 'limpieza', concept: 'Limpieza', monthlyCost: 18000, determinations: 120, isFixed: true },
      { id: 'administracion', concept: 'Administración', monthlyCost: 22000, determinations: 120, isFixed: true },
      { id: 'comunicaciones', concept: 'Comunicaciones', monthlyCost: 5500, determinations: 120, isFixed: true },
    ],
  },
  nivel3: {
    acreditacionTercerasPartes: [
      { id: 'ac1', concept: 'Arancel OAA – ISO/IEC 17025', monthlyCost: 25000, determinations: 120 },
    ],
    monitoreoRegulatorio: [
      { id: 'mr1', concept: 'Tasa habilitación SENASA', monthlyCost: 8333, determinations: 120 },
    ],
    ensayosInterlaboratorio: [
      { id: 'el1', concept: 'Ensayo ENAC – Microbiología', monthlyCost: 6250, determinations: 120 },
    ],
  },
  pricing: { precioARS: 0, percentageEEA: 10, percentageCentro: 5 },
  exchangeRate: 1265,
};

// ── CALCULATIONS ─────────────────────────────────────────────────────────────

const MONTHLY_HOURS = 22 * 8; // 176 h/mes

function calcInsumosCost(items) {
  return items.reduce((sum, item) => {
    if (item.presentationQuantity <= 0) return sum;
    const unitPrice = item.presentationPrice / item.presentationQuantity;
    return sum + unitPrice * item.determinationQuantity;
  }, 0);
}

function calcLaborCost(items) {
  return items.reduce((sum, item) => {
    if (item.quantity <= 0 || item.totalHours <= 0 || item.monthlySalary <= 0) return sum;
    const hourlyValue = item.monthlySalary / MONTHLY_HOURS;
    return sum + r2(hourlyValue * item.totalHours * item.quantity);
  }, 0);
}

function calcEquipmentCost(items) {
  return items.reduce((sum, item) => {
    if (item.vidaUtilAnios <= 0) return sum;
    const dep = (item.costoAdquisicion - item.valorResidual) / item.vidaUtilAnios;
    return sum + r2(dep / 12);
  }, 0);
}

function calcSharedResource(items) {
  return items.reduce((sum, item) => {
    if (item.determinations <= 0) return sum;
    return sum + item.monthlyCost / item.determinations;
  }, 0);
}

function calcIndirectEquipment(items) {
  return items.reduce((sum, item) => {
    if (item.usefulLifeMonths <= 0 || item.determinations <= 0) return sum;
    return sum + (item.purchasePrice / item.usefulLifeMonths) / item.determinations;
  }, 0);
}

function r2(n) { return Math.round(n * 100) / 100; }

function calcAllTotals(state) {
  const n1insumos  = r2(calcInsumosCost(state.nivel1.insumos));
  const n1labor    = r2(calcLaborCost(state.nivel1.manoObra));
  const n1equip    = r2(calcEquipmentCost(state.nivel1.equipamiento));
  const nivel1     = r2(n1insumos + n1labor + n1equip);

  const n2mat      = r2(calcSharedResource(state.nivel2.materialesNoDescartables));
  const n2equip    = r2(calcIndirectEquipment(state.nivel2.equipamientoMenor));
  const n2mant     = r2(calcSharedResource(state.nivel2.mantenimientoEquipamiento));
  const n2calib    = r2(calcSharedResource(state.nivel2.calibracionEquipamiento));
  const n2infra    = r2(calcSharedResource(state.nivel2.infraestructura));
  const nivel2     = r2(n2mat + n2equip + n2mant + n2calib + n2infra);

  const n3acred    = r2(calcSharedResource(state.nivel3.acreditacionTercerasPartes));
  const n3monit    = r2(calcSharedResource(state.nivel3.monitoreoRegulatorio));
  const n3inter    = r2(calcSharedResource(state.nivel3.ensayosInterlaboratorio));
  const nivel3     = r2(n3acred + n3monit + n3inter);

  const grandTotal = r2(nivel1 + nivel2 + nivel3);

  const p = state.pricing;
  const basePrice = p.precioARS > 0 ? p.precioARS : grandTotal;
  const afEEA = r2(basePrice * (p.percentageEEA / 100));
  const afCentro = r2(basePrice * (p.percentageCentro / 100));
  const precioNeto = r2(basePrice + afEEA + afCentro);

  return {
    nivel1, n1insumos, n1labor, n1equip,
    nivel2, n2mat, n2equip, n2mant, n2calib, n2infra,
    nivel3, n3acred, n3monit, n3inter,
    grandTotal,
    basePrice, afEEA, afCentro, precioNeto,
  };
}

// ── FORMATTERS ───────────────────────────────────────────────────────────────

const fmtARS = (n) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 2
}).format(n);

const fmtUSD = (n) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2
}).format(n);

const fmtNum = (n, dec = 4) => new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: dec, minimumFractionDigits: dec
}).format(n);

// ── INITIAL STATE ─────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  screen: 'dashboard',
  serviceName: '',
  laboratoryName: '',
  globalDeterminations: 100,
  nivel1: { insumos: [], manoObra: [
    { id: 'mo1', role: 'professional', label: 'Profesionales', quantity: 0, totalHours: 0, monthlySalary: 0 },
    { id: 'mo2', role: 'technician',   label: 'Técnicos',      quantity: 0, totalHours: 0, monthlySalary: 0 },
    { id: 'mo3', role: 'support',      label: 'Apoyo',         quantity: 0, totalHours: 0, monthlySalary: 0 },
  ], equipamiento: [] },
  nivel2: {
    materialesNoDescartables: [],
    equipamientoMenor: [],
    mantenimientoEquipamiento: [],
    calibracionEquipamiento: [],
    infraestructura: [
      { id: 'energia',        concept: 'Energía',         monthlyCost: 0, determinations: 100, isFixed: true },
      { id: 'gas',            concept: 'Gas',             monthlyCost: 0, determinations: 100, isFixed: true },
      { id: 'agua',           concept: 'Agua',            monthlyCost: 0, determinations: 100, isFixed: true },
      { id: 'limpieza',       concept: 'Limpieza',        monthlyCost: 0, determinations: 100, isFixed: true },
      { id: 'administracion', concept: 'Administración',  monthlyCost: 0, determinations: 100, isFixed: true },
      { id: 'comunicaciones', concept: 'Comunicaciones',  monthlyCost: 0, determinations: 100, isFixed: true },
    ],
  },
  nivel3: { acreditacionTercerasPartes: [], monitoreoRegulatorio: [], ensayosInterlaboratorio: [] },
  pricing: { precioARS: 0, percentageEEA: 10, percentageCentro: 5 },
  exchangeRate: 1265,
};

Object.assign(window, { DEMO_DATA, INITIAL_STATE, calcAllTotals, fmtARS, fmtUSD, fmtNum, r2, MONTHLY_HOURS,
  calcInsumosCost, calcLaborCost, calcEquipmentCost, calcSharedResource, calcIndirectEquipment });
