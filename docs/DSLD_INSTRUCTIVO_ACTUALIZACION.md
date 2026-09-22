# Cómo actualizar el tablero DSLD

Instructivo para el personal de la DSLD · versión del 17/09/2026

El tablero está en **Gestión de Datos → Suite Analítica DSLD** (`/gestion-datos/dsld`). Los datos no se actualizan solos: alguien sube los archivos cuando la DSLD los tiene listos.

## 1. Qué archivo corresponde a cada pestaña

| Pestaña | Archivo que hay que subir | Qué debe contener |
|---|---|---|
| Situación de las DEMUNA · Supervisión · Directorio | `DNA.mdb` | La base Access del padrón, con las tablas `dna`, `supervisadas`, `ubigeo`, `estadodna`, `modelodna`, `supervisores` y la de población INEI |
| Capacitación | `CAPACITACION_… NOMINAL.xlsx` | La tabla de Excel `TB_CAPA_DEMUNA` |
| CCONNA | `CCONNA nominal <mes><año>.xlsx` | Las hojas "BD ORGANIZACIONAL" y "BD NOMINAL" |
| Ponte en Modo Niñez | `MATRIZ DE REPORTE PBI <año>.xlsx` | La tabla de Excel `TB_MODO_NINEZ_2026` |
| PIAS | `PIAS_PBI_AUTORIDADES_PADRES.xlsx` | Las tablas `TB_PIAS_AUTORIDADES`, `TB_PIAS_PADRES` y `TB_PIAS_NNA` |

**Importante:** los archivos deben mantener el nombre de sus tablas de Excel y sus encabezados. Si se renombra una tabla o se borra una columna, el sistema rechaza el archivo y explica qué falta. Agregar columnas nuevas no causa problemas.

## 2. Orden de carga

**El DNA.mdb va primero.** De ahí salen el padrón de DEMUNA y los nombres oficiales de departamentos, provincias y distritos que usan las otras pestañas. Los demás archivos pueden subirse en cualquier orden.

## 3. Pasos

1. Entrar a **Gestión de Datos → Suite Analítica DSLD**.
2. Pulsar **"Sincronizar Orígenes & Rutas"** (arriba a la derecha).
3. En la fila del eje que se quiere actualizar, pulsar **"Cargar"** y elegir el archivo.
4. Esperar el mensaje de resultado. Suele tardar entre 2 y 10 segundos según el archivo.
5. Cerrar la ventana. La pestaña ya muestra los datos nuevos.

Cada carga **reemplaza** por completo los datos de ese eje; no se acumula con la anterior. Los demás ejes no se tocan.

## 4. Si algo sale mal

- **El sistema rechaza el archivo y muestra un mensaje.** No se perdió nada: los datos anteriores siguen intactos. El mensaje indica el problema (una tabla que falta, filas con ubigeo inválido, etc.). Se corrige el Excel y se vuelve a subir.
- **La carga termina pero con "Observaciones".** Sí se cargó. Las observaciones son datos que conviene corregir en el Excel, pero que no impiden el cálculo. Hoy aparecen estas:
  - PIAS: el ubigeo `250251` no existe (220 registros). Esas atenciones se cuentan, pero no se ubican en el mapa.
  - Capacitación: 432 registros sin código de DEMUNA y 125 con una fecha de fin inválida.
  - CCONNA: 1,538 participaciones sin ubigeo.
  - Modo Niñez: una fecha de acta que no existe (29/02/2023) y 15 gobiernos sin año de adhesión.

## 5. Quién cargó qué

Cada intento de carga queda registrado con el usuario, la fecha, el archivo y cuántos registros entraron, incluidos los intentos fallidos. El encabezado de cada pestaña muestra el archivo y la fecha de la última carga.

## 6. Datos personales

El sistema **no guarda** datos personales de las personas atendidas ni de las capacitadas: ni nombres, ni documentos, ni fechas de nacimiento, ni teléfonos.

- En Capacitación, el DNI se usa solo durante la importación para contar personas distintas, y se convierte en un código del que no se puede volver al DNI.
- En CCONNA, las niñas, niños y adolescentes se guardan solo como conteos por distrito, nivel y sexo.
- Sí se conservan los nombres de los supervisores de la DSLD y los datos de contacto de las DEMUNA (dirección, teléfono, correo y horario), porque el directorio sirve para comunicarse con ellas.

Por eso los archivos originales, que sí tienen datos personales, deben seguir guardándose solo donde la DSLD los custodia hoy.

## 7. Cifras de control

Si después de una carga las cifras se ven raras, estas son las del último corte validado contra el Power BI:

| Eje | Cifras |
|---|---|
| DEMUNA | 1,892 municipalidades: 869 acreditadas, 853 no acreditadas, 170 no operativas |
| Supervisión | 10,983 supervisiones; 1,691 DEMUNA supervisadas alguna vez |
| Modo Niñez | 545 gobiernos adheridos; 71 presentaron reporte 2026 |
| PIAS | 17,402 personas atendidas: 10,544 NNA, 5,674 madres y padres, 1,184 autoridades |
| Capacitación | 27,445 participaciones aprobadas; 12,803 personas distintas |
| CCONNA | 1,063 conformados: 890 distritales, 147 provinciales, 26 regionales; 6,048 integrantes |
