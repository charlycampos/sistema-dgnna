# Módulo 14 — Tableros de Control de Direcciones de Línea (DSLD, DPNNA, DPE, DA)
### Estado: ✅ IMPLEMENTADO EN FRONTEND Y ACTIVO (Integración Power BI DSLD en Producción)

> **Propósito:** Centralizar el monitoreo analítico, indicadores de gestión y tableros interactivos de las cuatro direcciones de línea de la **Dirección General de Niñas, Niños y Adolescentes (DGNNA - MIMP)**:
> 1. **DSLD** — Dirección de Sistemas Locales y Defensorías
> 2. **DPNNA** — Dirección de Políticas de Niñas, Niños y Adolescentes
> 3. **DPE** — Dirección de Protección Especial
> 4. **DA** — Dirección de Adopciones

---

## 1. Alcance Operativo e Institucional

El módulo responde a la necesidad de la Alta Dirección y de los equipos de línea del MIMP de supervisar en un único punto de mando la información estadística y operativa generada en el ámbito territorial y nacional:

| Dirección | Sigla | Ámbito Principal | Estado de Tablero |
| :--- | :---: | :--- | :---: |
| **Dirección de Sistemas Locales y Defensorías** | `DSLD` | Supervisión, registro y acreditación de Defensorías Municipales (DEMUNA) a nivel nacional. | 🟢 **Activo** (Power BI V3 Oficial) |
| **Dirección de Políticas de Niñas, Niños y Adolescentes** | `DPNNA` | Políticas públicas, Plan Nacional de Acción por la Infancia y Adolescencia (PNAIA), CCONNA. | 🟡 *En modelado* |
| **Dirección de Protección Especial** | `DPE` | Unidades de Protección Especial (UPE), medidas de protección por desprotección familiar. | 🟡 *En modelado* |
| **Dirección de Adopciones** | `DA` | Procedimientos administrativos de adopción, familias aptas y designaciones especiales. | 🟡 *En modelado* |

---

## 2. Arquitectura y Convenciones Técnicas

Siguiendo el estándar de microservicios y base de datos del **Sistema Integral DGNNA**:

### A. Frontend (Next.js 16 / React 19)
* **Ruta Server Component:** `/tableros-direcciones` ([page.tsx](file:///d:/Usuarios/ccampos/Documents/Python%20Scripts/asigna_apelaciones/sistema-dgnna/frontend/src/app/tableros-direcciones/page.tsx)) con validación estricta de sesión con `getSession()`.
* **Componente de Interfaz:** [TablerosDireccionesClient.tsx](file:///d:/Usuarios/ccampos/Documents/Python%20Scripts/asigna_apelaciones/sistema-dgnna/frontend/src/app/tableros-direcciones/TablerosDireccionesClient.tsx).
* **Tarjeta en Menú Principal:** Ubicada en [MenuClient.tsx](file:///d:/Usuarios/ccampos/Documents/Python%20Scripts/asigna_apelaciones/sistema-dgnna/frontend/src/app/menu/MenuClient.tsx) con icono `LayoutDashboard`.

### B. Especificación del Servicio Backend (Proyección Docker / Microservicio)
* **Servicio:** `servicio-tableros` / `tableros-service`
* **Puerto Host / Contenedor:** `8012`
* **Contenedor:** `dgnna-tableros-service-1`
* **Red:** `dgnna-net` (Bridge)
* **Ruta en API Gateway (`servicios/api-gateway/main.py`):**
  ```python
  ("/api/tableros", "tableros-service:8012")
  ```

### C. Esquema de Base de Datos (Oracle XE 21c — `TABLEROS_DB`)
```sql
CREATE TABLE TABLEROS_DIRECCION (
    ID                NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    CODIGO_DIRECCION  VARCHAR2(10)  NOT NULL, -- 'DSLD', 'DPNNA', 'DPE', 'DA'
    TITULO            VARCHAR2(200) NOT NULL,
    SUBTITULO         VARCHAR2(300),
    TIPO              VARCHAR2(20)  DEFAULT 'powerbi' NOT NULL, -- 'powerbi', 'kpi', 'iframe'
    URL_EMBED         VARCHAR2(1000),
    DESCRIPCION       VARCHAR2(2000),
    ESTADO            VARCHAR2(20)  DEFAULT 'activo' NOT NULL, -- 'activo', 'desarrollo', 'planificado'
    ORDEN             NUMBER        DEFAULT 1,
    ACTIVO            NUMBER(1)     DEFAULT 1 NOT NULL,
    CREADO_EN         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Ergonomía y Diseño UX/UI (Directrices AGENTS.md)

### 2. Estructura y Ergonomía del Frontend
- **Pantalla de Inicio (Home / Bienvenida):**
  - Al ingresar por primera vez al módulo (`/tableros-direcciones`), ya **no** se abre directamente el reporte de DSLD ni de ninguna dirección.
  - Se muestra una pantalla de bienvenida con un banner informativo y un **grid de tarjetas interactivas** para cada una de las 4 Direcciones de Línea (DSLD, DPNNA, DPE, DA) indicando el estado de sus tableros (En Línea PBI / Planificado).
  - El usuario puede hacer clic en cualquiera de las tarjetas ("Ingresar a DSLD") o en las opciones del menú lateral para cargar el tablero interactivo respectivo.
  - En la parte superior del menú lateral y en la cabecera del visor se incluye el botón **"Inicio / Resumen General"** con ícono de Home para regresar a esta vista en cualquier momento.
- **Menú Lateral Izquierdo por Direcciones:**
  - Acordeones colapsados por defecto en el inicio (`DSLD`, `DPNNA`, `DPE`, `DA`).
  - Despliegue al hacer clic o al filtrar por texto en el buscador.
- **Visor Interactivo:**
  - Carga el `<iframe>` oficial de Power BI con Skeleton de carga, pantalla completa nativa (`requestFullscreen`), recarga dinámica y opción de compartir enlace directo con parámetro `?id=`.

---

## 4. Enlace Oficial DSLD Embebido

```html
<iframe 
  title="DSLD_GENERAL_V3" 
  width="100%" 
  height="100%" 
  src="https://app.powerbi.com/view?r=eyJrIjoiZDljNTIzNDctNTg2Yy00MWFjLWE4M2ItYzQ1NDc5MTZjMjg1IiwidCI6IjY4MTljNDYzLTVkZWItNDA3MC1hY2I2LTlmZGQzY2FhZTk4NCJ9" 
  frameborder="0" 
  allowFullScreen="true"
/>
```

---

## 5. Control de Calidad y Validación

* **TypeScript Compilation:**
  ```powershell
  npx tsc --noEmit
  ```
  Salida: **0 errores de compilación**.
