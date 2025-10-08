Feature: Configuración del tipo de cambio y consulta a Monedapi

  Scenario: Ajustar manualmente el tipo de cambio de referencia
    Given que la persona edita el valor numérico, la fecha y las observaciones del tipo de cambio en el panel de configuración
    When confirma estos valores manuales sin activar la consulta automática
    Then el estado global conserva el tipo de cambio manual, su fecha y nota como fuente vigente para las conversiones

  Scenario: Activar la consulta automática a Monedapi
    Given que la persona habilita el interruptor "Obtener TC desde Monedapi" en la configuración
    When el sistema invoca el endpoint interno "/api/monedapi/usd" y recibe una cotización válida de Monedapi o de la caché
    Then la cotización se normaliza, se almacena con su fecha y la fuente oficial o en caché, quedando lista para prorratear los montos en toda la calculadora

  Scenario: Mantener el valor manual ante una falla de Monedapi
    Given que la persona intenta activar la consulta automática a Monedapi
    When la llamada al endpoint produce un error o expira el tiempo de espera
    Then se muestra una notificación indicando la indisponibilidad, se revierte el interruptor y se conserva el tipo de cambio manual como respaldo
