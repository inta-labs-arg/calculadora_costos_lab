Feature: Integración con la API de Monedapi y caché de contingencia

  Scenario: Consultar la cotización USD→ARS con caché y reintentos
    Given que el endpoint interno encapsula la consulta a "latest" de Monedapi con un tiempo máximo de 4 segundos
    When se solicita la cotización, se aplican reintentos, se cachean los resultados frescos y se registran los fallbacks
    Then si hay respuesta válida, se devuelve el valor con cabeceras de caché; de lo contrario, se recurre a un valor en caché hasta 24 horas o se emite un error "MONEDAPI_UNAVAILABLE"
