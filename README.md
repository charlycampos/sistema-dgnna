# Sistema Integral DGNNA — Ministerio de la Mujer y Poblaciones Vulnerables (MIMP)

## 📌 Descripción General
Plataforma web modular de alta disponibilidad para la Dirección General de Niñas, Niños y Adolescentes (DGNNA - MIMP). Centraliza la gestión operativa, analítica, jurídica y administrativa en **16 servicios distribuidos en contenedores Docker**:

1. **Gestión de Recursos de Apelación y Triaje Jurídico** (SLA y balanceo de carga).
2. **Restitución y Sustracción Internacional de Menores** (Convenio de La Haya 1980 / Directiva 006-2021-MIMP).
3. **Seguimiento de Proyectos de Ley del Congreso** (Opiniones técnicas y alertas).
4. **Solicitudes de Transparencia y Acceso a la Información** (Ley 27806).
5. **Reserva y Disponibilidad de Salas de Reunión**.
6. **Plan Operativo Institucional y Presupuesto por Resultados (POI - PP 0117)**.
7. **Mapa Interactivo y Cobertura Territorial de Servicios (UPE, CAR, DEMUNA)**.
8. **Módulo de Gestión de Datos y Tableros de Mando de Direcciones de Línea**:
   * **Catálogo de Datasets y Repositorio Institucional** (`/gestion-datos`)
   * **Situación DEMUNA / DSLD** (`/gestion-datos/dsld`)
   * **Situación CAR / DPNNA** (`/gestion-datos/dpnna`)
   * **Situación Adopciones / DA** (`/gestion-datos/adopciones`)
   * **Situación DPE (Línea ANNA 1810, BFA y UPE)** (`/gestion-datos/dpe`)
9. **Intervenciones Preventivas y de Protección (Estrategia Prevenir / Proteger)**.
10. **Módulo de Auditoría y Trazabilidad Global** (Historial inmutable, comparador Diff de campos y reportes Excel).
11. **Consulta Normativa y Asistente RAG Multi-LLM** (ChatGPT, Gemini, Claude anclado en 398 artículos de DL 1297 y Reglamento).
12. **Módulo de Ayudas Memoria y Fichas Ejecutivas de Dirección** (`/ayuda-memoria`).
13. **Tableros de Control de Direcciones de Línea** (Monitoreo analítico y Power BI de DSLD, DPNNA, DPE y DA).
14. **Autenticación Unificada y Control de Accesos por Módulo (RBAC)**.
15. **API Gateway Central**.
16. **Frontend Unificado Next.js 16 / React 19**.

---

## 🏗️ Arquitectura Técnica
* **Frontend:** [Next.js 16 (App Router)](https://nextjs.org/) + React 19 + Tailwind CSS + Lucide Icons + Recharts.
* **API Gateway & Microservicios:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11) + SQLAlchemy 2.0.
* **Motor RAG & Multi-LLM:** OpenAI GPT-4o + Google Gemini 1.5/2.0 Flash + Anthropic Claude 3.5 con fallback cascade y búsqueda vectorial en memoria con NumPy.
* **Bases de Datos:** Oracle Database XE 21c (PDB `XEPDB1`) con esquemas dedicados por microservicio + soporte SQLite para contingencia.
* **Contenedores:** Docker & Docker Compose con red bridge interna `dgnna-net`.

Para consultar el mapa topológico completo y los diagramas Mermaid, revisa el archivo:  
👉 **[ARQUITECTURA_DOCKER.md](ARQUITECTURA_DOCKER.md)**

---

## 🚀 Puesta en Marcha Rápida (Docker)

0. **Configurar el secreto de sesión (obligatorio, una sola vez):**
   ```powershell
   copy .env.example .env
   ```
   Luego abre `.env` y reemplaza `SESSION_SECRET=` por un valor generado con
   `openssl rand -hex 32` (o cualquier cadena aleatoria larga). Este secreto
   firma las cookies de sesión de todos los servicios y del frontend — ya no
   existe un valor por defecto en el código; si falta, los contenedores no
   arrancan.

1. **Levantar todo el ecosistema:**
   ```powershell
   docker compose up -d
   ```

2. **Verificar estado de los contenedores:**
   ```powershell
   docker compose ps
   ```

3. **Acceso Web:**
   * **Aplicación Principal:** [http://localhost:3000](http://localhost:3000)
   * **Módulo de Gestión de Datos (DPE / CAR / Adopciones / DEMUNA):** [http://localhost:3000/gestion-datos](http://localhost:3000/gestion-datos)
   * **Tableros Direcciones de Línea (Power BI / DSLD):** [http://localhost:3000/tableros-direcciones](http://localhost:3000/tableros-direcciones)
   * **Módulo de Consulta Normativa:** [http://localhost:3000/normativa](http://localhost:3000/normativa)
   * **Módulo de Auditoría:** [http://localhost:3000/auditoria](http://localhost:3000/auditoria)
   * **Módulo POI - PP 0117:** [http://localhost:3000/poi-pp117/dashboard](http://localhost:3000/poi-pp117/dashboard)
   * **API Gateway Health:** [http://localhost:8000/health](http://localhost:8000/health)
   * **Documentación Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 👥 Equipo y Perfiles
Consulte **[AGENTS.md](AGENTS.md)** para conocer las responsabilidades de UX/UI, QA normativo y arquitectura fullstack.

