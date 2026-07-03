# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
y el proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [1.0.0] - 2026-07-03

### Primera versión pública

Publicación inicial del prototipo como repositorio abierto bajo licencia MIT.

#### Agregado

- Motor de cálculo de costos en cinco niveles acumulativos (Directos, Indirectos,
  Acreditación y Monitoreo, Afectación Institucional, Gestión Estratégica y Margen)
  con aritmética de precisión decimal (Decimal.js).
- Interfaz por pantallas (dashboard + niveles + resumen) construida con Next.js 13 y Tailwind CSS.
- Gestión de tarifas horarias por perfil, persistidas en `localStorage`.
- Carga manual del tipo de cambio USD → ARS (sin dependencias de servicios externos).
- Exportación de supuestos a JSON y del resumen a PDF.
- Integración visible del logo institucional del INTA en el encabezado.

#### Documentación

- `README.md` con aviso de carácter no oficial y atribución metodológica.
- `LICENSE` (MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.
- Manual de usuario en `docs/MANUAL.md`.
- Plantillas de issues (reporte de error y sugerencia).

#### Notas

- Herramienta **no oficial**: prototipo independiente que interpreta la *Guía metodológica para el
  costeo de servicios rutinarios en laboratorios de INTA* (Goizueta & Castellano). No representa un
  producto ni una posición oficial del organismo.
