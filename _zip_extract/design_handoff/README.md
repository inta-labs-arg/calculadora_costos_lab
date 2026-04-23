# Handoff de Rediseño — Calculadora de Costos LAB INTA

## Contexto

Este paquete documenta el rediseño de alta usabilidad de la **Calculadora de Costos de Laboratorio INTA**. El prototipo reemplaza la interfaz actual (una única página de scroll largo con formularios densos) por una aplicación navegable en pasos, mobile-first, con un total siempre visible.

## Sobre los archivos de diseño

Los archivos en `prototype/` son **referencias de diseño en HTML+React vanilla** — prototipos que muestran la apariencia y el comportamiento deseados. **No son código de producción para copiar directamente.**

La tarea de Claude Code es **reimplementar estos diseños en el codebase Next.js existente** (`/app`, `/components`, `/contexts`, `/lib`) usando los patrones, dependencias y convenciones ya establecidas (Tailwind CSS, React, TypeScript, react-hook-form, zod, etc.).

## Fidelidad

**Alta fidelidad (hifi).** Los prototipos son pixel-accurate en cuanto a:
- Paleta de colores exacta (hex values documentados abajo)
- Tipografía: familia, tamaños, pesos
- Espaciado y jerarquía visual
- Interacciones y estados hover/active/disabled
- Flujo de navegación entre pantallas

---

## Arquitectura: cambio principal

### Antes (estado actual)
Una sola página (`app/page.tsx`) que renderiza todos los componentes apilados verticalmente. El usuario hace scroll a través de todos los niveles sin indicación de progreso.

### Después (rediseño propuesto)
Navegación por pasos (stepper) con 5 pantallas:

```
Dashboard → Nivel 1 → Nivel 2 → Nivel 3 → Resumen
```

El estado global permanece en `app/page.tsx` (o un Context dedicado). El `screen` activo determina qué componente se renderiza. **No se requiere React Router** — es routing interno con `useState`.

---

## Design Tokens

### Colores (Tailwind custom en `tailwind.config.ts`)

```typescript
// tailwind.config.ts — ya existe, AMPLIAR con:
colors: {
  inta: {
    blue:         '#00548F',   // Primary actions, headers, stepper activo
    'blue-dark':  '#003F6B',   // Gradients, hover de blue
    'blue-mid':   '#C5DCF0',   // Borders de inputs focus, separadores
    'blue-light': '#EBF4FB',   // Backgrounds de secciones informativas
    green:        '#7BB342',   // Totales positivos, estados de éxito
    'green-light':'#EEF6E5',   // Background de costo calculado
    orange:       '#F39200',   // Nivel 3 accent, warnings
    'orange-light':'#FEF3E0',  // Background de warnings
    red:          '#D94040',   // Errores de validación
    'red-light':  '#FDEAEA',   // Background de errores
    gray: {
      50:  '#F8F9FA',
      100: '#F1F3F5',
      200: '#E9ECEF',
      300: '#DEE2E6',
      400: '#ADB5BD',
      500: '#868E96',
      600: '#495057',
      700: '#343A40',
      800: '#212529',
    }
  }
}
```

### Tipografía

```css
/* globals.css — agregar import de Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

body { font-family: 'DM Sans', system-ui, sans-serif; }
```

Escala tipográfica usada:
- `text-[11px]` — etiquetas de stepper, metadata
- `text-xs` (12px) — hints, descripciones secundarias, tags
- `text-sm` (14px) — labels de inputs, contenido de cards
- `text-base` (16px) — totales de sub-sección
- `text-lg` (18px) — títulos de pantalla
- `text-xl` (20px) — total en header sticky
- `text-4xl` (40px) — costo unitario en pantalla Resumen

### Espaciado y radios

```
rounded-md   → 6px   (inputs, selects)
rounded-lg   → 10px  (botones, tags, previews)
rounded-xl   → 12px  (secciones internas)
rounded-2xl  → 16px  (cards principales)
rounded-3xl  → 24px  (existente, mantener para compat.)
```

### Sombras

```css
shadow-sm  → 0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.05)
shadow     → 0 2px 8px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.05)
shadow-lg  → 0 8px 24px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.06)
```

---

## Estructura de archivos propuesta

```
app/
  page.tsx                    ← mantener; agregar routing de screen
  globals.css                 ← agregar DM Sans import

components/
  layout/
    StickyHeader.tsx          ← NUEVO: header fijo con total + stepper
    StepNav.tsx               ← NUEVO: o integrado en StickyHeader
  ui/
    Card.tsx                  ← NUEVO: wrapper de card reutilizable
    Btn.tsx                   ← NUEVO o adaptar botones existentes
    InputField.tsx            ← NUEVO: input con label + hint + error
    SelectField.tsx           ← NUEVO
    Tabs.tsx                  ← NUEVO: tabs horizontales con contador
    EmptyState.tsx            ← NUEVO
    Tag.tsx                   ← NUEVO: badge/chip de estado
    NavFooter.tsx             ← NUEVO: footer con Anterior / Siguiente
  screens/
    DashboardScreen.tsx       ← NUEVO
    Level1Screen.tsx          ← REEMPLAZA LevelOneCard.tsx
    Level2Screen.tsx          ← REEMPLAZA IndirectLevelCard.tsx (nivel2)
    Level3Screen.tsx          ← REEMPLAZA IndirectLevelCard.tsx (nivel3)
    SummaryScreen.tsx         ← REEMPLAZA SummaryPanel.tsx
```

---

## Pantalla 1: Dashboard

**Archivo de referencia:** `prototype/components/Dashboard.jsx`

### Layout

```
┌─────────────────────────────────────┐
│ StickyHeader (sticky, top-0)        │
├─────────────────────────────────────┤
│ Hero gradient (azul)                │
│   Nombre del servicio               │
│   Total estimado (grande)           │
│   Mini breakdown N1/N2/N3           │
├─────────────────────────────────────┤
│ padding 20px / gap 16px             │
│ ┌─────────────────────────────────┐ │
│ │ Card: Datos del servicio        │ │
│ │  - input: Nombre servicio       │ │
│ │  - input: Nombre laboratorio    │ │
│ │  - input: Det. mensuales (DM)   │ │
│ │  - input: Tipo de cambio        │ │
│ └─────────────────────────────────┘ │
│ Label "Niveles de costeo"           │
│ ┌─────────────────────────────────┐ │
│ │ Card clickable → Nivel 1        │ │
│ │  icono + label + status + total │ │
│ └─────────────────────────────────┘ │
│ [Card Nivel 2] [Card Nivel 3]       │
│ ┌─────────────────────────────────┐ │
│ │ Card: Distribución de costos    │ │  ← solo si grandTotal > 0
│ │  barras horizontales por nivel  │ │
│ └─────────────────────────────────┘ │
│ [Cargar demo]  [Ver resumen]        │
└─────────────────────────────────────┘
```

### Hero gradient

```tsx
<div className="bg-gradient-to-br from-inta-blue via-[#0070BE] to-[#0088D4] px-5 py-6 text-white">
  <p className="text-xs opacity-75 mb-1">Bienvenido/a</p>
  <h1 className="text-[22px] font-bold leading-tight mb-2">{serviceName || 'Nuevo servicio'}</h1>
  {/* total destacado */}
  <span className="text-[26px] font-bold tracking-tight">{formatARS(grandTotal)}</span>
</div>
```

### Cards de nivel (clickables)

Cada card tiene:
- **Ícono SVG** en caja de 40×40px, `bg-[color]/15`, `rounded-[10px]`
- **Badge de estado:** `Tag` verde "Completo" / gris "Pendiente"
- **Total** alineado a la derecha en `text-[17px] font-bold`
- `hover:shadow-lg hover:-translate-y-px transition-all`

Color accent por nivel:
- Nivel 1 → `inta-blue` (`#00548F`)
- Nivel 2 → `#0070BE`
- Nivel 3 → `inta-orange` (`#F39200`)

---

## StickyHeader

**Archivo de referencia:** `prototype/components/Shell.jsx` → función `StickyHeader`

### Estructura (de arriba hacia abajo)

1. **Top bar** (height ~56px): logo INTA + nombre app + total en tiempo real
2. **Barra de progreso** (height 3px): gradiente azul→verde, ancho proporcional a niveles completados
3. **Step nav** (height ~48px): 5 tabs scrollables horizontalmente

### Top bar

```tsx
// Logo box: 34×34px, bg-gradient-to-br from-inta-blue to-[#0070BE], rounded-lg
// Total:
<div className="text-right">
  <p className="text-[11px] text-inta-gray-500">Costo unitario estimado</p>
  <p className={`text-[20px] font-bold tracking-tight leading-tight
      ${grandTotal > 0 ? 'text-inta-green' : 'text-inta-gray-400'}`}>
    {formatARS(grandTotal)}
  </p>
  {grandTotal > 0 && <p className="text-[11px] text-inta-gray-400">≈ {formatUSD(...)}</p>}
</div>
```

### Barra de progreso

```tsx
<div className="h-[3px] bg-inta-gray-100 relative">
  <div
    className="h-full bg-gradient-to-r from-inta-blue to-inta-green transition-[width] duration-400"
    style={{ width: `${progressPercent}%` }}
  />
</div>
```

### Step nav (tabs)

5 botones, cada uno:
```tsx
<button className={`flex-none flex flex-col items-center gap-0.5 px-4 py-2 text-[11px]
    border-b-2 transition-colors whitespace-nowrap
    ${isActive ? 'border-inta-blue text-inta-blue font-semibold' : 
      isDone ? 'border-transparent text-inta-green' : 
      'border-transparent text-inta-gray-400'}`}>
  {/* círculo numerado */}
  <span className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center
      justify-center text-[10px] font-bold transition-all
      ${isActive ? 'bg-inta-blue border-inta-blue text-white' :
        isDone ? 'bg-inta-green border-inta-green text-white' :
        'bg-white border-inta-gray-300 text-inta-gray-400'}`}>
    {isDone && !isActive ? '✓' : index}
  </span>
  {step.label}
</button>
```

> **Importante:** El contenedor `<nav>` necesita `overflow-x-auto` con `scrollbar-width: none` para ocultar la scrollbar en mobile sin perder la funcionalidad.

---

## Componentes UI reutilizables

### `InputField`

```tsx
// Todos los inputs tienen min-height 44px (accesibilidad táctil)
interface InputFieldProps {
  label: string;
  hint?: string;
  error?: string;
  suffix?: string;       // ej: "$", "%", "años"
  // + props nativas de <input>
}
```

```tsx
<label className="flex flex-col gap-1">
  <span className="text-[13px] font-medium text-inta-gray-700">{label}</span>
  <div className="relative flex items-center">
    <input
      className="w-full min-h-[44px] px-3 py-2.5 pr-10 border border-inta-gray-300 rounded-md
                 text-sm text-inta-gray-800 bg-white outline-none
                 focus:border-inta-blue focus:ring-2 focus:ring-inta-blue/20
                 disabled:bg-inta-gray-50 transition-colors"
    />
    {suffix && (
      <span className="absolute right-2.5 text-[12px] font-medium text-inta-gray-400 pointer-events-none">
        {suffix}
      </span>
    )}
  </div>
  {error && <span className="text-xs text-inta-red">{error}</span>}
  {!error && hint && <span className="text-xs text-inta-gray-400">{hint}</span>}
</label>
```

### `Tabs`

```tsx
// Contenedor: overflow-x-auto, scrollbar oculto, border-b border-inta-gray-200
// Tab activo: border-b-2 border-inta-blue text-inta-blue font-semibold
// Badge de conteo: rounded-full bg-inta-blue text-white text-[10px] font-bold px-1
```

### `Card`

```tsx
<div className="bg-white rounded-2xl shadow-sm border border-inta-gray-200 overflow-hidden">
  {children}
</div>
```

### `Tag` (badge de estado)

```tsx
// Completo:  bg-inta-green/10 text-inta-green
// Pendiente: bg-inta-gray-400/10 text-inta-gray-400
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold
                 bg-[color]/[0.1] text-[color]">
  {label}
</span>
```

### `NavFooter`

```tsx
// Barra con dos botones: Anterior (outline) + Siguiente (primary)
// padding: py-4 px-4, justify-between
<div className="flex justify-between gap-2.5 px-4 py-4 pb-6">
  <Button variant="outline" onClick={onBack}>{backLabel}</Button>
  <Button variant="primary" onClick={onNext} disabled={nextDisabled}>{nextLabel}</Button>
</div>
```

---

## Pantalla 2: Nivel 1 — Costos Directos

**Archivo de referencia:** `prototype/components/Level1.jsx`

### Estructura

```
Header de pantalla:
  badge "NIVEL 1" (uppercase, azul)
  título "Costos Directos Unitarios"
  subtotal alineado a la derecha

Tabs: [Insumos Directos (n)] [Mano de Obra (n)] [Equipamiento (n)]

Card principal (margin 16px):
  Contenido del tab activo

Banner de subtotal (si > 0):
  gradiente azul, muestra breakdown de los 3 sub-totales

NavFooter: ← Dashboard  |  Nivel 2 →
```

### Tab: Insumos Directos

**Lista de ítems** (tabla reemplazada por filas de Card):
```
ItemRow:
  [Nombre + formato]   [cost/det]   [×]
  texto 14px semibold  verde bold   gris, tap target 32px
  subtexto 12px gris
```

**Formulario "Agregar insumo"** (fondo `bg-inta-gray-50`, `border-t`):
- Grid 2 columnas en mobile
- Campo "Nombre del insumo" ocupa ancho completo (`col-span-2`)
- **Preview de costo** aparece dinámicamente cuando los campos están completos:
  ```tsx
  {costoParcial !== null && (
    <div className="flex justify-between items-center px-3.5 py-2.5
                    rounded-lg bg-inta-green-light text-inta-green">
      <span className="text-sm">Costo por determinación</span>
      <span className="font-bold text-base">{formatARS(costoParcial)}</span>
    </div>
  )}
  ```
- Botón "Agregar insumo" deshabilitado hasta que `costoParcial !== null`

### Tab: Mano de Obra

3 filas (Profesionales / Técnicos / Apoyo), cada una en una Card con:
- Encabezado: nombre del rol + `Tag` con costo calculado (si > 0)
- Grid 3 columnas: Cantidad · Horas/det · Salario mensual
- Pie: "Valor hora: $X/h" en text-xs cuando `monthlySalary > 0`
- Card con `border-inta-blue-mid` cuando la fila tiene datos (`quantity > 0`)

### Tab: Equipamiento

Igual a insumos pero con campos:
- Descripción (full width)
- Costo adquisición + Valor residual (grid 2)
- Vida útil en años
- Preview: **Depreciación mensual** = `(costo - VR) / vidaUtil / 12`

---

## Pantalla 3: Nivel 2 — Costos Indirectos

**Archivo de referencia:** `prototype/components/Levels23.jsx` → `Level2Screen`

### Tabs

```
[Mat. No Descartables] [Equip. Menor] [Mantenimiento] [Calibración] [Infraestructura]
```

### Banner informativo (arriba de los tabs)

```tsx
<div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-inta-blue-light text-inta-blue text-xs">
  DM global: <strong>{globalDeterminations} determinaciones/mes</strong> — ajustable desde Inicio
</div>
```

### Sección genérica SharedResource

Cada sub-sección muestra:
1. Header: título + descripción + Tag con subtotal
2. Lista de ítems: `concept | [input monthlyCost] | costo/det | [×]`
   - El campo `monthlyCost` es un `<input>` inline editable (96px de ancho, text-right)
   - `costo/det` se recalcula live: `monthlyCost / determinations`
   - Los ítems "fijos" (infraestructura) no tienen botón eliminar
3. Formulario de agregado: grid adaptativo + botón "+ Agregar"

### Equipamiento menor (IndirectEquipment)

Similar pero campos: Nombre equipo · Precio compra · Vida útil (meses)
Preview: `costo/det = (purchasePrice / usefulLifeMonths) / determinations`

### Infraestructura

6 ítems fijos predefinidos (Energía, Gas, Agua, Limpieza, Administración, Comunicaciones). Solo se edita el campo `monthlyCost` de cada uno. Las `determinations` se toman del DM global.

---

## Pantalla 4: Nivel 3 — Acreditación

**Archivo de referencia:** `prototype/components/Levels23.jsx` → `Level3Screen`

### Tabs

```
[Acreditación OAA] [Monitoreo Regulatorio] [Ensayos Interlaboratorio]
```

Misma estructura que SharedResource pero con campo `determinations` editable por ítem (ya que cada organismo puede tener distinta base de prorrateo).

Accent color del header: `inta-orange` en lugar de `inta-blue`.

---

## Pantalla 5: Resumen

**Archivo de referencia:** `prototype/components/Summary.jsx`

### Hero de resultado

```tsx
<div className="bg-gradient-to-br from-inta-blue-dark to-inta-blue px-5 pt-7 pb-6 text-white">
  <p className="text-[11px] uppercase tracking-widest opacity-70">Costo Unitario del Servicio Rutinario</p>
  <p className="text-[40px] font-extrabold tracking-tight leading-none mt-1">
    {formatARS(grandTotal)}
  </p>
  {/* equivalente USD */}
  {/* mini grid 3 columnas: N1/N2/N3 con barra de progreso */}
</div>
```

### Mini breakdown en el hero

```tsx
<div className="mt-5 p-3.5 rounded-xl bg-white/10 backdrop-blur-sm">
  <div className="grid grid-cols-3 gap-2.5">
    {levels.map(lv => (
      <div key={lv.id}>
        <p className="text-[10px] opacity-65">Nivel {n}</p>
        <p className="font-bold text-sm">{formatARS(lv.total)}</p>
        {/* barra: h-[3px] bg-white/20, fill bg-inta-green */}
      </div>
    ))}
  </div>
</div>
```

### Desglose por niveles (acordeón)

```tsx
// Cada nivel: header clickable con chevron ▾ rotado 180° cuando expandido
// Sub-ítems: indent 32px, texto 13px, valor 13px font-semibold
// Footer: bg-inta-blue-light, "Costo Unitario Total" + valor en inta-blue
```

### Panel de precio institucional

- Toggle: "Usar costo calculado" ↔ "Ingresar precio manual"
- En modo manual: aparece `InputField` para precio ARS
- Dos inputs: % EEA + % Centro
- Tabla de totales: precio base + afectación EEA + afectación Centro + **Precio neto** (verde, bold)

### Exportar

Mantener la lógica existente en `SummaryPanel.tsx` (PDF via html2pdf, JSON, CSV). Los botones deben ocupar ancho completo en mobile (`w-full`).

---

## Routing interno

En `app/page.tsx`, reemplazar el render único por routing basado en estado:

```tsx
type Screen = 'dashboard' | 'nivel1' | 'nivel2' | 'nivel3' | 'resumen';

const [screen, setScreen] = useState<Screen>('dashboard');
const navigate = (s: Screen) => { setScreen(s); window.scrollTo({ top: 0 }); };

// En el render:
return (
  <>
    <StickyHeader screen={screen} onNavigate={navigate} totals={totals} ... />
    <main className="max-w-2xl mx-auto">
      {screen === 'dashboard' && <DashboardScreen onNavigate={navigate} ... />}
      {screen === 'nivel1'    && <Level1Screen    onNavigate={navigate} ... />}
      {screen === 'nivel2'    && <Level2Screen    onNavigate={navigate} ... />}
      {screen === 'nivel3'    && <Level3Screen    onNavigate={navigate} ... />}
      {screen === 'resumen'   && <SummaryScreen   onNavigate={navigate} ... />}
    </main>
  </>
);
```

> Nota: hacer `window.scrollTo({ top: 0 })` al cambiar de pantalla es importante para UX mobile.

---

## Animación de entrada de pantalla

```css
/* globals.css */
@keyframes screenEnter {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.screen-enter {
  animation: screenEnter 0.22s ease;
}
```

Cada componente de pantalla incluye `className="screen-enter"` en su wrapper raíz.

---

## Lógica de cálculo: NO modificar

Los archivos en `/lib/` **no deben modificarse**:
- `lib/cost-calculation.ts` — toda la lógica de cálculo permanece igual
- `lib/money.ts`, `lib/hourlyRates.ts`, etc. — sin cambios
- `contexts/ExchangeRateContext.tsx`, `contexts/HourlyRatesContext.tsx` — sin cambios

Los nuevos componentes de pantalla **consumen los mismos hooks y funciones** que los componentes actuales; solo cambia la presentación.

---

## Checklist de implementación para Claude Code

### 1. Tokens y globals
- [ ] Ampliar `tailwind.config.ts` con los nuevos colores (`blue-dark`, `blue-mid`, `blue-light`, grays, `red`, `red-light`)
- [ ] Agregar import de DM Sans en `app/globals.css`
- [ ] Agregar `@keyframes screenEnter` y `.screen-enter` en `globals.css`
- [ ] Eliminar clases de color por sección (`sky-*`, `emerald-*`, `indigo-*`, `teal-*`, `lime-*`) — usar solo la paleta inta

### 2. Componentes UI base
- [ ] `components/ui/InputField.tsx` — input con label/hint/error/suffix, min-height 44px
- [ ] `components/ui/SelectField.tsx`
- [ ] `components/ui/Tabs.tsx` — tabs scrollables con badge de conteo
- [ ] `components/ui/Card.tsx` — wrapper con shadow-sm y border
- [ ] `components/ui/Btn.tsx` — variantes: primary, outline, ghost, danger, success
- [ ] `components/ui/Tag.tsx` — badge de estado
- [ ] `components/ui/EmptyState.tsx`
- [ ] `components/ui/NavFooter.tsx`
- [ ] `components/ui/ItemRow.tsx`

### 3. Layout
- [ ] `components/layout/StickyHeader.tsx` — header sticky con top-bar + barra progreso + step-nav
- [ ] Aplicar `sticky top-0 z-50` con sombra `shadow-[0_2px_8px_rgba(0,84,143,0.08)]`

### 4. Pantallas
- [ ] `components/screens/DashboardScreen.tsx`
- [ ] `components/screens/Level1Screen.tsx` (reemplaza `LevelOneCard.tsx`)
- [ ] `components/screens/Level2Screen.tsx` (reemplaza parte de `IndirectLevelCard.tsx`)
- [ ] `components/screens/Level3Screen.tsx` (reemplaza parte de `IndirectLevelCard.tsx`)
- [ ] `components/screens/SummaryScreen.tsx` (reemplaza `SummaryPanel.tsx`)

### 5. Página principal
- [ ] Agregar `screen` state en `app/page.tsx`
- [ ] Agregar función `navigate(screen)` que hace scroll to top
- [ ] Reemplazar render de componentes legacy por routing de screens
- [ ] Mantener toda la lógica de estado existente (`levels`, `globalDeterminations`, handlers, etc.)

### 6. Depreciación de componentes legacy
Una vez implementadas las nuevas pantallas, los siguientes componentes pueden eliminarse (verificar que no se usen en tests):
- `components/LevelOneCard.tsx` → reemplazado por `Level1Screen`
- `components/IndirectLevelCard.tsx` → reemplazado por `Level2Screen` + `Level3Screen`
- `components/SummaryPanel.tsx` → reemplazado por `SummaryScreen`
- `components/IntroPanel.tsx` → contenido movido a `DashboardScreen`
- `components/PercentageLevelCard.tsx` → verificar si se sigue necesitando

### 7. Tests
- Actualizar snapshots en `__tests__/summary-panel.test.tsx` al renombrar el componente
- Verificar `__tests__/indirect-level-card.test.tsx` — puede necesitar adaptación

---

## Comportamiento específico a preservar

Los siguientes comportamientos del código actual **deben mantenerse exactamente** en la reimplementación:

1. **Conversión de unidades en insumos** (`g/mg/kg/mL/L/unidad`) usando la librería `convert-units`
2. **Validación con zod + react-hook-form** en todos los formularios
3. **Cálculo de depreciación lineal** para equipamiento: `(adquisicion - residual) / vidaUtil / 12`
4. **Prorrateo por DM global** para sub-niveles 2.1–2.4 de infraestructura
5. **Items fijos de infraestructura** (no eliminables, solo editables en `monthlyCost`)
6. **Secciones especiales** de `IndirectLevelCard`: mantenimiento con fechas, calibración, interlaboratorio, terceras partes — estas secciones tienen lógica de cálculo compleja; reutilizar los componentes `ThirdPartyAccreditationSection.tsx` e `InterlaboratoryParticipationSection.tsx` sin modificarlos, integrándolos dentro de `Level3Screen`
7. **Export a PDF/JSON/CSV** — lógica existente en `SummaryPanel.tsx` a portar a `SummaryScreen.tsx`
8. **ExchangeRateContext** y **HourlyRatesContext** — consumir igual que antes

---

## Archivos en este paquete

```
design_handoff/
  README.md                          ← este archivo
  Calculadora Lab INTA.html          ← prototipo interactivo (abrir en browser)
  prototype/
    components/
      state.jsx      ← estado inicial, lógica de cálculo simplificada, formatters
      Shell.jsx      ← StickyHeader, Tabs, Card, Btn, InputField, SelectField, ...
      Dashboard.jsx  ← DashboardScreen
      Level1.jsx     ← Level1Screen (Insumos, Mano de Obra, Equipamiento tabs)
      Levels23.jsx   ← Level2Screen + Level3Screen + SharedResourceSection
      Summary.jsx    ← SummaryScreen
      Main.jsx       ← App root con reducer
  screenshots/
    01-dashboard.png
    02-nivel1.png
    03-resumen.png
```

---

## Cómo explorar el prototipo

1. Abrir `Calculadora Lab INTA.html` en un browser moderno (Chrome/Safari/Firefox)
2. Hacer clic en **"Cargar datos demo"** para ver todos los niveles con datos reales
3. Navegar por las 5 pantallas usando el stepper superior
4. Revisar el código fuente en `prototype/components/` para referencia de implementación

---

*Generado por Claude — Rediseño LAB INTA Calculadora de Costos — Abril 2026*
