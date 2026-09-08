# 🔄 Flujo del Proceso: Gestión de Apelaciones — DGNNA

Este documento define el **flujo del procedimiento administrativo de apelaciones en segunda instancia**, basado en el estándar BPMN oficial (carriles por actor y trazabilidad documentaria institucional).

---

## 🗺️ 1. Diagrama BPMN del Proceso por Carriles (Mermaid)

```mermaid
flowchart TD
    classDef actor fill:#f8fafc,stroke:#475569,stroke-width:1.5px,color:#0f172a;
    classDef inicio fill:#86efac,stroke:#16a34a,stroke-width:2px,color:#14532d;
    classDef actividad fill:#e0f2fe,stroke:#0284c7,stroke-width:1.5px,color:#0369a1;
    classDef decision fill:#fef08a,stroke:#ca8a04,stroke-width:2px,color:#713f12;
    classDef fin fill:#fca5a5,stroke:#dc2626,stroke-width:2px,color:#7f1d1d;
    classDef doc fill:#f1f5f9,stroke:#94a3b8,stroke-width:1px,stroke-dasharray: 5 5,color:#334155;

    %% ==========================================
    %% CARRILES / SWIMLANES (GESTIÓN APELACIONES DGNNA)
    %% ==========================================

    %% CARRIL 1: APELANTE
    subgraph LANE_APELANTE [👤 Apelante]
        INI([● Inicio]):::inicio --> A1[Presenta apelación a Mesa de Partes]:::actividad
        A2[Devuelve cargo de notificación]:::actividad
    end

    %% CARRIL 2: MESA DE PARTES
    subgraph LANE_MP [🏢 Mesa de Partes (MIMP o DL)]
        A1 --> B1[Deriva apelación a quien corresponda]:::actividad
    end

    %% CARRIL 3: DIRECCIÓN DE LÍNEA
    subgraph LANE_DL [🏛️ Dirección de Línea (ej. DPE / UPE u otra)]
        B1 --> C1[Deriva apelación a DGNNA]:::actividad
        C2[Notifica la resolución a las partes]:::actividad
        C3[Devuelve cargo de notificación]:::actividad
    end

    %% CARRIL 4: SECRETARÍA DGNNA
    subgraph LANE_SEC [📥 Secretaría (DGNNA)]
        C1 --> D1[Asigna expediente a abogada]:::actividad
        D2[Deriva para revisión de la R.D.]:::actividad
        D3[Devuelve para subsanar R.D.]:::actividad
        D4[Deriva para firma de R.D.]:::actividad
        D5[Remite resolución, memorándum, oficio y/o carta]:::actividad
        D6[Recepción cargo y archiva]:::actividad
    end

    %% CARRIL 5: ABOGADA
    subgraph LANE_ABOG [⚖️ Abogada]
        D1 --> E1[Evalúa apelación]:::actividad
        E1 --> E2[Elabora proyecto de Resolución Directoral]:::actividad
        DOC_RD[/📄 Proyecto de Resolución Directoral/]:::doc -.-> E2
        E2 --> E3[Entrega proyecto de Resolución Directoral]:::actividad
        E3 --> D2
        D3 --> E2
    end

    %% CARRIL 6: REVISOR
    subgraph LANE_REV [🔍 Revisor]
        D2 --> F1[Revisa proyecto de R.D.]:::actividad
        F1 --> F2{¿R.D. tiene observaciones?}:::decision
        F2 -- Sí --> D3
        F2 -- No --> D4
    end

    %% CARRIL 7: DIRECTORA
    subgraph LANE_DIR [✍️ Directora]
        D4 --> G1[Revisa para firma de R.D.]:::actividad
        G1 --> D5
    end

    %% NOTIFICACIÓN Y CIERRE FINAL
    D5 --> C2
    C2 --> A2
    A2 --> C3
    C3 --> D6
    D6 --> FIN([■ Fin]):::fin
```

---

## 📋 2. Matriz de Roles y Actividades (Basado en BPMN Oficial)

| Carril / Actor | Actividad Principal | Descripción / Entregable |
| :--- | :--- | :--- |
| **👤 Apelante** | • *Presenta apelación a Mesa de Partes*<br/>• *Devuelve cargo de notificación* | Inicia el recurso administrativo y posteriormente firma la constancia de notificación. |
| **🏢 Mesa de Partes (MIMP o DL)** | • *Deriva apelación a quien corresponda* | Canaliza el documento físico/virtual ingresado al órgano competente. |
| **🏛️ Dirección de Línea (DL)**<br/>*(Mayoría: DPE / UPE; u otras dependencias)* | • *Deriva apelación a DGNNA*<br/>• *Notifica la resolución a las partes*<br/>• *Devuelve cargo de notificación* | Eleva el expediente a segunda instancia. Tras resolverse, efectúa la diligencia de notificación a los involucrados y remite los cargos a la DGNNA. |
| **📥 Secretaría (DGNNA)**<br/>*(Eje de control y distribución documentaria)* | • *Asigna expediente a abogada*<br/>• *Deriva para revisión de la R.D.*<br/>• *Devuelve para subsanar R.D.*<br/>• *Deriva para firma de R.D.*<br/>• *Remite resolución, memorándum, oficio y/o carta*<br/>• *Recepción cargo y archiva* | Distribuye las cargas, canaliza el expediente en las revisiones, eleva al despacho de Dirección, expide los documentos de atención vía SGD y archiva tras recibir los cargos. |
| **⚖️ Abogada** | • *Evalúa apelación*<br/>• *Elabora proyecto de Resolución Directoral*<br/>• *Entrega proyecto de Resolución Directoral* | Analiza los antecedentes, elabora el informe legal y el borrador de la **Resolución Directoral (R.D.)**. Subsana en caso de observaciones. |
| **🔍 Revisor** | • *Revisa proyecto de R.D.*<br/>• *Compuerta: ¿R.D. tiene observaciones?* | Realiza el control de calidad jurídico. Si tiene observaciones, devuelve a Secretaría para subsanación; si no, deriva a Secretaría para firma. |
| **✍️ Directora** | • *Revisa para firma de R.D.* | Emite y suscribe formalmente la Resolución Directoral que resuelve en última instancia administrativa. |

---

## 💡 3. Aspectos Clave del Circuito

1. **Circuito Institucional Centralizado en Secretaría:**
   El Revisor y la Abogada no interactúan directamente de manera informal; todo pase de borrador, subsanación y visto bueno se canaliza a través de la **Secretaría DGNNA**, garantizando trazabilidad y control de tiempos.
2. **Alcance de la Dirección de Línea:**
   Aplica principalmente para la **DPE / UPE** (Unidades de Protección Especial), pero el rol genérico de **Dirección de Línea (DL)** permite cubrir cualquier otra dependencia de procedencia (Adopciones, Procedimientos Administrativos Sancionadores, DEMUNA, etc.).
3. **Cierre por Devolución de Cargos:**
   El procedimiento no finaliza con la firma de la resolución, sino cuando la Dirección de Línea remite los **cargos de notificación firmados** y Secretaría los recepciona y archiva.
