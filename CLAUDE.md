# CLAUDE.md — Contexto del Proyecto

## Qué es este proyecto

Calculadora web de costos de servicios de laboratorio para el INTA (Instituto Nacional de Tecnología Agropecuaria). Su propósito es estimar con precisión y trazabilidad el costo unitario de un ensayo analítico, siguiendo una metodología de costeo en cinco niveles acumulativos.

Es un **prototipo funcional no oficial** (interpretación de una guía pública de INTA; ver README). No es una app CRUD con backend: **toda la lógica vive en el cliente** (React + Next.js App Router). No consulta servicios externos ni tiene endpoints de servidor, por lo que se distribuye como **sitio estático** (GitHub Pages).

## Regla de oro para modificaciones

**Nunca modificar la lógica de cálculo ni la composición de los cinco niveles sin instrucción explícita del usuario.** El motor matemático en `lib/cost-calculation.ts` es el núcleo funcional crítico; cambios ahí pueden introducir errores presupuestarios silenciosos. Toda modificación de lógica de negocio debe ir acompañada de tests que validen los resultados numéricos.

## Arquitectura

```
app/
  page.tsx              # Orquestador principal ("use client"): mantiene el estado de los 5
                        # niveles (LevelState[]) y navega entre pantallas por el estado `screen`.
                        # Aquí están los valores por defecto.
  layout.tsx            # Providers de Context (ExchangeRate, HourlyRates), metadata, footer
                        # (atribución + descargo no oficial + links a Manual y T&C).
  manual/page.tsx       # Manual de usuario en formato web (ruta estática /manual).
  globals.css

components/
  layout/
    StickyHeader.tsx    # Header fijo: logo INTA, costo unitario y navegación por pasos.
  screens/              # UI activa, una pantalla por paso de `screen`:
    DashboardScreen.tsx #   Inicio: nombre de servicio, DM global, tipo de cambio (manual).
    Level1Screen.tsx    #   Nivel 1 — Costos directos.
    Level2Screen.tsx    #   Nivel 2 — Costos indirectos.
    Level3Screen.tsx    #   Nivel 3 — Acreditación y monitoreo.
    SummaryScreen.tsx   #   Niveles 4 y 5 + resumen económico + exportación PDF/JSON.
  ui/                   # Primitivas de UI reutilizables (Card, Btn, InputField, Tabs, etc.).
  legal/
    TermsAndConditions.tsx # Modal de T&C con aceptación en primer uso + link permanente.

contexts/
  ExchangeRateContext.tsx # Estado global del tipo de cambio USD→ARS (carga manual).
  HourlyRatesContext.tsx  # Tarifas horarias por perfil, persistidas en localStorage.

lib/
  cost-calculation.ts     # MOTOR CRÍTICO: tipos discriminados + función calculateTotals().
  hourlyRates.ts          # Gestión de tarifas horarias (parse, serialize, localStorage).
  money.ts                # Utilitario round2() para redondeo monetario.
  app-config.ts           # Constantes de configuración.

__tests__/                # Vitest (entorno node)
docs/
  features/               # Especificaciones Gherkin de cada feature funcional.
  MANUAL.md               # Manual de usuario (fuente del contenido de /manual).
  TERMINOS_Y_CONDICIONES.md # Términos y condiciones (espejo del modal).
```

> La UI activa es `app/page.tsx` → `StickyHeader` + `screens/*` + `ui/*`. No existe una arquitectura de "cards" por nivel: fue reemplazada por las pantallas y removida.

## Los cinco niveles de cálculo

| Nivel | Tipo de estado (`lib/cost-calculation.ts`) | Dónde se edita |
|-------|--------------------------------------------|----------------|
| 1 – Costos Directos | `DirectLevelGroupState` (`direct-group`) | `Level1Screen` |
| 2 – Costos Indirectos | `IndirectLevelGroupState` (`indirect-group`) | `Level2Screen` |
| 3 – Acreditación y Monitoreo | `IndirectLevelGroupState` (`indirect-group`) | `Level3Screen` |
| 4 – Afectación Institucional | `SequentialPercentageLevelState` | `SummaryScreen` |
| 5 – Gestión Estratégica y Margen | `SequentialPercentageLevelState` | `SummaryScreen` |

El estado de cada nivel es una **unión discriminada** definida en `lib/cost-calculation.ts`. `app/page.tsx` mantiene el array `LevelState[]` y monta la pantalla correspondiente según el paso `screen` activo; `calculateTotals()` consolida el total.

## Lógica de negocio clave

- **Insumos directos**: `(precioFormato / cantidadFormato) × cantidadUsada`. Soporta conversión de unidades (g↔kg, mL↔L) vía `convert-units`.
- **Mano de obra**: `tarifaHoraria × horas × cantidadPersonas`. Tarifa horaria = `salarioMensual / 176` (176 = 22 días × 8 h). Las tarifas vienen de `HourlyRatesContext`.
- **Equipamiento (depreciación lineal)**: `(costo − valorResidual) / vidaÚtilAnios / 12`.
- **Prorrateo (niveles 2 y 3)**: `costoMensual / determinacionesMensuales`. Cada ítem puede tener sus propias determinaciones o heredar el global.
- **Niveles 4 y 5**: Aplicación secuencial de porcentajes sobre base acumulada.

Toda aritmética usa `decimal.js` para evitar errores de punto flotante.

## Estado de la aplicación

El estado completo de los cinco niveles vive en `app/page.tsx` como un array de `LevelState[]`. No hay base de datos. La persistencia es mínima: solo las tarifas horarias se guardan en `localStorage` (clave `lab_hourly_rates_v1`). También se guarda la aceptación de T&C (`lab_terms_accepted_v1`). La exportación de supuestos se hace a JSON descargable.

## Tipo de cambio

El tipo de cambio USD→ARS se **ingresa manualmente** en `DashboardScreen`, sobre `ExchangeRateContext`. La aplicación **no consulta servicios externos** (esto la hace apta para hosting estático y evita depender de APIs que puedan devolver valores desactualizados). Se recomienda cargar el dólar vendedor del día (p. ej. BNA).

## Testing

```bash
npm test          # Vitest (entorno node) — nota: `npm test` corre en modo watch; usar
                  # `npx vitest run` para una corrida única.
npm run lint      # ESLint (next/core-web-vitals + reglas personalizadas)
npx tsc --noEmit  # Type-check
```

Los tests de `__tests__/cost-calculation.test.ts` son los más críticos: validan la aritmética presupuestaria. Ante cualquier cambio en `lib/cost-calculation.ts`, deben seguir pasando (o actualizarse con justificación explícita). El entorno de test es `node` (no jsdom): la suite cubre lógica pura, no componentes.

## Stack técnico

- **Framework**: Next.js 13.5.6 (App Router), export estático (`output: "export"`).
- **UI**: React 18, Tailwind CSS 3
- **Lenguaje**: TypeScript 5 (strict)
- **Aritmética**: Decimal.js (precisión decimal)
- **Formularios**: react-hook-form + Zod
- **Unidades**: convert-units
- **Exportación**: html2pdf.js (lazy-loaded), papaparse (CSV)
- **Tests**: Vitest
- **Despliegue**: sitio estático en GitHub Pages (`npm run build` → `out/`; `NEXT_PUBLIC_BASE_PATH` para subdirectorio).

## Historial y contexto

El proyecto nació de la colaboración humano-IA: el usuario (Mauro Pinotti, INTA) ofició de Product Owner, y agentes de IA (Claude Code) generaron el código mediante PRs incrementales bajo el prefijo de rama `Mauropinotti/codex/*`. Tras ~70 PRs mergeados sobre `main`, todas las ramas históricas fueron eliminadas y el proyecto continúa únicamente en `main`. En la preparación de la primera versión pública se removió una arquitectura previa de componentes por nivel (no montada), los proxies de tipo de cambio (monedapi/BNA) y la dependencia de despliegue en Vercel.

El archivo `analisis_documental.md.resolved` contiene un análisis técnico detallado del proyecto, útil para entender decisiones de diseño tomadas en etapas previas.
