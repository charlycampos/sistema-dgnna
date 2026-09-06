# 📋 Proceso de Gestión y Ciclo de Vida de Apelaciones — DGNNA

Este documento describe el flujo operativo de una apelación desde su ingreso hasta su archivo definitivo (Atendido), los roles involucrados, los datos requeridos en cada fase y la propuesta de **Acciones Rápidas por Estados con Modales Asistidos**.

---

## 🔄 1. Diagrama de Flujo del Proceso

```mermaid
flowchart TD
    classDef inicio fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef etapa fill:#f8fafc,stroke:#64748b,stroke-width:1px,color:#0f172a;
    classDef modal fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#92400e;
    classDef resuelto fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1d4ed8;
    classDef atendido fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#15803d;

    A([📥 1. Registro Inicial]) :::inicio -->|Asignación automática a Abogado| B[Estado: PENDIENTE]
    
    B -->|Si se requiere reasignar| M1["👤 Modal: Cambiar Abogado\n- Seleccionar nuevo Abogado\n- Fecha de Asignación"] :::modal
    M1 --> B
    
    B -->|Abogado culmina proyecto| M2["🔍 Modal: Pasar a Revisor\n- Fecha pase a Resuelto\n- Revisado por (Revisor)\n- Fecha Asignación Revisor [Mismo día / +1 día]"] :::modal
    
    M2 --> C[En Revisión / Control de Calidad]
    
    C -->|Aprobado por Revisor| M3["⚖️ Modal: Pasar a Resuelto\n- Nº de Resolución\n- Fecha de Resolución\n- Resultado de Resolución"] :::modal
    
    M3 --> D[Estado: RESUELTO] :::resuelto
    
    D -->|Notificado a las partes| M4["📬 Modal: Pasar a Atendido\n- Documento Atención (Oficio SGD)\n- Cargos (Pendiente / Recibidos)\n- Observaciones finales"] :::modal
    
    M4 --> E([✅ Estado: ATENDIDO]) :::atendido
```

---

## 👥 2. Etapas del Proceso, Roles y Casillas Exactas

A continuación se detalla cada etapa con **todas las casillas correspondientes** según el formulario oficial del sistema:

---

### 🟢 Etapa 1: Registro Inicial (Automático)
* **Actor:** Registrador / Mesa de Partes (vía `/apelaciones/nueva`).
* **Regla:** El sistema asigna automáticamente al abogado según el balance equitativo de carga o conexidad.
* **Casillas:** Datos del expediente, procedencia, folios, complejidad, apelantes, NNA/CAR, fecha ingreso MIMP, fecha ingreso DGNNA, plazo vencimiento, materia/asunto y abogado asignado automáticamente.
* **Estado inicial:** `Pendiente`.

---

### 👤 Modal 1: «Cambiar / Reasignar Abogado»
* **Cuándo se usa:** Inmediatamente después del registro o durante la tramitación inicial para reasignar a otro profesional si es necesario.
* **Cabecera del Modal (Datos del Caso para verificar):**
  * Nº Expediente | Apelante(s) | NNA / Institución (CAR) | Procedencia | Complejidad y Folios.
* **Casillas de la sección Asignación:**
  1. **Abogado Asignado \*** (Selector con lista de abogados y carga de expedientes).
  2. **Fecha de Asignación \*** (Fecha editable, por defecto la fecha actual).
  3. **Observaciones** (Opcional, motivo del cambio o reasignación).

---

### 🔍 Modal 2: «Asignar a Revisor / Pase a Revisor»
* **Cuándo se usa:** Cuando el abogado asignado termina su labor y el caso pasa a revisión interna de control de calidad/jefatura.
* **Cabecera del Modal (Datos del Caso):**
  * Nº Expediente | Apelante(s) | Abogado Asignado | Fecha de Asignación original | Días en trámite.
* **Casillas de esta sección:**
  1. **Fecha pase a Resuelto** (Fecha en que el abogado concluyó su atención / entregó el proyecto).
  2. **Revisado por** (Selector de revisores disponibles con su carga de casos actual).
  3. **Fecha Asignación Revisor** (Fecha en que se deriva al revisor, con botones rápidos `[Mismo día]` y `[+1 día]`).
  4. **Observaciones** (Notas o alcances para el revisor).

---

### ⚖️ Modal 3: «Pasar a Resuelto» (Resolución Emitida)
* **Cuándo se usa:** Cuando el proyecto de resolución ha sido revisado, aprobado y se cuenta con la resolución oficial.
* **Cabecera del Modal (Datos del Caso):**
  * Nº Expediente | Abogado | Revisor | Fechas de entrega y revisión.
* **Casillas de la sección Resolución:**
  1. **Estado \*** (Se fija en `Resuelto`).
  2. **Fecha pase a Resuelto** (Confirmación de fecha de pase a resuelto).
  3. **Nº de Resolución** (ej. *Resolución Directoral N° 0123-2026-MIMP-DGNNA*).
  4. **Fecha de resolución** (Fecha oficial de emisión de la resolución).
  5. **Resultado de la resolución** (Selector oficial: *Fundado*, *Infundado*, *Improcedente*, *Nulidad de Oficio*, *Desistimiento*, *Caducidad*, *Inadmisible*, etc.).
  6. **Observaciones** (Opcional).

---

### 📬 Modal 4: «Pasar a Atendido» (Notificación y Archivo)
* **Cuándo se usa:** Cuando la resolución ya fue notificada a las partes interesadas y se culmina el expediente.
* **Cabecera del Modal (Datos del Caso):**
  * Nº Expediente | Nº de Resolución emitida | Resultado de la Resolución.
* **Casillas de la sección Notificación:**
  1. **Estado \*** (Se fija en `Atendido`).
  2. **Documento Atención** (Nº de Oficio o Memorando SGD con el que se cursó la resolución).
  3. **Cargos** (Selector de estado: `Pendiente` o `Recibidos`).
  4. **Observaciones** (Anotaciones finales del cierre o archivo).

---

### 👁️ Modal 0: «Ficha Rápida del Caso»
* **Cuándo se usa:** En cualquier momento desde la tabla para comprobar si se está actuando sobre el expediente correcto sin tener que navegar a otra página ni perder los filtros.
* **Datos mostrados:**
  * **Cabecera:** Nº Expediente, Estado actual con su color distintivo, Abogado y Revisor.
  * **Datos Generales:** Fecha Ingreso MIMP/DGNNA, Procedencia, Documento, Asunto.
  * **Partes Procesales:** Apelantes con tipo y documento; NNA / CAR con edades.
  * **Triaje:** Folios, Complejidad, Puntos calculados.
  * **Resolución & Notificación:** Datos registrados si ya los tuviera.

---

## 🎯 Resumen de Botones en la Columna «Acciones»

| Estado del Expediente | Acciones Rápidas en la Tabla |
| :--- | :--- |
| **`Pendiente`** (sin revisor) | 👁️ Ver Ficha &bull; 👤 Cambiar Abogado &bull; 🔍 **Pasar a Revisor** &bull; ✏️ Editar |
| **`Pendiente`** (con revisor asignado) | 👁️ Ver Ficha &bull; ⚖️ **Pasar a Resuelto** &bull; 🔍 Reasignar Revisor &bull; ✏️ Editar |
| **`Resuelto`** | 👁️ Ver Ficha &bull; 📬 **Pasar a Atendido** &bull; ✏️ Editar |
| **`Atendido`** | 👁️ Ver Ficha &bull; ✏️ Editar |


---

## 🎯 Beneficios para el Registrador
1. **No más formularios gigantes:** El registrador no tiene que abrir la pantalla de edición completa de 6 pestañas para solo asignar un revisor o registrar la resolución.
2. **Cero equivocaciones:** Cada modal muestra el resumen superior de ese expediente para certificar que se está trabajando sobre el caso correcto.
3. **Flujo secuencial natural:** Registro ➔ Asignar ➔ Proyecto Resuelto ➔ Notificado / Atendido.
