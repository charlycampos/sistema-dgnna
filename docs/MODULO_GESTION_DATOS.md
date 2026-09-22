# 📊 MÓDULO DE GESTIÓN DE DATOS Y TABLEROS ANALÍTICOS DE DIRECCIONES DE LÍNEA
## Dirección General de Niñas, Niños y Adolescentes (DGNNA — MIMP)

Este documento describe la arquitectura, estructura funcional, componentes analíticos, flujos de importación y variables estratégicas del módulo **Gestión de Datos** y sus tableros situacionales dedicados por Dirección de Línea.

---

## 🎯 1. Objetivo y Alcance

Centralizar, procesar, visualizar y permitir la exportación técnica de los datos operativos y estratégicos generados por las cuatro (4) Direcciones de Línea de la DGNNA:
1. **DSLD:** Dirección de Sistemas Locales y Defensorías (DEMUNA).
2. **DPNNA:** Dirección de Políticas de Niñas, Niños y Adolescentes (Centros de Acogida Residencial - CAR).
3. **DA:** Dirección de Adopciones (Procedimientos y familias adoptantes).
4. **DPE:** Dirección de Protección Especial (Línea ANNA 1810, Banco de Familias Acogedoras - BFA y Unidades de Protección Especial - UPE).

---

## 🧭 2. Estructura de Navegación y Rutas

| Bandeja / Tablero | Ruta Frontend | Icono | Propósito Principal |
| :--- | :--- | :---: | :--- |
| **Catálogo de Datasets** | `/gestion-datos` | `Database` | Inventario centralizado de datasets, metadatos, periodicidad y descargas. |
| **Situación DEMUNA (DSLD)** | `/gestion-datos/dsld` | `Home` | Padrón nacional de DEMUNA, acreditación, tipología y atenciones. |
| **Situación CAR (DPNNA)** | `/gestion-datos/dpnna` | `Building2` | Directorio nacional de CAR públicos/privados, capacidad vs población e infractores. |
| **Situación Adopciones (DA)** | `/gestion-datos/adopciones` | `HeartHandshake` | Solicitudes nacionales/internacionales, tiempos de trámite y NNA adoptados. |
| **Situación DPE (DPE)** | `/gestion-datos/dpe` | `ShieldAlert` | Monitor 3-en-1: Línea 1810, Acogimiento Familiar y Medidas UPE. |

---

## 📈 3. Detalle de los Tableros por Dirección

### 🏠 A. Situación DEMUNA (`/gestion-datos/dsld`)
* **KPIs Clave:**
  * Total DEMUNAs Registradas a nivel nacional.
  * DEMUNAs Acreditadas para Procedimiento por Riesgo (D.L. 1297).
  * Cobertura Distrital y Provincial.
* **Componentes Visuales:**
  * Distribución por Estado de Acreditación (Acreditadas, Registradas, En Trámite).
  * Tipología Municipal (Provincial, Distrital, Centro Poblado).
  * Ranking de DEMUNAs por Departamento y carga de atenciones.

---

### 🏢 B. Situación Centros de Acogida Residencial - CAR (`/gestion-datos/dpnna`)
* **Esquema de Base de Datos:** `GESTION_DATOS_DB` (Oracle Database).
* **Fuentes Oficiales (Excels DPNNA):**
  1. `BASE_RENE_CENTROS_2026_CAR.xlsx`: 54 centros CAR públicos y privados acreditados (25 variables).
  2. `RENE CAR NNA BÁSICO JUN 2026.xlsx`: 1,342 NNA albergados en CAR Básico (143 variables).
  3. `RENE CAR NNA ESPECIALIZADO ok.xlsx`: 289 NNA albergados en CAR Especializado (141 variables).
  4. `RENE CAR NNA URGENCIA ok.xlsx`: 194 NNA en CAR de Urgencias (64 variables).
* **Modelo Físico en Oracle (`GESTION_DATOS_DB`):**
  * `CAR_CENTROS`: Directorio maestro de centros (capacidad instalada/real, acreditación, vigencia, geolocalización).
  * `CAR_CARGAS`: Registro histórico de auditoría por importación quincenal/mensual.
  * `CAR_CARGA_FILAS_RAW`: Almacenamiento 100% íntegro de la fila en formato JSON/CLOB (inmutabilidad y auditoría).
  * `CAR_NNA_CORTES`: Capa analítica y tipada con cortes temporales (`ES_ULTIMO_CORTE = 'S'`).
* **Seguridad y Encriptación (Ley N.° 29733 de Protección de Datos Personales):**
  * **Cifrado Reversible (AES-256-GCM):** Nombres, Apellidos y Número de Documento encriptados en reposo (`TXT_NOMBRES_ENC`, `NRO_DOC_ENC`).
  * **Blind Index (HMAC-SHA256):** Índice ciego determinista (`TXT_NOM_COMPLETO_HASH`, `NRO_DOC_HASH`) para búsquedas exactas instantáneas y comparaciones temporales sin desencriptar toda la base.
  * **Enmascaramiento en UI:** Visualización por defecto con máscara (`J*** P***`), descifrable únicamente por usuarios con roles autorizados.
* **Enfoque de Alto Mando (Directora General DGNNA):**
  * **Directorio Nominal Exclusivo para Centros CAR:** Ficha de los 54 centros con capacidad instalada vs. real, porcentaje de saturación, semáforo de acreditación (RD) y ubicación.
  * **Agregación Cuantitativa para NNA (Sin exposición nominal en bandeja):** Análisis macro y alertas de decisión estratégica para Básico, Especializado y Urgencia.
* **Estructura de Pestañas del Panel:**
  1. **Directorio de Centros CAR:** Padrón de 54 centros, filtros por departamento, acreditación y semáforo de saturación (sobredemanda >100%, alerta 85-100%, disponible <85%). Exportación a Excel.
  2. **CAR Básico — Desinstitucionalización y Garantía de Derechos (1,344 NNA):** Alerta crítica SLA > 18 meses (46.8% en estancias prolongadas), cobertura de Plan de Trabajo Individual (PTI aprobado vs. pendiente), distribución por sexo y grupos etarios, top de causales legales de desprotección.
  3. **CAR Especializado — Salud y Discapacidad (291 NNA):** Población con multidiscapacidad severa (62.2%), permanencia > 18 meses, y centros con mayor carga especializada.
  4. **CAR Urgencia — Transitoriedad (196 NNA):** Días promedio de estancia (148 días), contingencia de NNA varados en urgencia > 30 días, y capacidad de respuesta inmediata.
* **Modal de Importación Periódica:** Carga directa de los Excels actualizados quincenal o mensualmente con encriptación AES-256 en reposo y actualización instantánea de indicadores.

---

### 🤝 C. Situación Adopciones (`/gestion-datos/adopciones`)
* **KPIs Clave:**
  * Solicitudes de Adopción (Nacionales vs. Internacionales).
  * Familias Evaluadas y Declaradas Aptas.
  * Adopciones Concluidas y Designaciones Efectivas.
* **Gráficos e Indicadores:**
  * Evolución de tiempos promedio del procedimiento administrativo.
  * Perfil de NNA adoptados (Grupo etario, grupo de hermanos y necesidades especiales/médicas).
  * Flujo de procedencias por sede descentralizada de adopciones.

---

### 🛡️ D. Situación Dirección de Protección Especial - DPE (`/gestion-datos/dpe`)
El tablero DPE integra tres (3) pestañas interactivas independientes:

#### 1. 📞 Línea ANNA 1810:
* **Métricas:** Total llamadas atendidas (75k+), Tasa de Efectividad en atención de urgencias (51.1%), NNA Identificados (4,955).
* **Distribución:**
  * Grupo etario (0-5 años: 29%, 6-11 años: 36%, 12-17 años: 35%).
  * Tipología de reportante (Comunidad, Madre, Padre, NNA directo, Otros).
  * Derivaciones interinstitucionales (52.3% derivadas a UPE, DEMUNA, CEM, PNP).

#### 2. 👨‍👩‍👧‍👦 Acogimiento Familiar (BFA):
* **Métricas:** 2,730 Solicitudes de Familias, 1,122 Familias Declaradas Aptas (BFA), 1,244 NNA Acogidos.
* **Distribución:**
  * Canales de captación (UPE: 46.3%, Web MIMP: 34.7%, INABIF: 11.4%).
  * Perfil de NNA (Grupo 1: 0-5 años, Grupo 2: 6-12 años, Grupo 3: 13-17 años; 59% niñas, 41% niños).
  * Top sedes UPE de procedencia de solicitudes.

#### 3. 🏛️ Unidades de Protección Especial (UPE):
* **Métricas:** 232,124 Ingresos Históricos, 47,006 Medidas Dictadas, 76,539 Procedimientos Concluidos, 29,939 Reintegraciones Familiares.
* **Distribución:**
  * Medidas de Protección: Evolución hacia la desinstitucionalización (Acogimiento Familiar 73% vs. Acogimiento Residencial 27% en 2025).
  * Causales de conclusión (Reintegración familiar 39.1%, Mayoría de edad 24.8%, Desprotección judicial 20.3%).
  * Ranking de carga procesal por sedes UPE a nivel nacional.

---

## 📥 4. Exportación y Descarga de Información

Todas las bandejas cuentan con un botón de **Exportación a Excel (`.xlsx`)** implementado mediante la librería cliente `xlsx`, permitiendo a los directores y especialistas descargar:
1. Registros tabulares completos y filtrados.
2. Metadatos de la consulta (fecha de corte, usuario solicitante y fuente oficial).

---

## 🔒 5. Seguridad y Autenticación

* **Acceso por Perfil:** Protegido mediante middleware de sesión (`useMe`) y tokens JWT con algoritmo `HS256`.
* **Sincronización:** Los endpoints están mapeados en el API Gateway (`:8000`) y resueltos por el microservicio `gestion-datos-service` (`:8014`).
