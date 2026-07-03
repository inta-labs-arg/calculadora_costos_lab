<div align="center">

<img src="public/img/INTA_300x300.jpg" alt="Logo INTA" width="120" height="120" />

# Calculadora de Costos de Servicios de Laboratorio

Estimación de costos rutinarios de laboratorio en **cinco niveles acumulativos**, con trazabilidad y precisión decimal.

[![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-00548F.svg)](LICENSE)
[![Estado: prototipo](https://img.shields.io/badge/Estado-prototipo%20funcional-F39200.svg)](#estado-y-alcance)
[![Next.js](https://img.shields.io/badge/Next.js-13-000000.svg)](https://nextjs.org/)

**🔗 App en vivo:** https://inta-labs-arg.github.io/inta_calculadora_costos_lab/

</div>

---

> ### ⚠️ Aviso de carácter NO oficial
>
> Esta es una herramienta **no oficial**. Es un **prototipo funcional e independiente**, desarrollado
> por personal del INTA a título personal, que **no representa una posición, un aval ni un producto
> oficial** del Instituto Nacional de Tecnología Agropecuaria. Se ofrece "tal cual" (_as-is_), sin
> garantías, bajo el espíritu de generar valor público abierto a partir de una iniciativa interna.
>
> El uso de la marca y los colores institucionales del INTA es meramente contextual y de atribución
> a la metodología de origen; no implica respaldo institucional.

---

## Qué es

Calculadora web que estima el **costo unitario** de un ensayo o servicio analítico de laboratorio,
descomponiéndolo en cinco niveles de costeo acumulativos. Toda la lógica corre en el cliente
(React + Next.js): no hay backend ni base de datos, y no consulta servicios externos. Esto la hace
apta para hosting estático (GitHub Pages).

Sirve para construir escenarios económicos reproducibles, documentar los supuestos de una estimación
y exportarlos para respaldo o revisión.

## Atribución metodológica

Esta aplicación es una **interpretación** de un documento **público** del INTA:

> **Guía metodológica para el costeo de servicios rutinarios en laboratorios de INTA**
> Autores: **Mercedes Goizueta** y **Andrés Castellano** — INTA EEA Marcos Juárez.
> Publicada en [Argentina.gob.ar](https://www.argentina.gob.ar/inta/cr-cordoba/guia-metodologica-para-el-costeo-de-servicios-rutinarios-en-laboratorios-de-inta).

La **idea, la metodología y su marco conceptual pertenecen a sus autoras/es**. Esta calculadora es
una implementación de software que interpreta esa metodología; puede diferir en detalles de la
formulación original. Para consultas sobre **la Guía o la metodología** (no sobre el software),
el contacto de referencia es **Mercedes Goizueta** — goizueta.mercedes@inta.gob.ar.

## Los cinco niveles de cálculo

| Nivel | Nombre                           | Qué agrupa                                                               |
| ----: | -------------------------------- | ------------------------------------------------------------------------ |
|     1 | **Costos Directos**              | Insumos/reactivos, mano de obra y equipamiento específico (depreciación) |
|     2 | **Costos Indirectos**            | Costos compartidos prorrateados por determinaciones mensuales            |
|     3 | **Acreditación y Monitoreo**     | Aranceles, auditorías, ensayos interlaboratorio y acreditaciones         |
|     4 | **Afectación Institucional**     | Porcentajes secuenciales de EEA/Instituto y Centro Regional              |
|     5 | **Gestión Estratégica y Margen** | Porcentajes secuenciales finales de gestión y margen                     |

Cada nivel alimenta un resumen económico global. Toda la aritmética usa **Decimal.js** para evitar
errores de punto flotante. El detalle de cada campo y fórmula está en el **[Manual de usuario](docs/MANUAL.md)**.

## Estado y alcance

Prototipo **funcional y operativo**, en primera versión pública (v1.0.0). No es un producto con
soporte formal ni garantías de disponibilidad. La persistencia es mínima (tarifas horarias en
`localStorage`); los supuestos se exportan a JSON/PDF descargable.

## Stack técnico

- **Framework:** Next.js 13 (App Router) · **UI:** React 18 + Tailwind CSS 3
- **Lenguaje:** TypeScript 5 (strict) · **Aritmética:** Decimal.js
- **Formularios:** react-hook-form + Zod · **Unidades:** convert-units
- **Exportación:** html2pdf.js (lazy), papaparse · **Tests:** Vitest
- **Despliegue:** sitio estático (GitHub Pages)

## Desarrollo local

```bash
npm install       # instalar dependencias
npm run dev       # servidor de desarrollo → http://localhost:3000
npm run lint      # análisis estático (ESLint)
npm test          # suite de pruebas (Vitest)
npx tsc --noEmit  # verificación de tipos
```

## Despliegue en GitHub Pages

El proyecto se publica como **sitio estático** (`output: "export"` en
[next.config.js](next.config.js)) mediante **GitHub Actions**. El workflow
[deploy-pages.yml](.github/workflows/deploy-pages.yml) buildea y despliega automáticamente en cada
push a `main`; el `basePath` se deriva solo del nombre del repositorio, por lo que funciona igual bajo
una cuenta personal o una organización.

Para activarlo una sola vez: en **Settings → Pages → Build and deployment → Source**, elegir
**GitHub Actions**.

Build local equivalente (opcional): `NEXT_PUBLIC_BASE_PATH="/inta_calculadora_costos_lab" npm run build`
genera la carpeta `out/`.

## Tipo de cambio (carga manual)

El tipo de cambio USD → ARS se **ingresa manualmente** en el panel de inicio. La aplicación no
consulta servicios externos: funciona íntegramente en el navegador, lo que garantiza que siga
operando sin dependencias de red y permite el hosting estático. Se recomienda cargar el valor del
día (por ejemplo, el dólar vendedor del Banco de la Nación Argentina).

## Cómo participar

Este repositorio está **abierto a reportes de errores y sugerencias** vía
[GitHub Issues](../../issues). Por ahora **no se invitan Pull Requests de código de terceros**, pero
los _forks_ para experimentar son bienvenidos (la licencia MIT lo permite). Ver **[CONTRIBUTING.md](CONTRIBUTING.md)**
y el **[Código de Conducta](CODE_OF_CONDUCT.md)**.

## Licencia y términos de uso

Distribuido bajo licencia **[MIT](LICENSE)**.
© 2026 Mauro H. Pinotti, Mercedes Goizueta, Andrés Castellano.

El uso de la aplicación está sujeto a los **[Términos y condiciones](docs/TERMINOS_Y_CONDICIONES.md)**
(prototipo no oficial, resultados orientativos), que también se muestran y se aceptan dentro de la
propia herramienta en el primer uso.

## Autores y contacto

| Rol                     | Persona               | Ámbito                                                                  | Contacto                      |
| ----------------------- | --------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| Desarrollo del software | **Mauro H. Pinotti**  | Gerencia de Gestión Estratégica de la Investigación y Desarrollo (INTA) | pinotti.mauro@inta.gob.ar     |
| Autoría metodológica    | **Mercedes Goizueta** | INTA EEA Marcos Juárez                                                  | goizueta.mercedes@inta.gob.ar |
| Autoría metodológica    | **Andrés Castellano** | INTA EEA Marcos Juárez                                                  | _ver Guía metodológica_       |

Para cuestiones del **software** (bugs, ideas): abrí un _issue_. Para cuestiones de **metodología**:
contactar a Mercedes Goizueta.
