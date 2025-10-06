# Calculadora de Costos de Servicios de Laboratorio INTA

Aplicación web construida con Next.js y Tailwind CSS para estimar el costo de un
servicio de laboratorio del INTA en cinco niveles acumulativos:

1. **Recursos humanos**
2. **Insumos y reactivos**
3. **Equipamiento y amortización**
4. **Servicios generales y soporte**
5. **Gestión estratégica y margen institucional**

Cada nivel se calcula de manera independiente y alimenta un resumen global que
permite proyectar distintos escenarios. La herramienta incluye exportación de
los supuestos a un archivo JSON para documentar la estimación.

## Desarrollo local

1. Instala las dependencias

   ```bash
   npm install
   ```

2. Inicia el servidor de desarrollo

   ```bash
   npm run dev
   ```

3. Abre `http://localhost:3000` en el navegador para ver la calculadora.

4. Ejecuta el análisis estático

   ```bash
   npm run lint
   ```

5. Ejecuta la suite de pruebas

   ```bash
   npm test
   ```

## Despliegue en Vercel

Este proyecto está preparado para desplegarse directamente en Vercel. Configura
la aplicación importando el repositorio y definiendo los siguientes valores por
defecto:

- **Framework**: Next.js
- **Comando de build**: `npm run build`
- **Directorio de salida**: `.next`

## Personalización

- Ajusta los textos y documentación de soporte en `components/IntroPanel.tsx`.
- Modifica las tasas sugeridas para los niveles porcentuales en `app/page.tsx`.
- Puedes ampliar la lógica de cálculo en `lib/cost-calculation.ts` para incluir
  unidades adicionales, coeficientes u hojas de referencia externas.

## Tipo de cambio y API del BCRA

La normalización de moneda utiliza el tipo de cambio oficial minorista publicado
por el Banco Central de la República Argentina. El endpoint oficial de la API
de "Principales Variables" se declara como constante `BCRA_EXRATE_URL` en
`contexts/ExchangeRateContext.tsx` y corresponde a la serie pública de
estadísticas cambiarias. Puedes consultar la documentación en el sitio del BCRA:
<https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables_datos.asp>.

Cuando la consulta al BCRA no está disponible, la aplicación mantiene el valor
manual cargado por la persona usuaria.
