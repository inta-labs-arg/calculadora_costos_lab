Feature: Orientación inicial y exportación global

  Scenario: Exportar supuestos de cálculo en JSON
    Given que la persona usuaria accede a la portada con el panel introductorio y sus atajos de navegación
    When utiliza la opción "Exportar JSON" desde el panel de resumen económico
    Then la aplicación genera y descarga un archivo JSON con los niveles configurados, los totales y la fecha de generación de la cotización
