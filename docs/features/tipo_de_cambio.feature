Feature: Configuración manual del tipo de cambio

  Scenario: Ajustar manualmente el tipo de cambio de referencia
    Given que la persona edita el valor numérico del tipo de cambio en el panel de inicio
    When confirma ese valor manual
    Then el estado global conserva el tipo de cambio manual como fuente vigente para las conversiones USD→ARS
