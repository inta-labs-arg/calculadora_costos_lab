# Manual de usuario

Guía funcional de la **Calculadora de Costos de Servicios de Laboratorio**. Explica qué representa
cada nivel, qué significa cada campo y cómo se calcula cada valor.

> Recordatorio: esta es una herramienta **no oficial** que interpreta la *Guía metodológica para el
> costeo de servicios rutinarios en laboratorios de INTA* (Goizueta & Castellano). Ante cualquier
> divergencia, la referencia conceptual es la Guía, no esta aplicación.

---

## Índice

1. [Idea general](#idea-general)
2. [Configuración base](#configuración-base)
3. [Nivel 1 — Costos Directos](#nivel-1--costos-directos)
4. [Nivel 2 — Costos Indirectos](#nivel-2--costos-indirectos)
5. [Nivel 3 — Acreditación y Monitoreo](#nivel-3--acreditación-y-monitoreo)
6. [Nivel 4 — Afectación Institucional](#nivel-4--afectación-institucional)
7. [Nivel 5 — Gestión Estratégica y Margen](#nivel-5--gestión-estratégica-y-margen)
8. [Resumen económico y exportación](#resumen-económico-y-exportación)
9. [Tipo de cambio](#tipo-de-cambio)
10. [Preguntas frecuentes](#preguntas-frecuentes)

---

## Idea general

El costo unitario de un ensayo se construye por **acumulación de cinco niveles**. Cada nivel suma su
aporte sobre la base acumulada de los anteriores. El objetivo es que cada peso del costo final sea
**trazable** hasta su origen (un insumo, una hora de trabajo, una depreciación, un porcentaje, etc.).

Toda la aritmética usa precisión decimal (**Decimal.js**) y redondeo monetario a 2 decimales, para
evitar los errores típicos del punto flotante.

## Configuración base

Antes de cargar los niveles conviene fijar los parámetros globales en el panel de configuración:

- **Determinaciones mensuales (DM):** cantidad de ensayos/determinaciones que el laboratorio procesa
  por mes. Es el divisor que **prorratea** los costos compartidos (niveles 2 y 3). Cada ítem puede
  usar la DM global o una propia.
- **Tipo de cambio USD → ARS:** manual o automático (ver [Tipo de cambio](#tipo-de-cambio)).
- **Nombre del servicio** y otros rótulos que aparecen en el resumen.

## Nivel 1 — Costos Directos

Costos que se pueden imputar **directamente** a la determinación. Tres subniveles:

### a) Insumos y reactivos

Costo por uso de cada insumo:

```
costo = (precioFormato / cantidadFormato) × cantidadUsada
```

- **precioFormato / cantidadFormato:** precio del envase o presentación dividido por su contenido
  (ej. un frasco de 500 g) → da el **precio unitario**.
- **cantidadUsada:** lo que consume una determinación.
- Soporta **conversión de unidades** (g↔kg, mL↔L, etc.) vía `convert-units`.
- Los insumos pueden cargarse en distintas monedas; se normalizan a ARS con el tipo de cambio.

### b) Mano de obra

```
costoHora = salarioMensual / 176        (176 = 22 días × 8 h)
costo     = costoHora × horas × cantidadPersonas
```

Las tarifas horarias se administran por **perfil** en el gestor de valores hora y se guardan en el
navegador (`localStorage`). Se pueden exportar/importar como respaldo.

### c) Equipamiento específico (depreciación lineal)

```
depreciaciónAnual   = (costoAdquisición − valorResidual) / vidaÚtilAnios
depreciaciónMensual = depreciaciónAnual / 12
```

Representa el desgaste mensual del equipo asignable al servicio. Si `vidaÚtilAnios ≤ 0` o el monto
depreciable es ≤ 0, el aporte es 0.

## Nivel 2 — Costos Indirectos

Costos **compartidos** por todo el laboratorio (materiales comunes, mantenimiento, infraestructura,
servicios). No se imputan a una determinación puntual, sino que se **prorratean**:

```
aportePorDeterminación = costoMensual / determinacionesMensuales
```

Cada ítem puede tener sus **propias determinaciones** o heredar la **DM global**. Así, un costo
mensual grande repartido entre muchas determinaciones aporta poco por unidad.

## Nivel 3 — Acreditación y Monitoreo

Misma mecánica de prorrateo que el Nivel 2, pero agrupando costos de **calidad**: aranceles de
acreditación (OAA, SENASA, etc.), auditorías, y participación en **ensayos interlaboratorio**. Los
ítems pueden duplicarse y registrar vigencias según los requisitos de calidad.

## Nivel 4 — Afectación Institucional

Aplica **porcentajes secuenciales** sobre la base acumulada (niveles 1–3). Contempla la afectación de
la **EEA / Instituto de Investigación** y del **Centro Regional / Centro de Investigación**. Cada
porcentaje se aplica de forma acumulativa: el resultado de un tramo es la base del siguiente.

## Nivel 5 — Gestión Estratégica y Margen

También por **porcentajes secuenciales**, sobre la base ya afectada por el Nivel 4. Incorpora la
gestión estratégica y el **margen institucional** para llegar al costo/precio final sugerido.

## Resumen económico y exportación

El **Resumen** consolida los subtotales de cada nivel y el **total general** (costo unitario
estimado), mostrado en ARS y su equivalente en USD. Desde allí se puede:

- **Exportar a JSON** todos los supuestos de cálculo (para respaldo o revisión).
- **Exportar a PDF** el resumen del servicio.

En la afectación institucional (Nivel 4) se puede ingresar un **precio del servicio** y verificar si
queda por encima, igual o por debajo del costo base calculado.

## Tipo de cambio

El tipo de cambio USD → ARS se **ingresa manualmente** en el panel de inicio. La aplicación no
consulta servicios externos: funciona íntegramente en tu navegador. Consultá el valor del día (por
ejemplo, el dólar vendedor del Banco de la Nación Argentina) y cargalo en el campo correspondiente.

## Preguntas frecuentes

**¿Los datos se guardan en algún servidor?**
No. Todo el cálculo ocurre en tu navegador y la app no consulta servicios externos. Sólo las tarifas
horarias se guardan localmente (`localStorage`). Para conservar un escenario completo, exportá el JSON.

**¿Puedo usarla para un laboratorio que no es del INTA?**
Sí. La metodología es general; ajustá los parámetros a tu contexto. Recordá que es un prototipo no
oficial y sin garantías.

**¿Dónde reporto un error o propongo una mejora?**
En los [Issues del repositorio](../../issues). Ver [CONTRIBUTING.md](../CONTRIBUTING.md).

**¿Y las dudas sobre la metodología de costeo?**
Corresponden a las/los autoras/es de la Guía metodológica (ver [README](../README.md#atribución-metodológica)),
no a este software.
