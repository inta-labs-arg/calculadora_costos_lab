# Registro de Progreso del Proyecto

Este documento actúa como tracker vivo del desarrollo de la calculadora de costos del laboratorio. Se debe actualizar cada vez que se complete un hito, iteración o tarea relevante para mantener la trazabilidad del avance.

## Referencia inicial a escenarios y features (`docs/features`)

La siguiente tabla resume los features y escenarios que definen el alcance funcional inicial del proyecto.

| Feature | Escenarios clave |
| --- | --- |
| `afectacion_institucional.feature` | Ajustar la base y los porcentajes secuenciales del Nivel 4 |
| `costos_directos.feature` | Registrar insumos directos en distintas monedas · Sincronizar valores hora del personal · Distribuir depreciación y calibración de equipamiento específico |
| `costos_indirectos_y_prorrateo.feature` | Ajustar determinaciones mensuales para prorrateo · Documentar infraestructura base |
| `gestor_valores_hora.feature` | Administrar perfiles y exportar respaldos · Previsualizar e importar tablas |
| `integracion_bcra.feature` | Consultar la cotización USD→ARS con caché y reintentos |
| `orientacion_exportacion_global.feature` | Exportar supuestos de cálculo en JSON |
| `resumen_economico.feature` | Visualizar y exportar el resumen del servicio |
| `tipo_de_cambio_y_bcra.feature` | Ajustar manualmente el tipo de cambio · Activar consulta automática al BCRA · Mantener valor manual ante fallas |

## Bitácora cronológica

> **Convención:** Registrar cada actualización utilizando el formato `YYYY-MM-DD - [Estado] Descripción breve`. Utilizar listas ordenadas por fecha descendente para resaltar los avances más recientes y enlazar tareas o PRs si corresponde.

- 2025-10-08 - [Inicio] Se crea `PROGRESS.md` estableciendo la referencia funcional inicial basada en los features definidos en `docs/features`. A partir de esta fecha el archivo actuará como bitácora oficial del progreso del proyecto.

## Próximos pasos sugeridos

- Completar el primer corte de funcionalidades priorizando los escenarios marcados como base en la sección anterior.
- Definir métricas o checkpoints adicionales (p.ej., iteraciones de diseño, revisiones de QA, entregas parciales) y agregarlos a la bitácora cuando se concreten.
- Revisar y actualizar este documento en cada commit significativo para mantener la visibilidad del estado del proyecto.
