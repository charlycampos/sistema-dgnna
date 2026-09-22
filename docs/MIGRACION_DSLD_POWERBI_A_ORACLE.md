# 🏛️ PLAN Y ESPECIFICACI×N: MIGRACI×N SUITE DSLD DE POWER BI A ORACLE

Este documento detalla el plan de trabajo oficial, la arquitectura de datos, el flujo de ingesta y la política de persistencia para la **Dirección de Sistemas Locales y Defensorías (DSLD)** en el Sistema DGNNA.

---

## 🙫️ 1. Directiva Mandatoria: Exclusividad Oracle (Cero SQLite)

1. **Persistencia Única:**
   * La única base de datos admitida para la suite DSLD es **Oracle Database** (`XEPDB1`, esquema `gestion_datos_db`).
   * **Queda terminantemente prohibido el uso de SQLite** (en memoria, archivos locales `.db`/`.sqlite` o mecanismos de fallback).
   * Si la conexión a Oracle no está disponible o el esquema no existe, el microservicio debe alertarlo explícitamente y detener la ejecución, sin crear bases de datos temporales.
2. **Cero Mocks en Producción:**
   * Los endpoints del Dashboard consultan directamente las tablas de Oracle (`SELECT`, `COUNT`, `GROUP BY`).
   * Si la base de datos está recién inicializada y vacía, el sistema reportará `0` registros hasta que se ejecute la primera carga real.

---

## 🔈 2. Flujo Integral de Trabajo (Fuentes ➡ Ingesta ➡ Oracle ➚ Dashboard)


[ 1. FUENTES DE DATOS ORIGINALES ]
  “─‐ Access: Z:\DSLD\Base de Datos\DNA.mdb (tablas 'dna' y 'DNA_SUPERVISION')
  ☜─�< Excel:  W:\DEMUNA\TB_CAPA_DEMUNA.xlsx
  “─‐ Excel:  Y:\DSLD_P\CCONNA\*.xlsx
  ☜─�<  Excel:  Y:\DSLD_P\MODO_NIÑMaS*xlsx
  —─‐ Excel:  Y:\DSLD_P\PIAS\*.xlsx
            │
            □ (Subida por archivo o actualización de ruta)
[ 2. MOTOR DE INGESTA Y LIMPIEZA PYTHON (FastAPI :8014) ]
  ☜─� Lectura binaria nativa (access-parser para Access, pandas para Excel)
  ☜─� Pipeline DsldDataCleaner:
  │     • Normalización de UBIGEO a 6 dígitos ('010101')
  │     • Remoción de tildes y caracteres especiales
  │     • Detección oficial de las 869 DEMUNAs Acreditadas
  │
  ■ (Inserción relacional pura)
[ 3. BASE DE DATOS INSTITUCIONAL (Oracle Database - XEPDB1) ]
  ☜─ DRLD_DEMUNAS (Padrón de 1,891 municipalidades y estado de acreditación)
  “─ DSLD_SUPERVISLONES (Registro histórico 2024-2026)
  ☜─ DRLD_CAPECITACIONES (Defensores capacitados por modalidad)
  “─ DSLD_CCONNA (Conformación por género)
  “─ DSLD_MODO_NINEZ (Adhesión territorial)
  —─‐ DSLD_PIAS (Atenciones fluviales)
            │
            □ (Consultas SQL directas / JSON)
[ 4. DASHBOARD WEB NEXT.JS (:3000) ]
  ☜─ Pestaña 1: Situación DEMUNA (Acreditación, Operatividad, Tipologìa)
  ☜─� Pestaña 2: Supervisión DEMUNA (Avance anual vs metas)
  ☜─ Pestaña 3: Capacitación a Defensores (Virtual vs Presencial)
  ☜─� Pestaña 4: CCONNA (Niñas vs Niños)
  ☜─ Pestaña 5: Ponte en Modo Niñez (Macroregiones)
  ☜─ Pestaña 6: PIAS (Cuencas fluviales)
  ☜─ Pestaña 7: Directorio & Padrón (Buscador reactivo + Exportación Excel)


---

## 🔄️ 3. Equema DDL En Oracle (`XEPDB1`)

El script oficial está disponible en:
`servicios/servicio-gestion-datos/infrastructure/db/crear_schema_oracle.sql`

Crea el usuario `gestion_datos_db` con clave `GestionDatos2026` y todas las tablas relacionales requeridas.
