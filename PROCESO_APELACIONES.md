# 📋 Proceso de Gestión y Ciclo de Vida de Apelaciones — DGNNA

Este documento define la secuencia operativa del trámite de una apelación en el Sistema DGNNA, el cuadro de estados y botones de acción rápida en la tabla, y el **diseño detallado de cada modal interactivo**.

---

## 🔄 1. Diagrama de Flujo del Proceso

```mermaid
flowchart TD
    classDef inicio fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef pendiente fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e;
    classDef modal fill:#fffbeb,stroke:#b45309,stroke-width:1.5px,color:#78350f;
    classDef resuelto fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1d4ed8;
    classDef atendido fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#15803d;

    A([📥 Registro Inicial]) :::inicio -->|Asignación automática| B[Estado: PENDIENTE\nAbogado elabora proyecto] :::pendiente

    B -.->|Opcional| M1["👤 Modal: Cambiar Abogado\n- Abogado Asignado *\n- Fecha de Asignación *"] :::modal
    M1 -.-> B

    B -->|Se deriva al revisor| M2["🔍 Modal: Pasar a Revisor\n- Fecha pase a Resuelto\n- Revisado por *\n- Fecha Asignación Revisor * [Mismo día / +1 día]"] :::modal

    M2 --> C[Estado: PENDIENTE\nCon Revisor asignado / En revisión] :::pendiente

    C -->|Borrador aprobado / Resolución emitida| M3["⚖️ Modal: Pasar a Resuelto\n- Estado: Resuelto\n- Fecha pase a Resuelto *\n- Nº de Resolución *\n- Fecha de resolución *\n- Resultado de la resolución *"] :::resuelto

    M3 --> D[Estado: RESUELTO\nResolución Oficial Expedida] :::resuelto

    D -->|Resolución notificada a las partes| M4["📬 Modal: Pasar a Atendido\n- Estado: Atendido\n- Documento Atención (Oficio SGD) *\n- Cargos (Pendiente / Recibidos) *"] :::modal

    M4 --> E([✅ Estado: ATENDIDO\nExpediente Notificado y Concluido]) :::atendido
```

---

## 🎯 2. Cuadro Oficial de Botones en la Columna «Acciones»

| Si el expediente está en: | Botones visibles en Acciones (Solo Iconos con Tooltip): |
| :--- | :--- |
| **`Pendiente` (sin revisor)** | 👁️ `[Eye]` (Ver Datos) &bull; 👤 `[UserCheck]` (Cambiar Abogado) &bull; 🔍 `[Search]` (Pasar a Revisor) &bull; ✏️ `[Pencil]` (Editar) |
| **`Pendiente` (con revisor)** | 👁️ `[Eye]` (Ver Datos) &bull; 👤 `[UserCheck]` (Cambiar Abogado) &bull; ⚖️ `[Scale]` (Pasar a Resuelto) &bull; 🔍 `[Search]` (Cambiar Revisor) &bull; ✏️ `[Pencil]` (Editar) |
| **`Resuelto`** | 👁️ `[Eye]` (Ver Datos) &bull; 📬 `[Send]` (Pasar a Atendido) &bull; ✏️ `[Pencil]` (Editar) |
| **`Atendido`** | 👁️ `[Eye]` (Ver Datos) &bull; ✏️ `[Pencil]` (Editar) |

---

## 🎨 3. Diseños de Cada Modal (Mockups Visuales y Casillas)

Todos los modales cuentan con una **Tarjeta de Datos del Caso** en la parte superior para que el registrador verifique de inmediato el expediente sobre el que está actuando sin tener que ir a otra pantalla.

---

### 👁️ MODAL 0: «Ficha Rápida: Datos del Caso»
* **Acceso:** Botón 👁️ (en cualquier estado).
* **Propósito:** Inspección completa del caso en una sola ventana emergente rápida.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 👁️ Ficha del Expediente: 0142-2026-DGNNA                    [Estado: PENDIENTE] │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📌 DATOS GENERALES                                                          │
│   • Procedencia: UPE Lima Centro         • Fecha Ingreso DGNNA: 10/02/2026  │
│   • Documento: Oficio 452-2026-UPE       • Plazo Vencimiento: 25/03/2026    │
│   • Asunto: Impugnación de medida de protección provisional de acogimiento. │
├─────────────────────────────────────────────────────────────────────────────┤
│ 👥 PARTES PROCESALES                                                        │
│   • Apelante(s): Juan Carlos Pérez Quispe (DNI 45892147) - Padre             │
│   • NNA / CAR:   M.P.Q. (8 años), J.P.Q. (5 años)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ ⚖️ COMPLEJIDAD JURÍDICA                                                     │
│   • Complejidad Jurídica: Alta                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ ⚖️ ESTADO DE ASIGNACIÓN                                                     │
│   • Abogado Asignado: Abog. Claudia Torres (Asignado: 11/02/2026)          │
│   • Revisor:          Abog. Martín Ramos   (Derivado: 18/02/2026)          │
│   • Pase a Resuelto:  18/02/2026                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📜 RESOLUCIÓN / NOTIFICACIÓN (Si aplica)                                    │
│   • Resolución: RD N° 0089-2026-MIMP-DGNNA (22/02/2026) - FUNDADO EN PARTE  │
│   • Documento Atención: Oficio 120-2026-DGNNA | Cargos: RECIBIDOS           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                              [Cerrar Ficha] │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 👤 MODAL 1: «Cambiar / Reasignar Abogado»
* **Acceso:** Botón 👤 (En estado `Pendiente`).
* **Propósito:** Reasignar el caso a otro profesional y ajustar su fecha de asignación.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 👤 Reasignar Abogado Responsable                                            │
│ Modificar el abogado a cargo de la elaboración del proyecto de resolución.  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📋 Resumen del Caso:                                                        │
│   Expediente: 0142-2026-DGNNA | Apelante: Juan Carlos Pérez Quispe         │
│   NNA: M.P.Q. (8 años) | Complejidad Jurídica: Alta                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Abogado Asignado *                                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [Abog. Roberto Carlos Salazar (Carga actual: 12 casos - 48 pts)     ▼]│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Fecha de Asignación *                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [ 15/02/2026                                                        📅]│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Observaciones / Motivo de Reasignación (Opcional)                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Redistribución por licencia médica del titular anterior...            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                [Cancelar]  [💾 Guardar Abogado]│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 🔍 MODAL 2: «Pasar a Revisor»
* **Acceso:** Botón 🔍 (En estado `Pendiente` - pasa o cambia de revisor).
* **Propósito:** Registrar que el abogado culminó su proyecto y derivarlo al revisor asignado.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔍 Derivar a Revisor (Control de Calidad)                                  │
│ Asignar el revisor que validará el borrador del proyecto de resolución.     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📋 Resumen del Caso:                                                        │
│   Expediente: 0142-2026-DGNNA | Elaborado por: Abog. Claudia Torres         │
│   Apelante: Juan Carlos Pérez Quispe | NNA: M.P.Q. (8 años)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Fecha pase a Resuelto (Fecha entrega del borrador)                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [ 20/02/2026                                                        📅]│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ℹ️ Fecha en que el profesional concluyó la atención y entregó el proyecto. │
│                                                                             │
│  Revisado por *                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [Abog. Martín Ramos Córdova (Carga: 4 casos en revisión)            ▼]│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Fecha Asignación Revisor *           [Atajos: Mismo día | +1 día]          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [ 21/02/2026                                                        📅]│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ℹ️ Fecha en que se derivó el expediente al revisor para su visación.       │
│                                                                             │
│  Observaciones para el Revisor (Opcional)                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Proyecto con especial énfasis en informe psicológico anexo a fojas 45.│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                [Cancelar]  [💾 Asignar Revisor]│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### ⚖️ MODAL 3: «Pasar a Resuelto»
* **Acceso:** Botón ⚖️ (En estado `Pendiente (con revisor)`).
* **Propósito:** Registrar la resolución oficial emitida tras la revisión y cambiar de estado a `Resuelto`.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚖️ Pasar a Resuelto (Resolución Oficial)                                     │
│ Registrar los datos de la resolución oficial emitida por la Dirección.     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📋 Resumen del Caso:                                                        │
│   Expediente: 0142-2026-DGNNA | Abogado: Claudia Torres | Revisor: M. Ramos │
│   Apelante: Juan Carlos Pérez Quispe | NNA: M.P.Q. (8 años)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Nuevo Estado:                                                              │
│  [🔵 RESUELTO] (Se actualizará automáticamente)                             │
│                                                                             │
│  ┌───────────────────────────────────┬───────────────────────────────────┐  │
│  │ Nº de Resolución *                │ Fecha de resolución *             │  │
│  │ [RD N° 0089-2026-MIMP-DGNNA     ] │ [ 24/02/2026                   📅] │  │
│  └───────────────────────────────────┴───────────────────────────────────┘  │
│                                                                             │
│  Resultado de la resolución *                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [Fundado en parte                                                   ▼]│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  Opciones: Fundado | Fundado en parte | Infundado | Improcedente | Nulidad   │
│            de Oficio | Desistimiento | Caducidad | Inadmisible              │
│                                                                             │
│  Fecha pase a Resuelto (Confirmación)                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ [ 20/02/2026                                                        📅]│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Observaciones (Opcional)                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Se dispone reevaluación por parte del equipo multidisciplinario...    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                              [Cancelar]  [💾 Pasar a Resuelto]│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 📬 MODAL 4: «Pasar a Atendido»
* **Acceso:** Botón 📬 (En estado `Resuelto`).
* **Propósito:** Notificar la resolución a las partes y culminar el trámite (estado `Atendido` - Verde).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📬 Pasar a Atendido (Cierre y Notificación)                                 │
│ Registrar el oficio de atención y cargos de notificación a los involucrados.│
├─────────────────────────────────────────────────────────────────────────────┤
│ 📋 Resumen del Caso:                                                        │
│   Expediente: 0142-2026-DGNNA | Resolución: RD N° 0089-2026-MIMP-DGNNA     │
│   Sentido: FUNDADO EN PARTE | Apelante: Juan Carlos Pérez Quispe            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Nuevo Estado:                                                              │
│  [🟢 ATENDIDO] (Se actualizará automáticamente a verde)                     │
│                                                                             │
│  ┌───────────────────────────────────┬───────────────────────────────────┐  │
│  │ Documento Atención *              │ Cargos de Notificación *          │  │
│  │ [Oficio N° 0120-2026-MIMP-DGNNA ] │ [Recibidos                      ▼]│  │
│  └───────────────────────────────────┴───────────────────────────────────┘  │
│                                        Opciones: Pendiente | Recibidos      │
│                                                                             │
│  Observaciones Finales / Archivo (Opcional)                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Notificado a UPE Lima Centro y al apelante con cédula SGD 88921.      │  │
│  │ Expediente devuelto a su archivo de origen.                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                              [Cancelar]  [💾 Pasar a Atendido]│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 4. Ventajas Ergonómicas y Operativas

1. **Agilidad Extrema (1 Clic):** No se entra a la página de edición completa de 6 pestañas salvo para correcciones profundas de fondo (como agregar otro NNA o cambiar folios).
2. **Contexto Visible Inmediato:** Cada modal muestra arriba el número de expediente, los nombres del apelante y del NNA, garantizando que el usuario jamás se equivoque de fila.
3. **Botones Contextuales Inteligentes:** La tabla solo muestra los botones que tienen sentido para el estado actual de cada caso.
4. **Validación Segura:** Todas las casillas se sincronizan mediante la API estándar (`PUT /api/apelaciones/[id]`) respetando las validaciones y los recálculos automáticos de carga.
