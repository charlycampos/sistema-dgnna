# Sistema Integral DGNNA — Ministerio de la Mujer y Poblaciones Vulnerables (MIMP)

## 📌 Descripción General
Plataforma web modular de alta disponibilidad para la Dirección General de Niñas, Niños y Adolescentes (DGNNA - MIMP). Centraliza la gestión operativa, jurídica y administrativa en **13 servicios distribuidos en contenedores Docker**:

1. **Gestión de Recursos de Apelación y Triaje Jurídico** (SLA y balanceo de carga).
2. **Restitución y Sustracción Internacional de Menores** (Convenio de La Haya 1980 / Directiva 006-2021-MIMP).
3. **Seguimiento de Proyectos de Ley del Congreso** (Opiniones técnicas y alertas).
4. **Solicitudes de Transparencia y Acceso a la Información** (Ley 27806).
5. **Reserva y Disponibilidad de Salas de Reunión**.
6. **Plan Operativo Institucional y Presupuesto por Resultados (POI - PP 0117)**.
7. **Mapa Interactivo y Cobertura Territorial de Servicios (UPE, CAR, DEMUNA)**.
8. **Intervenciones Preventivas y de Protección (Estrategia Prevenir / Proteger)**.
9. **Módulo de Auditoría y Trazabilidad Global** (Historial inmutable, comparador Diff de campos y reportes Excel).
10. **Consulta Normativa y Asistente RAG Multi-LLM** (ChatGPT, Gemini, Claude anclado en 398 artículos de DL 1297 y Reglamento).
11. **Autenticación Unificada y Control de Accesos por Módulo (RBAC)**.
12. **API Gateway Central**.
13. **Frontend Unificado Next.js 16 / React 19**.

---

## 🏗️ Arquitectura Técnica
* **Frontend:** [Next.js 16 (App Router)](https://nextjs.org/) + React 19 + Tailwind CSS + Lucide Icons.
* **API Gateway & Microservicios:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11) + SQLAlchemy 2.0.
* **Motor RAG & Multi-LLM:** OpenAI GPT-4o + Google Gemini 1.5/2.0 Flash + Anthropic Claude 3.5 con fallback cascade y búsqueda vectorial en memoria con NumPy.
* **Bases de Datos:** Oracle Database XE 21c (PDB `XEPDB1`) con esquemas dedicados por microservicio + soporte SQLite para contingencia.
* **Contenedores:** Docker & Docker Compose con red bridge interna `dgnna-net`.

Para consultar el mapa topológico completo y los diagramas Mermaid, revisa el archivo:  
👉 **[ARQUITECTURA_DOCKER.md](ARQUITECTURA_DOCKER.md)**

---

## 🚀 Puesta en Marcha Rápida (Docker)

1. **Levantar todo el ecosistema (13 contenedores):**
   ```powershell
   docker compose up -d
   ```

2. **Verificar estado de los contenedores:**
   ```powershell
   docker compose ps
   ```

3. **Acceso Web:**
   * **Aplicación Principal:** [http://localhost:3000](http://localhost:3000)
   * **Módulo de Consulta Normativa:** [http://localhost:3000/normativa](http://localhost:3000/normativa)
   * **Módulo de Auditoría:** [http://localhost:3000/auditoria](http://localhost:3000/auditoria)
   * **API Gateway Health:** [http://localhost:8000/health](http://localhost:8000/health)
   * **Documentación Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 👥 Equipo y Perfiles
Consulte **[AGENTS.md](AGENTS.md)** para conocer las responsabilidades de UX/UI, QA normativo y arquitectura fullstack.

