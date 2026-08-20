# Diagrama de Flujo Operativo — Sustracción Internacional de Menores
### Directiva N.° 006-2021-MIMP / DGNNA

Este documento describe el flujo procedimental completo de atención a solicitudes de restitución y régimen de visitas internacional, integrando las 4 etapas operativas de la Autoridad Central peruana.

---

## 1. Diagrama de Flujo del Proceso (Mermaid)

```mermaid
flowchart TD
    %% INICIO
    INI([📥 Solicitud de Sustracción / Restitución Internacional]) --> EVAL[🧭 1. Evaluación Inicial de Admisibilidad]

    %% EVALUACIÓN
    subgraph ETAPA1 ["ETAPA 1: Evaluación Inicial"]
        EVAL --> REQ{¿Cumple los 8 Requisitos Normativos<br/>y Menor < 16 años?}
    end

    %% SUBSANACIÓN
    subgraph ETAPA2 ["ETAPA 2: Subsanación y Plazos"]
        REQ -- "❌ No (Observado)" --> SUBS[⏱️ Notificación de Observaciones]
        SUBS --> PLAZO{Cómputo Legal de Días Hábiles}
        PLAZO -->|Ordinario| D5[5 días hábiles]
        PLAZO -->|Con Prórroga| D10[10 días hábiles]
        D5 --> RESP_SUB{¿Subsanó a tiempo?}
        D10 --> RESP_SUB
        RESP_SUB -- "No subsanó" --> ARCH_EVAL[🏁 AC Rechaza Solicitud / Archivo]
        RESP_SUB -- "Sí subsanó" --> ROL
    end

    %% BIFURCACIÓN POR ROL DE AUTORIDAD CENTRAL
    REQ -- "✅ Sí (Completo)" --> ROL{¿Rol de AC Perú?}

    %% ROL REQUERIDA (MENOR EN PERÚ)
    subgraph ETAPA3_REQ ["ETAPA 3A: AC Requerida (Menor en Perú)"]
        ROL -- "🇵🇪 Requerida" --> ENTREV[💬 Citación a Entrevista Amigable]
        ENTREV --> RES_ENTREV{Resultado de la Entrevista}
        
        RES_ENTREV -- "Acepta Retorno Voluntario" --> ACUERDO[🤝 Retorno Voluntario Aceptado]
        ACUERDO --> PASAJES[✈️ Plazo de 1 Mes: Solicitante remite pasajes y autorizaciones]
        PASAJES --> RET_EFECTIVO[🏁 Retorno Concretado / Cierre]
        
        RES_ENTREV -- "Rechaza Retorno / No Asiste" --> SIN_ACUERDO[⚖️ Sin Acuerdo: Agota Vía Administrativa]
    end

    %% ROL REQUIRENTE (MENOR EN EL EXTERIOR)
    subgraph ETAPA3_EXT ["ETAPA 3B: AC Requirente (Menor en el Exterior)"]
        ROL -- "✈️ Requirente" --> OFICIO_SGD[🌐 Remisión de Solicitud vía SGD a AC Extranjera]
        OFICIO_SGD --> CONTROL_PLAZO[⏱️ Seguimiento y Control de Respuesta Internacional]
        CONTROL_PLAZO --> COOP_JUD[⚖️ Proceso Judicial en Tribunales del Exterior]
    end

    %% PROCESO JUDICIAL (PERÚ)
    subgraph ETAPA4 ["ETAPA 4: Proceso Judicial (Juzgado de Familia)"]
        SIN_ACUERDO --> DEMANDA[⚖️ Presentación de Demanda Judicial de Restitución]
        DEMANDA --> AUDIENCIA[🏛️ Audiencia Única y Actuación Probatoria]
        AUDIENCIA --> SENTENCIA{Sentencia Judicial}
        
        SENTENCIA -- "Fundada" --> EJEC[🛡️ Ejecución de Sentencia / Entrega del Menor]
        EJEC --> RET_JUD[🏁 Retorno Efectivo por Sentencia]
        
        SENTENCIA -- "Infundada" --> ARCH_JUD[🏁 Sentencia Infundada / Archivo]
    end

    %% CIERRE DEL EXPEDIENTE
    subgraph ETAPA5 ["ETAPA 5: Cierre del Expediente"]
        RET_EFECTIVO --> CIERRE([🏁 Cierre y Archivo Definitivo])
        RET_JUD --> CIERRE
        ARCH_JUD --> CIERRE
        ARCH_EVAL --> CIERRE
        COOP_JUD --> CIERRE
    end

    %% ESTILOS
    style INI fill:#1E3A5F,stroke:#1E3A5F,color:#fff
    style CIERRE fill:#1E3A5F,stroke:#1E3A5F,color:#fff
    style REQ fill:#EFF6FF,stroke:#2563EB,stroke-width:2px
    style ROL fill:#FEF3C7,stroke:#D97706,stroke-width:2px
    style RES_ENTREV fill:#FEF3C7,stroke:#D97706,stroke-width:2px
    style SENTENCIA fill:#FEF3C7,stroke:#D97706,stroke-width:2px
    style ACUERDO fill:#F0FDF4,stroke:#16A34A,stroke-width:2px
    style RET_EFECTIVO fill:#F0FDF4,stroke:#16A34A,stroke-width:2px
    style RET_JUD fill:#F0FDF4,stroke:#16A34A,stroke-width:2px
```

---

## 2. Descripción de las 4 Sub-Etapas Guiadas

### Etapa 1: Evaluación Inicial de Admisibilidad
* **Matriz de 8 Requisitos Normativos:**
  1. Solicitud formal de restitución o régimen de visitas identificada.
  2. Identidad y datos del menor (verificación automática de menor de 16 años).
  3. Residencia habitual acreditada en el Estado requirente.
  4. Derecho de custodia o visitas legalmente ejercido.
  5. Traslado o retención ilícita identificado.
  6. Documentación sustentatoria y partidas de nacimiento completas.
  7. Traducciones oficiales al español (cuando corresponda).
  8. Información para ubicación del menor y del presunto sustractor.
* **Dictamen:** Si los 8 están conformes ➔ Pasa a Retorno/Cooperación. Si hay observaciones ➔ Pasa a Subsanación.

### Etapa 2: Subsanación y Control de Plazos
* **Cómputo legal automático:** 
  * Plazo ordinario: **5 días hábiles** a partir de la notificación.
  * Prórroga justificada: **10 días hábiles**.
  * Se omiten automáticamente sábados, domingos y feriados.

### Etapa 3: Retorno Voluntario / Cooperación Internacional
* **Si Perú es Autoridad Requerida (Menor en Perú):**
  * Citación a entrevista amigable con el progenitor que retiene al menor.
  * **Acepta retorno:** Se concede **1 mes** a la parte solicitante para remitir pasajes y autorizaciones de viaje. Se bloquea la vía judicial.
  * **Rechaza retorno / Inasistencia:** Se agota la vía administrativa y se pasa inmediatamente a la vía judicial.
* **Si Perú es Autoridad Requirente (Menor en el Exterior):**
  * Emisión y control de oficios SGD dirigidos a la Autoridad Central Extranjera.
  * Monitoreo de plazos de respuesta internacional y cooperación consular.

### Etapa 4: Proceso Judicial (Juzgado de Familia)
* Presentación de demanda ante el Poder Judicial (Juzgado de Familia competente).
* Registro y seguimiento de:
  * Número de expediente judicial.
  * Juzgado competente.
  * Sentencia de 1ra Instancia.
  * Sentencia de 2da Instancia / Vista de la causa.
  * Recurso de Casación.
  * Medidas cautelares y ejecución del retorno forzoso.

---

## 3. Motivos de Cierre y Archivo Definitivo
1. Retorno voluntario concretado.
2. Retorno por ejecución de sentencia judicial.
3. Acuerdo extrajudicial entre las partes.
4. Sentencia judicial infundada.
5. AC rechaza solicitud (Violencia familiar / Art. 12 / Art. 13 / Art. 27 del Convenio).
6. Transcurso de plazo sin ubicar al menor.
7. Desistimiento expreso de la parte solicitante.
