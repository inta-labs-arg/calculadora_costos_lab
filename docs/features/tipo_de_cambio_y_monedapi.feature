Feature: Configuración del tipo de cambio y consulta a Monedapi

  Scenario: Ajustar manualmente el tipo de cambio de referencia
    Given que la persona edita el valor numérico, la fecha y las observaciones del tipo de cambio en el panel de configuración
    When confirma estos valores manuales
    Then el estado global conserva el tipo de cambio manual, su fecha y nota como fuente vigente para las conversiones

  Scenario: Consultar una cotización oficial de referencia
    Given que la persona solicita la "Cotización oficial BNA" desde la configuración
    When el sistema invoca el endpoint interno "/api/cotizacion/bna" y recibe una respuesta válida con la venta minorista
    Then la cotización se muestra junto con la fecha y hora de actualización para que se use como referencia manual
